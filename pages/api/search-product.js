export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { brand, partNumber } = req.body;

  // Debug: Check if API key exists
  if (!process.env.ANTHROPIC_API_KEY) {
    console.error('ANTHROPIC_API_KEY is not set!');
    return res.status(500).json({ error: 'API key not configured' });
  }

  try {
    console.log('Calling Anthropic API for:', brand, partNumber);
    
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 3000,
        messages: [{
          role: 'user',
          content: `Search for product information: ${brand} ${partNumber}

Return ONLY valid JSON (no markdown):
{
  "title": "80 characters or less product title",
  "metaDescription": "150-160 character meta description",
  "description": "Brief 3-4 sentence technical description",
  "specifications": ["Specification 1", "Specification 2", "Specification 3"],
  "ebayCategory": "eBay category name and number",
  "qualityFlag": "STRONG or NEEDS ATTENTION",
  "metaKeywords": "keyword1, keyword2, keyword3, keyword4, keyword5"
}`
        }],
        tools: [{ type: 'web_search_20250305', name: 'web_search' }]
      })
    });

    console.log('API response status:', response.status);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('API error response:', errorText);
      return res.status(response.status).json({ 
        error: `Anthropic API error: ${response.status}`,
        details: errorText
      });
    }

    const data = await response.json();
    console.log('API response received, content blocks:', data.content?.length || 0);
    res.status(200).json(data);
  } catch (error) {
    console.error('Search product error:', error);
    res.status(500).json({ error: error.message, stack: error.stack });
  }
}
