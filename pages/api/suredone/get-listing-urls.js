// ============================================================
// /pages/api/suredone/get-listing-urls.js
// Returns marketplace listing URLs for a given SKU
// Uses /search/items/guid:={sku} to fetch item (confirmed working)
// Always returns suredoneUrl even if API call fails
// ============================================================

import { getSureDoneCredentials } from '../../../lib/suredone-config';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { sku } = req.query;

  if (!sku) {
    return res.status(400).json({ error: 'SKU required' });
  }

  const { user, token } = getSureDoneCredentials();

  // Always return a SureDone editor link (doesn't depend on API call)
  const suredoneUrl = `https://app.suredone.com/#!/editor/item/${encodeURIComponent(sku)}`;

  let ebayUrl = null;
  let bigcommerceUrl = null;

  try {
    // Fetch item data from SureDone using search API (confirmed working)
    const searchUrl = `https://api.suredone.com/v1/search/items/${encodeURIComponent('guid:=' + sku)}`;

    const response = await fetch(searchUrl, {
      headers: {
        'X-Auth-User': user,
        'X-Auth-Token': token,
        'Content-Type': 'application/json',
      },
    });

    if (response.ok) {
      const data = await response.json();

      // Find the matching item in results (numeric keys)
      let item = null;
      for (const key of Object.keys(data)) {
        if (!isNaN(key) && data[key]?.guid) {
          if (data[key].guid.toUpperCase() === sku.toUpperCase()) {
            item = data[key];
            break;
          }
        }
      }

      if (item) {
        // Build eBay URL from ebayid — must be numeric and at least 6 digits
        const ebayId = item.ebayid || item.ebayitemid || '';
        if (ebayId && ebayId.toString().length >= 6 && /^\d+$/.test(ebayId.toString())) {
          ebayUrl = `https://www.ebay.com/itm/${ebayId}`;
        }

        // Build BigCommerce URL from slug or product ID
        // SureDone stores BC custom URL in bigcommercecustomurl, customurl, or slug
        const slug = item.bigcommercecustomurl || item.customurl || item.slug || '';
        const bcId = item.bigcommerceid || item.bigcommerceproductid || '';
        if (slug) {
          // Remove leading/trailing slashes
          const cleanSlug = slug.replace(/^\/|\/$/g, '');
          bigcommerceUrl = `https://www.industrialpartsrus.com/${cleanSlug}/`;
        } else if (bcId && bcId.toString().length > 0) {
          bigcommerceUrl = `https://www.industrialpartsrus.com/?id=${bcId}`;
        }

        console.log(`URLs for ${sku}: ebay=${ebayId || 'none'}, bc=${bcId || 'none'}, slug=${slug || 'none'}, bcCustomUrl=${item.bigcommercecustomurl || 'none'}`);
      } else {
        console.log(`No SureDone item found for SKU: ${sku}`);
      }
    }
  } catch (err) {
    console.warn('Error fetching listing URLs:', err.message);
    // Don't fail — still return the SureDone URL
  }

  return res.status(200).json({
    sku,
    suredoneUrl,
    ebayUrl,
    bigcommerceUrl,
  });
}
