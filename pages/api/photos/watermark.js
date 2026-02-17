// pages/api/photos/watermark.js
// Apply logo + contact info watermarks to product photos
// Uses pre-rendered PNG overlays (Vercel serverless has no font libraries)
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

    // === CONTACT INFO OVERLAY (bottom-right) ===
    // Use pre-rendered PNG (generated locally with font support)
    const contactPath = path.join(process.cwd(), 'public', 'watermarks', 'contact-info.png');
    if (fs.existsSync(contactPath)) {
      try {
        // Resize contact overlay to match image dimensions
        const contactBuffer = await sharp(contactPath)
          .resize(width, height, { fit: 'fill' })
          .png()
          .toBuffer();

        composites.push({
          input: contactBuffer,
          top: 0,
          left: 0
        });

        console.log(`Contact overlay: ${width}x${height}px (pre-rendered PNG)`);
      } catch (contactErr) {
        console.warn('Failed to process contact overlay, skipping:', contactErr.message);
      }
    } else {
      console.warn(`Contact overlay not found at ${contactPath}, skipping contact info`);
    }

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
