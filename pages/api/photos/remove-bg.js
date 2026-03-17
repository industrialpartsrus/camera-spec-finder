// pages/api/photos/remove-bg.js
// Remove background from product photo using self-hosted rembg server
// Falls back to Remove.bg API if rembg server is down

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '20mb',
    },
  },
  maxDuration: 30,
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { imageBase64, background, autoCrop, scale, view } = req.body;

  if (!imageBase64) {
    return res.status(400).json({ error: 'imageBase64 required', success: false });
  }

  const REMBG_URL = process.env.REMBG_SERVER_URL || 'http://104.131.11.17:7000';

  // Log server status on first call (cached)
  if (!global._rembgChecked) {
    try {
      const healthRes = await fetch(`${REMBG_URL}/health`);
      const health = await healthRes.json();
      console.log(`[remove-bg] Server health: ${JSON.stringify(health)}`);
      global._rembgChecked = true;
    } catch (e) {
      console.warn(`[remove-bg] Health check failed: ${e.message}`);
    }
  }

  try {
    console.log(`[remove-bg] Sending image to rembg server for view: ${view || 'unknown'}`);

    // Convert base64 to raw image buffer
    const imageBuffer = Buffer.from(imageBase64, 'base64');

    console.log(`[remove-bg] Sending ${(imageBuffer.length / 1024).toFixed(0)}KB to rembg server...`);

    // Send raw bytes to the simple endpoint
    const response = await fetch(`${REMBG_URL}/remove-bg-raw`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/octet-stream',
      },
      body: imageBuffer,
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[remove-bg] Server error: ${response.status} ${errorText}`);
      throw new Error(`rembg server returned ${response.status}`);
    }

    const data = await response.json();

    if (!data.success) {
      throw new Error(data.error || 'Background removal failed');
    }

    console.log(`[remove-bg] Success: ${data.width}x${data.height} ${data.format}`);

    const sharp = require('sharp');

    // Decode the base64 PNG from rembg server
    let resultBuffer = Buffer.from(data.image_base64, 'base64');
    console.log('[remove-bg] Raw result: ' + (resultBuffer.length / 1024 / 1024).toFixed(1) + 'MB');

    // Resize to max 1600px (our eBay output size) to stay under
    // Vercel's 4.5MB response limit
    const metadata = await sharp(resultBuffer).metadata();
    const maxDim = Math.max(metadata.width || 0, metadata.height || 0);

    if (maxDim > 1600) {
      resultBuffer = await sharp(resultBuffer)
        .resize(1600, 1600, { fit: 'inside', withoutEnlargement: true })
        .png({ compressionLevel: 8 })
        .toBuffer();
      console.log('[remove-bg] Resized: ' + (resultBuffer.length / 1024 / 1024).toFixed(1) + 'MB');
    }

    // If STILL over 3MB as PNG, convert to JPEG
    if (resultBuffer.length > 3 * 1024 * 1024) {
      resultBuffer = await sharp(resultBuffer)
        .flatten({ background: { r: 255, g: 255, b: 255 } })
        .jpeg({ quality: 85 })
        .toBuffer();
      console.log('[remove-bg] Compressed to JPEG: ' + (resultBuffer.length / 1024 / 1024).toFixed(1) + 'MB');

      return res.status(200).json({
        success: true,
        dataUrl: 'data:image/jpeg;base64,' + resultBuffer.toString('base64'),
      });
    }

    // If PhotoEditor requests special processing (auto-crop, scale,
    // custom background), apply it with sharp
    if (autoCrop || (scale && scale !== 1) || (background && background !== 'white' && background !== '#ffffff')) {
      try {
        // Determine background color
        let bgColor = { r: 255, g: 255, b: 255, alpha: 1 };
        if (background === 'transparent') {
          bgColor = { r: 0, g: 0, b: 0, alpha: 0 };
        } else if (background === '#f5f5f5' || background === 'lightgray') {
          bgColor = { r: 245, g: 245, b: 245, alpha: 1 };
        }

        if (autoCrop) {
          // Trim whitespace, then center on square canvas
          const trimmed = await sharp(resultBuffer)
            .trim({ threshold: 10 })
            .toBuffer({ resolveWithObject: true });

          const padding = Math.round(
            Math.max(trimmed.info.width, trimmed.info.height) * 0.05
          );
          const outputSize = Math.max(
            trimmed.info.width, trimmed.info.height
          ) + (padding * 2);

          let productBuffer = trimmed.data;

          // Scale product if requested
          if (scale && scale !== 1) {
            const scaledW = Math.round(trimmed.info.width * scale);
            const scaledH = Math.round(trimmed.info.height * scale);
            productBuffer = await sharp(trimmed.data)
              .resize(scaledW, scaledH)
              .toBuffer();
          }

          // Create square canvas with centered product
          const canvas = await sharp({
            create: {
              width: outputSize,
              height: outputSize,
              channels: 4,
              background: bgColor,
            }
          }).png().toBuffer();

          const finalBuffer = await sharp(canvas)
            .composite([{ input: productBuffer, gravity: 'centre' }])
            .png()
            .toBuffer();

          resultBuffer = finalBuffer;
        }
      } catch (sharpErr) {
        console.warn('[remove-bg] Sharp processing failed, returning raw result:', sharpErr.message);
      }
    }

    return res.status(200).json({
      success: true,
      dataUrl: 'data:image/png;base64,' + resultBuffer.toString('base64'),
    });

  } catch (error) {
    console.error('[remove-bg] Error:', error.message);

    // Fallback to Remove.bg API if rembg server is down
    if (process.env.REMOVE_BG_API_KEY) {
      console.log('[remove-bg] Falling back to Remove.bg API...');
      try {
        const removeBgRes = await fetch('https://api.remove.bg/v1.0/removebg', {
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

        if (removeBgRes.ok) {
          const buf = Buffer.from(await removeBgRes.arrayBuffer());
          console.log('[remove-bg] Remove.bg fallback succeeded');
          return res.status(200).json({
            success: true,
            dataUrl: `data:image/png;base64,${buf.toString('base64')}`,
            fallback: true,
          });
        }
      } catch (fbErr) {
        console.error('[remove-bg] Remove.bg fallback also failed:', fbErr.message);
      }
    }

    return res.status(500).json({
      success: false,
      error: error.message || 'Background removal failed',
    });
  }
}
