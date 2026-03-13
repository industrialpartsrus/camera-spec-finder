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
    weight, // Optional shipping weight (lbs)
    boxLength, // Optional box length (inches)
    boxWidth, // Optional box width (inches)
    boxHeight, // Optional box height (inches)
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

    // Save shipping measurements if provided
    if (weight) updates.weight = weight;
    if (boxLength) updates.boxLength = boxLength;
    if (boxWidth) updates.boxWidth = boxWidth;
    if (boxHeight) updates.boxHeight = boxHeight;

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

        // Shipping measurements (only if provided by scanner)
        if (weight) formData.append('weight', weight);
        if (boxLength) formData.append('boxlength', boxLength);
        if (boxWidth) formData.append('boxwidth', boxWidth);
        if (boxHeight) formData.append('boxheight', boxHeight);

        // Clear SureDone automation rules and channel overrides on restock
        if (isRestock || (newStock > 0 && oldStock === 0)) {
          formData.append('rule', '');
          formData.append('rulestate', '');
          // Clear channel-specific overrides so base fields are used
          formData.append('ebayprice', '');
          formData.append('ebaytitle', '');
          formData.append('bigcommerceprice', '');
          formData.append('bigcommercetitle', '');
        }

        // CRITICAL: Skip Google Shopping and ebay2 — not used
        formData.append('ebay2skip', '1');
        formData.append('googleskip', '1');

        // Clear payment profile to prevent old PayPal profiles from blocking push
        // Send both field name patterns (SureDone uses both conventions)
        formData.append('ebaypaymentprofileid', '0');
        formData.append('paymentprofileidebay', '0');

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

    // === SMART CHANNEL DETECTION: Check item state before relist ===
    let relistResult = null;

    if (suredoneUpdated && (isRestock || (newStock > 0 && oldStock === 0))) {
      console.log(`Restock for ${sku}: ${oldStock} → ${newStock}, checking channel state...`);

      try {
        await new Promise(r => setTimeout(r, 5000));

        // Verify stock saved before attempting relist
        const checkUrl = `https://api.suredone.com/v1/search/items/${encodeURIComponent('guid:=' + sku)}`;
        const checkRes = await fetch(checkUrl, {
          headers: {
            'X-Auth-User': SUREDONE_USER,
            'X-Auth-Token': SUREDONE_TOKEN,
            'Content-Type': 'application/json',
          }
        });
        const checkData = await checkRes.json();

        let hasEbayId = false;
        let ebayId = '';
        let hasImages = false;
        let hasTitle = false;
        let hasCatId = false;
        let confirmedStock = 0;
        let itemTitle = '';

        for (const key of Object.keys(checkData)) {
          if (!isNaN(key) && checkData[key]?.guid?.toUpperCase() === sku.toUpperCase()) {
            const sdItem = checkData[key];
            ebayId = sdItem.ebayid || '';
            hasEbayId = ebayId.length >= 6 && /^\d+$/.test(ebayId);
            hasImages = !!(sdItem.media1 && sdItem.media1.trim());
            hasTitle = !!(sdItem.title && sdItem.title.trim().length > 5);
            hasCatId = !!(sdItem.ebaycatid && sdItem.ebaycatid.length > 3);
            confirmedStock = parseInt(sdItem.stock) || 0;
            itemTitle = sdItem.title || '';

            // Log channel overrides for debugging
            const overrideFields = ['ebayprice', 'ebaytitle', 'bigcommerceprice', 'bigcommercetitle', 'rule', 'rulestate', 'ebayskip', 'state'];
            const overrides = {};
            for (const f of overrideFields) {
              if (sdItem[f] !== undefined && sdItem[f] !== '') {
                overrides[f] = sdItem[f];
              }
            }
            if (Object.keys(overrides).length > 0) {
              console.log(`${sku} channel overrides:`, JSON.stringify(overrides));
            }

            console.log(`${sku} state: ebayid=${ebayId || 'none'}, hasImages=${hasImages}, hasTitle=${hasTitle}, hasCatId=${hasCatId}, stock=${confirmedStock}`);
            break;
          }
        }

        // If stock not yet confirmed, wait longer
        if (confirmedStock < 1) {
          console.warn(`${sku}: Stock not yet confirmed (showing ${confirmedStock}), waiting 5 more seconds...`);
          await new Promise(r => setTimeout(r, 5000));
        }

        const sdHeaders = {
          'X-Auth-User': SUREDONE_USER,
          'X-Auth-Token': SUREDONE_TOKEN,
          'Content-Type': 'application/x-www-form-urlencoded',
        };
        const sdBase = 'https://api.suredone.com/v1/editor/items';

        // Safety: re-send stock right before relist
        const stockForm = new URLSearchParams();
        stockForm.append('identifier', 'guid');
        stockForm.append('guid', sku);
        stockForm.append('stock', String(newStock));
        stockForm.append('ebay2skip', '1');
        stockForm.append('googleskip', '1');

        await fetch(`${sdBase}/edit`, {
          method: 'POST', headers: sdHeaders, body: stockForm.toString()
        });
        console.log(`Re-confirmed stock=${newStock} for ${sku} before relist`);
        await new Promise(r => setTimeout(r, 2000));

        if (hasEbayId) {
          // STATE 1: Has eBay ID — set ebaytitle then relist
          console.log(`${sku}: Has eBay ID ${ebayId}, setting ebaytitle then relist...`);

          // Set ebaytitle (REQUIRED for /relist — error 62 if blank) + clear blockers
          const prepForm = new URLSearchParams();
          prepForm.append('identifier', 'guid');
          prepForm.append('guid', sku);
          prepForm.append('stock', String(newStock));
          prepForm.append('rule', '');
          prepForm.append('rulestate', '');
          prepForm.append('ebaypaymentprofileid', '0');
          prepForm.append('paymentprofileidebay', '0');
          prepForm.append('ebayprice', '');
          prepForm.append('ebay2skip', '1');
          prepForm.append('googleskip', '1');
          if (itemTitle) prepForm.append('ebaytitle', itemTitle);

          await fetch(`${sdBase}/edit`, {
            method: 'POST', headers: sdHeaders, body: prepForm.toString()
          });
          await new Promise(r => setTimeout(r, 2000));

          const form = new URLSearchParams();
          form.append('identifier', 'guid');
          form.append('guid', sku);
          form.append('ebay2skip', '1');
          form.append('googleskip', '1');

          const rlRes = await fetch(`${sdBase}/relist`, {
            method: 'POST', headers: sdHeaders, body: form.toString()
          });
          const rlData = await rlRes.json();
          const ok = rlData.result === 'success' || rlData['1']?.result === 'success';

          relistResult = {
            success: ok,
            action: 'relist',
            error: ok ? null : (rlData['1']?.messages || rlData.message || 'Relist failed'),
          };
          if (ok) autoRelisted = true;

        } else if (!hasEbayId && hasImages && hasTitle && hasCatId) {
          // STATE 2: No eBay ID but listing looks complete — use /relist (NOT /start — rejects existing SKUs)
          console.log(`${sku}: No eBay ID but listing complete, clearing rules then relist...`);

          // Set ebaytitle + clear stuck rules
          const clearForm = new URLSearchParams();
          clearForm.append('identifier', 'guid');
          clearForm.append('guid', sku);
          clearForm.append('rule', '');
          clearForm.append('rulestate', '');
          clearForm.append('ebaypaymentprofileid', '0');
          clearForm.append('paymentprofileidebay', '0');
          clearForm.append('ebayprice', '');
          clearForm.append('ebay2skip', '1');
          clearForm.append('googleskip', '1');
          // CRITICAL: ebaytitle MUST be populated for relist
          if (itemTitle) clearForm.append('ebaytitle', itemTitle);

          await fetch(`${sdBase}/edit`, {
            method: 'POST', headers: sdHeaders, body: clearForm.toString()
          });
          await new Promise(r => setTimeout(r, 2000));

          const form = new URLSearchParams();
          form.append('identifier', 'guid');
          form.append('guid', sku);
          form.append('ebay2skip', '1');
          form.append('googleskip', '1');
          const rlRes = await fetch(`${sdBase}/relist`, {
            method: 'POST', headers: sdHeaders, body: form.toString()
          });
          const rlData = await rlRes.json();
          const ok = rlData.result === 'success' || rlData['1']?.result === 'success';

          const rlItemResult = rlData['1'] || {};
          const errorMsg = typeof rlItemResult.messages === 'string' ? rlItemResult.messages : '';
          const hasImageError = errorMsg.toLowerCase().includes('image') ||
                                errorMsg.toLowerCase().includes('photo') ||
                                errorMsg.toLowerCase().includes('picture');

          if (!ok && hasImageError) {
            relistResult = {
              success: false,
              action: 'relist',
              error: 'Images too small for eBay — needs review in Listing Builder',
              needsReview: true,
              reviewReason: 'image_size',
            };
          } else {
            relistResult = {
              success: ok,
              action: 'relist',
              error: ok ? null : (errorMsg || rlData.message || 'Relist failed'),
            };
            if (ok) autoRelisted = true;
          }

        } else {
          // STATE 3: Missing required data — flag for review
          const missing = [];
          if (!hasImages) missing.push('photos');
          if (!hasTitle) missing.push('title');
          if (!hasCatId) missing.push('eBay category');

          console.log(`${sku}: No eBay ID and missing ${missing.join(', ')} — flagging for review`);

          relistResult = {
            success: false,
            action: 'none',
            error: `Needs review: missing ${missing.join(', ')}`,
            needsReview: true,
            reviewReason: 'incomplete_listing',
          };
        }

        console.log(`Auto-channel result for ${sku}:`, JSON.stringify(relistResult));

        // Flag for review in Firebase if needed
        if (relistResult.needsReview && (firebaseId || createdFirebaseId)) {
          try {
            const fbId = firebaseId || createdFirebaseId;
            await updateDoc(doc(db, 'products', fbId), {
              needsRework: true,
              channelPushFailed: true,
              channelPushError: relistResult.error,
              channelPushAction: relistResult.action,
              reviewReason: relistResult.reviewReason,
            });
            console.log(`Flagged ${sku} for review in Firebase: ${relistResult.reviewReason}`);
          } catch (flagErr) {
            console.warn('Failed to flag for review:', flagErr.message);
          }
        }

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

