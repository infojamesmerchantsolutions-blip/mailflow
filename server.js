require('dotenv').config();
const express = require('express');
const cors = require('cors');
const app = express();

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

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

// Gmail and email client proxy IPs
const GMAIL_PROXY_IPS = [
  '66.102.', '64.233.', '72.14.', '74.125.', '209.85.',
  '108.177.', '142.250.', '172.217.',
];

// Definite non-human bots
const DEFINITE_BOTS = [
  'spider', 'crawler', 'bot/', 'feedfetcher',
  'wget', 'curl', 'python-requests', 'go-http-client',
  'java/', 'ruby/', 'php/', 'postfix', 'sendmail',
];

function classifyOpen(ip, userAgent) {
  const ua = (userAgent || '').toLowerCase();

  // Definite bot
  if (DEFINITE_BOTS.some(bot => ua.includes(bot))) return 'bot';

  // Gmail/Google proxy
  if (GMAIL_PROXY_IPS.some(range => (ip || '').startsWith(range))) return 'proxy';

  // Microsoft/Outlook proxy
  if (['40.92.', '40.107.', '52.100.', '104.47.'].some(r => (ip || '').startsWith(r))) return 'proxy';

  // Apple Mail Privacy
  if ((ip || '').startsWith('17.')) return 'proxy';

  // Real human open
  return 'human';
}

// Email open tracking pixel endpoint
app.get('/api/track/open', async (req, res) => {
  try {
    const { id } = req.query;
    const userAgent = req.headers['user-agent'] || '';
    const ip = req.headers['x-forwarded-for']?.split(',')[0] || req.ip || '';
    const db = require('./db');

    if (id) {
      const queueItem = await db.get(
        'SELECT campaign_id, recipient_email, sent_at FROM queue WHERE id = $1',
        [id]
      );

      if (queueItem) {
        const openType = classifyOpen(ip, userAgent);
        const isBot = openType === 'bot';

        // Record ALL opens except definite bots
        if (openType !== 'bot') {
          await db.run(
            `INSERT INTO opens (queue_id, campaign_id, recipient_email, ip_address, user_agent, is_bot)
             VALUES ($1, $2, $3, $4, $5, $6)`,
            [id, queueItem.campaign_id, queueItem.recipient_email, ip, userAgent, isBot]
          );
          console.log(`Open recorded (${openType}): ${queueItem.recipient_email}`);
        } else {
          console.log(`Bot blocked: ${queueItem.recipient_email}`);
        }
      }
    }
  } catch (err) {
    console.error('Tracking error:', err.message);
  }

  const pixel = Buffer.from(
    'R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',
    'base64'
  );
  res.writeHead(200, {
    'Content-Type': 'image/gif',
    'Content-Length': pixel.length,
    'Cache-Control': 'no-store, no-cache, must-revalidate, private',
    'Pragma': 'no-cache'
  });
  res.end(pixel);
});

// Click tracking redirect endpoint
app.get('/api/track/click', async (req, res) => {
  const { id, url } = req.query;
  const userAgent = req.headers['user-agent'] || '';
  const ip = req.headers['x-forwarded-for']?.split(',')[0] || req.ip || '';

  try {
    const db = require('./db');

    if (id && url) {
      const queueItem = await db.get(
        'SELECT campaign_id, recipient_email FROM queue WHERE id = $1',
        [id]
      );

      if (queueItem) {
        await db.run(
          `INSERT INTO clicks (queue_id, campaign_id, recipient_email, original_url, ip_address, user_agent)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [id, queueItem.campaign_id, queueItem.recipient_email, decodeURIComponent(url), ip, userAgent]
        );
        console.log(`Click recorded: ${queueItem.recipient_email} → ${decodeURIComponent(url)}`);
      }
    }
  } catch (err) {
    console.error('Click tracking error:', err.message);
  }

  // Redirect to original URL
  const redirectUrl = url ? decodeURIComponent(url) : '/';
  res.redirect(302, redirectUrl);
});

// Routes
app.use('/api/accounts', require('./routes/accounts'));
app.use('/api/campaigns', require('./routes/campaigns'));
app.use('/api/contacts', require('./routes/contacts'));
app.use('/api/queue', require('./routes/queue'));
app.use('/api/templates', require('./routes/templates'));
app.use('/api/analytics', require('./routes/analytics'));

// Single aggregated dashboard endpoint
app.get('/api/dashboard', async (req, res) => {
  try {
    const db = require('./db');

    const stats = {
      total: parseInt((await db.get('SELECT COUNT(*) as count FROM queue')).count),
      pending: parseInt((await db.get("SELECT COUNT(*) as count FROM queue WHERE status = 'pending'")).count),
      sent: parseInt((await db.get("SELECT COUNT(*) as count FROM queue WHERE status = 'sent'")).count),
      failed: parseInt((await db.get("SELECT COUNT(*) as count FROM queue WHERE status = 'failed'")).count),
      today_sent: parseInt((await db.get("SELECT COUNT(*) as count FROM queue WHERE status = 'sent' AND DATE(sent_at) = CURRENT_DATE")).count),
      active_campaigns: parseInt((await db.get("SELECT COUNT(*) as count FROM campaigns WHERE status = 'running'")).count),
      active_accounts: parseInt((await db.get("SELECT COUNT(*) as count FROM accounts WHERE status = 'active'")).count),
    };

    const campaigns = await db.all('SELECT * FROM campaigns ORDER BY created_at DESC LIMIT 10');
    const queue = await db.all(`
      SELECT q.id, q.recipient_email, q.status, q.sent_at, q.error,
        a.email as account_email, c.name as campaign_name
      FROM queue q
      LEFT JOIN accounts a ON q.account_id = a.id
      LEFT JOIN campaigns c ON q.campaign_id = c.id
      ORDER BY q.id DESC LIMIT 20
    `);

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

// Keep-alive ping every 5 minutes to prevent Render from sleeping
const RENDER_URL = process.env.RENDER_EXTERNAL_URL || 'https://mailflow-ndex.onrender.com';
setInterval(async () => {
  try {
    const https = require('https');
    https.get(`${RENDER_URL}/api/queue/stats`, (res) => {
      console.log(`Keep-alive ping sent — status: ${res.statusCode}`);
    }).on('error', (err) => {
      console.log(`Keep-alive ping failed: ${err.message}`);
    });
  } catch (err) {
    console.log(`Keep-alive error: ${err.message}`);
  }
}, 5 * 60 * 1000);
