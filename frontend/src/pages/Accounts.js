import React, { useState, useEffect } from 'react';
import { getAccounts, getAuthUrl, deleteAccount, resetAccount } from '../api';

const s = {
  title: { fontSize: '20px', fontWeight: '500', color: '#111', marginBottom: '4px' },
  sub: { fontSize: '13px', color: '#888', marginBottom: '20px' },
  topbar: { display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '20px' },
  btn: { padding: '8px 16px', fontSize: '13px', borderRadius: '8px', border: '0.5px solid #ccc', background: '#fff', cursor: 'pointer' },
  btnPrimary: { padding: '8px 16px', fontSize: '13px', borderRadius: '8px', border: 'none', background: '#111', color: '#fff', cursor: 'pointer' },
  card: { background: '#fff', border: '0.5px solid #e0e0d8', borderRadius: '12px', padding: '14px 16px', marginBottom: '12px' },
  cardTitle: { fontSize: '13px', fontWeight: '500', color: '#111', marginBottom: '12px' },
  acctRow: { display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 0', borderBottom: '0.5px solid #e0e0d8' },
  avatar: { width: '36px', height: '36px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: '500', flexShrink: 0, background: '#e6f1fb', color: '#185FA5' },
  acctName: { flex: 1 },
  acctEmail: { fontSize: '13px', color: '#111' },
  acctSub: { fontSize: '11px', color: '#888', marginTop: '2px' },
  pill: { fontSize: '10px', fontWeight: '500', padding: '2px 8px', borderRadius: '999px' },
  pillOk: { background: '#eaf3de', color: '#3B6D11' },
  pillWarn: { background: '#faeeda', color: '#854F0B' },
  actionBtn: { fontSize: '12px', padding: '4px 10px', borderRadius: '6px', border: '0.5px solid #e0e0d8', background: '#fff', cursor: 'pointer', marginLeft: '6px' },
  emptyBox: { textAlign: 'center', padding: '40px', color: '#888', fontSize: '13px' },
  infoBox: { background: '#e6f1fb', border: '0.5px solid #b5d4f4', borderRadius: '8px', padding: '12px 16px', fontSize: '13px', color: '#185FA5', marginBottom: '16px' },
};

export default function Accounts() {
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    try {
      const res = await getAccounts();
      setAccounts(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => { load(); }, []);

  const handleConnect = async () => {
    try {
      setLoading(true);
      const res = await getAuthUrl();
      window.open(res.data.url, '_blank');
      setTimeout(() => { load(); setLoading(false); }, 5000);
    } catch (err) {
      alert('Error getting auth URL');
      setLoading(false);
    }
  };

  const handleDelete = async (id, email) => {
    if (!window.confirm(`Remove ${email}?`)) return;
    try {
      await deleteAccount(id);
      load();
    } catch (err) {
      alert('Error removing account');
    }
  };

  const handleReset = async (id) => {
    try {
      await resetAccount(id);
      load();
    } catch (err) {
      alert('Error resetting account');
    }
  };

  const getInitials = (email) => {
    const parts = email.split('@')[0].split('.');
    return parts.map(p => p[0]?.toUpperCase()).join('').slice(0, 2);
  };

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

      <div style={s.infoBox}>
        Emails are distributed equally across all active accounts using round-robin. Each Gmail account can send up to 500 emails/day (free) or 2,000/day (Google Workspace).
      </div>

      <div style={s.card}>
        <div style={s.cardTitle}>Connected accounts ({accounts.length})</div>
        {accounts.length === 0 && (
          <div style={s.emptyBox}>
            No accounts connected yet. Click "Connect Gmail account" to get started.
          </div>
        )}
        {accounts.map(acct => (
          <div key={acct.id} style={s.acctRow}>
            <div style={s.avatar}>{getInitials(acct.email)}</div>
            <div style={s.acctName}>
              <div style={s.acctEmail}>{acct.email}</div>
              <div style={s.acctSub}>{acct.daily_sent || 0} sent today · Last reset: {acct.last_reset ? new Date(acct.last_reset).toLocaleDateString() : 'never'}</div>
            </div>
            <span style={{ ...s.pill, ...(acct.status === 'active' ? s.pillOk : s.pillWarn) }}>
              {acct.status}
            </span>
            <button style={s.actionBtn} onClick={() => handleReset(acct.id)}>Reset count</button>
            <button style={{ ...s.actionBtn, color: '#A32D2D', borderColor: '#f7c1c1' }} onClick={() => handleDelete(acct.id, acct.email)}>Remove</button>
          </div>
        ))}
      </div>
    </div>
  );
}
