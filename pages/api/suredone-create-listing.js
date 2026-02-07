// pages/api/suredone-create-listing.js
// Complete SureDone integration with UPC, BigCommerce multi-category, comprehensive eBay item specifics
// 
// HANDLES BOTH FORMATS:
// 1. AI returns lowercase fields like "ratedloadhp"  ->  passes through directly
// 2. Legacy/human-readable keys like "horsepower"  ->  maps to "ratedloadhp"
// 3. eBay display names like "Rated Load (HP)"  ->  converts to "ratedloadhp"

// 30-day warranty text
const WARRANTY_TEXT = `We warranty all items for 30 days from date of purchase. If you experience any issues with your item within this period, please contact us and we will work with you to resolve the problem. This warranty covers defects in functionality but does not cover damage caused by misuse, improper installation, or normal wear and tear.`;

// Common brand ID mappings for BigCommerce
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
  'weg': '95', 'marathon': '93', 'leeson': '91', 'teco': '96', 'reliance': '92',
  // Bearings
  'mcgill': '160', 'skf': '161', 'nsk': '162', 'ntn': '163', 'timken': '164',
  'fag': '165', 'iko': '166', 'thk': '167', 'koyo': '168', 'pearl kooyo co': '168',
  'pearl kooyo co.': '168', 'nachi': '169', 'rexnord': '170', 'link-belt': '171',
  'dodge': '172', 'sealmaster': '173', 'browning': '174',
  // Additional automation brands
  'automation direct': '175', 'automationdirect': '175', 'idec': '176',
  'red lion': '177', 'watlow': '178', 'eurotherm': '179', 'honeywell': '180',
  'numatics': '181', 'norgren': '182', 'aventics': '183', 'ross': '184',
  'asco': '185', 'mac': '186', 'bimba': '187', 'clippard': '188',
  'danaher': '189', 'kollmorgen': '190', 'pacific scientific': '191',
  'lenze': '192', 'sew eurodrive': '193', 'sew-eurodrive': '193',
  'nord': '194', 'bonfiglioli': '195', 'sumitomo': '196',
  'toshiba': '197', 'nidec': '198', 'regal': '199', 'us motors': '200',
  'hubbell': '201', 'littelfuse': '202', 'bussmann': '203', 'mersen': '204'
};

