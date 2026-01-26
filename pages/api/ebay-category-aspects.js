// pages/api/ebay-category-aspects.js
// Fetches the ACTUAL item specifics (aspects) that eBay wants for a given category
// This tells us the exact field names to use so they go to Recommended, not Dynamic

import { getEbayToken } from './ebay-token';

// Cache for category aspects (they don't change often)
const aspectsCache = new Map();
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { categoryId } = req.query;

  if (!categoryId) {
    return res.status(400).json({ error: 'categoryId is required' });
  }

  // Check cache first
  const cacheKey = `category_${categoryId}`;
  const cached = aspectsCache.get(cacheKey);
  if (cached && (Date.now() - cached.timestamp) < CACHE_DURATION) {
    console.log(`Using cached aspects for category ${categoryId}`);
    return res.status(200).json(cached.data);
  }

  try {
    // Get a valid eBay token (auto-refreshes if needed)
    const token = await getEbayToken();

    // Call eBay Taxonomy API
    // Category tree 0 = EBAY_US
    const url = `https://api.ebay.com/commerce/taxonomy/v1/category_tree/0/get_item_aspects_for_category?category_id=${categoryId}`;

    console.log(`Fetching aspects for category ${categoryId} from eBay...`);

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
      console.error('eBay Taxonomy API error:', response.status, errorText);
      return res.status(response.status).json({
        error: 'eBay API error',
        details: errorText
      });
    }

    const data = await response.json();

    // Parse and format the aspects
    const formattedData = formatAspects(data, categoryId);

    // Cache the results
    aspectsCache.set(cacheKey, {
      timestamp: Date.now(),
      data: formattedData
    });

    res.status(200).json(formattedData);

  } catch (error) {
    console.error('Error fetching category aspects:', error);
    res.status(500).json({
      error: 'Failed to fetch category aspects',
      details: error.message
    });
  }
}

/**
 * Format eBay's aspect response into a usable structure
 */
function formatAspects(apiResponse, categoryId) {
  if (!apiResponse.aspects) {
    return {
      categoryId,
      totalAspects: 0,
      required: [],
      recommended: [],
      optional: [],
      all: []
    };
  }

  const aspects = apiResponse.aspects.map(aspect => {
    const name = aspect.localizedAspectName;

    // Generate the SureDone field name
    // "Motor Horsepower" → "motorhorsepower" (for inline/mapped fields)
    // "Motor Horsepower" → "ebayitemspecificsmotorhorsepower" (for dynamic fields)
    const cleanName = name.toLowerCase().replace(/[^a-z0-9]/g, '');
    
    return {
      // The display name eBay shows
      ebayName: name,

      // SureDone inline field name (for Recommended section)
      suredoneInlineField: cleanName,

      // SureDone dynamic field name (creates Dynamic section entry)
      suredoneDynamicField: 'ebayitemspecifics' + cleanName,

      // Is this required by eBay?
      required: aspect.aspectConstraint?.aspectRequired || false,

      // Usage: RECOMMENDED or OPTIONAL
      usage: aspect.aspectConstraint?.aspectUsage || 'OPTIONAL',

      // Input mode: FREE_TEXT or SELECTION_ONLY
      mode: aspect.aspectConstraint?.aspectMode || 'FREE_TEXT',

      // Data type
      dataType: aspect.aspectConstraint?.aspectDataType || 'STRING',

      // Allowed values (if SELECTION_ONLY)
      allowedValues: aspect.aspectValues?.map(v => v.localizedValue) || [],

      // Can have multiple values?
      multiValue: aspect.aspectConstraint?.itemToAspectCardinality === 'MULTI'
    };
  });

  // Sort by requirement
  const required = aspects.filter(a => a.required);
  const recommended = aspects.filter(a => !a.required && a.usage === 'RECOMMENDED');
  const optional = aspects.filter(a => !a.required && a.usage !== 'RECOMMENDED');

  return {
    categoryId,
    totalAspects: aspects.length,
    required,
    recommended,
    optional,
    all: aspects,
    // Create a quick lookup map for AI to use
    fieldMapping: aspects.reduce((map, aspect) => {
      map[aspect.ebayName] = aspect.suredoneInlineField;
      return map;
    }, {})
  };
}
