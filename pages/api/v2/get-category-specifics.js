// pages/api/v2/get-category-specifics.js
// PASS 2A: AI selects eBay category, then we fetch EXACT item specifics from eBay
// Returns the real field names that eBay expects

import Anthropic from '@anthropic-ai/sdk';

// ============================================================================
// PRODUCT TYPE TO EBAY CATEGORY MAPPING
// These are eBay's official category IDs
// ============================================================================

const EBAY_CATEGORIES = {
  // Motors
  'Servo Motor': { id: '124603', name: 'Servo Motors' },
  'AC Servo Motor': { id: '124603', name: 'Servo Motors' },
  'DC Servo Motor': { id: '124603', name: 'Servo Motors' },
  'Stepper Motor': { id: '9723', name: 'Stepper Motors' },
  'Electric Motor': { id: '181732', name: 'General Purpose Motors' },
  'AC Motor': { id: '181732', name: 'General Purpose Motors' },
  'DC Motor': { id: '181731', name: 'Definite Purpose Motors' },
  'Gearmotor': { id: '65452', name: 'Gearmotors' },
  
  // Drives
  'Servo Drive': { id: '78191', name: 'Servo Drives & Amplifiers' },
  'Servo Amplifier': { id: '78191', name: 'Servo Drives & Amplifiers' },
  'VFD': { id: '78192', name: 'Variable Frequency Drives' },
  'Variable Frequency Drive': { id: '78192', name: 'Variable Frequency Drives' },
  'AC Drive': { id: '78192', name: 'Variable Frequency Drives' },
  'DC Drive': { id: '78190', name: 'General Purpose DC Drives' },
  'Stepper Drive': { id: '71394', name: 'Stepper Controls & Drives' },
  
  // PLCs & Automation
  'PLC': { id: '181708', name: 'PLC Processors' },
  'PLC Processor': { id: '181708', name: 'PLC Processors' },
  'PLC CPU': { id: '181708', name: 'PLC Processors' },
  'PLC Chassis': { id: '181711', name: 'PLC Chassis' },
  'PLC Power Supply': { id: '181720', name: 'PLC Power Supplies' },
  'PLC I/O Module': { id: '181714', name: 'PLC Input & Output Modules' },
  'I/O Module': { id: '181714', name: 'PLC Input & Output Modules' },
  'Communication Module': { id: '181714', name: 'PLC Input & Output Modules' },
  'HMI': { id: '181709', name: 'HMI & Open Interface Panels' },
  'Touch Panel': { id: '181709', name: 'HMI & Open Interface Panels' },
  'Operator Interface': { id: '181709', name: 'HMI & Open Interface Panels' },
  
  // Power Supplies
  'Power Supply': { id: '42017', name: 'Power Supplies' },
  'Industrial Power Supply': { id: '42017', name: 'Power Supplies' },
  
  // Sensors - Proximity
  'Proximity Sensor': { id: '65459', name: 'Proximity Sensors' },
  'Inductive Proximity Sensor': { id: '65459', name: 'Proximity Sensors' },
  'Capacitive Proximity Sensor': { id: '65459', name: 'Proximity Sensors' },
  'Inductive Sensor': { id: '65459', name: 'Proximity Sensors' },
  
  // Sensors - Photoelectric
  'Photoelectric Sensor': { id: '181786', name: 'Fiber Optic Sensors' },
  'Photo Sensor': { id: '181786', name: 'Fiber Optic Sensors' },
  'Fiber Optic Sensor': { id: '181786', name: 'Fiber Optic Sensors' },
  'Through Beam Sensor': { id: '181786', name: 'Fiber Optic Sensors' },
  
  // Sensors - Other
  'Pressure Sensor': { id: '65456', name: 'Pressure Sensors' },
  'Pressure Transducer': { id: '65456', name: 'Pressure Sensors' },
  'Temperature Sensor': { id: '65460', name: 'Temperature & Humidity Sensors' },
  'Thermocouple': { id: '65460', name: 'Temperature & Humidity Sensors' },
  'Flow Sensor': { id: '65457', name: 'Flow Sensors' },
  'Level Sensor': { id: '181785', name: 'Level Sensors' },
  'Laser Sensor': { id: '181744', name: 'Sensors' },
  'Color Sensor': { id: '181744', name: 'Sensors' },
  'Vision Sensor': { id: '181744', name: 'Sensors' },
  'Current Sensor': { id: '181744', name: 'Sensors' },
  'Load Cell': { id: '181744', name: 'Sensors' },
  
  // Safety
  'Light Curtain': { id: '65465', name: 'Light Curtains' },
  'Safety Light Curtain': { id: '65465', name: 'Light Curtains' },
  'Safety Scanner': { id: '65465', name: 'Light Curtains' },
  'Safety Relay': { id: '65464', name: 'Safety Relays' },
  'Safety Controller': { id: '65464', name: 'Safety Relays' },
  
  // Encoders
  'Encoder': { id: '65455', name: 'Rotary Encoders' },
  'Rotary Encoder': { id: '65455', name: 'Rotary Encoders' },
  'Incremental Encoder': { id: '65455', name: 'Rotary Encoders' },
  'Absolute Encoder': { id: '65455', name: 'Rotary Encoders' },
  'Linear Encoder': { id: '65455', name: 'Rotary Encoders' },
  
  // Barcode & RFID
  'Barcode Scanner': { id: '46706', name: 'Barcode Scanners' },
  'Barcode Reader': { id: '46706', name: 'Barcode Scanners' },
  'RFID Reader': { id: '181744', name: 'Sensors' },
  
  // Switches
  'Limit Switch': { id: '181676', name: 'Industrial Limit Switches' },
  'Micro Switch': { id: '181676', name: 'Industrial Limit Switches' },
  'Push Button': { id: '181677', name: 'Pushbutton Switches' },
  'Selector Switch': { id: '181677', name: 'Pushbutton Switches' },
  'E-Stop': { id: '181677', name: 'Pushbutton Switches' },
  
  // Pneumatics
  'Pneumatic Cylinder': { id: '184027', name: 'Hydraulic & Pneumatic Cylinders' },
  'Air Cylinder': { id: '184027', name: 'Hydraulic & Pneumatic Cylinders' },
  'Pneumatic Valve': { id: '260291', name: 'Solenoid Valves & Coils' },
  'Solenoid Valve': { id: '260291', name: 'Solenoid Valves & Coils' },
  'Pneumatic Gripper': { id: '184027', name: 'Hydraulic & Pneumatic Cylinders' },
  'Pneumatic Actuator': { id: '184027', name: 'Hydraulic & Pneumatic Cylinders' },
  'Air Regulator': { id: '183988', name: 'Air Pressure Regulators' },
  'FRL': { id: '183988', name: 'Air Pressure Regulators' },
  
  // Hydraulics
  'Hydraulic Cylinder': { id: '184027', name: 'Hydraulic & Pneumatic Cylinders' },
  'Hydraulic Valve': { id: '184113', name: 'Hydraulic Directional Control Valves' },
  'Hydraulic Pump': { id: '184101', name: 'Hydraulic Pumps' },
  'Hydraulic Motor': { id: '184103', name: 'Hydraulic Motors' },
  
  // Electrical
  'Circuit Breaker': { id: '185134', name: 'Circuit Breakers' },
  'Contactor': { id: '181680', name: 'IEC & NEMA Contactors' },
  'Motor Starter': { id: '181681', name: 'Motor Starters' },
  'Transformer': { id: '116922', name: 'Electrical Transformers' },
  'Relay': { id: '36328', name: 'General Purpose Relays' },
  'Control Relay': { id: '36328', name: 'General Purpose Relays' },
  'Solid State Relay': { id: '65454', name: 'Solid State Relays' },
  
  // Power Transmission
  'Gearbox': { id: '181772', name: 'Gearboxes & Speed Reducers' },
  'Gear Reducer': { id: '181772', name: 'Gearboxes & Speed Reducers' },
  'Bearing': { id: '181750', name: 'Ball & Roller Bearings' },
  'Ball Bearing': { id: '181750', name: 'Ball & Roller Bearings' },
  'Linear Bearing': { id: '181741', name: 'Linear Bearings & Bushings' },
  'Linear Guide': { id: '181741', name: 'Linear Bearings & Bushings' },
  'Linear Rail': { id: '181741', name: 'Linear Bearings & Bushings' },
  'Ball Screw': { id: '181741', name: 'Linear Bearings & Bushings' },
  'Linear Actuator': { id: '181741', name: 'Linear Bearings & Bushings' },
  
  // Timers & Controls
  'Timer': { id: '181682', name: 'Industrial Timers' },
  'Counter': { id: '181682', name: 'Industrial Timers' },
  'Temperature Controller': { id: '181684', name: 'Temperature Controllers' },
  'Panel Meter': { id: '181683', name: 'Panel Meters' },
  
  // Default
  'Industrial Equipment': { id: '181744', name: 'Sensors' }
};

