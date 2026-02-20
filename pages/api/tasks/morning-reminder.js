// ============================================================
// /pages/api/tasks/morning-reminder.js
// Cron job: 8:15 AM EST weekday scanning reminder
// Runs at 13:15 UTC Mon-Fri via Vercel Cron
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
    // Get all warehouse and admin users
    const usersSnapshot = await db.collection('users')
      .where('role', 'in', ['warehouse', 'admin'])
      .get();

    let sent = 0;

    for (const userDoc of usersSnapshot.docs) {
      const tokens = await getDeviceTokens(userDoc.id);
      if (tokens.length === 0) continue;

      const message = {
        data: {
          alertType: 'retrieve',
          sku: '',
          shelfLocation: '',
          action: 'retrieve',
          actionUrl: '/scanner',
          timestamp: new Date().toISOString(),
          message: '🕐 Good morning! Time to start scanning new parts. Check the scanning queue.',
        },
        notification: {
          title: '🕐 Morning Scanning Reminder',
          body: 'Good morning! Time to start scanning new parts. Check the scanning queue.',
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
          console.warn(`Failed to send morning reminder to ${userDoc.id}:`, err.message);
        }
      }
    }

    console.log(`Morning reminder sent to ${sent} devices`);
    return res.status(200).json({ sent, timestamp: new Date().toISOString() });
  } catch (err) {
    console.error('Morning reminder error:', err);
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
