// pages/api/auto-research-pass2.js
// Pass 2 (eBay item specifics) as its own call, with its own maxDuration
// (vercel.json). Called by auto-research after Pass 1; safe to call again for
// an item whose Pass 2 is 'pending' or 'error'.
//   POST { itemId }
// Uses the item's eBay category and the LIVE eBay aspects (full objects, saved
// on the product as ebayAspectsFull so nothing is lost if this call fails).

import { db } from '../../firebase';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { getCategoryAspects } from '../../lib/ebay-aspects';

// Full aspect objects, trimmed so the product doc stays well under Firestore's 1 MB
const MAX_ALLOWED_VALUES = 200;
function trimAspects(aspects) {
  const trim = (list = []) => list.map(a => ({
    ...a,
    allowedValues: (a.allowedValues || []).slice(0, MAX_ALLOWED_VALUES),
    allowedValuesTrimmed: (a.allowedValues || []).length > MAX_ALLOWED_VALUES,
  }));
  return {
    categoryId: aspects.categoryId || null,
    totalAspects: aspects.totalAspects || 0,
    required: trim(aspects.required), recommended: trim(aspects.recommended), optional: trim(aspects.optional),
  };
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed. Use POST.' });
  const { itemId } = req.body || {};
  if (!itemId) return res.status(400).json({ success: false, error: 'itemId required' });

  const productRef = doc(db, 'products', itemId);
  try {
    const snap = await getDoc(productRef);
    if (!snap.exists()) return res.status(404).json({ success: false, error: 'Product not found' });
    const product = snap.data();
    if (product.pass2Status === 'complete') return res.json({ success: true, skipped: true, reason: 'Pass 2 already complete' });
    if (!product.ebayCategoryId) {
      await updateDoc(productRef, { pass2Status: 'pending', autoResearchNote: 'Pass 2 waiting for an eBay category' });
      return res.json({ success: true, skipped: true, reason: 'no eBay category yet' });
    }

    // Live aspects (full objects), saved before the AI call
    const aspects = await getCategoryAspects(String(product.ebayCategoryId));
    const all = [...(aspects.required || []), ...(aspects.recommended || []), ...(aspects.optional || [])];
    await updateDoc(productRef, { pass2Status: 'filling', ebayAspectsFull: trimAspects(aspects) });
    if (!all.length) {
      await updateDoc(productRef, { pass2Status: 'complete', pass2FilledCount: 0, pass2TotalCount: 0 });
      return res.json({ success: true, filledCount: 0, totalCount: 0 });
    }

    const protocol = req.headers.host?.includes('localhost') ? 'http' : 'https';
    const r = await fetch(`${protocol}://${req.headers.host}/api/v2/auto-fill-ebay-specifics`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        brand: product.brand || '',
        partNumber: product.partNumber || '',
        productType: product.productType || product.productCategory || '',
        title: product.title || '',
        ebayAspects: { ...aspects, all },
        pass1Specs: product.specifications || {},
      }),
    });
    if (!r.ok) throw new Error(`auto-fill-ebay-specifics ${r.status}`);
    const d = await r.json();
    if (!d.success) throw new Error(d.error || 'auto-fill-ebay-specifics failed');

    const pass2Update = {
      ebayItemSpecifics: d.data?.specificsForUI || d.filledSpecifics || [],
      ebayItemSpecificsForSuredone: d.data?.specificsForSuredone || d.suredoneFields || {},
      pass2Status: 'complete',
      pass2FilledCount: d.data?.filledCount || d.filledCount || 0,
      pass2TotalCount: d.data?.totalCount || d.totalCount || 0,
      autoResearchNote: '',
    };
    Object.keys(pass2Update).forEach(k => pass2Update[k] === undefined && delete pass2Update[k]);
    await updateDoc(productRef, pass2Update);
    console.log(`[Pass 2 ${itemId}] saved ${pass2Update.pass2FilledCount}/${pass2Update.pass2TotalCount}`);
    return res.json({ success: true, filledCount: pass2Update.pass2FilledCount, totalCount: pass2Update.pass2TotalCount });
  } catch (e) {
    console.error(`[Pass 2 ${itemId}] failed:`, e.message);
    // 'pending' (not 'error') so Pro Builder resumes it when the item is opened
    try { await updateDoc(productRef, { pass2Status: 'pending', autoResearchNote: `Pass 2 failed: ${e.message}. Pro Builder will retry when the item is opened.` }); } catch {}
    return res.status(500).json({ success: false, error: e.message });
  }
}
