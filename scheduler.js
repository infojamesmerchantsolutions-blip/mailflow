const cron = require('node-cron');
const db = require('./db');
const { google } = require('googleapis');

const MAX_RETRIES = 3;
const lastSentTime = {};

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
    db.prepare(`UPDATE accounts SET access_token = ?, token_expiry = ? WHERE id = ?`)
      .run(credentials.access_token, credentials.expiry_date, account.id);
    accountClient.setCredentials(credentials);
  }

  return accountClient;
}

function makeEmail(to, fromName, fromEmail, subject, bodyHtml, bodyPlain) {
  const boundary = 'mailflow_boundary';
  const fromField = fromName ? `${fromName} <${fromEmail}>` : fromEmail;
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

function pickRandomContent(campaign) {
  try {
    if (campaign.content_variations) {
      const variations = JSON.parse(campaign.content_variations);
      if (Array.isArray(variations) && variations.length > 1) {
        const pick = variations[Math.floor(Math.random() * variations.length)];
        console.log(`Picked variation: ${pick.subject}`);
        return {
          subject: pick.subject,
          body_html: pick.body_html,
          body_plain: pick.body_plain
        };
      }
      if (Array.isArray(variations) && variations.length === 1) {
        return {
          subject: variations[0].subject,
          body_html: variations[0].body_html,
          body_plain: variations[0].body_plain
        };
      }
    }
  } catch (e) {
    console.error('Error parsing content variations:', e.message);
  }
  return {
    subject: campaign.subject,
    body_html: campaign.body_html,
    body_plain: campaign.body_plain
  };
}

function pickDifferentAccount(currentAccountId) {
  const accounts = db.prepare(`
    SELECT * FROM accounts WHERE status = 'active' AND id != ?
  `).all(currentAccountId);
  if (accounts.length === 0) {
    return db.prepare(`SELECT * FROM accounts WHERE status = 'active' LIMIT 1`).get();
  }
  return accounts[Math.floor(Math.random() * accounts.length)];
}

function isWithinWindow(startTime, endTime) {
  const now = new Date();
  const current = now.getHours() * 60 + now.getMinutes();
  const [sh, sm] = startTime.split(':').map(Number);
  const [eh, em] = endTime.split(':').map(Number);
  return current >= (sh * 60 + sm) && current <= (eh * 60 + em);
}

async function processCampaign(campaign) {
  if (campaign.schedule_type === 'window') {
    if (!isWithinWindow(campaign.start_time, campaign.end_time)) {
      console.log(`Campaign "${campaign.name}" outside sending window — skipping`);
      return;
    }
  }

  const now = Date.now();
  const last = lastSentTime[campaign.id] || 0;
  const delayMs = campaign.delay_seconds * 1000;

  if (now - last < delayMs) {
    return;
  }

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
    const anyPending = db.prepare(`
      SELECT COUNT(*) as count FROM queue
      WHERE campaign_id = ? AND status = 'pending'
    `).get(campaign.id);

    if (anyPending.count === 0) {
      db.prepare("UPDATE campaigns SET status = 'completed' WHERE id = ?").run(campaign.id);
      console.log(`Campaign "${campaign.name}" completed!`);
    }
    return;
  }

  lastSentTime[campaign.id] = now;

  const content = pickRandomContent(campaign);

  try {
    console.log(`[${new Date().toISOString()}] Sending to ${queueItem.recipient_email} via ${queueItem.account_email} | Subject: ${content.subject}`);

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

    await gmail.users.messages.send({ userId: 'me', requestBody: { raw } });

    db.prepare(`
      UPDATE queue SET status = 'sent', sent_at = datetime('now') WHERE id = ?
    `).run(queueItem.id);
    db.prepare(`UPDATE campaigns SET sent_count = sent_count + 1 WHERE id = ?`).run(campaign.id);
    db.prepare(`UPDATE accounts SET daily_sent = daily_sent + 1 WHERE id = ?`).run(queueItem.acc_id);
    db.prepare(`
      INSERT INTO logs (campaign_id, account_id, recipient_email, status, message, retry_count)
      VALUES (?, ?, ?, 'sent', ?, ?)
    `).run(campaign.id, queueItem.acc_id, queueItem.recipient_email, `Sent with subject: ${content.subject}`, queueItem.retry_count || 0);

    console.log(`✓ Sent to ${queueItem.recipient_email}`);

  } catch (err) {
    console.error(`✗ Failed to send to ${queueItem.recipient_email}: ${err.message}`);

    const retryCount = (queueItem.retry_count || 0) + 1;

    if (retryCount < MAX_RETRIES) {
      const newAccount = pickDifferentAccount(queueItem.acc_id);
      const newAccountId = newAccount ? newAccount.id : queueItem.acc_id;

      db.prepare(`
        UPDATE queue
        SET retry_count = ?, last_error = ?, account_id = ?, status = 'pending'
        WHERE id = ?
      `).run(retryCount, err.message, newAccountId, queueItem.id);

      db.prepare(`
        INSERT INTO logs (campaign_id, account_id, recipient_email, status, message, retry_count)
        VALUES (?, ?, ?, 'retrying', ?, ?)
      `).run(campaign.id, queueItem.acc_id, queueItem.recipient_email, `Failed: ${err.message} — retrying with different account`, retryCount);

      console.log(`↻ Retrying ${queueItem.recipient_email} (attempt ${retryCount}/${MAX_RETRIES})`);
    } else {
      db.prepare(`
        UPDATE queue SET status = 'failed', error = ?, retry_count = ? WHERE id = ?
      `).run(err.message, retryCount, queueItem.id);
      db.prepare(`UPDATE campaigns SET failed_count = failed_count + 1 WHERE id = ?`).run(campaign.id);
      db.prepare(`
        INSERT INTO logs (campaign_id, account_id, recipient_email, status, message, retry_count)
        VALUES (?, ?, ?, 'failed', ?, ?)
      `).run(campaign.id, queueItem.acc_id, queueItem.recipient_email, `Permanently failed after ${MAX_RETRIES} attempts: ${err.message}`, retryCount);

      console.log(`✗ Permanently failed: ${queueItem.recipient_email} after ${MAX_RETRIES} attempts`);
    }
  }
}

async function processAllCampaigns() {
  try {
    const runningCampaigns = db.prepare("SELECT * FROM campaigns WHERE status = 'running'").all();
    if (runningCampaigns.length === 0) return;
    await Promise.all(runningCampaigns.map(campaign => processCampaign(campaign)));
  } catch (err) {
    console.error('Scheduler error:', err.message);
  }
}

// Reset daily counts at midnight
cron.schedule('0 0 * * *', () => {
  db.prepare("UPDATE accounts SET daily_sent = 0, last_reset = datetime('now')").run();
  console.log('Daily sent counts reset');
});

// Tick every 1 second for precise delay handling
cron.schedule('* * * * * *', async () => {
  await processAllCampaigns();
});

console.log('Scheduler started — ticking every second for precise delays');
