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

  const SUREDONE_USER = process.env.SUREDONE_USER;
  const SUREDONE_TOKEN = process.env.SUREDONE_TOKEN;
  const SUREDONE_URL = process.env.SUREDONE_URL || 'https://api.suredone.com/v1';

  if (!SUREDONE_USER || !SUREDONE_TOKEN) {
    return res.status(500).json({ error: 'SureDone credentials not configured' });
  }

  try {
    // Build SureDone search query
    // Search across title, brand, mpn, and guid using wildcard
    // SureDone search syntax: field:*term* for wildcard matching
    // Use OR grouping to search multiple fields
    let searchQuery = `title:*${query}* OR brand:*${query}* OR mpn:*${query}* OR guid:*${query}*`;

    // Add filters
    if (brand) searchQuery += ` brand:${brand}`;
    if (inStock === 'true') searchQuery += ` stock:>0`;

    const searchUrl = `${SUREDONE_URL}/search/items/${encodeURIComponent(searchQuery)}`;

    const response = await fetch(searchUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'x-auth-user': SUREDONE_USER,
        'x-auth-token': SUREDONE_TOKEN,
      },
    });

    if (!response.ok) {
      // If OR syntax doesn't work, fall back to simple title search
      const fallbackQuery = `title:*${query}*` +
        (brand ? ` brand:${brand}` : '') +
        (inStock === 'true' ? ' stock:>0' : '');

      const fallbackUrl = `${SUREDONE_URL}/search/items/${encodeURIComponent(fallbackQuery)}`;
      const fallbackResponse = await fetch(fallbackUrl, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'x-auth-user': SUREDONE_USER,
          'x-auth-token': SUREDONE_TOKEN,
        },
      });

      if (!fallbackResponse.ok) {
        throw new Error(`SureDone API error: ${fallbackResponse.status}`);
      }

      const fallbackData = await fallbackResponse.json();
      const results = parseResults(fallbackData, parseInt(limit));
      return res.status(200).json({ success: true, count: results.length, results });
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
