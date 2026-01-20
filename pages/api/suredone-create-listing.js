export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { product } = req.body;

  // SureDone API v3 credentials from environment variables
  const SUREDONE_USER = process.env.SUREDONE_USER;
  const SUREDONE_TOKEN = process.env.SUREDONE_TOKEN;
  const SUREDONE_URL = process.env.SUREDONE_URL || 'https://api.suredone.com/v3';

  if (!SUREDONE_USER || !SUREDONE_TOKEN) {
    return res.status(500).json({ error: 'SureDone credentials not configured' });
  }

  try {
    // Create product in SureDone using v3 API
    // Docs: https://suredone.com/resources/developers/api-v3/
    
    const sku = product.sku || `${product.brand}-${product.partNumber}`.replace(/\s+/g, '-');
    
    // Build the product data object
    const productData = {
      sku: sku,
      title: product.title,
      longdescription: product.description,
      price: product.price || '0.00',
      stock: product.stock || '1',
      condition: 'New',
      // Add meta description
      metadescription: product.metaDescription || '',
      // Add keywords
      keywords: product.metaKeywords || '',
      // Brand and MPN
      brand: product.brand,
      mpn: product.partNumber,
    };

    // Add eBay-specific fields if category is provided
    if (product.ebayCategory) {
      productData.ebaycategory = product.ebayCategory;
      productData.ebaytitle = product.title;
    }

    // Add specifications as custom fields
    if (product.specifications && product.specifications.length > 0) {
      product.specifications.forEach((spec, index) => {
        productData[`customfield${index + 1}`] = spec;
      });
    }

    console.log('Sending to SureDone:', sku);

    const response = await fetch(`${SUREDONE_URL}/products`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Auth-User': SUREDONE_USER,
        'X-Auth-Token': SUREDONE_TOKEN
      },
      body: JSON.stringify(productData)
    });

    console.log('SureDone response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('SureDone error:', errorText);
      return res.status(response.status).json({ 
        success: false,
        error: `SureDone API error: ${response.status}`,
        details: errorText.substring(0, 500)
      });
    }

    const data = await response.json();
    console.log('SureDone response:', data);
    
    // v3 API returns different success format
    if (data.result === 'success' || data.sku) {
      res.status(200).json({ 
        success: true, 
        message: 'Product created in SureDone',
        sku: data.sku || sku
      });
    } else {
      res.status(400).json({ 
        success: false, 
        error: data.message || data.error || 'SureDone API error',
        details: JSON.stringify(data)
      });
    }
    
  } catch (error) {
    console.error('SureDone integration error:', error);
    res.status(500).json({ 
      success: false,
      error: error.message,
      stack: error.stack 
    });
  }
}