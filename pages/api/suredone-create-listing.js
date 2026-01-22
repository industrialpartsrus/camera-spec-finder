export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { product } = req.body;

  // SureDone API credentials from environment variables
  const SUREDONE_USER = process.env.SUREDONE_USER;
  const SUREDONE_PASS = process.env.SUREDONE_PASS;
  const SUREDONE_URL = process.env.SUREDONE_URL || 'https://api.suredone.com';

  try {
    // Create product in SureDone
    // Docs: https://suredone.com/help/api/
    
    const formData = new URLSearchParams();
    formData.append('action', 'add');
    formData.append('sku', product.sku || `${product.brand}-${product.partNumber}`);
    formData.append('title', product.title);
    formData.append('longdescription', product.description);
    formData.append('price', product.price || '0.00');
    formData.append('stock', product.stock || '1');
    
    // Add eBay-specific fields
    formData.append('ebaycategory', product.ebayCategory);
    formData.append('ebaytitle', product.title);
    
    // Add specifications as custom fields
    if (product.specifications && product.specifications.length > 0) {
      product.specifications.forEach((spec, index) => {
        formData.append(`spec${index + 1}`, spec);
      });
    }
    
    // Meta keywords
    if (product.metaKeywords) {
      formData.append('keywords', product.metaKeywords);
    }

    const response = await fetch(`${SUREDONE_URL}/products`, {
      method: 'POST',
      headers: {
        'Authorization': 'Basic ' + Buffer.from(`${SUREDONE_USER}:${SUREDONE_PASS}`).toString('base64'),
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: formData.toString()
    });

    const data = await response.json();
    
    if (data.result === 'success') {
      res.status(200).json({ 
        success: true, 
        message: 'Product created in SureDone',
        sku: data.sku 
      });
    } else {
      res.status(400).json({ 
        success: false, 
        error: data.message || 'SureDone API error' 
      });
    }
    
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}
