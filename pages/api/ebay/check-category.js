// pages/api/ebay/check-category.js
// Validates if an eBay category ID is still valid

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { categoryId } = req.query;

  if (!categoryId) {
    return res.status(400).json({ error: 'categoryId is required' });
  }

  try {
    // Get OAuth token
    const tokenResponse = await fetch(`https://${req.headers.host}/api/ebay/get-access-token`);
    const tokenData = await tokenResponse.json();

    if (!tokenData.success) {
      return res.status(500).json({ error: 'Failed to get eBay token' });
    }

    // Try to fetch category aspects - if it fails, category is invalid
    const aspectsUrl = `https://api.ebay.com/commerce/taxonomy/v1/category_tree/0/get_item_aspects_for_category?category_id=${categoryId}`;
    
    const response = await fetch(aspectsUrl, {
      headers: {
        'Authorization': `Bearer ${tokenData.access_token}`,
        'Content-Type': 'application/json'
      }
    });

    if (response.ok) {
      const data = await response.json();
      return res.status(200).json({
        valid: true,
        categoryId: categoryId,
        aspectCount: data.aspects?.length || 0
      });
    } else if (response.status === 404) {
      return res.status(200).json({
        valid: false,
        categoryId: categoryId,
        error: 'Category not found - may be outdated or invalid'
      });
    } else {
      const errorText = await response.text();
      return res.status(200).json({
        valid: false,
        categoryId: categoryId,
        error: `eBay API returned ${response.status}`,
        details: errorText.substring(0, 200)
      });
    }

  } catch (error) {
    return res.status(500).json({
      error: 'Failed to check category',
      details: error.message
    });
  }
}
