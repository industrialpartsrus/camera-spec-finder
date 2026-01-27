// pages/api/ebay/get-category-aspects.js
// Fetches item specifics (aspects) requirements for an eBay category
// Uses the eBay Taxonomy API

import { getEbayAccessToken } from './get-access-token';

// eBay US category tree ID
const EBAY_US_CATEGORY_TREE_ID = '0';

export default async function handler(req, res) {
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Accept categoryId from query params (GET) or body (POST)
  const categoryId = req.query.categoryId || req.body?.categoryId;

  if (!categoryId) {
    return res.status(400).json({ 
      error: 'categoryId is required',
      example: '/api/ebay/get-category-aspects?categoryId=58058'
    });
  }

  try {
    const token = await getEbayAccessToken();
    
    // Call eBay Taxonomy API to get aspects for this category
    const url = `https://api.ebay.com/commerce/taxonomy/v1/category_tree/${EBAY_US_CATEGORY_TREE_ID}/get_item_aspects_for_category?category_id=${categoryId}`;
    
    console.log(`Fetching eBay aspects for category ${categoryId}`);
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('eBay Taxonomy API error:', errorText);
      
      if (response.status === 404) {
        return res.status(404).json({
          error: 'Category not found',
          categoryId: categoryId,
          message: 'This category ID may not exist or may not be a leaf category'
        });
      }
      
      return res.status(response.status).json({
        error: 'eBay API error',
        status: response.status,
        details: errorText
      });
    }

    const data = await response.json();
    
    // Process and organize the aspects
    const aspects = processAspects(data.aspects || []);
    
    return res.status(200).json({
      success: true,
      categoryId: categoryId,
      categoryTreeId: EBAY_US_CATEGORY_TREE_ID,
      totalAspects: aspects.all.length,
      required: aspects.required,
      recommended: aspects.recommended,
      optional: aspects.optional,
      all: aspects.all,
      // Raw data for debugging
      raw: data
    });

  } catch (error) {
    console.error('Error fetching category aspects:', error);
    return res.status(500).json({
      error: 'Failed to fetch category aspects',
      details: error.message
    });
  }
}

/**
 * Process raw eBay aspects into organized structure
 */
function processAspects(aspects) {
  const required = [];
  const recommended = [];
  const optional = [];
  const all = [];

  for (const aspect of aspects) {
    const processed = {
      name: aspect.localizedAspectName,
      aspectConstraint: aspect.aspectConstraint?.aspectUsage || 'OPTIONAL',
      aspectMode: aspect.aspectConstraint?.aspectMode || 'FREE_TEXT',
      itemToAspectCardinality: aspect.aspectConstraint?.itemToAspectCardinality || 'SINGLE',
      isRequired: aspect.aspectConstraint?.aspectRequired || false,
      expectedDataType: aspect.aspectConstraint?.aspectDataType || 'STRING',
      // Get allowed values if they exist
      allowedValues: aspect.aspectValues?.map(v => v.localizedValue) || [],
      hasAllowedValues: (aspect.aspectValues?.length || 0) > 0,
      // Get value constraints
      maxLength: aspect.aspectConstraint?.aspectMaxLength || null,
    };

    all.push(processed);

    // Categorize by usage
    const usage = aspect.aspectConstraint?.aspectUsage;
    if (usage === 'REQUIRED') {
      required.push(processed);
    } else if (usage === 'RECOMMENDED') {
      recommended.push(processed);
    } else {
      optional.push(processed);
    }
  }

  return { required, recommended, optional, all };
}