// ============================================================================
// EBAY STORE CATEGORY MAPPING (Your store's categories)
// ============================================================================

const EBAY_STORE_CATEGORIES = {
  // Motors
  'Servo Motor': '393389015',
  'AC Servo Motor': '393389015',
  'DC Servo Motor': '393389015',
  'Stepper Motor': '17167471',
  'Electric Motor': '17167471',
  'AC Motor': '17167471',
  'DC Motor': '17167471',
  'Gearmotor': '17167471',
  
  // Drives
  'Servo Drive': '393390015',
  'Servo Amplifier': '393390015',
  'VFD': '2242358015',
  'Variable Frequency Drive': '2242358015',
  'AC Drive': '2242358015',
  'DC Drive': '6688299015',
  'Stepper Drive': '393390015',
  
  // PLCs & Automation
  'PLC': '5404089015',
  'PLC Processor': '5404089015',
  'PLC CPU': '5404089015',
  'PLC Chassis': '5404089015',
  'PLC Power Supply': '2242362015',
  'PLC I/O Module': '18373835',
  'I/O Module': '18373835',
  'Communication Module': '18373835',
  'HMI': '6686264015',
  'Touch Panel': '6686264015',
  'Operator Interface': '6686264015',
  'Power Supply': '2242362015',
  'Industrial Power Supply': '2242362015',
  
  // Sensors
  'Proximity Sensor': '4173791015',
  'Inductive Proximity Sensor': '4173791015',
  'Capacitive Proximity Sensor': '4173791015',
  'Inductive Sensor': '4173791015',
  'Photoelectric Sensor': '4173793015',
  'Photo Sensor': '4173793015',
  'Fiber Optic Sensor': '5785856015',
  'Pressure Sensor': '6690386015',
  'Pressure Transducer': '6690386015',
  'Temperature Sensor': '6690556015',
  'Thermocouple': '6690556015',
  'Flow Sensor': '4173798015',
  'Level Sensor': '4173792015',
  'Laser Sensor': '2479732015',
  'Color Sensor': '4173796015',
  'Current Sensor': '4173797015',
  'Load Cell': '5436340015',
  'Light Curtain': '393379015',
  'Safety Light Curtain': '393379015',
  'Barcode Scanner': '6690176015',
  'Barcode Reader': '6690176015',
  'RFID Reader': '6695702015',
  'Encoder': '1802953015',
  'Rotary Encoder': '1802953015',
  'Linear Encoder': '5634087015',
  
  // Safety
  'Safety Relay': '2464037015',
  'Safety Controller': '2464037015',
  'Safety Scanner': '393379015',
  
  // Pneumatics
  'Pneumatic Cylinder': '2461873015',
  'Air Cylinder': '2461873015',
  'Pneumatic Valve': '2461874015',
  'Solenoid Valve': '6690468015',
  'Pneumatic Gripper': '6699359015',
  'Pneumatic Actuator': '2461878015',
  'Air Regulator': '2461875015',
  
  // Hydraulics
  'Hydraulic Cylinder': '6696061015',
  'Hydraulic Valve': '6696060015',
  'Hydraulic Pump': '6696064015',
  'Hydraulic Motor': '6689962015',
  
  // Electrical
  'Circuit Breaker': '5634105015',
  'Contactor': '2348910015',
  'Motor Starter': '2348910015',
  'Transformer': '5634104015',
  'Relay': '2242359015',
  'Control Relay': '2242359015',
  'Safety Relay': '2464037015',
  'Solid State Relay': '2242359015',
  
  // Power Transmission
  'Gearbox': '6688332015',
  'Gear Reducer': '6688332015',
  'Ball Screw': '6690432015',
  'Linear Actuator': '6690433015',
  'Linear Guide': '6690434015',
  'Linear Rail': '6690434015',
  'Linear Bearing': '4173713015',
  'Ball Bearing': '4173714015',
  'Bearing': '6690505015',
  
  // Switches & Controls
  'Limit Switch': '4173745015',
  'Push Button': '4173735015',
  'E-Stop': '4173756015',
  'Selector Switch': '4173742015',
  'Timer': '18373798',
  'Counter': '18373799',
  'Temperature Controller': '2461872015',
  'Panel Meter': '5634088015'
};

