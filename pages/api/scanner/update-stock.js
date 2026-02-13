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

    // Update Firebase if firebaseId provided
    if (firebaseId) {
      const productRef = doc(db, 'products', firebaseId);
      await updateDoc(productRef, updates);
      console.log(`Updated Firebase product ${firebaseId} with stock ${newStock}`);
    }

    // Update SureDone (always done to keep inventory in sync)
    const suredoneSuccess = await updateSureDoneStock(sku, newStock, shelf);

    if (!suredoneSuccess) {
      return res.status(500).json({
        error: 'Failed to update SureDone stock',
        success: false,
        firebaseUpdated: !!firebaseId,
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

    console.log(`Stock updated successfully: ${sku} → ${newStock} (Firebase: ${!!firebaseId}, SureDone: true)`);

    return res.status(200).json({
      success: true,
      sku: sku,
      newStock: newStock,
      firebaseUpdated: !!firebaseId,
      suredoneUpdated: true,
      message: `Stock updated to ${newStock}`
    });
  } catch (error) {
    console.error('Stock update error:', error);
    return res.status(500).json({
      error: 'Failed to update stock',
      details: error.message,
      success: false
    });
  }
}

/**
 * Update stock in SureDone using the PUT /editor/items API
 * SureDone automatically syncs to eBay and BigCommerce
 */
async function updateSureDoneStock(sku, stock, shelf) {
  try {
    const SUREDONE_USER = process.env.SUREDONE_USER;
    const SUREDONE_TOKEN = process.env.SUREDONE_TOKEN;

    if (!SUREDONE_USER || !SUREDONE_TOKEN) {
      console.error('SureDone credentials not configured');
      return false;
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
      console.error(`SureDone update failed: ${response.status} ${response.statusText}`);
      const errorText = await response.text();
      console.error('SureDone error response:', errorText);
      return false;
    }

    const data = await response.json();
    console.log('SureDone update response:', data);

    // Check for success in response
    if (data.result === 'success' || data[sku]?.result === 'success') {
      return true;
    }

    console.error('SureDone update did not return success:', data);
    return false;
  } catch (error) {
    console.error('Error updating SureDone stock:', error);
    return false;
  }
}
