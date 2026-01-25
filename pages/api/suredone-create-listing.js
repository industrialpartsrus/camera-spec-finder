// pages/api/suredone-create-listing.js
// Complete SureDone integration with UPC, BigCommerce multi-category, comprehensive eBay item specifics

// 30-day warranty text
const WARRANTY_TEXT = `We warranty all items for 30 days from date of purchase. If you experience any issues with your item within this period, please contact us and we will work with you to resolve the problem. This warranty covers defects in functionality but does not cover damage caused by misuse, improper installation, or normal wear and tear.`;

// Common brand ID mappings
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

// BigCommerce multi-category mappings: Shop All + Parent + Leaf
const BIGCOMMERCE_CATEGORY_MAP = {
  'Electric Motors': ['23', '26', '30'],
  'Servo Motors': ['23', '19', '54'],
  'Servo Drives': ['23', '19', '32'],
  'VFDs': ['23', '33', '34'],
  'PLCs': ['23', '18', '24'],
  'HMIs': ['23', '18', '27'],
  'Power Supplies': ['23', '18', '28'],
  'I/O Modules': ['23', '18', '61'],
  'Proximity Sensors': ['23', '22', '41'],
  'Photoelectric Sensors': ['23', '22', '42'],
  'Light Curtains': ['23', '22', '71'],
  'Laser Sensors': ['23', '22', '41'],
  'Pressure Sensors': ['23', '22', '116'],
  'Temperature Sensors': ['23', '22', '65'],
  'Ultrasonic Sensors': ['23', '22', '115'],
  'Pneumatic Cylinders': ['23', '46', '47'],
  'Pneumatic Valves': ['23', '46', '68'],
  'Pneumatic Grippers': ['23', '46', '117'],
  'Hydraulic Pumps': ['23', '84', '94'],
  'Hydraulic Valves': ['23', '84', '91'],
  'Hydraulic Cylinders': ['23', '84', '107'],
  'Circuit Breakers': ['23', '20', '44'],
  'Contactors': ['23', '49', '50'],
  'Safety Relays': ['23', '49', '96'],
  'Control Relays': ['23', '49', '51'],
  'Bearings': ['23', '26', '43'],
  'Linear Bearings': ['23', '26', '70'],
  'Encoders': ['23', '19', '81'],
  'Gearboxes': ['23', '26', '36'],
  'Transformers': ['23', '20', '37'],
  'Industrial Gateways': ['23', '18'],
  'Network Modules': ['23', '18', '61'],
  'Unknown': ['23']
};