// ALL PRODUCTS store category (for Store Category 2)
const ALL_PRODUCTS_STORE_CATEGORY = '23399313015';

// Fields to IGNORE (don't fetch or display)
const IGNORED_FIELDS = [
  'California Prop 65 Warning',
  'Unit Type',
  'Unit Quantity'
];

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { productType, title, description, specifications } = req.body;

  if (!productType) {
    return res.status(400).json({ error: 'productType is required' });
  }

  console.log('=== PASS 2A: GET CATEGORY & SPECIFICS ===');
  console.log('Product Type:', productType);

  try {
    // Step 1: Map product type to eBay category
    const ebayCategory = EBAY_CATEGORIES[productType] || EBAY_CATEGORIES['Industrial Equipment'];
    const ebayCategoryId = ebayCategory.id;
    const ebayCategoryName = ebayCategory.name;

    console.log('eBay Category:', ebayCategoryId, '-', ebayCategoryName);

    // Step 2: Get store category
    const ebayStoreCategoryId = EBAY_STORE_CATEGORIES[productType] || '';
    const ebayStoreCategoryId2 = ALL_PRODUCTS_STORE_CATEGORY;

    console.log('Store Category 1:', ebayStoreCategoryId);
    console.log('Store Category 2:', ebayStoreCategoryId2);

    // Step 3: Fetch EXACT item specifics from eBay Taxonomy API
    let ebayItemSpecifics = [];
    let requiredFields = [];
    let recommendedFields = [];

    try {
      const baseUrl = req.headers.host?.includes('localhost')
        ? `http://${req.headers.host}`
        : `https://${req.headers.host}`;

      const aspectsResponse = await fetch(
        `${baseUrl}/api/ebay-category-aspects?categoryId=${ebayCategoryId}`
      );

      if (aspectsResponse.ok) {
        const aspectsData = await aspectsResponse.json();
        
        console.log('eBay Aspects Fetched:', aspectsData.totalAspects);

        // Filter out ignored fields and format for UI
        const filterAndFormat = (aspects) => {
          return (aspects || [])
            .filter(a => !IGNORED_FIELDS.includes(a.ebayName))
            .map(a => ({
              name: a.ebayName,                    // Display name (e.g., "Brand")
              fieldName: a.suredoneInlineField,    // SureDone field (e.g., "brand")
              required: a.required,
              mode: a.mode,                        // FREE_TEXT or SELECTION_ONLY
              allowedValues: a.allowedValues || [],
              dataType: a.dataType
            }));
        };

        requiredFields = filterAndFormat(aspectsData.required);
        recommendedFields = filterAndFormat(aspectsData.recommended);
        
        // Combine all fields for display
        ebayItemSpecifics = [...requiredFields, ...recommendedFields];

        console.log('Required Fields:', requiredFields.length);
        console.log('Recommended Fields:', recommendedFields.length);
        console.log('Total (after filtering):', ebayItemSpecifics.length);
      } else {
        console.error('Failed to fetch eBay aspects:', aspectsResponse.status);
      }
    } catch (error) {
      console.error('Error fetching eBay aspects:', error.message);
    }

    // Return category info and item specifics
    res.status(200).json({
      success: true,
      stage: 'category_complete',
      data: {
        productType: productType,
        ebayCategory: {
          id: ebayCategoryId,
          name: ebayCategoryName
        },
        ebayStoreCategory1: ebayStoreCategoryId,
        ebayStoreCategory2: ebayStoreCategoryId2,
        itemSpecifics: {
          required: requiredFields,
          recommended: recommendedFields,
          all: ebayItemSpecifics,
          totalCount: ebayItemSpecifics.length
        }
      },
      _meta: {
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Category API error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      stage: 'category_failed'
    });
  }
}
