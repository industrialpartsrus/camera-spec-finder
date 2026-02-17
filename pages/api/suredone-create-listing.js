// pages/api/suredone-create-listing.js
// Complete SureDone integration with UPC, BigCommerce multi-category, comprehensive eBay item specifics
// Uses SHORT field names (no ebayitemspecifics prefix) to populate INLINE/RECOMMENDED fields

import brandsDb from '../../data/bigcommerce_brands.json';

// 30-day warranty text
const WARRANTY_TEXT = `We warranty all items for 30 days from date of purchase. If you experience any issues with your item within this period, please contact us and we will work with you to resolve the problem. This warranty covers defects in functionality but does not cover damage caused by misuse, improper installation, or normal wear and tear.`;

// BigCommerce Brand ID Mappings
// Updated: February 14, 2026
// Total entries: 238 lookup keys → ~200 unique brand families
// Source: brand-ids-update.js
const BRAND_IDS = {

  // === A ===
  'abb': '86',
  'acme': '206',
  'acme electric': '4632',
  'acme transformer': '4488',
  'aeg': '719',
  'aeg/modicon': '204',
  'allen bradley': '40',
  'allen-bradley': '40',
  'ametek': '142',
  'amci': '887',
  'anaheim automation': '288',
  'appleton': '749',
  'applied motion': '889',
  'applied motion products': '889',
  'asco': '298',
  'ashcroft': '4113',
  'automation direct': '286',
  'automationdirect': '286',
  'automation direct stride': '695',
  'autonics': '649',
  'avtron': '4351',

  // === B ===
  'b&r': '97',
  'b&r automation': '97',
  'br automation': '97',
  'baldor': '92',
  'baldor reliance': '4626',
  'balluff': '230',
  'banner': '73',
  'banner engineering': '73',
  'barksdale': '240',
  'baumer': '813',
  'baumer electric': '813',
  'beckhoff': '76',
  'bei': '232',
  'bei industrial encoders': '232',
  'beijer': '4350',
  'beijer electronics': '4350',
  'benshaw': '5274',
  'bernstein': '739',
  'bimba': '196',
  'bodine': '236',
  'bodine electric': '236',
  'bonfiglioli': '244',
  'bosch': '168',
  'bosch rexroth': '807',
  'boston gear': '237',
  'browning': '235',
  'burkert': '299',
  'bussmann': '68',
  'cooper bussmann': '42',

  // === C ===
  'carlo gavazzi': '285',
  'ckd': '157',
  'clippard': '278',
  'cognex': '170',
  'control techniques': '4501',
  'cosel': '856',
  'crouse-hinds': '308',
  'crouzet': '370',
  'crydom': '4203',
  'cutler hammer': '72',
  'cutler-hammer': '72',

  // === D ===
  'danfoss': '335',
  'dart controls': '756',
  'datalogic': '319',
  'dayton': '337',
  'destaco': '334',
  'di-soric': '5362',
  'dodge': '140',
  'dunkermotoren': '4264',
  'dwyer': '327',
  'dwyer instruments': '322',
  'dynapar': '317',

  // === E ===
  'eaton': '329',
  'eaton cutler hammer': '331',
  'eaton moeller': '5561',
  'emerson': '355',
  'encoder products': '4239',
  'enerpac': '346',
  'euchner': '5308',

  // === F ===
  'fanuc': '118',
  'ferraz shawmut': '61',
  'festo': '44',
  'finder': '4546',
  'fuji': '84',
  'fuji electric': '84',

  // === G ===
  'ge': '88',
  'general electric': '88',
  'ge fanuc': '342',
  'ge-fanuc': '342',
  'ge motors': '5486',
  'gimatic': '4294',
  'graco': '156',

  // === H ===
  'hammond': '381',
  'hammond manufacturing': '4726',
  'harting': '4301',
  'heidenhain': '385',
  'hengstler': '4391',
  'hevi-duty': '4731',
  'hitachi': '396',
  'hiwin': '5097',
  'hoffman': '380',
  'honeywell': '382',
  'hubbell': '395',
  'humphrey': '390',

  // === I ===
  'iai': '150',
  'iai corporation': '121',
  'idec': '391',
  'ifm': '4114',
  'ifm efector': '4114',
  'ifm electronic': '4114',
  'ina': '388',
  'ina bearings': '388',

  // === K ===
  'kb electronics': '425',
  'keyence': '47',
  'klockner moeller': '750',
  'kollmorgen': '4157',
  'koyo': '593',
  'kuka': '4642',

  // === L ===
  'lambda': '581',
  'leeson': '655',
  'lenze': '918',
  'leroy somer': '663',
  'leroy-somer': '663',
  'leuze': '4853',
  'leuze electronic': '4853',
  'leviton': '4421',
  'lincoln electric': '4663',
  'littelfuse': '62',
  'lumberg': '4686',

  // === M ===
  'macromatic': '751',
  'magnecraft': '4454',
  'maple systems': '4099',
  'marathon': '910',
  'marathon electric': '4637',
  'mean well': '427',
  'mersen': '5487',
  'minarik': '829',
  'minarik drives': '829',
  'mitsubishi': '158',
  'mitsubishi electric': '437',
  'modicon': '446',
  'moeller': '451',
  'moxa': '4274',
  'murr elektronik': '456',

  // === N ===
  'nachi': '462',
  'nidec': '4352',
  'nord': '455',
  'nord drivesystems': '455',
  'nordson': '119',
  'norgren': '465',
  'nsk': '457',
  'nsk bearings': '457',
  'ntn': '463',
  'ntn bearings': '463',
  'numatics': '440',

  // === O ===
  'omron': '39',
  'opto 22': '4220',
  'oriental motor': '200',

  // === P ===
  'panasonic': '478',
  'parker': '89',
  'parker hannifin': '89',
  'patlite': '479',
  'pepperl+fuchs': '477',
  'pepperl fuchs': '477',
  'pfannenberg': '4693',
  'phoenix contact': '192',
  'pilz': '504',
  'pizzato': '5549',
  'power one': '513',
  'power-one': '513',
  'pro-face': '529',
  'proface': '529',
  'prosoft': '5212',
  'prosense': '4480',
  'puls': '524',
  'puls dimension': '524',

  // === R ===
  'red lion': '43',
  'red lion controls': '4555',
  'reliance': '93',
  'reliance electric': '93',
  'renishaw': '519',
  'rexnord': '711',
  'rexroth': '87',
  'rexroth indramat': '4865',
  'rhino': '676',
  'rhino automation direct': '5385',
  'rittal': '850',
  'rockwell': '540',
  'rockwell automation': '540',
  'ross': '509',
  'ross controls': '509',

  // === S ===
  'saftronics': '650',
  'sanyo denki': '507',
  'schmersal': '526',
  'schneider': '521',
  'schneider electric': '521',
  'schneider automation': '497',
  'schunk': '166',
  'sew eurodrive': '153',
  'sew-eurodrive': '153',
  'sick': '49',
  'siemens': '46',
  'skf': '541',
  'smc': '56',
  'sola': '565',
  'sola hevi-duty': '5307',
  'spectrum controls': '5288',
  'sprecher+schuh': '562',
  'sprecher schuh': '562',
  'square d': '141',
  'staubli': '5343',
  'stober': '5328',
  'sumitomo': '559',
  'sunx': '143',

  // === T ===
  'tdk lambda': '581',
  'tdk-lambda': '581',
  'teco': '4194',
  'telemecanique': '52',
  'thk': '621',
  'timken': '599',
  'toshiba': '144',
  'tri-tronics': '622',
  'tsubaki': '145',
  'turck': '75',

  // === U ===
  'us motors': '4564',

  // === V ===
  'vacon': '4339',
  'vexta': '489',
  'vickers': '137',

  // === W ===
  'wago': '50',
  'watlow': '826',
  'weg': '264',
  'weidmuller': '262',
  'wenglor': '5510',
  'werma': '263',
  'wittenstein': '643',

  // === Y ===
  'yaskawa': '82',
  'yaskawa electric': '82',
  'yokogawa': '148',
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

// Brand display names with correct capitalization for brands that need special handling
const BRAND_DISPLAY_NAMES = {
  'automationdirect': 'AutomationDirect',
  'automation direct': 'AutomationDirect',
  'allen-bradley': 'Allen-Bradley',
  'allen bradley': 'Allen-Bradley',
  'sew-eurodrive': 'SEW-Eurodrive',
  'sew eurodrive': 'SEW-Eurodrive',
  'pepperl+fuchs': 'Pepperl+Fuchs',
  'pepperl fuchs': 'Pepperl+Fuchs',
  'b&r': 'B&R',
  'b&r automation': 'B&R Automation',
  'br automation': 'B&R Automation',
  'ge-fanuc': 'GE-Fanuc',
  'ge fanuc': 'GE Fanuc',
  'leroy-somer': 'Leroy-Somer',
  'leroy somer': 'Leroy-Somer',
  'sprecher+schuh': 'Sprecher+Schuh',
  'sprecher schuh': 'Sprecher+Schuh',
  'tdk-lambda': 'TDK-Lambda',
  'tdk lambda': 'TDK-Lambda',
  'power-one': 'Power-One',
  'power one': 'Power-One',
  'pro-face': 'Pro-face',
  'proface': 'Pro-face',
  'oriental motor': 'Oriental Motor',
  'banner engineering': 'Banner Engineering',
  'schneider electric': 'Schneider Electric',
  'rockwell automation': 'Rockwell Automation',
  'phoenix contact': 'Phoenix Contact',
  'red lion': 'Red Lion',
  'red lion controls': 'Red Lion Controls',
  'sick': 'SICK',
  'ifm': 'IFM',
  'ifm efector': 'IFM',
  'ifm electronic': 'IFM',
  'baumer electric': 'Baumer Electric',
  'boston gear': 'Boston Gear',
  'cooper bussmann': 'Cooper Bussmann',
  'carlo gavazzi': 'Carlo Gavazzi',
  'cutler-hammer': 'Cutler-Hammer',
  'cutler hammer': 'Cutler-Hammer',
};

function capitalizeBrand(brandName) {
  if (!brandName) return brandName;

  // Check display names map first for brands with specific capitalization
  const displayName = BRAND_DISPLAY_NAMES[brandName.toLowerCase().trim()];
  if (displayName) return displayName;

  // Look up canonical capitalization from bigcommerce_brands.json
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
    // === GENERATE OR USE PROVIDED SKU ===
    let sku;
    // Use provided SKU if available (from Scanner)
    if (product.sku && product.sku.startsWith('AI')) {
      sku = product.sku;
      console.log(`📋 Using provided SKU from Scanner: ${sku}`);
    } else {
      // Generate new SKU using atomic Firestore counter (simple, fast, reliable)
      const { generateNextSku } = await import('../../lib/sku-generator');
      sku = await generateNextSku();
      console.log(`🆕 Generated new SKU: ${sku}`);
    }

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
    // Prefer background-removed (nobg) versions when available
    const photoUrls = [];

    if (product.photos && Array.isArray(product.photos)) {
      const photoViews = product.photoViews || [];
      const photosNobg = product.photosNobg || {};

      product.photos.forEach((originalUrl, index) => {
        const viewName = photoViews[index];
        const nobgUrl = viewName ? photosNobg[viewName] : null;

        // Use nobg version if it exists, otherwise use original
        photoUrls.push(nobgUrl || originalUrl);
      });

      // === APPLY WATERMARKS AT PUBLISH TIME ===
      let finalPhotoUrls = [...photoUrls];

      if (product.watermarkEnabled !== false) {
        console.log('Applying watermarks to photos...');
        const protocol = req.headers?.host?.includes('localhost') ? 'http' : 'https';
        const host = req.headers?.host || process.env.VERCEL_URL || 'localhost:3000';

        const watermarkPromises = finalPhotoUrls.map(async (url, index) => {
          try {
            const wmResponse = await fetch(`${protocol}://${host}/api/photos/watermark`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                imageUrl: url,
                sku: sku,
                view: photoViews[index] || `photo_${index + 1}`
              })
            });

            if (wmResponse.ok) {
              const wmData = await wmResponse.json();
              return wmData.watermarkedUrl || url;
            }
            return url; // Fallback to original on error
          } catch (err) {
            console.error(`Watermark failed for photo ${index + 1}:`, err);
            return url;
          }
        });

        finalPhotoUrls = await Promise.all(watermarkPromises);
        console.log(`Watermarked ${finalPhotoUrls.length} photos`);
      } else {
        console.log('Watermarks disabled for this listing');
      }

      // Push to SureDone media slots
      finalPhotoUrls.forEach((url, index) => {
        if (url && index < 12) {
          formData.append(`media${index + 1}`, url);
          const photoType = photoViews[index] && photosNobg[photoViews[index]] ? '(nobg)' : '(original)';
          const watermarkStatus = product.watermarkEnabled !== false ? ' [watermarked]' : '';
          console.log(`  media${index + 1} = ${url.substring(0, 60)}... ${photoType}${watermarkStatus}`);
        }
      });
      console.log(`Total media fields set: ${finalPhotoUrls.length}`);
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
