// pages/api/suredone-create-listing.js
// Complete SureDone listing creation with UPC, eBay categories, and item specifics

// ============================================================================
// EBAY STORE CATEGORIES - UPDATE THESE WITH YOUR ACTUAL STORE CATEGORY IDS
// ============================================================================
const EBAY_STORE_CATEGORIES = {
  'Electric Motors': '28134837016',
  'Servo Motors': '28134839016',
  'Servo Drives': '28134840016',
  'VFDs': '28134841016',
  'PLCs': '28134842016',
  'HMIs': '28134843016',
  'Power Supplies': '28134844016',
  'I/O Modules': '28134845016',
  'Proximity Sensors': '28134846016',
  'Photoelectric Sensors': '28134847016',
  'Pneumatic Cylinders': '28134848016',
  'Pneumatic Valves': '28134849016',
  'Circuit Breakers': '28134850016',
  'Contactors': '28134851016',
  'Transformers': '28134852016',
  'Encoders': '28134853016',
  'Gearboxes': '28134854016',
  'Bearings': '28134855016'
};

// ALL PRODUCTS category ID - used as default for ebaystorecategory2
// UPDATE THIS WITH YOUR ACTUAL "ALL PRODUCTS" STORE CATEGORY ID
const ALL_PRODUCTS_CATEGORY = '28134836016';

// ============================================================================
// ITEM SPECIFICS FIELD MAPPING
// Maps specification keys to SureDone inline field names (short names, no prefix)
// ============================================================================
const ITEM_SPECIFICS_MAPPING = {
  // Motor fields
  'ratedloadhp': 'ratedloadhp',
  'horsepower': 'ratedloadhp',
  'hp': 'ratedloadhp',
  'ratedload': 'ratedloadhp',
  'baserpm': 'baserpm',
  'rpm': 'baserpm',
  'speed': 'baserpm',
  'acphase': 'acphase',
  'phase': 'acphase',
  'nominalratedinputvoltage': 'nominalratedinputvoltage',
  'voltage': 'nominalratedinputvoltage',
  'inputvoltage': 'nominalratedinputvoltage',
  'enclosuretype': 'enclosuretype',
  'enclosure': 'enclosuretype',
  'acmotortype': 'acmotortype',
  'motortype': 'acmotortype',
  'servicefactor': 'servicefactor',
  'sf': 'servicefactor',
  'iecframesize': 'iecframesize',
  'framesize': 'iecframesize',
  'frame': 'iecframesize',
  'nemaframesuffix': 'nemaframesuffix',
  'framesuffix': 'nemaframesuffix',
  'nemadesignletter': 'nemadesignletter',
  'designletter': 'nemadesignletter',
  'insulationclass': 'insulationclass',
  'insulation': 'insulationclass',
  'mountingtype': 'mountingtype',
  'mounting': 'mountingtype',
  'mount': 'mountingtype',
  'shaftdiameter': 'shaftdiameter',
  'shaft': 'shaftdiameter',
  'fullloadamps': 'fullloadamps',
  'fla': 'fullloadamps',
  'amps': 'fullloadamps',
  'currenttype': 'currenttype',
  'acfrequencyrating': 'acfrequencyrating',
  'frequency': 'acfrequencyrating',
  'hz': 'acfrequencyrating',
  'reversiblenonreversible': 'reversiblenonreversible',
  'reversible': 'reversiblenonreversible',
  'iprating': 'iprating',
  'ip': 'iprating',
  'invertervectordutyrating': 'invertervectordutyrating',
  'inverterduty': 'invertervectordutyrating',
  'specialmotorconstruction': 'specialmotorconstruction',
  'specialconstruction': 'specialmotorconstruction',
  'countryoforigin': 'countryoforigin',
  'country': 'countryoforigin',
  'origin': 'countryoforigin',
  
  // Sensor fields
  'sensortype': 'sensortype',
  'sensingdistance': 'sensingdistance',
  'outputtype': 'outputtype',
  'outputconfiguration': 'outputconfiguration',
  'connectiontype': 'connectiontype',
  
  // PLC/HMI fields
  'communicationstandard': 'communicationstandard',
  'numberofiopoints': 'numberofiopoints',
  'displayscreensize': 'displayscreensize',
  'displaytype': 'displaytype',
  
  // Pneumatic fields
  'boresize': 'boresize',
  'strokelength': 'strokelength',
  'cylindertype': 'cylindertype',
  'operatingpressure': 'operatingpressure',
  
  // Electrical fields
  'numberofpoles': 'numberofpoles',
  'currentrating': 'currentrating',
  'voltagerating': 'voltagerating',
  'coilvoltage': 'coilvoltage'
};

// ============================================================================
// UPC POOL - Simple in-memory approach
// For production, you'd want to use a database or external file
// ============================================================================
let upcPoolCache = null;

