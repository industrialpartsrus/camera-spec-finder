// pages/api/ebay-field-options.js
// Returns eBay field definitions and allowed values for UI dropdowns

// Country of Origin - eBay Standard Values
const COUNTRY_OF_ORIGIN_VALUES = [
  'United States',
  'China', 
  'Japan',
  'Germany',
  'Mexico',
  'Canada',
  'Italy',
  'France',
  'United Kingdom',
  'South Korea',
  'Taiwan',
  'India',
  'Brazil',
  'Spain',
  'Switzerland',
  'Sweden',
  'Austria',
  'Czech Republic',
  'Poland',
  'Hungary',
  'Slovakia',
  'Slovenia',
  'Netherlands',
  'Belgium',
  'Denmark',
  'Finland',
  'Norway',
  'Ireland',
  'Portugal',
  'Greece',
  'Turkey',
  'Israel',
  'Singapore',
  'Malaysia',
  'Thailand',
  'Vietnam',
  'Indonesia',
  'Philippines',
  'Australia',
  'New Zealand',
  'South Africa',
  'Unknown'
];

// Product Categories with eBay IDs
const PRODUCT_CATEGORIES = [
  { value: 'Electric Motors', label: 'Electric Motors', ebayCategoryId: '181732' },
  { value: 'Servo Motors', label: 'Servo Motors', ebayCategoryId: '181330' },
  { value: 'Servo Drives', label: 'Servo Drives', ebayCategoryId: '181330' },
  { value: 'VFDs', label: 'VFDs / Variable Frequency Drives', ebayCategoryId: '181330' },
  { value: 'PLCs', label: 'PLCs', ebayCategoryId: '181331' },
  { value: 'HMIs', label: 'HMIs / Operator Interfaces', ebayCategoryId: '181331' },
  { value: 'Power Supplies', label: 'Power Supplies', ebayCategoryId: '181332' },
  { value: 'I/O Modules', label: 'I/O Modules', ebayCategoryId: '181331' },
  { value: 'Proximity Sensors', label: 'Proximity Sensors', ebayCategoryId: '181408' },
  { value: 'Photoelectric Sensors', label: 'Photoelectric Sensors', ebayCategoryId: '181408' },
  { value: 'Light Curtains', label: 'Light Curtains', ebayCategoryId: '181408' },
  { value: 'Laser Sensors', label: 'Laser Sensors', ebayCategoryId: '181408' },
  { value: 'Pressure Sensors', label: 'Pressure Sensors', ebayCategoryId: '181408' },
  { value: 'Temperature Sensors', label: 'Temperature Sensors', ebayCategoryId: '181408' },
  { value: 'Ultrasonic Sensors', label: 'Ultrasonic Sensors', ebayCategoryId: '181408' },
  { value: 'Pneumatic Cylinders', label: 'Pneumatic Cylinders', ebayCategoryId: '181408' },
  { value: 'Pneumatic Valves', label: 'Pneumatic Valves', ebayCategoryId: '181407' },
  { value: 'Pneumatic Grippers', label: 'Pneumatic Grippers', ebayCategoryId: '181408' },
  { value: 'Hydraulic Pumps', label: 'Hydraulic Pumps', ebayCategoryId: '181406' },
  { value: 'Hydraulic Valves', label: 'Hydraulic Valves', ebayCategoryId: '181406' },
  { value: 'Hydraulic Cylinders', label: 'Hydraulic Cylinders', ebayCategoryId: '181406' },
  { value: 'Circuit Breakers', label: 'Circuit Breakers', ebayCategoryId: '181327' },
  { value: 'Contactors', label: 'Contactors', ebayCategoryId: '181329' },
  { value: 'Safety Relays', label: 'Safety Relays', ebayCategoryId: '181329' },
  { value: 'Control Relays', label: 'Control Relays', ebayCategoryId: '181329' },
  { value: 'Bearings', label: 'Bearings', ebayCategoryId: '181335' },
  { value: 'Linear Bearings', label: 'Linear Bearings', ebayCategoryId: '181335' },
  { value: 'Encoders', label: 'Encoders', ebayCategoryId: '181330' },
  { value: 'Gearboxes', label: 'Gearboxes / Reducers', ebayCategoryId: '181336' },
  { value: 'Transformers', label: 'Transformers', ebayCategoryId: '181337' },
  { value: 'Industrial Gateways', label: 'Industrial Gateways', ebayCategoryId: '181331' },
  { value: 'Network Modules', label: 'Network Modules', ebayCategoryId: '181331' }
];

