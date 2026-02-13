// pages/api/scanner/lookup.js
// Search for existing inventory by brand + part number
// Searches BOTH Firebase 'products' collection AND SureDone
// Returns ALL matches (not just in-stock), may return multiple SKUs for same part

import { db } from '../../../firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed. Use POST.' });
  }

  const { brand, partNumber } = req.body;

  if (!partNumber || partNumber.trim().length < 2) {
    return res.status(400).json({
      error: 'Part number required (minimum 2 characters)',
      found: false,
      firebaseMatches: [],
      suredoneMatches: [],
      totalMatches: 0
    });
  }

  const searchPartNumber = partNumber.trim().toUpperCase();
  const searchBrand = brand ? brand.trim().toUpperCase() : '';

  try {
    // Search both sources in parallel
    const [firebaseResults, suredoneResults] = await Promise.all([
      searchFirebase(searchBrand, searchPartNumber),
      searchSureDone(searchBrand, searchPartNumber)
    ]);

    const allMatches = [...firebaseResults, ...suredoneResults];

    console.log(`Lookup for "${searchBrand} ${searchPartNumber}": ${firebaseResults.length} Firebase, ${suredoneResults.length} SureDone`);

    return res.status(200).json({
      found: allMatches.length > 0,
      firebaseMatches: firebaseResults,
      suredoneMatches: suredoneResults,
      totalMatches: allMatches.length,
      searchedFor: { brand: brand || '(any)', partNumber }
    });
  } catch (error) {
    console.error('Lookup error:', error);
    return res.status(500).json({
      error: 'Failed to search inventory',
      details: error.message,
      found: false,
      firebaseMatches: [],
      suredoneMatches: [],
      totalMatches: 0
    });
  }
}

/**
 * Search Firebase products collection
 */
async function searchFirebase(brand, partNumber) {
  try {
    const productsRef = collection(db, 'products');
    const matches = [];

    // Query by partNumber field
    const q1 = query(productsRef, where('partNumber', '==', partNumber));
    const snapshot1 = await getDocs(q1);
    snapshot1.forEach(doc => {
      const data = doc.data();
      if (!brand || data.brand?.toUpperCase().includes(brand)) {
        matches.push(formatFirebaseMatch(doc.id, data));
      }
    });

    // Query by model field if no matches yet
    if (matches.length === 0) {
      const q2 = query(productsRef, where('model', '==', partNumber));
      const snapshot2 = await getDocs(q2);
      snapshot2.forEach(doc => {
        const data = doc.data();
        if (!brand || data.brand?.toUpperCase().includes(brand)) {
          matches.push(formatFirebaseMatch(doc.id, data));
        }
      });
    }

    return matches;
  } catch (error) {
    console.error('Firebase search error:', error);
    return [];
  }
}

/**
 * Normalize brand for soft matching
 * "Allen-Bradley" → "allenbradley"
 * "Allen Bradley" → "allenbradley"
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

  // Check if one contains the other (for abbreviations like "AB" = "Allen-Bradley")
  if (normalizedItem.includes(normalizedSearch) || normalizedSearch.includes(normalizedItem)) {
    return { matches: true, mismatch: null };
  }

  return {
    matches: false,
    mismatch: `Brand mismatch: searched for '${searchBrand}' but item is '${itemBrand}'`
  };
}

/**
 * Search SureDone - NO brand in queries, brand verification happens after
 */
async function searchSureDone(brand, partNumber) {
  try {
    const SUREDONE_USER = process.env.SUREDONE_USER;
    const SUREDONE_TOKEN = process.env.SUREDONE_TOKEN;

    if (!SUREDONE_USER || !SUREDONE_TOKEN) {
      console.warn('SureDone credentials not configured');
      return [];
    }

    const allProducts = new Map();

    // Strategy 1: Exact MPN (NO brand in query)
    console.log('Strategy 1: Exact MPN...');
    let products = await querySureDone(`mpn:=${partNumber}`, SUREDONE_USER, SUREDONE_TOKEN);
    if (products.length > 0) {
      products.forEach(p => allProducts.set(p.sku || p.guid, p));
      console.log(`✓ Found ${products.length} via exact MPN`);
      return applyBrandVerification(Array.from(allProducts.values()), brand, partNumber);
    }

    // Strategy 2: MPN contains (NO brand in query)
    console.log('Strategy 2: MPN contains...');
    products = await querySureDone(`mpn:${partNumber}`, SUREDONE_USER, SUREDONE_TOKEN);
    if (products.length > 0) {
      products.forEach(p => allProducts.set(p.sku || p.guid, p));
      console.log(`✓ Found ${products.length} via MPN contains`);
      return applyBrandVerification(Array.from(allProducts.values()), brand, partNumber);
    }

    // Strategy 3: Exact model (NO brand in query)
    console.log('Strategy 3: Exact model...');
    products = await querySureDone(`model:=${partNumber}`, SUREDONE_USER, SUREDONE_TOKEN);
    if (products.length > 0) {
      products.forEach(p => allProducts.set(p.sku || p.guid, p));
      console.log(`✓ Found ${products.length} via exact model`);
      return applyBrandVerification(Array.from(allProducts.values()), brand, partNumber);
    }

    // Strategy 4: Model contains (NO brand in query)
    console.log('Strategy 4: Model contains...');
    products = await querySureDone(`model:${partNumber}`, SUREDONE_USER, SUREDONE_TOKEN);
    if (products.length > 0) {
      products.forEach(p => allProducts.set(p.sku || p.guid, p));
      console.log(`✓ Found ${products.length} via model contains`);
      return applyBrandVerification(Array.from(allProducts.values()), brand, partNumber);
    }

    // Strategy 5: Exact partnumber (NO brand in query)
    console.log('Strategy 5: Exact partnumber...');
    products = await querySureDone(`partnumber:=${partNumber}`, SUREDONE_USER, SUREDONE_TOKEN);
    if (products.length > 0) {
      products.forEach(p => allProducts.set(p.sku || p.guid, p));
      console.log(`✓ Found ${products.length} via exact partnumber`);
      return applyBrandVerification(Array.from(allProducts.values()), brand, partNumber);
    }

    // Strategy 6: Title contains (NO brand in query)
    console.log('Strategy 6: Title contains...');
    products = await querySureDone(`title:${partNumber}`, SUREDONE_USER, SUREDONE_TOKEN);
    if (products.length > 0) {
      products.forEach(p => allProducts.set(p.sku || p.guid, p));
      console.log(`✓ Found ${products.length} via title contains`);
      return applyBrandVerification(Array.from(allProducts.values()), brand, partNumber);
    }

    // Strategy 7: Keyword search all fields (NO brand in query)
    console.log('Strategy 7: Keyword search...');
    products = await querySureDone(partNumber, SUREDONE_USER, SUREDONE_TOKEN);
    if (products.length > 0) {
      products.forEach(p => allProducts.set(p.sku || p.guid, p));
      console.log(`✓ Found ${products.length} via keyword search`);
      return applyBrandVerification(Array.from(allProducts.values()), brand, partNumber);
    }

    console.log('No results found');
    return [];
  } catch (error) {
    console.error('SureDone search error:', error);
    return [];
  }
}

