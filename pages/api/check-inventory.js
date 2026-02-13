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

  return true;
}

/**
 * Normalize brand for soft matching
 */
function normalizeBrand(brand) {
  if (!brand) return '';
  return brand.toLowerCase().replace(/[^a-z0-9]/g, '');
}

/**
 * Verify brand match with soft matching
 */
function verifyBrand(searchBrand, itemBrand) {
  if (!searchBrand || searchBrand.trim() === '') {
    return { matches: true, mismatch: null };
  }

  const normalizedSearch = normalizeBrand(searchBrand);
  const normalizedItem = normalizeBrand(itemBrand);

  if (normalizedSearch === normalizedItem) {
    return { matches: true, mismatch: null };
  }

  if (normalizedItem.includes(normalizedSearch) || normalizedSearch.includes(normalizedItem)) {
    return { matches: true, mismatch: null };
  }

  return {
    matches: false,
    mismatch: `Brand mismatch: searched for '${searchBrand}' but item is '${itemBrand}'`
  };
}

/**
 * Comprehensive search - NO brand in queries, brand verification happens after
 */
async function searchSureDoneComprehensive(brand, partNumber) {
  const allProducts = new Map();

  // Strategy 1: Exact MPN (NO brand in query)
  let products = await searchSureDone(`mpn:=${partNumber}`);
  if (products.length > 0) {
    products.forEach(p => allProducts.set(p.sku || p.guid, p));
    return applyBrandVerification(Array.from(allProducts.values()), brand);
  }

  // Strategy 2: MPN contains (NO brand in query)
  products = await searchSureDone(`mpn:${partNumber}`);
  if (products.length > 0) {
    products.forEach(p => allProducts.set(p.sku || p.guid, p));
    return applyBrandVerification(Array.from(allProducts.values()), brand);
  }

  // Strategy 3: Exact model (NO brand in query)
  products = await searchSureDone(`model:=${partNumber}`);
  if (products.length > 0) {
    products.forEach(p => allProducts.set(p.sku || p.guid, p));
    return applyBrandVerification(Array.from(allProducts.values()), brand);
  }

  // Strategy 4: Model contains (NO brand in query)
  products = await searchSureDone(`model:${partNumber}`);
  if (products.length > 0) {
    products.forEach(p => allProducts.set(p.sku || p.guid, p));
    return applyBrandVerification(Array.from(allProducts.values()), brand);
  }

  // Strategy 5: Exact partnumber (NO brand in query)
  products = await searchSureDone(`partnumber:=${partNumber}`);
  if (products.length > 0) {
    products.forEach(p => allProducts.set(p.sku || p.guid, p));
    return applyBrandVerification(Array.from(allProducts.values()), brand);
  }

  // Strategy 6: Title contains (NO brand in query)
  products = await searchSureDone(`title:${partNumber}`);
  if (products.length > 0) {
    products.forEach(p => allProducts.set(p.sku || p.guid, p));
    return applyBrandVerification(Array.from(allProducts.values()), brand);
  }

  // Strategy 7: Keyword search all fields (NO brand in query)
  products = await searchSureDone(partNumber);
  if (products.length > 0) {
    products.forEach(p => allProducts.set(p.sku || p.guid, p));
    return applyBrandVerification(Array.from(allProducts.values()), brand);
  }

  return [];
}

/**
 * Apply brand verification after search
 */
function applyBrandVerification(results, searchBrand) {
  return results.map(item => {
    const brandCheck = verifyBrand(searchBrand, item.brand);
    return {
      ...item,
      brandMatches: brandCheck.matches,
      brandMismatch: brandCheck.mismatch
    };
  }).sort((a, b) => {
    if (a.brandMatches && !b.brandMatches) return -1;
    if (!a.brandMatches && b.brandMatches) return 1;
    return 0;
  });
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