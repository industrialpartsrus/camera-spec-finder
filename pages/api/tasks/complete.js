// ============================================================
// /pages/api/tasks/complete.js
// Mark a part request as completed + track response time
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
    const { sku, userId, requestId } = req.body;

    if (!sku) {
      return res.status(400).json({ error: 'SKU is required' });
    }

    // Find the matching pending/acknowledged request
    let queryRef = db.collection('partRequests')
      .where('sku', '==', sku)
      .where('status', 'in', ['pending', 'acknowledged'])
      .limit(1);

    const snapshot = await queryRef.get();

    if (snapshot.empty) {
      // No pending request found — still log as a general completion
      return res.status(200).json({
        success: true,
        message: 'No pending request found for this SKU, but completion noted.',
      });
    }

    const docSnap = snapshot.docs[0];
    const data = docSnap.data();
    const now = admin.firestore.FieldValue.serverTimestamp();

    // Calculate response time
    let responseTimeMinutes = null;
    if (data.requestedAt) {
      responseTimeMinutes = Math.round(
        (Date.now() - data.requestedAt.toMillis()) / 60000
      );
    }

    // Update the request
    await docSnap.ref.update({
      status: 'completed',
      completedAt: now,
      completedBy: userId || 'unknown',
      responseTimeMinutes: responseTimeMinutes,
    });

    // Also update the alertHistory record if one exists
    const alertQuery = await db.collection('alertHistory')
      .where('sku', '==', sku)
      .where('status', '==', 'sent')
      .limit(1)
      .get();

    if (!alertQuery.empty) {
      await alertQuery.docs[0].ref.update({
        status: 'completed',
        completedAt: now,
        completedBy: userId || 'unknown',
        responseTimeMinutes: responseTimeMinutes,
      });
    }

    // Notify the requester that part is on its way
    if (data.requestedBy) {
      const tokens = await getDeviceTokens(data.requestedBy);
      if (tokens.length > 0) {
        const workerName = userId || 'Someone';
        const message = {
          data: {
            alertType: 'reshelve',
            sku: sku,
            shelfLocation: data.shelfLocation || '',
            action: 'reshelve',
            actionUrl: '/pro',
            timestamp: new Date().toISOString(),
            message: `✅ ${sku} picked up by ${workerName}. Response time: ${responseTimeMinutes || '?'} min`,
          },
          notification: {
            title: '✅ Part Request Completed',
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
      success: true,
      sku: sku,
      responseTimeMinutes: responseTimeMinutes,
      completedBy: userId || 'unknown',
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
  return tokens;
}
