// pages/api/ebay/taxonomy-search.js
// Proxy for SureDone eBay taxonomy search API
// Searches across all eBay categories (160k+) by keyword

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed. Use GET.' });
  }

  const { keyword } = req.query;

  if (!keyword || keyword.trim().length < 2) {
    return res.status(400).json({
      error: 'keyword query parameter required (minimum 2 characters)'
    });
  }

  const SUREDONE_USER = process.env.SUREDONE_USER;
  const SUREDONE_TOKEN = process.env.SUREDONE_TOKEN;
  const SUREDONE_URL = process.env.SUREDONE_URL || 'https://api.suredone.com/v1';

  if (!SUREDONE_USER || !SUREDONE_TOKEN) {
    return res.status(500).json({ error: 'SureDone credentials not configured' });
  }

  try {
    const url = `${SUREDONE_URL}/taxonomy/search/ebay/${encodeURIComponent(keyword)}`;

    console.log('=== TAXONOMY SEARCH DEBUG ===');
    console.log('URL:', url);
    console.log('Keyword:', keyword);
    console.log('Auth user:', SUREDONE_USER ? `set (${SUREDONE_USER.substring(0, 3)}***)` : 'MISSING');
    console.log('Auth token:', SUREDONE_TOKEN ? 'set' : 'MISSING');

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'X-Auth-User': SUREDONE_USER,
        'X-Auth-Token': SUREDONE_TOKEN
      }
    });

    console.log('Response status:', response.status);
    console.log('Response headers:', JSON.stringify(Object.fromEntries(response.headers)));

    const rawText = await response.text();
    console.log('Raw response text:', rawText.substring(0, 1000));
    console.log('Raw text length:', rawText.length);
    console.log('================================');

    if (!response.ok) {
      console.error('SureDone taxonomy API error:', response.status, rawText);
      return res.status(response.status).json({
        error: `SureDone API error: ${response.status}`,
        details: rawText
      });
    }

    // Parse the response
    let data;
    try {
      data = rawText ? JSON.parse(rawText) : null;
    } catch (parseErr) {
      console.error('JSON parse error:', parseErr.message);
      return res.status(500).json({
        error: 'Failed to parse SureDone response',
        details: parseErr.message,
        rawText: rawText.substring(0, 500)
      });
    }

    console.log('Parsed data:', JSON.stringify(data).substring(0, 500));

    if (!data) {
      console.error('SureDone returned null data');
      return res.status(500).json({
        error: 'SureDone returned null data',
        details: 'The taxonomy API returned an empty response. Check auth credentials and API URL.'
      });
    }

    // SureDone returns: { results: [{ id: "181732", name: "Circuit Breakers...", ... }] }
    // Format for UI: simpler structure with full category path
    const formatted = (data.results || []).map(cat => ({
      id: cat.id,
      name: cat.name || cat.categoryname || `Category ${cat.id}`,
      path: cat.path || cat.name || '' // Full breadcrumb path if available
    }));

    console.log(`Formatted ${formatted.length} categories`);

    return res.status(200).json({
      success: true,
      categories: formatted,
      count: formatted.length
    });

  } catch (error) {
    console.error('Taxonomy search error:', error);
    return res.status(500).json({
      error: 'Failed to search eBay categories',
      details: error.message
    });
  }
}
