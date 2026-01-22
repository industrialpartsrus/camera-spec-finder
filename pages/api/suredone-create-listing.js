export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { product } = req.body;

  // Validate product data
  if (!product) {
    console.error('No product data received');
    return res.status(400).json({ error: 'No product data provided' });
  }

  if (!product.title || !product.brand || !product.partNumber) {
    console.error('Missing required fields:', { title: product.title, brand: product.brand, partNumber: product.partNumber });
    return res.status(400).json({ error: 'Missing required fields: title, brand, or partNumber' });
  }

  console.log('Received product data:', {
    title: product.title,
    brand: product.brand,
    partNumber: product.partNumber,
    price: product.price,
    hasDescription: !!product.description,
    hasSpecs: !!product.specifications
  });

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
      // Search for products with SKU containing "AI" using SureDone's search API
      // Use the editor endpoint with a search query
      const searchResponse = await fetch(`${SUREDONE_URL}/editor/items?search=sku:AI`, {
        method: 'GET',
        headers: {
          'X-Auth-User': SUREDONE_USER,
          'X-Auth-Token': SUREDONE_TOKEN
        }
      });
      
      if (searchResponse.ok) {
        const searchData = await searchResponse.json();
        console.log('Search response:', searchData);
        
        // Parse the response to find AI SKUs
        if (searchData && typeof searchData === 'object') {
          const skus = [];
          
          // SureDone returns items as numbered keys (1, 2, 3, etc.)
          for (const key in searchData) {
            if (key !== 'result' && key !== 'message' && key !== 'type' && key !== 'time') {
              const item = searchData[key];
              if (item && item.sku && item.sku.startsWith('AI')) {
                const match = item.sku.match(/^AI(\d+)/);
                if (match) {
                  skus.push(parseInt(match[1], 10));
                }
              }
            }
          }
          
          console.log('Found AI SKU numbers:', skus);
          
          if (skus.length > 0) {
            const maxNumber = Math.max(...skus);
            aiNumber = maxNumber + 1;
            console.log('Next AI number will be:', aiNumber);
          }
        }
      } else {
        console.log('Search returned status:', searchResponse.status);
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
    
    // Tell SureDone we're using a GUID identifier
    formData.append('identifier', 'guid');
    formData.append('guid', sku);
    
    // Add all product fields directly (NOT as JSON)
    formData.append('sku', sku);
    formData.append('title', product.title);
    formData.append('longdescription', product.description);
    formData.append('price', product.price || '0.00');
    formData.append('stock', product.stock || '1');
    
    // Condition - map to SureDone's allowed values
    let suredoneCondition = 'Used'; // Default
    if (product.condition) {
      const conditionLower = product.condition.toLowerCase();
      if (conditionLower.includes('new in box') || conditionLower.includes('nib')) {
        suredoneCondition = 'New';
      } else if (conditionLower.includes('new') && (conditionLower.includes('open') || conditionLower.includes('box'))) {
        suredoneCondition = 'New Other';
      } else if (conditionLower.includes('refurbished')) {
        suredoneCondition = 'Manufacturer Refurbished';
      } else if (conditionLower.includes('parts') || conditionLower.includes('not working')) {
        suredoneCondition = 'For Parts or Not Working';
      } else {
        suredoneCondition = 'Used'; // All other conditions map to Used
      }
    }
    formData.append('condition', suredoneCondition);
    
    // Condition notes - use correct field name
    if (product.conditionNotes) {
      formData.append('notes', product.conditionNotes);
    }
    
    formData.append('brand', product.brand);
    formData.append('mpn', product.partNumber);

    // Dimensions and weight - use exact header names from CSV
    if (product.boxLength) {
      formData.append('boxlength', product.boxLength);
    }
    if (product.boxWidth) {
      formData.append('boxwidth', product.boxWidth);
    }
    if (product.boxHeight) {
      formData.append('boxheight', product.boxHeight);
    }
    if (product.weight) {
      formData.append('weight', product.weight);
    }

    // Shelf location - use exact header name from CSV (no prefix!)
    if (product.shelfLocation) {
      formData.append('shelf', product.shelfLocation);
    }

    // Add meta description and keywords
    if (product.metaDescription) {
      formData.append('metadescription', product.metaDescription);
    }
    if (product.metaKeywords) {
      formData.append('keywords', product.metaKeywords);
    }

    // Add eBay category if provided
    if (product.ebayCategory) {
      formData.append('ebaycategory', product.ebayCategory);
    }

    // Add specifications as custom fields (customfield1, customfield2, etc.)
    if (product.specifications && product.specifications.length > 0) {
      product.specifications.forEach((spec, index) => {
        formData.append(`customfield${index + 1}`, spec);
      });
    }

    console.log('=== SUREDONE API CALL DEBUG ===');
    console.log('URL:', `${SUREDONE_URL}/editor/items/add`);
    console.log('SUREDONE_URL env var:', SUREDONE_URL);
    console.log('Has SUREDONE_USER:', !!SUREDONE_USER);
    console.log('Has SUREDONE_TOKEN:', !!SUREDONE_TOKEN);
    console.log('SKU being used:', sku);
    console.log('Form data fields:', Object.fromEntries(formData.entries()));
    console.log('Form data as string (first 500 chars):', formData.toString().substring(0, 500));

    const response = await fetch(`${SUREDONE_URL}/editor/items/add`, {
      method: 'POST',
      headers: {
        'X-Auth-User': SUREDONE_USER,
        'X-Auth-Token': SUREDONE_TOKEN,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: formData.toString()
    });

    console.log('=== SUREDONE RESPONSE ===');
    console.log('Status:', response.status);
    console.log('Status text:', response.statusText);
    console.log('Headers:', Object.fromEntries(response.headers.entries()));

    const responseText = await response.text();
    console.log('Raw response (first 1000 chars):', responseText.substring(0, 1000));

    let data;
    try {
      data = JSON.parse(responseText);
    } catch (e) {
      console.error('Failed to parse SureDone response:', responseText.substring(0, 500));
      return res.status(500).json({ 
        success: false,
        error: 'Invalid response from SureDone',
        details: responseText.substring(0, 500),
        statusCode: response.status
      });
    }

    console.log('SureDone parsed response:', data);

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
