// ============================================================
// NotificationCenter.jsx
// React component — Notification bell + alert panel
// ============================================================

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  initMessaging,
  requestNotificationPermission,
  onForegroundMessage,
  triggerVibration,
} from '../lib/notificationService';

// ------------------------------------------------------------
// Styles
// ------------------------------------------------------------
const styles = {
  bellButton: {
    position: 'relative',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    padding: '8px',
    fontSize: '24px',
    lineHeight: 1,
  },
  badge: {
    position: 'absolute',
    top: '2px',
    right: '2px',
    background: '#ef4444',
    color: 'white',
    borderRadius: '50%',
    width: '20px',
    height: '20px',
    fontSize: '11px',
    fontWeight: 'bold',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    border: '2px solid white',
  },
  panel: {
    position: 'fixed',
    top: 0,
    right: 0,
    bottom: 0,
    width: '100%',
    maxWidth: '400px',
    background: '#111827',
    color: '#f9fafb',
    boxShadow: '-4px 0 20px rgba(0,0,0,0.5)',
    zIndex: 1000,
    display: 'flex',
    flexDirection: 'column',
    fontFamily: "'SF Pro Display', -apple-system, BlinkMacSystemFont, sans-serif",
    transition: 'transform 0.3s ease',
    overflow: 'hidden',
    boxSizing: 'border-box',
  },
  panelHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '16px 20px',
    borderBottom: '1px solid #374151',
    flexShrink: 0,
  },
  panelTitle: {
    fontSize: '18px',
    fontWeight: '700',
    margin: 0,
    color: '#f9fafb',
  },
  closeButton: {
    background: 'none',
    border: 'none',
    color: '#9ca3af',
    fontSize: '24px',
    cursor: 'pointer',
    padding: '4px 8px',
    borderRadius: '6px',
  },
  cardList: {
    flex: 1,
    overflowY: 'auto',
    padding: '16px',
    minHeight: 0,
  },
  card: {
    borderRadius: '12px',
    padding: '14px 16px',
    marginBottom: '10px',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    border: '1px solid transparent',
    overflow: 'hidden',
    wordBreak: 'break-word',
  },
  cardReshelve: {
    background: 'linear-gradient(135deg, #1e3a5f 0%, #1a2744 100%)',
    borderColor: '#2563eb33',
  },
  cardRetrieve: {
    background: 'linear-gradient(135deg, #2d4a2a 0%, #1a2e1a 100%)',
    borderColor: '#16a34a33',
  },
  cardUrgent: {
    background: 'linear-gradient(135deg, #5a1a1a 0%, #3a1111 100%)',
    borderColor: '#ef444433',
    animation: 'urgentPulse 2s ease-in-out infinite',
  },
  cardDefault: {
    background: '#1f2937',
    borderColor: '#374151',
  },
  cardTitle: {
    fontSize: '14px',
    fontWeight: '700',
    marginBottom: '4px',
  },
  cardBody: {
    fontSize: '13px',
    color: '#d1d5db',
    marginBottom: '8px',
    lineHeight: '1.4',
  },
  cardMeta: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    fontSize: '11px',
    color: '#6b7280',
  },
  cardActions: {
    display: 'flex',
    gap: '8px',
    marginTop: '10px',
  },
  actionButton: {
    flex: 1,
    padding: '8px 12px',
    borderRadius: '8px',
    border: 'none',
    fontSize: '12px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'opacity 0.2s',
  },
  doneButton: {
    background: '#16a34a',
    color: 'white',
  },
  snoozeButton: {
    background: '#374151',
    color: '#d1d5db',
  },
  emptyState: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '60px 20px',
    color: '#6b7280',
    textAlign: 'center',
  },
  emptyIcon: {
    fontSize: '48px',
    marginBottom: '12px',
    opacity: 0.5,
  },
  setupBanner: {
    margin: '16px',
    padding: '16px',
    background: '#1e293b',
    borderRadius: '12px',
    border: '1px solid #334155',
    textAlign: 'center',
    flexShrink: 0,
  },
  setupButton: {
    marginTop: '10px',
    padding: '10px 20px',
    background: '#3b82f6',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
  },
  overlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'rgba(0,0,0,0.5)',
    zIndex: 999,
  },
};