// eBay Item Specifics: our field → SureDone's actual field name (from Suredone_Headers.csv)
// Field names are LOWERCASE with NO SPACES - SureDone format: ebayitemspecifics + fieldname
const EBAY_ITEM_SPECIFICS_MAP = {
  // === MOTOR FIELDS (exact SureDone field names) ===
  'voltage': 'voltage',
  'horsepower': 'motorhorsepower',
  'hp': 'motorhorsepower',
  'kw_rating': 'powerratingkw',
  'kw': 'powerratingkw',
  'rpm': 'ratedrpm',
  'frame_size': 'nemaframesize',
  'framesize': 'nemaframesize',
  'phase': 'acphase',
  'frequency': 'acfrequencyrating',
  'enclosure': 'enclosuretype',
  'enclosure_type': 'enclosuretype',
  'insulation_class': 'insulationclass',
  'service_factor': 'servicefactor',
  'servicefactor': 'servicefactor',
  'mounting_type': 'mountingtype',
  'shaft_type': 'shafttype',
  'shaft_diameter': 'shaftdiameter',
  'nema_design': 'nemadesignletter',
  'nema_frame_suffix': 'nemaframesuffix',
  'efficiency': 'efficiency',
  'duty_cycle': 'dutycycle',
  'motor_type': 'acmotortype',

  // === ELECTRICAL / CURRENT ===
  'amperage': 'fullloadamps',
  'current': 'fullloadamps',
  'input_voltage': 'inputvoltage',
  'output_voltage': 'outputvoltage',
  'coil_voltage': 'coilvoltagerating',
  'max_input_current': 'maximuminputcurrent',
  'max_output_current': 'maximumoutputcurrent',

  // === SENSORS ===
  'sensing_range': 'sensingrange',
  'sensing_distance': 'sensingrange',
  'sensing_type': 'sensingtype',
  'sensor_type': 'sensortype',
  'output_type': 'outputtype',
  'ip_rating': 'iprating',

  // === PUSHBUTTONS / SWITCHES ===
  'button_type': 'buttontype',
  'button_color': 'buttoncolor',
  'button_shape': 'buttonshape',
  'switch_action': 'switchaction',
  'switch_style': 'switchstyle',
  'contact_configuration': 'contactconfiguration',
  'contact_form': 'contactform',
  'contact_material': 'contactmaterial',
  'contact_rating': 'contactcurrentrating',

  // === PNEUMATIC / HYDRAULIC ===
  'bore_diameter': 'boresize',
  'bore_size': 'boresize',
  'stroke_length': 'strokelength',
  'stroke': 'strokelength',
  'cylinder_type': 'cylindertype',
  'port_size': 'portsize',
  'inlet_port': 'inletportdiameter',
  'outlet_port': 'outletportdiameter',
  'max_pressure': 'maximumpressure',
  'operating_pressure': 'operatingpressure',
  'flow_rate': 'maximumflowrate',
  'valve_type': 'valvetype',
  'valve_operation': 'valveoperation',
  'number_of_ports': 'numberofports',

  // === CIRCUIT BREAKERS / RELAYS ===
  'circuit_breaker_type': 'circuitbreakertype',
  'pole_configuration': 'numberofpoles',
  'number_of_poles': 'numberofpoles',
  'interrupt_rating': 'interruptingrating',
  'fuse_type': 'fusetype',
  'fuse_class': 'fuseclassification',

  // === PLC / HMI / COMMUNICATION ===
  'communication_protocol': 'communicationstandard',
  'communication': 'communicationstandard',
  'display_type': 'displaytype',
  'display_size': 'displayscreensize',
  'screen_size': 'displayscreensize',
  'resolution': 'displayresolution',
  'io_count': 'numberofiopoints',

  // === BEARINGS ===
  'bearing_type': 'bearingtype',
  'inner_diameter': 'innerdiameter',
  'outer_diameter': 'outerdiameter',

  // === UNIVERSAL ===
  'weight': 'weight',
  'country_of_origin': 'countryoforigin'
};

// Website custom field mappings (SureDone field names for website display)
const WEBSITE_CUSTOM_FIELDS = {
  'horsepower': 'horsepower',
  'hp': 'horsepower',
  'rpm': 'rpm',
  'voltage': 'voltage',
  'phase': 'phase',
  'frame_size': 'frame',
  'framesize': 'frame',
  'enclosure': 'enclosure',
  'enclosure_type': 'enclosure',
  'amperage': 'amperage',
  'current': 'amperage',
  'frequency': 'frequency',
  'service_factor': 'servicefactor',
  'servicefactor': 'servicefactor',
  'mounting_type': 'mountingtype',
  'kw_rating': 'kwrating',
  'kw': 'kwrating',
  'ip_rating': 'iprating',
  'insulation_class': 'insulationclass',
  'nema_design': 'nemadesign',
  'efficiency': 'efficiency'
};

function capitalizeWords(str) {
  if (!str) return str;
  return str.toLowerCase().split(' ').map(word => 
    word.charAt(0).toUpperCase() + word.slice(1)
  ).join(' ');
}

function toUpperCase(str) {
  if (!str) return str;
  return str.toUpperCase();
}

