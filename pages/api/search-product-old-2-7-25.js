// pages/api/search-product.js
// v3 CONSOLIDATED - Combines best of v1 and v2
// AI-driven product type detection + category-specific field definitions
// Web search enabled for live product research
// Corrected LEAF category IDs throughout
//
// REPLACES: search-product.js (v1) and search-product-v2.js (v2)
// DATE: 2026-02-07

// ============================================================================
// PRODUCT TYPE TO EBAY MARKETPLACE CATEGORY MAPPING
// AI returns a product type string, we map it to the correct LEAF eBay Category ID
// ALL IDs verified as leaf categories (not parent categories)
// ============================================================================

const PRODUCT_TYPE_TO_EBAY_CATEGORY = {
  // ==================== PLCs & AUTOMATION ====================
  'PLC': { id: '181708', name: 'PLC Processors' },
  'PLC Processor': { id: '181708', name: 'PLC Processors' },
  'PLC CPU': { id: '181708', name: 'PLC Processors' },
  'PLC Chassis': { id: '181711', name: 'PLC Chassis' },
  'PLC Rack': { id: '181711', name: 'PLC Chassis' },
  'PLC Power Supply': { id: '181720', name: 'PLC Power Supplies' },
  'PLC I/O Module': { id: '181714', name: 'PLC Input & Output Modules' },
  'I/O Module': { id: '181714', name: 'PLC Input & Output Modules' },
  'Input Module': { id: '181714', name: 'PLC Input & Output Modules' },
  'Output Module': { id: '181714', name: 'PLC Input & Output Modules' },
  'Communication Module': { id: '181714', name: 'PLC Input & Output Modules' },
  'Network Module': { id: '181714', name: 'PLC Input & Output Modules' },
  'HMI': { id: '181709', name: 'HMI & Open Interface Panels' },
  'Touch Panel': { id: '181709', name: 'HMI & Open Interface Panels' },
  'Operator Interface': { id: '181709', name: 'HMI & Open Interface Panels' },
  'Operator Panel': { id: '181709', name: 'HMI & Open Interface Panels' },
  'Touch Screen': { id: '181709', name: 'HMI & Open Interface Panels' },

  // ==================== MOTORS ====================
  'Servo Motor': { id: '124603', name: 'Servo Motors' },
  'AC Servo Motor': { id: '124603', name: 'Servo Motors' },
  'DC Servo Motor': { id: '124603', name: 'Servo Motors' },
  'Brushless Servo Motor': { id: '124603', name: 'Servo Motors' },
  'Stepper Motor': { id: '9723', name: 'Stepper Motors' },
  'Step Motor': { id: '9723', name: 'Stepper Motors' },
  'Stepping Motor': { id: '9723', name: 'Stepper Motors' },
  'Electric Motor': { id: '181732', name: 'General Purpose Motors' },
  'AC Motor': { id: '181732', name: 'General Purpose Motors' },
  'Induction Motor': { id: '181732', name: 'General Purpose Motors' },
  'Three Phase Motor': { id: '181732', name: 'General Purpose Motors' },
  'Single Phase Motor': { id: '181732', name: 'General Purpose Motors' },
  'DC Motor': { id: '181731', name: 'Definite Purpose Motors' },
  'Brushless DC Motor': { id: '181731', name: 'Definite Purpose Motors' },
  'BLDC Motor': { id: '181731', name: 'Definite Purpose Motors' },
  'Gearmotor': { id: '65452', name: 'Gearmotors' },
  'Gear Motor': { id: '65452', name: 'Gearmotors' },
  'Geared Motor': { id: '65452', name: 'Gearmotors' },

  // ==================== DRIVES ====================
  'Servo Drive': { id: '78191', name: 'Servo Drives & Amplifiers' },
  'Servo Amplifier': { id: '78191', name: 'Servo Drives & Amplifiers' },
  'Servo Controller': { id: '78191', name: 'Servo Drives & Amplifiers' },
  'VFD': { id: '78192', name: 'Variable Frequency Drives' },
  'Variable Frequency Drive': { id: '78192', name: 'Variable Frequency Drives' },
  'AC Drive': { id: '78192', name: 'Variable Frequency Drives' },
  'Inverter': { id: '78192', name: 'Variable Frequency Drives' },
  'Frequency Inverter': { id: '78192', name: 'Variable Frequency Drives' },
  'DC Drive': { id: '78190', name: 'General Purpose DC Drives' },
  'DC Motor Drive': { id: '78190', name: 'General Purpose DC Drives' },
  'SCR Drive': { id: '78190', name: 'General Purpose DC Drives' },
  'SCR Controller': { id: '78190', name: 'General Purpose DC Drives' },
  'Stepper Drive': { id: '71394', name: 'Stepper Controls & Drives' },
  'Stepper Controller': { id: '71394', name: 'Stepper Controls & Drives' },
  'Step Drive': { id: '71394', name: 'Stepper Controls & Drives' },

  // ==================== POWER SUPPLIES ====================
  'Power Supply': { id: '181925', name: 'Power Supplies' },
  'Switching Power Supply': { id: '181925', name: 'Power Supplies' },
  'DC Power Supply': { id: '181925', name: 'Power Supplies' },
  'AC Power Supply': { id: '181925', name: 'Power Supplies' },
  'Industrial Power Supply': { id: '181925', name: 'Power Supplies' },
  'DIN Rail Power Supply': { id: '181925', name: 'Power Supplies' },

  // ==================== ELECTRICAL ====================
  'Circuit Breaker': { id: '185134', name: 'Circuit Breakers' },
  'Molded Case Circuit Breaker': { id: '185134', name: 'Circuit Breakers' },
  'MCCB': { id: '185134', name: 'Circuit Breakers' },
  'Miniature Circuit Breaker': { id: '185134', name: 'Circuit Breakers' },
  'MCB': { id: '185134', name: 'Circuit Breakers' },
  'Disconnect Switch': { id: '181679', name: 'Disconnect Switches' },
  'Disconnect': { id: '181679', name: 'Disconnect Switches' },
  'Safety Switch': { id: '181679', name: 'Disconnect Switches' },
  'Fuse': { id: '181678', name: 'Fuses' },
  'Fuse Holder': { id: '181678', name: 'Fuses' },
  'Fuse Block': { id: '181678', name: 'Fuses' },
  'Transformer': { id: '116922', name: 'Electrical Transformers' },
  'Control Transformer': { id: '116922', name: 'Electrical Transformers' },
  'Isolation Transformer': { id: '116922', name: 'Electrical Transformers' },
  'Step Down Transformer': { id: '116922', name: 'Electrical Transformers' },
  'Enclosure': { id: '181673', name: 'Industrial Enclosures' },
  'Electrical Enclosure': { id: '181673', name: 'Industrial Enclosures' },
  'Junction Box': { id: '181673', name: 'Industrial Enclosures' },
  'Control Panel': { id: '181673', name: 'Industrial Enclosures' },

  // ==================== CONTACTORS & STARTERS ====================
  'Contactor': { id: '181680', name: 'IEC & NEMA Contactors' },
  'AC Contactor': { id: '181680', name: 'IEC & NEMA Contactors' },
  'DC Contactor': { id: '181680', name: 'IEC & NEMA Contactors' },
  'Motor Starter': { id: '181681', name: 'Motor Starters' },
  'Soft Starter': { id: '181681', name: 'Motor Starters' },
  'DOL Starter': { id: '181681', name: 'Motor Starters' },
  'Motor Protector': { id: '181681', name: 'Motor Starters' },
  'Overload Relay': { id: '181681', name: 'Motor Starters' },

  // ==================== RELAYS ====================
  'Relay': { id: '36328', name: 'General Purpose Relays' },
  'Control Relay': { id: '36328', name: 'General Purpose Relays' },
  'Ice Cube Relay': { id: '36328', name: 'General Purpose Relays' },
  'Plug-in Relay': { id: '36328', name: 'General Purpose Relays' },
  'Safety Relay': { id: '65464', name: 'Safety Relays' },
  'Safety Controller': { id: '65464', name: 'Safety Relays' },
  'Solid State Relay': { id: '65454', name: 'Solid State Relays' },
  'SSR': { id: '65454', name: 'Solid State Relays' },
  'Time Delay Relay': { id: '181682', name: 'Industrial Timers' },

  // ==================== SENSORS - PROXIMITY ====================
  'Proximity Sensor': { id: '65459', name: 'Proximity Sensors' },
  'Inductive Proximity Sensor': { id: '65459', name: 'Proximity Sensors' },
  'Inductive Sensor': { id: '65459', name: 'Proximity Sensors' },
  'Capacitive Proximity Sensor': { id: '65459', name: 'Proximity Sensors' },
  'Capacitive Sensor': { id: '65459', name: 'Proximity Sensors' },
  'Magnetic Proximity Sensor': { id: '65459', name: 'Proximity Sensors' },

  // ==================== SENSORS - PHOTOELECTRIC ====================
  'Photoelectric Sensor': { id: '181786', name: 'Fiber Optic Sensors' },
  'Photo Sensor': { id: '181786', name: 'Fiber Optic Sensors' },
  'Optical Sensor': { id: '181786', name: 'Fiber Optic Sensors' },
  'Through Beam Sensor': { id: '181786', name: 'Fiber Optic Sensors' },
  'Retroreflective Sensor': { id: '181786', name: 'Fiber Optic Sensors' },
  'Diffuse Sensor': { id: '181786', name: 'Fiber Optic Sensors' },
  'Fiber Optic Sensor': { id: '181786', name: 'Fiber Optic Sensors' },
  'Fiber Optic Amplifier': { id: '181786', name: 'Fiber Optic Sensors' },

  // ==================== SENSORS - OTHER ====================
  'Pressure Sensor': { id: '65456', name: 'Pressure Sensors' },
  'Pressure Transducer': { id: '65456', name: 'Pressure Sensors' },
  'Pressure Transmitter': { id: '65456', name: 'Pressure Sensors' },
  'Temperature Sensor': { id: '65460', name: 'Temperature & Humidity Sensors' },
  'Thermocouple': { id: '65460', name: 'Temperature & Humidity Sensors' },
  'RTD': { id: '65460', name: 'Temperature & Humidity Sensors' },
  'Temperature Probe': { id: '65460', name: 'Temperature & Humidity Sensors' },
  'Flow Sensor': { id: '65457', name: 'Flow Sensors' },
  'Flow Meter': { id: '65457', name: 'Flow Sensors' },
  'Flow Switch': { id: '65457', name: 'Flow Sensors' },
  'Level Sensor': { id: '181785', name: 'Level Sensors' },
  'Level Switch': { id: '181785', name: 'Level Sensors' },
  'Float Switch': { id: '181785', name: 'Level Sensors' },
  'Ultrasonic Sensor': { id: '181785', name: 'Level Sensors' },
  'Laser Sensor': { id: '181744', name: 'Sensors' },
  'Laser Distance Sensor': { id: '181744', name: 'Sensors' },
  'Color Sensor': { id: '181744', name: 'Sensors' },
  'Color Mark Sensor': { id: '181744', name: 'Sensors' },
  'Vision Sensor': { id: '181744', name: 'Sensors' },
  'Vision System': { id: '181744', name: 'Sensors' },
  'Camera': { id: '181744', name: 'Sensors' },
  'Current Sensor': { id: '181744', name: 'Sensors' },
  'Current Transformer': { id: '181744', name: 'Sensors' },
  'Load Cell': { id: '181744', name: 'Sensors' },
  'Force Sensor': { id: '181744', name: 'Sensors' },
  'Linear Sensor': { id: '181744', name: 'Sensors' },
  'Position Sensor': { id: '181744', name: 'Sensors' },
  'LVDT': { id: '181744', name: 'Sensors' },

  // ==================== SAFETY DEVICES ====================
  'Light Curtain': { id: '65465', name: 'Light Curtains' },
  'Safety Light Curtain': { id: '65465', name: 'Light Curtains' },
  'Safety Barrier': { id: '65465', name: 'Light Curtains' },
  'Safety Scanner': { id: '65465', name: 'Light Curtains' },
  'Area Scanner': { id: '65465', name: 'Light Curtains' },
  'E-Stop': { id: '181677', name: 'Pushbutton Switches' },
  'Emergency Stop': { id: '181677', name: 'Pushbutton Switches' },
  'Safety Interlock': { id: '65464', name: 'Safety Relays' },
  'Safety Door Switch': { id: '65464', name: 'Safety Relays' },
  'Safety Mat': { id: '65464', name: 'Safety Relays' },

  // ==================== ENCODERS ====================
  'Encoder': { id: '65455', name: 'Rotary Encoders' },
  'Rotary Encoder': { id: '65455', name: 'Rotary Encoders' },
  'Incremental Encoder': { id: '65455', name: 'Rotary Encoders' },
  'Absolute Encoder': { id: '65455', name: 'Rotary Encoders' },
  'Shaft Encoder': { id: '65455', name: 'Rotary Encoders' },
  'Hollow Shaft Encoder': { id: '65455', name: 'Rotary Encoders' },
  'Linear Encoder': { id: '65455', name: 'Rotary Encoders' },
  'Magnetic Encoder': { id: '65455', name: 'Rotary Encoders' },
  'Resolver': { id: '65455', name: 'Rotary Encoders' },

  // ==================== BARCODE & RFID ====================
  'Barcode Scanner': { id: '46706', name: 'Barcode Scanners' },
  'Barcode Reader': { id: '46706', name: 'Barcode Scanners' },
  'Bar Code Scanner': { id: '46706', name: 'Barcode Scanners' },
  'QR Code Reader': { id: '46706', name: 'Barcode Scanners' },
  '2D Scanner': { id: '46706', name: 'Barcode Scanners' },
  'RFID Reader': { id: '181744', name: 'Sensors' },
  'RFID Antenna': { id: '181744', name: 'Sensors' },
  'RFID Tag': { id: '181744', name: 'Sensors' },

  // ==================== SWITCHES ====================
  'Limit Switch': { id: '181676', name: 'Industrial Limit Switches' },
  'Micro Switch': { id: '181676', name: 'Industrial Limit Switches' },
  'Miniature Switch': { id: '181676', name: 'Industrial Limit Switches' },
  'Push Button': { id: '181677', name: 'Pushbutton Switches' },
  'Pushbutton': { id: '181677', name: 'Pushbutton Switches' },
  'Pushbutton Switch': { id: '181677', name: 'Pushbutton Switches' },
  'Selector Switch': { id: '181677', name: 'Pushbutton Switches' },
  'Rotary Switch': { id: '181677', name: 'Pushbutton Switches' },
  'Toggle Switch': { id: '181677', name: 'Pushbutton Switches' },
  'Key Switch': { id: '181677', name: 'Pushbutton Switches' },
  'Foot Switch': { id: '181677', name: 'Pushbutton Switches' },
  'Palm Switch': { id: '181677', name: 'Pushbutton Switches' },
  'Joystick': { id: '181677', name: 'Pushbutton Switches' },
  'Pendant': { id: '181677', name: 'Pushbutton Switches' },
  'Pendant Control': { id: '181677', name: 'Pushbutton Switches' },
  'Pilot Light': { id: '181677', name: 'Pushbutton Switches' },
  'Indicator Light': { id: '181677', name: 'Pushbutton Switches' },
  'Stack Light': { id: '181677', name: 'Pushbutton Switches' },
  'Tower Light': { id: '181677', name: 'Pushbutton Switches' },
  'Signal Light': { id: '181677', name: 'Pushbutton Switches' },

  // ==================== PNEUMATIC CYLINDERS ====================
  'Pneumatic Cylinder': { id: '184027', name: 'Hydraulic & Pneumatic Cylinders' },
  'Air Cylinder': { id: '184027', name: 'Hydraulic & Pneumatic Cylinders' },
  'Compact Cylinder': { id: '184027', name: 'Hydraulic & Pneumatic Cylinders' },
  'Round Cylinder': { id: '184027', name: 'Hydraulic & Pneumatic Cylinders' },
  'ISO Cylinder': { id: '184027', name: 'Hydraulic & Pneumatic Cylinders' },
  'NFPA Cylinder': { id: '184027', name: 'Hydraulic & Pneumatic Cylinders' },
  'Rodless Cylinder': { id: '184027', name: 'Hydraulic & Pneumatic Cylinders' },
  'Guided Cylinder': { id: '184027', name: 'Hydraulic & Pneumatic Cylinders' },
  'Slide Cylinder': { id: '184027', name: 'Hydraulic & Pneumatic Cylinders' },
  'Rotary Cylinder': { id: '184027', name: 'Hydraulic & Pneumatic Cylinders' },
  'Pneumatic Actuator': { id: '184027', name: 'Hydraulic & Pneumatic Cylinders' },
  'Pneumatic Gripper': { id: '184027', name: 'Hydraulic & Pneumatic Cylinders' },
  'Gripper': { id: '184027', name: 'Hydraulic & Pneumatic Cylinders' },
  'Parallel Gripper': { id: '184027', name: 'Hydraulic & Pneumatic Cylinders' },
  'Angular Gripper': { id: '184027', name: 'Hydraulic & Pneumatic Cylinders' },

  // ==================== PNEUMATIC VALVES ====================
  'Pneumatic Valve': { id: '260291', name: 'Solenoid Valves & Coils' },
  'Solenoid Valve': { id: '260291', name: 'Solenoid Valves & Coils' },
  'Air Valve': { id: '260291', name: 'Solenoid Valves & Coils' },
  'Directional Valve': { id: '260291', name: 'Solenoid Valves & Coils' },
  'Manifold': { id: '260291', name: 'Solenoid Valves & Coils' },
  'Valve Manifold': { id: '260291', name: 'Solenoid Valves & Coils' },
  'Valve Terminal': { id: '260291', name: 'Solenoid Valves & Coils' },

  // ==================== PNEUMATIC OTHER ====================
  'Air Regulator': { id: '183988', name: 'Air Pressure Regulators' },
  'Pressure Regulator': { id: '183988', name: 'Air Pressure Regulators' },
  'Filter Regulator': { id: '183988', name: 'Air Pressure Regulators' },
  'FRL Unit': { id: '183988', name: 'Air Pressure Regulators' },
  'FRL': { id: '183988', name: 'Air Pressure Regulators' },
  'Air Filter': { id: '43509', name: 'Air Filters' },
  'Compressed Air Filter': { id: '43509', name: 'Air Filters' },
  'Coalescing Filter': { id: '43509', name: 'Air Filters' },
  'Lubricator': { id: '183988', name: 'Air Pressure Regulators' },
  'Air Lubricator': { id: '183988', name: 'Air Pressure Regulators' },
  'Air Dryer': { id: '183988', name: 'Air Pressure Regulators' },
  'Muffler': { id: '183988', name: 'Air Pressure Regulators' },
  'Silencer': { id: '183988', name: 'Air Pressure Regulators' },

  // ==================== HYDRAULICS ====================
  'Hydraulic Cylinder': { id: '184027', name: 'Hydraulic & Pneumatic Cylinders' },
  'Hydraulic Ram': { id: '184027', name: 'Hydraulic & Pneumatic Cylinders' },
  'Hydraulic Actuator': { id: '184027', name: 'Hydraulic & Pneumatic Cylinders' },
  'Hydraulic Valve': { id: '184113', name: 'Hydraulic Directional Control Valves' },
  'Directional Control Valve': { id: '184113', name: 'Hydraulic Directional Control Valves' },
  'Proportional Valve': { id: '184113', name: 'Hydraulic Directional Control Valves' },
  'Servo Valve': { id: '184113', name: 'Hydraulic Directional Control Valves' },
  'Hydraulic Pump': { id: '184101', name: 'Hydraulic Pumps' },
  'Gear Pump': { id: '184101', name: 'Hydraulic Pumps' },
  'Vane Pump': { id: '184101', name: 'Hydraulic Pumps' },
  'Piston Pump': { id: '184101', name: 'Hydraulic Pumps' },
  'Hydraulic Motor': { id: '184103', name: 'Hydraulic Motors' },
  'Hydraulic Power Unit': { id: '184101', name: 'Hydraulic Pumps' },
  'HPU': { id: '184101', name: 'Hydraulic Pumps' },
  'Hydraulic Accumulator': { id: '184027', name: 'Hydraulic & Pneumatic Cylinders' },
  'Accumulator': { id: '184027', name: 'Hydraulic & Pneumatic Cylinders' },
  'Hydraulic Filter': { id: '43509', name: 'Air Filters' },

  // ==================== POWER TRANSMISSION ====================
  'Gearbox': { id: '181772', name: 'Gearboxes & Speed Reducers' },
  'Gear Reducer': { id: '181772', name: 'Gearboxes & Speed Reducers' },
  'Speed Reducer': { id: '181772', name: 'Gearboxes & Speed Reducers' },
  'Worm Gear': { id: '181772', name: 'Gearboxes & Speed Reducers' },
  'Planetary Gearbox': { id: '181772', name: 'Gearboxes & Speed Reducers' },
  'Helical Gearbox': { id: '181772', name: 'Gearboxes & Speed Reducers' },
  'Right Angle Gearbox': { id: '181772', name: 'Gearboxes & Speed Reducers' },
  'Brake': { id: '181772', name: 'Gearboxes & Speed Reducers' },
  'Motor Brake': { id: '181772', name: 'Gearboxes & Speed Reducers' },
  'Electromagnetic Brake': { id: '181772', name: 'Gearboxes & Speed Reducers' },
  'Clutch': { id: '181772', name: 'Gearboxes & Speed Reducers' },
  'Electromagnetic Clutch': { id: '181772', name: 'Gearboxes & Speed Reducers' },
  'Clutch Brake': { id: '181772', name: 'Gearboxes & Speed Reducers' },
  'Belt': { id: '181772', name: 'Gearboxes & Speed Reducers' },
  'Timing Belt': { id: '181772', name: 'Gearboxes & Speed Reducers' },
  'V-Belt': { id: '181772', name: 'Gearboxes & Speed Reducers' },
  'Pulley': { id: '181772', name: 'Gearboxes & Speed Reducers' },
  'Timing Pulley': { id: '181772', name: 'Gearboxes & Speed Reducers' },
  'Sprocket': { id: '181772', name: 'Gearboxes & Speed Reducers' },
  'Chain': { id: '181772', name: 'Gearboxes & Speed Reducers' },
  'Roller Chain': { id: '181772', name: 'Gearboxes & Speed Reducers' },

  // ==================== BEARINGS ====================
  'Bearing': { id: '181750', name: 'Ball & Roller Bearings' },
  'Ball Bearing': { id: '181750', name: 'Ball & Roller Bearings' },
  'Roller Bearing': { id: '181750', name: 'Ball & Roller Bearings' },
  'Tapered Roller Bearing': { id: '181750', name: 'Ball & Roller Bearings' },
  'Needle Bearing': { id: '181750', name: 'Ball & Roller Bearings' },
  'Thrust Bearing': { id: '181750', name: 'Ball & Roller Bearings' },
  'Pillow Block': { id: '181750', name: 'Ball & Roller Bearings' },
  'Pillow Block Bearing': { id: '181750', name: 'Ball & Roller Bearings' },
  'Flange Bearing': { id: '181750', name: 'Ball & Roller Bearings' },
  'Cam Follower': { id: '181750', name: 'Ball & Roller Bearings' },
  'Linear Bearing': { id: '181741', name: 'Linear Bearings & Bushings' },
  'Linear Bushing': { id: '181741', name: 'Linear Bearings & Bushings' },

  // ==================== LINEAR MOTION ====================
  'Linear Guide': { id: '181741', name: 'Linear Bearings & Bushings' },
  'Linear Rail': { id: '181741', name: 'Linear Bearings & Bushings' },
  'Linear Slide': { id: '181741', name: 'Linear Bearings & Bushings' },
  'Rail Block': { id: '181741', name: 'Linear Bearings & Bushings' },
  'Carriage': { id: '181741', name: 'Linear Bearings & Bushings' },
  'Ball Screw': { id: '181741', name: 'Linear Bearings & Bushings' },
  'Ball Screw Assembly': { id: '181741', name: 'Linear Bearings & Bushings' },
  'Ball Nut': { id: '181741', name: 'Linear Bearings & Bushings' },
  'Lead Screw': { id: '181741', name: 'Linear Bearings & Bushings' },
  'Linear Actuator': { id: '181741', name: 'Linear Bearings & Bushings' },
  'Electric Linear Actuator': { id: '181741', name: 'Linear Bearings & Bushings' },
  'Linear Stage': { id: '181741', name: 'Linear Bearings & Bushings' },
  'Linear Module': { id: '181741', name: 'Linear Bearings & Bushings' },

  // ==================== PUMPS ====================
  'Pump': { id: '184101', name: 'Hydraulic Pumps' },
  'Centrifugal Pump': { id: '184101', name: 'Hydraulic Pumps' },
  'Diaphragm Pump': { id: '184101', name: 'Hydraulic Pumps' },
  'Metering Pump': { id: '184101', name: 'Hydraulic Pumps' },
  'Dosing Pump': { id: '184101', name: 'Hydraulic Pumps' },
  'Vacuum Pump': { id: '184101', name: 'Hydraulic Pumps' },
  'Condensate Pump': { id: '184101', name: 'Hydraulic Pumps' },

  // ==================== VALVES - INDUSTRIAL ====================
  'Ball Valve': { id: '260291', name: 'Solenoid Valves & Coils' },
  'Butterfly Valve': { id: '260291', name: 'Solenoid Valves & Coils' },
  'Check Valve': { id: '260291', name: 'Solenoid Valves & Coils' },
  'Globe Valve': { id: '260291', name: 'Solenoid Valves & Coils' },
  'Gate Valve': { id: '260291', name: 'Solenoid Valves & Coils' },
  'Relief Valve': { id: '260291', name: 'Solenoid Valves & Coils' },
  'Pressure Relief Valve': { id: '260291', name: 'Solenoid Valves & Coils' },
  'Safety Valve': { id: '260291', name: 'Solenoid Valves & Coils' },
  'Control Valve': { id: '260291', name: 'Solenoid Valves & Coils' },
  'Needle Valve': { id: '260291', name: 'Solenoid Valves & Coils' },
  'Float Valve': { id: '260291', name: 'Solenoid Valves & Coils' },
  'Gas Valve': { id: '260291', name: 'Solenoid Valves & Coils' },
  'Steam Valve': { id: '260291', name: 'Solenoid Valves & Coils' },

  // ==================== TIMERS & COUNTERS ====================
  'Timer': { id: '181682', name: 'Industrial Timers' },
  'Digital Timer': { id: '181682', name: 'Industrial Timers' },
  'Analog Timer': { id: '181682', name: 'Industrial Timers' },
  'Counter': { id: '181682', name: 'Industrial Timers' },
  'Digital Counter': { id: '181682', name: 'Industrial Timers' },
  'Totalizer': { id: '181682', name: 'Industrial Timers' },
  'Tachometer': { id: '181682', name: 'Industrial Timers' },

  // ==================== TEMPERATURE CONTROLS ====================
  'Temperature Controller': { id: '181684', name: 'Temperature Controllers' },
  'PID Controller': { id: '181684', name: 'Temperature Controllers' },
  'Process Controller': { id: '181684', name: 'Temperature Controllers' },
  'Heater': { id: '181684', name: 'Temperature Controllers' },
  'Heater Band': { id: '181684', name: 'Temperature Controllers' },
  'Cartridge Heater': { id: '181684', name: 'Temperature Controllers' },

  // ==================== PANEL METERS & GAUGES ====================
  'Panel Meter': { id: '181683', name: 'Panel Meters' },
  'Digital Panel Meter': { id: '181683', name: 'Panel Meters' },
  'Ammeter': { id: '181683', name: 'Panel Meters' },
  'Voltmeter': { id: '181683', name: 'Panel Meters' },
  'Wattmeter': { id: '181683', name: 'Panel Meters' },
  'Gauge': { id: '181683', name: 'Panel Meters' },
  'Pressure Gauge': { id: '181683', name: 'Panel Meters' },
  'Temperature Gauge': { id: '181683', name: 'Panel Meters' },

  // ==================== MISC ====================
  'Fan': { id: '181744', name: 'Sensors' },
  'Blower': { id: '181744', name: 'Sensors' },
  'Cooling Fan': { id: '181744', name: 'Sensors' },
  'Industrial Computer': { id: '181744', name: 'Sensors' },
  'Industrial PC': { id: '181744', name: 'Sensors' },
  'Panel PC': { id: '181744', name: 'Sensors' },
  'Cable': { id: '181744', name: 'Sensors' },
  'Cordset': { id: '181744', name: 'Sensors' },
  'Cord Set': { id: '181744', name: 'Sensors' },
  'Connector': { id: '181744', name: 'Sensors' },
  'Sensor Cable': { id: '181744', name: 'Sensors' },
  'Motor Cable': { id: '181744', name: 'Sensors' },
  'Encoder Cable': { id: '181744', name: 'Sensors' },
};

