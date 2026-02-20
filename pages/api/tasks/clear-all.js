// /pages/api/tasks/clear-all.js
// Emergency endpoint: expire ALL pending/acknowledged part requests
// Used to stop notification spam

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

  // Auth check
  const authHeader = req.headers.authorization;
  const internalKey = req.headers['x-internal-key'];
  if (!authHeader?.includes(process.env.INTERNAL_API_KEY) && internalKey !== process.env.INTERNAL_API_KEY) {
    if (!req.body.apiKey || req.body.apiKey !== process.env.INTERNAL_API_KEY) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
  }

  try {
    const pending = await db.collection('partRequests')
      .where('status', 'in', ['pending', 'acknowledged'])
      .get();

    if (pending.empty) {
      return res.status(200).json({ cleared: 0, message: 'No pending requests found' });
    }

    // Firestore batch limit is 500
    const batchSize = 450;
    let cleared = 0;

    for (let i = 0; i < pending.docs.length; i += batchSize) {
      const chunk = pending.docs.slice(i, i + batchSize);
      const batch = db.batch();
      chunk.forEach(docSnap => {
        batch.update(docSnap.ref, {
          status: 'expired',
          expiredAt: admin.firestore.FieldValue.serverTimestamp(),
          expiredReason: 'manual_clear_all',
        });
      });
      await batch.commit();
      cleared += chunk.length;
    }

    console.log(`Clear-all: expired ${cleared} pending requests`);
    return res.status(200).json({
      cleared,
      message: `Expired ${cleared} pending requests`,
    });
  } catch (err) {
    console.error('Clear-all error:', err);
    return res.status(500).json({ error: err.message });
  }
}
