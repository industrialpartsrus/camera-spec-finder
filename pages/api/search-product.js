// pages/api/search-product.js
// Updated to return structured, normalized specification data

import { MASTER_FIELDS, CATEGORY_CONFIG, normalizeValue } from '../../data/master-fields';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { brand, partNumber } = req.body;

  console.log('=== SEARCH PRODUCT START ===');
  console.log('Searching for:', brand, partNumber);

  try {
    // Build list of all master field names for the AI prompt
    const masterFieldList = Object.keys(MASTER_FIELDS).join(', ');
    
    // Build category list
    const categoryList = Object.keys(CATEGORY_CONFIG).join(', ');

    console.log('Calling Anthropic API...');

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

IMPORTANT: Return a JSON response with structured specification data.

First, determine the PRODUCT CATEGORY from this list:
${categoryList}

Then extract specifications into the appropriate MASTER FIELDS:
${masterFieldList}

NORMALIZATION RULES (follow exactly):
- voltage: Always format as "XXX VAC" or "XXX VDC" (e.g., "24 VDC", "480 VAC", "208/230/460 VAC")
- amperage: Always format as "X.X A" (e.g., "15 A", "2.5 A")
- horsepower: Always format as "X HP" (e.g., "3 HP", "0.5 HP", "7.5 HP")
- rpm: Just the number (e.g., "1800", "3600")
- frame_size: NEMA frame (e.g., "182T", "256T", "364T")
- phase: Either "Single-Phase" or "3-Phase"
- frequency: Format as "XX Hz" (e.g., "60 Hz")
- enclosure: Use standard abbreviations (ODP, TEFC, TENV, TEAO, Explosion Proof)
- service_factor: Decimal number (e.g., "1.15", "1.0")
- nema_design: Single letter (e.g., "B", "C")
- insulation_class: Format as "Class X" (e.g., "Class F", "Class H")
- bore_diameter/stroke_length: Include unit (e.g., "2 in", "50 mm")
- port_size: Format as "X/X NPT" (e.g., "1/4 NPT", "1/2 NPT")
- pressure values: Format as "XXX PSI"
- coil_voltage: Format as "XX VAC" or "XX VDC"
- sensing_range: Include unit (e.g., "10 mm", "2 m")
- output_type: Use "NPN", "PNP", "NPN/PNP", "Analog", or "Relay"

Return ONLY valid JSON in this exact format (no markdown, no code blocks, just the JSON):
{
  "title": "80 characters max, format: BRAND MODEL - Brief Description",
  "productCategory": "One category from the list above",
  "shortDescription": "2-3 sentences for meta description, max 160 chars",
  "description": "<p>Paragraph 1 with product overview.</p><p>Paragraph 2 with technical details.</p><p>Paragraph 3 with applications.</p>",
  "specifications": {
    "voltage": "value or null",
    "amperage": "value or null",
    "horsepower": "value or null",
    "rpm": "value or null",
    "frame_size": "value or null",
    "nema_frame_suffix": "value or null",
    "nema_design": "value or null",
    "service_factor": "value or null",
    "phase": "value or null",
    "frequency": "value or null",
    "enclosure": "value or null",
    "insulation_class": "value or null",
    "motor_type": "value or null",
    "mounting_type": "value or null",
    "weight": "value or null"
  },
  "rawSpecifications": ["Spec 1", "Spec 2", "Spec 3"],
  "qualityFlag": "STRONG or NEEDS_REVIEW"
}

Only include specification fields that have actual values found - omit any null fields from the specifications object.`
        }],
        tools: [{ type: 'web_search_20250305', name: 'web_search' }]
      })
    });

    console.log('API Response status:', response.status);
    
    const data = await response.json();
    
    console.log('=== RAW API RESPONSE ===');
    console.log(JSON.stringify(data).substring(0, 3000));
    
    // Extract text from response
    const text = data.content?.filter(b => b.type === 'text').map(b => b.text).join('') || '';
    
    console.log('=== EXTRACTED TEXT ===');
    console.log('Text length:', text.length);
    console.log('Text preview:', text.substring(0, 2000));
    
    // Parse JSON from response
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    
    if (!jsonMatch) {
      console.error('No JSON found in response');
      console.error('Full text was:', text);
      
      // Return a basic response so the app doesn't break
      return res.status(200).json({
        content: [{
          type: 'text',
          text: JSON.stringify({
            title: `${brand} ${partNumber}`,
            productCategory: 'Unknown',
            shortDescription: '',
            description: '',
            specifications: {},
            rawSpecifications: [],
            qualityFlag: 'NEEDS_REVIEW'
          })
        }]
      });
    }

    console.log('=== JSON MATCH FOUND ===');
    console.log('Match preview:', jsonMatch[0].substring(0, 1500));

    let product;
    try {
      product = JSON.parse(jsonMatch[0]);
      console.log('=== PARSED PRODUCT ===');
      console.log('Title:', product.title);
      console.log('Category:', product.productCategory);
      console.log('Specifications:', JSON.stringify(product.specifications));
      console.log('Description length:', product.description?.length || 0);
    } catch (parseError) {
      console.error('JSON parse error:', parseError.message);
      console.error('Attempted to parse:', jsonMatch[0].substring(0, 500));
      
      // Try to clean up the JSON
      const cleaned = jsonMatch[0]
        .replace(/[\x00-\x1F\x7F]/g, ' ')
        .replace(/,\s*}/g, '}')
        .replace(/,\s*]/g, ']');
      product = JSON.parse(cleaned);
    }

    // Apply our normalization rules to ensure consistency
    if (product.specifications && typeof product.specifications === 'object') {
      const normalizedSpecs = {};
      for (const [key, value] of Object.entries(product.specifications)) {
        if (value && value !== 'null' && value !== null && value !== 'N/A' && value !== 'n/a') {
          normalizedSpecs[key] = normalizeValue(key, value);
        }
      }
      product.specifications = normalizedSpecs;
      console.log('=== NORMALIZED SPECS ===');
      console.log(JSON.stringify(normalizedSpecs));
    }

    // Add category config info
    const categoryConfig = CATEGORY_CONFIG[product.productCategory];
    if (categoryConfig) {
      product.ebayCategoryId = categoryConfig.ebayCategoryId;
      product.ebayStoreCategoryId = categoryConfig.ebayStoreCategoryId;
      product.bigcommerceCategoryId = categoryConfig.bigcommerceCategoryId;
      console.log('Category config found:', product.productCategory);
    } else {
      console.log('No category config for:', product.productCategory);
    }

    console.log('=== FINAL PRODUCT ===');
    console.log(JSON.stringify(product).substring(0, 2000));

    // Return in the expected format
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