const express = require('express');
const router = express.Router();
const db = require('../db');
const { google } = require('googleapis');

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI
);

router.get('/', (req, res) => {
  try {
    const accounts = db.prepare('SELECT id, email, display_name, status, daily_sent, last_reset, created_at FROM accounts').all();
    res.json(accounts);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/auth', (req, res) => {
  const url = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent select_account',
    scope: [
      'https://www.googleapis.com/auth/gmail.send',
      'https://www.googleapis.com/auth/userinfo.email'
    ]
  });
  res.json({ url });
});

router.get('/callback', async (req, res) => {
  try {
    const { code } = req.query;
    const { tokens } = await oauth2Client.getToken(code);
    oauth2Client.setCredentials(tokens);

    const gmail = google.gmail({ version: 'v1', auth: oauth2Client });
    const profile = await gmail.users.getProfile({ userId: 'me' });
    const email = profile.data.emailAddress;

    const existing = db.prepare('SELECT id FROM accounts WHERE email = ?').get(email);
    if (existing) {
      db.prepare(`
        UPDATE accounts SET access_token = ?, refresh_token = ?, token_expiry = ?, status = 'active' WHERE email = ?
      `).run(tokens.access_token, tokens.refresh_token, tokens.expiry_date, email);
    } else {
      db.prepare(`
        INSERT INTO accounts (email, access_token, refresh_token, token_expiry) VALUES (?, ?, ?, ?)
      `).run(email, tokens.access_token, tokens.refresh_token, tokens.expiry_date);
    }

    res.send(`
      <html>
        <body style="font-family:sans-serif;text-align:center;padding:60px;">
          <h2 style="color:#3B6D11;">Account connected successfully!</h2>
          <p>${email} has been added to MailFlow.</p>
          <p>You can close this tab and go back to your dashboard.</p>
          <script>setTimeout(() => window.close(), 3000);</script>
        </body>
      </html>
    `);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update display name
router.put('/:id/display-name', (req, res) => {
  try {
    const { display_name } = req.body;
    db.prepare('UPDATE accounts SET display_name = ? WHERE id = ?').run(display_name, req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Pause account
router.post('/:id/pause', (req, res) => {
  try {
    db.prepare("UPDATE accounts SET status = 'paused' WHERE id = ?").run(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Resume account
router.post('/:id/resume', (req, res) => {
  try {
    db.prepare("UPDATE accounts SET status = 'active' WHERE id = ?").run(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', (req, res) => {
  try {
    db.prepare('DELETE FROM accounts WHERE id = ?').run(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/:id/reset', (req, res) => {
  try {
    db.prepare(`UPDATE accounts SET daily_sent = 0, last_reset = datetime('now') WHERE id = ?`).run(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
