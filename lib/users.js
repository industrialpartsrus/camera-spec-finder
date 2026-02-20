// ============================================================
// /lib/users.js
// Simple user/worker identity system
// Not full auth — just a name picker so we know who's who
// ============================================================

export const TEAM_MEMBERS = [
  { id: 'scott', name: 'Scott', role: 'admin', capabilities: ['admin', 'warehouse', 'listing', 'photos'], color: '#3b82f6' },
  { id: 'mikayla', name: 'Mikayla', role: 'admin', capabilities: ['admin', 'warehouse', 'listing', 'photos'], color: '#f97316' },
  { id: 'dade', name: 'Dade', role: 'warehouse', capabilities: ['warehouse'], color: '#10b981' },
  { id: 'gavin', name: 'Gavin', role: 'warehouse', capabilities: ['warehouse'], color: '#f59e0b' },
  { id: 'donald', name: 'Donald', role: 'warehouse', capabilities: ['warehouse'], color: '#ef4444' },
  { id: 'doug', name: 'Doug', role: 'warehouse', capabilities: ['warehouse'], color: '#6b7280' },
  { id: 'austin', name: 'Austin', role: 'warehouse', capabilities: ['warehouse', 'listing'], color: '#06b6d4' },
  { id: 'beth', name: 'Beth', role: 'listing', capabilities: ['listing'], color: '#8b5cf6' },
  { id: 'bean', name: 'Bean', role: 'listing', capabilities: ['listing'], color: '#ec4899' },
  { id: 'claire', name: 'Claire', role: 'photos', capabilities: ['photos'], color: '#14b8a6' },
];

// Role groupings for display
export const ROLE_GROUPS = [
  { key: 'admin', label: 'Admin', icon: '👑' },
  { key: 'warehouse', label: 'Warehouse', icon: '🏭' },
  { key: 'listing', label: 'Listing', icon: '📋' },
  { key: 'photos', label: 'Photos', icon: '📷' },
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

export function getMembersByRole(role) {
  return TEAM_MEMBERS.filter(m => m.role === role);
}

export function hasCapability(user, capability) {
  if (!user) return false;
  if (user.role === 'admin') return true;
  return user.capabilities?.includes(capability) || false;
}

export function isAdmin(user) {
  return user?.role === 'admin';
}
