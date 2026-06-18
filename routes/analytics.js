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
        COUNT(DISTINCT CASE WHEN o.is_bot = FALSE THEN o.recipient_email END) as unique_opens,
        COUNT(CASE WHEN o.is_bot = FALSE THEN o.id END) as total_opens,
        COUNT(DISTINCT cl.recipient_email) as unique_clicks,
        COUNT(cl.id) as total_clicks
      FROM campaigns c
      LEFT JOIN opens o ON c.id = o.campaign_id
      LEFT JOIN clicks cl ON c.id = cl.campaign_id
      GROUP BY c.id
      ORDER BY c.created_at DESC
    `);

    const result = campaigns.map(c => ({
      ...c,
      open_rate: c.sent_count > 0
        ? Math.round((c.unique_opens / c.sent_count) * 100)
        : 0,
      click_rate: c.sent_count > 0
        ? Math.round((c.unique_clicks / c.sent_count) * 100)
        : 0
    }));

    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get detailed opens for a specific campaign (real opens only)
router.get('/:id/opens', async (req, res) => {
  try {
    const opens = await db.all(`
      SELECT 
        o.id,
        o.recipient_email,
        o.opened_at,
        o.user_agent,
        o.ip_address,
        o.is_bot,
        COUNT(o.id) OVER (PARTITION BY o.recipient_email) as open_count
      FROM opens o
      WHERE o.campaign_id = $1
        AND o.is_bot = FALSE
      ORDER BY o.opened_at DESC
    `, [req.params.id]);

    res.json(opens);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get clicks for a specific campaign
router.get('/:id/clicks', async (req, res) => {
  try {
    const clicks = await db.all(`
      SELECT 
        cl.id,
        cl.recipient_email,
        cl.original_url,
        cl.clicked_at,
        cl.user_agent,
        COUNT(cl.id) OVER (PARTITION BY cl.recipient_email) as click_count
      FROM clicks cl
      WHERE cl.campaign_id = $1
      ORDER BY cl.clicked_at DESC
    `, [req.params.id]);

    res.json(clicks);
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
          AND is_bot = FALSE
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
    const totalOpens = await db.get("SELECT COUNT(*) as count FROM opens WHERE is_bot = FALSE");
    const uniqueOpens = await db.get("SELECT COUNT(DISTINCT recipient_email) as count FROM opens WHERE is_bot = FALSE");
    const totalClicks = await db.get('SELECT COUNT(*) as count FROM clicks');
    const uniqueClicks = await db.get('SELECT COUNT(DISTINCT recipient_email) as count FROM clicks');
    const topCampaign = await db.get(`
      SELECT c.name, COUNT(DISTINCT o.recipient_email) as opens
      FROM opens o
      JOIN campaigns c ON o.campaign_id = c.id
      WHERE o.is_bot = FALSE
      GROUP BY c.id, c.name
      ORDER BY opens DESC
      LIMIT 1
    `);

    res.json({
      total_sent: parseInt(totalSent.count),
      total_opens: parseInt(totalOpens.count),
      unique_opens: parseInt(uniqueOpens.count),
      total_clicks: parseInt(totalClicks.count),
      unique_clicks: parseInt(uniqueClicks.count),
      overall_open_rate: totalSent.count > 0
        ? Math.round((uniqueOpens.count / totalSent.count) * 100)
        : 0,
      overall_click_rate: totalSent.count > 0
        ? Math.round((uniqueClicks.count / totalSent.count) * 100)
        : 0,
      top_campaign: topCampaign || null
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
