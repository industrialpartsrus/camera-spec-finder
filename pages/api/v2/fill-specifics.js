// pages/api/v2/fill-specifics.js
// PASS 2B: AI fills in eBay item specifics based on researched data
// FIXED: Proper field name mapping from eBay display names to SureDone fields

import Anthropic from '@anthropic-ai/sdk';

// =============================================================================
// SUREDONE FIELD NAME MAPPING
// Maps eBay display names to the EXACT SureDone field names from Suredone_Headers.csv
// SureDone uses SHORT names in "Recommended" fields, NOT the ebayitemspecifics* prefix
// =============================================================================
const EBAY_TO_SUREDONE_FIELD_MAP = {
  // === MOTORS - Recommended Fields ===
  'Rated Load (HP)': 'ratedloadhp',
  'Motor Horsepower': 'horsepower',
  'Horsepower': 'horsepower',
  'Base RPM': 'baserpm',
  'RPM': 'rpm',
  'Rated RPM': 'rpm',
  'AC Phase': 'phase',
  'Phase': 'phase',
  'Current Phase': 'phase',
  'Nominal Rated Input Voltage': 'nominalratedinputvoltage',
  'Voltage': 'voltage',
  'Rated Voltage': 'voltage',
  'Enclosure Type': 'enclosuretype',
  'Enclosure': 'enclosuretype',
  'IEC Frame Size': 'frame',
  'NEMA Frame Size': 'frame',
  'Frame Size': 'frame',
  'Frame': 'frame',
  'Service Factor': 'servicefactor',
  'Insulation Class': 'insulationclass',
  'NEMA Design Letter': 'nemadesignletter',
  'AC Motor Type': 'motortype',
  'Motor Type': 'motortype',
  'NEMA Frame Suffix': 'nemaframesuffix',
  'Current Type': 'currenttype',
  'Mounting Type': 'mountingtype',
  'Mounting': 'mountingtype',
  'Country/Region of Manufacture': 'countryregionofmanufacture',
  'Country of Origin': 'countryoforigin',
  'Shaft Diameter': 'shaftdiameter',
  'Shaft Type': 'shafttype',
  'Full Load Amps': 'fullloadamps',
  'Amperage': 'amperage',
  'Amps': 'amperage',
  'Frequency': 'frequency',
  'Hz': 'hz',
  'AC Frequency Rating': 'frequency',
  'Weight': 'weight',
  'Special Motor Construction': 'specialmotorconstruction',
  'Shaft Orientation': 'shaftorientation',
  'Shaft Angle': 'shaftangle',
  
  // === VFDs/Drives ===
  'Input Voltage': 'inputvoltage',
  'Output Voltage': 'outputvoltage',
  'Input Amperage': 'inputamperage',
  'Output Amperage': 'outputamperage',
  'Output Hz': 'outputhz',
  'kW': 'kw',
  'Power Rating': 'powerrating',
  'Watts': 'watts',
  
  // === PLCs ===
  'Processor': 'processor',
  'Controller Platform': 'controllerplatform',
  'Communications': 'communications',
  
  // === Sensors ===
  'Sensing Range': 'sensingrange',
  'Operating Distance': 'operatingdistance',
  'Output Type': 'outputtype',
  'Sensor Type': 'sensortype',
  
  // === Pneumatics ===
  'Bore Diameter': 'borediameter',
  'Stroke Length': 'strokelength',
  'Port Size': 'portsize',
  'Max Pressure': 'maxpressure',
  'PSI': 'psi',
  
  // === Hydraulics ===
  'Flow Rate': 'flowrate',
  'GPM': 'gpm',
  
  // === Electrical ===
  'Coil Voltage': 'coilvoltage',
  'Contact Rating': 'contactrating',
  'Number of Poles': 'numberofpoles',
  'Voltage Rating': 'voltagerating',
  'Current Rating': 'currentrating',
  
  // === Common ===
  'Brand': 'brand',
  'MPN': 'mpn',
  'Model': 'model',
  'Series': 'series',
  'Manufacturer': 'manufacturer',
  'Features': 'features',
  'Application': 'application',
  'Material': 'material',
  'Construction': 'construction',
  'IP Rating': 'iprating',
  'Revision': 'revision',
  'Version': 'version'
};

// Fields to skip (they are handled separately or not needed)
const SKIP_FIELDS = [
  'California Prop 65 Warning',
  'Unit Type',
  'Unit Quantity',
  'Custom Bundle',
  'Bundle Description',
  'Type'
];

