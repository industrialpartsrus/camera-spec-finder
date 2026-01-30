// pages/api/suredone/debug-get-item.js
// Debug endpoint - shows EXACTLY what SureDone returns for an item
// Use this to see what fields are available

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed. Use GET.' });
  }

  const { sku } = req.query;

  if (!sku) {
    return res.status(400).json({ error: 'SKU is required. Use ?sku=YOUR_SKU' });
  }

  const SUREDONE_USER = process.env.SUREDONE_USER;
  const SUREDONE_TOKEN = process.env.SUREDONE_TOKEN;
  const SUREDONE_URL = process.env.SUREDONE_URL || 'https://api.suredone.com/v1';

  if (!SUREDONE_USER || !SUREDONE_TOKEN) {
    return res.status(500).json({ error: 'SureDone credentials not configured' });
  }

  const results = {
    sku: sku,
    endpoints_tried: [],
    raw_responses: {}
  };

  // Method 1: Try /editor/items/{guid} endpoint
  try {
    const editorUrl = `${SUREDONE_URL}/editor/items/${encodeURIComponent(sku)}`;
    results.endpoints_tried.push({ method: 'editor', url: editorUrl });
    
    const response = await fetch(editorUrl, {
      method: 'GET',
      headers: {
        'X-Auth-User': SUREDONE_USER,
        'X-Auth-Token': SUREDONE_TOKEN,
        'Content-Type': 'application/json'
      }
    });

    const data = await response.json();
    results.raw_responses.editor = {
      status: response.status,
      field_count: typeof data === 'object' ? Object.keys(data).length : 0,
      all_fields: typeof data === 'object' ? Object.keys(data).sort() : [],
      spec_fields: {
        amperage: data.amperage || '(not found)',
        horsepower: data.horsepower || '(not found)',
        voltage: data.voltage || '(not found)',
        rpm: data.rpm || '(not found)',
        phase: data.phase || '(not found)',
        hz: data.hz || '(not found)',
        ratio: data.ratio || '(not found)',
        gearratio: data.gearratio || '(not found)'
      },
      sample_data: {
        guid: data.guid,
        title: data.title,
        brand: data.brand,
        condition: data.condition
      }
    };
  } catch (err) {
    results.raw_responses.editor = { error: err.message };
  }

  // Method 2: Try /search/items/{query} endpoint
  try {
    const searchUrl = `${SUREDONE_URL}/search/items/${encodeURIComponent('guid:=' + sku)}`;
    results.endpoints_tried.push({ method: 'search', url: searchUrl });
    
    const response = await fetch(searchUrl, {
      method: 'GET',
      headers: {
        'X-Auth-User': SUREDONE_USER,
        'X-Auth-Token': SUREDONE_TOKEN,
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    });

    const data = await response.json();
    
    // Find the item in the numbered response
    let item = null;
    for (const key in data) {
      if (!isNaN(key) && data[key] && typeof data[key] === 'object') {
        if (data[key].guid && data[key].guid.toUpperCase() === sku.toUpperCase()) {
          item = data[key];
          break;
        }
      }
    }

    results.raw_responses.search = {
      status: response.status,
      found_item: !!item,
      field_count: item ? Object.keys(item).length : 0,
      all_fields: item ? Object.keys(item).sort() : [],
      spec_fields: item ? {
        amperage: item.amperage || '(not found)',
        horsepower: item.horsepower || '(not found)',
        voltage: item.voltage || '(not found)',
        rpm: item.rpm || '(not found)',
        phase: item.phase || '(not found)',
        hz: item.hz || '(not found)',
        ratio: item.ratio || '(not found)',
        gearratio: item.gearratio || '(not found)'
      } : null,
      sample_data: item ? {
        guid: item.guid,
        title: item.title,
        brand: item.brand,
        condition: item.condition
      } : null
    };
  } catch (err) {
    results.raw_responses.search = { error: err.message };
  }

  // Method 3: Try /items/{guid} endpoint (alternative)
  try {
    const itemsUrl = `${SUREDONE_URL}/items/${encodeURIComponent(sku)}`;
    results.endpoints_tried.push({ method: 'items', url: itemsUrl });
    
    const response = await fetch(itemsUrl, {
      method: 'GET',
      headers: {
        'X-Auth-User': SUREDONE_USER,
        'X-Auth-Token': SUREDONE_TOKEN,
        'Content-Type': 'application/json'
      }
    });

    const data = await response.json();
    results.raw_responses.items = {
      status: response.status,
      field_count: typeof data === 'object' ? Object.keys(data).length : 0,
      all_fields: typeof data === 'object' ? Object.keys(data).sort() : [],
      spec_fields: {
        amperage: data.amperage || '(not found)',
        horsepower: data.horsepower || '(not found)',
        voltage: data.voltage || '(not found)',
        rpm: data.rpm || '(not found)',
        phase: data.phase || '(not found)',
        hz: data.hz || '(not found)'
      }
    };
  } catch (err) {
    results.raw_responses.items = { error: err.message };
  }

  return res.status(200).json(results);
}
