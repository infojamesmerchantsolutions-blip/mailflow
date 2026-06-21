const express = require('express');
const router = express.Router();
const db = require('../db');

router.get('/', async (req, res) => {
  try {
    const campaigns = await db.all('SELECT * FROM campaigns ORDER BY created_at DESC');
    res.json(campaigns);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const campaign = await db.get('SELECT * FROM campaigns WHERE id = $1', [req.params.id]);
    if (!campaign) return res.status(404).json({ error: 'Campaign not found' });
    res.json(campaign);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const {
      name, subject, body_html, body_plain,
      contact_list, delay_seconds, start_time, end_time,
      schedule_type, content_variations, content_mode
    } = req.body;

    let parsedVariations = [];
    try {
      parsedVariations = JSON.parse(content_variations || '[]');
    } catch (e) {
      parsedVariations = [];
    }

    console.log(`Creating campaign with ${parsedVariations.length} variations`);
    parsedVariations.forEach((v, i) => {
      console.log(`Variation ${i + 1}: ${v.subject}`);
    });

    const contacts = await db.get(
      'SELECT COUNT(*) as count FROM contacts WHERE list_name = $1',
      [contact_list]
    );

    const result = await db.run(`
      INSERT INTO campaigns 
        (name, subject, body_html, body_plain, contact_list, delay_seconds, 
         start_time, end_time, total_contacts, schedule_type, content_variations, content_mode)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      RETURNING id
    `, [
      name,
      subject || (parsedVariations[0]?.subject || ''),
      body_html || (parsedVariations[0]?.body_html || ''),
      body_plain || (parsedVariations[0]?.body_plain || ''),
      contact_list,
      delay_seconds || 30,
      start_time || '00:00',
      end_time || '23:59',
      contacts.count,
      schedule_type || 'immediate',
      JSON.stringify(parsedVariations),
      content_mode || 'random'
    ]);

    res.json({ id: result.rows[0].id, success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/:id/launch', async (req, res) => {
  try {
    const campaign = await db.get('SELECT * FROM campaigns WHERE id = $1', [req.params.id]);
    if (!campaign) return res.status(404).json({ error: 'Campaign not found' });

    try {
      const vars = JSON.parse(campaign.content_variations || '[]');
      console.log(`Launching campaign "${campaign.name}" with ${vars.length} variations:`);
      vars.forEach((v, i) => console.log(`  Variation ${i + 1}: ${v.subject}`));
    } catch (e) {}

    const contacts = await db.all(
      'SELECT email FROM contacts WHERE list_name = $1',
      [campaign.contact_list]
    );

    if (contacts.length === 0) {
      return res.status(400).json({ error: 'No contacts found in this list' });
    }

    const accounts = await db.all(
      "SELECT id FROM accounts WHERE status = 'active'"
    );

    if (accounts.length === 0) {
      return res.status(400).json({ error: 'No active Gmail accounts connected' });
    }

    await db.run(
      "DELETE FROM queue WHERE campaign_id = $1 AND status = 'pending'",
      [campaign.id]
    );

    for (let i = 0; i < contacts.length; i++) {
      const account = accounts[i % accounts.length];
      await db.run(
        "INSERT INTO queue (campaign_id, recipient_email, account_id, status) VALUES ($1, $2, $3, 'pending')",
        [campaign.id, contacts[i].email, account.id]
      );
    }

    await db.run(
      "UPDATE campaigns SET status = 'running', sent_count = 0, failed_count = 0 WHERE id = $1",
      [campaign.id]
    );

    res.json({ success: true, queued: contacts.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/:id/pause', async (req, res) => {
  try {
    await db.run("UPDATE campaigns SET status = 'paused' WHERE id = $1", [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/:id/resume', async (req, res) => {
  try {
    await db.run("UPDATE campaigns SET status = 'running' WHERE id = $1", [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    await db.run('DELETE FROM queue WHERE campaign_id = $1', [req.params.id]);
    await db.run('DELETE FROM opens WHERE campaign_id = $1', [req.params.id]);
    await db.run('DELETE FROM clicks WHERE campaign_id = $1', [req.params.id]);
    await db.run('DELETE FROM logs WHERE campaign_id = $1', [req.params.id]);
    await db.run('DELETE FROM campaigns WHERE id = $1', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
