// lib/item-specifics-mapping.js
// Centralized mapping for item specifications to SureDone/BigCommerce/eBay fields
// This ensures consistency and prevents creation of unmapped dynamic fields

/**
 * WEBSITE_STANDARD_FIELDS - 65 standardized fields for BigCommerce/SureDone
 * These fields exist in SureDone and can be used directly
 * Format: { internalName: 'suredoneFieldName' }
 */
const WEBSITE_STANDARD_FIELDS = {
  // === ELECTRICAL SPECIFICATIONS ===
  voltage: 'voltage',
  inputVoltage: 'inputvoltage',
  outputVoltage: 'outputvoltage',
  ratedVoltage: 'ratedvoltage',
  coilVoltage: 'coilvoltage',
  amperage: 'amperage',
  current: 'current',
  maxCurrent: 'maxcurrent',
  power: 'power',
  wattage: 'wattage',
  phase: 'phase',
  frequency: 'frequency',

  // === MOTOR SPECIFICATIONS ===
  horsepower: 'horsepower',
  kilowatts: 'kilowatts',
  rpm: 'rpm',
  ratedSpeed: 'ratedspeed',
  frameSize: 'framesize',
  enclosure: 'enclosure',
  mountingType: 'mountingtype',
  shaftDiameter: 'shaftdiameter',
  shaftType: 'shafttype',
  serviceFactor: 'servicefactor',
  insulationClass: 'insulationclass',
  efficiency: 'efficiency',
  dutyCycle: 'dutycycle',
  nemaDesign: 'nemadesign',
  torque: 'torque',

  // === SENSOR SPECIFICATIONS ===
  sensingRange: 'sensingrange',
  sensingDistance: 'sensingdistance',
  sensingType: 'sensingtype',
  outputType: 'outputtype',
  responseTime: 'responsetime',
  resolution: 'resolution',
  accuracy: 'accuracy',
  repeatability: 'repeatability',

  // === PHYSICAL SPECIFICATIONS ===
  dimensions: 'dimensions',
  length: 'length',
  width: 'width',
  height: 'height',
  weight: 'weight',
  material: 'material',
  color: 'color',
  ipRating: 'iprating',
  operatingTemperature: 'operatingtemperature',

  // === PNEUMATIC/HYDRAULIC SPECIFICATIONS ===
  boreSize: 'boresize',
  strokeLength: 'strokelength',
  portSize: 'portsize',
  threadSize: 'threadsize',
  maxPressure: 'maxpressure',
  operatingPressure: 'operatingpressure',
  flowRate: 'flowrate',

  // === COMMUNICATION/INTERFACE ===
  communicationProtocol: 'communicationprotocol',
  interfaceType: 'interfacetype',
  connectionType: 'connectiontype',
  numberOfPorts: 'numberofports',

  // === CONTROL/SWITCH SPECIFICATIONS ===
  contactConfiguration: 'contactconfiguration',
  poleConfiguration: 'poleconfiguration',
  numberOfPoles: 'numberofpoles',
  switchType: 'switchtype',
  contactRating: 'contactrating',

  // === DISPLAY SPECIFICATIONS ===
  displaySize: 'displaysize',
  displayType: 'displaytype',
  screenResolution: 'screenresolution'
};

/**
 * EBAY_FIELD_MAPPING - Maps common spec names to eBay item specifics fields
 * Format: { 'extractedSpecName': 'ebayFieldSuffix' }
 * The suffix gets prepended with 'ebayitemspecifics' when sent to SureDone
 */