// ============================================================================
// PRODUCT TYPE TO EBAY STORE CATEGORY MAPPING
// Maps AI-detected product type to YOUR eBay Store Category IDs
// ============================================================================

const PRODUCT_TYPE_TO_STORE_CATEGORY = {
  // AUTOMATION CONTROL
  'PLC': '5404089015', 'PLC Processor': '5404089015', 'PLC CPU': '5404089015',
  'PLC Chassis': '5404089015', 'PLC Rack': '5404089015',
  'PLC Power Supply': '2242362015', 'PLC I/O Module': '18373835',
  'I/O Module': '18373835', 'Input Module': '18373835', 'Output Module': '18373835',
  'Communication Module': '18373835', 'Network Module': '18373835',
  'HMI': '6686264015', 'Touch Panel': '6686264015', 'Operator Interface': '6686264015',
  'Operator Panel': '6686264015', 'Touch Screen': '6686264015',
  'Power Supply': '2242362015', 'Switching Power Supply': '2242362015',
  'DC Power Supply': '2242362015', 'AC Power Supply': '2242362015',
  'Industrial Power Supply': '2242362015', 'DIN Rail Power Supply': '2242362015',
  // MOTORS
  'Servo Motor': '393389015', 'AC Servo Motor': '393389015',
  'DC Servo Motor': '393389015', 'Brushless Servo Motor': '393389015',
  'Stepper Motor': '17167471', 'Step Motor': '17167471', 'Stepping Motor': '17167471',
  'Electric Motor': '17167471', 'AC Motor': '17167471', 'Induction Motor': '17167471',
  'Three Phase Motor': '17167471', 'Single Phase Motor': '17167471',
  'DC Motor': '17167471', 'Brushless DC Motor': '17167471', 'BLDC Motor': '17167471',
  'Gearmotor': '17167471', 'Gear Motor': '17167471', 'Geared Motor': '17167471',
  // DRIVES
  'Servo Drive': '393390015', 'Servo Amplifier': '393390015', 'Servo Controller': '393390015',
  'VFD': '2242358015', 'Variable Frequency Drive': '2242358015',
  'AC Drive': '2242358015', 'Inverter': '2242358015', 'Frequency Inverter': '2242358015',
  'DC Drive': '6688299015', 'DC Motor Drive': '6688299015',
  'SCR Drive': '6688299015', 'SCR Controller': '6688299015',
  'Stepper Drive': '393390015', 'Stepper Controller': '393390015', 'Step Drive': '393390015',
  'Encoder': '1802953015', 'Rotary Encoder': '1802953015',
  'Incremental Encoder': '1802953015', 'Absolute Encoder': '1802953015',
  'Shaft Encoder': '1802953015', 'Hollow Shaft Encoder': '1802953015',
  'Linear Encoder': '1802953015', 'Magnetic Encoder': '1802953015', 'Resolver': '1802953015',
  // ELECTRICAL
  'Circuit Breaker': '5634105015', 'Molded Case Circuit Breaker': '5634105015',
  'MCCB': '5634105015', 'Miniature Circuit Breaker': '5634105015', 'MCB': '5634105015',
  'Disconnect Switch': '20338717', 'Disconnect': '20338717', 'Safety Switch': '20338717',
  'Fuse': '18373807', 'Fuse Holder': '18373807', 'Fuse Block': '18373807',
  'Transformer': '5634104015', 'Control Transformer': '5634104015',
  'Isolation Transformer': '5634104015', 'Step Down Transformer': '5634104015',
  'Enclosure': '18373801', 'Electrical Enclosure': '18373801',
  'Junction Box': '18373801', 'Control Panel': '18373801',
  // INDUSTRIAL CONTROL
  'Contactor': '2348910015', 'AC Contactor': '2348910015', 'DC Contactor': '2348910015',
  'Motor Starter': '2348910015', 'Soft Starter': '2348910015',
  'DOL Starter': '2348910015', 'Motor Protector': '2348910015', 'Overload Relay': '2348910015',
  'Relay': '2242359015', 'Control Relay': '2242359015',
  'Ice Cube Relay': '2242359015', 'Plug-in Relay': '2242359015',
  'Safety Relay': '2464037015', 'Safety Controller': '2464037015',
  'Safety Interlock': '2464037015', 'Safety Door Switch': '2464037015', 'Safety Mat': '2464037015',
  'Solid State Relay': '2242359015', 'SSR': '2242359015',
  'Time Delay Relay': '18373798', 'Timer': '18373798',
  'Digital Timer': '18373798', 'Analog Timer': '18373798',
  'Counter': '18373799', 'Digital Counter': '18373799',
  'Totalizer': '18373799', 'Tachometer': '18373799',
  // SWITCHES
  'Limit Switch': '4173745015', 'Micro Switch': '4173752015', 'Miniature Switch': '4173752015',
  'Push Button': '4173735015', 'Pushbutton': '4173735015', 'Pushbutton Switch': '4173735015',
  'E-Stop': '4173756015', 'Emergency Stop': '4173756015',
  'Selector Switch': '4173742015', 'Rotary Switch': '4173742015',
  'Toggle Switch': '6688149015', 'Key Switch': '4173738015',
  'Foot Switch': '4173739015', 'Palm Switch': '4173743015',
  'Joystick': '4173758015', 'Pendant': '6688149015', 'Pendant Control': '6688149015',
  'Pilot Light': '2464042015', 'Indicator Light': '2464042015',
  'Stack Light': '6690583015', 'Tower Light': '6690583015', 'Signal Light': '6690583015',
  // TEMPERATURE
  'Temperature Controller': '2461872015', 'PID Controller': '2461872015',
  'Process Controller': '2461872015',
  'Heater': '6688149015', 'Heater Band': '6688149015', 'Cartridge Heater': '6688149015',
  // METERS
  'Panel Meter': '5634088015', 'Digital Panel Meter': '5634088015',
  'Ammeter': '5634088015', 'Voltmeter': '5634088015', 'Wattmeter': '5634088015',
  'Gauge': '1484016015', 'Pressure Gauge': '1484016015', 'Temperature Gauge': '1484016015',
  // SENSING
  'Proximity Sensor': '4173791015', 'Inductive Proximity Sensor': '4173791015',
  'Inductive Sensor': '4173791015', 'Capacitive Proximity Sensor': '4173791015',
  'Capacitive Sensor': '4173791015', 'Magnetic Proximity Sensor': '4173791015',
  'Photoelectric Sensor': '4173793015', 'Photo Sensor': '4173793015',
  'Optical Sensor': '4173793015', 'Through Beam Sensor': '4173793015',
  'Retroreflective Sensor': '4173793015', 'Diffuse Sensor': '4173793015',
  'Fiber Optic Sensor': '5785856015', 'Fiber Optic Amplifier': '5785856015',
  'Pressure Sensor': '6690386015', 'Pressure Transducer': '6690386015',
  'Pressure Transmitter': '6690386015',
  'Temperature Sensor': '6690556015', 'Thermocouple': '6690556015',
  'RTD': '6690556015', 'Temperature Probe': '6690556015',
  'Flow Sensor': '4173798015', 'Flow Meter': '4173798015', 'Flow Switch': '4173798015',
  'Level Sensor': '4173792015', 'Level Switch': '4173792015',
  'Float Switch': '4173792015', 'Ultrasonic Sensor': '4173792015',
  'Laser Sensor': '2479732015', 'Laser Distance Sensor': '2479732015',
  'Color Sensor': '4173796015', 'Color Mark Sensor': '4173796015',
  'Vision Sensor': '6686267015', 'Vision System': '6686267015', 'Camera': '6686267015',
  'Current Sensor': '4173797015', 'Current Transformer': '4173797015',
  'Load Cell': '5436340015', 'Force Sensor': '5436340015',
  'Linear Sensor': '5634087015', 'Position Sensor': '5634087015', 'LVDT': '5634087015',
  'Light Curtain': '393379015', 'Safety Light Curtain': '393379015',
  'Safety Barrier': '393379015', 'Safety Scanner': '393379015', 'Area Scanner': '393379015',
  'Barcode Scanner': '6690176015', 'Barcode Reader': '6690176015',
  'Bar Code Scanner': '6690176015', 'QR Code Reader': '6690176015', '2D Scanner': '6690176015',
  'RFID Reader': '6695702015', 'RFID Antenna': '6695702015', 'RFID Tag': '6695702015',
  // BEARINGS
  'Bearing': '6690505015', 'Ball Bearing': '4173714015', 'Roller Bearing': '4173168015',
  'Tapered Roller Bearing': '4173167015', 'Needle Bearing': '4173171015',
  'Thrust Bearing': '4173169015', 'Pillow Block': '4173166015',
  'Pillow Block Bearing': '4173166015', 'Flange Bearing': '4173165015',
  'Cam Follower': '4173170015', 'Linear Bearing': '4173713015', 'Linear Bushing': '4173713015',
  // POWER TRANSMISSION
  'Gearbox': '6688332015', 'Gear Reducer': '6688332015', 'Speed Reducer': '6688332015',
  'Worm Gear': '6688332015', 'Planetary Gearbox': '6688332015',
  'Helical Gearbox': '6688332015', 'Right Angle Gearbox': '6688332015',
  'Ball Screw': '6690432015', 'Ball Screw Assembly': '6690432015',
  'Ball Nut': '6690432015', 'Lead Screw': '6690432015',
  'Linear Actuator': '6690433015', 'Electric Linear Actuator': '6690433015',
  'Linear Stage': '6690433015', 'Linear Module': '6690433015',
  'Linear Guide': '6690434015', 'Linear Rail': '6690434015', 'Linear Slide': '6690434015',
  'Rail Block': '6690434015', 'Carriage': '6690434015',
  'Belt': '6688333015', 'Timing Belt': '6688333015', 'V-Belt': '6688333015',
  'Pulley': '6688333015', 'Timing Pulley': '6688333015',
  'Sprocket': '6688334015', 'Chain': '6688335015', 'Roller Chain': '6688335015',
  'Brake': '6688331015', 'Motor Brake': '6688331015', 'Electromagnetic Brake': '6688331015',
  'Clutch': '393386015', 'Electromagnetic Clutch': '393386015', 'Clutch Brake': '393386015',
  // PNEUMATICS
  'Pneumatic Cylinder': '2461873015', 'Air Cylinder': '2461873015',
  'Compact Cylinder': '2461873015', 'Round Cylinder': '2461873015',
  'ISO Cylinder': '2461873015', 'NFPA Cylinder': '2461873015',
  'Rodless Cylinder': '2461873015', 'Guided Cylinder': '2461873015',
  'Slide Cylinder': '2461873015', 'Rotary Cylinder': '2461873015',
  'Pneumatic Actuator': '2461878015', 'Pneumatic Gripper': '6699359015',
  'Gripper': '6699359015', 'Parallel Gripper': '6699359015', 'Angular Gripper': '6699359015',
  'Pneumatic Valve': '2461874015', 'Solenoid Valve': '6690468015',
  'Air Valve': '2461874015', 'Directional Valve': '2461874015',
  'Manifold': '2461874015', 'Valve Manifold': '2461874015', 'Valve Terminal': '2461874015',
  'Air Regulator': '2461875015', 'Pressure Regulator': '2461875015',
  'Filter Regulator': '2461875015', 'FRL Unit': '2461875015', 'FRL': '2461875015',
  'Air Filter': '2461880015', 'Compressed Air Filter': '2461880015', 'Coalescing Filter': '2461880015',
  'Lubricator': '2461876015', 'Air Lubricator': '2461876015',
  'Air Dryer': '2461877015', 'Muffler': '6690373015', 'Silencer': '6690373015',
  // HYDRAULICS
  'Hydraulic Cylinder': '6696061015', 'Hydraulic Ram': '6696061015',
  'Hydraulic Actuator': '6696062015', 'Hydraulic Valve': '6696060015',
  'Directional Control Valve': '6696060015', 'Proportional Valve': '6696060015',
  'Servo Valve': '6696060015', 'Hydraulic Pump': '6696064015',
  'Gear Pump': '6696064015', 'Vane Pump': '6696064015', 'Piston Pump': '6696064015',
  'Hydraulic Motor': '6689962015', 'Hydraulic Power Unit': '6696064015', 'HPU': '6696064015',
  'Hydraulic Accumulator': '6696063015', 'Accumulator': '6696063015',
  'Hydraulic Filter': '2343163015',
  // PUMPS
  'Pump': '6689959015', 'Centrifugal Pump': '6689968015',
  'Diaphragm Pump': '6689969015', 'Metering Pump': '6689970015',
  'Dosing Pump': '6689970015', 'Vacuum Pump': '6689967015', 'Condensate Pump': '6689971015',
  // VALVES
  'Ball Valve': '6690466015', 'Butterfly Valve': '6690465015',
  'Check Valve': '6690467015', 'Globe Valve': '6690472015', 'Gate Valve': '6690464015',
  'Relief Valve': '6690486015', 'Pressure Relief Valve': '6690486015',
  'Safety Valve': '6690486015', 'Control Valve': '6690464015', 'Needle Valve': '6690464015',
  'Float Valve': '6690474015', 'Gas Valve': '6690469015', 'Steam Valve': '6690473015',
  // MISC
  'Cable': '1856435015', 'Cordset': '1856435015', 'Cord Set': '1856435015',
  'Connector': '1856435015', 'Sensor Cable': '1856435015',
  'Motor Cable': '1856435015', 'Encoder Cable': '1856435015',
  'Fan': '2457884015', 'Blower': '2457884015', 'Cooling Fan': '2457884015',
  'Industrial Computer': '19438754015', 'Industrial PC': '19438754015',
  'Panel PC': '19438754015',
};

