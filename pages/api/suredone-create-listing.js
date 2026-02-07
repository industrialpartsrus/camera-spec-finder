// pages/api/suredone-create-listing.js
// Complete SureDone integration with UPC, BigCommerce multi-category, comprehensive eBay item specifics
// 
// HANDLES BOTH FORMATS:
// 1. AI returns lowercase fields like "ratedloadhp"  ->  passes through directly
// 2. Legacy/human-readable keys like "horsepower"  ->  maps to "ratedloadhp"
// 3. eBay display names like "Rated Load (HP)"  ->  converts to "ratedloadhp"

import fs from 'fs';
import path from 'path';

// 30-day warranty text
const WARRANTY_TEXT = `We warranty all items for 30 days from date of purchase. If you experience any issues with your item within this period, please contact us and we will work with you to resolve the problem. This warranty covers defects in functionality but does not cover damage caused by misuse, improper installation, or normal wear and tear.`;

// =============================================================================
// BIGCOMMERCE BRAND IDS - Loaded dynamically from bigcommerce_brands.json
// =============================================================================
// The JSON has 2,561 brands: { "brand_lower": { "name": "Brand", "id": "123" } }
// Loaded once on cold start, cached for all subsequent requests
let BRAND_DATA = null;

function loadBrandData() {
  if (BRAND_DATA) return BRAND_DATA;
  try {
    const jsonPath = path.join(process.cwd(), 'data', 'bigcommerce_brands.json');
    const raw = fs.readFileSync(jsonPath, 'utf-8');
    BRAND_DATA = JSON.parse(raw);
    console.log(`Loaded ${Object.keys(BRAND_DATA).length} brands from bigcommerce_brands.json`);
  } catch (e) {
    console.error('Failed to load bigcommerce_brands.json:', e.message);
    BRAND_DATA = {};
  }
  return BRAND_DATA;
}

// Alias map: common name variations -> the key used in bigcommerce_brands.json
const BRAND_ALIASES = {
  'allen-bradley': 'allen bradley',
  'cutler-hammer': 'cutler hammer',
  'sew-eurodrive': 'sew eurodrive',
  'bosch rexroth': 'rexroth',
  'schneider': 'schneider electric',
  'fuji': 'fuji electric',
  'ge': 'general electric',
  'rockwell': 'rockwell automation',
  'b&r automation': 'b&r',
  'bihl+wiedemann': 'bihl wiedemann',
  'bihl wiedemann': 'bihl+wiedemann',
  'pearl kooyo co': 'pearl kooyo co.',
  'bussmann': 'cooper bussmann',
  'mac': 'mac valves',
  'murr': 'murr elektronik',
  'reliance': 'reliance electric',
  'automationdirect': 'automation direct',
  'banner': 'banner engineering',
  'sew': 'sew eurodrive',
};

