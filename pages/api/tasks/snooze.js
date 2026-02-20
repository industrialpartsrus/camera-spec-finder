// ============================================================
// /pages/api/tasks/snooze.js
// Snooze a part request notification — re-sends after N minutes
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
    const { sku, userId, minutes = 5 } = req.body;

    if (!sku) {
      return res.status(400).json({ error: 'SKU is required' });
    }

    // Find the matching pending/acknowledged request
    const snapshot = await db.collection('partRequests')
      .where('sku', '==', sku)
      .where('status', 'in', ['pending', 'acknowledged'])
      .limit(1)
      .get();

    if (!snapshot.empty) {
      const docRef = snapshot.docs[0].ref;
      await docRef.update({
        snoozedBy: userId || 'unknown',
        snoozedAt: admin.firestore.FieldValue.serverTimestamp(),
        snoozedUntil: new Date(Date.now() + minutes * 60000),
        status: 'snoozed',
      });
    }

    // Schedule re-notification using a Firestore doc that the escalation
    // cron can pick up, or simply store the snooze time so the next
    // escalation cycle re-sends it once the snooze expires.
    // For simplicity, we set status back to 'pending' after the snooze
    // window — the escalation cron will pick it up and re-notify.

    // Create a delayed re-activation record
    await db.collection('snoozedAlerts').add({
      sku,
      userId: userId || 'unknown',
      snoozeMinutes: minutes,
      reactivateAt: new Date(Date.now() + minutes * 60000),
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      processed: false,
    });

    return res.status(200).json({
      success: true,
      sku,
      snoozedFor: `${minutes} minutes`,
      reactivateAt: new Date(Date.now() + minutes * 60000).toISOString(),
    });
  } catch (err) {
    console.error('Snooze error:', err);
    return res.status(500).json({ error: err.message });
  }
}
