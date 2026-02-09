// pages/api/v2/revise-listing.js
// PASS 3: Revise title, description, and meta using specs discovered in Pass 2
// Compares filled item specifics against existing title/description and enriches them

import Anthropic from '@anthropic-ai/sdk';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const {
    brand,
    partNumber,
    productType,
    // Pass 1 outputs
    title,
    description,
    shortDescription,
    // Pass 2 outputs — filled item specifics (eBay display name → value)
    filledSpecifics,
    // Optional: condition info for description context
    condition
  } = req.body;

  if (!brand || !partNumber || !title || !filledSpecifics) {
    return res.status(400).json({
      error: 'brand, partNumber, title, and filledSpecifics are required'
    });
  }

  console.log('=== PASS 3: REVISE LISTING ===');
  console.log('Brand:', brand);
  console.log('Part Number:', partNumber);
  console.log('Product Type:', productType);
  console.log('Original Title:', title);
  console.log('Filled Specifics Count:', Object.keys(filledSpecifics).length);

  // Filter out empty/null values and standard fields that don't add value to title/description
  const SKIP_FIELDS = new Set([
    'Brand', 'MPN', 'Model', 'Type', 'Country/Region of Manufacture',
    'Country of Origin', 'Manufacturer Warranty', 'UPC', 'EAN',
    'Custom Bundle', 'Modified Item', 'Non-Domestic Product',
    'Item Height', 'Item Width', 'Item Length', 'Item Weight',
    'Unit Quantity', 'Unit Type', 'California Prop 65 Warning'
  ]);

  const meaningfulSpecs = {};
  for (const [name, value] of Object.entries(filledSpecifics)) {
    if (value && value !== '' && value !== 'null' && !SKIP_FIELDS.has(name)) {
      meaningfulSpecs[name] = value;
    }
  }

  console.log('Meaningful Specs for Revision:', Object.keys(meaningfulSpecs).length);

  // If there are no meaningful specs to work with, return originals unchanged
  if (Object.keys(meaningfulSpecs).length === 0) {
    console.log('No meaningful specs found — skipping revision');
    return res.status(200).json({
      success: true,
      stage: 'revision_skipped',
      data: {
        title,
        description,
        shortDescription: shortDescription || '',
        keywords: generateKeywords(brand, partNumber, productType, {}),
        revised: false,
        reason: 'No meaningful specs to add'
      }
    });
  }

  try {
    const client = new Anthropic();

    const specsListForPrompt = Object.entries(meaningfulSpecs)
      .map(([name, value]) => `- ${name}: ${value}`)
      .join('\n');

    const prompt = `You are revising an eBay listing for: ${brand} ${partNumber} (${productType || 'Industrial Equipment'})

CURRENT TITLE (from Pass 1):
"${title}"

CURRENT DESCRIPTION (from Pass 1):
${description}

CURRENT META DESCRIPTION:
"${shortDescription || ''}"

ITEM SPECIFICS DISCOVERED (from Pass 2):
${specsListForPrompt}

YOUR TASK:
1. Compare the item specifics above against the current title and description
2. Identify important specs that buyers would search for but are MISSING from the title
3. Revise the title to include the most important missing specs
4. Revise the description to include any missing specs in the specifications table
5. Revise the meta description to include key searchable specs
6. Generate a comma-separated keywords string

TITLE REVISION RULES:
- MAXIMUM 80 characters (this is a hard eBay limit — do NOT exceed it)
- Keep the brand and part number at the front
- Add the most searchable/important specs that fit within 80 chars
- Prioritize specs that buyers actually search for:
  * For motors: voltage, HP/kW, RPM, frame size
  * For bearings: bore diameter, outside diameter, type (e.g., "cam follower")
  * For sensors: sensing distance, voltage, output type
  * For drives/VFDs: power rating, voltage, phase
  * For PLCs: I/O count, communication protocol
  * For cylinders: bore size, stroke length
  * For circuit breakers: amperage, poles, voltage
- Do NOT use promotional language
- Do NOT add the condition to the title
- Use standard abbreviations where helpful (V, HP, kW, RPM, mm, in)
- If the current title is already good and includes the key specs, keep it as-is

DESCRIPTION REVISION RULES:
- Keep the existing HTML structure and styling
- Add any missing specs to the specifications table
- Do NOT remove any existing content
- Do NOT change the condition section, warranty section, or shipping section
- Only modify the Product Overview paragraph and the specs table
- If a spec is already in the table, do not duplicate it

META DESCRIPTION RULES:
- Must be 150-160 characters
- Include brand, part number, product type, and 2-3 key specs
- Make it SEO-friendly — this appears in search engine results

KEYWORDS RULES:
- Comma-separated list of search terms
- Include: brand, part number, product type, alternate names, key specs
- Include common misspellings or abbreviations buyers might use
- 15-25 keywords maximum

Return ONLY valid JSON (no markdown, no code blocks):
{
  "title": "Revised title (max 80 chars)",
  "description": "Revised HTML description",
  "shortDescription": "Revised meta description (150-160 chars)",
  "keywords": "comma, separated, keywords",
  "changes": ["Brief description of what was changed and why"]
}`;

    const response = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 8192,
      messages: [{ role: 'user', content: prompt }]
    });

    // Extract JSON from response
    const text = response.content?.filter(b => b.type === 'text').map(b => b.text).join('') || '';
    const jsonMatch = text.match(/\{[\s\S]*\}/);

    if (!jsonMatch) {
      throw new Error('No valid JSON in AI response');
    }

    const result = JSON.parse(jsonMatch[0]);

    // Validate and enforce title length
    let revisedTitle = result.title || title;
    if (revisedTitle.length > 80) {
      console.warn(`Revised title exceeds 80 chars (${revisedTitle.length}), truncating...`);
      // Try to cut at a word boundary
      revisedTitle = revisedTitle.substring(0, 80).replace(/\s+\S*$/, '');
      if (revisedTitle.length < 40) {
        // Truncation was too aggressive, just hard cut
        revisedTitle = result.title.substring(0, 77) + '...';
      }
    }

    const revisedDescription = result.description || description;
    const revisedShortDescription = result.shortDescription || shortDescription || '';
    const keywords = result.keywords || generateKeywords(brand, partNumber, productType, meaningfulSpecs);
    const changes = result.changes || [];

    console.log('Original Title:', title);
    console.log('Revised Title:', revisedTitle);
    console.log('Title Changed:', title !== revisedTitle);
    console.log('Changes Made:', changes);

    res.status(200).json({
      success: true,
      stage: 'revision_complete',
      data: {
        title: revisedTitle,
        description: revisedDescription,
        shortDescription: revisedShortDescription,
        keywords: keywords,
        revised: title !== revisedTitle || description !== revisedDescription,
        changes: changes,
        originalTitle: title
      },
      _meta: {
        aiModel: 'claude-sonnet-4-20250514',
        specsConsidered: Object.keys(meaningfulSpecs).length,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Revise Listing API error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      stage: 'revision_failed'
    });
  }
}

// Fallback keyword generator when AI doesn't return keywords
function generateKeywords(brand, partNumber, productType, specs) {
  const parts = [brand, partNumber];
  if (productType) parts.push(productType);

  // Add spec values that make good keywords
  for (const [name, value] of Object.entries(specs)) {
    if (value && typeof value === 'string' && value.length < 30) {
      parts.push(value);
    }
  }

  return parts.filter(Boolean).join(', ');
}
