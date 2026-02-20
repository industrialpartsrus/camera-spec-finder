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
    // Enhanced options for auto-crop + center + scale + templates
    background = 'white',  // 'white', 'transparent', 'lightgray', 'warehouse', 'studio', 'industrial'
    autoCrop = true,
    scale = 80  // 50-95 as integer
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
    console.log(`Processing background removal for ${view || 'photo'} (crop: ${autoCrop}, scale: ${scale}%, bg: ${background})...`);

    // Call Remove.bg API with enhanced parameters
    const formData = new FormData();
    formData.append('image_file_b64', imageBase64);
    formData.append('type', 'product'); // Optimized for product photography
    formData.append('size', 'full'); // Max resolution (up to 50MP)

    // Auto-crop and center options
    if (autoCrop) {
      formData.append('crop', 'true');
      formData.append('crop_margin', '10%'); // Small margin around subject
      formData.append('scale', `${scale}%`); // Subject fills X% of frame
      formData.append('position', 'center'); // Center the product
    }

    // Background handling: solid colors, transparent, or custom templates
    const templateBackgrounds = ['warehouse', 'studio', 'industrial'];

    if (background === 'transparent') {
      // Transparent PNG
      formData.append('format', 'png');
    } else if (background === 'white') {
      // White background
      formData.append('format', 'png');
      formData.append('bg_color', 'white');
    } else if (background === 'lightgray') {
      // Light gray background
      formData.append('format', 'png');
      formData.append('bg_color', 'f5f5f5');
    } else if (templateBackgrounds.includes(background)) {
      // Custom background template using bg_image_url
      const templateMap = {
        'warehouse': '/bg-templates/warehouse-floor.jpg',
        'studio': '/bg-templates/studio-gradient.jpg',
        'industrial': '/bg-templates/industrial.jpg',
      };

      // Remove.bg needs a full URL, not a relative path
      const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://camera-spec-finder.vercel.app';
      const bgImageUrl = baseUrl + templateMap[background];

      formData.append('format', 'png');
      formData.append('bg_image_url', bgImageUrl);
      console.log(`Using custom background template: ${bgImageUrl}`);
    } else {
      // Fallback to white
      formData.append('format', 'png');
      formData.append('bg_color', 'white');
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

    // Get the processed image as buffer (PNG from remove.bg, possibly with bg_color or bg_image_url already applied)
    const imageBuffer = await response.arrayBuffer();
    const processedBuffer = Buffer.from(imageBuffer);

    // Determine output format based on background selection
    let finalBuffer;
    let mimeType;

    if (background === 'transparent') {
      // Return PNG with transparency (no flattening)
      finalBuffer = processedBuffer;
      mimeType = 'image/png';
    } else if (['warehouse', 'studio', 'industrial'].includes(background)) {
      // Custom template backgrounds - Remove.bg already composited, return as PNG
      // Convert to JPEG for smaller file size (templates are already opaque)
      finalBuffer = await sharp(processedBuffer)
        .jpeg({ quality: 95 })
        .toBuffer();
      mimeType = 'image/jpeg';
    } else {
      // Solid color backgrounds (white, lightgray) - flatten to JPEG for smaller file size
      // Remove.bg should have already applied bg_color, but we flatten to ensure solid background
      const bgRgb = background === 'white'
        ? { r: 255, g: 255, b: 255 }
        : background === 'lightgray'
        ? { r: 245, g: 245, b: 245 }
        : { r: 255, g: 255, b: 255 }; // default white

      finalBuffer = await sharp(processedBuffer)
        .flatten({ background: bgRgb })
        .jpeg({ quality: 95 })
        .toBuffer();
      mimeType = 'image/jpeg';
    }

    // Convert to base64
    const processedBase64 = finalBuffer.toString('base64');

    console.log(`Background removed for ${view || 'photo'} (${Math.round(processedBase64.length / 1024)}KB ${mimeType} with ${background} background)`);

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
