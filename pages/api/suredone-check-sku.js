// Check if a SKU already exists in SureDone
import { getSureDoneCredentials } from '../../lib/suredone-config';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { sku } = req.body;

  let SUREDONE_USER, SUREDONE_TOKEN, SUREDONE_URL;
  try {
    const creds = getSureDoneCredentials();
    SUREDONE_USER = creds.user;
    SUREDONE_TOKEN = creds.token;
    SUREDONE_URL = creds.baseUrl;
  } catch (e) {
    return res.status(500).json({ error: 'SureDone credentials not configured' });
  }

  try {
    const response = await fetch(`${SUREDONE_URL}/search/items/${encodeURIComponent(`guid:=${sku}`)}`, {
      method: 'GET',
      headers: {
        'X-Auth-User': SUREDONE_USER,
        'X-Auth-Token': SUREDONE_TOKEN,
        'Content-Type': 'application/json',
      }
    });

    const data = await response.json();
    
    res.status(200).json({ 
      exists: data.result === 'success',
      product: data.result === 'success' ? data : null
    });
    
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}
