// pages/api/search-product.js
// Complete AI search with bullet point descriptions, categories, and structured specs

// eBay MARKETPLACE Category IDs (main eBay listing categories)
const EBAY_MARKETPLACE_CATEGORIES = {
  'Electric Motors': '181732',
  'Servo Motors': '181732',
  'Servo Drives': '181737',
  'VFDs': '181737',
  'PLCs': '181739',
  'HMIs': '181739',
  'Power Supplies': '181738',
  'I/O Modules': '181739',
  'Proximity Sensors': '181744',
  'Photoelectric Sensors': '181744',
  'Light Curtains': '181744',
  'Laser Sensors': '181744',
  'Pressure Sensors': '181744',
  'Temperature Sensors': '181744',
  'Ultrasonic Sensors': '181744',
  'Pneumatic Cylinders': '181738',
  'Pneumatic Valves': '181738',
  'Pneumatic Grippers': '181738',
  'Hydraulic Pumps': '181738',
  'Hydraulic Valves': '181738',
  'Hydraulic Cylinders': '181738',
  'Circuit Breakers': '181738',
  'Contactors': '181738',
  'Safety Relays': '181739',
  'Control Relays': '181738',
  'Bearings': '181745',
  'Linear Bearings': '181745',
  'Encoders': '181737',
  'Gearboxes': '181732',
  'Transformers': '181738',
  'Industrial Gateways': '181739',
  'AS-Interface': '181739',
  'Network Modules': '181739',
  'Unknown': '181739'
};

// eBay STORE Category IDs (YOUR store's leaf categories only)
// Secondary is ALWAYS "ALL PRODUCTS" (23399313015) for visibility
const EBAY_STORE_CATEGORIES = {
  'Electric Motors': { primary: '17167471', secondary: '23399313015' },      // ELECTRIC MOTORS
  'Servo Motors': { primary: '393389015', secondary: '23399313015' },        // SERVO MOTORS
  'Servo Drives': { primary: '393390015', secondary: '23399313015' },        // SERVO DRIVES
  'VFDs': { primary: '2242358015', secondary: '23399313015' },               // AC DRIVE
  'PLCs': { primary: '5404089015', secondary: '23399313015' },               // PLC
  'HMIs': { primary: '6686264015', secondary: '23399313015' },               // HMI
  'Power Supplies': { primary: '2242362015', secondary: '23399313015' },     // POWER SUPPLY
  'I/O Modules': { primary: '18373835', secondary: '23399313015' },          // I/O BOARDS
  'Proximity Sensors': { primary: '4173791015', secondary: '23399313015' },  // PROXIMITY SENSORS
  'Photoelectric Sensors': { primary: '4173793015', secondary: '23399313015' },
  'Light Curtains': { primary: '393379015', secondary: '23399313015' },
  'Laser Sensors': { primary: '2479732015', secondary: '23399313015' },
  'Pressure Sensors': { primary: '6690386015', secondary: '23399313015' },
  'Temperature Sensors': { primary: '6690556015', secondary: '23399313015' },
  'Ultrasonic Sensors': { primary: '4173791015', secondary: '23399313015' }, // Put in proximity if no ultrasonic category
  'Pneumatic Cylinders': { primary: '2461873015', secondary: '23399313015' },
  'Pneumatic Valves': { primary: '2461874015', secondary: '23399313015' },
  'Pneumatic Grippers': { primary: '6699359015', secondary: '23399313015' },
  'Hydraulic Pumps': { primary: '6696064015', secondary: '23399313015' },
  'Hydraulic Valves': { primary: '6696060015', secondary: '23399313015' },
  'Hydraulic Cylinders': { primary: '6696061015', secondary: '23399313015' },
  'Circuit Breakers': { primary: '5634105015', secondary: '23399313015' },
  'Contactors': { primary: '2348910015', secondary: '23399313015' },
  'Safety Relays': { primary: '2464037015', secondary: '23399313015' },
  'Control Relays': { primary: '2242359015', secondary: '23399313015' },
  'Bearings': { primary: '6690505015', secondary: '23399313015' },
  'Linear Bearings': { primary: '4173713015', secondary: '23399313015' },
  'Encoders': { primary: '1802953015', secondary: '23399313015' },
  'Gearboxes': { primary: '17167474', secondary: '23399313015' },
  'Transformers': { primary: '5634104015', secondary: '23399313015' },
  'Industrial Gateways': { primary: '5384028015', secondary: '23399313015' },
  'AS-Interface': { primary: '5384028015', secondary: '23399313015' },
  'Network Modules': { primary: '18373835', secondary: '23399313015' },
  'Unknown': { primary: '23399313015', secondary: '' }
};

