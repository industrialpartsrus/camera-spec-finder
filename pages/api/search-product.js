// pages/api/search-product.js
// Comprehensive product search with category-specific eBay field extraction
// Uses exact eBay Taxonomy API field names and allowed values

// ============================================================================
// EBAY CATEGORY FIELD DEFINITIONS WITH ALLOWED VALUES
// These are derived from eBay Taxonomy API for your product categories
// ============================================================================

const CATEGORY_FIELD_DEFINITIONS = {
  // ============================================================================
  // ELECTRIC MOTORS - eBay Category 181732
  // ============================================================================
  'Electric Motors': {
    ebayCategoryId: '181732',
    ebayCategoryName: 'Electric Motors',
    fields: {
      // Core identifiers
      brand: { required: true },
      mpn: { required: true },
      
      // Motor specifications with allowed values
      ratedloadhp: {
        label: 'Rated Load (HP)',
        allowedValues: ['1/4', '1/3', '1/2', '3/4', '1', '1 1/2', '2', '3', '5', '7 1/2', '10', '15', '20', '25', '30', '40', '50', '60', '75', '100', '125', '150', '200', '250', '300']
      },
      baserpm: {
        label: 'Base RPM',
        allowedValues: ['900', '1200', '1725', '1750', '1800', '3450', '3500', '3600']
      },
      acphase: {
        label: 'AC Phase',
        allowedValues: ['1-Phase', '3-Phase']
      },
      nominalratedinputvoltage: {
        label: 'Nominal Rated Input Voltage',
        allowedValues: ['12V', '24V', '115V', '115/208-230V', '115/230V', '200V', '208V', '208-230V', '208-230/460V', '230V', '230/460V', '460V', '575V']
      },
      acfrequencyrating: {
        label: 'AC Frequency Rating',
        allowedValues: ['50 Hz', '60 Hz', '50/60 Hz']
      },
      enclosuretype: {
        label: 'Enclosure Type',
        allowedValues: ['ODP', 'TEFC', 'TENV', 'TEAO', 'TEBC', 'TEPV', 'Explosion Proof', 'Washdown']
      },
      acmotortype: {
        label: 'AC Motor Type',
        allowedValues: ['AC Induction', 'Capacitor Start', 'Capacitor Start/Capacitor Run', 'Permanent Split Capacitor', 'Shaded Pole', 'Split Phase', 'Synchronous', 'Universal']
      },
      servicefactor: {
        label: 'Service Factor',
        allowedValues: ['1.0', '1.15', '1.25', '1.35', '1.4', '1.5']
      },
      iecframesize: {
        label: 'IEC Frame Size',
        allowedValues: ['42', '48', '56', '56C', '56H', '143T', '145T', '182T', '184T', '213T', '215T', '254T', '256T', '284T', '286T', '324T', '326T', '364T', '365T', '404T', '405T', '444T', '445T']
      },
      nemaframesuffix: {
        label: 'NEMA Frame Suffix',
        allowedValues: ['C', 'D', 'H', 'J', 'JM', 'JP', 'S', 'T', 'TC', 'U', 'Z']
      },
      nemadesignletter: {
        label: 'NEMA Design Letter',
        allowedValues: ['A', 'B', 'C', 'D']
      },
      insulationclass: {
        label: 'Insulation Class',
        allowedValues: ['A', 'B', 'F', 'H']
      },
      mountingtype: {
        label: 'Mounting Type',
        allowedValues: ['Foot Mounted', 'C-Face', 'D-Flange', 'Foot & C-Face', 'Foot & D-Flange', 'Vertical']
      },
      shaftdiameter: {
        label: 'Shaft Diameter',
        freeText: true
      },
      fullloadamps: {
        label: 'Full Load Amps',
        freeText: true
      },
      currenttype: {
        label: 'Current Type',
        allowedValues: ['AC', 'DC', 'AC/DC']
      },
      invertervectordutyrating: {
        label: 'Inverter/Vector Duty Rating',
        allowedValues: ['Inverter Duty', 'Vector Duty', 'Not Rated']
      },
      specialmotorconstruction: {
        label: 'Special Motor Construction',
        allowedValues: ['Brake Motor', 'Coolant Pump', 'Farm Duty', 'IEEE 841', 'Pump Motor', 'Severe Duty', 'Spa Motor', 'Washdown', 'None']
      },
      reversiblenonreversible: {
        label: 'Reversible/Non-Reversible',
        allowedValues: ['Reversible', 'Non-Reversible']
      },
      iprating: {
        label: 'IP Rating',
        allowedValues: ['IP44', 'IP54', 'IP55', 'IP56', 'IP65', 'IP66', 'IP67', 'IP68', 'IP69K']
      }
    }
  },

  // ============================================================================
  // PLCS - eBay Category 181331
  // ============================================================================
  'PLCs': {
    ebayCategoryId: '181331',
    ebayCategoryName: 'PLCs & HMIs',
    fields: {
      brand: { required: true },
      mpn: { required: true },
      communicationstandard: {
        label: 'Communication Standard',
        allowedValues: ['DeviceNet', 'EtherNet/IP', 'Ethernet', 'Modbus', 'Profibus', 'Profinet', 'RS-232', 'RS-485', 'Serial', 'USB']
      },
      nominalratedinputvoltage: {
        label: 'Nominal Rated Input Voltage',
        allowedValues: ['12V DC', '24V DC', '100-240V AC', '120V AC', '240V AC']
      },
      numberofiopoints: {
        label: 'Number of I/O Points',
        freeText: true
      },
      programmingmethod: {
        label: 'Programming Method',
        allowedValues: ['Ladder Logic', 'Function Block', 'Structured Text', 'Sequential Function Chart']
      }
    }
  },

  // ============================================================================
  // HMIS - eBay Category 181331
  // ============================================================================
  'HMIs': {
    ebayCategoryId: '181331',
    ebayCategoryName: 'PLCs & HMIs',
    fields: {
      brand: { required: true },
      mpn: { required: true },
      displayscreensize: {
        label: 'Display Screen Size',
        allowedValues: ['4"', '5.7"', '7"', '10"', '12"', '15"']
      },
      displaytype: {
        label: 'Display Type',
        allowedValues: ['Color TFT', 'Monochrome', 'Touchscreen', 'Touch + Keypad']
      },
      communicationstandard: {
        label: 'Communication Standard',
        allowedValues: ['Ethernet', 'EtherNet/IP', 'Modbus', 'Profinet', 'RS-232', 'RS-485', 'Serial', 'USB']
      },
      nominalratedinputvoltage: {
        label: 'Nominal Rated Input Voltage',
        allowedValues: ['12V DC', '24V DC', '100-240V AC']
      }
    }
  },

  // ============================================================================
  // SERVO MOTORS - eBay Category 181330
  // ============================================================================
  'Servo Motors': {
    ebayCategoryId: '181330',
    ebayCategoryName: 'Drives & Motion Control',
    fields: {
      brand: { required: true },
      mpn: { required: true },
      ratedtorque: {
        label: 'Rated Torque',
        freeText: true
      },
      ratedspeed: {
        label: 'Rated Speed',
        freeText: true
      },
      nominalratedinputvoltage: {
        label: 'Nominal Rated Input Voltage',
        allowedValues: ['100V', '200V', '230V', '400V']
      },
      encodertype: {
        label: 'Encoder Type',
        allowedValues: ['Absolute', 'Incremental', 'Resolver']
      },
      shaftdiameter: {
        label: 'Shaft Diameter',
        freeText: true
      },
      framesize: {
        label: 'Frame Size',
        freeText: true
      }
    }
  },

  // ============================================================================
  // SERVO DRIVES - eBay Category 181330
  // ============================================================================
  'Servo Drives': {
    ebayCategoryId: '181330',
    ebayCategoryName: 'Drives & Motion Control',
    fields: {
      brand: { required: true },
      mpn: { required: true },
      outputcurrent: {
        label: 'Output Current',
        freeText: true
      },
      nominalratedinputvoltage: {
        label: 'Nominal Rated Input Voltage',
        allowedValues: ['100-120V', '200-240V', '380-480V']
      },
      communicationstandard: {
        label: 'Communication Standard',
        allowedValues: ['Analog', 'CANopen', 'DeviceNet', 'EtherCAT', 'EtherNet/IP', 'Modbus', 'Profinet', 'Pulse/Direction']
      },
      feedbacktype: {
        label: 'Feedback Type',
        allowedValues: ['Encoder', 'Resolver', 'Hall Effect']
      }
    }
  },

  // ============================================================================
  // VFDS - eBay Category 181330
  // ============================================================================
  'VFDs': {
    ebayCategoryId: '181330',
    ebayCategoryName: 'Drives & Motion Control',
    fields: {
      brand: { required: true },
      mpn: { required: true },
      horsepowerrating: {
        label: 'Horsepower Rating',
        allowedValues: ['1/4', '1/2', '3/4', '1', '1.5', '2', '3', '5', '7.5', '10', '15', '20', '25', '30', '40', '50', '60', '75', '100']
      },
      nominalratedinputvoltage: {
        label: 'Nominal Rated Input Voltage',
        allowedValues: ['115V', '208V', '230V', '460V', '575V']
      },
      acphase: {
        label: 'AC Phase (Input)',
        allowedValues: ['1-Phase', '3-Phase']
      },
      outputphase: {
        label: 'Output Phase',
        allowedValues: ['3-Phase']
      },
      outputfrequencyrange: {
        label: 'Output Frequency Range',
        freeText: true
      },
      communicationstandard: {
        label: 'Communication Standard',
        allowedValues: ['BACnet', 'DeviceNet', 'EtherNet/IP', 'Modbus', 'Profibus', 'Profinet']
      },
      enclosuretype: {
        label: 'Enclosure Type',
        allowedValues: ['IP20', 'IP21', 'IP55', 'IP66', 'NEMA 1', 'NEMA 4X', 'NEMA 12']
      }
    }
  },

  // ============================================================================
  // PNEUMATIC CYLINDERS - eBay Category 181408
  // ============================================================================
  'Pneumatic Cylinders': {
    ebayCategoryId: '181408',
    ebayCategoryName: 'Pneumatic Cylinders',
    fields: {
      brand: { required: true },
      mpn: { required: true },
      boresize: {
        label: 'Bore Size',
        freeText: true
      },
      strokelength: {
        label: 'Stroke Length',
        freeText: true
      },
      cylindertype: {
        label: 'Cylinder Type',
        allowedValues: ['Double Acting', 'Single Acting', 'Compact', 'Guided', 'Rodless', 'Rotary']
      },
      mountingtype: {
        label: 'Mounting Type',
        allowedValues: ['Clevis', 'Foot', 'Flange', 'Nose', 'Pivot', 'Trunnion']
      },
      operatingpressure: {
        label: 'Operating Pressure',
        freeText: true
      },
      portsizethread: {
        label: 'Port Size/Thread',
        freeText: true
      },
      magneticpiston: {
        label: 'Magnetic Piston',
        allowedValues: ['Yes', 'No']
      }
    }
  },

  // ============================================================================
  // PNEUMATIC VALVES - eBay Category 181407
  // ============================================================================
  'Pneumatic Valves': {
    ebayCategoryId: '181407',
    ebayCategoryName: 'Pneumatic Valves',
    fields: {
      brand: { required: true },
      mpn: { required: true },
      valvetype: {
        label: 'Valve Type',
        allowedValues: ['2-Way', '3-Way', '4-Way', '5-Way', '5/2', '5/3']
      },
      actuationtype: {
        label: 'Actuation Type',
        allowedValues: ['Solenoid', 'Pilot', 'Manual', 'Mechanical', 'Pneumatic']
      },
      portsize: {
        label: 'Port Size',
        freeText: true
      },
      nominalratedinputvoltage: {
        label: 'Nominal Rated Input Voltage',
        allowedValues: ['12V DC', '24V DC', '110V AC', '120V AC', '220V AC', '240V AC']
      },
      flowrate: {
        label: 'Flow Rate',
        freeText: true
      }
    }
  },

  // ============================================================================
  // PROXIMITY SENSORS - eBay Category 181408
  // ============================================================================
  'Proximity Sensors': {
    ebayCategoryId: '181408',
    ebayCategoryName: 'Sensors',
    fields: {
      brand: { required: true },
      mpn: { required: true },
      sensortype: {
        label: 'Sensor Type',
        allowedValues: ['Inductive', 'Capacitive', 'Magnetic', 'Ultrasonic']
      },
      sensingdistance: {
        label: 'Sensing Distance',
        freeText: true
      },
      outputtype: {
        label: 'Output Type',
        allowedValues: ['PNP', 'NPN', 'PNP/NPN', 'Analog', 'Relay']
      },
      outputconfiguration: {
        label: 'Output Configuration',
        allowedValues: ['NO', 'NC', 'NO/NC']
      },
      nominalratedinputvoltage: {
        label: 'Nominal Rated Input Voltage',
        allowedValues: ['10-30V DC', '12-24V DC', '20-250V AC', '20-264V AC/DC']
      },
      housingmaterial: {
        label: 'Housing Material',
        allowedValues: ['Brass', 'Nickel Plated Brass', 'Plastic', 'Stainless Steel']
      },
      connectiontype: {
        label: 'Connection Type',
        allowedValues: ['Cable', 'Connector', 'M8', 'M12']
      },
      iprating: {
        label: 'IP Rating',
        allowedValues: ['IP65', 'IP67', 'IP68', 'IP69K']
      }
    }
  },

  // ============================================================================
  // PHOTOELECTRIC SENSORS - eBay Category 181408
  // ============================================================================
  'Photoelectric Sensors': {
    ebayCategoryId: '181408',
    ebayCategoryName: 'Sensors',
    fields: {
      brand: { required: true },
      mpn: { required: true },
      sensingmethod: {
        label: 'Sensing Method',
        allowedValues: ['Through Beam', 'Retro-Reflective', 'Diffuse', 'Background Suppression', 'Fiber Optic']
      },
      sensingdistance: {
        label: 'Sensing Distance',
        freeText: true
      },
      lightsource: {
        label: 'Light Source',
        allowedValues: ['Red LED', 'Infrared', 'Laser', 'White LED']
      },
      outputtype: {
        label: 'Output Type',
        allowedValues: ['PNP', 'NPN', 'PNP/NPN', 'Relay']
      },
      nominalratedinputvoltage: {
        label: 'Nominal Rated Input Voltage',
        allowedValues: ['10-30V DC', '12-24V DC', '20-250V AC']
      },
      connectiontype: {
        label: 'Connection Type',
        allowedValues: ['Cable', 'Connector', 'M8', 'M12']
      }
    }
  },

  // ============================================================================
  // POWER SUPPLIES - eBay Category 181332
  // ============================================================================
  'Power Supplies': {
    ebayCategoryId: '181332',
    ebayCategoryName: 'Power Supplies',
    fields: {
      brand: { required: true },
      mpn: { required: true },
      outputvoltage: {
        label: 'Output Voltage',
        allowedValues: ['5V DC', '12V DC', '24V DC', '48V DC']
      },
      outputcurrent: {
        label: 'Output Current',
        freeText: true
      },
      outputpower: {
        label: 'Output Power',
        freeText: true
      },
      inputvoltagerange: {
        label: 'Input Voltage Range',
        allowedValues: ['100-120V AC', '200-240V AC', '100-240V AC', '380-480V AC']
      },
      acphase: {
        label: 'AC Phase',
        allowedValues: ['1-Phase', '3-Phase']
      },
      mountingtype: {
        label: 'Mounting Type',
        allowedValues: ['DIN Rail', 'Panel Mount', 'Chassis']
      }
    }
  },

  // ============================================================================
  // CIRCUIT BREAKERS - eBay Category 181327
  // ============================================================================
  'Circuit Breakers': {
    ebayCategoryId: '181327',
    ebayCategoryName: 'Circuit Breakers',
    fields: {
      brand: { required: true },
      mpn: { required: true },
      numberofpoles: {
        label: 'Number of Poles',
        allowedValues: ['1', '2', '3', '4']
      },
      currentrating: {
        label: 'Current Rating',
        freeText: true
      },
      voltagerating: {
        label: 'Voltage Rating',
        freeText: true
      },
      interruptingrating: {
        label: 'Interrupting Rating',
        freeText: true
      },
      breakertype: {
        label: 'Breaker Type',
        allowedValues: ['Molded Case', 'Miniature', 'Motor Circuit Protector', 'GFCI']
      },
      tripcurve: {
        label: 'Trip Curve',
        allowedValues: ['B', 'C', 'D', 'K', 'Thermal-Magnetic', 'Electronic']
      }
    }
  },

  // ============================================================================
  // CONTACTORS - eBay Category 181329
  // ============================================================================
  'Contactors': {
    ebayCategoryId: '181329',
    ebayCategoryName: 'Contactors & Relays',
    fields: {
      brand: { required: true },
      mpn: { required: true },
      numberofpoles: {
        label: 'Number of Poles',
        allowedValues: ['1', '2', '3', '4']
      },
      coilvoltage: {
        label: 'Coil Voltage',
        allowedValues: ['24V AC', '24V DC', '110V AC', '120V AC', '208V AC', '220V AC', '240V AC', '277V AC', '480V AC']
      },
      fullloadamps: {
        label: 'Full Load Amps',
        freeText: true
      },
      auxiliarycontacts: {
        label: 'Auxiliary Contacts',
        freeText: true
      },
      nemasize: {
        label: 'NEMA Size',
        allowedValues: ['00', '0', '1', '2', '3', '4', '5']
      }
    }
  },

  // ============================================================================
  // TRANSFORMERS - eBay Category 181337
  // ============================================================================
  'Transformers': {
    ebayCategoryId: '181337',
    ebayCategoryName: 'Transformers',
    fields: {
      brand: { required: true },
      mpn: { required: true },
      kvarating: {
        label: 'KVA Rating',
        freeText: true
      },
      primaryvoltage: {
        label: 'Primary Voltage',
        freeText: true
      },
      secondaryvoltage: {
        label: 'Secondary Voltage',
        freeText: true
      },
      acphase: {
        label: 'AC Phase',
        allowedValues: ['1-Phase', '3-Phase']
      },
      transformertype: {
        label: 'Transformer Type',
        allowedValues: ['Control', 'Distribution', 'Isolation', 'Step Down', 'Step Up', 'Buck-Boost', 'Auto']
      },
      acfrequencyrating: {
        label: 'AC Frequency Rating',
        allowedValues: ['50 Hz', '60 Hz', '50/60 Hz']
      }
    }
  },

  // ============================================================================
  // BEARINGS - eBay Category 181750
  // ============================================================================
  'Bearings': {
    ebayCategoryId: '181750',
    ebayCategoryName: 'Ball & Roller Bearings',
    fields: {
      brand: { required: true },
      mpn: { required: true },
      bearingstype: {
        label: 'Bearings Type',
        allowedValues: ['Ball Bearing', 'Roller Bearing', 'Tapered Roller Bearing', 'Needle Bearing', 'Thrust Bearing', 'Pillow Block Bearing', 'Flange Bearing', 'Cam Follower', 'Angular Contact Ball Bearing', 'Deep Groove Ball Bearing', 'Cylindrical Roller Bearing', 'Spherical Roller Bearing']
      },
      borediameter: {
        label: 'Bore Diameter',
        freeText: true
      },
      outsidediameter: {
        label: 'Outside Diameter',
        freeText: true
      },
      width: {
        label: 'Width',
        freeText: true
      },
      material: {
        label: 'Material',
        allowedValues: ['Chrome Steel', 'Stainless Steel', 'Carbon Steel', 'Ceramic', 'Plastic', 'Bronze', 'Brass']
      },
      sealtype: {
        label: 'Seal Type',
        allowedValues: ['Open', 'Shielded (ZZ)', 'Sealed (2RS)', 'Single Seal', 'Double Seal', 'Contact Seal', 'Non-Contact Seal']
      }
    }
  }
};

