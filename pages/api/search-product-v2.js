// pages/api/search-product-v2.js
// v2: Fetches ACTUAL eBay item specifics from Taxonomy API and passes to AI
// This ensures we use eBay's exact recommended field names

// ============================================================================
// EBAY CATEGORY DETECTION PATTERNS
// Maps brand/part patterns to eBay category IDs
// ============================================================================

const CATEGORY_DETECTION_RULES = [
  // PLCs & Controllers
  { pattern: /1756-|1769-|5069-|2080-|1746-|1747-|compactlogix|controllogix|micrologix|slc.?500/i, categoryId: '181708', name: 'PLC Processors' },
  { pattern: /1756-[A-Z]+[0-9]*\/[A-Z]/i, categoryId: '181711', name: 'PLC Chassis' },
  { pattern: /1756-PA|1756-PB|1769-PA|1769-PB/i, categoryId: '181720', name: 'PLC Power Supplies' },
  { pattern: /1756-I[BFQNT]|1756-O[BFWX]|1769-I[QFATM]|1769-O[BFWXA]/i, categoryId: '181714', name: 'PLC Input & Output Modules' },
  { pattern: /6ES7.?[0-9]{3}|simatic|s7-[0-9]{3,4}|6ES5/i, categoryId: '181708', name: 'PLC Processors' },
  { pattern: /CJ1W-|CJ2M-|CP1[ELH]-|CS1[WGDH]-|omron.*plc/i, categoryId: '181708', name: 'PLC Processors' },
  { pattern: /QJ71|Q0[0-9]|QX[0-9]|FX[0-9][A-Z]|mitsubishi.*plc/i, categoryId: '181708', name: 'PLC Processors' },
  
  // HMIs
  { pattern: /2711P-|2711R-|panelview|6AV[0-9]|simatic.*hmi|NS[0-9]+-|NB[0-9]+-/i, categoryId: '181709', name: 'HMI & Open Interface Panels' },
  
  // Servo Motors
  { pattern: /MPL-|MPM-|VPL-|TLY-|1326AB|1326AS|HC-[A-Z]F[0-9]|HA-[A-Z]F[0-9]|SGMG|SGMP|SGMJ|SGMS|SGMAH|SGMPH|SGMGH|HG-[A-Z]R|HF-[A-Z]P|servo.*motor/i, categoryId: '124603', name: 'Servo Motors' },
  
  // Servo Drives
  { pattern: /2098-|kinetix|MR-J[0-9]|SGDV-|SGDM-|SGDS-|MDS-[A-Z]-|MDS-[A-Z][0-9]|servo.*drive|servo.*amplifier/i, categoryId: '78191', name: 'Servo Drives & Amplifiers' },
  
  // VFDs
  { pattern: /22[A-Z]-|powerflex|ATV[0-9]{2,3}|ACS[0-9]{3}|FR-[A-Z][0-9]{3}|VLT|danfoss|vfd|variable.*frequency/i, categoryId: '78192', name: 'Variable Frequency Drives' },
  
  // Electric Motors
  { pattern: /M[0-9]{4}[A-Z]|[0-9]+HP.*motor|TEFC|ODP|[0-9]+RPM|baldor|marathon|weg|leeson|nema.*motor/i, categoryId: '181732', name: 'General Purpose Motors' },
  
  // Stepper Motors
  { pattern: /PK[0-9]{3}|23HS|17HS|stepper|NEMA.?[0-9]{2}.*motor/i, categoryId: '9723', name: 'Stepper Motors' },
  
  // Gearmotors
  { pattern: /gearmotor|gear.*motor|5GU|5GN|5IK|oriental.*motor.*gear/i, categoryId: '65452', name: 'Gearmotors' },
  
  // Gearboxes
  { pattern: /gearbox|gear.*reducer|speed.*reducer|[0-9]+:1.*ratio|worm.*gear|planetary/i, categoryId: '181772', name: 'Gearboxes & Speed Reducers' },
  
  // Power Supplies
  { pattern: /S8VK|S82K|SDN-|SDP-|1606-|24VDC.*power|power.*supply|PSU|[0-9]+W.*[0-9]+V/i, categoryId: '42017', name: 'Power Supplies' },
  
  // Sensors - Proximity
  { pattern: /E2E-|E2A-|E2B-|871[A-Z]-|872C|inductive|proximity.*sensor/i, categoryId: '65459', name: 'Proximity Sensors' },
  
  // Sensors - Photoelectric
  { pattern: /E3Z-|E3S-|E3X-|42[A-Z]{2}-|photoelectric|photo.*sensor|through.*beam/i, categoryId: '181786', name: 'Fiber Optic Sensors' },
  
  // Sensors - Pressure
  { pattern: /pressure.*sensor|PSE[0-9]|ISE[0-9]|[0-9]+PSI.*sensor|transducer/i, categoryId: '65456', name: 'Pressure Sensors' },
  
  // Pneumatic Cylinders
  { pattern: /CDQ2|CQ2|DSNU|DNC|ADN|SMC.*cylinder|festo.*cylinder|pneumatic.*cylinder|[0-9]+mm.*bore.*[0-9]+mm.*stroke/i, categoryId: '184027', name: 'Hydraulic & Pneumatic Cylinders' },
  
  // Pneumatic Valves
  { pattern: /SY[0-9]{4}|VQ[A-Z][0-9]{4}|CPE[0-9]|VUVG|solenoid.*valve|pneumatic.*valve|[0-9]\/[0-9].*valve/i, categoryId: '260291', name: 'Solenoid Valves & Coils' },
  
  // Circuit Breakers
  { pattern: /circuit.*breaker|140M|140MT|FAL|FAZ|QO|HOM|molded.*case/i, categoryId: '185134', name: 'Circuit Breakers' },
  
  // Contactors
  { pattern: /contactor|100-C|LC1D|3RT[0-9]|DIL[A-Z]/i, categoryId: '181680', name: 'IEC & NEMA Contactors' },
  
  // Relays
  { pattern: /relay|G2R|MY[0-9]|LY[0-9]|700-[A-Z]|ice.*cube/i, categoryId: '36328', name: 'General Purpose Relays' },
  { pattern: /safety.*relay|PNOZ|MSR|G9S/i, categoryId: '65464', name: 'Safety Relays' },
  
  // Encoders
  { pattern: /encoder|845[A-Z]-|E6[A-Z][0-9]|TRD-/i, categoryId: '65455', name: 'Rotary Encoders' },
  
  // Linear Motion
  { pattern: /linear.*bearing|LM[0-9]+UU|linear.*guide|rail.*block/i, categoryId: '181741', name: 'Linear Bearings & Bushings' },
  
  // Bearings
  { pattern: /bearing|6[0-9]{3}|6[0-9]{4}|UCF|UCP|pillow.*block/i, categoryId: '181750', name: 'Ball & Roller Bearings' },
  
  // Barcode Scanners
  { pattern: /CLV[0-9]{3}|barcode.*scanner|scanner.*[0-9]D|QR.*reader/i, categoryId: '46706', name: 'Barcode Scanners' },
  
  // Transformers
  { pattern: /transformer|kVA|step.*down|step.*up|isolation.*trans/i, categoryId: '260829', name: 'Industrial Control & General Purpose Transformers' },
];

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Detect eBay category from brand and part number
 */
