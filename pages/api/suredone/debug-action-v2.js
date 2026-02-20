// ============================================================
// /pages/api/suredone/debug-action-v2.js
// Debug: Test SureDone listing actions with FORM-URLENCODED
// (matching the format used by update-item.js and create-listing.js)
//
// Usage:
//   /api/suredone/debug-action-v2?sku=IPPEC4145&action=delete
//   /api/suredone/debug-action-v2?sku=IPPEC4145&action=end
//   /api/suredone/debug-action-v2?sku=IPPEC4145&action=relist
//   /api/suredone/debug-action-v2?sku=IPPEC4145  (item lookup only)
// ============================================================

export default async function handler(req, res) {
  const { sku, action } = req.query;
  if (!sku) return res.status(400).json({ error: 'sku required' });

  const SUREDONE_USER = process.env.SUREDONE_API_USER || process.env.SUREDONE_USER;
  const SUREDONE_TOKEN = process.env.SUREDONE_API_TOKEN || process.env.SUREDONE_TOKEN;
  const SUREDONE_URL = process.env.SUREDONE_URL || 'https://api.suredone.com/v1';

  const jsonHeaders = {
    'X-Auth-User': SUREDONE_USER,
    'X-Auth-Token': SUREDONE_TOKEN,
    'Content-Type': 'application/json',
  };

  const formHeaders = {
    'X-Auth-User': SUREDONE_USER,
    'X-Auth-Token': SUREDONE_TOKEN,
    'Content-Type': 'application/x-www-form-urlencoded',
  };

  const results = {};

  // ========================================
  // PART A: Find the item and all its fields
  // ========================================

  // Method A1: /search/items/guid:={sku} (what get-item.js uses — known working)
  try {
    const r = await fetch(
      `${SUREDONE_URL}/search/items/${encodeURIComponent(`guid:=${sku}`)}`,
      { headers: jsonHeaders }
    );
    const data = await r.json();
    const items = [];
    for (const key of Object.keys(data)) {
      if (!isNaN(key) && data[key]?.guid) items.push(data[key]);
    }
    if (items.length > 0) {
      const item = items[0];
      const ebayFields = {};
      const bcFields = {};
      for (const key of Object.keys(item)) {
        if (key.toLowerCase().includes('ebay')) ebayFields[key] = item[key];
        if (key.toLowerCase().includes('bigcommerce') || key.toLowerCase() === 'bcid') bcFields[key] = item[key];
      }
      results.itemLookup = {
        method: `GET /search/items/guid:=${sku}`,
        found: true,
        guid: item.guid,
        title: item.title,
        stock: item.stock,
        condition: item.condition,
        ebayFields,
        bcFields,
        allKeys: Object.keys(item),
      };
    } else {
      results.itemLookup = {
        method: `GET /search/items/guid:=${sku}`,
        found: false,
        rawKeys: Object.keys(data),
      };
    }
  } catch (e) {
    results.itemLookup = { error: e.message };
  }

  // If no action requested, just return item info
  if (!action) {
    return res.status(200).json(results);
  }

  // ========================================
  // PART B: Listing actions (end/relist/start/revise)
  // Using form-urlencoded POST to /editor/items/edit
  // (matching update-item.js which is confirmed working)
  // ========================================

  if (action === 'end' || action === 'relist' || action === 'start' || action === 'revise') {
    // Test B1: Form-urlencoded with ebayaction
    try {
      const form = new URLSearchParams();
      form.append('identifier', 'guid');
      form.append('guid', sku);
      form.append('ebayaction', action);

      const r = await fetch(`${SUREDONE_URL}/editor/items/edit`, {
        method: 'POST',
        headers: formHeaders,
        body: form.toString(),
      });
      results.formEbayAction = {
        url: 'POST /editor/items/edit (form-urlencoded)',
        body: `identifier=guid&guid=${sku}&ebayaction=${action}`,
        status: r.status,
        response: await r.json(),
      };
    } catch (e) {
      results.formEbayAction = { error: e.message };
    }

    // Test B2: Form-urlencoded with bigcommerceaction
    try {
      const form = new URLSearchParams();
      form.append('identifier', 'guid');
      form.append('guid', sku);
      form.append('bigcommerceaction', action);

      const r = await fetch(`${SUREDONE_URL}/editor/items/edit`, {
        method: 'POST',
        headers: formHeaders,
        body: form.toString(),
      });
      results.formBigcommerceAction = {
        url: 'POST /editor/items/edit (form-urlencoded)',
        body: `identifier=guid&guid=${sku}&bigcommerceaction=${action}`,
        status: r.status,
        response: await r.json(),
      };
    } catch (e) {
      results.formBigcommerceAction = { error: e.message };
    }

    // Test B3: JSON PUT to /editor/items (original approach from listing-action.js)
    try {
      const r = await fetch(`${SUREDONE_URL}/editor/items`, {
        method: 'PUT',
        headers: jsonHeaders,
        body: JSON.stringify({ guid: sku, ebayaction: action }),
      });
      results.jsonPutEbayAction = {
        url: 'PUT /editor/items (JSON)',
        status: r.status,
        response: await r.json(),
      };
    } catch (e) {
      results.jsonPutEbayAction = { error: e.message };
    }
  }

  // ========================================
  // PART C: Delete approaches
  // ========================================

  if (action === 'delete') {
    // C1: Form-urlencoded end on all channels + stock=0
    try {
      const form = new URLSearchParams();
      form.append('identifier', 'guid');
      form.append('guid', sku);
      form.append('stock', '0');
      form.append('ebayaction', 'end');
      form.append('bigcommerceaction', 'end');

      const r = await fetch(`${SUREDONE_URL}/editor/items/edit`, {
        method: 'POST',
        headers: formHeaders,
        body: form.toString(),
      });
      results.deleteC1_formEndAndZeroStock = {
        url: 'POST /editor/items/edit (form: stock=0, end both channels)',
        status: r.status,
        response: await r.json(),
      };
    } catch (e) {
      results.deleteC1_formEndAndZeroStock = { error: e.message };
    }

    // C2: DELETE method on /editor/items/{sku}
    try {
      const r = await fetch(`${SUREDONE_URL}/editor/items/${sku}`, {
        method: 'DELETE',
        headers: jsonHeaders,
      });
      results.deleteC2_httpDelete = {
        url: `DELETE /editor/items/${sku}`,
        status: r.status,
        response: await r.json(),
      };
    } catch (e) {
      results.deleteC2_httpDelete = { error: e.message };
    }

    // C3: POST to /editor/items/delete with form-urlencoded
    try {
      const form = new URLSearchParams();
      form.append('identifier', 'guid');
      form.append('guid', sku);

      const r = await fetch(`${SUREDONE_URL}/editor/items/delete`, {
        method: 'POST',
        headers: formHeaders,
        body: form.toString(),
      });
      results.deleteC3_formPostDelete = {
        url: 'POST /editor/items/delete (form-urlencoded)',
        status: r.status,
        response: await r.json(),
      };
    } catch (e) {
      results.deleteC3_formPostDelete = { error: e.message };
    }

    // C4: POST to /editor/items/delete with JSON
    try {
      const r = await fetch(`${SUREDONE_URL}/editor/items/delete`, {
        method: 'POST',
        headers: jsonHeaders,
        body: JSON.stringify({ identifier: 'guid', guid: sku }),
      });
      results.deleteC4_jsonPostDelete = {
        url: 'POST /editor/items/delete (JSON)',
        status: r.status,
        response: await r.json(),
      };
    } catch (e) {
      results.deleteC4_jsonPostDelete = { error: e.message };
    }

    // C5: DELETE with form-urlencoded body
    try {
      const form = new URLSearchParams();
      form.append('identifier', 'guid');
      form.append('guid', sku);

      const r = await fetch(`${SUREDONE_URL}/editor/items/${sku}`, {
        method: 'DELETE',
        headers: formHeaders,
        body: form.toString(),
      });
      results.deleteC5_httpDeleteWithForm = {
        url: `DELETE /editor/items/${sku} (with form body)`,
        status: r.status,
        response: await r.json(),
      };
    } catch (e) {
      results.deleteC5_httpDeleteWithForm = { error: e.message };
    }

    // C6: PUT to /editor/items with action=delete (JSON)
    try {
      const r = await fetch(`${SUREDONE_URL}/editor/items`, {
        method: 'PUT',
        headers: jsonHeaders,
        body: JSON.stringify({ guid: sku, action: 'delete' }),
      });
      results.deleteC6_jsonPutDelete = {
        url: 'PUT /editor/items (JSON action=delete)',
        status: r.status,
        response: await r.json(),
      };
    } catch (e) {
      results.deleteC6_jsonPutDelete = { error: e.message };
    }
  }

  return res.status(200).json(results);
}
