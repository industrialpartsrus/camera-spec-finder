// pages/api/search-product.js
// FINAL VERSION - Complete AI search with correct category mappings

// eBay MARKETPLACE Category IDs (main eBay listing categories - NOT store categories)
const EBAY_MARKETPLACE_CATEGORIES = {
  'Electric Motors': '181732',      // Business & Industrial > Electric Motors
  'Servo Motors': '181732',
  'Servo Drives': '181737',         // Drives & Starters
  'VFDs': '181737',
  'PLCs': '181739',                 // Industrial Automation & Control
  'HMIs': '181739',
  'Power Supplies': '181738',       // Electrical Equipment & Supplies
  'I/O Modules': '181739',
  'Proximity Sensors': '181744',    // Sensors
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
  'Bearings': '181745',             // Bearings
  'Linear Bearings': '181745',
  'Encoders': '181737',
  'Gearboxes': '181732',
  'Transformers': '181738',
  'Industrial Gateways': '181739',
  'AS-Interface': '181739',
  'Network Modules': '181739',
  'Unknown': '181739'
};

// eBay STORE Category IDs (YOUR store's LEAF categories - subcategories only!)
// Primary = specific category, Secondary = ALL PRODUCTS (23399313015)
const EBAY_STORE_CATEGORIES = {
  'Electric Motors': { primary: '17167471', secondary: '23399313015' },      // ELECTRIC MOTORS (under POWER TRANSMISSION)
  'Servo Motors': { primary: '393389015', secondary: '23399313015' },        // SERVO MOTORS (under POWER TRANSMISSION)
  'Servo Drives': { primary: '393390015', secondary: '23399313015' },        // SERVO DRIVES (under MOTION CONTROL)
  'VFDs': { primary: '2242358015', secondary: '23399313015' },               // AC DRIVE (under SPEED CONTROLS)
  'PLCs': { primary: '5404089015', secondary: '23399313015' },               // PLC (under AUTOMATION CONTROL)
  'HMIs': { primary: '6686264015', secondary: '23399313015' },               // HMI (under AUTOMATION CONTROL)
  'Power Supplies': { primary: '2242362015', secondary: '23399313015' },     // POWER SUPPLY
  'I/O Modules': { primary: '18373835', secondary: '23399313015' },          // I/O BOARDS
  'Proximity Sensors': { primary: '4173791015', secondary: '23399313015' },  // PROXIMITY SENSORS (under SENSING DEVICES)
  'Photoelectric Sensors': { primary: '4173793015', secondary: '23399313015' },
  'Light Curtains': { primary: '393379015', secondary: '23399313015' },
  'Laser Sensors': { primary: '2479732015', secondary: '23399313015' },
  'Pressure Sensors': { primary: '6690386015', secondary: '23399313015' },
  'Temperature Sensors': { primary: '6690556015', secondary: '23399313015' },
  'Ultrasonic Sensors': { primary: '4173791015', secondary: '23399313015' }, // Use proximity if no ultrasonic
  'Pneumatic Cylinders': { primary: '2461873015', secondary: '23399313015' },
  'Pneumatic Valves': { primary: '2461874015', secondary: '23399313015' },
  'Pneumatic Grippers': { primary: '6699359015', secondary: '23399313015' },
  'Hydraulic Pumps': { primary: '6696064015', secondary: '23399313015' },
  'Hydraulic Valves': { primary: '6696060015', secondary: '23399313015' },
  'Hydraulic Cylinders': { primary: '6696061015', secondary: '23399313015' },
  'Circuit Breakers': { primary: '5634105015', secondary: '23399313015' },
  'Contactors': { primary: '2348910015', secondary: '23399313015' },         // MOTOR CONTROLS
  'Safety Relays': { primary: '2464037015', secondary: '23399313015' },      // MACHINE SAFETY
  'Control Relays': { primary: '2242359015', secondary: '23399313015' },
  'Bearings': { primary: '4173714015', secondary: '23399313015' },           // BALL (default bearing type)
  'Linear Bearings': { primary: '4173713015', secondary: '23399313015' },
  'Encoders': { primary: '1802953015', secondary: '23399313015' },
  'Gearboxes': { primary: '6690340015', secondary: '23399313015' },          // GEAR REDUCERS if exists, else POWER TRANSMISSION leaf
  'Transformers': { primary: '5634104015', secondary: '23399313015' },
  'Industrial Gateways': { primary: '18373835', secondary: '23399313015' },  // I/O BOARDS (closest match)
  'AS-Interface': { primary: '18373835', secondary: '23399313015' },
  'Network Modules': { primary: '18373835', secondary: '23399313015' },
  'Unknown': { primary: '23399313015', secondary: '' }                        // ALL PRODUCTS
};

