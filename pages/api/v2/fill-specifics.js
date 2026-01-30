// pages/api/v2/fill-specifics.js
// PASS 2B: AI fills in values for the EXACT eBay item specifics
// Uses the real field names from eBay - no transformation needed

import Anthropic from '@anthropic-ai/sdk';

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
        fieldInfo += ` (MUST be one of: ${spec.allowedValues.slice(0, 15).join(', ')}${spec.allowedValues.length > 15 ? '...' : ''})`;
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
1. Use the EXACT field names as shown (case-sensitive)
2. For fields with allowed values, you MUST use one of the allowed values exactly
3. If you don't know a value with confidence, use null (not empty string, not "Unknown")
4. Include units where appropriate (e.g., "24V", "1.5kW", "4mm")
5. For "Brand" use: "${brand}"
6. For "MPN" use: "${partNumber}"
7. For "Type" field, use the specific product type like "${productType}"

Research the product and fill in as many fields as you can accurately determine.`;

    const response = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2048,
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
    console.log('Fields Filled:', filledCount, 'of', itemSpecifics.length);
    console.log('Confidence:', result.confidence);

    // Build the response with both the display format and SureDone format
    const specificsForUI = [];
    const specificsForSuredone = {};

    itemSpecifics.forEach(spec => {
      const value = filledSpecifics[spec.name];
      
      specificsForUI.push({
        name: spec.name,           // eBay display name
        fieldName: spec.fieldName, // SureDone field name
        value: value || '',
        required: spec.required,
        allowedValues: spec.allowedValues,
        mode: spec.mode
      });

      // Only add to SureDone payload if we have a value
      if (value && value !== null) {
        specificsForSuredone[spec.fieldName] = value;
      }
    });

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