// BigCommerce multi-category mappings
// BigCommerce multi-category mappings
// Format: ['leaf_category', 'parent_category'] - most specific FIRST
// BIGCOMMERCE CATEGORY MAPPINGS
// IMPORTANT: BigCommerce expects category IDs separated by COMMAS, not asterisks
// Format: "id1,id2,id3" — item appears in ALL these categories
// ID 23 = "Shop All" is always included so items appear in the main catalog
const BIGCOMMERCE_CATEGORY_MAP = {
  // Electric Motors: Shop All (23) + Power Transmission (26) + Motors (30)
  'Electric Motors': '23,26,30',
  'Electric Motor': '23,26,30',
  'AC Motor': '23,26,30',
  'DC Motor': '23,26,30',
  'Induction Motor': '23,26,30',
  'Gearmotor': '23,26,30',
  'Gear Motor': '23,26,30',
  // Servo Motors: Shop All (23) + Motion Control (19) + Servo Motors (54)
  'Servo Motors': '23,19,54',
  'Servo Motor': '23,19,54',
  'AC Servo Motor': '23,19,54',
  'DC Servo Motor': '23,19,54',
  // Servo Drives: Shop All (23) + Motion Control (19) + Servo Drives (32)
  'Servo Drives': '23,19,32',
  'Servo Drive': '23,19,32',
  'Servo Amplifier': '23,19,32',
  // VFDs: Shop All (23) + Speed Controls (33) + AC Drive (34)
  'VFDs': '23,33,34',
  'VFD': '23,33,34',
  'Variable Frequency Drive': '23,33,34',
  'AC Drive': '23,33,34',
  'Inverter': '23,33,34',
  // DC Drives: Shop All (23) + Speed Controls (33) + DC Drive (35)
  'DC Drives': '23,33,35',
  'DC Drive': '23,33,35',
  'SCR Controller': '23,33,35',
  // PLCs: Shop All (23) + Automation Control (18) + PLC (24)
  'PLCs': '23,18,24',
  'PLC': '23,18,24',
  'PLC Processor': '23,18,24',
  'PLC CPU': '23,18,24',
  'PLC Chassis': '23,18,24',
  // PLC I/O: Shop All (23) + Automation Control (18) + I/O (61)
  'I/O Modules': '23,18,61',
  'I/O Module': '23,18,61',
  'Communication Module': '23,18,61',
  'Network Module': '23,18,61',
  // PLC Power Supply: Shop All (23) + Automation Control (18) + Power Supply (28)
  'PLC Power Supply': '23,18,28',
  // HMIs: Shop All (23) + Automation Control (18) + HMI (27)
  'HMIs': '23,18,27',
  'HMI': '23,18,27',
  'Touch Panel': '23,18,27',
  'Operator Interface': '23,18,27',
  'Touch Screen': '23,18,27',
  // Power Supplies: Shop All (23) + Automation Control (18) + Power Supply (28)
  'Power Supplies': '23,18,28',
  'Power Supply': '23,18,28',
  'Switching Power Supply': '23,18,28',
  'DC Power Supply': '23,18,28',
  // Proximity Sensors: Shop All (23) + Sensing Devices (22) + Proximity (41)
  'Proximity Sensors': '23,22,41',
  'Proximity Sensor': '23,22,41',
  'Inductive Proximity Sensor': '23,22,41',
  'Capacitive Proximity Sensor': '23,22,41',
  'Inductive Sensor': '23,22,41',
  // Photoelectric Sensors: Shop All (23) + Sensing Devices (22) + Photoelectric (42)
  'Photoelectric Sensors': '23,22,42',
  'Photoelectric Sensor': '23,22,42',
  'Photo Sensor': '23,22,42',
  // Fiber Optic Sensors: Shop All (23) + Sensing Devices (22) + Fiber Optic (78)
  'Fiber Optic Sensor': '23,22,78',
  // Pressure Sensors: Shop All (23) + Sensing Devices (22) + Pressure (116)
  'Pressure Sensors': '23,22,116',
  'Pressure Sensor': '23,22,116',
  'Pressure Transducer': '23,22,116',
  // Temperature Sensors: Shop All (23) + Sensing Devices (22) + Temperature (65)
  'Temperature Sensors': '23,22,65',
  'Temperature Sensor': '23,22,65',
  'Thermocouple': '23,22,65',
  'RTD': '23,22,65',
  // Level Sensors: Shop All (23) + Sensing Devices (22) + Level (148)
  'Level Sensor': '23,22,148',
  // Ultrasonic Sensors: Shop All (23) + Sensing Devices (22) + Ultrasonic (115)
  'Ultrasonic Sensor': '23,22,115',
  // Flow Sensors: Shop All (23) + Sensing Devices (22) + Sensors (42)
  'Flow Sensors': '23,22,42',
  'Flow Sensor': '23,22,42',
  'Flow Meter': '23,22,42',
  // Light Curtains: Shop All (23) + Sensing Devices (22) + Light Curtains (71)
  'Light Curtains': '23,22,71',
  'Light Curtain': '23,22,71',
  'Safety Light Curtain': '23,22,71',
  // Barcode/RFID: Shop All (23) + Sensing Devices (22) + Barcode (124)
  'Barcode Scanner': '23,22,124',
  'Barcode Reader': '23,22,124',
  'RFID Reader': '23,22,124',
  // Encoders: Shop All (23) + Motion Control (19) + Encoders (81)
  'Encoders': '23,19,81',
  'Encoder': '23,19,81',
  'Rotary Encoder': '23,19,81',
  'Incremental Encoder': '23,19,81',
  'Absolute Encoder': '23,19,81',
  'Linear Encoder': '23,19,81',
  'Resolver': '23,19,81',
  // Pneumatic Cylinders: Shop All (23) + Pneumatics (46) + Cylinders (47)
  'Pneumatic Cylinders': '23,46,47',
  'Pneumatic Cylinder': '23,46,47',
  'Air Cylinder': '23,46,47',
  'Compact Cylinder': '23,46,47',
  'Rodless Cylinder': '23,46,55',
  'Guided Cylinder': '23,46,56',
  // Pneumatic Valves: Shop All (23) + Pneumatics (46) + Valves (68)
  'Pneumatic Valves': '23,46,68',
  'Pneumatic Valve': '23,46,68',
  'Manifold': '23,46,68',
  // Pneumatic Grippers: Shop All (23) + Pneumatics (46) + Grippers (117)
  'Pneumatic Gripper': '23,46,117',
  // Pneumatic Regulators: Shop All (23) + Pneumatics (46) + Regulators (86)
  'Air Regulator': '23,46,86',
  'FRL': '23,46,86',
  'Air Filter': '23,46,86',
  // Solenoid Valves: Shop All (23) + Valves (74) + Solenoid (76)
  'Solenoid Valves': '23,74,76',
  'Solenoid Valve': '23,74,76',
  // Hydraulic Cylinders: Shop All (23) + Hydraulics (84) + Cylinders (107)
  'Hydraulic Cylinders': '23,84,107',
  'Hydraulic Cylinder': '23,84,107',
  // Hydraulic Valves: Shop All (23) + Hydraulics (84) + Control Valves (91)
  'Hydraulic Valves': '23,84,91',
  'Hydraulic Valve': '23,84,91',
  // Hydraulic Pumps: Shop All (23) + Hydraulics (84) + Pumps (94)
  'Hydraulic Pumps': '23,84,94',
  'Hydraulic Pump': '23,84,94',
  // Hydraulic Motors: Shop All (23) + Hydraulics (84) + Pumps (94)
  'Hydraulic Motors': '23,84,94',
  'Hydraulic Motor': '23,84,94',
  // Circuit Breakers: Shop All (23) + Electrical (20) + Circuit Breakers (44)
  'Circuit Breakers': '23,20,44',
  'Circuit Breaker': '23,20,44',
  // Disconnect Switches: Shop All (23) + Electrical (20) + Safety Switches (52)
  'Disconnect Switches': '23,20,52',
  'Disconnect Switch': '23,20,52',
  'Disconnect': '23,20,52',
  // Fuses: Shop All (23) + Electrical (20) + Fuses (38)
  'Fuses': '23,20,38',
  'Fuse': '23,20,38',
  // Enclosures: Shop All (23) + Electrical (20) + Enclosures (45)
  'Enclosure': '23,20,45',
  // Contactors: Shop All (23) + Industrial Controls (49) + Motor Starters (50)
  'Contactors': '23,49,50',
  'Contactor': '23,49,50',
  'Motor Starters': '23,49,50',
  'Motor Starter': '23,49,50',
  'Soft Starter': '23,49,50',
  // Safety Relays: Shop All (23) + Industrial Controls (49) + Safety (96)
  'Safety Relays': '23,49,96',
  'Safety Relay': '23,49,96',
  'Safety Controller': '23,49,96',
  // Safety Interlocks: Shop All (23) + Industrial Controls (49) + Safety Interlocks (79)
  'Safety Interlock': '23,49,79',
  // Control Relays: Shop All (23) + Industrial Controls (49) + Control Relays (51)
  'Control Relays': '23,49,51',
  'Control Relay': '23,49,51',
  'Relay': '23,49,51',
  // Solid State Relays: Shop All (23) + Industrial Controls (49) + Relays (66)
  'Solid State Relays': '23,49,66',
  'Solid State Relay': '23,49,66',
  // Overload Relays: Shop All (23) + Industrial Controls (49) + Motor Starters (50)
  'Overload Relay': '23,49,50',
  // Transformers: Shop All (23) + Electrical (20) + Transformers (37)
  'Transformers': '23,20,37',
  'Transformer': '23,20,37',
  // Gearboxes: Shop All (23) + Power Transmission (26) + Gear Reducer (36)
  'Gearboxes': '23,26,36',
  'Gearbox': '23,26,36',
  'Gear Reducer': '23,26,36',
  // Bearings: Shop All (23) + Power Transmission (26) + Bearings (43)
  'Bearings': '23,26,43',
  'Bearing': '23,26,43',
  'Needle Bearing': '23,26,43',
  'Roller Bearing': '23,26,43',
  'Cam Follower': '23,26,43',
  'Cam Followers': '23,26,43',
  'Thrust Bearing': '23,26,43',
  // Ball Bearings: more specific subcategory (67)
  'Ball Bearing': '23,26,67',
  // Linear Bearings: specific subcategory (70)
  'Linear Bearing': '23,26,70',
  // Tapered Roller Bearings: specific subcategory (72)
  'Tapered Roller Bearing': '23,26,72',
  'Tapered Roller Bearings': '23,26,72',
  // Flange Bearings: specific subcategory (80)
  'Flange Bearing': '23,26,80',
  // Pillow Block Bearings: specific subcategory (92)
  'Pillow Block': '23,26,92',
  'Pillow Block Bearing': '23,26,92',
  // Brakes & Clutches: Shop All (23) + Power Transmission (26) + Brakes (73)
  'Brake': '23,26,73',
  'Clutch': '23,26,73',
  // Linear Actuators: Shop All (23) + Power Transmission (26) + Linear Actuators (101)
  'Linear Actuator': '23,26,101',
  'Ball Screw': '23,26,101',
  'Linear Guide': '23,26,101',
  'Linear Rail': '23,26,101',
  // Stepper Motors: Shop All (23) + Motion Control (19) + Servo Motors (54)
  'Stepper Motors': '23,19,54',
  'Stepper Motor': '23,19,54',
  // Stepper Drives: Shop All (23) + Motion Control (19) + Servo Drives (32)
  'Stepper Drives': '23,19,32',
  'Stepper Drive': '23,19,32',
  // Temperature Controllers: Shop All (23) + Industrial Controls (49) + Temp Controllers (63)
  'Temperature Controllers': '23,49,63',
  'Temperature Controller': '23,49,63',
  'PID Controller': '23,49,63',
  // Timers/Counters: Shop All (23) + Industrial Controls (49) + Timers (62)
  'Timers': '23,49,62',
  'Timer': '23,49,62',
  'Counter': '23,49,62',
  'Time Delay Relay': '23,49,62',
  // Limit Switches: Shop All (23) + Industrial Controls (49) + Limit Switches (58)
  'Limit Switches': '23,49,58',
  'Limit Switch': '23,49,58',
  'Micro Switch': '23,49,58',
  // Pushbuttons: Shop All (23) + Industrial Controls (49) + Pushbuttons (64)
  'Pushbuttons': '23,49,64',
  'Pushbutton': '23,49,64',
  'Push Button': '23,49,64',
  'Selector Switch': '23,49,64',
  // Panel Meters: Shop All (23) + Sensing Devices (22) + Meters/Controllers
  'Panel Meters': '23,22,71',
  'Panel Meter': '23,22,71',
  // Pumps: Shop All (23) + Pumps (82)
  'Centrifugal Pump': '23,82,111',
  'Diaphragm Pump': '23,82,93',
  'Vacuum Pump': '23,82,83',
  'Metering Pump': '23,82,110',
  // Valves (non-pneumatic/hydraulic): Shop All (23) + Valves (74)
  'Ball Valve': '23,74,75',
  'Butterfly Valve': '23,74,95',
  'Check Valve': '23,74,121',
  'Gate Valve': '23,74,119',
  'Globe Valve': '23,74',
  'Relief Valve': '23,74,112',
  'Control Valve': '23,74,114',
  // Robots: Shop All (23) + Industrial Robots (39)
  'Robot': '23,39',
  'Robotic': '23,39',
  // Lighting Ballasts: (147)
  'Lighting Ballast': '23,147',
  // Machinery: Used Machinery (21)
  'Machinery': '23,21',
  // Unknown / Fallback: Shop All only
  'Unknown': '23'
};

