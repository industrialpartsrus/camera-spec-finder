// pages/api/check-inventory.js
// SureDone Inventory Search - Checks for existing inventory before creating new listings
// Uses the correct SureDone Search API: GET /v1/search/items/{query}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed. Use POST.' });
  }

  const { brand, partNumber } = req.body;

  if (!partNumber || partNumber.trim().length < 3) {
    return res.status(400).json({ 
      error: 'Part number is required (minimum 3 characters)',
      found: false,
      matches: [],
      totalMatches: 0
    });
  }

  // SureDone search is case-sensitive - keep original case for search
  // but use uppercase for our verification
  const searchPartNumber = partNumber.trim();
  const searchBrand = brand ? brand.trim() : '';
  const cleanPartNumber = searchPartNumber.toUpperCase();
  const cleanBrand = searchBrand.toUpperCase();

  try {
    const allResults = await searchSureDoneComprehensive(searchBrand, searchPartNumber);
    
    // Filter results to ensure they actually match
    const verifiedMatches = allResults.filter(item => {
      return isActualMatch(item, cleanBrand, cleanPartNumber);
    });

    // Filter to only items with stock > 0
    const inStockMatches = verifiedMatches.filter(item => {
      const stock = parseInt(item.stock) || 0;
      return stock > 0;
    });

    const formattedMatches = inStockMatches.map(item => formatProductMatch(item));

    console.log(`Search for "${searchBrand} ${searchPartNumber}": ${allResults.length} raw, ${verifiedMatches.length} verified, ${inStockMatches.length} in stock`);

    return res.status(200).json({
      found: formattedMatches.length > 0,
      matches: formattedMatches,
      totalMatches: formattedMatches.length,
      searchedFor: { brand: brand || '(any)', partNumber },
      debug: { rawResults: allResults.length, verifiedMatches: verifiedMatches.length, inStockMatches: inStockMatches.length }
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
 */
function isActualMatch(item, searchBrand, searchPartNumber) {
  const itemModel = (item.model || '').toUpperCase().trim();
  const itemMpn = (item.mpn || '').toUpperCase().trim();
  const itemPartNumber = (item.partnumber || '').toUpperCase().trim();
  const itemTitle = (item.title || '').toUpperCase().trim();
  const itemBrand = (item.brand || '').toUpperCase().trim();
  const itemManufacturer = (item.manufacturer || '').toUpperCase().trim();

  if (itemModel.length === 0 && itemMpn.length === 0 && itemPartNumber.length === 0) {
    return false;
  }

  let partNumberMatches = false;
  
  // Exact match
  if (itemModel === searchPartNumber || itemMpn === searchPartNumber || itemPartNumber === searchPartNumber) {
    partNumberMatches = true;
  }
  
  // Contains match
  if (!partNumberMatches) {
    if (itemModel.includes(searchPartNumber) || itemMpn.includes(searchPartNumber) || 
        itemPartNumber.includes(searchPartNumber) || itemTitle.includes(searchPartNumber)) {
      partNumberMatches = true;
    }
  }
  
  // Reverse contains (for partial searches)
  if (!partNumberMatches) {
    if ((itemModel.length >= 5 && searchPartNumber.includes(itemModel)) ||
        (itemMpn.length >= 5 && searchPartNumber.includes(itemMpn)) ||
        (itemPartNumber.length >= 5 && searchPartNumber.includes(itemPartNumber))) {
      partNumberMatches = true;
    }
  }

  if (!partNumberMatches) return false;

  // Check brand if specified
  if (searchBrand && searchBrand.length > 0) {
    const brandMatches = 
      itemBrand === searchBrand || itemManufacturer === searchBrand ||
      itemBrand.includes(searchBrand) || itemManufacturer.includes(searchBrand) ||
      (itemBrand.length >= 2 && searchBrand.includes(itemBrand)) ||
      (itemManufacturer.length >= 2 && searchBrand.includes(itemManufacturer));
    
    if (!brandMatches) return false;
  }

  console.log(`Accepted: "${item.title}"`);
  return true;
}

/**
 * Comprehensive search using the correct SureDone Search API
 * Endpoint: GET https://api.suredone.com/v1/search/items/{query}
 */
async function searchSureDoneComprehensive(brand, partNumber) {
  const allProducts = new Map();
  
  // Strategy 1: Exact match on MPN (lowercase field name, := for exact)
  console.log('Strategy 1: Exact MPN match...');
  let products = await searchSureDone(`mpn:=${partNumber}`);
  products.forEach(p => allProducts.set(p.sku || p.guid, p));
  console.log(`After exact MPN: ${allProducts.size} products`);
  
  // Strategy 2: Contains match on MPN
  if (allProducts.size === 0) {
    console.log('Strategy 2: MPN contains...');
    products = await searchSureDone(`mpn:${partNumber}`);
    products.forEach(p => allProducts.set(p.sku || p.guid, p));
    console.log(`After MPN contains: ${allProducts.size} products`);
  }
  
  // Strategy 3: Exact match on model
  if (allProducts.size === 0) {
    console.log('Strategy 3: Exact model match...');
    products = await searchSureDone(`model:=${partNumber}`);
    products.forEach(p => allProducts.set(p.sku || p.guid, p));
    console.log(`After exact model: ${allProducts.size} products`);
  }
  
  // Strategy 4: Contains match on model
  if (allProducts.size === 0) {
    console.log('Strategy 4: Model contains...');
    products = await searchSureDone(`model:${partNumber}`);
    products.forEach(p => allProducts.set(p.sku || p.guid, p));
    console.log(`After model contains: ${allProducts.size} products`);
  }
  
  // Strategy 5: Exact match on partnumber field
  if (allProducts.size === 0) {
    console.log('Strategy 5: Exact partnumber match...');
    products = await searchSureDone(`partnumber:=${partNumber}`);
    products.forEach(p => allProducts.set(p.sku || p.guid, p));
    console.log(`After exact partnumber: ${allProducts.size} products`);
  }
  
  // Strategy 6: Title contains
  if (allProducts.size === 0) {
    console.log('Strategy 6: Title contains...');
    products = await searchSureDone(`title:${partNumber}`);
    products.forEach(p => allProducts.set(p.sku || p.guid, p));
    console.log(`After title contains: ${allProducts.size} products`);
  }
  
  // Strategy 7: Plain keyword search (searches all fields)
  if (allProducts.size === 0) {
    console.log('Strategy 7: Keyword search...');
    products = await searchSureDone(partNumber);
    products.forEach(p => allProducts.set(p.sku || p.guid, p));
    console.log(`After keyword search: ${allProducts.size} products`);
  }
  
  // Strategy 8: Brand + part number combined
  if (allProducts.size === 0 && brand) {
    console.log(`Strategy 8: Brand + part number: ${brand} ${partNumber}`);
    products = await searchSureDone(`brand:=${brand} mpn:${partNumber}`);
    products.forEach(p => allProducts.set(p.sku || p.guid, p));
    console.log(`After brand+mpn: ${allProducts.size} products`);
  }

  return Array.from(allProducts.values());
}

/**
 * Search SureDone using the correct API endpoint
 * GET https://api.suredone.com/v1/search/items/{query}
 */
async function searchSureDone(searchQuery) {
  const SUREDONE_USER = process.env.SUREDONE_USER;
  const SUREDONE_TOKEN = process.env.SUREDONE_TOKEN;

  if (!SUREDONE_USER || !SUREDONE_TOKEN) {
    throw new Error('SureDone credentials not configured');
  }

  // Use the correct Search API endpoint
  // The query goes in the URL path, not as a query parameter
  const url = `https://api.suredone.com/v1/search/items/${encodeURIComponent(searchQuery)}`;
  
  console.log(`SureDone API: ${url}`);
  
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'X-Auth-User': SUREDONE_USER,
      'X-Auth-Token': SUREDONE_TOKEN
    }
  });

  if (!response.ok) {
    console.error(`SureDone search failed: ${response.status} ${response.statusText}`);
    return [];
  }

  const data = await response.json();
  const products = [];
  
  // SureDone returns products as numbered keys
  for (const key in data) {
    if (!isNaN(key) && data[key] && typeof data[key] === 'object') {
      products.push(data[key]);
    }
  }

  // Log total count if available
  if (data.all) {
    console.log(`Search found ${products.length} products (${data.all} total in DB)`);
  } else {
    console.log(`Search found ${products.length} products`);
  }
  
  return products;
}

