// ============================================================
// /pages/api/suredone/listing-action.js
// Centralized endpoint for SureDone listing actions:
// start, relist, end, revise, delete — across eBay and BigCommerce
//
// SureDone API: POST /v1/editor/items/{action}
// Valid actions: add, edit, delete
// Channel control via edit: ebayskip, ebayend, bigcommerceskip, bigcommercedisabled
// Base URL: from getSureDoneCredentials().baseUrl (includes /v1)
// ============================================================

import { getSureDoneCredentials } from '../../../lib/suredone-config';

// Helper: send edit request to SureDone
async function suredoneEdit(baseUrl, headers, fields) {
  const formData = new URLSearchParams();
  formData.append('identifier', 'guid');
  for (const [key, value] of Object.entries(fields)) {
    formData.append(key, String(value));
  }

  console.log('SureDone edit:', Object.keys(fields).join(', '));

  const response = await fetch(
    `${baseUrl}/editor/items/edit`,
    { method: 'POST', headers, body: formData.toString() }
  );

  const text = await response.text();
  console.log('SureDone response:', text.substring(0, 500));

  try {
    return JSON.parse(text);
  } catch {
    return { result: 'failure', message: text.substring(0, 200) };
  }
}

// Helper: check if SureDone response indicates success
function isSuccess(data) {
  if (data.result === 'success') return true;
  const itemResult = data['1'] || data[1];
  if (itemResult?.result === 'success') return true;
  return false;
}

