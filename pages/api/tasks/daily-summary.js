// ============================================================
// /pages/api/tasks/daily-summary.js
// Cron job: 5 PM EST daily summary push notification to admins
// Runs at 22:00 UTC Mon-Fri via Vercel Cron
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
    // Calculate start and end of today in EST (UTC-5)
    const now = new Date();
    const estOffset = -5 * 60; // EST is UTC-5
    const estNow = new Date(now.getTime() + estOffset * 60 * 1000);
    const startOfDayEST = new Date(estNow.getFullYear(), estNow.getMonth(), estNow.getDate());
    // Convert back to UTC for Firestore comparison
    const startOfDayUTC = new Date(startOfDayEST.getTime() - estOffset * 60 * 1000);
    const endOfDayUTC = new Date(startOfDayUTC.getTime() + 24 * 60 * 60 * 1000);

    const startTimestamp = admin.firestore.Timestamp.fromDate(startOfDayUTC);
    const endTimestamp = admin.firestore.Timestamp.fromDate(endOfDayUTC);

    // ---- Query inventory collection for today's activity ----

    // Count items scanned today
    const scannedSnapshot = await db.collection('inventory')
      .where('scannedAt', '>=', startTimestamp)
      .where('scannedAt', '<', endTimestamp)
      .get();
    const scannedCount = scannedSnapshot.size;

    // Count items photographed today
    const photosSnapshot = await db.collection('inventory')
      .where('photosCompletedAt', '>=', startTimestamp)
      .where('photosCompletedAt', '<', endTimestamp)
      .get();
    const photosCount = photosSnapshot.size;

    // Count items published today (status == 'listed' and listedAt is today)
    const listedSnapshot = await db.collection('inventory')
      .where('status', '==', 'listed')
      .where('listedAt', '>=', startTimestamp)
      .where('listedAt', '<', endTimestamp)
      .get();
    const listedCount = listedSnapshot.size;

    // Count listings built today (status in ['ready_to_list', 'listed'] and updatedAt is today)
    const listingsBuiltSnapshot = await db.collection('inventory')
      .where('status', 'in', ['ready_to_list', 'listed'])
      .where('updatedAt', '>=', startTimestamp)
      .where('updatedAt', '<', endTimestamp)
      .get();
    const listingsBuiltCount = listingsBuiltSnapshot.size;

    // ---- Query alertHistory for today ----

    const alertsSnapshot = await db.collection('alertHistory')
      .where('completedAt', '>=', startTimestamp)
      .where('completedAt', '<', endTimestamp)
      .get();

    const completedAlerts = alertsSnapshot.size;
    let totalResponseTime = 0;
    let responseTimeCount = 0;
    let overdueCount = 0;

    alertsSnapshot.forEach((doc) => {
      const data = doc.data();
      if (typeof data.responseTimeMinutes === 'number') {
        totalResponseTime += data.responseTimeMinutes;
        responseTimeCount++;
        if (data.responseTimeMinutes > 10) {
          overdueCount++;
        }
      }
    });

    const avgResponseTime = responseTimeCount > 0
      ? Math.round(totalResponseTime / responseTimeCount)
      : 0;

    // ---- Send push notification to all admin users ----

    const adminsSnapshot = await db.collection('users')
      .where('role', '==', 'admin')
      .get();

    let sent = 0;

    for (const userDoc of adminsSnapshot.docs) {
      const tokens = await getDeviceTokens(userDoc.id);
      if (tokens.length === 0) continue;

      const message = {
        data: {
          alertType: 'summary',
          actionUrl: '/dashboard',
          timestamp: new Date().toISOString(),
          scanned: String(scannedCount),
          photographed: String(photosCount),
          published: String(listedCount),
          listingsBuilt: String(listingsBuiltCount),
          completedAlerts: String(completedAlerts),
          avgResponseTime: String(avgResponseTime),
          overdue: String(overdueCount),
        },
        notification: {
          title: '\uD83D\uDCCA Daily Summary',
          body: `Today: ${scannedCount} scanned, ${photosCount} photographed, ${listedCount} published. Avg response: ${avgResponseTime} min. ${overdueCount} overdue.`,
        },
        android: {
          priority: 'normal',
          notification: { channelId: 'warehouse_retrieve', sound: 'default' },
        },
      };

      for (const token of tokens) {
        try {
          await admin.messaging().send({ ...message, token });
          sent++;
        } catch (err) {
          console.warn(`Failed to send daily summary to ${userDoc.id}:`, err.message);
        }
      }
    }

    // ---- Log summary to dailySummaries collection ----

    const summaryData = {
      date: startOfDayUTC.toISOString().split('T')[0],
      scanned: scannedCount,
      photographed: photosCount,
      published: listedCount,
      listingsBuilt: listingsBuiltCount,
      completedAlerts,
      avgResponseTime,
      overdue: overdueCount,
      notificationsSent: sent,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    await db.collection('dailySummaries').add(summaryData);

    console.log(`Daily summary: ${scannedCount} scanned, ${photosCount} photographed, ${listedCount} published, ${listingsBuiltCount} listings built. Alerts: ${completedAlerts} completed, avg ${avgResponseTime} min, ${overdueCount} overdue. Sent to ${sent} devices.`);

    return res.status(200).json({
      ...summaryData,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    console.error('Daily summary error:', err);
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