// Condition Types - SureDone/eBay values
const CONDITION_TYPES = [
  { value: 'New', label: 'New', description: 'Brand new, unused, unopened' },
  { value: 'New Other', label: 'New Other (Open Box)', description: 'New but packaging opened or missing' },
  { value: 'Used', label: 'Used', description: 'Previously used, fully functional' },
  { value: 'Manufacturer Refurbished', label: 'Manufacturer Refurbished', description: 'Restored by manufacturer' },
  { value: 'For Parts or Not Working', label: 'For Parts or Not Working', description: 'Does not function as intended' }
];

// Condition Notes - Your standard descriptions
const CONDITION_NOTES = [
  { 
    value: 'new_in_box', 
    label: 'New in Box', 
    description: 'New in original manufacturer packaging. Unopened. 30-day warranty included.',
    conditionType: 'New'
  },
  { 
    value: 'new_open_box', 
    label: 'New - Open Box', 
    description: 'New item, factory sealed broken or removed. All original components included. 30-day warranty.',
    conditionType: 'New Other'
  },
  { 
    value: 'new_missing_hardware', 
    label: 'New - Missing Hardware', 
    description: 'New item, may be missing original packaging or minor hardware. Fully functional. 30-day warranty.',
    conditionType: 'New Other'
  },
  { 
    value: 'like_new', 
    label: 'Like New', 
    description: 'Gently used with minimal signs of wear. Tested and fully functional. 30-day warranty.',
    conditionType: 'Used'
  },
  { 
    value: 'good', 
    label: 'Good Condition', 
    description: 'Previously used, shows normal wear. Tested and fully functional. 30-day warranty.',
    conditionType: 'Used'
  },
  { 
    value: 'fair', 
    label: 'Fair Condition', 
    description: 'Used item with visible wear. Tested and functional. 30-day warranty.',
    conditionType: 'Used'
  },
  { 
    value: 'refurbished', 
    label: 'Refurbished', 
    description: 'Professionally refurbished and tested. 30-day warranty.',
    conditionType: 'Manufacturer Refurbished'
  },
  { 
    value: 'for_parts', 
    label: 'For Parts / Not Working', 
    description: 'Sold as-is for parts or repair. No warranty. Not tested or known to be non-functional.',
    conditionType: 'For Parts or Not Working'
  }
];

// Motor-specific allowed values (commonly needed)
const MOTOR_FIELD_OPTIONS = {
  acPhase: ['1-Phase', '3-Phase'],
  enclosureType: ['ODP', 'TEFC', 'TENV', 'TEAO', 'TEBC', 'TEPV', 'Explosion Proof', 'Washdown'],
  acMotorType: ['AC Induction', 'Capacitor Start', 'Capacitor Start/Capacitor Run', 'Permanent Split Capacitor', 'Shaded Pole', 'Split Phase', 'Synchronous', 'Universal'],
  serviceFactor: ['1.0', '1.15', '1.25', '1.35', '1.4', '1.5'],
  nemaDesignLetter: ['A', 'B', 'C', 'D'],
  insulationClass: ['A', 'B', 'F', 'H'],
  mountingType: ['Foot Mounted', 'C-Face', 'D-Flange', 'Foot & C-Face', 'Foot & D-Flange', 'Vertical'],
  currentType: ['AC', 'DC', 'AC/DC'],
  acFrequency: ['50 Hz', '60 Hz', '50/60 Hz'],
  reversible: ['Reversible', 'Non-Reversible'],
  ipRating: ['IP44', 'IP54', 'IP55', 'IP56', 'IP65', 'IP66', 'IP67', 'IP68', 'IP69K']
};

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Return all field options for UI use
  res.status(200).json({
    success: true,
    countryOfOrigin: COUNTRY_OF_ORIGIN_VALUES,
    productCategories: PRODUCT_CATEGORIES,
    conditionTypes: CONDITION_TYPES,
    conditionNotes: CONDITION_NOTES,
    motorFieldOptions: MOTOR_FIELD_OPTIONS
  });
}

export { 
  COUNTRY_OF_ORIGIN_VALUES, 
  PRODUCT_CATEGORIES, 
  CONDITION_TYPES, 
  CONDITION_NOTES,
  MOTOR_FIELD_OPTIONS 
};
