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

// ---- Name search over eBay's live category tree (for the picker's search box) ----
// get_category_suggestions is driven by listing data and can miss a category
// whose name is exactly what was typed ("load cell"), so the search box also
// matches category names in the full US tree (fetched live, cached 24h).

let treeCache = null;      // { at, leaves: [{ categoryId, name, path, words }] }
let treeInflight = null;

const nameWords = (s) => String(s || '').toLowerCase().split(/[^a-z0-9]+/).filter(Boolean)
  .map(w => (w.length > 3 && w.endsWith('ies') ? w.slice(0, -3) + 'y'
    : w.length > 3 && /(ch|sh|x|ss)es$/.test(w) ? w.slice(0, -2)
    : w.length > 3 && w.endsWith('s') && !w.endsWith('ss') ? w.slice(0, -1) : w));

async function getLeafIndex() {
  if (treeCache && Date.now() - treeCache.at < DAY) return treeCache.leaves;
  if (!treeInflight) {
    treeInflight = (async () => {
      const token = await getEbayToken();
      const res = await fetch(TREE, {
        headers: { Authorization: `Bearer ${token}`, Accept: 'application/json', 'Accept-Encoding': 'gzip' },
        signal: AbortSignal.timeout(30000),
      });
      if (!res.ok) throw new EbayCategoryUnavailableError(`eBay category tree ${res.status}`);
      const data = await res.json();
      const leaves = [];
      const walk = (node, trail) => {
        const name = node.category?.categoryName;
        const path = name && node.categoryTreeNodeLevel > 0 ? [...trail, name] : trail;
        if (node.leafCategoryTreeNode && name) {
          leaves.push({ categoryId: node.category.categoryId, name, path: path.join(' > '), words: new Set(nameWords(name)), pathWords: new Set(nameWords(path.join(' '))) });
        }
        for (const child of node.childCategoryTreeNodes || []) walk(child, path);
      };
      walk(data.rootCategoryNode, []);
      treeCache = { at: Date.now(), leaves };
      console.log(`eBay category tree loaded: ${leaves.length} leaf categories`);
      return leaves;
    })().finally(() => { treeInflight = null; });
  }
  return treeInflight;
}

/**
 * Leaf categories whose name (or, failing that, path) contains every typed word.
 * Sorted: preferPrefix paths first (e.g. "Business & Industrial"), then the
 * closest names (fewest extra words).
 */
export async function searchCategoriesByName(text, { limit = 10, preferPrefix = '' } = {}) {
  const want = nameWords(text);
  if (!want.length) return [];
  const leaves = await getLeafIndex();
  const order = (list) => list
    .map(l => ({ l, pref: preferPrefix && l.path.startsWith(preferPrefix) ? 0 : 1, extra: l.words.size - want.length }))
    .sort((a, b) => a.pref - b.pref || a.extra - b.extra || a.l.name.localeCompare(b.l.name))
    .map(x => x.l);
  const inName = order(leaves.filter(l => want.every(w => l.words.has(w))));
  const inPath = inName.length >= limit ? [] : order(leaves.filter(l => !l.words.size || (!want.every(w => l.words.has(w)) && want.every(w => l.pathWords.has(w)))));
  return [...inName, ...inPath].slice(0, limit).map(({ categoryId, name, path }) => ({ categoryId, name, path }));
}
