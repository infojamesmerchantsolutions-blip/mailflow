const express = require('express');
const router = express.Router();
const db = require('../db');

// Get all followups for a campaign
router.get('/campaign/:campaignId', async (req, res) => {
  try {
    const followups = await db.all(
      'SELECT * FROM followups WHERE campaign_id = $1 ORDER BY delay_days ASC, delay_hours ASC',
      [req.params.campaignId]
    );
    res.json(followups);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create a followup
router.post('/', async (req, res) => {
  try {
    const { campaign_id, name, subject, body_html, body_plain, delay_days, delay_hours } = req.body;
    if (!campaign_id) return res.status(400).json({ error: 'Campaign ID is required' });

    // Use exact values — no fallback to 3
    const days = delay_days !== undefined && delay_days !== null ? parseInt(delay_days) : 0;
    const hours = delay_hours !== undefined && delay_hours !== null ? parseInt(delay_hours) : 0;

    const result = await db.run(`
      INSERT INTO followups (campaign_id, name, subject, body_html, body_plain, delay_days, delay_hours)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING id
    `, [campaign_id, name || '', subject || '', body_html || '', body_plain || '', days, hours]);

    await buildFollowupQueue(result.rows[0].id, campaign_id, days, hours);

    res.json({ id: result.rows[0].id, success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

async function buildFollowupQueue(followupId, campaignId, delayDays, delayHours) {
  try {
    const sentEmails = await db.all(`
      SELECT q.id, q.recipient_email, q.account_id, q.message_id, q.sent_at
      FROM queue q
      WHERE q.campaign_id = $1
        AND q.status = 'sent'
        AND q.recipient_email NOT IN (
          SELECT email FROM exclusions WHERE campaign_id = $1
        )
    `, [campaignId]);

    for (const email of sentEmails) {
      const sentAt = email.sent_at ? new Date(email.sent_at) : new Date();
      const scheduledAt = new Date(sentAt.getTime() + (delayDays * 24 * 60 * 60 * 1000) + (delayHours * 60 * 60 * 1000));

      await db.run(`
        INSERT INTO followup_queue 
          (followup_id, campaign_id, recipient_email, account_id, original_queue_id, message_id, status, scheduled_at)
        VALUES ($1, $2, $3, $4, $5, $6, 'pending', $7)
      `, [
        followupId, campaignId, email.recipient_email,
        email.account_id, email.id, email.message_id,
        scheduledAt.toISOString()
      ]);
    }

    console.log(`Built followup queue: ${sentEmails.length} recipients for followup ${followupId}`);
  } catch (err) {
    console.error('Error building followup queue:', err.message);
  }
}

// Update a followup
router.put('/:id', async (req, res) => {
  try {
    const { name, subject, body_html, body_plain, delay_days, delay_hours } = req.body;
    const days = delay_days !== undefined && delay_days !== null ? parseInt(delay_days) : 0;
    const hours = delay_hours !== undefined && delay_hours !== null ? parseInt(delay_hours) : 0;
    await db.run(`
      UPDATE followups SET name = $1, subject = $2, body_html = $3, body_plain = $4, 
      delay_days = $5, delay_hours = $6 WHERE id = $7
    `, [name || '', subject || '', body_html || '', body_plain || '', days, hours, req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Pause a followup
router.post('/:id/pause', async (req, res) => {
  try {
    await db.run("UPDATE followups SET status = 'paused' WHERE id = $1", [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Resume a followup
router.post('/:id/resume', async (req, res) => {
  try {
    await db.run("UPDATE followups SET status = 'active' WHERE id = $1", [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete a followup
router.delete('/:id', async (req, res) => {
  try {
    await db.run('DELETE FROM followup_queue WHERE followup_id = $1', [req.params.id]);
    await db.run('DELETE FROM followups WHERE id = $1', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get followup queue status
router.get('/:id/status', async (req, res) => {
  try {
    const total = await db.get('SELECT COUNT(*) as count FROM followup_queue WHERE followup_id = $1', [req.params.id]);
    const pending = await db.get("SELECT COUNT(*) as count FROM followup_queue WHERE followup_id = $1 AND status = 'pending'", [req.params.id]);
    const sent = await db.get("SELECT COUNT(*) as count FROM followup_queue WHERE followup_id = $1 AND status = 'sent'", [req.params.id]);
    const failed = await db.get("SELECT COUNT(*) as count FROM followup_queue WHERE followup_id = $1 AND status = 'failed'", [req.params.id]);
    res.json({
      total: parseInt(total.count),
      pending: parseInt(pending.count),
      sent: parseInt(sent.count),
      failed: parseInt(failed.count)
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get exclusions for a campaign
router.get('/exclusions/:campaignId', async (req, res) => {
  try {
    const exclusions = await db.all(
      'SELECT * FROM exclusions WHERE campaign_id = $1 ORDER BY created_at DESC',
      [req.params.campaignId]
    );
    res.json(exclusions);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Add exclusions
router.post('/exclusions', async (req, res) => {
  try {
    const { campaign_id, emails, reason } = req.body;
    if (!emails || emails.length === 0) return res.status(400).json({ error: 'No emails provided' });

    let added = 0;
    for (const email of emails) {
      const clean = email.trim().toLowerCase();
      if (!clean) continue;
      try {
        await db.run(
          'INSERT INTO exclusions (campaign_id, email, reason) VALUES ($1, $2, $3)',
          [campaign_id || null, clean, reason || 'replied']
        );
        await db.run(
          "UPDATE followup_queue SET status = 'excluded' WHERE recipient_email = $1 AND campaign_id = $2 AND status = 'pending'",
          [clean, campaign_id]
        );
        added++;
      } catch (e) {}
    }

    res.json({ success: true, added });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Remove exclusion
router.delete('/exclusions/:id', async (req, res) => {
  try {
    await db.run('DELETE FROM exclusions WHERE id = $1', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = { router, buildFollowupQueue };