// Helper: extract error details from SureDone response
function extractError(data) {
  const itemResult = data['1'] || data[1] || {};
  const messages = itemResult.messages || data.message || '';
  const errors = [];

  if (typeof messages === 'string' && messages.includes('image')) {
    errors.push({
      type: 'image_error',
      message: 'One or more images are too small for eBay (minimum 500x500px). Please upload new photos.',
      field: 'media'
    });
  }

  if (typeof messages === 'string' && (
    messages.includes('payment') ||
    messages.includes('profile') ||
    messages.includes('PaymentPolicy')
  )) {
    errors.push({
      type: 'payment_profile',
      message: 'Payment profile error. Will attempt to set "Don\'t Use Profile" and retry.',
      field: 'ebayprofile',
      autoFix: true
    });
  }

  if (typeof messages === 'string' && (
    messages.includes('category') ||
    messages.includes('CategoryID')
  )) {
    errors.push({
      type: 'category_error',
      message: 'eBay category is invalid or missing. Please update the category.',
      field: 'ebaycatid'
    });
  }

  if (typeof messages === 'string' && messages.includes('specific')) {
    errors.push({
      type: 'specifics_error',
      message: 'Missing required eBay item specifics for this category.',
      field: 'ebayitemspecifics'
    });
  }

  if (errors.length === 0) {
    errors.push({
      type: 'unknown',
      message: itemResult.messages || itemResult.codes || data.message || 'Unknown SureDone error',
      raw: data
    });
  }

  return errors;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { sku, action, channel = 'all' } = req.body;

  if (!sku) {
    return res.status(400).json({ success: false, error: 'SKU required' });
  }

  let creds;
  try {
    creds = getSureDoneCredentials();
  } catch (e) {
    return res.status(500).json({ success: false, error: 'SureDone credentials not configured' });
  }

  // Use baseUrl from config (already includes /v1)
  // Safety: strip trailing /v1 if present, we add it via the endpoint paths
  const SUREDONE_URL = creds.baseUrl.replace(/\/v1\/?$/, '') + '/v1';

  const headers = {
    'X-Auth-User': creds.user,
    'X-Auth-Token': creds.token,
    'Content-Type': 'application/x-www-form-urlencoded',
  };

  console.log(`Listing action: ${action} on ${sku} (channel: ${channel})`);

  try {
    let result;
    let retried = false;

    switch (action) {
      case 'start': {
        const fields = { guid: sku };
        if (channel === 'ebay' || channel === 'all') {
          fields.ebayskip = '0';
        }
        if (channel === 'bigcommerce' || channel === 'all') {
          fields.bigcommerceskip = '0';
        }
        result = await suredoneEdit(SUREDONE_URL, headers, fields);

        // Auto-fix: if payment profile error, retry with no profile
        if (!isSuccess(result)) {
          const errors = extractError(result);
          const profileError = errors.find(e => e.type === 'payment_profile');
          if (profileError) {
            console.log('Payment profile error detected, retrying with no profile...');
            fields.ebayprofile = '';
            fields.ebaypaymentprofile = '';
            result = await suredoneEdit(SUREDONE_URL, headers, fields);
            retried = true;
          }
        }
        break;
      }

      case 'end': {
        const fields = { guid: sku };
        if (channel === 'ebay' || channel === 'all') {
          fields.ebayend = '1';
        }
        if (channel === 'bigcommerce' || channel === 'all') {
          fields.bigcommercedisabled = '1';
        }
        result = await suredoneEdit(SUREDONE_URL, headers, fields);
        break;
      }

      case 'relist': {
        // Step 1: End on eBay
        const endFields = { guid: sku, ebayend: '1' };
        const endResult = await suredoneEdit(SUREDONE_URL, headers, endFields);
        console.log('Relist step 1 (end):', isSuccess(endResult) ? 'success' : 'failed');

        // Step 2: Wait for eBay to process the end
        await new Promise(r => setTimeout(r, 3000));

        // Step 3: Re-start on eBay
        const startFields = {
          guid: sku,
          ebayend: '0',
          ebayskip: '0'
        };
        if (channel === 'all') {
          startFields.bigcommerceskip = '0';
        }
        result = await suredoneEdit(SUREDONE_URL, headers, startFields);

        // Auto-fix payment profile on relist too
        if (!isSuccess(result)) {
          const errors = extractError(result);
          const profileError = errors.find(e => e.type === 'payment_profile');
          if (profileError) {
            console.log('Payment profile error on relist, retrying...');
            startFields.ebayprofile = '';
            startFields.ebaypaymentprofile = '';
            result = await suredoneEdit(SUREDONE_URL, headers, startFields);
            retried = true;
          }
        }
        break;
      }

      case 'revise':
      case 'edit': {
        const fields = { guid: sku };
        if (channel === 'ebay' || channel === 'all') {
          fields.ebayskip = '0';
        }
        if (channel === 'bigcommerce' || channel === 'all') {
          fields.bigcommerceskip = '0';
        }
        result = await suredoneEdit(SUREDONE_URL, headers, fields);

        // Auto-fix payment profile
        if (!isSuccess(result)) {
          const errors = extractError(result);
          const profileError = errors.find(e => e.type === 'payment_profile');
          if (profileError) {
            console.log('Payment profile error on revise, retrying...');
            fields.ebayprofile = '';
            fields.ebaypaymentprofile = '';
            result = await suredoneEdit(SUREDONE_URL, headers, fields);
            retried = true;
          }
        }
        break;
      }

      case 'delete': {
        const formData = new URLSearchParams();
        formData.append('identifier', 'guid');
        formData.append('guid', sku);

        const response = await fetch(
          `${SUREDONE_URL}/editor/items/delete`,
          { method: 'POST', headers, body: formData.toString() }
        );

        const text = await response.text();
        try {
          result = JSON.parse(text);
        } catch {
          result = { result: 'failure', message: text.substring(0, 200) };
        }
        break;
      }

      default:
        return res.status(400).json({
          success: false,
          error: `Unknown action: ${action}`
        });
    }

    // Determine success and build response
    const success = isSuccess(result);

    if (success) {
      const itemResult = result['1'] || result[1] || {};
      const ebayItemId = itemResult.ebayid || itemResult.ebay_id || null;
      const ebayUrl = ebayItemId
        ? `https://www.ebay.com/itm/${ebayItemId}`
        : null;

      const response = {
        success: true,
        action,
        channel,
        sku,
        ebayUrl,
        ebayItemId,
        retried,
      };

      if (retried) {
        response.note = 'Payment profile was cleared automatically to resolve an error.';
      }

      console.log(`${action} succeeded for ${sku}`);
      return res.status(200).json(response);
    } else {
      const errors = extractError(result);

      const instructions = errors.map(err => {
        switch (err.type) {
          case 'image_error':
            return '📷 IMAGES TOO SMALL: One or more photos are below eBay\'s 500x500px minimum. Open this item in Photo Station and retake the photos.';
          case 'payment_profile':
            return '💳 PAYMENT PROFILE: Auto-fix attempted but failed. Go to SureDone → Edit this item → set Payment Profile to "Don\'t Use Profile" → Save.';
          case 'category_error':
            return '📁 CATEGORY MISSING: This item needs a valid eBay category. Use the category search in Pro Builder to set one.';
          case 'specifics_error':
            return '📋 MISSING ITEM SPECIFICS: eBay requires certain item specifics for this category. Check the Specifications section.';
          default:
            return `⚠️ ${err.message}`;
        }
      });

      console.error(`${action} failed for ${sku}:`, JSON.stringify(errors));

      return res.status(200).json({
        success: false,
        action,
        channel,
        sku,
        errors,
        instructions,
        result,
        retried,
      });
    }

  } catch (error) {
    console.error('Listing action error:', error);
    return res.status(500).json({
      success: false,
      action,
      sku,
      error: error.message
    });
  }
}