// BigCommerce multi-category mappings
const BIGCOMMERCE_CATEGORY_MAP = {
  'Electric Motors': ['23', '26', '30'],
  'Electric Motor': ['23', '26', '30'],
  'AC Motor': ['23', '26', '30'],
  'DC Motor': ['23', '26', '30'],
  'Induction Motor': ['23', '26', '30'],
  'Servo Motors': ['23', '19', '54'],
  'Servo Motor': ['23', '19', '54'],
  'Servo Drives': ['23', '19', '32'],
  'Servo Drive': ['23', '19', '32'],
  'VFDs': ['23', '33', '34'],
  'VFD': ['23', '33', '34'],
  'Variable Frequency Drive': ['23', '33', '34'],
  'PLCs': ['23', '18', '24'],
  'PLC': ['23', '18', '24'],
  'HMIs': ['23', '18', '27'],
  'HMI': ['23', '18', '27'],
  'Power Supplies': ['23', '18', '28'],
  'Power Supply': ['23', '18', '28'],
  'I/O Modules': ['23', '18', '61'],
  'I/O Module': ['23', '18', '61'],
  'Proximity Sensors': ['23', '22', '41'],
  'Proximity Sensor': ['23', '22', '41'],
  'Photoelectric Sensors': ['23', '22', '42'],
  'Photoelectric Sensor': ['23', '22', '42'],
  'Light Curtains': ['23', '22', '71'],
  'Light Curtain': ['23', '22', '71'],
  'Encoders': ['23', '19', '81'],
  'Encoder': ['23', '19', '81'],
  'Pneumatic Cylinders': ['23', '46', '47'],
  'Pneumatic Cylinder': ['23', '46', '47'],
  'Pneumatic Valves': ['23', '46', '68'],
  'Pneumatic Valve': ['23', '46', '68'],
  'Hydraulic Pumps': ['23', '84', '94'],
  'Hydraulic Pump': ['23', '84', '94'],
  'Hydraulic Valves': ['23', '84', '91'],
  'Hydraulic Valve': ['23', '84', '91'],
  'Circuit Breakers': ['23', '20', '44'],
  'Circuit Breaker': ['23', '20', '44'],
  'Contactors': ['23', '49', '50'],
  'Contactor': ['23', '49', '50'],
  'Safety Relays': ['23', '49', '96'],
  'Safety Relay': ['23', '49', '96'],
  'Control Relays': ['23', '49', '51'],
  'Control Relay': ['23', '49', '51'],
  'Transformers': ['23', '20', '37'],
  'Transformer': ['23', '20', '37'],
  'Gearboxes': ['23', '26', '36'],
  'Gearbox': ['23', '26', '36'],
  'Bearings': ['23', '26', '43'],
  'Bearing': ['23', '26', '43'],
  'Needle Bearing': ['23', '26', '43'],
  'Ball Bearing': ['23', '26', '43'],
  'Roller Bearing': ['23', '26', '43'],
  'Cam Follower': ['23', '26', '43'],
  'Linear Bearing': ['23', '26', '43'],
  'Pillow Block': ['23', '26', '43'],
  'Tapered Roller Bearing': ['23', '26', '43'],
  'Thrust Bearing': ['23', '26', '43'],
  'Flange Bearing': ['23', '26', '43'],
  // Motor Starters
  'Motor Starters': ['23', '49', '50'],
  'Motor Starter': ['23', '49', '50'],
  // Stepper Motors/Drives
  'Stepper Motors': ['23', '19', '54'],
  'Stepper Motor': ['23', '19', '54'],
  'Stepper Drives': ['23', '19', '32'],
  'Stepper Drive': ['23', '19', '32'],
  // DC Drives
  'DC Drives': ['23', '33', '34'],
  'DC Drive': ['23', '33', '34'],
  'SCR Controller': ['23', '33', '34'],
  // Solid State Relays
  'Solid State Relays': ['23', '49', '96'],
  'Solid State Relay': ['23', '49', '96'],
  // Temperature Controllers
  'Temperature Controllers': ['23', '22', '71'],
  'Temperature Controller': ['23', '22', '71'],
  // Pressure Sensors
  'Pressure Sensors': ['23', '22', '42'],
  'Pressure Sensor': ['23', '22', '42'],
  'Pressure Transducer': ['23', '22', '42'],
  // Temperature Sensors
  'Temperature Sensors': ['23', '22', '42'],
  'Temperature Sensor': ['23', '22', '42'],
  'Thermocouple': ['23', '22', '42'],
  'RTD': ['23', '22', '42'],
  // Flow Sensors
  'Flow Sensors': ['23', '22', '42'],
  'Flow Sensor': ['23', '22', '42'],
  'Flow Meter': ['23', '22', '42'],
  // Disconnect Switches
  'Disconnect Switches': ['23', '20', '44'],
  'Disconnect Switch': ['23', '20', '44'],
  // Fuses
  'Fuses': ['23', '20', '44'],
  'Fuse': ['23', '20', '44'],
  // Panel Meters
  'Panel Meters': ['23', '22', '71'],
  'Panel Meter': ['23', '22', '71'],
  // Timers
  'Timers': ['23', '49', '51'],
  'Timer': ['23', '49', '51'],
  // Limit Switches
  'Limit Switches': ['23', '22', '42'],
  'Limit Switch': ['23', '22', '42'],
  // Pushbuttons
  'Pushbuttons': ['23', '49', '51'],
  'Pushbutton': ['23', '49', '51'],
  // Safety Controllers
  'Safety Controllers': ['23', '22', '71'],
  'Safety Controller': ['23', '22', '71'],
  // Solenoid Valves
  'Solenoid Valves': ['23', '46', '68'],
  'Solenoid Valve': ['23', '46', '68'],
  // Hydraulic Cylinders
  'Hydraulic Cylinders': ['23', '84', '94'],
  'Hydraulic Cylinder': ['23', '84', '94'],
  // Hydraulic Motors
  'Hydraulic Motors': ['23', '84', '94'],
  'Hydraulic Motor': ['23', '84', '94'],
  'Unknown': ['23']
};

