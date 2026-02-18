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
function generateTemplateAltText(brand, partNumber, category, viewName) {
  const viewLabel = VIEW_LABELS[viewName] || 'Product Photo';
  const parts = [brand, partNumber, category, viewLabel].filter(Boolean);
  const altText = parts.join(' ');

  // Truncate to 125 characters
  return altText.length > 125 ? altText.substring(0, 122) + '...' : altText;
}

// Clean alt text: remove quotes, special chars, truncate to 125
function cleanAltText(text) {
  if (!text) return '';

  // Remove quotes and excessive special characters
  let cleaned = text
    .replace(/["""'']/g, '')
    .replace(/[^\w\s\-\/(),.]/g, '')
    .trim();

  // Truncate to 125 characters
  if (cleaned.length > 125) {
    cleaned = cleaned.substring(0, 122) + '...';
  }

  return cleaned;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed. Use POST.' });
  }

  const { imageUrl, brand, partNumber, category, viewName } = req.body;

  if (!imageUrl) {
    return res.status(400).json({
      success: false,
      error: 'imageUrl is required'
    });
  }

  const viewLabel = VIEW_LABELS[viewName] || 'Product Photo';

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
              text: `Generate SEO-friendly alt text (50-125 characters) for this industrial product photo.

Product Info:
- Brand: ${brand || 'Unknown'}
- Part Number: ${partNumber || 'Unknown'}
- Category: ${category || 'Industrial Part'}
- View: ${viewLabel}

Requirements:
- Include brand and part number
- Describe what's visible in the photo
- Use industrial/technical terms
- 50-125 characters total
- NO quotation marks or special characters
- Output ONLY the alt text, nothing else`
            }
          ]
        }]
      });

      const aiAltText = message.content[0]?.text?.trim();

      if (aiAltText) {
        const cleaned = cleanAltText(aiAltText);
        console.log(`AI generated: "${cleaned}"`);

        return res.status(200).json({
          success: true,
          altText: cleaned,
          source: 'ai'
        });
      }
    }

    // Fallback to template
    console.log('Using template-based alt text (AI unavailable)');
    const templateAltText = generateTemplateAltText(brand, partNumber, category, viewName);

    return res.status(200).json({
      success: true,
      altText: templateAltText,
      source: 'template'
    });

  } catch (error) {
    console.error('Alt text generation error:', error);

    // Return template fallback on error
    const templateAltText = generateTemplateAltText(brand, partNumber, category, viewName);

    return res.status(200).json({
      success: true,
      altText: templateAltText,
      source: 'template',
      error: error.message
    });
  }
}
