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
    note, // Optional scanner note for office team
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

    // Save scanner note if provided
    if (note) {
      updates.scannerNote = note;
      updates.scannerNoteBy = scannedBy;
      updates.scannerNoteAt = serverTimestamp();
    }

    // Save condition override if provided
    if (condition) {
      updates.condition = condition;
      updates.conditionChangedBy = scannedBy;
      updates.conditionChangedAt = serverTimestamp();
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
          },
          ...(note ? { scannerNote: note, scannerNoteBy: scannedBy, scannerNoteAt: serverTimestamp() } : {}),
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
          ...(note ? { scannerNote: note, scannerNoteBy: scannedBy, scannerNoteAt: serverTimestamp() } : {}),
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

    // === SUREDONE UPDATE ===
    let autoRelisted = false;
    let suredoneUpdated = false;
    let SUREDONE_USER, SUREDONE_TOKEN;
    const suredoneUrl = 'https://api.suredone.com/v1/editor/items/edit';
    const suredoneHeaders = {};

    if (action !== 'create_new') {
      try {
        try {
          const creds = getSureDoneCredentials();
          SUREDONE_USER = creds.user;
          SUREDONE_TOKEN = creds.token;
          suredoneHeaders['X-Auth-User'] = SUREDONE_USER;
          suredoneHeaders['X-Auth-Token'] = SUREDONE_TOKEN;
          suredoneHeaders['Content-Type'] = 'application/x-www-form-urlencoded';
        } catch (e) {
          return res.status(500).json({
            error: 'SureDone credentials not configured',
            step: 'suredone_update',
            success: false
          });
        }

        // Step 1: Update stock, shelf, condition (no channel flags here)
        const formData = new URLSearchParams();
        formData.append('identifier', 'guid');
        formData.append('guid', sku);
        formData.append('stock', String(newStock));

        if (shelf) {
          formData.append('shelf', shelf);
          formData.append('bigcommercebinpickingnumber', shelf);
        }

        if (condition) {
          const conditionMap = {
            'new_in_box': 'New',
            'new_open_box': 'New Other',
            'refurbished': 'Seller refurbished',
            'used_good': 'Used',
            'used_fair': 'Used',
            'for_parts': 'For Parts or Not Working',
          };
          formData.append('condition', conditionMap[condition] || condition);
        }

        if (partNumber) {
          formData.append('bigcommercempn', partNumber.toUpperCase());
        }

        // CRITICAL: Skip Google Shopping — it's broken and blocks edits
        formData.append('googleskip', '1');

        console.log(`Updating SureDone ${sku}: stock=${newStock}, shelf=${shelf || 'unchanged'}, condition=${condition || 'unchanged'}`);

        const response = await fetch(suredoneUrl, {
          method: 'POST',
          headers: suredoneHeaders,
          body: formData.toString()
        });

        const responseText = await response.text();
        console.log(`SureDone response for ${sku}:`, responseText.substring(0, 500));

        // If item doesn't exist (404), that's expected for scanner-created items
        if (!response.ok && response.status === 404) {
          console.log(`SKU ${sku} not found in SureDone - will be created later via Pro Builder`);
          suredoneUpdated = true; // Not an error
        } else {
          let data;
          try {
            data = JSON.parse(responseText);
          } catch (e) {
            return res.status(500).json({
              error: 'SureDone returned non-JSON',
              details: responseText.substring(0, 200),
              step: 'suredone_update',
              success: false,
              firebaseUpdated: !!(firebaseId || createdFirebaseId),
              suredoneUpdated: false
            });
          }

          const itemResult = data['1'] || data;
          const isSuccess = itemResult.result === 'success' || data.result === 'success';

          if (isSuccess) {
            suredoneUpdated = true;
          } else {
            console.error('SureDone update did not return success:', data);
            return res.status(500).json({
              error: 'Failed to update SureDone stock',
              details: data.message || data.error || 'SureDone did not return success',
              step: 'suredone_update',
              success: false,
              firebaseUpdated: !!(firebaseId || createdFirebaseId),
              suredoneUpdated: false
            });
          }
        }
      } catch (sdError) {
        console.error('SureDone update error:', sdError);
        return res.status(500).json({
          error: 'Failed to update SureDone stock',
          details: sdError.message,
          step: 'suredone_update',
          success: false,
          firebaseUpdated: !!(firebaseId || createdFirebaseId),
          suredoneUpdated: false
        });
      }
    } else {
      console.log(`Skipping SureDone update for new item ${sku} - will be created via Pro Builder`);
    }

    // === AUTO-RELIST: Toggle ebayskip 1→0 to trigger channel push ===
    // SureDone only pushes when a value CHANGES. If ebayskip is already 0,
    // setting it to 0 again does nothing. So we toggle: skip first, then unskip.
    let relistResult = null;

    if (suredoneUpdated && (isRestock || (newStock > 0 && oldStock === 0))) {
      console.log(`Restock for ${sku}: toggling ebayskip 1→0 to trigger relist...`);

      try {
        // Step 1: Skip eBay (sets ebayskip=1)
        const skipForm = new URLSearchParams();
        skipForm.append('identifier', 'guid');
        skipForm.append('guid', sku);
        skipForm.append('ebayskip', '1');
        skipForm.append('bigcommerceskip', '1');

        console.log(`Relist step 1: setting ebayskip=1 for ${sku}`);
        const skipRes = await fetch(suredoneUrl, {
          method: 'POST', headers: suredoneHeaders, body: skipForm.toString()
        });
        const skipData = await skipRes.json();
        console.log(`Skip result:`, JSON.stringify(skipData).substring(0, 200));

        // Step 2: Wait for SureDone to process
        await new Promise(r => setTimeout(r, 2000));

        // Step 3: Unskip eBay (sets ebayskip=0) — this CHANGE triggers the push
        const startForm = new URLSearchParams();
        startForm.append('identifier', 'guid');
        startForm.append('guid', sku);
        startForm.append('ebayskip', '0');
        startForm.append('ebayend', '0');
        startForm.append('bigcommerceskip', '0');

        console.log(`Relist step 2: setting ebayskip=0 for ${sku}`);
        const startRes = await fetch(suredoneUrl, {
          method: 'POST', headers: suredoneHeaders, body: startForm.toString()
        });
        const startData = await startRes.json();
        const startOk = startData.result === 'success' ||
                         startData['1']?.result === 'success';

        console.log(`Relist result for ${sku}: ${startOk ? 'SUCCESS' : 'FAILED'}`,
          JSON.stringify(startData).substring(0, 300));

        relistResult = {
          success: startOk,
          error: startOk ? null : (startData.message || 'Relist failed'),
        };

        if (startOk) autoRelisted = true;

      } catch (relistErr) {
        console.error('Auto-relist error:', relistErr.message);
        relistResult = { success: false, error: relistErr.message };
      }
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
      suredoneUpdated: suredoneUpdated,
      autoRelisted: autoRelisted,
      relistResult: relistResult,
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