// BigCommerce Category IDs (from your bigcommerce_categories.json)
// Using "Shop All" (23) as default + specific category
const BIGCOMMERCE_CATEGORIES = {
  'Electric Motors': '30',           // Power Transmission -> Electric Motors
  'Servo Motors': '54',              // Motion Control -> Servo Motors
  'Servo Drives': '32',              // Motion Control -> Servo Drives & Amplifiers
  'VFDs': '34',                      // Speed Controls -> AC Drive
  'PLCs': '24',                      // Automation Control -> PLC
  'HMIs': '27',                      // Automation Control -> HMI
  'Power Supplies': '28',            // Automation Control -> Power Supply
  'I/O Modules': '61',               // Automation Control -> I/O Boards & Replacement Parts
  'Proximity Sensors': '41',         // Sensing Devices -> Proximity Sensors
  'Photoelectric Sensors': '42',     // Sensing Devices -> Photoelectric Sensors
  'Light Curtains': '71',            // Sensing Devices -> Light Curtains
  'Laser Sensors': '41',             // Use proximity
  'Pressure Sensors': '116',         // Sensing Devices -> Pressure Sensors
  'Temperature Sensors': '65',       // Sensing Devices -> Temperature Sensors
  'Ultrasonic Sensors': '115',       // Sensing Devices -> Ultrasonic Sensors
  'Pneumatic Cylinders': '47',       // Pneumatics -> Cylinders
  'Pneumatic Valves': '68',          // Pneumatics -> Valves & Manifolds
  'Pneumatic Grippers': '117',       // Pneumatics -> Grippers
  'Hydraulic Pumps': '94',           // Hydraulics -> Pumps
  'Hydraulic Valves': '91',          // Hydraulics -> Control Valves
  'Hydraulic Cylinders': '107',      // Hydraulics -> Cylinders
  'Circuit Breakers': '44',          // Electrical -> Circuit Breakers
  'Contactors': '50',                // Industrial Controls -> Motor Starters
  'Safety Relays': '96',             // Industrial Controls -> Safety Relays
  'Control Relays': '51',            // Industrial Controls -> Control Relays
  'Bearings': '43',                  // Power Transmission -> Bearings
  'Linear Bearings': '70',           // Power Transmission -> Bearings -> Linear Bearings
  'Encoders': '81',                  // Motion Control -> Encoders
  'Gearboxes': '36',                 // Power Transmission -> Gear Reducer
  'Transformers': '37',              // Electrical -> Transformers
  'Industrial Gateways': '18',       // Automation Control
  'AS-Interface': '18',
  'Network Modules': '61',
  'Unknown': '23'                    // Shop All
};