function detectCategory(brand, partNumber) {
  const combined = `${brand} ${partNumber}`.toLowerCase();
  
  for (const rule of CATEGORY_DETECTION_RULES) {
    if (rule.pattern.test(combined)) {
      return { categoryId: rule.categoryId, categoryName: rule.name };
    }
  }
  
  // Default to generic category
  return { categoryId: null, categoryName: null };
}

/**
 * Fetch eBay item specifics from Taxonomy API
 */
async function fetchEbayItemSpecifics(categoryId, baseUrl) {
  if (!categoryId) return null;
  
  try {
    const url = `${baseUrl}/api/ebay/get-category-aspects?categoryId=${categoryId}`;
    const response = await fetch(url);
    
    if (!response.ok) {
      console.error('Failed to fetch eBay aspects:', response.status);
      return null;
    }
    
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching eBay aspects:', error);
    return null;
  }
}

/**
 * Build the AI prompt with eBay item specifics
 */
function buildPromptWithEbayAspects(brand, partNumber, categoryName, categoryId, aspects) {
  // Build list of eBay item specifics to fill
  let aspectsList = '';
  let aspectsJson = '';
  
  if (aspects && aspects.all) {
    // Required aspects
    if (aspects.required.length > 0) {
      aspectsList += '\n\nREQUIRED eBay Item Specifics (MUST fill these):\n';
      for (const aspect of aspects.required) {
        aspectsList += `- ${aspect.name}`;
        if (aspect.allowedValues.length > 0 && aspect.allowedValues.length <= 20) {
          aspectsList += ` [Allowed: ${aspect.allowedValues.slice(0, 10).join(', ')}${aspect.allowedValues.length > 10 ? '...' : ''}]`;
        }
        aspectsList += '\n';
        
        // Build JSON key (convert to SureDone format: lowercase, no spaces)
        const key = aspect.name.toLowerCase().replace(/[^a-z0-9]/g, '');
        aspectsJson += `    "${key}": "",\n`;
      }
    }
    
    // Recommended aspects
    if (aspects.recommended.length > 0) {
      aspectsList += '\n\nRECOMMENDED eBay Item Specifics (fill if info available):\n';
      for (const aspect of aspects.recommended) {
        aspectsList += `- ${aspect.name}`;
        if (aspect.allowedValues.length > 0 && aspect.allowedValues.length <= 20) {
          aspectsList += ` [Allowed: ${aspect.allowedValues.slice(0, 10).join(', ')}${aspect.allowedValues.length > 10 ? '...' : ''}]`;
        }
        aspectsList += '\n';
        
        const key = aspect.name.toLowerCase().replace(/[^a-z0-9]/g, '');
        aspectsJson += `    "${key}": "",\n`;
      }
    }
  }

  return `You are an expert industrial equipment specialist. Search for and compile comprehensive technical information about: ${brand} ${partNumber}

DETECTED CATEGORY: ${categoryName || 'Unknown'} (eBay Category ID: ${categoryId || 'Unknown'})
${aspectsList}

Return ONLY valid JSON (no markdown code blocks):
{
  "title": "Professional eBay title, max 80 characters, include brand, model, key specs",
  "productCategory": "${categoryName || ''}",
  "ebayCategoryId": "${categoryId || ''}",
  "shortDescription": "SEO meta description, 150-160 characters",
  "description": "HTML description with specs table - SEE FORMAT BELOW",
  "specifications": {
    "brand": "${brand}",
    "mpn": "${partNumber}",
${aspectsJson}  },
  "qualityFlag": "COMPLETE"
}

CRITICAL - SPECIFICATIONS OBJECT RULES:
1. Use EXACT field names shown above (lowercase, no spaces)
2. For fields with allowed values, ONLY use values from the allowed list
3. Use null for fields you cannot determine - NEVER guess
4. Extract ALL available technical specifications from product data

DESCRIPTION FORMAT (must be valid HTML):
<p>[2-3 sentence professional introduction explaining what this product is, its purpose, and key features. NO promotional language.]</p>

<h3 style="margin-top: 20px; margin-bottom: 10px; font-weight: bold; color: #333;">Technical Specifications</h3>
<table border="1" cellpadding="8" cellspacing="0" style="border-collapse: collapse; width: 100%; max-width: 600px; margin: 20px 0; border: 1px solid #ccc;">
<thead>
<tr style="background-color: #f5f5f5;">
<th style="text-align: left; padding: 10px; border: 1px solid #ccc; font-weight: bold;">Specification</th>
<th style="text-align: left; padding: 10px; border: 1px solid #ccc; font-weight: bold;">Value</th>
</tr>
</thead>
<tbody>
<tr><td style="padding: 8px; border: 1px solid #ddd;">Brand</td><td style="padding: 8px; border: 1px solid #ddd;">${brand}</td></tr>
<tr><td style="padding: 8px; border: 1px solid #ddd;">Model/Part Number</td><td style="padding: 8px; border: 1px solid #ddd;">${partNumber}</td></tr>
<!-- ADD ALL EXTRACTED TECHNICAL SPECS AS TABLE ROWS -->
<!-- Only include specs you actually found - do not include null/unknown values -->
</tbody>
</table>

<p style="margin-top: 20px;">We warranty all items for 30 days from date of purchase.</p>

REQUIREMENTS:
✅ Title MUST be 80 characters or less
✅ Description MUST include the HTML specs table
✅ Only include specs in the table that have actual values
✅ NO promotional language, NO warranty claims in table
✅ NO URLs, emails, or phone numbers`;
}

