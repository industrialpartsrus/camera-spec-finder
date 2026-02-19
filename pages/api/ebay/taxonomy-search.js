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

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'X-Auth-User': SUREDONE_USER,
        'X-Auth-Token': SUREDONE_TOKEN
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('SureDone taxonomy API error:', response.status, errorText);
      return res.status(response.status).json({
        error: `SureDone API error: ${response.status}`,
        details: errorText
      });
    }

    const data = await response.json();

    // DEBUG: Log raw response format on first call
    console.log('SureDone taxonomy raw response:', JSON.stringify(data).substring(0, 500));

    // SureDone returns: { results: [{ id: "181732", name: "Circuit Breakers...", ... }] }
    // Format for UI: simpler structure with full category path
    const formatted = (data.results || []).map(cat => ({
      id: cat.id,
      name: cat.name || cat.categoryname || `Category ${cat.id}`,
      path: cat.path || cat.name || '' // Full breadcrumb path if available
    }));

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
