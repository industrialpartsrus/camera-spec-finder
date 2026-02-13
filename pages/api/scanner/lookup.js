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
 * Search SureDone (reuses logic from check-inventory.js)
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

    // Strategy 1: Exact MPN match
    let products = await querySureDone(`mpn:=${partNumber}`, SUREDONE_USER, SUREDONE_TOKEN);
    products.forEach(p => allProducts.set(p.sku || p.guid, p));

    // Strategy 2: MPN contains
    if (allProducts.size === 0) {
      products = await querySureDone(`mpn:${partNumber}`, SUREDONE_USER, SUREDONE_TOKEN);
      products.forEach(p => allProducts.set(p.sku || p.guid, p));
    }

    // Strategy 3: Model exact
    if (allProducts.size === 0) {
      products = await querySureDone(`model:=${partNumber}`, SUREDONE_USER, SUREDONE_TOKEN);
      products.forEach(p => allProducts.set(p.sku || p.guid, p));
    }

    // Strategy 4: Partnumber exact
    if (allProducts.size === 0) {
      products = await querySureDone(`partnumber:=${partNumber}`, SUREDONE_USER, SUREDONE_TOKEN);
      products.forEach(p => allProducts.set(p.sku || p.guid, p));
    }

    // Strategy 5: Brand + MPN
    if (allProducts.size === 0 && brand) {
      products = await querySureDone(`brand:=${brand} mpn:${partNumber}`, SUREDONE_USER, SUREDONE_TOKEN);
      products.forEach(p => allProducts.set(p.sku || p.guid, p));
    }

    const allResults = Array.from(allProducts.values());

    // Filter to verified matches
    const verifiedMatches = allResults.filter(item => isActualMatch(item, brand, partNumber));

    return verifiedMatches.map(item => formatSureDoneMatch(item));
  } catch (error) {
    console.error('SureDone search error:', error);
    return [];
  }
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
