const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

// Create all tables
async function initDB() {
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS accounts (
        id SERIAL PRIMARY KEY,
        email TEXT NOT NULL UNIQUE,
        display_name TEXT,
        access_token TEXT,
        refresh_token TEXT,
        token_expiry BIGINT,
        daily_sent INTEGER DEFAULT 0,
        last_reset TEXT,
        status TEXT DEFAULT 'active',
        created_at TEXT DEFAULT to_char(now(), 'YYYY-MM-DD HH24:MI:SS')
      );

      CREATE TABLE IF NOT EXISTS contacts (
        id SERIAL PRIMARY KEY,
        list_name TEXT NOT NULL,
        email TEXT NOT NULL,
        created_at TEXT DEFAULT to_char(now(), 'YYYY-MM-DD HH24:MI:SS')
      );

      CREATE TABLE IF NOT EXISTS campaigns (
        id SERIAL PRIMARY KEY,
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
        created_at TEXT DEFAULT to_char(now(), 'YYYY-MM-DD HH24:MI:SS')
      );

      CREATE TABLE IF NOT EXISTS templates (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        subject TEXT NOT NULL,
        body_html TEXT,
        body_plain TEXT,
        created_at TEXT DEFAULT to_char(now(), 'YYYY-MM-DD HH24:MI:SS')
      );

      CREATE TABLE IF NOT EXISTS queue (
        id SERIAL PRIMARY KEY,
        campaign_id INTEGER NOT NULL,
        recipient_email TEXT NOT NULL,
        account_id INTEGER,
        status TEXT DEFAULT 'pending',
        retry_count INTEGER DEFAULT 0,
        last_error TEXT,
        scheduled_at TEXT,
        sent_at TEXT,
        error TEXT
      );

      CREATE TABLE IF NOT EXISTS logs (
        id SERIAL PRIMARY KEY,
        campaign_id INTEGER,
        account_id INTEGER,
        recipient_email TEXT,
        status TEXT,
        message TEXT,
        retry_count INTEGER DEFAULT 0,
        created_at TEXT DEFAULT to_char(now(), 'YYYY-MM-DD HH24:MI:SS')
      );
    `);
    console.log('Database initialized successfully');
  } finally {
    client.release();
  }
}

initDB().catch(console.error);

// Helper to run queries easily
const db = {
  query: (text, params) => pool.query(text, params),
  
  // Mimics SQLite's prepare().get() — returns single row
  async get(text, params) {
    const res = await pool.query(text, params);
    return res.rows[0] || null;
  },

  // Mimics SQLite's prepare().all() — returns all rows
  async all(text, params) {
    const res = await pool.query(text, params);
    return res.rows;
  },

  // Mimics SQLite's prepare().run() — returns lastID
  async run(text, params) {
    const res = await pool.query(text, params);
    return res;
  }
};

module.exports = db;
