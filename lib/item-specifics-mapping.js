// =============================================================================
// ITEM SPECIFICS MAPPING CONFIGURATION
// =============================================================================
// This file defines how AI-extracted specs map to:
// 1. eBay item specifics (ebayitemspecifics* fields in SureDone)
// 2. Website/BigCommerce standardized fields (core fields in SureDone)
// =============================================================================

// -----------------------------------------------------------------------------
// STANDARDIZED WEBSITE FIELDS (60-70 core fields for BigCommerce/Website)
// These are clean, consistent fields for product filtering on your website
// -----------------------------------------------------------------------------
export const WEBSITE_STANDARD_FIELDS = [
  // === IDENTIFICATION ===
  'brand',
  'manufacturer',
  'mpn',
  'model',
  'partnumber',
  'series',
  'revision',
  'version',
  
  // === ELECTRICAL - PRIMARY ===
  'voltage',
  'inputvoltage',
  'outputvoltage',
  'amperage',
  'inputamperage',
  'outputamperage',
  'phase',
  'hz',
  'watts',
  'kw',
  'kva',
  
  // === ELECTRICAL - SECONDARY ===
  'coilvoltage',
  'voltagerating',
  'currentrating',
  'fullloadamps',
  'frequency',
  
  // === MECHANICAL - MOTORS ===
  'horsepower',
  'rpm',
  'frame',
  'motortype',
  'torque',
  'enclosuretype',
  
  // === MECHANICAL - DIMENSIONS ===
  'length',
  'width',
  'height',
  'depth',
  'diameter',
  'shaftdiameter',
  'dimensions',
  
  // === MECHANICAL - OTHER ===
  'capacity',
  'flowrate',
  'gpm',
  'psi',
  'pressure',
  'maxpressure',
  'material',
  'construction',
  'mountingtype',
  
  // === CONTROL/AUTOMATION ===
  'controllerplatform',
  'processor',
  'communications',
  'interfacetype',
  'connectiontype',
  'sensortype',
  
  // === CONDITION/STATUS ===
  'condition',
  'application',
  'equipmenttype',
  'powersource',
  
  // === PHYSICAL ===
  'color',
  'size',
  'bodytype',
  'bodymaterial',
  
  // === OPERATIONAL ===
  'operatingdistance',
  'sensingrange',
  'ratio',
  'cycles',
  
  // === MISC ===
  'features',
  'countryoforigin'
];

