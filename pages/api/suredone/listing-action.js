// /pages/api/suredone/listing-action.js
// Centralized endpoint for SureDone listing actions:
// start, relist, end, revise, delete — across eBay and BigCommerce channels

const SUREDONE_BASE = 'https://api.suredone.com/v1';

function getHeaders() {
  return {
    'X-Auth-User': process.env.SUREDONE_API_USER || process.env.SUREDONE_USER,
    'X-Auth-Token': process.env.SUREDONE_API_TOKEN || process.env.SUREDONE_TOKEN,
    'Content-Type': 'application/json',
  };
}

function buildActionBody(sku, action, channel) {
  const body = { guid: sku };
  if (channel === 'ebay' || channel === 'all') {
    body.ebayaction = action;
  }
  if (channel === 'bigcommerce' || channel === 'all') {
    body.bigcommerceaction = action;
  }
  return body;
}

async function findEbayId(sku, headers) {
  try {
    const res = await fetch(`${SUREDONE_BASE}/editor/items/${encodeURIComponent(sku)}`, { headers });
    if (!res.ok) return null;
    const item = await res.json();

    // Check known field names
    const possibleFields = ['ebayid', 'ebayitemid', 'ebaynewid', 'ebaylistingid', 'ebay_item_id'];
    for (const field of possibleFields) {
      if (item[field] && item[field].toString().length > 5) {
        return item[field].toString();
      }
    }
    // Check any key containing 'ebay' and 'id'
    for (const key of Object.keys(item)) {
      if (key.toLowerCase().includes('ebay') && key.toLowerCase().includes('id') &&
          item[key] && item[key].toString().length > 5) {
        return item[key].toString();
      }
    }
  } catch (e) {
    console.warn('Could not fetch eBay ID:', e.message);
  }
  return null;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { sku, action, channel = 'all' } = req.body;

  if (!sku || !action) {
    return res.status(400).json({ error: 'sku and action required' });
  }

  const validActions = ['start', 'relist', 'end', 'revise', 'delete'];
  if (!validActions.includes(action)) {
    return res.status(400).json({ error: `Invalid action. Must be one of: ${validActions.join(', ')}` });
  }

  const validChannels = ['all', 'ebay', 'bigcommerce'];
  if (!validChannels.includes(channel)) {
    return res.status(400).json({ error: `Invalid channel. Must be one of: ${validChannels.join(', ')}` });
  }

  const headers = getHeaders();

  if (!headers['X-Auth-User'] || !headers['X-Auth-Token']) {
    return res.status(500).json({ error: 'SureDone credentials not configured' });
  }

  try {
    let result;

    if (action === 'delete') {
      // Delete: end on all channels first, then remove from SureDone
      const endBody = { guid: sku, ebayaction: 'end', bigcommerceaction: 'end' };
      const endRes = await fetch(`${SUREDONE_BASE}/editor/items`, {
        method: 'PUT',
        headers,
        body: JSON.stringify(endBody),
      });
      const endResult = await endRes.json();

      await new Promise(r => setTimeout(r, 2000));

      const delRes = await fetch(`${SUREDONE_BASE}/editor/items/${encodeURIComponent(sku)}`, {
        method: 'DELETE',
        headers,
      });
      result = await delRes.json();
      result.endResult = endResult;

    } else if (action === 'relist') {
      // Relist: end first, wait, then relist
      const endBody = buildActionBody(sku, 'end', channel);
      const endRes = await fetch(`${SUREDONE_BASE}/editor/items`, {
        method: 'PUT',
        headers,
        body: JSON.stringify(endBody),
      });
      const endResult = await endRes.json();

      await new Promise(r => setTimeout(r, 3000));

      const relistBody = buildActionBody(sku, 'relist', channel);
      const relistRes = await fetch(`${SUREDONE_BASE}/editor/items`, {
        method: 'PUT',
        headers,
        body: JSON.stringify(relistBody),
      });
      result = await relistRes.json();
      result.endResult = endResult;

    } else {
      // start, end, revise — single action
      const actionBody = buildActionBody(sku, action, channel);
      const actionRes = await fetch(`${SUREDONE_BASE}/editor/items`, {
        method: 'PUT',
        headers,
        body: JSON.stringify(actionBody),
      });
      result = await actionRes.json();
    }

    // Try to get eBay item ID
    const ebayItemId = await findEbayId(sku, headers);
    const ebayUrl = ebayItemId ? `https://www.ebay.com/itm/${ebayItemId}` : null;

    return res.status(200).json({
      success: true,
      action,
      channel,
      sku,
      result,
      ebayItemId,
      ebayUrl,
    });
  } catch (err) {
    console.error('Listing action error:', err);
    return res.status(500).json({ error: err.message, action, sku });
  }
}