/**
 * Apply brand verification and part number matching after search
 */
function applyBrandVerification(results, searchBrand, searchPartNumber) {
  const verified = results
    .filter(item => isActualMatch(item, '', searchPartNumber)) // Match part number (no brand filter)
    .map(item => {
      const brandCheck = verifyBrand(searchBrand, item.brand);
      const formatted = formatSureDoneMatch(item);
      return {
        ...formatted,
        brandMatches: brandCheck.matches,
        brandMismatch: brandCheck.mismatch
      };
    });

  // Sort: brand matches first, mismatches at bottom
  return verified.sort((a, b) => {
    if (a.brandMatches && !b.brandMatches) return -1;
    if (!a.brandMatches && b.brandMatches) return 1;
    return 0;
  });
}

/**
 * Query SureDone API
 */
async function querySureDone(searchQuery, user, token) {
  const url = `https://api.suredone.com/v1/search/items/${encodeURIComponent(searchQuery)}`;

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'X-Auth-User': user,
      'X-Auth-Token': token
    }
  });

  if (!response.ok) {
    console.error(`SureDone query failed: ${response.status}`);
    return [];
  }

  const data = await response.json();
  const products = [];

  for (const key in data) {
    if (!isNaN(key) && data[key] && typeof data[key] === 'object') {
      products.push(data[key]);
    }
  }

  return products;
}

/**
 * Verify that a SureDone product actually matches
 */
function isActualMatch(item, searchBrand, searchPartNumber) {
  const itemModel = (item.model || '').toUpperCase().trim();
  const itemMpn = (item.mpn || '').toUpperCase().trim();
  const itemPartNumber = (item.partnumber || '').toUpperCase().trim();
  const itemBrand = (item.brand || '').toUpperCase().trim();

  // Check part number match
  const partMatches =
    itemModel === searchPartNumber ||
    itemMpn === searchPartNumber ||
    itemPartNumber === searchPartNumber ||
    itemModel.includes(searchPartNumber) ||
    itemMpn.includes(searchPartNumber) ||
    itemPartNumber.includes(searchPartNumber);

  if (!partMatches) return false;

  // Check brand if specified
  if (searchBrand && searchBrand.length > 0) {
    const brandMatches = itemBrand.includes(searchBrand);
    if (!brandMatches) return false;
  }

  return true;
}

/**
 * Format Firebase match
 */
function formatFirebaseMatch(id, data) {
  return {
    source: 'firebase',
    id: id,
    sku: data.sku || 'N/A',
    brand: data.brand || 'Unknown',
    partNumber: data.partNumber || data.model || '',
    title: data.title || 'No Title',
    condition: data.condition || 'Unknown',
    shelf: data.shelf || 'Not Assigned',
    stock: parseInt(data.stock) || 0,
    price: data.price || '0.00',
    thumbnail: data.thumbnail || null,
    lastModified: data.updatedAt || data.createdAt || null
  };
}

/**
 * Format SureDone match
 */
function formatSureDoneMatch(item) {
  return {
    source: 'suredone',
    sku: item.sku || item.guid || 'N/A',
    guid: item.guid || '',
    brand: item.brand || item.manufacturer || 'Unknown',
    partNumber: item.mpn || item.model || item.partnumber || '',
    title: item.title || 'No Title',
    condition: item.condition || 'Unknown',
    shelf: item.shelf || 'Not Assigned',
    stock: parseInt(item.stock) || 0,
    price: item.price || '0.00',
    thumbnail: item.media1 || null,
    lastModified: item.dateutc || item.date || null
  };
}
