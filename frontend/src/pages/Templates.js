import React, { useState, useEffect, useRef } from 'react';
import { getTemplates, createTemplate, updateTemplate, deleteTemplate } from '../api';

const s = {
  title: { fontSize: '20px', fontWeight: '500', color: '#111', marginBottom: '4px' },
  sub: { fontSize: '13px', color: '#888', marginBottom: '20px' },
  topbar: { display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '20px' },
  btnPrimary: { padding: '8px 16px', fontSize: '13px', borderRadius: '8px', border: 'none', background: '#111', color: '#fff', cursor: 'pointer' },
  btnSuccess: { padding: '8px 16px', fontSize: '13px', borderRadius: '8px', border: 'none', background: '#3B6D11', color: '#fff', cursor: 'pointer' },
  btn: { padding: '6px 12px', fontSize: '12px', borderRadius: '6px', border: '0.5px solid #ccc', background: '#fff', cursor: 'pointer', marginLeft: '6px' },
  btnDanger: { padding: '6px 12px', fontSize: '12px', borderRadius: '6px', border: '0.5px solid #f7c1c1', background: '#fff', color: '#A32D2D', cursor: 'pointer', marginLeft: '6px' },
  card: { background: '#fff', border: '0.5px solid #e0e0d8', borderRadius: '12px', padding: '16px', marginBottom: '12px' },
  cardTitle: { fontSize: '14px', fontWeight: '500', color: '#111', marginBottom: '14px' },
  label: { fontSize: '12px', color: '#666', marginBottom: '5px', marginTop: '10px' },
  input: { width: '100%', fontSize: '13px', padding: '8px 10px', borderRadius: '8px', border: '0.5px solid #ccc', background: '#fff', outline: 'none' },
  editorWrap: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0', border: '0.5px solid #ccc', borderRadius: '8px', overflow: 'hidden', marginBottom: '12px' },
  editorHeader: { padding: '7px 12px', background: '#f5f5f0', borderBottom: '0.5px solid #ccc', fontSize: '12px', fontWeight: '500', color: '#666' },
  editorTextarea: { width: '100%', fontSize: '12px', padding: '10px', border: 'none', borderRight: '0.5px solid #ccc', resize: 'none', minHeight: '220px', fontFamily: 'monospace', lineHeight: '1.6', outline: 'none', background: '#fff' },
  plainTextarea: { width: '100%', fontSize: '13px', padding: '8px 10px', borderRadius: '8px', border: '0.5px solid #ccc', background: '#fff', resize: 'vertical', minHeight: '80px', lineHeight: '1.6', outline: 'none', fontFamily: 'inherit' },
  templateRow: { display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 0', borderBottom: '0.5px solid #e0e0d8' },
  templateName: { fontSize: '14px', fontWeight: '500', color: '#111' },
  templateSub: { fontSize: '12px', color: '#888', marginTop: '2px' },
  success: { background: '#eaf3de', border: '0.5px solid #c0dd97', borderRadius: '8px', padding: '10px 14px', fontSize: '13px', color: '#3B6D11', marginBottom: '12px' },
  error: { background: '#fcebeb', border: '0.5px solid #f7c1c1', borderRadius: '8px', padding: '10px 14px', fontSize: '13px', color: '#A32D2D', marginBottom: '12px' },
  divider: { border: 'none', borderTop: '0.5px solid #e0e0d8', margin: '16px 0' },
  footerBtns: { display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '16px' },
  emptyBox: { textAlign: 'center', padding: '40px', color: '#888', fontSize: '13px' },
  infoBox: { background: '#e6f1fb', border: '0.5px solid #b5d4f4', borderRadius: '8px', padding: '10px 14px', fontSize: '12px', color: '#185FA5', marginBottom: '16px' },
  previewBox: { background: '#f5f5f0', borderRadius: '8px', padding: '14px', fontSize: '13px', lineHeight: '1.7', marginTop: '8px', maxHeight: '200px', overflow: 'auto' },
};

const defaultHtml = `<h2 style="color:#111;">Hello there!</h2>
<p>This is your email content. You can use HTML to style it.</p>
<p>Add images, buttons, links and more.</p>
<a href="https://yoursite.com" style="display:inline-block;padding:10px 20px;background:#111;color:#fff;border-radius:6px;text-decoration:none;">Click here</a>
<p style="color:#888;font-size:12px;margin-top:24px;">To unsubscribe, reply to this email.</p>`;

function TemplateEditor({ template, onSave, onCancel, isEditing }) {
  const [name, setName] = useState(template?.name || '');
  const [subject, setSubject] = useState(template?.subject || '');
  const [bodyHtml, setBodyHtml] = useState(template?.body_html || defaultHtml);
  const [bodyPlain, setBodyPlain] = useState(template?.body_plain || 'Hello there!\n\nThis is your email content.\n\nTo unsubscribe, reply to this email.');
  const previewRef = useRef(null);

  useEffect(() => {
    if (previewRef.current) {
      previewRef.current.srcdoc = `
        <html>
          <body style="font-family:-apple-system,sans-serif;padding:16px;margin:0;font-size:13px;line-height:1.7;color:#111;">
            ${bodyHtml}
          </body>
        </html>`;
    }
  }, [bodyHtml]);

  const compressHtml = (html) => {
  if (!html) return '';
  return html.replace(/\s+/g, ' ').replace(/>\s+</g, '><').trim();
};

const handleSave = () => {
  if (!name || !subject) return alert('Please enter a name and subject');
  onSave({ name, subject, body_html: compressHtml(bodyHtml), body_plain: bodyPlain });
};

  return (
    <div style={s.card}>
      <div style={s.cardTitle}>{isEditing ? 'Edit template' : 'New template'}</div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
        <div>
          <div style={s.label}>Template name</div>
          <input style={s.input} placeholder="e.g. Black Friday offer" value={name} onChange={e => setName(e.target.value)} />
        </div>
        <div>
          <div style={s.label}>Subject line</div>
          <input style={s.input} placeholder="e.g. You don't want to miss this!" value={subject} onChange={e => setSubject(e.target.value)} />
        </div>
      </div>

      <div style={s.label}>Email body (HTML + live preview)</div>
      <div style={s.editorWrap}>
        <div>
          <div style={s.editorHeader}>HTML editor</div>
          <textarea
            style={s.editorTextarea}
            value={bodyHtml}
            onChange={e => setBodyHtml(e.target.value)}
            spellCheck={false}
          />
        </div>
        <div>
          <div style={s.editorHeader}>Live preview</div>
          <iframe
            ref={previewRef}
            style={{ width: '100%', minHeight: '220px', border: 'none' }}
            title="preview"
            sandbox="allow-same-origin"
          />
        </div>
      </div>

      <div style={s.label}>Plain text fallback</div>
      <textarea style={s.plainTextarea} value={bodyPlain} onChange={e => setBodyPlain(e.target.value)} />

      <div style={s.footerBtns}>
        <button style={s.btn} onClick={onCancel}>Cancel</button>
        <button style={s.btnSuccess} onClick={handleSave}>
          {isEditing ? 'Save changes' : 'Save template'}
        </button>
      </div>
    </div>
  );
}

export default function Templates() {
  const [templates, setTemplates] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [expandedId, setExpandedId] = useState(null);
  const [msg, setMsg] = useState(null);
  const [err, setErr] = useState(null);

  const load = async () => {
    try {
      const res = await getTemplates();
      setTemplates(res.data);
    } catch (e) { console.error(e); }
  };

  useEffect(() => { load(); }, []);

  const showMsg = (m) => { setMsg(m); setTimeout(() => setMsg(null), 4000); };
  const showErr = (e) => { setErr(e); setTimeout(() => setErr(null), 4000); };

  const handleCreate = async (data) => {
    try {
      await createTemplate(data);
      showMsg('Template saved!');
      setShowForm(false);
      load();
    } catch (e) { showErr('Error saving template'); }
  };

  const handleUpdate = async (data) => {
    try {
      await updateTemplate(editingTemplate.id, data);
      showMsg('Template updated!');
      setEditingTemplate(null);
      load();
    } catch (e) { showErr('Error updating template'); }
  };

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Delete template "${name}"?`)) return;
    try {
      await deleteTemplate(id);
      showMsg('Template deleted');
      load();
    } catch (e) { showErr('Error deleting template'); }
  };

  return (
    <div>
      <div style={s.topbar}>
        <div>
          <div style={s.title}>Templates</div>
          <div style={s.sub}>Create and manage reusable email templates</div>
        </div>
        {!showForm && !editingTemplate && (
          <button style={s.btnPrimary} onClick={() => setShowForm(true)}>+ New template</button>
        )}
      </div>

      {msg && <div style={s.success}>{msg}</div>}
      {err && <div style={s.error}>{err}</div>}

      <div style={s.infoBox}>
        Create templates here and use them when building campaigns. Each campaign can use multiple templates — the system randomly picks one per recipient to avoid spam filters.
      </div>

      {showForm && (
        <TemplateEditor
          onSave={handleCreate}
          onCancel={() => setShowForm(false)}
          isEditing={false}
        />
      )}

      {editingTemplate && (
        <TemplateEditor
          template={editingTemplate}
          onSave={handleUpdate}
          onCancel={() => setEditingTemplate(null)}
          isEditing={true}
        />
      )}

      <div style={s.card}>
        <div style={s.cardTitle}>Saved templates ({templates.length})</div>
        {templates.length === 0 && (
          <div style={s.emptyBox}>
            No templates yet. Create one above to get started.
          </div>
        )}
        {templates.map(t => (
          <div key={t.id}>
            <div style={s.templateRow}>
              <div style={{ flex: 1, cursor: 'pointer' }} onClick={() => setExpandedId(expandedId === t.id ? null : t.id)}>
                <div style={s.templateName}>{t.name}</div>
                <div style={s.templateSub}>Subject: {t.subject} · Created {new Date(t.created_at).toLocaleDateString()}</div>
              </div>
              <button style={s.btn} onClick={() => { setEditingTemplate(t); setShowForm(false); }}>Edit</button>
              <button style={s.btnDanger} onClick={() => handleDelete(t.id, t.name)}>Delete</button>
            </div>
            {expandedId === t.id && (
              <div style={s.previewBox} dangerouslySetInnerHTML={{ __html: t.body_html }} />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
