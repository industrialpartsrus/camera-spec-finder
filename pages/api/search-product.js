// pages/api/search-product.js
// AI Product Search - Uses eBay's ACTUAL item specific names and allowed values
// The AI will return specs using eBay display names, which get converted to SureDone fields on submit

// Import cached eBay category aspects
import ebayAspects from '../../data/ebay-category-aspects.json';

// =============================================================================
// CATEGORY DETECTION - Maps product patterns to eBay category IDs
// =============================================================================
const CATEGORY_PATTERNS = {
  // Motors
  '181732': {
    name: 'Electric Motors',
    patterns: ['motor', 'hp ', 'rpm', 'tefc', 'odp', 'baldor', 'marathon', 'weg', 'leeson', 'teco', 'nema frame'],
    brandPatterns: ['baldor', 'marathon', 'weg', 'leeson', 'teco', 'dayton', 'us motors', 'lincoln']
  },
  // PLCs
  '181331': {
    name: 'PLCs & HMIs',
    patterns: ['plc', 'cpu', 'processor', 'slc', 'micrologix', 'compactlogix', 'controllogix', 'hmi', 'panelview', 'touch panel'],
    brandPatterns: ['allen-bradley', 'allen bradley', 'rockwell', 'siemens', 'omron', 'mitsubishi', 'automation direct']
  },
  // Power Supplies  
  '181332': {
    name: 'Power Supplies',
    patterns: ['power supply', 'psu', 'vdc', 'vac output', '24v', '12v', '5v', 'switching'],
    brandPatterns: ['mean well', 'meanwell', 'lambda', 'cosel', 'sola', 'phoenix contact', 'automation direct']
  },
  // Servo Drives
  '181740': {
    name: 'Drives & Starters > Servo Drives',
    patterns: ['servo drive', 'servo amplifier', 'axis drive', 'motion control'],
    brandPatterns: ['yaskawa', 'fanuc', 'mitsubishi', 'siemens', 'allen-bradley', 'rexroth']
  },
  // VFDs
  '181737': {
    name: 'Drives & Starters > AC Drives',
    patterns: ['vfd', 'variable frequency', 'ac drive', 'inverter', 'frequency drive'],
    brandPatterns: ['yaskawa', 'abb', 'siemens', 'allen-bradley', 'danfoss', 'mitsubishi']
  },
  // Sensors
  '181787': {
    name: 'Sensors > Proximity',
    patterns: ['proximity', 'inductive', 'capacitive', 'prox sensor'],
    brandPatterns: ['turck', 'balluff', 'sick', 'omron', 'keyence', 'banner', 'ifm']
  },
  '181786': {
    name: 'Sensors > Photoelectric',
    patterns: ['photoelectric', 'photo sensor', 'photo eye', 'beam sensor', 'diffuse', 'retroreflective'],
    brandPatterns: ['banner', 'sick', 'keyence', 'omron', 'turck', 'balluff']
  },
  // Circuit Breakers
  '185134': {
    name: 'Circuit Breakers',
    patterns: ['circuit breaker', 'breaker', 'mccb', 'mcb'],
    brandPatterns: ['square d', 'siemens', 'eaton', 'cutler hammer', 'abb', 'ge']
  },
  // Contactors
  '181688': {
    name: 'Contactors',
    patterns: ['contactor', 'motor starter', 'nema size'],
    brandPatterns: ['square d', 'siemens', 'eaton', 'cutler hammer', 'abb', 'allen-bradley']
  }
};

// =============================================================================
// DETECT CATEGORY FROM BRAND/PART
// =============================================================================
function detectCategory(brand, partNumber) {
  const combined = `${brand} ${partNumber}`.toLowerCase();
  const brandLower = brand.toLowerCase();
  
  for (const [categoryId, config] of Object.entries(CATEGORY_PATTERNS)) {
    // Check brand patterns first (more specific)
    for (const pattern of config.brandPatterns || []) {
      if (brandLower.includes(pattern)) {
        return { categoryId, categoryName: config.name };
      }
    }
    // Then check general patterns
    for (const pattern of config.patterns || []) {
      if (combined.includes(pattern)) {
        return { categoryId, categoryName: config.name };
      }
    }
  }
  
  return null;
}