// Inject CSS keyframes on mount
const injectKeyframes = () => {
  if (typeof document === 'undefined') return;
  if (document.getElementById('notification-keyframes')) return;
  const style = document.createElement('style');
  style.id = 'notification-keyframes';
  style.textContent = `
    @keyframes urgentPulse {
      0%, 100% { border-color: rgba(239, 68, 68, 0.2); }
      50% { border-color: rgba(239, 68, 68, 0.6); }
    }
    @keyframes slideIn {
      from { transform: translateX(100%); }
      to   { transform: translateX(0); }
    }
    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(8px); }
      to   { opacity: 1; transform: translateY(0); }
    }
  `;
  document.head.appendChild(style);
};

// ============================================================
// COMPONENT: NotificationBell
// ============================================================
export function NotificationBell({ unreadCount, onClick }) {
  return (
    <button style={styles.bellButton} onClick={onClick} aria-label="Notifications">
      🔔
      {unreadCount > 0 && (
        <span style={styles.badge}>
          {unreadCount > 9 ? '9+' : unreadCount}
        </span>
      )}
    </button>
  );
}

// ============================================================
// COMPONENT: NotificationCard
// ============================================================
function NotificationCard({ notification, onDone, onSnooze }) {
  const { title, body, data, timestamp } = notification;
  const alertType = data?.alertType || 'default';

  const cardStyle = {
    ...styles.card,
    ...(alertType === 'reshelve' ? styles.cardReshelve :
        alertType === 'retrieve' ? styles.cardRetrieve :
        alertType === 'urgent'   ? styles.cardUrgent :
        styles.cardDefault),
    animation: 'fadeIn 0.3s ease',
  };

  const typeIcon = {
    reshelve: '📦',
    retrieve: '🔍',
    urgent:   '🚨',
    default:  '🔔',
  };

  const timeAgo = getTimeAgo(timestamp);

  return (
    <div style={cardStyle}>
      <div style={styles.cardTitle}>
        {typeIcon[alertType] || '🔔'} {title}
      </div>
      <div style={styles.cardBody}>{body}</div>
      <div style={styles.cardMeta}>
        <span>{data?.sku && `SKU: ${data.sku}`}</span>
        <span>{timeAgo}</span>
      </div>
      <div style={styles.cardActions}>
        <button
          style={{ ...styles.actionButton, ...styles.doneButton }}
          onClick={() => onDone(notification)}
        >
          ✅ Done
        </button>
        <button
          style={{ ...styles.actionButton, ...styles.snoozeButton }}
          onClick={() => onSnooze(notification)}
        >
          ⏰ Snooze 5m
        </button>
      </div>
    </div>
  );
}

