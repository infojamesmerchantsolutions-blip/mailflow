import React, { useState, useCallback } from 'react';
import Dashboard from './pages/Dashboard';
import Campaigns from './pages/Campaigns';
import Contacts from './pages/Contacts';
import Accounts from './pages/Accounts';
import Logs from './pages/Logs';
import PinModal from './components/PinModal';

const styles = {
  shell: { display: 'flex', minHeight: '100vh' },
  sidebar: { width: '200px', background: '#fff', borderRight: '0.5px solid #e0e0d8', display: 'flex', flexDirection: 'column', padding: '16px 0' },
  logo: { padding: '0 16px 16px', fontSize: '16px', fontWeight: '600', borderBottom: '0.5px solid #e0e0d8', marginBottom: '12px' },
  logoSub: { fontSize: '11px', fontWeight: '400', color: '#999', display: 'block', marginTop: '2px' },
  navItem: { display: 'flex', alignItems: 'center', gap: '10px', padding: '9px 16px', fontSize: '13px', color: '#666', cursor: 'pointer', transition: 'background 0.1s' },
  navItemActive: { background: '#f5f5f0', color: '#111', fontWeight: '500' },
  dot: { width: '7px', height: '7px', borderRadius: '50%' },
  main: { flex: 1, padding: '24px', overflowY: 'auto', background: '#f5f5f0' },
  statusBar: { padding: '12px 16px', borderTop: '0.5px solid #e0e0d8', marginTop: 'auto' },
  statusLabel: { fontSize: '11px', color: '#999' },
  statusRow: { display: 'flex', alignItems: 'center', gap: '6px', marginTop: '4px' },
  statusDot: { width: '7px', height: '7px', borderRadius: '50%', background: '#3B6D11' },
  statusText: { fontSize: '12px', fontWeight: '500', color: '#111' },
  lockBadge: { fontSize: '10px', padding: '2px 6px', borderRadius: '999px', background: '#f5f5f0', color: '#888', marginLeft: 'auto', border: '0.5px solid #e0e0d8' },
};

const navItems = [
  { id: 'dashboard', label: 'Dashboard', color: '#3B6D11', protected: false },
  { id: 'campaigns', label: 'Campaigns', color: '#185FA5', protected: true },
  { id: 'contacts', label: 'Contacts', color: '#534AB7', protected: true },
  { id: 'accounts', label: 'Gmail Accounts', color: '#854F0B', protected: true },
  { id: 'logs', label: 'Logs', color: '#888', protected: false },
];

export default function App() {
  const [page, setPage] = useState('dashboard');
  const [pinVerified, setPinVerified] = useState(false);
  const [showPinModal, setShowPinModal] = useState(false);
  const [pendingPage, setPendingPage] = useState(null);
  const [pendingAction, setPendingAction] = useState(null);
  const [actionLabel, setActionLabel] = useState('');

  const handleNavClick = (item) => {
    if (item.protected && !pinVerified) {
      setPendingPage(item.id);
      setActionLabel(`access ${item.label}`);
      setShowPinModal(true);
    } else {
      setPage(item.id);
    }
  };

  const handlePinSuccess = useCallback((pin) => {
    setPinVerified(true);
    setShowPinModal(false);
    if (pendingPage) {
      setPage(pendingPage);
      setPendingPage(null);
    }
    if (pendingAction) {
      pendingAction(pin);
      setPendingAction(null);
    }
  }, [pendingPage, pendingAction]);

  const handlePinCancel = () => {
    setShowPinModal(false);
    setPendingPage(null);
    setPendingAction(null);
  };

  const requirePin = useCallback((label, action) => {
    if (pinVerified) {
      action();
      return;
    }
    setActionLabel(label);
    setPendingAction(() => action);
    setShowPinModal(true);
  }, [pinVerified]);

  const renderPage = () => {
    switch (page) {
      case 'dashboard': return <Dashboard />;
      case 'campaigns': return <Campaigns requirePin={requirePin} />;
      case 'contacts': return <Contacts requirePin={requirePin} />;
      case 'accounts': return <Accounts requirePin={requirePin} />;
      case 'logs': return <Logs />;
      default: return <Dashboard />;
    }
  };

  return (
    <div style={styles.shell}>
      {showPinModal && (
        <PinModal
          onSuccess={handlePinSuccess}
          onCancel={handlePinCancel}
          actionLabel={actionLabel}
        />
      )}

      <div style={styles.sidebar}>
        <div style={styles.logo}>
          MailFlow
          <span style={styles.logoSub}>Email automation</span>
        </div>

        {navItems.map(item => (
          <div
            key={item.id}
            style={{ ...styles.navItem, ...(page === item.id ? styles.navItemActive : {}) }}
            onClick={() => handleNavClick(item)}
          >
            <div style={{ ...styles.dot, background: item.color }} />
            {item.label}
            {item.protected && !pinVerified && (
              <span style={styles.lockBadge}>🔒</span>
            )}
          </div>
        ))}

        <div style={styles.statusBar}>
          <div style={styles.statusLabel}>System status</div>
          <div style={styles.statusRow}>
            <div style={styles.statusDot} />
            <span style={styles.statusText}>Running</span>
          </div>
          {pinVerified && (
            <div
              style={{ fontSize: '11px', color: '#3B6D11', marginTop: '6px', cursor: 'pointer' }}
              onClick={() => { setPinVerified(false); setPage('dashboard'); }}
            >
              🔓 Unlock active · Lock
            </div>
          )}
        </div>
      </div>

      <div style={styles.main}>
        {renderPage()}
      </div>
    </div>
  );
}
