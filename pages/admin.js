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

function formatResponseTime(alert) {
  // Prefer pre-calculated responseTimeMinutes if available
  if (alert.responseTimeMinutes != null) return alert.responseTimeMinutes;
  // Fall back to computing from timestamps
  const sentAt = alert.sentAt;
  const completedAt = alert.respondedAt || alert.completedAt;
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
    expired: 'bg-orange-700 text-orange-100',
    failed: 'bg-red-700 text-red-100',
  };
  const labels = {
    completed: 'done',
  };
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${styles[status] || 'bg-gray-600 text-gray-200'}`}>
      {labels[status] || status}
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

  useEffect(() => {
    const saved = localStorage.getItem('ipru_admin_api_key');
    if (saved) setApiKey(saved);
  }, []);

  const handleKeyChange = (val) => {
    setApiKey(val);
    localStorage.setItem('ipru_admin_api_key', val);
  };

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
            onChange={(e) => handleKeyChange(e.target.value)}
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
                const responseMinutes = formatResponseTime(alert);
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
// SECTION 4: EMERGENCY ACTIONS (Clear All Alerts)
// ============================================================
function EmergencyActionsSection() {
  const [clearing, setClearing] = useState(false);
  const [clearResult, setClearResult] = useState(null);
  const [apiKey, setApiKey] = useState('');

  useEffect(() => {
    const saved = localStorage.getItem('ipru_admin_api_key');
    if (saved) setApiKey(saved);
  }, []);

  const handleClearAll = async () => {
    if (!apiKey) {
      alert('Enter your API key first');
      return;
    }
    if (!confirm('This will expire ALL pending and acknowledged part requests. Continue?')) return;

    setClearing(true);
    setClearResult(null);
    try {
      const res = await fetch('/api/tasks/clear-all', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey }),
      });
      const data = await res.json();
      setClearResult(data);
      if (data.cleared > 0) {
        window.dispatchEvent(new CustomEvent('alerts-cleared'));
      }
    } catch (err) {
      setClearResult({ error: err.message });
    }
    setClearing(false);
  };

  return (
    <div className="bg-red-900/30 border border-red-800 rounded-xl p-5 shadow-lg">
      <h2 className="text-lg font-bold text-red-400 mb-3 flex items-center gap-2">
        {'\u{1F6D1}'} Emergency Actions
      </h2>
      <p className="text-sm text-gray-400 mb-4">
        Stop notification spam by expiring all pending part requests at once.
      </p>
      <div className="flex items-center gap-3">
        <input
          type="password"
          placeholder="API Key"
          value={apiKey}
          onChange={(e) => {
            setApiKey(e.target.value);
            localStorage.setItem('ipru_admin_api_key', e.target.value);
          }}
          className="flex-1 px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm"
        />
        <button
          onClick={handleClearAll}
          disabled={clearing}
          className="px-5 py-2 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-lg disabled:opacity-50 transition text-sm"
        >
          {clearing ? 'Clearing...' : '\u{1F6D1} Clear All Pending Alerts'}
        </button>
      </div>
      {clearResult && (
        <div className={`mt-3 text-sm ${clearResult.error ? 'text-red-400' : 'text-green-400'}`}>
          {clearResult.error ? `Error: ${clearResult.error}` : clearResult.message}
        </div>
      )}
    </div>
  );
}

// ============================================================
// SECTION 5: DEVICE MANAGEMENT
// ============================================================
function DeviceManagementSection() {
  const [devices, setDevices] = useState({}); // { userId: [{ id, ...data }] }
  const [loading, setLoading] = useState(true);
  const [removing, setRemoving] = useState(null); // deviceId or 'all-userId'

  const fetchAllDevices = async () => {
    setLoading(true);
    const allDevices = {};

    for (const member of TEAM_MEMBERS) {
      try {
        const devicesRef = collection(db, 'users', member.id, 'devices');
        const snap = await getDocs(devicesRef);
        const memberDevices = [];
        snap.forEach(docSnap => {
          memberDevices.push({ id: docSnap.id, ...docSnap.data() });
        });
        if (memberDevices.length > 0) {
          allDevices[member.id] = memberDevices;
        }
      } catch (e) {
        console.warn(`Failed to fetch devices for ${member.id}:`, e);
      }
    }

    setDevices(allDevices);
    setLoading(false);
  };

  useEffect(() => { fetchAllDevices(); }, []);

  const removeDevice = async (userId, deviceId) => {
    setRemoving(deviceId);
    try {
      await deleteDoc(doc(db, 'users', userId, 'devices', deviceId));
      await fetchAllDevices();
    } catch (e) {
      alert('Error: ' + e.message);
    }
    setRemoving(null);
  };

  const removeAllDevices = async (userId) => {
    if (!confirm(`Remove ALL devices for ${userId}? They will need to re-register.`)) return;
    setRemoving(`all-${userId}`);
    try {
      const res = await fetch('/api/devices/remove', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, removeAll: true }),
      });
      const data = await res.json();
      alert(`Removed ${data.removed} device(s)`);
      await fetchAllDevices();
    } catch (e) {
      alert('Error: ' + e.message);
    }
    setRemoving(null);
  };

  const getPlatformIcon = (platform) => {
    if (!platform) return '\u{1F4F1}';
    const p = platform.toLowerCase();
    if (p.includes('ios') || p.includes('iphone') || p.includes('ipad')) return '\u{1F4F1}';
    if (p.includes('android')) return '\u{1F4F1}';
    return '\u{1F4BB}';
  };

  const totalDevices = Object.values(devices).reduce((sum, arr) => sum + arr.length, 0);

  return (
    <div className="bg-gray-800 rounded-xl p-5 shadow-lg">
      <h2 className="text-lg font-bold text-white mb-1 flex items-center gap-2">
        {'\u{1F4F1}'} Device Management
      </h2>
      <p className="text-sm text-gray-400 mb-4">
        {totalDevices} total device registration{totalDevices !== 1 ? 's' : ''} across all users.
        Remove duplicates to stop notification spam.
      </p>

      {loading ? (
        <div className="text-gray-400 text-sm text-center py-6">Loading devices...</div>
      ) : Object.keys(devices).length === 0 ? (
        <div className="text-gray-500 text-sm text-center py-6">No devices registered</div>
      ) : (
        <div className="space-y-4">
          {TEAM_MEMBERS.filter(m => devices[m.id]).map(member => (
            <div key={member.id} className="border border-gray-700 rounded-lg p-3">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full" style={{ backgroundColor: member.color }} />
                  <span className="font-semibold text-white text-sm">{member.name}</span>
                  <span className="text-xs text-gray-500">({devices[member.id].length} device{devices[member.id].length !== 1 ? 's' : ''})</span>
                </div>
                {devices[member.id].length > 1 && (
                  <button
                    onClick={() => removeAllDevices(member.id)}
                    disabled={removing === `all-${member.id}`}
                    className="text-xs text-red-400 hover:text-red-300 disabled:opacity-50"
                  >
                    {removing === `all-${member.id}` ? 'Removing...' : 'Remove All'}
                  </button>
                )}
              </div>

              <div className="space-y-1">
                {devices[member.id].map(device => (
                  <div key={device.id} className="flex items-center justify-between text-xs bg-gray-900/50 rounded px-3 py-2">
                    <div className="flex items-center gap-2 text-gray-300">
                      <span>{getPlatformIcon(device.platform)}</span>
                      <span>{device.deviceName || device.platform || 'Unknown Device'}</span>
                      <span className="text-gray-600">—</span>
                      <span className="text-gray-500">
                        {device.createdAt ? getTimeAgo(device.createdAt) : 'unknown'}
                      </span>
                      {!device.notificationsEnabled && (
                        <span className="text-yellow-500">(disabled)</span>
                      )}
                    </div>
                    <button
                      onClick={() => removeDevice(member.id, device.id)}
                      disabled={removing === device.id}
                      className="text-red-400 hover:text-red-300 disabled:opacity-50 ml-2"
                    >
                      {removing === device.id ? '...' : 'Remove'}
                    </button>
                  </div>
                ))}
              </div>

              {/* Highlight if duplicate tokens exist */}
              {(() => {
                const tokens = devices[member.id].map(d => d.token).filter(Boolean);
                const unique = new Set(tokens);
                if (unique.size < tokens.length) {
                  return (
                    <div className="mt-2 text-xs text-yellow-400 bg-yellow-900/20 rounded px-2 py-1">
                      {'\u26A0\uFE0F'} {tokens.length - unique.size} duplicate token{tokens.length - unique.size !== 1 ? 's' : ''} detected — remove extras to stop spam
                    </div>
                  );
                }
                return null;
              })()}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ============================================================
// SECTION 6: INVENTORY HEALTH CRAWLER
// ============================================================
function InventoryCrawlSection() {
  const [crawling, setCrawling] = useState(false);
  const [crawlResults, setCrawlResults] = useState(null);
  const [apiKey, setApiKey] = useState('');
  const [lastCrawl, setLastCrawl] = useState(null);

  // Load API key from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('ipru_admin_api_key');
    if (saved) setApiKey(saved);
  }, []);

  const handleKeyChange = (val) => {
    setApiKey(val);
    localStorage.setItem('ipru_admin_api_key', val);
  };

  // Load last crawl on mount
  useEffect(() => {
    const loadLastCrawl = async () => {
      try {
        const q = query(
          collection(db, 'crawlHistory'),
          orderBy('completedAt', 'desc'),
          limit(1)
        );
        const snap = await getDocs(q);
        if (!snap.empty) {
          setLastCrawl({ id: snap.docs[0].id, ...snap.docs[0].data() });
        }
      } catch (e) {
        console.warn('Failed to load last crawl:', e);
      }
    };
    loadLastCrawl();
  }, []);

  const runCrawl = async () => {
    if (!apiKey.trim()) {
      alert('Enter API key to authorize the crawl');
      return;
    }
    setCrawling(true);
    setCrawlResults(null);
    try {
      const res = await fetch('/api/inventory/crawl', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
        },
      });
      const data = await res.json();
      setCrawlResults(data);
      if (data.success) setLastCrawl(data);
    } catch (err) {
      setCrawlResults({ error: err.message });
    }
    setCrawling(false);
  };

  const gradeColor = {
    A: 'bg-green-500', B: 'bg-blue-500', C: 'bg-yellow-500', D: 'bg-orange-500', F: 'bg-red-500'
  };

  return (
    <div className="bg-gray-800 rounded-xl border border-gray-700 p-5">
      <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
        <span className="text-purple-400">{'🔍'}</span> Inventory Health Crawler
      </h2>

      {/* Last crawl info */}
      {lastCrawl && !crawlResults && (
        <div className="bg-gray-700/50 rounded-lg p-3 mb-4 text-sm">
          <div className="text-gray-400 mb-1">Last crawl:</div>
          <div className="flex flex-wrap gap-4 text-white">
            <span><strong>{lastCrawl.totalItems?.toLocaleString()}</strong> items</span>
            <span>Avg score: <strong>{lastCrawl.averageScore}/100</strong></span>
            <span className="text-red-400"><strong>{lastCrawl.itemsBelowThreshold}</strong> below threshold</span>
            <span className="text-blue-400"><strong>{lastCrawl.queuedForRefresh}</strong> queued</span>
          </div>
        </div>
      )}

      {/* API Key + Run button */}
      <div className="flex gap-2 mb-4">
        <input
          type="password"
          value={apiKey}
          onChange={(e) => handleKeyChange(e.target.value)}
          placeholder="API Key (INTERNAL_API_KEY)"
          className="flex-1 px-3 py-2 rounded-lg bg-gray-700 border border-gray-600 text-white text-sm placeholder-gray-500 focus:outline-none focus:border-purple-500"
        />
        <button
          onClick={runCrawl}
          disabled={crawling}
          className={`px-5 py-2 rounded-lg font-semibold text-sm text-white transition ${
            crawling ? 'bg-gray-600 cursor-wait' : 'bg-purple-600 hover:bg-purple-700'
          }`}
        >
          {crawling ? 'Crawling...' : 'Run Crawl'}
        </button>
      </div>

      {crawling && (
        <div className="text-center py-8 text-gray-400">
          <div className="text-3xl mb-2 animate-pulse">{'🔄'}</div>
          <div className="text-sm">Crawling SureDone inventory... This may take a few minutes.</div>
        </div>
      )}

      {/* Crawl results */}
      {crawlResults && (
        <div className="space-y-4">
          {crawlResults.error ? (
            <div className="bg-red-900/30 border border-red-800 rounded-lg p-3 text-red-300 text-sm">
              Error: {crawlResults.error}
            </div>
          ) : (
            <>
              {/* Summary cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="bg-gray-700/50 rounded-lg p-3 text-center">
                  <div className="text-2xl font-bold text-white">{crawlResults.totalItems?.toLocaleString()}</div>
                  <div className="text-xs text-gray-400">Total Items</div>
                </div>
                <div className="bg-gray-700/50 rounded-lg p-3 text-center">
                  <div className="text-2xl font-bold text-white">{crawlResults.averageScore}<span className="text-sm text-gray-400">/100</span></div>
                  <div className="text-xs text-gray-400">Avg Score</div>
                </div>
                <div className="bg-gray-700/50 rounded-lg p-3 text-center">
                  <div className="text-2xl font-bold text-red-400">{crawlResults.itemsBelowThreshold}</div>
                  <div className="text-xs text-gray-400">Need Attention</div>
                </div>
                <div className="bg-gray-700/50 rounded-lg p-3 text-center">
                  <div className="text-2xl font-bold text-blue-400">{crawlResults.queuedForRefresh}</div>
                  <div className="text-xs text-gray-400">Queued for Refresh</div>
                </div>
              </div>

              {/* Grade distribution */}
              {crawlResults.gradeDistribution && (
                <div className="bg-gray-700/50 rounded-lg p-3">
                  <div className="text-sm font-semibold text-gray-300 mb-2">Grade Distribution</div>
                  <div className="flex gap-1 h-8 rounded-lg overflow-hidden">
                    {['A', 'B', 'C', 'D', 'F'].map(grade => {
                      const count = crawlResults.gradeDistribution[grade] || 0;
                      const pct = crawlResults.totalItems > 0
                        ? (count / crawlResults.totalItems) * 100
                        : 0;
                      if (pct < 1) return null;
                      return (
                        <div
                          key={grade}
                          className={`${gradeColor[grade]} flex items-center justify-center text-white text-xs font-bold`}
                          style={{ width: `${pct}%`, minWidth: pct > 3 ? '30px' : '0' }}
                          title={`${grade}: ${count} (${Math.round(pct)}%)`}
                        >
                          {pct > 5 ? `${grade}: ${count}` : grade}
                        </div>
                      );
                    })}
                  </div>
                  <div className="flex gap-3 mt-2 text-xs text-gray-400 flex-wrap">
                    {['A', 'B', 'C', 'D', 'F'].map(grade => (
                      <span key={grade}>
                        <span className={`inline-block w-2 h-2 rounded-full ${gradeColor[grade]} mr-1`}></span>
                        {grade}: {(crawlResults.gradeDistribution[grade] || 0).toLocaleString()}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Top issues */}
              {crawlResults.topIssues?.length > 0 && (
                <div className="bg-gray-700/50 rounded-lg p-3">
                  <div className="text-sm font-semibold text-gray-300 mb-2">Top Issues</div>
                  <div className="space-y-1">
                    {crawlResults.topIssues.map((issue, i) => (
                      <div key={i} className="flex justify-between text-sm">
                        <span className="text-gray-300">{issue.message}</span>
                        <span className="text-gray-500 font-mono">{issue.count.toLocaleString()}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Worst items */}
              {crawlResults.worstItems?.length > 0 && (
                <div className="bg-gray-700/50 rounded-lg p-3">
                  <div className="text-sm font-semibold text-gray-300 mb-2">Top 10 Worst Listings</div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="text-gray-500 border-b border-gray-600">
                          <th className="text-left py-1 pr-3">SKU</th>
                          <th className="text-left py-1 pr-3">Title</th>
                          <th className="text-center py-1 pr-3">Score</th>
                          <th className="text-center py-1 pr-3">Grade</th>
                          <th className="text-right py-1 pr-3">Price</th>
                          <th className="text-left py-1">Issues</th>
                        </tr>
                      </thead>
                      <tbody>
                        {crawlResults.worstItems.map((item, i) => (
                          <tr key={i} className="border-b border-gray-700/50 hover:bg-gray-600/30">
                            <td className="py-1.5 pr-3 font-mono text-blue-400">{item.sku}</td>
                            <td className="py-1.5 pr-3 text-gray-300 max-w-[200px] truncate">{item.title}</td>
                            <td className="py-1.5 pr-3 text-center font-bold text-red-400">{item.score}</td>
                            <td className="py-1.5 pr-3 text-center">
                              <span className={`px-1.5 py-0.5 rounded text-white text-xs font-bold ${gradeColor[item.grade]}`}>
                                {item.grade}
                              </span>
                            </td>
                            <td className="py-1.5 pr-3 text-right text-green-400">${item.price}</td>
                            <td className="py-1.5 text-gray-400">{item.issues?.slice(0, 3).join(', ')}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Elapsed time */}
              {crawlResults.elapsedMs && (
                <div className="text-xs text-gray-500 text-center">
                  Completed in {(crawlResults.elapsedMs / 1000).toFixed(1)}s
                </div>
              )}
            </>
          )}
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
          {/* Emergency: Clear All Alerts */}
          <EmergencyActionsSection />

          {/* Section 1: Team Members */}
          <TeamMembersSection />

          {/* Device Management */}
          <DeviceManagementSection />

          {/* Section 2: Send Test Alert */}
          <SendTestAlertSection />

          {/* Section 3: Notification Log */}
          <NotificationLogSection />

          {/* Section 4: Inventory Health Crawler */}
          <InventoryCrawlSection />
        </main>

        {/* Footer */}
        <footer className="max-w-5xl mx-auto px-4 py-6 text-center text-xs text-gray-600 border-t border-gray-800 mt-8">
          IPRU Admin Panel — Warehouse Inventory Management
        </footer>
      </div>
    </>
  );
}
