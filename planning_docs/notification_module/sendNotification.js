// ============================================================
// sendNotification.js
// Server-side notification sender
// Use as: Vercel API route (/api/notify) or standalone function
// ============================================================

import admin from 'firebase-admin';

// ------------------------------------------------------------
// Initialize Firebase Admin SDK (server-side)
// For Vercel: store your service account JSON in an env variable
// ------------------------------------------------------------
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

/**
 * Send a warehouse alert to a specific user
 *
 * @param {string} userId      - Firestore user ID
 * @param {object} alert       - Alert details
 * @param {string} alert.type  - 'reshelve' | 'retrieve' | 'urgent'
 * @param {string} alert.sku   - Part SKU (e.g., "AI2847")
 * @param {string} alert.shelfLocation - Where the part is / goes
 * @param {string} [alert.message]     - Optional custom message
 * @param {string} [alert.assignedTo]  - Optional: specific device ID
 */
export async function sendWarehouseAlert(userId, alert) {
  const { type, sku, shelfLocation, message, assignedTo } = alert;

  // Build notification content based on type
  const content = buildNotificationContent(type, sku, shelfLocation, message);

  // Get target device tokens
  const tokens = await getDeviceTokens(userId, assignedTo);

  if (tokens.length === 0) {
    console.warn(`⚠️ No active devices found for user ${userId}`);
    return { success: false, reason: 'no_devices' };
  }

  // Build FCM message
  const fcmMessage = {
    // Data payload (always delivered, even in background)
    data: {
      alertType:     type,
      sku:           sku || '',
      shelfLocation: shelfLocation || '',
      action:        type,
      actionUrl:     `/inventory/${sku}`,
      timestamp:     new Date().toISOString(),
    },
    // Notification payload (shows system notification)
    notification: {
      title: content.title,
      body:  content.body,
    },
    // Android-specific settings
    android: {
      priority: type === 'urgent' ? 'high' : 'normal',
      notification: {
        channelId: `warehouse_${type}`,
        priority:  type === 'urgent' ? 'max' : 'high',
        defaultVibrateTimings: false,
        vibrateTimingsMillis: getVibrationPattern(type),
        sound: 'default',
      },
    },
    // Web push settings
    webpush: {
      headers: {
        Urgency: type === 'urgent' ? 'high' : 'normal',
      },
      fcmOptions: {
        link: `/inventory/${sku}`,
      },
    },
  };

  // Send to all target devices
  const results = await sendToDevices(tokens, fcmMessage);

  // Log the alert in Firestore for history/tracking
  await logAlert(userId, alert, results);

  return results;
}

// ============================================================
// CONVENIENCE FUNCTIONS for common warehouse operations
// ============================================================

/** Tell a worker to return a part to its shelf */
export async function notifyReshelve(userId, sku, shelfLocation) {
  return sendWarehouseAlert(userId, {
    type: 'reshelve',
    sku,
    shelfLocation,
  });
}

/** Tell a worker to retrieve a part from its shelf */
export async function notifyRetrieve(userId, sku, shelfLocation) {
  return sendWarehouseAlert(userId, {
    type: 'retrieve',
    sku,
    shelfLocation,
  });
}

/** Urgent part request */
export async function notifyUrgent(userId, sku, shelfLocation, message) {
  return sendWarehouseAlert(userId, {
    type: 'urgent',
    sku,
    shelfLocation,
    message,
  });
}

// ============================================================
// BROADCAST: Send to all warehouse workers
// ============================================================

export async function broadcastAlert(alert) {
  // Get all users with the 'warehouse' role
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
  let query = db.collection('users').doc(userId).collection('devices');

  if (specificDeviceId) {
    const deviceDoc = await query.doc(specificDeviceId).get();
    if (deviceDoc.exists && deviceDoc.data().notificationsEnabled) {
      return [deviceDoc.data().token];
    }
    return [];
  }

  // Get all enabled devices
  const snapshot = await query.where('notificationsEnabled', '==', true).get();
  const tokens = [];
  snapshot.forEach((doc) => {
    if (doc.data().token) {
      tokens.push(doc.data().token);
    }
  });
  return tokens;
}

async function sendToDevices(tokens, message) {
  if (tokens.length === 1) {
    // Single device
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

  // Multiple devices — use sendEachForMulticast
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
    await db.collection('alertHistory').add({
      userId,
      alertType: alert.type,
      sku:       alert.sku,
      shelfLocation: alert.shelfLocation,
      result:    result,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });
  } catch (err) {
    console.warn('Failed to log alert:', err);
  }
}

function getVibrationPattern(type) {
  switch (type) {
    case 'reshelve':  return [200, 100, 200, 100, 400];
    case 'retrieve':  return [400, 200, 400, 200, 400];
    case 'urgent':    return [100, 50, 100, 50, 100, 50, 800];
    default:          return [300, 100, 300];
  }
}

// ============================================================
// VERCEL API ROUTE HANDLER
// Use this if deploying as /api/notify
// ============================================================

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Basic auth check — replace with your actual auth
  const authHeader = req.headers.authorization;
  if (!authHeader || authHeader !== `Bearer ${process.env.INTERNAL_API_KEY}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const { userId, type, sku, shelfLocation, message, broadcast } = req.body;

    let result;

    if (broadcast) {
      result = await broadcastAlert({ type, sku, shelfLocation, message });
    } else {
      if (!userId) {
        return res.status(400).json({ error: 'userId is required (or set broadcast: true)' });
      }
      result = await sendWarehouseAlert(userId, { type, sku, shelfLocation, message });
    }

    return res.status(200).json(result);
  } catch (err) {
    console.error('Notification API error:', err);
    return res.status(500).json({ error: err.message });
  }
}
