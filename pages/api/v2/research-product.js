// pages/api/v2/research-product.js
// PASS 1: AI researches product, generates title and description
// Uses proven description format from working old system

import Anthropic from '@anthropic-ai/sdk';

// Condition options with display labels and auto-generated notes
const CONDITION_CONFIG = {
  'new_in_box': {
    label: 'New in Box',
    suredoneValue: 'New',
    descriptionNote: 'This item is BRAND NEW and FACTORY SEALED in the original manufacturer packaging.',
    shortNote: 'New - Factory Sealed'
  },
  'new_open_box': {
    label: 'New Other (Open Box)',
    suredoneValue: 'New Other',
    descriptionNote: 'This item is NEW and has never been used or installed. The original packaging has been opened for inspection or photography, but all original contents are included.',
    shortNote: 'New - Open Box'
  },
  'new_no_packaging': {
    label: 'New not in Original Packaging',
    suredoneValue: 'New Other',
    descriptionNote: 'This item is NEW and has never been used or installed. It is not in the original manufacturer packaging, but all components are included.',
    shortNote: 'New - No Original Packaging'
  },
  'new_missing_hardware': {
    label: 'New - Missing Hardware',
    suredoneValue: 'New Other',
    descriptionNote: 'This item is NEW and has never been used or installed. Original mounting hardware or accessories may not be included - please see photos for exactly what is included.',
    shortNote: 'New - Missing Hardware'
  },
  'refurbished': {
    label: 'Manufacturer Refurbished',
    suredoneValue: 'Manufacturer Refurbished',
    descriptionNote: 'This item has been professionally refurbished by the manufacturer or an authorized service center. It has been tested and is fully functional.',
    shortNote: 'Manufacturer Refurbished'
  },
  'used_excellent': {
    label: 'Used - Excellent',
    suredoneValue: 'Used',
    descriptionNote: 'This item is USED and in EXCELLENT condition. It has been tested and is fully functional with minimal signs of wear.',
    shortNote: 'Used - Excellent Condition'
  },
  'used_good': {
    label: 'Used - Good',
    suredoneValue: 'Used',
    descriptionNote: 'This item is USED and in GOOD condition. It has been tested and is fully functional with normal signs of wear from use.',
    shortNote: 'Used - Good Condition'
  },
  'used_fair': {
    label: 'Used - Fair',
    suredoneValue: 'Used',
    descriptionNote: 'This item is USED and in FAIR condition. It has been tested and is functional, but shows visible signs of wear. Please see photos for actual condition.',
    shortNote: 'Used - Fair Condition'
  },
  'for_parts': {
    label: 'For Parts or Not Working',
    suredoneValue: 'For Parts or Not Working',
    descriptionNote: 'This item is being sold FOR PARTS OR NOT WORKING. It may be damaged, incomplete, or non-functional. Sold AS-IS with no warranty or returns.',
    shortNote: 'For Parts Only'
  }
};

