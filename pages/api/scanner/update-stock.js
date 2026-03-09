// pages/api/scanner/update-stock.js
// Update stock quantity in Firebase AND push to SureDone (which syncs to eBay + BigCommerce)
// Also logs the action to activity_log and scan_log collections

import { db } from '../../../firebase';
import { collection, doc, updateDoc, addDoc, getDoc, serverTimestamp, Timestamp } from 'firebase/firestore';
import { getSureDoneCredentials } from '../../../lib/suredone-config';

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
    firebaseId, // Firebase document ID if updating existing
    healthRouting, // 'normal', 'review', 'rework' from health check
    healthStatus, // 'green', 'yellow', 'red'
    healthIssues, // Array of issue message strings
    isRestock, // true when stock goes 0 → positive (auto-relist trigger)
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

    // Add health routing flags if provided
    if (healthRouting && healthRouting !== 'normal') {
      updates.needsRework = healthRouting === 'rework';
      updates.needsReview = healthRouting === 'review';
      updates.healthStatus = healthStatus || 'yellow';
      updates.healthIssues = healthIssues || [];
      updates.healthCheckedAt = serverTimestamp();
    } else if (healthRouting === 'normal') {
      // Clear any previous flags
      updates.needsRework = false;
      updates.needsReview = false;
      updates.healthStatus = 'green';
      updates.healthIssues = [];
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
      } else if (action === 'add_stock' && !firebaseId && healthRouting && healthRouting !== 'normal') {
        // SureDone-only match with health issues — create Firebase doc so Pro Builder can see it
        const flaggedProduct = {
          sku: sku,
          partNumber: partNumber || '',
          brand: brand || '',
          stock: newStock,
          shelf: shelf || 'Not Assigned',
          scannedBy: scannedBy,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
          lastScannedBy: scannedBy,
          lastScannedAt: serverTimestamp(),
          status: 'complete',
          needsRework: healthRouting === 'rework',
          needsReview: healthRouting === 'review',
          healthStatus: healthStatus || 'yellow',
          healthIssues: healthIssues || [],
          healthCheckedAt: serverTimestamp(),
        };
        const docRef = await addDoc(collection(db, 'products'), flaggedProduct);
        createdFirebaseId = docRef.id;
        console.log(`Created flagged Firebase product ${createdFirebaseId} for SKU ${sku} (health: ${healthRouting})`);
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
    const suredoneResult = await updateSureDoneStock(sku, newStock, shelf, action === 'create_new', isRestock);

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

    // === POST-UPDATE VERIFICATION ===
    // Wait 3 seconds for SureDone to process, then read back
    let verification = null;
    if (action !== 'create_new') {
      try {
        await new Promise(r => setTimeout(r, 3000));

        const creds = getSureDoneCredentials();
        const verifyUrl = `https://api.suredone.com/v1/editor/items/${encodeURIComponent(sku)}`;
        const verifyResponse = await fetch(verifyUrl, {
          headers: {
            'X-Auth-User': creds.user,
            'X-Auth-Token': creds.token,
            'Content-Type': 'application/json'
          }
        });

        if (verifyResponse.ok) {
          const verifyData = await verifyResponse.json();
          const item = verifyData['0'] || verifyData[0] || verifyData;

          const actualStock = parseInt(item.stock) || 0;
          const hasEbayId = !!(item.ebayid && item.ebayid.length > 3);
          const hasBigCommerceId = !!(item.bigcommerceid && item.bigcommerceid.length > 1);
          const ebaySkip = item.ebayskip === '1' || item.ebayskip === 1;
          const bcSkip = item.bigcommerceskip === '1' || item.bigcommerceskip === 1;

          verification = {
            stockVerified: actualStock === newStock,
            actualStock: actualStock,
            expectedStock: newStock,
            ebay: {
              listed: hasEbayId,
              itemId: item.ebayid || null,
              skipped: ebaySkip,
              url: hasEbayId ? `https://www.ebay.com/itm/${item.ebayid}` : null,
            },
            bigcommerce: {
              listed: hasBigCommerceId,
              productId: item.bigcommerceid || null,
              skipped: bcSkip,
            },
            channelIssues: [],
          };

          // Check for channel push problems
          if (!hasEbayId && !ebaySkip) {
            verification.channelIssues.push(
              'eBay: No listing ID found — item may not be pushed to eBay'
            );
          }
          if (hasEbayId && ebaySkip) {
            verification.channelIssues.push(
              'eBay: Listed but skip flag is set — changes won\'t push'
            );
          }
          if (!hasBigCommerceId && !bcSkip) {
            verification.channelIssues.push(
              'BigCommerce: No listing ID found'
            );
          }
          if (!verification.stockVerified) {
            verification.channelIssues.push(
              `Stock mismatch: expected ${newStock}, SureDone shows ${actualStock}`
            );
          }

          console.log(`Verification for ${sku}: stock=${actualStock}, ` +
            `ebay=${hasEbayId ? item.ebayid : 'none'}, ` +
            `bc=${hasBigCommerceId ? 'yes' : 'none'}, ` +
            `issues=${verification.channelIssues.length}`);
        }
      } catch (verifyErr) {
        console.warn('Verification check failed:', verifyErr.message);
        // Don't fail the whole update just because verification failed
      }
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
    await addDoc(collection(db, 'activityLog'), {
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
      autoRelisted: suredoneResult.autoRelisted || false,
      message: action === 'create_new' ? `New item ${sku} created` : `Stock updated to ${newStock}`,
      verification: verification,
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
 * Update stock in SureDone using the POST /editor/items/edit API
 * SureDone automatically syncs to eBay and BigCommerce
 *
 * @param {string} sku - SKU to update
 * @param {number} stock - New stock quantity
 * @param {string} shelf - Shelf location
 * @param {boolean} isCreate - If true, SKU may not exist in SureDone yet (skip update)
 * @param {boolean} isRestock - If true, stock went 0→positive (clear skip flags to auto-relist)
 * @returns {Promise<{success: boolean, autoRelisted?: boolean, error?: string}>}
 */
async function updateSureDoneStock(sku, stock, shelf, isCreate = false, isRestock = false) {
  try {
    let SUREDONE_USER, SUREDONE_TOKEN;
    try {
      const creds = getSureDoneCredentials();
      SUREDONE_USER = creds.user;
      SUREDONE_TOKEN = creds.token;
    } catch (e) {
      console.error('SureDone credentials not configured');
      return { success: false, error: 'SureDone credentials not configured' };
    }

    // For new items, the SKU won't exist in SureDone yet
    // The full listing will be created later via Pro Listing Builder
    if (isCreate) {
      console.log(`Skipping SureDone update for new item ${sku} - will be created via Pro Builder`);
      return { success: true }; // Not an error - expected for new items
    }

    // Use form-encoded POST to /editor/items/edit (same working pattern as update-item.js)
    const formData = new URLSearchParams();
    formData.append('identifier', 'guid');
    formData.append('guid', sku);
    formData.append('stock', String(stock));
    if (shelf) {
      formData.append('shelf', shelf);
      formData.append('bigcommercebinpickingnumber', shelf); // Sync shelf to BigCommerce bin picking
    }

    // Auto-relist: when stock goes 0→positive, clear skip flags so channels pick it up
    let autoRelisted = false;
    if (isRestock && stock > 0) {
      formData.append('ebayskip', '0');
      formData.append('bigcommerceskip', '0');
      autoRelisted = true;
      console.log(`Auto-relist triggered for ${sku}: clearing ebayskip + bigcommerceskip`);
    }

    const url = 'https://api.suredone.com/v1/editor/items/edit';

    console.log(`Updating SureDone ${sku}: stock=${stock}, shelf=${shelf || 'unchanged'}, restock=${isRestock}`);

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'X-Auth-User': SUREDONE_USER,
        'X-Auth-Token': SUREDONE_TOKEN,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: formData.toString()
    });

    const responseText = await response.text();
    console.log('SureDone update response:', responseText);

    // If item doesn't exist (404), that's expected for scanner-created items
    if (!response.ok && response.status === 404) {
      console.log(`SKU ${sku} not found in SureDone - will be created later via Pro Builder`);
      return { success: true }; // Not an error
    }

    let data;
    try {
      data = JSON.parse(responseText);
    } catch (e) {
      return { success: false, error: `SureDone returned non-JSON: ${responseText.substring(0, 200)}` };
    }

    if (data.result === 'success' || data.result === 1 || data['1']) {
      return { success: true, autoRelisted };
    }

    console.error('SureDone update did not return success:', data);
    return { success: false, error: data.message || data.error || 'SureDone did not return success' };
  } catch (error) {
    console.error('Error updating SureDone stock:', error);
    return { success: false, error: error.message };
  }
}
