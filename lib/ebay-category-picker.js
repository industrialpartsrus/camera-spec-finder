// lib/ebay-category-picker.js
// =============================================================================
// eBay category picker. Category IDs come only from the live eBay Taxonomy API.
//
// Order of sources at listing time (resolveCategory):
//   1. remembered choice for this product type (Firestore ebay_category_choices),
//      if checkLeafCategory says it is still a live leaf
//   2. the old hard-coded table ID, if it is still a live leaf (temporary;
//      the tables are removed in a later, approved step)
//   3. the picker: ranked eBay suggestions for "<product type> <title>"
// A lister confirms the category in pro.js; confirmChoice() remembers it.
//
// RANKING_RULES is plain data so it can move to iprus-standards later.
// =============================================================================

// Live eBay calls, loaded lazily so tests can inject fakes
const checkLeafCategory = async (id) => (await import('./ebay-categories.js')).checkLeafCategory(id);
const suggestCategories = async (q) => (await import('./ebay-categories.js')).suggestCategories(q);

export const RANKING_RULES = {
  version: 'plb-2026-11-16',
  // Never offered (eBay returns these, but nobody can list in them)
  excludeNameContains: ['blocked category', 'internal use'],
  // Category names that are usually wrong for a whole product...
  demote: {
    nameContainsWords: ['accessories', 'accessory', 'parts', 'part'],
    nameStartsWith: ['other'],
    penalty: 40,
  },
  // ...unless the title or product type says it is one
  demoteUnlessQueryHasWords: ['accessory', 'accessories', 'part', 'parts', 'kit', 'replacement', 'spare'],
  // Bonus per product-type word found in the category name (after singularizing)
  sharedWordBonus: 15,
  sharedWordIgnore: ['and', 'or', 'with', 'for', 'the', 'a', 'of', 'in', 'other'],
  // eBay's own order: first suggestion scores 100, each later one this much less
  positionStep: 5,
  top: 5,
};

const words = (s) => String(s || '').toLowerCase().split(/[^a-z0-9]+/).filter(Boolean);
const singular = (w) => (w.length > 3 && w.endsWith('ies') ? w.slice(0, -3) + 'y'
  : w.length > 3 && w.endsWith('es') && /(ch|sh|x|ss)es$/.test(w) ? w.slice(0, -2)
  : w.length > 3 && w.endsWith('s') && !w.endsWith('ss') ? w.slice(0, -1) : w);

/**
 * Ranks eBay suggestions. candidates: [{ categoryId, name, path }] in eBay's order.
 * Returns [{ ...candidate, score, why: [..] }] best first.
 */
export function rankCandidates(candidates, { productType = '', title = '' } = {}, rules = RANKING_RULES) {
  const queryWords = new Set([...words(productType), ...words(title)]);
  const queryAllowsDemoted = rules.demoteUnlessQueryHasWords.some(w => queryWords.has(w));
  const typeWords = new Set(words(productType).map(singular).filter(w => !rules.sharedWordIgnore.includes(w)));

  return candidates
    .filter(c => !rules.excludeNameContains.some(x => String(c.name || '').toLowerCase().includes(x)))
    .map((c, i) => {
    let score = 100 - i * rules.positionStep;
    const why = [`eBay rank ${i + 1}`];
    const nameWords = words(c.name);
    const demotable = nameWords.some(w => rules.demote.nameContainsWords.includes(w))
      || rules.demote.nameStartsWith.some(p => String(c.name || '').toLowerCase().startsWith(p));
    if (demotable && !queryAllowsDemoted) {
      score -= rules.demote.penalty;
      why.push(`-${rules.demote.penalty} accessories/parts/other category`);
    }
    const shared = [...new Set(nameWords.map(singular))].filter(w => typeWords.has(w));
    if (shared.length) {
      score += shared.length * rules.sharedWordBonus;
      why.push(`+${shared.length * rules.sharedWordBonus} shares "${shared.join('", "')}" with product type`);
    }
    return { ...c, score, why };
  }).sort((a, b) => b.score - a.score);
}

