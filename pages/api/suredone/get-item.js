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
 */
async function getSureDoneItem(sku) {
  const SUREDONE_USER = process.env.SUREDONE_USER;
  const SUREDONE_TOKEN = process.env.SUREDONE_TOKEN;
  const SUREDONE_URL = process.env.SUREDONE_URL || 'https://api.suredone.com/v1';

  if (!SUREDONE_USER || !SUREDONE_TOKEN) {
    throw new Error('SureDone credentials not configured');
  }

  // Search for exact SKU match
  const searchQuery = `sku:=${sku}`;
  const url = `${SUREDONE_URL}/editor/items?search=${encodeURIComponent(searchQuery)}`;
  
  console.log('SureDone get-item URL:', url);

  const response = await fetch(url, {
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
  // Find the first product in the response
  for (const key in data) {
    if (!isNaN(key) && data[key] && typeof data[key] === 'object') {
      return formatItem(data[key]);
    }
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
