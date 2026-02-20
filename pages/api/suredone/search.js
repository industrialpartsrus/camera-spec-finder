// pages/api/suredone/search.js
// Keyword search across SureDone inventory
// Searches title, brand, mpn, and guid fields

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed. Use GET.' });
  }

  const { query, brand, inStock, limit = '20' } = req.query;

  if (!query || query.length < 2) {
    return res.status(400).json({ error: 'Query must be at least 2 characters' });
  }

  const SUREDONE_USER = process.env.SUREDONE_API_USER;
  const SUREDONE_TOKEN = process.env.SUREDONE_API_TOKEN;
  const SUREDONE_BASE = 'https://api.suredone.com/v1';

  if (!SUREDONE_USER || !SUREDONE_TOKEN) {
    return res.status(500).json({ error: 'SureDone credentials not configured' });
  }

  try {
    // Use /editor/items/search/all/{keyword} — confirmed working via debug endpoint
    const searchUrl = `${SUREDONE_BASE}/editor/items/search/all/${encodeURIComponent(query)}`;

    const response = await fetch(searchUrl, {
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
    const results = parseResults(data, parseInt(limit));

    return res.status(200).json({
      success: true,
      count: results.length,
      results,
    });
  } catch (error) {
    console.error('SureDone search error:', error);
    return res.status(500).json({
      success: false,
      error: 'Search failed',
      details: error.message,
    });
  }
}

function parseResults(data, maxResults) {
  const results = [];

  if (!data || typeof data !== 'object') return results;

  // SureDone returns results with numeric keys or as an array
  const entries = Array.isArray(data)
    ? data
    : Object.values(data).filter(v => typeof v === 'object' && v !== null && v.guid);

  for (const item of entries) {
    if (!item.guid) continue;
    if (results.length >= maxResults) break;

    // Count images
    let imageCount = 0;
    for (let i = 1; i <= 12; i++) {
      if (item[`media${i}`]) imageCount++;
    }

    results.push({
      sku: item.guid || '',
      title: item.title || '',
      brand: item.brand || '',
      mpn: item.mpn || '',
      price: item.price || '',
      stock: item.stock || '0',
      condition: item.condition || '',
      media1: item.media1 || '',
      imageCount,
      ebaycatid: item.ebaycatid || '',
      usertype: item.usertype || '',
      shelf: item.shelf || '',
    });
  }

  return results;
}
