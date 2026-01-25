// pages/api/suredone-create-listing.js
// Complete SureDone integration with UPC, BigCommerce multi-category, comprehensive eBay item specifics
// Uses EXACT field names from Suredone_Headers.csv

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

// -----------------------------------------------------------------------------
// USERTYPE GENERATION: AI-generated descriptive product type
// Examples: "General Purpose Motor", "Industrial Proximity Sensor", etc.
// -----------------------------------------------------------------------------
function generateUserType(productCategory, specifications = {}) {
  const categoryTypeMap = {
    'Electric Motors': specifications.enclosure_type || specifications.enclosuretype
      ? `${specifications.enclosure_type || specifications.enclosuretype} Electric Motor`
      : 'General Purpose Motor',
    'Servo Motors': 'Industrial Servo Motor',
    'Servo Drives': 'Industrial Servo Drive',
    'VFDs': 'Variable Frequency Drive',
    'PLCs': 'Programmable Logic Controller',
    'HMIs': 'Human Machine Interface',
    'Power Supplies': 'Industrial Power Supply',
    'I/O Modules': 'Industrial I/O Module',
    'Proximity Sensors': 'Industrial Proximity Sensor',
    'Photoelectric Sensors': 'Photoelectric Sensor',
    'Light Curtains': 'Safety Light Curtain',
    'Laser Sensors': 'Industrial Laser Sensor',
    'Pressure Sensors': 'Industrial Pressure Sensor',
    'Temperature Sensors': 'Industrial Temperature Sensor',
    'Pneumatic Cylinders': 'Pneumatic Air Cylinder',
    'Pneumatic Valves': 'Pneumatic Control Valve',
    'Pneumatic Grippers': 'Pneumatic Gripper',
    'Hydraulic Pumps': 'Hydraulic Pump',
    'Hydraulic Valves': 'Hydraulic Control Valve',
    'Hydraulic Cylinders': 'Hydraulic Cylinder',
    'Circuit Breakers': 'Industrial Circuit Breaker',
    'Contactors': 'Motor Contactor',
    'Safety Relays': 'Safety Relay Module',
    'Control Relays': 'Industrial Control Relay',
    'Bearings': 'Industrial Bearing',
    'Linear Bearings': 'Linear Motion Bearing',
    'Encoders': 'Rotary Encoder',
    'Gearboxes': 'Industrial Gearbox',
    'Transformers': 'Industrial Transformer',
    'Industrial Gateways': 'Industrial Communication Gateway',
    'Network Modules': 'Industrial Network Module'
  };

  return categoryTypeMap[productCategory] || 'Industrial Equipment';
}

