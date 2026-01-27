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
 * Uses direct item endpoint for exact match
 */
async function getSureDoneItem(sku) {
  const SUREDONE_USER = process.env.SUREDONE_USER;
  const SUREDONE_TOKEN = process.env.SUREDONE_TOKEN;
  const SUREDONE_URL = process.env.SUREDONE_URL || 'https://api.suredone.com/v1';

  if (!SUREDONE_USER || !SUREDONE_TOKEN) {
    throw new Error('SureDone credentials not configured');
  }

  // Try direct item lookup first (most reliable)
  // SureDone supports /editor/items/{sku} for direct access
  const directUrl = `${SUREDONE_URL}/editor/items/${encodeURIComponent(sku)}`;
  
  console.log('SureDone get-item URL (direct):', directUrl);

  try {
    const response = await fetch(directUrl, {
      method: 'GET',
      headers: {
        'X-Auth-User': SUREDONE_USER,
        'X-Auth-Token': SUREDONE_TOKEN,
        'Content-Type': 'application/json'
      }
    });

    if (response.ok) {
      const data = await response.json();
      
      // Direct endpoint returns the item directly or with guid as key
      if (data && data.guid) {
        console.log('Found item via direct lookup:', data.sku || data.guid);
        return formatItem(data);
      }
      
      // Sometimes it returns as { "guid": { ...item... } }
      for (const key in data) {
        if (data[key] && typeof data[key] === 'object' && data[key].guid) {
          // Verify this is the exact SKU we want
          if (data[key].sku === sku || data[key].guid === sku) {
            console.log('Found item via direct lookup (nested):', data[key].sku);
            return formatItem(data[key]);
          }
        }
      }
    }
  } catch (err) {
    console.log('Direct lookup failed, trying search:', err.message);
  }

  // Fallback to search with exact match
  // Use := for exact matching in SureDone
  const searchQuery = `guid:=${sku} OR sku:=${sku}`;
  const searchUrl = `${SUREDONE_URL}/editor/items?search=${encodeURIComponent(searchQuery)}`;
  
  console.log('SureDone get-item URL (search fallback):', searchUrl);

  const response = await fetch(searchUrl, {
    method: 'GET',
    headers: {
      'X-Auth-User': SUREDONE_USER,
      'X-Auth-Token': SUREDONE_TOKEN,
      'Content-Type': 'application/json'
    }
  });

  if (!response.ok) {
    throw new Error(`SureDone API error: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();

  // SureDone returns products as numbered keys
  // Find the item that EXACTLY matches our SKU
  for (const key in data) {
    if (!isNaN(key) && data[key] && typeof data[key] === 'object') {
      const item = data[key];
      // Verify exact match on sku or guid
      if (item.sku === sku || item.guid === sku) {
        console.log('Found exact match via search:', item.sku);
        return formatItem(item);
      }
    }
  }

  // If still no exact match, log what we got
  console.log('No exact SKU match found. Search returned items with SKUs:', 
    Object.keys(data).filter(k => !isNaN(k)).map(k => data[k]?.sku).join(', '));

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
