// pages/dashboard.js
// Mobile-friendly management dashboard for warehouse inventory system
// Real-time stats, active alerts, response leaderboard, queue status, worker status

import React, { useState, useEffect, useCallback, useRef } from 'react';
import Head from 'next/head';
import { db } from '../firebase';
import app from '../firebase';
import {
  collection, query, where, onSnapshot, doc, getDocs, orderBy, limit, Timestamp
} from 'firebase/firestore';
import { getCurrentUser, setCurrentUser, TEAM_MEMBERS, getTeamMemberById } from '../lib/users';
import NotificationCenter from '../components/NotificationCenter';
import UserPicker from '../components/UserPicker';

// ============================================================
// HELPER: Get start of today as Firestore Timestamp
// ============================================================
function getStartOfToday() {
  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
  return Timestamp.fromDate(startOfDay);
}

// ============================================================
// HELPER: Get date N days ago as Firestore Timestamp
// ============================================================
function getDaysAgo(days) {
  const d = new Date();
  d.setDate(d.getDate() - days);
  d.setHours(0, 0, 0, 0);
  return Timestamp.fromDate(d);
}

// ============================================================
// HELPER: Format minutes into readable string
// ============================================================
function formatMinutes(mins) {
  if (mins == null || isNaN(mins)) return '--';
  if (mins < 1) return '<1m';
  if (mins < 60) return `${Math.round(mins)}m`;
  const h = Math.floor(mins / 60);
  const m = Math.round(mins % 60);
  return `${h}h ${m}m`;
}

// ============================================================
// HELPER: Format elapsed time since a timestamp
// ============================================================
function formatElapsed(timestamp) {
  if (!timestamp) return '--';
  const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
  const diffMs = Date.now() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return 'Just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ${diffMin % 60}m ago`;
  return `${Math.floor(diffHr / 24)}d ago`;
}

// ============================================================
// HELPER: Get elapsed minutes since a timestamp
// ============================================================
function getElapsedMinutes(timestamp) {
  if (!timestamp) return 0;
  const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
  return (Date.now() - date.getTime()) / 60000;
}

// ============================================================
// COMPONENT: Loading Spinner
// ============================================================
function Spinner({ size = 'md' }) {
  const sizeClasses = {
    sm: 'h-4 w-4 border-2',
    md: 'h-6 w-6 border-2',
    lg: 'h-10 w-10 border-3',
  };
  return (
    <div className={`animate-spin rounded-full border-blue-400 border-t-transparent ${sizeClasses[size] || sizeClasses.md}`} />
  );
}

// ============================================================
// COMPONENT: Section Header
// ============================================================
function SectionHeader({ icon, title, subtitle }) {
  return (
    <div className="mb-4">
      <h2 className="text-lg font-bold text-white flex items-center gap-2">
        <span>{icon}</span>
        <span>{title}</span>
      </h2>
      {subtitle && <p className="text-sm text-gray-400 mt-1">{subtitle}</p>}
    </div>
  );
}

// ============================================================
// COMPONENT: Stat Card
// ============================================================
function StatCard({ label, value, icon, color = 'blue' }) {
  const colorClasses = {
    blue: 'from-blue-600/20 to-blue-800/10 border-blue-500/30',
    green: 'from-green-600/20 to-green-800/10 border-green-500/30',
    yellow: 'from-yellow-600/20 to-yellow-800/10 border-yellow-500/30',
    purple: 'from-purple-600/20 to-purple-800/10 border-purple-500/30',
    red: 'from-red-600/20 to-red-800/10 border-red-500/30',
  };
  const textColors = {
    blue: 'text-blue-400',
    green: 'text-green-400',
    yellow: 'text-yellow-400',
    purple: 'text-purple-400',
    red: 'text-red-400',
  };

  return (
    <div className={`bg-gradient-to-br ${colorClasses[color]} border rounded-xl p-4 flex flex-col items-center justify-center min-h-[100px]`}>
      <div className="text-2xl mb-1">{icon}</div>
      <div className={`text-3xl font-bold ${textColors[color]}`}>{value}</div>
      <div className="text-xs text-gray-400 mt-1 text-center">{label}</div>
    </div>
  );
}

