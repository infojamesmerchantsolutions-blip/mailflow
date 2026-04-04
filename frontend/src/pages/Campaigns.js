import React, { useState, useEffect } from 'react';
import { getCampaigns, createCampaign, launchCampaign, pauseCampaign, resumeCampaign, deleteCampaign, getContactLists } from '../api';

const s = {
  title: { fontSize: '20px', fontWeight: '500', color: '#111', marginBottom: '4px' },
  sub: { fontSize: '13px', color: '#888', marginBottom: '20px' },
  topbar: { display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '20px' },
  btnPrimary: { padding: '8px 16px', fontSize: '13px', borderRadius: '8px', border: 'none', background: '#111', color: '#fff', cursor: 'pointer' },
  btn: { padding: '6px 12px', fontSize: '12px', borderRadius: '6px', border: '0.5px solid #ccc', background: '#fff', cursor: 'pointer', marginLeft: '6px' },
  btnDanger: { padding: '6px 12px', fontSize: '12px', borderRadius: '6px', border: '0.5px solid #f7c1c1', background: '#fff', color: '#A32D2D', cursor: 'pointer', marginLeft: '6px' },
  card: { background: '#fff', border: '0.5px solid #e0e0d8', borderRadius: '12px', padding: '16px', marginBottom: '12px' },
  cardTitle: { fontSize: '14px', fontWeight: '500', color: '#111', marginBottom: '14px' },
  label: { fontSize: '12px', color: '#666', marginBottom: '5px' },
  input: { width: '100%', fontSize: '13px', padding: '8px 10px', borderRadius: '8px', border: '0.5px solid #ccc', marginBottom: '12px', background: '#fff' },
  textarea: { width: '100%', fontSize: '13px', padding: '8px 10px', borderRadius: '8px', border: '0.5px solid #ccc', marginBottom: '12px', background: '#fff', resize: 'vertical', minHeight: '120px', fontFamily: 'monospace', lineHeight: '1.6' },
  select: { width: '100%', fontSize: '13px', padding: '8px 10px', borderRadius: '8px', border: '0.5px solid #ccc', marginBottom: '12px', background: '#fff' },
  row2: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' },
  row3: { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' },
  campRow: { display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 0', borderBottom: '0.5px solid #e0e0d8' },
  campName: { fontSize: '14px', color: '#111', fontWeight: '500' },
  campSub: { fontSize: '12px', color: '#888', marginTop: '3px' },
  progressBar: { height: '4px', background: '#f0f0ea', borderRadius: '2px', marginTop: '6px', overflow: 'hidden', width: '120px' },
  progressFill: { height: '100%', borderRadius: '2px', background: '#185FA5' },
  pill: { fontSize: '10px', fontWeight: '500', padding: '3px 10px', borderRadius: '999px' },
  pillRunning: { background: '#eaf3de', color: '#3B6D11' },
  pillPaused: { background: '#faeeda', color: '#854F0B' },
  pillDraft: { background: '#f0f0ea', color: '#666' },
  pillCompleted: { background: '#e6f1fb', color: '#185FA5' },
  success: { background: '#eaf3de', border: '0.5px solid #c0dd97', borderRadius: '8px', padding: '10px 14px', fontSize: '13px', color: '#3B6D11', marginBottom: '12px' },
  error: { background: '#fcebeb', border: '0.5px solid #f7c1c1', borderRadius: '8px', padding: '10px 14px', fontSize: '13px', color: '#A32D2D', marginBottom: '12px' },
  scheduleGrid: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', marginBottom: '12px' },
  schedOpt: { border: '0.5px solid #ccc', borderRadius: '8px', padding: '10px 12px', cursor: 'pointer', textAlign: 'center' },
  schedOptSel: { border: '1.5px solid #185FA5', background: '#e6f1fb' },
  schedLabel: { fontSize: '13px', fontWeight: '500', color: '#111' },
  schedSub: { fontSize: '11px', color: '#888', marginTop: '2px' },
};

const speedOptions = [
  { label: 'Safe', sub: '60s between emails', value: 60 },
  { label: 'Balanced', sub: '30s between emails', value: 30 },
  { label: 'Fast', sub: '10s between emails', value: 10 },
];

export default function Campaigns() {
  const [campaigns, setCampaigns] = useState([]);
  const [lists, setLists] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [msg, setMsg] = useState(null);
  const [err, setErr] = useState(null);
  const [form, setForm] = useState({
    name: '', subject: '', body_html: '', body_plain: '',
    contact_list: '', delay_seconds: 30, start_time: '08:00', end_time: '22:00'
  });
  const [speed, setSpeed] = useState(30);

  const load = async () => {
    try {
      const [c, l] = await Promise.all([getCampaigns(), getContactLists()]);
      setCampaigns(c.data);
      setLists(l.data);
    } catch (e) { console.error(e); }
  };

  useEffect(() => { load(); }, []);

  const showMsg = (m) => { setMsg(m); setTimeout(() => setMsg(null), 4000); };
  const showErr = (e) => { setErr(e); setTimeout(() => setErr(null), 4000); };

  const handleCreate = async () => {
    if (!form.name || !form.subject || !form.contact_list) return showErr('Please fill in name, subject and contact list');
    if (!form.body_html && !form.body_plain) return showErr('Please add an email body');
    try {
      const res = await createCampaign({ ...form, delay_seconds: speed });
      showMsg('Campaign created!');
      setShowForm(false);
      setForm({ name: '', subject: '', body_html: '', body_plain: '', contact_list: '', delay_seconds: 30, start_time: '08:00', end_time: '22:00' });
      load();
      return res.data.id;
    } catch (e) { showErr('Error creating campaign'); }
  };

  const handleLaunch = async (id) => {
    try {
      await launchCampaign(id);
      showMsg('Campaign launched! Emails are being sent.');
      load();
    } catch (e) { showErr(e.response?.data?.error || 'Error launching campaign'); }
  };

  const handleCreateAndLaunch = async () => {
    if (!form.name || !form.subject || !form.contact_list) return showErr('Please fill in name, subject and contact list');
    if (!form.body_html && !form.body_plain) return showErr('Please add an email body');
    try {
      const res = await createCampaign({ ...form, delay_seconds: speed });
      await launchCampaign(res.data.id);
      showMsg('Campaign launched! Emails are being sent.');
      setShowForm(false);
      setForm({ name: '', subject: '', body_html: '', body_plain: '', contact_list: '', delay_seconds: 30, start_time: '08:00', end_time: '22:00' });
      load();
    } catch (e) { showErr(e.response?.data?.error || 'Error launching campaign'); }
  };

  const handlePause = async (id) => {
    try { await pauseCampaign(id); load(); } catch (e) { showErr('Error pausing'); }
  };

  const handleResume = async (id) => {
    try { await resumeCampaign(id); load(); } catch (e) { showErr('Error resuming'); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this campaign?')) return;
    try { await deleteCampaign(id); load(); } catch (e) { showErr('Error deleting'); }
  };

  const getPillStyle = (status) => {
    if (status === 'running') return { ...s.pill, ...s.pillRunning };
    if (status === 'paused') return { ...s.pill, ...s.pillPaused };
    if (status === 'completed') return { ...s.pill, ...s.pillCompleted };
    return { ...s.pill, ...s.pillDraft };
  };

  const getPct = (c) => c.total_contacts > 0 ? Math.round((c.sent_count / c.total_contacts) * 100) : 0;

  return (
    <div>
      <div style={s.topbar}>
        <div>
          <div style={s.title}>Campaigns</div>
          <div style={s.sub}>Create and manage your email campaigns</div>
        </div>
        <button style={s.btnPrimary} onClick={() => setShowForm(!showForm)}>
          {showForm ? 'Cancel' : '+ New campaign'}
        </button>
      </div>

      {msg && <div style={s.success}>{msg}</div>}
      {err && <div style={s.error}>{err}</div>}

      {showForm && (
        <div style={s.card}>
          <div style={s.cardTitle}>New campaign</div>

          <div style={s.row2}>
            <div>
              <div style={s.label}>Campaign name</div>
              <input style={s.input} placeholder="e.g. Black Friday promo" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
            </div>
            <div>
              <div style={s.label}>Contact list</div>
              <select style={s.select} value={form.contact_list} onChange={e => setForm({ ...form, contact_list: e.target.value })}>
                <option value="">Select a list...</option>
                {lists.map(l => <option key={l.list_name} value={l.list_name}>{l.list_name} ({l.count})</option>)}
              </select>
            </div>
          </div>

          <div style={s.label}>Email subject line</div>
          <input style={s.input} placeholder="e.g. You don't want to miss this!" value={form.subject} onChange={e => setForm({ ...form, subject: e.target.value })} />

          <div style={s.label}>Email body (HTML)</div>
          <textarea style={s.textarea} placeholder={'<h2>Hello!</h2>\n<p>Your message here...</p>'} value={form.body_html} onChange={e => setForm({ ...form, body_html: e.target.value })} />

          <div style={s.label}>Email body (Plain text fallback)</div>
          <textarea style={{ ...s.textarea, minHeight: '80px', fontFamily: 'inherit' }} placeholder="Plain text version of your email..." value={form.body_plain} onChange={e => setForm({ ...form, body_plain: e.target.value })} />

          <div style={s.label}>Sending speed</div>
          <div style={s.scheduleGrid}>
            {speedOptions.map(opt => (
              <div key={opt.value} style={{ ...s.schedOpt, ...(speed === opt.value ? s.schedOptSel : {}) }} onClick={() => setSpeed(opt.value)}>
                <div style={{ ...s.schedLabel, ...(speed === opt.value ? { color: '#185FA5' } : {}) }}>{opt.label}</div>
                <div style={s.schedSub}>{opt.sub}</div>
              </div>
            ))}
          </div>

          <div style={s.row3}>
            <div>
              <div style={s.label}>Custom delay (seconds)</div>
              <input style={s.input} type="number" value={speed} onChange={e => setSpeed(Number(e.target.value))} />
            </div>
            <div>
              <div style={s.label}>Start sending at</div>
              <input style={s.input} type="time" value={form.start_time} onChange={e => setForm({ ...form, start_time: e.target.value })} />
            </div>
            <div>
              <div style={s.label}>Stop sending at</div>
              <input style={s.input} type="time" value={form.end_time} onChange={e => setForm({ ...form, end_time: e.target.value })} />
            </div>
          </div>

          <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
            <button style={s.btn} onClick={handleCreate}>Save as draft</button>
            <button style={s.btnPrimary} onClick={handleCreateAndLaunch}>Launch campaign</button>
          </div>
        </div>
      )}

      <div style={s.card}>
        <div style={s.cardTitle}>All campaigns ({campaigns.length})</div>
        {campaigns.length === 0 && <div style={{ fontSize: '13px', color: '#888', padding: '20px 0' }}>No campaigns yet. Create one above.</div>}
        {campaigns.map(c => (
          <div key={c.id} style={s.campRow}>
            <div style={{ flex: 1 }}>
              <div style={s.campName}>{c.name}</div>
              <div style={s.campSub}>{c.contact_list} · {c.delay_seconds}s delay · {c.sent_count}/{c.total_contacts} sent</div>
              <div style={s.progressBar}>
                <div style={{ ...s.progressFill, width: `${getPct(c)}%` }} />
              </div>
            </div>
            <span style={getPillStyle(c.status)}>{c.status}</span>
            {c.status === 'draft' && <button style={s.btn} onClick={() => handleLaunch(c.id)}>Launch</button>}
            {c.status === 'running' && <button style={s.btn} onClick={() => handlePause(c.id)}>Pause</button>}
            {c.status === 'paused' && <button style={s.btn} onClick={() => handleResume(c.id)}>Resume</button>}
            <button style={s.btnDanger} onClick={() => handleDelete(c.id)}>Delete</button>
          </div>
        ))}
      </div>
    </div>
  );
}
