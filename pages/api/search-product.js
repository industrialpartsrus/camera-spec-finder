// pages/api/search-product.js
// Complete AI search with bullet point descriptions, categories, and structured specs

// eBay MARKETPLACE Category IDs (these are the main eBay categories, NOT store categories)
// These are used for ebaycatid field
const EBAY_MARKETPLACE_CATEGORIES = {
  'Electric Motors': '181732',      // Business & Industrial > Electrical Equipment > Industrial Electric Motors
  'Servo Motors': '181732',         // Same parent category
  'Servo Drives': '181737',         // Business & Industrial > Electrical Equipment > Drives & Starters
  'VFDs': '181737',                 // Drives & Starters
  'PLCs': '181739',                 // Industrial Automation & Control
  'HMIs': '181739',
  'Power Supplies': '181738',
  'I/O Modules': '181739',
  'Proximity Sensors': '181744',    // Sensors
  'Photoelectric Sensors': '181744',
  'Light Curtains': '181744',
  'Laser Sensors': '181744',
  'Pressure Sensors': '181744',
  'Temperature Sensors': '181744',
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

// eBay STORE Category IDs (YOUR store categories)
// These are used for ebaystoreid and ebaystoreid2 fields
const EBAY_STORE_CATEGORIES = {
  'Electric Motors': { primary: '17167471', secondary: '17167474' },      // ELECTRIC MOTORS under POWER TRANSMISSION
  'Servo Motors': { primary: '393389015', secondary: '17167474' },        // SERVO MOTORS under POWER TRANSMISSION
  'Servo Drives': { primary: '393390015', secondary: '6686262015' },      // SERVO DRIVES under MOTION CONTROL
  'VFDs': { primary: '2242358015', secondary: '6686272015' },             // AC DRIVE under SPEED CONTROLS
  'PLCs': { primary: '5404089015', secondary: '5384028015' },             // PLC under AUTOMATION CONTROL
  'HMIs': { primary: '6686264015', secondary: '5384028015' },             // HMI under AUTOMATION CONTROL
  'Power Supplies': { primary: '2242362015', secondary: '5384028015' },   // POWER SUPPLY
  'I/O Modules': { primary: '18373835', secondary: '5384028015' },        // I/O BOARDS
  'Proximity Sensors': { primary: '4173791015', secondary: '6686267015' },// PROXIMITY SENSORS under SENSING DEVICES
  'Photoelectric Sensors': { primary: '4173793015', secondary: '6686267015' },
  'Light Curtains': { primary: '393379015', secondary: '6686267015' },
  'Laser Sensors': { primary: '2479732015', secondary: '6686267015' },
  'Pressure Sensors': { primary: '6690386015', secondary: '6686267015' },
  'Temperature Sensors': { primary: '6690556015', secondary: '6686267015' },
  'Pneumatic Cylinders': { primary: '2461873015', secondary: '6689961015' },  // CYLINDERS under PNEUMATICS
  'Pneumatic Valves': { primary: '2461874015', secondary: '6689961015' },
  'Pneumatic Grippers': { primary: '6699359015', secondary: '6689961015' },
  'Hydraulic Pumps': { primary: '6696064015', secondary: '6689962015' },      // under HYDRAULICS
  'Hydraulic Valves': { primary: '6696060015', secondary: '6689962015' },
  'Hydraulic Cylinders': { primary: '6696061015', secondary: '6689962015' },
  'Circuit Breakers': { primary: '5634105015', secondary: '393385015' },      // under ELECTRICAL
  'Contactors': { primary: '2348910015', secondary: '6688149015' },           // MOTOR CONTROLS under INDUSTRIAL CONTROL
  'Safety Relays': { primary: '2464037015', secondary: '6688149015' },        // MACHINE SAFETY
  'Control Relays': { primary: '2242359015', secondary: '6688149015' },
  'Bearings': { primary: '6690505015', secondary: '' },
  'Linear Bearings': { primary: '4173713015', secondary: '6690505015' },
  'Encoders': { primary: '1802953015', secondary: '6686262015' },             // under MOTION CONTROL
  'Gearboxes': { primary: '17167474', secondary: '' },                        // POWER TRANSMISSION
  'Transformers': { primary: '5634104015', secondary: '393385015' },
  'Industrial Gateways': { primary: '5384028015', secondary: '6688149015' },
  'AS-Interface': { primary: '5384028015', secondary: '6688149015' },
  'Network Modules': { primary: '5384028015', secondary: '18373835' },
  'Unknown': { primary: '23399313015', secondary: '' }                        // MISCELLANEOUS
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

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { brand, partNumber } = req.body;

  console.log('=== SEARCH PRODUCT START ===');
  console.log('Searching for:', brand, partNumber);

  try {
    const categoryList = Object.keys(EBAY_MARKETPLACE_CATEGORIES).join(', ');

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

Return a JSON object with product information.

PRODUCT CATEGORY - Choose the BEST match from this list:
${categoryList}

TITLE REQUIREMENTS:
- Maximum 80 characters
- Format: "Brand Model - Key Specs"
- For Electric Motors: Include HP, Voltage, RPM, Phase, Frame if available
  Example: "Baldor M3211T - 3HP 230/460V 1800RPM 3-Phase 182T Frame Motor"
- For Servo Motors: Include kW/Wattage, Voltage, RPM
- For VFDs/Drives: Include HP/kW rating, Voltage
- For Sensors: Include sensing range, voltage
- For PLCs/HMIs: Include I/O count or screen size
- Make titles keyword-rich for SEO

Return ONLY valid JSON (no markdown, no code blocks):
{
  "title": "SEO-optimized title with key specs (80 chars max)",
  "productCategory": "One category from the list above",
  "shortDescription": "2-3 sentence meta description for SEO. Max 160 characters. MUST NOT BE EMPTY.",
  "description": "HTML formatted with bullet points - see format below",
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
    "mounting_type": "value or null"
  },
  "rawSpecifications": ["Spec Label: Value", "Another Spec: Value"],
  "qualityFlag": "STRONG or NEEDS_REVIEW"
}

DESCRIPTION FORMAT - Use this exact HTML structure:

<p>[2-3 sentence professional introduction about the product]</p>

<h3>Specifications</h3>
<ul>
<li><strong>Brand:</strong> ${brand}</li>
<li><strong>Model:</strong> ${partNumber}</li>
<li><strong>Type:</strong> [product type]</li>
[Add 10-15 more relevant specifications as bullet points]
</ul>

<p>We warranty all items for 30 days from date of purchase.</p>

REQUIREMENTS:
1. shortDescription MUST NOT be empty
2. description MUST use bullet points (<ul><li>)
3. Title should be keyword-rich with key specs
4. Only include specification fields with actual values`
        }],
        tools: [{ type: 'web_search_20250305', name: 'web_search' }]
      })
    });

    console.log('API Response status:', response.status);
    
    const data = await response.json();
    
    // Extract text from response
    const textBlocks = data.content?.filter(b => b.type === 'text') || [];
    const text = textBlocks.map(b => b.text).join('');
    
    console.log('=== EXTRACTED TEXT (first 1000 chars) ===');
    console.log(text.substring(0, 1000));
    
    // Parse JSON from response
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    
    if (!jsonMatch) {
      console.error('No JSON found in response');
      return res.status(200).json({
        content: [{
          type: 'text',
          text: JSON.stringify({
            title: `${brand} ${partNumber}`,
            productCategory: 'Unknown',
            shortDescription: `${brand} ${partNumber} industrial automation component.`,
            description: `<p>${brand} ${partNumber} industrial component.</p><ul><li><strong>Brand:</strong> ${brand}</li><li><strong>Model:</strong> ${partNumber}</li></ul>`,
            specifications: {},
            rawSpecifications: [],
            qualityFlag: 'NEEDS_REVIEW',
            ebayCategoryId: '181739',
            ebayStoreCategoryId: '23399313015',
            ebayStoreCategoryId2: ''
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
    console.log('Category:', product.productCategory);

    // Ensure shortDescription is never empty
    if (!product.shortDescription || product.shortDescription.trim() === '') {
      if (product.description) {
        const plainText = product.description.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
        product.shortDescription = plainText.substring(0, 157) + '...';
      } else {
        product.shortDescription = `${brand} ${partNumber} industrial automation component. Professional quality, tested and ready.`;
      }
    }

    // Truncate to 160 chars
    if (product.shortDescription.length > 160) {
      product.shortDescription = product.shortDescription.substring(0, 157) + '...';
    }

    // === ADD CATEGORY IDs ===
    const categoryKey = product.productCategory || 'Unknown';
    
    // eBay Marketplace Category (main eBay category for listing)
    product.ebayCategoryId = EBAY_MARKETPLACE_CATEGORIES[categoryKey] || EBAY_MARKETPLACE_CATEGORIES['Unknown'];
    
    // eBay Store Categories (YOUR store's organization)
    const storeCategories = EBAY_STORE_CATEGORIES[categoryKey] || EBAY_STORE_CATEGORIES['Unknown'];
    product.ebayStoreCategoryId = storeCategories.primary;
    product.ebayStoreCategoryId2 = storeCategories.secondary;
    
    // BigCommerce Category
    product.bigcommerceCategoryId = BIGCOMMERCE_CATEGORIES[categoryKey] || BIGCOMMERCE_CATEGORIES['Unknown'];
    
    console.log('=== CATEGORY MAPPING ===');
    console.log('Detected category:', categoryKey);
    console.log('eBay Marketplace Category ID:', product.ebayCategoryId);
    console.log('eBay Store Category 1:', product.ebayStoreCategoryId);
    console.log('eBay Store Category 2:', product.ebayStoreCategoryId2);
    console.log('BigCommerce Category:', product.bigcommerceCategoryId);

    // Clean up specifications
    if (product.specifications && typeof product.specifications === 'object') {
      const cleanSpecs = {};
      for (const [key, value] of Object.entries(product.specifications)) {
        if (value && value !== 'null' && value !== null && value !== 'N/A' && value !== 'Unknown') {
          cleanSpecs[key] = value;
        }
      }
      product.specifications = cleanSpecs;
    }

    console.log('=== FINAL PRODUCT ===');
    console.log(JSON.stringify(product).substring(0, 1500));

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