const EBAY_FIELD_MAPPING = {
  // === MOTOR FIELDS ===
  'voltage': 'actualratedinputvoltage',
  'rated voltage': 'actualratedinputvoltage',
  'input voltage': 'inputvoltagerange',
  'output voltage': 'outputvoltageratingac',
  'horsepower': 'motorhorsepower',
  'hp': 'motorhorsepower',
  'motor hp': 'motorhorsepower',
  'rated horsepower': 'ratedhorsepower',
  'kw': 'ratedhorsepower',
  'kw rating': 'ratedhorsepower',
  'kilowatts': 'ratedhorsepower',
  'rpm': 'ratedrpm',
  'speed': 'ratedrpm',
  'rated speed': 'ratedrpm',
  'motor speed': 'ratedrpm',
  'frame size': 'iecframesize',
  'frame': 'iecframesize',
  'nema frame': 'nemaframesuffix',
  'phase': 'acphase',
  'motor phase': 'acphase',
  'frequency': 'acfrequencyrating',
  'hz': 'acfrequencyrating',
  'enclosure': 'enclosure',
  'enclosure type': 'enclosure',
  'motor enclosure': 'enclosure',
  'insulation class': 'insulationclass',
  'insulation': 'insulationclass',
  'service factor': 'servicefactor',
  'sf': 'servicefactor',
  'mounting': 'mountingtype',
  'mounting type': 'mountingtype',
  'mount type': 'mountingtype',
  'shaft type': 'shafttype',
  'shaft diameter': 'shaftdiameter',
  'nema design': 'nemadesignletter',
  'design letter': 'nemadesignletter',
  'efficiency': 'efficiency',
  'duty cycle': 'dutycycle',
  'duty': 'dutycycle',
  'torque': 'torque',
  'rated torque': 'torque',

  // === ELECTRICAL / CURRENT ===
  'amperage': 'actualcurrentrating',
  'amps': 'actualcurrentrating',
  'current': 'actualcurrentrating',
  'rated current': 'actualcurrentrating',
  'fla': 'actualcurrentrating',
  'full load amps': 'actualcurrentrating',
  'coil voltage': 'coilvoltagerating',
  'max input current': 'maximuminputcurrent',
  'maximum input current': 'maximuminputcurrent',
  'max output current': 'maximumpeakoutputcurrent',
  'maximum output current': 'maximumpeakoutputcurrent',
  'power': 'poweroutput',
  'power output': 'poweroutput',
  'wattage': 'wattage',
  'watts': 'wattage',

  // === SENSORS ===
  'sensing range': 'nominalsensingradius',
  'sensing distance': 'nominalsensingradius',
  'detection range': 'nominalsensingradius',
  'detection distance': 'nominalsensingradius',
  'sensing type': 'sensingtype',
  'sensor type': 'levelsensortype',
  'output type': 'outputtype',
  'output': 'outputtype',
  'response time': 'responsetime',
  'ip rating': 'iprating',
  'protection class': 'iprating',
  'ingress protection': 'iprating',
  'operating temperature': 'ambientoperatingtemperature',
  'temperature range': 'ambientoperatingtemperature',

  // === PUSHBUTTONS / SWITCHES ===
  'button type': 'buttontype',
  'button color': 'buttoncolor',
  'button shape': 'buttonshape',
  'switch action': 'switchaction',
  'switch style': 'switchstyle',
  'switch type': 'switchtype',
  'contact configuration': 'contactconfiguration',
  'contacts': 'contactconfiguration',
  'contact form': 'contactform',
  'contact material': 'contactmaterial',
  'contact rating': 'contactcurrentrating',

  // === PNEUMATIC / HYDRAULIC ===
  'bore diameter': 'boresize',
  'bore size': 'boresize',
  'bore': 'boresize',
  'cylinder bore': 'boresize',
  'stroke length': 'strokelength',
  'stroke': 'strokelength',
  'cylinder stroke': 'strokelength',
  'cylinder type': 'cylindertype',
  'port size': 'inletportdiameter',
  'inlet port': 'inletportdiameter',
  'inlet size': 'inletportdiameter',
  'outlet port': 'outletportdiameter',
  'outlet size': 'outletportdiameter',
  'max pressure': 'maximumoutputpressure',
  'maximum pressure': 'maximumoutputpressure',
  'pressure rating': 'maximumoutputpressure',
  'operating pressure': 'operatingpressure',
  'working pressure': 'operatingpressure',
  'flow rate': 'maximumflowrate',
  'max flow': 'maximumflowrate',
  'valve type': 'solenoidvalvetype',
  'solenoid type': 'solenoidvalvetype',
  'valve operation': 'valveoperation',
  'actuation': 'valveoperation',
  'number of ports': 'numberofports',
  'ports': 'numberofports',
  'thread size': 'threadsize',
  'thread type': 'threadtype',

  // === CIRCUIT BREAKERS / RELAYS / FUSES ===
  'circuit breaker type': 'circuitbreakertype',
  'breaker type': 'circuitbreakertype',
  'pole configuration': 'poleconfiguration',
  'poles': 'poleconfiguration',
  'number of poles': 'poleconfiguration',
  'fuse type': 'fusetype',
  'fuse class': 'fuseclassification',
  'trip rating': 'tripcurrentrating',
  'trip current': 'tripcurrentrating',
  'interrupt rating': 'interruptrating',

  // === PLC / HMI / COMMUNICATION ===
  'communication protocol': 'communicationstandard',
  'communication': 'communicationstandard',
  'protocol': 'communicationstandard',
  'network type': 'communicationstandard',
  'interface': 'communicationstandard',
  'display type': 'displaytype',
  'screen type': 'displaytype',
  'display size': 'displayscreensize',
  'screen size': 'displayscreensize',
  'resolution': 'displayresolution',
  'screen resolution': 'displayresolution',
  'i/o type': 'iotype',
  'io type': 'iotype',
  'input type': 'inputtype',
  'number of inputs': 'numberofinputs',
  'inputs': 'numberofinputs',
  'number of outputs': 'numberofoutputs',
  'outputs': 'numberofoutputs',
  'memory': 'memorysize',
  'memory size': 'memorysize',

  // === DRIVES / VFD ===
  'input voltage range': 'inputvoltagerange',
  'output voltage range': 'outputvoltageratingac',
  'control method': 'controlmethod',
  'carrier frequency': 'carrierfrequency',

  // === GENERAL / PHYSICAL ===
  'brand': 'brand',
  'manufacturer': 'brand',
  'model': 'model',
  'mpn': 'mpn',
  'part number': 'mpn',
  'material': 'material',
  'housing material': 'material',
  'body material': 'material',
  'color': 'color',
  'finish': 'finish',
  'weight': 'itemweight',
  'dimensions': 'itemdimensions',
  'length': 'itemlength',
  'width': 'itemwidth',
  'height': 'itemheight'
};