const ALL_PRODUCTS_STORE_CATEGORY = '23399313015';

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
// CATEGORY FIELD DEFINITIONS WITH ALLOWED VALUES
// These tell the AI EXACTLY which eBay field names to use and what values are valid
// Field names are the SureDone inline field names (lowercase, no spaces)
// This is what makes specs land in eBay's "Recommended" section vs "Dynamic"
// ============================================================================

const CATEGORY_FIELD_DEFINITIONS = {

  // ========== ELECTRIC MOTORS - eBay 181732 ==========
  '181732': {
    name: 'Electric Motors',
    fields: {
      ratedloadhp: { label: 'Rated Load (HP)', values: ['1/4','1/3','1/2','3/4','1','1 1/2','2','3','5','7 1/2','10','15','20','25','30','40','50','60','75','100','125','150','200','250','300'] },
      baserpm: { label: 'Base RPM', values: ['900','1200','1725','1750','1800','3450','3500','3600'] },
      acphase: { label: 'AC Phase', values: ['1-Phase','3-Phase'] },
      nominalratedinputvoltage: { label: 'Input Voltage', values: ['12V','24V','115V','115/208-230V','115/230V','200V','208V','208-230V','208-230/460V','230V','230/460V','460V','575V'] },
      acfrequencyrating: { label: 'AC Frequency', values: ['50 Hz','60 Hz','50/60 Hz'] },
      enclosuretype: { label: 'Enclosure Type', values: ['ODP','TEFC','TENV','TEAO','TEBC','TEPV','Explosion Proof','Washdown'] },
      acmotortype: { label: 'AC Motor Type', values: ['AC Induction','Capacitor Start','Capacitor Start/Capacitor Run','Permanent Split Capacitor','Shaded Pole','Split Phase','Synchronous','Universal'] },
      servicefactor: { label: 'Service Factor', values: ['1.0','1.15','1.25','1.35','1.4','1.5'] },
      iecframesize: { label: 'Frame Size', values: ['42','48','56','56C','56H','143T','145T','182T','184T','213T','215T','254T','256T','284T','286T','324T','326T','364T','365T','404T','405T','444T','445T'] },
      nemaframesuffix: { label: 'NEMA Frame Suffix', values: ['C','D','H','J','JM','JP','S','T','TC','U','Z'] },
      nemadesignletter: { label: 'NEMA Design Letter', values: ['A','B','C','D'] },
      insulationclass: { label: 'Insulation Class', values: ['A','B','F','H'] },
      mountingtype: { label: 'Mounting Type', values: ['Foot Mounted','C-Face','D-Flange','Foot & C-Face','Foot & D-Flange','Vertical'] },
      shaftdiameter: { label: 'Shaft Diameter' },
      fullloadamps: { label: 'Full Load Amps' },
      currenttype: { label: 'Current Type', values: ['AC','DC','AC/DC'] },
      invertervectordutyrating: { label: 'Inverter/Vector Duty', values: ['Inverter Duty','Vector Duty','Not Rated'] },
      iprating: { label: 'IP Rating', values: ['IP44','IP54','IP55','IP56','IP65','IP66','IP67','IP68','IP69K'] },
      countryoforigin: { label: 'Country of Origin' }
    }
  },

  // ========== SERVO MOTORS - eBay 124603 ==========
  '124603': {
    name: 'Servo Motors',
    fields: {
      ratedtorque: { label: 'Rated Torque' },
      ratedspeed: { label: 'Rated Speed (RPM)' },
      ratedpower: { label: 'Rated Power (kW)' },
      nominalratedinputvoltage: { label: 'Input Voltage', values: ['100V','200V','230V','400V','480V'] },
      encodertype: { label: 'Encoder Type', values: ['Absolute','Incremental','Resolver'] },
      shaftdiameter: { label: 'Shaft Diameter' },
      framesize: { label: 'Frame Size' },
      braketype: { label: 'Brake', values: ['With Brake','Without Brake'] },
      iprating: { label: 'IP Rating', values: ['IP54','IP55','IP65','IP67'] },
      communicationstandard: { label: 'Communication', values: ['Analog','CANopen','EtherCAT','EtherNet/IP','Modbus','Profinet','Pulse/Direction'] },
      countryoforigin: { label: 'Country of Origin' }
    }
  },

  // ========== STEPPER MOTORS - eBay 9723 ==========
  '9723': {
    name: 'Stepper Motors',
    fields: {
      stepangle: { label: 'Step Angle', values: ['0.9°','1.8°','3.6°','7.5°','15°'] },
      holdingtorque: { label: 'Holding Torque' },
      ratedcurrent: { label: 'Rated Current' },
      framesize: { label: 'Frame Size (NEMA)', values: ['NEMA 8','NEMA 11','NEMA 14','NEMA 17','NEMA 23','NEMA 24','NEMA 34','NEMA 42'] },
      numberofphases: { label: 'Number of Phases', values: ['2-Phase','3-Phase','5-Phase'] },
      leadwires: { label: 'Lead Wires', values: ['4-Wire','6-Wire','8-Wire'] },
      shaftdiameter: { label: 'Shaft Diameter' },
      shafttype: { label: 'Shaft Type', values: ['Single Shaft','Dual Shaft','Hollow Shaft'] },
      nominalratedinputvoltage: { label: 'Rated Voltage' },
      countryoforigin: { label: 'Country of Origin' }
    }
  },

  // ========== SERVO DRIVES - eBay 78191 ==========
  '78191': {
    name: 'Servo Drives',
    fields: {
      outputcurrent: { label: 'Output Current (Continuous)' },
      peakcurrent: { label: 'Peak Current' },
      outputpower: { label: 'Output Power (kW)' },
      nominalratedinputvoltage: { label: 'Input Voltage', values: ['100-120V','200-240V','380-480V'] },
      communicationstandard: { label: 'Communication', values: ['Analog','CANopen','DeviceNet','EtherCAT','EtherNet/IP','Modbus','Profinet','Pulse/Direction','MECHATROLINK'] },
      feedbacktype: { label: 'Feedback Type', values: ['Encoder','Resolver','Hall Effect'] },
      axiscount: { label: 'Number of Axes', values: ['Single Axis','Dual Axis','Multi-Axis'] },
      countryoforigin: { label: 'Country of Origin' }
    }
  },

  // ========== VFDs - eBay 78192 ==========
  '78192': {
    name: 'Variable Frequency Drives',
    fields: {
      horsepowerrating: { label: 'HP Rating', values: ['1/4','1/2','3/4','1','1.5','2','3','5','7.5','10','15','20','25','30','40','50','60','75','100','125','150','200','250','300','350','400','500'] },
      kwrating: { label: 'kW Rating' },
      nominalratedinputvoltage: { label: 'Input Voltage', values: ['115V','208V','230V','460V','575V'] },
      acphase: { label: 'Input Phase', values: ['1-Phase','3-Phase'] },
      outputphase: { label: 'Output Phase', values: ['3-Phase'] },
      outputfrequencyrange: { label: 'Output Frequency Range' },
      outputcurrent: { label: 'Output Current' },
      communicationstandard: { label: 'Communication', values: ['BACnet','DeviceNet','EtherNet/IP','Modbus','Profibus','Profinet'] },
      enclosuretype: { label: 'Enclosure', values: ['IP20','IP21','IP55','IP66','NEMA 1','NEMA 4X','NEMA 12'] },
      countryoforigin: { label: 'Country of Origin' }
    }
  },

  // ========== DC DRIVES / SCR CONTROLLERS - eBay 78190 ==========
  '78190': {
    name: 'DC Drives',
    fields: {
      controlmethod: { label: 'Control Method', values: ['SCR','IGBT','Thyristor','PWM'] },
      horsepowerrating: { label: 'HP Rating' },
      outputcurrent: { label: 'Output Current' },
      nominalratedinputvoltage: { label: 'Input Voltage', values: ['115V','230V','460V','575V'] },
      acphase: { label: 'Input Phase', values: ['1-Phase','3-Phase'] },
      outputvoltage: { label: 'DC Output Voltage' },
      feedbacktype: { label: 'Feedback Type', values: ['Armature Voltage','Encoder','Tachometer'] },
      communicationstandard: { label: 'Communication', values: ['Analog','DeviceNet','EtherNet/IP','Modbus','Profibus'] },
      enclosuretype: { label: 'Enclosure', values: ['Chassis','NEMA 1','NEMA 4X','NEMA 12'] },
      countryoforigin: { label: 'Country of Origin' }
    }
  },

  // ========== STEPPER DRIVES - eBay 71394 ==========
  '71394': {
    name: 'Stepper Drives',
    fields: {
      nominalratedinputvoltage: { label: 'Input Voltage' },
      outputcurrent: { label: 'Output Current (per phase)' },
      microsteppingresolution: { label: 'Microstepping Resolution' },
      steppercompatibility: { label: 'Compatible Motor Frame' },
      communicationstandard: { label: 'Communication', values: ['Pulse/Direction','CANopen','EtherCAT','Modbus','RS-485'] },
      countryoforigin: { label: 'Country of Origin' }
    }
  },

  // ========== PLC PROCESSORS - eBay 181708 ==========
  '181708': {
    name: 'PLC Processors',
    fields: {
      controllerplatform: { label: 'Platform/Series' },
      communicationstandard: { label: 'Communication', values: ['DeviceNet','EtherNet/IP','Ethernet','Modbus','Profibus','Profinet','RS-232','RS-485','Serial','USB'] },
      nominalratedinputvoltage: { label: 'Input Voltage', values: ['12V DC','24V DC','100-240V AC','120V AC','240V AC'] },
      numberofiopoints: { label: 'I/O Points' },
      memorysize: { label: 'Memory Size' },
      programmingmethod: { label: 'Programming', values: ['Ladder Logic','Function Block','Structured Text','Sequential Function Chart'] },
      countryoforigin: { label: 'Country of Origin' }
    }
  },

  // ========== PLC I/O MODULES - eBay 181714 ==========
  '181714': {
    name: 'PLC I/O Modules',
    fields: {
      controllerplatform: { label: 'Platform/Series' },
      moduletype: { label: 'Module Type', values: ['Digital Input','Digital Output','Analog Input','Analog Output','Combo I/O','Communication','Counter','Encoder'] },
      numberofchannels: { label: 'Number of Channels' },
      nominalratedinputvoltage: { label: 'Input Voltage', values: ['5V DC','12V DC','24V DC','120V AC','240V AC'] },
      communicationstandard: { label: 'Communication', values: ['DeviceNet','EtherNet/IP','Profibus','Profinet','Modbus','RS-232','RS-485'] },
      countryoforigin: { label: 'Country of Origin' }
    }
  },

  // ========== HMIs - eBay 181709 ==========
  '181709': {
    name: 'HMI Panels',
    fields: {
      displayscreensize: { label: 'Screen Size', values: ['4"','5.7"','7"','10"','12"','15"','19"','21"'] },
      displaytype: { label: 'Display Type', values: ['Color TFT','Monochrome','Touchscreen','Touch + Keypad'] },
      displayresolution: { label: 'Display Resolution' },
      communicationstandard: { label: 'Communication', values: ['Ethernet','EtherNet/IP','Modbus','Profinet','RS-232','RS-485','Serial','USB'] },
      nominalratedinputvoltage: { label: 'Input Voltage', values: ['12V DC','24V DC','100-240V AC'] },
      memorysize: { label: 'Memory' },
      countryoforigin: { label: 'Country of Origin' }
    }
  },

  // ========== POWER SUPPLIES - eBay 181925 ==========
  '181925': {
    name: 'Power Supplies',
    fields: {
      outputvoltage: { label: 'Output Voltage', values: ['5V DC','12V DC','24V DC','48V DC'] },
      outputcurrent: { label: 'Output Current' },
      outputpower: { label: 'Output Power (Watts)' },
      inputvoltagerange: { label: 'Input Voltage', values: ['100-120V AC','200-240V AC','100-240V AC','380-480V AC'] },
      acphase: { label: 'AC Phase', values: ['1-Phase','3-Phase'] },
      mountingtype: { label: 'Mounting Type', values: ['DIN Rail','Panel Mount','Chassis','Open Frame'] },
      countryoforigin: { label: 'Country of Origin' }
    }
  },

  // ========== CIRCUIT BREAKERS - eBay 185134 ==========
  '185134': {
    name: 'Circuit Breakers',
    fields: {
      numberofpoles: { label: 'Number of Poles', values: ['1','2','3','4'] },
      currentrating: { label: 'Current Rating (Amps)' },
      voltagerating: { label: 'Voltage Rating' },
      interruptingrating: { label: 'Interrupting Rating (kA)' },
      breakertype: { label: 'Breaker Type', values: ['Molded Case','Miniature','Motor Circuit Protector','GFCI','AFCI'] },
      tripcurve: { label: 'Trip Curve', values: ['B','C','D','K','Thermal-Magnetic','Electronic'] },
      frametype: { label: 'Frame Type' },
      countryoforigin: { label: 'Country of Origin' }
    }
  },

  // ========== CONTACTORS - eBay 181680 ==========
  '181680': {
    name: 'Contactors',
    fields: {
      numberofpoles: { label: 'Number of Poles', values: ['1','2','3','4'] },
      coilvoltage: { label: 'Coil Voltage', values: ['24V AC','24V DC','110V AC','120V AC','208V AC','220V AC','240V AC','277V AC','480V AC'] },
      fullloadamps: { label: 'Full Load Amps' },
      auxiliarycontacts: { label: 'Auxiliary Contacts' },
      nemasize: { label: 'NEMA Size', values: ['00','0','1','2','3','4','5'] },
      iecrating: { label: 'IEC Rating' },
      countryoforigin: { label: 'Country of Origin' }
    }
  },

  // ========== MOTOR STARTERS - eBay 181681 ==========
  '181681': {
    name: 'Motor Starters',
    fields: {
      startertype: { label: 'Starter Type', values: ['Full Voltage','Soft Starter','Combination','Manual'] },
      horsepowerrating: { label: 'HP Rating' },
      coilvoltage: { label: 'Coil Voltage', values: ['24V AC','24V DC','120V AC','208V AC','240V AC','480V AC'] },
      currentrating: { label: 'Current Rating (FLA)' },
      overloadrange: { label: 'Overload Range' },
      nemasize: { label: 'NEMA Size', values: ['00','0','1','2','3','4','5'] },
      nominalratedinputvoltage: { label: 'Input Voltage', values: ['120V','208V','230V','460V','575V'] },
      countryoforigin: { label: 'Country of Origin' }
    }
  },

  // ========== GENERAL PURPOSE RELAYS - eBay 36328 ==========
  '36328': {
    name: 'General Purpose Relays',
    fields: {
      coilvoltage: { label: 'Coil Voltage', values: ['12V DC','24V DC','24V AC','120V AC','240V AC'] },
      contactconfiguration: { label: 'Contact Configuration', values: ['SPDT','DPDT','3PDT','4PDT'] },
      contactrating: { label: 'Contact Rating' },
      sockettype: { label: 'Socket Type' },
      countryoforigin: { label: 'Country of Origin' }
    }
  },

  // ========== SAFETY RELAYS - eBay 65464 ==========
  '65464': {
    name: 'Safety Relays',
    fields: {
      safetyrating: { label: 'Safety Rating', values: ['SIL 1','SIL 2','SIL 3','Cat 1','Cat 2','Cat 3','Cat 4','PLa','PLb','PLc','PLd','PLe'] },
      inputtype: { label: 'Input Type', values: ['E-Stop','Light Curtain','Safety Gate','Two-Hand','Universal'] },
      nominalratedinputvoltage: { label: 'Input Voltage', values: ['24V DC','24V AC','120V AC','240V AC'] },
      numberofcontacts: { label: 'Safety Contacts' },
      communicationstandard: { label: 'Communication' },
      countryoforigin: { label: 'Country of Origin' }
    }
  },

  // ========== SOLID STATE RELAYS - eBay 65454 ==========
  '65454': {
    name: 'Solid State Relays',
    fields: {
      loadcurrentrating: { label: 'Load Current Rating' },
      loadvoltagerating: { label: 'Load Voltage Rating' },
      controlvoltage: { label: 'Control Voltage' },
      outputtype: { label: 'Output Type', values: ['AC','DC','AC/DC'] },
      zerocrossswitching: { label: 'Switching Type', values: ['Zero Cross','Random Turn-On','Instant On'] },
      countryoforigin: { label: 'Country of Origin' }
    }
  },

  // ========== PROXIMITY SENSORS - eBay 65459 ==========
  '65459': {
    name: 'Proximity Sensors',
    fields: {
      sensortype: { label: 'Sensor Type', values: ['Inductive','Capacitive','Magnetic','Ultrasonic'] },
      sensingdistance: { label: 'Sensing Distance' },
      outputtype: { label: 'Output Type', values: ['PNP','NPN','PNP/NPN','Analog','Relay'] },
      outputconfiguration: { label: 'Output Config', values: ['NO','NC','NO/NC'] },
      nominalratedinputvoltage: { label: 'Input Voltage', values: ['10-30V DC','12-24V DC','20-250V AC','20-264V AC/DC'] },
      housingmaterial: { label: 'Housing Material', values: ['Brass','Nickel Plated Brass','Plastic','Stainless Steel'] },
      housingdiameter: { label: 'Housing Diameter' },
      connectiontype: { label: 'Connection', values: ['Cable','Connector','M8','M12'] },
      iprating: { label: 'IP Rating', values: ['IP65','IP67','IP68','IP69K'] },
      countryoforigin: { label: 'Country of Origin' }
    }
  },

  // ========== PHOTOELECTRIC SENSORS - eBay 181786 ==========
  '181786': {
    name: 'Photoelectric Sensors',
    fields: {
      sensingmethod: { label: 'Sensing Method', values: ['Through Beam','Retro-Reflective','Diffuse','Background Suppression','Fiber Optic'] },
      sensingdistance: { label: 'Sensing Distance' },
      lightsource: { label: 'Light Source', values: ['Red LED','Infrared','Laser','White LED','Blue LED'] },
      outputtype: { label: 'Output Type', values: ['PNP','NPN','PNP/NPN','Relay'] },
      outputconfiguration: { label: 'Output Config', values: ['NO','NC','NO/NC'] },
      nominalratedinputvoltage: { label: 'Input Voltage', values: ['10-30V DC','12-24V DC','20-250V AC'] },
      connectiontype: { label: 'Connection', values: ['Cable','Connector','M8','M12'] },
      iprating: { label: 'IP Rating', values: ['IP65','IP67','IP68','IP69K'] },
      countryoforigin: { label: 'Country of Origin' }
    }
  },

  // ========== PRESSURE SENSORS - eBay 65456 ==========
  '65456': {
    name: 'Pressure Sensors',
    fields: {
      pressurerange: { label: 'Pressure Range' },
      pressuretype: { label: 'Pressure Type', values: ['Gauge','Absolute','Differential','Vacuum','Compound'] },
      outputsignal: { label: 'Output Signal', values: ['4-20mA','0-10V','0-5V','1-5V','Switch (PNP)','Switch (NPN)'] },
      processconnection: { label: 'Process Connection' },
      accuracy: { label: 'Accuracy' },
      nominalratedinputvoltage: { label: 'Input Voltage' },
      material: { label: 'Wetted Material', values: ['Stainless Steel 316L','Stainless Steel 304','Ceramic','Hastelloy'] },
      iprating: { label: 'IP Rating', values: ['IP65','IP67','IP68','IP69K'] },
      countryoforigin: { label: 'Country of Origin' }
    }
  },

  // ========== TEMPERATURE SENSORS - eBay 65460 ==========
  '65460': {
    name: 'Temperature Sensors',
    fields: {
      sensortype: { label: 'Sensor Type', values: ['Thermocouple','RTD','Thermistor','Infrared'] },
      thermocouplegrade: { label: 'TC Type', values: ['J','K','T','E','N','R','S','B'] },
      rtdtype: { label: 'RTD Type', values: ['Pt100','Pt1000','Ni120','Cu10'] },
      temperaturerange: { label: 'Temperature Range' },
      probelength: { label: 'Probe Length' },
      probediameter: { label: 'Probe Diameter' },
      connectiontype: { label: 'Connection Type' },
      accuracy: { label: 'Accuracy' },
      countryoforigin: { label: 'Country of Origin' }
    }
  },

  // ========== FLOW SENSORS - eBay 65457 ==========
  '65457': {
    name: 'Flow Sensors',
    fields: {
      flowtype: { label: 'Flow Type', values: ['Inline','Insertion','Clamp-On','Paddlewheel','Turbine','Magnetic','Ultrasonic','Vortex','Coriolis'] },
      flowrange: { label: 'Flow Range' },
      pipesize: { label: 'Pipe Size' },
      outputsignal: { label: 'Output Signal', values: ['4-20mA','0-10V','Pulse','Switch','Digital'] },
      processconnection: { label: 'Process Connection' },
      material: { label: 'Body Material' },
      maxpressure: { label: 'Max Pressure' },
      countryoforigin: { label: 'Country of Origin' }
    }
  },

  // ========== ENCODERS - eBay 65455 ==========
  '65455': {
    name: 'Rotary Encoders',
    fields: {
      encodertype: { label: 'Encoder Type', values: ['Incremental','Absolute Single-Turn','Absolute Multi-Turn'] },
      resolution: { label: 'Resolution (PPR or bits)' },
      outputtype: { label: 'Output Type', values: ['Push-Pull (HTL)','Line Driver (TTL)','Open Collector','SSI','BiSS','Analog Sin/Cos'] },
      communicationstandard: { label: 'Communication', values: ['SSI','BiSS','EtherCAT','Profinet','DeviceNet','CANopen'] },
      shaftdiameter: { label: 'Shaft Diameter' },
      shafttype: { label: 'Shaft Type', values: ['Solid Shaft','Hollow Shaft','Blind Hollow Shaft'] },
      nominalratedinputvoltage: { label: 'Input Voltage', values: ['5V DC','10-30V DC','12-24V DC'] },
      connectiontype: { label: 'Connection', values: ['Cable','Connector','M12','M23','MS'] },
      iprating: { label: 'IP Rating', values: ['IP54','IP64','IP65','IP67'] },
      countryoforigin: { label: 'Country of Origin' }
    }
  },

  // ========== TRANSFORMERS - eBay 116922 ==========
  '116922': {
    name: 'Transformers',
    fields: {
      kvarating: { label: 'KVA Rating' },
      primaryvoltage: { label: 'Primary Voltage' },
      secondaryvoltage: { label: 'Secondary Voltage' },
      acphase: { label: 'AC Phase', values: ['1-Phase','3-Phase'] },
      transformertype: { label: 'Transformer Type', values: ['Control','Distribution','Isolation','Step Down','Step Up','Buck-Boost','Auto'] },
      acfrequencyrating: { label: 'AC Frequency', values: ['50 Hz','60 Hz','50/60 Hz'] },
      countryoforigin: { label: 'Country of Origin' }
    }
  },

  // ========== PNEUMATIC CYLINDERS - eBay 184027 ==========
  '184027': {
    name: 'Pneumatic Cylinders',
    fields: {
      borediameter: { label: 'Bore Diameter' },
      strokelength: { label: 'Stroke Length' },
      cylindertype: { label: 'Cylinder Type', values: ['Double Acting','Single Acting','Compact','Guided','Rodless','Rotary'] },
      mountingtype: { label: 'Mounting Type', values: ['Clevis','Foot','Flange','Nose','Pivot','Trunnion','Through Hole','Tie Rod'] },
      operatingpressure: { label: 'Operating Pressure' },
      portsize: { label: 'Port Size' },
      magneticpiston: { label: 'Magnetic Piston', values: ['Yes','No'] },
      roddiameter: { label: 'Rod Diameter' },
      countryoforigin: { label: 'Country of Origin' }
    }
  },

  // ========== PNEUMATIC / SOLENOID VALVES - eBay 260291 ==========
  '260291': {
    name: 'Solenoid Valves',
    fields: {
      valvetype: { label: 'Valve Type', values: ['2-Way','3-Way','4-Way','5-Way','5/2','5/3','2/2','3/2'] },
      actuationtype: { label: 'Actuation Type', values: ['Solenoid','Pilot','Manual','Mechanical','Pneumatic','Spring Return'] },
      portsize: { label: 'Port Size' },
      nominalratedinputvoltage: { label: 'Coil Voltage', values: ['12V DC','24V DC','110V AC','120V AC','220V AC','240V AC'] },
      flowrate: { label: 'Flow Rate (Cv)' },
      bodymaterial: { label: 'Body Material', values: ['Aluminum','Brass','Stainless Steel','Plastic'] },
      maxpressure: { label: 'Max Pressure' },
      countryoforigin: { label: 'Country of Origin' }
    }
  },

  // ========== BEARINGS - eBay 181750 ==========
  '181750': {
    name: 'Bearings',
    fields: {
      bearingtype: { label: 'Bearing Type', values: ['Ball Bearing','Roller Bearing','Tapered Roller','Needle Bearing','Thrust Bearing','Angular Contact','Self-Aligning'] },
      borediameter: { label: 'Bore Diameter (ID)' },
      outerdiameter: { label: 'Outer Diameter (OD)' },
      width: { label: 'Width' },
      sealtype: { label: 'Seal Type', values: ['Open','Shielded (ZZ)','Sealed (2RS)','One Side Sealed'] },
      material: { label: 'Material', values: ['Chrome Steel','Stainless Steel','Ceramic','Hybrid Ceramic'] },
      precisionrating: { label: 'Precision Class', values: ['ABEC 1','ABEC 3','ABEC 5','ABEC 7','ABEC 9'] },
      bearingseries: { label: 'Series' },
      countryoforigin: { label: 'Country of Origin' }
    }
  },

  // ========== GEARBOXES - eBay 181772 ==========
  '181772': {
    name: 'Gearboxes / Speed Reducers',
    fields: {
      gearboxtype: { label: 'Gearbox Type', values: ['Worm','Helical','Planetary','Bevel','Cycloidal','Hypoid','Right Angle'] },
      gearratio: { label: 'Gear Ratio' },
      outputtorque: { label: 'Output Torque' },
      horsepowerrating: { label: 'HP Rating' },
      inputspeed: { label: 'Input Speed (RPM)' },
      outputspeed: { label: 'Output Speed (RPM)' },
      shaftorientation: { label: 'Shaft Orientation', values: ['Inline','Right Angle','Parallel'] },
      mountingtype: { label: 'Mounting Type' },
      shaftdiameter: { label: 'Output Shaft Diameter' },
      countryoforigin: { label: 'Country of Origin' }
    }
  },

  // ========== TEMPERATURE CONTROLLERS - eBay 181684 ==========
  '181684': {
    name: 'Temperature Controllers',
    fields: {
      controltype: { label: 'Control Type', values: ['PID','On/Off','Auto-Tune','Programmable'] },
      inputtype: { label: 'Input Type', values: ['Thermocouple','RTD','Analog','Universal'] },
      outputtype: { label: 'Output Type', values: ['Relay','SSR Driver','Analog 4-20mA','Analog 0-10V'] },
      displaytype: { label: 'Display', values: ['Digital','LED','LCD','No Display'] },
      panelcutout: { label: 'Panel Cutout', values: ['1/16 DIN','1/8 DIN','1/4 DIN','1/32 DIN','48x48mm','96x96mm'] },
      nominalratedinputvoltage: { label: 'Input Voltage', values: ['24V DC','100-240V AC','120V AC','240V AC'] },
      communicationstandard: { label: 'Communication', values: ['Modbus RTU','RS-485','Ethernet','USB'] },
      alarmnumberofoutputs: { label: 'Number of Outputs' },
      countryoforigin: { label: 'Country of Origin' }
    }
  },

  // ========== LIGHT CURTAINS - eBay 65465 ==========
  '65465': {
    name: 'Light Curtains',
    fields: {
      safetyrating: { label: 'Safety Rating', values: ['Type 2','Type 4','SIL 1','SIL 2','SIL 3','Cat 2','Cat 4','PLc','PLd','PLe'] },
      beamspacing: { label: 'Beam Spacing (Resolution)' },
      protectedheight: { label: 'Protected Height' },
      sensingrange: { label: 'Sensing Range' },
      numberofbeams: { label: 'Number of Beams' },
      responsetime: { label: 'Response Time' },
      nominalratedinputvoltage: { label: 'Input Voltage', values: ['12-24V DC','24V DC'] },
      connectiontype: { label: 'Connection Type' },
      iprating: { label: 'IP Rating', values: ['IP65','IP67','IP69K'] },
      countryoforigin: { label: 'Country of Origin' }
    }
  },

  // ========== HYDRAULIC VALVES - eBay 184113 ==========
  '184113': {
    name: 'Hydraulic Directional Control Valves',
    fields: {
      valvetype: { label: 'Valve Type', values: ['Directional','Proportional','Servo','Check','Relief','Flow Control','Pressure Reducing'] },
      maxpressure: { label: 'Max Pressure (PSI/Bar)' },
      flowrate: { label: 'Max Flow Rate (GPM)' },
      portsize: { label: 'Port Size' },
      actuationtype: { label: 'Actuation', values: ['Solenoid','Pilot','Manual','Proportional Solenoid'] },
      spooltype: { label: 'Spool Type' },
      nominalratedinputvoltage: { label: 'Coil Voltage', values: ['12V DC','24V DC','120V AC','240V AC'] },
      mountingtype: { label: 'Mounting', values: ['Subplate','Inline','Manifold','Cetop 3','Cetop 5'] },
      countryoforigin: { label: 'Country of Origin' }
    }
  },

  // ========== HYDRAULIC PUMPS - eBay 184101 ==========
  '184101': {
    name: 'Hydraulic Pumps',
    fields: {
      pumptype: { label: 'Pump Type', values: ['Gear','Vane','Axial Piston','Radial Piston','Internal Gear','External Gear'] },
      displacement: { label: 'Displacement (cc/rev)' },
      maxpressure: { label: 'Max Pressure (PSI/Bar)' },
      flowrate: { label: 'Flow Rate (GPM)' },
      shafttype: { label: 'Shaft Type', values: ['Keyed','Spline','SAE A','SAE B','SAE C'] },
      rotation: { label: 'Rotation', values: ['CW','CCW','Bi-Directional'] },
      mountingtype: { label: 'Mounting' },
      countryoforigin: { label: 'Country of Origin' }
    }
  },

  // ========== DISCONNECT SWITCHES - eBay 181679 ==========
  '181679': {
    name: 'Disconnect Switches',
    fields: {
      numberofpoles: { label: 'Number of Poles', values: ['2','3','4','6'] },
      currentrating: { label: 'Current Rating (Amps)' },
      voltagerating: { label: 'Voltage Rating' },
      enclosuretype: { label: 'Enclosure', values: ['NEMA 1','NEMA 3R','NEMA 4','NEMA 4X','NEMA 12'] },
      fusedunfused: { label: 'Fused/Unfused', values: ['Fusible','Non-Fusible'] },
      horsepower: { label: 'HP Rating' },
      countryoforigin: { label: 'Country of Origin' }
    }
  },

  // ========== PANEL METERS - eBay 181683 ==========
  '181683': {
    name: 'Panel Meters',
    fields: {
      metertype: { label: 'Meter Type', values: ['Ammeter','Voltmeter','Wattmeter','Frequency Meter','Multi-Function','Process Meter'] },
      displaytype: { label: 'Display Type', values: ['Digital LED','Digital LCD','Analog Needle'] },
      measurementrange: { label: 'Measurement Range' },
      panelcutout: { label: 'Panel Cutout Size' },
      nominalratedinputvoltage: { label: 'Supply Voltage', values: ['24V DC','100-240V AC','120V AC'] },
      communicationstandard: { label: 'Communication', values: ['Modbus','RS-485','Ethernet','Analog Output'] },
      countryoforigin: { label: 'Country of Origin' }
    }
  },

  // ========== TIMERS - eBay 181682 ==========
  '181682': {
    name: 'Industrial Timers',
    fields: {
      timertype: { label: 'Timer Type', values: ['On-Delay','Off-Delay','Repeat Cycle','Interval','Multi-Function','Star-Delta'] },
      timerange: { label: 'Time Range' },
      nominalratedinputvoltage: { label: 'Input Voltage', values: ['12V DC','24V DC','24V AC','120V AC','240V AC'] },
      outputtype: { label: 'Output Type', values: ['SPDT','DPDT','Solid State'] },
      mountingtype: { label: 'Mounting', values: ['DIN Rail','Panel Mount','Socket Mount','Plug-In'] },
      displaytype: { label: 'Display', values: ['Digital','Analog Dial','LED'] },
      countryoforigin: { label: 'Country of Origin' }
    }
  },

  // ========== LIMIT SWITCHES - eBay 181676 ==========
  '181676': {
    name: 'Limit Switches',
    fields: {
      actuatortype: { label: 'Actuator Type', values: ['Roller Lever','Adjustable Roller','Spring Rod','Wobble Stick','Plunger','Rotary'] },
      contactconfiguration: { label: 'Contact Config', values: ['1NO/1NC','2NO/2NC','1NO','1NC'] },
      currentrating: { label: 'Current Rating' },
      iprating: { label: 'IP Rating', values: ['IP65','IP66','IP67'] },
      nominalratedinputvoltage: { label: 'Voltage Rating' },
      countryoforigin: { label: 'Country of Origin' }
    }
  },

  // ========== PUSHBUTTON SWITCHES - eBay 181677 ==========
  '181677': {
    name: 'Pushbutton Switches',
    fields: {
      operatortype: { label: 'Operator Type', values: ['Flush','Extended','Mushroom','E-Stop','Illuminated','Selector','Key'] },
      contactblocks: { label: 'Contact Blocks' },
      color: { label: 'Color', values: ['Red','Green','Yellow','Blue','White','Black','Orange'] },
      operatingvoltage: { label: 'Lamp Voltage' },
      panelcutout: { label: 'Panel Cutout', values: ['22mm','30mm','16mm'] },
      iprating: { label: 'IP Rating', values: ['IP65','IP66','IP67','IP69K'] },
      countryoforigin: { label: 'Country of Origin' }
    }
  },

  // ========== FUSES - eBay 181678 ==========
  '181678': {
    name: 'Fuses',
    fields: {
      fusetype: { label: 'Fuse Type', values: ['Class CC','Class J','Class RK1','Class RK5','Class T','Class L','Midget','Blade'] },
      currentrating: { label: 'Current Rating (Amps)' },
      voltagerating: { label: 'Voltage Rating' },
      interruptingrating: { label: 'Interrupting Rating' },
      fusesize: { label: 'Fuse Size' },
      timedelay: { label: 'Time-Delay', values: ['Fast Acting','Time Delay','Dual Element'] },
      countryoforigin: { label: 'Country of Origin' }
    }
  },
};