// Product type detection patterns
const PRODUCT_TYPE_PATTERNS = [
  // Motors
  { patterns: ['servo motor', 'servomotor', 'ac servo', 'dc servo'], type: 'Servo Motor' },
  { patterns: ['stepper', 'step motor', 'stepping motor'], type: 'Stepper Motor' },
  { patterns: ['gearmotor', 'gear motor', 'gearhead'], type: 'Gearmotor' },
  { patterns: ['ac motor', 'induction motor', 'electric motor', '3-phase motor', 'three phase motor'], type: 'AC Motor' },
  { patterns: ['dc motor'], type: 'DC Motor' },
  
  // Drives
  { patterns: ['servo drive', 'servo amplifier', 'servopack'], type: 'Servo Drive' },
  { patterns: ['vfd', 'variable frequency', 'ac drive', 'inverter', 'frequency drive'], type: 'VFD' },
  { patterns: ['dc drive'], type: 'DC Drive' },
  { patterns: ['stepper drive', 'step driver'], type: 'Stepper Drive' },
  
  // PLCs
  { patterns: ['plc', 'programmable logic', 'micrologix', 'compactlogix', 'controllogix', 'slc 500', 's7-'], type: 'PLC' },
  { patterns: ['hmi', 'panelview', 'touch panel', 'operator interface', 'operator panel'], type: 'HMI' },
  { patterns: ['power supply', 'psu', '24v supply', '24vdc supply'], type: 'Power Supply' },
  { patterns: ['i/o module', 'input module', 'output module', 'io module'], type: 'I/O Module' },
  
  // Sensors
  { patterns: ['proximity sensor', 'prox sensor', 'inductive sensor'], type: 'Proximity Sensor' },
  { patterns: ['photoelectric', 'photo sensor', 'photoeye', 'through beam'], type: 'Photoelectric Sensor' },
  { patterns: ['light curtain', 'safety curtain'], type: 'Light Curtain' },
  { patterns: ['encoder', 'rotary encoder'], type: 'Encoder' },
  { patterns: ['pressure sensor', 'pressure transducer'], type: 'Pressure Sensor' },
  { patterns: ['temperature sensor', 'thermocouple', 'rtd'], type: 'Temperature Sensor' },
  
  // Pneumatics
  { patterns: ['pneumatic cylinder', 'air cylinder'], type: 'Pneumatic Cylinder' },
  { patterns: ['pneumatic valve', 'solenoid valve', 'directional valve'], type: 'Pneumatic Valve' },
  { patterns: ['gripper', 'pneumatic gripper'], type: 'Pneumatic Gripper' },
  
  // Hydraulics
  { patterns: ['hydraulic pump'], type: 'Hydraulic Pump' },
  { patterns: ['hydraulic valve'], type: 'Hydraulic Valve' },
  { patterns: ['hydraulic cylinder'], type: 'Hydraulic Cylinder' },
  
  // Electrical
  { patterns: ['circuit breaker', 'breaker'], type: 'Circuit Breaker' },
  { patterns: ['contactor'], type: 'Contactor' },
  { patterns: ['transformer'], type: 'Transformer' },
  { patterns: ['safety relay'], type: 'Safety Relay' },
  { patterns: ['relay', 'control relay'], type: 'Relay' },
  
  // Power Transmission
  { patterns: ['gearbox', 'gear reducer', 'speed reducer'], type: 'Gearbox' },
  { patterns: ['bearing', 'ball bearing', 'linear bearing'], type: 'Bearing' }
];

