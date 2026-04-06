import React, { useState, useEffect } from 'react';
import { getAccounts, getAuthUrl, deleteAccount, resetAccount, pauseAccount, resumeAccount, updateDisplayName } from '../api';

const s = {
  title: { fontSize: '20px', fontWeight: '500', color: '#111', marginBottom: '4px' },
  sub: { fontSize: '13px', color: '#888', marginBottom: '20px' },
  topbar: { display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '20px' },
  btnPrimary: { padding: '8px 16px', fontSize: '13px', borderRadius: '8px', border: 'none', background: '#111', color: '#fff', cursor: 'pointer' },
  card: { background: '#fff', border: '0.5px solid #e0e0d8', borderRadius: '12px', padding: '14px 16px', marginBottom: '12px' },
  cardTitle: { fontSize: '13px', fontWeight: '500', color: '#111', marginBottom: '12px' },
  acctRow: { display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 0', borderBottom: '0.5px solid #e0e0d8', flexWrap: 'wrap' },
  avatar: { width: '38px', height: '38px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', fontWeight: '500', flexShrink: 0, background: '#e6f1fb', color: '#185FA5' },
  acctInfo: { flex: 1, minWidth: '160px' },
  acctEmail: { fontSize: '13px', color: '#111', fontWeight: '500' },
  acctSub: { fontSize: '11px', color: '#888', marginTop: '2px' },
  nameRow: { display: 'flex', alignItems: 'center', gap: '6px', marginTop: '4px' },
  nameInput: { fontSize: '12px', padding: '3px 8px', borderRadius: '6px', border: '0.5px solid #ccc', background: '#fff', width: '160px', outline: 'none' },
  saveBtn: { fontSize: '11px', padding: '3px 8px', borderRadius: '6px', border: 'none', background: '#111', color: '#fff', cursor: 'pointer' },
  pill: { fontSize: '10px', fontWeight: '500', padding: '2px 8px', borderRadius: '999px' },
  pillOk: { background: '#eaf3de', color: '#3B6D11' },
  pillWarn: { background: '#faeeda', color: '#854F0B' },
  pillPaused: { background: '#fcebeb', color: '#A32D2D' },
  actionBtn: { fontSize: '12px', padding: '5px 10px', borderRadius: '6px', border: '0.5px solid #e0e0d8', background: '#fff', cursor: 'pointer', marginLeft: '4px' },
  actionBtnDanger: { fontSize: '12px', padding: '5px 10px', borderRadius: '6px', border: '0.5px solid #f7c1c1', background: '#fff', color: '#A32D2D', cursor: 'pointer', marginLeft: '4px' },
  actionBtnPause: { fontSize: '12px', padding: '5px 10px', borderRadius: '6px', border: '0.5px solid #fac775', background: '#fff', color: '#854F0B', cursor: 'pointer', marginLeft: '4px' },
  actionBtnResume: { fontSize: '12px', padding: '5px 10px', borderRadius: '6px', border: '0.5px solid #c0dd97', background: '#fff', color: '#3B6D11', cursor: 'pointer', marginLeft: '4px' },
  emptyBox: { textAlign: 'center', padding: '40px', color: '#888', fontSize: '13px' },
  infoBox: { background: '#e6f1fb', border: '0.5px solid #b5d4f4', borderRadius: '8px', padding: '12px 16px', fontSize: '13px', color: '#185FA5', marginBottom: '16px', lineHeight: '1.6' },
  success: { background: '#eaf3de', border: '0.5px solid #c0dd97', borderRadius: '8px', padding: '10px 14px', fontSize: '13px', color: '#3B6D11', marginBottom: '12px' },
  error: { background: '#fcebeb', border: '0.5px solid #f7c1c1', borderRadius: '8px', padding: '10px 14px', fontSize: '13px', color: '#A32D2D', marginBottom: '12px' },
  statsRow: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', marginBottom: '16px' },
  statCard: { background: '#f5f5f0', borderRadius: '8px', padding: '10px 14px', textAlign: 'center' },
  statNum: { fontSize: '22px', fontWeight: '500', color: '#111' },
  statLabel: { fontSize: '11px', color: '#888', marginTop: '2px' },
};

export default function Accounts() {
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [editingName, setEditingName] = useState({});
  const [msg, setMsg] = useState(null);
  const [err, setErr] = useState(null);

  const load = async () => {
    try {
      const res = await getAccounts();
      setAccounts(res.data);
      const names = {};
      res.data.forEach(a => { names[a.id] = a.display_name || ''; });
      setEditingName(names);
    } catch (e) { console.error(e); }
  };

  useEffect(() => { load(); }, []);

  const showMsg = (m) => { setMsg(m); setTimeout(() => setMsg(null), 4000); };
  const showErr = (e) => { setErr(e); setTimeout(() => setErr(null), 4000); };

  const handleConnect = async () => {
    try {
      setLoading(true);
      const res = await getAuthUrl();
      window.open(res.data.url, '_blank');
      setTimeout(() => { load(); setLoading(false); }, 5000);
    } catch (e) {
      showErr('Error getting auth URL');
      setLoading(false);
    }
  };

  const handleDelete = async (id, email) => {
    if (!window.confirm(`Remove ${email}?`)) return;
    try { await deleteAccount(id); load(); } catch (e) { showErr('Error removing account'); }
  };

  const handleReset = async (id) => {
    try { await resetAccount(id); showMsg('Daily count reset!'); load(); } catch (e) { showErr('Error resetting'); }
  };

  const handlePause = async (id) => {
    try { await pauseAccount(id); showMsg('Account paused.'); load(); } catch (e) { showErr('Error pausing account'); }
  };

  const handleResume = async (id) => {
    try { await resumeAccount(id); showMsg('Account resumed!'); load(); } catch (e) { showErr('Error resuming account'); }
  };

  const handleSaveName = async (id) => {
    try {
      await updateDisplayName(id, editingName[id]);
      showMsg('Display name saved!');
      load();
    } catch (e) { showErr('Error saving name'); }
  };

  const getInitials = (email) => {
    const parts = email.split('@')[0].split('.');
    return parts.map(p => p[0]?.toUpperCase()).join('').slice(0, 2);
  };

  const activeCount = accounts.filter(a => a.status === 'active').length;
  const pausedCount = accounts.filter(a => a.status === 'paused').length;
  const totalSentToday = accounts.reduce((sum, a) => sum + (a.daily_sent || 0), 0);

  return (
    <div>
      <div style={s.topbar}>
        <div>
          <div style={s.title}>Gmail accounts</div>
          <div style={s.sub}>Connect and manage your Gmail sending accounts</div>
        </div>
        <button style={s.btnPrimary} onClick={handleConnect} disabled={loading}>
          {loading ? 'Opening...' : '+ Connect Gmail account'}
        </button>
      </div>

      {msg && <div style={s.success}>{msg}</div>}
      {err && <div style={s.error}>{err}</div>}

      <div style={s.statsRow}>
        <div style={s.statCard}>
          <div style={s.statNum}>{accounts.length}</div>
          <div style={s.statLabel}>Total accounts</div>
        </div>
        <div style={s.statCard}>
          <div style={s.statNum}>{activeCount}</div>
          <div style={s.statLabel}>Active</div>
        </div>
        <div style={s.statCard}>
          <div style={s.statNum}>{totalSentToday}</div>
          <div style={s.statLabel}>Sent today</div>
        </div>
      </div>

      <div style={s.infoBox}>
        Emails are distributed equally across all <strong>active</strong> accounts using round-robin.
        Pause any account that hits its daily limit — the scheduler will automatically skip paused accounts.
        Each Gmail account can send up to <strong>500 emails/day</strong> (free) or <strong>2,000/day</strong> (Google Workspace).
        Set a display name so recipients see a real name instead of just an email address.
      </div>

      <div style={s.card}>
        <div style={s.cardTitle}>Connected accounts ({accounts.length})</div>
        {accounts.length === 0 && (
          <div style={s.emptyBox}>
            No accounts connected yet. Click "+ Connect Gmail account" to get started.
          </div>
        )}
        {accounts.map(acct => (
          <div key={acct.id} style={s.acctRow}>
            <div style={{
              ...s.avatar,
              background: acct.status === 'paused' ? '#faeeda' : '#e6f1fb',
              color: acct.status === 'paused' ? '#854F0B' : '#185FA5'
            }}>
              {getInitials(acct.email)}
            </div>

            <div style={s.acctInfo}>
              <div style={s.acctEmail}>{acct.email}</div>
              <div style={s.acctSub}>
                {acct.daily_sent || 0} sent today
                {acct.last_reset ? ` · Reset: ${new Date(acct.last_reset).toLocaleDateString()}` : ''}
              </div>
              <div style={s.nameRow}>
                <input
                  style={s.nameInput}
                  placeholder="Set display name (e.g. James Merchant)"
                  value={editingName[acct.id] || ''}
                  onChange={e => setEditingName({ ...editingName, [acct.id]: e.target.value })}
                  onKeyDown={e => e.key === 'Enter' && handleSaveName(acct.id)}
                />
                <button style={s.saveBtn} onClick={() => handleSaveName(acct.id)}>Save</button>
              </div>
              {acct.display_name && (
                <div style={{ fontSize: '11px', color: '#3B6D11', marginTop: '2px' }}>
                  Sends as: {acct.display_name} &lt;{acct.email}&gt;
                </div>
              )}
            </div>

            <span style={{
              ...s.pill,
              ...(acct.status === 'active' ? s.pillOk : acct.status === 'paused' ? s.pillPaused : s.pillWarn)
            }}>
              {acct.status}
            </span>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
              {acct.status === 'active'
                ? <button style={s.actionBtnPause} onClick={() => handlePause(acct.id)}>Pause</button>
                : <button style={s.actionBtnResume} onClick={() => handleResume(acct.id)}>Resume</button>
              }
              <button style={s.actionBtn} onClick={() => handleReset(acct.id)}>Reset count</button>
              <button style={s.actionBtnDanger} onClick={() => handleDelete(acct.id, acct.email)}>Remove</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