// =============================================================================
// BUILD AI PROMPT WITH EBAY'S ACTUAL FIELD NAMES
// =============================================================================
function buildPrompt(brand, partNumber, categoryId, categoryName) {
  // Get the eBay aspects for this category
  const categoryAspects = ebayAspects.categories?.[categoryId];
  
  let aspectInstructions = '';
  
  if (categoryAspects?.aspects) {
    const { required, recommended } = categoryAspects.aspects;
    
    // Build instructions for required fields
    if (required?.length > 0) {
      aspectInstructions += '\n\nREQUIRED FIELDS (must fill these):\n';
      for (const aspect of required) {
        if (aspect.allowedValues?.length > 0) {
          const vals = aspect.allowedValues.slice(0, 10).join('", "');
          aspectInstructions += `  "${aspect.name}": Pick from ["${vals}"...] or closest match\n`;
        } else {
          aspectInstructions += `  "${aspect.name}": Extract from product data\n`;
        }
      }
    }
    
    // Build instructions for recommended fields (most important for SEO)
    if (recommended?.length > 0) {
      aspectInstructions += '\n\nRECOMMENDED FIELDS (fill as many as applicable):\n';
      for (const aspect of recommended.slice(0, 20)) { // Top 20 recommended
        if (aspect.name === 'Brand' || aspect.name === 'MPN') continue; // Skip, we handle these separately
        
        if (aspect.allowedValues?.length > 0 && aspect.allowedValues.length < 50) {
          const vals = aspect.allowedValues.slice(0, 8).join('", "');
          aspectInstructions += `  "${aspect.name}": Pick from ["${vals}"...]\n`;
        } else {
          aspectInstructions += `  "${aspect.name}": Extract from product data\n`;
        }
      }
    }
  }

  return `Search for technical specifications about: ${brand} ${partNumber}

This is a ${categoryName} product (eBay category ${categoryId}).

Return ONLY valid JSON with this exact structure:
{
  "title": "Professional 80-char max title with brand, model, key specs",
  "productCategory": "${categoryName}",
  "usertype": "Specific product type like 'AC Induction Motor' or 'PLC Processor'",
  "shortDescription": "150-160 character meta description for SEO",
  "description": "<HTML description with specs table - see format below>",
  "specifications": {
    // Use EXACT eBay field names as keys (see below)
    // Fill in as many as you can find
  },
  "ebayCategoryId": "${categoryId}",
  "metaKeywords": ["keyword1", "keyword2", "keyword3", "keyword4", "keyword5"],
  "qualityFlag": "VERIFIED" or "NEEDS_REVIEW"
}

${aspectInstructions}

CRITICAL RULES FOR specifications OBJECT:
1. Use the EXACT eBay field names shown above as keys (e.g., "Rated Load (HP)" not "horsepower")
2. For fields with allowed values, pick the closest matching value from the list
3. If you cannot determine a value with confidence, omit it (don't guess)
4. Fill in as many fields as you can find data for

DESCRIPTION HTML FORMAT:
<p>Professional 2-3 sentence introduction about this ${categoryName}.</p>
<h3 style="margin:20px 0 10px;font-weight:bold;color:#333;">Technical Specifications</h3>
<table border="1" cellpadding="8" cellspacing="0" style="border-collapse:collapse;width:100%;max-width:600px;border:1px solid #ccc;">
<thead><tr style="background:#f5f5f5;"><th style="text-align:left;padding:10px;border:1px solid #ccc;">Specification</th><th style="text-align:left;padding:10px;border:1px solid #ccc;">Value</th></tr></thead>
<tbody>
<tr><td style="padding:8px;border:1px solid #ddd;">Brand</td><td style="padding:8px;border:1px solid #ddd;">${brand}</td></tr>
<tr><td style="padding:8px;border:1px solid #ddd;">Model</td><td style="padding:8px;border:1px solid #ddd;">${partNumber}</td></tr>
<!-- Add all found specifications as rows -->
</tbody>
</table>
<p style="margin-top:20px;">We warranty all items for 30 days from date of purchase.</p>

REQUIREMENTS:
✅ Title MUST be 80 characters or less
✅ Use exact eBay field names in specifications object
✅ Include ALL specifications you can find
✅ NO promotional language in table
✅ NO contact info, URLs, or phone numbers`;
}

// =============================================================================
// FALLBACK PROMPT (when category unknown)
// =============================================================================
function buildGenericPrompt(brand, partNumber) {
  return `Search for technical specifications about: ${brand} ${partNumber}

Return ONLY valid JSON:
{
  "title": "Professional 80-char max title",
  "productCategory": "Detected product category",
  "usertype": "Specific product type",
  "shortDescription": "150-160 char meta description",
  "description": "<HTML description with specs table>",
  "specifications": {},
  "ebayCategoryId": "",
  "metaKeywords": ["keyword1", "keyword2"],
  "qualityFlag": "NEEDS_REVIEW"
}

Find as many technical specifications as possible. Common fields include:
- Voltage, Amperage, Phase, Frequency
- Horsepower, RPM, Frame Size
- Dimensions, Weight
- Communication protocols
- Operating temperature

Title must be 80 characters or less.`;
}

// =============================================================================
// API HANDLER
// =============================================================================
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { brand, partNumber, category } = req.body;

  if (!brand || !partNumber) {
    return res.status(400).json({ error: 'Brand and part number required' });
  }

  try {
    // Detect or use provided category
    let detected = category ? { categoryId: category, categoryName: category } : detectCategory(brand, partNumber);
    
    // Build appropriate prompt
    const prompt = detected 
      ? buildPrompt(brand, partNumber, detected.categoryId, detected.categoryName)
      : buildGenericPrompt(brand, partNumber);

    console.log('=== SEARCH PRODUCT API ===');
    console.log('Brand:', brand);
    console.log('Part:', partNumber);
    console.log('Category:', detected?.categoryName || 'Unknown (generic prompt)');

    // Call Claude API with web search
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 4500,
        messages: [{ role: 'user', content: prompt }],
        tools: [{ type: 'web_search_20250305', name: 'web_search' }]
      })
    });

    const data = await response.json();

    // Return response with category info
    res.status(200).json({
      ...data,
      _detectedCategory: detected,
      _categoryAspects: detected ? ebayAspects.categories?.[detected.categoryId]?.aspects : null
    });

  } catch (error) {
    console.error('Search API error:', error);
    res.status(500).json({ error: error.message });
  }
}
