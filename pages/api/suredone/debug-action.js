// ============================================================
// /pages/api/suredone/debug-action.js
// Debug endpoint: test SureDone listing actions and delete methods
// Usage: /api/suredone/debug-action?sku=IPPEC4145&action=delete
// ============================================================

export default async function handler(req, res) {
  const { sku, action } = req.query;

  if (!sku) return res.status(400).json({ error: 'sku required' });

  const headers = {
    'X-Auth-User': process.env.SUREDONE_API_USER || process.env.SUREDONE_USER,
    'X-Auth-Token': process.env.SUREDONE_API_TOKEN || process.env.SUREDONE_TOKEN,
    'Content-Type': 'application/json',
  };

  const SUREDONE_URL = process.env.SUREDONE_URL || 'https://api.suredone.com/v1';
  const results = {};

  // Test: PUT with ebayaction / bigcommerceaction
  if (action === 'end' || action === 'relist' || action === 'start' || action === 'revise') {
    try {
      const r = await fetch(`${SUREDONE_URL}/editor/items`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({ guid: sku, ebayaction: action }),
      });
      results.ebayAction = {
        status: r.status,
        body: await r.json(),
      };
    } catch (e) {
      results.ebayAction = { error: e.message };
    }

    try {
      const r = await fetch(`${SUREDONE_URL}/editor/items`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({ guid: sku, bigcommerceaction: action }),
      });
      results.bigcommerceAction = {
        status: r.status,
        body: await r.json(),
      };
    } catch (e) {
      results.bigcommerceAction = { error: e.message };
    }
  }

  // Test multiple delete approaches
  if (action === 'delete') {
    // Method 1: DELETE /editor/items/{sku}
    try {
      const r1 = await fetch(`${SUREDONE_URL}/editor/items/${sku}`, {
        method: 'DELETE',
        headers,
      });
      results.deleteMethod1 = {
        url: `DELETE /editor/items/${sku}`,
        status: r1.status,
        body: await r1.json(),
      };
    } catch (e) {
      results.deleteMethod1 = { error: e.message };
    }

    // Method 2: PUT with stock=0 and end all channels
    try {
      const r2 = await fetch(`${SUREDONE_URL}/editor/items`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({
          guid: sku,
          stock: '0',
          ebayaction: 'end',
          bigcommerceaction: 'end',
        }),
      });
      results.deleteMethod2_endAndZeroStock = {
        url: 'PUT /editor/items with stock=0 + end actions',
        status: r2.status,
        body: await r2.json(),
      };
    } catch (e) {
      results.deleteMethod2_endAndZeroStock = { error: e.message };
    }

    // Method 3: POST to /editor/items/delete
    try {
      const r3 = await fetch(`${SUREDONE_URL}/editor/items/delete`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ guid: sku }),
      });
      results.deleteMethod3 = {
        url: 'POST /editor/items/delete',
        status: r3.status,
        body: await r3.json(),
      };
    } catch (e) {
      results.deleteMethod3 = { error: e.message };
    }

    // Method 4: PUT with action=delete
    try {
      const r4 = await fetch(`${SUREDONE_URL}/editor/items`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({ guid: sku, action: 'delete' }),
      });
      results.deleteMethod4 = {
        url: 'PUT /editor/items with action=delete',
        status: r4.status,
        body: await r4.json(),
      };
    } catch (e) {
      results.deleteMethod4 = { error: e.message };
    }
  }

  // Fetch current item state — show eBay and BigCommerce fields
  try {
    const itemRes = await fetch(`${SUREDONE_URL}/editor/items/${sku}`, { headers });
    const itemData = await itemRes.json();

    const ebayFields = {};
    for (const key of Object.keys(itemData)) {
      if (key.toLowerCase().includes('ebay')) {
        ebayFields[key] = itemData[key];
      }
    }

    const bcFields = {};
    for (const key of Object.keys(itemData)) {
      if (key.toLowerCase().includes('bigcommerce') || key.toLowerCase().includes('bcid')) {
        bcFields[key] = itemData[key];
      }
    }

    results.currentItem = {
      guid: itemData.guid,
      title: itemData.title,
      stock: itemData.stock,
      ebayFields,
      bcFields,
      allKeys: Object.keys(itemData).slice(0, 50),
    };
  } catch (e) {
    results.currentItem = { error: e.message };
  }

  return res.status(200).json(results);
}
