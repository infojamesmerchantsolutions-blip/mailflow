const express = require('express');
const router = express.Router();
const db = require('../db');
const { google } = require('googleapis');

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI
);

router.get('/', async (req, res) => {
  try {
    const accounts = await db.all('SELECT id, email, display_name, status, daily_sent, last_reset, created_at FROM accounts ORDER BY created_at DESC');
    res.json(accounts);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/auth', (req, res) => {
  const url = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent',
    include_granted_scopes: false,
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

    const existing = await db.get('SELECT id FROM accounts WHERE email = $1', [email]);
    if (existing) {
      await db.run(
        `UPDATE accounts SET access_token = $1, refresh_token = $2, token_expiry = $3, status = 'active' WHERE email = $4`,
        [tokens.access_token, tokens.refresh_token, tokens.expiry_date, email]
      );
    } else {
      await db.run(
        `INSERT INTO accounts (email, access_token, refresh_token, token_expiry) VALUES ($1, $2, $3, $4)`,
        [email, tokens.access_token, tokens.refresh_token, tokens.expiry_date]
      );
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

router.put('/:id/display-name', async (req, res) => {
  try {
    const { display_name } = req.body;
    await db.run('UPDATE accounts SET display_name = $1 WHERE id = $2', [display_name, req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/:id/pause', async (req, res) => {
  try {
    await db.run("UPDATE accounts SET status = 'paused' WHERE id = $1", [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/:id/resume', async (req, res) => {
  try {
    await db.run("UPDATE accounts SET status = 'active' WHERE id = $1", [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    await db.run('DELETE FROM accounts WHERE id = $1', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/:id/reset', async (req, res) => {
  try {
    await db.run(
      `UPDATE accounts SET daily_sent = 0, last_reset = to_char(now(), 'YYYY-MM-DD HH24:MI:SS') WHERE id = $1`,
      [req.params.id]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
