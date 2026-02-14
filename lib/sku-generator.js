// lib/sku-generator.js
// Generate next AI#### SKU using atomic Firestore counter
// Format: AI0001, AI0002, AI0003, etc. (4-digit zero-padded)

import { db } from '../firebase';
import { doc, runTransaction, setDoc, serverTimestamp } from 'firebase/firestore';

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
 * Generate the next available AI#### SKU using atomic Firestore counter
 * Uses a transaction to safely increment the counter even with concurrent requests
 * @returns {Promise<string>} - Next SKU like "AI0174", "AI0175", etc.
 */
export async function generateNextSku() {
  try {
    const counterRef = doc(db, 'counters', 'sku_counter');

    // Use transaction for atomic increment (safe even with concurrent requests)
    const nextSku = await runTransaction(db, async (transaction) => {
      const counterDoc = await transaction.get(counterRef);

      if (!counterDoc.exists()) {
        // Counter doesn't exist yet - initialize it
        // This should only happen once, then you manually set it to your current highest SKU
        throw new Error(
          'SKU counter not initialized. Please create Firestore document: ' +
          'counters/sku_counter with field currentNumber: 173 ' +
          '(or whatever your current highest SKU number is)'
        );
      }

      const currentNumber = counterDoc.data().currentNumber;

      if (typeof currentNumber !== 'number') {
        throw new Error('SKU counter currentNumber field must be a number');
      }

      const nextNumber = currentNumber + 1;

      if (nextNumber > 9999) {
        throw new Error('SKU range exhausted (AI9999 reached)');
      }

      // Atomically increment the counter
      transaction.update(counterRef, {
        currentNumber: nextNumber
      });

      return formatSku(nextNumber);
    });

    console.log(`✅ Generated next SKU: ${nextSku} (counter-based, atomic)`);
    return nextSku;
  } catch (error) {
    console.error('❌ Error generating SKU:', error);
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

/**
 * Initialize the SKU counter (run this once manually if needed)
 * This is a helper function - you can also create the document manually in Firebase Console
 * @param {number} startingNumber - The current highest SKU number (e.g., 173 for AI0173)
 */
export async function initializeSkuCounter(startingNumber) {
  try {
    const counterRef = doc(db, 'counters', 'sku_counter');
    await setDoc(counterRef, {
      currentNumber: startingNumber,
      lastUpdated: serverTimestamp(),
      note: 'Auto-incrementing counter for AI#### SKUs'
    });
    console.log(`✅ SKU counter initialized to ${startingNumber} (next SKU will be AI${String(startingNumber + 1).padStart(4, '0')})`);
  } catch (error) {
    console.error('❌ Error initializing SKU counter:', error);
    throw error;
  }
}
