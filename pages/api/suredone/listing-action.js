// ============================================================
// /pages/api/suredone/listing-action.js
// Centralized endpoint for SureDone listing actions:
// start, relist, end, revise, delete — across eBay and BigCommerce
//
// SureDone API: PUT /v1/editor/items with JSON body { guid, action }
// Valid actions: start, relist, end, edit
// Delete uses POST /v1/editor/items/delete (form-urlencoded)
// ============================================================

import { getSureDoneCredentials } from '../../../lib/suredone-config';

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

// Helper: send PUT action to SureDone
async function suredoneAction(headers, guid, actionName) {
  const actionUrl = 'https://api.suredone.com/v1/editor/items';

  console.log(`[listing-action] PUT ${actionUrl} — guid=${guid}, action=${actionName}`);

  const response = await fetch(actionUrl, {
    method: 'PUT',
    headers,
    body: JSON.stringify({ guid, action: actionName })
  });

  const text = await response.text();
  console.log(`[listing-action] Response:`, text.substring(0, 500));

  try {
    return JSON.parse(text);
  } catch {
    return { result: 'failure', message: text.substring(0, 200) };
  }
}

// Helper: send form-urlencoded edit to SureDone (for profile fix retries)
async function suredoneEdit(headers, fields) {
  const editUrl = 'https://api.suredone.com/v1/editor/items/edit';
  const formData = new URLSearchParams();
  formData.append('identifier', 'guid');
  for (const [key, value] of Object.entries(fields)) {
    formData.append(key, String(value));
  }

  const editHeaders = { ...headers, 'Content-Type': 'application/x-www-form-urlencoded' };

  const response = await fetch(editUrl, {
    method: 'POST',
    headers: editHeaders,
    body: formData.toString()
  });

  const text = await response.text();
  try {
    return JSON.parse(text);
  } catch {
    return { result: 'failure', message: text.substring(0, 200) };
  }
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

  const SUREDONE_USER = creds.user;
  const SUREDONE_TOKEN = creds.token;

  const jsonHeaders = {
    'X-Auth-User': SUREDONE_USER,
    'X-Auth-Token': SUREDONE_TOKEN,
    'Content-Type': 'application/json',
  };

  console.log(`Listing action: ${action} on ${sku} (channel: ${channel})`);

  try {
    let result;
    let retried = false;

    if (action === 'start' || action === 'add') {
      // Start/publish listing
      console.log(`[listing-action] Starting/publishing ${sku}`);

      // Clear automation rules that might block the listing
      await suredoneEdit(
        { 'X-Auth-User': SUREDONE_USER, 'X-Auth-Token': SUREDONE_TOKEN },
        { guid: sku, sd_rule: '', sd_rulestate: '', ebaypaymentprofileid: '0' }
      );
      console.log(`[listing-action] Cleared sd_rule/sd_rulestate/payment profile for ${sku}`);
      await new Promise(r => setTimeout(r, 1000));

      result = await suredoneAction(jsonHeaders, sku, 'start');

      // Auto-fix: if payment profile error, clear profiles and retry
      if (!isSuccess(result)) {
        const errors = extractError(result);
        const profileError = errors.find(e => e.type === 'payment_profile');
        if (profileError) {
          console.log('Payment profile error detected, clearing profiles and retrying start...');
          await suredoneEdit(
            { 'X-Auth-User': SUREDONE_USER, 'X-Auth-Token': SUREDONE_TOKEN },
            { guid: sku, ebayprofile: '', ebaypaymentprofile: '', ebaypaymentprofileid: '0' }
          );
          result = await suredoneAction(jsonHeaders, sku, 'start');
          retried = true;
        }
      }

    } else if (action === 'relist') {
      // Smart relist: check if item has eBay ID to decide relist vs start
      console.log(`[listing-action] Relist requested for ${sku}, checking eBay ID...`);

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
      for (const key of Object.keys(checkData)) {
        if (!isNaN(key) && checkData[key]?.guid?.toUpperCase() === sku.toUpperCase()) {
          const ebayId = checkData[key].ebayid || '';
          hasEbayId = ebayId.length >= 6 && /^\d+$/.test(ebayId);
          console.log(`[listing-action] ${sku} ebayid: ${ebayId || 'none'}, hasEbayId: ${hasEbayId}`);
          break;
        }
      }

      const actualAction = hasEbayId ? 'relist' : 'start';
      console.log(`[listing-action] Using action=${actualAction} for ${sku}`);

      // Clear automation rules that might block the listing
      await suredoneEdit(
        { 'X-Auth-User': SUREDONE_USER, 'X-Auth-Token': SUREDONE_TOKEN },
        { guid: sku, sd_rule: '', sd_rulestate: '', ebaypaymentprofileid: '0' }
      );
      console.log(`[listing-action] Cleared sd_rule/sd_rulestate/payment profile for ${sku}`);
      await new Promise(r => setTimeout(r, 1000));

      result = await suredoneAction(jsonHeaders, sku, actualAction);

      // Auto-fix payment profile on relist/start too
      if (!isSuccess(result)) {
        const errors = extractError(result);
        const profileError = errors.find(e => e.type === 'payment_profile');
        if (profileError) {
          console.log(`Payment profile error on ${actualAction}, clearing profiles and retrying...`);
          await suredoneEdit(
            { 'X-Auth-User': SUREDONE_USER, 'X-Auth-Token': SUREDONE_TOKEN },
            { guid: sku, ebayprofile: '', ebaypaymentprofile: '', ebaypaymentprofileid: '0' }
          );
          result = await suredoneAction(jsonHeaders, sku, actualAction);
          retried = true;
        }
      }

    } else if (action === 'end') {
      // End listing
      console.log(`[listing-action] Ending ${sku}`);
      result = await suredoneAction(jsonHeaders, sku, 'end');

    } else if (action === 'revise' || action === 'edit') {
      // Revise/edit listing
      console.log(`[listing-action] Revising ${sku}`);
      result = await suredoneAction(jsonHeaders, sku, 'edit');

      // Auto-fix payment profile
      if (!isSuccess(result)) {
        const errors = extractError(result);
        const profileError = errors.find(e => e.type === 'payment_profile');
        if (profileError) {
          console.log('Payment profile error on revise, clearing profiles and retrying...');
          await suredoneEdit(
            { 'X-Auth-User': SUREDONE_USER, 'X-Auth-Token': SUREDONE_TOKEN },
            { guid: sku, ebayprofile: '', ebaypaymentprofile: '', ebaypaymentprofileid: '0' }
          );
          result = await suredoneAction(jsonHeaders, sku, 'edit');
          retried = true;
        }
      }

    } else if (action === 'delete') {
      // Delete still uses the old POST endpoint
      const deleteUrl = 'https://api.suredone.com/v1/editor/items/delete';
      const deleteForm = new URLSearchParams();
      deleteForm.append('identifier', 'guid');
      deleteForm.append('guid', sku);

      console.log(`[listing-action] Deleting ${sku}`);
      const deleteRes = await fetch(deleteUrl, {
        method: 'POST',
        headers: {
          'X-Auth-User': SUREDONE_USER,
          'X-Auth-Token': SUREDONE_TOKEN,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: deleteForm.toString()
      });

      const text = await deleteRes.text();
      try {
        result = JSON.parse(text);
      } catch {
        result = { result: 'failure', message: text.substring(0, 200) };
      }

    } else {
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
