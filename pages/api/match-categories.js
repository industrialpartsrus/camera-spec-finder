// API route for matching products to correct categories
import ebayStoreCategories from '../../data/ebay_store_categories.json';
import bigcommerceCategories from '../../data/bigcommerce_categories.json';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { brand, partNumber, title, description, specifications } = req.body;

  try {
    // Build context for AI
    const productContext = `
Brand: ${brand}
Part Number: ${partNumber}
Title: ${title}
Description: ${description}
Specifications: ${specifications ? specifications.join(', ') : 'None'}
`;

    // Get available categories
    const ebayLevel1 = ebayStoreCategories.filter(c => c.level === 1);
    const ebayLevel2 = ebayStoreCategories.filter(c => c.level === 2);
    
    // Call Claude to match categories
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1000,
        messages: [{
          role: 'user',
          content: `You are a product categorization expert for an industrial equipment supplier.

Product Information:
${productContext}

Available eBay Store Categories (Level 1):
${ebayLevel1.map(c => `- ${c.name} (ID: ${c.id})`).join('\n')}

Available BigCommerce Categories:
${Object.values(bigcommerceCategories).map(c => `- ${c.name} (ID: ${c.id})`).join('\n')}

Task: Select the MOST APPROPRIATE categories for this product.

Return ONLY valid JSON in this exact format:
{
  "ebayStoreCategory1": "EXACT category name from Level 1 list",
  "ebayStoreCategory1ID": "ID number",
  "ebayStoreCategory2": "EXACT subcategory name from Level 2 (if applicable)",
  "ebayStoreCategory2ID": "ID number (if applicable)",
  "bigcommerceCategory": "EXACT category name from BigCommerce list",
  "bigcommerceCategoryID": "ID number",
  "confidence": "high|medium|low",
  "reasoning": "Brief explanation of why these categories fit"
}

If no Level 2 subcategory applies, set ebayStoreCategory2 and ebayStoreCategory2ID to null.`
        }]
      })
    });

    const data = await response.json();
    const text = data.content?.filter(b => b.type === 'text').map(b => b.text).join('') || '';
    
    // Parse JSON response
    let categories = null;
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      categories = JSON.parse(jsonMatch[0]);
    }

    if (!categories) {
      throw new Error('Could not extract category matches');
    }

    // Validate and get full category objects
    const ebayL1 = ebayStoreCategories.find(c => 
      c.name === categories.ebayStoreCategory1 && c.level === 1
    );

    let ebayL2 = null;
    if (categories.ebayStoreCategory2) {
      ebayL2 = ebayStoreCategories.find(c => 
        c.name === categories.ebayStoreCategory2 && c.level === 2
      );
    }

    const bcCategory = Object.values(bigcommerceCategories).find(c => 
      c.name.toLowerCase() === categories.bigcommerceCategory.toLowerCase()
    );

    res.status(200).json({
      success: true,
      categories: {
        ebayStore1: ebayL1 || null,
        ebayStore2: ebayL2 || null,
        bigcommerce: bcCategory || null,
        confidence: categories.confidence,
        reasoning: categories.reasoning
      }
    });

  } catch (error) {
    console.error('Category matching error:', error);
    res.status(500).json({ 
      success: false,
      error: error.message 
    });
  }
}
