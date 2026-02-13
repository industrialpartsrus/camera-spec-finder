// pages/api/generate-sku.js
// Server-side API endpoint for SKU generation
// Checks both Firebase and SureDone for highest AI#### SKU

import { db } from '../../firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';

/**
 * Extract numeric part from AI#### SKU format
 */
function extractSkuNumber(sku) {
  if (!sku || typeof sku !== 'string') return null;
  const match = sku.match(/^AI(\d{4})$/i);
  return match ? parseInt(match[1], 10) : null;
}

/**
 * Format number as AI#### SKU
 */
function formatSku(num) {
  if (num < 1 || num > 9999) {
    throw new Error(`SKU number ${num} out of range (1-9999)`);
  }
  return `AI${String(num).padStart(4, '0')}`;
}

/**
 * Get highest SKU number from Firebase products collection
 */
async function getHighestFirebaseSku() {
  try {
    const productsRef = collection(db, 'products');
    const q = query(
      productsRef,
      where('sku', '>=', 'AI0000'),
      where('sku', '<=', 'AI9999')
    );

    const snapshot = await getDocs(q);
    let maxNum = 0;

    snapshot.forEach(doc => {
      const sku = doc.data().sku;
      const num = extractSkuNumber(sku);
      if (num !== null && num > maxNum) {
        maxNum = num;
      }
    });

    console.log(`Firebase highest SKU: AI${String(maxNum).padStart(4, '0')}`);
    return maxNum;
  } catch (error) {
    console.error('Error querying Firebase SKUs:', error);
    return 0;
  }
}

/**
 * Get highest SKU number from SureDone
 */
async function getHighestSureDoneSku() {
  try {
    const SUREDONE_USER = process.env.SUREDONE_USER;
    const SUREDONE_TOKEN = process.env.SUREDONE_TOKEN;

    if (!SUREDONE_USER || !SUREDONE_TOKEN) {
      console.warn('SureDone credentials not configured');
      return 0;
    }

    const url = `https://api.suredone.com/v1/search/items/${encodeURIComponent('sku:AI*')}`;

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'X-Auth-User': SUREDONE_USER,
        'X-Auth-Token': SUREDONE_TOKEN
      }
    });

    if (!response.ok) {
      console.error(`SureDone search failed: ${response.status}`);
      return 0;
    }

    const data = await response.json();
    let maxNum = 0;

    for (const key in data) {
      if (!isNaN(key) && data[key] && typeof data[key] === 'object') {
        const sku = data[key].sku;
        const num = extractSkuNumber(sku);
        if (num !== null && num > maxNum) {
          maxNum = num;
        }
      }
    }

    console.log(`SureDone highest SKU: AI${String(maxNum).padStart(4, '0')}`);
    return maxNum;
  } catch (error) {
    console.error('Error querying SureDone SKUs:', error);
    return 0;
  }
}

/**
 * API handler - Generate next available AI#### SKU
 */
export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed. Use GET.' });
  }

  try {
    // Check both sources in parallel
    const [firebaseMax, suredoneMax] = await Promise.all([
      getHighestFirebaseSku(),
      getHighestSureDoneSku()
    ]);

    // Use the higher of the two
    const currentMax = Math.max(firebaseMax, suredoneMax);
    const nextNum = currentMax + 1;

    if (nextNum > 9999) {
      return res.status(500).json({ error: 'SKU range exhausted (AI9999 reached)' });
    }

    const nextSku = formatSku(nextNum);
    console.log(`Generated next SKU: ${nextSku} (Firebase: ${firebaseMax}, SureDone: ${suredoneMax})`);

    return res.status(200).json({
      success: true,
      sku: nextSku,
      firebaseMax: firebaseMax,
      suredoneMax: suredoneMax
    });
  } catch (error) {
    console.error('Error generating SKU:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to generate SKU',
      details: error.message
    });
  }
}
