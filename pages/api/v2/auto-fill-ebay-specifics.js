// pages/api/v2/auto-fill-ebay-specifics.js
// =============================================================================
// PASS 2: AUTO-FILL EBAY ITEM SPECIFICS
// =============================================================================
// Called automatically after Pass 1 completes.
// Takes the eBay aspects (from Taxonomy API) + Pass 1 specs → AI fills all fields.
// Returns both UI format (for display/editing) and SureDone-ready format.
//
// CRITICAL FIX (2026-02-07): When AI uses web_search, the response has multiple
// content blocks. The JSON answer is in the LAST text block, not the first.
// Previous code: response.content?.[0]?.text  ← WRONG (gets "Let me search...")
// Fixed code: finds last text block in response.content array
// =============================================================================

import Anthropic from '@anthropic-ai/sdk';
import { resolveFieldName } from '../../../lib/field-name-resolver.js';

// ============================================================================
// RETRY LOGIC FOR CLAUDE API (handles 529 overload errors)
// ============================================================================

async function callClaudeWithRetry(client, params, maxRetries = 3) {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const response = await client.messages.create(params);
      return response;
    } catch (error) {
      const isOverloaded = error.status === 529 ||
        error.status === 503 ||
        error.status === 429;

      if (isOverloaded && attempt < maxRetries - 1) {
        // Exponential backoff: 2s, 4s, 8s
        const waitTime = Math.pow(2, attempt + 1) * 1000;
        console.warn(
          `Claude API overloaded (attempt ${attempt + 1}/${maxRetries}), ` +
          `retrying in ${waitTime/1000}s...`
        );
        await new Promise(r => setTimeout(r, waitTime));
        continue;
      }
      throw error;
    }
  }
}

// Fields that are handled separately — skip them in AI filling
const SKIP_FIELDS = new Set([
  'Brand', 'MPN', 'Manufacturer Part Number',
  'California Prop 65 Warning', 'Unit Type', 'Unit Quantity',
  'Custom Bundle', 'Bundle Description',
  'Item Height', 'Item Width', 'Item Length', 'Item Weight', 'Item Depth'
]);