// -----------------------------------------------------------------------------
// WEBSITE FIELD -> eBay Item Specifics MAPPING
// Maps our spec fields to BOTH website fields AND eBay item specifics
// Field names are EXACT matches from Suredone_Headers.csv
// -----------------------------------------------------------------------------
const WEBSITE_TO_EBAY_MAPPING = {
  // Motors - populate both motor horsepower AND rated horsepower
  'horsepower': ['ebayitemspecificsmotorhorsepower', 'ebayitemspecificsratedhorsepower'],
  'hp': ['ebayitemspecificsmotorhorsepower', 'ebayitemspecificsratedhorsepower'],
  'rpm': ['ebayitemspecificsratedrpm'],
  'frame': ['ebayitemspecificsnemaframesize'],
  'frame_size': ['ebayitemspecificsnemaframesize'],
  'framesize': ['ebayitemspecificsnemaframesize'],
  'nemaframesize': ['ebayitemspecificsnemaframesize'],
  'motortype': ['ebayitemspecificsacmotortype'],
  'motor_type': ['ebayitemspecificsacmotortype'],
  'enclosure': ['ebayitemspecificsenclosure'],
  'enclosure_type': ['ebayitemspecificsenclosure'],
  'enclosuretype': ['ebayitemspecificsenclosure'],
  'nema_design': ['ebayitemspecificsnemadesignletter'],
  'nemadesign': ['ebayitemspecificsnemadesignletter'],
  'insulation_class': ['ebayitemspecificsinsulationclass'],
  'insulationclass': ['ebayitemspecificsinsulationclass'],
  'shaft_diameter': ['ebayitemspecificsshaftdiameter'],
  'shaftdiameter': ['ebayitemspecificsshaftdiameter'],

  // Electrical
  'voltage': ['ebayitemspecificsratedvoltage', 'ebayitemspecificsactualratedinputvoltage'],
  'inputvoltage': ['ebayitemspecificsnominalinputvoltagerating', 'ebayitemspecificsinputvoltagerange'],
  'input_voltage': ['ebayitemspecificsnominalinputvoltagerating', 'ebayitemspecificsinputvoltagerange'],
  'outputvoltage': ['ebayitemspecificsouputvoltage', 'ebayitemspecificsoutputvoltageratingac'],
  'output_voltage': ['ebayitemspecificsouputvoltage', 'ebayitemspecificsoutputvoltageratingac'],
  'amperage': ['ebayitemspecificsamps', 'ebayitemspecificsactualcurrentrating'],
  'current': ['ebayitemspecificsamps', 'ebayitemspecificsactualcurrentrating'],
  'phase': ['ebayitemspecificsacphase', 'ebayitemspecificscurrentphase'],
  'hz': ['ebayitemspecificsacfrequencyrating'],
  'frequency': ['ebayitemspecificsacfrequencyrating', 'ebayitemspecificspowerfrequency'],
  'watts': ['ebayitemspecificswattage'],
  'wattage': ['ebayitemspecificswattage'],
  'kw': ['ebayitemspecificspowerkw'],
  'kw_rating': ['ebayitemspecificspowerkw'],
  'coilvoltage': ['ebayitemspecificscoilvoltagerating'],
  'coil_voltage': ['ebayitemspecificscoilvoltagerating'],

  // Motor specific
  'servicefactor': ['ebayitemspecificsservicefactor'],
  'service_factor': ['ebayitemspecificsservicefactor'],
  'insulationclass': ['ebayitemspecificsinsulationclass'],
  'insulation_class': ['ebayitemspecificsinsulationclass'],
  'nema_design': ['ebayitemspecificsnemadesignletter'],
  'nemadesign': ['ebayitemspecificsnemadesignletter'],
  'nema_frame_suffix': ['ebayitemspecificsnemaframesuffix'],

  // Mechanical
  'torque': ['ebayitemspecificscontinuoustorque'],
  'mountingtype': ['ebayitemspecificsmountingtype'],
  'mounting_type': ['ebayitemspecificsmountingtype'],
  'psi': ['ebayitemspecificsmaxpsi', 'ebayitemspecificsratedpressure'],
  'pressure': ['ebayitemspecificsratedpressure', 'ebayitemspecificsmaximumpressure'],
  'max_pressure': ['ebayitemspecificsmaximumpressure', 'ebayitemspecificsmaximumoutputpressure'],
  'flowrate': ['ebayitemspecificsmaximumflowrate'],
  'flow_rate': ['ebayitemspecificsmaximumflowrate'],
  'gpm': ['ebayitemspecificsgpm'],

  // Sensors
  'sensingrange': ['ebayitemspecificsnominalsensingradius'],
  'sensing_range': ['ebayitemspecificsnominalsensingradius'],
  'sensing_distance': ['ebayitemspecificsnominalsensingradius'],
  'operatingdistance': ['ebayitemspecificsoperatingdistance'],
  'operating_distance': ['ebayitemspecificsoperatingdistance'],
  'sensortype': ['ebayitemspecificssensortype'],
  'sensor_type': ['ebayitemspecificssensortype'],
  'outputtype': ['ebayitemspecificsoutputtype'],
  'output_type': ['ebayitemspecificsoutputtype'],
  'npnpnp': ['ebayitemspecificsoutputtype'],

  // Pneumatic/Hydraulic
  'bore_diameter': ['ebayitemspecificsboresize'],
  'bore_size': ['ebayitemspecificsboresize'],
  'boresize': ['ebayitemspecificsboresize'],
  'stroke_length': ['ebayitemspecificsstrokelength'],
  'stroke': ['ebayitemspecificsstrokelength'],
  'strokelength': ['ebayitemspecificsstrokelength'],
  'cylinder_type': ['ebayitemspecificscylindertype'],
  'cylindertype': ['ebayitemspecificscylindertype'],
  'port_size': ['ebayitemspecificsinletportdiameter'],
  'max_pressure': ['ebayitemspecificsmaximumpressure'],
  'maxpressure': ['ebayitemspecificsmaximumpressure'],

  // Switches/Buttons
  'button_type': ['ebayitemspecificsbuttontype'],
  'button_color': ['ebayitemspecificsbuttoncolor'],
  'switch_action': ['ebayitemspecificsswitchaction'],
  'contact_configuration': ['ebayitemspecificscontactconfiguration'],
  'contact_rating': ['ebayitemspecificscontactcurrentrating'],

  // Circuit Breakers/Relays
  'circuit_breaker_type': ['ebayitemspecificscircuitbreakertype'],
  'number_of_poles': ['ebayitemspecificsnumberofpoles', 'ebayitemspecificspoleconfiguration'],

  // Communication/Display
  'communication': ['ebayitemspecificscommunicationstandard'],
  'communication_protocol': ['ebayitemspecificscommunicationstandard'],
  'display_type': ['ebayitemspecificsdisplaytype'],
  'display_size': ['ebayitemspecificsdisplayscreensize'],
  'screen_size': ['ebayitemspecificsdisplayscreensize'],
  'resolution': ['ebayitemspecificsdisplayresolution'],

  // IP Rating
  'ip_rating': ['ebayitemspecificsiprating'],
  'iprating': ['ebayitemspecificsiprating'],

  // Country/Origin - populate BOTH fields
  'countryoforigin': ['ebayitemspecificscountryoforigin'],
  'country_of_origin': ['ebayitemspecificscountryoforigin'],
  'countryregionofmanufacture': ['ebayitemspecificscountryoforigin']
};

