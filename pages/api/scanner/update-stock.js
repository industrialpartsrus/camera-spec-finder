// pages/api/scanner/update-stock.js
// Update stock quantity in Firebase AND push to SureDone (which syncs to eBay + BigCommerce)
// Also logs the action to activity_log and scan_log collections

import { db } from '../../../firebase';
import { collection, doc, updateDoc, addDoc, getDoc, serverTimestamp, Timestamp } from 'firebase/firestore';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed. Use POST.' });
  }

  const {
    sku,
    newStock,
    oldStock,
    partNumber,
    brand,
    condition, // Condition from Scanner (e.g., 'used_good', 'new_in_box')
    shelf,
    scannedBy,
    action, // 'add_stock', 'create_new', 'update_existing'
    firebaseId // Firebase document ID if updating existing
  } = req.body;

  // Validation
  if (!sku || newStock === undefined || newStock === null) {
    return res.status(400).json({
      error: 'SKU and newStock are required',
      success: false
    });
  }

  if (newStock < 0) {
    return res.status(400).json({
      error: 'Stock cannot be negative',
      success: false
    });
  }

  if (!scannedBy) {
    return res.status(400).json({
      error: 'scannedBy (username) is required',
      success: false
    });
  }

  try {
    const updates = {
      stock: newStock,
      updatedAt: serverTimestamp(),
      lastScannedBy: scannedBy,
      lastScannedAt: serverTimestamp()
    };

    if (shelf) {
      updates.shelf = shelf;
    }

    // Create or update Firebase
    let createdFirebaseId = null;
    try {
      if (action === 'create_new' && !firebaseId) {
        // CREATE new Firebase document
        const newProduct = {
          sku: sku,
          partNumber: partNumber || '',
          brand: brand || '',
          stock: newStock,
          shelf: shelf || 'Not Assigned',
          condition: condition || 'used_good', // Use Scanner's condition, default to 'used_good'
          scannedBy: scannedBy,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
          lastScannedBy: scannedBy,
          lastScannedAt: serverTimestamp(),
          photoCount: 0,
          status: 'needs_photos',
          lifecycle: {
            scannedBy: scannedBy,
            scannedAt: serverTimestamp()
          }
        };
        const docRef = await addDoc(collection(db, 'products'), newProduct);
        createdFirebaseId = docRef.id;
        console.log(`Created Firebase product ${createdFirebaseId} for SKU ${sku}`);
      } else if (firebaseId) {
        // UPDATE existing Firebase document
        const productRef = doc(db, 'products', firebaseId);
        await updateDoc(productRef, updates);
        console.log(`Updated Firebase product ${firebaseId} with stock ${newStock}`);
      }
    } catch (fbError) {
      console.error('Firebase operation failed:', fbError);
      return res.status(500).json({
        error: 'Failed to save to Firebase',
        details: fbError.message,
        stack: fbError.stack?.split('\n').slice(0, 3).join('\n'),
        step: 'firebase_save',
        success: false
      });
    }

    // Update SureDone (always done to keep inventory in sync)
    const suredoneResult = await updateSureDoneStock(sku, newStock, shelf, action === 'create_new');

    if (!suredoneResult.success) {
      return res.status(500).json({
        error: 'Failed to update SureDone stock',
        details: suredoneResult.error || 'Unknown error',
        step: 'suredone_update',
        success: false,
        firebaseUpdated: !!(firebaseId || createdFirebaseId),
        suredoneUpdated: false
      });
    }

    // Log to scan_log
    await addDoc(collection(db, 'scan_log'), {
      sku: sku,
      partNumber: partNumber || 'Unknown',
      partNumber_upper: (partNumber || '').toUpperCase(),
      brand: brand || 'Unknown',
      scannedBy: scannedBy,
      timestamp: Timestamp.now(),
      action: action || 'update_stock',
      oldStock: oldStock || 0,
      newStock: newStock,
      shelf: shelf || 'Not Assigned'
    });

    // Log to activity_log
    await addDoc(collection(db, 'activity_log'), {
      action: action || 'update_stock',
      user: scannedBy,
      sku: sku,
      partNumber: partNumber || 'Unknown',
      details: {
        oldStock: oldStock || 0,
        newStock: newStock,
        difference: newStock - (oldStock || 0),
        shelf: shelf || 'Not Assigned'
      },
      timestamp: Timestamp.now()
    });

    console.log(`Stock updated successfully: ${sku} → ${newStock} (Firebase: ${!!(firebaseId || createdFirebaseId)}, SureDone: true)`);

    return res.status(200).json({
      success: true,
      sku: sku,
      newStock: newStock,
      firebaseId: createdFirebaseId || firebaseId,
      firebaseUpdated: !!(firebaseId || createdFirebaseId),
      suredoneUpdated: true,
      message: action === 'create_new' ? `New item ${sku} created` : `Stock updated to ${newStock}`
    });
  } catch (error) {
    console.error('Stock update error:', error);
    return res.status(500).json({
      error: 'Failed to update stock',
      details: error.message,
      stack: error.stack?.split('\n').slice(0, 3).join('\n'),
      step: 'unknown',
      success: false
    });
  }
}

/**
 * Update stock in SureDone using the PUT /editor/items API
 * SureDone automatically syncs to eBay and BigCommerce
 *
 * @param {string} sku - SKU to update
 * @param {number} stock - New stock quantity
 * @param {string} shelf - Shelf location
 * @param {boolean} isCreate - If true, SKU may not exist in SureDone yet (skip update)
 * @returns {Promise<{success: boolean, error?: string}>}
 */
async function updateSureDoneStock(sku, stock, shelf, isCreate = false) {
  try {
    const SUREDONE_USER = process.env.SUREDONE_USER;
    const SUREDONE_TOKEN = process.env.SUREDONE_TOKEN;

    if (!SUREDONE_USER || !SUREDONE_TOKEN) {
      console.error('SureDone credentials not configured');
      return { success: false, error: 'SureDone credentials not configured' };
    }

    // For new items, the SKU won't exist in SureDone yet
    // The full listing will be created later via Pro Listing Builder
    if (isCreate) {
      console.log(`Skipping SureDone update for new item ${sku} - will be created via Pro Builder`);
      return { success: true }; // Not an error - expected for new items
    }

    // Build update payload
    const updates = {
      stock: stock
    };

    if (shelf) {
      updates.shelf = shelf;
    }

    // PUT to /editor/items endpoint
    const url = `https://api.suredone.com/v1/editor/items/${encodeURIComponent(sku)}`;

    console.log(`Updating SureDone ${sku}: stock=${stock}, shelf=${shelf || 'unchanged'}`);

    const response = await fetch(url, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'X-Auth-User': SUREDONE_USER,
        'X-Auth-Token': SUREDONE_TOKEN
      },
      body: new URLSearchParams(updates).toString()
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`SureDone update failed: ${response.status} ${response.statusText}`, errorText);

      // If item doesn't exist (404), that's expected for scanner-created items
      if (response.status === 404) {
        console.log(`SKU ${sku} not found in SureDone - will be created later via Pro Builder`);
        return { success: true }; // Not an error
      }

      return { success: false, error: `SureDone API error: ${response.status} ${errorText}` };
    }

    const data = await response.json();
    console.log('SureDone update response:', data);

    // Check for success in response
    if (data.result === 'success' || data[sku]?.result === 'success') {
      return { success: true };
    }

    console.error('SureDone update did not return success:', data);
    return { success: false, error: 'SureDone did not return success' };
  } catch (error) {
    console.error('Error updating SureDone stock:', error);
    return { success: false, error: error.message };
  }
}
