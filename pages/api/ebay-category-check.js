// pages/api/ebay-category-check.js
// Read-only. Live eBay Taxonomy API (US tree):
//   GET ?categoryId=181732   -> { valid, leaf, categoryId, name, reason }
//   GET ?q=<title/keywords>  -> { suggestions: [{ categoryId, name, path }] }

import { checkLeafCategory, suggestCategories, EbayCategoryUnavailableError } from '../../lib/ebay-categories';

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed. Use GET.' });
  const { categoryId, q } = req.query;
  try {
    if (categoryId !== undefined) return res.status(200).json(await checkLeafCategory(categoryId));
    if (q) return res.status(200).json({ suggestions: await suggestCategories(q) });
    return res.status(400).json({ error: 'categoryId or q required' });
  } catch (e) {
    const status = e instanceof EbayCategoryUnavailableError ? 503 : 500;
    return res.status(status).json({ error: e.message });
  }
}
