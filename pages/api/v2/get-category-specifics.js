// pages/api/v2/get-category-specifics.js
// PASS 2A: Get eBay category and fetch item specifics
// FIXED: Using correct eBay category IDs from master-fields.js CATEGORY_CONFIG

// ============================================================================
// PRODUCT TYPE TO EBAY CATEGORY MAPPING - FROM YOUR master-fields.js
// ============================================================================

const EBAY_CATEGORIES = {
  // Motors - from CATEGORY_CONFIG
  'Electric Motor': { id: '181732', name: 'General Purpose Motors' },
  'AC Motor': { id: '181732', name: 'General Purpose Motors' },
  'Induction Motor': { id: '181732', name: 'General Purpose Motors' },
  'DC Motor': { id: '181732', name: 'General Purpose Motors' },
  'Gearmotor': { id: '65452', name: 'Gearmotors' },
  'Gear Motor': { id: '65452', name: 'Gearmotors' },
  
  // Servo - CORRECTED: was showing 181731 but should be different
  'Servo Motor': { id: '124603', name: 'Servo Motors' },
  'AC Servo Motor': { id: '124603', name: 'Servo Motors' },
  'DC Servo Motor': { id: '124603', name: 'Servo Motors' },
  'Stepper Motor': { id: '181732', name: 'General Purpose Motors' },
  
  // Drives
  'Servo Drive': { id: '78191', name: 'Servo Drives & Amplifiers' },
  'Servo Amplifier': { id: '78191', name: 'Servo Drives & Amplifiers' },
  'VFD': { id: '78192', name: 'Variable Frequency Drives' },
  'Variable Frequency Drive': { id: '78192', name: 'Variable Frequency Drives' },
  'AC Drive': { id: '78192', name: 'Variable Frequency Drives' },
  'DC Drive': { id: '78190', name: 'DC Drives' },
  'Stepper Drive': { id: '71394', name: 'Stepper Controls & Drives' },
  'Inverter': { id: '78192', name: 'Variable Frequency Drives' },
  
  // PLCs & Automation - from CATEGORY_CONFIG
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
  
  // Sensors - from CATEGORY_CONFIG
  'Proximity Sensor': { id: '183089', name: 'Proximity Sensors' },
  'Inductive Proximity Sensor': { id: '183089', name: 'Proximity Sensors' },
  'Capacitive Proximity Sensor': { id: '183089', name: 'Proximity Sensors' },
  'Inductive Sensor': { id: '183089', name: 'Proximity Sensors' },
  'Photoelectric Sensor': { id: '183089', name: 'Photoelectric Sensors' },
  'Photo Sensor': { id: '183089', name: 'Photoelectric Sensors' },
  'Fiber Optic Sensor': { id: '183089', name: 'Fiber Optic Sensors' },
  'Pressure Sensor': { id: '183089', name: 'Pressure Sensors' },
  'Pressure Transducer': { id: '183089', name: 'Pressure Sensors' },
  'Temperature Sensor': { id: '183089', name: 'Temperature Sensors' },
  'Thermocouple': { id: '183089', name: 'Temperature Sensors' },
  'Flow Sensor': { id: '183089', name: 'Flow Sensors' },
  'Level Sensor': { id: '183089', name: 'Level Sensors' },
  'Ultrasonic Sensor': { id: '183089', name: 'Ultrasonic Sensors' },
  
  // Safety
  'Light Curtain': { id: '183088', name: 'Light Curtains' },
  'Safety Light Curtain': { id: '183088', name: 'Light Curtains' },
  'Safety Relay': { id: '116856', name: 'Safety Relays' },
  'Safety Controller': { id: '116856', name: 'Safety Relays' },
  
  // Encoders
  'Encoder': { id: '65455', name: 'Rotary Encoders' },
  'Rotary Encoder': { id: '65455', name: 'Rotary Encoders' },
  'Incremental Encoder': { id: '65455', name: 'Rotary Encoders' },
  'Absolute Encoder': { id: '65455', name: 'Rotary Encoders' },
  'Linear Encoder': { id: '65455', name: 'Linear Encoders' },
  
  // Pneumatics - from CATEGORY_CONFIG
  'Pneumatic Cylinder': { id: '185006', name: 'Pneumatic Cylinders' },
  'Air Cylinder': { id: '185006', name: 'Pneumatic Cylinders' },
  'Pneumatic Valve': { id: '185005', name: 'Pneumatic Valves' },
  'Solenoid Valve': { id: '185005', name: 'Solenoid Valves' },
  'Pneumatic Gripper': { id: '185006', name: 'Pneumatic Grippers' },
  'Pneumatic Actuator': { id: '185006', name: 'Pneumatic Actuators' },
  'Air Regulator': { id: '185005', name: 'Air Regulators' },
  
  // Hydraulics - from CATEGORY_CONFIG
  'Hydraulic Cylinder': { id: '185006', name: 'Hydraulic Cylinders' },
  'Hydraulic Valve': { id: '115596', name: 'Hydraulic Valves' },
  'Hydraulic Pump': { id: '115598', name: 'Hydraulic Pumps' },
  'Hydraulic Motor': { id: '115598', name: 'Hydraulic Motors' },
  
  // Electrical - from CATEGORY_CONFIG
  'Circuit Breaker': { id: '116862', name: 'Circuit Breakers' },
  'Contactor': { id: '181680', name: 'Contactors' },
  'Motor Starter': { id: '181681', name: 'Motor Starters' },
  'Transformer': { id: '116922', name: 'Transformers' },
  'Relay': { id: '36328', name: 'Relays' },
  'Control Relay': { id: '36328', name: 'Control Relays' },
  'Solid State Relay': { id: '65454', name: 'Solid State Relays' },
  
  // Bearings - from CATEGORY_CONFIG
  'Bearing': { id: '101353', name: 'Bearings' },
  'Ball Bearing': { id: '101353', name: 'Ball Bearings' },
  'Linear Bearing': { id: '101353', name: 'Linear Bearings' },
  
  // Power Transmission
  'Gearbox': { id: '181772', name: 'Gearboxes' },
  'Gear Reducer': { id: '181772', name: 'Gear Reducers' },
  
  // Switches
  'Limit Switch': { id: '181676', name: 'Limit Switches' },
  'Push Button': { id: '181677', name: 'Push Buttons' },
  
  // Timers
  'Timer': { id: '181682', name: 'Timers' },
  'Counter': { id: '181682', name: 'Counters' },
  'Temperature Controller': { id: '181684', name: 'Temperature Controllers' },
  
  // Barcode
  'Barcode Scanner': { id: '46706', name: 'Barcode Scanners' },
  'Barcode Reader': { id: '46706', name: 'Barcode Readers' },
  
  // Default - CHANGED from 181744 (Sensors)
  'Industrial Equipment': { id: '181732', name: 'General Purpose Motors' }
};

