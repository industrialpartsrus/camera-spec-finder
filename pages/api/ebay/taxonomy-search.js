// pages/api/ebay/taxonomy-search.js
// Search eBay categories using eBay Taxonomy API (getCategorySuggestions)
// Uses direct eBay API with OAuth token (not SureDone proxy)

import { getEbayAccessToken } from './get-access-token';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { keyword } = req.query;
  if (!keyword || keyword.trim().length < 2) {
    return res.status(400).json({ error: 'Minimum 2 characters' });
  }

  try {
    const token = await getEbayAccessToken();

    // eBay Taxonomy API - getCategorySuggestions
    // category_tree_id 0 = US eBay (ebay.com)
    const url = `https://api.ebay.com/commerce/taxonomy/v1/category_tree/0/get_category_suggestions?q=${encodeURIComponent(keyword.trim())}`;

    console.log('eBay taxonomy search:', keyword);

    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json'
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('eBay taxonomy error:', response.status, errorText);
      return res.status(response.status).json({
        error: `eBay API error: ${response.status}`,
        details: errorText
      });
    }

    const data = await response.json();

    // eBay returns: { categorySuggestions: [ { category: { categoryId, categoryName }, categoryTreeNodeAncestors: [...] } ] }
    const categories = (data.categorySuggestions || []).map(suggestion => {
      const cat = suggestion.category;
      const ancestors = suggestion.categoryTreeNodeAncestors || [];

      // Build full path from ancestors (they come in reverse order)
      const pathParts = ancestors
        .reverse()
        .map(a => a.categoryName);
      pathParts.push(cat.categoryName);
      const fullPath = pathParts.join(' > ');

      return {
        id: cat.categoryId,
        name: fullPath,
        leafName: cat.categoryName
      };
    });

    console.log(`eBay taxonomy "${keyword}": ${categories.length} results`);

    return res.status(200).json({
      success: true,
      categories: categories,
      count: categories.length
    });

  } catch (error) {
    console.error('Taxonomy search error:', error);
    return res.status(500).json({
      success: false,
      error: 'Category search failed',
      details: error.message
    });
  }
}
