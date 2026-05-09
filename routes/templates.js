const express = require('express');
const router = express.Router();
const db = require('../db');

router.get('/', async (req, res) => {
  try {
    const templates = await db.all('SELECT * FROM templates ORDER BY created_at DESC');
    res.json(templates);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const template = await db.get('SELECT * FROM templates WHERE id = $1', [req.params.id]);
    if (!template) return res.status(404).json({ error: 'Template not found' });
    res.json(template);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const { name, subject, body_html, body_plain } = req.body;
    if (!name || !subject) return res.status(400).json({ error: 'Name and subject are required' });
    const result = await db.run(`
      INSERT INTO templates (name, subject, body_html, body_plain)
      VALUES ($1, $2, $3, $4)
      RETURNING id
    `, [name, subject, body_html, body_plain]);
    res.json({ id: result.rows[0].id, success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const { name, subject, body_html, body_plain } = req.body;
    await db.run(`
      UPDATE templates SET name = $1, subject = $2, body_html = $3, body_plain = $4 WHERE id = $5
    `, [name, subject, body_html, body_plain, req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    await db.run('DELETE FROM templates WHERE id = $1', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
