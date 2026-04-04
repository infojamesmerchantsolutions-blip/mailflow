import React, { useState, useEffect } from 'react';
import { getLogs } from '../api';

const s = {
  title: { fontSize: '20px', fontWeight: '500', color: '#111', marginBottom: '4px' },
  sub: { fontSize: '13px', color: '#888', marginBottom: '20px' },
  topbar: { display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '20px' },
  btn: { padding: '8px 16px', fontSize: '13px', borderRadius: '8px', border: '0.5px solid #ccc', background: '#fff', cursor: 'pointer' },
  card: { background: '#fff', border: '0.5px solid #e0e0d8', borderRadius: '12px', padding: '14px 16px' },
  cardTitle: { fontSize: '13px', fontWeight: '500', color: '#111', marginBottom: '12px' },
  filterRow: { display: 'flex', gap: '8px', marginBottom: '16px' },
  filterBtn: { padding: '5px 14px', fontSize: '12px', borderRadius: '999px', border: '0.5px solid #ccc', background: '#fff', cursor: 'pointer', color: '#666' },
  filterBtnActive: { background: '#111', color: '#fff', border: '0.5px solid #111' },
  logRow: { display: 'flex', alignItems: 'center', gap: '12px', padding: '8px 0', borderBottom: '0.5px solid #e0e0d8', fontSize: '12px' },
  dot: { width: '7px', height: '7px', borderRadius: '50%', flexShrink: 0 },
  dotSent: { background: '#3B6D11' },
  dotFailed: { background: '#A32D2D' },
  recipient: { flex: 1, color: '#111' },
  account: { color: '#888' },
  campaign: { color: '#888' },
  time: { color: '#aaa', fontSize: '11px' },
  pill: { fontSize: '10px', fontWeight: '500', padding: '2px 8px', borderRadius: '999px' },
  pillSent: { background: '#eaf3de', color: '#3B6D11' },
  pillFailed: { background: '#fcebeb', color: '#A32D2D' },
  empty: { textAlign: 'center', padding: '40px', color: '#888', fontSize: '13px' },
};

export default function Logs() {
  const [logs, setLogs] = useState([]);
  const [filter, setFilter] = useState('all');
  const [autoRefresh, setAutoRefresh] = useState(true);

  const load = async () => {
    try {
      const res = await getLogs();
      setLogs(res.data);
    } catch (e) { console.error(e); }
  };

  useEffect(() => {
    load();
    if (autoRefresh) {
      const interval = setInterval(load, 5000);
      return () => clearInterval(interval);
    }
  }, [autoRefresh]);

  const filtered = filter === 'all' ? logs : logs.filter(l => l.status === filter);

  const formatTime = (t) => {
    if (!t) return '';
    const d = new Date(t);
    return d.toLocaleTimeString();
  };

  return (
    <div>
      <div style={s.topbar}>
        <div>
          <div style={s.title}>Logs</div>
          <div style={s.sub}>Full history of all email sending activity</div>
        </div>
        <button style={s.btn} onClick={() => setAutoRefresh(!autoRefresh)}>
          {autoRefresh ? 'Pause refresh' : 'Resume refresh'}
        </button>
      </div>

      <div style={s.filterRow}>
        {['all', 'sent', 'failed'].map(f => (
          <button
            key={f}
            style={{ ...s.filterBtn, ...(filter === f ? s.filterBtnActive : {}) }}
            onClick={() => setFilter(f)}
          >
            {f.charAt(0).toUpperCase() + f.slice(1)}
            {f === 'all' && ` (${logs.length})`}
            {f === 'sent' && ` (${logs.filter(l => l.status === 'sent').length})`}
            {f === 'failed' && ` (${logs.filter(l => l.status === 'failed').length})`}
          </button>
        ))}
      </div>

      <div style={s.card}>
        <div style={s.cardTitle}>
          {filter === 'all' ? 'All logs' : `${filter.charAt(0).toUpperCase() + filter.slice(1)} logs`}
          {autoRefresh && <span style={{ fontSize: '11px', color: '#888', marginLeft: '8px' }}>· auto-refreshing every 5s</span>}
        </div>

        {filtered.length === 0 && (
          <div style={s.empty}>No logs yet. Launch a campaign to start sending.</div>
        )}

        {filtered.map(log => (
          <div key={log.id} style={s.logRow}>
            <div style={{ ...s.dot, ...(log.status === 'sent' ? s.dotSent : s.dotFailed) }} />
            <div style={s.recipient}>{log.recipient_email}</div>
            <div style={s.account}>via {log.account_email}</div>
            <div style={s.campaign}>{log.campaign_name}</div>
            <span style={{ ...s.pill, ...(log.status === 'sent' ? s.pillSent : s.pillFailed) }}>
              {log.status}
            </span>
            <div style={s.time}>{formatTime(log.created_at)}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