// ============================================================================
// EBAY STORE CATEGORY MAPPING - FROM YOUR master-fields.js CATEGORY_CONFIG
// ============================================================================

const EBAY_STORE_CATEGORIES = {
  // Motors
  'Electric Motor': '17167471',
  'AC Motor': '17167471',
  'Induction Motor': '17167471',
  'DC Motor': '17167471',
  'Gearmotor': '17167471',
  'Gear Motor': '17167471',
  'Stepper Motor': '17167471',
  
  // Servo
  'Servo Motor': '393389015',
  'AC Servo Motor': '393389015',
  'DC Servo Motor': '393389015',
  
  // Drives
  'Servo Drive': '393390015',
  'Servo Amplifier': '393390015',
  'VFD': '2242358015',
  'Variable Frequency Drive': '2242358015',
  'AC Drive': '2242358015',
  'DC Drive': '6688299015',
  'Stepper Drive': '393390015',
  'Inverter': '2242358015',
  
  // PLCs
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
  'Ultrasonic Sensor': '4173795015',
  'Light Curtain': '393379015',
  'Safety Light Curtain': '393379015',
  'Barcode Scanner': '6690176015',
  'Barcode Reader': '6690176015',
  'Encoder': '1802953015',
  'Rotary Encoder': '1802953015',
  'Linear Encoder': '5634087015',
  
  // Safety
  'Safety Relay': '2464037015',
  'Safety Controller': '2464037015',
  
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
  'Solid State Relay': '2242359015',
  
  // Power Transmission
  'Gearbox': '6688332015',
  'Gear Reducer': '6688332015',
  'Bearing': '6690505015',
  'Ball Bearing': '4173714015',
  'Linear Bearing': '4173713015',
  
  // Switches
  'Limit Switch': '2348911015',
  'Push Button': '2348912015',
  
  // Timers
  'Timer': '2348913015',
  'Counter': '2348913015',
  'Temperature Controller': '2348914015'
};