// =============================================================================
// SUREDONE FIELD MAPPING FOR EBAY ITEM SPECIFICS
// =============================================================================
// SureDone has TWO types of eBay fields:
//   1. INLINE fields: short names like "ratedloadhp", "baserpm", "enclosuretype"
//       ->  These map directly to eBay Recommended item specifics
//   2. PREFIX fields: "ebayitemspecifics" + name like "ebayitemspecificsacphase"  
//       ->  These ALSO map to eBay Recommended but need the prefix
//
// Some specs only work with the prefix. We must send BOTH where applicable.
// =============================================================================

// Fields that work as INLINE (short name) in SureDone  ->  eBay Recommended
const INLINE_FIELDS = new Set([
  // Motors - confirmed inline in SureDone headers
  'ratedloadhp', 'baserpm', 'nominalratedinputvoltage', 'actualratedinputvoltage',
  'fullloadamps', 'enclosuretype', 'mountingtype', 'currenttype', 'shaftdiameter',
  'reversiblenonreversible', 'dcstatorwindingtype', 'ratedfullloadtorque',
  'numberofpoles', 'numberofphases', 'motortype', 'insulationclass', 'nemadesignletter',
  'stallcurrent', 'noloadrpm',
  // Sensors
  'sensingrange', 'operatingdistance', 'sensortype', 'outputtype',
  // Pneumatic/Hydraulic
  'borediameter', 'strokelength', 'cylindertype', 'maxpsi', 'ratedpressure',
  'maximumpressure', 'maximumflowrate', 'hydraulicpumptype', 'pumpaction',
  'centrifugalpumptype',
  // PLC/HMI/Communication
  'communicationstandard',
  // Circuit Breakers/Relays/Contactors
  'coilvoltage', 'currentrating', 'voltagerating',
  // Bearings
  'bearingtype', 'outerdiameter', 'width', 'sealtype', 'material',
  'precisionrating', 'bearingseries',
  // General
  'countryoforigin', 'model', 'mpn', 'voltage', 'amperage', 'frequency', 'phase',
  'horsepower', 'frame', 'rpm', 'kva', 'shaftdiameter',
  // Additional fields found needed
  'outputcurrent', 'outputpower', 'outputvoltage', 'inputvoltagerange',
  'interruptingrating', 'breakertype', 'tripcurve', 'frametype',
  'auxiliarycontacts', 'contactconfiguration', 'contactrating',
  'operatingpressure', 'portsize', 'roddiameter', 'flowrate',
  'displacement', 'rotation', 'gearratio', 'outputtorque', 'inputspeed', 'outputspeed',
  'resolution', 'stepangle', 'holdingtorque', 'ratedcurrent', 'leadwires',
  'peakcurrent', 'axiscount', 'microsteppingresolution',
  'kvarating', 'primaryvoltage', 'secondaryvoltage', 'transformertype',
  'horsepowerrating', 'kwrating', 'outputfrequencyrange',
  'controllerplatform', 'numberofiopoints', 'memorysize', 'programmingmethod',
  'moduletype', 'numberofchannels', 'displayresolution',
  'safetyrating', 'inputtype', 'numberofcontacts',
  'loadcurrentrating', 'loadvoltagerating', 'controlvoltage',
  'outputconfiguration', 'housingmaterial', 'housingdiameter', 'connectiontype',
  'sensingmethod', 'lightsource',
  'pressurerange', 'pressuretype', 'outputsignal', 'processconnection', 'accuracy',
  'thermocouplegrade', 'rtdtype', 'temperaturerange', 'probelength', 'probediameter',
  'flowtype', 'pipesize',
  'encodertype',
  'beamspacing', 'protectedheight', 'numberofbeams', 'responsetime',
  'spooltype', 'actuationtype', 'valvetype', 'bodymaterial',
  'fusetype', 'fusesize', 'timedelay',
  'metertype', 'measurementrange', 'panelcutout',
  'timertype', 'timerange',
  'actuatortype', 'operatortype', 'contactblocks', 'color', 'operatingvoltage',
  'controlmethod', 'feedbacktype', 'controltype',
  'startertype', 'overloadrange',
  'magneticpiston', 'sockettype', 'zerocrossswitching',
  'gearboxtype', 'shaftorientation',
  'fusedunfused', 'alarmnumberofoutputs',
  'ratedtorque', 'ratedspeed', 'ratedpower', 'encodertype', 'braketype',
  'sensingdistance', 'maxpressure', 'power'
]);