// Convert eBay display name to SureDone field name
function toSuredoneFieldName(ebayName) {
  // First check if we have an explicit mapping
  if (EBAY_TO_SUREDONE_FIELD_MAP[ebayName]) {
    return EBAY_TO_SUREDONE_FIELD_MAP[ebayName];
  }
  
  // Otherwise, convert to lowercase, remove special chars
  return ebayName.toLowerCase()
    .replace(/[^a-z0-9]/g, '')
    .replace(/\s+/g, '');
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { brand, partNumber, productType, itemSpecifics, knownSpecs } = req.body;

  if (!brand || !partNumber || !itemSpecifics) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  console.log('=== PASS 2B: FILL ITEM SPECIFICS ===');
  console.log('Brand:', brand);
  console.log('Part Number:', partNumber);
  console.log('Product Type:', productType);
  console.log('Item Specifics Count:', itemSpecifics?.length || 0);
  console.log('Known Specs:', JSON.stringify(knownSpecs, null, 2));

  try {
    const client = new Anthropic();

    // Filter out fields we don't need
    const relevantSpecs = itemSpecifics.filter(spec => !SKIP_FIELDS.includes(spec.name));

    // Build the prompt for AI to fill in values
    const specsList = relevantSpecs.map(spec => {
      let info = `- ${spec.name}`;
      if (spec.required) info += ' (REQUIRED)';
      if (spec.allowedValues?.length > 0) {
        const values = spec.allowedValues.slice(0, 20).join(', ');
        info += `: Choose from [${values}]`;
      }
      return info;
    }).join('\n');

    // Include known specs from research
    const knownSpecsText = Object.entries(knownSpecs || {})
      .filter(([k, v]) => v && v !== null)
      .map(([k, v]) => `${k}: ${v}`)
      .join('\n');

    const prompt = `You are filling in eBay item specifics for a ${productType}.

Product: ${brand} ${partNumber}

Known specifications from research:
${knownSpecsText || 'No specs provided'}

Fill in values for these eBay item specifics. Return ONLY valid JSON (no markdown):

{
${relevantSpecs.slice(0, 30).map(spec => {
  const fieldName = spec.fieldName || toSuredoneFieldName(spec.name);
  return `  "${spec.name}": "value or null"`;
}).join(',\n')}
}

RULES:
1. Use the EXACT value from allowed values if provided
2. If you don't know, use null
3. For Brand, use: ${brand}
4. For MPN, use: ${partNumber}
5. For Current Type on AC motors, use: AC
6. Convert specs to match allowed values (e.g., "3" → "3-Phase", "1800" → "1800")
7. For Rated Load (HP), match the HP value (e.g., "3 HP" → "3")
8. Do NOT guess values you don't know`;

    const response = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2000,
      messages: [{ role: 'user', content: prompt }]
    });

    const text = response.content?.[0]?.text || '';
    const jsonMatch = text.match(/\{[\s\S]*\}/);

    let filledValues = {};
    if (jsonMatch) {
      try {
        filledValues = JSON.parse(jsonMatch[0]);
      } catch (e) {
        console.error('Failed to parse AI response:', e);
      }
    }

    console.log('=== AI FILLED VALUES ===');
    console.log(JSON.stringify(filledValues, null, 2));

    // Build the response with both UI format and SureDone format
    const specificsForUI = [];
    const specificsForSuredone = {};
    let filledCount = 0;

    for (const spec of relevantSpecs) {
      const ebayName = spec.name;
      const suredoneFieldName = spec.fieldName || toSuredoneFieldName(ebayName);
      const value = filledValues[ebayName] || null;

      // Add to UI format
      specificsForUI.push({
        name: ebayName,
        fieldName: suredoneFieldName,
        required: spec.required || false,
        value: value,
        allowedValues: spec.allowedValues || [],
        mode: spec.mode
      });

      // Add to SureDone format (only if we have a value)
      if (value && value !== 'null' && value !== null) {
        specificsForSuredone[suredoneFieldName] = value;
        filledCount++;
        console.log(`  ${ebayName} → ${suredoneFieldName}: ${value}`);
      }
    }

    console.log('=== SUREDONE FIELD MAPPING ===');
    console.log('Total specs:', relevantSpecs.length);
    console.log('Filled specs:', filledCount);
    console.log('SureDone payload:', JSON.stringify(specificsForSuredone, null, 2));

    res.status(200).json({
      success: true,
      stage: 'specifics_complete',
      data: {
        specificsForUI: specificsForUI,
        specificsForSuredone: specificsForSuredone,
        filledCount: filledCount,
        totalCount: relevantSpecs.length
      },
      _meta: {
        productType: productType,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Fill specifics error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      stage: 'specifics_failed'
    });
  }
}