async function getNextUpc(SUREDONE_URL, SUREDONE_USER, SUREDONE_TOKEN) {
  // Try to fetch an unused UPC from SureDone's custom data or a separate API
  // For now, we'll skip UPC assignment if no pool is available
  // You can implement your own UPC pool logic here
  
  try {
    // Option 1: Call your assign-upc API endpoint
    const response = await fetch(`${process.env.VERCEL_URL || 'http://localhost:3000'}/api/assign-upc`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({})
    });
    
    if (response.ok) {
      const data = await response.json();
      return data.upc || null;
    }
  } catch (e) {
    console.log('Could not get UPC from pool:', e.message);
  }
  
  return null;
}

// ============================================================================
// MAIN HANDLER
// ============================================================================
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

  console.log('=== SUREDONE CREATE LISTING ===');
  console.log('Product:', {
    title: product.title,
    brand: product.brand,
    partNumber: product.partNumber,
    price: product.price,
    category: product.productCategory,
    ebayCategoryId: product.ebayCategoryId,
    countryOfOrigin: product.countryOfOrigin,
    shelfLocation: product.shelfLocation,
    hasSpecs: !!product.specifications,
    specCount: product.specifications ? Object.keys(product.specifications).length : 0
  });

  // SureDone API credentials
  const SUREDONE_USER = process.env.SUREDONE_USER;
  const SUREDONE_TOKEN = process.env.SUREDONE_TOKEN;
  const SUREDONE_URL = process.env.SUREDONE_URL || 'https://app.suredone.com/v1';

  if (!SUREDONE_USER || !SUREDONE_TOKEN) {
    return res.status(500).json({ error: 'SureDone credentials not configured' });
  }

  try {
    // ========================================================================
    // GENERATE SKU
    // ========================================================================
    let aiNumber = 1;
    
    try {
      const searchResponse = await fetch(`${SUREDONE_URL}/editor/items?search=sku:AI`, {
        method: 'GET',
        headers: {
          'X-Auth-User': SUREDONE_USER,
          'X-Auth-Token': SUREDONE_TOKEN
        }
      });
      
      if (searchResponse.ok) {
        const searchData = await searchResponse.json();
        const skus = [];
        
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
        
        if (skus.length > 0) {
          aiNumber = Math.max(...skus) + 1;
        }
      }
    } catch (searchError) {
      console.log('Could not search for existing SKUs:', searchError.message);
    }
    
    const sku = `AI${String(aiNumber).padStart(4, '0')}`;
    console.log('Generated SKU:', sku);

    // ========================================================================
    // GET UPC FROM POOL (optional)
    // ========================================================================
    let upc = null;
    try {
      upc = await getNextUpc(SUREDONE_URL, SUREDONE_USER, SUREDONE_TOKEN);
      console.log('Assigned UPC:', upc || 'None available');
    } catch (e) {
      console.log('UPC assignment skipped:', e.message);
    }

    // ========================================================================
    // BUILD FORM DATA
    // ========================================================================
    const formData = new URLSearchParams();
    
    // Core identifiers
    formData.append('identifier', 'guid');
    formData.append('guid', sku);
    formData.append('sku', sku);
    
    // Basic product info
    formData.append('title', product.title);
    formData.append('longdescription', product.description || '');
    formData.append('price', product.price || '0.00');
    formData.append('stock', product.stock || '1');
    formData.append('brand', product.brand);
    formData.append('mpn', product.partNumber);
    
    // UPC (if available)
    if (upc) {
      formData.append('upc', upc);
    }

    // ========================================================================
    // CONDITION MAPPING
    // ========================================================================
    let suredoneCondition = 'Used';
    if (product.condition) {
      const conditionLower = product.condition.toLowerCase();
      if (conditionLower.includes('new in box') || conditionLower.includes('nib') || conditionLower === 'new') {
        suredoneCondition = 'New';
      } else if (conditionLower.includes('new') && (conditionLower.includes('open') || conditionLower.includes('other'))) {
        suredoneCondition = 'New Other';
      } else if (conditionLower.includes('refurbished')) {
        suredoneCondition = 'Manufacturer Refurbished';
      } else if (conditionLower.includes('parts') || conditionLower.includes('not working')) {
        suredoneCondition = 'For Parts or Not Working';
      }
    }
    formData.append('condition', suredoneCondition);
    
    if (product.conditionNotes) {
      formData.append('conditionnotes', product.conditionNotes);
    }

    // ========================================================================
    // DIMENSIONS & WEIGHT
    // ========================================================================
    if (product.boxLength) formData.append('boxlength', product.boxLength);
    if (product.boxWidth) formData.append('boxwidth', product.boxWidth);
    if (product.boxHeight) formData.append('boxheight', product.boxHeight);
    if (product.weight) formData.append('weight', product.weight);

    // ========================================================================
    // SHELF LOCATION
    // ========================================================================
    if (product.shelfLocation) {
      formData.append('shelf', product.shelfLocation);
      formData.append('bigcommercebinpickingnumber', product.shelfLocation);
    }

    // ========================================================================
    // META DESCRIPTION & KEYWORDS
    // ========================================================================
    if (product.metaDescription || product.shortDescription) {
      formData.append('metadescription', product.metaDescription || product.shortDescription);
    }
    if (product.metaKeywords) {
      const keywords = Array.isArray(product.metaKeywords) 
        ? product.metaKeywords.join(', ') 
        : product.metaKeywords;
      formData.append('keywords', keywords);
    }

    // ========================================================================
    // EBAY MARKETPLACE CATEGORY
    // ========================================================================
    if (product.ebayCategoryId) {
      formData.append('ebaycategoryid', product.ebayCategoryId);
      console.log('eBay Category ID:', product.ebayCategoryId);
    }

    // ========================================================================
    // EBAY STORE CATEGORIES
    // ========================================================================
    // Store Category 1: Based on product category
    let storeCategory1 = '';
    if (product.productCategory && EBAY_STORE_CATEGORIES[product.productCategory]) {
      storeCategory1 = EBAY_STORE_CATEGORIES[product.productCategory];
      formData.append('ebaystorecategory', storeCategory1);
      console.log('eBay Store Category 1:', storeCategory1, `(${product.productCategory})`);
    }
    
    // Store Category 2: Always "ALL PRODUCTS"
    formData.append('ebaystorecategory2', ALL_PRODUCTS_CATEGORY);
    console.log('eBay Store Category 2:', ALL_PRODUCTS_CATEGORY, '(ALL PRODUCTS)');

    // ========================================================================
    // COUNTRY OF ORIGIN
    // ========================================================================
    if (product.countryOfOrigin) {
      formData.append('countryoforigin', product.countryOfOrigin);
      console.log('Country of Origin:', product.countryOfOrigin);
    }

    // ========================================================================
    // SHIPPING PROFILE
    // ========================================================================
    if (product.shippingProfileId) {
      formData.append('ebayshippingprofileid', product.shippingProfileId);
    }

    // ========================================================================
    // ITEM SPECIFICS (Specifications)
    // Map specifications to SureDone inline field names
    // ========================================================================
    if (product.specifications && typeof product.specifications === 'object') {
      console.log('=== PROCESSING SPECIFICATIONS ===');
      console.log('Total spec fields:', Object.keys(product.specifications).length);
      
      for (const [key, value] of Object.entries(product.specifications)) {
        if (value === null || value === undefined || value === '') continue;
        
        // Normalize the key (lowercase, no spaces/underscores/hyphens)
        const normalizedKey = key.toLowerCase().replace(/[\s_-]/g, '');
        
        // Find the correct SureDone field name from our mapping
        const suredoneField = ITEM_SPECIFICS_MAPPING[normalizedKey];
        
        if (suredoneField) {
          formData.append(suredoneField, String(value));
          console.log(`  Mapped: "${key}" -> ${suredoneField} = "${value}"`);
        } else {
          // If no mapping found, use the normalized key directly
          // This allows new fields to work even without explicit mapping
          formData.append(normalizedKey, String(value));
          console.log(`  Direct: "${key}" -> ${normalizedKey} = "${value}"`);
        }
      }
    }

    // ========================================================================
    // DEBUG OUTPUT
    // ========================================================================
    console.log('=== FORM DATA SUMMARY ===');
    const formDataObj = Object.fromEntries(formData.entries());
    console.log('Total fields being sent:', Object.keys(formDataObj).length);
    
    // Log key fields for debugging
    console.log('Key fields:', {
      sku: formDataObj.sku,
      title: formDataObj.title?.substring(0, 50) + '...',
      brand: formDataObj.brand,
      mpn: formDataObj.mpn,
      condition: formDataObj.condition,
      ebaycategoryid: formDataObj.ebaycategoryid,
      ebaystorecategory: formDataObj.ebaystorecategory,
      ebaystorecategory2: formDataObj.ebaystorecategory2,
      countryoforigin: formDataObj.countryoforigin
    });

    // ========================================================================
    // SEND TO SUREDONE
    // ========================================================================
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

    const responseText = await response.text();
    console.log('Raw response:', responseText.substring(0, 1000));

    let data;
    try {
      data = JSON.parse(responseText);
    } catch (e) {
      console.error('Failed to parse response:', responseText.substring(0, 500));
      return res.status(500).json({ 
        success: false,
        error: 'Invalid response from SureDone',
        details: responseText.substring(0, 500)
      });
    }

    console.log('Parsed response:', data);

    if (data.result === 'success') {
      res.status(200).json({ 
        success: true, 
        message: 'Product created in SureDone',
        sku: data.sku || sku,
        upc: upc || null,
        storeCategory1: storeCategory1 || null,
        storeCategory2: ALL_PRODUCTS_CATEGORY
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