// BigCommerce Category IDs
const BIGCOMMERCE_CATEGORIES = {
  'Electric Motors': '115',
  'Servo Motors': '115',
  'Servo Drives': '116',
  'VFDs': '116',
  'PLCs': '117',
  'HMIs': '117',
  'Proximity Sensors': '118',
  'Photoelectric Sensors': '118',
  'Unknown': '100'
};

// Helper function to detect category from brand/part number patterns
function detectCategoryFromPartNumber(brand, partNumber) {
  const brandLower = brand.toLowerCase();
  const partLower = partNumber.toLowerCase();
  const combined = `${brandLower} ${partLower}`;
  
  // Electric Motors - common patterns
  if (brandLower === 'baldor' || brandLower === 'baldor reliance' || brandLower === 'reliance') {
    // Baldor motor patterns: M3211T, M2515T, EM3211T, etc.
    if (/^[me]?\d{4}t?/i.test(partNumber) || /motor/i.test(combined)) {
      return 'Electric Motors';
    }
  }
  
  // WEG, Marathon, Leeson, US Motors = typically motors
  if (['weg', 'marathon', 'leeson', 'us motors', 'dayton', 'lincoln'].includes(brandLower)) {
    return 'Electric Motors';
  }
  
  // Servo Motors
  if (/servo.*motor|hf-|hc-|hg-|sgm|msmd|mhmd/i.test(combined)) {
    return 'Servo Motors';
  }
  
  // Servo Drives
  if (/servo.*drive|mr-j|sgdv|sgdm|kinetix/i.test(combined)) {
    return 'Servo Drives';
  }
  
  // VFDs
  if (/vfd|inverter|powerflex|altivar|micromaster|fr-[dea]/i.test(combined)) {
    return 'VFDs';
  }
  
  // PLCs
  if (/plc|1756-|1769-|1762-|slc500|micrologix|q0[0-9]|fx[0-9]|cj[12]m|cp1/i.test(combined)) {
    return 'PLCs';
  }
  
  // Sensors - be careful not to misclassify motors!
  if (brandLower === 'keyence' || brandLower === 'banner' || brandLower === 'sick' || brandLower === 'turck') {
    if (/prox|inductive|capacitive/i.test(combined)) return 'Proximity Sensors';
    if (/photo|retroreflective|diffuse|thru-beam/i.test(combined)) return 'Photoelectric Sensors';
    if (/laser/i.test(combined)) return 'Laser Sensors';
    if (/pressure/i.test(combined)) return 'Pressure Sensors';
    return 'Proximity Sensors'; // Default for sensor brands
  }
  
  // Pneumatics
  if (brandLower === 'smc' || brandLower === 'festo' || brandLower === 'ckd' || brandLower === 'numatics') {
    if (/cylinder|cdq|cq2|dsnu|advu/i.test(combined)) return 'Pneumatic Cylinders';
    if (/valve|vq|sy[0-9]|mfh|vuvs/i.test(combined)) return 'Pneumatic Valves';
    if (/gripper|mhz|hgp/i.test(combined)) return 'Pneumatic Grippers';
  }
  
  return null; // Let AI decide
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { brand, partNumber } = req.body;

  console.log('=== SEARCH PRODUCT START ===');
  console.log('Searching for:', brand, partNumber);

  // Pre-detect category based on known patterns
  const preDetectedCategory = detectCategoryFromPartNumber(brand, partNumber);
  console.log('Pre-detected category:', preDetectedCategory || 'None (AI will decide)');

  try {
    const categoryList = Object.keys(EBAY_MARKETPLACE_CATEGORIES).join(', ');

    // Build the prompt with category hint if we pre-detected
    let categoryHint = '';
    if (preDetectedCategory) {
      categoryHint = `\n\nIMPORTANT: Based on the brand "${brand}" and part number "${partNumber}", this product is most likely a "${preDetectedCategory}". Please verify this is correct based on your search results, but use this as your primary assumption unless you find strong evidence otherwise.`;
    }

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 4000,
        messages: [{
          role: 'user',
          content: `Search for industrial product: ${brand} ${partNumber}
${categoryHint}

PRODUCT CATEGORY - Choose the BEST match from this list:
${categoryList}

TITLE REQUIREMENTS (80 characters max):
- Format: "Brand Model - Key Specs"
- For Electric Motors MUST include: HP, Voltage, RPM, Phase, Frame Size
  Example: "Baldor M3211T 3HP 230/460V 1800RPM 3-Phase 182T TEFC Motor"
- For Servo Motors: Include kW/Watts, Voltage, RPM, Series
- For VFDs: Include HP/kW, Input/Output Voltage
- For Sensors: Include type, sensing range, voltage
- For PLCs: Include series, I/O count
- Make titles keyword-rich but under 80 characters

Return ONLY valid JSON (no markdown):
{
  "title": "SEO title with key specs (80 chars max)",
  "productCategory": "Category from list above",
  "shortDescription": "2-3 sentences, max 160 chars. REQUIRED - cannot be empty.",
  "description": "HTML with bullet points - see format below",
  "specifications": {
    "voltage": "value or null",
    "amperage": "value or null",
    "horsepower": "value or null",
    "kw_rating": "value or null",
    "rpm": "value or null",
    "frame_size": "value or null",
    "phase": "value or null",
    "frequency": "value or null",
    "enclosure": "value or null",
    "ip_rating": "value or null",
    "communication_protocol": "value or null",
    "input_voltage": "value or null",
    "output_voltage": "value or null",
    "sensing_range": "value or null",
    "bore_diameter": "value or null",
    "stroke_length": "value or null",
    "max_pressure": "value or null",
    "mounting_type": "value or null",
    "service_factor": "value or null",
    "nema_design": "value or null",
    "insulation_class": "value or null"
  },
  "rawSpecifications": ["Label: Value", "Label: Value"],
  "qualityFlag": "STRONG or NEEDS_REVIEW"
}

DESCRIPTION FORMAT (HTML with bullet points):
<p>[2-3 sentence professional introduction]</p>

<h3>Specifications</h3>
<ul>
<li><strong>Brand:</strong> ${brand}</li>
<li><strong>Model:</strong> ${partNumber}</li>
<li><strong>Type:</strong> [product type]</li>
[Add 10-15 more specifications]
</ul>

<p>We warranty all items for 30 days from date of purchase.</p>`
        }],
        tools: [{ type: 'web_search_20250305', name: 'web_search' }]
      })
    });

    console.log('API Response status:', response.status);
    
    const data = await response.json();
    const textBlocks = data.content?.filter(b => b.type === 'text') || [];
    const text = textBlocks.map(b => b.text).join('');
    
    console.log('=== EXTRACTED TEXT (first 800 chars) ===');
    console.log(text.substring(0, 800));
    
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    
    if (!jsonMatch) {
      console.error('No JSON found in response');
      const fallbackCategory = preDetectedCategory || 'Unknown';
      return res.status(200).json({
        content: [{
          type: 'text',
          text: JSON.stringify({
            title: `${brand} ${partNumber}`,
            productCategory: fallbackCategory,
            shortDescription: `${brand} ${partNumber} industrial component. Professional quality, tested and ready.`,
            description: `<p>${brand} ${partNumber} industrial component.</p><ul><li><strong>Brand:</strong> ${brand}</li><li><strong>Model:</strong> ${partNumber}</li></ul><p>We warranty all items for 30 days.</p>`,
            specifications: {},
            rawSpecifications: [],
            qualityFlag: 'NEEDS_REVIEW',
            ebayCategoryId: EBAY_MARKETPLACE_CATEGORIES[fallbackCategory],
            ebayStoreCategoryId: EBAY_STORE_CATEGORIES[fallbackCategory]?.primary || '23399313015',
            ebayStoreCategoryId2: '23399313015'
          })
        }]
      });
    }

    let product;
    try {
      product = JSON.parse(jsonMatch[0]);
    } catch (parseError) {
      console.error('JSON parse error:', parseError.message);
      const cleaned = jsonMatch[0]
        .replace(/[\x00-\x1F\x7F]/g, ' ')
        .replace(/,\s*}/g, '}')
        .replace(/,\s*]/g, ']');
      product = JSON.parse(cleaned);
    }

    console.log('=== PARSED PRODUCT ===');
    console.log('Title:', product.title);
    console.log('AI Category:', product.productCategory);
    console.log('Pre-detected Category:', preDetectedCategory);

    // If pre-detected category exists and AI chose something weird, override
    if (preDetectedCategory && product.productCategory !== preDetectedCategory) {
      // Check if AI's choice makes sense
      const aiCategory = product.productCategory?.toLowerCase() || '';
      const preCategory = preDetectedCategory.toLowerCase();
      
      // If AI picked a sensor category but we know it's a motor, override
      if (preCategory.includes('motor') && aiCategory.includes('sensor')) {
        console.log('OVERRIDE: AI picked sensor but this is a motor. Using:', preDetectedCategory);
        product.productCategory = preDetectedCategory;
      }
    }

    // Use pre-detected category if AI returned Unknown or empty
    if ((!product.productCategory || product.productCategory === 'Unknown') && preDetectedCategory) {
      product.productCategory = preDetectedCategory;
    }

    // Ensure shortDescription exists
    if (!product.shortDescription || product.shortDescription.trim() === '') {
      if (product.description) {
        const plainText = product.description.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
        product.shortDescription = plainText.substring(0, 157) + '...';
      } else {
        product.shortDescription = `${brand} ${partNumber} industrial automation component. Professional quality.`;
      }
    }

    if (product.shortDescription.length > 160) {
      product.shortDescription = product.shortDescription.substring(0, 157) + '...';
    }

    // === ADD CATEGORY IDs ===
    const categoryKey = product.productCategory || 'Unknown';
    
    product.ebayCategoryId = EBAY_MARKETPLACE_CATEGORIES[categoryKey] || EBAY_MARKETPLACE_CATEGORIES['Unknown'];
    
    const storeCategories = EBAY_STORE_CATEGORIES[categoryKey] || EBAY_STORE_CATEGORIES['Unknown'];
    product.ebayStoreCategoryId = storeCategories.primary;
    product.ebayStoreCategoryId2 = storeCategories.secondary || '23399313015'; // Always ALL PRODUCTS
    
    product.bigcommerceCategoryId = BIGCOMMERCE_CATEGORIES[categoryKey] || BIGCOMMERCE_CATEGORIES['Unknown'];
    
    console.log('=== FINAL CATEGORY MAPPING ===');
    console.log('Final category:', categoryKey);
    console.log('eBay Marketplace:', product.ebayCategoryId);
    console.log('eBay Store 1:', product.ebayStoreCategoryId);
    console.log('eBay Store 2:', product.ebayStoreCategoryId2);

    // Clean specs
    if (product.specifications && typeof product.specifications === 'object') {
      const cleanSpecs = {};
      for (const [key, value] of Object.entries(product.specifications)) {
        if (value && value !== 'null' && value !== null && value !== 'N/A' && value !== 'Unknown') {
          cleanSpecs[key] = value;
        }
      }
      product.specifications = cleanSpecs;
    }

    res.status(200).json({
      content: [{
        type: 'text',
        text: JSON.stringify(product)
      }]
    });

  } catch (error) {
    console.error('=== SEARCH PRODUCT ERROR ===');
    console.error('Error:', error.message);
    res.status(500).json({ error: error.message });
  }
}