// ============================================================
// COMPONENT: NotificationCenter (main export)
// ============================================================
export default function NotificationCenter({ firebaseApp, userId, deviceName }) {
  const [isOpen, setIsOpen]             = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [isSetup, setIsSetup]           = useState(false);
  const [isSettingUp, setIsSettingUp]   = useState(false);
  const [deviceInfo, setDeviceInfo]     = useState(null);
  const unsubRef = useRef(null);

  // Inject CSS keyframes on mount
  useEffect(() => {
    injectKeyframes();
  }, []);

  // Check if already set up (token in localStorage)
  useEffect(() => {
    const savedDevice = localStorage.getItem('fcm_device_info');
    if (savedDevice) {
      try {
        setDeviceInfo(JSON.parse(savedDevice));
        setIsSetup(true);
      } catch (e) {
        localStorage.removeItem('fcm_device_info');
      }
    }
  }, []);

  // Listen for foreground messages once set up
  useEffect(() => {
    if (!isSetup || !firebaseApp) return;

    initMessaging(firebaseApp);

    unsubRef.current = onForegroundMessage((msg) => {
      setNotifications((prev) => [msg, ...prev]);
    });

    return () => {
      // Cleanup if needed
    };
  }, [isSetup, firebaseApp]);

  // Handle setup / permission request
  const handleSetup = async () => {
    setIsSettingUp(true);
    try {
      const result = await requestNotificationPermission(
        firebaseApp,
        userId,
        deviceName || `${detectPlatformShort()} Device`
      );
      setDeviceInfo(result);
      setIsSetup(true);
      localStorage.setItem('fcm_device_info', JSON.stringify(result));
      triggerVibration('default');
    } catch (err) {
      alert(`Setup failed: ${err.message}\n\nMake sure notifications are enabled in your browser settings.`);
    }
    setIsSettingUp(false);
  };

  // Mark notification as done
  const handleDone = useCallback((notification) => {
    setNotifications((prev) => prev.filter((n) => n !== notification));

    if (notification.data?.sku) {
      fetch('/api/tasks/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sku: notification.data.sku,
          userId: userId,
        }),
      }).catch(console.error);
    }
  }, [userId]);

  // Snooze notification
  const handleSnooze = useCallback((notification) => {
    setNotifications((prev) => prev.filter((n) => n !== notification));

    if (notification.data?.sku) {
      fetch('/api/tasks/snooze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sku: notification.data.sku,
          userId: userId,
          minutes: 5,
        }),
      }).catch(console.error);
    }
  }, [userId]);

  const handleClearAll = () => {
    setNotifications([]);
  };

  const unreadCount = notifications.length;

  return (
    <>
      <NotificationBell unreadCount={unreadCount} onClick={() => setIsOpen(true)} />

      {isOpen && (
        <>
          <div style={styles.overlay} onClick={() => setIsOpen(false)} />
          <div style={{ ...styles.panel, animation: 'slideIn 0.3s ease' }}>
            <div style={styles.panelHeader}>
              <h2 style={styles.panelTitle}>
                Alerts {unreadCount > 0 && `(${unreadCount})`}
              </h2>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                {unreadCount > 0 && (
                  <button
                    style={{ ...styles.closeButton, fontSize: '12px' }}
                    onClick={handleClearAll}
                  >
                    Clear All
                  </button>
                )}
                <button style={styles.closeButton} onClick={() => setIsOpen(false)}>
                  ✕
                </button>
              </div>
            </div>

            {!isSetup && (
              <div style={styles.setupBanner}>
                <div style={{ fontSize: '32px', marginBottom: '8px' }}>🔔</div>
                <div style={{ fontSize: '14px', fontWeight: '600', marginBottom: '4px' }}>
                  Enable Warehouse Alerts
                </div>
                <div style={{ fontSize: '12px', color: '#9ca3af', marginBottom: '8px' }}>
                  Get vibration and sound alerts when parts need to be shelved or retrieved.
                </div>
                <button
                  style={{
                    ...styles.setupButton,
                    opacity: isSettingUp ? 0.6 : 1,
                  }}
                  onClick={handleSetup}
                  disabled={isSettingUp}
                >
                  {isSettingUp ? 'Setting up...' : 'Enable Notifications'}
                </button>
              </div>
            )}

            <div style={styles.cardList}>
              {notifications.length > 0 ? (
                notifications.map((n, i) => (
                  <NotificationCard
                    key={`${n.data?.sku || ''}-${n.timestamp?.getTime() || i}`}
                    notification={n}
                    onDone={handleDone}
                    onSnooze={handleSnooze}
                  />
                ))
              ) : (
                <div style={styles.emptyState}>
                  <div style={styles.emptyIcon}>✅</div>
                  <div style={{ fontSize: '15px', fontWeight: '600', marginBottom: '4px' }}>
                    All clear!
                  </div>
                  <div style={{ fontSize: '13px' }}>
                    No pending alerts right now.
                  </div>
                </div>
              )}
            </div>

            {isSetup && deviceInfo && (
              <div
                style={{
                  padding: '12px 20px',
                  borderTop: '1px solid #374151',
                  fontSize: '11px',
                  color: '#6b7280',
                  textAlign: 'center',
                  flexShrink: 0,
                }}
              >
                📱 Device registered - Notifications active
              </div>
            )}
          </div>
        </>
      )}
    </>
  );
}

// ============================================================
// UTILITY HELPERS
// ============================================================
function getTimeAgo(date) {
  if (!date) return '';
  const seconds = Math.floor((new Date() - new Date(date)) / 1000);
  if (seconds < 60) return 'Just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}

function detectPlatformShort() {
  if (typeof navigator === 'undefined') return 'Web';
  const ua = navigator.userAgent;
  if (/android/i.test(ua)) return 'Android';
  if (/iPad|iPhone|iPod/.test(ua)) return 'iOS';
  return 'Web';
}
