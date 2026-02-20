// pages/api/photos/remove-bg.js
// Remove background from product photo using Remove.bg API
// Flattens transparency onto white background, returns JPEG

import sharp from 'sharp';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed. Use POST.' });
  }

  const {
    imageBase64,
    view,
    // Enhanced options for auto-crop + center + scale
    autoCrop = true,
    scale = '80%',
    bgColor = 'white'
  } = req.body;

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
    console.log(`Processing background removal for ${view || 'photo'} (crop: ${autoCrop}, scale: ${scale}, bg: ${bgColor})...`);

    // Call Remove.bg API with enhanced parameters
    const formData = new FormData();
    formData.append('image_file_b64', imageBase64);
    formData.append('type', 'product'); // Optimized for product photography
    formData.append('size', 'full'); // Max resolution (up to 50MP)

    // Auto-crop and center options
    if (autoCrop) {
      formData.append('crop', 'true');
      formData.append('crop_margin', '10%'); // Small margin around subject
      formData.append('scale', scale); // Subject fills X% of frame
      formData.append('position', 'center'); // Center the product
    }

    // Background color handling
    if (bgColor === 'transparent') {
      formData.append('format', 'png'); // PNG for transparency
    } else {
      formData.append('format', 'png'); // Still get PNG from API
      formData.append('bg_color', bgColor); // white, or hex like 'f0f0f0'
    }

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

    // Get the processed image as buffer (PNG from remove.bg, possibly with bg_color already applied)
    const imageBuffer = await response.arrayBuffer();
    const processedBuffer = Buffer.from(imageBuffer);

    // If transparent was requested, return PNG as-is
    // Otherwise, flatten to JPEG (Remove.bg already applied bg_color, but ensure solid background)
    let finalBuffer;
    let mimeType;

    if (bgColor === 'transparent') {
      // Return PNG with transparency
      finalBuffer = processedBuffer;
      mimeType = 'image/png';
    } else {
      // Flatten to solid background and convert to JPEG for smaller file size
      // Remove.bg should have already applied bg_color, but we flatten to be sure
      const bgRgb = bgColor === 'white'
        ? { r: 255, g: 255, b: 255 }
        : bgColor === 'lightgray'
        ? { r: 240, g: 240, b: 240 }
        : { r: 255, g: 255, b: 255 }; // default white

      finalBuffer = await sharp(processedBuffer)
        .flatten({ background: bgRgb })
        .jpeg({ quality: 95 })
        .toBuffer();
      mimeType = 'image/jpeg';
    }

    // Convert to base64
    const processedBase64 = finalBuffer.toString('base64');

    console.log(`Background removed for ${view || 'photo'} (${Math.round(processedBase64.length / 1024)}KB ${mimeType} with ${bgColor} background)`);

    return res.status(200).json({
      success: true,
      processedBase64: processedBase64,
      dataUrl: `data:${mimeType};base64,${processedBase64}`
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
