// pages/api/ai/extract-specs.js
// Uses AI to extract product specifications from title and description

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { title, description, brand, categoryId, missingFields } = req.body;

  if (!title) {
    return res.status(400).json({ error: 'Title is required' });
  }

  try {
    // Build the prompt for Claude
    const prompt = buildExtractionPrompt(title, description, brand, categoryId, missingFields);
    
    // Call Claude API
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1024,
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ]
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Claude API error:', errorText);
      return res.status(500).json({ error: 'AI extraction failed', details: errorText });
    }

    const data = await response.json();
    const aiResponse = data.content[0].text;

    // Parse the JSON response from Claude
    const extractedSpecs = parseAIResponse(aiResponse);

    return res.status(200).json({
      success: true,
      extracted: extractedSpecs,
      raw: aiResponse
    });

  } catch (error) {
    console.error('Extract specs error:', error);
    return res.status(500).json({
      error: 'Failed to extract specifications',
      details: error.message
    });
  }
}

function buildExtractionPrompt(title, description, brand, categoryId, missingFields) {
  const fieldsToExtract = missingFields?.length > 0 
    ? missingFields.join(', ')
    : 'Brand, MPN, Model, Voltage, Current, Type, Controller Platform';

  return `You are an industrial equipment specification extractor. Analyze this product listing and extract the specifications.

TITLE: ${title}

${description ? `DESCRIPTION: ${description}` : ''}

${brand ? `KNOWN BRAND: ${brand}` : ''}

FIELDS TO EXTRACT: ${fieldsToExtract}

Instructions:
1. Extract values ONLY from the information provided - do not guess or make up values
2. For MPN/Model, look for part numbers like "1756-L72", "CDQ2A40-100D", "6ES7 315-2AH14"
3. For voltage, look for values like "24V", "480V", "100-240V", "24 Vdc", "480 Vac"
4. For current/amperage, look for values like "5A", "30 Amp", "0.5A"
5. For dimensions, look for bore/stroke like "40mm Bore", "100mm Stroke"
6. Extract the Type/Category from descriptive words (Servo Motor, PLC, Cylinder, Valve, etc.)

Return ONLY a JSON object with the extracted values. Use null for fields you cannot determine.

Example response format:
{
  "Brand": "SMC",
  "MPN": "CDQ2A40-100D",
  "Model": "CDQ2A40-100D",
  "Type": "Pneumatic Cylinder",
  "Voltage": null,
  "Current": null,
  "Bore": "40mm",
  "Stroke": "100mm",
  "Controller Platform": null,
  "confidence": "high"
}

JSON response:`;
}

function parseAIResponse(response) {
  try {
    // Try to extract JSON from the response
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    return { error: 'Could not parse AI response' };
  } catch (err) {
    console.error('JSON parse error:', err);
    return { error: 'Invalid JSON in AI response', raw: response };
  }
}
