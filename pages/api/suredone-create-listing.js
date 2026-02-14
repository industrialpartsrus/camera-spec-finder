// pages/api/suredone-create-listing.js
// Complete SureDone integration with UPC, BigCommerce multi-category, comprehensive eBay item specifics
// Uses SHORT field names (no ebayitemspecifics prefix) to populate INLINE/RECOMMENDED fields

import brandsDb from '../../data/bigcommerce_brands.json';

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
  'Electric Motors': ['26', '30'],
  'Electric Motor': ['26', '30'],
  'AC Motor': ['26', '30'],
  'DC Motor': ['26', '30'],
  'Induction Motor': ['26', '30'],
  'Three Phase Motor': ['26', '30'],
  'Single Phase Motor': ['26', '30'],
  'Servo Motors': ['19', '54'],
  'Servo Motor': ['19', '54'],
  'AC Servo Motor': ['19', '54'],
  'DC Servo Motor': ['19', '54'],
  'Brushless Servo Motor': ['19', '54'],
  'Stepper Motor': ['26', '30'],
  'Step Motor': ['26', '30'],
  'Stepping Motor': ['26', '30'],
  'Gearmotor': ['26', '30'],
  'Gear Motor': ['26', '30'],
  'Geared Motor': ['26', '30'],
  'Brushless DC Motor': ['26', '30'],
  'BLDC Motor': ['26', '30'],

  // Drives
  'Servo Drives': ['19', '32'],
  'Servo Drive': ['19', '32'],
  'Servo Amplifier': ['19', '32'],
  'Servo Controller': ['19', '32'],
  'VFDs': ['33', '34'],
  'VFD': ['33', '34'],
  'Variable Frequency Drive': ['33', '34'],
  'AC Drive': ['33', '34'],
  'Inverter': ['33', '34'],
  'Frequency Inverter': ['33', '34'],
  'DC Drive': ['33', '35'],
  'DC Motor Drive': ['33', '35'],
  'Stepper Drive': ['19', '32'],
  'Stepper Controller': ['19', '32'],
  'Step Drive': ['19', '32'],

  // PLCs & Automation
  'PLCs': ['18', '24'],
  'PLC': ['18', '24'],
  'PLC Processor': ['18', '24'],
  'PLC CPU': ['18', '24'],
  'PLC Chassis': ['18', '24'],
  'PLC Rack': ['18', '24'],
  'PLC Power Supply': ['18', '28'],
  'HMIs': ['18', '27'],
  'HMI': ['18', '27'],
  'Touch Panel': ['18', '27'],
  'Operator Interface': ['18', '27'],
  'Operator Panel': ['18', '27'],
  'Touch Screen': ['18', '27'],
  'Power Supplies': ['18', '28'],
  'Power Supply': ['18', '28'],
  'Switching Power Supply': ['18', '28'],
  'DC Power Supply': ['18', '28'],
  'AC Power Supply': ['18', '28'],
  'Industrial Power Supply': ['18', '28'],
  'DIN Rail Power Supply': ['18', '28'],
  'I/O Modules': ['18', '61'],
  'I/O Module': ['18', '61'],
  'PLC I/O Module': ['18', '61'],
  'Input Module': ['18', '61'],
  'Output Module': ['18', '61'],
  'Communication Module': ['18', '61'],
  'Network Module': ['18', '61'],

  // Sensors - Proximity
  'Proximity Sensors': ['22', '41'],
  'Proximity Sensor': ['22', '41'],
  'Inductive Proximity Sensor': ['22', '41'],
  'Inductive Sensor': ['22', '41'],
  'Capacitive Proximity Sensor': ['22', '41'],
  'Capacitive Sensor': ['22', '41'],
  'Magnetic Proximity Sensor': ['22', '41'],

  // Sensors - Photoelectric
  'Photoelectric Sensors': ['22', '42'],
  'Photoelectric Sensor': ['22', '42'],
  'Photo Sensor': ['22', '42'],
  'Optical Sensor': ['22', '42'],
  'Through Beam Sensor': ['22', '42'],
  'Retroreflective Sensor': ['22', '42'],
  'Diffuse Sensor': ['22', '42'],
  'Fiber Optic Sensor': ['22', '78'],
  'Fiber Optic Amplifier': ['22', '78'],

  // Sensors - Light Curtains & Safety Scanners
  'Light Curtains': ['22', '71'],
  'Light Curtain': ['22', '71'],
  'Safety Light Curtain': ['22', '71'],
  'Safety Barrier': ['22', '71'],
  'Safety Scanner': ['22', '71'],
  'Area Scanner': ['22', '71'],

  // Sensors - Laser
  'Laser Sensors': ['22', '41'],
  'Laser Sensor': ['22', '41'],
  'Laser Distance Sensor': ['22', '41'],

  // Sensors - Pressure
  'Pressure Sensors': ['22', '116'],
  'Pressure Sensor': ['22', '116'],
  'Pressure Transducer': ['22', '116'],
  'Pressure Transmitter': ['22', '116'],

  // Sensors - Temperature
  'Temperature Sensors': ['22', '65'],
  'Temperature Sensor': ['22', '65'],
  'Thermocouple': ['22', '65'],
  'RTD': ['22', '65'],
  'Temperature Probe': ['22', '65'],

  // Sensors - Level & Ultrasonic
  'Ultrasonic Sensors': ['22', '115'],
  'Ultrasonic Sensor': ['22', '115'],
  'Level Sensor': ['22', '148'],
  'Level Switch': ['22', '148'],
  'Float Switch': ['22', '148'],

  // Sensors - Flow
  'Flow Sensor': ['22'],
  'Flow Meter': ['22'],
  'Flow Switch': ['22'],

  // Sensors - Other
  'Color Sensor': ['22'],
  'Color Mark Sensor': ['22'],
  'Vision Sensor': ['22', '59'],
  'Vision System': ['22', '59'],
  'Camera': ['22', '59'],
  'Current Sensor': ['22'],
  'Current Transformer': ['22'],
  'Load Cell': ['22'],
  'Force Sensor': ['22'],
  'Linear Sensor': ['22', '113'],
  'Position Sensor': ['22'],
  'LVDT': ['22', '113'],

  // Barcode & RFID
  'Barcode Scanner': ['22', '124'],
  'Barcode Scanners': ['22', '124'],
  'Barcode Reader': ['22', '124'],
  'Bar Code Scanner': ['22', '124'],
  'QR Code Reader': ['22', '124'],
  '2D Scanner': ['22', '124'],
  'RFID Reader': ['22', '132'],
  'RFID Antenna': ['22', '132'],
  'RFID Tag': ['22', '132'],

  // Encoders
  'Encoders': ['19', '81'],
  'Encoder': ['19', '81'],
  'Rotary Encoder': ['19', '81'],
  'Incremental Encoder': ['19', '81'],
  'Absolute Encoder': ['19', '81'],
  'Linear Encoder': ['19', '81'],
  'Shaft Encoder': ['19', '81'],
  'Hollow Shaft Encoder': ['19', '81'],
  'Magnetic Encoder': ['19', '81'],
  'Resolver': ['19', '81'],

  // Safety Devices - Interlocks
  'Safety Interlock': ['49', '79'],
  'Safety Door Switch': ['49', '79'],
  'Safety Mat': ['49', '79'],

  // Safety Devices - Safety Switches (Disconnect type)
  'Safety Switch': ['20', '52'],

  // Pneumatic Cylinders
  'Pneumatic Cylinders': ['46', '47'],
  'Pneumatic Cylinder': ['46', '47'],
  'Air Cylinder': ['46', '47'],
  'Compact Cylinder': ['46', '47'],
  'Round Cylinder': ['46', '47'],
  'ISO Cylinder': ['46', '47'],
  'NFPA Cylinder': ['46', '47'],
  'Rodless Cylinder': ['46', '55'],
  'Guided Cylinder': ['46', '56'],
  'Slide Cylinder': ['46', '47'],
  'Rotary Cylinder': ['46', '47'],

  // Pneumatic Valves
  'Pneumatic Valves': ['46', '68'],
  'Pneumatic Valve': ['46', '68'],
  'Solenoid Valve': ['46', '68'],
  'Air Valve': ['46', '68'],
  'Directional Valve': ['46', '68'],
  'Manifold': ['46', '68'],
  'Valve Manifold': ['46', '68'],
  'Valve Terminal': ['46', '68'],

  // Pneumatic Grippers
  'Pneumatic Grippers': ['46', '117'],
  'Pneumatic Gripper': ['46', '117'],
  'Gripper': ['46', '117'],
  'Parallel Gripper': ['46', '117'],
  'Angular Gripper': ['46', '117'],

  // Pneumatic Other
  'Pneumatic Actuator': ['46', '48'],
  'Air Regulator': ['46', '86'],
  'Pressure Regulator': ['46', '86'],
  'Filter Regulator': ['46', '86'],
  'FRL': ['46', '86'],
  'FRL Unit': ['46', '86'],
  'Air Filter': ['46'],
  'Compressed Air Filter': ['46'],
  'Coalescing Filter': ['46'],
  'Lubricator': ['46'],
  'Air Lubricator': ['46'],
  'Air Dryer': ['46'],
  'Muffler': ['46'],
  'Silencer': ['46'],

  // Hydraulics
  'Hydraulic Pumps': ['84', '94'],
  'Hydraulic Pump': ['84', '94'],
  'Gear Pump': ['84', '94'],
  'Vane Pump': ['84', '94'],
  'Piston Pump': ['84', '94'],
  'Hydraulic Power Unit': ['84', '94'],
  'HPU': ['84', '94'],
  'Hydraulic Valves': ['84', '91'],
  'Hydraulic Valve': ['84', '91'],
  'Directional Control Valve': ['84', '91'],
  'Proportional Valve': ['84', '91'],
  'Servo Valve': ['84', '91'],
  'Hydraulic Cylinders': ['84', '107'],
  'Hydraulic Cylinder': ['84', '107'],
  'Hydraulic Ram': ['84', '107'],
  'Hydraulic Actuator': ['84', '107'],
  'Hydraulic Motor': ['84'],
  'Hydraulic Accumulator': ['84'],
  'Accumulator': ['84'],
  'Hydraulic Filter': ['84', '85'],

  // Electrical - Circuit Breakers
  'Circuit Breakers': ['20', '44'],
  'Circuit Breaker': ['20', '44'],
  'Molded Case Circuit Breaker': ['20', '44'],
  'MCCB': ['20', '44'],
  'Miniature Circuit Breaker': ['20', '44'],
  'MCB': ['20', '44'],

  // Electrical - Disconnects & Fuses
  'Disconnect': ['20'],
  'Disconnect Switch': ['20'],
  'Fuse': ['20', '38'],
  'Fuse Holder': ['20', '38'],
  'Fuse Block': ['20', '38'],

  // Electrical - Transformers
  'Transformer': ['20', '37'],
  'Transformers': ['20', '37'],
  'Control Transformer': ['20', '37'],
  'Isolation Transformer': ['20', '37'],
  'Step Down Transformer': ['20', '37'],

  // Electrical - Enclosures
  'Enclosure': ['20', '45'],
  'Electrical Enclosure': ['20', '45'],
  'Junction Box': ['20', '45'],
  'Control Panel': ['20', '45'],

  // Contactors & Motor Starters
  'Contactors': ['49', '50'],
  'Contactor': ['49', '50'],
  'AC Contactor': ['49', '50'],
  'DC Contactor': ['49', '50'],
  'Motor Starter': ['49', '50'],
  'Soft Starter': ['49', '50'],
  'DOL Starter': ['49', '50'],
  'Motor Protector': ['49', '50'],
  'Overload Relay': ['49', '99'],

  // Safety Relays
  'Safety Relays': ['49', '96'],
  'Safety Relay': ['49', '96'],
  'Safety Controller': ['49', '96'],

  // Control Relays
  'Control Relays': ['49', '51'],
  'Control Relay': ['49', '51'],
  'Relay': ['49', '51'],
  'Ice Cube Relay': ['49', '51'],
  'Plug-in Relay': ['49', '51'],
  'Solid State Relay': ['49', '51'],
  'SSR': ['49', '51'],
  'Time Delay Relay': ['49', '62'],

  // Bearings
  'Bearings': ['26', '43'],
  'Bearing': ['26', '43'],
  'Ball Bearing': ['26', '43', '67'],
  'Roller Bearing': ['26', '43'],
  'Tapered Roller Bearing': ['26', '43', '72'],
  'Needle Bearing': ['26', '43'],
  'Thrust Bearing': ['26', '43'],
  'Linear Bearings': ['26', '43', '70'],
  'Linear Bearing': ['26', '43', '70'],
  'Linear Bushing': ['26', '43', '70'],
  'Pillow Block': ['26', '43', '92'],
  'Pillow Block Bearing': ['26', '43', '92'],
  'Flange Bearing': ['26', '43', '80'],
  'Cam Follower': ['26', '43'],

  // Power Transmission - Gearboxes
  'Gearboxes': ['26', '36'],
  'Gearbox': ['26', '36'],
  'Gear Reducer': ['26', '36'],
  'Speed Reducer': ['26', '36'],
  'Worm Gear': ['26', '36'],
  'Planetary Gearbox': ['26', '36'],
  'Helical Gearbox': ['26', '36'],
  'Right Angle Gearbox': ['26', '36'],

  // Power Transmission - Linear Motion
  'Ball Screw': ['26', '101'],
  'Ball Screw Assembly': ['26', '101'],
  'Ball Nut': ['26', '101'],
  'Lead Screw': ['26', '101'],
  'Linear Actuator': ['26', '101'],
  'Electric Linear Actuator': ['26', '101'],
  'Linear Stage': ['26', '101'],
  'Linear Module': ['26', '101'],
  'Linear Guide': ['26', '102'],
  'Linear Rail': ['26', '102'],
  'Linear Slide': ['26', '102'],
  'Rail Block': ['26', '102'],
  'Carriage': ['26', '102'],

  // Power Transmission - Brakes & Clutches
  'Brake': ['26', '73'],
  'Motor Brake': ['26', '73'],
  'Electromagnetic Brake': ['26', '73'],
  'Clutch': ['26', '73'],
  'Electromagnetic Clutch': ['26', '73'],
  'Clutch Brake': ['26', '73'],

  // Power Transmission - Belts, Pulleys, Chains
  'Belt': ['26'],
  'Timing Belt': ['26'],
  'V-Belt': ['26'],
  'Pulley': ['26'],
  'Timing Pulley': ['26'],
  'Sprocket': ['26'],
  'Chain': ['26'],
  'Roller Chain': ['26'],

  // Switches & Controls
  'Limit Switch': ['49', '58'],
  'Micro Switch': ['49', '58'],
  'Miniature Switch': ['49', '58'],
  'Push Button': ['49', '64'],
  'Pushbutton': ['49', '64'],
  'Pushbutton Switch': ['49', '64'],
  'Selector Switch': ['49', '64'],
  'Rotary Switch': ['49', '64'],
  'Toggle Switch': ['49', '64'],
  'Key Switch': ['49', '64'],
  'Foot Switch': ['49', '64'],
  'Palm Switch': ['49', '64'],
  'E-Stop': ['49', '64'],
  'Emergency Stop': ['49', '64'],
  'Pendant': ['49', '64'],
  'Pendant Control': ['49', '64'],
  'Pilot Light': ['49', '90'],
  'Indicator Light': ['49', '90'],
  'Stack Light': ['49', '90'],
  'Tower Light': ['49', '90'],
  'Signal Light': ['49', '90'],
  'Joystick': ['49', '64'],

  // Timers & Counters
  'Timer': ['49', '62'],
  'Digital Timer': ['49', '62'],
  'Analog Timer': ['49', '62'],
  'Counter': ['49', '62'],
  'Digital Counter': ['49', '62'],
  'Totalizer': ['49', '62'],
  'Tachometer': ['49', '62'],

  // Temperature Controllers
  'Temperature Controller': ['49', '63'],
  'PID Controller': ['49', '63'],
  'Process Controller': ['49', '63'],
  'Heater': ['49', '63'],
  'Heater Band': ['49', '63'],
  'Cartridge Heater': ['49', '63'],

  // Panel Meters
  'Panel Meter': ['49', '98'],
  'Digital Panel Meter': ['49', '98'],
  'Ammeter': ['49', '98'],
  'Voltmeter': ['49', '98'],
  'Wattmeter': ['49', '98'],
  'Gauge': ['49', '98'],
  'Pressure Gauge': ['49', '98'],
  'Temperature Gauge': ['49', '98'],

  // Pumps
  'Pump': ['82'],
  'Centrifugal Pump': ['82', '111'],
  'Diaphragm Pump': ['82', '93'],
  'Metering Pump': ['82', '110'],
  'Dosing Pump': ['82', '110'],
  'Vacuum Pump': ['82', '83'],
  'Condensate Pump': ['82'],

  // Valves - Industrial
  'Ball Valve': ['74', '75'],
  'Butterfly Valve': ['74', '95'],
  'Check Valve': ['74', '121'],
  'Globe Valve': ['74'],
  'Gate Valve': ['74', '119'],
  'Relief Valve': ['74', '112'],
  'Pressure Relief Valve': ['74', '112'],
  'Safety Valve': ['74', '112'],
  'Control Valve': ['74', '114'],
  'Needle Valve': ['74'],
  'Float Valve': ['74'],
  'Gas Valve': ['74'],
  'Steam Valve': ['74'],

  // HVAC
  'Fan': ['105', '106'],
  'Blower': ['105', '106'],
  'Cooling Fan': ['105', '106'],
  'Exhaust Fan': ['105', '106'],
  'Chiller': ['105'],

  // Computers
  'Industrial Computer': ['146'],
  'Industrial PC': ['146'],
  'Panel PC': ['146'],
  'Embedded Computer': ['146'],

  // Cables & Connectors
  'Cable': ['49', '77'],
  'Cordset': ['49', '77'],
  'Cord Set': ['49', '77'],
  'Connector': ['49', '77'],
  'Sensor Cable': ['49', '77'],
  'Motor Cable': ['49', '77'],
  'Encoder Cable': ['49', '77'],

  // Default
  'Industrial Gateways': ['18'],
  'Unknown': []
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

  // Look up canonical capitalization from bigcommerce_brands.json first
  const brandLower = brandName.toLowerCase().trim();
  if (brandsDb[brandLower]?.name) return brandsDb[brandLower].name;

  const allCaps = ['ABB', 'SMC', 'CKD', 'IAI', 'PHD', 'STI', 'TDK', 'NSK', 'SKF', 'IKO',
    'THK', 'NTN', 'FAG', 'GE', 'SEW', 'WEG', 'ATO', 'ARO', 'ITT', 'MKS', 'MTS', 'NSD',
    'IFM', 'HTM', 'NKE', 'ACU', 'AEG', 'AMK', 'APC', 'BBC', 'EAO', 'EMD', 'GEA', 'B&R'];

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
  // Check full brand database first (2,556 brands)
  if (brandsDb[brandLower]?.id) return brandsDb[brandLower].id;
  // Fall back to hardcoded overrides
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
    const bigcommerceCategoriesStr = JSON.stringify(bigcommerceCategories);

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

    // Use rawDescription (with preserved table HTML) if available, fallback to description
    formData.append('longdescription', product.rawDescription || product.description || '');
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

    // === PRODUCT PHOTOS (media1-media12) ===
    if (product.photoViews && product.photoViews.length > 0) {
      const baseUrl = `https://firebasestorage.googleapis.com/v0/b/camera-spec-finder.appspot.com/o/photos%2F${encodeURIComponent(sku)}%2F`;

      product.photoViews.forEach((view, index) => {
        // Prefer _nobg version if background was removed for this view
        const hasBgRemoved = product.removeBgFlags && product.removeBgFlags[view];
        const photoUrl = hasBgRemoved
          ? `${baseUrl}${encodeURIComponent(view)}_nobg.png?alt=media`
          : `${baseUrl}${encodeURIComponent(view)}.jpg?alt=media`;

        // SureDone supports media1 through media12
        const mediaField = `media${index + 1}`;
        if (index < 12) {
          formData.append(mediaField, photoUrl);
          console.log(`Added ${mediaField}: ${view}${hasBgRemoved ? ' (nobg)' : ''}`);
        }
      });
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

    const ebayFieldsSet = new Set(); // Track which eBay fields we've already set

    // === PASS 2: EBAY ITEM SPECIFICS (HIGHEST PRIORITY) ===
    // These come from auto-fill-ebay-specifics.js with resolved field names
    // (via resolveFieldName → canonical short names or ebayitemspecifics-prefixed)
    // User edits from the UI are already merged into this object by pro.js
    const ebaySpecifics = product.ebayItemSpecificsForSuredone || {};
    const pass2Count = Object.keys(ebaySpecifics).length;

    if (pass2Count > 0) {
      console.log(`=== PASS 2 EBAY ITEM SPECIFICS: ${pass2Count} fields ===`);
      for (const [fieldName, value] of Object.entries(ebaySpecifics)) {
        if (value && typeof value === 'string' && value.trim()) {
          formData.append(fieldName, value.trim());
          ebayFieldsSet.add(fieldName);
          console.log(`  PASS2: ${fieldName} = ${value}`);
        }
      }
      console.log(`Pass 2 fields applied: ${ebayFieldsSet.size}`);
    } else {
      console.log('No Pass 2 eBay item specifics provided');
    }

    // === SPEC_TO_EBAY_FIELD FALLBACK (LOWEST PRIORITY) ===
    // Only fills fields that Pass 2 didn't already cover
    // This is a generic motor-centric mapping — Pass 2 is category-specific and more accurate
    console.log('=== PROCESSING SPECIFICATIONS (FALLBACK MAPPING) ===');
    console.log('product.specifications:', JSON.stringify(product.specifications, null, 2));

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
