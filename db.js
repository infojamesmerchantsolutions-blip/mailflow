const Database = require('better-sqlite3');
const path = require('path');

const db = new Database(path.join(__dirname, 'mailflow.db'));

db.exec(`
  CREATE TABLE IF NOT EXISTS accounts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT NOT NULL UNIQUE,
    display_name TEXT,
    access_token TEXT,
    refresh_token TEXT,
    token_expiry INTEGER,
    daily_sent INTEGER DEFAULT 0,
    last_reset TEXT,
    status TEXT DEFAULT 'active',
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS contacts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    list_name TEXT NOT NULL,
    email TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS campaigns (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    subject TEXT NOT NULL,
    body_html TEXT,
    body_plain TEXT,
    contact_list TEXT NOT NULL,
    delay_seconds INTEGER DEFAULT 30,
    start_time TEXT DEFAULT '00:00',
    end_time TEXT DEFAULT '23:59',
    schedule_type TEXT DEFAULT 'immediate',
    content_variations TEXT,
    content_mode TEXT DEFAULT 'random',
    status TEXT DEFAULT 'draft',
    total_contacts INTEGER DEFAULT 0,
    sent_count INTEGER DEFAULT 0,
    failed_count INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS templates (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    subject TEXT NOT NULL,
    body_html TEXT,
    body_plain TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS queue (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    campaign_id INTEGER NOT NULL,
    recipient_email TEXT NOT NULL,
    account_id INTEGER,
    status TEXT DEFAULT 'pending',
    retry_count INTEGER DEFAULT 0,
    last_error TEXT,
    scheduled_at TEXT,
    sent_at TEXT,
    error TEXT,
    FOREIGN KEY (campaign_id) REFERENCES campaigns(id),
    FOREIGN KEY (account_id) REFERENCES accounts(id)
  );

  CREATE TABLE IF NOT EXISTS logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    campaign_id INTEGER,
    account_id INTEGER,
    recipient_email TEXT,
    status TEXT,
    message TEXT,
    retry_count INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now'))
  );
`);

// Migrations
const migrations = [
  `ALTER TABLE campaigns ADD COLUMN schedule_type TEXT DEFAULT 'immediate'`,
  `ALTER TABLE campaigns ADD COLUMN content_variations TEXT`,
  `ALTER TABLE campaigns ADD COLUMN content_mode TEXT DEFAULT 'random'`,
  `ALTER TABLE accounts ADD COLUMN display_name TEXT`,
  `ALTER TABLE queue ADD COLUMN retry_count INTEGER DEFAULT 0`,
  `ALTER TABLE queue ADD COLUMN last_error TEXT`,
  `ALTER TABLE logs ADD COLUMN retry_count INTEGER DEFAULT 0`,
];

migrations.forEach(sql => {
  try { db.exec(sql); } catch (e) {}
});

module.exports = db;
