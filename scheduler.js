const cron = require('node-cron');
const db = require('./db');
const { google } = require('googleapis');

async function getAuthForAccount(account) {
  const accountClient = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
  );

  accountClient.setCredentials({
    access_token: account.access_token,
    refresh_token: account.refresh_token,
    expiry_date: account.token_expiry
  });

  if (Date.now() > account.token_expiry) {
    const { credentials } = await accountClient.refreshAccessToken();
    db.prepare(`
      UPDATE accounts SET access_token = ?, token_expiry = ? WHERE id = ?
    `).run(credentials.access_token, credentials.expiry_date, account.id);
    accountClient.setCredentials(credentials);
  }

  return accountClient;
}

function makeEmail(to, fromName, fromEmail, subject, bodyHtml, bodyPlain) {
  const boundary = 'mailflow_boundary';
  const fromField = fromName
    ? `${fromName} <${fromEmail}>`
    : fromEmail;

  const message = [
    `To: ${to}`,
    `From: ${fromField}`,
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

function pickContent(campaign) {
  // Try to use content variations if available
  if (campaign.content_variations) {
    try {
      const variations = JSON.parse(campaign.content_variations);
      if (variations && variations.length > 0) {
        // Pick random variation
        const pick = variations[Math.floor(Math.random() * variations.length)];
        return {
          subject: pick.subject,
          body_html: pick.body_html,
          body_plain: pick.body_plain
        };
      }
    } catch (e) {}
  }

  // Fall back to main campaign content
  return {
    subject: campaign.subject,
    body_html: campaign.body_html,
    body_plain: campaign.body_plain
  };
}

async function processSendQueue() {
  try {
    const runningCampaigns = db.prepare("SELECT * FROM campaigns WHERE status = 'running'").all();
    if (runningCampaigns.length === 0) return;

    for (const campaign of runningCampaigns) {
      const queueItem = db.prepare(`
        SELECT q.*, 
          a.email as account_email, 
          a.display_name as account_display_name,
          a.access_token, 
          a.refresh_token, 
          a.token_expiry, 
          a.id as acc_id
        FROM queue q
        JOIN accounts a ON q.account_id = a.id
        WHERE q.campaign_id = ? 
          AND q.status = 'pending' 
          AND a.status = 'active'
        ORDER BY q.id ASC
        LIMIT 1
      `).get(campaign.id);

      if (!queueItem) {
        const remaining = db.prepare(`
          SELECT COUNT(*) as count FROM queue 
          WHERE campaign_id = ? AND status = 'pending'
        `).get(campaign.id);

        if (remaining.count === 0) {
          db.prepare("UPDATE campaigns SET status = 'completed' WHERE id = ?").run(campaign.id);
          console.log(`Campaign "${campaign.name}" completed!`);
        } else {
          console.log(`Campaign "${campaign.name}" has ${remaining.count} pending but no active accounts`);
        }
        continue;
      }

      try {
        // Pick random content variation
        const content = pickContent(campaign);

        console.log(`Sending to ${queueItem.recipient_email} via ${queueItem.account_email}...`);

        const auth = await getAuthForAccount({
          id: queueItem.acc_id,
          access_token: queueItem.access_token,
          refresh_token: queueItem.refresh_token,
          token_expiry: queueItem.token_expiry
        });

        const gmail = google.gmail({ version: 'v1', auth });

        const raw = makeEmail(
          queueItem.recipient_email,
          queueItem.account_display_name,
          queueItem.account_email,
          content.subject,
          content.body_html,
          content.body_plain
        );

        await gmail.users.messages.send({
          userId: 'me',
          requestBody: { raw }
        });

        db.prepare("UPDATE queue SET status = 'sent', sent_at = datetime('now') WHERE id = ?").run(queueItem.id);
        db.prepare("UPDATE campaigns SET sent_count = sent_count + 1 WHERE id = ?").run(campaign.id);
        db.prepare("UPDATE accounts SET daily_sent = daily_sent + 1 WHERE id = ?").run(queueItem.acc_id);
        db.prepare(`
          INSERT INTO logs (campaign_id, account_id, recipient_email, status, message)
          VALUES (?, ?, ?, 'sent', 'Email sent successfully')
        `).run(campaign.id, queueItem.acc_id, queueItem.recipient_email);

        console.log(`Successfully sent to ${queueItem.recipient_email}`);

      } catch (err) {
        console.error(`Failed to send to ${queueItem.recipient_email}:`, err.message);
        db.prepare("UPDATE queue SET status = 'failed', error = ? WHERE id = ?").run(err.message, queueItem.id);
        db.prepare("UPDATE campaigns SET failed_count = failed_count + 1 WHERE id = ?").run(campaign.id);
        db.prepare(`
          INSERT INTO logs (campaign_id, account_id, recipient_email, status, message)
          VALUES (?, ?, ?, 'failed', ?)
        `).run(campaign.id, queueItem.acc_id, queueItem.recipient_email, err.message);
      }
    }
  } catch (err) {
    console.error('Scheduler error:', err.message);
  }
}

// Reset daily counts at midnight
cron.schedule('0 0 * * *', () => {
  db.prepare("UPDATE accounts SET daily_sent = 0, last_reset = datetime('now')").run();
  console.log('Daily sent counts reset');
});

// Run every 30 seconds
cron.schedule('*/30 * * * * *', async () => {
  console.log('Scheduler tick — checking queue...');
  await processSendQueue();
});

console.log('Scheduler started — running every 30 seconds');