/**
 * WEBSITE_TO_EBAY_MAPPING - Cross-reference mapping
 * Maps website standard fields to their eBay equivalent field suffixes
 * This allows one extracted value to populate both platforms
 */
const WEBSITE_TO_EBAY_MAPPING = {
  // Electrical
  voltage: 'actualratedinputvoltage',
  inputVoltage: 'inputvoltagerange',
  outputVoltage: 'outputvoltageratingac',
  amperage: 'actualcurrentrating',
  current: 'actualcurrentrating',
  maxCurrent: 'maximuminputcurrent',
  power: 'poweroutput',
  phase: 'acphase',
  frequency: 'acfrequencyrating',
  coilVoltage: 'coilvoltagerating',

  // Motor
  horsepower: 'motorhorsepower',
  kilowatts: 'ratedhorsepower',
  rpm: 'ratedrpm',
  ratedSpeed: 'ratedrpm',
  frameSize: 'iecframesize',
  enclosure: 'enclosure',
  mountingType: 'mountingtype',
  shaftDiameter: 'shaftdiameter',
  shaftType: 'shafttype',
  serviceFactor: 'servicefactor',
  insulationClass: 'insulationclass',
  efficiency: 'efficiency',
  dutyCycle: 'dutycycle',
  nemaDesign: 'nemadesignletter',
  torque: 'torque',

  // Sensor
  sensingRange: 'nominalsensingradius',
  sensingDistance: 'nominalsensingradius',
  sensingType: 'sensingtype',
  outputType: 'outputtype',
  responseTime: 'responsetime',
  accuracy: 'accuracy',

  // Physical
  ipRating: 'iprating',
  operatingTemperature: 'ambientoperatingtemperature',
  material: 'material',
  color: 'color',
  weight: 'itemweight',

  // Pneumatic/Hydraulic
  boreSize: 'boresize',
  strokeLength: 'strokelength',
  portSize: 'inletportdiameter',
  maxPressure: 'maximumoutputpressure',
  operatingPressure: 'operatingpressure',
  flowRate: 'maximumflowrate',

  // Communication
  communicationProtocol: 'communicationstandard',
  numberOfPorts: 'numberofports',

  // Control/Switch
  contactConfiguration: 'contactconfiguration',
  poleConfiguration: 'poleconfiguration',
  numberOfPoles: 'poleconfiguration',
  switchType: 'switchtype',
  contactRating: 'contactcurrentrating',

  // Display
  displaySize: 'displayscreensize',
  displayType: 'displaytype',
  screenResolution: 'displayresolution',
  resolution: 'displayresolution'
};

/**
 * Normalizes a specification key for lookup
 * @param {string} key - The specification key to normalize
 * @returns {string} - Normalized key (lowercase, trimmed)
 */
function normalizeSpecKey(key) {
  if (!key || typeof key !== 'string') return '';
  return key.toLowerCase().trim().replace(/_/g, ' ').replace(/\s+/g, ' ');
}

/**
 * Maps AI-extracted specifications to SureDone fields
 * @param {Object} specifications - Raw specifications object from AI extraction
 * @returns {Object} - { websiteFields, ebayFields, unmappedSpecs }
 */
