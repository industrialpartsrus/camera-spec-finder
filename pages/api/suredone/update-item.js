// pages/api/suredone/update-item.js
// Updates a single item in SureDone using the editor API
// MUST use form-encoded POST to /editor/items/edit (NOT JSON PUT)

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const updateData = req.body;

  if (!updateData.guid) {
    return res.status(400).json({ error: 'guid (SKU) is required' });
  }

  const SUREDONE_USER = process.env.SUREDONE_USER;
  const SUREDONE_TOKEN = process.env.SUREDONE_TOKEN;
  const SUREDONE_URL = process.env.SUREDONE_URL || 'https://api.suredone.com/v1';

  if (!SUREDONE_USER || !SUREDONE_TOKEN) {
    return res.status(500).json({ error: 'SureDone credentials not configured' });
  }

  try {
    // Build form-encoded data (same format as create listing)
    const formData = new URLSearchParams();
    // SureDone requires these fields to identify which item to update
    formData.append('identifier', 'guid');  // Tell SureDone we're using 'guid' as the identifier
    formData.append('guid', updateData.guid);  // The SKU value
    formData.append('sku', updateData.guid);  // Also set sku field to match guid

    // Only append fields that have actual values
    // Skip empty strings, empty arrays, and empty objects
    const appendIfValue = (key, value) => {
      if (value === null || value === undefined || value === '') return;
      if (Array.isArray(value) && value.length === 0) return;
      if (typeof value === 'object' && Object.keys(value).length === 0) return;

      // For arrays and objects, stringify them
      if (Array.isArray(value) || typeof value === 'object') {
        formData.append(key, JSON.stringify(value));
      } else {
        formData.append(key, String(value));
      }
    };

    // Core listing fields
    appendIfValue('title', updateData.title);
    appendIfValue('longdescription', updateData.longdescription);
    appendIfValue('price', updateData.price);
    appendIfValue('stock', updateData.stock);
    appendIfValue('brand', updateData.brand);
    appendIfValue('mpn', updateData.mpn);
    appendIfValue('model', updateData.model);

    // === CONDITION MAPPING (same as create flow) ===
    // Map user-facing condition labels to SureDone condition codes
    let suredoneCondition = 'Used';
    if (updateData.condition) {
      const condLower = updateData.condition.toLowerCase();
      if (condLower.includes('new in box') || condLower.includes('nib')) {
        suredoneCondition = 'New';
      } else if (condLower.includes('new') && condLower.includes('open')) {
        suredoneCondition = 'New Other';
      } else if (condLower.includes('refurbished')) {
        suredoneCondition = 'Manufacturer Refurbished';
      } else if (condLower.includes('parts') || condLower.includes('not working')) {
        suredoneCondition = 'For Parts or Not Working';
      }
    }
    appendIfValue('condition', suredoneCondition);
    appendIfValue('notes', updateData.conditionNotes);

    appendIfValue('usertype', updateData.usertype);

    // Dimensions and weight
    appendIfValue('boxlength', updateData.boxlength);
    appendIfValue('boxwidth', updateData.boxwidth);
    appendIfValue('boxheight', updateData.boxheight);
    appendIfValue('weight', updateData.weight);
    appendIfValue('shelf', updateData.shelf);
    appendIfValue('countryoforigin', updateData.countryoforigin);

    // eBay fields (ONLY if they have values)
    appendIfValue('ebaycatid', updateData.ebaycatid);
    appendIfValue('ebaystoreid', updateData.ebaystoreid);
    appendIfValue('ebaystoreid2', updateData.ebaystoreid2);
    appendIfValue('ebayshippingprofileid', updateData.ebayshippingprofileid);

    // === MAP PHOTOS TO SUREDONE MEDIA FIELDS ===
    // SureDone expects media1, media2... media12 (NOT "photos" array)
    if (updateData.photos && Array.isArray(updateData.photos)) {
      updateData.photos.forEach((url, index) => {
        if (url && index < 12) {
          formData.append(`media${index + 1}`, url);
        }
      });
      console.log(`Mapped ${updateData.photos.length} photos to media1-media${updateData.photos.length}`);
    }

    // === MAP ALT TEXTS TO SUREDONE MEDIA ALT TEXT FIELDS ===
    // SureDone expects media1alttext, media2alttext... (NOT "mediaAltTexts" object)
    if (updateData.mediaAltTexts && typeof updateData.mediaAltTexts === 'object') {
      // mediaAltTexts format: { media1: "alt text", media2: "alt text", ... }
      for (let i = 1; i <= 12; i++) {
        const altText = updateData.mediaAltTexts[`media${i}`];
        if (altText && altText.trim()) {
          formData.append(`media${i}alttext`, altText);
        }
      }
      console.log(`Mapped ${Object.keys(updateData.mediaAltTexts).length} alt texts to media1alttext-media12alttext`);
    }

    // === MAP EBAY ITEM SPECIFICS (same as create flow) ===
    // Flatten ebayItemSpecificsForSuredone object into individual form fields
    // Format: { ebayitemspecificsvoltage: "230/460V", baserpm: "1760", ... }
    if (updateData.ebayItemSpecificsForSuredone && typeof updateData.ebayItemSpecificsForSuredone === 'object') {
      const specificsCount = Object.keys(updateData.ebayItemSpecificsForSuredone).length;
      if (specificsCount > 0) {
        console.log(`=== EBAY ITEM SPECIFICS: ${specificsCount} fields ===`);
        for (const [fieldName, value] of Object.entries(updateData.ebayItemSpecificsForSuredone)) {
          if (value && typeof value === 'string' && value.trim()) {
            formData.append(fieldName, value.trim());
            console.log(`  ${fieldName} = ${value}`);
          }
        }
      }
    }

    console.log('Updating SureDone item:', updateData.guid);
    console.log('Form data fields:', Array.from(formData.keys()).join(', '));

    // === DEBUG: Log full request details ===
    const url = `${SUREDONE_URL}/editor/items/edit`;
    const headers = {
      'X-Auth-User': SUREDONE_USER,
      'X-Auth-Token': SUREDONE_TOKEN,
      'Content-Type': 'application/x-www-form-urlencoded'
    };
    const body = formData.toString();

    console.log('=== SUREDONE UPDATE DEBUG ===');
    console.log('URL:', url);
    console.log('Headers:', JSON.stringify(headers));
    console.log('GUID value:', JSON.stringify(updateData.guid));
    console.log('GUID length:', updateData.guid?.length);
    console.log('GUID charCodes:', updateData.guid ? [...updateData.guid].map(c => c.charCodeAt(0)) : 'N/A');
    console.log('Full form body (first 500 chars):', body.substring(0, 500));
    console.log('Form body length:', body.length);
    console.log('================================');

    // Use correct endpoint and format (matches create listing's edit retry)
    const response = await fetch(url, {
      method: 'POST',
      headers: headers,
      body: body
    });

    const responseText = await response.text();
    console.log('SureDone response:', responseText);

    let data;
    try {
      data = JSON.parse(responseText);
    } catch (e) {
      data = { raw: responseText };
    }

    if (response.ok && (data.result === 'success' || data.result === 1 || data['1'])) {
      return res.status(200).json({
        success: true,
        message: 'Item updated successfully',
        guid: updateData.guid,
        response: data
      });
    } else {
      return res.status(200).json({
        success: false,
        error: data.message || data.error || 'Update may have failed',
        guid: updateData.guid,
        response: data
      });
    }

  } catch (error) {
    console.error('SureDone update error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to update item',
      details: error.message
    });
  }
}
