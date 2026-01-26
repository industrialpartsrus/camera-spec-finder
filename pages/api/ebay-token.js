// pages/api/ebay-token.js
// Automatically generates and caches eBay Application OAuth tokens
// Application tokens are used for public APIs like Taxonomy (no user consent needed)

let cachedToken = null;
let tokenExpiry = null;

export async function getEbayToken() {
  // Check if we have a valid cached token (with 5 min buffer)
  const now = Date.now();
  if (cachedToken && tokenExpiry && (tokenExpiry - now) > 300000) {
    console.log('Using cached eBay token, expires in', Math.round((tokenExpiry - now) / 60000), 'minutes');
    return cachedToken;
  }

  console.log('Generating new eBay Application token...');

  const clientId = process.env.EBAY_CLIENT_ID;
  const clientSecret = process.env.EBAY_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error('eBay credentials not configured. Set EBAY_CLIENT_ID and EBAY_CLIENT_SECRET in environment variables.');
  }

  // Create Base64 encoded credentials
  const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');

  try {
    const response = await fetch('https://api.ebay.com/identity/v1/oauth2/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${credentials}`
      },
      body: new URLSearchParams({
        'grant_type': 'client_credentials',
        'scope': 'https://api.ebay.com/oauth/api_scope'
      }).toString()
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('eBay token error:', response.status, errorText);
      throw new Error(`eBay token request failed: ${response.status} - ${errorText}`);
    }

    const data = await response.json();

    // Cache the token
    cachedToken = data.access_token;
    // Set expiry (expires_in is in seconds, convert to ms, subtract 5 min buffer)
    tokenExpiry = now + (data.expires_in * 1000) - 300000;

    console.log('New eBay token generated, expires in', data.expires_in, 'seconds');

    return cachedToken;

  } catch (error) {
    console.error('Failed to get eBay token:', error);
    throw error;
  }
}

// API endpoint to manually check/get token (for debugging)
export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const token = await getEbayToken();

    res.status(200).json({
      success: true,
      message: 'eBay token is valid',
      tokenPreview: token.substring(0, 20) + '...',
      expiresIn: tokenExpiry ? Math.round((tokenExpiry - Date.now()) / 60000) + ' minutes' : 'unknown'
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
}
