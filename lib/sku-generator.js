// lib/sku-generator.js
// Generate next AI#### SKU by checking both Firebase and SureDone
// Format: AI0001, AI0002, AI0003, etc. (4-digit zero-padded)

import { db } from '../firebase';
import { collection, query, where, getDocs, orderBy, limit } from 'firebase/firestore';

/**
 * Extract numeric part from AI#### SKU format
 * @param {string} sku - SKU string like "AI0123"
 * @returns {number|null} - Numeric part (123) or null if invalid format
 */
function extractSkuNumber(sku) {
  if (!sku || typeof sku !== 'string') return null;
  const match = sku.match(/^AI(\d{4})$/i);
  return match ? parseInt(match[1], 10) : null;
}

/**
 * Format number as AI#### SKU
 * @param {number} num - Number to format (1-9999)
 * @returns {string} - Formatted SKU like "AI0001"
 */
function formatSku(num) {
  if (num < 1 || num > 9999) {
    throw new Error(`SKU number ${num} out of range (1-9999)`);
  }
  return `AI${String(num).padStart(4, '0')}`;
}

/**
 * Get highest SKU number from Firebase products collection
 * @returns {Promise<number>} - Highest SKU number found, or 0 if none
 */
async function getHighestFirebaseSku() {
  try {
    const productsRef = collection(db, 'products');
    // Get all SKUs starting with "AI"
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
 * @returns {Promise<number>} - Highest SKU number found, or 0 if none
 */
async function getHighestSureDoneSku() {
  try {
    const SUREDONE_USER = process.env.SUREDONE_USER;
    const SUREDONE_TOKEN = process.env.SUREDONE_TOKEN;

    if (!SUREDONE_USER || !SUREDONE_TOKEN) {
      console.warn('SureDone credentials not configured');
      return 0;
    }

    // Search for SKUs starting with AI using SureDone search API
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

    // SureDone returns products as numbered keys
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
 * Generate the next available AI#### SKU
 * Checks both Firebase and SureDone, returns the next sequential SKU
 * @returns {Promise<string>} - Next SKU like "AI0001", "AI0123", etc.
 */
export async function generateNextSku() {
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
      throw new Error('SKU range exhausted (AI9999 reached)');
    }

    const nextSku = formatSku(nextNum);
    console.log(`Generated next SKU: ${nextSku} (Firebase: ${firebaseMax}, SureDone: ${suredoneMax})`);

    return nextSku;
  } catch (error) {
    console.error('Error generating SKU:', error);
    throw error;
  }
}

/**
 * Validate SKU format
 * @param {string} sku - SKU to validate
 * @returns {boolean} - True if valid AI#### format
 */
export function isValidSku(sku) {
  return /^AI\d{4}$/.test(sku);
}