/**
 * Build generic prompt when no category is detected
 */
function buildGenericPrompt(brand, partNumber) {
  return `You are an expert industrial equipment specialist. Search for comprehensive technical information about: ${brand} ${partNumber}

First, determine what type of product this is, then extract all available specifications.

Return ONLY valid JSON (no markdown code blocks):
{
  "title": "Professional eBay title, max 80 characters",
  "productCategory": "Detected product type",
  "ebayCategoryId": "",
  "shortDescription": "SEO meta description, 150-160 characters",
  "description": "HTML description with specs table",
  "specifications": {
    "brand": "${brand}",
    "mpn": "${partNumber}"
  },
  "qualityFlag": "NEEDS_REVIEW"
}

DESCRIPTION FORMAT (must be valid HTML):
<p>[2-3 sentence professional introduction]</p>

<h3 style="margin-top: 20px; margin-bottom: 10px; font-weight: bold; color: #333;">Technical Specifications</h3>
<table border="1" cellpadding="8" cellspacing="0" style="border-collapse: collapse; width: 100%; max-width: 600px; margin: 20px 0; border: 1px solid #ccc;">
<thead>
<tr style="background-color: #f5f5f5;">
<th style="text-align: left; padding: 10px; border: 1px solid #ccc; font-weight: bold;">Specification</th>
<th style="text-align: left; padding: 10px; border: 1px solid #ccc; font-weight: bold;">Value</th>
</tr>
</thead>
<tbody>
<tr><td style="padding: 8px; border: 1px solid #ddd;">Brand</td><td style="padding: 8px; border: 1px solid #ddd;">${brand}</td></tr>
<tr><td style="padding: 8px; border: 1px solid #ddd;">Model/Part Number</td><td style="padding: 8px; border: 1px solid #ddd;">${partNumber}</td></tr>
</tbody>
</table>

<p style="margin-top: 20px;">We warranty all items for 30 days from date of purchase.</p>`;
}

