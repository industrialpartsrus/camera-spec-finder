// ============================================================
// /pages/api/notify.js
// Server-side notification sender via Firebase Cloud Messaging
// ============================================================

import admin from 'firebase-admin';

// Initialize Firebase Admin SDK (server-side)
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(
      JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON)
    ),
  });
}

const db = admin.firestore();

// ============================================================
// MAIN: Send notification to a user's devices
// ============================================================
export async function sendWarehouseAlert(userId, alert) {
  const { type, sku, shelfLocation, message, assignedTo, actionUrl } = alert;

  const content = buildNotificationContent(type, sku, shelfLocation, message);
  const tokens = await getDeviceTokens(userId, assignedTo);

  if (tokens.length === 0) {
    console.warn(`⚠️ No active devices found for user ${userId}`);
    return { success: false, reason: 'no_devices' };
  }

  // Default action URLs based on alert type — always user-facing pages, never /api/
  const defaultUrl = type === 'retrieve' || type === 'reshelve'
    ? (sku ? `/scanner` : '/')
    : '/';

  const fcmMessage = {
    data: {
      alertType:     type,
      sku:           sku || '',
      shelfLocation: shelfLocation || '',
      action:        type,
      actionUrl:     actionUrl || defaultUrl,
      timestamp:     new Date().toISOString(),
      message:       message || '',
    },
    notification: {
      title: content.title,
      body:  content.body,
    },
    android: {
      priority: type === 'urgent' ? 'high' : 'normal',
      notification: {
        channelId: `warehouse_${type}`,
        priority:  type === 'urgent' ? 'max' : 'high',
        sound: 'default',
      },
    },
    webpush: {
      headers: {
        Urgency: type === 'urgent' ? 'high' : 'normal',
      },
    },
  };

  // Log alert first to get the document ID for response tracking
  const alertId = await logAlert(userId, alert, { pending: true });
  if (alertId) {
    fcmMessage.data.alertId = alertId;
  }

  const results = await sendToDevices(tokens, fcmMessage);

  // Update the log entry with send results
  if (alertId) {
    try {
      await db.collection('alertHistory').doc(alertId).update({
        result: results,
      });
    } catch (err) {
      console.warn('Failed to update alert log with results:', err);
    }
  }

  return results;
}

// ============================================================
// BROADCAST: Send to all warehouse workers
// ============================================================
export async function broadcastAlert(alert) {
  const usersSnapshot = await db
    .collection('users')
    .where('role', 'in', ['warehouse', 'admin'])
    .get();

  const results = [];
  for (const userDoc of usersSnapshot.docs) {
    const result = await sendWarehouseAlert(userDoc.id, alert);
    results.push({ userId: userDoc.id, ...result });
  }
  return results;
}

// ============================================================
// INTERNAL HELPERS
// ============================================================
function buildNotificationContent(type, sku, shelfLocation, message) {
  switch (type) {
    case 'reshelve':
      return {
        title: '📦 Reshelve Part',
        body:  message || `Return ${sku} to shelf ${shelfLocation}`,
      };
    case 'retrieve':
      return {
        title: '🔍 Retrieve Part',
        body:  message || `Pick up ${sku} from shelf ${shelfLocation}`,
      };
    case 'urgent':
      return {
        title: '🚨 Urgent: Part Needed NOW',
        body:  message || `${sku} needed immediately — shelf ${shelfLocation}`,
      };
    default:
      return {
        title: 'Warehouse Alert',
        body:  message || `Action needed for ${sku}`,
      };
  }
}

async function getDeviceTokens(userId, specificDeviceId = null) {
  let devicesRef = db.collection('users').doc(userId).collection('devices');

  if (specificDeviceId) {
    const deviceDoc = await devicesRef.doc(specificDeviceId).get();
    if (deviceDoc.exists && deviceDoc.data().notificationsEnabled) {
      return [deviceDoc.data().token];
    }
    return [];
  }

  const snapshot = await devicesRef.where('notificationsEnabled', '==', true).get();
  const tokens = [];
  snapshot.forEach((doc) => {
    if (doc.data().token) {
      tokens.push(doc.data().token);
    }
  });
  // Deduplicate — same browser registering twice creates duplicate tokens
  return [...new Set(tokens)];
}

async function sendToDevices(tokens, message) {
  if (tokens.length === 1) {
    try {
      const response = await admin.messaging().send({
        ...message,
        token: tokens[0],
      });
      return { success: true, sent: 1, failed: 0, messageId: response };
    } catch (err) {
      console.error('FCM send error:', err);
      return { success: false, sent: 0, failed: 1, error: err.message };
    }
  }

  try {
    const response = await admin.messaging().sendEachForMulticast({
      ...message,
      tokens: tokens,
    });
    return {
      success: response.failureCount === 0,
      sent:    response.successCount,
      failed:  response.failureCount,
    };
  } catch (err) {
    console.error('FCM multicast error:', err);
    return { success: false, sent: 0, failed: tokens.length, error: err.message };
  }
}

async function logAlert(userId, alert, result) {
  try {
    const docRef = await db.collection('alertHistory').add({
      userId,
      alertType:     alert.type,
      sku:           alert.sku || '',
      shelfLocation: alert.shelfLocation || '',
      requestedBy:   alert.requestedBy || '',
      result:        result,
      status:        'sent',
      sentAt:        admin.firestore.FieldValue.serverTimestamp(),
      acknowledgedAt: null,
      completedAt:   null,
      responseTimeMinutes: null,
      escalationCount: 0,
    });
    return docRef.id;
  } catch (err) {
    console.warn('Failed to log alert:', err);
    return null;
  }
}

// ============================================================
// VERCEL API ROUTE HANDLER
// ============================================================
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Auth check - accept either Bearer token or internal calls
  const authHeader = req.headers.authorization;
  const internalKey = req.headers['x-internal-key'];
  if (!authHeader?.includes(process.env.INTERNAL_API_KEY) && internalKey !== process.env.INTERNAL_API_KEY) {
    // Allow calls from same origin (browser) with userId
    if (!req.body.userId && !req.body.broadcast) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
  }

  try {
    const { userId, type, sku, shelfLocation, message, broadcast, requestedBy, priority, actionUrl } = req.body;

    let result;

    if (broadcast) {
      result = await broadcastAlert({ type, sku, shelfLocation, message, requestedBy, actionUrl });
    } else {
      if (!userId) {
        return res.status(400).json({ error: 'userId is required (or set broadcast: true)' });
      }
      result = await sendWarehouseAlert(userId, { type, sku, shelfLocation, message, requestedBy, actionUrl });
    }

    // If this is a part_request, also create a partRequests doc
    if (type === 'retrieve' || type === 'urgent') {
      try {
        await db.collection('partRequests').add({
          sku: sku || '',
          shelfLocation: shelfLocation || '',
          requestedBy: requestedBy || userId || '',
          assignedTo: broadcast ? 'all' : userId,
          status: 'pending',
          priority: priority || 'normal',
          message: message || '',
          requestedAt: admin.firestore.FieldValue.serverTimestamp(),
          acknowledgedAt: null,
          deliveredAt: null,
          escalationCount: 0,
        });
      } catch (err) {
        console.warn('Failed to create part request doc:', err);
      }
    }

    return res.status(200).json({ success: true, ...result });
  } catch (err) {
    console.error('Notification API error:', err);
    return res.status(500).json({ error: err.message });
  }
}
