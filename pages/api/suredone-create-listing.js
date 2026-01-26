// pages/api/suredone-create-listing.js
// Complete SureDone listing creation with UPC, eBay categories, and item specifics

// ============================================================================
// EBAY STORE CATEGORIES - YOUR ACTUAL STORE CATEGORY IDS
// ============================================================================
const EBAY_STORE_CATEGORIES = {
  // Power Transmission
  'Electric Motors': '17167471',
  'Servo Motors': '393389015',
  'Servo Drives': '393390015',
  'Encoders': '1802953015',
  'Gear Reducers': '6688332015',
  'Gearboxes': '6688332015',
  'Linear Actuators': '6690433015',
  'Linear Rails': '6690434015',
  'Ball Screws': '6690432015',
  'Brakes': '6688331015',
  'Clutches': '393386015',
  'Belts': '6688333015',
  'Roller Chains': '6688335015',
  'Sprockets': '6688334015',
  
  // Automation Control
  'PLCs': '5404089015',
  'PLC': '5404089015',
  'HMIs': '6686264015',
  'HMI': '6686264015',
  'I/O Modules': '18373835',
  'I/O Boards': '18373835',
  'Power Supplies': '2242362015',
  'Power Supply': '2242362015',
  
  // Motion Control
  'AC Drive': '2242358015',
  'AC Drives': '2242358015',
  'VFDs': '2242358015',
  'VFD': '2242358015',
  'DC Drive': '6688299015',
  'DC Drives': '6688299015',
  
  // Sensing Devices
  'Proximity Sensors': '4173791015',
  'Photoelectric Sensors': '4173793015',
  'Light Curtains': '393379015',
  'Laser Sensors': '2479732015',
  'Fiber Optic Sensors': '5785856015',
  'Color Sensors': '4173796015',
  'Current Sensors': '4173797015',
  'Flow Sensors': '4173798015',
  'Level Sensors': '4173792015',
  'Light Sensors': '4173799015',
  'Linear Sensors': '5634087015',
  'Load Cells': '5436340015',
  'Pressure Sensors': '6690386015',
  'Temperature Sensors': '6690556015',
  'Barcode Scanners': '6690176015',
  'RFID Reader': '6695702015',
  
  // Industrial Control
  'Control Relays': '2242359015',
  'Motor Controls': '2348910015',
  'Limit Switches': '4173745015',
  'Micro Switches': '4173752015',
  'E-Stop Switches': '4173756015',
  'Foot Switches': '4173739015',
  'Key Switches': '4173738015',
  'Selector Switches': '4173742015',
  'Momentary Buttons': '4173735015',
  'Maintained Buttons': '4173736015',
  'Illuminated Buttons': '4173737015',
  'Palm Operated Buttons': '4173743015',
  'Pilot Lights': '2464042015',
  'Stack Lights': '6690583015',
  'Joysticks': '4173758015',
  'Potentiometers': '4173757015',
  'Counters': '18373799',
  'Timers': '18373798',
  'Panel Meters': '5634088015',
  'Gauges': '1484016015',
  'Temperature Controls': '2461872015',
  'Pressure Controls': '1484009015',
  'Machine Safety': '2464037015',
  'Transducers': '18373834',
  'Transmitters': '5634089015',
  'Cord Sets': '1856435015',
  'Sound Modules': '6327053015',
  
  // Electrical
  'Circuit Breakers': '5634105015',
  'Transformers': '5634104015',
  'Disconnects': '20338717',
  'Enclosures': '18373801',
  'Fuses & Holders': '18373807',
  'Contactors': '2242359015',
  
  // Pneumatics
  'Pneumatic Cylinders': '2461873015',
  'Cylinders': '2461873015',
  'Pneumatic Valves': '2461874015',
  'Actuators': '2461878015',
  'Grippers': '6699359015',
  'Gripper': '6699359015',
  'Regulators': '2461875015',
  'Lubricators': '2461876015',
  'Dryers': '2461877015',
  'Filters': '2461880015',
  'Mufflers': '6690373015',
  'Nippers': '6699358015',
  
  // Hydraulics
  'Hydraulic Cylinders': '6696061015',
  'Hydraulic Pumps': '6696064015',
  'Hydraulic Valves': '6696060015',
  'Hydraulic Actuators': '6696062015',
  'Hydraulic Accumulators': '6696063015',
  
  // Bearings
  'Bearings': '6690505015',
  'Ball Bearings': '4173714015',
  'Roller Bearings': '4173168015',
  'Tapered Bearings': '4173167015',
  'Thrust Bearings': '4173169015',
  'Needle Bearings': '4173171015',
  'Linear Bearings': '4173713015',
  'Pillow Block': '4173166015',
  'Flange Bearings': '4173165015',
  'Cam Follower': '4173170015',
  
  // Valves (non-pneumatic)
  'Ball Valves': '6690466015',
  'Butterfly Valves': '6690465015',
  'Check Valves': '6690467015',
  'Float Valves': '6690474015',
  'Gas Valves': '6690469015',
  'Globe Valves': '6690472015',
  'Lockout Valves': '6690470015',
  'Pressure Relief': '6690486015',
  'Proportional Valves': '6690471015',
  'Solenoid Valves': '6690468015',
  'Steam Valves': '6690473015',
  
  // Pumps
  'Centrifugal Pump': '6689968015',
  'Condensate Pump': '6689971015',
  'Diaphragm Pump': '6689969015',
  'Hydraulic Pump': '6689966015',
  'Metering Pump': '6689970015',
  'Vacuum Pump': '6689967015',
  
  // Other
  'Robotics': '5384030015',
  'Machinery': '5384029015',
  'Material Handling': '2348909015',
  'HVAC': '17167473',
  'Chillers': '2457873015',
  'Fans': '2457884015',
  'Regenerative Blowers': '18206302015',
  'Quality & Test': '6686263015',
  'Lighting Ballasts': '20030375015',
  'Computers & Accessories': '19438754015'
};

