// This runs on the server, keeping your API key secure
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { imageData, mimeType } = req.body;

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
        max_tokens: 1000,
        messages: [{
          role: 'user',
          content: [
            { type: 'image', source: { type: 'base64', media_type: mimeType, data: imageData }},
            { type: 'text', text: 'Look at this nameplate/product label and extract:\n1) Brand name\n2) Part or model number (the catalog number or MPN)\n3) Series letter — usually printed as "SER" or "Series" followed by a single letter (A, B, C, D, etc.)\n4) Firmware Revision — printed as "FRN" or "FW" or "Firmware Rev" followed by a number like "24.011" or "31.012"\n5) Date code — if visible, usually format like "2019-01" or "MFG 2019"\n\nBRAND RULES:\n- If you see "AB" alone (without additional letters), the brand is "Allen-Bradley" — NOT "ABB"\n- If you see "A-B" or "A.B.", the brand is "Allen-Bradley"\n- If you see "Allen-Bradley" or "Allen Bradley", use "Allen-Bradley" (with hyphen)\n- If you see "Rockwell" or "Rockwell Automation", the brand is "Allen-Bradley"\n- "ABB" is a DIFFERENT company — only use ABB if you clearly see the full "ABB" name/logo\n\nYour ENTIRE response must be ONLY this single line, nothing else:\nBRAND: [name] | PART: [number] | SERIES: [letter] | FRN: [number]\n\nIf series, firmware, or date code are not visible, omit those fields.\nDo NOT include any explanations, descriptions, or additional text. ONLY the structured line above.' }
          ]
        }]
      })
    });

    const data = await response.json();
    res.status(200).json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}