// ============================================================
// /pages/api/tasks/complete.js
// Mark a part request as completed + track response time
// Updates BOTH partRequests and alertHistory collections
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
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { sku, userId, alertId } = req.body;
    const now = admin.firestore.FieldValue.serverTimestamp();
    const nowMs = Date.now();
    let updated = false;
    let responseTimeMinutes = null;
    let requestedBy = null;

    // 1. Try to update matching partRequest (if sku provided)
    if (sku) {
      const partRequests = await db.collection('partRequests')
        .where('sku', '==', sku)
        .where('status', 'in', ['pending', 'acknowledged'])
        .limit(1)
        .get();

      if (!partRequests.empty) {
        const doc = partRequests.docs[0];
        const data = doc.data();
        requestedBy = data.requestedBy || null;

        const requestedAt = data.requestedAt?.toMillis
          ? data.requestedAt.toMillis()
          : Date.parse(data.requestedAt);
        if (requestedAt) {
          responseTimeMinutes = Math.round((nowMs - requestedAt) / 60000);
        }

        await doc.ref.update({
          status: 'completed',
          completedAt: now,
          completedBy: userId || 'unknown',
          responseTimeMinutes: responseTimeMinutes,
        });
        updated = true;
      }
    }

    // 2. Update matching alertHistory record
    if (alertId) {
      // Direct lookup by document ID
      const alertDoc = await db.collection('alertHistory').doc(alertId).get();
      if (alertDoc.exists && alertDoc.data().status !== 'completed') {
        const alertData = alertDoc.data();
        const sentAt = alertData.sentAt?.toMillis
          ? alertData.sentAt.toMillis()
          : Date.parse(alertData.sentAt);
        const alertResponseMinutes = sentAt
          ? Math.round((nowMs - sentAt) / 60000)
          : null;

        await alertDoc.ref.update({
          status: 'completed',
          completedAt: now,
          respondedAt: now,
          respondedBy: userId || 'unknown',
          responseTimeMinutes: alertResponseMinutes,
        });
        updated = true;
        if (!responseTimeMinutes) responseTimeMinutes = alertResponseMinutes;
      }
    } else {
      // Fallback: find by userId and/or sku in recent alerts
      const alerts = await db.collection('alertHistory')
        .orderBy('sentAt', 'desc')
        .limit(10)
        .get();

      for (const doc of alerts.docs) {
        const data = doc.data();
        const matchUser = !userId || data.userId === userId;
        const matchSku = !sku || data.sku === sku;
        const notCompleted = data.status !== 'completed';

        if (matchUser && matchSku && notCompleted) {
          const sentAt = data.sentAt?.toMillis
            ? data.sentAt.toMillis()
            : Date.parse(data.sentAt);
          const alertResponseMinutes = sentAt
            ? Math.round((nowMs - sentAt) / 60000)
            : null;

          await doc.ref.update({
            status: 'completed',
            completedAt: now,
            respondedAt: now,
            respondedBy: userId || 'unknown',
            responseTimeMinutes: alertResponseMinutes,
          });
          updated = true;
          if (!responseTimeMinutes) responseTimeMinutes = alertResponseMinutes;
          break; // Only update the most recent matching one
        }
      }
    }

    // 3. Notify the requester that part is on its way
    if (requestedBy && sku) {
      const tokens = await getDeviceTokens(requestedBy);
      if (tokens.length > 0) {
        const workerName = userId || 'Someone';
        const message = {
          data: {
            alertType: 'reshelve',
            sku: sku,
            shelfLocation: '',
            action: 'reshelve',
            actionUrl: '/pro',
            timestamp: new Date().toISOString(),
            message: `\u2705 ${sku} picked up by ${workerName}. Response time: ${responseTimeMinutes || '?'} min`,
          },
          notification: {
            title: '\u2705 Part Request Completed',
            body: `${sku} picked up by ${workerName}${responseTimeMinutes ? ` (${responseTimeMinutes} min)` : ''}`,
          },
        };

        for (const token of tokens) {
          try {
            await admin.messaging().send({ ...message, token });
          } catch (err) {
            console.warn(`Failed to notify requester:`, err.message);
          }
        }
      }
    }

    return res.status(200).json({
      success: updated,
      sku: sku || '',
      responseTimeMinutes: responseTimeMinutes,
      completedBy: userId || 'unknown',
      message: updated ? 'Response recorded' : 'No matching alert found',
    });
  } catch (err) {
    console.error('Task complete error:', err);
    return res.status(500).json({ error: err.message });
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
  return [...new Set(tokens)];
}