function capitalizeBrand(brandName) {
  if (!brandName) return brandName;
  
  const allCaps = ['ABB', 'SMC', 'CKD', 'IAI', 'PHD', 'STI', 'TDK', 'NSK', 'SKF', 'IKO', 
    'THK', 'NTN', 'FAG', 'GE', 'SEW', 'WEG', 'ATO', 'ARO', 'ITT', 'MKS', 'MTS', 'NSD',
    'IFM', 'HTM', 'NKE', 'ACU', 'AEG', 'AMK', 'APC', 'BBC', 'EAO', 'EMD', 'GEA', 'B&R'];
  
  const brandLower = brandName.toLowerCase().trim();
  const brandUpper = brandName.toUpperCase().trim();
  
  if (allCaps.includes(brandUpper)) return brandUpper;
  
  if (brandLower.includes('+')) {
    return brandLower.split('+').map(part => 
      part.charAt(0).toUpperCase() + part.slice(1)
    ).join('+');
  }
  
  if (brandLower.includes('-')) {
    return brandLower.split('-').map(part => {
      if (allCaps.includes(part.toUpperCase())) return part.toUpperCase();
      return part.charAt(0).toUpperCase() + part.slice(1);
    }).join('-');
  }
  
  return capitalizeWords(brandName);
}

