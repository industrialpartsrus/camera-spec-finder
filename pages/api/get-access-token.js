// pages/api/ebay/get-access-token.js
// Helper to get eBay OAuth2 access token using Client Credentials flow
// This token is used for public APIs like Taxonomy (not user-specific data)

let cachedToken = null;
let tokenExpiry = null;

export async function getEbayAccessToken() {
  // Return cached token if still valid (with 5 min buffer)
  if (cachedToken && tokenExpiry && Date.now() < tokenExpiry - 300000) {
    return cachedToken;
  }

  const clientId = process.env.EBAY_CLIENT_ID;
  const clientSecret = process.env.EBAY_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error('eBay API credentials not configured');
  }

  // Base64 encode credentials
  const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');

  const response = await fetch('https://api.ebay.com/identity/v1/oauth2/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Authorization': `Basic ${credentials}`
    },
    body: 'grant_type=client_credentials&scope=https://api.ebay.com/oauth/api_scope'
  });

  if (!response.ok) {
    const error = await response.text();
    console.error('eBay OAuth error:', error);
    throw new Error(`Failed to get eBay access token: ${response.status}`);
  }

  const data = await response.json();
  
  // Cache the token
  cachedToken = data.access_token;
  tokenExpiry = Date.now() + (data.expires_in * 1000);
  
  console.log('Got new eBay access token, expires in', data.expires_in, 'seconds');
  
  return cachedToken;
}

// API endpoint to test token generation
export default async function handler(req, res) {
  try {
    const token = await getEbayAccessToken();
    res.status(200).json({ 
      success: true, 
      message: 'Token retrieved successfully',
      tokenPreview: token.substring(0, 20) + '...'
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
}
