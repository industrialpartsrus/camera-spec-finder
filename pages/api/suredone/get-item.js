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
 * Uses /search/items/{query} endpoint
 */
async function getSureDoneItem(sku) {
  const SUREDONE_USER = process.env.SUREDONE_USER;
  const SUREDONE_TOKEN = process.env.SUREDONE_TOKEN;
  const SUREDONE_URL = process.env.SUREDONE_URL || 'https://api.suredone.com/v1';

  if (!SUREDONE_USER || !SUREDONE_TOKEN) {
    throw new Error('SureDone credentials not configured');
  }

  // Use /search/items/{query} endpoint with guid exact match
  const searchQuery = `guid:=${sku}`;
  const searchUrl = `${SUREDONE_URL}/search/items/${encodeURIComponent(searchQuery)}`;
  console.log('SureDone search URL:', searchUrl);

  try {
    const response = await fetch(searchUrl, {
      method: 'GET',
      headers: {
        'X-Auth-User': SUREDONE_USER,
        'X-Auth-Token': SUREDONE_TOKEN,
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    });

    console.log('Search response status:', response.status);

    if (response.ok) {
      const data = await response.json();
      console.log('Search response keys:', Object.keys(data).slice(0, 10));
      
      // Response format: { "1": {...item...}, "2": {...item...}, "type": "items", "all": "302" }
      for (const key in data) {
        if (!isNaN(key) && data[key] && typeof data[key] === 'object') {
          const item = data[key];
          // Check for exact guid match (case insensitive)
          if (item.guid && item.guid.toUpperCase() === sku.toUpperCase()) {
            console.log('Found exact match:', item.guid);
            return formatItem(item);
          }
        }
      }
      
      // Log what we got if no match
      const guids = Object.keys(data)
        .filter(k => !isNaN(k))
        .map(k => data[k]?.guid)
        .slice(0, 5);
      console.log('No exact match. Response contained guids:', guids.join(', '));
    }
  } catch (err) {
    console.log('Search endpoint failed:', err.message);
  }

  console.log('Could not find SKU:', sku);
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
