const cron = require('node-cron');
const db = require('./db');
const { google } = require('googleapis');

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI
);

async function getAuthForAccount(account) {
  oauth2Client.setCredentials({
    access_token: account.access_token,
    refresh_token: account.refresh_token,
    expiry_date: account.token_expiry
  });

  if (Date.now() > account.token_expiry) {
    const { credentials } = await oauth2Client.refreshAccessToken();
    db.prepare(`
      UPDATE accounts SET access_token = ?, token_expiry = ? WHERE id = ?
    `).run(credentials.access_token, credentials.expiry_date, account.id);
    oauth2Client.setCredentials(credentials);
  }

  return oauth2Client;
}

function makeEmail(to, subject, bodyHtml, bodyPlain) {
  const boundary = 'mailflow_boundary';
  const message = [
    `To: ${to}`,
    `Subject: ${subject}`,
    'MIME-Version: 1.0',
    `Content-Type: multipart/alternative; boundary="${boundary}"`,
    '',
    `--${boundary}`,
    'Content-Type: text/plain; charset=UTF-8',
    '',
    bodyPlain || '',
    '',
    `--${boundary}`,
    'Content-Type: text/html; charset=UTF-8',
    '',
    bodyHtml || '',
    '',
    `--${boundary}--`
  ].join('\n');

  return Buffer.from(message)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

function isWithinSendingWindow(startTime, endTime) {
  const now = new Date();
  const current = now.getHours() * 60 + now.getMinutes();
  const [startH, startM] = startTime.split(':').map(Number);
  const [endH, endM] = endTime.split(':').map(Number);
  return current >= (startH * 60 + startM) && current <= (endH * 60 + endM);
}

async function sendNextEmail() {
  const runningCampaigns = db.prepare("SELECT * FROM campaigns WHERE status = 'running'").all();
  if (runningCampaigns.length === 0) return;

  for (const campaign of runningCampaigns) {
    if (!isWithinSendingWindow(campaign.start_time, campaign.end_time)) continue;

    const queueItem = db.prepare(`
      SELECT q.*, a.email as account_email, a.access_token, a.refresh_token, a.token_expiry
      FROM queue q
      JOIN accounts a ON q.account_id = a.id
      WHERE q.campaign_id = ? AND q.status = 'pending'
      ORDER BY q.id ASC
      LIMIT 1
    `).get(campaign.id);

    if (!queueItem) {
      db.prepare("UPDATE campaigns SET status = 'completed' WHERE id = ?").run(campaign.id);
      continue;
    }

    try {
      const auth = await getAuthForAccount({
        id: queueItem.account_id,
        access_token: queueItem.access_token,
        refresh_token: queueItem.refresh_token,
        token_expiry: queueItem.token_expiry
      });

      const gmail = google.gmail({ version: 'v1', auth });
      const raw = makeEmail(
        queueItem.recipient_email,
        campaign.subject,
        campaign.body_html,
        campaign.body_plain
      );

      await gmail.users.messages.send({
        userId: 'me',
        requestBody: { raw }
      });

      db.prepare("UPDATE queue SET status = 'sent', sent_at = datetime('now') WHERE id = ?").run(queueItem.id);
      db.prepare("UPDATE campaigns SET sent_count = sent_count + 1 WHERE id = ?").run(campaign.id);
      db.prepare("UPDATE accounts SET daily_sent = daily_sent + 1 WHERE id = ?").run(queueItem.account_id);
      db.prepare(`
        INSERT INTO logs (campaign_id, account_id, recipient_email, status, message)
        VALUES (?, ?, ?, 'sent', 'Email sent successfully')
      `).run(campaign.id, queueItem.account_id, queueItem.recipient_email);

    } catch (err) {
      db.prepare("UPDATE queue SET status = 'failed', error = ? WHERE id = ?").run(err.message, queueItem.id);
      db.prepare("UPDATE campaigns SET failed_count = failed_count + 1 WHERE id = ?").run(campaign.id);
      db.prepare(`
        INSERT INTO logs (campaign_id, account_id, recipient_email, status, message)
        VALUES (?, ?, ?, 'failed', ?)
      `).run(campaign.id, queueItem.account_id, queueItem.recipient_email, err.message);
    }
  }
}

cron.schedule('0 0 * * *', () => {
  db.prepare("UPDATE accounts SET daily_sent = 0, last_reset = datetime('now')").run();
  console.log('Daily sent counts reset');
});

let lastSent = {};
cron.schedule('*/10 * * * * *', async () => {
  const runningCampaigns = db.prepare("SELECT * FROM campaigns WHERE status = 'running'").all();
  for (const campaign of runningCampaigns) {
    const now = Date.now();
    const last = lastSent[campaign.id] || 0;
    if (now - last >= campaign.delay_seconds * 1000) {
      lastSent[campaign.id] = now;
      await sendNextEmail();
    }
  }
});

console.log('Scheduler started');
