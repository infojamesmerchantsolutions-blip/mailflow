import React, { useState, useEffect } from 'react';
import { getStats, getQueue, getCampaigns } from '../api';

const s = {
  title: { fontSize: '20px', fontWeight: '500', color: '#111', marginBottom: '4px' },
  sub: { fontSize: '13px', color: '#888', marginBottom: '20px' },
  statsGrid: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px', marginBottom: '20px' },
  statCard: { background: '#f0f0ea', borderRadius: '8px', padding: '12px 14px' },
  statLabel: { fontSize: '11px', color: '#888', marginBottom: '4px' },
  statNum: { fontSize: '24px', fontWeight: '500', color: '#111' },
  statSub: { fontSize: '11px', color: '#888', marginTop: '2px' },
  row: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' },
  card: { background: '#fff', border: '0.5px solid #e0e0d8', borderRadius: '12px', padding: '14px 16px' },
  cardTitle: { fontSize: '13px', fontWeight: '500', color: '#111', marginBottom: '12px' },
  queueItem: { display: 'flex', alignItems: 'center', gap: '10px', padding: '7px 0', borderBottom: '0.5px solid #e0e0d8', fontSize: '12px' },
  pulse: { width: '7px', height: '7px', borderRadius: '50%', background: '#3B6D11', flexShrink: 0 },
  campItem: { padding: '8px 0', borderBottom: '0.5px solid #e0e0d8' },
  campName: { fontSize: '13px', color: '#111', marginBottom: '4px' },
  campSub: { fontSize: '11px', color: '#888' },
  progressBar: { height: '4px', background: '#f0f0ea', borderRadius: '2px', marginTop: '6px', overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: '2px', background: '#185FA5' },
  pill: { fontSize: '10px', fontWeight: '500', padding: '2px 8px', borderRadius: '999px', background: '#e6f1fb', color: '#185FA5' },
  topbar: { display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '20px' },
};

export default function Dashboard() {
  const [stats, setStats] = useState({});
  const [queue, setQueue] = useState([]);
  const [campaigns, setCampaigns] = useState([]);

  const load = async () => {
    try {
      const [s, q, c] = await Promise.all([getStats(), getQueue(), getCampaigns()]);
      setStats(s.data);
      setQueue(q.data.slice(0, 5));
      setCampaigns(c.data.filter(c => c.status === 'running').slice(0, 3));
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    load();
    const interval = setInterval(load, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div>
      <div style={s.topbar}>
        <div>
          <div style={s.title}>Dashboard</div>
          <div style={s.sub}>Live overview of all sending activity</div>
        </div>
      </div>

      <div style={s.statsGrid}>
        <div style={s.statCard}>
          <div style={s.statLabel}>Sent today</div>
          <div style={s.statNum}>{stats.today_sent || 0}</div>
          <div style={s.statSub}>across {stats.active_accounts || 0} accounts</div>
        </div>
        <div style={s.statCard}>
          <div style={s.statLabel}>In queue</div>
          <div style={s.statNum}>{stats.pending || 0}</div>
          <div style={s.statSub}>pending emails</div>
        </div>
        <div style={s.statCard}>
          <div style={s.statLabel}>Active campaigns</div>
          <div style={s.statNum}>{stats.active_campaigns || 0}</div>
          <div style={s.statSub}>running now</div>
        </div>
        <div style={s.statCard}>
          <div style={s.statLabel}>Failed</div>
          <div style={s.statNum}>{stats.failed || 0}</div>
          <div style={s.statSub}>total failed sends</div>
        </div>
      </div>

      <div style={s.row}>
        <div style={s.card}>
          <div style={s.cardTitle}>Active campaigns</div>
          {campaigns.length === 0 && <div style={{ fontSize: '13px', color: '#888' }}>No running campaigns</div>}
          {campaigns.map(c => {
            const pct = c.total_contacts > 0 ? Math.round((c.sent_count / c.total_contacts) * 100) : 0;
            return (
              <div key={c.id} style={s.campItem}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={s.campName}>{c.name}</div>
                  <span style={s.pill}>{pct}%</span>
                </div>
                <div style={s.campSub}>{c.total_contacts} contacts · {c.delay_seconds}s delay</div>
                <div style={s.progressBar}>
                  <div style={{ ...s.progressFill, width: `${pct}%` }} />
                </div>
              </div>
            );
          })}
        </div>

        <div style={s.card}>
          <div style={s.cardTitle}>Live send queue</div>
          {queue.length === 0 && <div style={{ fontSize: '13px', color: '#888' }}>No recent activity</div>}
          {queue.map(item => (
            <div key={item.id} style={s.queueItem}>
              <div style={{ ...s.pulse, background: item.status === 'sent' ? '#3B6D11' : item.status === 'failed' ? '#A32D2D' : '#854F0B' }} />
              <div style={{ flex: 1 }}>
                <div style={{ color: '#111' }}>{item.recipient_email}</div>
                <div style={{ color: '#888', fontSize: '11px' }}>via {item.account_email}</div>
              </div>
              <div style={{ fontSize: '11px', color: '#888' }}>{item.status}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