// Helper: get field definitions for an eBay category ID
function getFieldDefsForCategory(categoryId) {
  return CATEGORY_FIELD_DEFINITIONS[categoryId] || null;
}

// ============================================================================
// BUILD THE AI PROMPT
// Combines product type identification with category-specific field guidance
// ============================================================================

function buildFieldGuide(categoryId) {
  const catDef = getFieldDefsForCategory(categoryId);
  if (!catDef) return '';

  let guide = `\nFIELD EXTRACTION GUIDE for ${catDef.name}:\n`;
  guide += `Use these EXACT field names in your specifications object:\n`;

  for (const [fieldName, fieldDef] of Object.entries(catDef.fields)) {
    if (fieldDef.values) {
      guide += `  "${fieldName}": MUST be one of: ${fieldDef.values.join(', ')}\n`;
    } else {
      guide += `  "${fieldName}": Extract from specs (${fieldDef.label})\n`;
    }
  }
  return guide;
}

// Build list of all valid product types for the AI prompt
function getProductTypeList() {
  // Deduplicate - many aliases map to same category
  const seen = new Set();
  const types = [];
  for (const type of Object.keys(PRODUCT_TYPE_TO_EBAY_CATEGORY)) {
    const cat = PRODUCT_TYPE_TO_EBAY_CATEGORY[type];
    const key = `${type}|${cat.id}`;
    if (!seen.has(key)) {
      seen.add(key);
      types.push(type);
    }
  }
  return types;
}

