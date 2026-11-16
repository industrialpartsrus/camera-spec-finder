// pages/api/suredone/item-logs.js
// Read-only. Recent SureDone channel log entries for one SKU (SureDone POST /logs
// is a search), so the lister can see eBay's own answer (errors, warnings,
// "Successfully added item") after a publish.
//   GET ?sku=AI3000[&since=2026-11-16 22:00:00]  (since is UTC, Y-m-d H:i:s)
// Returns { sku, entries: [{ at, context, action, operation, result, message }] } newest first.

import { getSureDoneCredentials } from '../../../lib/suredone-config';

function messageText(m) {
  if (m == null) return '';
  if (typeof m === 'string') return m;
  // {"message":"","errors":{"0":{"codes":{"0":"title:62"}}}} or {"0":"ebayid Main: ... Warning ..."}
  const out = [];
  const walk = (v) => {
    if (v == null) return;
    if (typeof v === 'string') { if (v.trim()) out.push(v.trim()); return; }
    if (typeof v === 'object') Object.values(v).forEach(walk);
  };
  walk(m);
  return [...new Set(out)].join(' · ');
}

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed. Use GET.' });
  const { sku, since } = req.query;
  if (!sku) return res.status(400).json({ error: 'sku required' });
  res.setHeader('Cache-Control', 'no-store');
  try {
    const { user, token, baseUrl } = getSureDoneCredentials();
    const body = new URLSearchParams({ identifier: String(sku), records: '50' });
    if (since) body.append('timestamp_start', String(since));
    const r = await fetch(`${baseUrl}/logs`, {
      method: 'POST',
      headers: { 'X-Auth-User': user, 'X-Auth-Token': token, 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
    });
    const d = await r.json();
    const list = Array.isArray(d.logs) ? d.logs : Object.values(d.logs || {});
    const entries = list
      .map(e => ({
        at: e.created_at || e.timestamp || '',
        context: e.context || '', action: e.action || '', operation: e.operation || '',
        result: e.result || '', message: messageText(e.message).slice(0, 500),
      }))
      // Only what a lister needs: eBay entries and anything that failed or warned
      .filter(e => e.context === 'ebay' || /fail|error|warn/i.test(e.result) || /ebayid/i.test(e.message))
      .sort((a, b) => String(b.at).localeCompare(String(a.at)));
    return res.status(200).json({ sku, entries });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
