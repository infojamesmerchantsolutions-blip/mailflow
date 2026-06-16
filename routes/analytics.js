const express = require('express');
const router = express.Router();
const db = require('../db');

// Get analytics summary for all campaigns
router.get('/', async (req, res) => {
  try {
    const campaigns = await db.all(`
      SELECT 
        c.id,
        c.name,
        c.total_contacts,
        c.sent_count,
        c.failed_count,
        c.status,
        c.created_at,
        COUNT(DISTINCT o.recipient_email) as unique_opens,
        COUNT(o.id) as total_opens
      FROM campaigns c
      LEFT JOIN opens o ON c.id = o.campaign_id
      GROUP BY c.id
      ORDER BY c.created_at DESC
    `);

    const result = campaigns.map(c => ({
      ...c,
      open_rate: c.sent_count > 0
        ? Math.round((c.unique_opens / c.sent_count) * 100)
        : 0
    }));

    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get detailed opens for a specific campaign
router.get('/:id/opens', async (req, res) => {
  try {
    const opens = await db.all(`
      SELECT 
        o.id,
        o.recipient_email,
        o.opened_at,
        o.user_agent,
        COUNT(o.id) OVER (PARTITION BY o.recipient_email) as open_count
      FROM opens o
      WHERE o.campaign_id = $1
      ORDER BY o.opened_at DESC
    `, [req.params.id]);

    res.json(opens);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get unopened recipients for a specific campaign
router.get('/:id/unopened', async (req, res) => {
  try {
    const unopened = await db.all(`
      SELECT DISTINCT q.recipient_email
      FROM queue q
      WHERE q.campaign_id = $1
        AND q.status = 'sent'
        AND q.recipient_email NOT IN (
          SELECT DISTINCT recipient_email 
          FROM opens 
          WHERE campaign_id = $1
        )
      ORDER BY q.recipient_email
    `, [req.params.id]);

    res.json(unopened);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get overall stats across all campaigns
router.get('/overview/stats', async (req, res) => {
  try {
    const totalSent = await db.get("SELECT COUNT(*) as count FROM queue WHERE status = 'sent'");
    const totalOpens = await db.get('SELECT COUNT(*) as count FROM opens');
    const uniqueOpens = await db.get('SELECT COUNT(DISTINCT recipient_email) as count FROM opens');
    const topCampaign = await db.get(`
      SELECT c.name, COUNT(DISTINCT o.recipient_email) as opens
      FROM opens o
      JOIN campaigns c ON o.campaign_id = c.id
      GROUP BY c.id, c.name
      ORDER BY opens DESC
      LIMIT 1
    `);

    res.json({
      total_sent: parseInt(totalSent.count),
      total_opens: parseInt(totalOpens.count),
      unique_opens: parseInt(uniqueOpens.count),
      overall_open_rate: totalSent.count > 0
        ? Math.round((uniqueOpens.count / totalSent.count) * 100)
        : 0,
      top_campaign: topCampaign || null
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
