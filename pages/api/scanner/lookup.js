// pages/api/scanner/lookup.js
// Search for existing inventory by brand + part number
// Searches BOTH Firebase 'products' collection AND SureDone
// Returns ALL matches (not just in-stock), may return multiple SKUs for same part

import { db } from '../../../firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { getSureDoneCredentials } from '../../../lib/suredone-config';

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

  // IMPORTANT: Don't uppercase for SureDone search - it's case-sensitive!
  // Keep original case for better matching
  const searchPartNumber = partNumber.trim();
  const searchBrand = brand ? brand.trim() : '';

  try {
    // Search both sources in parallel
    const [firebaseResults, suredoneResults] = await Promise.all([
      searchFirebase(searchBrand, searchPartNumber),
      searchSureDone(searchBrand, searchPartNumber)
    ]);

    const allMatches = [...firebaseResults, ...suredoneResults];

    const response = {
      found: allMatches.length > 0,
      firebaseMatches: firebaseResults,
      suredoneMatches: suredoneResults,
      totalMatches: allMatches.length,
      searchedFor: { brand: brand || '(any)', partNumber }
    };

    return res.status(200).json(response);
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

    // Query by partNumber field (try both original case and uppercase)
    const seenIds = new Set();
    const partNumberVariants = [partNumber];
    if (partNumber !== partNumber.toUpperCase()) {
      partNumberVariants.push(partNumber.toUpperCase());
    }

    for (const pn of partNumberVariants) {
      const q1 = query(productsRef, where('partNumber', '==', pn));
      const snapshot1 = await getDocs(q1);
      snapshot1.forEach(doc => {
        if (seenIds.has(doc.id)) return;
        const data = doc.data();
        if (!brand || verifyBrand(brand, data.brand).matches) {
          seenIds.add(doc.id);
          matches.push(formatFirebaseMatch(doc.id, data));
        }
      });
    }

    // Query by model field if no matches yet
    if (matches.length === 0) {
      for (const pn of partNumberVariants) {
        const q2 = query(productsRef, where('model', '==', pn));
        const snapshot2 = await getDocs(q2);
        snapshot2.forEach(doc => {
          if (seenIds.has(doc.id)) return;
          const data = doc.data();
          if (!brand || verifyBrand(brand, data.brand).matches) {
            seenIds.add(doc.id);
            matches.push(formatFirebaseMatch(doc.id, data));
          }
        });
      }
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
    let SUREDONE_USER, SUREDONE_TOKEN;
    try {
      const creds = getSureDoneCredentials();
      SUREDONE_USER = creds.user;
      SUREDONE_TOKEN = creds.token;
    } catch (e) {
      console.warn('SureDone credentials not configured');
      return [];
    }

    const allProducts = new Map();

    // Strategy 1: Exact MPN (NO brand in query)
    let products = await querySureDone(`mpn:=${partNumber}`, SUREDONE_USER, SUREDONE_TOKEN);
    if (products.length > 0) {
      products.forEach(p => allProducts.set(p.sku || p.guid, p));
      return applyBrandVerification(Array.from(allProducts.values()), brand, partNumber);
    }

    // Strategy 2: MPN contains (NO brand in query)
    products = await querySureDone(`mpn:${partNumber}`, SUREDONE_USER, SUREDONE_TOKEN);
    if (products.length > 0) {
      products.forEach(p => allProducts.set(p.sku || p.guid, p));
      return applyBrandVerification(Array.from(allProducts.values()), brand, partNumber);
    }

    // Strategy 3: Exact model (NO brand in query)
    products = await querySureDone(`model:=${partNumber}`, SUREDONE_USER, SUREDONE_TOKEN);
    if (products.length > 0) {
      products.forEach(p => allProducts.set(p.sku || p.guid, p));
      return applyBrandVerification(Array.from(allProducts.values()), brand, partNumber);
    }

    // Strategy 4: Model contains (NO brand in query)
    products = await querySureDone(`model:${partNumber}`, SUREDONE_USER, SUREDONE_TOKEN);
    if (products.length > 0) {
      products.forEach(p => allProducts.set(p.sku || p.guid, p));
      return applyBrandVerification(Array.from(allProducts.values()), brand, partNumber);
    }

    // Strategy 5: Exact partnumber (NO brand in query)
    products = await querySureDone(`partnumber:=${partNumber}`, SUREDONE_USER, SUREDONE_TOKEN);
    if (products.length > 0) {
      products.forEach(p => allProducts.set(p.sku || p.guid, p));
      return applyBrandVerification(Array.from(allProducts.values()), brand, partNumber);
    }

    // Strategy 6: Title contains (NO brand in query)
    products = await querySureDone(`title:${partNumber}`, SUREDONE_USER, SUREDONE_TOKEN);
    if (products.length > 0) {
      products.forEach(p => allProducts.set(p.sku || p.guid, p));
      return applyBrandVerification(Array.from(allProducts.values()), brand, partNumber);
    }

    // Strategy 7: Keyword search all fields (NO brand in query)
    products = await querySureDone(partNumber, SUREDONE_USER, SUREDONE_TOKEN);
    if (products.length > 0) {
      products.forEach(p => allProducts.set(p.sku || p.guid, p));
      return applyBrandVerification(Array.from(allProducts.values()), brand, partNumber);
    }

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
    sku: data.sku || data.originalSku || 'N/A',
    brand: data.brand || 'Unknown',
    partNumber: data.partNumber || data.model || '',
    title: data.title || 'No Title',
    condition: data.condition || 'Unknown',
    shelf: data.shelf || 'Not Assigned',
    stock: parseInt(data.stock || data.quantity) || 0,
    price: data.price || '0.00',
    thumbnail: data.photos?.[0] || data.thumbnail || null,
    lastModified: data.updatedAt || data.createdAt || null,
    isQueueItem: !data.originalSku, // Items without originalSku are queue items (not yet in SureDone)
    status: data.status || 'in_queue',
    weight: data.weight || '',
    boxlength: data.boxLength || '',
    boxwidth: data.boxWidth || '',
    boxheight: data.boxHeight || '',
  };
}

/**
 * Format SureDone match
 */
function formatSureDoneMatch(item) {
  // Count how many media slots have images
  let imageCount = 0;
  for (let i = 1; i <= 12; i++) {
    if (item[`media${i}`] && item[`media${i}`].trim() !== '') {
      imageCount++;
    }
  }

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
    lastModified: item.dateutc || item.date || null,
    // Health check fields
    ebayid: item.ebayid || null,
    ebaycatid: item.ebaycatid || null,
    imageCount: imageCount,
    hasDescription: !!(item.longdescription && item.longdescription.trim().length > 10),
    datecreated: item.datecreated || item.dateutc || null,
    // BigCommerce fields
    bigcommercecustomurl: item.bigcommercecustomurl || null,
    bigcommercempn: item.bigcommercempn || null,
    bigcommercebinpickingnumber: item.bigcommercebinpickingnumber || null,
    // Shipping measurements
    weight: item.weight || '',
    boxlength: item.boxlength || '',
    boxwidth: item.boxwidth || '',
    boxheight: item.boxheight || '',
  };
}