// Fields the AI should aggressively fill with standard industry values
const AGGRESSIVE_FILL_HINTS = {
  // Motor fields
  'Current Type': 'Determine from product type: AC motors/VFDs = "AC", DC motors = "DC", servo motors check specs',
  'Mounting Type': 'Common values: Foot Mount, Flange Mount, C-Face, DIN Rail, Panel Mount, Wall Mount',
  'Country/Region of Manufacture': 'Use known specs or infer from brand origin. Common: USA, Japan, Germany, China, Mexico, Switzerland',
  'Shaft Orientation': 'Usually "Horizontal" for standard motors unless specs say otherwise',
  'Power Source': 'Electric, Hydraulic, Pneumatic, Battery, or Manual based on product type',
  'Number of Phases': 'Derive from phase spec: single phase = "1", three phase = "3"',
  // Bearing fields
  'Bearings Type': 'Match exactly: Cam Follower, Needle Bearing, Ball Bearing, Roller Bearing, Thrust Bearing, Pillow Block etc.',
  'Stud Type': 'Infer from model series: CFH/CF = Heavy Stud, CYR = Yoke, CR = Standard Stud. Values: Standard, Heavy, Yoke',
  'Face Design': 'Infer from model suffix: S = Screwdriver Slot, B = Hex Socket, no suffix = No Drive. Values: Screwdriver Slot, Hex Socket, No Drive',
  'Roller Shape': 'Common values: Crowned, Cylindrical, Flat. Yoke rollers often Crowned, stud types often Cylindrical',
  'Seal Type': 'Common values: Sealed, Open, Shielded. Infer from model suffix or standard for series',
  'Material': 'Most industrial bearings: 52100 Bearing Steel, Chrome Steel, Stainless Steel. Infer from standard for series',
  'Stud Diameter': 'Look up from model series specifications or catalog data',
  'Stud Length': 'Look up from model series specifications or catalog data',
  'Roller Diameter': 'Same as Outside Diameter for cam followers. Look up from model specs',
  'Roller Width': 'Same as Overall Width for cam followers. Look up from model specs',
  // Sensor fields
  'Sensing Method': 'Inductive, Capacitive, Photoelectric, Through-Beam, Retro-Reflective, Diffuse based on sensor type',
  'Output Type': 'NPN, PNP, Analog, Relay — check datasheet or infer from brand standards',
  // Pneumatic/Hydraulic fields
  'Thread Size': 'Look up from model specs — common: 1/4" NPT, 3/8" NPT, M5, G1/4',
  'Operating Pressure': 'Look up max PSI from model specs',
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { brand, partNumber, productType, ebayAspects, pass1Specs, title } = req.body;

  if (!brand || !partNumber) {
    return res.status(400).json({ error: 'Missing brand or partNumber' });
  }

  console.log('\n=== PASS 2: AUTO-FILL EBAY ITEM SPECIFICS ===');
  console.log('Brand:', brand);
  console.log('Part Number:', partNumber);
  console.log('Product Type:', productType);
  console.log('Pass 1 Specs:', Object.keys(pass1Specs || {}).length, 'fields');

  // If no eBay aspects available, return empty
  if (!ebayAspects || !ebayAspects.all || ebayAspects.all.length === 0) {
    console.log('No eBay aspects available — skipping Pass 2');
    return res.status(200).json({
      success: true,
      skipped: true,
      reason: 'No eBay aspects available',
      data: { specificsForUI: [], specificsForSuredone: {}, filledCount: 0, totalCount: 0 }
    });
  }

  try {
    const client = new Anthropic();

    // Filter aspects: remove Brand/MPN (handled separately) and dimension fields
    const relevantAspects = ebayAspects.all.filter(a => !SKIP_FIELDS.has(a.ebayName));

    // Build the known specs text from Pass 1
    const knownSpecsText = Object.entries(pass1Specs || {})
      .filter(([k, v]) => v && v !== 'null' && v !== 'N/A' && v !== 'Unknown')
      .map(([k, v]) => `  ${k}: ${v}`)
      .join('\n');

    // Build the eBay fields list for the AI prompt
    // Include requirement status + allowed values for guidance
    const fieldsList = relevantAspects.slice(0, 50).map(aspect => {
      let line = `- "${aspect.ebayName}"`;
      if (aspect.required) line += ' [REQUIRED]';
      else if (aspect.usage === 'RECOMMENDED') line += ' [RECOMMENDED]';

      // Add aggressive fill hint if available
      const hint = AGGRESSIVE_FILL_HINTS[aspect.ebayName];
      if (hint) line += ` — HINT: ${hint}`;

      // Show allowed values for SELECTION_ONLY fields
      if (aspect.mode === 'SELECTION_ONLY' && aspect.allowedValues?.length > 0) {
        const vals = aspect.allowedValues.slice(0, 25).join(', ');
        line += `\n  Allowed values: [${vals}]`;
        if (aspect.allowedValues.length > 25) line += ` ... and ${aspect.allowedValues.length - 25} more`;
      }

      return line;
    }).join('\n');

    const prompt = `You are an expert industrial parts specialist filling in eBay item specifics for a product listing.

FIRST: Search the web for "${brand} ${partNumber}" to find the manufacturer datasheet, distributor catalog page, or specification sheet. Use the actual specifications you find to fill in the eBay fields below. Look for specific dimensional data, materials, and technical values.

PRODUCT: ${brand} ${partNumber}
TYPE: ${productType || 'Unknown'}
TITLE: ${title || ''}

KNOWN SPECIFICATIONS FROM INITIAL RESEARCH:
${knownSpecsText || '  (No specifications available yet — web search is critical)'}

YOUR TASK: Fill in values for these eBay item specifics fields. Be AGGRESSIVE about filling fields — use web search results + your deep knowledge of industrial products to fill as many fields as possible.

EBAY FIELDS TO FILL:
${fieldsList}

CRITICAL RULES:
1. For fields with "Allowed values", you MUST use one of the listed values exactly. Pick the closest match.
2. For free-text fields, use standard industry formatting (e.g., "3 HP", "1800 RPM", "208-230/460V").
3. Be AGGRESSIVE — fill in standard industry values that are typical for this product type even if not explicitly in specs.
   - AC motors are almost always "AC" Current Type
   - Standard motors are usually "Horizontal" shaft orientation
   - If you know the brand's country of origin, fill Country/Region of Manufacture
   - If phase is "3", Number of Phases should be "3"
   - Infer Power Source from the product type (Electric for motors/drives, Pneumatic for air cylinders, etc.)
   - For bearings: look up bore diameter, OD, width, stud dimensions from manufacturer catalogs
   - For sensors: determine sensing method, output type, and operating specs from datasheets
4. Set value to null ONLY if you truly cannot determine or reasonably infer it.
5. DO NOT fill Brand or MPN — those are handled separately.
6. Match the EXACT eBay field names in your response.
7. For measurements, ALWAYS include units (e.g., "1.75 in" not just "1.75", "25 mm" not "25").

Respond with ONLY valid JSON object (no markdown, no backticks), mapping each eBay field name to its value or null:
{
  "eBay Field Name": "value",
  "Another Field": null
}`;

    console.log('Calling AI for Pass 2 fill (with web search)...');
    console.log(`Aspects to fill: ${relevantAspects.length}`);
    const startTime = Date.now();

    const response = await callClaudeWithRetry(client, {
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4096,
      // Enable web search so AI can look up actual product specifications
      tools: [{ type: "web_search_20250305", name: "web_search", max_uses: 5 }],
      messages: [{ role: 'user', content: prompt }]
    });

    const elapsed = Date.now() - startTime;
    console.log(`AI response received in ${elapsed}ms`);
    console.log(`Response content blocks: ${response.content?.length || 0}`);

    // =========================================================================
    // CRITICAL FIX: Extract the LAST text block from the response
    // When Claude uses web_search, the response contains multiple content blocks:
    //   [text, tool_use, tool_result, text, tool_use, tool_result, ..., text]
    // The JSON answer is in the LAST text block, not the first one.
    // Previous bug: response.content?.[0]?.text only got "Let me search..."
    // =========================================================================
    let text = '';
    if (response.content && Array.isArray(response.content)) {
      // Find ALL text blocks
      const textBlocks = response.content.filter(block => block.type === 'text' && block.text);
      if (textBlocks.length > 0) {
        // Use the LAST text block — that's where the final JSON answer is
        text = textBlocks[textBlocks.length - 1].text;
        console.log(`Found ${textBlocks.length} text blocks, using last one (${text.length} chars)`);
      }
    }

    const jsonMatch = text.match(/\{[\s\S]*\}/);

    let filledValues = {};
    if (jsonMatch) {
      try {
        filledValues = JSON.parse(jsonMatch[0]);
        console.log(`Parsed ${Object.keys(filledValues).length} fields from AI response`);
      } catch (e) {
        console.error('Failed to parse AI response:', e.message);
        console.error('Raw text:', text.substring(0, 500));
      }
    } else {
      console.error('No JSON found in AI response');
      console.error('Full response text:', text.substring(0, 500));
    }

    // Build the response with both UI format and SureDone format
    const specificsForUI = [];
    const specificsForSuredone = {};
    let filledCount = 0;

    for (const aspect of relevantAspects) {
      const ebayName = aspect.ebayName;
      const value = filledValues[ebayName] || null;
      const isValid = value && value !== 'null' && value !== null && value !== 'N/A';

      // Build UI entry
      specificsForUI.push({
        ebayName: ebayName,
        suredoneInlineField: aspect.suredoneInlineField,
        suredoneDynamicField: aspect.suredoneDynamicField,
        required: aspect.required || false,
        usage: aspect.usage || 'OPTIONAL',
        mode: aspect.mode || 'FREE_TEXT',
        value: isValid ? value : '',
        allowedValues: aspect.allowedValues || [],
        multiValue: aspect.multiValue || false
      });

      // Build SureDone payload using resolved field names from consolidation map
      // resolveFieldName checks: alias → multi-channel short name → ebayitemspecifics prefix
      if (isValid) {
        const resolvedField = resolveFieldName(ebayName);
        specificsForSuredone[resolvedField] = value;
        filledCount++;
        console.log(`  ✓ ${ebayName} → ${resolvedField} = "${value}"`);
      }
    }

    console.log(`\n=== PASS 2 COMPLETE ===`);
    console.log(`Filled: ${filledCount} / ${relevantAspects.length} fields`);
    console.log(`SureDone payload keys: ${Object.keys(specificsForSuredone).length}`);

    res.status(200).json({
      success: true,
      data: {
        specificsForUI,
        specificsForSuredone,
        filledCount,
        totalCount: relevantAspects.length
      },
      _meta: {
        productType,
        elapsed: `${elapsed}ms`,
        webSearchUsed: response.content?.some(b => b.type === 'tool_use') || false,
        textBlocksCount: response.content?.filter(b => b.type === 'text').length || 0,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Pass 2 error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      stage: 'pass2_failed'
    });
  }
}
