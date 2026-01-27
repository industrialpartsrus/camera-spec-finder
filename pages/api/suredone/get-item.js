// pages/api/suredone/get-item.js
// Fetches a single item from SureDone by SKU

export default async function handler(req, res) {
  // Allow GET requests
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed. Use GET.' });
  }

  const { sku } = req.query;

  if (!sku) {
    return res.status(400).json({ 
      success: false,
      error: 'SKU is required'
    });
  }

  try {
    const item = await getSureDoneItem(sku);
    
    if (item) {
      return res.status(200).json({
        success: true,
        item: item
      });
    } else {
      return res.status(404).json({
        success: false,
        error: 'Item not found'
      });
    }

  } catch (error) {
    console.error('SureDone get-item error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch item',
      details: error.message
    });
  }
}

/**
 * Get a single item from SureDone by SKU
 * Uses the /bulk/items GET endpoint which is more reliable
 */
async function getSureDoneItem(sku) {
  const SUREDONE_USER = process.env.SUREDONE_USER;
  const SUREDONE_TOKEN = process.env.SUREDONE_TOKEN;
  const SUREDONE_URL = process.env.SUREDONE_URL || 'https://api.suredone.com/v1';

  if (!SUREDONE_USER || !SUREDONE_TOKEN) {
    throw new Error('SureDone credentials not configured');
  }

  // Method 1: Try the /items/{guid} endpoint (singular)
  const itemUrl = `${SUREDONE_URL}/items/${encodeURIComponent(sku)}`;
  console.log('SureDone get-item URL (items endpoint):', itemUrl);

  try {
    const response = await fetch(itemUrl, {
      method: 'GET',
      headers: {
        'X-Auth-User': SUREDONE_USER,
        'X-Auth-Token': SUREDONE_TOKEN,
        'Content-Type': 'application/json'
      }
    });

    if (response.ok) {
      const data = await response.json();
      console.log('Items endpoint response keys:', Object.keys(data));
      
      // Check if we got the item directly
      if (data && data.guid && (data.guid === sku || data.sku === sku)) {
        console.log('Found item via /items/ endpoint:', data.guid);
        return formatItem(data);
      }
      
      // Check if it's nested under the sku
      if (data && data[sku]) {
        console.log('Found item nested under SKU key:', sku);
        return formatItem(data[sku]);
      }

      // Check all keys for match
      for (const key in data) {
        if (data[key] && typeof data[key] === 'object') {
          if (data[key].guid === sku || data[key].sku === sku) {
            console.log('Found item in response:', key);
            return formatItem(data[key]);
          }
        }
      }
    }
  } catch (err) {
    console.log('Items endpoint failed:', err.message);
  }

  // Method 2: Try POST to /bulk/items/get with the SKU
  const bulkUrl = `${SUREDONE_URL}/bulk/items/get`;
  console.log('SureDone get-item URL (bulk endpoint):', bulkUrl);

  try {
    const response = await fetch(bulkUrl, {
      method: 'POST',
      headers: {
        'X-Auth-User': SUREDONE_USER,
        'X-Auth-Token': SUREDONE_TOKEN,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        items: [sku]
      })
    });

    if (response.ok) {
      const data = await response.json();
      console.log('Bulk endpoint response keys:', Object.keys(data));
      
      // Check if item is in response
      if (data && data[sku]) {
        console.log('Found item via bulk endpoint:', sku);
        return formatItem(data[sku]);
      }
      
      // Check numbered keys
      for (const key in data) {
        if (data[key] && typeof data[key] === 'object') {
          if (data[key].guid === sku || data[key].sku === sku) {
            console.log('Found item in bulk response:', data[key].guid);
            return formatItem(data[key]);
          }
        }
      }
    }
  } catch (err) {
    console.log('Bulk endpoint failed:', err.message);
  }

  // Method 3: Last resort - search with wildcard disabled
  const searchUrl = `${SUREDONE_URL}/editor/items?search=${encodeURIComponent(sku)}&searchaliases=false&searchguid=true`;
  console.log('SureDone get-item URL (search with guid flag):', searchUrl);

  try {
    const response = await fetch(searchUrl, {
      method: 'GET',
      headers: {
        'X-Auth-User': SUREDONE_USER,
        'X-Auth-Token': SUREDONE_TOKEN,
        'Content-Type': 'application/json'
      }
    });

    if (response.ok) {
      const data = await response.json();
      
      // Find exact match
      for (const key in data) {
        if (!isNaN(key) && data[key] && typeof data[key] === 'object') {
          const item = data[key];
          if (item.guid === sku || item.sku === sku) {
            console.log('Found exact match via search:', item.guid);
            return formatItem(item);
          }
        }
      }
      
      console.log('No exact SKU match found. Search returned items with SKUs:', 
        Object.keys(data).filter(k => !isNaN(k)).map(k => data[k]?.guid).slice(0, 10).join(', '));
    }
  } catch (err) {
    console.log('Search endpoint failed:', err.message);
  }

  return null;
}

/**
 * Format SureDone item for our response
 */
function formatItem(item) {
  // Count images
  let imageCount = 0;
  for (let i = 1; i <= 10; i++) {
    if (item[`media${i}`] && item[`media${i}`].trim() !== '') {
      imageCount++;
    }
  }

  return {
    // Core identification
    sku: item.sku || item.guid || '',
    guid: item.guid || '',
    
    // Product info
    title: item.title || '',
    brand: item.brand || '',
    manufacturer: item.manufacturer || '',
    model: item.model || '',
    mpn: item.mpn || '',
    partnumber: item.partnumber || '',
    usertype: item.usertype || '',
    type: item.type || '',
    
    // Category info
    ebaycatid: item.ebaycatid || '',
    ebaystoreid: item.ebaystoreid || '',
    bigcommercecategories: item.bigcommercecategories || '',
    
    // Custom fields (item specifics)
    controllerplatform: item.controllerplatform || '',
    voltage: item.voltage || '',
    current: item.current || '',
    
    // Inventory info
    condition: item.condition || '',
    conditiondescription: item.conditiondescription || '',
    stock: item.stock || '0',
    price: item.price || '0.00',
    shelf: item.shelf || '',
    
    // Images
    media1: item.media1 || '',
    thumbnail: item.media1 || null,
    imageCount: imageCount,
    
    // Description
    longdescription: item.longdescription || '',
    
    // Metadata
    dateutc: item.dateutc || '',
    
    // Channel status
    ebayid: item.ebayid || '',
    bigcommerceid: item.bigcommerceid || ''
  };
}