// -----------------------------------------------------------------------------
// EBAY ITEM SPECIFICS MAPPING
// Maps common AI-extracted field names to their ebayitemspecifics* equivalents
// -----------------------------------------------------------------------------
export const EBAY_FIELD_MAPPING = {
  // === MOTORS ===
  'horsepower': 'ebayitemspecificsratedhorsepower',
  'hp': 'ebayitemspecificsratedhorsepower',
  'rated hp': 'ebayitemspecificsratedhorsepower',
  'rated load hp': 'ebayitemspecificsratedloadhp',
  'motor horsepower': 'ebayitemspecificsmotorhorsepower',
  'rpm': 'ebayitemspecificsratedrpm',
  'rated rpm': 'ebayitemspecificsratedrpm',
  'base rpm': 'ebayitemspecificsbaserpm',
  'no load rpm': 'ebayitemspecificsnoloadrpm',
  'max rpm': 'ebayitemspecificsmaximumrpm',
  'motor type': 'ebayitemspecificsacmotortype',
  'ac motor type': 'ebayitemspecificsacmotortype',
  'frame': 'ebayitemspecificsnemaframesize',
  'nema frame': 'ebayitemspecificsnemaframesize',
  'frame size': 'ebayitemspecificsnemaframesize',
  'iec frame size': 'ebayitemspecificsiecframesize',
  'service factor': 'ebayitemspecificsservicefactor',
  'insulation class': 'ebayitemspecificsinsulationclass',
  'nema design': 'ebayitemspecificsnemadesignletter',
  'nema design letter': 'ebayitemspecificsnemadesignletter',
  'shaft angle': 'ebayitemspecificsshaftangle',
  
  // === VOLTAGE/ELECTRICAL ===
  'voltage': 'ebayitemspecificsratedvoltage',
  'rated voltage': 'ebayitemspecificsratedvoltage',
  'input voltage': 'ebayitemspecificsnominalinputvoltagerating',
  'nominal input voltage': 'ebayitemspecificsnominalinputvoltagerating',
  'output voltage': 'ebayitemspecificsouputvoltage',
  'ac voltage': 'ebayitemspecificsacvoltagerating',
  'dc voltage': 'ebayitemspecificsdcvoltagerating',
  'coil voltage': 'ebayitemspecificscoilvoltagerating',
  'control voltage': 'ebayitemspecificscontrolvoltage',
  'supply voltage': 'ebayitemspecificssupplyvoltage',
  'operating voltage': 'ebayitemspecificsoperatingvoltage',
  'voltage range': 'ebayitemspecificsvoltagerange',
  'voltage rating ac': 'ebayitemspecificsvoltageratingac',
  'voltage rating dc': 'ebayitemspecificsvoltageratingdc',
  'voltage compatibility': 'ebayitemspecificsvoltagecompatibility',
  
  // === CURRENT/AMPERAGE ===
  'amperage': 'ebayitemspecificsamps',
  'amps': 'ebayitemspecificsamps',
  'current': 'ebayitemspecificsactualcurrentrating',
  'current rating': 'ebayitemspecificsactualcurrentrating',
  'full load amps': 'ebayitemspecificsfullloadamps',
  'max input current': 'ebayitemspecificsmaxinputcurrent',
  'max current output': 'ebayitemspecificsmaximumcurrentoutput',
  'stall current': 'ebayitemspecificsstallcurrent',
  'no load current': 'ebayitemspecificsnoloadcurrent',
  
  // === PHASE/FREQUENCY ===
  'phase': 'ebayitemspecificsacphase',
  'ac phase': 'ebayitemspecificsacphase',
  'current phase': 'ebayitemspecificscurrentphase',
  'power phase': 'ebayitemspecificspowerphase',
  'number of phases': 'ebayitemspecificsnumberofphases',
  'frequency': 'ebayitemspecificsacfrequencyrating',
  'ac frequency': 'ebayitemspecificsacfrequencyrating',
  'hz': 'ebayitemspecificsacfrequencyrating',
  'power frequency': 'ebayitemspecificspowerfrequency',
  
  // === POWER ===
  'watts': 'ebayitemspecificswattage',
  'wattage': 'ebayitemspecificswattage',
  'power': 'ebayitemspecificspower',
  'power rating': 'ebayitemspecificspowerratingw',
  'max wattage': 'ebayitemspecificsmaximumwattage',
  'rated power': 'ebayitemspecificsratedpower',
  'output power': 'ebayitemspecificsmaxoutputpower',
  'kva': 'ebayitemspecificskva',
  
  // === TORQUE ===
  'torque': 'ebayitemspecificscontinuoustorque',
  'continuous torque': 'ebayitemspecificscontinuoustorque',
  'holding torque': 'ebayitemspecificsholdingtorque',
  'stall torque': 'ebayitemspecificsstalltorque',
  'rated torque': 'ebayitemspecificsratedfullloadtorque',
  
  // === PRESSURE/FLOW ===
  'pressure': 'ebayitemspecificsratedpressure',
  'rated pressure': 'ebayitemspecificsratedpressure',
  'max pressure': 'ebayitemspecificsmaximumpressure',
  'operating pressure': 'ebayitemspecificsoperatingpressure',
  'psi': 'ebayitemspecificsmaxpsi',
  'max psi': 'ebayitemspecificsmaxpsi',
  'flow rate': 'ebayitemspecificsmaximumflowrate',
  'max flow rate': 'ebayitemspecificsmaximumflowrate',
  'min flow rate': 'ebayitemspecificsminimumflowrate',
  'gpm': 'ebayitemspecificsgpm',
  'cfm': 'ebayitemspecificsairflowvolumecfm',
  'airflow': 'ebayitemspecificsairflowvolume',
  
  // === DIMENSIONS ===
  'length': 'ebayitemspecificsactuallengthfeet',
  'width': 'ebayitemspecificsitemwidth',
  'height': 'ebayitemspecificsitemheight',
  'depth': 'ebayitemspecificsitemdepth',
  'thickness': 'ebayitemspecificsitemthickness',
  'diameter': 'ebayitemspecificsbladediameter',
  'bore diameter': 'ebayitemspecificsboresize',
  'bore size': 'ebayitemspecificsboresize',
  'shaft diameter': 'ebayitemspecificsshaftdiameter',
  'inlet diameter': 'ebayitemspecificsinletdiameter',
  'outlet diameter': 'ebayitemspecificsoutletdiameter',
  'port diameter': 'ebayitemspecificsportdiameter',
  'connection diameter': 'ebayitemspecificsconnectiondiameter',
  
  // === MOUNTING/CONSTRUCTION ===
  'mounting type': 'ebayitemspecificsmountingtype',
  'mounting': 'ebayitemspecificsmounting',
  'mounting style': 'ebayitemspecificsmountingstyle',
  'mounting position': 'ebayitemspecificsmountingposition',
  'enclosure type': 'ebayitemspecificsenclosuretype',
  'ip rating': 'ebayitemspecificsiprating',
  'material': 'ebayitemspecificshousingmaterial',
  'housing material': 'ebayitemspecificshousingmaterial',
  'body material': 'ebayitemspecificsbodymaterial',
  'construction': 'ebayitemspecificsconstruction',
  
  // === CONTROL/COMMUNICATION ===
  'communication': 'ebayitemspecificscommunicationstandard',
  'communication standard': 'ebayitemspecificscommunicationstandard',
  'interface': 'ebayitemspecificsinterfacecardtype',
  'control type': 'ebayitemspecificscontroltype',
  'control style': 'ebayitemspecificscontrolstyle',
  
  // === CYLINDERS/PNEUMATICS ===
  'cylinder type': 'ebayitemspecificscylindertype',
  'cylinder action': 'ebayitemspecificscylinderaction',
  'stroke length': 'ebayitemspecificsstrokelength',
  'number of rods': 'ebayitemspecificsnumberofrods',
  'bore': 'ebayitemspecificsboresize',
  
  // === VALVES ===
  'valve type': 'ebayitemspecificssolenoidvalvetype',
  'valve operation': 'ebayitemspecificsvalveoperation',
  'number of ways': 'ebayitemspecificsnumberofways',
  'number of positions': 'ebayitemspecificsnumberofpositions',
  
  // === PUMPS ===
  'pump type': 'ebayitemspecificspumptype',
  'pump action': 'ebayitemspecificspumpaction',
  'pump housing material': 'ebayitemspecificspumphousingmaterial',
  'centrifugal pump type': 'ebayitemspecificscentrifugalpumptype',
  'hydraulic pump type': 'ebayitemspecificshydraulicpumptype',
  
  // === SENSORS ===
  'sensor type': 'ebayitemspecificssensortype',
  'sensing type': 'ebayitemspecificssensingtype',
  'sensing range': 'ebayitemspecificssensingrange',
  'sensing radius': 'ebayitemspecificsnominalsensingradius',
  'operating distance': 'ebayitemspecificsoperatingdistance',
  'response time': 'ebayitemspecificsresponsetime',
  
  // === ROBOTS/AUTOMATION ===
  'number of axes': 'ebayitemspecificsnumberofaxes',
  'payload': 'ebayitemspecificspayload',
  'reach': 'ebayitemspecificsmaximumreachheight',
  
  // === DRIVES/VFDs ===
  'input voltage range': 'ebayitemspecificsinputvoltagerange',
  'output voltage range': 'ebayitemspecificsoutputvoltagerange',
  'switching frequency': 'ebayitemspecificsswitchingfrequency',
  
  // === GENERAL ===
  'brand': 'ebayitemspecificsbrand',
  'mpn': 'ebayitemspecificsmpn',
  'model': 'ebayitemspecificsmodel',
  'type': 'ebayitemspecificstype',
  'product type': 'ebayitemspecificsproducttype',
  'features': 'ebayitemspecificsfeatures',
  'application': 'ebayitemspecificsapplication',
  'suitable for': 'ebayitemspecificssuitablefor',
  'compatible equipment': 'ebayitemspecificscompatibleequipmenttype',
  'country of origin': 'ebayitemspecificscountryoforigin',
  'country of manufacture': 'ebayitemspecificscountryregionofmanufacture',
  'color': 'ebayitemspecificscolor',
  'shape': 'ebayitemspecificsshape',
  'orientation': 'ebayitemspecificsorientation',
  'number of poles': 'ebayitemspecificsnumberofpoles',
  'number of pins': 'ebayitemspecificsnumberofpins',
  'modified item': 'ebayitemspecificsmodifieditem',
  'bundle listing': 'ebayitemspecificsbundlelisting'
};

