// Master Field Schema for Industrial Parts R Us
// This defines the ~60 core fields we store, with normalization rules
// and mappings to eBay item specifics per category

export const MASTER_FIELDS = {
  // ==================== ELECTRICAL ====================
  voltage: {
    normalize: (val) => {
      if (!val) return null;
      const v = val.toString().toUpperCase().replace(/\s+/g, '');
      // Extract number and determine AC/DC
      const match = v.match(/(\d+(?:\/\d+)*)/);
      if (!match) return val;
      const num = match[1];
      const isDC = v.includes('DC') || v.includes('VDC');
      const isAC = v.includes('AC') || v.includes('VAC') || !isDC;
      return `${num} ${isDC ? 'VDC' : 'VAC'}`;
    },
    validExamples: ['24 VDC', '120 VAC', '208/230/460 VAC', '480 VAC'],
    ebayFields: {
      'Electric Motors': 'ebayitemspecificsvoltage',
      'Servo Motors': 'ebayitemspecificsvoltage',
      'VFDs': 'ebayitemspecificsinputvoltage',
      'Contactors': 'ebayitemspecificscoilvoltagerating',
      'Circuit Breakers': 'ebayitemspecificsvoltageratingac',
      'Power Supplies': 'ebayitemspecificsinputvoltage'
    }
  },

  amperage: {
    normalize: (val) => {
      if (!val) return null;
      const match = val.toString().match(/(\d+\.?\d*)/);
      if (!match) return val;
      return `${parseFloat(match[1])} A`;
    },
    validExamples: ['5 A', '15 A', '30 A', '100 A'],
    ebayFields: {
      'Electric Motors': 'ebayitemspecificsfullloadamps',
      'VFDs': 'ebayitemspecificsoutputamperage',
      'Circuit Breakers': 'ebayitemspecificsactualcurrentrating',
      'Contactors': 'ebayitemspecificscontactcurrentrating'
    }
  },

  phase: {
    normalize: (val) => {
      if (!val) return null;
      const v = val.toString().toLowerCase();
      if (v.includes('3') || v.includes('three')) return '3-Phase';
      if (v.includes('1') || v.includes('single')) return 'Single-Phase';
      return val;
    },
    validValues: ['Single-Phase', '3-Phase'],
    ebayFields: {
      'Electric Motors': 'ebayitemspecificsacphase',
      'VFDs': 'ebayitemspecificscurrentphase',
      'Transformers': 'ebayitemspecificsacphase'
    }
  },

  frequency: {
    normalize: (val) => {
      if (!val) return null;
      const match = val.toString().match(/(\d+)/);
      if (!match) return val;
      return `${match[1]} Hz`;
    },
    validValues: ['50 Hz', '60 Hz', '50/60 Hz'],
    ebayFields: {
      'Electric Motors': 'ebayitemspecificsacfrequencyrating',
      'VFDs': 'ebayitemspecificsoutputhz',
      'Power Supplies': 'ebayitemspecificspowerfrequency'
    }
  },

  // ==================== MOTORS ====================
  horsepower: {
    normalize: (val) => {
      if (!val) return null;
      const v = val.toString().toUpperCase();
      // Handle fractions like 1/2, 1/4, 3/4
      if (v.includes('/')) {
        const fracMatch = v.match(/(\d+)\/(\d+)/);
        if (fracMatch) {
          const decimal = parseInt(fracMatch[1]) / parseInt(fracMatch[2]);
          return `${decimal} HP`;
        }
      }
      const match = v.match(/(\d+\.?\d*)/);
      if (!match) return val;
      return `${parseFloat(match[1])} HP`;
    },
    validExamples: ['0.25 HP', '0.5 HP', '0.75 HP', '1 HP', '1.5 HP', '2 HP', '3 HP', '5 HP', '7.5 HP', '10 HP', '15 HP', '20 HP', '25 HP', '30 HP', '40 HP', '50 HP', '60 HP', '75 HP', '100 HP'],
    ebayFields: {
      'Electric Motors': 'ebayitemspecificsratedhorsepower',
      'Servo Motors': 'ebayitemspecificsmotorhorsepower'
    }
  },

  rpm: {
    normalize: (val) => {
      if (!val) return null;
      const match = val.toString().match(/(\d+)/);
      if (!match) return val;
      return match[1]; // Just the number, no unit
    },
    validExamples: ['1200', '1750', '1800', '3450', '3600'],
    ebayFields: {
      'Electric Motors': 'ebayitemspecificsratedrpm',
      'Servo Motors': 'ebayitemspecificsmaximumrpm'
    }
  },

  frame_size: {
    normalize: (val) => {
      if (!val) return null;
      // Standardize frame sizes like 182T, 184T, 213T, 256T, etc.
      const v = val.toString().toUpperCase().replace(/\s+/g, '');
      const match = v.match(/(\d+T?[A-Z]*)/);
      return match ? match[1] : val;
    },
    validExamples: ['42', '48', '56', '56C', '143T', '145T', '182T', '184T', '213T', '215T', '254T', '256T', '284T', '286T', '324T', '326T', '364T', '365T', '404T', '405T', '444T', '445T'],
    ebayFields: {
      'Electric Motors': 'ebayitemspecificsnemaframesize'
    }
  },

  nema_frame_suffix: {
    normalize: (val) => {
      if (!val) return null;
      return val.toString().toUpperCase();
    },
    validValues: ['T', 'TC', 'TS', 'U', 'C', 'J', 'JM', 'JP', 'S', 'H', 'HP', 'LP', 'VP', 'Z'],
    ebayFields: {
      'Electric Motors': 'ebayitemspecificsnemaframesuffix'
    }
  },

  nema_design: {
    normalize: (val) => {
      if (!val) return null;
      const v = val.toString().toUpperCase();
      const match = v.match(/[ABCD]/);
      return match ? match[0] : val;
    },
    validValues: ['A', 'B', 'C', 'D'],
    ebayFields: {
      'Electric Motors': 'ebayitemspecificsnemadesignletter'
    }
  },

  service_factor: {
    normalize: (val) => {
      if (!val) return null;
      const match = val.toString().match(/(\d+\.?\d*)/);
      return match ? match[1] : val;
    },
    validValues: ['1.0', '1.15', '1.25', '1.35', '1.4'],
    ebayFields: {
      'Electric Motors': 'ebayitemspecificsservicefactor'
    }
  },

  enclosure: {
    normalize: (val) => {
      if (!val) return null;
      const v = val.toString().toUpperCase();
      // Map common variations
      const mappings = {
        'ODP': 'ODP', 'OPEN DRIP PROOF': 'ODP', 'OPEN': 'ODP',
        'TEFC': 'TEFC', 'TOTALLY ENCLOSED FAN COOLED': 'TEFC',
        'TENV': 'TENV', 'TOTALLY ENCLOSED NON-VENTILATED': 'TENV',
        'TEAO': 'TEAO', 'TOTALLY ENCLOSED AIR OVER': 'TEAO',
        'TEBC': 'TEBC', 'TOTALLY ENCLOSED BLOWER COOLED': 'TEBC',
        'TEWC': 'TEWC', 'TOTALLY ENCLOSED WATER COOLED': 'TEWC',
        'EXPLOSION PROOF': 'Explosion Proof', 'XP': 'Explosion Proof'
      };
      for (const [key, normalized] of Object.entries(mappings)) {
        if (v.includes(key)) return normalized;
      }
      return val;
    },
    validValues: ['ODP', 'TEFC', 'TENV', 'TEAO', 'TEBC', 'TEWC', 'Explosion Proof'],
    ebayFields: {
      'Electric Motors': 'ebayitemspecificsenclosuretype'
    }
  },

  insulation_class: {
    normalize: (val) => {
      if (!val) return null;
      const v = val.toString().toUpperCase();
      const match = v.match(/[ABFH]/);
      return match ? `Class ${match[0]}` : val;
    },
    validValues: ['Class A', 'Class B', 'Class F', 'Class H'],
    ebayFields: {
      'Electric Motors': 'ebayitemspecificsinsulationclass'
    }
  },

  motor_type: {
    normalize: (val) => val,
    validValues: ['Induction', 'Synchronous', 'DC', 'Universal', 'Stepper', 'Servo', 'BLDC'],
    ebayFields: {
      'Electric Motors': 'ebayitemspecificsacmotortype',
      'Servo Motors': 'ebayitemspecificsmotortype'
    }
  },

  // ==================== SENSORS ====================
  sensing_range: {
    normalize: (val) => {
      if (!val) return null;
      const v = val.toString().toLowerCase();
      // Try to extract number and unit
      const match = v.match(/(\d+\.?\d*)\s*(mm|m|cm|in|ft)?/i);
      if (match) {
        const num = match[1];
        const unit = (match[2] || 'mm').toLowerCase();
        return `${num} ${unit}`;
      }
      return val;
    },
    ebayFields: {
      'Proximity Sensors': 'ebayitemspecificssensingrange',
      'Photoelectric Sensors': 'ebayitemspecificssensingrange'
    }
  },

  output_type: {
    normalize: (val) => {
      if (!val) return null;
      const v = val.toString().toUpperCase();
      if (v.includes('NPN')) return 'NPN';
      if (v.includes('PNP')) return 'PNP';
      if (v.includes('ANALOG')) return 'Analog';
      if (v.includes('RELAY')) return 'Relay';
      return val;
    },
    validValues: ['NPN', 'PNP', 'NPN/PNP', 'Analog', 'Relay', 'Solid State'],
    ebayFields: {
      'Proximity Sensors': 'ebayitemspecificsoutputtype',
      'Photoelectric Sensors': 'ebayitemspecificsoutputtype'
    }
  },

  // ==================== LIGHT CURTAINS ====================
  guarded_area: {
    normalize: (val) => {
      if (!val) return null;
      const match = val.toString().match(/(\d+)/);
      if (!match) return val;
      return `${match[1]} mm`;
    },
    ebayFields: {
      'Light Curtains': 'ebayitemspecificsguardedarea'
    }
  },

  resolution: {
    normalize: (val) => {
      if (!val) return null;
      const match = val.toString().match(/(\d+)/);
      if (!match) return val;
      return `${match[1]} mm`;
    },
    ebayFields: {
      'Light Curtains': 'ebayitemspecificsresolution'
    }
  },

  // ==================== PNEUMATICS ====================
  bore_diameter: {
    normalize: (val) => {
      if (!val) return null;
      const match = val.toString().match(/(\d+\.?\d*)/);
      if (!match) return val;
      // Determine unit
      const hasInch = val.toLowerCase().includes('in') || val.includes('"');
      return `${match[1]} ${hasInch ? 'in' : 'mm'}`;
    },
    ebayFields: {
      'Pneumatic Cylinders': 'ebayitemspecificsboresize'
    }
  },

  stroke_length: {
    normalize: (val) => {
      if (!val) return null;
      const match = val.toString().match(/(\d+\.?\d*)/);
      if (!match) return val;
      const hasInch = val.toLowerCase().includes('in') || val.includes('"');
      return `${match[1]} ${hasInch ? 'in' : 'mm'}`;
    },
    ebayFields: {
      'Pneumatic Cylinders': 'ebayitemspecificsstrokelength'
    }
  },

  port_size: {
    normalize: (val) => {
      if (!val) return null;
      const v = val.toString().toUpperCase();
      // Standardize NPT sizes
      if (v.includes('NPT') || v.includes('/')) {
        const match = v.match(/(\d+\/\d+|\d+)/);
        if (match) return `${match[1]} NPT`;
      }
      return val;
    },
    validExamples: ['1/8 NPT', '1/4 NPT', '3/8 NPT', '1/2 NPT', '3/4 NPT', '1 NPT'],
    ebayFields: {
      'Pneumatic Cylinders': 'ebayitemspecificsportsize',
      'Pneumatic Valves': 'ebayitemspecificsportsize'
    }
  },

  max_pressure: {
    normalize: (val) => {
      if (!val) return null;
      const match = val.toString().match(/(\d+)/);
      if (!match) return val;
      return `${match[1]} PSI`;
    },
    ebayFields: {
      'Pneumatic Cylinders': 'ebayitemspecificsmaximumpressure',
      'Pneumatic Valves': 'ebayitemspecificsmaximumpressure'
    }
  },

  // ==================== HYDRAULICS ====================
  flow_rate: {
    normalize: (val) => {
      if (!val) return null;
      const match = val.toString().match(/(\d+\.?\d*)/);
      if (!match) return val;
      const hasGPM = val.toUpperCase().includes('GPM');
      const hasLPM = val.toUpperCase().includes('LPM') || val.toUpperCase().includes('L/MIN');
      return `${match[1]} ${hasLPM ? 'LPM' : 'GPM'}`;
    },
    ebayFields: {
      'Hydraulic Pumps': 'ebayitemspecificsmaximumflowrate',
      'Hydraulic Valves': 'ebayitemspecificsmaximumflowrate'
    }
  },

  // ==================== ELECTRICAL CONTROLS ====================
  coil_voltage: {
    normalize: (val) => {
      if (!val) return null;
      const v = val.toString().toUpperCase().replace(/\s+/g, '');
      const match = v.match(/(\d+)/);
      if (!match) return val;
      const isDC = v.includes('DC') || v.includes('VDC');
      return `${match[1]} ${isDC ? 'VDC' : 'VAC'}`;
    },
    validExamples: ['24 VDC', '24 VAC', '120 VAC', '240 VAC', '480 VAC'],
    ebayFields: {
      'Contactors': 'ebayitemspecificscoilvoltagerating',
      'Safety Relays': 'ebayitemspecificscoilvoltagerating',
      'Control Relays': 'ebayitemspecificscoilvoltagerating'
    }
  },

  contact_rating: {
    normalize: (val) => {
      if (!val) return null;
      const match = val.toString().match(/(\d+)/);
      if (!match) return val;
      return `${match[1]} A`;
    },
    ebayFields: {
      'Contactors': 'ebayitemspecificscontactcurrentrating',
      'Safety Relays': 'ebayitemspecificscontactcurrentrating'
    }
  },

  number_of_poles: {
    normalize: (val) => {
      if (!val) return null;
      const match = val.toString().match(/(\d+)/);
      return match ? match[1] : val;
    },
    validValues: ['1', '2', '3', '4'],
    ebayFields: {
      'Contactors': 'ebayitemspecificsnumberofpoles',
      'Circuit Breakers': 'ebayitemspecificsnumberofpoles'
    }
  },

  // ==================== CIRCUIT BREAKERS ====================
  interrupt_rating: {
    normalize: (val) => {
      if (!val) return null;
      const match = val.toString().match(/(\d+)/);
      if (!match) return val;
      const hasKA = val.toUpperCase().includes('KA') || val.toUpperCase().includes('KAIC');
      return `${match[1]}${hasKA ? ' kA' : ' A'}`;
    },
    ebayFields: {
      'Circuit Breakers': 'ebayitemspecificsinterruptingrating'
    }
  },

  breaker_type: {
    normalize: (val) => val,
    validValues: ['Thermal Magnetic', 'Magnetic Only', 'Electronic Trip', 'GFCI', 'AFCI', 'Molded Case', 'Miniature'],
    ebayFields: {
      'Circuit Breakers': 'ebayitemspecificscircuitbreakertype'
    }
  },

  // ==================== PLCs / AUTOMATION ====================
  io_count: {
    normalize: (val) => {
      if (!val) return null;
      const match = val.toString().match(/(\d+)/);
      return match ? match[1] : val;
    },
    ebayFields: {
      'PLCs': 'ebayitemspecificsnumberofiopoints'
    }
  },

  communication_protocol: {
    normalize: (val) => val,
    validValues: ['Ethernet/IP', 'EtherCAT', 'PROFINET', 'PROFIBUS', 'DeviceNet', 'Modbus TCP', 'Modbus RTU', 'RS-232', 'RS-485', 'CANopen'],
    ebayFields: {
      'PLCs': 'ebayitemspecificscommunicationstandard',
      'HMIs': 'ebayitemspecificscommunicationstandard',
      'VFDs': 'ebayitemspecificscommunicationstandard'
    }
  },

  // ==================== VFDs ====================
  input_voltage: {
    normalize: (val) => {
      if (!val) return null;
      const v = val.toString().toUpperCase().replace(/\s+/g, '');
      const match = v.match(/(\d+(?:\/\d+)*)/);
      if (!match) return val;
      return `${match[1]} VAC`;
    },
    ebayFields: {
      'VFDs': 'ebayitemspecificsinputvoltage'
    }
  },

  output_voltage: {
    normalize: (val) => {
      if (!val) return null;
      const v = val.toString().toUpperCase().replace(/\s+/g, '');
      const match = v.match(/(\d+(?:\/\d+)*)/);
      if (!match) return val;
      return `${match[1]} VAC`;
    },
    ebayFields: {
      'VFDs': 'ebayitemspecificsoutputvoltage'
    }
  },

  kw_rating: {
    normalize: (val) => {
      if (!val) return null;
      const match = val.toString().match(/(\d+\.?\d*)/);
      if (!match) return val;
      return `${match[1]} kW`;
    },
    ebayFields: {
      'VFDs': 'ebayitemspecificspowerratingkw'
    }
  },

  // ==================== BEARINGS ====================
  bearing_type: {
    normalize: (val) => val,
    validValues: ['Ball Bearing', 'Roller Bearing', 'Tapered Roller', 'Needle Bearing', 'Thrust Bearing', 'Pillow Block', 'Flange Bearing', 'Linear Bearing'],
    ebayFields: {
      'Bearings': 'ebayitemspecificsbearingtype'
    }
  },

  inner_diameter: {
    normalize: (val) => {
      if (!val) return null;
      const match = val.toString().match(/(\d+\.?\d*)/);
      if (!match) return val;
      const hasInch = val.toLowerCase().includes('in') || val.includes('"');
      return `${match[1]} ${hasInch ? 'in' : 'mm'}`;
    },
    ebayFields: {
      'Bearings': 'ebayitemspecificsborediameter'
    }
  },

  outer_diameter: {
    normalize: (val) => {
      if (!val) return null;
      const match = val.toString().match(/(\d+\.?\d*)/);
      if (!match) return val;
      const hasInch = val.toLowerCase().includes('in') || val.includes('"');
      return `${match[1]} ${hasInch ? 'in' : 'mm'}`;
    },
    ebayFields: {
      'Bearings': 'ebayitemspecificsoutsidediameter'
    }
  },

  // ==================== PHYSICAL / UNIVERSAL ====================
  weight: {
    normalize: (val) => {
      if (!val) return null;
      const match = val.toString().match(/(\d+\.?\d*)/);
      if (!match) return val;
      const hasKg = val.toLowerCase().includes('kg');
      return `${match[1]} ${hasKg ? 'kg' : 'lbs'}`;
    },
    ebayFields: {
      '*': 'ebayitemspecificsweight'
    }
  },

  ip_rating: {
    normalize: (val) => {
      if (!val) return null;
      const match = val.toString().toUpperCase().match(/IP\s*(\d{2})/);
      return match ? `IP${match[1]}` : val;
    },
    validExamples: ['IP20', 'IP54', 'IP65', 'IP66', 'IP67', 'IP68'],
    ebayFields: {
      '*': 'ebayitemspecificsiprating'
    }
  },

  mounting_type: {
    normalize: (val) => val,
    validValues: ['Foot Mount', 'Flange Mount', 'C-Face', 'D-Flange', 'Rigid Base', 'Resilient Base', 'DIN Rail', 'Panel Mount', 'Wall Mount'],
    ebayFields: {
      'Electric Motors': 'ebayitemspecificsmountingtype',
      'VFDs': 'ebayitemspecificsmountingtype',
      'PLCs': 'ebayitemspecificsmountingtype'
    }
  }
};

