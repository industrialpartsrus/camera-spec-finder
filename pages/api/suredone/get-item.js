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
 * Uses multiple methods to find the item
 */
async function getSureDoneItem(sku) {
  const SUREDONE_USER = process.env.SUREDONE_USER;
  const SUREDONE_TOKEN = process.env.SUREDONE_TOKEN;
  const SUREDONE_URL = process.env.SUREDONE_URL || 'https://api.suredone.com/v1';

  if (!SUREDONE_USER || !SUREDONE_TOKEN) {
    throw new Error('SureDone credentials not configured');
  }

  // Method 1: GET /items/{guid} - should return single item
  const itemUrl = `${SUREDONE_URL}/items/${encodeURIComponent(sku)}`;
  console.log('Method 1 - GET /items/{sku}:', itemUrl);

  try {
    const response = await fetch(itemUrl, {
      method: 'GET',
      headers: {
        'X-Auth-User': SUREDONE_USER,
        'X-Auth-Token': SUREDONE_TOKEN,
        'Content-Type': 'application/json'
      }
    });

    const responseText = await response.text();
    console.log('Method 1 response status:', response.status);
    console.log('Method 1 response preview:', responseText.substring(0, 200));

    if (response.ok && responseText) {
      try {
        const data = JSON.parse(responseText);
        
        // Check if we got the item directly
        if (data && data.guid && (data.guid === sku || data.guid.toUpperCase() === sku.toUpperCase())) {
          console.log('Found item via Method 1:', data.guid);
          return formatItem(data);
        }
        
        // Check if nested under SKU key
        if (data && data[sku]) {
          console.log('Found item nested under SKU:', sku);
          return formatItem(data[sku]);
        }

        // Check all keys
        for (const key in data) {
          if (data[key] && typeof data[key] === 'object' && data[key].guid) {
            if (data[key].guid.toUpperCase() === sku.toUpperCase()) {
              console.log('Found item in response key:', key);
              return formatItem(data[key]);
            }
          }
        }
      } catch (parseErr) {
        console.log('Method 1 JSON parse error:', parseErr.message);
      }
    }
  } catch (err) {
    console.log('Method 1 failed:', err.message);
  }

  // Method 2: GET /editor/items with just the SKU as the search term
  // Sometimes simple search works better
  const simpleSearchUrl = `${SUREDONE_URL}/editor/items?search=${encodeURIComponent(sku)}&limit=100`;
  console.log('Method 2 - Simple search:', simpleSearchUrl);

  try {
    const response = await fetch(simpleSearchUrl, {
      method: 'GET',
      headers: {
        'X-Auth-User': SUREDONE_USER,
        'X-Auth-Token': SUREDONE_TOKEN,
        'Content-Type': 'application/json'
      }
    });

    if (response.ok) {
      const data = await response.json();
      
      // Find exact match (case insensitive)
      for (const key in data) {
        if (!isNaN(key) && data[key] && typeof data[key] === 'object') {
          const item = data[key];
          const itemGuid = (item.guid || '').toUpperCase();
          const searchSku = sku.toUpperCase();
          
          if (itemGuid === searchSku) {
            console.log('Found exact match via Method 2:', item.guid);
            return formatItem(item);
          }
        }
      }
      
      // Log what we got
      const skus = Object.keys(data)
        .filter(k => !isNaN(k))
        .map(k => data[k]?.guid)
        .slice(0, 10);
      console.log('Method 2 returned SKUs (first 10):', skus.join(', '));
    }
  } catch (err) {
    console.log('Method 2 failed:', err.message);
  }

  // Method 3: Try with all lowercase
  const lowerSku = sku.toLowerCase();
  const lowerSearchUrl = `${SUREDONE_URL}/items/${encodeURIComponent(lowerSku)}`;
  console.log('Method 3 - Lowercase SKU:', lowerSearchUrl);

  try {
    const response = await fetch(lowerSearchUrl, {
      method: 'GET',
      headers: {
        'X-Auth-User': SUREDONE_USER,
        'X-Auth-Token': SUREDONE_TOKEN,
        'Content-Type': 'application/json'
      }
    });

    if (response.ok) {
      const data = await response.json();
      console.log('Method 3 response keys:', Object.keys(data).slice(0, 5));
      
      if (data && data.guid) {
        console.log('Found item via Method 3:', data.guid);
        return formatItem(data);
      }
    }
  } catch (err) {
    console.log('Method 3 failed:', err.message);
  }

  console.log('All methods failed to find SKU:', sku);
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
