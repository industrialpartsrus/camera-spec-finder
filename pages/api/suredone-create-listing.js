// pages/api/suredone-create-listing.js
// Complete SureDone integration with UPC, BigCommerce multi-category, comprehensive eBay item specifics
// Uses SHORT field names (no ebayitemspecifics prefix) to populate INLINE/RECOMMENDED fields

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
// Maps AI-detected product types to BigCommerce category IDs
const BIGCOMMERCE_CATEGORY_MAP = {
  // Motors
  'Electric Motors': ['23', '26', '30'],
  'Electric Motor': ['23', '26', '30'],
  'AC Motor': ['23', '26', '30'],
  'DC Motor': ['23', '26', '30'],
  'Induction Motor': ['23', '26', '30'],
  'Servo Motors': ['23', '19', '54'],
  'Servo Motor': ['23', '19', '54'],
  'AC Servo Motor': ['23', '19', '54'],
  'DC Servo Motor': ['23', '19', '54'],
  'Stepper Motor': ['23', '26', '30'],
  'Gearmotor': ['23', '26', '30'],
  'Gear Motor': ['23', '26', '30'],
  
  // Drives
  'Servo Drives': ['23', '19', '32'],
  'Servo Drive': ['23', '19', '32'],
  'Servo Amplifier': ['23', '19', '32'],
  'VFDs': ['23', '33', '34'],
  'VFD': ['23', '33', '34'],
  'Variable Frequency Drive': ['23', '33', '34'],
  'AC Drive': ['23', '33', '34'],
  'DC Drive': ['23', '33'],
  'Stepper Drive': ['23', '19', '32'],
  'Inverter': ['23', '33', '34'],
  
  // PLCs & Automation
  'PLCs': ['23', '18', '24'],
  'PLC': ['23', '18', '24'],
  'PLC Processor': ['23', '18', '24'],
  'PLC CPU': ['23', '18', '24'],
  'PLC Chassis': ['23', '18', '24'],
  'PLC Power Supply': ['23', '18', '28'],
  'HMIs': ['23', '18', '27'],
  'HMI': ['23', '18', '27'],
  'Touch Panel': ['23', '18', '27'],
  'Operator Interface': ['23', '18', '27'],
  'Touch Screen': ['23', '18', '27'],
  'Power Supplies': ['23', '18', '28'],
  'Power Supply': ['23', '18', '28'],
  'I/O Modules': ['23', '18', '61'],
  'I/O Module': ['23', '18', '61'],
  'PLC I/O Module': ['23', '18', '61'],
  'Input Module': ['23', '18', '61'],
  'Output Module': ['23', '18', '61'],
  'Communication Module': ['23', '18', '61'],
  'Network Module': ['23', '18', '61'],
  
  // Sensors
  'Proximity Sensors': ['23', '22', '41'],
  'Proximity Sensor': ['23', '22', '41'],
  'Inductive Proximity Sensor': ['23', '22', '41'],
  'Capacitive Proximity Sensor': ['23', '22', '41'],
  'Photoelectric Sensors': ['23', '22', '42'],
  'Photoelectric Sensor': ['23', '22', '42'],
  'Photo Sensor': ['23', '22', '42'],
  'Fiber Optic Sensor': ['23', '22', '42'],
  'Light Curtains': ['23', '22', '71'],
  'Light Curtain': ['23', '22', '71'],
  'Safety Light Curtain': ['23', '22', '71'],
  'Laser Sensors': ['23', '22', '41'],
  'Laser Sensor': ['23', '22', '41'],
  'Pressure Sensors': ['23', '22', '116'],
  'Pressure Sensor': ['23', '22', '116'],
  'Pressure Transducer': ['23', '22', '116'],
  'Temperature Sensors': ['23', '22', '65'],
  'Temperature Sensor': ['23', '22', '65'],
  'Thermocouple': ['23', '22', '65'],
  'RTD': ['23', '22', '65'],
  'Ultrasonic Sensors': ['23', '22', '115'],
  'Ultrasonic Sensor': ['23', '22', '115'],
  'Level Sensor': ['23', '22', '115'],
  'Flow Sensor': ['23', '22'],
  'Color Sensor': ['23', '22'],
  'Vision Sensor': ['23', '22'],
  'Current Sensor': ['23', '22'],
  'Load Cell': ['23', '22'],
  'Barcode Scanner': ['23', '22'],
  'Barcode Scanners': ['23', '22'],
  'Barcode Reader': ['23', '22'],
  'RFID Reader': ['23', '22'],
  
  // Encoders
  'Encoders': ['23', '19', '81'],
  'Encoder': ['23', '19', '81'],
  'Rotary Encoder': ['23', '19', '81'],
  'Incremental Encoder': ['23', '19', '81'],
  'Absolute Encoder': ['23', '19', '81'],
  'Linear Encoder': ['23', '19', '81'],
  
  // Pneumatics
  'Pneumatic Cylinders': ['23', '46', '47'],
  'Pneumatic Cylinder': ['23', '46', '47'],
  'Air Cylinder': ['23', '46', '47'],
  'Compact Cylinder': ['23', '46', '47'],
  'Pneumatic Valves': ['23', '46', '68'],
  'Pneumatic Valve': ['23', '46', '68'],
  'Solenoid Valve': ['23', '46', '68'],
  'Air Valve': ['23', '46', '68'],
  'Pneumatic Grippers': ['23', '46', '117'],
  'Pneumatic Gripper': ['23', '46', '117'],
  'Gripper': ['23', '46', '117'],
  'Pneumatic Actuator': ['23', '46'],
  'Air Regulator': ['23', '46'],
  'FRL': ['23', '46'],
  'FRL Unit': ['23', '46'],
  
  // Hydraulics
  'Hydraulic Pumps': ['23', '84', '94'],
  'Hydraulic Pump': ['23', '84', '94'],
  'Hydraulic Valves': ['23', '84', '91'],
  'Hydraulic Valve': ['23', '84', '91'],
  'Hydraulic Cylinders': ['23', '84', '107'],
  'Hydraulic Cylinder': ['23', '84', '107'],
  'Hydraulic Motor': ['23', '84'],
  'Hydraulic Accumulator': ['23', '84'],
  
  // Electrical
  'Circuit Breakers': ['23', '20', '44'],
  'Circuit Breaker': ['23', '20', '44'],
  'MCCB': ['23', '20', '44'],
  'MCB': ['23', '20', '44'],
  'Disconnect': ['23', '20'],
  'Disconnect Switch': ['23', '20'],
  'Fuse': ['23', '20'],
  'Fuse Holder': ['23', '20'],
  'Transformer': ['23', '20', '37'],
  'Transformers': ['23', '20', '37'],
  'Enclosure': ['23', '20'],
  'Electrical Enclosure': ['23', '20'],
  
  // Contactors & Relays
  'Contactors': ['23', '49', '50'],
  'Contactor': ['23', '49', '50'],
  'Motor Starter': ['23', '49', '50'],
  'Soft Starter': ['23', '49', '50'],
  'Overload Relay': ['23', '49', '50'],
  'Safety Relays': ['23', '49', '96'],
  'Safety Relay': ['23', '49', '96'],
  'Safety Controller': ['23', '49', '96'],
  'Control Relays': ['23', '49', '51'],
  'Control Relay': ['23', '49', '51'],
  'Relay': ['23', '49', '51'],
  'Solid State Relay': ['23', '49', '51'],
  'SSR': ['23', '49', '51'],
  
  // Bearings
  'Bearings': ['23', '26', '43'],
  'Bearing': ['23', '26', '43'],
  'Ball Bearing': ['23', '26', '43'],
  'Roller Bearing': ['23', '26', '43'],
  'Linear Bearings': ['23', '26', '70'],
  'Linear Bearing': ['23', '26', '70'],
  'Pillow Block': ['23', '26', '43'],
  
  // Power Transmission
  'Gearboxes': ['23', '26', '36'],
  'Gearbox': ['23', '26', '36'],
  'Gear Reducer': ['23', '26', '36'],
  'Speed Reducer': ['23', '26', '36'],
  'Ball Screw': ['23', '26'],
  'Linear Actuator': ['23', '26'],
  'Linear Guide': ['23', '26'],
  'Linear Rail': ['23', '26'],
  'Belt': ['23', '26'],
  'Pulley': ['23', '26'],
  'Sprocket': ['23', '26'],
  'Chain': ['23', '26'],
  'Brake': ['23', '26'],
  'Clutch': ['23', '26'],
  
  // Switches & Controls
  'Limit Switch': ['23', '49'],
  'Push Button': ['23', '49'],
  'Selector Switch': ['23', '49'],
  'E-Stop': ['23', '49'],
  'Emergency Stop': ['23', '49'],
  'Pilot Light': ['23', '49'],
  'Stack Light': ['23', '49'],
  'Tower Light': ['23', '49'],
  'Joystick': ['23', '49'],
  
  // Timers & Counters
  'Timer': ['23', '49'],
  'Counter': ['23', '49'],
  'Temperature Controller': ['23', '49'],
  'PID Controller': ['23', '49'],
  'Panel Meter': ['23', '49'],
  
  // Default
  'Industrial Gateways': ['23', '18'],
  'Unknown': ['23']
};

