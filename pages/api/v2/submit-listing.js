// pages/api/v2/submit-listing.js
// Clean SureDone submission - FIXED with correct BigCommerce categories and condition notes

import brandsDb from '../../../data/bigcommerce_brands.json';

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
  'weg': '95', 'marathon': '93', 'leeson': '91', 'teco': '96', 'reliance': '92'
};

// BigCommerce category mappings - FROM bigcommerce_categories.json
// Format: JSON array string '["shopAll","parent","child","leaf"]'
// Shop All (23) is ALWAYS the first element
const BIGCOMMERCE_CATEGORIES = {
  // Motors - Power Transmission -> Electric Motors
  'Electric Motor': '["23","26","30"]',
  'AC Motor': '["23","26","30"]',
  'Induction Motor': '["23","26","30"]',
  'DC Motor': '["23","26","30"]',
  'Gearmotor': '["23","26","30"]',
  'Gear Motor': '["23","26","30"]',
  'Stepper Motor': '["23","26","30"]',

  // Servo Motors - Motion Control -> Servo Motors
  'Servo Motor': '["23","19","54"]',
  'AC Servo Motor': '["23","19","54"]',
  'DC Servo Motor': '["23","19","54"]',

  // Servo Drives - Motion Control -> Servo Drives & Amplifiers
  'Servo Drive': '["23","19","32"]',
  'Servo Amplifier': '["23","19","32"]',

  // VFDs - Speed Controls -> AC Drive
  'VFD': '["23","33","34"]',
  'Variable Frequency Drive': '["23","33","34"]',
  'AC Drive': '["23","33","34"]',
  'Inverter': '["23","33","34"]',

  // DC Drives - Speed Controls -> DC Drive
  'DC Drive': '["23","33","35"]',

  // Stepper Drives
  'Stepper Drive': '["23","19","32"]',

  // PLCs - Automation Control -> PLC
  'PLC': '["23","18","24"]',
  'PLC Processor': '["23","18","24"]',
  'PLC CPU': '["23","18","24"]',
  'PLC Chassis': '["23","18","24"]',

  // PLC I/O - Automation Control -> I/O Boards
  'PLC I/O Module': '["23","18","61"]',
  'I/O Module': '["23","18","61"]',
  'Communication Module': '["23","18","61"]',

  // PLC Power Supply - Automation Control -> Power Supply
  'PLC Power Supply': '["23","18","28"]',
  'Power Supply': '["23","18","28"]',
  'Industrial Power Supply': '["23","18","28"]',

  // HMI - Automation Control -> HMI
  'HMI': '["23","18","27"]',
  'Touch Panel': '["23","18","27"]',
  'Operator Interface': '["23","18","27"]',

  // Proximity Sensors - Sensing Devices -> Proximity Sensors
  'Proximity Sensor': '["23","22","41"]',
  'Inductive Proximity Sensor': '["23","22","41"]',
  'Capacitive Proximity Sensor': '["23","22","41"]',
  'Inductive Sensor': '["23","22","41"]',

  // Photoelectric Sensors - Sensing Devices -> Photoelectric Sensors
  'Photoelectric Sensor': '["23","22","42"]',
  'Photo Sensor': '["23","22","42"]',

  // Fiber Optic Sensors - Sensing Devices -> Fiber Optic Sensors
  'Fiber Optic Sensor': '["23","22","78"]',

  // Pressure Sensors - Sensing Devices -> Pressure Sensors
  'Pressure Sensor': '["23","22","116"]',
  'Pressure Transducer': '["23","22","116"]',

  // Temperature Sensors - Sensing Devices -> Temperature Sensors
  'Temperature Sensor': '["23","22","65"]',
  'Thermocouple': '["23","22","65"]',

  // Level Sensors - Sensing Devices -> Level Sensors
  'Level Sensor': '["23","22","148"]',

  // Ultrasonic Sensors - Sensing Devices -> Ultrasonic Sensors
  'Ultrasonic Sensor': '["23","22","115"]',

  // Light Curtains - Sensing Devices -> Light Curtains
  'Light Curtain': '["23","22","71"]',
  'Safety Light Curtain': '["23","22","71"]',

  // Barcode Scanners - Sensing Devices -> Barcode Scanners
  'Barcode Scanner': '["23","22","124"]',
  'Barcode Reader': '["23","22","124"]',

  // Encoders - Motion Control -> Encoders
  'Encoder': '["23","19","81"]',
  'Rotary Encoder': '["23","19","81"]',
  'Linear Encoder': '["23","19","81"]',

  // Safety Relays - Industrial Controls -> Safety Relays
  'Safety Relay': '["23","49","96"]',
  'Safety Controller': '["23","49","96"]',

  // Pneumatic Cylinders - Pneumatics -> Cylinders
  'Pneumatic Cylinder': '["23","46","47"]',
  'Air Cylinder': '["23","46","47"]',

  // Pneumatic Valves - Pneumatics -> Valves & Manifolds
  'Pneumatic Valve': '["23","46","68"]',
  'Solenoid Valve': '["23","74","76"]',

  // Pneumatic Grippers - Pneumatics -> Grippers
  'Pneumatic Gripper': '["23","46","117"]',

  // Pneumatic Regulators - Pneumatics -> Regulators
  'Air Regulator': '["23","46","86"]',

  // Hydraulic Cylinders - Hydraulics -> Cylinders
  'Hydraulic Cylinder': '["23","84","107"]',

  // Hydraulic Valves - Hydraulics -> Control Valves
  'Hydraulic Valve': '["23","84","91"]',

  // Hydraulic Pumps - Hydraulics -> Pumps
  'Hydraulic Pump': '["23","84","94"]',

  // Circuit Breakers - Electrical -> Circuit Breakers
  'Circuit Breaker': '["23","20","44"]',

  // Contactors - Industrial Controls -> Motor Starters
  'Contactor': '["23","49","50"]',
  'Motor Starter': '["23","49","50"]',

  // Transformers - Electrical -> Transformers
  'Transformer': '["23","20","37"]',

  // Relays - Industrial Controls -> Relays
  'Relay': '["23","49","66"]',
  'Control Relay': '["23","49","51"]',
  'Solid State Relay': '["23","49","66"]',

  // Bearings - Power Transmission -> Bearings (-> subtypes)
  'Bearing': '["23","26","43"]',
  'Ball Bearing': '["23","26","43","67"]',
  'Linear Bearing': '["23","26","43","70"]',
  'Pillow Block Bearing': '["23","26","43","92"]',
  'Tapered Roller Bearing': '["23","26","43","72"]',
  'Flange Bearing': '["23","26","43","80"]',
  'Cam Follower': '["23","26","43"]',
  'Roller Bearing': '["23","26","43"]',

  // Gear Reducers - Power Transmission -> Gear Reducer
  'Gearbox': '["23","26","36"]',
  'Gear Reducer': '["23","26","36"]',

  // Limit Switches - Industrial Controls -> Limit Switches
  'Limit Switch': '["23","49","58"]',

  // Push Buttons - Industrial Controls -> Push Buttons & Switches
  'Push Button': '["23","49","64"]',

  // Timers - Industrial Controls -> Timers & Counters
  'Timer': '["23","49","62"]',
  'Counter': '["23","49","62"]',

  // Temperature Controllers - Industrial Controls -> Temperature Controllers
  'Temperature Controller': '["23","49","63"]',

  // Default
  'Industrial Equipment': '["23"]'
};

