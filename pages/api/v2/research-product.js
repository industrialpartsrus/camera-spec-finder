// pages/api/v2/research-product.js
// PASS 1: AI researches product, generates title and description
// Does NOT select category or fill item specifics - that's Pass 2

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
    shortNote: 'For Parts - Not Working'
  }
};

// Build the AI prompt for product research
function buildResearchPrompt(brand, partNumber, conditionKey) {
  const condition = CONDITION_CONFIG[conditionKey] || CONDITION_CONFIG['used_good'];
  
  return `You are an expert industrial equipment specialist. Research this product: ${brand} ${partNumber}

Your task is to gather product information and create a professional eBay listing.

IMPORTANT: Focus on ACCURACY. Only include information you are confident about.

Return ONLY valid JSON (no markdown, no code blocks):
{
  "productType": "The specific type of product (e.g., 'AC Servo Motor', 'Inductive Proximity Sensor', 'PLC Processor', 'Variable Frequency Drive')",
  "title": "Professional eBay title - see rules below",
  "description": "HTML description - see format below",
  "shortDescription": "SEO meta description, 150-160 characters summarizing the product",
  "manufacturer": "The manufacturer/brand name properly capitalized",
  "model": "Model number if different from part number, otherwise same as MPN",
  "series": "Product series/family if applicable, otherwise null",
  "specifications": {
    "key1": "value1",
    "key2": "value2"
  },
  "confidence": "HIGH or MEDIUM or LOW - how confident are you in this information?"
}

TITLE RULES (CRITICAL):
- Maximum 80 characters (eBay limit)
- Format: [Brand] [Model/Part#] [Key Spec 1] [Key Spec 2] [Product Type]
- Include the most searchable/important specs
- NO promotional words (Best, Great, Amazing, etc.)
- NO special characters except hyphens and slashes
- Example: "Mitsubishi HF-SP1524BK 1.5kW 2400rpm AC Servo Motor"

DESCRIPTION FORMAT:
<div style="font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto;">
  
  <h2 style="color: #333; border-bottom: 2px solid #e74c3c; padding-bottom: 10px;">${brand} ${partNumber}</h2>
  
  <div style="background: #f8f9fa; padding: 15px; border-radius: 5px; margin: 15px 0;">
    <strong style="color: #e74c3c;">Condition:</strong> ${condition.shortNote}
    <p style="margin: 10px 0 0 0; color: #666;">${condition.descriptionNote}</p>
  </div>
  
  <h3 style="color: #333; margin-top: 20px;">Product Overview</h3>
  <p>[2-3 sentences describing what this product is, what it does, and its primary applications. Be professional and factual.]</p>
  
  <h3 style="color: #333; margin-top: 20px;">Technical Specifications</h3>
  <table style="width: 100%; border-collapse: collapse; margin: 15px 0;">
    <tr style="background: #f8f9fa;">
      <th style="text-align: left; padding: 10px; border: 1px solid #ddd;">Specification</th>
      <th style="text-align: left; padding: 10px; border: 1px solid #ddd;">Value</th>
    </tr>
    <tr>
      <td style="padding: 10px; border: 1px solid #ddd;">Brand</td>
      <td style="padding: 10px; border: 1px solid #ddd;">${brand}</td>
    </tr>
    <tr>
      <td style="padding: 10px; border: 1px solid #ddd;">Part Number</td>
      <td style="padding: 10px; border: 1px solid #ddd;">${partNumber}</td>
    </tr>
    <!-- Add all discovered specifications as rows -->
  </table>
  
  <h3 style="color: #333; margin-top: 20px;">Warranty</h3>
  <p>We warranty all items for 30 days from date of purchase. If you experience any issues within this period, please contact us and we will work with you to resolve the problem.</p>
  
  <h3 style="color: #333; margin-top: 20px;">Shipping</h3>
  <p>Items typically ship within 1-2 business days. We use appropriate packaging to ensure your item arrives safely.</p>
  
</div>

SPECIFICATIONS OBJECT:
- Include ALL technical specs you can find
- Use clear, readable keys (e.g., "Rated Power", "Input Voltage", "Sensing Distance")
- Values should include units where applicable (e.g., "1.5kW", "24VDC", "4mm")
- Only include specs you're confident about
- Common specs to look for (depending on product type):
  * Motors: Power, Voltage, Speed, Torque, Frame Size, Encoder Type
  * Sensors: Sensing Distance, Output Type, Supply Voltage, Connection Type
  * PLCs: I/O Count, Memory, Communication Protocols
  * Drives: Power Rating, Input/Output Voltage, Control Method

NOMENCLATURE DETECTION:
- Many industrial parts have meaningful part number structures
- For example, SMC cylinders encode bore, stroke, and options in the part number
- If you recognize a nomenclature pattern, decode it and include those specs
- Note the series/family the product belongs to

Remember: It's better to leave a field empty than to guess incorrectly.`;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { brand, partNumber, condition } = req.body;

  if (!brand || !partNumber) {
    return res.status(400).json({ error: 'Brand and part number are required' });
  }

  const conditionKey = condition || 'used_good';
  const conditionConfig = CONDITION_CONFIG[conditionKey];

  if (!conditionConfig) {
    return res.status(400).json({ 
      error: 'Invalid condition', 
      validConditions: Object.keys(CONDITION_CONFIG) 
    });
  }

  console.log('=== PASS 1: RESEARCH PRODUCT ===');
  console.log('Brand:', brand);
  console.log('Part Number:', partNumber);
  console.log('Condition:', conditionConfig.label);

  try {
    const client = new Anthropic();
    const prompt = buildResearchPrompt(brand, partNumber, conditionKey);

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

    const product = JSON.parse(jsonMatch[0]);

    console.log('AI Product Type:', product.productType);
    console.log('AI Confidence:', product.confidence);
    console.log('Title Length:', product.title?.length);

    // Validate title length
    if (product.title && product.title.length > 80) {
      console.warn('Title exceeds 80 chars, truncating...');
      product.title = product.title.substring(0, 77) + '...';
    }

    // Return research results
    res.status(200).json({
      success: true,
      stage: 'research_complete',
      data: {
        brand: brand,
        partNumber: partNumber,
        condition: {
          key: conditionKey,
          label: conditionConfig.label,
          suredoneValue: conditionConfig.suredoneValue,
          descriptionNote: conditionConfig.descriptionNote
        },
        productType: product.productType || 'Industrial Equipment',
        title: product.title || `${brand} ${partNumber}`,
        description: product.description || '',
        shortDescription: product.shortDescription || '',
        manufacturer: product.manufacturer || brand,
        model: product.model || partNumber,
        series: product.series || null,
        specifications: product.specifications || {},
        confidence: product.confidence || 'MEDIUM'
      },
      _meta: {
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

// Export condition config for use in other files
export { CONDITION_CONFIG };
