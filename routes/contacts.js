const express = require('express');
const router = express.Router();
const db = require('../db');
const multer = require('multer');
const csv = require('csv-parser');
const fs = require('fs');

const upload = multer({ dest: 'uploads/' });

router.get('/lists', (req, res) => {
  try {
    const lists = db.prepare(`
      SELECT list_name, COUNT(*) as count, MAX(created_at) as created_at
      FROM contacts
      GROUP BY list_name
      ORDER BY created_at DESC
    `).all();
    res.json(lists);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/lists/:name', (req, res) => {
  try {
    const contacts = db.prepare(
      'SELECT * FROM contacts WHERE list_name = ? ORDER BY created_at DESC'
    ).all(req.params.name);
    res.json(contacts);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/manual', (req, res) => {
  try {
    const { list_name, emails } = req.body;

    if (!list_name || !emails || emails.length === 0) {
      return res.status(400).json({ error: 'List name and emails are required' });
    }

    const insert = db.prepare(
      'INSERT OR IGNORE INTO contacts (list_name, email) VALUES (?, ?)'
    );

    const insertMany = db.transaction(() => {
      emails.forEach(email => {
        const clean = email.trim().toLowerCase();
        if (clean) insert.run(list_name, clean);
      });
    });

    insertMany();

    res.json({ success: true, added: emails.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/upload', upload.single('file'), (req, res) => {
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
      .on('end', () => {
        const insert = db.prepare(
          'INSERT OR IGNORE INTO contacts (list_name, email) VALUES (?, ?)'
        );

        const insertMany = db.transaction(() => {
          emails.forEach(email => insert.run(list_name, email));
        });

        insertMany();
        fs.unlinkSync(filePath);

        res.json({ success: true, added: emails.length });
      })
      .on('error', (err) => {
        res.status(500).json({ error: err.message });
      });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/lists/:name', (req, res) => {
  try {
    db.prepare('DELETE FROM contacts WHERE list_name = ?').run(req.params.name);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