// -----------------------------------------------------------------------------
// REVERSE MAPPING: eBay field -> Common name (for display purposes)
// -----------------------------------------------------------------------------
export const EBAY_TO_DISPLAY_NAME = {
  'ebayitemspecificsratedhorsepower': 'Rated Horsepower',
  'ebayitemspecificsratedloadhp': 'Rated Load (HP)',
  'ebayitemspecificsmotorhorsepower': 'Motor Horsepower',
  'ebayitemspecificsratedrpm': 'Rated RPM',
  'ebayitemspecificsratedvoltage': 'Rated Voltage',
  'ebayitemspecificsacphase': 'AC Phase',
  'ebayitemspecificsacfrequencyrating': 'AC Frequency Rating',
  // ... add more as needed
};

// -----------------------------------------------------------------------------
// WEBSITE FIELD -> eBay FIELD CROSS-REFERENCE
// When AI populates a website field, also populate the corresponding eBay field
// -----------------------------------------------------------------------------
export const WEBSITE_TO_EBAY_MAPPING = {
  'horsepower': ['ebayitemspecificsratedhorsepower', 'ebayitemspecificsmotorhorsepower'],
  'voltage': ['ebayitemspecificsratedvoltage'],
  'inputvoltage': ['ebayitemspecificsnominalinputvoltagerating'],
  'outputvoltage': ['ebayitemspecificsouputvoltage'],
  'amperage': ['ebayitemspecificsamps', 'ebayitemspecificsactualcurrentrating'],
  'phase': ['ebayitemspecificsacphase', 'ebayitemspecificscurrentphase'],
  'hz': ['ebayitemspecificsacfrequencyrating'],
  'frequency': ['ebayitemspecificsacfrequencyrating', 'ebayitemspecificspowerfrequency'],
  'rpm': ['ebayitemspecificsratedrpm'],
  'frame': ['ebayitemspecificsnemaframesize'],
  'motortype': ['ebayitemspecificsacmotortype'],
  'torque': ['ebayitemspecificscontinuoustorque'],
  'enclosuretype': ['ebayitemspecificsenclosuretype'],
  'mountingtype': ['ebayitemspecificsmountingtype'],
  'psi': ['ebayitemspecificsmaxpsi', 'ebayitemspecificsratedpressure'],
  'pressure': ['ebayitemspecificsratedpressure', 'ebayitemspecificsmaximumpressure'],
  'flowrate': ['ebayitemspecificsmaximumflowrate'],
  'gpm': ['ebayitemspecificsgpm'],
  'material': ['ebayitemspecificshousingmaterial'],
  'communications': ['ebayitemspecificscommunicationstandard'],
  'sensortype': ['ebayitemspecificssensortype'],
  'sensingrange': ['ebayitemspecificssensingrange'],
  'operatingdistance': ['ebayitemspecificsoperatingdistance']
};