// Direct eBay field mapping (spec key -> exact eBay field name from CSV)
const EBAY_ITEM_SPECIFICS_MAP = {
  // === MOTOR FIELDS ===
  'voltage': 'ebayitemspecificsratedvoltage',
  'horsepower': 'ebayitemspecificsmotorhorsepower',
  'hp': 'ebayitemspecificsmotorhorsepower',
  'kw_rating': 'ebayitemspecificsratedhorsepower',
  'kw': 'ebayitemspecificspowerkw',
  'rpm': 'ebayitemspecificsratedrpm',
  'frame_size': 'ebayitemspecificsnemaframesize',
  'framesize': 'ebayitemspecificsnemaframesize',
  'frame': 'ebayitemspecificsnemaframesize',
  'phase': 'ebayitemspecificsacphase',
  'frequency': 'ebayitemspecificsacfrequencyrating',
  'hz': 'ebayitemspecificsacfrequencyrating',
  'enclosure': 'ebayitemspecificsenclosure',
  'enclosure_type': 'ebayitemspecificsenclosure',
  'enclosuretype': 'ebayitemspecificsenclosure',
  'insulation_class': 'ebayitemspecificsinsulationclass',
  'insulationclass': 'ebayitemspecificsinsulationclass',
  'service_factor': 'ebayitemspecificsservicefactor',
  'servicefactor': 'ebayitemspecificsservicefactor',
  'mounting_type': 'ebayitemspecificsmountingtype',
  'mountingtype': 'ebayitemspecificsmountingtype',
  'shaft_type': 'ebayitemspecificsshafttype',
  'shaft_diameter': 'ebayitemspecificsshaftdiameter',
  'nema_design': 'ebayitemspecificsnemadesignletter',
  'nema_frame_suffix': 'ebayitemspecificsnemaframesuffix',
  'motor_type': 'ebayitemspecificsacmotortype',
  'motortype': 'ebayitemspecificsacmotortype',
  'efficiency': 'ebayitemspecificsefficiency',

  // === ELECTRICAL / CURRENT ===
  'amperage': 'ebayitemspecificsamps',
  'amps': 'ebayitemspecificsamps',
  'current': 'ebayitemspecificsactualcurrentrating',
  'input_voltage': 'ebayitemspecificsnominalinputvoltagerating',
  'inputvoltage': 'ebayitemspecificsnominalinputvoltagerating',
  'output_voltage': 'ebayitemspecificsouputvoltage',
  'outputvoltage': 'ebayitemspecificsouputvoltage',
  'coil_voltage': 'ebayitemspecificscoilvoltagerating',
  'coilvoltage': 'ebayitemspecificscoilvoltagerating',
  'max_input_current': 'ebayitemspecificsmaximuminputcurrent',
  'max_output_current': 'ebayitemspecificsmaximumpeakoutputcurrent',
  'full_load_amps': 'ebayitemspecificsfullloadamps',
  'fullloadamps': 'ebayitemspecificsfullloadamps',

  // === POWER ===
  'watts': 'ebayitemspecificswattage',
  'wattage': 'ebayitemspecificswattage',
  'power': 'ebayitemspecificspower',
  'power_rating': 'ebayitemspecificspowerrating',
  'max_wattage': 'ebayitemspecificsmaxwattage',
  'output_power': 'ebayitemspecificsoutputpower',

  // === TORQUE ===
  'torque': 'ebayitemspecificscontinuoustorque',
  'continuous_torque': 'ebayitemspecificscontinuoustorque',
  'holding_torque': 'ebayitemspecificsholdingtorque',
  'stall_torque': 'ebayitemspecificsstalltorque',

  // === SENSORS ===
  'sensing_range': 'ebayitemspecificsnominalsensingradius',
  'sensingrange': 'ebayitemspecificsnominalsensingradius',
  'sensing_distance': 'ebayitemspecificsnominalsensingradius',
  'sensing_type': 'ebayitemspecificssensingtype',
  'sensor_type': 'ebayitemspecificssensortype',
  'sensortype': 'ebayitemspecificssensortype',
  'output_type': 'ebayitemspecificsoutputtype',
  'outputtype': 'ebayitemspecificsoutputtype',
  'ip_rating': 'ebayitemspecificsiprating',
  'iprating': 'ebayitemspecificsiprating',
  'operating_distance': 'ebayitemspecificsoperatingdistance',

  // === PUSHBUTTONS / SWITCHES ===
  'button_type': 'ebayitemspecificsbuttontype',
  'button_color': 'ebayitemspecificsbuttoncolor',
  'button_shape': 'ebayitemspecificsbuttonshape',
  'switch_action': 'ebayitemspecificsswitchaction',
  'switch_style': 'ebayitemspecificsswitchstyle',
  'contact_configuration': 'ebayitemspecificscontactconfiguration',
  'contact_form': 'ebayitemspecificscontactform',
  'contact_material': 'ebayitemspecificscontactmaterial',
  'contact_rating': 'ebayitemspecificscontactcurrentrating',

  // === PNEUMATIC / HYDRAULIC ===
  'bore_diameter': 'ebayitemspecificsboresize',
  'bore_size': 'ebayitemspecificsboresize',
  'stroke_length': 'ebayitemspecificsstrokelength',
  'stroke': 'ebayitemspecificsstrokelength',
  'cylinder_type': 'ebayitemspecificscylindertype',
  'port_size': 'ebayitemspecificsinletportdiameter',
  'inlet_port': 'ebayitemspecificsinletportdiameter',
  'outlet_port': 'ebayitemspecificsoutletportdiameter',
  'max_pressure': 'ebayitemspecificsmaximumpressure',
  'pressure': 'ebayitemspecificsratedpressure',
  'operating_pressure': 'ebayitemspecificsoperatingpressure',
  'flow_rate': 'ebayitemspecificsmaximumflowrate',
  'flowrate': 'ebayitemspecificsmaximumflowrate',
  'valve_type': 'ebayitemspecificssolenoidvalvetype',
  'valve_operation': 'ebayitemspecificsvalveoperation',
  'number_of_ports': 'ebayitemspecificsnumberofports',
  'psi': 'ebayitemspecificsmaxpsi',
  'gpm': 'ebayitemspecificsgpm',

  // === CIRCUIT BREAKERS / RELAYS ===
  'circuit_breaker_type': 'ebayitemspecificscircuitbreakertype',
  'pole_configuration': 'ebayitemspecificspoleconfiguration',
  'number_of_poles': 'ebayitemspecificsnumberofpoles',
  'fuse_type': 'ebayitemspecificsfusetype',
  'fuse_class': 'ebayitemspecificsfuseclassification',

  // === PLC / HMI / COMMUNICATION ===
  'communication_protocol': 'ebayitemspecificscommunicationstandard',
  'communication': 'ebayitemspecificscommunicationstandard',
  'display_type': 'ebayitemspecificsdisplaytype',
  'display_size': 'ebayitemspecificsdisplayscreensize',
  'screen_size': 'ebayitemspecificsdisplayscreensize',
  'resolution': 'ebayitemspecificsdisplayresolution',

  // === DIMENSIONS ===
  'length': 'ebayitemspecificsitemlength',
  'width': 'ebayitemspecificsitemwidth',
  'height': 'ebayitemspecificsitemheight',
  'depth': 'ebayitemspecificsitemdepth',
  'diameter': 'ebayitemspecificsitemdiameter',

  // === COUNTRY/ORIGIN ===
  'country_of_origin': 'ebayitemspecificscountryoforigin',
  'countryoforigin': 'ebayitemspecificscountryoforigin',
  'country_of_manufacture': 'ebayitemspecificscountryoforigin',
  'origin': 'ebayitemspecificscountryoforigin'
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

  console.log('=== SUREDONE CREATE LISTING START ===');
  console.log('Raw product received:', JSON.stringify(product, null, 2));

  if (!product) {
    return res.status(400).json({ error: 'No product data provided' });
  }

  if (!product.title || !product.brand || !product.partNumber) {
    return res.status(400).json({ error: 'Missing required fields: title, brand, or partNumber' });
  }

  console.log('Product title:', product.title);
  console.log('Product brand:', product.brand);
  console.log('Product partNumber:', product.partNumber);
  console.log('Product productCategory:', product.productCategory);
  console.log('Product specifications keys:', product.specifications ? Object.keys(product.specifications) : 'NONE');

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

    // === GENERATE USERTYPE ===
    const userType = generateUserType(categoryKey, product.specifications || {});

    console.log('=== FIELD FORMATTING ===');
    console.log('Product Category:', categoryKey, '→ Lookup:', categoryLookup);
    console.log('Brand:', product.brand, '→', brandFormatted);
    console.log('MPN:', product.partNumber, '→', mpnFormatted);
    console.log('BigCommerce Brand ID:', bigcommerceBrandId);
    console.log('BigCommerce Categories:', bigcommerceCategoriesStr);
    console.log('UPC:', upc);
    console.log('UserType:', userType);

    const formData = new URLSearchParams();

    // === CORE FIELDS ===
    formData.append('identifier', 'guid');
    formData.append('guid', sku);
    formData.append('sku', sku);
    formData.append('title', product.title);

    // === SKIP AUTO-PUSH TO CHANNELS (create as draft for manual review/images) ===
    formData.append('ebayskip', '1');
    formData.append('bigcommerceskip', '1');
    console.log('Channels skipped: eBay and BigCommerce (draft mode)');
    formData.append('longdescription', product.description || '');
    formData.append('price', product.price || '0.00');
    formData.append('stock', product.stock || '1');
    formData.append('brand', brandFormatted);
    formData.append('manufacturer', brandFormatted);

    if (upc) formData.append('upc', upc);

    formData.append('mpn', mpnFormatted);
    formData.append('model', modelFormatted);
    formData.append('partnumber', mpnFormatted);

    // === USERTYPE - AI-generated descriptive product type ===
    formData.append('usertype', userType);
    console.log('UserType field set:', userType);

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

    // === MAP SPECIFICATIONS TO BOTH WEBSITE AND EBAY FIELDS ===
    console.log('=== RAW SPECIFICATIONS RECEIVED ===');
    console.log('product.specifications:', JSON.stringify(product.specifications, null, 2));
    console.log('Type:', typeof product.specifications);

    if (product.specifications && typeof product.specifications === 'object') {
      console.log('=== PROCESSING SPECIFICATIONS ===');
      console.log('Number of specs:', Object.keys(product.specifications).length);

      for (const [key, value] of Object.entries(product.specifications)) {
        console.log(`Processing: "${key}" = "${value}"`);

        if (value && value !== 'null' && value !== null && value !== 'N/A' && value !== 'Unknown') {
          const keyLower = key.toLowerCase().replace(/\s+/g, '_');
          const keyClean = key.toLowerCase().replace(/[_\s]+/g, '');
          const keyUnderscore = key.toLowerCase().replace(/\s+/g, '_');

          console.log(`  Key variants: original="${key}", lower="${keyLower}", clean="${keyClean}"`);

          // 1. Set the WEBSITE field directly (e.g., horsepower, voltage, rpm)
          formData.append(keyLower, value);
          console.log(`Website Field: ${keyLower} = ${value}`);

          // 2. Check WEBSITE_TO_EBAY_MAPPING for dual population
          const websiteMapping = WEBSITE_TO_EBAY_MAPPING[key] ||
                                WEBSITE_TO_EBAY_MAPPING[keyLower] ||
                                WEBSITE_TO_EBAY_MAPPING[keyClean] ||
                                WEBSITE_TO_EBAY_MAPPING[keyUnderscore];

          console.log(`  WEBSITE_TO_EBAY_MAPPING lookup: found=${!!websiteMapping}`);

          if (websiteMapping && Array.isArray(websiteMapping)) {
            for (const ebayField of websiteMapping) {
              formData.append(ebayField, value);
              console.log(`  ✓ eBay Field (dual): ${ebayField} = ${value}`);
            }
          } else {
            console.log(`  ✗ No WEBSITE_TO_EBAY_MAPPING for: ${key}, ${keyLower}, ${keyClean}`);
          }

          // 3. Also check direct EBAY_ITEM_SPECIFICS_MAP
          const directEbayField = EBAY_ITEM_SPECIFICS_MAP[key] ||
                                  EBAY_ITEM_SPECIFICS_MAP[keyLower] ||
                                  EBAY_ITEM_SPECIFICS_MAP[keyClean] ||
                                  EBAY_ITEM_SPECIFICS_MAP[keyUnderscore];

          console.log(`  EBAY_ITEM_SPECIFICS_MAP lookup: found=${!!directEbayField}`);

          if (directEbayField) {
            formData.append(directEbayField, value);
            console.log(`  ✓ eBay Field (direct): ${directEbayField} = ${value}`);
          } else {
            console.log(`  ✗ No EBAY_ITEM_SPECIFICS_MAP for: ${key}, ${keyLower}, ${keyClean}`);
          }
        } else {
          console.log(`  Skipping empty/null value: "${value}"`);
        }
      }
    } else {
      console.log('WARNING: No specifications object found or not an object');
      console.log('product.specifications =', product.specifications);
    }

    // === HANDLE COUNTRY OF ORIGIN SPECIALLY ===
    // Populate both countryoforigin (website) AND ebayitemspecificscountryoforigin (eBay)
    // AND countryregionofmanufacture (website)
    if (product.countryOfOrigin || product.specifications?.country_of_origin || product.specifications?.countryoforigin) {
      const countryValue = product.countryOfOrigin ||
                          product.specifications?.country_of_origin ||
                          product.specifications?.countryoforigin;

      // Website fields
      formData.append('countryoforigin', countryValue);
      formData.append('countryregionofmanufacture', countryValue);

      // eBay item specific
      formData.append('ebayitemspecificscountryoforigin', countryValue);

      console.log(`Country of Origin: ${countryValue} → countryoforigin, countryregionofmanufacture, ebayitemspecificscountryoforigin`);
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
    console.log('UserType:', userType);

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
        bigcommerceCategories: bigcommerceCategoriesStr,
        userType
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