// ============================================================
// SECTION: Today's Activity
// ============================================================
function TodaysActivity({ stats, loading }) {
  return (
    <div className="mb-8">
      <SectionHeader icon="📊" title="TODAY'S ACTIVITY" subtitle="Real-time counts — updates live" />
      {loading ? (
        <div className="flex items-center justify-center py-8">
          <Spinner size="lg" />
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatCard label="Items Scanned" value={stats.scannedToday} icon="📦" color="blue" />
          <StatCard label="Photos Taken" value={stats.photosToday} icon="📸" color="green" />
          <StatCard label="Listings Built" value={stats.listingsBuiltToday} icon="📝" color="yellow" />
          <StatCard label="Published" value={stats.publishedToday} icon="🚀" color="purple" />
        </div>
      )}
    </div>
  );
}

// ============================================================
// SECTION: Active Alerts
// ============================================================
function ActiveAlerts({ alerts, loading, onNudge, nudging }) {
  return (
    <div className="mb-8">
      <SectionHeader
        icon="🚨"
        title="ACTIVE ALERTS"
        subtitle={`${alerts.length} pending request${alerts.length !== 1 ? 's' : ''}`}
      />
      {loading ? (
        <div className="flex items-center justify-center py-8">
          <Spinner size="lg" />
        </div>
      ) : alerts.length === 0 ? (
        <div className="bg-gray-800 rounded-xl p-6 text-center text-gray-500">
          No active alerts. All clear!
        </div>
      ) : (
        <div className="space-y-3">
          {alerts.map((alert) => {
            const elapsed = getElapsedMinutes(alert.requestedAt);
            const isOverdue = elapsed > 10;
            const workerName = getTeamMemberById(alert.assignedTo)?.name || alert.assignedTo || 'Unassigned';

            return (
              <div
                key={alert.id}
                className={`rounded-xl p-4 border ${
                  isOverdue
                    ? 'bg-red-900/30 border-red-500/50'
                    : alert.status === 'snoozed'
                    ? 'bg-yellow-900/20 border-yellow-500/30'
                    : 'bg-gray-800 border-gray-700'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-white text-sm">
                        {alert.sku || 'No SKU'}
                      </span>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        alert.status === 'pending'
                          ? 'bg-orange-600/30 text-orange-300'
                          : alert.status === 'acknowledged'
                          ? 'bg-blue-600/30 text-blue-300'
                          : 'bg-yellow-600/30 text-yellow-300'
                      }`}>
                        {alert.status}
                      </span>
                      {isOverdue && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-red-600/40 text-red-300 font-bold animate-pulse">
                          OVERDUE
                        </span>
                      )}
                    </div>
                    <div className="text-sm text-gray-400 mt-1">
                      {alert.shelfLocation && `Shelf ${alert.shelfLocation}`}
                      {alert.shelfLocation && alert.message && ' — '}
                      {alert.message}
                    </div>
                    <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
                      <span>Assigned: <span className={isOverdue ? 'text-red-400 font-medium' : 'text-gray-300'}>{workerName}</span></span>
                      <span className={isOverdue ? 'text-red-400 font-medium' : ''}>
                        {formatElapsed(alert.requestedAt)}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => onNudge(alert)}
                    disabled={nudging === alert.id}
                    className="px-3 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-semibold rounded-lg whitespace-nowrap transition-colors"
                  >
                    {nudging === alert.id ? 'Sending...' : 'Nudge'}
                  </button>
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
// SECTION: Response Time Leaderboard
// ============================================================
function ResponseLeaderboard({ leaderboard, loading }) {
  return (
    <div className="mb-8">
      <SectionHeader icon="🏆" title="RESPONSE TIME LEADERBOARD" subtitle="Last 7 days" />
      {loading ? (
        <div className="flex items-center justify-center py-8">
          <Spinner size="lg" />
        </div>
      ) : leaderboard.length === 0 ? (
        <div className="bg-gray-800 rounded-xl p-6 text-center text-gray-500">
          No completed alerts in the last 7 days.
        </div>
      ) : (
        <div className="bg-gray-800 rounded-xl overflow-hidden border border-gray-700">
          {/* Table header */}
          <div className="grid grid-cols-5 gap-2 px-4 py-3 bg-gray-750 border-b border-gray-700 text-xs font-semibold text-gray-400 uppercase tracking-wide">
            <div>Worker</div>
            <div className="text-center">Avg Response</div>
            <div className="text-center">Fastest</div>
            <div className="text-center">Slowest</div>
            <div className="text-center">Overdue</div>
          </div>
          {/* Table body */}
          {leaderboard.map((entry, idx) => {
            const member = getTeamMemberById(entry.userId);
            return (
              <div
                key={entry.userId}
                className={`grid grid-cols-5 gap-2 px-4 py-3 items-center ${
                  idx % 2 === 0 ? 'bg-gray-800' : 'bg-gray-800/50'
                } ${idx < leaderboard.length - 1 ? 'border-b border-gray-700/50' : ''}`}
              >
                <div className="flex items-center gap-2 min-w-0">
                  {idx === 0 && <span className="text-lg">🥇</span>}
                  {idx === 1 && <span className="text-lg">🥈</span>}
                  {idx === 2 && <span className="text-lg">🥉</span>}
                  <span className="text-sm font-medium text-white truncate">
                    {member?.name || entry.userId}
                  </span>
                </div>
                <div className="text-center text-sm font-semibold text-green-400">
                  {formatMinutes(entry.avgResponse)}
                </div>
                <div className="text-center text-sm text-blue-400">
                  {formatMinutes(entry.fastest)}
                </div>
                <div className="text-center text-sm text-yellow-400">
                  {formatMinutes(entry.slowest)}
                </div>
                <div className={`text-center text-sm font-semibold ${entry.overdueCount > 0 ? 'text-red-400' : 'text-gray-500'}`}>
                  {entry.overdueCount}
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
// SECTION: Queue Status
// ============================================================
function QueueStatus({ queueStats, loading }) {
  return (
    <div className="mb-8">
      <SectionHeader icon="📋" title="QUEUE STATUS" subtitle="Current pipeline counts" />
      {loading ? (
        <div className="flex items-center justify-center py-8">
          <Spinner size="lg" />
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatCard label="Needs Photos" value={queueStats.needsPhotos} icon="📷" color="yellow" />
          <StatCard label="Ready to List" value={queueStats.readyToList} icon="📝" color="blue" />
          <StatCard label="Ready to Publish" value={queueStats.readyToPublish} icon="🚀" color="green" />
          <StatCard label="Needs Reshelve" value={queueStats.needsReshelve} icon="📦" color="red" />
        </div>
      )}
    </div>
  );
}

// ============================================================
// SECTION: Worker Status
// ============================================================
function WorkerStatus({ workerActivity, loading }) {
  return (
    <div className="mb-8">
      <SectionHeader icon="👷" title="WORKER STATUS" subtitle="Team member activity" />
      {loading ? (
        <div className="flex items-center justify-center py-8">
          <Spinner size="lg" />
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {TEAM_MEMBERS.map((member) => {
            const activity = workerActivity[member.id];
            const lastActive = activity?.lastActive;
            let dotColor = 'bg-gray-500'; // no recent activity
            let statusText = 'Inactive';

            if (lastActive) {
              const minutesAgo = getElapsedMinutes(lastActive);
              if (minutesAgo <= 15) {
                dotColor = 'bg-green-500';
                statusText = 'Active now';
              } else if (minutesAgo <= 60) {
                dotColor = 'bg-yellow-500';
                statusText = formatElapsed(lastActive);
              } else {
                dotColor = 'bg-gray-500';
                statusText = formatElapsed(lastActive);
              }
            }

            return (
              <div
                key={member.id}
                className="bg-gray-800 rounded-xl p-4 border border-gray-700 flex items-center gap-3"
              >
                <div className="relative">
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm"
                    style={{ backgroundColor: member.color }}
                  >
                    {member.name.charAt(0).toUpperCase()}
                  </div>
                  <div className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-gray-800 ${dotColor}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-white text-sm">{member.name}</div>
                  <div className="text-xs text-gray-400 capitalize">{member.role}</div>
                </div>
                <div className="text-xs text-gray-500 whitespace-nowrap">{statusText}</div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ============================================================
// SECTION: Inventory Health
// ============================================================
function InventoryHealthSection({ healthData, loading, onRunCrawl, isCrawling, currentUser }) {
  if (loading) {
    return (
      <div className="mb-8">
        <SectionHeader icon="📊" title="INVENTORY HEALTH" subtitle="Listing quality overview" />
        <div className="flex items-center justify-center py-8"><Spinner size="lg" /></div>
      </div>
    );
  }

  if (!healthData) {
    return (
      <div className="mb-8">
        <SectionHeader icon="📊" title="INVENTORY HEALTH" subtitle="Listing quality overview" />
        <div className="bg-gray-800 rounded-xl p-6 text-center text-gray-500">
          No crawl data yet. Run a crawl from the Admin page to get started.
        </div>
      </div>
    );
  }

  const { avgScore, gradeDistribution, totalItems, topIssues, worstItems, refreshActivity, lastCrawl } = healthData;
  const gradeColors = { A: 'bg-green-500', B: 'bg-blue-500', C: 'bg-yellow-500', D: 'bg-orange-500', F: 'bg-red-500' };
  const gradeTextColors = { A: 'text-green-400', B: 'text-blue-400', C: 'text-yellow-400', D: 'text-orange-400', F: 'text-red-400' };
  const scoreColor = avgScore >= 80 ? 'text-green-400' : avgScore >= 60 ? 'text-yellow-400' : 'text-red-400';
  const totalGraded = Object.values(gradeDistribution || {}).reduce((s, v) => s + v, 0) || 1;

  return (
    <div className="mb-8">
      <SectionHeader icon="📊" title="INVENTORY HEALTH" subtitle={lastCrawl ? `Last crawled: ${lastCrawl}` : 'Listing quality overview'} />

      {/* Overall Score + Grade Distribution */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        {/* Score Gauge */}
        <div className="bg-gray-800 rounded-xl p-6 border border-gray-700 flex flex-col items-center justify-center">
          <div className="text-sm text-gray-400 mb-1">Average Quality Score</div>
          <div className={`text-5xl font-bold ${scoreColor}`}>{avgScore}<span className="text-2xl text-gray-500">/100</span></div>
          <div className="text-sm text-gray-500 mt-1">{totalItems?.toLocaleString()} listings scored</div>
          {currentUser && (
            <button
              onClick={onRunCrawl}
              disabled={isCrawling}
              className="mt-3 px-4 py-1.5 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white text-xs font-semibold rounded-lg transition"
            >
              {isCrawling ? 'Crawling...' : 'Run Crawl Now'}
            </button>
          )}
        </div>

        {/* Grade Distribution */}
        <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
          <div className="text-sm text-gray-400 mb-3">Grade Distribution</div>
          {['A', 'B', 'C', 'D', 'F'].map(grade => {
            const count = gradeDistribution?.[grade] || 0;
            const pct = Math.round((count / totalGraded) * 100);
            return (
              <div key={grade} className="flex items-center gap-2 mb-2">
                <span className={`text-sm font-bold w-4 ${gradeTextColors[grade]}`}>{grade}</span>
                <div className="flex-1 bg-gray-700 rounded-full h-4 overflow-hidden">
                  <div className={`h-full ${gradeColors[grade]} rounded-full transition-all`} style={{ width: `${pct}%` }} />
                </div>
                <span className="text-xs text-gray-400 w-20 text-right">{count.toLocaleString()} ({pct}%)</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Top Issues + Refresh Activity */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        {/* Top Issues */}
        <div className="bg-gray-800 rounded-xl p-5 border border-gray-700">
          <div className="text-sm font-semibold text-gray-300 mb-3">Top Issues</div>
          {topIssues && topIssues.length > 0 ? (
            <div className="space-y-2">
              {topIssues.slice(0, 5).map((issue, i) => (
                <div key={i} className="flex items-center justify-between">
                  <span className="text-sm text-gray-300 truncate flex-1">{i + 1}. {issue.message}</span>
                  <span className="text-xs text-gray-500 ml-2 whitespace-nowrap">{issue.count?.toLocaleString()} listings</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-sm text-gray-500">No issue data available</div>
          )}
        </div>

        {/* Refresh Activity */}
        <div className="bg-gray-800 rounded-xl p-5 border border-gray-700">
          <div className="text-sm font-semibold text-gray-300 mb-3">Refresh Activity</div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="text-2xl font-bold text-purple-400">{refreshActivity?.refreshedThisWeek || 0}</div>
              <div className="text-xs text-gray-500">Refreshed this week</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-green-400">
                {refreshActivity?.avgBefore || '--'} → {refreshActivity?.avgAfter || '--'}
              </div>
              <div className="text-xs text-gray-500">Avg score improvement</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-blue-400">${refreshActivity?.totalValue?.toLocaleString() || '0'}</div>
              <div className="text-xs text-gray-500">Value refreshed</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-orange-400">{refreshActivity?.queueRemaining || 0}</div>
              <div className="text-xs text-gray-500">Queue remaining</div>
            </div>
          </div>
        </div>
      </div>

      {/* Worst Listings Table */}
      {worstItems && worstItems.length > 0 && (
        <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-700">
            <div className="text-sm font-semibold text-gray-300">Worst Listings</div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-gray-500 uppercase border-b border-gray-700">
                  <th className="px-4 py-2 text-left">SKU</th>
                  <th className="px-4 py-2 text-left">Title</th>
                  <th className="px-4 py-2 text-center">Score</th>
                  <th className="px-4 py-2 text-right">Price</th>
                  <th className="px-4 py-2 text-center">Issues</th>
                  <th className="px-4 py-2 text-center">Action</th>
                </tr>
              </thead>
              <tbody>
                {worstItems.slice(0, 10).map((item, i) => (
                  <tr key={item.sku || i} className={`border-b border-gray-700/50 ${i % 2 === 0 ? 'bg-gray-800' : 'bg-gray-800/50'}`}>
                    <td className="px-4 py-2 font-mono text-xs text-gray-400">{item.sku}</td>
                    <td className="px-4 py-2 text-gray-300 truncate max-w-[200px]">{item.title}</td>
                    <td className="px-4 py-2 text-center">
                      <span className={`text-xs font-bold px-1.5 py-0.5 rounded ${
                        item.grade === 'A' ? 'bg-green-900/50 text-green-400' :
                        item.grade === 'B' ? 'bg-blue-900/50 text-blue-400' :
                        item.grade === 'C' ? 'bg-yellow-900/50 text-yellow-400' :
                        item.grade === 'D' ? 'bg-orange-900/50 text-orange-400' :
                        'bg-red-900/50 text-red-400'
                      }`}>{item.grade} {item.score}</span>
                    </td>
                    <td className="px-4 py-2 text-right text-gray-300">${item.price || 0}</td>
                    <td className="px-4 py-2 text-center text-xs text-gray-500">{item.issues?.length || 0}</td>
                    <td className="px-4 py-2 text-center">
                      <a href={`/pro`} className="text-xs text-purple-400 hover:text-purple-300 font-medium">Load</a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================
// MAIN DASHBOARD COMPONENT
// ============================================================
export default function Dashboard() {
  // --- User state ---
  const [currentUserState, setCurrentUserState] = useState(null);
  const [userChecked, setUserChecked] = useState(false);

  // --- Today's Activity ---
  const [todayStats, setTodayStats] = useState({
    scannedToday: 0,
    photosToday: 0,
    listingsBuiltToday: 0,
    publishedToday: 0,
  });
  const [todayLoading, setTodayLoading] = useState(true);

  // --- Active Alerts ---
  const [activeAlerts, setActiveAlerts] = useState([]);
  const [alertsLoading, setAlertsLoading] = useState(true);
  const [nudgingId, setNudgingId] = useState(null);

  // --- Leaderboard ---
  const [leaderboard, setLeaderboard] = useState([]);
  const [leaderboardLoading, setLeaderboardLoading] = useState(true);

  // --- Queue Status ---
  const [queueStats, setQueueStats] = useState({
    needsPhotos: 0,
    readyToList: 0,
    readyToPublish: 0,
    needsReshelve: 0,
  });
  const [queueLoading, setQueueLoading] = useState(true);

  // --- Worker Status ---
  const [workerActivity, setWorkerActivity] = useState({});
  const [workerLoading, setWorkerLoading] = useState(true);

  // --- Inventory Health ---
  const [healthData, setHealthData] = useState(null);
  const [healthLoading, setHealthLoading] = useState(true);
  const [isCrawling, setIsCrawling] = useState(false);

  // --- Tick for age timers ---
  const [, setTick] = useState(0);

  // Check current user on mount
  useEffect(() => {
    const user = getCurrentUser();
    if (user) {
      setCurrentUserState(user);
    }
    setUserChecked(true);
  }, []);

  // Tick every 30 seconds to update age timers
  useEffect(() => {
    const interval = setInterval(() => setTick((t) => t + 1), 30000);
    return () => clearInterval(interval);
  }, []);

  // ============================================================
  // DATA: Today's Activity (real-time via onSnapshot)
  // ============================================================
  useEffect(() => {
    if (!currentUserState) return;

    const todayTs = getStartOfToday();

    // We listen to the entire inventory collection and compute counts client-side
    // because Firestore doesn't support OR queries across different timestamp fields
    const q = query(collection(db, 'inventory'));

    const unsub = onSnapshot(q, (snapshot) => {
      let scanned = 0;
      let photos = 0;
      let listingsBuilt = 0;
      let published = 0;

      snapshot.forEach((docSnap) => {
        const data = docSnap.data();

        // Items scanned today
        if (data.scannedAt && data.scannedAt >= todayTs) {
          scanned++;
        }

        // Photos taken today
        if (data.photosCompletedAt && data.photosCompletedAt >= todayTs) {
          photos++;
        }

        // Listings built today (ready_to_list or listed with updatedAt today)
        if (
          (data.status === 'ready_to_list' || data.status === 'listed') &&
          data.updatedAt && data.updatedAt >= todayTs
        ) {
          listingsBuilt++;
        }

        // Listings published today
        if (data.status === 'listed' && data.listedAt && data.listedAt >= todayTs) {
          published++;
        }
      });

      setTodayStats({
        scannedToday: scanned,
        photosToday: photos,
        listingsBuiltToday: listingsBuilt,
        publishedToday: published,
      });
      setTodayLoading(false);
    }, (error) => {
      console.error('Today activity listener error:', error);
      setTodayLoading(false);
    });

    return () => unsub();
  }, [currentUserState]);

  // ============================================================
  // DATA: Active Alerts (real-time via onSnapshot)
  // ============================================================
  useEffect(() => {
    if (!currentUserState) return;

    const q = query(
      collection(db, 'partRequests'),
      where('status', 'in', ['pending', 'acknowledged', 'snoozed'])
    );

    const unsub = onSnapshot(q, (snapshot) => {
      const alerts = [];
      snapshot.forEach((docSnap) => {
        alerts.push({ id: docSnap.id, ...docSnap.data() });
      });

      // Sort by requestedAt ascending (oldest first, most urgent)
      alerts.sort((a, b) => {
        const aTime = a.requestedAt?.toMillis?.() || 0;
        const bTime = b.requestedAt?.toMillis?.() || 0;
        return aTime - bTime;
      });

      setActiveAlerts(alerts);
      setAlertsLoading(false);
    }, (error) => {
      console.error('Active alerts listener error:', error);
      setAlertsLoading(false);
    });

    return () => unsub();
  }, [currentUserState]);

  // ============================================================
  // DATA: Response Leaderboard (getDocs with interval)
  // ============================================================
  const fetchLeaderboard = useCallback(async () => {
    try {
      const sevenDaysAgo = getDaysAgo(7);

      const q = query(
        collection(db, 'alertHistory'),
        where('status', '==', 'completed'),
        where('completedAt', '>=', sevenDaysAgo)
      );

      const snapshot = await getDocs(q);

      // Group by completedBy / userId
      const workerMap = {};
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        const workerId = data.completedBy || data.userId || 'unknown';
        const responseTime = data.responseTimeMinutes;

        if (responseTime == null || isNaN(responseTime)) return;

        if (!workerMap[workerId]) {
          workerMap[workerId] = {
            userId: workerId,
            times: [],
            overdueCount: 0,
          };
        }

        workerMap[workerId].times.push(responseTime);
        if (responseTime > 10) {
          workerMap[workerId].overdueCount++;
        }
      });

      // Calculate stats
      const results = Object.values(workerMap).map((entry) => {
        const times = entry.times;
        const sum = times.reduce((a, b) => a + b, 0);
        return {
          userId: entry.userId,
          avgResponse: sum / times.length,
          fastest: Math.min(...times),
          slowest: Math.max(...times),
          overdueCount: entry.overdueCount,
          totalCompleted: times.length,
        };
      });

      // Sort by avgResponse ascending (fastest first)
      results.sort((a, b) => a.avgResponse - b.avgResponse);

      setLeaderboard(results);
      setLeaderboardLoading(false);
    } catch (error) {
      console.error('Leaderboard fetch error:', error);
      setLeaderboardLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!currentUserState) return;
    fetchLeaderboard();
    const interval = setInterval(fetchLeaderboard, 60000); // Refresh every 60s
    return () => clearInterval(interval);
  }, [currentUserState, fetchLeaderboard]);

  // ============================================================
  // DATA: Queue Status (real-time via onSnapshot)
  // ============================================================
  useEffect(() => {
    if (!currentUserState) return;

    const q = query(collection(db, 'inventory'));

    const unsub = onSnapshot(q, (snapshot) => {
      let needsPhotos = 0;
      let readyToList = 0;
      let readyToPublish = 0;
      let needsReshelve = 0;

      snapshot.forEach((docSnap) => {
        const data = docSnap.data();

        // Items needing photos: scanned but no photos yet
        if (data.status === 'complete') {
          needsPhotos++;
        }

        // Items ready to list: photos done
        if (data.status === 'photos_complete') {
          readyToList++;
        }

        // Items ready to publish
        if (data.status === 'ready_to_list') {
          readyToPublish++;
        }

        // Items needing reshelve
        if (
          data.lifecycle?.needsReshelve === true ||
          data.lifecycleStatus === 'return_pending' ||
          data.lifecycleStatus === 'return_in_progress'
        ) {
          needsReshelve++;
        }
      });

      setQueueStats({ needsPhotos, readyToList, readyToPublish, needsReshelve });
      setQueueLoading(false);
    }, (error) => {
      console.error('Queue status listener error:', error);
      setQueueLoading(false);
    });

    return () => unsub();
  }, [currentUserState]);

  // ============================================================
  // DATA: Worker Status (getDocs with interval)
  // ============================================================
  const fetchWorkerActivity = useCallback(async () => {
    try {
      const activityMap = {};

      // Try to query activityLog collection for latest activity per worker
      for (const member of TEAM_MEMBERS) {
        try {
          const q = query(
            collection(db, 'activityLog'),
            where('userId', '==', member.id),
            orderBy('timestamp', 'desc'),
            limit(1)
          );
          const snapshot = await getDocs(q);
          if (!snapshot.empty) {
            const data = snapshot.docs[0].data();
            activityMap[member.id] = {
              lastActive: data.timestamp,
              lastAction: data.action || null,
            };
          }
        } catch (e) {
          // activityLog collection may not exist — that's fine
          // Fall through to show gray dots
        }
      }

      setWorkerActivity(activityMap);
      setWorkerLoading(false);
    } catch (error) {
      console.error('Worker activity fetch error:', error);
      setWorkerLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!currentUserState) return;
    fetchWorkerActivity();
    const interval = setInterval(fetchWorkerActivity, 30000); // Refresh every 30s
    return () => clearInterval(interval);
  }, [currentUserState, fetchWorkerActivity]);

  // ============================================================
  // DATA: Inventory Health (from crawlHistory + inventoryHealth)
  // ============================================================
  const fetchHealthData = useCallback(async () => {
    try {
      // Get latest crawl from crawlHistory
      const crawlQ = query(collection(db, 'crawlHistory'), orderBy('completedAt', 'desc'), limit(1));
      const crawlSnap = await getDocs(crawlQ);

      if (crawlSnap.empty) {
        setHealthData(null);
        setHealthLoading(false);
        return;
      }

      const latestCrawl = crawlSnap.docs[0].data();
      const lastCrawlDate = latestCrawl.completedAt?.toDate?.();
      const lastCrawl = lastCrawlDate
        ? `${lastCrawlDate.toLocaleDateString()} ${lastCrawlDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
        : 'Unknown';

      // Get worst items from inventoryHealth (top 10 by score ascending)
      const healthQ = query(collection(db, 'inventoryHealth'), orderBy('score', 'asc'), limit(10));
      const healthSnap = await getDocs(healthQ);
      const worstItems = [];
      healthSnap.forEach(d => {
        const data = d.data();
        worstItems.push({ sku: d.id, ...data });
      });

      // Get refresh activity stats this week
      const weekAgo = getDaysAgo(7);
      const refreshQ = query(collection(db, 'inventoryHealth'), where('lastRefreshed', '>=', weekAgo));
      const refreshSnap = await getDocs(refreshQ);
      let refreshedThisWeek = 0;
      let totalBefore = 0;
      let totalAfter = 0;
      let totalValue = 0;
      refreshSnap.forEach(d => {
        const data = d.data();
        refreshedThisWeek++;
        if (data.previousScore != null) totalBefore += data.previousScore;
        if (data.currentScore != null) totalAfter += data.currentScore;
        if (data.price) totalValue += parseFloat(data.price) || 0;
      });

      // Get refresh queue remaining
      const refreshQueueQ = query(collection(db, 'products'), where('status', '==', 'refresh'));
      const refreshQueueSnap = await getDocs(refreshQueueQ);

      setHealthData({
        avgScore: latestCrawl.averageScore || 0,
        gradeDistribution: latestCrawl.gradeDistribution || {},
        totalItems: latestCrawl.totalItems || 0,
        topIssues: latestCrawl.topIssues || [],
        worstItems,
        lastCrawl,
        refreshActivity: {
          refreshedThisWeek,
          avgBefore: refreshedThisWeek > 0 ? Math.round(totalBefore / refreshedThisWeek) : '--',
          avgAfter: refreshedThisWeek > 0 ? Math.round(totalAfter / refreshedThisWeek) : '--',
          totalValue: Math.round(totalValue),
          queueRemaining: refreshQueueSnap.size,
        },
      });
      setHealthLoading(false);
    } catch (error) {
      console.error('Health data fetch error:', error);
      setHealthLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!currentUserState) return;
    fetchHealthData();
  }, [currentUserState, fetchHealthData]);

  // ============================================================
  // ACTION: Run crawl from dashboard
  // ============================================================
  const handleRunCrawl = async () => {
    setIsCrawling(true);
    try {
      const res = await fetch('/api/inventory/crawl', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${prompt('Enter admin API key:')}` },
      });
      const data = await res.json();
      if (data.success) {
        alert(`Crawl complete! ${data.totalItems} items scored. Avg: ${data.averageScore}/100`);
        fetchHealthData(); // Refresh data
      } else {
        alert('Crawl failed: ' + (data.error || 'Unknown error'));
      }
    } catch (error) {
      alert('Crawl error: ' + error.message);
    }
    setIsCrawling(false);
  };

  // ============================================================
  // ACTION: Nudge (re-send alert)
  // ============================================================
  const handleNudge = async (alert) => {
    setNudgingId(alert.id);
    try {
      await fetch('/api/notify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: alert.assignedTo === 'all' ? undefined : alert.assignedTo,
          broadcast: alert.assignedTo === 'all',
          type: 'urgent',
          sku: alert.sku,
          shelfLocation: alert.shelfLocation,
          message: `Reminder: ${alert.sku || 'Part'} still needs attention!`,
          requestedBy: currentUserState?.id,
        }),
      });
    } catch (error) {
      console.error('Nudge failed:', error);
    }
    setNudgingId(null);
  };

  // ============================================================
  // RENDER: User picker if no user
  // ============================================================
  if (!userChecked) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!currentUserState) {
    return (
      <>
        <Head>
          <title>{'📊 Dashboard — IPRU'}</title>
          <link rel="icon" href="/favicon-dashboard.png" />
        </Head>
        <UserPicker title="📊 Dashboard" subtitle="Select your name to continue" onSelect={(user) => setCurrentUserState(user)} />
      </>
    );
  }

  // ============================================================
  // RENDER: Main dashboard
  // ============================================================
  return (
    <>
      <Head>
        <title>{'📊 Dashboard — IPRU'}</title>
        <link rel="icon" href="/favicon-dashboard.png" />
      </Head>

      <div className="min-h-screen bg-gray-900 text-white">
        {/* Header */}
        <header className="bg-gray-800 border-b border-gray-700 px-4 py-3 sticky top-0 z-50">
          <div className="flex items-center justify-between max-w-5xl mx-auto">
            <div className="flex items-center gap-3">
              <a
                href="/pro"
                className="text-sm text-blue-400 hover:text-blue-300 flex items-center gap-1 transition-colors"
              >
                <span>&larr;</span>
                <span>Back to Pro Builder</span>
              </a>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-400 hidden sm:inline">
                {currentUserState.name}
              </span>
              <NotificationCenter
                firebaseApp={app}
                userId={currentUserState.id}
                deviceName="Dashboard"
              />
            </div>
          </div>
        </header>

        {/* Dashboard title */}
        <div className="px-4 py-4 max-w-5xl mx-auto">
          <h1 className="text-xl font-bold text-white">Warehouse Dashboard</h1>
          <p className="text-sm text-gray-400 mt-1">
            Real-time inventory and team overview
          </p>
        </div>

        {/* Dashboard content */}
        <main className="px-4 pb-8 max-w-5xl mx-auto">
          <TodaysActivity stats={todayStats} loading={todayLoading} />
          <ActiveAlerts
            alerts={activeAlerts}
            loading={alertsLoading}
            onNudge={handleNudge}
            nudging={nudgingId}
          />
          <ResponseLeaderboard leaderboard={leaderboard} loading={leaderboardLoading} />
          <QueueStatus queueStats={queueStats} loading={queueLoading} />
          <WorkerStatus workerActivity={workerActivity} loading={workerLoading} />
          <InventoryHealthSection
            healthData={healthData}
            loading={healthLoading}
            onRunCrawl={handleRunCrawl}
            isCrawling={isCrawling}
            currentUser={currentUserState}
          />
        </main>
      </div>
    </>
  );
}
