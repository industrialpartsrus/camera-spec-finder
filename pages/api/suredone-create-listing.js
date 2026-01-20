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
    // Generate SKU with AI prefix and auto-increment
    // First, search SureDone for existing AI SKUs to find the next number
    let aiNumber = 1; // Default starting number
    
    try {
      // Search for products with SKU starting with "AI"
      const searchResponse = await fetch(`${SUREDONE_URL}/search/items/sku:AI*`, {
        method: 'GET',
        headers: {
          'X-Auth-User': SUREDONE_USER,
          'X-Auth-Token': SUREDONE_TOKEN
        }
      });
      
      if (searchResponse.ok) {
        const searchData = await searchResponse.json();
        console.log('Existing AI SKUs found:', searchData);
        
        // Find the highest AI number
        if (searchData.items && searchData.items.length > 0) {
          const aiSkus = searchData.items
            .map(item => item.sku)
            .filter(sku => sku && sku.startsWith('AI'))
            .map(sku => {
              const match = sku.match(/^AI(\d+)/);
              return match ? parseInt(match[1], 10) : 0;
            });
          
          if (aiSkus.length > 0) {
            const maxNumber = Math.max(...aiSkus);
            aiNumber = maxNumber + 1;
          }
        }
      }
    } catch (searchError) {
      console.log('Could not search for existing SKUs, starting from AI0001:', searchError.message);
    }
    
    // Format as AI0001, AI0002, etc. (4 digits with leading zeros)
    const sku = `AI${String(aiNumber).padStart(4, '0')}`;
    
    console.log('Generated SKU:', sku);
    
    // Create product in SureDone using v1 API editor endpoint
    // Docs: https://app.suredone.com/v1/editor/{type}/{action}
    
    // Build form data according to SureDone v1 API format
    const formData = new URLSearchParams();
    
    // Set action to 'add' for creating new products in the system
    formData.append('action', 'add');
    
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

    // For new items, use guid parameter instead of identifier
    // guid allows SureDone to create a new item, identifier is for existing items
    const response = await fetch(`${SUREDONE_URL}/editor/items/add?guid=${sku}`, {
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
