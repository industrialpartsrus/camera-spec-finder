// ============================================================
// /pages/api/suredone/listing-action.js
// Centralized endpoint for SureDone listing actions:
// start, add, edit, relist, end, delete — across eBay and BigCommerce
//
// SureDone requires: PUT /editor/items, form-urlencoded, guid identifier
// ============================================================

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { sku, action, channel = 'all' } = req.body;

  if (!sku || !action) {
    return res.status(400).json({ error: 'sku and action required' });
  }

  const validActions = ['start', 'add', 'edit', 'relist', 'end', 'delete'];
  if (!validActions.includes(action)) {
    return res.status(400).json({ error: `Invalid action. Valid: ${validActions.join(', ')}` });
  }

  const SUREDONE_USER = process.env.SUREDONE_API_USER || process.env.SUREDONE_USER;
  const SUREDONE_TOKEN = process.env.SUREDONE_API_TOKEN || process.env.SUREDONE_TOKEN;
  const SUREDONE_URL = process.env.SUREDONE_URL || 'https://api.suredone.com/v1';

  const headers = {
    'X-Auth-User': SUREDONE_USER,
    'X-Auth-Token': SUREDONE_TOKEN,
    'Content-Type': 'application/x-www-form-urlencoded',
  };

  if (!SUREDONE_USER || !SUREDONE_TOKEN) {
    return res.status(500).json({ error: 'SureDone credentials not configured' });
  }

  try {
    let result;

    if (action === 'relist') {
      // RELIST = end first, wait, then relist
      const endParams = new URLSearchParams();
      endParams.append('guid', sku);
      if (channel === 'all' || channel === 'ebay') {
        endParams.append('ebayaction', 'end');
      }
      if (channel === 'all' || channel === 'bigcommerce') {
        endParams.append('bigcommerceaction', 'end');
      }

      const endRes = await fetch(`${SUREDONE_URL}/editor/items`, {
        method: 'PUT',
        headers,
        body: endParams.toString(),
      });
      const endResult = await endRes.json();
      console.log(`[listing-action] End result for ${sku}:`, JSON.stringify(endResult));

      await new Promise(r => setTimeout(r, 3000));

      const relistParams = new URLSearchParams();
      relistParams.append('guid', sku);
      if (channel === 'all' || channel === 'ebay') {
        relistParams.append('ebayaction', 'relist');
      }
      if (channel === 'all' || channel === 'bigcommerce') {
        relistParams.append('bigcommerceaction', 'relist');
      }

      const relistRes = await fetch(`${SUREDONE_URL}/editor/items`, {
        method: 'PUT',
        headers,
        body: relistParams.toString(),
      });
      result = await relistRes.json();
      result.endResult = endResult;

    } else if (action === 'delete') {
      // DELETE removes from SureDone AND ends all channel listings
      const params = new URLSearchParams();
      params.append('action', 'delete');
      params.append('guid', sku);

      const delRes = await fetch(`${SUREDONE_URL}/editor/items`, {
        method: 'PUT',
        headers,
        body: params.toString(),
      });
      result = await delRes.json();

    } else if (action === 'end') {
      // END removes from channels but keeps in SureDone
      const params = new URLSearchParams();
      params.append('guid', sku);
      if (channel === 'all' || channel === 'ebay') {
        params.append('ebayaction', 'end');
      }
      if (channel === 'all' || channel === 'bigcommerce') {
        params.append('bigcommerceaction', 'end');
      }

      const endRes = await fetch(`${SUREDONE_URL}/editor/items`, {
        method: 'PUT',
        headers,
        body: params.toString(),
      });
      result = await endRes.json();

    } else if (action === 'start' || action === 'add') {
      // START/ADD publishes to channels
      const params = new URLSearchParams();
      params.append('guid', sku);
      if (channel === 'all' || channel === 'ebay') {
        params.append('ebayaction', action);
      }
      if (channel === 'all' || channel === 'bigcommerce') {
        params.append('bigcommerceaction', action);
      }

      const startRes = await fetch(`${SUREDONE_URL}/editor/items`, {
        method: 'PUT',
        headers,
        body: params.toString(),
      });
      result = await startRes.json();

    } else if (action === 'revise' || action === 'edit') {
      // REVISE/EDIT pushes current data to channels
      const params = new URLSearchParams();
      params.append('guid', sku);
      if (channel === 'all' || channel === 'ebay') {
        params.append('ebayaction', 'edit');
      }
      if (channel === 'all' || channel === 'bigcommerce') {
        params.append('bigcommerceaction', 'edit');
      }

      const editRes = await fetch(`${SUREDONE_URL}/editor/items`, {
        method: 'PUT',
        headers,
        body: params.toString(),
      });
      result = await editRes.json();
    }

    // Check if SureDone reported success
    const isSuccess = result?.result === 'success' ||
                      result?.result === 1 ||
                      !!result?.['1'];

    // Try to get listing URLs from the item
    let ebayUrl = null;
    let bigcommerceUrl = null;
    const suredoneUrl = `https://app.suredone.com/#!/editor/item/${sku}`;

    if (action !== 'delete') {
      try {
        const item = await fetchItem(SUREDONE_URL, SUREDONE_USER, SUREDONE_TOKEN, sku);
        if (item) {
          ebayUrl = findEbayUrl(item);
          bigcommerceUrl = findBigcommerceUrl(item);
        }
      } catch (e) {
        console.warn('[listing-action] Could not fetch listing URLs:', e.message);
      }
    }

    return res.status(200).json({
      success: isSuccess,
      action,
      channel,
      sku,
      result,
      ebayUrl,
      bigcommerceUrl,
      suredoneUrl,
    });

  } catch (err) {
    console.error('[listing-action] Error:', err);
    return res.status(500).json({
      success: false,
      error: err.message,
      action,
      sku,
    });
  }
}

// ============================================================
// Helpers: fetch item via search endpoint, extract URLs
// ============================================================

async function fetchItem(baseUrl, user, token, sku) {
  const searchUrl = `${baseUrl}/search/items/${encodeURIComponent(`guid:=${sku}`)}`;
  const res = await fetch(searchUrl, {
    headers: {
      'X-Auth-User': user,
      'X-Auth-Token': token,
      'Content-Type': 'application/json',
    },
  });
  if (!res.ok) return null;
  const data = await res.json();
  for (const key of Object.keys(data)) {
    if (!isNaN(key) && data[key]?.guid) {
      if (data[key].guid.toLowerCase() === sku.toLowerCase()) {
        return data[key];
      }
    }
  }
  return null;
}

function findEbayUrl(item) {
  // Check known field names first
  const knownFields = ['ebayid', 'ebayitemid', 'ebaynewid', 'ebaylistingid'];
  for (const field of knownFields) {
    if (item[field] && item[field].toString().length > 5) {
      return `https://www.ebay.com/itm/${item[field]}`;
    }
  }
  // Fallback: any key containing 'ebay' and 'id'
  for (const key of Object.keys(item)) {
    if (key.toLowerCase().includes('ebay') &&
        key.toLowerCase().includes('id') &&
        item[key] && item[key].toString().length > 5) {
      return `https://www.ebay.com/itm/${item[key]}`;
    }
  }
  return null;
}

function findBigcommerceUrl(item) {
  const slug = item.slug || item.customurl;
  if (slug) {
    return `https://www.industrialpartsrus.com/${slug}`;
  }
  const bcId = item.bigcommerceid || item.bigcommerceproductid;
  if (bcId) {
    return `https://www.industrialpartsrus.com/?id=${bcId}`;
  }
  return null;
}
