// pages/api/v2/auto-fill-ebay-specifics.js
// =============================================================================
// PASS 2: AUTO-FILL EBAY ITEM SPECIFICS
// =============================================================================
// Called automatically after Pass 1 completes.
// Takes the eBay aspects (from Taxonomy API) + Pass 1 specs → AI fills all fields.
// Returns both UI format (for display/editing) and SureDone-ready format.
// =============================================================================

import Anthropic from '@anthropic-ai/sdk';

// Fields that are handled separately — skip them in AI filling
const SKIP_FIELDS = new Set([
  'Brand', 'MPN', 'Manufacturer Part Number',
  'California Prop 65 Warning', 'Unit Type', 'Unit Quantity',
  'Custom Bundle', 'Bundle Description',
  'Item Height', 'Item Width', 'Item Length', 'Item Weight', 'Item Depth'
]);

// Fields the AI should aggressively fill with standard industry values
const AGGRESSIVE_FILL_HINTS = {
  'Current Type': 'Determine from product type: AC motors/VFDs = "AC", DC motors = "DC", servo motors check specs',
  'Mounting Type': 'Common values: Foot Mount, Flange Mount, C-Face, DIN Rail, Panel Mount, Wall Mount',
  'Country/Region of Manufacture': 'Use known specs or infer from brand origin. Common: USA, Japan, Germany, China, Mexico, Switzerland',
  'Shaft Orientation': 'Usually "Horizontal" for standard motors unless specs say otherwise',
  'Power Source': 'Electric, Hydraulic, Pneumatic, Battery, or Manual based on product type',
  'Number of Phases': 'Derive from phase spec: single phase = "1", three phase = "3"'
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

PRODUCT: ${brand} ${partNumber}
TYPE: ${productType || 'Unknown'}
TITLE: ${title || ''}

KNOWN SPECIFICATIONS FROM RESEARCH:
${knownSpecsText || '  (No specifications available)'}

YOUR TASK: Fill in values for these eBay item specifics fields. Be AGGRESSIVE about filling fields — use your deep knowledge of industrial products to infer standard values even when not explicitly stated in the specs.

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
4. Set value to null ONLY if you truly cannot determine or reasonably infer it.
5. DO NOT fill Brand or MPN — those are handled separately.
6. Match the EXACT eBay field names in your response.

Respond with ONLY valid JSON object (no markdown, no backticks), mapping each eBay field name to its value or null:
{
  "eBay Field Name": "value",
  "Another Field": null
}`;

    console.log('Calling AI for Pass 2 fill...');
    const startTime = Date.now();

    const response = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 3000,
      messages: [{ role: 'user', content: prompt }]
    });

    const elapsed = Date.now() - startTime;
    console.log(`AI response received in ${elapsed}ms`);

    const text = response.content?.[0]?.text || '';
    const jsonMatch = text.match(/\{[\s\S]*\}/);

    let filledValues = {};
    if (jsonMatch) {
      try {
        filledValues = JSON.parse(jsonMatch[0]);
      } catch (e) {
        console.error('Failed to parse AI response:', e.message);
        console.error('Raw text:', text.substring(0, 500));
      }
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

      // Build SureDone payload — send INLINE ONLY (not prefix)
      // Pass 1's existing dual-field logic in suredone-create-listing.js handles prefix versions
      // Sending prefix here creates unwanted Dynamic (eBay only) duplicates
      if (isValid) {
        // Inline field only (for Recommended section in eBay)
        if (aspect.suredoneInlineField) {
          specificsForSuredone[aspect.suredoneInlineField] = value;
        }
        filledCount++;
        console.log(`  ✓ ${ebayName} → ${aspect.suredoneInlineField} = "${value}"`);
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
