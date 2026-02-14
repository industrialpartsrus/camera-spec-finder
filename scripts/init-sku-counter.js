// scripts/init-sku-counter.js
// One-time script to initialize the SKU counter in Firestore
// Run this once: node scripts/init-sku-counter.js

import { db } from '../firebase.js';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';

async function initSkuCounter() {
  try {
    // Set this to your current highest SKU number
    // For example, if your latest SKU is AI0173, set this to 173
    const CURRENT_HIGHEST_SKU_NUMBER = 173;

    const counterRef = doc(db, 'counters', 'sku_counter');

    await setDoc(counterRef, {
      currentNumber: CURRENT_HIGHEST_SKU_NUMBER,
      lastUpdated: serverTimestamp(),
      note: 'Auto-incrementing counter for AI#### SKUs. Next SKU will be AI' + String(CURRENT_HIGHEST_SKU_NUMBER + 1).padStart(4, '0')
    });

    console.log('✅ SKU counter initialized!');
    console.log(`   Current: AI${String(CURRENT_HIGHEST_SKU_NUMBER).padStart(4, '0')}`);
    console.log(`   Next SKU will be: AI${String(CURRENT_HIGHEST_SKU_NUMBER + 1).padStart(4, '0')}`);
    console.log('\n   You can now use the SKU generator in Scanner and Pro Listing Builder.');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error initializing SKU counter:', error);
    process.exit(1);
  }
}

initSkuCounter();
