// pages/api/auto-research.js
// Auto-trigger AI research after photo completion
// Replicates processItemById from pro.js but runs server-side

import { db } from '../../firebase';
import { doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';

// Condition notes mapping (from pro.js)
const CONDITION_NOTES = {
  'New': '',
  'New Other (see details)': '',
  'Used - Excellent': 'Item is in excellent cosmetic and functional condition. May show minimal signs of use.',
  'Used - Good': 'Item is in good cosmetic and functional condition. May show normal signs of use.',
  'Used - Fair': 'Item shows significant cosmetic wear but is fully functional. May have scratches, dents, or fading.',
  'For Parts': 'Item is sold as-is for parts or repair. Functionality is not guaranteed.'
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed. Use POST.' });
  }

  const startTime = Date.now();
  const { itemId, brand, partNumber } = req.body;

  // Validation
  if (!itemId || !brand || !partNumber) {
    return res.status(400).json({
      success: false,
      error: 'Missing required fields: itemId, brand, or partNumber'
    });
  }

  try {
    // ===== PRE-FLIGHT GUARDS =====
    const productRef = doc(db, 'products', itemId);
    const productDoc = await getDoc(productRef);

    if (!productDoc.exists()) {
      return res.status(404).json({ success: false, error: 'Product not found' });
    }

    const product = productDoc.data();

    // Skip if already complete with data
    if (product.status === 'complete' && product.title && product.specifications) {
      console.log(`Auto-research: ${itemId} already complete, skipping`);
      return res.json({
        success: true,
        skipped: true,
        reason: 'already researched'
      });
    }

    // Skip if another process is running
    if (product.status === 'searching') {
      console.log(`Auto-research: ${itemId} already in progress, skipping`);
      return res.json({
        success: true,
        skipped: true,
        reason: 'already in progress'
      });
    }

    // Allow research for new scans, pending items, needs_photos, or errors
    if (!['needs_photos', 'scanned', 'pending', 'photos_complete', 'error'].includes(product.status)) {
      return res.status(400).json({
        success: false,
        error: `Invalid status for auto-research: ${product.status}`
      });
    }

    // ===== UPDATE STATUS TO SEARCHING =====
    await updateDoc(productRef, { status: 'searching' });
    console.log(`Auto-research started: ${itemId} (${brand} ${partNumber})`);

    // ===== PASS 1: PRODUCT RESEARCH =====
    // Build internal API URL using the same host/protocol as this request
    // This ensures we call the same deployment (production/preview/localhost)
    const protocol = process.env.VERCEL_URL ? 'https' : (req.headers.host?.includes('localhost') ? 'http' : 'https');
    const host = req.headers.host || process.env.VERCEL_URL || 'localhost:3000';
    const searchUrl = `${protocol}://${host}/api/search-product-v2`;

    console.log(`[Auto-research ${itemId}] Calling search API: ${searchUrl}`);

    const searchResponse = await fetch(searchUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ brand, partNumber })
    });

    if (!searchResponse.ok) {
      const errorText = await searchResponse.text();
      console.error(`[Auto-research ${itemId}] Search API failed: ${searchResponse.status}`, errorText);
      throw new Error(`Search API failed: ${searchResponse.status} - ${errorText.substring(0, 200)}`);
    }

    console.log(`[Auto-research ${itemId}] Search API success, parsing response...`);

    const data = await searchResponse.json();

    // Extract JSON from text content (EXACT copy from pro.js lines 1625-1630)
    const text = data.content?.filter(b => b.type === 'text').map(b => b.text).join('') || '';
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('No product data found in AI response');

    const productData = JSON.parse(jsonMatch[0]);

    // Store eBay aspects (EXACT copy from pro.js lines 1633-1638)
    let ebayAspects = null;
    if (data._ebayAspects) {
      ebayAspects = {
        required: (data._ebayAspects.required || []).map(a => a.ebayName || a.name).filter(Boolean),
        recommended: (data._ebayAspects.recommended || []).map(a => a.ebayName || a.name).filter(Boolean)
      };
    }

    // Build update object (synced with pro.js processItemById)
    const rawDesc = productData.description || '';
    const updateData = {
      status: 'complete',
      title: productData.title || `${brand} ${partNumber}`,
      productCategory: productData.productType || data._metadata?.detectedCategory || '',
      usertype: productData.productType || data._metadata?.productType || '',
      description: rawDesc,
      rawDescription: rawDesc,
      shortDescription: productData.shortDescription || '',
      metaKeywords: productData.keywords || '',
      specifications: data._resolvedSpecs || productData.specifications || {},
      rawSpecifications: productData.rawSpecifications || [],
      qualityFlag: productData.qualityFlag || 'NEEDS_REVIEW',
      condition: productData.condition || product.condition || 'Used - Good',
      conditionNotes: productData.conditionNotes || CONDITION_NOTES[productData.condition] || CONDITION_NOTES[product.condition] || '',
      ebayCategoryId: data._metadata?.ebayCategoryId || data._metadata?.detectedCategoryId || '',
      ebayStoreCategoryId: data._metadata?.ebayStoreCategoryId || '',
      ebayStoreCategoryId2: data._metadata?.ebayStoreCategoryId2 || '23399313015',
      ebayAspects: ebayAspects,
      pass1At: serverTimestamp()
    };

    // Add optional fields if present
    if (productData.bigcommerceCategoryId) {
      updateData.bigcommerceCategoryId = productData.bigcommerceCategoryId;
    }

    // Remove undefined values
    Object.keys(updateData).forEach(key => {
      if (updateData[key] === undefined) delete updateData[key];
    });

    // Save Pass 1 results
    await updateDoc(productRef, updateData);
    console.log(`Auto-research Pass 1 complete: ${itemId}`);

    // ===== TIMEOUT CHECK =====
    const elapsed = Date.now() - startTime;
    console.log(`Auto-research elapsed time: ${elapsed}ms`);

    if (elapsed > 45000) {
      console.log('Auto-research: Pass 1 complete, skipping Pass 2 (timeout risk - approaching 60s limit)');
      await updateDoc(productRef, {
        pass2Status: 'pending',
        autoResearchNote: 'Pass 2 skipped due to timeout - will run when opened in Pro Builder'
      });
      return res.json({
        success: true,
        itemId,
        pass1: true,
        pass2: 'skipped',
        elapsed
      });
    }

    // ===== PASS 2: EBAY ITEM SPECIFICS =====
    if (data._ebayAspects && data._ebayAspects.all?.length > 0) {
      await updateDoc(productRef, { pass2Status: 'filling' });
      console.log(`[Auto-research ${itemId}] Pass 2 starting (${data._ebayAspects.all.length} aspects)`);

      const pass2Url = `${protocol}://${host}/api/v2/auto-fill-ebay-specifics`;
      const pass2Response = await fetch(pass2Url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          brand: brand,
          partNumber: partNumber,
          productType: productData.productType || '',
          title: updateData.title,
          ebayAspects: data._ebayAspects,
          pass1Specs: data._resolvedSpecs || {}
        })
      });

      if (pass2Response.ok) {
        const pass2Data = await pass2Response.json();
        if (pass2Data.success) {
          await updateDoc(productRef, {
            ebayItemSpecifics: pass2Data.filledSpecifics || [],
            ebayItemSpecificsForSuredone: pass2Data.suredoneFields || {},
            pass2Status: 'complete',
            pass2FilledCount: pass2Data.filledCount,
            pass2TotalCount: pass2Data.totalCount
          });
          console.log(`Auto-research Pass 2 complete: ${itemId} (${pass2Data.filledCount}/${pass2Data.totalCount} filled)`);

          return res.json({
            success: true,
            itemId,
            pass1: true,
            pass2: true,
            elapsed: Date.now() - startTime
          });
        }
      } else {
        console.error(`Auto-research Pass 2 failed: ${pass2Response.status}`);
        await updateDoc(productRef, { pass2Status: 'error' });
      }
    }

    // Return success (Pass 1 complete, Pass 2 either complete or not applicable)
    return res.json({
      success: true,
      itemId,
      pass1: true,
      pass2: data._ebayAspects ? 'attempted' : 'not applicable',
      elapsed: Date.now() - startTime
    });

  } catch (error) {
    console.error('Auto-research error:', error);

    // Update status to error
    try {
      await updateDoc(doc(db, 'products', itemId), {
        status: 'error',
        error: error.message
      });
    } catch (updateError) {
      console.error('Failed to update error status:', updateError);
    }

    return res.status(500).json({
      success: false,
      error: error.message,
      elapsed: Date.now() - startTime
    });
  }
}