// =============================================================================
// SUREDONE FIELD MAPPING FOR EBAY ITEM SPECIFICS
// =============================================================================
// SureDone has TWO types of eBay fields:
//   1. NATIVE fields: SureDone column headers like "ratedloadhp", "borediameter"
//       ->  These map automatically to eBay Recommended item specifics
//       ->  Send as inline (short name) ONLY
//   2. PREFIX fields: "ebayitemspecifics" + name like "ebayitemspecificswidth"
//       ->  These map to eBay Recommended via SureDone's prefix system
//       ->  ANY field NOT in SureDone's native headers MUST use this format
//       ->  Without the prefix, SureDone creates a DYNAMIC custom field!
//
// CRITICAL: If a field is NOT in SUREDONE_NATIVE_FIELDS below, it MUST get the
// "ebayitemspecifics" prefix. Otherwise SureDone creates a Dynamic field that
// does NOT fill the eBay Recommended item specific slot.
// =============================================================================

// Fields confirmed as SureDone native column headers
// These work inline AND auto-map to eBay Recommended item specifics
// ONLY add to this list if verified in SureDone's actual export headers
const SUREDONE_NATIVE_FIELDS = new Set([
  // Motor fields - confirmed SureDone native headers
  'ratedloadhp', 'baserpm', 'nominalratedinputvoltage', 'actualratedinputvoltage',
  'fullloadamps', 'enclosuretype', 'mountingtype', 'currenttype', 'shaftdiameter',
  'reversiblenonreversible', 'dcstatorwindingtype', 'ratedfullloadtorque',
  'numberofpoles', 'numberofphases', 'motortype', 'insulationclass', 'nemadesignletter',
  'stallcurrent', 'noloadrpm',
  // Sensor fields - confirmed SureDone native headers
  'sensingrange', 'operatingdistance', 'sensortype', 'outputtype',
  // Pneumatic/Hydraulic - confirmed SureDone native headers
  'borediameter', 'strokelength', 'cylindertype', 'maxpsi', 'ratedpressure',
  'maximumpressure', 'maximumflowrate', 'hydraulicpumptype', 'pumpaction',
  'centrifugalpumptype',
  // PLC/HMI - confirmed SureDone native headers
  'communicationstandard',
  // Circuit Breaker/Relay - confirmed SureDone native headers
  'coilvoltage', 'currentrating', 'voltagerating',
  // General - confirmed SureDone native headers
  // NOTE: countryoforigin is NOT here - it needs both inline + prefix (special handler below)
  'model', 'mpn',
]);

// PREFIX OVERRIDES: When the eBay field name differs from the canonical name
// Key = canonical name, Value = exact ebayitemspecifics field for SureDone
// For fields NOT here, we auto-generate: "ebayitemspecifics" + canonical
const PREFIX_OVERRIDES = {
  // Motor overrides (eBay field name differs from canonical)
  'acphase': 'ebayitemspecificsacphase',
  'servicefactor': 'ebayitemspecificsservicefactor',
  'acfrequencyrating': 'ebayitemspecificsacfrequencyrating',
  'iecframesize': 'ebayitemspecificsiecframesize',
  'nemaframesuffix': 'ebayitemspecificsnemaframesuffix',
  'acmotortype': 'ebayitemspecificsacmotortype',
  'specialmotorconstruction': 'ebayitemspecificsspecialmotorconstruction',
  'invertervectordutyrating': 'ebayitemspecificsinvertervectordutyrating',
  'iprating': 'ebayitemspecificsiprating',
  'protectionagainstliquids': 'ebayitemspecificsprotectionagainstliquids',
  'protectionagainstsolids': 'ebayitemspecificsprotectionagainstsolids',
  'startinglockedrotortorque': 'ebayitemspecificsstartinglockedrotortorque',
  'shafttype': 'ebayitemspecificsshafttype',
  'nominalsensingradius': 'ebayitemspecificsnominalsensingradius',
  'displayscreensize': 'ebayitemspecificsdisplayscreensize',
  'displaytype': 'ebayitemspecificsdisplaytype',
  'nemasize': 'ebayitemspecificsnemasize',
  'solenoidvalvetype': 'ebayitemspecificssolenoidvalvetype',
  'inletportdiameter': 'ebayitemspecificsinletportdiameter',
  'outletportdiameter': 'ebayitemspecificsoutletportdiameter',
  'numberofports': 'ebayitemspecificsnumberofports',
  'cylinderaction': 'ebayitemspecificscylinderaction',
  'boresize': 'ebayitemspecificsboresize',
  // Bearing overrides (eBay uses different names than canonical)
  'bearingtype': 'ebayitemspecificsbearingstype',       // "Bearings Type" not "Bearing Type"
  'outerdiameter': 'ebayitemspecificsoutsidediameter',   // "Outside Diameter" not "Outer"
  'outsidediameter': 'ebayitemspecificsoutsidediameter',
  // Country of origin also needs prefix for eBay
  'countryoforigin': 'ebayitemspecificscountryoforigin',
  // Features
  'features': 'ebayitemspecificsfeatures',
};