function detectProductType(brand, partNumber, aiResponse) {
  const searchText = `${brand} ${partNumber} ${aiResponse || ''}`.toLowerCase();
  
  for (const pattern of PRODUCT_TYPE_PATTERNS) {
    if (pattern.patterns.some(p => searchText.includes(p))) {
      return pattern.type;
    }
  }
  
  return 'Industrial Equipment';
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { brand, partNumber, condition = 'used_good' } = req.body;

  if (!brand || !partNumber) {
    return res.status(400).json({ error: 'Brand and part number are required' });
  }

  const conditionConfig = CONDITION_CONFIG[condition] || CONDITION_CONFIG['used_good'];

  console.log('=== PASS 1: RESEARCH PRODUCT ===');
  console.log('Brand:', brand);
  console.log('Part Number:', partNumber);
  console.log('Condition:', conditionConfig.label);

  try {
    const client = new Anthropic();

    // PROVEN PROMPT FORMAT - generates description with HTML table
    const prompt = `Search for comprehensive technical information about: ${brand} ${partNumber}

Create a professional product listing. Return ONLY valid JSON (no markdown, no code blocks):

{
  "title": "80 characters max - include brand, part number, and key specs",
  "productType": "One of: AC Motor, Servo Motor, Stepper Motor, VFD, PLC, HMI, Power Supply, Proximity Sensor, etc.",
  "shortDescription": "150-160 character meta description for SEO",
  "description": "Full HTML description - see format below",
  "specifications": {
    "horsepower": "value or null",
    "voltage": "value or null",
    "rpm": "value or null",
    "phase": "value or null",
    "frequency": "value or null",
    "frame_size": "value or null",
    "enclosure": "value or null",
    "service_factor": "value or null",
    "full_load_amps": "value or null",
    "shaft_diameter": "value or null",
    "mounting": "value or null",
    "weight": "value or null"
  },
  "manufacturer": "${brand}",
  "model": "${partNumber}",
  "series": "Product series name or null",
  "confidence": "HIGH or MEDIUM or LOW"
}

DESCRIPTION FORMAT (MUST be valid HTML with specs in table):
<p>Professional 2-3 sentence introduction about this ${brand} ${partNumber}. Explain what it is, its primary applications, and key features.</p>

<h3 style='margin-top: 20px; margin-bottom: 10px; font-weight: bold; color: #333;'>Technical Specifications</h3>
<table border='1' cellpadding='8' cellspacing='0' style='border-collapse: collapse; width: 100%; max-width: 600px; margin: 20px 0; border: 1px solid #ccc;'>
<thead>
<tr style='background-color: #f5f5f5;'>
<th style='text-align: left; padding: 10px; border: 1px solid #ccc; font-weight: bold;'>Specification</th>
<th style='text-align: left; padding: 10px; border: 1px solid #ccc; font-weight: bold;'>Value</th>
</tr>
</thead>
<tbody>
<tr><td style='padding: 8px; border: 1px solid #ddd;'>Brand</td><td style='padding: 8px; border: 1px solid #ddd;'>${brand}</td></tr>
<tr><td style='padding: 8px; border: 1px solid #ddd;'>Model/Part Number</td><td style='padding: 8px; border: 1px solid #ddd;'>${partNumber}</td></tr>
<!-- ADD 10-20 MORE ROWS WITH ALL TECHNICAL SPECS YOU CAN FIND -->
<!-- Include: Power, Voltage, Amperage, RPM, Phase, Frame, Enclosure, Service Factor, Weight, Dimensions, etc. -->
</tbody>
</table>

<p style='margin-top: 20px;'>We warranty all items for 30 days from date of purchase.</p>

CRITICAL REQUIREMENTS:
1. Title MUST be 80 characters or less
2. Description MUST include full HTML table with 10-20 specifications
3. Include ALL available technical specs in both the table AND the specifications object
4. productType MUST be a specific category like "AC Motor" or "VFD", not generic
5. If this is a Baldor motor with frame ending in T (like 182T), it's an AC Motor
6. Research thoroughly - Baldor M3211T is a 3HP 1800RPM 182T frame TEFC 3-phase motor`;

    const response = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4500,
      messages: [{ role: 'user', content: prompt }],
      tools: [{ type: 'web_search_20250305', name: 'web_search' }]
    });

    // Extract text from response
    const text = response.content?.filter(b => b.type === 'text').map(b => b.text).join('') || '';
    const jsonMatch = text.match(/\{[\s\S]*\}/);

    if (!jsonMatch) {
      throw new Error('No valid JSON in AI response');
    }

    const product = JSON.parse(jsonMatch[0]);
    
    // Detect product type if not provided or generic
    let productType = product.productType;
    if (!productType || productType === 'Industrial Equipment' || productType === 'Motor') {
      productType = detectProductType(brand, partNumber, text);
    }

    console.log('Product Type Detected:', productType);
    console.log('Title:', product.title);
    console.log('Confidence:', product.confidence);

    res.status(200).json({
      success: true,
      stage: 'research_complete',
      data: {
        title: product.title || `${brand} ${partNumber}`,
        productType: productType,
        shortDescription: product.shortDescription || '',
        description: product.description || '',
        specifications: product.specifications || {},
        manufacturer: product.manufacturer || brand,
        model: product.model || partNumber,
        series: product.series || null,
        confidence: product.confidence || 'MEDIUM',
        condition: conditionConfig
      },
      _meta: {
        brand: brand,
        partNumber: partNumber,
        aiModel: 'claude-sonnet-4-20250514',
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Research API error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      stage: 'research_failed'
    });
  }
}
