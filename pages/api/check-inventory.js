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
  if (!partNumber || partNumber.trim().length < 2) {
    return res.status(400).json({ 
      error: 'Part number is required (minimum 2 characters)',
      found: false,
      matches: [],
      totalMatches: 0
    });
  }

  const cleanPartNumber = partNumber.trim().toUpperCase();
  const cleanBrand = brand ? brand.trim().toUpperCase() : '';

  try {
    // Search SureDone for matching products
    const allResults = await searchSureDone(cleanBrand, cleanPartNumber);
    
    // IMPORTANT: Filter results client-side to ensure they actually match
    // SureDone's search can be loose, so we verify matches ourselves
    const verifiedMatches = allResults.filter(item => {
      return isActualMatch(item, cleanBrand, cleanPartNumber);
    });

    // Filter to only items with stock > 0
    const inStockMatches = verifiedMatches.filter(item => {
      const stock = parseInt(item.stock) || 0;
      return stock > 0;
    });

    // Format the response
    const formattedMatches = inStockMatches.map(item => formatProductMatch(item));

    console.log(`Search for "${cleanBrand} ${cleanPartNumber}": ${allResults.length} raw results, ${verifiedMatches.length} verified, ${inStockMatches.length} in stock`);

    return res.status(200).json({
      found: formattedMatches.length > 0,
      matches: formattedMatches,
      totalMatches: formattedMatches.length,
      searchedFor: {
        brand: brand || '(any)',
        partNumber: partNumber
      },
      debug: {
        rawResults: allResults.length,
        verifiedMatches: verifiedMatches.length,
        inStockMatches: inStockMatches.length
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
 * Verify that a product actually matches the search criteria
 * This is important because SureDone's search can return loose matches
 */
function isActualMatch(item, searchBrand, searchPartNumber) {
  // Normalize all the item's part number fields for comparison
  const itemModel = (item.model || '').toUpperCase().trim();
  const itemMpn = (item.mpn || '').toUpperCase().trim();
  const itemPartNumber = (item.partnumber || '').toUpperCase().trim();
  const itemTitle = (item.title || '').toUpperCase().trim();
  const itemBrand = (item.brand || '').toUpperCase().trim();
  const itemManufacturer = (item.manufacturer || '').toUpperCase().trim();

  // Check if part number matches any of the relevant fields
  // We check for: exact match, starts with, or contains the search term
  const partNumberMatches = 
    itemModel === searchPartNumber ||
    itemMpn === searchPartNumber ||
    itemPartNumber === searchPartNumber ||
    itemModel.includes(searchPartNumber) ||
    itemMpn.includes(searchPartNumber) ||
    itemPartNumber.includes(searchPartNumber) ||
    searchPartNumber.includes(itemModel) ||
    searchPartNumber.includes(itemMpn) ||
    itemTitle.includes(searchPartNumber);

  // If no part number match, reject this result
  if (!partNumberMatches) {
    return false;
  }

  // If brand was specified, verify it matches too
  if (searchBrand && searchBrand.length > 0) {
    const brandMatches = 
      itemBrand === searchBrand ||
      itemManufacturer === searchBrand ||
      itemBrand.includes(searchBrand) ||
      itemManufacturer.includes(searchBrand) ||
      searchBrand.includes(itemBrand) ||
      searchBrand.includes(itemManufacturer);
    
    if (!brandMatches) {
      return false;
    }
  }

  return true;
}

/**
 * Search SureDone for products matching brand and part number
 * Uses a simple search approach that's more reliable
 */
async function searchSureDone(brand, partNumber) {
  const SUREDONE_USER = process.env.SUREDONE_USER;
  const SUREDONE_TOKEN = process.env.SUREDONE_TOKEN;
  const SUREDONE_URL = process.env.SUREDONE_URL || 'https://app.suredone.com/v1';

  if (!SUREDONE_USER || !SUREDONE_TOKEN) {
    throw new Error('SureDone credentials not configured');
  }

  // Use a simpler search query - just search by the part number
  // We'll filter by brand client-side for more reliable results
  // SureDone search syntax: field:value
  const searchQuery = `mpn:${partNumber}`;

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
  let products = [];
  for (const key in data) {
    // Skip non-numeric keys (like 'result', 'errors', etc.)
    if (!isNaN(key) && data[key] && typeof data[key] === 'object') {
      products.push(data[key]);
    }
  }

  console.log(`MPN search found ${products.length} products`);

  // If MPN search didn't find anything, try model field
  if (products.length === 0) {
    console.log('No MPN matches, trying model field...');
    const modelProducts = await searchByField('model', partNumber);
    products = modelProducts;
  }

  // If still no results, try partnumber field
  if (products.length === 0) {
    console.log('No model matches, trying partnumber field...');
    const partNumProducts = await searchByField('partnumber', partNumber);
    products = partNumProducts;
  }

  // If still no results and part number is long enough, try title search
  if (products.length === 0 && partNumber.length >= 5) {
    console.log('No field matches, trying title search...');
    const titleProducts = await searchByField('title', `*${partNumber}*`);
    products = titleProducts;
  }

  return products;
}

/**
 * Helper function to search SureDone by a specific field
 */
async function searchByField(field, value) {
  const SUREDONE_USER = process.env.SUREDONE_USER;
  const SUREDONE_TOKEN = process.env.SUREDONE_TOKEN;
  const SUREDONE_URL = process.env.SUREDONE_URL || 'https://app.suredone.com/v1';

  const searchQuery = `${field}:${value}`;
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
    console.error(`Search by ${field} failed: ${response.status}`);
    return [];
  }

  const data = await response.json();
  const products = [];
  
  for (const key in data) {
    if (!isNaN(key) && data[key] && typeof data[key] === 'object') {
      products.push(data[key]);
    }
  }

  console.log(`${field} search found ${products.length} products`);
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