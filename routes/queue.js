const express = require('express');
const router = express.Router();
const db = require('../db');

router.get('/', (req, res) => {
  try {
    const queue = db.prepare(`
      SELECT 
        q.id,
        q.recipient_email,
        q.status,
        q.sent_at,
        q.error,
        a.email as account_email,
        c.name as campaign_name
      FROM queue q
      LEFT JOIN accounts a ON q.account_id = a.id
      LEFT JOIN campaigns c ON q.campaign_id = c.id
      ORDER BY q.id DESC
      LIMIT 100
    `).all();
    res.json(queue);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/stats', (req, res) => {
  try {
    const total = db.prepare('SELECT COUNT(*) as count FROM queue').get();
    const pending = db.prepare("SELECT COUNT(*) as count FROM queue WHERE status = 'pending'").get();
    const sent = db.prepare("SELECT COUNT(*) as count FROM queue WHERE status = 'sent'").get();
    const failed = db.prepare("SELECT COUNT(*) as count FROM queue WHERE status = 'failed'").get();
    const campaigns = db.prepare("SELECT COUNT(*) as count FROM campaigns WHERE status = 'running'").get();
    const accounts = db.prepare("SELECT COUNT(*) as count FROM accounts WHERE status = 'active'").get();
    const todaySent = db.prepare(`
      SELECT COUNT(*) as count FROM queue 
      WHERE status = 'sent' 
      AND date(sent_at) = date('now')
    `).get();

    res.json({
      total: total.count,
      pending: pending.count,
      sent: sent.count,
      failed: failed.count,
      today_sent: todaySent.count,
      active_campaigns: campaigns.count,
      active_accounts: accounts.count
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/logs', (req, res) => {
  try {
    const logs = db.prepare(`
      SELECT 
        l.*,
        a.email as account_email,
        c.name as campaign_name
      FROM logs l
      LEFT JOIN accounts a ON l.account_id = a.id
      LEFT JOIN campaigns c ON l.campaign_id = c.id
      ORDER BY l.created_at DESC
      LIMIT 200
    `).all();
    res.json(logs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
