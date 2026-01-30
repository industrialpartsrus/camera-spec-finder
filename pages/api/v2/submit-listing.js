// pages/api/v2/submit-listing.js
// Clean SureDone submission - uses EXACT eBay field names
// No transformation, no mapping tables - what comes in goes out

// Brand ID mappings for BigCommerce
const BRAND_IDS = {
  'baldor': '92', 'allen bradley': '40', 'allen-bradley': '40', 'siemens': '46',
  'omron': '39', 'smc': '56', 'festo': '44', 'keyence': '47', 'sick': '49',
  'turck': '75', 'banner': '73', 'banner engineering': '73', 'mitsubishi': '158',
  'fanuc': '118', 'yaskawa': '82', 'abb': '86', 'schneider': '52',
  'schneider electric': '52', 'telemecanique': '52', 'square d': '141',
  'parker': '89', 'rexroth': '87', 'bosch rexroth': '87', 'beckhoff': '76',
  'rockwell': '40', 'rockwell automation': '40', 'ge': '88', 'general electric': '88',
  'fuji': '84', 'fuji electric': '84', 'danfoss': '94', 'ckd': '157', 'iai': '150',
  'oriental motor': '104', 'vickers': '137', 'eaton': '72', 'cutler hammer': '72',
  'cutler-hammer': '72', 'phoenix contact': '50', 'wago': '50', 'pilz': '155',
  'bihl+wiedemann': '97', 'bihl wiedemann': '97', 'b&r': '97', 'b&r automation': '97',
  'weg': '95', 'marathon': '93', 'leeson': '91', 'teco': '96', 'reliance': '92'
};

// BigCommerce category mappings
const BIGCOMMERCE_CATEGORIES = {
  'Servo Motor': '23*19*54',
  'AC Servo Motor': '23*19*54',
  'Stepper Motor': '23*26*30',
  'Electric Motor': '23*26*30',
  'Servo Drive': '23*19*32',
  'VFD': '23*33*34',
  'Variable Frequency Drive': '23*33*34',
  'AC Drive': '23*33*34',
  'DC Drive': '23*33',
  'PLC': '23*18*24',
  'PLC Processor': '23*18*24',
  'HMI': '23*18*27',
  'Touch Panel': '23*18*27',
  'Power Supply': '23*18*28',
  'I/O Module': '23*18*61',
  'PLC I/O Module': '23*18*61',
  'Proximity Sensor': '23*22*41',
  'Inductive Proximity Sensor': '23*22*41',
  'Photoelectric Sensor': '23*22*42',
  'Fiber Optic Sensor': '23*22*42',
  'Pressure Sensor': '23*22*116',
  'Temperature Sensor': '23*22*65',
  'Light Curtain': '23*22*71',
  'Barcode Scanner': '23*22',
  'Encoder': '23*19*81',
  'Rotary Encoder': '23*19*81',
  'Pneumatic Cylinder': '23*46*47',
  'Pneumatic Valve': '23*46*68',
  'Solenoid Valve': '23*46*68',
  'Pneumatic Gripper': '23*46*117',
  'Hydraulic Cylinder': '23*84*107',
  'Hydraulic Valve': '23*84*91',
  'Hydraulic Pump': '23*84*94',
  'Circuit Breaker': '23*20*44',
  'Contactor': '23*49*50',
  'Transformer': '23*20*37',
  'Relay': '23*49*51',
  'Safety Relay': '23*49*96',
  'Gearbox': '23*26*36',
  'Gear Reducer': '23*26*36',
  'Linear Bearing': '23*26*70',
  'Ball Bearing': '23*26*43',
  'Timer': '23*49',
  'Counter': '23*49',
  'Temperature Controller': '23*49'
};

// Default shipping profile
const DEFAULT_SHIPPING_PROFILE = '69077991015';
const DEFAULT_RETURN_PROFILE = '61860297015';

// Warranty text
const WARRANTY_TEXT = `We warranty all items for 30 days from date of purchase. If you experience any issues with your item within this period, please contact us and we will work with you to resolve the problem.`;

function capitalizeWords(str) {
  if (!str) return str;
  return str.toLowerCase().split(' ').map(word =>
    word.charAt(0).toUpperCase() + word.slice(1)
  ).join(' ');
}