// ==================== CATEGORY CONFIGURATIONS ====================
// Maps product categories to eBay category IDs and required/recommended fields

export const CATEGORY_CONFIG = {
  'Electric Motors': {
    ebayCategoryId: '181732',
    ebayStoreCategoryId: '17167471',
    bigcommerceCategoryId: '30',
    requiredFields: ['brand', 'horsepower', 'voltage', 'phase', 'rpm'],
    recommendedFields: ['frame_size', 'nema_design', 'enclosure', 'service_factor', 'insulation_class', 'frequency', 'mounting_type'],
    optionalFields: ['motor_type', 'amperage', 'weight', 'ip_rating']
  },
  
  'Servo Motors': {
    ebayCategoryId: '124603',
    ebayStoreCategoryId: '393389015',
    bigcommerceCategoryId: '54',
    requiredFields: ['brand', 'voltage'],
    recommendedFields: ['rpm', 'amperage', 'communication_protocol', 'mounting_type'],
    optionalFields: ['weight', 'ip_rating']
  },
  
  'Servo Drives': {
    ebayCategoryId: '78191',
    ebayStoreCategoryId: '393390015',
    bigcommerceCategoryId: '32',
    requiredFields: ['brand', 'input_voltage'],
    recommendedFields: ['output_voltage', 'amperage', 'communication_protocol'],
    optionalFields: ['kw_rating', 'mounting_type']
  },
  
  'VFDs': {
    ebayCategoryId: '78192',
    ebayStoreCategoryId: '2242358015',
    bigcommerceCategoryId: '34',
    requiredFields: ['brand', 'input_voltage', 'horsepower'],
    recommendedFields: ['phase', 'output_voltage', 'amperage', 'communication_protocol'],
    optionalFields: ['frequency', 'enclosure', 'mounting_type']
  },
  
  'PLCs': {
    ebayCategoryId: '181708',
    ebayStoreCategoryId: '5404089015',
    bigcommerceCategoryId: '24',
    requiredFields: ['brand'],
    recommendedFields: ['voltage', 'io_count', 'communication_protocol'],
    optionalFields: ['mounting_type']
  },
  
  'HMIs': {
    ebayCategoryId: '181709',
    ebayStoreCategoryId: '6686264015',
    bigcommerceCategoryId: '27',
    requiredFields: ['brand'],
    recommendedFields: ['voltage', 'communication_protocol'],
    optionalFields: ['mounting_type']
  },
  
  'Proximity Sensors': {
    ebayCategoryId: '183089',
    ebayStoreCategoryId: '4173791015',
    bigcommerceCategoryId: '41',
    requiredFields: ['brand', 'voltage'],
    recommendedFields: ['sensing_range', 'output_type'],
    optionalFields: ['ip_rating', 'mounting_type']
  },
  
  'Photoelectric Sensors': {
    ebayCategoryId: '183089',
    ebayStoreCategoryId: '4173793015',
    bigcommerceCategoryId: '42',
    requiredFields: ['brand', 'voltage'],
    recommendedFields: ['sensing_range', 'output_type'],
    optionalFields: ['ip_rating']
  },
  
  'Light Curtains': {
    ebayCategoryId: '183088',
    ebayStoreCategoryId: '393379015',
    bigcommerceCategoryId: '71',
    requiredFields: ['brand'],
    recommendedFields: ['guarded_area', 'resolution', 'voltage'],
    optionalFields: ['ip_rating']
  },
  
  'Pneumatic Cylinders': {
    ebayCategoryId: '184027',
    ebayStoreCategoryId: '2461873015',
    bigcommerceCategoryId: '47',
    requiredFields: ['brand', 'bore_diameter', 'stroke_length'],
    recommendedFields: ['port_size', 'max_pressure', 'mounting_type'],
    optionalFields: []
  },

  'Pneumatic Valves': {
    ebayCategoryId: '260291',
    ebayStoreCategoryId: '2461874015',
    bigcommerceCategoryId: '68',
    requiredFields: ['brand'],
    recommendedFields: ['port_size', 'voltage', 'max_pressure'],
    optionalFields: []
  },
  
  'Hydraulic Pumps': {
    ebayCategoryId: '184101',
    ebayStoreCategoryId: '6696064015',
    bigcommerceCategoryId: '94',
    requiredFields: ['brand'],
    recommendedFields: ['flow_rate', 'max_pressure'],
    optionalFields: ['voltage', 'horsepower']
  },

  'Hydraulic Valves': {
    ebayCategoryId: '184113',
    ebayStoreCategoryId: '6696060015',
    bigcommerceCategoryId: '91',
    requiredFields: ['brand'],
    recommendedFields: ['flow_rate', 'max_pressure', 'port_size'],
    optionalFields: ['voltage']
  },
  
  'Circuit Breakers': {
    ebayCategoryId: '185134',
    ebayStoreCategoryId: '5634105015',
    bigcommerceCategoryId: '44',
    requiredFields: ['brand', 'amperage', 'voltage'],
    recommendedFields: ['number_of_poles', 'interrupt_rating', 'breaker_type'],
    optionalFields: []
  },
  
  'Contactors': {
    ebayCategoryId: '181680',
    ebayStoreCategoryId: '2348910015',
    bigcommerceCategoryId: '50',
    requiredFields: ['brand', 'coil_voltage'],
    recommendedFields: ['amperage', 'number_of_poles', 'voltage'],
    optionalFields: ['contact_rating']
  },
  
  'Safety Relays': {
    ebayCategoryId: '65464',
    ebayStoreCategoryId: '2464037015',
    bigcommerceCategoryId: '96',
    requiredFields: ['brand'],
    recommendedFields: ['voltage', 'coil_voltage'],
    optionalFields: ['contact_rating']
  },
  
  'Bearings': {
    ebayCategoryId: '181750',
    ebayStoreCategoryId: '6690505015',
    bigcommerceCategoryId: '43',
    requiredFields: ['brand'],
    recommendedFields: ['bearing_type', 'inner_diameter', 'outer_diameter', 'width', 'material'],
    optionalFields: ['seal_type']
  }
};