// Master mapping: AI key variations  ->  canonical clean field name
const SPEC_KEY_MAP = {
  // === HORSEPOWER ===
  'horsepower': 'ratedloadhp',
  'hp': 'ratedloadhp',
  'rated_load': 'ratedloadhp',
  'ratedload': 'ratedloadhp',
  'rated load': 'ratedloadhp',
  'ratedloadhp': 'ratedloadhp',

  // === RPM ===
  'rpm': 'baserpm',
  'speed': 'baserpm',
  'base_rpm': 'baserpm',
  'baserpm': 'baserpm',

  // === PHASE ===
  'phase': 'acphase',
  'phases': 'acphase',
  'ac_phase': 'acphase',
  'acphase': 'acphase',
  'numberofphases': 'acphase',

  // === VOLTAGE ===
  'voltage': 'nominalratedinputvoltage',
  'input_voltage': 'nominalratedinputvoltage',
  'inputvoltage': 'nominalratedinputvoltage',
  'rated_voltage': 'nominalratedinputvoltage',
  'nominalratedinputvoltage': 'nominalratedinputvoltage',

  // === AMPERAGE ===
  'amperage': 'fullloadamps',
  'amps': 'fullloadamps',
  'current': 'fullloadamps',
  'fla': 'fullloadamps',
  'full_load_amps': 'fullloadamps',
  'fullloadamps': 'fullloadamps',

  // === FRAME ===
  'frame': 'iecframesize',
  'frame_size': 'iecframesize',
  'framesize': 'iecframesize',
  'iecframesize': 'iecframesize',

  // === ENCLOSURE ===
  'enclosure': 'enclosuretype',
  'enclosure_type': 'enclosuretype',
  'enclosuretype': 'enclosuretype',

  // === SERVICE FACTOR ===
  'service_factor': 'servicefactor',
  'servicefactor': 'servicefactor',

  // === FREQUENCY ===
  'frequency': 'acfrequencyrating',
  'hz': 'acfrequencyrating',
  'acfrequencyrating': 'acfrequencyrating',

  // === INSULATION ===
  'insulation_class': 'insulationclass',
  'insulation': 'insulationclass',
  'insulationclass': 'insulationclass',

  // === MOTOR TYPE ===
  // NOTE: 'type' is intentionally NOT mapped here - it goes to usertype field instead
  // Only explicit motor type fields should map to acmotortype
  'motor_type': 'acmotortype',
  'motortype': 'acmotortype',
  'acmotortype': 'acmotortype',
  'ac_motor_type': 'acmotortype',

  // === NEMA ===
  'nema_design': 'nemadesignletter',
  'nemadesign': 'nemadesignletter',
  'nemadesignletter': 'nemadesignletter',
  'nema_frame_suffix': 'nemaframesuffix',
  'frame_suffix': 'nemaframesuffix',
  'nemaframesuffix': 'nemaframesuffix',

  // === MOUNTING ===
  'mounting': 'mountingtype',
  'mounting_type': 'mountingtype',
  'mountingtype': 'mountingtype',

  // === SHAFT ===
  'shaft_diameter': 'shaftdiameter',
  'shaftdiameter': 'shaftdiameter',
  'shaft_type': 'shafttype',
  'shafttype': 'shafttype',

  // === SPECIAL MOTOR ===
  'special_construction': 'specialmotorconstruction',
  'specialmotorconstruction': 'specialmotorconstruction',
  'inverter_duty': 'invertervectordutyrating',
  'vfd_rated': 'invertervectordutyrating',
  'vector_duty': 'invertervectordutyrating',
  'invertervectordutyrating': 'invertervectordutyrating',

  // === CURRENT TYPE ===
  'current_type': 'currenttype',
  'currenttype': 'currenttype',

  // === IP/PROTECTION ===
  'ip_rating': 'iprating',
  'iprating': 'iprating',

  // === REVERSIBILITY ===
  'reversible': 'reversiblenonreversible',
  'reversiblenonreversible': 'reversiblenonreversible',

  // === TORQUE ===
  'torque': 'ratedfullloadtorque',
  'full_load_torque': 'ratedfullloadtorque',
  'ratedfullloadtorque': 'ratedfullloadtorque',
  'starting_torque': 'startinglockedrotortorque',
  'locked_rotor_torque': 'startinglockedrotortorque',
  'startinglockedrotortorque': 'startinglockedrotortorque',

  // === DC MOTOR ===
  'dc_winding': 'dcstatorwindingtype',
  'dcstatorwindingtype': 'dcstatorwindingtype',
  'stator_type': 'dcstatorwindingtype',

  // === COUNTRY ===
  'country_of_origin': 'countryoforigin',
  'countryoforigin': 'countryoforigin',
  'country_of_manufacture': 'countryoforigin',
  'origin': 'countryoforigin',
  'country': 'countryoforigin',

  // === EFFICIENCY ===
  'efficiency': 'efficiency',
  'efficiencyclass': 'efficiency',

  // === SENSORS ===
  'sensing_range': 'nominalsensingradius',
  'sensingrange': 'sensingrange',
  'sensing_distance': 'nominalsensingradius',
  'nominalsensingradius': 'nominalsensingradius',
  'operating_distance': 'operatingdistance',
  'operatingdistance': 'operatingdistance',
  'sensor_type': 'sensortype',
  'sensortype': 'sensortype',
  'output_type': 'outputtype',
  'outputtype': 'outputtype',

  // === PNEUMATIC / HYDRAULIC ===
  'bore_size': 'boresize',
  'boresize': 'boresize',
  'bore_diameter': 'borediameter',
  'borediameter': 'borediameter',
  'bore': 'boresize',
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
  'numberofports': 'numberofports',
  'psi': 'maxpsi',
  'maxpsi': 'maxpsi',
  'pressure': 'ratedpressure',
  'max_pressure': 'maximumpressure',
  'maxpressure': 'maximumpressure',
  'flow_rate': 'maximumflowrate',
  'flowrate': 'maximumflowrate',

  // === PLC / HMI / COMMUNICATION ===
  'communication': 'communicationstandard',
  'communication_protocol': 'communicationstandard',
  'protocol': 'communicationstandard',
  'communicationstandard': 'communicationstandard',
  'display_type': 'displaytype',
  'displaytype': 'displaytype',
  'display_size': 'displayscreensize',
  'screen_size': 'displayscreensize',
  'displayscreensize': 'displayscreensize',

  // === CIRCUIT BREAKERS / RELAYS / CONTACTORS ===
  'poles': 'numberofpoles',
  'number_of_poles': 'numberofpoles',
  'numberofpoles': 'numberofpoles',
  'coil_voltage': 'coilvoltage',
  'coilvoltage': 'coilvoltage',
  'current_rating': 'currentrating',
  'currentrating': 'currentrating',
  'voltage_rating': 'voltagerating',
  'voltagerating': 'voltagerating',
  'nema_size': 'nemasize',
  'nemasize': 'nemasize',

  // === BEARINGS ===
  'bearing_type': 'bearingtype',
  'bearings_type': 'bearingtype',
  'bearingtype': 'bearingtype',
  'bearingstype': 'bearingtype',
  'outer_diameter': 'outerdiameter',
  'outerdiameter': 'outerdiameter',
  'outside_diameter': 'outerdiameter',
  'outsidediameter': 'outerdiameter',
  'od': 'outerdiameter',
  'width': 'width',
  'bearing_width': 'width',
  'seal_type': 'sealtype',
  'sealtype': 'sealtype',
  'seal': 'sealtype',
  'material': 'material',
  'bearing_material': 'material',
  'precision_rating': 'precisionrating',
  'precisionrating': 'precisionrating',
  'precision': 'precisionrating',
  'bearing_series': 'bearingseries',
  'bearingseries': 'bearingseries',
  'series': 'bearingseries',

  // === CAM FOLLOWERS (specific bearing subtype) ===
  'stud_diameter': 'studdiameter',
  'studdiameter': 'studdiameter',
  'stud_length': 'studlength',
  'studlength': 'studlength',
  'stud_type': 'studtype',
  'studtype': 'studtype',
  'roller_diameter': 'rollerdiameter',
  'rollerdiameter': 'rollerdiameter',
  'roller_width': 'rollerwidth',
  'rollerwidth': 'rollerwidth',
  'roller_shape': 'rollershape',
  'rollershape': 'rollershape',
  'face_design': 'facedesign',
  'facedesign': 'facedesign',
  'dynamic_load_rating': 'dynamicloadrating',
  'dynamicloadrating': 'dynamicloadrating',
  'dynamic_load': 'dynamicloadrating',
  'static_load_rating': 'staticloadrating',
  'staticloadrating': 'staticloadrating',
  'static_load': 'staticloadrating',
  'load_rating': 'dynamicloadrating',
  'loadrating': 'dynamicloadrating',
  'cage_type': 'cagetype',
  'cagetype': 'cagetype',
  'number_of_rows': 'numberofrows',
  'numberofrows': 'numberofrows',
  'overall_width': 'width',

  // === POWER / WATTAGE ===
  'power': 'power',
  'wattage': 'power',
  'watts': 'power',
  'output_power': 'outputpower',
  'outputpower': 'outputpower',
  'rated_power': 'ratedpower',
  'ratedpower': 'ratedpower',

  // === MOUNTING STYLE ===
  'mounting_style': 'mountingstyle',
  'mountingstyle': 'mountingstyle',
  'mount_style': 'mountingstyle',

  // === FEATURES ===
  'features': 'features',
  'feature': 'features',

  // === SERVO MOTORS ===
  'rated_torque': 'ratedtorque',
  'ratedtorque': 'ratedtorque',
  'rated_speed': 'ratedspeed',
  'ratedspeed': 'ratedspeed',
  'encoder_type': 'encodertype',
  'encodertype': 'encodertype',
  'brake_type': 'braketype',
  'braketype': 'braketype',
  'brake': 'braketype',

  // === STEPPER MOTORS ===
  'step_angle': 'stepangle',
  'stepangle': 'stepangle',
  'holding_torque': 'holdingtorque',
  'holdingtorque': 'holdingtorque',
  'rated_current': 'ratedcurrent',
  'ratedcurrent': 'ratedcurrent',
  'lead_wires': 'leadwires',
  'leadwires': 'leadwires',

  // === VFD / DRIVES ===
  'hp_rating': 'horsepowerrating',
  'horsepowerrating': 'horsepowerrating',
  'kw_rating': 'kwrating',
  'kwrating': 'kwrating',
  'kw': 'kwrating',
  'output_current': 'outputcurrent',
  'outputcurrent': 'outputcurrent',
  'peak_current': 'peakcurrent',
  'peakcurrent': 'peakcurrent',
  'output_frequency_range': 'outputfrequencyrange',
  'outputfrequencyrange': 'outputfrequencyrange',
  'output_voltage': 'outputvoltage',
  'outputvoltage': 'outputvoltage',
  'control_method': 'controlmethod',
  'controlmethod': 'controlmethod',
  'feedback_type': 'feedbacktype',
  'feedbacktype': 'feedbacktype',
  'axis_count': 'axiscount',
  'axiscount': 'axiscount',
  'microstepping_resolution': 'microsteppingresolution',
  'microsteppingresolution': 'microsteppingresolution',

  // === CIRCUIT BREAKERS ===
  'interrupting_rating': 'interruptingrating',
  'interruptingrating': 'interruptingrating',
  'aic': 'interruptingrating',
  'breaker_type': 'breakertype',
  'breakertype': 'breakertype',
  'trip_curve': 'tripcurve',
  'tripcurve': 'tripcurve',
  'frame_type': 'frametype',
  'frametype': 'frametype',

  // === CONTACTORS / STARTERS ===
  'auxiliary_contacts': 'auxiliarycontacts',
  'auxiliarycontacts': 'auxiliarycontacts',
  'aux_contacts': 'auxiliarycontacts',
  'iec_rating': 'iecrating',
  'iecrating': 'iecrating',
  'starter_type': 'startertype',
  'startertype': 'startertype',
  'overload_range': 'overloadrange',
  'overloadrange': 'overloadrange',

  // === RELAYS ===
  'contact_configuration': 'contactconfiguration',
  'contactconfiguration': 'contactconfiguration',
  'contact_rating': 'contactrating',
  'contactrating': 'contactrating',
  'socket_type': 'sockettype',
  'sockettype': 'sockettype',
  'safety_rating': 'safetyrating',
  'safetyrating': 'safetyrating',
  'sil': 'safetyrating',
  'load_current': 'loadcurrentrating',
  'loadcurrentrating': 'loadcurrentrating',
  'load_voltage': 'loadvoltagerating',
  'loadvoltagerating': 'loadvoltagerating',
  'control_voltage': 'controlvoltage',
  'controlvoltage': 'controlvoltage',
  'zero_cross': 'zerocrossswitching',
  'zerocrossswitching': 'zerocrossswitching',

  // === SENSORS (expanded) ===
  'sensing_method': 'sensingmethod',
  'sensingmethod': 'sensingmethod',
  'sensing_distance': 'sensingdistance',
  'sensingdistance': 'sensingdistance',
  'light_source': 'lightsource',
  'lightsource': 'lightsource',
  'output_configuration': 'outputconfiguration',
  'outputconfiguration': 'outputconfiguration',
  'housing_material': 'housingmaterial',
  'housingmaterial': 'housingmaterial',
  'housing_diameter': 'housingdiameter',
  'housingdiameter': 'housingdiameter',
  'connection_type': 'connectiontype',
  'connectiontype': 'connectiontype',
  'connector_type': 'connectiontype',

  // === PRESSURE / TEMP / FLOW SENSORS ===
  'pressure_range': 'pressurerange',
  'pressurerange': 'pressurerange',
  'pressure_type': 'pressuretype',
  'pressuretype': 'pressuretype',
  'output_signal': 'outputsignal',
  'outputsignal': 'outputsignal',
  'process_connection': 'processconnection',
  'processconnection': 'processconnection',
  'thermocouple_grade': 'thermocouplegrade',
  'thermocouplegrade': 'thermocouplegrade',
  'rtd_type': 'rtdtype',
  'rtdtype': 'rtdtype',
  'temperature_range': 'temperaturerange',
  'temperaturerange': 'temperaturerange',
  'probe_length': 'probelength',
  'probelength': 'probelength',
  'probe_diameter': 'probediameter',
  'probediameter': 'probediameter',
  'flow_type': 'flowtype',
  'flowtype': 'flowtype',
  'pipe_size': 'pipesize',
  'pipesize': 'pipesize',

  // === ENCODERS ===
  'encoder_type': 'encodertype',
  'resolution': 'resolution',
  'ppr': 'resolution',
  'pulses_per_revolution': 'resolution',

  // === TRANSFORMERS ===
  'kva': 'kvarating',
  'kva_rating': 'kvarating',
  'kvarating': 'kvarating',
  'primary_voltage': 'primaryvoltage',
  'primaryvoltage': 'primaryvoltage',
  'secondary_voltage': 'secondaryvoltage',
  'secondaryvoltage': 'secondaryvoltage',
  'transformer_type': 'transformertype',
  'transformertype': 'transformertype',

  // === GEARBOXES ===
  'gearbox_type': 'gearboxtype',
  'gearboxtype': 'gearboxtype',
  'gear_ratio': 'gearratio',
  'gearratio': 'gearratio',
  'ratio': 'gearratio',
  'output_torque': 'outputtorque',
  'outputtorque': 'outputtorque',
  'input_speed': 'inputspeed',
  'inputspeed': 'inputspeed',
  'output_speed': 'outputspeed',
  'outputspeed': 'outputspeed',
  'shaft_orientation': 'shaftorientation',
  'shaftorientation': 'shaftorientation',

  // === VALVES (Solenoid, Hydraulic) ===
  'valve_type': 'valvetype',
  'valvetype': 'valvetype',
  'actuation_type': 'actuationtype',
  'actuationtype': 'actuationtype',
  'body_material': 'bodymaterial',
  'bodymaterial': 'bodymaterial',
  'spool_type': 'spooltype',
  'spooltype': 'spooltype',
  'max_pressure': 'maxpressure',
  'maxpressure': 'maxpressure',

  // === HYDRAULIC PUMPS ===
  'pump_type': 'pumptype',
  'pumptype': 'pumptype',
  'displacement': 'displacement',
  'rotation': 'rotation',

  // === SAFETY (Light Curtains) ===
  'beam_spacing': 'beamspacing',
  'beamspacing': 'beamspacing',
  'protected_height': 'protectedheight',
  'protectedheight': 'protectedheight',
  'number_of_beams': 'numberofbeams',
  'numberofbeams': 'numberofbeams',
  'response_time': 'responsetime',
  'responsetime': 'responsetime',

  // === SWITCHES (Limit, Pushbutton, Disconnect) ===
  'actuator_type': 'actuatortype',
  'actuatortype': 'actuatortype',
  'operator_type': 'operatortype',
  'operatortype': 'operatortype',
  'contact_blocks': 'contactblocks',
  'contactblocks': 'contactblocks',
  'color': 'color',
  'operating_voltage': 'operatingvoltage',
  'operatingvoltage': 'operatingvoltage',
  'fused_unfused': 'fusedunfused',
  'fusedunfused': 'fusedunfused',

  // === FUSES ===
  'fuse_type': 'fusetype',
  'fusetype': 'fusetype',
  'fuse_size': 'fusesize',
  'fusesize': 'fusesize',
  'time_delay': 'timedelay',
  'timedelay': 'timedelay',

  // === PLC / HMI ===
  'controller_platform': 'controllerplatform',
  'controllerplatform': 'controllerplatform',
  'platform': 'controllerplatform',
  'number_of_io_points': 'numberofiopoints',
  'numberofiopoints': 'numberofiopoints',
  'io_points': 'numberofiopoints',
  'memory_size': 'memorysize',
  'memorysize': 'memorysize',
  'memory': 'memorysize',
  'programming_method': 'programmingmethod',
  'programmingmethod': 'programmingmethod',
  'module_type': 'moduletype',
  'moduletype': 'moduletype',
  'number_of_channels': 'numberofchannels',
  'numberofchannels': 'numberofchannels',
  'channels': 'numberofchannels',
  'display_resolution': 'displayresolution',
  'displayresolution': 'displayresolution',

  // === TEMPERATURE CONTROLLERS ===
  'control_type': 'controltype',
  'controltype': 'controltype',
  'input_type': 'inputtype',
  'inputtype': 'inputtype',
  'panel_cutout': 'panelcutout',
  'panelcutout': 'panelcutout',
  'alarm_outputs': 'alarmnumberofoutputs',
  'alarmnumberofoutputs': 'alarmnumberofoutputs',

  // === TIMERS ===
  'timer_type': 'timertype',
  'timertype': 'timertype',
  'time_range': 'timerange',
  'timerange': 'timerange',

  // === PANEL METERS ===
  'meter_type': 'metertype',
  'metertype': 'metertype',
  'measurement_range': 'measurementrange',
  'measurementrange': 'measurementrange',

  // === PNEUMATIC ===
  'magnetic_piston': 'magneticpiston',
  'magneticpiston': 'magneticpiston',
  'rod_diameter': 'roddiameter',
  'roddiameter': 'roddiameter',
  'operating_pressure': 'operatingpressure',
  'operatingpressure': 'operatingpressure',
  'port_size': 'portsize',
  'portsize': 'portsize',

  // === ACCURACY ===
  'accuracy': 'accuracy'
};

