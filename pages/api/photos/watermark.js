// pages/api/photos/watermark.js
// Apply logo + contact info watermarks to product photos
// Caches watermarked versions in Firebase Storage for fast repeat publishes

import sharp from 'sharp';
import { storage } from '../../../firebase';
import { ref, uploadBytes, getDownloadURL, getMetadata } from 'firebase/storage';
import fs from 'fs';
import path from 'path';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed. Use POST.' });
  }

  const { imageUrl, sku, view } = req.body;

  if (!imageUrl || !sku || !view) {
    return res.status(400).json({
      success: false,
      error: 'Missing required fields: imageUrl, sku, view'
    });
  }

  try {
    // === CHECK CACHE FIRST ===
    const watermarkedPath = `photos/${sku}/${view}_watermarked.jpg`;
    const watermarkedRef = ref(storage, watermarkedPath);

    try {
      await getMetadata(watermarkedRef);
      // File exists - return cached version
      const cachedUrl = await getDownloadURL(watermarkedRef);
      console.log(`Watermark cache HIT: ${watermarkedPath}`);
      return res.status(200).json({
        success: true,
        watermarkedUrl: cachedUrl,
        cached: true
      });
    } catch (err) {
      // File doesn't exist - proceed with watermarking
      console.log(`Watermark cache MISS: ${watermarkedPath}, creating new watermark`);
    }

    // === DOWNLOAD SOURCE IMAGE ===
    console.log(`Downloading source image: ${imageUrl.substring(0, 60)}...`);
    const imageResponse = await fetch(imageUrl);
    if (!imageResponse.ok) {
      throw new Error(`Failed to download image: ${imageResponse.status}`);
    }
    const imageBuffer = Buffer.from(await imageResponse.arrayBuffer());

    // === GET IMAGE DIMENSIONS ===
    const imageMetadata = await sharp(imageBuffer).metadata();
    const { width, height } = imageMetadata;
    console.log(`Image dimensions: ${width}x${height}`);

    // === PREPARE COMPOSITES ===
    const composites = [];

    // === LOGO OVERLAY (top-left) ===
    const logoPath = path.join(process.cwd(), 'public', 'watermarks', 'logo.png');
    if (fs.existsSync(logoPath)) {
      try {
        // Resize logo to ~15% of image width (proportional)
        const logoWidth = Math.round(width * 0.15);
        const logoBuffer = await sharp(logoPath)
          .resize(logoWidth, null, { fit: 'inside' })
          .png()
          .toBuffer();

        // Get resized logo dimensions
        const logoMetadata = await sharp(logoBuffer).metadata();

        // Apply opacity
        const logoWithOpacity = await sharp(logoBuffer)
          .composite([{
            input: Buffer.from([255, 255, 255, Math.round(255 * 0.85)]), // 85% opacity
            raw: {
              width: 1,
              height: 1,
              channels: 4
            },
            tile: true,
            blend: 'dest-in'
          }])
          .toBuffer();

        composites.push({
          input: logoWithOpacity,
          top: 20,
          left: 20
        });

        console.log(`Logo overlay: ${logoWidth}x${logoMetadata.height}px at (20, 20)`);
      } catch (logoErr) {
        console.warn('Failed to process logo, skipping logo overlay:', logoErr.message);
      }
    } else {
      console.warn(`Logo file not found at ${logoPath}, skipping logo overlay`);
    }

    // === CONTACT INFO TEXT (bottom-right) ===
    const phoneFontSize = Math.round(height * 0.035);
    const emailFontSize = Math.round(height * 0.028);
    const textPadding = 20;

    const textSvg = `
      <svg width="${width}" height="${height}">
        <defs>
          <filter id="shadow">
            <feDropShadow dx="2" dy="2" stdDeviation="4" flood-color="rgba(0,0,0,0.8)"/>
          </filter>
        </defs>
        <text
          x="${width - textPadding}"
          y="${height - 50}"
          text-anchor="end"
          font-family="Arial, sans-serif"
          font-weight="bold"
          font-size="${phoneFontSize}px"
          fill="white"
          filter="url(#shadow)">
          1-800-380-4913
        </text>
        <text
          x="${width - textPadding}"
          y="${height - 15}"
          text-anchor="end"
          font-family="Arial, sans-serif"
          font-size="${emailFontSize}px"
          fill="white"
          filter="url(#shadow)">
          SALES@INDUSTRIALPARTSRUS.COM
        </text>
      </svg>
    `;

    composites.push({
      input: Buffer.from(textSvg),
      top: 0,
      left: 0
    });

    console.log(`Contact text overlay: phone ${phoneFontSize}px, email ${emailFontSize}px`);

    // === COMPOSITE AND SAVE ===
    const watermarkedBuffer = await sharp(imageBuffer)
      .composite(composites)
      .jpeg({ quality: 95 })
      .toBuffer();

    // Upload to Firebase Storage
    await uploadBytes(watermarkedRef, watermarkedBuffer, {
      contentType: 'image/jpeg',
      customMetadata: {
        sku: sku,
        view: view,
        watermarked: 'true',
        originalUrl: imageUrl
      }
    });

    const downloadUrl = await getDownloadURL(watermarkedRef);
    console.log(`Watermarked photo saved: ${watermarkedPath} (${Math.round(watermarkedBuffer.length / 1024)}KB)`);

    return res.status(200).json({
      success: true,
      watermarkedUrl: downloadUrl,
      cached: false
    });

  } catch (error) {
    console.error('Watermark error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to apply watermark',
      details: error.message
    });
  }
}