function buildProductPrompt(brand, partNumber) {
  // Build the product type list organized by category
  const typeList = `
**MOTORS:** Servo Motor, AC Servo Motor, DC Servo Motor, Stepper Motor, Electric Motor, AC Motor, DC Motor, Gearmotor, Induction Motor, Three Phase Motor, Single Phase Motor, Brushless DC Motor
**DRIVES:** Servo Drive, Servo Amplifier, VFD, Variable Frequency Drive, AC Drive, DC Drive, DC Motor Drive, SCR Drive, SCR Controller, Stepper Drive, Inverter
**PLCs:** PLC, PLC Processor, PLC CPU, PLC Chassis, PLC Rack, PLC Power Supply, PLC I/O Module, I/O Module, Input Module, Output Module, Communication Module, Network Module
**HMIs:** HMI, Touch Panel, Operator Interface, Touch Screen
**POWER:** Power Supply, Switching Power Supply, DC Power Supply, DIN Rail Power Supply, Transformer, Control Transformer, Isolation Transformer
**ELECTRICAL:** Circuit Breaker, MCCB, MCB, Disconnect Switch, Disconnect, Fuse, Fuse Holder, Fuse Block, Enclosure, Junction Box
**CONTACTORS & STARTERS:** Contactor, Motor Starter, Soft Starter, Overload Relay
**RELAYS:** Relay, Control Relay, Safety Relay, Safety Controller, Solid State Relay, SSR, Time Delay Relay
**SENSORS - PROXIMITY:** Proximity Sensor, Inductive Proximity Sensor, Capacitive Proximity Sensor, Magnetic Proximity Sensor
**SENSORS - PHOTOELECTRIC:** Photoelectric Sensor, Fiber Optic Sensor, Fiber Optic Amplifier, Through Beam Sensor, Retroreflective Sensor, Diffuse Sensor
**SENSORS - OTHER:** Pressure Sensor, Pressure Transducer, Pressure Transmitter, Temperature Sensor, Thermocouple, RTD, Flow Sensor, Flow Meter, Level Sensor, Level Switch, Float Switch, Laser Sensor, Color Sensor, Vision Sensor, Current Sensor, Load Cell, Position Sensor, LVDT
**SAFETY:** Light Curtain, Safety Light Curtain, Safety Scanner, Safety Barrier, E-Stop, Safety Interlock, Safety Door Switch
**ENCODERS:** Encoder, Rotary Encoder, Incremental Encoder, Absolute Encoder, Linear Encoder, Resolver
**BARCODE/RFID:** Barcode Scanner, Barcode Reader, RFID Reader
**SWITCHES:** Limit Switch, Micro Switch, Push Button, Pushbutton, Selector Switch, Toggle Switch, Key Switch, Foot Switch, Joystick, Pendant
**INDICATORS:** Pilot Light, Indicator Light, Stack Light, Tower Light
**PNEUMATIC CYLINDERS:** Pneumatic Cylinder, Air Cylinder, Compact Cylinder, Rodless Cylinder, Guided Cylinder, Pneumatic Gripper
**PNEUMATIC VALVES:** Pneumatic Valve, Solenoid Valve, Manifold, Valve Terminal
**PNEUMATIC OTHER:** Air Regulator, FRL, FRL Unit, Filter Regulator, Air Filter, Lubricator, Air Dryer, Muffler
**HYDRAULICS:** Hydraulic Cylinder, Hydraulic Valve, Hydraulic Pump, Gear Pump, Vane Pump, Piston Pump, Hydraulic Motor, Hydraulic Power Unit, Hydraulic Accumulator
**POWER TRANSMISSION:** Gearbox, Gear Reducer, Speed Reducer, Planetary Gearbox, Ball Screw, Linear Actuator, Linear Guide, Linear Rail, Brake, Motor Brake, Clutch, Belt, Pulley, Sprocket, Chain
**BEARINGS:** Ball Bearing, Roller Bearing, Tapered Roller Bearing, Needle Bearing, Thrust Bearing, Pillow Block, Flange Bearing, Cam Follower, Linear Bearing
**PUMPS:** Pump, Centrifugal Pump, Diaphragm Pump, Vacuum Pump, Metering Pump
**VALVES:** Ball Valve, Butterfly Valve, Check Valve, Globe Valve, Gate Valve, Relief Valve, Control Valve, Needle Valve
**TIMERS/COUNTERS:** Timer, Counter, Tachometer
**TEMPERATURE:** Temperature Controller, PID Controller, Process Controller, Heater
**METERS:** Panel Meter, Ammeter, Voltmeter, Pressure Gauge, Temperature Gauge`;

  // Now build the field guide section - we provide guides for ALL categories
  // so the AI can use the right one based on what it identifies
  let fieldGuides = '\n\n=== FIELD EXTRACTION GUIDES (use the one matching your identified product type) ===\n';
  for (const [catId, catDef] of Object.entries(CATEGORY_FIELD_DEFINITIONS)) {
    fieldGuides += `\n--- ${catDef.name} (Category ${catId}) ---\n`;
    for (const [fieldName, fieldDef] of Object.entries(catDef.fields)) {
      if (fieldDef.values) {
        fieldGuides += `  "${fieldName}": pick from [${fieldDef.values.slice(0, 8).join(', ')}${fieldDef.values.length > 8 ? ', ...' : ''}]\n`;
      } else {
        fieldGuides += `  "${fieldName}": extract (${fieldDef.label})\n`;
      }
    }
  }

  return `You are an expert industrial equipment specialist. Research and identify this EXACT product: ${brand} ${partNumber}

CRITICAL RULES:
1. You MUST find specifications for the EXACT model number "${partNumber}" by ${brand}.
2. Do NOT substitute specs from a similar or related model.
3. If you cannot find exact specs, return what you CAN confirm and set "qualityFlag" to "NEEDS ATTENTION".
4. The MPN in your response MUST be "${partNumber}" — not a similar part number.

STEP 1: Determine the product type. Choose the MOST SPECIFIC type from this list:
${typeList}

STEP 2: Extract specifications using the EXACT field names from the matching guide below.

${fieldGuides}

STEP 3: Return ONLY valid JSON (no markdown, no code blocks, no text before or after):
{
  "productType": "The specific product type from the list above",
  "title": "Professional eBay title, max 80 characters. Format: Brand Model# Key-Spec Key-Spec Product-Type Condition-Keyword",
  "shortDescription": "SEO meta description, 150-160 characters summarizing the product for search engines",
  "description": "HTML formatted - SEE FORMAT BELOW",
  "specifications": {
    "brand": "${brand}",
    "mpn": "${partNumber}",
    "manufacturer": "Official manufacturer name",
    "model": "Model number if different from MPN",
    "type": "Same as productType above",
    ... all extracted specifications using EXACT field names from the guide above ...
  },
  "metaKeywords": ["keyword1", "keyword2", "keyword3", "keyword4", "keyword5"],
  "qualityFlag": "COMPLETE or NEEDS ATTENTION"
}

DESCRIPTION FORMAT (must be valid HTML):
<p>[2-3 sentence professional introduction. What is this product, what does it do, who uses it. NO promotional language.]</p>

<h3 style="margin-top: 20px; margin-bottom: 10px; font-weight: bold; color: #333;">Technical Specifications</h3>
<table border="1" cellpadding="8" cellspacing="0" style="border-collapse: collapse; width: 100%; max-width: 600px; margin: 20px 0; border: 1px solid #ccc;">
<thead>
<tr style="background-color: #f5f5f5;">
<th style="text-align: left; padding: 10px; border: 1px solid #ccc; font-weight: bold;">Specification</th>
<th style="text-align: left; padding: 10px; border: 1px solid #ccc; font-weight: bold;">Value</th>
</tr>
</thead>
<tbody>
<tr><td style="padding: 8px; border: 1px solid #ddd;">Brand</td><td style="padding: 8px; border: 1px solid #ddd;">${brand}</td></tr>
<tr><td style="padding: 8px; border: 1px solid #ddd;">Model/Part Number</td><td style="padding: 8px; border: 1px solid #ddd;">${partNumber}</td></tr>
<!-- ADD ALL EXTRACTED SPECS AS TABLE ROWS -->
</tbody>
</table>

<p style="margin-top: 20px;">We warranty all items for 30 days from date of purchase.</p>

CRITICAL REQUIREMENTS:
- Title MUST be 80 characters or LESS (count carefully!)
- Specification field names MUST be lowercase with no spaces (e.g., "nominalratedinputvoltage" not "Nominal Rated Input Voltage")
- For fields with allowed values, you MUST use a value from the list
- If you cannot determine a spec value, use null (don't guess)
- Description table MUST include ALL found specifications
- NO promotional language, NO warranty claims in the specs table
- NO URLs, emails, or phone numbers`;
}