// Fields to SKIP - already handled by core form fields
const SKIP_SPEC_KEYS = new Set([
  'brand', 'mpn', 'model', 'manufacturer', 'upc', 'condition', 'type',
  'countryoforigin'  // Handled by special handler that sends both inline + prefix
]);

// =============================================================================
// NORMALIZE SPEC KEY: Returns { inline, prefix } SureDone field names
// Returns an object with one or both field names to send to SureDone
// =============================================================================
function resolveSpecField(key) {
  if (!key) return null;

  const keyLower = key.toLowerCase().trim();
  const keyClean = keyLower.replace(/[^a-z0-9]/g, '');
  const keyUnderscore = keyLower.replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');

  // Skip fields already handled elsewhere
  if (SKIP_SPEC_KEYS.has(keyClean)) return null;

  // Find the canonical field name via SPEC_KEY_MAP
  const canonical = SPEC_KEY_MAP[keyLower] || SPEC_KEY_MAP[keyClean] || SPEC_KEY_MAP[keyUnderscore] || keyClean;

  // Build result: determine HOW to send this field to SureDone
  const result = { canonical };

  // Check if this is a SureDone native column header
  // Native fields work inline and auto-map to eBay Recommended
  if (SUREDONE_NATIVE_FIELDS.has(canonical)) {
    result.native = canonical;
  }

  // Generate the prefix version for eBay item specifics:
  // 1. Check PREFIX_OVERRIDES for fields where eBay name differs
  // 2. Auto-generate "ebayitemspecifics" + canonical for everything else
  if (PREFIX_OVERRIDES[canonical]) {
    result.prefix = PREFIX_OVERRIDES[canonical];
  } else {
    // Auto-generate prefix for any non-native field
    // (also generate for native fields that need to go to eBay)
    result.prefix = 'ebayitemspecifics' + canonical;
  }

  return result;
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================
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
  const brands = loadBrandData();
  const brandLower = brandName.toLowerCase().trim();

  // Direct lookup in JSON
  if (brands[brandLower] && brands[brandLower].id) {
    return brands[brandLower].id;
  }

  // Check aliases
  const aliasKey = BRAND_ALIASES[brandLower];
  if (aliasKey && brands[aliasKey] && brands[aliasKey].id) {
    return brands[aliasKey].id;
  }

  // Fuzzy: clean special chars and try again
  const brandClean = brandLower.replace(/[^a-z0-9]/g, ' ').replace(/\s+/g, ' ').trim();
  for (const [key, data] of Object.entries(brands)) {
    const keyClean = key.replace(/[^a-z0-9]/g, ' ').replace(/\s+/g, ' ').trim();
    if (keyClean === brandClean || brandClean.includes(keyClean) || keyClean.includes(brandClean)) {
      return data.id;
    }
  }
  console.log(`[!] Brand not found in BigCommerce: "${brandName}"`);
  return null;
}

