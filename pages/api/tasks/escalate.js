// ============================================================
// /pages/api/tasks/escalate.js
// Cron job: Check for unacknowledged part requests older than 10 minutes
// Runs every 2 minutes via Vercel Cron
// ============================================================

import admin from 'firebase-admin';

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(
      JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON)
    ),
  });
}

const db = admin.firestore();

export default async function handler(req, res) {
  // Verify cron secret or internal key
  const authHeader = req.headers.authorization;
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}` && authHeader !== `Bearer ${process.env.INTERNAL_API_KEY}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    // Find pending requests older than 10 minutes
    const tenMinAgo = new Date(Date.now() - 10 * 60 * 1000);
    const tenMinTimestamp = admin.firestore.Timestamp.fromDate(tenMinAgo);

    const overdueSnapshot = await db.collection('partRequests')
      .where('status', '==', 'pending')
      .where('requestedAt', '<', tenMinTimestamp)
      .get();

    let escalated = 0;

    for (const docSnap of overdueSnapshot.docs) {
      const request = docSnap.data();
      const minutesAgo = Math.round((Date.now() - request.requestedAt.toMillis()) / 60000);

      // Get device tokens for the assigned worker
      const assignedTo = request.assignedTo || 'all';

      if (assignedTo === 'all') {
        // Broadcast escalation to all warehouse workers
        const usersSnapshot = await db.collection('users')
          .where('role', 'in', ['warehouse', 'admin'])
          .get();

        for (const userDoc of usersSnapshot.docs) {
          await sendEscalationNotification(userDoc.id, request, minutesAgo);
        }
      } else {
        // Send to specific worker
        await sendEscalationNotification(assignedTo, request, minutesAgo);
      }

      // Also notify the requester
      if (request.requestedBy && request.requestedBy !== assignedTo) {
        await sendRequesterUpdate(request.requestedBy, request, minutesAgo);
      }

      // Increment escalation count
      await docSnap.ref.update({
        escalationCount: admin.firestore.FieldValue.increment(1),
        lastEscalatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      escalated++;
    }

    // Also reactivate snoozed alerts whose snooze has expired
    let reactivated = 0;
    const now = new Date();
    const snoozedSnapshot = await db.collection('snoozedAlerts')
      .where('processed', '==', false)
      .where('reactivateAt', '<=', now)
      .get();

    for (const snoozedDoc of snoozedSnapshot.docs) {
      const snoozed = snoozedDoc.data();

      // Find the snoozed partRequest and set it back to pending
      const requestSnapshot = await db.collection('partRequests')
        .where('sku', '==', snoozed.sku)
        .where('status', '==', 'snoozed')
        .limit(1)
        .get();

      if (!requestSnapshot.empty) {
        await requestSnapshot.docs[0].ref.update({
          status: 'pending',
          snoozedBy: admin.firestore.FieldValue.delete(),
          snoozedAt: admin.firestore.FieldValue.delete(),
          snoozedUntil: admin.firestore.FieldValue.delete(),
        });
      }

      await snoozedDoc.ref.update({ processed: true });
      reactivated++;
    }

    console.log(`Escalation check: ${overdueSnapshot.size} overdue, ${escalated} escalated, ${reactivated} reactivated from snooze`);
    return res.status(200).json({
      checked: overdueSnapshot.size,
      escalated: escalated,
      reactivated: reactivated,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    console.error('Escalation error:', err);
    return res.status(500).json({ error: err.message });
  }
}

async function sendEscalationNotification(userId, request, minutesAgo) {
  const tokens = await getDeviceTokens(userId);
  if (tokens.length === 0) return;

  const message = {
    data: {
      alertType: 'urgent',
      sku: request.sku || '',
      shelfLocation: request.shelfLocation || '',
      action: 'urgent',
      actionUrl: '/scanner',
      timestamp: new Date().toISOString(),
      message: `⚠️ OVERDUE: ${request.sku} requested ${minutesAgo} minutes ago! Shelf ${request.shelfLocation}`,
    },
    notification: {
      title: '🚨 OVERDUE Part Request',
      body: `${request.sku} requested ${minutesAgo} min ago — Shelf ${request.shelfLocation}`,
    },
    android: {
      priority: 'high',
      notification: { channelId: 'warehouse_urgent', priority: 'max', sound: 'default' },
    },
    webpush: { headers: { Urgency: 'high' } },
  };

  for (const token of tokens) {
    try {
      await admin.messaging().send({ ...message, token });
    } catch (err) {
      console.warn(`Failed to send escalation to ${userId}:`, err.message);
    }
  }
}

async function sendRequesterUpdate(userId, request, minutesAgo) {
  const tokens = await getDeviceTokens(userId);
  if (tokens.length === 0) return;

  const message = {
    data: {
      alertType: 'retrieve',
      sku: request.sku || '',
      shelfLocation: request.shelfLocation || '',
      action: 'retrieve',
      actionUrl: '/pro',
      timestamp: new Date().toISOString(),
      message: `Your request for ${request.sku} has not been acknowledged after ${minutesAgo} minutes. Escalation sent.`,
    },
    notification: {
      title: '⏰ Request Not Acknowledged',
      body: `${request.sku} — no response after ${minutesAgo} min. Escalation sent.`,
    },
  };

  for (const token of tokens) {
    try {
      await admin.messaging().send({ ...message, token });
    } catch (err) {
      console.warn(`Failed to notify requester ${userId}:`, err.message);
    }
  }
}

async function getDeviceTokens(userId) {
  const snapshot = await db.collection('users').doc(userId).collection('devices')
    .where('notificationsEnabled', '==', true)
    .get();
  const tokens = [];
  snapshot.forEach((doc) => {
    if (doc.data().token) tokens.push(doc.data().token);
  });
  return tokens;
}