// -----------------------------------------------------------------------------
// USERTYPE GENERATION: Use AI-provided productType directly when available
// Falls back to category mapping only if not provided
// -----------------------------------------------------------------------------
function generateUserType(productCategory, specifications = {}, aiProductType = null) {
  // If AI provided a specific product type, use it directly
  if (aiProductType && aiProductType !== 'Industrial Equipment') {
    console.log('Using AI-provided productType:', aiProductType);
    return aiProductType;
  }
  
  // Also check if specifications has a 'type' field from AI
  if (specifications.type && specifications.type !== 'Industrial Equipment') {
    console.log('Using specifications.type:', specifications.type);
    return specifications.type;
  }
  
  // Fallback to category mapping
  const categoryTypeMap = {
    'Electric Motors': specifications.enclosure_type || specifications.enclosuretype
      ? `${specifications.enclosure_type || specifications.enclosuretype} Electric Motor`
      : 'General Purpose Motor',
    'Servo Motors': 'AC Servo Motor',
    'AC Servo Motor': 'AC Servo Motor',
    'Servo Motor': 'AC Servo Motor',
    'Servo Drives': 'Servo Drive',
    'Servo Drive': 'Servo Drive',
    'VFDs': 'Variable Frequency Drive',
    'VFD': 'Variable Frequency Drive',
    'Variable Frequency Drive': 'Variable Frequency Drive',
    'PLCs': 'PLC Processor',
    'PLC': 'PLC Processor',
    'PLC Processor': 'PLC Processor',
    'HMIs': 'HMI Touch Panel',
    'HMI': 'HMI Touch Panel',
    'Power Supplies': 'Industrial Power Supply',
    'Power Supply': 'Industrial Power Supply',
    'I/O Modules': 'PLC I/O Module',
    'I/O Module': 'PLC I/O Module',
    'PLC I/O Module': 'PLC I/O Module',
    'Proximity Sensors': 'Proximity Sensor',
    'Proximity Sensor': 'Proximity Sensor',
    'Inductive Proximity Sensor': 'Inductive Proximity Sensor',
    'Photoelectric Sensors': 'Photoelectric Sensor',
    'Photoelectric Sensor': 'Photoelectric Sensor',
    'Light Curtains': 'Safety Light Curtain',
    'Light Curtain': 'Safety Light Curtain',
    'Laser Sensors': 'Laser Sensor',
    'Laser Sensor': 'Laser Sensor',
    'Pressure Sensors': 'Pressure Sensor',
    'Pressure Sensor': 'Pressure Sensor',
    'Temperature Sensors': 'Temperature Sensor',
    'Temperature Sensor': 'Temperature Sensor',
    'Barcode Scanner': 'Barcode Scanner',
    'Barcode Scanners': 'Barcode Scanner',
    'Barcode Reader': 'Barcode Scanner',
    'Encoder': 'Rotary Encoder',
    'Encoders': 'Rotary Encoder',
    'Rotary Encoder': 'Rotary Encoder',
    'Pneumatic Cylinders': 'Pneumatic Cylinder',
    'Pneumatic Cylinder': 'Pneumatic Cylinder',
    'Pneumatic Valves': 'Pneumatic Valve',
    'Pneumatic Valve': 'Pneumatic Valve',
    'Solenoid Valve': 'Solenoid Valve',
    'Pneumatic Grippers': 'Pneumatic Gripper',
    'Pneumatic Gripper': 'Pneumatic Gripper',
    'Hydraulic Pumps': 'Hydraulic Pump',
    'Hydraulic Pump': 'Hydraulic Pump',
    'Hydraulic Valves': 'Hydraulic Valve',
    'Hydraulic Valve': 'Hydraulic Valve',
    'Hydraulic Cylinders': 'Hydraulic Cylinder',
    'Hydraulic Cylinder': 'Hydraulic Cylinder',
    'Circuit Breakers': 'Circuit Breaker',
    'Circuit Breaker': 'Circuit Breaker',
    'Contactors': 'Contactor',
    'Contactor': 'Contactor',
    'Safety Relays': 'Safety Relay',
    'Safety Relay': 'Safety Relay',
    'Control Relays': 'Control Relay',
    'Control Relay': 'Control Relay',
    'Relay': 'Control Relay',
    'Bearings': 'Industrial Bearing',
    'Bearing': 'Industrial Bearing',
    'Ball Bearing': 'Ball Bearing',
    'Linear Bearings': 'Linear Bearing',
    'Linear Bearing': 'Linear Bearing',
    'Gearboxes': 'Gearbox',
    'Gearbox': 'Gearbox',
    'Gear Reducer': 'Gear Reducer',
    'Transformers': 'Transformer',
    'Transformer': 'Transformer',
    'Industrial Gateways': 'Industrial Gateway',
    'Network Modules': 'Network Module',
    'Network Module': 'Network Module',
    'Communication Module': 'Communication Module',
    'Timer': 'Timer',
    'Counter': 'Counter',
    'Temperature Controller': 'Temperature Controller',
    'Panel Meter': 'Panel Meter',
    'Limit Switch': 'Limit Switch',
    'Push Button': 'Push Button',
    'Safety Controller': 'Safety Controller',
    'Stepper Motor': 'Stepper Motor',
    'Stepper Drive': 'Stepper Drive',
    'DC Drive': 'DC Drive',
    'AC Drive': 'Variable Frequency Drive'
  };

  return categoryTypeMap[productCategory] || productCategory || 'Industrial Equipment';
}

