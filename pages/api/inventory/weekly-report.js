// ============================================================
// /pages/api/inventory/weekly-report.js
// Weekly Inventory Health Report — compares this week's crawl
// to last week's, sends summary push notification to Scott
// Cron: Sunday 8 PM EST (Monday 1 AM UTC) — "0 1 * * 0"
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

export const config = {
  maxDuration: 30,
};

export default async function handler(req, res) {
  // Auth check — cron secret or internal key
  const authHeader = req.headers.authorization;
  const cronSecret = req.headers['x-cron-secret'];

  if (cronSecret !== process.env.CRON_SECRET &&
      authHeader !== `Bearer ${process.env.CRON_SECRET}` &&
      authHeader !== `Bearer ${process.env.INTERNAL_API_KEY}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    // Get the two most recent crawl results
    const crawlSnap = await db.collection('crawlHistory')
      .orderBy('completedAt', 'desc')
      .limit(2)
      .get();

    if (crawlSnap.empty) {
      return res.status(200).json({ success: true, message: 'No crawl history found' });
    }

    const crawls = [];
    crawlSnap.forEach(doc => crawls.push(doc.data()));

    const latest = crawls[0];
    const previous = crawls[1] || null;

    // Get refresh activity this week
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);

    const refreshSnap = await db.collection('inventoryHealth')
      .where('lastRefreshed', '>=', admin.firestore.Timestamp.fromDate(weekAgo))
      .get();

    let refreshedCount = 0;
    let totalBefore = 0;
    let totalAfter = 0;
    let totalValue = 0;

    refreshSnap.forEach(doc => {
      const data = doc.data();
      refreshedCount++;
      if (data.previousScore != null) totalBefore += data.previousScore;
      if (data.currentScore != null) totalAfter += data.currentScore;
      if (data.price) totalValue += parseFloat(data.price) || 0;
    });

    const avgBefore = refreshedCount > 0 ? Math.round(totalBefore / refreshedCount) : 0;
    const avgAfter = refreshedCount > 0 ? Math.round(totalAfter / refreshedCount) : 0;

    // Get remaining refresh queue size
    const refreshQueueSnap = await db.collection('products')
      .where('status', '==', 'refresh')
      .get();

    // Build the report message
    const scoreDelta = previous
      ? `${previous.averageScore || 0}→${latest.averageScore || 0}`
      : `${latest.averageScore || 0}/100`;

    const topIssue = latest.topIssues && latest.topIssues.length > 0
      ? `Top issue: ${latest.topIssues[0].message} (${latest.topIssues[0].count?.toLocaleString()})`
      : '';

    const message = [
      `Weekly Report: ${refreshedCount} listings refreshed.`,
      `Avg score: ${scoreDelta}.`,
      totalValue > 0 ? `$${Math.round(totalValue / 1000)}K in inventory value improved.` : '',
      `${latest.itemsBelowThreshold || 0} listings still need attention.`,
      topIssue,
    ].filter(Boolean).join(' ');

    // Send push notification to Scott
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://camera-spec-finder.vercel.app';
    try {
      await fetch(`${siteUrl}/api/notify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-internal-key': process.env.INTERNAL_API_KEY,
        },
        body: JSON.stringify({
          userId: 'scott',
          type: 'retrieve',
          sku: '',
          message,
          actionUrl: '/dashboard',
        }),
      });
    } catch (e) {
      console.warn('Failed to send weekly report notification:', e.message);
    }

    // Save report to Firestore
    await db.collection('weeklyReports').add({
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      weekEnding: admin.firestore.Timestamp.fromDate(new Date()),
      currentAvgScore: latest.averageScore || 0,
      previousAvgScore: previous?.averageScore || null,
      totalItems: latest.totalItems || 0,
      itemsBelowThreshold: latest.itemsBelowThreshold || 0,
      gradeDistribution: latest.gradeDistribution || {},
      refreshedCount,
      avgScoreBefore: avgBefore,
      avgScoreAfter: avgAfter,
      totalValueRefreshed: Math.round(totalValue),
      queueRemaining: refreshQueueSnap.size,
      topIssues: latest.topIssues || [],
      message,
    });

    return res.status(200).json({
      success: true,
      message,
      refreshedCount,
      currentAvgScore: latest.averageScore,
      previousAvgScore: previous?.averageScore || null,
      queueRemaining: refreshQueueSnap.size,
    });
  } catch (err) {
    console.error('Weekly report error:', err);
    return res.status(500).json({ error: err.message });
  }
}