// Fields that REQUIRE "ebayitemspecifics" prefix in SureDone  ->  eBay Recommended
// Key = the clean field name, Value = the exact SureDone header name
const PREFIX_FIELDS = {
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
  'countryoforigin': 'ebayitemspecificscountryoforigin',
  'features': 'ebayitemspecificsfeatures',
  // Bearings
  'bearingtype': 'ebayitemspecificsbearingstype',
  'outerdiameter': 'ebayitemspecificsoutsidediameter',
  'outsidediameter': 'ebayitemspecificsoutsidediameter',
  'width': 'ebayitemspecificswidth',
  'sealtype': 'ebayitemspecificssealtype',
  'material': 'ebayitemspecificsmaterial',
  'precisionrating': 'ebayitemspecificsprecisionrating',
  'bearingseries': 'ebayitemspecificsbearingseries',
  // Mounting
  'mountingstyle': 'ebayitemspecificsmountingstyle',
  // Power
  'power': 'ebayitemspecificspower',
  'outputpower': 'ebayitemspecificsoutputpower',
  'ratedpower': 'ebayitemspecificsratedpower',
  // Servo/Stepper specific
  'ratedtorque': 'ebayitemspecificsratedtorque',
  'ratedspeed': 'ebayitemspecificsratedspeed',
  'encodertype': 'ebayitemspecificsencodertype',
  'braketype': 'ebayitemspecificsbraketype',
  'stepangle': 'ebayitemspecificsstepangle',
  'holdingtorque': 'ebayitemspecificsholdingtorque',
  // VFD specific
  'horsepowerrating': 'ebayitemspecificshorsepowerrating',
  'kwrating': 'ebayitemspecificskwrating',
  'outputfrequencyrange': 'ebayitemspecificsoutputfrequencyrange',
  // Circuit breaker specific
  'interruptingrating': 'ebayitemspecificsinterruptingrating',
  'breakertype': 'ebayitemspecificsbreakertype',
  'tripcurve': 'ebayitemspecificstripcurve',
  'frametype': 'ebayitemspecificsframetype',
  // Contactor/Starter specific
  'auxiliarycontacts': 'ebayitemspecificsauxiliarycontacts',
  'iecrating': 'ebayitemspecificsiecrating',
  'startertype': 'ebayitemspecificsstartertype',
  'overloadrange': 'ebayitemspecificsoverloadrange',
  // Relay specific
  'contactconfiguration': 'ebayitemspecificscontactconfiguration',
  'contactrating': 'ebayitemspecificscontactrating',
  'sockettype': 'ebayitemspecificssockettype',
  'safetyrating': 'ebayitemspecificssafetyrating',
  'loadcurrentrating': 'ebayitemspecificsloadcurrentrating',
  'loadvoltagerating': 'ebayitemspecificsloadvoltagerating',
  'controlvoltage': 'ebayitemspecificscontrolvoltage',
  // Sensor specific
  'sensingmethod': 'ebayitemspecificssensingmethod',
  'sensingdistance': 'ebayitemspecificssensingdistance',
  'lightsource': 'ebayitemspecificslightsource',
  'outputconfiguration': 'ebayitemspecificsoutputconfiguration',
  'housingmaterial': 'ebayitemspecificshousingmaterial',
  'housingdiameter': 'ebayitemspecificshousingdiameter',
  'connectiontype': 'ebayitemspecificsconnectiontype',
  // Pressure/Temp/Flow sensor specific
  'pressurerange': 'ebayitemspecificspressurerange',
  'pressuretype': 'ebayitemspecificspressuretype',
  'outputsignal': 'ebayitemspecificsoutputsignal',
  'processconnection': 'ebayitemspecificsprocessconnection',
  'thermocouplegrade': 'ebayitemspecificsthermocouplegrade',
  'rtdtype': 'ebayitemspecificsrtdtype',
  'temperaturerange': 'ebayitemspecificstemperaturerange',
  'flowtype': 'ebayitemspecificsflowtype',
  // Encoder specific
  'resolution': 'ebayitemspecificsresolution',
  // Transformer specific
  'kvarating': 'ebayitemspecificskvarating',
  'primaryvoltage': 'ebayitemspecificsprimaryvoltage',
  'secondaryvoltage': 'ebayitemspecificssecondaryvoltage',
  'transformertype': 'ebayitemspecificstransformertype',
  // Gearbox specific
  'gearboxtype': 'ebayitemspecificsgearboxtype',
  'gearratio': 'ebayitemspecificsgearratio',
  'outputtorque': 'ebayitemspecificsoutputtorque',
  'shaftorientation': 'ebayitemspecificsshaftorientation',
  // Valve specific
  'valvetype': 'ebayitemspecificsvalvetype',
  'actuationtype': 'ebayitemspecificsactuationtype',
  'bodymaterial': 'ebayitemspecificsbodymaterial',
  'spooltype': 'ebayitemspecificsspooltype',
  // Hydraulic pump specific
  'pumptype': 'ebayitemspecificspumptype',
  'displacement': 'ebayitemspecificsdisplacement',
  // Safety specific
  'beamspacing': 'ebayitemspecificsbeamspacing',
  'protectedheight': 'ebayitemspecificsprotectedheight',
  'numberofbeams': 'ebayitemspecificsnumberofbeams',
  'responsetime': 'ebayitemspecificsresponsetime',
  // Switch specific
  'actuatortype': 'ebayitemspecificsactuatortype',
  'operatortype': 'ebayitemspecificsoperatortype',
  'contactblocks': 'ebayitemspecificscontactblocks',
  // Fuse specific
  'fusetype': 'ebayitemspecificsfusetype',
  'fusesize': 'ebayitemspecificsfusesize',
  'timedelay': 'ebayitemspecificstimedelay',
  // PLC specific
  'controllerplatform': 'ebayitemspecificscontrollerplatform',
  'numberofiopoints': 'ebayitemspecificsnumberofiopoints',
  'moduletype': 'ebayitemspecificsmoduletype',
  'numberofchannels': 'ebayitemspecificsnumberofchannels',
  // Additional
  'controlmethod': 'ebayitemspecificscontrolmethod',
  'feedbacktype': 'ebayitemspecificsfeedbacktype',
  'controltype': 'ebayitemspecificscontroltype',
  'magneticpiston': 'ebayitemspecificsmagneticpiston',
  'fusedunfused': 'ebayitemspecificsfusedunfused'
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
  'brand', 'mpn', 'model', 'manufacturer', 'upc', 'condition', 'type'
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

  // Find the canonical field name
  const canonical = SPEC_KEY_MAP[keyLower] || SPEC_KEY_MAP[keyClean] || SPEC_KEY_MAP[keyUnderscore] || keyClean;

  // Build result: which SureDone fields to send
  const result = { canonical };

  // Check if this field has an inline version
  if (INLINE_FIELDS.has(canonical)) {
    result.inline = canonical;
  }

  // Check if this field needs the ebayitemspecifics prefix
  if (PREFIX_FIELDS[canonical]) {
    result.prefix = PREFIX_FIELDS[canonical];
  }

  // If neither matched, try sending as inline (SureDone may accept it)
  if (!result.inline && !result.prefix) {
    result.inline = canonical;
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
    const categoryLookup = Object.keys(BIGCOMMERCE_CATEGORY_MAP).find(
      k => k.toLowerCase() === categoryKey.toLowerCase()
    ) || 'Unknown';
    const bigcommerceCategories = BIGCOMMERCE_CATEGORY_MAP[categoryLookup] || BIGCOMMERCE_CATEGORY_MAP['Unknown'];
    const bigcommerceCategoriesStr = bigcommerceCategories.join('*');

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
    formData.append('title', product.title);

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
    formData.append('bigcommercepagetitle', product.title);
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

        const { canonical, inline, prefix } = resolved;

        // PRIORITY ORDER for sending specs to SureDone:
        // 1. PREFIX first: "ebayitemspecifics..." is the most reliable path to eBay
        //    This ensures fields like bearingtype -> ebayitemspecificsbearingstype work
        // 2. INLINE second: For SureDone-native fields WITHOUT a prefix mapping
        //    (e.g., ratedloadhp, baserpm - fields SureDone knows natively)
        // 3. FALLBACK: Try inline for anything else
        // NEVER send both (that creates Dynamic duplicates in SureDone).
        if (prefix && !fieldsSet.has(prefix)) {
          // Preferred: field has a known ebayitemspecifics prefix mapping
          formData.append(prefix, value);
          fieldsSet.add(prefix);
          // Track inline name too so Pass 2 won't duplicate
          if (inline) fieldsSet.add(inline);
          specsCount++;
          console.log(`  [OK] PREFIX: "${key}" -> ${prefix} = "${value}"`);
        } else if (inline && INLINE_FIELDS.has(inline) && !fieldsSet.has(inline)) {
          // SureDone-native field without prefix mapping (or prefix already set)
          formData.append(inline, value);
          fieldsSet.add(inline);
          specsCount++;
          console.log(`  [OK] INLINE: "${key}" -> ${inline} = "${value}"`);
        } else if (inline && !fieldsSet.has(inline)) {
          // Fallback: field not in INLINE_FIELDS or PREFIX_FIELDS, try inline anyway
          formData.append(inline, value);
          fieldsSet.add(inline);
          specsCount++;
          console.log(`  [OK] FALLBACK INLINE: "${key}" -> ${inline} = "${value}"`);
        }

        if (!inline && !prefix) {
          console.log(`  [!] NO MAPPING: "${key}"  ->  "${canonical}" (sent as-is)`);
          if (!fieldsSet.has(canonical)) {
            formData.append(canonical, value);
            fieldsSet.add(canonical);
            specsCount++;
          }
        }
      }
    }

    // Handle country of origin from top-level
    if (product.countryOfOrigin && !fieldsSet.has('countryoforigin')) {
      formData.append('countryoforigin', product.countryOfOrigin);
      fieldsSet.add('countryoforigin');
      specsCount++;
      console.log(`  [OK] countryOfOrigin  ->  countryoforigin = "${product.countryOfOrigin}"`);
    }

    // ==========================================================================
    // PASS 2: EBAY ITEM SPECIFICS (AI-filled from Taxonomy API)
    // These come with inline field names from auto-fill-ebay-specifics.js
    // Some fields require prefix to work in SureDone, so we check PREFIX_FIELDS
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

        // Determine the correct SureDone field name:
        // If the field is in PREFIX_FIELDS, use the prefix version
        // Otherwise use the inline name as-is
        const prefixVersion = PREFIX_FIELDS[fieldName];
        const actualFieldName = prefixVersion || fieldName;

        // Only add if not already set by Pass 1 (check both inline and prefix)
        if (!fieldsSet.has(fieldName) && !fieldsSet.has(actualFieldName)) {
          formData.append(actualFieldName, value);
          fieldsSet.add(actualFieldName);
          fieldsSet.add(fieldName); // Track both to prevent future dupes
          specsCount++;
          pass2Count++;
          if (prefixVersion) {
            console.log(`  [OK] PASS2 PREFIX: ${fieldName}  ->  ${actualFieldName} = "${value}"`);
          } else {
            console.log(`  [OK] PASS2 INLINE: ${fieldName} = "${value}"`);
          }
        } else {
          pass2Skipped++;
          console.log(`  [SKIP] PASS2 SKIP (already set): ${fieldName}`);
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
