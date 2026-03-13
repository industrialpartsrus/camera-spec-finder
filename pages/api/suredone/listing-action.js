// ============================================================
// /pages/api/suredone/listing-action.js
// Centralized endpoint for SureDone listing actions:
// start, relist, end, revise, delete — across eBay and BigCommerce
//
// SureDone API: POST form-urlencoded to action-specific endpoints:
//   /v1/editor/items/edit    — update fields
//   /v1/editor/items/relist  — relist ended eBay listing
//   /v1/editor/items/start   — fresh new listing
//   /v1/editor/items/end     — end listing
//   /v1/editor/items/delete  — remove item
// ============================================================

import { getSureDoneCredentials } from '../../../lib/suredone-config';

const BASE_URL = 'https://api.suredone.com/v1/editor/items';

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

// Helper: build form data with identifier=guid
function makeForm(sku) {
  const form = new URLSearchParams();
  form.append('identifier', 'guid');
  form.append('guid', sku);
  return form;
}

// Helper: POST form-urlencoded to a SureDone endpoint
async function suredonePost(headers, endpoint, form) {
  const url = `${BASE_URL}/${endpoint}`;
  console.log(`[listing-action] POST ${url} — ${form.toString().substring(0, 200)}`);

  const response = await fetch(url, {
    method: 'POST',
    headers,
    body: form.toString()
  });

  const text = await response.text();
  console.log(`[listing-action] Response:`, text.substring(0, 500));

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

  const formHeaders = {
    'X-Auth-User': SUREDONE_USER,
    'X-Auth-Token': SUREDONE_TOKEN,
    'Content-Type': 'application/x-www-form-urlencoded',
  };

  const jsonHeaders = {
    'X-Auth-User': SUREDONE_USER,
    'X-Auth-Token': SUREDONE_TOKEN,
    'Content-Type': 'application/json',
  };

  console.log(`Listing action: ${action} on ${sku} (channel: ${channel})`);

  try {
    let result;
    let retried = false;

    if (action === 'relist') {
      // Relist: always use POST /relist (NOT /start — that rejects existing SKUs)
      console.log(`[listing-action] Relist requested for ${sku}, fetching item data...`);

      const checkUrl = `https://api.suredone.com/v1/search/items/${encodeURIComponent('guid:=' + sku)}`;
      const checkRes = await fetch(checkUrl, { headers: jsonHeaders });
      const checkData = await checkRes.json();

      let itemTitle = '';
      let hasEbayId = false;
      for (const key of Object.keys(checkData)) {
        if (!isNaN(key) && checkData[key]?.guid?.toUpperCase() === sku.toUpperCase()) {
          itemTitle = checkData[key].title || '';
          const ebayId = checkData[key].ebayid || '';
          hasEbayId = ebayId.length >= 6 && /^\d+$/.test(ebayId);
          console.log(`[listing-action] ${sku} ebayid=${ebayId || 'none'}, hasEbayId=${hasEbayId}, title="${itemTitle.substring(0, 60)}"`);
          break;
        }
      }

      // Step 1: Clear blockers AND set ebaytitle (REQUIRED for /relist — error 62 if blank)
      const clearForm = makeForm(sku);
      clearForm.append('rule', '');
      clearForm.append('rulestate', '');
      clearForm.append('ebayprice', '');
      clearForm.append('ebaypaymentprofileid', '0');
      clearForm.append('paymentprofileidebay', '0');
      clearForm.append('ebay2skip', '1');
      clearForm.append('googleskip', '1');
      // CRITICAL: ebaytitle MUST be populated for relist
      if (itemTitle) {
        clearForm.append('ebaytitle', itemTitle);
      }

      console.log(`[listing-action] Pre-clear for ${sku}, setting ebaytitle="${itemTitle.substring(0, 60)}"`);
      await suredonePost(formHeaders, 'edit', clearForm);
      await new Promise(r => setTimeout(r, 2000));

      // Step 2: Always use /relist for existing items
      const form = makeForm(sku);
      form.append('ebay2skip', '1');
      form.append('googleskip', '1');

      console.log(`[listing-action] POST /relist for ${sku}`);
      result = await suredonePost(formHeaders, 'relist', form);

      // Auto-fix payment profile on failure
      if (!isSuccess(result)) {
        const errors = extractError(result);
        const profileError = errors.find(e => e.type === 'payment_profile');
        if (profileError) {
          console.log(`Payment profile error on relist, clearing profiles and retrying...`);
          const fixForm = makeForm(sku);
          fixForm.append('ebayprofile', '');
          fixForm.append('ebaypaymentprofile', '');
          fixForm.append('ebaypaymentprofileid', '0');
          fixForm.append('paymentprofileidebay', '0');
          fixForm.append('ebay2skip', '1');
          fixForm.append('googleskip', '1');
          await suredonePost(formHeaders, 'edit', fixForm);

          const retryForm = makeForm(sku);
          retryForm.append('ebay2skip', '1');
          retryForm.append('googleskip', '1');
          result = await suredonePost(formHeaders, 'relist', retryForm);
          retried = true;
        }
      }

    } else if (action === 'start' || action === 'add') {
      // Start: first-time publish for brand new items only
      const clearForm = makeForm(sku);
      clearForm.append('rule', '');
      clearForm.append('rulestate', '');
      clearForm.append('ebayprice', '');
      clearForm.append('ebaytitle', '');
      clearForm.append('ebaypaymentprofileid', '0');
      clearForm.append('paymentprofileidebay', '0');
      clearForm.append('ebay2skip', '1');
      clearForm.append('googleskip', '1');

      console.log(`[listing-action] Clearing rule/rulestate/overrides for ${sku}`);
      await suredonePost(formHeaders, 'edit', clearForm);
      await new Promise(r => setTimeout(r, 3000));

      // Start/publish listing
      const form = makeForm(sku);
      form.append('ebay2skip', '1');
      form.append('googleskip', '1');
      console.log(`[listing-action] POST /start for ${sku}`);
      result = await suredonePost(formHeaders, 'start', form);

      // Auto-fix payment profile on failure
      if (!isSuccess(result)) {
        const errors = extractError(result);
        const profileError = errors.find(e => e.type === 'payment_profile');
        if (profileError) {
          console.log('Payment profile error detected, clearing profiles and retrying start...');
          const fixForm = makeForm(sku);
          fixForm.append('ebayprofile', '');
          fixForm.append('ebaypaymentprofile', '');
          fixForm.append('ebaypaymentprofileid', '0');
          fixForm.append('paymentprofileidebay', '0');
          fixForm.append('ebay2skip', '1');
          fixForm.append('googleskip', '1');
          await suredonePost(formHeaders, 'edit', fixForm);

          const retryForm = makeForm(sku);
          retryForm.append('ebay2skip', '1');
          retryForm.append('googleskip', '1');
          result = await suredonePost(formHeaders, 'start', retryForm);
          retried = true;
        }
      }

    } else if (action === 'end') {
      const form = makeForm(sku);
      form.append('ebay2skip', '1');
      form.append('googleskip', '1');
      console.log(`[listing-action] POST /end for ${sku}`);
      result = await suredonePost(formHeaders, 'end', form);

    } else if (action === 'revise' || action === 'edit') {
      // Check if item has an eBay listing to revise
      const checkUrl = `https://api.suredone.com/v1/search/items/${encodeURIComponent('guid:=' + sku)}`;
      const checkRes = await fetch(checkUrl, { headers: jsonHeaders });
      const checkData = await checkRes.json();

      let hasEbayId = false;
      let itemTitle = '';
      for (const key of Object.keys(checkData)) {
        if (!isNaN(key) && checkData[key]?.guid?.toUpperCase() === sku.toUpperCase()) {
          const ebayId = checkData[key].ebayid || '';
          hasEbayId = ebayId.length >= 6 && /^\d+$/.test(ebayId);
          itemTitle = checkData[key].title || '';
          console.log(`[listing-action] edit/revise: ${sku} ebayid=${ebayId || 'none'}, hasEbayId=${hasEbayId}`);
          break;
        }
      }

      if (hasEbayId) {
        // Has active eBay listing — revise it
        const form = makeForm(sku);
        form.append('ebayskip', '0');
        form.append('bigcommerceskip', '0');
        form.append('ebay2skip', '1');
        form.append('googleskip', '1');
        console.log(`[listing-action] POST /edit (revise) for ${sku}`);
        result = await suredonePost(formHeaders, 'edit', form);
      } else {
        // No eBay ID — fall through to relist (NOT /start — that rejects existing SKUs)
        console.log(`[listing-action] No eBay ID for ${sku}, falling through to relist`);

        // Set ebaytitle + clear blockers
        const clearForm = makeForm(sku);
        clearForm.append('rule', '');
        clearForm.append('rulestate', '');
        clearForm.append('ebayprice', '');
        clearForm.append('ebaypaymentprofileid', '0');
        clearForm.append('paymentprofileidebay', '0');
        clearForm.append('ebay2skip', '1');
        clearForm.append('googleskip', '1');
        // CRITICAL: ebaytitle MUST be populated for relist
        if (itemTitle) {
          clearForm.append('ebaytitle', itemTitle);
        }

        await suredonePost(formHeaders, 'edit', clearForm);
        await new Promise(r => setTimeout(r, 2000));

        const form = makeForm(sku);
        form.append('ebay2skip', '1');
        form.append('googleskip', '1');
        console.log(`[listing-action] POST /relist for ${sku}`);
        result = await suredonePost(formHeaders, 'relist', form);
      }

      // Auto-fix payment profile on failure (applies to both paths)
      if (!isSuccess(result)) {
        const errors = extractError(result);
        const profileError = errors.find(e => e.type === 'payment_profile');
        if (profileError) {
          console.log('Payment profile error on edit/relist, clearing profiles and retrying...');
          const fixForm = makeForm(sku);
          fixForm.append('ebayprofile', '');
          fixForm.append('ebaypaymentprofile', '');
          fixForm.append('ebaypaymentprofileid', '0');
          fixForm.append('paymentprofileidebay', '0');
          fixForm.append('ebay2skip', '1');
          fixForm.append('googleskip', '1');
          await suredonePost(formHeaders, 'edit', fixForm);

          const retryForm = makeForm(sku);
          retryForm.append('ebay2skip', '1');
          retryForm.append('googleskip', '1');
          if (hasEbayId) {
            retryForm.append('ebayskip', '0');
            retryForm.append('bigcommerceskip', '0');
            result = await suredonePost(formHeaders, 'edit', retryForm);
          } else {
            result = await suredonePost(formHeaders, 'relist', retryForm);
          }
          retried = true;
        }
      }

    } else if (action === 'delete') {
      const form = makeForm(sku);
      form.append('ebay2skip', '1');
      form.append('googleskip', '1');
      console.log(`[listing-action] POST /delete for ${sku}`);
      result = await suredonePost(formHeaders, 'delete', form);

    } else {
      return res.status(400).json({
        success: false,
        error: `Unknown action: ${action}`
      });
    }

    console.log(`[listing-action] ${action} result for ${sku}:`,
      JSON.stringify(result).substring(0, 500));

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
