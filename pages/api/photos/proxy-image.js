// pages/api/photos/proxy-image.js
// Server-side proxy for images that don't support CORS
// Fetches any image URL and returns it as a base64 data URL
// Used for editing SureDone-hosted images (assets.suredone.com has no CORS headers)

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed. Use GET.' });
  }

  const { url } = req.query;

  if (!url) {
    return res.status(400).json({ error: 'URL required' });
  }

  try {
    console.log('Proxying image:', url);

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch: ${response.status}`);
    }

    const buffer = Buffer.from(await response.arrayBuffer());
    const contentType = response.headers.get('content-type') || 'image/jpeg';
    const base64 = buffer.toString('base64');

    console.log(`Proxied ${buffer.length} bytes as ${contentType}`);

    return res.status(200).json({
      success: true,
      dataUrl: `data:${contentType};base64,${base64}`
    });
  } catch (error) {
    console.error('Image proxy error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to proxy image',
      details: error.message
    });
  }
}
