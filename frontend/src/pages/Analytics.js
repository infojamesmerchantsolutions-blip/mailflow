import React, { useState, useEffect } from 'react';
import { getAnalytics, getAnalyticsOverview, getCampaignOpens, getCampaignUnopened } from '../api';

const s = {
  title: { fontSize: '20px', fontWeight: '500', color: '#111', marginBottom: '4px' },
  sub: { fontSize: '13px', color: '#888', marginBottom: '20px' },
  overviewGrid: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', marginBottom: '20px' },
  statCard: { background: '#f0f0ea', borderRadius: '8px', padding: '14px 16px' },
  statLabel: { fontSize: '11px', color: '#888', marginBottom: '4px' },
  statNum: { fontSize: '26px', fontWeight: '500', color: '#111' },
  statSub: { fontSize: '11px', color: '#888', marginTop: '2px' },
  card: { background: '#fff', border: '0.5px solid #e0e0d8', borderRadius: '12px', padding: '14px 16px', marginBottom: '12px' },
  tableHeader: { display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 80px', gap: '8px', padding: '8px 12px', background: '#f5f5f0', borderRadius: '8px', marginBottom: '8px', fontSize: '11px', fontWeight: '500', color: '#888', textTransform: 'uppercase' },
  tableRow: { display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 80px', gap: '8px', padding: '10px 12px', borderBottom: '0.5px solid #e0e0d8', alignItems: 'center', cursor: 'pointer' },
  campName: { fontSize: '13px', fontWeight: '500', color: '#111' },
  campStatus: { fontSize: '11px', color: '#888', marginTop: '2px' },
  numCell: { fontSize: '14px', fontWeight: '500', color: '#111' },
  rateCell: { fontSize: '13px', fontWeight: '500' },
  viewBtn: { fontSize: '12px', color: '#185FA5', cursor: 'pointer', textAlign: 'right' },
  pill: { fontSize: '10px', fontWeight: '500', padding: '2px 8px', borderRadius: '999px', display: 'inline-block' },
  pillGreen: { background: '#eaf3de', color: '#3B6D11' },
  pillBlue: { background: '#e6f1fb', color: '#185FA5' },
  pillGray: { background: '#f0f0ea', color: '#666' },
  backBtn: { fontSize: '13px', color: '#185FA5', cursor: 'pointer', marginBottom: '16px', display: 'inline-block' },
  liveTag: { fontSize: '10px', fontWeight: '500', padding: '2px 7px', borderRadius: '999px', background: '#eaf3de', color: '#3B6D11', marginLeft: '8px' },
  detailGrid: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px', marginBottom: '20px' },
  tabs: { display: 'flex', gap: '0', borderBottom: '0.5px solid #e0e0d8', marginBottom: '12px' },
  tab: { padding: '7px 16px', fontSize: '12px', cursor: 'pointer', borderBottom: '2px solid transparent', marginBottom: '-0.5px', color: '#888' },
  tabActive: { padding: '7px 16px', fontSize: '12px', cursor: 'pointer', borderBottom: '2px solid #111', marginBottom: '-0.5px', color: '#111', fontWeight: '500' },
  openRow: { display: 'flex', alignItems: 'center', gap: '12px', padding: '8px 0', borderBottom: '0.5px solid #e0e0d8', fontSize: '12px' },
  dot: { width: '7px', height: '7px', borderRadius: '50%', flexShrink: 0 },
  emailText: { flex: 1, color: '#111' },
  timeText: { color: '#888', fontSize: '11px' },
  countBadge: { fontSize: '10px', fontWeight: '500', padding: '2px 7px', borderRadius: '999px', background: '#e6f1fb', color: '#185FA5' },
  emptyBox: { textAlign: 'center', padding: '30px', color: '#888', fontSize: '13px' },
  progressBar: { height: '4px', background: '#f0f0ea', borderRadius: '2px', marginTop: '4px', overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: '2px' },
};

function getOpenRateColor(rate) {
  if (rate >= 30) return '#3B6D11';
  if (rate >= 15) return '#854F0B';
  return '#A32D2D';
}

export default function Analytics() {
  const [overview, setOverview] = useState({});
  const [campaigns, setCampaigns] = useState([]);
  const [selected, setSelected] = useState(null);
  const [opens, setOpens] = useState([]);
  const [unopened, setUnopened] = useState([]);
  const [activeTab, setActiveTab] = useState('opened');
  const [loading, setLoading] = useState(true);

  const load = async () => {
    try {
      const [ov, camp] = await Promise.all([getAnalyticsOverview(), getAnalytics()]);
      setOverview(ov.data);
      setCampaigns(camp.data);
      setLoading(false);
    } catch (e) {
      console.error(e);
      setLoading(false);
    }
  };

  const loadDetail = async (campaign) => {
    setSelected(campaign);
    setActiveTab('opened');
    try {
      const [o, u] = await Promise.all([
        getCampaignOpens(campaign.id),
        getCampaignUnopened(campaign.id)
      ]);
      setOpens(o.data);
      setUnopened(u.data);
    } catch (e) { console.error(e); }
  };

  useEffect(() => {
    load();
    const interval = setInterval(load, 10000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (selected) {
      const interval = setInterval(() => loadDetail(selected), 10000);
      return () => clearInterval(interval);
    }
  }, [selected]);

  const formatTime = (t) => t ? new Date(t).toLocaleString() : '';

  const getUniqueOpens = (data) => {
    const seen = new Set();
    return data.filter(o => {
      if (seen.has(o.recipient_email)) return false;
      seen.add(o.recipient_email);
      return true;
    });
  };

  if (loading) {
    return <div style={{ textAlign: 'center', padding: '60px', color: '#888' }}>Loading analytics...</div>;
  }

  if (selected) {
    const uniqueOpens = getUniqueOpens(opens);
    const openRate = selected.sent_count > 0 ? Math.round((uniqueOpens.length / selected.sent_count) * 100) : 0;

    return (
      <div>
        <div style={s.backBtn} onClick={() => setSelected(null)}>← Back</div>
        <div style={s.title}>{selected.name}</div>
        <div style={{ fontSize: '13px', color: '#888', marginBottom: '20px' }}>
          Campaign analytics <span style={s.liveTag}>● Live</span>
        </div>

        <div style={s.detailGrid}>
          <div style={s.statCard}>
            <div style={s.statLabel}>Sent</div>
            <div style={s.statNum}>{selected.sent_count || 0}</div>
            <div style={s.statSub}>of {selected.total_contacts}</div>
          </div>
          <div style={s.statCard}>
            <div style={s.statLabel}>Unique opens</div>
            <div style={{ ...s.statNum, color: getOpenRateColor(openRate) }}>{uniqueOpens.length}</div>
            <div style={s.statSub}>individual recipients</div>
          </div>
          <div style={s.statCard}>
            <div style={s.statLabel}>Open rate</div>
            <div style={{ ...s.statNum, color: getOpenRateColor(openRate) }}>{openRate}%</div>
            <div style={s.statSub}>{openRate >= 20 ? '🟢 Good' : openRate >= 10 ? '🟡 Average' : '🔴 Low'}</div>
          </div>
          <div style={s.statCard}>
            <div style={s.statLabel}>Not opened</div>
            <div style={s.statNum}>{unopened.length}</div>
            <div style={s.statSub}>recipients</div>
          </div>
        </div>

        <div style={s.card}>
          <div style={s.tabs}>
            <div style={activeTab === 'opened' ? s.tabActive : s.tab} onClick={() => setActiveTab('opened')}>
              Opened ({uniqueOpens.length})
            </div>
            <div style={activeTab === 'all' ? s.tabActive : s.tab} onClick={() => setActiveTab('all')}>
              All opens ({opens.length})
            </div>
            <div style={activeTab === 'unopened' ? s.tabActive : s.tab} onClick={() => setActiveTab('unopened')}>
              Not opened ({unopened.length})
            </div>
          </div>

          {activeTab === 'opened' && (
            <>
              {uniqueOpens.length === 0 && <div style={s.emptyBox}>No opens yet</div>}
              {uniqueOpens.map((o, i) => (
                <div key={i} style={s.openRow}>
                  <div style={{ ...s.dot, background: '#3B6D11' }} />
                  <div style={s.emailText}>{o.recipient_email}</div>
                  <span style={s.countBadge}>opened {o.open_count}x</span>
                  <div style={s.timeText}>{formatTime(o.opened_at)}</div>
                </div>
              ))}
            </>
          )}

          {activeTab === 'all' && (
            <>
              {opens.length === 0 && <div style={s.emptyBox}>No opens yet</div>}
              {opens.map((o, i) => (
                <div key={i} style={s.openRow}>
                  <div style={{ ...s.dot, background: '#185FA5' }} />
                  <div style={s.emailText}>{o.recipient_email}</div>
                  <div style={s.timeText}>{formatTime(o.opened_at)}</div>
                </div>
              ))}
            </>
          )}

          {activeTab === 'unopened' && (
            <>
              {unopened.length === 0 && <div style={s.emptyBox}>Everyone opened! 🎉</div>}
              {unopened.map((o, i) => (
                <div key={i} style={s.openRow}>
                  <div style={{ ...s.dot, background: '#ccc' }} />
                  <div style={s.emailText}>{o.recipient_email}</div>
                  <div style={s.timeText}>Not opened</div>
                </div>
              ))}
            </>
          )}
        </div>
      </div>
    );
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '20px' }}>
        <div>
          <div style={s.title}>Analytics</div>
          <div style={s.sub}>
            Email open tracking across all campaigns
            <span style={s.liveTag}>● Live</span>
          </div>
        </div>
      </div>

      <div style={s.overviewGrid}>
        <div style={s.statCard}>
          <div style={s.statLabel}>Total sent</div>
          <div style={s.statNum}>{overview.total_sent || 0}</div>
          <div style={s.statSub}>all time</div>
        </div>
        <div style={s.statCard}>
          <div style={s.statLabel}>Unique opens</div>
          <div style={s.statNum}>{overview.unique_opens || 0}</div>
          <div style={s.statSub}>{overview.overall_open_rate || 0}% open rate</div>
        </div>
        <div style={s.statCard}>
          <div style={s.statLabel}>Best campaign</div>
          <div style={{ fontSize: '14px', fontWeight: '500', color: '#111', marginTop: '4px' }}>
            {overview.top_campaign ? overview.top_campaign.name : '—'}
          </div>
          <div style={s.statSub}>
            {overview.top_campaign ? `${overview.top_campaign.opens} opens` : 'no data yet'}
          </div>
        </div>
      </div>

      <div style={s.card}>
        <div style={s.tableHeader}>
          <div>Campaign</div>
          <div>Sent</div>
          <div>Opens</div>
          <div>Open rate</div>
          <div></div>
        </div>
        {campaigns.length === 0 && (
          <div style={s.emptyBox}>No campaigns yet. Launch one to start tracking.</div>
        )}
        {campaigns.map(c => {
          const rate = parseInt(c.sent_count) > 0
            ? Math.round((parseInt(c.unique_opens) / parseInt(c.sent_count)) * 100)
            : 0;
          const color = getOpenRateColor(rate);
          return (
            <div key={c.id} style={s.tableRow} onClick={() => loadDetail(c)}>
              <div>
                <div style={s.campName}>{c.name}</div>
                <span style={{
                  ...s.pill,
                  ...(c.status === 'running' ? s.pillGreen : c.status === 'completed' ? s.pillBlue : s.pillGray)
                }}>
                  {c.status}
                </span>
              </div>
              <div style={s.numCell}>{c.sent_count || 0}</div>
              <div style={s.numCell}>{c.unique_opens || 0}</div>
              <div>
                <div style={{ ...s.rateCell, color }}>{rate}%</div>
                <div style={s.progressBar}>
                  <div style={{ ...s.progressFill, width: `${Math.min(rate, 100)}%`, background: color }} />
                </div>
              </div>
              <div style={s.viewBtn}>View →</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
