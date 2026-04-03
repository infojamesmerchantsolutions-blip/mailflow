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
    const accounts = db.prepare('SELECT id, email, status, daily_sent, last_reset, created_at FROM accounts').all();
    res.json(accounts);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/auth', (req, res) => {
  const url = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent',
    scope: ['https://www.googleapis.com/auth/gmail.send']
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

    res.send(`<h2>Account ${email} connected successfully! You can close this tab.</h2>`);
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