/** Ranked, live-leaf candidates for "<product type> <title>" (all of eBay). */
export async function getCandidates({ productType = '', title = '', query = null }, deps = {}) {
  const suggest = deps.suggestCategories || suggestCategories;
  const check = deps.checkLeafCategory || checkLeafCategory;
  const q = (query ?? `${productType} ${title}`).trim();
  if (!q) return [];
  const raw = await suggest(q);
  const ranked = rankCandidates(raw, { productType, title: query ?? title });
  // Leaf categories only (eBay suggests leaves, but check: it's cached and cheap)
  const out = [];
  for (const c of ranked) {
    if (out.length >= RANKING_RULES.top) break;
    const live = await check(c.categoryId).catch(() => null);
    if (live?.valid) out.push(c);
  }
  return out;
}

// ---- Remembered choices (Firestore ebay_category_choices/{productType}) ----

export const choiceDocId = (productType) => {
  const id = String(productType || '').trim().toLowerCase().replace(/[\/#?\[\]]+/g, '_').slice(0, 500);
  // Firestore reserves __name__ ids and "." / ".."
  return /^__.*__$/.test(id) || id === '.' || id === '..' ? `pt-${id}` : id;
};

async function firestore() {
  const { db } = await import('../firebase.js');
  const fs = await import('firebase/firestore');
  return { db, ...fs };
}

export async function getRememberedChoice(productType) {
  const id = choiceDocId(productType);
  if (!id) return null;
  const { db, doc, getDoc } = await firestore();
  const snap = await getDoc(doc(db, 'ebay_category_choices', id));
  return snap.exists() ? snap.data() : null;
}

/** Saves a lister's confirmed choice. The category must be a live leaf. */
export async function confirmChoice({ productType, categoryId, confirmedBy = '' }, deps = {}) {
  const check = deps.checkLeafCategory || checkLeafCategory;
  const id = choiceDocId(productType);
  if (!id) throw new Error('productType is required');
  const live = await check(categoryId);
  if (!live.valid) return { ok: false, reason: live.reason };
  const path = deps.path ?? null;
  const { db, doc, setDoc, increment, serverTimestamp } = await firestore();
  await setDoc(doc(db, 'ebay_category_choices', id), {
    productType: String(productType).trim(),
    categoryId: live.categoryId,
    name: live.name,
    path: path || null,
    confirmedBy: String(confirmedBy || ''),
    confirmedAt: serverTimestamp(),
    count: increment(1),
  }, { merge: true });
  console.log(`EBAY_CATEGORY_CHOICE_SAVED ${JSON.stringify({ productType, categoryId: live.categoryId, name: live.name, confirmedBy })}`);
  return { ok: true, categoryId: live.categoryId, name: live.name };
}

/**
 * Picks the category to preselect. Returns
 *   { source: 'remembered' | 'table' | 'picker', categoryId, name, path,
 *     needsConfirmation, candidates, notes }
 * candidates are always included so the picker can show alternatives.
 */
export async function resolveCategory({ productType = '', title = '', tableId = '' }, deps = {}) {
  const check = deps.checkLeafCategory || checkLeafCategory;
  const remembered = deps.getRememberedChoice || getRememberedChoice;
  const notes = [];
  let pick = null;

  try {
    const r = productType ? await remembered(productType) : null;
    if (r?.categoryId) {
      const live = await check(r.categoryId);
      if (live.valid) pick = { source: 'remembered', categoryId: live.categoryId, name: live.name, path: r.path || null, needsConfirmation: false };
      else notes.push(`remembered category ${r.categoryId} is no longer valid: ${live.reason}`);
    }
  } catch (e) {
    notes.push(`remembered choices unavailable: ${e.message}`);
  }

  if (!pick && tableId) {
    const live = await check(tableId).catch(e => ({ valid: false, reason: e.message }));
    if (live.valid) pick = { source: 'table', categoryId: live.categoryId, name: live.name, path: null, needsConfirmation: true };
    else notes.push(`table category ${tableId} is not usable: ${live.reason}`);
  }

  let candidates = [];
  try {
    candidates = await getCandidates({ productType, title }, deps);
  } catch (e) {
    notes.push(`eBay suggestions unavailable: ${e.message}`);
  }

  if (!pick) {
    return { source: 'picker', categoryId: '', name: '', path: '', needsConfirmation: true, candidates, notes };
  }
  if (!pick.path) pick.path = candidates.find(c => c.categoryId === pick.categoryId)?.path || null;
  return { ...pick, candidates, notes };
}
