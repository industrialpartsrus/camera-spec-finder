// pages/api/ai/extract-specs.js
// Uses AI to extract product specifications from title and description
// Now category-aware - extracts different fields based on product type

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { title, description, brand, categoryId, productType, fieldsToExtract, extractPrompt } = req.body;

  if (!title) {
    return res.status(400).json({ error: 'Title is required' });
  }

  try {
    // Build the prompt for Claude based on product type
    const prompt = buildExtractionPrompt(title, description, brand, productType, fieldsToExtract, extractPrompt);
    
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
      productType: productType,
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

function buildExtractionPrompt(title, description, brand, productType, fieldsToExtract, extractPrompt) {
  // Default fields if none specified
  const fields = fieldsToExtract?.length > 0 
    ? fieldsToExtract.join(', ')
    : 'Brand, MPN, Model, Voltage, Type';

  // Product-type specific instructions
  const typeInstructions = getTypeInstructions(productType);

  return `You are an industrial equipment specification extractor specializing in ${productType || 'industrial equipment'}.

PRODUCT TITLE: ${title}

${description ? `DESCRIPTION: ${description.substring(0, 500)}` : ''}

${brand ? `KNOWN BRAND: ${brand}` : ''}

PRODUCT TYPE: ${productType || 'unknown'}

FIELDS TO EXTRACT: ${fields}

${typeInstructions}

EXTRACTION RULES:
1. Extract values ONLY from the information provided - NEVER guess or make up values
2. For part numbers/MPN, look for alphanumeric codes like "1756-L72", "CDQ2A40-100D", "6ES7 315-2AH14"
3. For measurements, include units (mm, V, A, kW, Nm, RPM, etc.)
4. If a value cannot be determined from the text, use null
5. Be precise - "24V" not "24 volts", "40mm" not "40 millimeters"

${extractPrompt ? `SPECIFIC EXTRACTION HINTS: Look for ${extractPrompt}` : ''}

Return ONLY a valid JSON object with the extracted values. Use null for fields you cannot determine.
Do not include any text before or after the JSON.

JSON response:`;
}

function getTypeInstructions(productType) {
  const instructions = {
    cylinder: `
PNEUMATIC CYLINDER EXTRACTION:
- Bore: Look for bore diameter (e.g., "40mm Bore", "50 MM Bore", "2 inch bore")
- Stroke: Look for stroke length (e.g., "100mm Stroke", "200 MM Stroke")
- Look for series names like CDQ2, CQ2, DSNU, DNC, ADN
- Port size often follows pattern like "1/4 inch", "M5", "G1/8"
- Action type: single-acting or double-acting`,
    
    valve: `
PNEUMATIC/SOLENOID VALVE EXTRACTION:
- Port Size: Look for NPT, BSPT, or metric sizes (1/4", 3/8", M5)
- Voltage: Coil voltage (24Vdc, 110Vac, 24V DC)
- Ways/Positions: Look for patterns like "5/2", "3/2", "4/2" meaning ways/positions
- Actuation: solenoid, pilot, manual, spring return`,
    
    plc: `
PLC/CONTROLLER EXTRACTION:
- Controller Platform: CompactLogix, ControlLogix, S7-300, S7-1500, etc.
- Look for memory size (64K, 2MB, etc.)
- I/O count or module type
- Communication protocols (Ethernet/IP, Profinet, DeviceNet)`,
    
    servo_motor: `
SERVO MOTOR EXTRACTION:
- Power: Look for kW or HP ratings
- Torque: Look for Nm (Newton-meters)
- RPM: Maximum speed
- Voltage: Usually 200V, 400V, or 480V
- Frame size or flange type`,
    
    servo_drive: `
SERVO DRIVE/AMPLIFIER EXTRACTION:
- Input voltage range
- Output current rating (continuous and peak)
- Power rating in kW
- Compatible motor series`,
    
    vfd: `
VFD/AC DRIVE EXTRACTION:
- HP or kW rating
- Input voltage (single or three phase)
- Output specifications
- Current rating`,
    
    power_supply: `
POWER SUPPLY EXTRACTION:
- Input voltage range (e.g., 100-240 VAC)
- Output voltage (usually 24VDC)
- Output current in Amps
- Power in Watts`,
    
    circuit_breaker: `
CIRCUIT BREAKER EXTRACTION:
- Current rating in Amps
- Voltage rating (AC or DC)
- Number of poles (1P, 2P, 3P)
- Trip curve type (B, C, D)`,
    
    sensor: `
SENSOR EXTRACTION:
- Sensing range or distance
- Output type (NPN, PNP, analog 4-20mA)
- Operating voltage
- Connection type (cable, M8, M12)`
  };

  return instructions[productType] || `
GENERAL EXTRACTION:
- Look for voltage, current, and power specifications
- Extract model/part numbers
- Identify the product type from descriptive words`;
}

function parseAIResponse(response) {
  try {
    // Try to extract JSON from the response
    // Handle cases where AI might include markdown code blocks
    let jsonStr = response;
    
    // Remove markdown code blocks if present
    jsonStr = jsonStr.replace(/```json\s*/g, '').replace(/```\s*/g, '');
    
    // Find the JSON object
    const jsonMatch = jsonStr.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      
      // Clean up null strings
      for (const key in parsed) {
        if (parsed[key] === 'null' || parsed[key] === 'N/A' || parsed[key] === 'n/a') {
          parsed[key] = null;
        }
      }
      
      return parsed;
    }
    return { error: 'Could not parse AI response' };
  } catch (err) {
    console.error('JSON parse error:', err);
    return { error: 'Invalid JSON in AI response', raw: response.substring(0, 200) };
  }
}