// ============================================================================
// MAIN API HANDLER
// ============================================================================

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { brand, partNumber } = req.body;

  if (!brand || !partNumber) {
    return res.status(400).json({ error: 'Brand and part number are required' });
  }

  console.log('=== SEARCH PRODUCT V3 (CONSOLIDATED) ===');
  console.log('Brand:', brand);
  console.log('Part:', partNumber);

  try {
    // Step 1: Build the prompt with all category field guides
    const prompt = buildProductPrompt(brand, partNumber);

    // Step 2: Call Claude with web search enabled
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

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Claude API error:', response.status, errorText);
      return res.status(500).json({ error: 'AI API error', details: errorText });
    }

    const data = await response.json();

    // Step 3: Extract JSON from AI response
    const textBlocks = data.content?.filter(b => b.type === 'text') || [];
    const fullText = textBlocks.map(b => b.text).join('');
    const jsonMatch = fullText.match(/\{[\s\S]*\}/);

    if (!jsonMatch) {
      console.error('No JSON found in AI response');
      return res.status(200).json({
        content: data.content,
        _metadata: { error: 'No structured JSON in AI response' }
      });
    }

    let product;
    try {
      product = JSON.parse(jsonMatch[0]);
    } catch (parseErr) {
      console.error('JSON parse error:', parseErr.message);
      return res.status(200).json({
        content: data.content,
        _metadata: { error: 'Invalid JSON in AI response', parseError: parseErr.message }
      });
    }

    const productType = product.productType || '';
    console.log('AI Detected Product Type:', productType);

    // Step 4: Map product type to eBay Category
    const ebayMapping = PRODUCT_TYPE_TO_EBAY_CATEGORY[productType] || null;
    const ebayCategoryId = ebayMapping?.id || '';
    const ebayCategoryName = ebayMapping?.name || productType;

    console.log('eBay Category:', ebayCategoryId, '-', ebayCategoryName);

    // Step 5: Map product type to Store Category
    const ebayStoreCategoryId = PRODUCT_TYPE_TO_STORE_CATEGORY[productType] || '';
    const ebayStoreCategoryId2 = ALL_PRODUCTS_STORE_CATEGORY;

    console.log('Store Category 1:', ebayStoreCategoryId);

    // Step 6: Get category-specific field definitions
    const categoryFieldDefs = getFieldDefsForCategory(ebayCategoryId);

    // Step 7: Fetch eBay item specifics from Taxonomy API (if we have a category)
    let ebayAspects = null;
    if (ebayCategoryId) {
      try {
        const baseUrl = req.headers.host?.includes('localhost')
          ? `http://${req.headers.host}`
          : `https://${req.headers.host}`;

        const aspectsResponse = await fetch(`${baseUrl}/api/ebay-category-aspects?categoryId=${ebayCategoryId}`);
        if (aspectsResponse.ok) {
          ebayAspects = await aspectsResponse.json();
          console.log('eBay Aspects Loaded:', ebayAspects?.totalAspects || 0, 'aspects');
        }
      } catch (error) {
        console.log('Failed to fetch eBay aspects (non-fatal):', error.message);
      }
    }

    // Step 8: Return the full response with all metadata
    res.status(200).json({
      content: data.content,
      _metadata: {
        productType,
        detectedCategory: ebayCategoryName,
        detectedCategoryId: ebayCategoryId,
        ebayStoreCategoryId,
        ebayStoreCategoryId2,
        ebayAspectsLoaded: !!ebayAspects,
        totalAspects: ebayAspects?.totalAspects || 0,
        requiredAspects: ebayAspects?.required?.length || 0,
        recommendedAspects: ebayAspects?.recommended?.length || 0,
        hasFieldDefinitions: !!categoryFieldDefs,
        fieldDefinitionCount: categoryFieldDefs ? Object.keys(categoryFieldDefs.fields).length : 0,
        qualityFlag: product.qualityFlag || 'UNKNOWN',
        webSearchUsed: data.content?.some(b => b.type === 'tool_use') || false
      },
      _ebayAspects: ebayAspects,
      _categoryFieldDefinitions: categoryFieldDefs,
      _countryOfOriginValues: COUNTRY_OF_ORIGIN_VALUES
    });

  } catch (error) {
    console.error('Search API error:', error);
    res.status(500).json({ error: error.message });
  }
}

// Export for use in other files
export {
  PRODUCT_TYPE_TO_EBAY_CATEGORY,
  PRODUCT_TYPE_TO_STORE_CATEGORY,
  CATEGORY_FIELD_DEFINITIONS,
  COUNTRY_OF_ORIGIN_VALUES,
  ALL_PRODUCTS_STORE_CATEGORY
};
