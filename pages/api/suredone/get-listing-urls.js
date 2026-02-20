// /pages/api/suredone/get-listing-urls.js
// Returns marketplace listing URLs for a given SKU
// Checks eBay, BigCommerce, and SureDone editor links

const SUREDONE_BASE = 'https://api.suredone.com/v1';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { sku } = req.query;

  if (!sku) {
    return res.status(400).json({ error: 'sku required' });
  }

  const headers = {
    'X-Auth-User': process.env.SUREDONE_API_USER || process.env.SUREDONE_USER,
    'X-Auth-Token': process.env.SUREDONE_API_TOKEN || process.env.SUREDONE_TOKEN,
    'Content-Type': 'application/json',
  };

  if (!headers['X-Auth-User'] || !headers['X-Auth-Token']) {
    return res.status(500).json({ error: 'SureDone credentials not configured' });
  }

  try {
    const itemRes = await fetch(
      `${SUREDONE_BASE}/editor/items/${encodeURIComponent(sku)}`,
      { headers }
    );

    if (!itemRes.ok) {
      return res.status(itemRes.status).json({ error: `SureDone API error: ${itemRes.status}` });
    }

    const item = await itemRes.json();

    // Find eBay item ID — check known field names
    let ebayItemId = null;
    const ebayFields = ['ebayid', 'ebayitemid', 'ebaynewid', 'ebaylistingid', 'ebay_item_id'];
    for (const field of ebayFields) {
      if (item[field] && item[field].toString().length > 5) {
        ebayItemId = item[field].toString();
        break;
      }
    }
    // Fallback: check any key containing 'ebay' and 'id'
    if (!ebayItemId) {
      for (const key of Object.keys(item)) {
        if (key.toLowerCase().includes('ebay') && key.toLowerCase().includes('id') &&
            item[key] && item[key].toString().length > 5) {
          ebayItemId = item[key].toString();
          break;
        }
      }
    }

    // Find BigCommerce ID
    let bigcommerceId = null;
    const bcFields = ['bigcommerceid', 'bigcommerceurl', 'bcid', 'bigcommerce'];
    for (const field of bcFields) {
      if (item[field] && item[field].toString().length > 0) {
        bigcommerceId = item[field].toString();
        break;
      }
    }

    // Build BigCommerce URL from slug or SKU
    const bcSlug = item.slug || item.customurl || sku;
    const bigcommerceUrl = bigcommerceId
      ? `https://www.industrialpartsrus.com/${bcSlug}`
      : null;

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