function getBrandId(brandName) {
  if (!brandName) return null;
  const brandLower = brandName.toLowerCase().trim();
  if (BRAND_IDS[brandLower]) return BRAND_IDS[brandLower];
  
  const brandClean = brandLower.replace(/[^a-z0-9]/g, ' ').replace(/\s+/g, ' ').trim();
  for (const [key, id] of Object.entries(BRAND_IDS)) {
    const keyClean = key.replace(/[^a-z0-9]/g, ' ').replace(/\s+/g, ' ').trim();
    if (keyClean === brandClean || brandClean.includes(keyClean) || keyClean.includes(brandClean)) {
      return id;
    }
  }
  return null;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { product } = req.body;

  if (!product) {
    return res.status(400).json({ error: 'No product data provided' });
  }

  if (!product.title || !product.brand || !product.partNumber) {
    return res.status(400).json({ error: 'Missing required fields: title, brand, or partNumber' });
  }

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
    
    // === GET UPC ===
    let upc = null;
    let upcWarning = null;
    try {
      const baseUrl = req.headers.origin || (req.headers.host?.includes('localhost') 
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
          if (upcData.warning) upcWarning = upcData.warning;
          console.log('Assigned UPC:', upc, '| Remaining:', upcData.remaining);
        }
      }
    } catch (e) {
      console.log('UPC assignment error:', e.message);
    }
    
    // === FORMAT FIELDS ===
    const brandFormatted = capitalizeBrand(product.brand);
    const mpnFormatted = toUpperCase(product.partNumber);
    const modelFormatted = toUpperCase(product.model || product.partNumber);
    const bigcommerceBrandId = getBrandId(product.brand);
    
    // === GET BIGCOMMERCE MULTI-CATEGORIES ===
    const categoryKey = product.productCategory || 'Unknown';
    // Case-insensitive lookup
    const categoryLookup = Object.keys(BIGCOMMERCE_CATEGORY_MAP).find(
      k => k.toLowerCase() === categoryKey.toLowerCase()
    ) || 'Unknown';
    const bigcommerceCategories = BIGCOMMERCE_CATEGORY_MAP[categoryLookup] || BIGCOMMERCE_CATEGORY_MAP['Unknown'];
    const bigcommerceCategoriesStr = bigcommerceCategories.join('*');
    
    console.log('=== FIELD FORMATTING ===');
    console.log('Product Category:', categoryKey, '→ Lookup:', categoryLookup);
    console.log('Brand:', product.brand, '→', brandFormatted);
    console.log('MPN:', product.partNumber, '→', mpnFormatted);
    console.log('BigCommerce Brand ID:', bigcommerceBrandId);
    console.log('BigCommerce Categories:', bigcommerceCategoriesStr);
    console.log('UPC:', upc);
    
    const formData = new URLSearchParams();
    
    // === CORE FIELDS ===
    formData.append('identifier', 'guid');
    formData.append('guid', sku);
    formData.append('sku', sku);
    formData.append('title', product.title);
    formData.append('longdescription', product.description || '');
    formData.append('price', product.price || '0.00');
    formData.append('stock', product.stock || '1');
    formData.append('brand', brandFormatted);
    formData.append('manufacturer', brandFormatted);
    
    if (upc) formData.append('upc', upc);
    
    formData.append('mpn', mpnFormatted);
    formData.append('model', modelFormatted);
    formData.append('partnumber', mpnFormatted);
    
    // === CONDITION ===
    let suredoneCondition = 'Used';
    let isForParts = false;
    if (product.condition) {
      const condLower = product.condition.toLowerCase();
      if (condLower.includes('new in box') || condLower.includes('nib')) {
        suredoneCondition = 'New';
      } else if (condLower.includes('new') && condLower.includes('open')) {
        suredoneCondition = 'New Other';
      } else if (condLower.includes('refurbished')) {
        suredoneCondition = 'Manufacturer Refurbished';
      } else if (condLower.includes('parts') || condLower.includes('not working')) {
        suredoneCondition = 'For Parts or Not Working';
        isForParts = true;
      }
    }
    formData.append('condition', suredoneCondition);
    if (product.conditionNotes) formData.append('notes', product.conditionNotes);
    
    // === DIMENSIONS ===
    if (product.boxLength) formData.append('boxlength', product.boxLength);
    if (product.boxWidth) formData.append('boxwidth', product.boxWidth);
    if (product.boxHeight) formData.append('boxheight', product.boxHeight);
    if (product.weight) formData.append('weight', product.weight);
    
    // === SHELF LOCATION ===
    if (product.shelfLocation) {
      formData.append('shelf', product.shelfLocation);
      formData.append('bigcommercebinpickingnumber', product.shelfLocation);
    }
    
    // === BIGCOMMERCE FIELDS ===
    formData.append('bigcommerceisconditionshown', 'on');
    formData.append('bigcommerceavailabilitydescription', 'In Stock');
    formData.append('bigcommercerelatedproducts', '-1');
    formData.append('bigcommercewarranty', WARRANTY_TEXT);
    formData.append('bigcommerceisvisible', 'on');
    formData.append('bigcommercechannels', '1');
    formData.append('bigcommercepagetitle', product.title);
    formData.append('bigcommercempn', mpnFormatted);
    
    if (bigcommerceBrandId) formData.append('bigcommercebrandid', bigcommerceBrandId);
    
    // BigCommerce MULTI-CATEGORIES (Shop All + Parent + Leaf)
    formData.append('bigcommercecategories', bigcommerceCategoriesStr);
    console.log('BigCommerce Categories Sent:', bigcommerceCategoriesStr);
    
    // === META / SEO FIELDS ===
    const metaDescription = product.shortDescription || 
      product.metaDescription || 
      (product.description ? product.description.replace(/<[^>]*>/g, ' ').substring(0, 157) + '...' : '');
    
    if (metaDescription) formData.append('bigcommercemetadescription', metaDescription);
    
    if (product.metaKeywords) {
      const keywords = Array.isArray(product.metaKeywords) ? product.metaKeywords.join(', ') : product.metaKeywords;
      formData.append('bigcommercesearchkeywords', keywords);
      formData.append('bigcommercemetakeywords', keywords);
    }
    
    // === EBAY MARKETPLACE CATEGORY ===
    if (product.ebayCategoryId) {
      formData.append('ebaycatid', product.ebayCategoryId);
      console.log('eBay Marketplace Category:', product.ebayCategoryId);
    }
    
    // === EBAY STORE CATEGORIES ===
    if (product.ebayStoreCategoryId) {
      formData.append('ebaystoreid', product.ebayStoreCategoryId);
      console.log('eBay Store Category 1:', product.ebayStoreCategoryId);
    }
    if (product.ebayStoreCategoryId2) {
      formData.append('ebaystoreid2', product.ebayStoreCategoryId2);
      console.log('eBay Store Category 2:', product.ebayStoreCategoryId2);
    }
    
    // === EBAY SHIPPING & RETURN ===
    formData.append('ebayshippingprofileid', product.ebayShippingProfileId || '69077991015');
    if (!isForParts) {
      formData.append('ebayreturnprofileid', product.ebayReturnProfileId || '61860297015');
    }
    
    // === MAP SPECIFICATIONS TO EBAY ITEM SPECIFICS AND WEBSITE CUSTOM FIELDS ===
    if (product.specifications && typeof product.specifications === 'object') {
      for (const [key, value] of Object.entries(product.specifications)) {
        if (value && value !== 'null' && value !== null && value !== 'N/A' && value !== 'Unknown') {
          // 1. Map to eBay Item Specifics
          const suredoneFieldSuffix = EBAY_ITEM_SPECIFICS_MAP[key] || EBAY_ITEM_SPECIFICS_MAP[key.toLowerCase()];
          if (suredoneFieldSuffix) {
            const suredoneField = 'ebayitemspecifics' + suredoneFieldSuffix;
            formData.append(suredoneField, value);
            console.log(`eBay Item Specific: ${key} → ${suredoneField} = ${value}`);
          }

          // 2. Map to Website Custom Fields (for BigCommerce/website display)
          const websiteField = WEBSITE_CUSTOM_FIELDS[key] || WEBSITE_CUSTOM_FIELDS[key.toLowerCase()];
          if (websiteField) {
            formData.append(websiteField, value);
            console.log(`Website Field: ${key} → ${websiteField} = ${value}`);
          }
        }
      }
    }

    // === COUNTRY OF ORIGIN - Maps to BOTH eBay fields ===
    if (product.countryOfOrigin && product.countryOfOrigin.trim()) {
      const countryValue = product.countryOfOrigin.trim();
      formData.append('ebayitemspecificscountryoforigin', countryValue);
      formData.append('ebayitemspecificscountryregionofmanufacture', countryValue);
      console.log(`Country of Origin: ${countryValue} (set on both eBay fields)`);
    }

    // === USER TYPE (Product Type for eBay/Google) ===
    if (product.usertype && product.usertype.trim()) {
      formData.append('usertype', product.usertype.trim());
      formData.append('ebayitemspecificstype', product.usertype.trim());
      console.log(`User Type: ${product.usertype}`);
    }

    // === RAW SPECS AS CUSTOM FIELDS ===
    if (product.rawSpecifications && Array.isArray(product.rawSpecifications)) {
      let customFieldIndex = 1;
      for (const spec of product.rawSpecifications) {
        if (spec && typeof spec === 'string' && spec.includes(':') && customFieldIndex <= 20) {
          formData.append(`customfield${customFieldIndex}`, spec);
          customFieldIndex++;
        }
      }
    }
    
    console.log('=== SENDING TO SUREDONE ===');
    console.log('SKU:', sku);
    console.log('UPC:', upc);
    console.log('Brand:', brandFormatted);
    
    // === SEND TO SUREDONE ===
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
      const responseObj = { 
        success: true, 
        message: 'Product created in SureDone',
        sku: data.sku || sku,
        upc: upc,
        brandFormatted,
        bigcommerceBrandId,
        bigcommerceCategories: bigcommerceCategoriesStr
      };
      if (upcWarning) responseObj.warning = upcWarning;
      res.status(200).json(responseObj);
    } else {
      res.status(400).json({ 
        success: false, 
        error: data.message || 'SureDone API error',
        details: data
      });
    }
    
  } catch (error) {
    console.error('SureDone integration error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
}
