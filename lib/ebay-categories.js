// lib/ebay-categories.js
// eBay categories come ONLY from the live eBay Taxonomy API (US tree, id 0).
//
//   checkLeafCategory(id)      -> { valid, leaf, categoryId, name, reason }
//   suggestCategories(query)   -> [{ categoryId, name, path }]  (leaf categories)
//
// Results for a category ID are cached per instance for 24h (eBay changes
// categories a few times a year). Network/5xx failures are not cached.

import { getEbayToken } from '../pages/api/ebay-token';

const TREE = 'https://api.ebay.com/commerce/taxonomy/v1/category_tree/0';
const DAY = 24 * 60 * 60 * 1000;
const leafCache = new Map();

export class EbayCategoryUnavailableError extends Error {}

async function taxonomyGet(path, retries = 2) {
  let lastErr;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const token = await getEbayToken();
      const res = await fetch(`${TREE}/${path}`, {
        headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
        signal: AbortSignal.timeout(10000),
      });
      if (res.ok) return { status: res.status, data: await res.json() };
      // 4xx (bad or retired category) is an answer, not an outage
      if (res.status >= 400 && res.status < 500) return { status: res.status, data: await res.json().catch(() => null) };
      lastErr = new Error(`eBay Taxonomy API ${res.status}`);
    } catch (e) {
      lastErr = e;
    }
    if (attempt < retries) await new Promise(r => setTimeout(r, 400 * (attempt + 1)));
  }
  throw new EbayCategoryUnavailableError(`Could not reach the eBay Taxonomy API: ${lastErr?.message}`);
}

/** Is this a valid, current LEAF category in eBay's US tree? */
export async function checkLeafCategory(categoryId) {
  const id = String(categoryId ?? '').trim();
  if (!/^[1-9]\d*$/.test(id)) {
    return { valid: false, leaf: false, categoryId: id, name: null, reason: id ? `"${id}" is not an eBay category ID` : 'no eBay category ID' };
  }
  const hit = leafCache.get(id);
  if (hit && Date.now() - hit.at < DAY) return hit.result;

  const { status, data } = await taxonomyGet(`get_category_subtree?category_id=${id}`);
  let result;
  if (status === 200 && data?.categorySubtreeNode) {
    const node = data.categorySubtreeNode;
    const leaf = Boolean(node.leafCategoryTreeNode);
    result = {
      valid: leaf, leaf, categoryId: id, name: node.category?.categoryName || null,
      reason: leaf ? null : `eBay category ${id} (${node.category?.categoryName}) is not a leaf category; pick one of its subcategories`,
    };
  } else {
    const msg = data?.errors?.[0]?.message;
    result = { valid: false, leaf: false, categoryId: id, name: null,
      reason: `eBay category ${id} does not exist in eBay's current US category tree${msg ? ` (${msg})` : ''}` };
  }
  leafCache.set(id, { at: Date.now(), result });
  return result;
}

/** Leaf categories eBay suggests for a title or keywords, best first. */
export async function suggestCategories(query) {
  const q = String(query || '').trim().slice(0, 350);
  if (!q) return [];
  const { status, data } = await taxonomyGet(`get_category_suggestions?q=${encodeURIComponent(q)}`);
  if (status !== 200) return [];
  return (data?.categorySuggestions || []).map(s => ({
    categoryId: s.category?.categoryId,
    name: s.category?.categoryName,
    path: [...(s.categoryTreeNodeAncestors || [])].reverse().map(a => a.categoryName).concat(s.category?.categoryName).join(' > '),
  }));
}
