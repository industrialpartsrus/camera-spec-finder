// /pages/api/devices/remove.js
// Remove registered devices for a user (cleanup duplicate registrations)

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

  const { userId, deviceId, removeAll } = req.body;

  if (!userId) {
    return res.status(400).json({ error: 'userId required' });
  }

  try {
    if (removeAll) {
      const devices = await db.collection('users')
        .doc(userId).collection('devices').get();

      if (devices.empty) {
        return res.status(200).json({ removed: 0 });
      }

      const batch = db.batch();
      devices.forEach(docSnap => batch.delete(docSnap.ref));
      await batch.commit();

      return res.status(200).json({ removed: devices.size });
    }

    if (!deviceId) {
      return res.status(400).json({ error: 'deviceId required (or set removeAll: true)' });
    }

    await db.collection('users')
      .doc(userId).collection('devices').doc(deviceId).delete();

    return res.status(200).json({ removed: 1 });
  } catch (err) {
    console.error('Device remove error:', err);
    return res.status(500).json({ error: err.message });
  }
}
