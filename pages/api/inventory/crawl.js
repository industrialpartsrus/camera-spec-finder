// ============================================================
// /pages/api/inventory/crawl.js
// Listing Health Crawler — pulls all SureDone listings,
// scores them, saves results to Firebase, queues worst for refresh
// ============================================================

import admin from 'firebase-admin';
import { scoreListingQuality, calculateRefreshPriority } from '../../../lib/listingScorer';

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(
      JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON)
    ),
  });
}

const db = admin.firestore();

const SUREDONE_USER = process.env.SUREDONE_API_USER;
const SUREDONE_TOKEN = process.env.SUREDONE_API_TOKEN;
const SUREDONE_BASE = 'https://api.suredone.com/v1';

// Configuration
const PAGE_SIZE = 20; // SureDone always returns 20 per page, ignores limit param
const REFRESH_QUEUE_SIZE = 20;
const MIN_SCORE_THRESHOLD = 60;
const MAX_HEALTH_WRITES = 500;
const MAX_PAGES = 400; // Safety cap: 400 pages × 20 = 8,000 items
const MAX_RUNTIME = 4.5 * 60 * 1000; // 4.5 minutes — stop before Vercel 5-min timeout

export const config = {
  maxDuration: 300, // 5 minutes — crawling thousands of items takes time
};