// ============================================================================
// API HANDLER
// ============================================================================

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { brand, partNumber } = req.body;

  if (!brand || !partNumber) {
    return res.status(400).json({ error: 'Brand and part number required' });
  }

  try {
    // Step 1: Detect category from brand/part patterns
    const { categoryId, categoryName } = detectCategory(brand, partNumber);
    
    console.log('=== SEARCH PRODUCT V2 ===');
    console.log('Brand:', brand);
    console.log('Part:', partNumber);
    console.log('Detected Category:', categoryName, '(ID:', categoryId, ')');

    // Step 2: Fetch eBay item specifics for this category
    let ebayAspects = null;
    if (categoryId) {
      // Get the base URL from the request
      const protocol = req.headers['x-forwarded-proto'] || 'http';
      const host = req.headers['host'];
      const baseUrl = `${protocol}://${host}`;
      
      ebayAspects = await fetchEbayItemSpecifics(categoryId, baseUrl);
      
      if (ebayAspects) {
        console.log('Fetched eBay aspects:', ebayAspects.totalAspects, 'total');
        console.log('Required:', ebayAspects.required?.length || 0);
        console.log('Recommended:', ebayAspects.recommended?.length || 0);
      }
    }

    // Step 3: Build prompt with eBay item specifics
    let prompt;
    if (categoryId && ebayAspects) {
      prompt = buildPromptWithEbayAspects(brand, partNumber, categoryName, categoryId, ebayAspects);
    } else {
      prompt = buildGenericPrompt(brand, partNumber);
    }

    // Step 4: Call Claude with web search
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
    
    // Return response with metadata
    res.status(200).json({
      ...data,
      _metadata: {
        detectedCategory: categoryName,
        detectedCategoryId: categoryId,
        ebayAspectsLoaded: !!ebayAspects,
        totalAspects: ebayAspects?.totalAspects || 0,
        requiredAspects: ebayAspects?.required?.length || 0,
        recommendedAspects: ebayAspects?.recommended?.length || 0
      },
      _ebayAspects: ebayAspects
    });
    
  } catch (error) {
    console.error('Search API error:', error);
    res.status(500).json({ error: error.message });
  }
}
