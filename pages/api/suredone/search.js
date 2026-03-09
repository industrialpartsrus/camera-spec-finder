// pages/api/suredone/search.js
// Keyword search across SureDone inventory
// Uses SureDone Search API: GET /v1/search/items/{query}

import { getSureDoneCredentials } from '../../../lib/suredone-config';

const SUREDONE_URL = 'https://api.suredone.com';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed. Use GET.' });
  }

  const { query, inStock, limit = 25 } = req.query;

  if (!query || query.trim().length < 2) {
    return res.status(400).json({ success: false, error: 'Query too short' });
  }

  try {
    const creds = getSureDoneCredentials();

    // SureDone Search API: GET /v1/search/items/{searchTerms}
    const searchTerms = encodeURIComponent(query.trim());
    const url = `${SUREDONE_URL}/v1/search/items/${searchTerms}`;

    console.log('SureDone search:', query, '→', url);

    const response = await fetch(url, {
      headers: {
        'X-Auth-User': creds.user,
        'X-Auth-Token': creds.token,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('SureDone search error:', response.status, errorText);
      return res.status(500).json({
        success: false,
        error: `SureDone API error: ${response.status}`,
      });
    }

    const data = await response.json();

    // SureDone returns results with numeric keys ("0", "1", "2", etc.)
    // Plus metadata keys like "total_results", "current_page", etc.
    const results = [];
    for (const key in data) {
      if (!isNaN(key) && data[key] && data[key].guid) {
        const item = data[key];

        // Optional: filter by stock
        if (inStock === 'true') {
          const stock = parseInt(item.stock) || 0;
          if (stock <= 0) continue;
        }

        results.push({
          sku: item.guid,
          title: item.title || '',
          brand: item.brand || '',
          mpn: item.mpn || '',
          price: item.price || '',
          stock: item.stock || '0',
          condition: item.condition || '',
          media1: item.media1 || '',
          ebaycatid: item.ebaycatid || '',
          usertype: item.usertype || '',
          shelf: item.shelf || '',
        });

        if (results.length >= parseInt(limit)) break;
      }
    }

    console.log(`Search "${query}": ${results.length} results`);

    return res.status(200).json({
      success: true,
      count: results.length,
      results,
    });
  } catch (error) {
    console.error('Search error:', error);
    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
}