// ALL PRODUCTS store category (for Store Category 2)
const ALL_PRODUCTS_STORE_CATEGORY = '23399313015';

// Fields to IGNORE
const IGNORED_FIELDS = [
  'California Prop 65 Warning',
  'Unit Type',
  'Unit Quantity'
];

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { productType } = req.body;

  if (!productType) {
    return res.status(400).json({ error: 'productType is required' });
  }

  console.log('=== PASS 2A: GET CATEGORY & SPECIFICS ===');
  console.log('Product Type:', productType);

  try {
    // Step 1: Map product type to eBay category
    const ebayCategory = EBAY_CATEGORIES[productType];
    
    if (!ebayCategory) {
      console.log('WARNING: Product type not found in mapping:', productType);
      console.log('Defaulting to General Purpose Motors (181732)');
    }
    
    const ebayCategoryId = ebayCategory?.id || '181732';
    const ebayCategoryName = ebayCategory?.name || 'General Purpose Motors';

    console.log('eBay Category ID:', ebayCategoryId);
    console.log('eBay Category Name:', ebayCategoryName);

    // Step 2: Get store category
    const ebayStoreCategoryId = EBAY_STORE_CATEGORIES[productType] || '17167471';
    const ebayStoreCategoryId2 = ALL_PRODUCTS_STORE_CATEGORY;

    console.log('Store Category 1:', ebayStoreCategoryId);
    console.log('Store Category 2:', ebayStoreCategoryId2);

    // Step 3: Fetch item specifics from eBay Taxonomy API
    let allFields = [];
    let requiredFields = [];
    let recommendedFields = [];
    let optionalFields = [];

    try {
      const baseUrl = req.headers.host?.includes('localhost')
        ? `http://${req.headers.host}`
        : `https://${req.headers.host}`;

      console.log('Fetching aspects from:', `${baseUrl}/api/ebay-category-aspects?categoryId=${ebayCategoryId}`);

      const aspectsResponse = await fetch(
        `${baseUrl}/api/ebay-category-aspects?categoryId=${ebayCategoryId}`
      );

      if (aspectsResponse.ok) {
        const aspectsData = await aspectsResponse.json();
        
        console.log('eBay API Response - Total Aspects:', aspectsData.totalAspects);
        console.log('  Required:', aspectsData.required?.length || 0);
        console.log('  Recommended:', aspectsData.recommended?.length || 0);
        console.log('  Optional:', aspectsData.optional?.length || 0);

        // Filter and format aspects
        const filterAndFormat = (aspects, isRequired = false) => {
          return (aspects || [])
            .filter(a => !IGNORED_FIELDS.includes(a.ebayName))
            .map(a => ({
              name: a.ebayName,
              fieldName: a.suredoneInlineField,
              required: isRequired || a.required,
              usage: a.usage,
              mode: a.mode,
              allowedValues: a.allowedValues || [],
              dataType: a.dataType
            }));
        };

        requiredFields = filterAndFormat(aspectsData.required, true);
        recommendedFields = filterAndFormat(aspectsData.recommended, false);
        optionalFields = filterAndFormat(aspectsData.optional, false);
        
        allFields = [...requiredFields, ...recommendedFields, ...optionalFields];

        console.log('After filtering - Total fields:', allFields.length);
      } else {
        const errorText = await aspectsResponse.text();
        console.error('eBay aspects API error:', aspectsResponse.status, errorText);
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
          optional: optionalFields,
          all: allFields,
          totalCount: allFields.length
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
