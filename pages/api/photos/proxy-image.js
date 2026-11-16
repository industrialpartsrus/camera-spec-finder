// pages/api/photos/proxy-image.js
// Server-side proxy for images that don't support CORS
// (assets.suredone.com has no CORS headers, so the editor's canvas needs this).
// Returns the image bytes (not JSON/base64).
//
// SureDone URLs: media-pics/ is SureDone's compressed small copy (IP14820: 360x480). For editing
// we first try the same file under media-photos/ (the full-size original) and
// fall back to media-pics/ only if the original is missing (404, or the 403
// that SureDone's storage returns for a missing file). What PLB stores in
// SureDone's media fields is not changed.
//
// Size: originals can be 3-6 MB, and a Vercel Function response is capped at
// 4.5 MB. Anything over MAX_BYTES is re-encoded as JPEG at the SAME pixel size
// (lower quality) until it fits, so the editor still gets full resolution.

import sharp from 'sharp';

export const config = {
  api: { responseLimit: false },
};

const MAX_BYTES = 4 * 1024 * 1024;
const SUREDONE_PICS = /^(https:\/\/assets\.suredone\.com\/[^/]+\/)media-pics\/(.+)$/i;

async function fetchImage(url) {
  const response = await fetch(url);
  if (!response.ok) {
    const err = new Error(`Failed to fetch: ${response.status}`);
    err.status = response.status;
    throw err;
  }
  return {
    buffer: Buffer.from(await response.arrayBuffer()),
    contentType: response.headers.get('content-type') || 'image/jpeg',
  };
}

// Same pixel dimensions, lower JPEG quality, until the file fits.
// rotate() bakes in the EXIF orientation, since re-encoding drops the metadata.
async function shrinkToFit(buffer) {
  for (const quality of [88, 80, 72, 64, 56]) {
    const out = await sharp(buffer).rotate().jpeg({ quality, mozjpeg: true }).toBuffer();
    if (out.length <= MAX_BYTES) return { buffer: out, quality };
  }
  throw new Error('Image is too large to send to the editor even after compression');
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed. Use GET.' });
  }

  const { url } = req.query;

  if (!url) {
    return res.status(400).json({ error: 'URL required' });
  }

  try {
    let source = url;
    let image;
    const m = String(url).match(SUREDONE_PICS);
    if (m) {
      const original = `${m[1]}media-photos/${m[2]}`;
      try {
        image = await fetchImage(original);
        source = original;
      } catch (e) {
        // SureDone's storage answers 403 (not 404) for a file that doesn't exist
        if (e.status !== 404 && e.status !== 403) throw e;
        console.log(`Full-size original not found (${e.status}), using media-pics:`, url);
      }
    }
    if (!image) image = await fetchImage(url);

    let { buffer, contentType } = image;
    const fetchedBytes = buffer.length;
    if (buffer.length > MAX_BYTES) {
      const shrunk = await shrinkToFit(buffer);
      buffer = shrunk.buffer;
      contentType = 'image/jpeg';
      console.log(`Re-encoded ${fetchedBytes} -> ${buffer.length} bytes (quality ${shrunk.quality}, same dimensions)`);
    }

    console.log(`Proxied ${source} (${buffer.length} bytes, ${contentType})`);

    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Length', buffer.length);
    res.setHeader('Cache-Control', 'private, max-age=300');
    res.setHeader('X-Proxy-Source', source);
    return res.status(200).send(buffer);
  } catch (error) {
    console.error('Image proxy error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to proxy image',
      details: error.message
    });
  }
}
