// ============================================================
// pages/admin.js
// Admin panel for warehouse inventory management system
// Team overview, test alerts, notification log
// ============================================================

import React, { useState, useEffect, useCallback, useRef } from 'react';
import Head from 'next/head';
import { db } from '../firebase';
import app from '../firebase';
import {
  collection, query, where, onSnapshot, getDocs, addDoc, updateDoc,
  deleteDoc, doc, orderBy, limit, Timestamp, serverTimestamp
} from 'firebase/firestore';
import {
  getCurrentUser, setCurrentUser, TEAM_MEMBERS, ROLE_GROUPS,
  getTeamMemberById, isAdmin
} from '../lib/users';
import UserPicker from '../components/UserPicker';
import NotificationCenter from '../components/NotificationCenter';

// ============================================================
// HELPERS
// ============================================================

function getTimeAgo(date) {
  if (!date) return '';
  const now = new Date();
  let d = date;
  if (date?.toDate) d = date.toDate();
  else if (typeof date === 'string') d = new Date(date);
  else if (typeof date === 'number') d = new Date(date);

  const seconds = Math.floor((now - d) / 1000);
  if (seconds < 0) return 'just now';
  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
  return d.toLocaleDateString();
}

function formatResponseTime(sentAt, completedAt) {
  if (!sentAt || !completedAt) return null;
  let s = sentAt;
  let c = completedAt;
  if (s?.toDate) s = s.toDate();
  if (c?.toDate) c = c.toDate();
  const diffMs = new Date(c) - new Date(s);
  const mins = Math.round(diffMs / 60000);
  return mins;
}

// ============================================================
// ROLE BADGE COMPONENT
// ============================================================
function RoleBadge({ role }) {
  const colors = {
    admin: 'bg-purple-600 text-purple-100',
    warehouse: 'bg-green-700 text-green-100',
    listing: 'bg-blue-700 text-blue-100',
    photos: 'bg-teal-700 text-teal-100',
  };
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${colors[role] || 'bg-gray-600 text-gray-200'}`}>
      {role}
    </span>
  );
}

// ============================================================
// ALERT TYPE BADGE COMPONENT
// ============================================================
function AlertTypeBadge({ type }) {
  const styles = {
    reshelve: 'bg-blue-600 text-blue-100',
    retrieve: 'bg-green-600 text-green-100',
    urgent: 'bg-red-600 text-red-100',
  };
  const icons = {
    reshelve: '\u{1F4E6}',
    retrieve: '\u{1F50D}',
    urgent: '\u{1F6A8}',
  };
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full font-medium inline-flex items-center gap-1 ${styles[type] || 'bg-gray-600 text-gray-200'}`}>
      <span>{icons[type] || ''}</span>
      {type}
    </span>
  );
}