function mapSpecsToFields(specifications) {
  const result = {
    websiteFields: {},     // Goes to SureDone standard fields (e.g., voltage, horsepower)
    ebayFields: {},        // Goes to SureDone as ebayitemspecifics* (e.g., ebayitemspecificsactualratedinputvoltage)
    unmappedSpecs: []      // Specs that couldn't be mapped - log warning but don't create fields
  };

  if (!specifications || typeof specifications !== 'object') {
    return result;
  }

  // Create reverse lookup for WEBSITE_STANDARD_FIELDS (suredoneFieldName -> internalName)
  const websiteFieldByValue = {};
  for (const [internal, suredone] of Object.entries(WEBSITE_STANDARD_FIELDS)) {
    websiteFieldByValue[suredone] = internal;
  }

  for (const [rawKey, value] of Object.entries(specifications)) {
    // Skip empty/null values
    if (value === null || value === undefined || value === '' ||
        value === 'null' || value === 'N/A' || value === 'Unknown') {
      continue;
    }

    const normalizedKey = normalizeSpecKey(rawKey);
    let mapped = false;

    // 1. Try to find a direct match in EBAY_FIELD_MAPPING
    const ebayFieldSuffix = EBAY_FIELD_MAPPING[normalizedKey];
    if (ebayFieldSuffix) {
      result.ebayFields[`ebayitemspecifics${ebayFieldSuffix}`] = value;
      mapped = true;

      // Also check if there's a corresponding website field
      const websiteInternalName = websiteFieldByValue[ebayFieldSuffix] ||
                                   Object.keys(WEBSITE_TO_EBAY_MAPPING).find(
                                     k => WEBSITE_TO_EBAY_MAPPING[k] === ebayFieldSuffix
                                   );
      if (websiteInternalName && WEBSITE_STANDARD_FIELDS[websiteInternalName]) {
        result.websiteFields[WEBSITE_STANDARD_FIELDS[websiteInternalName]] = value;
      }
    }

    // 2. Try camelCase version for WEBSITE_STANDARD_FIELDS
    const camelKey = normalizedKey.replace(/\s(.)/g, (_, c) => c.toUpperCase());
    if (WEBSITE_STANDARD_FIELDS[camelKey]) {
      result.websiteFields[WEBSITE_STANDARD_FIELDS[camelKey]] = value;
      mapped = true;

      // Also populate corresponding eBay field
      if (WEBSITE_TO_EBAY_MAPPING[camelKey]) {
        result.ebayFields[`ebayitemspecifics${WEBSITE_TO_EBAY_MAPPING[camelKey]}`] = value;
      }
    }

    // 3. Try direct key match in WEBSITE_STANDARD_FIELDS
    const directKey = normalizedKey.replace(/\s/g, '');
    for (const [internal, suredone] of Object.entries(WEBSITE_STANDARD_FIELDS)) {
      if (internal.toLowerCase() === directKey || suredone === directKey) {
        result.websiteFields[suredone] = value;
        mapped = true;

        // Also populate corresponding eBay field
        if (WEBSITE_TO_EBAY_MAPPING[internal]) {
          result.ebayFields[`ebayitemspecifics${WEBSITE_TO_EBAY_MAPPING[internal]}`] = value;
        }
        break;
      }
    }

    // 4. If still not mapped, log warning
    if (!mapped) {
      result.unmappedSpecs.push({ key: rawKey, value: value });
    }
  }

  return result;
}

/**
 * Validates that a field name exists in our mapping
 * @param {string} fieldName - The field name to validate
 * @returns {boolean} - True if valid, false otherwise
 */
function isValidField(fieldName) {
  if (!fieldName || typeof fieldName !== 'string') return false;

  // Check if it's a website standard field
  const websiteValues = Object.values(WEBSITE_STANDARD_FIELDS);
  if (websiteValues.includes(fieldName)) return true;

  // Check if it's an eBay item specifics field
  if (fieldName.startsWith('ebayitemspecifics')) {
    const suffix = fieldName.replace('ebayitemspecifics', '');
    const ebayValues = Object.values(EBAY_FIELD_MAPPING);
    if (ebayValues.includes(suffix)) return true;
  }

  return false;
}

/**
 * Gets all valid field names for logging/debugging
 * @returns {Object} - { websiteFields: [], ebayFields: [] }
 */
function getValidFieldNames() {
  return {
    websiteFields: [...new Set(Object.values(WEBSITE_STANDARD_FIELDS))],
    ebayFields: [...new Set(Object.values(EBAY_FIELD_MAPPING))].map(f => `ebayitemspecifics${f}`)
  };
}

module.exports = {
  WEBSITE_STANDARD_FIELDS,
  EBAY_FIELD_MAPPING,
  WEBSITE_TO_EBAY_MAPPING,
  mapSpecsToFields,
  isValidField,
  getValidFieldNames,
  normalizeSpecKey
};
