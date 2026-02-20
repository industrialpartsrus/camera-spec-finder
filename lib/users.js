// ============================================================
// /lib/users.js
// Simple user/worker identity system
// Not full auth — just a name picker so we know who's who
// ============================================================

export const TEAM_MEMBERS = [
  { id: 'scott', name: 'Scott', role: 'admin', color: '#3b82f6' },
  { id: 'worker1', name: 'Employee 1', role: 'warehouse', color: '#10b981' },
  { id: 'worker2', name: 'Employee 2', role: 'warehouse', color: '#f59e0b' },
  { id: 'worker3', name: 'Employee 3', role: 'listing', color: '#8b5cf6' },
  // Scott will fill in real names later
];

export function getCurrentUser() {
  if (typeof window === 'undefined') return null;
  const saved = localStorage.getItem('ipru_current_user');
  try {
    return saved ? JSON.parse(saved) : null;
  } catch (e) {
    return null;
  }
}

export function setCurrentUser(user) {
  localStorage.setItem('ipru_current_user', JSON.stringify(user));
}

export function clearCurrentUser() {
  localStorage.removeItem('ipru_current_user');
}

export function getWarehouseWorkers() {
  return TEAM_MEMBERS.filter(m => m.role === 'warehouse' || m.role === 'admin');
}

export function getTeamMemberById(id) {
  return TEAM_MEMBERS.find(m => m.id === id) || null;
}