// Pre-detect category from brand/part number patterns
function detectCategoryFromPartNumber(brand, partNumber) {
  const brandLower = (brand || '').toLowerCase();
  const partLower = (partNumber || '').toLowerCase();
  const combined = `${brandLower} ${partLower}`;
  
  // Electric Motors - Baldor patterns
  if (brandLower === 'baldor' || brandLower === 'baldor reliance' || brandLower === 'reliance') {
    if (/^[me]?\d{4}t?$/i.test(partNumber) || /motor/i.test(combined)) {
      return 'Electric Motors';
    }
    return 'Electric Motors'; // Baldor is primarily motors
  }
  
  // Other motor brands
  if (['weg', 'marathon', 'leeson', 'us motors', 'dayton', 'lincoln', 'teco', 'lafert'].includes(brandLower)) {
    return 'Electric Motors';
  }
  
  // Servo Motors - Mitsubishi, Yaskawa, Fanuc patterns
  if (/^hf-|^hc-|^hg-|^ha-/i.test(partNumber)) return 'Servo Motors';
  if (/^sgm|^msmd|^mhmd|^usm/i.test(partNumber)) return 'Servo Motors';
  if (/servo.*motor/i.test(combined)) return 'Servo Motors';
  
  // Servo Drives
  if (/^mr-j|^sgdv|^sgdm|^sgds|^cacr/i.test(partNumber)) return 'Servo Drives';
  if (/servo.*drive|servo.*amplifier/i.test(combined)) return 'Servo Drives';
  
  // VFDs
  if (/^powerflex|^altivar|^micromaster|^fr-[dea]|^vfd/i.test(combined)) return 'VFDs';
  if (/inverter|variable.*frequency/i.test(combined)) return 'VFDs';
  
  // PLCs
  if (/^1756-|^1769-|^1762-|^1766-|^1763-/i.test(partNumber)) return 'PLCs';
  if (/^q0[0-9]|^qx|^qy|^fx[0-9]|^cj[12]m|^cp1|^cpm/i.test(partNumber)) return 'PLCs';
  if (brandLower === 'allen bradley' && /logix|slc|plc/i.test(combined)) return 'PLCs';
  
  // Sensors by brand
  if (['keyence', 'banner', 'sick', 'turck', 'ifm', 'balluff', 'pepperl', 'omron'].includes(brandLower)) {
    if (/prox|inductive|capacitive|bi[0-9]|ni[0-9]/i.test(combined)) return 'Proximity Sensors';
    if (/photo|retroreflective|diffuse|thru-beam|qs18|q45/i.test(combined)) return 'Photoelectric Sensors';
    if (/laser|lv-|il-|bl-/i.test(combined)) return 'Laser Sensors';
    if (/pressure|ps-|pf-/i.test(combined)) return 'Pressure Sensors';
    if (/light.*curtain|safety.*light/i.test(combined)) return 'Light Curtains';
    return 'Proximity Sensors'; // Default for sensor brands
  }
  
  // Pneumatics by brand
  if (['smc', 'festo', 'ckd', 'numatics', 'norgren', 'parker pneumatic'].includes(brandLower)) {
    if (/cylinder|cdq|cq2|cm2|dsnu|advu|dng/i.test(combined)) return 'Pneumatic Cylinders';
    if (/valve|vq|sy[0-9]|mfh|vuvs|evz/i.test(combined)) return 'Pneumatic Valves';
    if (/gripper|mhz|hgp|mhl/i.test(combined)) return 'Pneumatic Grippers';
    return 'Pneumatic Valves'; // Default for pneumatic brands
  }
  
  // Industrial Gateways
  if (/gateway|asi-|as-interface|bwu/i.test(combined)) return 'Industrial Gateways';
  if (brandLower.includes('bihl') || brandLower.includes('wiedemann')) return 'Industrial Gateways';
  
  return null; // Let AI decide
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { brand, partNumber } = req.body;

  console.log('=== SEARCH PRODUCT START ===');
  console.log('Searching for:', brand, partNumber);

  // Pre-detect category
  const preDetectedCategory = detectCategoryFromPartNumber(brand, partNumber);
  console.log('Pre-detected category:', preDetectedCategory || 'None (AI will decide)');

  try {
    const categoryList = Object.keys(EBAY_MARKETPLACE_CATEGORIES).join(', ');

    let categoryHint = '';
    if (preDetectedCategory) {
      categoryHint = `\n\nIMPORTANT: Based on the brand "${brand}" and part number "${partNumber}", this is DEFINITELY a "${preDetectedCategory}". Use this category unless you find absolute proof otherwise. Do NOT choose sensor categories for motor brands.`;
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

PRODUCT CATEGORY - Choose from this list:
${categoryList}

TITLE REQUIREMENTS (80 characters max):
- For Electric Motors: "Brand Model HP Voltage RPM Phase Frame Enclosure Motor"
  Example: "Baldor M3211T 3HP 230/460V 1800RPM 3-Phase 182T TEFC Motor"
- For Servo Motors: "Brand Model kW Voltage RPM Servo Motor"
- For VFDs: "Brand Model HP/kW Voltage Drive"
- For Sensors: "Brand Model Type Range Voltage Sensor"
- For PLCs: "Brand Model Series I/O-Count PLC"

Return ONLY valid JSON:
{
  "title": "SEO title with specs (80 chars max)",
  "productCategory": "Category from list",
  "usertype": "Descriptive product type for Google/eBay (e.g., 'General Purpose Motor', '3-Phase Induction Motor', 'Variable Frequency Drive', 'Proximity Sensor')",
  "shortDescription": "2-3 sentences, max 160 chars. REQUIRED.",
  "description": "HTML with <ul><li> bullet points",
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
    "service_factor": "value or null"
  },
  "rawSpecifications": ["Label: Value", "Label: Value"],
  "qualityFlag": "STRONG or NEEDS_REVIEW"
}

USERTYPE EXAMPLES by category:
- Electric Motors: "General Purpose Motor", "3-Phase Induction Motor", "Single Phase Motor", "TEFC Motor", "Explosion Proof Motor", "Farm Duty Motor", "Washdown Motor"
- Servo Motors: "AC Servo Motor", "Brushless Servo Motor", "Integrated Servo Motor"
- VFDs: "Variable Frequency Drive", "AC Drive", "Adjustable Speed Drive", "Inverter Drive"
- PLCs: "Programmable Logic Controller", "Compact PLC", "Modular PLC", "Safety PLC"
- Sensors: "Inductive Proximity Sensor", "Capacitive Sensor", "Photoelectric Sensor", "Laser Distance Sensor"

DESCRIPTION FORMAT:
<p>[Professional 2-3 sentence introduction]</p>
<h3>Specifications</h3>
<ul>
<li><strong>Brand:</strong> ${brand}</li>
<li><strong>Model:</strong> ${partNumber}</li>
[Add 10+ more specs]
</ul>
<p>We warranty all items for 30 days from date of purchase.</p>`
        }],
        tools: [{ type: 'web_search_20250305', name: 'web_search' }]
      })
    });

    const data = await response.json();
    const textBlocks = data.content?.filter(b => b.type === 'text') || [];
    const text = textBlocks.map(b => b.text).join('');
    
    console.log('API response received, length:', text.length);
    
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    
    if (!jsonMatch) {
      console.error('No JSON found');
      const fallbackCategory = preDetectedCategory || 'Unknown';
      return res.status(200).json({
        content: [{
          type: 'text',
          text: JSON.stringify({
            title: `${brand} ${partNumber}`,
            productCategory: fallbackCategory,
            shortDescription: `${brand} ${partNumber} industrial component.`,
            description: `<p>${brand} ${partNumber}</p><ul><li><strong>Brand:</strong> ${brand}</li></ul>`,
            specifications: {},
            rawSpecifications: [],
            qualityFlag: 'NEEDS_REVIEW',
            ebayCategoryId: EBAY_MARKETPLACE_CATEGORIES[fallbackCategory] || '181739',
            ebayStoreCategoryId: EBAY_STORE_CATEGORIES[fallbackCategory]?.primary || '23399313015',
            ebayStoreCategoryId2: '23399313015',
            bigcommerceCategoryId: BIGCOMMERCE_CATEGORIES[fallbackCategory] || '23'
          })
        }]
      });
    }

    let product;
    try {
      product = JSON.parse(jsonMatch[0]);
    } catch (parseError) {
      const cleaned = jsonMatch[0].replace(/[\x00-\x1F\x7F]/g, ' ').replace(/,\s*}/g, '}').replace(/,\s*]/g, ']');
      product = JSON.parse(cleaned);
    }

    console.log('Parsed - Title:', product.title, '| AI Category:', product.productCategory);

    // OVERRIDE: If pre-detected and AI chose wrong category type
    if (preDetectedCategory) {
      const aiCat = (product.productCategory || '').toLowerCase();
      const preCat = preDetectedCategory.toLowerCase();
      
      // If we know it's a motor but AI picked sensors
      if (preCat.includes('motor') && (aiCat.includes('sensor') || aiCat.includes('ultrasonic'))) {
        console.log('OVERRIDE: Forcing', preDetectedCategory, 'instead of', product.productCategory);
        product.productCategory = preDetectedCategory;
      }
      
      // If we pre-detected anything and AI returned Unknown
      if (!product.productCategory || product.productCategory === 'Unknown') {
        product.productCategory = preDetectedCategory;
      }
    }

    // Ensure shortDescription
    if (!product.shortDescription || product.shortDescription.trim() === '') {
      const plainText = (product.description || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
      product.shortDescription = plainText.substring(0, 157) + '...';
    }
    if (product.shortDescription.length > 160) {
      product.shortDescription = product.shortDescription.substring(0, 157) + '...';
    }

    // ADD CATEGORY IDs
    const categoryKey = product.productCategory || 'Unknown';
    
    product.ebayCategoryId = EBAY_MARKETPLACE_CATEGORIES[categoryKey] || EBAY_MARKETPLACE_CATEGORIES['Unknown'];
    
    const storeCategories = EBAY_STORE_CATEGORIES[categoryKey] || EBAY_STORE_CATEGORIES['Unknown'];
    product.ebayStoreCategoryId = storeCategories.primary;
    product.ebayStoreCategoryId2 = storeCategories.secondary || '23399313015';
    
    product.bigcommerceCategoryId = BIGCOMMERCE_CATEGORIES[categoryKey] || BIGCOMMERCE_CATEGORIES['Unknown'];
    
    console.log('=== FINAL CATEGORIES ===');
    console.log('Category:', categoryKey);
    console.log('eBay Marketplace:', product.ebayCategoryId);
    console.log('eBay Store 1:', product.ebayStoreCategoryId);
    console.log('eBay Store 2:', product.ebayStoreCategoryId2);
    console.log('BigCommerce:', product.bigcommerceCategoryId);

    // Clean specs
    if (product.specifications) {
      const clean = {};
      for (const [k, v] of Object.entries(product.specifications)) {
        if (v && v !== 'null' && v !== null && v !== 'N/A' && v !== 'Unknown') {
          clean[k] = v;
        }
      }
      product.specifications = clean;
    }

    res.status(200).json({
      content: [{ type: 'text', text: JSON.stringify(product) }]
    });

  } catch (error) {
    console.error('Error:', error.message);
    res.status(500).json({ error: error.message });
  }
}
