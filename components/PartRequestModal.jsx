// ============================================================
// PartRequestModal.jsx
// "Request Part" modal for Pro Builder and Photo Station
// Sends a push notification to warehouse workers
// ============================================================

import React, { useState } from 'react';
import { TEAM_MEMBERS, getWarehouseWorkers } from '../lib/users';

export default function PartRequestModal({ item, currentUser, onClose }) {
  const [priority, setPriority] = useState('normal');
  const [note, setNote] = useState('');
  const [sendTo, setSendTo] = useState('all');
  const [isSending, setIsSending] = useState(false);
  const [sent, setSent] = useState(false);

  const warehouseWorkers = getWarehouseWorkers();

  const handleSend = async () => {
    setIsSending(true);
    try {
      const payload = {
        type: priority === 'urgent' ? 'urgent' : 'retrieve',
        sku: item?.sku || '',
        shelfLocation: item?.shelf || item?.shelfLocation || '',
        message: note
          ? `${item?.sku || 'Part'} from shelf ${item?.shelf || '?'} — ${note}`
          : undefined,
        requestedBy: currentUser?.id || currentUser?.name || 'unknown',
        priority: priority,
      };

      if (sendTo === 'all') {
        payload.broadcast = true;
      } else {
        payload.userId = sendTo;
      }

      const response = await fetch('/api/notify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to send request');
      }

      setSent(true);
      setTimeout(() => onClose(), 2000);
    } catch (err) {
      alert(`Failed to send: ${err.message}`);
    }
    setIsSending(false);
  };

  if (sent) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-2xl p-8 max-w-md w-full text-center">
          <div className="text-5xl mb-4">✅</div>
          <h3 className="text-xl font-bold text-gray-900 mb-2">Request Sent!</h3>
          <p className="text-gray-600">
            {sendTo === 'all' ? 'All warehouse workers' : TEAM_MEMBERS.find(m => m.id === sendTo)?.name || sendTo} will be notified.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-bold text-gray-900">📦 Request Part</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-2xl leading-none"
          >
            ✕
          </button>
        </div>

        {/* Part Info */}
        <div className="bg-gray-50 rounded-lg p-4 mb-4">
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div>
              <span className="text-gray-500">SKU:</span>{' '}
              <span className="font-bold text-gray-900">{item?.sku || 'N/A'}</span>
            </div>
            <div>
              <span className="text-gray-500">Shelf:</span>{' '}
              <span className="font-bold text-gray-900">{item?.shelf || item?.shelfLocation || 'N/A'}</span>
            </div>
            <div className="col-span-2">
              <span className="text-gray-500">Part:</span>{' '}
              <span className="font-bold text-gray-900">{item?.brand} {item?.partNumber}</span>
            </div>
          </div>
        </div>

        {/* Priority */}
        <div className="mb-4">
          <label className="block text-sm font-semibold text-gray-700 mb-2">Priority</label>
          <div className="flex gap-3">
            <button
              onClick={() => setPriority('normal')}
              className={`flex-1 py-3 rounded-lg font-semibold text-center transition ${
                priority === 'normal'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Normal
            </button>
            <button
              onClick={() => setPriority('urgent')}
              className={`flex-1 py-3 rounded-lg font-semibold text-center transition ${
                priority === 'urgent'
                  ? 'bg-red-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              🚨 Urgent
            </button>
          </div>
        </div>

        {/* Note */}
        <div className="mb-4">
          <label className="block text-sm font-semibold text-gray-700 mb-2">Note (optional)</label>
          <input
            type="text"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="e.g., Need nameplate photo"
            className="w-full px-4 py-3 border rounded-lg text-sm"
          />
        </div>

        {/* Send To */}
        <div className="mb-6">
          <label className="block text-sm font-semibold text-gray-700 mb-2">Send to</label>
          <select
            value={sendTo}
            onChange={(e) => setSendTo(e.target.value)}
            className="w-full px-4 py-3 border rounded-lg text-sm"
          >
            <option value="all">All Warehouse Workers</option>
            {warehouseWorkers.map((w) => (
              <option key={w.id} value={w.id}>
                {w.name} ({w.role})
              </option>
            ))}
          </select>
        </div>

        {/* Send Button */}
        <button
          onClick={handleSend}
          disabled={isSending}
          className={`w-full py-4 rounded-lg font-bold text-lg text-white transition ${
            priority === 'urgent'
              ? 'bg-red-600 hover:bg-red-700'
              : 'bg-blue-600 hover:bg-blue-700'
          } disabled:opacity-50`}
        >
          {isSending ? 'Sending...' : priority === 'urgent' ? '🚨 Send Urgent Request' : '📦 Send Request'}
        </button>
      </div>
    </div>
  );
}