// ============================================================================
// COUNTRY OF ORIGIN - eBay Standard Values
// ============================================================================
const COUNTRY_OF_ORIGIN_VALUES = [
  'United States', 'China', 'Japan', 'Germany', 'Mexico', 'Canada', 'Italy', 
  'France', 'United Kingdom', 'South Korea', 'Taiwan', 'India', 'Brazil', 
  'Spain', 'Switzerland', 'Sweden', 'Austria', 'Czech Republic', 'Poland',
  'Hungary', 'Slovakia', 'Slovenia', 'Netherlands', 'Belgium', 'Denmark',
  'Finland', 'Norway', 'Ireland', 'Portugal', 'Greece', 'Turkey', 'Israel',
  'Singapore', 'Malaysia', 'Thailand', 'Vietnam', 'Indonesia', 'Philippines',
  'Australia', 'New Zealand', 'South Africa', 'Unknown'
];

// ============================================================================
// GENERATE CATEGORY-SPECIFIC AI PROMPT
// ============================================================================
function generatePrompt(brand, partNumber, detectedCategory = null) {
  // Try to detect category from brand/part patterns if not provided
  let category = detectedCategory;
  
  if (!category) {
    const partLower = partNumber.toLowerCase();
    const brandLower = brand.toLowerCase();
    const combined = `${brandLower} ${partLower}`;
    
    // =========================================================================
    // POWER SUPPLY detection (check EARLY - common product type)
    // =========================================================================
    if (partLower.includes('psp') || partLower.includes('psu') || 
        partLower.includes('power supply') || partLower.includes('ps-') ||
        partLower.match(/\d+v\s*\d+a/i) || // voltage + amperage pattern
        combined.includes('power') || combined.includes('supply') ||
        brandLower.includes('mean well') || brandLower.includes('meanwell') ||
        brandLower.includes('lambda') || brandLower.includes('cosel') ||
        brandLower.includes('sola') || brandLower.includes('phoenix contact') ||
        (brandLower.includes('automation direct') && partLower.match(/^ps[prl]/i))) {
      category = 'Power Supplies';
    }
    // =========================================================================
    // SERVO MOTOR detection
    // =========================================================================
    else if (partLower.includes('servo') || partLower.includes('sgm') ||
             partLower.includes('hc-') || partLower.includes('ha-') ||
             brandLower.includes('yaskawa') || brandLower.includes('fanuc') ||
             brandLower.includes('mitsubishi') || brandLower.includes('omron')) {
      // Check if it's a drive or motor
      if (partLower.includes('drive') || partLower.includes('sgd') || 
          partLower.includes('mr-j') || partLower.includes('cacr')) {
        category = 'Servo Drives';
      } else {
        category = 'Servo Motors';
      }
    }
    // =========================================================================
    // VFD/AC DRIVE detection
    // =========================================================================
    else if (partLower.includes('vfd') || partLower.includes('inverter') ||
             partLower.includes('powerflex') || partLower.includes('micromaster') ||
             partLower.includes('altivar') || partLower.includes('af-') ||
             (combined.includes('drive') && !combined.includes('servo'))) {
      category = 'VFDs';
    }
    // =========================================================================
    // PLC detection
    // =========================================================================
    else if (partLower.includes('plc') || partLower.includes('1756') || 
             partLower.includes('1769') || partLower.includes('1746') ||
             partLower.includes('1766') || partLower.includes('1762') ||
             partLower.includes('6es7') || partLower.includes('6es5') ||
             partLower.includes('click') || partLower.includes('do-') ||
             (brandLower.includes('allen') && brandLower.includes('bradley')) ||
             brandLower.includes('siemens s7') || brandLower.includes('automation direct')) {
      category = 'PLCs';
    }
    // =========================================================================
    // HMI detection
    // =========================================================================
    else if (partLower.includes('hmi') || partLower.includes('panelview') ||
             partLower.includes('panel view') || partLower.includes('touchscreen') ||
             partLower.includes('2711') || partLower.includes('c-more') ||
             partLower.includes('proface') || partLower.includes('gp-')) {
      category = 'HMIs';
    }
    // =========================================================================
    // SENSOR detection
    // =========================================================================
    else if (partLower.includes('prox') || partLower.includes('sensor') ||
             partLower.includes('photoelectric') || partLower.includes('induct') ||
             brandLower.includes('turck') || brandLower.includes('sick') ||
             brandLower.includes('banner') || brandLower.includes('keyence') ||
             brandLower.includes('pepperl') || brandLower.includes('balluff')) {
      if (partLower.includes('photo') || partLower.includes('optical') || 
          partLower.includes('laser') || partLower.includes('light')) {
        category = 'Photoelectric Sensors';
      } else {
        category = 'Proximity Sensors';
      }
    }
    // =========================================================================
    // PNEUMATIC CYLINDER detection
    // =========================================================================
    else if (partLower.includes('cyl') || partLower.includes('ncd') ||
             partLower.includes('dsnu') || partLower.includes('dnc') ||
             partLower.includes('advu') || partLower.includes('ncm') ||
             brandLower.includes('smc') || brandLower.includes('festo') ||
             brandLower.includes('bimba') || brandLower.includes('numatics')) {
      category = 'Pneumatic Cylinders';
    }
    // =========================================================================
    // PNEUMATIC VALVE detection
    // =========================================================================
    else if (partLower.includes('valve') || partLower.includes('sy-') ||
             partLower.includes('vfs') || partLower.includes('mfh') ||
             combined.includes('solenoid')) {
      category = 'Pneumatic Valves';
    }
    // =========================================================================
    // CIRCUIT BREAKER detection
    // =========================================================================
    else if (partLower.includes('breaker') || partLower.includes('qb') ||
             partLower.includes('qo') || partLower.includes('hom') ||
             partLower.includes('bab') || partLower.includes('ba-') ||
             brandLower.includes('square d') || brandLower.includes('cutler') ||
             brandLower.includes('eaton')) {
      category = 'Circuit Breakers';
    }
    // =========================================================================
    // CONTACTOR/RELAY detection
    // =========================================================================
    else if (partLower.includes('contactor') || partLower.includes('relay') ||
             partLower.includes('100-c') || partLower.includes('dil') ||
             partLower.includes('lc1') || partLower.includes('3rt')) {
      category = 'Contactors';
    }
    // =========================================================================
    // TRANSFORMER detection
    // =========================================================================
    else if (partLower.includes('transformer') || partLower.includes('xfmr') ||
             partLower.includes('kva') || combined.includes('control transformer')) {
      category = 'Transformers';
    }
    // =========================================================================
    // BEARING detection
    // =========================================================================
    else if (partLower.includes('bearing') || partLower.includes('cam follower') ||
             partLower.includes('pillow block') || partLower.includes('flange bearing') ||
             combined.includes('bearing') ||
             brandLower.includes('skf') || brandLower.includes('timken') ||
             brandLower.includes('nsk') || brandLower.includes('fag') ||
             brandLower.includes('ntn') || brandLower.includes('ina') ||
             brandLower.includes('koyo') || brandLower.includes('nachi')) {
      category = 'Bearings';
    }
    // =========================================================================
    // ELECTRIC MOTOR detection (more specific patterns)
    // =========================================================================
    else if (partLower.match(/^[a-z]?\d{4}[a-z]?$/i) || // Baldor pattern: M3211T
             partLower.match(/^[a-z]{2,3}\d{3,4}/i) || // General motor pattern
             brandLower.includes('baldor') || brandLower.includes('marathon') ||
             brandLower.includes('weg') || brandLower.includes('leeson') ||
             brandLower.includes('teco') || brandLower.includes('lincoln') ||
             brandLower.includes('dayton') || brandLower.includes('us motors') ||
             combined.includes('motor') || combined.includes('hp ') ||
             combined.includes('rpm') || combined.includes('tefc') ||
             combined.includes('odp')) {
      category = 'Electric Motors';
    }
    // =========================================================================
    // DEFAULT - Ask AI to determine (use generic prompt)
    // =========================================================================
    else {
      category = null; // Will use generic prompt and let AI determine
    }
  }

  const categoryDef = CATEGORY_FIELD_DEFINITIONS[category];
  
  if (!categoryDef) {
    // Fallback to generic prompt
    return generateGenericPrompt(brand, partNumber);
  }

  // Build field instructions with allowed values
  let fieldInstructions = '';
  for (const [fieldName, fieldDef] of Object.entries(categoryDef.fields)) {
    if (fieldName === 'brand' || fieldName === 'mpn') continue;
    
    if (fieldDef.allowedValues) {
      fieldInstructions += `\n      "${fieldName}": "MUST be one of: ${fieldDef.allowedValues.join(', ')}",`;
    } else {
      fieldInstructions += `\n      "${fieldName}": "Extract from specs (${fieldDef.label})",`;
    }
  }

  return `Search for comprehensive technical information about: ${brand} ${partNumber}

This appears to be a ${category} product. Create a professional eBay product listing.

Return ONLY valid JSON (no markdown, no code blocks):
{
  "title": "80 characters max, include brand model and key specs",
  "productCategory": "${category}",
  "description": "HTML formatted description with specifications table",
  "shortDescription": "150-160 char meta description for SEO",
  "specifications": {${fieldInstructions}
    "countryoforigin": "MUST be one of: ${COUNTRY_OF_ORIGIN_VALUES.slice(0, 15).join(', ')}, etc."
  },
  "metaKeywords": ["keyword1", "keyword2", "keyword3", "keyword4", "keyword5"],
  "ebayCategory": {
    "id": "${categoryDef.ebayCategoryId}",
    "name": "${categoryDef.ebayCategoryName}"
  }
}

CRITICAL REQUIREMENTS FOR specifications OBJECT:
1. Field names MUST be lowercase with no spaces (e.g., "ratedloadhp" not "Rated Load HP")
2. For fields with allowed values, you MUST pick from the allowed values list
3. If you can't determine a value, use null (don't guess)
4. Extract ALL available specifications from the product data

DESCRIPTION FORMAT (must be valid HTML):
<p>Professional 2-3 sentence introduction explaining what this ${category} product is, its primary use cases, and key features.</p>

<h3 style='margin-top: 20px; margin-bottom: 10px; font-weight: bold; color: #333;'>Technical Specifications</h3>
<table border='1' cellpadding='8' cellspacing='0' style='border-collapse: collapse; width: 100%; max-width: 600px; margin: 20px 0; border: 1px solid #ccc;'>
<thead>
<tr style='background-color: #f5f5f5;'>
<th style='text-align: left; padding: 10px; border: 1px solid #ccc; font-weight: bold;'>Specification</th>
<th style='text-align: left; padding: 10px; border: 1px solid #ccc; font-weight: bold;'>Value</th>
</tr>
</thead>
<tbody>
<tr><td style='padding: 8px; border: 1px solid #ddd;'>Brand</td><td style='padding: 8px; border: 1px solid #ddd;'>${brand}</td></tr>
<tr><td style='padding: 8px; border: 1px solid #ddd;'>Model Number</td><td style='padding: 8px; border: 1px solid #ddd;'>${partNumber}</td></tr>
<!-- ADD ALL TECHNICAL SPECS AS TABLE ROWS -->
</tbody>
</table>

<p style='margin-top: 20px;'>We warranty all items for 30 days from date of purchase.</p>

REQUIREMENTS:
✅ Title MUST be 80 characters or less
✅ specifications object MUST use exact field names shown above
✅ For fields with allowed values, ONLY use values from the provided list
✅ Include ALL available technical specifications
✅ NO promotional language, NO warranty claims in table
✅ NO URLs, emails, or phone numbers`;
}

