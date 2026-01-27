// pages/api/ebay/validate-listing.js
// Validates a listing's item specifics against eBay category requirements
// Returns what's missing, invalid, or could be improved

import { getEbayAccessToken } from './get-access-token';

const EBAY_US_CATEGORY_TREE_ID = '0';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed. Use POST.' });
  }

  const { categoryId, itemSpecifics } = req.body;

  if (!categoryId) {
    return res.status(400).json({ error: 'categoryId is required' });
  }

  if (!itemSpecifics || typeof itemSpecifics !== 'object') {
    return res.status(400).json({ 
      error: 'itemSpecifics is required as an object',
      example: { "Brand": "Festo", "MPN": "DGP-32-500-PPV-A-B", "Condition": "Used" }
    });
  }

  try {
    // Get category requirements from eBay
    const token = await getEbayAccessToken();
    const url = `https://api.ebay.com/commerce/taxonomy/v1/category_tree/${EBAY_US_CATEGORY_TREE_ID}/get_item_aspects_for_category?category_id=${categoryId}`;
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      return res.status(response.status).json({
        error: 'Failed to fetch category requirements',
        status: response.status
      });
    }

    const data = await response.json();
    const aspects = data.aspects || [];

    // Validate the listing
    const validation = validateItemSpecifics(itemSpecifics, aspects);

    return res.status(200).json({
      success: true,
      categoryId: categoryId,
      isValid: validation.isValid,
      score: validation.score,
      summary: validation.summary,
      issues: {
        missing: validation.missing,
        invalid: validation.invalid,
        recommended: validation.recommended
      },
      provided: Object.keys(itemSpecifics).length,
      required: validation.requiredCount,
      totalAspects: aspects.length
    });

  } catch (error) {
    console.error('Validation error:', error);
    return res.status(500).json({
      error: 'Validation failed',
      details: error.message
    });
  }
}

/**
 * Validate item specifics against eBay requirements
 */
function validateItemSpecifics(itemSpecifics, aspects) {
  const missing = [];      // Required fields that are missing
  const invalid = [];      // Fields with invalid values
  const recommended = [];  // Recommended fields that are missing
  
  let requiredCount = 0;
  let requiredMet = 0;
  let recommendedCount = 0;
  let recommendedMet = 0;

  // Normalize item specifics keys to lowercase for comparison
  const normalizedSpecifics = {};
  for (const [key, value] of Object.entries(itemSpecifics)) {
    normalizedSpecifics[key.toLowerCase()] = { originalKey: key, value };
  }

  for (const aspect of aspects) {
    const aspectName = aspect.localizedAspectName;
    const aspectNameLower = aspectName.toLowerCase();
    const usage = aspect.aspectConstraint?.aspectUsage || 'OPTIONAL';
    const allowedValues = aspect.aspectValues?.map(v => v.localizedValue) || [];
    
    // Check if this aspect is provided
    const provided = normalizedSpecifics[aspectNameLower];
    
    if (usage === 'REQUIRED') {
      requiredCount++;
      
      if (!provided || !provided.value || provided.value.trim() === '') {
        missing.push({
          name: aspectName,
          type: 'REQUIRED',
          allowedValues: allowedValues.slice(0, 20), // Limit for response size
          hasAllowedValues: allowedValues.length > 0
        });
      } else {
        requiredMet++;
        
        // Check if value is valid (if there are restricted values)
        if (allowedValues.length > 0) {
          const isValidValue = allowedValues.some(
            v => v.toLowerCase() === provided.value.toLowerCase()
          );
          if (!isValidValue) {
            invalid.push({
              name: aspectName,
              providedValue: provided.value,
              allowedValues: allowedValues.slice(0, 20),
              message: `"${provided.value}" is not a valid value for ${aspectName}`
            });
          }
        }
      }
    } else if (usage === 'RECOMMENDED') {
      recommendedCount++;
      
      if (!provided || !provided.value || provided.value.trim() === '') {
        recommended.push({
          name: aspectName,
          type: 'RECOMMENDED',
          allowedValues: allowedValues.slice(0, 20),
          hasAllowedValues: allowedValues.length > 0,
          message: `Adding "${aspectName}" could improve listing visibility`
        });
      } else {
        recommendedMet++;
        
        // Check validity for recommended fields too
        if (allowedValues.length > 0) {
          const isValidValue = allowedValues.some(
            v => v.toLowerCase() === provided.value.toLowerCase()
          );
          if (!isValidValue) {
            invalid.push({
              name: aspectName,
              providedValue: provided.value,
              allowedValues: allowedValues.slice(0, 20),
              message: `"${provided.value}" may not be recognized for ${aspectName}`
            });
          }
        }
      }
    }
  }

  // Calculate score (0-100)
  const requiredScore = requiredCount > 0 ? (requiredMet / requiredCount) * 60 : 60;
  const recommendedScore = recommendedCount > 0 ? (recommendedMet / recommendedCount) * 30 : 30;
  const validityScore = invalid.length === 0 ? 10 : Math.max(0, 10 - invalid.length * 2);
  const score = Math.round(requiredScore + recommendedScore + validityScore);

  // Determine if listing is valid (all required fields met, no invalid values in required)
  const hasInvalidRequired = invalid.some(i => 
    aspects.find(a => a.localizedAspectName === i.name)?.aspectConstraint?.aspectUsage === 'REQUIRED'
  );
  const isValid = missing.length === 0 && !hasInvalidRequired;

  // Generate summary
  let summary = '';
  if (isValid && recommended.length === 0) {
    summary = '✅ Listing meets all eBay requirements';
  } else if (isValid) {
    summary = `✅ Required fields complete. ${recommended.length} recommended field(s) could be added.`;
  } else {
    summary = `❌ ${missing.length} required field(s) missing. ${invalid.length} invalid value(s).`;
  }

  return {
    isValid,
    score,
    summary,
    missing,
    invalid,
    recommended,
    requiredCount,
    requiredMet,
    recommendedCount,
    recommendedMet
  };
}
