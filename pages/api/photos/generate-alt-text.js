// pages/api/photos/generate-alt-text.js
// Generate SEO-friendly alt text for product photos
// Uses Claude Sonnet 4 with vision, fallback to template-based generation

import Anthropic from '@anthropic-ai/sdk';

// View name to description mapping for template fallback
const VIEW_LABELS = {
  'left': 'Left Side View',
  'right': 'Right Side View',
  'center': 'Front View',
  'nameplate': 'Nameplate Data Tag',
  'extra_1': 'Detail View',
  'extra_2': 'Detail View',
  'extra_3': 'Detail View',
  'extra_4': 'Detail View',
  'extra_5': 'Detail View',
  'upload_1': 'Product Photo',
  'upload_2': 'Product Photo',
  'upload_3': 'Product Photo',
  'upload_4': 'Product Photo',
  'upload_5': 'Product Photo',
  'suredone_1': 'Product Image',
  'suredone_2': 'Product Image',
  'suredone_3': 'Product Image',
  'suredone_4': 'Product Image',
  'suredone_5': 'Product Image',
};

// Template-based alt text generation (fallback)
function generateTemplateAltText(brand, partNumber, category, viewName, isPrimary = false) {
  const maxLength = isPrimary ? 50 : 125;

  if (isPrimary) {
    // Primary image: shorter, just brand + part + category
    const parts = [brand, partNumber, category].filter(Boolean);
    const altText = parts.join(' ');
    return altText.length > maxLength ? altText.substring(0, maxLength - 3) + '...' : altText;
  } else {
    // Other images: include view label
    const viewLabel = VIEW_LABELS[viewName] || 'Product Photo';
    const parts = [brand, partNumber, category, viewLabel].filter(Boolean);
    const altText = parts.join(' ');
    return altText.length > maxLength ? altText.substring(0, maxLength - 3) + '...' : altText;
  }
}

// Clean alt text: remove quotes, special chars, truncate based on isPrimary
function cleanAltText(text, isPrimary = false) {
  if (!text) return '';

  const maxLength = isPrimary ? 50 : 125;

  // Remove quotes and excessive special characters
  let cleaned = text
    .replace(/["""'']/g, '')
    .replace(/[^\w\s\-\/(),.]/g, '')
    .trim();

  // Truncate to max length
  if (cleaned.length > maxLength) {
    cleaned = cleaned.substring(0, maxLength - 3) + '...';
  }

  return cleaned;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed. Use POST.' });
  }

  const { imageUrl, brand, partNumber, category, viewName, isPrimary = false } = req.body;

  if (!imageUrl) {
    return res.status(400).json({
      success: false,
      error: 'imageUrl is required'
    });
  }

  const viewLabel = VIEW_LABELS[viewName] || 'Product Photo';
  const maxLength = isPrimary ? 50 : 125;

  try {
    // Try Claude Vision first
    if (process.env.ANTHROPIC_API_KEY) {
      console.log(`Generating AI alt text for ${brand} ${partNumber} (${viewName})...`);

      const anthropic = new Anthropic({
        apiKey: process.env.ANTHROPIC_API_KEY
      });

      const message = await anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 100,
        messages: [{
          role: 'user',
          content: [
            {
              type: 'image',
              source: {
                type: 'url',
                url: imageUrl
              }
            },
            {
              type: 'text',
              text: `Generate SEO alt text for this industrial product photo.

RULES:
- Maximum ${maxLength} characters
- Start with brand '${brand || 'Unknown'}' and part number '${partNumber || 'Unknown'}'
- Focus ONLY on the product itself — do NOT describe the background, desk, surroundings, hands, papers, or anything that is not the product
- Include key product features visible (ports, terminals, mounting style, etc.)
- Include the product category: ${category || 'Industrial Part'}
- This photo shows the ${viewLabel}
- Use industrial SEO keywords from the product specifications
- NO quotes, NO special characters
- Output ONLY the alt text string, nothing else

BAD examples (too descriptive of surroundings):
- 'WAGO module on desk with handwritten notes and computer'
- 'Motor in cardboard box with packing material visible'

GOOD examples (product-focused):
- 'WAGO 750-363 EtherNet IP Fieldbus Coupler Left Side'
- 'Baldor VEBM3611T 3HP Brake Motor 230V TEFC Enclosure'
- 'Allen-Bradley 1756-L72 ControlLogix PLC Processor Module'`
            }
          ]
        }]
      });

      const aiAltText = message.content[0]?.text?.trim();

      if (aiAltText) {
        const cleaned = cleanAltText(aiAltText, isPrimary);
        console.log(`AI generated ${isPrimary ? '(PRIMARY)' : ''}: "${cleaned}"`);

        return res.status(200).json({
          success: true,
          altText: cleaned,
          source: 'ai'
        });
      }
    }

    // Fallback to template
    console.log(`Using template-based alt text ${isPrimary ? '(PRIMARY)' : ''} (AI unavailable)`);
    const templateAltText = generateTemplateAltText(brand, partNumber, category, viewName, isPrimary);

    return res.status(200).json({
      success: true,
      altText: templateAltText,
      source: 'template'
    });

  } catch (error) {
    console.error('Alt text generation error:', error);

    // Return template fallback on error
    const templateAltText = generateTemplateAltText(brand, partNumber, category, viewName, isPrimary);

    return res.status(200).json({
      success: true,
      altText: templateAltText,
      source: 'template',
      error: error.message
    });
  }
}
