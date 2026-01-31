// pages/api/v2/fill-specifics.js
// PASS 2B: AI fills in values for the EXACT eBay item specifics
// Fixed: Better field name mapping and validation

import Anthropic from '@anthropic-ai/sdk';

// Convert eBay display name to SureDone field name
// "Service Factor" → "servicefactor"
// "Rated Load (HP)" → "ratedloadhp"
function toSuredoneFieldName(ebayName) {
  if (!ebayName) return '';
  return ebayName.toLowerCase().replace(/[^a-z0-9]/g, '');
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { 
    brand, 
    partNumber, 
    productType,
    itemSpecifics,  // Array of { name, fieldName, allowedValues, mode }
    knownSpecs      // Specs already gathered in Pass 1
  } = req.body;

  if (!brand || !partNumber || !itemSpecifics) {
    return res.status(400).json({ 
      error: 'brand, partNumber, and itemSpecifics are required' 
    });
  }

  console.log('=== PASS 2B: FILL ITEM SPECIFICS ===');
  console.log('Brand:', brand);
  console.log('Part Number:', partNumber);
  console.log('Product Type:', productType);
  console.log('Fields to Fill:', itemSpecifics.length);

  try {
    const client = new Anthropic();

    // Build a prompt that gives AI the EXACT field names to fill
    const fieldsList = itemSpecifics.map(spec => {
      let fieldInfo = `- "${spec.name}"`;
      if (spec.allowedValues && spec.allowedValues.length > 0) {
        // For SELECTION_ONLY fields, show allowed values
        const displayValues = spec.allowedValues.slice(0, 20);
        fieldInfo += ` (MUST be one of: ${displayValues.join(', ')}${spec.allowedValues.length > 20 ? '...' : ''})`;
      }
      if (spec.required) {
        fieldInfo += ' [REQUIRED]';
      }
      return fieldInfo;
    }).join('\n');

    // Include any specs we already know from Pass 1
    const knownSpecsText = knownSpecs && Object.keys(knownSpecs).length > 0
      ? `\nALREADY KNOWN SPECIFICATIONS:\n${Object.entries(knownSpecs).map(([k, v]) => `- ${k}: ${v}`).join('\n')}`
      : '';

    const prompt = `You are filling out eBay item specifics for: ${brand} ${partNumber} (${productType})

IMPORTANT: You must use the EXACT field names provided below. Do not rename or modify them.

FIELDS TO FILL:
${fieldsList}
${knownSpecsText}

Return ONLY valid JSON (no markdown, no code blocks) with this structure:
{
  "filledSpecifics": {
    "Field Name Exactly As Shown": "value",
    "Another Field Name": "value"
  },
  "confidence": "HIGH or MEDIUM or LOW"
}

RULES:
1. Use the EXACT field names as shown (case-sensitive, including spaces and special characters)
2. For fields with allowed values, you MUST use one of the allowed values exactly as written
3. If you don't know a value with confidence, use null (not empty string, not "Unknown")
4. Include units where appropriate (e.g., "24V", "1.5kW", "4mm")
5. For "Brand" use: "${brand}"
6. For "MPN" use: "${partNumber}"
7. For "Type" field, use the specific product type like "${productType}"
8. For "Model" use the part number: "${partNumber}"

MOTOR-SPECIFIC GUIDANCE (if applicable):
- "Rated Load (HP)" - just the number, e.g., "3" not "3 HP"
- "Base RPM" - just the number, e.g., "1800" not "1800 RPM"
- "Nominal Rated Input Voltage" - include unit, e.g., "230 V" or "230/460 V"
- "AC Phase" - use "Three Phase" or "Single Phase"
- "Current Type" - use "AC" or "DC"
- "Service Factor" - decimal number like "1.15"
- "NEMA Frame Suffix" - just the letter like "T" or "TC"
- "AC Motor Type" - common values: "Induction/Asynchronous", "Synchronous"
- "Enclosure Type" - common values: "TEFC", "ODP", "TENV", "TEBC"

Research the product ${brand} ${partNumber} and fill in as many fields as you can accurately determine.`;

    const response = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4096,
      messages: [{ role: 'user', content: prompt }]
    });

    // Extract JSON from response
    const text = response.content?.filter(b => b.type === 'text').map(b => b.text).join('') || '';
    const jsonMatch = text.match(/\{[\s\S]*\}/);

    if (!jsonMatch) {
      throw new Error('No valid JSON in AI response');
    }

    const result = JSON.parse(jsonMatch[0]);
    const filledSpecifics = result.filledSpecifics || {};

    // Count how many fields were filled
    const filledCount = Object.values(filledSpecifics).filter(v => v !== null && v !== '').length;
    console.log('AI filled:', filledCount, 'of', itemSpecifics.length, 'fields');
    console.log('Confidence:', result.confidence);

    // Build the response with both the display format and SureDone format
    const specificsForUI = [];
    const specificsForSuredone = {};

    // Log all field mappings for debugging
    console.log('=== FIELD MAPPINGS ===');

    itemSpecifics.forEach(spec => {
      // Get the value AI filled for this field (by eBay display name)
      const value = filledSpecifics[spec.name];
      
      // Use the fieldName from the API, or generate it if missing
      const suredoneField = spec.fieldName || toSuredoneFieldName(spec.name);
      
      // Log the mapping
      if (value && value !== null) {
        console.log(`  "${spec.name}" → "${suredoneField}": "${value}"`);
      }
      
      specificsForUI.push({
        name: spec.name,           // eBay display name (e.g., "Service Factor")
        fieldName: suredoneField,  // SureDone field name (e.g., "servicefactor")
        value: value || '',
        required: spec.required,
        allowedValues: spec.allowedValues,
        mode: spec.mode
      });

      // Only add to SureDone payload if we have a value
      if (value && value !== null && value !== '' && value !== 'null') {
        specificsForSuredone[suredoneField] = value;
      }
    });

    console.log('=== SUREDONE PAYLOAD ===');
    console.log(JSON.stringify(specificsForSuredone, null, 2));

    res.status(200).json({
      success: true,
      stage: 'specifics_complete',
      data: {
        specificsForUI: specificsForUI,           // For displaying in the UI
        specificsForSuredone: specificsForSuredone, // For sending to SureDone
        filledCount: filledCount,
        totalCount: itemSpecifics.length,
        confidence: result.confidence || 'MEDIUM'
      },
      _meta: {
        aiModel: 'claude-sonnet-4-20250514',
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Fill Specifics API error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      stage: 'specifics_failed'
    });
  }
}
