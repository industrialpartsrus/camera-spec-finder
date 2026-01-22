// pages/api/search-product.js
// Updated to return structured, normalized specification data

import { MASTER_FIELDS, CATEGORY_CONFIG, normalizeValue } from '../../data/master-fields';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { brand, partNumber } = req.body;

  try {
    // Build list of all master field names for the AI prompt
    const masterFieldList = Object.keys(MASTER_FIELDS).join(', ');
    
    // Build category list
    const categoryList = Object.keys(CATEGORY_CONFIG).join(', ');

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

Return ONLY valid JSON in this exact format:
{
  "title": "80 characters max, format: BRAND MODEL - Brief Description",
  "productCategory": "One category from the list above",
  "shortDescription": "2-3 sentences for meta description, max 160 chars",
  "description": "3-4 paragraphs with technical details, features, and applications. Use HTML formatting.",
  "specifications": {
    "voltage": "normalized value or null",
    "amperage": "normalized value or null",
    "horsepower": "normalized value or null",
    "rpm": "normalized value or null",
    "frame_size": "normalized value or null",
    "nema_frame_suffix": "normalized value or null",
    "nema_design": "normalized value or null",
    "service_factor": "normalized value or null",
    "phase": "normalized value or null",
    "frequency": "normalized value or null",
    "enclosure": "normalized value or null",
    "insulation_class": "normalized value or null",
    "motor_type": "normalized value or null",
    "sensing_range": "normalized value or null",
    "output_type": "normalized value or null",
    "bore_diameter": "normalized value or null",
    "stroke_length": "normalized value or null",
    "port_size": "normalized value or null",
    "max_pressure": "normalized value or null",
    "coil_voltage": "normalized value or null",
    "contact_rating": "normalized value or null",
    "number_of_poles": "normalized value or null",
    "communication_protocol": "normalized value or null",
    "input_voltage": "normalized value or null",
    "output_voltage": "normalized value or null",
    "kw_rating": "normalized value or null",
    "ip_rating": "normalized value or null",
    "mounting_type": "normalized value or null",
    "weight": "normalized value or null"
  },
  "rawSpecifications": ["Original spec 1 as found", "Original spec 2 as found"],
  "qualityFlag": "STRONG if found good data, NEEDS_REVIEW if uncertain"
}

Only include specification fields that have actual values - omit null fields.
Do NOT include any markdown formatting, code blocks, or text outside the JSON.`
        }],
        tools: [{ type: 'web_search_20250305', name: 'web_search' }]
      })
    });

    const data = await response.json();
    
    // Extract text from response
    const text = data.content?.filter(b => b.type === 'text').map(b => b.text).join('') || '';
    
    // Parse JSON from response
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.error('No JSON found in response:', text.substring(0, 500));
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

    let product;
    try {
      product = JSON.parse(jsonMatch[0]);
    } catch (parseError) {
      console.error('JSON parse error:', parseError.message);
      // Try to clean up the JSON
      const cleaned = jsonMatch[0]
        .replace(/[\x00-\x1F\x7F]/g, ' ')
        .replace(/,\s*}/g, '}')
        .replace(/,\s*]/g, ']');
      product = JSON.parse(cleaned);
    }

    // Apply our normalization rules to ensure consistency
    if (product.specifications) {
      const normalizedSpecs = {};
      for (const [key, value] of Object.entries(product.specifications)) {
        if (value && value !== 'null' && value !== null) {
          normalizedSpecs[key] = normalizeValue(key, value);
        }
      }
      product.specifications = normalizedSpecs;
    }

    // Add category config info
    const categoryConfig = CATEGORY_CONFIG[product.productCategory];
    if (categoryConfig) {
      product.ebayCategoryId = categoryConfig.ebayCategoryId;
      product.ebayStoreCategoryId = categoryConfig.ebayStoreCategoryId;
      product.bigcommerceCategoryId = categoryConfig.bigcommerceCategoryId;
    }

    // Return in the expected format
    res.status(200).json({
      content: [{
        type: 'text',
        text: JSON.stringify(product)
      }]
    });

  } catch (error) {
    console.error('Search product error:', error);
    res.status(500).json({ error: error.message });
  }
}
