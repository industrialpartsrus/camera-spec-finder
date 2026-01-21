// API route for competitive pricing research
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { brand, partNumber, condition } = req.body;

  try {
    // Use Claude with web search to research pricing
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 2000,
        messages: [{
          role: 'user',
          content: `Research competitive pricing for this industrial product:

Brand: ${brand}
Part Number: ${partNumber}
Condition: ${condition || 'Used'}

Search for:
1. Recently sold eBay listings (last 90 days)
2. Current eBay active listings from high-feedback sellers
3. Pricing from major suppliers like Radwell International, AutomationDirect
4. Google Shopping results
5. Manufacturer MSRP if available

Return ONLY valid JSON:
{
  "suggestedPrice": number,
  "priceRange": {
    "low": number,
    "high": number
  },
  "sources": [
    {
      "source": "eBay Sold",
      "price": number,
      "quantity": number,
      "notes": "brief description"
    }
  ],
  "confidence": "high|medium|low",
  "reasoning": "Brief explanation of pricing strategy",
  "competitorPrices": {
    "radwell": number or null,
    "ebayAverage": number or null,
    "retailMSRP": number or null
  }
}

Price competitively for fast movement while maintaining good margins.`
        }],
        tools: [{ type: 'web_search_20250305', name: 'web_search' }]
      })
    });

    const data = await response.json();
    const text = data.content?.filter(b => b.type === 'text').map(b => b.text).join('') || '';
    
    console.log('Pricing research response length:', text.length);

    // Parse JSON response
    let pricing = null;
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const cleanJson = jsonMatch[0].replace(/```json|```/g, '');
      pricing = JSON.parse(cleanJson);
    }

    if (!pricing) {
      // Return a default structure if parsing fails
      pricing = {
        suggestedPrice: null,
        priceRange: { low: null, high: null },
        sources: [],
        confidence: 'low',
        reasoning: 'Unable to find sufficient pricing data',
        competitorPrices: {
          radwell: null,
          ebayAverage: null,
          retailMSRP: null
        }
      };
    }

    res.status(200).json({
      success: true,
      pricing: pricing
    });

  } catch (error) {
    console.error('Pricing research error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      pricing: {
        suggestedPrice: null,
        confidence: 'low',
        reasoning: 'Error during price research'
      }
    });
  }
}
