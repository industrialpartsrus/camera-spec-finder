export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { product } = req.body;

  // SureDone API credentials from environment variables
  const SUREDONE_USER = process.env.SUREDONE_USER;
  const SUREDONE_TOKEN = process.env.SUREDONE_TOKEN;
  const SUREDONE_URL = process.env.SUREDONE_URL || 'https://app.suredone.com/v1';

  if (!SUREDONE_USER || !SUREDONE_TOKEN) {
    return res.status(500).json({ error: 'SureDone credentials not configured' });
  }

  try {
    // Create product in SureDone using v1 API editor endpoint
    // Docs: https://app.suredone.com/v1/editor/{type}/{action}
    
    // Generate a clean SKU - alphanumeric only
    const sku = product.sku || `${product.brand}${product.partNumber}`.replace(/[^a-zA-Z0-9]/g, '');
    
    // Build form data according to SureDone v1 API format
    const formData = new URLSearchParams();
    
    // Required identifier field
    formData.append('identifier', sku);
    formData.append('action', 'start'); // Try 'start' instead of 'add' for new products
    
    // Product fields
    const fields = {
      sku: sku, // Add SKU to fields
      title: product.title,
      longdescription: product.description,
      price: product.price || '0.00',
      stock: product.stock || '1',
      condition: 'New',
      brand: product.brand,
      mpn: product.partNumber,
    };

    // Add meta description and keywords
    if (product.metaDescription) {
      fields.metadescription = product.metaDescription;
    }
    if (product.metaKeywords) {
      fields.keywords = product.metaKeywords;
    }

    // Add eBay category if provided
    if (product.ebayCategory) {
      fields.ebaycategory = product.ebayCategory;
    }

    // Add specifications as custom fields
    if (product.specifications && product.specifications.length > 0) {
      product.specifications.forEach((spec, index) => {
        fields[`customfield${index + 1}`] = spec;
      });
    }

    // Convert fields object to JSON string for the 'fields' parameter
    formData.append('fields', JSON.stringify(fields));

    console.log('Sending to SureDone SKU:', sku);
    console.log('Fields:', JSON.stringify(fields, null, 2));

    const response = await fetch(`${SUREDONE_URL}/editor/items/add`, {
      method: 'POST',
      headers: {
        'X-Auth-User': SUREDONE_USER,
        'X-Auth-Token': SUREDONE_TOKEN,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: formData.toString()
    });

    console.log('SureDone response status:', response.status);

    const responseText = await response.text();
    console.log('SureDone response:', responseText);

    let data;
    try {
      data = JSON.parse(responseText);
    } catch (e) {
      console.error('Failed to parse SureDone response:', responseText.substring(0, 500));
      return res.status(500).json({ 
        success: false,
        error: 'Invalid response from SureDone',
        details: responseText.substring(0, 500)
      });
    }

    if (data.result === 'success') {
      res.status(200).json({ 
        success: true, 
        message: 'Product created in SureDone',
        sku: data.sku || sku
      });
    } else {
      res.status(400).json({ 
        success: false, 
        error: data.message || 'SureDone API error',
        details: data
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
