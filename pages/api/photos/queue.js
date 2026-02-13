// pages/api/photos/queue.js
// Fetch items that need photos for the Photo Station queue
// Returns items from products collection where photoCount = 0 or status = "needs_photos"

import { db } from '../../../firebase';
import { collection, query, where, getDocs, orderBy, limit } from 'firebase/firestore';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed. Use GET.' });
  }

  try {
    const productsRef = collection(db, 'products');
    const queueItems = [];

    // Strategy 1: Get items with photoCount = 0
    // This field may not exist on all items, so we'll also check status
    try {
      const q1 = query(
        productsRef,
        where('photoCount', '==', 0),
        limit(50)
      );
      const snapshot1 = await getDocs(q1);
      snapshot1.forEach(doc => {
        const data = doc.data();
        queueItems.push(formatQueueItem(doc.id, data));
      });
    } catch (error) {
      // photoCount field may not exist or no index - continue to strategy 2
      console.warn('photoCount query failed, trying status field:', error.message);
    }

    // Strategy 2: Get items with status = "needs_photos" (if strategy 1 found nothing)
    if (queueItems.length === 0) {
      try {
        const q2 = query(
          productsRef,
          where('status', '==', 'needs_photos'),
          limit(50)
        );
        const snapshot2 = await getDocs(q2);
        snapshot2.forEach(doc => {
          const data = doc.data();
          // Avoid duplicates if item already in list
          if (!queueItems.find(item => item.id === doc.id)) {
            queueItems.push(formatQueueItem(doc.id, data));
          }
        });
      } catch (error) {
        console.warn('status query failed:', error.message);
      }
    }

    // Sort by priority (urgent > high > normal), then by date (oldest first)
    const sortedItems = queueItems.sort((a, b) => {
      // Priority sort
      const priorityOrder = { urgent: 3, high: 2, normal: 1 };
      const aPriority = priorityOrder[a.priority] || 1;
      const bPriority = priorityOrder[b.priority] || 1;

      if (aPriority !== bPriority) {
        return bPriority - aPriority; // Higher priority first
      }

      // Date sort (oldest first)
      const aDate = a.scannedAt || a.createdAt || new Date(0);
      const bDate = b.scannedAt || b.createdAt || new Date(0);
      return new Date(aDate) - new Date(bDate);
    });

    return res.status(200).json({
      success: true,
      items: sortedItems,
      totalCount: sortedItems.length
    });
  } catch (error) {
    console.error('Photo queue error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch photo queue',
      details: error.message,
      items: [],
      totalCount: 0
    });
  }
}

/**
 * Format a product document for the queue display
 */
function formatQueueItem(id, data) {
  // Calculate time since scanned/created
  const timestamp = data.scannedAt || data.createdAt || null;
  const timeSince = timestamp ? formatTimeSince(timestamp.toDate()) : 'Unknown';

  return {
    id: id,
    sku: data.sku || 'N/A',
    brand: data.brand || 'Unknown',
    partNumber: data.partNumber || data.model || '',
    condition: data.condition || 'Unknown',
    shelf: data.shelf || 'Not Assigned',
    scannedBy: data.scannedBy || 'Unknown',
    scannedAt: timestamp ? timestamp.toDate().toISOString() : null,
    timeSince: timeSince,
    priority: data.priority || 'normal', // urgent | high | normal
    status: data.status || 'needs_photos',
    photoCount: data.photoCount || 0
  };
}

/**
 * Format time elapsed in human-readable format
 */
function formatTimeSince(date) {
  const seconds = Math.floor((new Date() - date) / 1000);

  if (seconds < 60) {
    return `${seconds}s ago`;
  }

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) {
    return `${minutes}m ago`;
  }

  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    return `${hours}h ago`;
  }

  const days = Math.floor(hours / 24);
  if (days < 7) {
    return `${days}d ago`;
  }

  const weeks = Math.floor(days / 7);
  return `${weeks}w ago`;
}
