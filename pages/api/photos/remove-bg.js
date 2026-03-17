// pages/api/photos/remove-bg.js
// Remove background from product photo using self-hosted rembg server
// Falls back to Remove.bg API if rembg server is down

const sharp = require('sharp');

export const config = {
  api: { bodyParser: { sizeLimit: '20mb' } },
  maxDuration: 30,
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { imageBase64 } = req.body;

  if (!imageBase64) {
    return res.status(400).json({ error: 'imageBase64 required' });
  }

  const REMBG_URL = process.env.REMBG_SERVER_URL || 'http://104.131.11.17:7000';

  try {
    // Health check on first call
    if (!global._rembgChecked) {
      try {
        const h = await fetch(`${REMBG_URL}/health`);
        const hd = await h.json();
        console.log('[remove-bg] Server health:', JSON.stringify(hd));
        global._rembgChecked = true;
      } catch (e) {
        console.warn('[remove-bg] Health check failed:', e.message);
      }
    }

    // Send raw bytes to rembg server
    const imageBuffer = Buffer.from(imageBase64, 'base64');
    console.log(`[remove-bg] Sending ${(imageBuffer.length / 1024).toFixed(0)}KB to rembg server...`);

    const response = await fetch(`${REMBG_URL}/remove-bg-raw`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/octet-stream' },
      body: imageBuffer,
    });

    if (!response.ok) {
      throw new Error(`rembg server returned ${response.status}`);
    }

    const data = await response.json();
    if (!data.success) {
      throw new Error(data.error || 'Background removal failed');
    }

    console.log(`[remove-bg] Success: ${data.width}x${data.height} ${data.format}`);

    // Decode result
    let resultBuffer = Buffer.from(data.image_base64, 'base64');
    console.log(`[remove-bg] Raw result: ${(resultBuffer.length / 1024 / 1024).toFixed(1)}MB`);

    // Resize if over 1600px to stay under Vercel response limit
    const maxDim = Math.max(data.width || 0, data.height || 0);
    if (maxDim > 1600) {
      resultBuffer = await sharp(resultBuffer)
        .resize(1600, 1600, { fit: 'inside', withoutEnlargement: true })
        .png({ compressionLevel: 8 })
        .toBuffer();
      console.log(`[remove-bg] Resized: ${(resultBuffer.length / 1024 / 1024).toFixed(1)}MB`);
    }

    // If still over 3MB, compress to JPEG
    if (resultBuffer.length > 3 * 1024 * 1024) {
      resultBuffer = await sharp(resultBuffer)
        .flatten({ background: { r: 255, g: 255, b: 255 } })
        .jpeg({ quality: 90 })
        .toBuffer();
      console.log(`[remove-bg] Compressed to JPEG: ${(resultBuffer.length / 1024 / 1024).toFixed(1)}MB`);
      return res.status(200).json({
        success: true,
        dataUrl: 'data:image/jpeg;base64,' + resultBuffer.toString('base64'),
      });
    }

    return res.status(200).json({
      success: true,
      dataUrl: 'data:image/png;base64,' + resultBuffer.toString('base64'),
    });

  } catch (error) {
    console.error('[remove-bg] Error:', error.message);

    // Fallback to Remove.bg API
    if (process.env.REMOVE_BG_API_KEY) {
      console.log('[remove-bg] Falling back to Remove.bg API...');
      try {
        const fbRes = await fetch('https://api.remove.bg/v1.0/removebg', {
          method: 'POST',
          headers: {
            'X-Api-Key': process.env.REMOVE_BG_API_KEY,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            image_base64: imageBase64,
            size: 'auto',
            format: 'png',
          }),
        });
        if (fbRes.ok) {
          const buf = Buffer.from(await fbRes.arrayBuffer());
          return res.status(200).json({
            success: true,
            dataUrl: 'data:image/png;base64,' + buf.toString('base64'),
            fallback: true,
          });
        }
      } catch (fbErr) {
        console.error('[remove-bg] Fallback failed:', fbErr.message);
      }
    }

    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
}
