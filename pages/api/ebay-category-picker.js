// pages/api/ebay-category-picker.js
// eBay category picker (live Taxonomy API only). See lib/ebay-category-picker.js.
//   GET  ?productType=&title=&tableId=   -> resolveCategory (preselect + top 5 candidates)
//   GET  ?q=<typed text>&productType=    -> ranked live suggestions for the search box
//   POST { productType, categoryId, path, confirmedBy } -> remember the lister's confirmed choice

import { resolveCategory, getCandidates, confirmChoice, RANKING_RULES } from '../../lib/ebay-category-picker';

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  try {
    if (req.method === 'GET') {
      const { productType = '', title = '', tableId = '', q } = req.query;
      if (q !== undefined) {
        const candidates = await getCandidates({ productType, query: String(q) });
        return res.status(200).json({ candidates, rulesVersion: RANKING_RULES.version });
      }
      if (!productType && !title) return res.status(400).json({ error: 'productType or title required' });
      const result = await resolveCategory({ productType, title, tableId });
      return res.status(200).json({ ...result, rulesVersion: RANKING_RULES.version });
    }
    if (req.method === 'POST') {
      const { productType, categoryId, path = null, confirmedBy = '' } = req.body || {};
      if (!productType || !categoryId) return res.status(400).json({ error: 'productType and categoryId required' });
      const r = await confirmChoice({ productType, categoryId, confirmedBy }, { path });
      return res.status(r.ok ? 200 : 422).json(r);
    }
    return res.status(405).json({ error: 'Method not allowed' });
  } catch (e) {
    console.error('ebay-category-picker error:', e);
    return res.status(500).json({ error: e.message });
  }
}
