import React, { useState, useEffect, useRef } from 'react';
import { getCampaigns, createCampaign, launchCampaign, pauseCampaign, resumeCampaign, deleteCampaign, getContactLists } from '../api';

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
  select: { width: '100%', fontSize: '13px', padding: '8px 10px', borderRadius: '8px', border: '0.5px solid #ccc', background: '#fff' },
  row2: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' },
  row3: { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' },
  editorWrap: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0', border: '0.5px solid #ccc', borderRadius: '8px', overflow: 'hidden', marginBottom: '12px' },
  editorPane: { display: 'flex', flexDirection: 'column' },
  editorHeader: { padding: '8px 12px', background: '#f5f5f0', borderBottom: '0.5px solid #ccc', fontSize: '12px', fontWeight: '500', color: '#666' },
  editorTextarea: { width: '100%', fontSize: '12px', padding: '12px', border: 'none', borderRight: '0.5px solid #ccc', resize: 'none', minHeight: '260px', fontFamily: 'monospace', lineHeight: '1.6', outline: 'none', background: '#fff' },
  previewPane: { background: '#fff', minHeight: '260px', overflow: 'auto' },
  previewInner: { padding: '16px', fontSize: '13px', lineHeight: '1.7' },
  plainTextarea: { width: '100%', fontSize: '13px', padding: '8px 10px', borderRadius: '8px', border: '0.5px solid #ccc', background: '#fff', resize: 'vertical', minHeight: '80px', lineHeight: '1.6', outline: 'none', fontFamily: 'inherit' },
  scheduleGrid: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', marginBottom: '12px', marginTop: '6px' },
  schedOpt: { border: '0.5px solid #ccc', borderRadius: '8px', padding: '10px 12px', cursor: 'pointer', textAlign: 'center' },
  schedOptSel: { border: '1.5px solid #185FA5', background: '#e6f1fb' },
  schedLabel: { fontSize: '13px', fontWeight: '500', color: '#111' },
  schedLabelSel: { fontSize: '13px', fontWeight: '500', color: '#185FA5' },
  schedSub: { fontSize: '11px', color: '#888', marginTop: '2px' },
  speedGrid: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', marginBottom: '12px', marginTop: '6px' },
  speedOpt: { border: '0.5px solid #ccc', borderRadius: '8px', padding: '10px 12px', cursor: 'pointer', textAlign: 'center' },
  speedOptSel: { border: '1.5px solid #185FA5', background: '#e6f1fb' },
  campRow: { display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 0', borderBottom: '0.5px solid #e0e0d8' },
  campName: { fontSize: '14px', color: '#111', fontWeight: '500' },
  campSub: { fontSize: '12px', color: '#888', marginTop: '3px' },
  progressBar: { height: '4px', background: '#f0f0ea', borderRadius: '2px', marginTop: '6px', overflow: 'hidden', width: '140px' },
  progressFill: { height: '100%', borderRadius: '2px', background: '#185FA5' },
  pill: { fontSize: '10px', fontWeight: '500', padding: '3px 10px', borderRadius: '999px' },
  pillRunning: { background: '#eaf3de', color: '#3B6D11' },
  pillPaused: { background: '#faeeda', color: '#854F0B' },
  pillDraft: { background: '#f0f0ea', color: '#666' },
  pillCompleted: { background: '#e6f1fb', color: '#185FA5' },
  success: { background: '#eaf3de', border: '0.5px solid #c0dd97', borderRadius: '8px', padding: '10px 14px', fontSize: '13px', color: '#3B6D11', marginBottom: '12px' },
  error: { background: '#fcebeb', border: '0.5px solid #f7c1c1', borderRadius: '8px', padding: '10px 14px', fontSize: '13px', color: '#A32D2D', marginBottom: '12px' },
  infoBox: { background: '#e6f1fb', border: '0.5px solid #b5d4f4', borderRadius: '8px', padding: '10px 14px', fontSize: '12px', color: '#185FA5', marginTop: '8px', marginBottom: '4px' },
  divider: { border: 'none', borderTop: '0.5px solid #e0e0d8', margin: '16px 0' },
  footerBtns: { display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '16px' },
};

const speedOptions = [
  { label: 'Safe', sub: '60s delay', value: 60 },
  { label: 'Balanced', sub: '30s delay', value: 30 },
  { label: 'Fast', sub: '10s delay', value: 10 },
];

const defaultHtml = `<h2 style="color:#111;">Hello there!</h2>
<p>This is your email content. You can use HTML to style it.</p>
<p>Add images, buttons, links and more.</p>
<a href="https://yoursite.com" style="display:inline-block;padding:10px 20px;background:#111;color:#fff;border-radius:6px;text-decoration:none;">Click here</a>
<p style="color:#888;font-size:12px;margin-top:24px;">To unsubscribe, reply to this email.</p>`;

export default function Campaigns() {
  const [campaigns, setCampaigns] = useState([]);
  const [lists, setLists] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [msg, setMsg] = useState(null);
  const [err, setErr] = useState(null);
  const [htmlBody, setHtmlBody] = useState(defaultHtml);
  const [plainBody, setPlainBody] = useState('Hello there!\n\nThis is your email content.\n\nTo unsubscribe, reply to this email.');
  const [speed, setSpeed] = useState(30);
  const [scheduleType, setScheduleType] = useState('immediate');
  const [form, setForm] = useState({
    name: '', subject: '', contact_list: '',
    start_time: '08:00', end_time: '22:00'
  });
  const previewRef = useRef(null);

  const load = async () => {
    try {
      const [c, l] = await Promise.all([getCampaigns(), getContactLists()]);
      setCampaigns(c.data);
      setLists(l.data);
    } catch (e) { console.error(e); }
  };

  useEffect(() => { load(); }, []);

  useEffect(() => {
    if (previewRef.current) {
      previewRef.current.srcdoc = `
        <html>
          <body style="font-family:-apple-system,sans-serif;padding:16px;margin:0;font-size:13px;line-height:1.7;color:#111;">
            ${htmlBody}
          </body>
        </html>`;
    }
  }, [htmlBody]);

  const showMsg = (m) => { setMsg(m); setTimeout(() => setMsg(null), 5000); };
  const showErr = (e) => { setErr(e); setTimeout(() => setErr(null), 5000); };

  const validate = () => {
    if (!form.name) return showErr('Please enter a campaign name') || false;
    if (!form.subject) return showErr('Please enter a subject line') || false;
    if (!form.contact_list) return showErr('Please select a contact list') || false;
    if (!htmlBody && !plainBody) return showErr('Please add an email body') || false;
    return true;
  };

  const buildPayload = () => ({
    ...form,
    body_html: htmlBody,
    body_plain: plainBody,
    delay_seconds: speed,
    schedule_type: scheduleType,
    start_time: scheduleType === 'immediate' ? '00:00' : form.start_time,
    end_time: scheduleType === 'immediate' ? '23:59' : form.end_time,
  });

  const handleSaveDraft = async () => {
    if (!validate()) return;
    try {
      await createCampaign(buildPayload());
      showMsg('Campaign saved as draft!');
      resetForm();
      load();
    } catch (e) { showErr('Error saving campaign'); }
  };

  const handleCreateAndLaunch = async () => {
    if (!validate()) return;
    try {
      const res = await createCampaign(buildPayload());
      await launchCampaign(res.data.id);
      showMsg('Campaign launched! Emails are now being sent.');
      resetForm();
      load();
    } catch (e) { showErr(e.response?.data?.error || 'Error launching campaign'); }
  };

  const resetForm = () => {
    setShowForm(false);
    setForm({ name: '', subject: '', contact_list: '', start_time: '08:00', end_time: '22:00' });
    setHtmlBody(defaultHtml);
    setPlainBody('Hello there!\n\nThis is your email content.');
    setSpeed(30);
    setScheduleType('immediate');
  };

  const handleLaunch = async (id) => {
    try { await launchCampaign(id); showMsg('Campaign launched!'); load(); }
    catch (e) { showErr(e.response?.data?.error || 'Error launching'); }
  };

  const handlePause = async (id) => {
    try { await pauseCampaign(id); load(); } catch (e) { showErr('Error pausing'); }
  };

  const handleResume = async (id) => {
    try { await resumeCampaign(id); load(); } catch (e) { showErr('Error resuming'); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this campaign and all its queue?')) return;
    try { await deleteCampaign(id); load(); } catch (e) { showErr('Error deleting'); }
  };

  const getPillStyle = (status) => {
    if (status === 'running') return { ...s.pill, ...s.pillRunning };
    if (status === 'paused') return { ...s.pill, ...s.pillPaused };
    if (status === 'completed') return { ...s.pill, ...s.pillCompleted };
    return { ...s.pill, ...s.pillDraft };
  };

  const getPct = (c) => c.total_contacts > 0 ? Math.round((c.sent_count / c.total_contacts) * 100) : 0;

  const getEstimate = () => {
    const list = lists.find(l => l.list_name === form.contact_list);
    if (!list) return null;
    const totalSeconds = list.count * speed;
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    return hours > 0 ? `~${hours}h ${minutes}m` : `~${minutes} minutes`;
  };

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
                {lists.map(l => <option key={l.list_name} value={l.list_name}>{l.list_name} ({l.count} contacts)</option>)}
              </select>
            </div>
          </div>

          <div style={s.label}>Email subject line</div>
          <input style={s.input} placeholder="e.g. You don't want to miss this!" value={form.subject} onChange={e => setForm({ ...form, subject: e.target.value })} />

          <hr style={s.divider} />

          <div style={s.cardTitle}>Email body</div>
          <div style={s.editorWrap}>
            <div style={s.editorPane}>
              <div style={s.editorHeader}>HTML editor</div>
              <textarea
                style={s.editorTextarea}
                value={htmlBody}
                onChange={e => setHtmlBody(e.target.value)}
                spellCheck={false}
              />
            </div>
            <div style={s.editorPane}>
              <div style={s.editorHeader}>Live preview</div>
              <iframe
                ref={previewRef}
                style={{ width: '100%', minHeight: '260px', border: 'none' }}
                title="preview"
                sandbox="allow-same-origin"
              />
            </div>
          </div>

          <div style={s.label}>Plain text version <span style={{ color: '#aaa', fontWeight: '400' }}>(shown if HTML fails to load)</span></div>
          <textarea style={s.plainTextarea} value={plainBody} onChange={e => setPlainBody(e.target.value)} />

          <hr style={s.divider} />

          <div style={s.cardTitle}>Schedule</div>

          <div style={s.label}>When to send</div>
          <div style={s.scheduleGrid}>
            {[
              { label: 'Send immediately', sub: 'Starts right after launch', value: 'immediate' },
              { label: 'Set time window', sub: 'Only send between certain hours', value: 'window' },
            ].map(opt => (
              <div
                key={opt.value}
                style={{ ...s.schedOpt, ...(scheduleType === opt.value ? s.schedOptSel : {}) }}
                onClick={() => setScheduleType(opt.value)}
              >
                <div style={scheduleType === opt.value ? s.schedLabelSel : s.schedLabel}>{opt.label}</div>
                <div style={s.schedSub}>{opt.sub}</div>
              </div>
            ))}
          </div>

          {scheduleType === 'window' && (
            <div style={{ ...s.row2, marginBottom: '12px' }}>
              <div>
                <div style={s.label}>Start sending at</div>
                <input style={s.input} type="time" value={form.start_time} onChange={e => setForm({ ...form, start_time: e.target.value })} />
              </div>
              <div>
                <div style={s.label}>Stop sending at</div>
                <input style={s.input} type="time" value={form.end_time} onChange={e => setForm({ ...form, end_time: e.target.value })} />
              </div>
            </div>
          )}

          {scheduleType === 'immediate' && (
            <div style={s.infoBox}>
              Emails will start sending immediately after you click Launch, running 24/7 until complete.
            </div>
          )}

          <div style={s.label}>Sending speed</div>
          <div style={s.speedGrid}>
            {speedOptions.map(opt => (
              <div
                key={opt.value}
                style={{ ...s.speedOpt, ...(speed === opt.value ? s.speedOptSel : {}) }}
                onClick={() => setSpeed(opt.value)}
              >
                <div style={speed === opt.value ? s.schedLabelSel : s.schedLabel}>{opt.label}</div>
                <div style={s.schedSub}>{opt.sub}</div>
              </div>
            ))}
          </div>

          <div style={{ ...s.row2, alignItems: 'center' }}>
            <div>
              <div style={s.label}>Custom delay (seconds)</div>
              <input style={s.input} type="number" min="5" value={speed} onChange={e => setSpeed(Number(e.target.value))} />
            </div>
            {getEstimate() && (
              <div style={{ ...s.infoBox, marginTop: '20px' }}>
                Estimated completion time: <strong>{getEstimate()}</strong> for {lists.find(l => l.list_name === form.contact_list)?.count} contacts
              </div>
            )}
          </div>

          <div style={s.footerBtns}>
            <button style={s.btn} onClick={handleSaveDraft}>Save as draft</button>
            <button style={s.btnSuccess} onClick={handleCreateAndLaunch}>Launch campaign</button>
          </div>
        </div>
      )}

      <div style={s.card}>
        <div style={s.cardTitle}>All campaigns ({campaigns.length})</div>
        {campaigns.length === 0 && (
          <div style={{ fontSize: '13px', color: '#888', padding: '20px 0' }}>No campaigns yet. Create one above.</div>
        )}
        {campaigns.map(c => (
          <div key={c.id} style={s.campRow}>
            <div style={{ flex: 1 }}>
              <div style={s.campName}>{c.name}</div>
              <div style={s.campSub}>
                {c.contact_list} · {c.delay_seconds}s delay · {c.sent_count}/{c.total_contacts} sent
                {c.failed_count > 0 && <span style={{ color: '#A32D2D' }}> · {c.failed_count} failed</span>}
              </div>
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
