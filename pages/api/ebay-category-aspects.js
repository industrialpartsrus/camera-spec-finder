// pages/api/ebay-category-aspects.js
// Thin HTTP wrapper around lib/ebay-aspects.js (shared in-process fetcher).
// Kept so existing callers of this endpoint keep working; logic is shared.
import { getCategoryAspects } from '../../lib/ebay-aspects';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  const { categoryId } = req.query;
  if (!categoryId) {
    return res.status(400).json({ error: 'categoryId is required' });
  }
  try {
    const data = await getCategoryAspects(categoryId);
    res.status(200).json(data);
  } catch (error) {
    console.error('Error fetching category aspects:', error);
    res.status(500).json({ error: 'Failed to fetch category aspects', details: error.message });
  }
}
