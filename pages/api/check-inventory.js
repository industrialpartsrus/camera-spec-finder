// pages/api/check-inventory.js
// SureDone Inventory Search - Checks for existing inventory before creating new listings
// Searches by brand + part number, returns matches with stock > 0

export default async function handler(req, res) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed. Use POST.' });
  }

  const { brand, partNumber } = req.body;

  // Validate required inputs
  if (!partNumber) {
    return res.status(400).json({ 
      error: 'Part number is required',
      found: false,
      matches: [],
      totalMatches: 0
    });
  }

  try {
    // Search SureDone for matching products
    const matches = await searchSureDone(brand, partNumber);
    
    // Filter to only items with stock > 0
    const inStockMatches = matches.filter(item => {
      const stock = parseInt(item.stock) || 0;
      return stock > 0;
    });

    // Format the response
    const formattedMatches = inStockMatches.map(item => formatProductMatch(item));

    return res.status(200).json({
      found: formattedMatches.length > 0,
      matches: formattedMatches,
      totalMatches: formattedMatches.length,
      searchedFor: {
        brand: brand || '(any)',
        partNumber: partNumber
      }
    });

  } catch (error) {
    console.error('SureDone search error:', error);
    return res.status(500).json({
      error: 'Failed to search inventory',
      details: error.message,
      found: false,
      matches: [],
      totalMatches: 0
    });
  }
}

/**
 * Search SureDone for products matching brand and part number
 * Searches across model, mpn, and partnumber fields
 */
async function searchSureDone(brand, partNumber) {
  const SUREDONE_USER = process.env.SUREDONE_USER;
  const SUREDONE_TOKEN = process.env.SUREDONE_TOKEN;
  const SUREDONE_URL = process.env.SUREDONE_URL || 'https://app.suredone.com/v1';

  if (!SUREDONE_USER || !SUREDONE_TOKEN) {
    throw new Error('SureDone credentials not configured');
  }

  // Build search query
  // We search multiple fields because part numbers can be in model, mpn, or partnumber
  let searchQuery = '';
  
  // Determine which brand field to search (brand or manufacturer)
  const brandSearch = brand ? `(brand:${brand} OR manufacturer:${brand})` : '';
  
  // Search part number across all relevant fields
  // Using OR to catch the part number in any field
  const partSearch = `(model:${partNumber} OR mpn:${partNumber} OR partnumber:${partNumber})`;
  
  // Combine brand and part number search
  if (brandSearch) {
    searchQuery = `${brandSearch} AND ${partSearch}`;
  } else {
    searchQuery = partSearch;
  }

  console.log('SureDone search query:', searchQuery);

  // Make the API request
  const url = `${SUREDONE_URL}/editor/items?search=${encodeURIComponent(searchQuery)}`;
  
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'X-Auth-User': SUREDONE_USER,
      'X-Auth-Token': SUREDONE_TOKEN,
      'Content-Type': 'application/x-www-form-urlencoded'
    }
  });

  if (!response.ok) {
    throw new Error(`SureDone API error: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();

  // SureDone returns products as numbered keys, not an array
  // Convert to array of products
  const products = [];
  for (const key in data) {
    // Skip non-numeric keys (like 'result', 'errors', etc.)
    if (!isNaN(key) && data[key] && typeof data[key] === 'object') {
      products.push(data[key]);
    }
  }

  console.log(`Found ${products.length} products in SureDone`);

  // If exact match didn't find enough results, try partial match
  // This helps with cases like SMC cylinders where CDQ2A40-100D should match CDQ2A40-100D-F7BVL-X838
  if (products.length === 0 && partNumber.length > 5) {
    console.log('No exact matches, trying partial search...');
    const partialProducts = await searchSureDonePartial(brand, partNumber);
    return partialProducts;
  }

  return products;
}

/**
 * Partial search for cases where part numbers have extensions
 * Example: CDQ2A40-100D should find CDQ2A40-100D-F7BVL-X838
 */
async function searchSureDonePartial(brand, partNumber) {
  const SUREDONE_USER = process.env.SUREDONE_USER;
  const SUREDONE_TOKEN = process.env.SUREDONE_TOKEN;
  const SUREDONE_URL = process.env.SUREDONE_URL || 'https://app.suredone.com/v1';

  // For partial matching, we'll search the title which often contains the full part number
  // SureDone's search uses "contains" logic for text fields
  let searchQuery = `title:*${partNumber}*`;
  
  if (brand) {
    searchQuery = `(brand:${brand} OR manufacturer:${brand}) AND ${searchQuery}`;
  }

  console.log('SureDone partial search query:', searchQuery);

  const url = `${SUREDONE_URL}/editor/items?search=${encodeURIComponent(searchQuery)}`;
  
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'X-Auth-User': SUREDONE_USER,
      'X-Auth-Token': SUREDONE_TOKEN,
      'Content-Type': 'application/x-www-form-urlencoded'
    }
  });

  if (!response.ok) {
    throw new Error(`SureDone API error: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();

  const products = [];
  for (const key in data) {
    if (!isNaN(key) && data[key] && typeof data[key] === 'object') {
      products.push(data[key]);
    }
  }

  console.log(`Found ${products.length} products in partial search`);
  return products;
}

/**
 * Format a SureDone product into our standardized response format
 */
function formatProductMatch(item) {
  // Count how many images are populated (media1 through media10)
  let imageCount = 0;
  for (let i = 1; i <= 10; i++) {
    if (item[`media${i}`] && item[`media${i}`].trim() !== '') {
      imageCount++;
    }
  }

  // Check which channels the product is listed on
  const channels = {
    ebay: !!(item.ebayid || item.ebaycatid),
    bigcommerce: !!(item.bigcommerceid || item.bigcommercecategories)
  };

  // Determine which item specifics might be missing
  const missingFields = [];
  const importantFields = ['brand', 'mpn', 'model', 'condition', 'price'];
  importantFields.forEach(field => {
    if (!item[field] || item[field].trim() === '') {
      missingFields.push(field);
    }
  });

  // Get the brand (fallback to manufacturer if brand is empty)
  const brandValue = item.brand && item.brand.trim() !== '' 
    ? item.brand 
    : (item.manufacturer || 'Unknown');

  return {
    // Core identification
    sku: item.sku || item.guid || 'N/A',
    guid: item.guid || '',
    
    // Product info
    title: item.title || 'No Title',
    brand: brandValue,
    model: item.model || '',
    mpn: item.mpn || '',
    partNumber: item.partnumber || '',
    
    // Inventory info
    condition: item.condition || 'Unknown',
    shelf: item.shelf || 'Not Assigned',
    stock: parseInt(item.stock) || 0,
    price: item.price || '0.00',
    
    // Images
    thumbnail: item.media1 || null,
    hasImages: imageCount > 0,
    imageCount: imageCount,
    
    // Listing quality indicators
    hasItemSpecifics: missingFields.length === 0,
    missingFields: missingFields,
    
    // Channel status
    channels: channels,
    ebayCategory: item.ebaycatid || null,
    ebayStoreCategory: item.ebaystoreid || null,
    
    // Metadata
    lastModified: item.dateutc || item.date || null,
    
    // Description preview (first 200 chars)
    descriptionPreview: item.longdescription 
      ? item.longdescription.substring(0, 200) + '...'
      : 'No description'
  };
}
