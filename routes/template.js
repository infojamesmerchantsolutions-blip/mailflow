const express = require('express');
const router = express.Router();
const db = require('../db');

// Get all templates
router.get('/', (req, res) => {
  try {
    const templates = db.prepare('SELECT * FROM templates ORDER BY created_at DESC').all();
    res.json(templates);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get single template
router.get('/:id', (req, res) => {
  try {
    const template = db.prepare('SELECT * FROM templates WHERE id = ?').get(req.params.id);
    if (!template) return res.status(404).json({ error: 'Template not found' });
    res.json(template);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create template
router.post('/', (req, res) => {
  try {
    const { name, subject, body_html, body_plain } = req.body;
    if (!name || !subject) return res.status(400).json({ error: 'Name and subject are required' });
    const result = db.prepare(`
      INSERT INTO templates (name, subject, body_html, body_plain)
      VALUES (?, ?, ?, ?)
    `).run(name, subject, body_html, body_plain);
    res.json({ id: result.lastInsertRowid, success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update template
router.put('/:id', (req, res) => {
  try {
    const { name, subject, body_html, body_plain } = req.body;
    db.prepare(`
      UPDATE templates SET name = ?, subject = ?, body_html = ?, body_plain = ? WHERE id = ?
    `).run(name, subject, body_html, body_plain, req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete template
router.delete('/:id', (req, res) => {
  try {
    db.prepare('DELETE FROM templates WHERE id = ?').run(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