function generateUserType(productCategory, specifications = {}, aiProductType = null) {
  if (aiProductType && aiProductType !== 'Industrial Equipment') {
    return aiProductType;
  }
  if (specifications.type && specifications.type !== 'Industrial Equipment') {
    return specifications.type;
  }
  return productCategory || 'Industrial Equipment';
}

// =============================================================================
// MAIN HANDLER
// =============================================================================
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
    
    // Smart category lookup: handles plurals, singular/plural mismatches, and partial matches
    function findBigCommerceCategory(key) {
      const keyLower = key.toLowerCase().trim();
      const mapKeys = Object.keys(BIGCOMMERCE_CATEGORY_MAP);
      
      // 1. Exact match (case-insensitive)
      let match = mapKeys.find(k => k.toLowerCase() === keyLower);
      if (match) return match;
      
      // 2. Try stripping trailing 's' (plural → singular)
      if (keyLower.endsWith('s')) {
        const singular = keyLower.slice(0, -1);
        match = mapKeys.find(k => k.toLowerCase() === singular);
        if (match) return match;
        // Also try stripping 'es' (e.g., "Switches" → "Switch")
        if (keyLower.endsWith('es')) {
          const singularEs = keyLower.slice(0, -2);
          match = mapKeys.find(k => k.toLowerCase() === singularEs);
          if (match) return match;
        }
      }
      
      // 3. Try adding 's' (singular → plural)
      match = mapKeys.find(k => k.toLowerCase() === keyLower + 's');
      if (match) return match;
      
      // 4. Try partial match (key starts with or contains search term)
      match = mapKeys.find(k => k.toLowerCase().startsWith(keyLower));
      if (match) return match;
      match = mapKeys.find(k => keyLower.startsWith(k.toLowerCase()));
      if (match) return match;
      
      return 'Unknown';
    }
    
    const categoryLookup = findBigCommerceCategory(categoryKey);
    const bigcommerceCategoriesStr = BIGCOMMERCE_CATEGORY_MAP[categoryLookup] || BIGCOMMERCE_CATEGORY_MAP['Unknown'];

    // === GENERATE USERTYPE ===
    const aiProductType = product.usertype || product.specifications?.type || null;
    const userType = generateUserType(categoryKey, product.specifications || {}, aiProductType);

    console.log('=== FIELD FORMATTING ===');
    console.log('Brand:', product.brand, ' -> ', brandFormatted);
    console.log('MPN:', product.partNumber, ' -> ', mpnFormatted);
    console.log('Category:', categoryKey);
    console.log('UserType:', userType);

    const formData = new URLSearchParams();

    // === CORE FIELDS ===
    formData.append('identifier', 'guid');
    formData.append('guid', sku);
    formData.append('sku', sku);
    // Clean title: remove any condition words the AI may have added
    // Condition is determined by the USER in the Pro UI, not by AI
    const conditionWords = /\b(Used|New|Refurbished|NIB|NOS|NIP|New In Box|New Open Box|For Parts|Not Working|Surplus|Pre-Owned)\b/gi;
    let cleanTitle = (product.title || `${product.brand} ${product.partNumber}`).replace(conditionWords, '').replace(/\s{2,}/g, ' ').trim();
    // Also clean trailing/leading punctuation left behind
    cleanTitle = cleanTitle.replace(/^[\s,\-]+|[\s,\-]+$/g, '').trim();
    
    // Append user-selected condition to title ONLY IF the user explicitly passed it
    // The Pro UI should handle adding condition to the title when the user selects it,
    // so the user sees the full title (with condition) before submitting.
    // If product.appendConditionToTitle is true, the Pro UI already added it to the title.
    // We do NOT auto-append here — the user needs to see and approve the title first.
    
    formData.append('title', cleanTitle);

    // === SKIP AUTO-PUSH TO CHANNELS ===
    formData.append('ebayskip', '1');
    formData.append('bigcommerceskip', '1');

    formData.append('longdescription', product.description || '');
    formData.append('price', product.price || '0.00');
    formData.append('stock', product.stock || '1');
    formData.append('brand', brandFormatted);
    formData.append('manufacturer', brandFormatted);

    if (upc) formData.append('upc', upc);

    formData.append('mpn', mpnFormatted);
    formData.append('model', modelFormatted);
    formData.append('partnumber', mpnFormatted);
    formData.append('usertype', userType);

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
    formData.append('bigcommercepagetitle', cleanTitle);
    formData.append('bigcommercempn', mpnFormatted);

    if (bigcommerceBrandId) formData.append('bigcommercebrandid', bigcommerceBrandId);
    formData.append('bigcommercecategories', bigcommerceCategoriesStr);

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
    }
    if (product.ebayStoreCategoryId2) {
      formData.append('ebaystoreid2', product.ebayStoreCategoryId2);
    }

    // === EBAY SHIPPING & RETURN ===
    formData.append('ebayshippingprofileid', product.ebayShippingProfileId || '69077991015');
    if (!isForParts) {
      formData.append('ebayreturnprofileid', product.ebayReturnProfileId || '61860297015');
    }

    // ==========================================================================
    // PROCESS SPECIFICATIONS  ->  EBAY ITEM SPECIFICS
    // Sends BOTH inline AND ebayitemspecifics-prefix versions where needed
    // ==========================================================================
    console.log('=== PROCESSING SPECIFICATIONS ===');
    console.log('Input specifications:', JSON.stringify(product.specifications, null, 2));

    const fieldsSet = new Set();
    let specsCount = 0;

    if (product.specifications && typeof product.specifications === 'object') {
      for (const [key, value] of Object.entries(product.specifications)) {
        // Skip empty/null values
        if (!value || value === 'null' || value === null || value === 'N/A' || value === 'Unknown') {
          console.log(`  SKIP: "${key}" (empty/null)`);
          continue;
        }

        // Resolve the key to SureDone field name(s)
        const resolved = resolveSpecField(key);

        if (!resolved) {
          console.log(`  SKIP: "${key}" (handled elsewhere or not mappable)`);
          continue;
        }

        const { canonical, native, prefix } = resolved;

        // FIELD ROUTING:
        // - NATIVE fields (SureDone column headers): send inline - they auto-map to eBay
        // - ALL other fields: send with "ebayitemspecifics" prefix - required for eBay Recommended
        // - Never send a non-native field inline (creates Dynamic custom field in SureDone!)
        if (native && !fieldsSet.has(native)) {
          // SureDone native column header - inline works and maps to eBay Recommended
          formData.append(native, value);
          fieldsSet.add(native);
          fieldsSet.add(prefix);      // Mark prefix too so Pass 2 won't duplicate
          fieldsSet.add(canonical);
          specsCount++;
          console.log(`  [OK] NATIVE: "${key}" -> ${native} = "${value}"`);
        } else if (prefix && !fieldsSet.has(prefix)) {
          // Non-native field - MUST use ebayitemspecifics prefix for eBay Recommended
          formData.append(prefix, value);
          fieldsSet.add(prefix);
          fieldsSet.add(canonical);
          if (native) fieldsSet.add(native); // Prevent inline duplicate
          specsCount++;
          console.log(`  [OK] PREFIX: "${key}" -> ${prefix} = "${value}"`);
        } else {
          console.log(`  [SKIP] Already set: "${key}" (canonical: ${canonical})`);
        }
      }
    }

    // Handle country of origin - SPECIAL: needs both inline (SureDone/BigCommerce) AND prefix (eBay)
    // Check multiple sources for the value
    const countryValue = product.countryOfOrigin 
      || (product.specifications && (product.specifications.countryoforigin || product.specifications.Countryoforigin || product.specifications.countryOfOrigin || product.specifications.country_of_origin))
      || 'United States';
    if (countryValue && countryValue !== 'N/A' && countryValue !== 'Unknown') {
      if (!fieldsSet.has('countryoforigin')) {
        formData.append('countryoforigin', countryValue);
        fieldsSet.add('countryoforigin');
        specsCount++;
        console.log(`  [OK] countryOfOrigin INLINE -> countryoforigin = "${countryValue}"`);
      }
      const coPrefix = 'ebayitemspecificscountryoforigin';
      if (!fieldsSet.has(coPrefix)) {
        formData.append(coPrefix, countryValue);
        fieldsSet.add(coPrefix);
        specsCount++;
        console.log(`  [OK] countryOfOrigin PREFIX -> ${coPrefix} = "${countryValue}"`);
      }
    }

    // ==========================================================================
    // PASS 2: EBAY ITEM SPECIFICS (AI-filled from Taxonomy API)
    // These come with inline field names from auto-fill-ebay-specifics.js
    // Fields require "ebayitemspecifics" prefix unless they are SureDone native columns
    // Only adds fields that weren't already set by Pass 1 spec processing
    // ==========================================================================
    if (product.ebayItemSpecificsForSuredone && typeof product.ebayItemSpecificsForSuredone === 'object') {
      console.log('\n=== PROCESSING PASS 2 EBAY ITEM SPECIFICS ===');
      let pass2Count = 0;
      let pass2Skipped = 0;

      for (const [fieldName, value] of Object.entries(product.ebayItemSpecificsForSuredone)) {
        // Skip empty/null/N/A values
        if (!value || value === 'null' || value === null || value === 'N/A' || value === 'Unknown') continue;

        // Skip brand/mpn  --  already handled above
        if (fieldName === 'brand' || fieldName === 'mpn' || fieldName === 'ebayitemspecificsbrand' || fieldName === 'ebayitemspecificsmpn') continue;
        // Skip model - already handled as SureDone native field
        if (fieldName === 'model' || fieldName === 'ebayitemspecificsmodel') continue;

        // Determine the correct SureDone field name:
        // 1. If already has "ebayitemspecifics" prefix, use as-is
        // 2. If in PREFIX_OVERRIDES, use the override
        // 3. Otherwise auto-generate "ebayitemspecifics" + fieldName
        let actualFieldName;
        if (fieldName.startsWith('ebayitemspecifics')) {
          actualFieldName = fieldName;
        } else if (PREFIX_OVERRIDES[fieldName]) {
          actualFieldName = PREFIX_OVERRIDES[fieldName];
        } else if (SUREDONE_NATIVE_FIELDS.has(fieldName)) {
          // For native fields in Pass 2, still send as native (they auto-map to eBay)
          actualFieldName = fieldName;
        } else {
          // Auto-generate prefix for non-native fields
          actualFieldName = 'ebayitemspecifics' + fieldName;
        }

        // Only add if not already set by Pass 1 (check both original and target)
        if (!fieldsSet.has(fieldName) && !fieldsSet.has(actualFieldName)) {
          formData.append(actualFieldName, value);
          fieldsSet.add(actualFieldName);
          fieldsSet.add(fieldName); // Track both to prevent future dupes
          specsCount++;
          pass2Count++;
          if (actualFieldName !== fieldName) {
            console.log(`  [OK] PASS2 PREFIX: ${fieldName} -> ${actualFieldName} = "${value}"`);
          } else {
            console.log(`  [OK] PASS2 NATIVE: ${fieldName} = "${value}"`);
          }
        } else {
          pass2Skipped++;
          console.log(`  [SKIP] PASS2 (already set): ${fieldName}`);
        }
      }
      console.log(`Pass 2: Added ${pass2Count} new fields, skipped ${pass2Skipped} (already set by Pass 1)`);
    }

    console.log(`Total eBay item specifics set: ${specsCount}`);

    // === SEND TO SUREDONE ===
    console.log('=== SENDING TO SUREDONE ===');
    console.log('SKU:', sku);

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
        userType,
        specsCount
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
