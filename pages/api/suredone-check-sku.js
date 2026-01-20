// Check if a SKU already exists in SureDone
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { sku } = req.body;

  const SUREDONE_USER = process.env.SUREDONE_USER;
  const SUREDONE_PASS = process.env.SUREDONE_PASS;
  const SUREDONE_URL = process.env.SUREDONE_URL || 'https://api.suredone.com';

  try {
    const response = await fetch(`${SUREDONE_URL}/products/${sku}`, {
      method: 'GET',
      headers: {
        'Authorization': 'Basic ' + Buffer.from(`${SUREDONE_USER}:${SUREDONE_PASS}`).toString('base64')
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