function generateGenericPrompt(brand, partNumber) {
  return `Search for comprehensive technical information about: ${brand} ${partNumber}

Return ONLY valid JSON (no markdown, no code blocks):
{
  "title": "80 characters max product title",
  "productCategory": "Product category name",
  "description": "HTML formatted description",
  "shortDescription": "150-160 char meta description",
  "specifications": {},
  "metaKeywords": ["keyword1", "keyword2", "keyword3"],
  "ebayCategory": {"id": "", "name": ""}
}`;
}

// ============================================================================
// API HANDLER
// ============================================================================
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { brand, partNumber, category } = req.body;

  if (!brand || !partNumber) {
    return res.status(400).json({ error: 'Brand and part number required' });
  }

  try {
    const prompt = generatePrompt(brand, partNumber, category);
    
    console.log('=== SEARCH PRODUCT API ===');
    console.log('Brand:', brand);
    console.log('Part:', partNumber);
    console.log('Detected/Provided Category:', category || 'auto-detect');

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 4500,
        messages: [{ role: 'user', content: prompt }],
        tools: [{ type: 'web_search_20250305', name: 'web_search' }]
      })
    });

    const data = await response.json();
    
    // Also return the category definitions for UI use
    res.status(200).json({
      ...data,
      _categoryDefinitions: CATEGORY_FIELD_DEFINITIONS,
      _countryOfOriginValues: COUNTRY_OF_ORIGIN_VALUES
    });
    
  } catch (error) {
    console.error('Search API error:', error);
    res.status(500).json({ error: error.message });
  }
}

// Export for use in other files
export { CATEGORY_FIELD_DEFINITIONS, COUNTRY_OF_ORIGIN_VALUES };