// ============================================================
// STATUS BADGE COMPONENT
// ============================================================
function StatusBadge({ status }) {
  const styles = {
    sent: 'bg-yellow-600 text-yellow-100',
    completed: 'bg-green-600 text-green-100',
    pending: 'bg-gray-600 text-gray-200',
    acknowledged: 'bg-blue-600 text-blue-100',
    failed: 'bg-red-700 text-red-100',
  };
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${styles[status] || 'bg-gray-600 text-gray-200'}`}>
      {status}
    </span>
  );
}

// ============================================================
// CAPABILITY TAG COMPONENT
// ============================================================
function CapabilityTag({ cap }) {
  const icons = {
    admin: '\u{1F451}',
    warehouse: '\u{1F3ED}',
    listing: '\u{1F4CB}',
    photos: '\u{1F4F7}',
  };
  return (
    <span className="text-xs bg-gray-700 text-gray-300 px-2 py-0.5 rounded-full">
      {icons[cap] || ''} {cap}
    </span>
  );
}

// ============================================================
// SECTION 1: TEAM MEMBERS OVERVIEW
// ============================================================
function TeamMembersSection() {
  const [deviceCounts, setDeviceCounts] = useState({});
  const [lastActive, setLastActive] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    async function fetchTeamData() {
      const counts = {};
      const activity = {};

      const promises = TEAM_MEMBERS.map(async (member) => {
        // Fetch device count
        try {
          const devicesRef = collection(db, 'users', member.id, 'devices');
          const devicesSnap = await getDocs(devicesRef);
          counts[member.id] = devicesSnap.size;
        } catch (err) {
          console.warn(`Could not fetch devices for ${member.id}:`, err);
          counts[member.id] = 0;
        }

        // Fetch last activity
        try {
          const activityRef = collection(db, 'activityLog');
          const activityQuery = query(
            activityRef,
            where('userId', '==', member.id),
            orderBy('timestamp', 'desc'),
            limit(1)
          );
          const activitySnap = await getDocs(activityQuery);
          if (!activitySnap.empty) {
            const docData = activitySnap.docs[0].data();
            activity[member.id] = docData.timestamp;
          } else {
            activity[member.id] = null;
          }
        } catch (err) {
          console.warn(`Could not fetch activity for ${member.id}:`, err);
          activity[member.id] = null;
        }
      });

      await Promise.all(promises);

      if (mounted) {
        setDeviceCounts(counts);
        setLastActive(activity);
        setLoading(false);
      }
    }

    fetchTeamData();
    return () => { mounted = false; };
  }, []);

  return (
    <div className="bg-gray-800 rounded-xl p-5 shadow-lg">
      <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
        <span className="text-xl">{'\u{1F465}'}</span> Team Members
      </h2>

      {loading ? (
        <div className="text-gray-400 text-sm text-center py-8">Loading team data...</div>
      ) : (
        <div className="space-y-6">
          {ROLE_GROUPS.map(group => {
            const members = TEAM_MEMBERS.filter(m => m.role === group.key);
            if (members.length === 0) return null;

            return (
              <div key={group.key}>
                <div className="flex items-center gap-2 mb-3 px-1">
                  <span className="text-base">{group.icon}</span>
                  <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                    {group.label}
                  </span>
                  <span className="text-xs text-gray-500">({members.length})</span>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  {members.map(member => (
                    <div
                      key={member.id}
                      className="bg-gray-750 bg-opacity-50 border border-gray-700 rounded-lg p-4 hover:border-gray-600 transition-colors"
                      style={{ backgroundColor: 'rgba(31, 41, 55, 0.8)' }}
                    >
                      <div className="flex items-center gap-3 mb-2">
                        <span
                          className="w-4 h-4 rounded-full flex-shrink-0 ring-2 ring-gray-600"
                          style={{ backgroundColor: member.color }}
                        />
                        <span className="font-semibold text-white text-sm">{member.name}</span>
                        <RoleBadge role={member.role} />
                      </div>

                      <div className="flex flex-wrap gap-1 mb-3">
                        {member.capabilities.map(cap => (
                          <CapabilityTag key={cap} cap={cap} />
                        ))}
                      </div>

                      <div className="flex items-center justify-between text-xs text-gray-400">
                        <span className="flex items-center gap-1">
                          <span>{'\u{1F4F1}'}</span>
                          {deviceCounts[member.id] || 0} device{deviceCounts[member.id] !== 1 ? 's' : ''}
                        </span>
                        <span>
                          {lastActive[member.id]
                            ? `Active ${getTimeAgo(lastActive[member.id])}`
                            : 'No activity recorded'
                          }
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ============================================================
// SECTION 2: SEND TEST ALERT
// ============================================================
function SendTestAlertSection() {
  const [targetUserId, setTargetUserId] = useState(TEAM_MEMBERS[0]?.id || '');
  const [alertType, setAlertType] = useState('reshelve');
  const [sku, setSku] = useState('TEST-001');
  const [shelfLocation, setShelfLocation] = useState('A1-01');
  const [customMessage, setCustomMessage] = useState('');
  const [broadcast, setBroadcast] = useState(false);
  const [apiKey, setApiKey] = useState('');
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState(null);

  const handleSend = async () => {
    setSending(true);
    setResult(null);

    try {
      const body = {
        type: alertType,
        sku: sku || 'TEST-001',
        shelfLocation: shelfLocation || 'A1-01',
        message: customMessage || undefined,
        broadcast: broadcast,
      };

      if (!broadcast) {
        body.userId = targetUserId;
      }

      const headers = {
        'Content-Type': 'application/json',
      };

      if (apiKey.trim()) {
        headers['x-internal-key'] = apiKey.trim();
      }

      const res = await fetch('/api/notify', {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (res.ok) {
        setResult({ type: 'success', data });
      } else {
        setResult({ type: 'error', message: data.error || `HTTP ${res.status}` });
      }
    } catch (err) {
      setResult({ type: 'error', message: err.message });
    }

    setSending(false);
  };

  return (
    <div className="bg-gray-800 rounded-xl p-5 shadow-lg">
      <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
        <span className="text-xl">{'\u{1F4E2}'}</span> Send Test Alert
      </h2>

      <div className="space-y-4">
        {/* API Key */}
        <div>
          <label className="block text-xs font-medium text-gray-400 mb-1">API Key</label>
          <input
            type="password"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder="Paste your INTERNAL_API_KEY here"
            className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm placeholder-gray-500 focus:outline-none focus:border-blue-500"
          />
          <p className="text-xs text-gray-500 mt-1">Required for authentication with /api/notify</p>
        </div>

        {/* Target Person */}
        <div>
          <label className="block text-xs font-medium text-gray-400 mb-1">Send To</label>
          <select
            value={targetUserId}
            onChange={(e) => setTargetUserId(e.target.value)}
            disabled={broadcast}
            className={`w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500 ${broadcast ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            {TEAM_MEMBERS.map(m => (
              <option key={m.id} value={m.id}>
                {m.name} ({m.role})
              </option>
            ))}
          </select>
        </div>

        {/* Broadcast Checkbox */}
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={broadcast}
            onChange={(e) => setBroadcast(e.target.checked)}
            className="w-4 h-4 rounded border-gray-600 bg-gray-700 text-blue-500 focus:ring-blue-500 focus:ring-offset-0"
          />
          <span className="text-sm text-gray-300">Broadcast to all warehouse workers</span>
        </label>

        {/* Alert Type */}
        <div>
          <label className="block text-xs font-medium text-gray-400 mb-1">Alert Type</label>
          <select
            value={alertType}
            onChange={(e) => setAlertType(e.target.value)}
            className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500"
          >
            <option value="reshelve">{'\u{1F4E6}'} Reshelve</option>
            <option value="retrieve">{'\u{1F50D}'} Retrieve</option>
            <option value="urgent">{'\u{1F6A8}'} Urgent</option>
          </select>
        </div>

        {/* SKU and Location in a row */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1">SKU</label>
            <input
              type="text"
              value={sku}
              onChange={(e) => setSku(e.target.value)}
              placeholder="TEST-001"
              className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm placeholder-gray-500 focus:outline-none focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1">Shelf Location</label>
            <input
              type="text"
              value={shelfLocation}
              onChange={(e) => setShelfLocation(e.target.value)}
              placeholder="A1-01"
              className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm placeholder-gray-500 focus:outline-none focus:border-blue-500"
            />
          </div>
        </div>

        {/* Custom Message */}
        <div>
          <label className="block text-xs font-medium text-gray-400 mb-1">Custom Message (optional)</label>
          <input
            type="text"
            value={customMessage}
            onChange={(e) => setCustomMessage(e.target.value)}
            placeholder="Override the default alert message"
            className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm placeholder-gray-500 focus:outline-none focus:border-blue-500"
          />
        </div>

        {/* Send Button */}
        <button
          onClick={handleSend}
          disabled={sending}
          className={`w-full py-3 rounded-lg font-semibold text-sm transition-all ${
            sending
              ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
              : alertType === 'urgent'
                ? 'bg-red-600 hover:bg-red-500 text-white'
                : 'bg-blue-600 hover:bg-blue-500 text-white'
          }`}
        >
          {sending ? 'Sending...' : broadcast ? 'Broadcast Test Alert' : 'Send Test Alert'}
        </button>

        {/* Result Message */}
        {result && (
          <div className={`rounded-lg p-3 text-sm ${
            result.type === 'success'
              ? 'bg-green-900 border border-green-700 text-green-200'
              : 'bg-red-900 border border-red-700 text-red-200'
          }`}>
            {result.type === 'success' ? (
              <div>
                <div className="font-semibold mb-1">{'\u2705'} Alert sent successfully</div>
                <pre className="text-xs text-green-300 overflow-x-auto whitespace-pre-wrap">
                  {JSON.stringify(result.data, null, 2)}
                </pre>
              </div>
            ) : (
              <div>
                <div className="font-semibold mb-1">{'\u274C'} Failed to send</div>
                <div className="text-xs">{result.message}</div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================
// SECTION 3: NOTIFICATION LOG
// ============================================================
function NotificationLogSection() {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterPerson, setFilterPerson] = useState('all');
  const [filterType, setFilterType] = useState('all');

  useEffect(() => {
    const alertsRef = collection(db, 'alertHistory');
    const alertsQuery = query(alertsRef, orderBy('sentAt', 'desc'), limit(50));

    const unsub = onSnapshot(alertsQuery, (snapshot) => {
      const data = snapshot.docs.map(d => ({
        id: d.id,
        ...d.data(),
      }));
      setAlerts(data);
      setLoading(false);
    }, (err) => {
      console.error('Alert history listener error:', err);
      setLoading(false);
    });

    return () => unsub();
  }, []);

  const filteredAlerts = alerts.filter(alert => {
    if (filterPerson !== 'all' && alert.userId !== filterPerson) return false;
    if (filterType !== 'all' && alert.alertType !== filterType) return false;
    return true;
  });

  const resolveUserName = (userId) => {
    const member = getTeamMemberById(userId);
    return member ? member.name : userId || '—';
  };

  return (
    <div className="bg-gray-800 rounded-xl p-5 shadow-lg">
      <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
        <span className="text-xl">{'\u{1F4DC}'}</span> Notification Log
        <span className="text-xs font-normal text-gray-400 ml-1">(last 50)</span>
      </h2>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-4">
        <div className="flex-1 min-w-[140px]">
          <label className="block text-xs font-medium text-gray-400 mb-1">Filter by Person</label>
          <select
            value={filterPerson}
            onChange={(e) => setFilterPerson(e.target.value)}
            className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500"
          >
            <option value="all">All People</option>
            {TEAM_MEMBERS.map(m => (
              <option key={m.id} value={m.id}>{m.name}</option>
            ))}
          </select>
        </div>
        <div className="flex-1 min-w-[140px]">
          <label className="block text-xs font-medium text-gray-400 mb-1">Filter by Type</label>
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500"
          >
            <option value="all">All Types</option>
            <option value="reshelve">Reshelve</option>
            <option value="retrieve">Retrieve</option>
            <option value="urgent">Urgent</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="text-gray-400 text-sm text-center py-8">Loading alert history...</div>
      ) : filteredAlerts.length === 0 ? (
        <div className="text-gray-500 text-sm text-center py-8">
          {alerts.length === 0 ? 'No alerts have been sent yet.' : 'No alerts match the current filters.'}
        </div>
      ) : (
        <div className="overflow-x-auto -mx-5 px-5">
          <table className="w-full text-sm min-w-[640px]">
            <thead>
              <tr className="text-gray-400 text-xs uppercase tracking-wider border-b border-gray-700">
                <th className="text-left py-2 pr-3 font-medium">Time</th>
                <th className="text-left py-2 pr-3 font-medium">Type</th>
                <th className="text-left py-2 pr-3 font-medium">To</th>
                <th className="text-left py-2 pr-3 font-medium">SKU</th>
                <th className="text-left py-2 pr-3 font-medium">Status</th>
                <th className="text-left py-2 font-medium">Response</th>
              </tr>
            </thead>
            <tbody>
              {filteredAlerts.map(alert => {
                const responseMinutes = formatResponseTime(alert.sentAt, alert.completedAt);
                const isSlowResponse = responseMinutes !== null && responseMinutes > 10;

                return (
                  <tr key={alert.id} className="border-b border-gray-700/50 hover:bg-gray-700/30 transition-colors">
                    <td className="py-2.5 pr-3 text-gray-300 text-xs whitespace-nowrap">
                      {alert.sentAt ? getTimeAgo(alert.sentAt) : '—'}
                    </td>
                    <td className="py-2.5 pr-3">
                      <AlertTypeBadge type={alert.alertType} />
                    </td>
                    <td className="py-2.5 pr-3 text-gray-300 text-xs">
                      {resolveUserName(alert.userId)}
                    </td>
                    <td className="py-2.5 pr-3 text-gray-300 text-xs font-mono">
                      {alert.sku || '—'}
                    </td>
                    <td className="py-2.5 pr-3">
                      <StatusBadge status={alert.status || 'sent'} />
                    </td>
                    <td className={`py-2.5 text-xs font-medium ${
                      isSlowResponse ? 'text-red-400' : responseMinutes !== null ? 'text-green-400' : 'text-gray-500'
                    }`}>
                      {responseMinutes !== null ? `${responseMinutes}m` : '—'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {filteredAlerts.length > 0 && (
        <div className="mt-3 text-xs text-gray-500 text-right">
          Showing {filteredAlerts.length} of {alerts.length} alerts
        </div>
      )}
    </div>
  );
}

// ============================================================
// MAIN: Admin Page
// ============================================================
export default function AdminPage() {
  const [user, setUser] = useState(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setUser(getCurrentUser());
    setMounted(true);
  }, []);

  // Wait for client-side hydration before rendering auth gates
  if (!mounted) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-gray-500 text-sm">Loading...</div>
      </div>
    );
  }

  // No user selected: show UserPicker
  if (!user) {
    return (
      <>
        <Head>
          <title>{'\u2699\uFE0F'} Admin — IPRU</title>
          <link rel="icon" href="/favicon-admin.svg" />
        </Head>
        <UserPicker
          title="Admin Panel"
          subtitle="Select your admin account"
          onSelect={(m) => setUser(m)}
        />
      </>
    );
  }

  // Not an admin: access denied
  if (!isAdmin(user)) {
    return (
      <>
        <Head>
          <title>{'\u2699\uFE0F'} Admin — IPRU</title>
          <link rel="icon" href="/favicon-admin.svg" />
        </Head>
        <div className="min-h-screen bg-gray-900 flex items-center justify-center">
          <div className="text-center text-white">
            <h1 className="text-2xl font-bold mb-2">Access Denied</h1>
            <p className="text-gray-400 mb-4">Admin access required</p>
            <a href="/pro" className="text-blue-400 hover:underline">Back to Pro Builder</a>
          </div>
        </div>
      </>
    );
  }

  // Admin authenticated: full dashboard
  return (
    <>
      <Head>
        <title>{'\u2699\uFE0F'} Admin — IPRU</title>
        <link rel="icon" href="/favicon-admin.svg" />
      </Head>

      <div className="min-h-screen bg-gray-900 text-white">
        {/* Header */}
        <header className="sticky top-0 z-50 bg-gray-900/95 backdrop-blur-sm border-b border-gray-800">
          <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <a
                href="/pro"
                className="text-sm text-gray-400 hover:text-white transition-colors flex items-center gap-1"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                </svg>
                Back to Pro Builder
              </a>
              <span className="text-gray-600">|</span>
              <h1 className="text-base font-bold text-white flex items-center gap-2">
                <span>{'\u2699\uFE0F'}</span> Admin Panel
              </h1>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 text-sm text-gray-400">
                <span
                  className="w-3 h-3 rounded-full flex-shrink-0"
                  style={{ backgroundColor: user.color }}
                />
                {user.name}
              </div>
              <NotificationCenter
                firebaseApp={app}
                userId={user.id}
                deviceName={`Admin Panel`}
              />
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="max-w-5xl mx-auto px-4 py-6 space-y-6">
          {/* Section 1: Team Members */}
          <TeamMembersSection />

          {/* Section 2: Send Test Alert */}
          <SendTestAlertSection />

          {/* Section 3: Notification Log */}
          <NotificationLogSection />
        </main>

        {/* Footer */}
        <footer className="max-w-5xl mx-auto px-4 py-6 text-center text-xs text-gray-600 border-t border-gray-800 mt-8">
          IPRU Admin Panel — Warehouse Inventory Management
        </footer>
      </div>
    </>
  );
}
