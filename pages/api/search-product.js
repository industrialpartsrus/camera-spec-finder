export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { brand, partNumber } = req.body;

  try {
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

    const data = await response.json();
    res.status(200).json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}