// -----------------------------------------------------------------------------
// eBay Item Specifics MAPPING - USING SHORT FIELD NAMES FOR INLINE FIELDS
// Maps AI-extracted spec fields to SureDone INLINE field names (no prefix)
// These go to the RECOMMENDED section, not Dynamic!
// -----------------------------------------------------------------------------
const SPEC_TO_EBAY_FIELD = {
  // === MOTORS - SHORT NAMES (no ebayitemspecifics prefix) ===
  'horsepower': 'ratedloadhp',           // eBay: "Rated Load (HP)"
  'hp': 'ratedloadhp',
  'rated_load': 'ratedloadhp',
  'ratedload': 'ratedloadhp',
  
  'rpm': 'baserpm',                       // eBay: "Base RPM"
  'base_rpm': 'baserpm',
  'baserpm': 'baserpm',
  'speed': 'baserpm',
  
  'frame': 'iecframesize',                // eBay: "IEC Frame Size"
  'frame_size': 'iecframesize',
  'framesize': 'iecframesize',
  'iec_frame': 'iecframesize',
  'iecframesize': 'iecframesize',
  
  'motor_type': 'acmotortype',            // eBay: "AC Motor Type"
  'motortype': 'acmotortype',
  'ac_motor_type': 'acmotortype',
  'acmotortype': 'acmotortype',
  'type': 'acmotortype',
  
  'enclosure': 'enclosuretype',           // eBay: "Enclosure Type"
  'enclosure_type': 'enclosuretype',
  'enclosuretype': 'enclosuretype',
  
  'nema_design': 'nemadesignletter',      // eBay: "NEMA Design Letter"
  'nemadesign': 'nemadesignletter',
  'design_code': 'nemadesignletter',
  'nemadesignletter': 'nemadesignletter',
  
  'insulation_class': 'insulationclass',
  'insulationclass': 'insulationclass',
  
  'service_factor': 'servicefactor',
  'servicefactor': 'servicefactor',
  
  'frame_suffix': 'nemaframesuffix',
  'nema_frame_suffix': 'nemaframesuffix',
  'nemaframesuffix': 'nemaframesuffix',
  
  'mounting': 'mountingtype',
  'mounting_type': 'mountingtype',
  'mountingtype': 'mountingtype',
  
  'shaft_type': 'shafttype',
  'shafttype': 'shafttype',
  
  'shaft_diameter': 'shaftdiameter',
  'shaftdiameter': 'shaftdiameter',
  
  'special_construction': 'specialmotorconstruction',
  'specialmotorconstruction': 'specialmotorconstruction',
  
  'inverter_duty': 'invertervectordutyrating',
  'vfd_rated': 'invertervectordutyrating',
  'vector_duty': 'invertervectordutyrating',
  'invertervectordutyrating': 'invertervectordutyrating',

  // === ELECTRICAL - SHORT NAMES ===
  'voltage': 'nominalratedinputvoltage',    // eBay: "Nominal Rated Input Voltage"
  'input_voltage': 'nominalratedinputvoltage',
  'inputvoltage': 'nominalratedinputvoltage',
  'nominalratedinputvoltage': 'nominalratedinputvoltage',
  'rated_voltage': 'nominalratedinputvoltage',
  
  'actual_voltage': 'actualratedinputvoltage',
  'actualratedinputvoltage': 'actualratedinputvoltage',
  
  'amperage': 'fullloadamps',               // eBay: "Full Load Amps"
  'amps': 'fullloadamps',
  'current': 'fullloadamps',
  'fla': 'fullloadamps',
  'full_load_amps': 'fullloadamps',
  'fullloadamps': 'fullloadamps',
  
  'phase': 'acphase',                       // eBay: "AC Phase"
  'ac_phase': 'acphase',
  'acphase': 'acphase',
  
  'hz': 'acfrequencyrating',                // eBay: "AC Frequency Rating"
  'frequency': 'acfrequencyrating',
  'ac_frequency': 'acfrequencyrating',
  'acfrequencyrating': 'acfrequencyrating',
  
  'current_type': 'currenttype',            // AC/DC/Universal
  'currenttype': 'currenttype',
  
  'dc_winding': 'dcstatorwindingtype',
  'dcstatorwindingtype': 'dcstatorwindingtype',
  'stator_type': 'dcstatorwindingtype',

  // === TORQUE ===
  'torque': 'ratedfullloadtorque',
  'full_load_torque': 'ratedfullloadtorque',
  'ratedfullloadtorque': 'ratedfullloadtorque',
  
  'starting_torque': 'startinglockedrotortorque',
  'locked_rotor_torque': 'startinglockedrotortorque',
  'startinglockedrotortorque': 'startinglockedrotortorque',

  // === IP/PROTECTION ===
  'ip_rating': 'iprating',
  'iprating': 'iprating',
  
  'protection_liquids': 'protectionagainstliquids',
  'protectionagainstliquids': 'protectionagainstliquids',
  
  'protection_solids': 'protectionagainstsolids',
  'protectionagainstsolids': 'protectionagainstsolids',

  // === REVERSIBILITY ===
  'reversible': 'reversiblenonreversible',
  'reversiblenonreversible': 'reversiblenonreversible',

  // === COUNTRY/ORIGIN ===
  'country_of_origin': 'countryoforigin',
  'countryoforigin': 'countryoforigin',
  'country_of_manufacture': 'countryoforigin',
  'origin': 'countryoforigin',

  // === SENSORS ===
  'sensing_range': 'nominalsensingradius',
  'sensingrange': 'nominalsensingradius',
  'sensing_distance': 'nominalsensingradius',
  'operating_distance': 'operatingdistance',
  'operatingdistance': 'operatingdistance',
  'sensor_type': 'sensortype',
  'sensortype': 'sensortype',
  'output_type': 'outputtype',
  'outputtype': 'outputtype',

  // === PNEUMATIC / HYDRAULIC ===
  'bore_size': 'boresize',
  'boresize': 'boresize',
  'bore_diameter': 'boresize',
  'stroke': 'strokelength',
  'stroke_length': 'strokelength',
  'strokelength': 'strokelength',
  'cylinder_type': 'cylindertype',
  'cylindertype': 'cylindertype',
  'port_size': 'inletportdiameter',
  'inlet_port': 'inletportdiameter',
  'outlet_port': 'outletportdiameter',
  'valve_type': 'solenoidvalvetype',
  'number_of_ports': 'numberofports',
  
  'psi': 'maxpsi',
  'pressure': 'ratedpressure',
  'max_pressure': 'maximumpressure',
  'maxpressure': 'maximumpressure',
  'flow_rate': 'maximumflowrate',
  'flowrate': 'maximumflowrate',

  // === PLC / HMI / COMMUNICATION ===
  'communication': 'communicationstandard',
  'communication_protocol': 'communicationstandard',
  'display_type': 'displaytype',
  'display_size': 'displayscreensize',
  'screen_size': 'displayscreensize',

  // === CIRCUIT BREAKERS / RELAYS ===
  'number_of_poles': 'numberofpoles',
  'poles': 'numberofpoles'
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
    const categoryLookup = Object.keys(BIGCOMMERCE_CATEGORY_MAP).find(
      k => k.toLowerCase() === categoryKey.toLowerCase()
    ) || 'Unknown';
    const bigcommerceCategories = BIGCOMMERCE_CATEGORY_MAP[categoryLookup] || BIGCOMMERCE_CATEGORY_MAP['Unknown'];
    const bigcommerceCategoriesStr = bigcommerceCategories.join('*');

    // === GENERATE USERTYPE ===
    // Pass AI's usertype if available (comes from product.usertype or product.specifications.type)
    const aiProductType = product.usertype || product.specifications?.type || null;
    const userType = generateUserType(categoryKey, product.specifications || {}, aiProductType);

    console.log('=== FIELD FORMATTING ===');
    console.log('Product Category:', categoryKey, '→ Lookup:', categoryLookup);
    console.log('AI Product Type:', aiProductType);
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

    // === MAP SPECIFICATIONS TO EBAY INLINE FIELDS ===
    // Using SHORT field names (no prefix) to populate RECOMMENDED section
    console.log('=== PROCESSING SPECIFICATIONS (SHORT NAMES FOR INLINE FIELDS) ===');
    console.log('product.specifications:', JSON.stringify(product.specifications, null, 2));

    const ebayFieldsSet = new Set(); // Track which eBay fields we've already set

    if (product.specifications && typeof product.specifications === 'object') {
      console.log('Spec count:', Object.keys(product.specifications).length);

      for (const [key, value] of Object.entries(product.specifications)) {
        if (!value || value === 'null' || value === null || value === 'N/A' || value === 'Unknown') {
          console.log(`  SKIP: "${key}" = "${value}" (empty/null)`);
          continue;
        }

        const keyLower = key.toLowerCase().replace(/\s+/g, '_');
        const keyClean = key.toLowerCase().replace(/[_\s]+/g, '');

        // Find the SHORT eBay field name from our mapping (NO PREFIX)
        const ebayField = SPEC_TO_EBAY_FIELD[key] ||
                          SPEC_TO_EBAY_FIELD[keyLower] ||
                          SPEC_TO_EBAY_FIELD[keyClean];

        if (ebayField && !ebayFieldsSet.has(ebayField)) {
          formData.append(ebayField, value);
          ebayFieldsSet.add(ebayField);
          console.log(`  INLINE: ${ebayField} = ${value}`);
        } else if (ebayField) {
          console.log(`  SKIP (already set): ${ebayField}`);
        } else {
          console.log(`  NO mapping for: "${key}"`);
        }
      }
    } else {
      console.log('WARNING: No specifications object found');
    }

    console.log('Total inline eBay fields set:', ebayFieldsSet.size);

    // === HANDLE COUNTRY OF ORIGIN SPECIALLY ===
    if (product.countryOfOrigin || product.specifications?.country_of_origin || product.specifications?.countryoforigin) {
      const countryValue = product.countryOfOrigin ||
                          product.specifications?.country_of_origin ||
                          product.specifications?.countryoforigin;

      if (!ebayFieldsSet.has('countryoforigin')) {
        formData.append('countryoforigin', countryValue);
        console.log(`Country of Origin: ${countryValue}`);
      }
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
