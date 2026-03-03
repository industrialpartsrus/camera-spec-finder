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

    // ---- Query activityLog for today's activity ----
    // NOTE: If you see a Firestore index error, click the link Firebase provides to create the required composite index.

    // Count items scanned today (from Scanner tool)
    let scannedCount = 0;
    try {
      const scannedSnapshot = await db.collection('activityLog')
        .where('action', 'in', ['create_new', 'add_stock', 'update_stock'])
        .where('timestamp', '>=', startTimestamp)
        .where('timestamp', '<', endTimestamp)
        .get();
      scannedCount = scannedSnapshot.size;
    } catch (e) {
      console.warn('Scanned query failed (may need composite index):', e.message);
      // Fallback: count all activityLog entries from scanner tool
      const fallback = await db.collection('activityLog')
        .where('timestamp', '>=', startTimestamp)
        .where('timestamp', '<', endTimestamp)
        .get();
      scannedCount = fallback.docs.filter(d => ['create_new', 'add_stock', 'update_stock'].includes(d.data().action)).length;
    }

    // Count items photographed today (from Photo Station)
    let photosCount = 0;
    try {
      const photosSnapshot = await db.collection('activityLog')
        .where('action', '==', 'photos_uploaded')
        .where('timestamp', '>=', startTimestamp)
        .where('timestamp', '<', endTimestamp)
        .get();
      photosCount = photosSnapshot.size;
    } catch (e) {
      console.warn('Photos query failed (may need composite index):', e.message);
    }

    // Count listings sent today (from Pro Builder)
    let listedCount = 0;
    try {
      const listedSnapshot = await db.collection('activityLog')
        .where('action', '==', 'listing_sent')
        .where('timestamp', '>=', startTimestamp)
        .where('timestamp', '<', endTimestamp)
        .get();
      listedCount = listedSnapshot.size;
    } catch (e) {
      console.warn('Listed query failed (may need composite index):', e.message);
    }

    // Count research completions today
    let listingsBuiltCount = 0;
    try {
      const researchSnapshot = await db.collection('activityLog')
        .where('action', '==', 'research_complete')
        .where('timestamp', '>=', startTimestamp)
        .where('timestamp', '<', endTimestamp)
        .get();
      listingsBuiltCount = researchSnapshot.size;
    } catch (e) {
      console.warn('Research query failed (may need composite index):', e.message);
    }

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