function capitalizeBrand(brandName) {
  if (!brandName) return brandName;

  const allCaps = ['ABB', 'SMC', 'CKD', 'IAI', 'PHD', 'STI', 'TDK', 'NSK', 'SKF', 'IKO',
    'THK', 'NTN', 'FAG', 'GE', 'SEW', 'WEG', 'ATO', 'ARO', 'ITT', 'MKS', 'MTS', 'NSD',
    'IFM', 'HTM', 'NKE', 'ACU', 'AEG', 'AMK', 'APC', 'BBC', 'EAO', 'EMD', 'GEA', 'B&R'];

  const brandUpper = brandName.toUpperCase().trim();
  if (allCaps.includes(brandUpper)) return brandUpper;

  return capitalizeWords(brandName);
}

function getBrandId(brandName) {
  if (!brandName) return null;
  const brandLower = brandName.toLowerCase().trim();
  return BRAND_IDS[brandLower] || null;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { listing } = req.body;

  if (!listing) {
    return res.status(400).json({ error: 'Listing data is required' });
  }

  console.log('=== SUBMIT TO SUREDONE (V2 - CLEAN) ===');
  console.log('Title:', listing.title);
  console.log('Brand:', listing.brand);
  console.log('Part Number:', listing.partNumber);
  console.log('Product Type:', listing.productType);

  const SUREDONE_USER = process.env.SUREDONE_USER;
  const SUREDONE_TOKEN = process.env.SUREDONE_TOKEN;
  const SUREDONE_URL = process.env.SUREDONE_URL || 'https://api.suredone.com/v1';

  if (!SUREDONE_USER || !SUREDONE_TOKEN) {
    return res.status(500).json({ error: 'SureDone credentials not configured' });
  }

  try {
    // === GENERATE SKU ===
    let aiNumber = 1;
    try {
      const searchResponse = await fetch(`${SUREDONE_URL}/editor/items?search=sku:AI`, {
        method: 'GET',
        headers: { 'X-Auth-User': SUREDONE_USER, 'X-Auth-Token': SUREDONE_TOKEN }
      });

      if (searchResponse.ok) {
        const searchData = await searchResponse.json();
        const skus = [];
        for (const key in searchData) {
          if (key !== 'result' && key !== 'message' && key !== 'type' && key !== 'time') {
            const item = searchData[key];
            if (item?.sku?.startsWith('AI')) {
              const match = item.sku.match(/^AI(\d+)/);
              if (match) skus.push(parseInt(match[1], 10));
            }
          }
        }
        if (skus.length > 0) aiNumber = Math.max(...skus) + 1;
      }
    } catch (e) {
      console.log('SKU search error:', e.message);
    }

    const sku = `AI${String(aiNumber).padStart(4, '0')}`;
    console.log('Generated SKU:', sku);

    // === GET UPC ===
    let upc = null;
    try {
      const baseUrl = req.headers.origin || 
        (req.headers.host?.includes('localhost')
          ? `http://${req.headers.host}`
          : 'https://camera-spec-finder.vercel.app');
      
      const upcResponse = await fetch(`${baseUrl}/api/assign-upc`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      
      if (upcResponse.ok) {
        const upcData = await upcResponse.json();
        if (upcData.success && upcData.upc) {
          upc = upcData.upc;
          console.log('Assigned UPC:', upc);
        }
      }
    } catch (e) {
      console.log('UPC assignment error:', e.message);
    }

    // === FORMAT FIELDS ===
    const brandFormatted = capitalizeBrand(listing.brand);
    const mpnFormatted = listing.partNumber.toUpperCase();
    const modelFormatted = (listing.model || listing.partNumber).toUpperCase();
    const bigcommerceBrandId = getBrandId(listing.brand);
    const bigcommerceCategories = BIGCOMMERCE_CATEGORIES[listing.productType] || '23';

    // === BUILD FORM DATA ===
    const formData = new URLSearchParams();

    // Core fields
    formData.append('identifier', 'guid');
    formData.append('guid', sku);
    formData.append('sku', sku);
    formData.append('title', listing.title);
    formData.append('longdescription', listing.description || '');
    formData.append('price', listing.price || '0.00');
    formData.append('stock', listing.quantity || '1');
    
    // Brand & MPN
    formData.append('brand', brandFormatted);
    formData.append('manufacturer', listing.manufacturer || brandFormatted);
    formData.append('mpn', mpnFormatted);
    formData.append('model', modelFormatted);
    formData.append('partnumber', mpnFormatted);
    
    // UPC
    if (upc) formData.append('upc', upc);
    
    // Product Type (usertype)
    formData.append('usertype', listing.productType || 'Industrial Equipment');
    
    // Condition
    formData.append('condition', listing.condition?.suredoneValue || 'Used');
    if (listing.conditionNotes) {
      formData.append('notes', listing.conditionNotes);
    }

    // Dimensions & Weight
    if (listing.boxLength) formData.append('boxlength', listing.boxLength);
    if (listing.boxWidth) formData.append('boxwidth', listing.boxWidth);
    if (listing.boxHeight) formData.append('boxheight', listing.boxHeight);
    if (listing.weight) formData.append('weight', listing.weight);
    if (listing.shelfLocation) {
      formData.append('shelf', listing.shelfLocation);
      formData.append('bigcommercebinpickingnumber', listing.shelfLocation);
    }

    // === EBAY CATEGORIES ===
    if (listing.ebayCategoryId) {
      formData.append('ebaycatid', listing.ebayCategoryId);
      console.log('eBay Category:', listing.ebayCategoryId);
    }
    if (listing.ebayStoreCategoryId) {
      formData.append('ebaystoreid', listing.ebayStoreCategoryId);
      console.log('Store Category 1:', listing.ebayStoreCategoryId);
    }
    if (listing.ebayStoreCategoryId2) {
      formData.append('ebaystoreid2', listing.ebayStoreCategoryId2);
      console.log('Store Category 2:', listing.ebayStoreCategoryId2);
    }

    // Shipping & Returns
    formData.append('ebayshippingprofileid', listing.shippingProfileId || DEFAULT_SHIPPING_PROFILE);
    const isForParts = listing.condition?.suredoneValue === 'For Parts or Not Working';
    if (!isForParts) {
      formData.append('ebayreturnprofileid', listing.returnProfileId || DEFAULT_RETURN_PROFILE);
    }

    // === BIGCOMMERCE FIELDS ===
    formData.append('bigcommercecategories', bigcommerceCategories);
    if (bigcommerceBrandId) formData.append('bigcommercebrandid', bigcommerceBrandId);
    formData.append('bigcommerceisconditionshown', 'on');
    formData.append('bigcommerceavailabilitydescription', 'In Stock');
    formData.append('bigcommercewarranty', WARRANTY_TEXT);
    formData.append('bigcommerceisvisible', 'on');
    formData.append('bigcommercechannels', '1');
    formData.append('bigcommercempn', mpnFormatted);

    if (listing.shortDescription) {
      formData.append('bigcommercemetadescription', listing.shortDescription);
    }

    // === ITEM SPECIFICS - DIRECT PASSTHROUGH ===
    // This is the key difference: we use the field names EXACTLY as they came from eBay
    // No transformation, no mapping - SureDone receives what eBay expects
    
    console.log('=== ITEM SPECIFICS (Direct to SureDone) ===');
    
    if (listing.itemSpecifics && typeof listing.itemSpecifics === 'object') {
      for (const [fieldName, value] of Object.entries(listing.itemSpecifics)) {
        if (value && value !== null && value !== '' && value !== 'null') {
          // Use the SureDone field name directly
          formData.append(fieldName, value);
          console.log(`  ${fieldName}: ${value}`);
        }
      }
    }

    // === SKIP AUTO-PUSH (create as draft) ===
    formData.append('ebayskip', '1');
    formData.append('bigcommerceskip', '1');

    // === SEND TO SUREDONE ===
    console.log('Sending to SureDone...');
    
    const response = await fetch(`${SUREDONE_URL}/editor/items/add`, {
      method: 'POST',
      headers: {
        'X-Auth-User': SUREDONE_USER,
        'X-Auth-Token': SUREDONE_TOKEN,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: formData.toString()
    });

    const responseText = await response.text();
    console.log('SureDone response:', responseText);

    let data;
    try {
      data = JSON.parse(responseText);
    } catch (e) {
      return res.status(500).json({
        success: false,
        error: 'Invalid response from SureDone',
        details: responseText.substring(0, 500)
      });
    }

    if (data.result === 'success') {
      res.status(200).json({
        success: true,
        message: 'Listing created in SureDone',
        sku: data.sku || sku,
        upc: upc,
        brandFormatted,
        bigcommerceCategories,
        productType: listing.productType
      });
    } else {
      res.status(400).json({
        success: false,
        error: data.message || 'SureDone API error',
        details: data
      });
    }

  } catch (error) {
    console.error('SureDone submission error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
}
