import React, { useState, useEffect, useRef } from 'react';
import { getCampaigns } from '../api';
import { getCampaignFollowups, createFollowup, updateFollowup, deleteFollowup, pauseFollowup, resumeFollowup, getFollowupStatus, getExclusions, addExclusions, removeExclusion } from '../api';

const s = {
  title: { fontSize: '20px', fontWeight: '500', color: '#111', marginBottom: '4px' },
  sub: { fontSize: '13px', color: '#888', marginBottom: '20px' },
  topbar: { display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '20px' },
  btnPrimary: { padding: '8px 16px', fontSize: '13px', borderRadius: '8px', border: 'none', background: '#111', color: '#fff', cursor: 'pointer' },
  btnSuccess: { padding: '8px 16px', fontSize: '13px', borderRadius: '8px', border: 'none', background: '#3B6D11', color: '#fff', cursor: 'pointer' },
  btnWarn: { padding: '6px 12px', fontSize: '12px', borderRadius: '6px', border: '0.5px solid #fac775', background: '#fff', color: '#854F0B', cursor: 'pointer', marginLeft: '6px' },
  btnResume: { padding: '6px 12px', fontSize: '12px', borderRadius: '6px', border: '0.5px solid #c0dd97', background: '#fff', color: '#3B6D11', cursor: 'pointer', marginLeft: '6px' },
  btn: { padding: '6px 12px', fontSize: '12px', borderRadius: '6px', border: '0.5px solid #ccc', background: '#fff', cursor: 'pointer', marginLeft: '6px' },
  btnDanger: { padding: '6px 12px', fontSize: '12px', borderRadius: '6px', border: '0.5px solid #f7c1c1', background: '#fff', color: '#A32D2D', cursor: 'pointer', marginLeft: '6px' },
  card: { background: '#fff', border: '0.5px solid #e0e0d8', borderRadius: '12px', padding: '16px', marginBottom: '12px' },
  cardTitle: { fontSize: '14px', fontWeight: '500', color: '#111', marginBottom: '12px' },
  label: { fontSize: '12px', color: '#666', marginBottom: '5px', marginTop: '10px' },
  hint: { fontSize: '11px', color: '#aaa', fontWeight: '400' },
  input: { width: '100%', fontSize: '13px', padding: '8px 10px', borderRadius: '8px', border: '0.5px solid #ccc', background: '#fff', outline: 'none' },
  select: { width: '100%', fontSize: '13px', padding: '8px 10px', borderRadius: '8px', border: '0.5px solid #ccc', background: '#fff' },
  row2: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' },
  row3: { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' },
  editorWrap: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0', border: '0.5px solid #ccc', borderRadius: '8px', overflow: 'hidden', marginBottom: '10px' },
  editorHeader: { padding: '7px 12px', background: '#f5f5f0', borderBottom: '0.5px solid #ccc', fontSize: '12px', fontWeight: '500', color: '#666' },
  editorTextarea: { width: '100%', fontSize: '12px', padding: '10px', border: 'none', borderRight: '0.5px solid #ccc', resize: 'none', minHeight: '160px', fontFamily: 'monospace', lineHeight: '1.6', outline: 'none', background: '#fff' },
  plainTextarea: { width: '100%', fontSize: '13px', padding: '8px 10px', borderRadius: '8px', border: '0.5px solid #ccc', background: '#fff', resize: 'vertical', minHeight: '70px', lineHeight: '1.6', outline: 'none', fontFamily: 'inherit' },
  followupRow: { display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 0', borderBottom: '0.5px solid #e0e0d8' },
  followupName: { fontSize: '13px', fontWeight: '500', color: '#111' },
  followupSub: { fontSize: '12px', color: '#888', marginTop: '2px' },
  pill: { fontSize: '10px', fontWeight: '500', padding: '2px 8px', borderRadius: '999px' },
  pillActive: { background: '#eaf3de', color: '#3B6D11' },
  pillPaused: { background: '#faeeda', color: '#854F0B' },
  success: { background: '#eaf3de', border: '0.5px solid #c0dd97', borderRadius: '8px', padding: '10px 14px', fontSize: '13px', color: '#3B6D11', marginBottom: '12px' },
  error: { background: '#fcebeb', border: '0.5px solid #f7c1c1', borderRadius: '8px', padding: '10px 14px', fontSize: '13px', color: '#A32D2D', marginBottom: '12px' },
  infoBox: { background: '#e6f1fb', border: '0.5px solid #b5d4f4', borderRadius: '8px', padding: '10px 14px', fontSize: '12px', color: '#185FA5', marginBottom: '12px' },
  warnBox: { background: '#faeeda', border: '0.5px solid #fac775', borderRadius: '8px', padding: '10px 14px', fontSize: '12px', color: '#854F0B', marginBottom: '12px' },
  divider: { border: 'none', borderTop: '0.5px solid #e0e0d8', margin: '16px 0' },
  footerBtns: { display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '16px' },
  emptyBox: { textAlign: 'center', padding: '30px', color: '#888', fontSize: '13px' },
  statRow: { display: 'flex', gap: '16px', fontSize: '12px', color: '#888', marginTop: '4px' },
  statNum: { fontWeight: '500', color: '#111' },
  exclusionRow: { display: 'flex', alignItems: 'center', gap: '12px', padding: '7px 0', borderBottom: '0.5px solid #e0e0d8', fontSize: '12px' },
  exclusionEmail: { flex: 1, color: '#111' },
  tabs: { display: 'flex', gap: '0', borderBottom: '0.5px solid #e0e0d8', marginBottom: '16px' },
  tab: { padding: '7px 16px', fontSize: '12px', cursor: 'pointer', borderBottom: '2px solid transparent', marginBottom: '-0.5px', color: '#888' },
  tabActive: { padding: '7px 16px', fontSize: '12px', cursor: 'pointer', borderBottom: '2px solid #111', marginBottom: '-0.5px', color: '#111', fontWeight: '500' },
};

function FollowupEditor({ followup, campaignId, onSave, onCancel, isEditing }) {
  const [name, setName] = useState(followup?.name || '');
  const [subject, setSubject] = useState(followup?.subject || '');
  const [bodyHtml, setBodyHtml] = useState(followup?.body_html || '');
  const [bodyPlain, setBodyPlain] = useState(followup?.body_plain || '');
  const [delayDays, setDelayDays] = useState(followup?.delay_days ?? 3);
  const [delayHours, setDelayHours] = useState(followup?.delay_hours ?? 0);
  const previewRef = useRef(null);

  useEffect(() => {
    if (previewRef.current) {
      previewRef.current.srcdoc = `<html><body style="font-family:-apple-system,sans-serif;padding:16px;margin:0;font-size:13px;line-height:1.7;color:#111;">${bodyHtml || '<p style="color:#aaa;">HTML preview will appear here...</p>'}</body></html>`;
    }
  }, [bodyHtml]);

  const handleSave = () => {
    onSave({
      campaign_id: campaignId,
      name: name || `Follow-up ${delayDays}d ${delayHours}h`,
      subject,
      body_html: bodyHtml,
      body_plain: bodyPlain,
      delay_days: parseInt(delayDays) || 0,
      delay_hours: parseInt(delayHours) || 0,
    });
  };

  return (
    <div style={s.card}>
      <div style={s.cardTitle}>{isEditing ? 'Edit follow-up' : 'New follow-up'}</div>

      <div style={s.infoBox}>
        The follow-up will be sent as a reply in the same email thread. Subject will automatically be prefixed with "Re:" if left empty.
      </div>

      <div style={s.label}>Follow-up name <span style={s.hint}>(for your reference)</span></div>
      <input style={s.input} placeholder="e.g. Day 3 follow-up" value={name} onChange={e => setName(e.target.value)} />

      <div style={s.label}>Send after</div>
      <div style={s.row2}>
        <div>
          <input
            style={s.input}
            type="number"
            min="0"
            placeholder="Days"
            value={delayDays}
            onChange={e => setDelayDays(e.target.value)}
          />
          <div style={{ fontSize: '11px', color: '#888', marginTop: '3px' }}>Days after original email</div>
        </div>
        <div>
          <input
            style={s.input}
            type="number"
            min="0"
            max="23"
            placeholder="Hours"
            value={delayHours}
            onChange={e => setDelayHours(e.target.value)}
          />
          <div style={{ fontSize: '11px', color: '#888', marginTop: '3px' }}>Additional hours</div>
        </div>
      </div>

      <div style={s.label}>Subject <span style={s.hint}>(optional — leave empty to auto-use "Re: original subject")</span></div>
      <input style={s.input} placeholder="Leave empty to auto-generate Re: subject" value={subject} onChange={e => setSubject(e.target.value)} />

      <div style={s.label}>HTML body <span style={s.hint}>(optional)</span></div>
      <div style={s.editorWrap}>
        <div>
          <div style={s.editorHeader}>HTML editor</div>
          <textarea
            style={s.editorTextarea}
            placeholder="Paste your HTML follow-up content..."
            value={bodyHtml}
            onChange={e => setBodyHtml(e.target.value)}
            spellCheck={false}
          />
        </div>
        <div>
          <div style={s.editorHeader}>Live preview</div>
          <iframe
            ref={previewRef}
            style={{ width: '100%', minHeight: '160px', border: 'none' }}
            title="followup-preview"
            sandbox="allow-same-origin"
          />
        </div>
      </div>

      <div style={s.label}>Plain text <span style={s.hint}>(optional)</span></div>
      <textarea
        style={s.plainTextarea}
        placeholder="Plain text follow-up content..."
        value={bodyPlain}
        onChange={e => setBodyPlain(e.target.value)}
      />

      <div style={s.footerBtns}>
        <button style={s.btn} onClick={onCancel}>Cancel</button>
        <button style={s.btnSuccess} onClick={handleSave}>
          {isEditing ? 'Save changes' : 'Create follow-up'}
        </button>
      </div>
    </div>
  );
}

function FollowupStatus({ followupId }) {
  const [status, setStatus] = useState(null);

  useEffect(() => {
    getFollowupStatus(followupId).then(r => setStatus(r.data)).catch(() => {});
    const interval = setInterval(() => {
      getFollowupStatus(followupId).then(r => setStatus(r.data)).catch(() => {});
    }, 10000);
    return () => clearInterval(interval);
  }, [followupId]);

  if (!status) return null;
  return (
    <div style={s.statRow}>
      <span>Total: <span style={s.statNum}>{status.total}</span></span>
      <span>Sent: <span style={s.statNum}>{status.sent}</span></span>
      <span>Pending: <span style={s.statNum}>{status.pending}</span></span>
      {status.failed > 0 && <span style={{ color: '#A32D2D' }}>Failed: <span style={s.statNum}>{status.failed}</span></span>}
    </div>
  );
}

export default function Followups() {
  const [campaigns, setCampaigns] = useState([]);
  const [selectedCampaign, setSelectedCampaign] = useState('');
  const [followups, setFollowups] = useState([]);
  const [exclusions, setExclusions] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editingFollowup, setEditingFollowup] = useState(null);
  const [msg, setMsg] = useState(null);
  const [err, setErr] = useState(null);
  const [activeTab, setActiveTab] = useState('followups');
  const [excludeEmails, setExcludeEmails] = useState('');
  const [adding, setAdding] = useState(false);

  const showMsg = (m) => { setMsg(m); setTimeout(() => setMsg(null), 4000); };
  const showErr = (e) => { setErr(e); setTimeout(() => setErr(null), 4000); };

  useEffect(() => {
    getCampaigns().then(r => setCampaigns(r.data)).catch(() => {});
  }, []);

  useEffect(() => {
    if (!selectedCampaign) return;
    loadFollowups();
    loadExclusions();
  }, [selectedCampaign]);

  const loadFollowups = async () => {
    try {
      const r = await getCampaignFollowups(selectedCampaign);
      setFollowups(r.data);
    } catch (e) { console.error(e); }
  };

  const loadExclusions = async () => {
    try {
      const r = await getExclusions(selectedCampaign);
      setExclusions(r.data);
    } catch (e) { console.error(e); }
  };

  const handleCreate = async (data) => {
    try {
      await createFollowup(data);
      showMsg('Follow-up created and queued!');
      setShowForm(false);
      loadFollowups();
    } catch (e) { showErr('Error creating follow-up'); }
  };

  const handleUpdate = async (data) => {
    try {
      await updateFollowup(editingFollowup.id, data);
      showMsg('Follow-up updated!');
      setEditingFollowup(null);
      loadFollowups();
    } catch (e) { showErr('Error updating follow-up'); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this follow-up and all its queued emails?')) return;
    try {
      await deleteFollowup(id);
      showMsg('Follow-up deleted');
      loadFollowups();
    } catch (e) { showErr('Error deleting'); }
  };

  const handlePause = async (id) => {
    try { await pauseFollowup(id); loadFollowups(); } catch (e) { showErr('Error pausing'); }
  };

  const handleResume = async (id) => {
    try { await resumeFollowup(id); loadFollowups(); } catch (e) { showErr('Error resuming'); }
  };

  const handleAddExclusions = async () => {
    if (!excludeEmails.trim()) return showErr('Please enter email addresses');
    setAdding(true);
    try {
      const emails = excludeEmails.split('\n').map(e => e.trim()).filter(e => e);
      const r = await addExclusions({ campaign_id: selectedCampaign, emails, reason: 'replied' });
      showMsg(`${r.data.added} email(s) excluded from follow-ups`);
      setExcludeEmails('');
      loadExclusions();
    } catch (e) { showErr('Error adding exclusions'); }
    setAdding(false);
  };

  const handleRemoveExclusion = async (id) => {
    try {
      await removeExclusion(id);
      loadExclusions();
    } catch (e) { showErr('Error removing exclusion'); }
  };

  return (
    <div>
      <div style={s.topbar}>
        <div>
          <div style={s.title}>Follow-ups</div>
          <div style={s.sub}>Set up threaded follow-up emails for your campaigns</div>
        </div>
        {selectedCampaign && !showForm && !editingFollowup && (
          <button style={s.btnPrimary} onClick={() => setShowForm(true)}>+ New follow-up</button>
        )}
      </div>

      {msg && <div style={s.success}>{msg}</div>}
      {err && <div style={s.error}>{err}</div>}

      <div style={s.card}>
        <div style={s.label}>Select campaign</div>
        <select style={s.select} value={selectedCampaign} onChange={e => { setSelectedCampaign(e.target.value); setShowForm(false); setEditingFollowup(null); }}>
          <option value="">Choose a campaign...</option>
          {campaigns.map(c => (
            <option key={c.id} value={c.id}>{c.name} ({c.status})</option>
          ))}
        </select>
      </div>

      {selectedCampaign && (
        <>
          {showForm && (
            <FollowupEditor
              campaignId={selectedCampaign}
              onSave={handleCreate}
              onCancel={() => setShowForm(false)}
              isEditing={false}
            />
          )}

          {editingFollowup && (
            <FollowupEditor
              followup={editingFollowup}
              campaignId={selectedCampaign}
              onSave={handleUpdate}
              onCancel={() => setEditingFollowup(null)}
              isEditing={true}
            />
          )}

          <div style={s.tabs}>
            <div style={activeTab === 'followups' ? s.tabActive : s.tab} onClick={() => setActiveTab('followups')}>
              Follow-ups ({followups.length})
            </div>
            <div style={activeTab === 'exclusions' ? s.tabActive : s.tab} onClick={() => setActiveTab('exclusions')}>
              Exclusions ({exclusions.length})
            </div>
          </div>

          {activeTab === 'followups' && (
            <div style={s.card}>
              <div style={s.infoBox}>
                Follow-ups are sent as replies in the same email thread using the same Gmail account as the original email.
              </div>
              {followups.length === 0 && (
                <div style={s.emptyBox}>No follow-ups yet. Click "+ New follow-up" to create one.</div>
              )}
              {followups.map(f => (
                <div key={f.id} style={s.followupRow}>
                  <div style={{ flex: 1 }}>
                    <div style={s.followupName}>{f.name || `Follow-up ${f.delay_days}d ${f.delay_hours}h`}</div>
                    <div style={s.followupSub}>
                      Sends after {f.delay_days} day{f.delay_days !== 1 ? 's' : ''}
                      {f.delay_hours > 0 ? ` and ${f.delay_hours} hour${f.delay_hours !== 1 ? 's' : ''}` : ''}
                      {f.subject ? ` · Subject: ${f.subject}` : ' · Subject: Re: (auto)'}
                    </div>
                    <FollowupStatus followupId={f.id} />
                  </div>
                  <span style={{ ...s.pill, ...(f.status === 'active' ? s.pillActive : s.pillPaused) }}>
                    {f.status}
                  </span>
                  {f.status === 'active'
                    ? <button style={s.btnWarn} onClick={() => handlePause(f.id)}>Pause</button>
                    : <button style={s.btnResume} onClick={() => handleResume(f.id)}>Resume</button>
                  }
                  <button style={s.btn} onClick={() => { setEditingFollowup(f); setShowForm(false); }}>Edit</button>
                  <button style={s.btnDanger} onClick={() => handleDelete(f.id)}>Delete</button>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'exclusions' && (
            <div style={s.card}>
              <div style={s.cardTitle}>Exclude from follow-ups</div>
              <div style={s.warnBox}>
                Paste email addresses of people who replied — they will be removed from all pending follow-ups immediately and won't receive any future follow-ups for this campaign.
              </div>
              <div style={s.label}>Email addresses to exclude <span style={s.hint}>(one per line)</span></div>
              <textarea
                style={{ ...s.plainTextarea, minHeight: '100px' }}
                placeholder={'john@example.com\nsarah@business.com\nmike@company.com'}
                value={excludeEmails}
                onChange={e => setExcludeEmails(e.target.value)}
              />
              <div style={{ marginTop: '10px' }}>
                <button style={s.btnPrimary} onClick={handleAddExclusions} disabled={adding}>
                  {adding ? 'Excluding...' : 'Exclude these emails'}
                </button>
              </div>

              <hr style={s.divider} />

              <div style={s.cardTitle}>Currently excluded ({exclusions.length})</div>
              {exclusions.length === 0 && (
                <div style={s.emptyBox}>No exclusions yet.</div>
              )}
              {exclusions.map(ex => (
                <div key={ex.id} style={s.exclusionRow}>
                  <div style={s.exclusionEmail}>{ex.email}</div>
                  <div style={{ fontSize: '11px', color: '#888' }}>{ex.reason}</div>
                  <div style={{ fontSize: '11px', color: '#aaa' }}>{new Date(ex.created_at).toLocaleDateString()}</div>
                  <button style={{ ...s.btnDanger, marginLeft: '0' }} onClick={() => handleRemoveExclusion(ex.id)}>Remove</button>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
