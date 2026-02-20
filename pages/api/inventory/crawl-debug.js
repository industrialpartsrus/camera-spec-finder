// ============================================================
// /pages/api/inventory/crawl-debug.js
// Debug endpoint — tries multiple SureDone API approaches
// and returns RAW responses to diagnose the crawler returning 0 items
// ============================================================

export default async function handler(req, res) {
  const SUREDONE_USER = process.env.SUREDONE_USER;
  const SUREDONE_TOKEN = process.env.SUREDONE_TOKEN;
  const SUREDONE_URL = process.env.SUREDONE_URL || 'https://api.suredone.com/v1';

  if (!SUREDONE_USER || !SUREDONE_TOKEN) {
    return res.status(500).json({ error: 'Missing SUREDONE_USER or SUREDONE_TOKEN env vars' });
  }

  // Auth check
  const authHeader = req.headers.authorization;
  const cronSecret = req.headers['x-cron-secret'];
  if (cronSecret !== process.env.CRON_SECRET &&
      authHeader !== `Bearer ${process.env.CRON_SECRET}` &&
      authHeader !== `Bearer ${process.env.INTERNAL_API_KEY}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const results = {
    env: {
      SUREDONE_USER: SUREDONE_USER ? `${SUREDONE_USER.substring(0, 3)}...` : 'MISSING',
      SUREDONE_TOKEN: SUREDONE_TOKEN ? `${SUREDONE_TOKEN.substring(0, 3)}...${SUREDONE_TOKEN.slice(-3)}` : 'MISSING',
      SUREDONE_URL,
    },
  };

  // Attempt 1: GET /v1/editor/items (no search, just list — this is what many working endpoints use)
  try {
    const url1 = `${SUREDONE_URL}/editor/items?limit=5`;
    const r1 = await fetch(url1, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'X-Auth-User': SUREDONE_USER,
        'X-Auth-Token': SUREDONE_TOKEN,
      },
    });
    const body1 = await r1.json();
    results.attempt1 = {
      label: 'GET /v1/editor/items?limit=5',
      status: r1.status,
      responseKeys: Object.keys(body1).slice(0, 20),
      responseType: Array.isArray(body1) ? 'array' : typeof body1,
      numericKeys: Object.keys(body1).filter(k => !isNaN(k)).slice(0, 5),
      hasResult: body1.result,
      totalFound: body1.total || body1.count || body1.results?.length || 'unknown',
    };
    // Show first item sample
    const firstNumKey = Object.keys(body1).find(k => !isNaN(k));
    if (firstNumKey) {
      results.attempt1.sampleItemKeys = Object.keys(body1[firstNumKey]).slice(0, 30);
      results.attempt1.sampleItem = {
        guid: body1[firstNumKey].guid,
        title: (body1[firstNumKey].title || '').substring(0, 80),
        brand: body1[firstNumKey].brand,
        mpn: body1[firstNumKey].mpn,
        price: body1[firstNumKey].price,
        stock: body1[firstNumKey].stock,
      };
    }
    // Also check for items in other formats
    if (Array.isArray(body1)) {
      results.attempt1.firstArrayItem = body1[0] ? { guid: body1[0].guid, title: body1[0].title?.substring(0, 80) } : null;
    }
    if (body1.results) {
      results.attempt1.resultsType = typeof body1.results;
      results.attempt1.resultsLength = Array.isArray(body1.results) ? body1.results.length : Object.keys(body1.results).length;
    }
  } catch (e) {
    results.attempt1 = { error: e.message };
  }

  // Attempt 2: GET /v1/editor/items with page param
  try {
    const url2 = `${SUREDONE_URL}/editor/items?page=1&limit=5`;
    const r2 = await fetch(url2, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'X-Auth-User': SUREDONE_USER,
        'X-Auth-Token': SUREDONE_TOKEN,
      },
    });
    const body2 = await r2.json();
    results.attempt2 = {
      label: 'GET /v1/editor/items?page=1&limit=5',
      status: r2.status,
      responseKeys: Object.keys(body2).slice(0, 20),
      numericKeys: Object.keys(body2).filter(k => !isNaN(k)).slice(0, 5),
    };
    const firstNumKey2 = Object.keys(body2).find(k => !isNaN(k));
    if (firstNumKey2) {
      results.attempt2.sampleItem = {
        guid: body2[firstNumKey2].guid,
        title: (body2[firstNumKey2].title || '').substring(0, 80),
      };
    }
  } catch (e) {
    results.attempt2 = { error: e.message };
  }

  // Attempt 3: Search with guid:* (what the crawler uses)
  try {
    const searchQuery = 'guid:*';
    const url3 = `${SUREDONE_URL}/search/items/${encodeURIComponent(searchQuery)}?page=1&limit=5`;
    const r3 = await fetch(url3, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'X-Auth-User': SUREDONE_USER,
        'X-Auth-Token': SUREDONE_TOKEN,
      },
    });
    const body3 = await r3.json();
    results.attempt3 = {
      label: `GET /v1/search/items/${searchQuery}?page=1&limit=5`,
      status: r3.status,
      responseKeys: Object.keys(body3).slice(0, 20),
      numericKeys: Object.keys(body3).filter(k => !isNaN(k)).slice(0, 5),
    };
    const firstNumKey3 = Object.keys(body3).find(k => !isNaN(k));
    if (firstNumKey3) {
      results.attempt3.sampleItem = {
        guid: body3[firstNumKey3].guid,
        title: (body3[firstNumKey3].title || '').substring(0, 80),
      };
    }
    if (body3.result) results.attempt3.result = body3.result;
    if (body3.errors) results.attempt3.errors = body3.errors;
  } catch (e) {
    results.attempt3 = { error: e.message };
  }

  // Attempt 4: Search all with wildcard (alternative syntax)
  try {
    const url4 = `${SUREDONE_URL}/editor/items/search/all/*?limit=5`;
    const r4 = await fetch(url4, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'X-Auth-User': SUREDONE_USER,
        'X-Auth-Token': SUREDONE_TOKEN,
      },
    });
    const body4 = await r4.json();
    results.attempt4 = {
      label: 'GET /v1/editor/items/search/all/*?limit=5',
      status: r4.status,
      responseKeys: Object.keys(body4).slice(0, 20),
      numericKeys: Object.keys(body4).filter(k => !isNaN(k)).slice(0, 5),
    };
    const firstNumKey4 = Object.keys(body4).find(k => !isNaN(k));
    if (firstNumKey4) {
      results.attempt4.sampleItem = {
        guid: body4[firstNumKey4].guid,
        title: (body4[firstNumKey4].title || '').substring(0, 80),
      };
    }
    if (body4.result) results.attempt4.result = body4.result;
    if (body4.errors) results.attempt4.errors = body4.errors;
  } catch (e) {
    results.attempt4 = { error: e.message };
  }

  // Attempt 5: v3 API
  try {
    const url5 = 'https://api.suredone.com/v3/editor/items?limit=5';
    const r5 = await fetch(url5, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'X-Auth-User': SUREDONE_USER,
        'X-Auth-Token': SUREDONE_TOKEN,
      },
    });
    const body5 = await r5.json();
    results.attempt5 = {
      label: 'GET /v3/editor/items?limit=5',
      status: r5.status,
      responseKeys: Object.keys(body5).slice(0, 20),
      numericKeys: Object.keys(body5).filter(k => !isNaN(k)).slice(0, 5),
    };
    const firstNumKey5 = Object.keys(body5).find(k => !isNaN(k));
    if (firstNumKey5) {
      results.attempt5.sampleItem = {
        guid: body5[firstNumKey5].guid,
        title: (body5[firstNumKey5].title || '').substring(0, 80),
      };
    }
    if (body5.result) results.attempt5.result = body5.result;
    if (body5.errors) results.attempt5.errors = body5.errors;
  } catch (e) {
    results.attempt5 = { error: e.message };
  }

  // Attempt 6: The exact same fetch the crawler does (lowercase headers)
  try {
    const searchQuery = 'guid:*';
    const url6 = `${SUREDONE_URL}/search/items/${encodeURIComponent(searchQuery)}?page=1&limit=5`;
    const r6 = await fetch(url6, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'x-auth-user': SUREDONE_USER,
        'x-auth-token': SUREDONE_TOKEN,
      },
    });
    results.attempt6 = {
      label: 'GET search/items/guid:* with LOWERCASE headers (what crawler uses)',
      status: r6.status,
      ok: r6.ok,
    };
    if (r6.ok) {
      const body6 = await r6.json();
      results.attempt6.responseKeys = Object.keys(body6).slice(0, 20);
      results.attempt6.numericKeys = Object.keys(body6).filter(k => !isNaN(k)).slice(0, 5);
      if (body6.result) results.attempt6.result = body6.result;
    } else {
      results.attempt6.statusText = r6.statusText;
      try { results.attempt6.errorBody = await r6.text(); } catch (e) { /* ignore */ }
    }
  } catch (e) {
    results.attempt6 = { error: e.message };
  }

  // Summary
  results.summary = {
    note: 'Check which attempt returns actual items. The crawler currently uses attempt3/attempt6 pattern (search/items/guid:*). If those return 0 but attempt1 works, we need to switch the crawler to use /editor/items instead.',
  };

  return res.status(200).json(results);
}