// -----------------------------------------------------------------------------
// FUNCTION: Map AI-extracted specs to both website and eBay fields
// -----------------------------------------------------------------------------
export function mapSpecsToFields(aiExtractedSpecs) {
  const result = {
    websiteFields: {},
    ebayFields: {}
  };
  
  for (const [key, value] of Object.entries(aiExtractedSpecs)) {
    if (!value || value === '' || value === 'N/A' || value === 'Unknown') continue;
    
    const normalizedKey = key.toLowerCase().trim();
    
    // Check if this is a standard website field
    if (WEBSITE_STANDARD_FIELDS.includes(normalizedKey)) {
      result.websiteFields[normalizedKey] = value;
      
      // Also map to eBay if there's a cross-reference
      if (WEBSITE_TO_EBAY_MAPPING[normalizedKey]) {
        for (const ebayField of WEBSITE_TO_EBAY_MAPPING[normalizedKey]) {
          result.ebayFields[ebayField] = value;
        }
      }
    }
    
    // Check direct eBay mapping
    if (EBAY_FIELD_MAPPING[normalizedKey]) {
      result.ebayFields[EBAY_FIELD_MAPPING[normalizedKey]] = value;
    }
  }
  
  return result;
}

// -----------------------------------------------------------------------------
// FUNCTION: Get all valid eBay item specifics field names
// -----------------------------------------------------------------------------
export function getValidEbayFields() {
  return new Set(Object.values(EBAY_FIELD_MAPPING));
}

// -----------------------------------------------------------------------------
// FUNCTION: Validate that a field name is a valid eBay item specific
// -----------------------------------------------------------------------------
export function isValidEbayField(fieldName) {
  return fieldName.startsWith('ebayitemspecifics') && 
         Object.values(EBAY_FIELD_MAPPING).includes(fieldName);
}

export default {
  WEBSITE_STANDARD_FIELDS,
  EBAY_FIELD_MAPPING,
  EBAY_TO_DISPLAY_NAME,
  WEBSITE_TO_EBAY_MAPPING,
  mapSpecsToFields,
  getValidEbayFields,
  isValidEbayField
};
