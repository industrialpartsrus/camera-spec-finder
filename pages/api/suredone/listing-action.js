// ============================================================
// /pages/api/suredone/listing-action.js
// Centralized endpoint for SureDone listing actions:
// start, add, edit, relist, end, delete — across eBay and BigCommerce
//
// SureDone requires: POST /v1/editor/items/edit, form-urlencoded, identifier=guid
// ============================================================

import { getSureDoneCredentials } from '../../../lib/suredone-config';

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

  let SUREDONE_USER, SUREDONE_TOKEN, SUREDONE_URL;
  try {
    const creds = getSureDoneCredentials();
    SUREDONE_USER = creds.user;
    SUREDONE_TOKEN = creds.token;
    SUREDONE_URL = creds.baseUrl;
  } catch (e) {
    return res.status(500).json({ error: 'SureDone credentials not configured' });
  }

  const headers = {
    'X-Auth-User': SUREDONE_USER,
    'X-Auth-Token': SUREDONE_TOKEN,
    'Content-Type': 'application/x-www-form-urlencoded',
  };

  const editUrl = `${SUREDONE_URL}/v1/editor/items/edit`;
  const deleteUrl = `${SUREDONE_URL}/v1/editor/items/delete`;

  try {
    let result;

    if (action === 'relist') {
      // RELIST = end first, wait 2s, then re-start
      // Step 1: End the current listing
      const endForm = new URLSearchParams();
      endForm.append('identifier', 'guid');
      endForm.append('guid', sku);
      endForm.append('ebayend', '1');

      console.log(`[listing-action] Relist step 1 — ending ${sku}`);
      const endRes = await fetch(editUrl, {
        method: 'POST', headers, body: endForm.toString(),
      });
      const endResult = await endRes.json();
      console.log(`[listing-action] End result for ${sku}:`, JSON.stringify(endResult));

      // Step 2: Wait for eBay to process the end
      await new Promise(r => setTimeout(r, 2000));

      // Step 3: Re-start the listing
      const startForm = new URLSearchParams();
      startForm.append('identifier', 'guid');
      startForm.append('guid', sku);
      startForm.append('ebayskip', '0');

      console.log(`[listing-action] Relist step 2 — re-starting ${sku}`);
      const startRes = await fetch(editUrl, {
        method: 'POST', headers, body: startForm.toString(),
      });
      result = await startRes.json();
      result.endResult = endResult;
      console.log(`[listing-action] Relist result for ${sku}:`, JSON.stringify(result));

    } else if (action === 'delete') {
      // DELETE removes from SureDone entirely
      const params = new URLSearchParams();
      params.append('identifier', 'guid');
      params.append('guid', sku);

      console.log(`[listing-action] Deleting ${sku}`);
      const delRes = await fetch(deleteUrl, {
        method: 'POST', headers, body: params.toString(),
      });
      result = await delRes.json();
      console.log(`[listing-action] Delete result for ${sku}:`, JSON.stringify(result));

    } else if (action === 'end') {
      // END removes from channels but keeps in SureDone
      const params = new URLSearchParams();
      params.append('identifier', 'guid');
      params.append('guid', sku);
      if (channel === 'ebay' || channel === 'all') {
        params.append('ebayend', '1');
      }
      if (channel === 'bigcommerce' || channel === 'all') {
        params.append('bigcommercedisabled', '1');
      }

      console.log(`[listing-action] Ending ${sku} on ${channel}`);
      const endRes = await fetch(editUrl, {
        method: 'POST', headers, body: params.toString(),
      });
      result = await endRes.json();
      console.log(`[listing-action] End result for ${sku}:`, JSON.stringify(result));

    } else if (action === 'start' || action === 'add') {
      // START/ADD publishes to channels (removes skip flags)
      const params = new URLSearchParams();
      params.append('identifier', 'guid');
      params.append('guid', sku);
      if (channel === 'ebay' || channel === 'all') {
        params.append('ebayskip', '0');
      }
      if (channel === 'bigcommerce' || channel === 'all') {
        params.append('bigcommerceskip', '0');
      }

      console.log(`[listing-action] Starting ${sku} on ${channel}`);
      const startRes = await fetch(editUrl, {
        method: 'POST', headers, body: params.toString(),
      });
      result = await startRes.json();
      console.log(`[listing-action] Start result for ${sku}:`, JSON.stringify(result));

    } else if (action === 'revise' || action === 'edit') {
      // REVISE/EDIT pushes current data to live listing
      const params = new URLSearchParams();
      params.append('identifier', 'guid');
      params.append('guid', sku);
      if (channel === 'ebay' || channel === 'all') {
        params.append('ebayskip', '0');
      }
      if (channel === 'bigcommerce' || channel === 'all') {
        params.append('bigcommerceskip', '0');
      }

      console.log(`[listing-action] Revising ${sku} on ${channel}`);
      const editRes = await fetch(editUrl, {
        method: 'POST', headers, body: params.toString(),
      });
      result = await editRes.json();
      console.log(`[listing-action] Revise result for ${sku}:`, JSON.stringify(result));
    }

    // Check if SureDone reported success (two patterns)
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