// ALL PRODUCTS category ID - YOUR ACTUAL ID
const ALL_PRODUCTS_CATEGORY = '23399313015';

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
    // GET UPC FROM POOL (call assign-upc API)
    // ========================================================================
    let upc = null;
    try {
      // Build the base URL for internal API calls
      const baseUrl = process.env.VERCEL_URL 
        ? `https://${process.env.VERCEL_URL}` 
        : 'http://localhost:3000';
      
      const upcResponse = await fetch(`${baseUrl}/api/assign-upc`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sku })
      });
      
      if (upcResponse.ok) {
        const upcData = await upcResponse.json();
        if (upcData.success && upcData.upc) {
          upc = upcData.upc;
          console.log('Assigned UPC:', upc);
        }
      }
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
      console.log('eBay Marketplace Category ID:', product.ebayCategoryId);
    }

    // ========================================================================
    // EBAY STORE CATEGORIES
    // ========================================================================
    // Store Category 1: Based on product category
    let storeCategory1 = '';
    const productCat = product.productCategory || product.category || '';
    
    if (productCat && EBAY_STORE_CATEGORIES[productCat]) {
      storeCategory1 = EBAY_STORE_CATEGORIES[productCat];
      formData.append('ebaystorecategory', storeCategory1);
      console.log('eBay Store Category 1:', storeCategory1, `(${productCat})`);
    } else if (productCat) {
      // Try to find a partial match
      const catLower = productCat.toLowerCase();
      for (const [key, value] of Object.entries(EBAY_STORE_CATEGORIES)) {
        if (key.toLowerCase().includes(catLower) || catLower.includes(key.toLowerCase())) {
          storeCategory1 = value;
          formData.append('ebaystorecategory', storeCategory1);
          console.log('eBay Store Category 1 (partial match):', storeCategory1, `(${key})`);
          break;
        }
      }
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
      upc: formDataObj.upc || 'not assigned',
      title: formDataObj.title?.substring(0, 50) + '...',
      brand: formDataObj.brand,
      mpn: formDataObj.mpn,
      condition: formDataObj.condition,
      ebaycategoryid: formDataObj.ebaycategoryid || 'not set',
      ebaystorecategory: formDataObj.ebaystorecategory || 'not set',
      ebaystorecategory2: formDataObj.ebaystorecategory2,
      countryoforigin: formDataObj.countryoforigin || 'not set'
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
