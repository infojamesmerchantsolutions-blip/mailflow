const express = require('express');
const router = express.Router();
const db = require('../db');
const multer = require('multer');
const csv = require('csv-parser');
const fs = require('fs');

const upload = multer({ dest: 'uploads/' });

router.get('/lists', async (req, res) => {
  try {
    const lists = await db.all(`
      SELECT list_name, COUNT(*) as count, MAX(created_at) as created_at
      FROM contacts
      GROUP BY list_name
      ORDER BY MAX(created_at) DESC
    `);
    res.json(lists);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/lists/:name', async (req, res) => {
  try {
    const contacts = await db.all(
      'SELECT * FROM contacts WHERE list_name = $1 ORDER BY created_at DESC',
      [req.params.name]
    );
    res.json(contacts);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/manual', async (req, res) => {
  try {
    const { list_name, emails } = req.body;
    if (!list_name || !emails || emails.length === 0) {
      return res.status(400).json({ error: 'List name and emails are required' });
    }

    let added = 0;
    for (const email of emails) {
      const clean = email.trim().toLowerCase();
      if (clean) {
        try {
          await db.run(
            'INSERT INTO contacts (list_name, email) VALUES ($1, $2) ON CONFLICT DO NOTHING',
            [list_name, clean]
          );
          added++;
        } catch (e) {}
      }
    }

    res.json({ success: true, added });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/upload', upload.single('file'), async (req, res) => {
  try {
    const { list_name } = req.body;
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

    const emails = [];
    const filePath = req.file.path;

    fs.createReadStream(filePath)
      .pipe(csv())
      .on('data', (row) => {
        const email = row.email || row.Email || row.EMAIL;
        if (email && email.trim()) {
          emails.push(email.trim().toLowerCase());
        }
      })
      .on('end', async () => {
        let added = 0;
        for (const email of emails) {
          try {
            await db.run(
              'INSERT INTO contacts (list_name, email) VALUES ($1, $2) ON CONFLICT DO NOTHING',
              [list_name, email]
            );
            added++;
          } catch (e) {}
        }
        fs.unlinkSync(filePath);
        res.json({ success: true, added });
      })
      .on('error', (err) => {
        res.status(500).json({ error: err.message });
      });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/lists/:name', async (req, res) => {
  try {
    await db.run('DELETE FROM contacts WHERE list_name = $1', [req.params.name]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
