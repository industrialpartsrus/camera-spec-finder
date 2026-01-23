// pages/api/search-product.js
// Complete AI search with bullet point descriptions, categories, and structured specs

// eBay Category IDs for common industrial products
const EBAY_CATEGORIES = {
  'Electric Motors': { ebayCategoryId: '181732', ebayStoreCategoryId: '17167471', ebayStoreCategoryId2: '6690340015' },
  'Servo Motors': { ebayCategoryId: '181732', ebayStoreCategoryId: '393389015', ebayStoreCategoryId2: '6686262015' },
  'Servo Drives': { ebayCategoryId: '181737', ebayStoreCategoryId: '393390015', ebayStoreCategoryId2: '6686262015' },
  'VFDs': { ebayCategoryId: '181737', ebayStoreCategoryId: '2242358015', ebayStoreCategoryId2: '6686272015' },
  'PLCs': { ebayCategoryId: '181739', ebayStoreCategoryId: '5404089015', ebayStoreCategoryId2: '5384028015' },
  'HMIs': { ebayCategoryId: '181739', ebayStoreCategoryId: '6686264015', ebayStoreCategoryId2: '5384028015' },
  'Power Supplies': { ebayCategoryId: '181738', ebayStoreCategoryId: '2242362015', ebayStoreCategoryId2: '5384028015' },
  'I/O Modules': { ebayCategoryId: '181739', ebayStoreCategoryId: '18373835', ebayStoreCategoryId2: '5384028015' },
  'Proximity Sensors': { ebayCategoryId: '181744', ebayStoreCategoryId: '4173791015', ebayStoreCategoryId2: '6686267015' },
  'Photoelectric Sensors': { ebayCategoryId: '181744', ebayStoreCategoryId: '4173793015', ebayStoreCategoryId2: '6686267015' },
  'Light Curtains': { ebayCategoryId: '181744', ebayStoreCategoryId: '393379015', ebayStoreCategoryId2: '6686267015' },
  'Laser Sensors': { ebayCategoryId: '181744', ebayStoreCategoryId: '2479732015', ebayStoreCategoryId2: '6686267015' },
  'Pressure Sensors': { ebayCategoryId: '181744', ebayStoreCategoryId: '6690386015', ebayStoreCategoryId2: '6686267015' },
  'Temperature Sensors': { ebayCategoryId: '181744', ebayStoreCategoryId: '6690556015', ebayStoreCategoryId2: '6686267015' },
  'Pneumatic Cylinders': { ebayCategoryId: '181738', ebayStoreCategoryId: '2461873015', ebayStoreCategoryId2: '6689961015' },
  'Pneumatic Valves': { ebayCategoryId: '181738', ebayStoreCategoryId: '2461874015', ebayStoreCategoryId2: '6689961015' },
  'Pneumatic Grippers': { ebayCategoryId: '181738', ebayStoreCategoryId: '6699359015', ebayStoreCategoryId2: '6689961015' },
  'Hydraulic Pumps': { ebayCategoryId: '181738', ebayStoreCategoryId: '6696064015', ebayStoreCategoryId2: '6689962015' },
  'Hydraulic Valves': { ebayCategoryId: '181738', ebayStoreCategoryId: '6696060015', ebayStoreCategoryId2: '6689962015' },
  'Hydraulic Cylinders': { ebayCategoryId: '181738', ebayStoreCategoryId: '6696061015', ebayStoreCategoryId2: '6689962015' },
  'Circuit Breakers': { ebayCategoryId: '181738', ebayStoreCategoryId: '5634105015', ebayStoreCategoryId2: '393385015' },
  'Contactors': { ebayCategoryId: '181738', ebayStoreCategoryId: '2348910015', ebayStoreCategoryId2: '6688149015' },
  'Safety Relays': { ebayCategoryId: '181739', ebayStoreCategoryId: '2464037015', ebayStoreCategoryId2: '6688149015' },
  'Control Relays': { ebayCategoryId: '181738', ebayStoreCategoryId: '2242359015', ebayStoreCategoryId2: '6688149015' },
  'Bearings': { ebayCategoryId: '181745', ebayStoreCategoryId: '6690505015', ebayStoreCategoryId2: '' },
  'Linear Bearings': { ebayCategoryId: '181745', ebayStoreCategoryId: '4173713015', ebayStoreCategoryId2: '6690505015' },
  'Encoders': { ebayCategoryId: '181737', ebayStoreCategoryId: '1802953015', ebayStoreCategoryId2: '6686262015' },
  'Gearboxes': { ebayCategoryId: '181732', ebayStoreCategoryId: '17167471', ebayStoreCategoryId2: '' },
  'Transformers': { ebayCategoryId: '181738', ebayStoreCategoryId: '5634104015', ebayStoreCategoryId2: '393385015' },
  'Industrial Gateways': { ebayCategoryId: '181739', ebayStoreCategoryId: '5384028015', ebayStoreCategoryId2: '6688149015' },
  'AS-Interface': { ebayCategoryId: '181739', ebayStoreCategoryId: '5384028015', ebayStoreCategoryId2: '6688149015' },
  'Network Modules': { ebayCategoryId: '181739', ebayStoreCategoryId: '5384028015', ebayStoreCategoryId2: '18373835' },
  'Unknown': { ebayCategoryId: '181739', ebayStoreCategoryId: '23399313015', ebayStoreCategoryId2: '' }
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { brand, partNumber } = req.body;

  console.log('=== SEARCH PRODUCT START ===');
  console.log('Searching for:', brand, partNumber);

  try {
    const categoryList = Object.keys(EBAY_CATEGORIES).join(', ');

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

Return a JSON object with product information. You MUST include ALL of these fields.

PRODUCT CATEGORY - Choose the BEST match from this list:
${categoryList}

Return ONLY valid JSON (no markdown, no code blocks, no explanation):
{
  "title": "BRAND MODEL - Brief description (80 chars max)",
  "productCategory": "One category from the list above",
  "shortDescription": "2-3 sentence meta description for SEO. Max 160 characters. Must not be empty.",
  "description": "HTML formatted - see format below. Must include bullet points.",
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

DESCRIPTION FORMAT - You MUST use this exact HTML structure with bullet points:

<p>[2-3 sentence professional introduction about the product, what it does, and its key applications. Be specific and technical.]</p>

<h3>Specifications</h3>
<ul>
<li><strong>Brand:</strong> ${brand}</li>
<li><strong>Model:</strong> ${partNumber}</li>
<li><strong>Type:</strong> [product type]</li>
<li><strong>Voltage:</strong> [value]</li>
<li><strong>Communication:</strong> [protocols if applicable]</li>
<li><strong>Protection Rating:</strong> [IP rating if known]</li>
<li><strong>Mounting:</strong> [mounting type]</li>
[Add 8-15 more relevant specifications as bullet points]
</ul>

<p>We warranty all items for 30 days from date of purchase.</p>

CRITICAL REQUIREMENTS:
1. shortDescription MUST NOT be empty - create a 2-3 sentence SEO description
2. description MUST use <ul><li> bullet point format, NOT a table
3. rawSpecifications should be an array of 8-15 "Label: Value" strings
4. Only include specification fields that have actual values - omit null/unknown fields
5. productCategory MUST match one from the provided list exactly`
        }],
        tools: [{ type: 'web_search_20250305', name: 'web_search' }]
      })
    });

    console.log('API Response status:', response.status);
    
    const data = await response.json();
    
    // Extract text from response
    const textBlocks = data.content?.filter(b => b.type === 'text') || [];
    const text = textBlocks.map(b => b.text).join('');
    
    console.log('=== EXTRACTED TEXT ===');
    console.log('Text length:', text.length);
    console.log('Text preview:', text.substring(0, 1500));
    
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
            shortDescription: `${brand} ${partNumber} industrial automation component. Professional quality, tested and ready for use.`,
            description: `<p>${brand} ${partNumber} is an industrial automation component.</p><h3>Specifications</h3><ul><li><strong>Brand:</strong> ${brand}</li><li><strong>Model:</strong> ${partNumber}</li></ul><p>We warranty all items for 30 days from date of purchase.</p>`,
            specifications: {},
            rawSpecifications: [`Brand: ${brand}`, `Model: ${partNumber}`],
            qualityFlag: 'NEEDS_REVIEW'
          })
        }]
      });
    }

    let product;
    try {
      product = JSON.parse(jsonMatch[0]);
    } catch (parseError) {
      console.error('JSON parse error:', parseError.message);
      // Try to clean and parse
      const cleaned = jsonMatch[0]
        .replace(/[\x00-\x1F\x7F]/g, ' ')
        .replace(/,\s*}/g, '}')
        .replace(/,\s*]/g, ']');
      product = JSON.parse(cleaned);
    }

    console.log('=== PARSED PRODUCT ===');
    console.log('Title:', product.title);
    console.log('Category:', product.productCategory);
    console.log('Short Description:', product.shortDescription);
    console.log('Description length:', product.description?.length || 0);
    console.log('Has bullet points:', product.description?.includes('<li>'));

    // Ensure shortDescription is never empty
    if (!product.shortDescription || product.shortDescription.trim() === '') {
      // Extract from description or create default
      if (product.description) {
        const plainText = product.description.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
        product.shortDescription = plainText.substring(0, 157) + '...';
      } else {
        product.shortDescription = `${brand} ${partNumber} industrial automation component. Professional quality, tested and ready for use.`;
      }
    }

    // Ensure shortDescription is max 160 chars
    if (product.shortDescription.length > 160) {
      product.shortDescription = product.shortDescription.substring(0, 157) + '...';
    }

    // Add category IDs
    const categoryKey = product.productCategory || 'Unknown';
    const categoryConfig = EBAY_CATEGORIES[categoryKey] || EBAY_CATEGORIES['Unknown'];
    
    product.ebayCategoryId = categoryConfig.ebayCategoryId;
    product.ebayStoreCategoryId = categoryConfig.ebayStoreCategoryId;
    product.ebayStoreCategoryId2 = categoryConfig.ebayStoreCategoryId2;
    
    console.log('=== CATEGORY MAPPING ===');
    console.log('Detected category:', categoryKey);
    console.log('eBay Category ID:', product.ebayCategoryId);
    console.log('Store Category 1:', product.ebayStoreCategoryId);
    console.log('Store Category 2:', product.ebayStoreCategoryId2);

    // Clean up specifications - remove null values
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
    console.log(JSON.stringify(product).substring(0, 2000));

    // Return in expected format
    res.status(200).json({
      content: [{
        type: 'text',
        text: JSON.stringify(product)
      }]
    });

  } catch (error) {
    console.error('=== SEARCH PRODUCT ERROR ===');
    console.error('Error:', error.message);
    console.error('Stack:', error.stack);
    res.status(500).json({ error: error.message });
  }
}
