// pages/api/scanner/check-duplicate.js
// Check scan_log collection for duplicate scans within 8-hour window
// Used to warn warehouse workers if an item was recently scanned

import { db } from '../../../firebase';
import { collection, query, where, getDocs, orderBy, limit, Timestamp } from 'firebase/firestore';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed. Use POST.' });
  }

  const { partNumber, brand } = req.body;

  if (!partNumber || partNumber.trim().length < 2) {
    return res.status(400).json({
      error: 'Part number required',
      isDuplicate: false
    });
  }

  const searchPartNumber = partNumber.trim().toUpperCase();

  try {
    // Calculate 8-hour window (8 hours ago from now)
    const eightHoursAgo = new Date(Date.now() - 8 * 60 * 60 * 1000);
    const timestampEightHoursAgo = Timestamp.fromDate(eightHoursAgo);

    const scanLogRef = collection(db, 'scan_log');

    // Query for scans of this part number within last 8 hours
    const q = query(
      scanLogRef,
      where('partNumber_upper', '==', searchPartNumber),
      where('timestamp', '>=', timestampEightHoursAgo),
      orderBy('timestamp', 'desc'),
      limit(5) // Get up to 5 most recent scans
    );

    const snapshot = await getDocs(q);

    if (snapshot.empty) {
      return res.status(200).json({
        isDuplicate: false,
        recentScans: []
      });
    }

    // Format recent scans
    const recentScans = [];
    snapshot.forEach(doc => {
      const data = doc.data();
      recentScans.push({
        id: doc.id,
        partNumber: data.partNumber,
        brand: data.brand || 'Unknown',
        scannedBy: data.scannedBy,
        timestamp: data.timestamp.toDate().toISOString(),
        timeSince: formatTimeSince(data.timestamp.toDate()),
        sku: data.sku || 'N/A',
        shelf: data.shelf || 'Not Assigned',
        action: data.action || 'scan'
      });
    });

    // Most recent scan
    const mostRecent = recentScans[0];

    return res.status(200).json({
      isDuplicate: true,
      lastScan: mostRecent,
      recentScans: recentScans,
      warning: `This item was scanned ${mostRecent.timeSince} by ${mostRecent.scannedBy}${mostRecent.shelf !== 'Not Assigned' ? ` — Shelf ${mostRecent.shelf}` : ''}`
    });
  } catch (error) {
    console.error('Duplicate check error:', error);
    return res.status(500).json({
      error: 'Failed to check duplicates',
      details: error.message,
      isDuplicate: false
    });
  }
}

/**
 * Format time elapsed in human-readable format
 * @param {Date} date - Past date to compare to now
 * @returns {string} - "3 hours ago", "25 minutes ago", etc.
 */
function formatTimeSince(date) {
  const seconds = Math.floor((new Date() - date) / 1000);

  if (seconds < 60) {
    return `${seconds} second${seconds !== 1 ? 's' : ''} ago`;
  }

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) {
    return `${minutes} minute${minutes !== 1 ? 's' : ''} ago`;
  }

  const hours = Math.floor(minutes / 60);
  if (hours < 8) {
    const remainingMinutes = minutes % 60;
    if (remainingMinutes > 0) {
      return `${hours} hour${hours !== 1 ? 's' : ''}, ${remainingMinutes} minute${remainingMinutes !== 1 ? 's' : ''} ago`;
    }
    return `${hours} hour${hours !== 1 ? 's' : ''} ago`;
  }

  return 'over 8 hours ago';
}
