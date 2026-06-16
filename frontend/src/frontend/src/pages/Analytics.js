import React, { useState, useEffect } from 'react';
import { getAnalytics, getAnalyticsOverview, getCampaignOpens, getCampaignUnopened } from '../api';

const s = {
  title: { fontSize: '20px', fontWeight: '500', color: '#111', marginBottom: '4px' },
  sub: { fontSize: '13px', color: '#888', marginBottom: '20px' },
  statsGrid: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px', marginBottom: '20px' },
  statCard: { background: '#f0f0ea', borderRadius: '8px', padding: '12px 14px' },
  statLabel: { fontSize: '11px', color: '#888', marginBottom: '4px' },
  statNum: { fontSize: '24px', fontWeight: '500', color: '#111' },
  statSub: { fontSize: '11px', color: '#888', marginTop: '2px' },
  card: { background: '#fff', border: '0.5px solid #e0e0d8', borderRadius: '12px', padding: '14px 16px', marginBottom: '12px' },
  cardTitle: { fontSize: '14px', fontWeight: '500', color: '#111', marginBottom: '12px' },
  campRow: { display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 0', borderBottom: '0.5px solid #e0e0d8', cursor: 'pointer' },
  campName: { fontSize: '14px', fontWeight: '500', color: '#111', flex: 1 },
  campSub: { fontSize: '12px', color: '#888', marginTop: '3px' },
  progressBar: { height: '6px', background: '#f0f0ea', borderRadius: '3px', marginTop: '6px', overflow: 'hidden', width: '100%' },
  progressFill: { height: '100%', borderRadius: '3px', background: '#3B6D11' },
  pill: { fontSize: '11px', fontWeight: '500', padding: '3px 10px', borderRadius: '999px' },
  pillGreen: { background: '#eaf3de', color: '#3B6D11' },
  pillBlue: { background: '#e6f1fb', color: '#185FA5' },
  pillGray: { background: '#f0f0ea', color: '#666' },
  detailCard: { background: '#f5f5f0', border: '0.5px solid #e0e0d8', borderRadius: '12px', padding: '14px 16px', marginBottom: '12px' },
  detailTitle: { fontSize: '13px', fontWeight: '500', color: '#111', marginBottom: '10px' },
  openRow: { display: 'flex', alignItems: 'center', gap: '12px', padding: '7px 0', borderBottom: '0.5px solid #e0e0d8', fontSize: '12px' },
  emailText: { flex: 1, color: '#111' },
  timeText: { color: '#888', fontSize: '11px' },
  countBadge: { background: '#e6f1fb', color: '#185FA5', fontSize: '10px', fontWeight: '500', padding: '2px 7px', borderRadius: '999px' },
  tabs: { display: 'flex', gap: '0', borderBottom: '0.5px solid #e0e0d8', marginBottom: '12px' },
  tab: { padding: '7px 16px', fontSize: '12px', cursor: 'pointer', borderBottom: '2px solid transparent', marginBottom: '-0.5px', color: '#888' },
  tabActive: { padding: '7px 16px', fontSize: '12px', cursor: 'pointer', borderBottom: '2px solid #111', marginBottom: '-0.5px', color: '#111', fontWeight: '500' },
  emptyBox: { textAlign: 'center', padding: '30px', color: '#888', fontSize: '13px' },
  backBtn: { fontSize: '13px', color: '#185FA5', cursor: 'pointer', marginBottom: '16px', display: 'inline-block' },
  liveTag: { fontSize: '10px', fontWeight: '500', padding: '2px 7px', borderRadius: '999px', background: '#eaf3de', color: '#3B6D11', marginLeft: '8px' },
};

function OpenRateBar({ rate }) {
  const color = rate >= 30 ? '#3B6D11' : rate >= 15 ? '#854F0B' : '#A32D2D';
  return (
    <div style={{ ...s.progressBar, width: '120px' }}>
      <div style={{ ...s.progressFill, width: `${rate}%`, background: color }} />
    </div>
  );
}

export default function Analytics() {
  const [overview, setOverview] = useState({});
  const [campaigns, setCampaigns] = useState([]);
  const [selectedCampaign, setSelectedCampaign] = useState(null);
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

  const loadCampaignDetail = async (campaign) => {
    setSelectedCampaign(campaign);
    try {
      const [o, u] = await Promise.all([
        getCampaignOpens(campaign.id),
        getCampaignUnopened(campaign.id)
      ]);
      setOpens(o.data);
      setUnopened(u.data);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    load();
    const interval = setInterval(load, 10000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (selectedCampaign) {
      const interval = setInterval(() => loadCampaignDetail(selectedCampaign), 10000);
      return () => clearInterval(interval);
    }
  }, [selectedCampaign]);

  const formatTime = (t) => {
    if (!t) return '';
    return new Date(t).toLocaleString();
  };

  const getUniqueOpens = (opensData) => {
    const seen = new Set();
    return opensData.filter(o => {
      if (seen.has(o.recipient_email)) return false;
      seen.add(o.recipient_email);
      return true;
    });
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '60px', color: '#888', fontSize: '14px' }}>
        Loading analytics...
      </div>
    );
  }

  if (selectedCampaign) {
    const uniqueOpens = getUniqueOpens(opens);
    return (
      <div>
        <div style={s.backBtn} onClick={() => setSelectedCampaign(null)}>
          ← Back to all campaigns
        </div>

        <div style={s.title}>{selectedCampaign.name}</div>
        <div style={{ fontSize: '13px', color: '#888', marginBottom: '20px' }}>
          Campaign analytics
          <span style={s.liveTag}>● Live</span>
        </div>

        <div style={s.statsGrid}>
          <div style={s.statCard}>
            <div style={s.statLabel}>Emails sent</div>
            <div style={s.statNum}>{selectedCampaign.sent_count || 0}</div>
            <div style={s.statSub}>of {selectedCampaign.total_contacts} total</div>
          </div>
          <div style={s.statCard}>
            <div style={s.statLabel}>Unique opens</div>
            <div style={s.statNum}>{uniqueOpens.length}</div>
            <div style={s.statSub}>individual recipients</div>
          </div>
          <div style={s.statCard}>
            <div style={s.statLabel}>Open rate</div>
            <div style={s.statNum} style={{ color: selectedCampaign.open_rate >= 20 ? '#3B6D11' : '#A32D2D' }}>
              {selectedCampaign.open_rate || 0}%
            </div>
            <div style={s.statSub}>of sent emails</div>
          </div>
          <div style={s.statCard}>
            <div style={s.statLabel}>Not opened</div>
            <div style={s.statNum}>{unopened.length}</div>
            <div style={s.statSub}>recipients</div>
          </div>
        </div>

        <div style={s.card}>
          <div style={s.tabs}>
            <div
              style={activeTab === 'opened' ? s.tabActive : s.tab}
              onClick={() => setActiveTab('opened')}
            >
              Opened ({uniqueOpens.length})
            </div>
            <div
              style={activeTab === 'all_opens' ? s.tabActive : s.tab}
              onClick={() => setActiveTab('all_opens')}
            >
              All opens ({opens.length})
            </div>
            <div
              style={activeTab === 'unopened' ? s.tabActive : s.tab}
              onClick={() => setActiveTab('unopened')}
            >
              Not opened ({unopened.length})
            </div>
          </div>

          {activeTab === 'opened' && (
            <>
              {uniqueOpens.length === 0 && <div style={s.emptyBox}>No opens recorded yet</div>}
              {uniqueOpens.map((o, i) => (
                <div key={i} style={s.openRow}>
                  <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#3B6D11', flexShrink: 0 }} />
                  <div style={s.emailText}>{o.recipient_email}</div>
                  <span style={s.countBadge}>opened {o.open_count}x</span>
                  <div style={s.timeText}>{formatTime(o.opened_at)}</div>
                </div>
              ))}
            </>
          )}

          {activeTab === 'all_opens' && (
            <>
              {opens.length === 0 && <div style={s.emptyBox}>No opens recorded yet</div>}
              {opens.map((o, i) => (
                <div key={i} style={s.openRow}>
                  <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#185FA5', flexShrink: 0 }} />
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
                  <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#ccc', flexShrink: 0 }} />
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
            Track email opens across all campaigns
            <span style={s.liveTag}>● Live</span>
          </div>
        </div>
      </div>

      <div style={s.statsGrid}>
        <div style={s.statCard}>
          <div style={s.statLabel}>Total sent</div>
          <div style={s.statNum}>{overview.total_sent || 0}</div>
          <div style={s.statSub}>all time</div>
        </div>
        <div style={s.statCard}>
          <div style={s.statLabel}>Total opens</div>
          <div style={s.statNum}>{overview.total_opens || 0}</div>
          <div style={s.statSub}>including repeats</div>
        </div>
        <div style={s.statCard}>
          <div style={s.statLabel}>Unique opens</div>
          <div style={s.statNum}>{overview.unique_opens || 0}</div>
          <div style={s.statSub}>individual recipients</div>
        </div>
        <div style={s.statCard}>
          <div style={s.statLabel}>Overall open rate</div>
          <div style={s.statNum}>{overview.overall_open_rate || 0}%</div>
          <div style={s.statSub}>
            {overview.top_campaign ? `Best: ${overview.top_campaign.name}` : 'no data yet'}
          </div>
        </div>
      </div>

      <div style={s.card}>
        <div style={s.cardTitle}>All campaigns — click to see details</div>
        {campaigns.length === 0 && (
          <div style={s.emptyBox}>No campaigns yet. Launch one to start tracking opens.</div>
        )}
        {campaigns.map(c => (
          <div key={c.id} style={s.campRow} onClick={() => loadCampaignDetail(c)}>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={s.campName}>{c.name}</div>
                <span style={{
                  ...s.pill,
                  ...(c.status === 'running' ? s.pillGreen : c.status === 'completed' ? s.pillBlue : s.pillGray)
                }}>
                  {c.status}
                </span>
              </div>
              <div style={s.campSub}>
                {c.sent_count} sent · {c.unique_opens} unique opens · {c.open_rate}% open rate
              </div>
              <OpenRateBar rate={c.open_rate} />
            </div>
            <div style={{ fontSize: '12px', color: '#185FA5' }}>View details →</div>
          </div>
        ))}
      </div>
    </div>
  );
}
