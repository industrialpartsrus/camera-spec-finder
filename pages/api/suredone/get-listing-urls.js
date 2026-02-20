// ============================================================
// /pages/api/suredone/get-listing-urls.js
// Returns marketplace listing URLs for a given SKU
// Uses /search/items/guid:={sku} to fetch item (confirmed working)
// ============================================================

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { sku } = req.query;

  if (!sku) {
    return res.status(400).json({ error: 'sku required' });
  }

  const SUREDONE_USER = process.env.SUREDONE_API_USER || process.env.SUREDONE_USER;
  const SUREDONE_TOKEN = process.env.SUREDONE_API_TOKEN || process.env.SUREDONE_TOKEN;
  const SUREDONE_URL = process.env.SUREDONE_URL || 'https://api.suredone.com/v1';

  if (!SUREDONE_USER || !SUREDONE_TOKEN) {
    return res.status(500).json({ error: 'SureDone credentials not configured' });
  }

  try {
    // Use search endpoint with exact guid match (confirmed working)
    const searchUrl = `${SUREDONE_URL}/search/items/${encodeURIComponent(`guid:=${sku}`)}`;
    const itemRes = await fetch(searchUrl, {
      headers: {
        'X-Auth-User': SUREDONE_USER,
        'X-Auth-Token': SUREDONE_TOKEN,
        'Content-Type': 'application/json',
      },
    });

    if (!itemRes.ok) {
      return res.status(itemRes.status).json({ error: `SureDone API error: ${itemRes.status}` });
    }

    const data = await itemRes.json();

    // Find the matching item in search results (numeric keys)
    let item = null;
    for (const key of Object.keys(data)) {
      if (!isNaN(key) && data[key]?.guid) {
        if (data[key].guid.toLowerCase() === sku.toLowerCase()) {
          item = data[key];
          break;
        }
      }
    }

    if (!item) {
      return res.status(200).json({
        sku,
        ebayItemId: null,
        ebayUrl: null,
        bigcommerceId: null,
        bigcommerceUrl: null,
        suredoneUrl: `https://app.suredone.com/#!/editor/item/${encodeURIComponent(sku)}`,
      });
    }

    // Find eBay item ID — check known field names
    let ebayItemId = null;
    const ebayFields = ['ebayid', 'ebayitemid', 'ebaynewid', 'ebaylistingid'];
    for (const field of ebayFields) {
      if (item[field] && item[field].toString().length > 5) {
        ebayItemId = item[field].toString();
        break;
      }
    }
    // Fallback: any key containing 'ebay' and 'id'
    if (!ebayItemId) {
      for (const key of Object.keys(item)) {
        if (key.toLowerCase().includes('ebay') &&
            key.toLowerCase().includes('id') &&
            item[key] && item[key].toString().length > 5) {
          ebayItemId = item[key].toString();
          break;
        }
      }
    }

    // Find BigCommerce ID
    let bigcommerceId = null;
    const bcIdFields = ['bigcommerceid', 'bigcommerceproductid', 'bcid'];
    for (const field of bcIdFields) {
      if (item[field] && item[field].toString().length > 0) {
        bigcommerceId = item[field].toString();
        break;
      }
    }

    // Build BigCommerce URL from slug or ID
    const bcSlug = item.slug || item.customurl;
    let bigcommerceUrl = null;
    if (bcSlug) {
      bigcommerceUrl = `https://www.industrialpartsrus.com/${bcSlug}`;
    } else if (bigcommerceId) {
      bigcommerceUrl = `https://www.industrialpartsrus.com/?id=${bigcommerceId}`;
    }

    return res.status(200).json({
      sku,
      ebayItemId,
      ebayUrl: ebayItemId ? `https://www.ebay.com/itm/${ebayItemId}` : null,
      bigcommerceId,
      bigcommerceUrl,
      suredoneUrl: `https://app.suredone.com/#!/editor/item/${encodeURIComponent(sku)}`,
    });
  } catch (err) {
    console.error('Get listing URLs error:', err);
    return res.status(500).json({ error: err.message });
  }
}