/**
 * Format product for response
 */
function formatProductMatch(item) {
  let imageCount = 0;
  for (let i = 1; i <= 10; i++) {
    if (item[`media${i}`] && item[`media${i}`].trim() !== '') {
      imageCount++;
    }
  }

  const channels = {
    ebay: !!(item.ebayid || item.ebaycatid),
    bigcommerce: !!(item.bigcommerceid || item.bigcommercecategories)
  };

  const missingFields = [];
  ['brand', 'mpn', 'model', 'condition', 'price'].forEach(field => {
    if (!item[field] || item[field].trim() === '') {
      missingFields.push(field);
    }
  });

  const brandValue = item.brand && item.brand.trim() !== '' 
    ? item.brand 
    : (item.manufacturer || 'Unknown');

  return {
    sku: item.sku || item.guid || 'N/A',
    guid: item.guid || '',
    title: item.title || 'No Title',
    brand: brandValue,
    model: item.model || '',
    mpn: item.mpn || '',
    partNumber: item.partnumber || '',
    condition: item.condition || 'Unknown',
    shelf: item.shelf || 'Not Assigned',
    stock: parseInt(item.stock) || 0,
    price: item.price || '0.00',
    thumbnail: item.media1 || null,
    hasImages: imageCount > 0,
    imageCount: imageCount,
    hasItemSpecifics: missingFields.length === 0,
    missingFields: missingFields,
    channels: channels,
    ebayCategory: item.ebaycatid || null,
    ebayStoreCategory: item.ebaystoreid || null,
    lastModified: item.dateutc || item.date || null,
    descriptionPreview: item.longdescription 
      ? item.longdescription.substring(0, 200) + '...'
      : 'No description'
  };
}