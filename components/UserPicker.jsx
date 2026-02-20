// ============================================================
// components/UserPicker.jsx
// "Who are you?" modal — shown on first visit to any tool
// Groups team members by role with colored avatar dots
// ============================================================

import React from 'react';
import { TEAM_MEMBERS, ROLE_GROUPS, setCurrentUser } from '../lib/users';

export default function UserPicker({ onSelect, title, subtitle }) {
  const handleSelect = (member) => {
    setCurrentUser(member);
    if (onSelect) onSelect(member);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-lg w-full">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-gray-900">{title || 'Who are you?'}</h1>
          <p className="text-gray-500 mt-1">{subtitle || 'Select your name to get started'}</p>
        </div>

        <div className="space-y-5">
          {ROLE_GROUPS.map(group => {
            const members = TEAM_MEMBERS.filter(m => m.role === group.key);
            if (members.length === 0) return null;

            return (
              <div key={group.key}>
                <div className="flex items-center gap-2 mb-2 px-1">
                  <span className="text-lg">{group.icon}</span>
                  <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                    {group.label}
                  </span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {members.map(member => (
                    <button
                      key={member.id}
                      onClick={() => handleSelect(member)}
                      className="flex items-center gap-2 px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-xl hover:border-blue-400 hover:bg-blue-50 active:bg-blue-100 transition-all font-medium text-gray-800"
                    >
                      <span
                        className="w-3 h-3 rounded-full flex-shrink-0"
                        style={{ backgroundColor: member.color }}
                      />
                      {member.name}
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
