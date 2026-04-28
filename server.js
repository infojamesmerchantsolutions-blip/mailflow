require('dotenv').config();
const express = require('express');
const cors = require('cors');
const app = express();

app.use(cors());

// Increase payload limit to handle large email templates
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

// PIN verification endpoint
app.post('/api/verify-pin', (req, res) => {
  const { pin } = req.body;
  const correctPin = process.env.APP_PIN || '1234';
  if (pin === correctPin) {
    res.json({ success: true });
  } else {
    res.status(401).json({ success: false, error: 'Wrong PIN' });
  }
});

// Routes
app.use('/api/accounts', require('./routes/accounts'));
app.use('/api/campaigns', require('./routes/campaigns'));
app.use('/api/contacts', require('./routes/contacts'));
app.use('/api/queue', require('./routes/queue'));
app.use('/api/templates', require('./routes/templates'));

// Single aggregated dashboard endpoint — reduces multiple requests to one
app.get('/api/dashboard', async (req, res) => {
  try {
    const db = require('./db');

    const stats = {
      total: db.prepare('SELECT COUNT(*) as count FROM queue').get().count,
      pending: db.prepare("SELECT COUNT(*) as count FROM queue WHERE status = 'pending'").get().count,
      sent: db.prepare("SELECT COUNT(*) as count FROM queue WHERE status = 'sent'").get().count,
      failed: db.prepare("SELECT COUNT(*) as count FROM queue WHERE status = 'failed'").get().count,
      today_sent: db.prepare("SELECT COUNT(*) as count FROM queue WHERE status = 'sent' AND date(sent_at) = date('now')").get().count,
      active_campaigns: db.prepare("SELECT COUNT(*) as count FROM campaigns WHERE status = 'running'").get().count,
      active_accounts: db.prepare("SELECT COUNT(*) as count FROM accounts WHERE status = 'active'").get().count,
    };

    const campaigns = db.prepare('SELECT * FROM campaigns ORDER BY created_at DESC LIMIT 10').all();

    const queue = db.prepare(`
      SELECT q.id, q.recipient_email, q.status, q.sent_at, q.error,
        a.email as account_email, c.name as campaign_name
      FROM queue q
      LEFT JOIN accounts a ON q.account_id = a.id
      LEFT JOIN campaigns c ON q.campaign_id = c.id
      ORDER BY q.id DESC LIMIT 20
    `).all();

    res.json({ stats, campaigns, queue });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Start scheduler
require('./scheduler');

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`MailFlow server running on port ${PORT}`);
});