// Default profiles
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

  // Look up canonical capitalization from bigcommerce_brands.json first
  const brandLower = brandName.toLowerCase().trim();
  if (brandsDb[brandLower]?.name) return brandsDb[brandLower].name;

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
  // Check full brand database first (2,556 brands)
  if (brandsDb[brandLower]?.id) return brandsDb[brandLower].id;
  // Fall back to hardcoded overrides
  return BRAND_IDS[brandLower] || null;
}

function generateKeywords(listing) {
  const keywords = [
    listing.brand,
    listing.partNumber,
    listing.productType,
    listing.manufacturer,
    listing.model
  ].filter(Boolean);
  return keywords.join(',');
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { listing } = req.body;

  if (!listing) {
    return res.status(400).json({ error: 'Listing data is required' });
  }

  console.log('=== SUBMIT TO SUREDONE (V2) ===');
  console.log('Title:', listing.title);
  console.log('Brand:', listing.brand);
  console.log('Part Number:', listing.partNumber);
  console.log('Product Type:', listing.productType);
  console.log('Condition:', listing.condition);

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
    const bigcommerceCategories = BIGCOMMERCE_CATEGORIES[listing.productType] || '["23"]';
    const keywords = generateKeywords(listing);

    console.log('BigCommerce Categories:', bigcommerceCategories);

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
    
    // Product Type
    formData.append('usertype', listing.productType || 'Industrial Equipment');
    
    // Condition
    const conditionValue = listing.condition?.suredoneValue || 'Used';
    formData.append('condition', conditionValue);
    
    // CONDITION NOTES - FIX: Add condition notes to SureDone
    if (listing.condition?.descriptionNote || listing.conditionNotes) {
      const notes = listing.condition?.descriptionNote || listing.conditionNotes;
      formData.append('notes', notes);
      console.log('Condition Notes:', notes.substring(0, 50) + '...');
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
    const isForParts = conditionValue === 'For Parts or Not Working';
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
    formData.append('bigcommercerelatedproducts', '-1');
    formData.append('bigcommercepagetitle', listing.title);
    formData.append('bigcommercemetadescription', listing.shortDescription || `${listing.title} - Available at Industrial Parts R Us`);
    formData.append('bigcommercemetakeywords', keywords);
    formData.append('bigcommercesearchkeywords', keywords);

    // === COUNTRY OF ORIGIN ===
    if (listing.countryOfOrigin) {
      formData.append('countryoforigin', listing.countryOfOrigin);
      formData.append('countryregionofmanufacture', listing.countryOfOrigin);
    }

    // === ITEM SPECIFICS ===
    console.log('=== ITEM SPECIFICS ===');
    if (listing.itemSpecifics && typeof listing.itemSpecifics === 'object') {
      for (const [fieldName, value] of Object.entries(listing.itemSpecifics)) {
        if (value && value !== null && value !== '' && value !== 'null' && value !== 'undefined') {
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