// ==================== HELPER FUNCTIONS ====================

/**
 * Normalize a value for a given field
 */
export function normalizeValue(fieldName, rawValue) {
  const field = MASTER_FIELDS[fieldName];
  if (!field || !field.normalize) return rawValue;
  return field.normalize(rawValue);
}

/**
 * Get the eBay item specific field name for a master field in a given category
 */
export function getEbayFieldName(masterFieldName, productCategory) {
  const field = MASTER_FIELDS[masterFieldName];
  if (!field || !field.ebayFields) return null;
  
  // Check for category-specific mapping
  if (field.ebayFields[productCategory]) {
    return field.ebayFields[productCategory];
  }
  
  // Check for wildcard mapping
  if (field.ebayFields['*']) {
    return field.ebayFields['*'];
  }
  
  return null;
}

/**
 * Map master fields to eBay item specifics for a given category
 */
export function mapToEbayFields(masterData, productCategory) {
  const ebayFields = {};
  
  for (const [fieldName, value] of Object.entries(masterData)) {
    if (!value) continue;
    
    const ebayFieldName = getEbayFieldName(fieldName, productCategory);
    if (ebayFieldName) {
      ebayFields[ebayFieldName] = value;
    }
  }
  
  return ebayFields;
}

/**
 * Get required fields for a category
 */
export function getRequiredFields(productCategory) {
  const config = CATEGORY_CONFIG[productCategory];
  return config ? config.requiredFields : [];
}

/**
 * Get all fields (required + recommended) for a category
 */
export function getCategoryFields(productCategory) {
  const config = CATEGORY_CONFIG[productCategory];
  if (!config) return [];
  return [...config.requiredFields, ...config.recommendedFields, ...config.optionalFields];
}