export default async function handler(req, res) {
  // Auth check — admin or cron secret
  const authHeader = req.headers.authorization;
  const cronSecret = req.headers['x-cron-secret'];

  if (cronSecret !== process.env.CRON_SECRET &&
      authHeader !== `Bearer ${process.env.CRON_SECRET}` &&
      authHeader !== `Bearer ${process.env.INTERNAL_API_KEY}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (!SUREDONE_USER || !SUREDONE_TOKEN) {
    return res.status(500).json({ error: 'SureDone credentials not configured' });
  }

  const START_TIME = Date.now();

  try {
    // Step 1: Pull all items from SureDone using /editor/items (paginated, 20 per page)
    let page = 1;
    let allResults = [];
    let hasMore = true;
    let fetchErrors = 0;
    let timedOut = false;

    console.log('Crawl started — fetching items from SureDone /editor/items...');

    while (hasMore && page <= MAX_PAGES) {
      // Safety: stop before Vercel timeout
      if (Date.now() - START_TIME > MAX_RUNTIME) {
        console.warn(`Approaching timeout at page ${page}, stopping crawl with ${allResults.length} items`);
        timedOut = true;
        break;
      }

      try {
        const batch = await fetchSuredonePage(page);

        if (batch.length === 0) {
          hasMore = false;
          break;
        }

        // Score each item
        for (const item of batch) {
          const quality = scoreListingQuality(item);
          const priority = calculateRefreshPriority(item, quality);

          allResults.push({
            sku: item.guid || '',
            title: (item.title || '').substring(0, 200),
            brand: item.brand || '',
            mpn: item.mpn || '',
            price: parseFloat(item.price) || 0,
            stock: parseInt(item.stock) || 0,
            condition: item.condition || '',
            media1: item.media1 || '',
            ebaycatid: item.ebaycatid || '',
            usertype: item.usertype || '',
            score: quality.score,
            grade: quality.grade,
            issues: quality.issues,
            issueCount: quality.issueCount,
            photoCount: quality.photoCount,
            specsCount: quality.specsCount,
            priority: priority.priority,
            ageMonths: priority.ageMonths,
          });
        }

        if (page % 50 === 0) {
          console.log(`Crawl progress: page ${page}, ${allResults.length} items scored (${Math.round((Date.now() - START_TIME) / 1000)}s elapsed)`);
        }

        // SureDone returns exactly 20 per page; fewer means last page
        if (batch.length < PAGE_SIZE) {
          hasMore = false;
        } else {
          page++;
        }
      } catch (batchError) {
        console.error(`Page ${page} error:`, batchError.message);
        fetchErrors++;
        if (fetchErrors >= 3) {
          console.error('Too many fetch errors, stopping crawl');
          hasMore = false;
        } else {
          page++; // Skip failed page and continue
        }
      }
    }

    console.log(`Crawl fetch complete: ${allResults.length} items from ${page} pages in ${Math.round((Date.now() - START_TIME) / 1000)}s`);

    if (allResults.length === 0) {
      return res.status(200).json({
        success: true,
        totalItems: 0,
        message: 'No items found in SureDone',
      });
    }

    // Step 2: Sort by priority (highest = worst listings first)
    allResults.sort((a, b) => b.priority - a.priority);

    // Step 3: Calculate aggregate stats
    const avgScore = Math.round(
      allResults.reduce((sum, r) => sum + r.score, 0) / allResults.length
    );
    const gradeDistribution = {
      A: allResults.filter(r => r.grade === 'A').length,
      B: allResults.filter(r => r.grade === 'B').length,
      C: allResults.filter(r => r.grade === 'C').length,
      D: allResults.filter(r => r.grade === 'D').length,
      F: allResults.filter(r => r.grade === 'F').length,
    };
    const worstItems = allResults.filter(r => r.score < MIN_SCORE_THRESHOLD);

    // Count top issues across all items
    const issueCounts = {};
    allResults.forEach(r => {
      r.issues.forEach(issue => {
        issueCounts[issue.message] = (issueCounts[issue.message] || 0) + 1;
      });
    });
    const topIssues = Object.entries(issueCounts)
      .map(([message, count]) => ({ message, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // Step 4: Save to Firebase using batched writes
    // Save worst items to inventoryHealth collection
    const writeItems = worstItems.slice(0, MAX_HEALTH_WRITES);
    const batchSize = 450; // Firestore batch limit is 500
    for (let i = 0; i < writeItems.length; i += batchSize) {
      const chunk = writeItems.slice(i, i + batchSize);
      const writeBatch = db.batch();

      for (const item of chunk) {
        const ref = db.collection('inventoryHealth').doc(item.sku);
        writeBatch.set(ref, {
          ...item,
          lastScored: admin.firestore.FieldValue.serverTimestamp(),
        }, { merge: true });
      }

      await writeBatch.commit();
    }

    // Step 5: Queue top N worst for refresh in Pro Builder
    let queuedCount = 0;
    const refreshCandidates = worstItems.slice(0, REFRESH_QUEUE_SIZE * 2); // Check extra in case some skip

    for (const item of refreshCandidates) {
      if (queuedCount >= REFRESH_QUEUE_SIZE) break;

      // Check if recently refreshed
      const healthDoc = await db.collection('inventoryHealth').doc(item.sku).get();
      if (healthDoc.exists) {
        const data = healthDoc.data();
        if (data.lastRefreshed) {
          const lastRefresh = data.lastRefreshed.toDate();
          const daysSince = (Date.now() - lastRefresh.getTime()) / (1000 * 60 * 60 * 24);
          if (daysSince < 30) continue;
        }
      }

      // Check if already in products queue
      const existingProduct = await db.collection('products').doc(item.sku).get();
      if (existingProduct.exists) {
        const status = existingProduct.data().status;
        if (['pending', 'searching', 'complete', 'photos_complete', 'ready_to_list'].includes(status)) {
          continue; // Already being worked on
        }
      }

      // Add to Pro Builder refresh queue
      await db.collection('products').doc(item.sku).set({
        guid: item.sku,
        title: item.title,
        brand: item.brand,
        mpn: item.mpn,
        price: item.price,
        stock: item.stock,
        condition: item.condition,
        status: 'refresh',
        qualityScore: item.score,
        qualityGrade: item.grade,
        qualityIssues: item.issues,
        refreshPriority: item.priority,
        refreshQueuedAt: admin.firestore.FieldValue.serverTimestamp(),
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        createdBy: 'crawl-bot',
        media1: item.media1,
      }, { merge: true });

      queuedCount++;
    }

    // Step 6: Save crawl history
    const elapsedMs = Date.now() - START_TIME;
    await db.collection('crawlHistory').add({
      completedAt: admin.firestore.FieldValue.serverTimestamp(),
      elapsedMs,
      totalItems: allResults.length,
      averageScore: avgScore,
      gradeDistribution,
      itemsBelowThreshold: worstItems.length,
      queuedForRefresh: queuedCount,
      topIssues,
      fetchErrors,
      timedOut,
      pagesProcessed: page,
    });

    // Step 7: Notify admin
    try {
      const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://camera-spec-finder.vercel.app';
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
          message: `Inventory crawl: ${allResults.length} listings scored (${page} pages${timedOut ? ', timed out' : ''}). Avg: ${avgScore}/100. ${worstItems.length} need attention. ${queuedCount} queued for refresh.`,
        }),
      });
    } catch (e) {
      console.warn('Failed to notify admin:', e.message);
    }

    return res.status(200).json({
      success: true,
      elapsedMs,
      timedOut,
      pagesProcessed: page,
      totalItems: allResults.length,
      averageScore: avgScore,
      gradeDistribution,
      itemsBelowThreshold: worstItems.length,
      queuedForRefresh: queuedCount,
      topIssues: topIssues.slice(0, 5),
      worstItems: allResults.slice(0, 10).map(r => ({
        sku: r.sku,
        title: r.title,
        score: r.score,
        grade: r.grade,
        price: r.price,
        priority: r.priority,
        issues: r.issues.map(i => i.message),
      })),
    });
  } catch (err) {
    console.error('Crawl error:', err);
    return res.status(500).json({ error: err.message, elapsedMs: Date.now() - START_TIME });
  }
}

// ============================================================
// Fetch a single page of items from SureDone /editor/items
// Returns up to 20 items per page (SureDone fixed page size)
// ============================================================
async function fetchSuredonePage(page) {
  const url = `${SUREDONE_BASE}/editor/items?page=${page}`;

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'X-Auth-User': SUREDONE_USER,
      'X-Auth-Token': SUREDONE_TOKEN,
    },
  });

  if (!response.ok) {
    throw new Error(`SureDone API error: ${response.status}`);
  }

  const data = await response.json();

  // SureDone returns items as numeric keys "1", "2", ... "20"
  const items = [];
  for (const key of Object.keys(data)) {
    if (!isNaN(key) && data[key] && data[key].guid) {
      items.push(data[key]);
    }
  }

  return items;
}
