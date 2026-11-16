// pages/api/standards/status.js
// Read-only health check for the IPRUS standards loader (lib/iprus-standards.js).
// Returns counts and where the copy came from. Never returns the token or file contents.

import { getStandards } from '../../../lib/iprus-standards';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed. Use GET.' });
  }
  res.setHeader('Cache-Control', 'no-store');
  try {
    const { standards, stale, source, origin } = await getStandards();
    return res.status(200).json({
      source: source === 'memory' && origin ? `${origin} (cached in memory)` : source,
      stale: Boolean(stale),
      version: standards.version || null,
      mapRows: standards.mapRows,
      preferredCount: standards.preferredCount,
    });
  } catch (err) {
    // Message names the failure only (no token, no file contents)
    return res.status(503).json({ source: null, stale: null, version: null, mapRows: 0, preferredCount: 0, error: err.message });
  }
}
