// pages/api/photos/remove-bg.js
// Remove background from product photo using Remove.bg API
// Flattens transparency onto white background, returns JPEG

import sharp from 'sharp';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed. Use POST.' });
  }

  const { imageBase64, view } = req.body;

  if (!imageBase64) {
    return res.status(400).json({
      error: 'imageBase64 is required',
      success: false
    });
  }

  if (!process.env.REMOVE_BG_API_KEY) {
    return res.status(500).json({
      error: 'Remove.bg API key not configured',
      success: false
    });
  }

  try {
    console.log(`Processing background removal for ${view || 'photo'}...`);

    // Call Remove.bg API
    const formData = new FormData();
    formData.append('image_file_b64', imageBase64);
    formData.append('type', 'product'); // Optimized for product photography
    formData.append('format', 'png'); // PNG for transparency

    const response = await fetch('https://api.remove.bg/v1.0/removebg', {
      method: 'POST',
      headers: {
        'X-Api-Key': process.env.REMOVE_BG_API_KEY
      },
      body: formData
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Remove.bg API error: ${response.status}`, errorText);

      // Handle specific error cases
      if (response.status === 402) {
        return res.status(402).json({
          error: 'Remove.bg API quota exceeded. Please check your account.',
          success: false
        });
      }

      return res.status(response.status).json({
        error: `Remove.bg API error: ${response.status} ${errorText}`,
        success: false
      });
    }

    // Get the processed image as buffer (transparent PNG from remove.bg)
    const imageBuffer = await response.arrayBuffer();
    const transparentBuffer = Buffer.from(imageBuffer);

    // Flatten transparency onto WHITE background, convert to JPEG
    const whiteBackgroundBuffer = await sharp(transparentBuffer)
      .flatten({ background: { r: 255, g: 255, b: 255 } })
      .jpeg({ quality: 95 })
      .toBuffer();

    // Convert to base64
    const processedBase64 = whiteBackgroundBuffer.toString('base64');

    console.log(`Background removed for ${view || 'photo'} (${Math.round(processedBase64.length / 1024)}KB JPEG with white background)`);

    return res.status(200).json({
      success: true,
      processedBase64: processedBase64,
      dataUrl: `data:image/jpeg;base64,${processedBase64}`
    });
  } catch (error) {
    console.error('Background removal error:', error);
    return res.status(500).json({
      error: 'Failed to remove background',
      details: error.message,
      success: false
    });
  }
}
