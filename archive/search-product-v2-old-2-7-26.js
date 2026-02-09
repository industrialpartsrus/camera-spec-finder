// pages/api/search-product-v2.js
// v2: AI-driven category detection from product research
// AI identifies product type, then system maps to eBay Category + Store Category
// COMPREHENSIVE MAPPINGS for all product types

import Anthropic from '@anthropic-ai/sdk';

// ============================================================================
// PRODUCT TYPE TO EBAY CATEGORY MAPPING (COMPREHENSIVE)
// AI returns a product type, we map it to eBay Category ID
// ============================================================================

const PRODUCT_TYPE_TO_EBAY_CATEGORY = {
  // ==================== PLCs & AUTOMATION ====================
  'PLC': { ebayCategoryId: '181708', ebayCategoryName: 'PLC Processors' },
  'PLC Processor': { ebayCategoryId: '181708', ebayCategoryName: 'PLC Processors' },
  'PLC CPU': { ebayCategoryId: '181708', ebayCategoryName: 'PLC Processors' },
  'PLC Chassis': { ebayCategoryId: '181711', ebayCategoryName: 'PLC Chassis' },
  'PLC Rack': { ebayCategoryId: '181711', ebayCategoryName: 'PLC Chassis' },
  'PLC Power Supply': { ebayCategoryId: '181720', ebayCategoryName: 'PLC Power Supplies' },
  'PLC I/O Module': { ebayCategoryId: '181714', ebayCategoryName: 'PLC Input & Output Modules' },
  'I/O Module': { ebayCategoryId: '181714', ebayCategoryName: 'PLC Input & Output Modules' },
  'Input Module': { ebayCategoryId: '181714', ebayCategoryName: 'PLC Input & Output Modules' },
  'Output Module': { ebayCategoryId: '181714', ebayCategoryName: 'PLC Input & Output Modules' },
  'Communication Module': { ebayCategoryId: '181714', ebayCategoryName: 'PLC Input & Output Modules' },
  'Network Module': { ebayCategoryId: '181714', ebayCategoryName: 'PLC Input & Output Modules' },
  'HMI': { ebayCategoryId: '181709', ebayCategoryName: 'HMI & Open Interface Panels' },
  'Touch Panel': { ebayCategoryId: '181709', ebayCategoryName: 'HMI & Open Interface Panels' },
  'Operator Interface': { ebayCategoryId: '181709', ebayCategoryName: 'HMI & Open Interface Panels' },
  'Operator Panel': { ebayCategoryId: '181709', ebayCategoryName: 'HMI & Open Interface Panels' },
  'Touch Screen': { ebayCategoryId: '181709', ebayCategoryName: 'HMI & Open Interface Panels' },
  
  // ==================== MOTORS ====================
  'Servo Motor': { ebayCategoryId: '124603', ebayCategoryName: 'Servo Motors' },
  'AC Servo Motor': { ebayCategoryId: '124603', ebayCategoryName: 'Servo Motors' },
  'DC Servo Motor': { ebayCategoryId: '124603', ebayCategoryName: 'Servo Motors' },
  'Brushless Servo Motor': { ebayCategoryId: '124603', ebayCategoryName: 'Servo Motors' },
  'Stepper Motor': { ebayCategoryId: '9723', ebayCategoryName: 'Stepper Motors' },
  'Step Motor': { ebayCategoryId: '9723', ebayCategoryName: 'Stepper Motors' },
  'Stepping Motor': { ebayCategoryId: '9723', ebayCategoryName: 'Stepper Motors' },
  'Electric Motor': { ebayCategoryId: '181732', ebayCategoryName: 'General Purpose Motors' },
  'AC Motor': { ebayCategoryId: '181732', ebayCategoryName: 'General Purpose Motors' },
  'Induction Motor': { ebayCategoryId: '181732', ebayCategoryName: 'General Purpose Motors' },
  'Three Phase Motor': { ebayCategoryId: '181732', ebayCategoryName: 'General Purpose Motors' },
  'Single Phase Motor': { ebayCategoryId: '181732', ebayCategoryName: 'General Purpose Motors' },
  'DC Motor': { ebayCategoryId: '181731', ebayCategoryName: 'Definite Purpose Motors' },
  'Brushless DC Motor': { ebayCategoryId: '181731', ebayCategoryName: 'Definite Purpose Motors' },
  'BLDC Motor': { ebayCategoryId: '181731', ebayCategoryName: 'Definite Purpose Motors' },
  'Gearmotor': { ebayCategoryId: '65452', ebayCategoryName: 'Gearmotors' },
  'Gear Motor': { ebayCategoryId: '65452', ebayCategoryName: 'Gearmotors' },
  'Geared Motor': { ebayCategoryId: '65452', ebayCategoryName: 'Gearmotors' },
  
  // ==================== DRIVES ====================
  'Servo Drive': { ebayCategoryId: '78191', ebayCategoryName: 'Servo Drives & Amplifiers' },
  'Servo Amplifier': { ebayCategoryId: '78191', ebayCategoryName: 'Servo Drives & Amplifiers' },
  'Servo Controller': { ebayCategoryId: '78191', ebayCategoryName: 'Servo Drives & Amplifiers' },
  'VFD': { ebayCategoryId: '78192', ebayCategoryName: 'Variable Frequency Drives' },
  'Variable Frequency Drive': { ebayCategoryId: '78192', ebayCategoryName: 'Variable Frequency Drives' },
  'AC Drive': { ebayCategoryId: '78192', ebayCategoryName: 'Variable Frequency Drives' },
  'Inverter': { ebayCategoryId: '78192', ebayCategoryName: 'Variable Frequency Drives' },
  'Frequency Inverter': { ebayCategoryId: '78192', ebayCategoryName: 'Variable Frequency Drives' },
  'DC Drive': { ebayCategoryId: '78190', ebayCategoryName: 'General Purpose DC Drives' },
  'DC Motor Drive': { ebayCategoryId: '78190', ebayCategoryName: 'General Purpose DC Drives' },
  'Stepper Drive': { ebayCategoryId: '71394', ebayCategoryName: 'Stepper Controls & Drives' },
  'Stepper Controller': { ebayCategoryId: '71394', ebayCategoryName: 'Stepper Controls & Drives' },
  'Step Drive': { ebayCategoryId: '71394', ebayCategoryName: 'Stepper Controls & Drives' },
  
  // ==================== POWER SUPPLIES ====================
  'Power Supply': { ebayCategoryId: '42017', ebayCategoryName: 'Power Supplies' },
  'Switching Power Supply': { ebayCategoryId: '42017', ebayCategoryName: 'Power Supplies' },
  'DC Power Supply': { ebayCategoryId: '42017', ebayCategoryName: 'Power Supplies' },
  'AC Power Supply': { ebayCategoryId: '42017', ebayCategoryName: 'Power Supplies' },
  'Industrial Power Supply': { ebayCategoryId: '42017', ebayCategoryName: 'Power Supplies' },
  'DIN Rail Power Supply': { ebayCategoryId: '42017', ebayCategoryName: 'Power Supplies' },
  
  // ==================== ELECTRICAL ====================
  'Circuit Breaker': { ebayCategoryId: '185134', ebayCategoryName: 'Circuit Breakers' },
  'Molded Case Circuit Breaker': { ebayCategoryId: '185134', ebayCategoryName: 'Circuit Breakers' },
  'MCCB': { ebayCategoryId: '185134', ebayCategoryName: 'Circuit Breakers' },
  'Miniature Circuit Breaker': { ebayCategoryId: '185134', ebayCategoryName: 'Circuit Breakers' },
  'MCB': { ebayCategoryId: '185134', ebayCategoryName: 'Circuit Breakers' },
  'Disconnect Switch': { ebayCategoryId: '181679', ebayCategoryName: 'Disconnect Switches' },
  'Disconnect': { ebayCategoryId: '181679', ebayCategoryName: 'Disconnect Switches' },
  'Safety Switch': { ebayCategoryId: '181679', ebayCategoryName: 'Disconnect Switches' },
  'Fuse': { ebayCategoryId: '181678', ebayCategoryName: 'Fuses' },
  'Fuse Holder': { ebayCategoryId: '181678', ebayCategoryName: 'Fuses' },
  'Fuse Block': { ebayCategoryId: '181678', ebayCategoryName: 'Fuses' },
  'Transformer': { ebayCategoryId: '116922', ebayCategoryName: 'Electrical Transformers' },
  'Control Transformer': { ebayCategoryId: '116922', ebayCategoryName: 'Electrical Transformers' },
  'Isolation Transformer': { ebayCategoryId: '116922', ebayCategoryName: 'Electrical Transformers' },
  'Step Down Transformer': { ebayCategoryId: '116922', ebayCategoryName: 'Electrical Transformers' },
  'Enclosure': { ebayCategoryId: '181673', ebayCategoryName: 'Industrial Enclosures' },
  'Electrical Enclosure': { ebayCategoryId: '181673', ebayCategoryName: 'Industrial Enclosures' },
  'Junction Box': { ebayCategoryId: '181673', ebayCategoryName: 'Industrial Enclosures' },
  'Control Panel': { ebayCategoryId: '181673', ebayCategoryName: 'Industrial Enclosures' },
  
  // ==================== CONTACTORS & STARTERS ====================
  'Contactor': { ebayCategoryId: '181680', ebayCategoryName: 'IEC & NEMA Contactors' },
  'AC Contactor': { ebayCategoryId: '181680', ebayCategoryName: 'IEC & NEMA Contactors' },
  'DC Contactor': { ebayCategoryId: '181680', ebayCategoryName: 'IEC & NEMA Contactors' },
  'Motor Starter': { ebayCategoryId: '181681', ebayCategoryName: 'Motor Starters' },
  'Soft Starter': { ebayCategoryId: '181681', ebayCategoryName: 'Motor Starters' },
  'DOL Starter': { ebayCategoryId: '181681', ebayCategoryName: 'Motor Starters' },
  'Motor Protector': { ebayCategoryId: '181681', ebayCategoryName: 'Motor Starters' },
  'Overload Relay': { ebayCategoryId: '181681', ebayCategoryName: 'Motor Starters' },
  
  // ==================== RELAYS ====================
  'Relay': { ebayCategoryId: '36328', ebayCategoryName: 'General Purpose Relays' },
  'Control Relay': { ebayCategoryId: '36328', ebayCategoryName: 'General Purpose Relays' },
  'Ice Cube Relay': { ebayCategoryId: '36328', ebayCategoryName: 'General Purpose Relays' },
  'Plug-in Relay': { ebayCategoryId: '36328', ebayCategoryName: 'General Purpose Relays' },
  'Safety Relay': { ebayCategoryId: '65464', ebayCategoryName: 'Safety Relays' },
  'Safety Controller': { ebayCategoryId: '65464', ebayCategoryName: 'Safety Relays' },
  'Solid State Relay': { ebayCategoryId: '65454', ebayCategoryName: 'Solid State Relays' },
  'SSR': { ebayCategoryId: '65454', ebayCategoryName: 'Solid State Relays' },
  'Time Delay Relay': { ebayCategoryId: '181682', ebayCategoryName: 'Industrial Timers' },
  
  // ==================== SENSORS - PROXIMITY ====================
  'Proximity Sensor': { ebayCategoryId: '65459', ebayCategoryName: 'Proximity Sensors' },
  'Inductive Proximity Sensor': { ebayCategoryId: '65459', ebayCategoryName: 'Proximity Sensors' },
  'Inductive Sensor': { ebayCategoryId: '65459', ebayCategoryName: 'Proximity Sensors' },
  'Capacitive Proximity Sensor': { ebayCategoryId: '65459', ebayCategoryName: 'Proximity Sensors' },
  'Capacitive Sensor': { ebayCategoryId: '65459', ebayCategoryName: 'Proximity Sensors' },
  'Magnetic Proximity Sensor': { ebayCategoryId: '65459', ebayCategoryName: 'Proximity Sensors' },
  
  // ==================== SENSORS - PHOTOELECTRIC ====================
  'Photoelectric Sensor': { ebayCategoryId: '181786', ebayCategoryName: 'Fiber Optic Sensors' },
  'Photo Sensor': { ebayCategoryId: '181786', ebayCategoryName: 'Fiber Optic Sensors' },
  'Optical Sensor': { ebayCategoryId: '181786', ebayCategoryName: 'Fiber Optic Sensors' },
  'Through Beam Sensor': { ebayCategoryId: '181786', ebayCategoryName: 'Fiber Optic Sensors' },
  'Retroreflective Sensor': { ebayCategoryId: '181786', ebayCategoryName: 'Fiber Optic Sensors' },
  'Diffuse Sensor': { ebayCategoryId: '181786', ebayCategoryName: 'Fiber Optic Sensors' },
  'Fiber Optic Sensor': { ebayCategoryId: '181786', ebayCategoryName: 'Fiber Optic Sensors' },
  'Fiber Optic Amplifier': { ebayCategoryId: '181786', ebayCategoryName: 'Fiber Optic Sensors' },
  
  // ==================== SENSORS - OTHER ====================
  'Pressure Sensor': { ebayCategoryId: '65456', ebayCategoryName: 'Pressure Sensors' },
  'Pressure Transducer': { ebayCategoryId: '65456', ebayCategoryName: 'Pressure Sensors' },
  'Pressure Transmitter': { ebayCategoryId: '65456', ebayCategoryName: 'Pressure Sensors' },
  'Temperature Sensor': { ebayCategoryId: '65460', ebayCategoryName: 'Temperature & Humidity Sensors' },
  'Thermocouple': { ebayCategoryId: '65460', ebayCategoryName: 'Temperature & Humidity Sensors' },
  'RTD': { ebayCategoryId: '65460', ebayCategoryName: 'Temperature & Humidity Sensors' },
  'Temperature Probe': { ebayCategoryId: '65460', ebayCategoryName: 'Temperature & Humidity Sensors' },
  'Flow Sensor': { ebayCategoryId: '65457', ebayCategoryName: 'Flow Sensors' },
  'Flow Meter': { ebayCategoryId: '65457', ebayCategoryName: 'Flow Sensors' },
  'Flow Switch': { ebayCategoryId: '65457', ebayCategoryName: 'Flow Sensors' },
  'Level Sensor': { ebayCategoryId: '181785', ebayCategoryName: 'Level Sensors' },
  'Level Switch': { ebayCategoryId: '181785', ebayCategoryName: 'Level Sensors' },
  'Float Switch': { ebayCategoryId: '181785', ebayCategoryName: 'Level Sensors' },
  'Ultrasonic Sensor': { ebayCategoryId: '181785', ebayCategoryName: 'Level Sensors' },
  'Laser Sensor': { ebayCategoryId: '181744', ebayCategoryName: 'Sensors' },
  'Laser Distance Sensor': { ebayCategoryId: '181744', ebayCategoryName: 'Sensors' },
  'Color Sensor': { ebayCategoryId: '181744', ebayCategoryName: 'Sensors' },
  'Color Mark Sensor': { ebayCategoryId: '181744', ebayCategoryName: 'Sensors' },
  'Vision Sensor': { ebayCategoryId: '181744', ebayCategoryName: 'Sensors' },
  'Vision System': { ebayCategoryId: '181744', ebayCategoryName: 'Sensors' },
  'Camera': { ebayCategoryId: '181744', ebayCategoryName: 'Sensors' },
  'Current Sensor': { ebayCategoryId: '181744', ebayCategoryName: 'Sensors' },
  'Current Transformer': { ebayCategoryId: '181744', ebayCategoryName: 'Sensors' },
  'Load Cell': { ebayCategoryId: '181744', ebayCategoryName: 'Sensors' },
  'Force Sensor': { ebayCategoryId: '181744', ebayCategoryName: 'Sensors' },
  'Linear Sensor': { ebayCategoryId: '181744', ebayCategoryName: 'Sensors' },
  'Position Sensor': { ebayCategoryId: '181744', ebayCategoryName: 'Sensors' },
  'LVDT': { ebayCategoryId: '181744', ebayCategoryName: 'Sensors' },
  
  // ==================== SAFETY DEVICES ====================
  'Light Curtain': { ebayCategoryId: '65465', ebayCategoryName: 'Light Curtains' },
  'Safety Light Curtain': { ebayCategoryId: '65465', ebayCategoryName: 'Light Curtains' },
  'Safety Barrier': { ebayCategoryId: '65465', ebayCategoryName: 'Light Curtains' },
  'Safety Scanner': { ebayCategoryId: '65465', ebayCategoryName: 'Light Curtains' },
  'Area Scanner': { ebayCategoryId: '65465', ebayCategoryName: 'Light Curtains' },
  'E-Stop': { ebayCategoryId: '181677', ebayCategoryName: 'Pushbutton Switches' },
  'Emergency Stop': { ebayCategoryId: '181677', ebayCategoryName: 'Pushbutton Switches' },
  'Safety Interlock': { ebayCategoryId: '65464', ebayCategoryName: 'Safety Relays' },
  'Safety Door Switch': { ebayCategoryId: '65464', ebayCategoryName: 'Safety Relays' },
  'Safety Mat': { ebayCategoryId: '65464', ebayCategoryName: 'Safety Relays' },
  
  // ==================== ENCODERS ====================
  'Encoder': { ebayCategoryId: '65455', ebayCategoryName: 'Rotary Encoders' },
  'Rotary Encoder': { ebayCategoryId: '65455', ebayCategoryName: 'Rotary Encoders' },
  'Incremental Encoder': { ebayCategoryId: '65455', ebayCategoryName: 'Rotary Encoders' },
  'Absolute Encoder': { ebayCategoryId: '65455', ebayCategoryName: 'Rotary Encoders' },
  'Shaft Encoder': { ebayCategoryId: '65455', ebayCategoryName: 'Rotary Encoders' },
  'Hollow Shaft Encoder': { ebayCategoryId: '65455', ebayCategoryName: 'Rotary Encoders' },
  'Linear Encoder': { ebayCategoryId: '65455', ebayCategoryName: 'Rotary Encoders' },
  'Magnetic Encoder': { ebayCategoryId: '65455', ebayCategoryName: 'Rotary Encoders' },
  'Resolver': { ebayCategoryId: '65455', ebayCategoryName: 'Rotary Encoders' },
  
  // ==================== BARCODE & RFID ====================
  'Barcode Scanner': { ebayCategoryId: '46706', ebayCategoryName: 'Barcode Scanners' },
  'Barcode Reader': { ebayCategoryId: '46706', ebayCategoryName: 'Barcode Scanners' },
  'Bar Code Scanner': { ebayCategoryId: '46706', ebayCategoryName: 'Barcode Scanners' },
  'QR Code Reader': { ebayCategoryId: '46706', ebayCategoryName: 'Barcode Scanners' },
  '2D Scanner': { ebayCategoryId: '46706', ebayCategoryName: 'Barcode Scanners' },
  'RFID Reader': { ebayCategoryId: '181744', ebayCategoryName: 'Sensors' },
  'RFID Antenna': { ebayCategoryId: '181744', ebayCategoryName: 'Sensors' },
  'RFID Tag': { ebayCategoryId: '181744', ebayCategoryName: 'Sensors' },
  
  // ==================== SWITCHES ====================
  'Limit Switch': { ebayCategoryId: '181676', ebayCategoryName: 'Industrial Limit Switches' },
  'Micro Switch': { ebayCategoryId: '181676', ebayCategoryName: 'Industrial Limit Switches' },
  'Miniature Switch': { ebayCategoryId: '181676', ebayCategoryName: 'Industrial Limit Switches' },
  'Push Button': { ebayCategoryId: '181677', ebayCategoryName: 'Pushbutton Switches' },
  'Pushbutton': { ebayCategoryId: '181677', ebayCategoryName: 'Pushbutton Switches' },
  'Pushbutton Switch': { ebayCategoryId: '181677', ebayCategoryName: 'Pushbutton Switches' },
  'Selector Switch': { ebayCategoryId: '181677', ebayCategoryName: 'Pushbutton Switches' },
  'Rotary Switch': { ebayCategoryId: '181677', ebayCategoryName: 'Pushbutton Switches' },
  'Toggle Switch': { ebayCategoryId: '181677', ebayCategoryName: 'Pushbutton Switches' },
  'Key Switch': { ebayCategoryId: '181677', ebayCategoryName: 'Pushbutton Switches' },
  'Foot Switch': { ebayCategoryId: '181677', ebayCategoryName: 'Pushbutton Switches' },
  'Palm Switch': { ebayCategoryId: '181677', ebayCategoryName: 'Pushbutton Switches' },
  'Joystick': { ebayCategoryId: '181677', ebayCategoryName: 'Pushbutton Switches' },
  'Pendant': { ebayCategoryId: '181677', ebayCategoryName: 'Pushbutton Switches' },
  'Pendant Control': { ebayCategoryId: '181677', ebayCategoryName: 'Pushbutton Switches' },
  'Pilot Light': { ebayCategoryId: '181677', ebayCategoryName: 'Pushbutton Switches' },
  'Indicator Light': { ebayCategoryId: '181677', ebayCategoryName: 'Pushbutton Switches' },
  'Stack Light': { ebayCategoryId: '181677', ebayCategoryName: 'Pushbutton Switches' },
  'Tower Light': { ebayCategoryId: '181677', ebayCategoryName: 'Pushbutton Switches' },
  'Signal Light': { ebayCategoryId: '181677', ebayCategoryName: 'Pushbutton Switches' },
  
  // ==================== PNEUMATIC CYLINDERS ====================
  'Pneumatic Cylinder': { ebayCategoryId: '184027', ebayCategoryName: 'Hydraulic & Pneumatic Cylinders' },
  'Air Cylinder': { ebayCategoryId: '184027', ebayCategoryName: 'Hydraulic & Pneumatic Cylinders' },
  'Compact Cylinder': { ebayCategoryId: '184027', ebayCategoryName: 'Hydraulic & Pneumatic Cylinders' },
  'Round Cylinder': { ebayCategoryId: '184027', ebayCategoryName: 'Hydraulic & Pneumatic Cylinders' },
  'ISO Cylinder': { ebayCategoryId: '184027', ebayCategoryName: 'Hydraulic & Pneumatic Cylinders' },
  'NFPA Cylinder': { ebayCategoryId: '184027', ebayCategoryName: 'Hydraulic & Pneumatic Cylinders' },
  'Rodless Cylinder': { ebayCategoryId: '184027', ebayCategoryName: 'Hydraulic & Pneumatic Cylinders' },
  'Guided Cylinder': { ebayCategoryId: '184027', ebayCategoryName: 'Hydraulic & Pneumatic Cylinders' },
  'Slide Cylinder': { ebayCategoryId: '184027', ebayCategoryName: 'Hydraulic & Pneumatic Cylinders' },
  'Rotary Cylinder': { ebayCategoryId: '184027', ebayCategoryName: 'Hydraulic & Pneumatic Cylinders' },
  'Pneumatic Actuator': { ebayCategoryId: '184027', ebayCategoryName: 'Hydraulic & Pneumatic Cylinders' },
  'Pneumatic Gripper': { ebayCategoryId: '184027', ebayCategoryName: 'Hydraulic & Pneumatic Cylinders' },
  'Gripper': { ebayCategoryId: '184027', ebayCategoryName: 'Hydraulic & Pneumatic Cylinders' },
  'Parallel Gripper': { ebayCategoryId: '184027', ebayCategoryName: 'Hydraulic & Pneumatic Cylinders' },
  'Angular Gripper': { ebayCategoryId: '184027', ebayCategoryName: 'Hydraulic & Pneumatic Cylinders' },
  
  // ==================== PNEUMATIC VALVES ====================
  'Pneumatic Valve': { ebayCategoryId: '260291', ebayCategoryName: 'Solenoid Valves & Coils' },
  'Solenoid Valve': { ebayCategoryId: '260291', ebayCategoryName: 'Solenoid Valves & Coils' },
  'Air Valve': { ebayCategoryId: '260291', ebayCategoryName: 'Solenoid Valves & Coils' },
  'Directional Valve': { ebayCategoryId: '260291', ebayCategoryName: 'Solenoid Valves & Coils' },
  'Manifold': { ebayCategoryId: '260291', ebayCategoryName: 'Solenoid Valves & Coils' },
  'Valve Manifold': { ebayCategoryId: '260291', ebayCategoryName: 'Solenoid Valves & Coils' },
  'Valve Terminal': { ebayCategoryId: '260291', ebayCategoryName: 'Solenoid Valves & Coils' },
  
  // ==================== PNEUMATIC OTHER ====================
  'Air Regulator': { ebayCategoryId: '183988', ebayCategoryName: 'Air Pressure Regulators' },
  'Pressure Regulator': { ebayCategoryId: '183988', ebayCategoryName: 'Air Pressure Regulators' },
  'Filter Regulator': { ebayCategoryId: '183988', ebayCategoryName: 'Air Pressure Regulators' },
  'FRL Unit': { ebayCategoryId: '183988', ebayCategoryName: 'Air Pressure Regulators' },
  'FRL': { ebayCategoryId: '183988', ebayCategoryName: 'Air Pressure Regulators' },
  'Air Filter': { ebayCategoryId: '43509', ebayCategoryName: 'Air Filters' },
  'Compressed Air Filter': { ebayCategoryId: '43509', ebayCategoryName: 'Air Filters' },
  'Coalescing Filter': { ebayCategoryId: '43509', ebayCategoryName: 'Air Filters' },
  'Lubricator': { ebayCategoryId: '183988', ebayCategoryName: 'Air Pressure Regulators' },
  'Air Lubricator': { ebayCategoryId: '183988', ebayCategoryName: 'Air Pressure Regulators' },
  'Air Dryer': { ebayCategoryId: '183988', ebayCategoryName: 'Air Pressure Regulators' },
  'Muffler': { ebayCategoryId: '183988', ebayCategoryName: 'Air Pressure Regulators' },
  'Silencer': { ebayCategoryId: '183988', ebayCategoryName: 'Air Pressure Regulators' },
  
  // ==================== HYDRAULICS ====================
  'Hydraulic Cylinder': { ebayCategoryId: '184027', ebayCategoryName: 'Hydraulic & Pneumatic Cylinders' },
  'Hydraulic Ram': { ebayCategoryId: '184027', ebayCategoryName: 'Hydraulic & Pneumatic Cylinders' },
  'Hydraulic Actuator': { ebayCategoryId: '184027', ebayCategoryName: 'Hydraulic & Pneumatic Cylinders' },
  'Hydraulic Valve': { ebayCategoryId: '184113', ebayCategoryName: 'Hydraulic Directional Control Valves' },
  'Directional Control Valve': { ebayCategoryId: '184113', ebayCategoryName: 'Hydraulic Directional Control Valves' },
  'Proportional Valve': { ebayCategoryId: '184113', ebayCategoryName: 'Hydraulic Directional Control Valves' },
  'Servo Valve': { ebayCategoryId: '184113', ebayCategoryName: 'Hydraulic Directional Control Valves' },
  'Hydraulic Pump': { ebayCategoryId: '184101', ebayCategoryName: 'Hydraulic Pumps' },
  'Gear Pump': { ebayCategoryId: '184101', ebayCategoryName: 'Hydraulic Pumps' },
  'Vane Pump': { ebayCategoryId: '184101', ebayCategoryName: 'Hydraulic Pumps' },
  'Piston Pump': { ebayCategoryId: '184101', ebayCategoryName: 'Hydraulic Pumps' },
  'Hydraulic Motor': { ebayCategoryId: '184103', ebayCategoryName: 'Hydraulic Motors' },
  'Hydraulic Power Unit': { ebayCategoryId: '184101', ebayCategoryName: 'Hydraulic Pumps' },
  'HPU': { ebayCategoryId: '184101', ebayCategoryName: 'Hydraulic Pumps' },
  'Hydraulic Accumulator': { ebayCategoryId: '184027', ebayCategoryName: 'Hydraulic & Pneumatic Cylinders' },
  'Accumulator': { ebayCategoryId: '184027', ebayCategoryName: 'Hydraulic & Pneumatic Cylinders' },
  'Hydraulic Filter': { ebayCategoryId: '43509', ebayCategoryName: 'Air Filters' },
  
  // ==================== POWER TRANSMISSION ====================
  'Gearbox': { ebayCategoryId: '181772', ebayCategoryName: 'Gearboxes & Speed Reducers' },
  'Gear Reducer': { ebayCategoryId: '181772', ebayCategoryName: 'Gearboxes & Speed Reducers' },
  'Speed Reducer': { ebayCategoryId: '181772', ebayCategoryName: 'Gearboxes & Speed Reducers' },
  'Worm Gear': { ebayCategoryId: '181772', ebayCategoryName: 'Gearboxes & Speed Reducers' },
  'Planetary Gearbox': { ebayCategoryId: '181772', ebayCategoryName: 'Gearboxes & Speed Reducers' },
  'Helical Gearbox': { ebayCategoryId: '181772', ebayCategoryName: 'Gearboxes & Speed Reducers' },
  'Right Angle Gearbox': { ebayCategoryId: '181772', ebayCategoryName: 'Gearboxes & Speed Reducers' },
  
  // ==================== BEARINGS ====================
  'Bearing': { ebayCategoryId: '181750', ebayCategoryName: 'Ball & Roller Bearings' },
  'Ball Bearing': { ebayCategoryId: '181750', ebayCategoryName: 'Ball & Roller Bearings' },
  'Roller Bearing': { ebayCategoryId: '181750', ebayCategoryName: 'Ball & Roller Bearings' },
  'Tapered Roller Bearing': { ebayCategoryId: '181750', ebayCategoryName: 'Ball & Roller Bearings' },
  'Needle Bearing': { ebayCategoryId: '181750', ebayCategoryName: 'Ball & Roller Bearings' },
  'Thrust Bearing': { ebayCategoryId: '181750', ebayCategoryName: 'Ball & Roller Bearings' },
  'Pillow Block': { ebayCategoryId: '181750', ebayCategoryName: 'Ball & Roller Bearings' },
  'Pillow Block Bearing': { ebayCategoryId: '181750', ebayCategoryName: 'Ball & Roller Bearings' },
  'Flange Bearing': { ebayCategoryId: '181750', ebayCategoryName: 'Ball & Roller Bearings' },
  'Cam Follower': { ebayCategoryId: '181750', ebayCategoryName: 'Ball & Roller Bearings' },
  'Linear Bearing': { ebayCategoryId: '181741', ebayCategoryName: 'Linear Bearings & Bushings' },
  'Linear Bushing': { ebayCategoryId: '181741', ebayCategoryName: 'Linear Bearings & Bushings' },
  
  // ==================== LINEAR MOTION ====================
  'Linear Guide': { ebayCategoryId: '181741', ebayCategoryName: 'Linear Bearings & Bushings' },
  'Linear Rail': { ebayCategoryId: '181741', ebayCategoryName: 'Linear Bearings & Bushings' },
  'Linear Slide': { ebayCategoryId: '181741', ebayCategoryName: 'Linear Bearings & Bushings' },
  'Rail Block': { ebayCategoryId: '181741', ebayCategoryName: 'Linear Bearings & Bushings' },
  'Carriage': { ebayCategoryId: '181741', ebayCategoryName: 'Linear Bearings & Bushings' },
  'Ball Screw': { ebayCategoryId: '181741', ebayCategoryName: 'Linear Bearings & Bushings' },
  'Ball Screw Assembly': { ebayCategoryId: '181741', ebayCategoryName: 'Linear Bearings & Bushings' },
  'Ball Nut': { ebayCategoryId: '181741', ebayCategoryName: 'Linear Bearings & Bushings' },
  'Lead Screw': { ebayCategoryId: '181741', ebayCategoryName: 'Linear Bearings & Bushings' },
  'Linear Actuator': { ebayCategoryId: '181741', ebayCategoryName: 'Linear Bearings & Bushings' },
  'Electric Linear Actuator': { ebayCategoryId: '181741', ebayCategoryName: 'Linear Bearings & Bushings' },
  'Linear Stage': { ebayCategoryId: '181741', ebayCategoryName: 'Linear Bearings & Bushings' },
  'Linear Module': { ebayCategoryId: '181741', ebayCategoryName: 'Linear Bearings & Bushings' },
  
  // ==================== BRAKES & CLUTCHES ====================
  'Brake': { ebayCategoryId: '181772', ebayCategoryName: 'Gearboxes & Speed Reducers' },
  'Motor Brake': { ebayCategoryId: '181772', ebayCategoryName: 'Gearboxes & Speed Reducers' },
  'Electromagnetic Brake': { ebayCategoryId: '181772', ebayCategoryName: 'Gearboxes & Speed Reducers' },
  'Clutch': { ebayCategoryId: '181772', ebayCategoryName: 'Gearboxes & Speed Reducers' },
  'Electromagnetic Clutch': { ebayCategoryId: '181772', ebayCategoryName: 'Gearboxes & Speed Reducers' },
  'Clutch Brake': { ebayCategoryId: '181772', ebayCategoryName: 'Gearboxes & Speed Reducers' },
  
  // ==================== BELTS & PULLEYS ====================
  'Belt': { ebayCategoryId: '181772', ebayCategoryName: 'Gearboxes & Speed Reducers' },
  'Timing Belt': { ebayCategoryId: '181772', ebayCategoryName: 'Gearboxes & Speed Reducers' },
  'V-Belt': { ebayCategoryId: '181772', ebayCategoryName: 'Gearboxes & Speed Reducers' },
  'Pulley': { ebayCategoryId: '181772', ebayCategoryName: 'Gearboxes & Speed Reducers' },
  'Timing Pulley': { ebayCategoryId: '181772', ebayCategoryName: 'Gearboxes & Speed Reducers' },
  'Sprocket': { ebayCategoryId: '181772', ebayCategoryName: 'Gearboxes & Speed Reducers' },
  'Chain': { ebayCategoryId: '181772', ebayCategoryName: 'Gearboxes & Speed Reducers' },
  'Roller Chain': { ebayCategoryId: '181772', ebayCategoryName: 'Gearboxes & Speed Reducers' },
  
  // ==================== PUMPS ====================
  'Pump': { ebayCategoryId: '184101', ebayCategoryName: 'Hydraulic Pumps' },
  'Centrifugal Pump': { ebayCategoryId: '184101', ebayCategoryName: 'Hydraulic Pumps' },
  'Diaphragm Pump': { ebayCategoryId: '184101', ebayCategoryName: 'Hydraulic Pumps' },
  'Metering Pump': { ebayCategoryId: '184101', ebayCategoryName: 'Hydraulic Pumps' },
  'Dosing Pump': { ebayCategoryId: '184101', ebayCategoryName: 'Hydraulic Pumps' },
  'Vacuum Pump': { ebayCategoryId: '184101', ebayCategoryName: 'Hydraulic Pumps' },
  'Condensate Pump': { ebayCategoryId: '184101', ebayCategoryName: 'Hydraulic Pumps' },
  
  // ==================== VALVES - INDUSTRIAL ====================
  'Ball Valve': { ebayCategoryId: '260291', ebayCategoryName: 'Solenoid Valves & Coils' },
  'Butterfly Valve': { ebayCategoryId: '260291', ebayCategoryName: 'Solenoid Valves & Coils' },
  'Check Valve': { ebayCategoryId: '260291', ebayCategoryName: 'Solenoid Valves & Coils' },
  'Globe Valve': { ebayCategoryId: '260291', ebayCategoryName: 'Solenoid Valves & Coils' },
  'Gate Valve': { ebayCategoryId: '260291', ebayCategoryName: 'Solenoid Valves & Coils' },
  'Relief Valve': { ebayCategoryId: '260291', ebayCategoryName: 'Solenoid Valves & Coils' },
  'Pressure Relief Valve': { ebayCategoryId: '260291', ebayCategoryName: 'Solenoid Valves & Coils' },
  'Safety Valve': { ebayCategoryId: '260291', ebayCategoryName: 'Solenoid Valves & Coils' },
  'Control Valve': { ebayCategoryId: '260291', ebayCategoryName: 'Solenoid Valves & Coils' },
  'Needle Valve': { ebayCategoryId: '260291', ebayCategoryName: 'Solenoid Valves & Coils' },
  'Float Valve': { ebayCategoryId: '260291', ebayCategoryName: 'Solenoid Valves & Coils' },
  'Gas Valve': { ebayCategoryId: '260291', ebayCategoryName: 'Solenoid Valves & Coils' },
  'Steam Valve': { ebayCategoryId: '260291', ebayCategoryName: 'Solenoid Valves & Coils' },
  
  // ==================== TIMERS & COUNTERS ====================
  'Timer': { ebayCategoryId: '181682', ebayCategoryName: 'Industrial Timers' },
  'Digital Timer': { ebayCategoryId: '181682', ebayCategoryName: 'Industrial Timers' },
  'Analog Timer': { ebayCategoryId: '181682', ebayCategoryName: 'Industrial Timers' },
  'Counter': { ebayCategoryId: '181682', ebayCategoryName: 'Industrial Timers' },
  'Digital Counter': { ebayCategoryId: '181682', ebayCategoryName: 'Industrial Timers' },
  'Totalizer': { ebayCategoryId: '181682', ebayCategoryName: 'Industrial Timers' },
  'Tachometer': { ebayCategoryId: '181682', ebayCategoryName: 'Industrial Timers' },
  
  // ==================== TEMPERATURE CONTROLS ====================
  'Temperature Controller': { ebayCategoryId: '181684', ebayCategoryName: 'Temperature Controllers' },
  'PID Controller': { ebayCategoryId: '181684', ebayCategoryName: 'Temperature Controllers' },
  'Process Controller': { ebayCategoryId: '181684', ebayCategoryName: 'Temperature Controllers' },
  'Heater': { ebayCategoryId: '181684', ebayCategoryName: 'Temperature Controllers' },
  'Heater Band': { ebayCategoryId: '181684', ebayCategoryName: 'Temperature Controllers' },
  'Cartridge Heater': { ebayCategoryId: '181684', ebayCategoryName: 'Temperature Controllers' },
  
  // ==================== PANEL METERS & GAUGES ====================
  'Panel Meter': { ebayCategoryId: '181683', ebayCategoryName: 'Panel Meters' },
  'Digital Panel Meter': { ebayCategoryId: '181683', ebayCategoryName: 'Panel Meters' },
  'Ammeter': { ebayCategoryId: '181683', ebayCategoryName: 'Panel Meters' },
  'Voltmeter': { ebayCategoryId: '181683', ebayCategoryName: 'Panel Meters' },
  'Wattmeter': { ebayCategoryId: '181683', ebayCategoryName: 'Panel Meters' },
  'Gauge': { ebayCategoryId: '181683', ebayCategoryName: 'Panel Meters' },
  'Pressure Gauge': { ebayCategoryId: '181683', ebayCategoryName: 'Panel Meters' },
  'Temperature Gauge': { ebayCategoryId: '181683', ebayCategoryName: 'Panel Meters' },
  
  // ==================== HVAC ====================
  'Fan': { ebayCategoryId: '181744', ebayCategoryName: 'Sensors' },
  'Blower': { ebayCategoryId: '181744', ebayCategoryName: 'Sensors' },
  'Cooling Fan': { ebayCategoryId: '181744', ebayCategoryName: 'Sensors' },
  'Exhaust Fan': { ebayCategoryId: '181744', ebayCategoryName: 'Sensors' },
  'Chiller': { ebayCategoryId: '181744', ebayCategoryName: 'Sensors' },
  
  // ==================== COMPUTERS & ACCESSORIES ====================
  'Industrial Computer': { ebayCategoryId: '181744', ebayCategoryName: 'Sensors' },
  'Industrial PC': { ebayCategoryId: '181744', ebayCategoryName: 'Sensors' },
  'Panel PC': { ebayCategoryId: '181744', ebayCategoryName: 'Sensors' },
  'Embedded Computer': { ebayCategoryId: '181744', ebayCategoryName: 'Sensors' },
  
  // ==================== CABLES & CONNECTORS ====================
  'Cable': { ebayCategoryId: '181744', ebayCategoryName: 'Sensors' },
  'Cordset': { ebayCategoryId: '181744', ebayCategoryName: 'Sensors' },
  'Cord Set': { ebayCategoryId: '181744', ebayCategoryName: 'Sensors' },
  'Connector': { ebayCategoryId: '181744', ebayCategoryName: 'Sensors' },
  'Sensor Cable': { ebayCategoryId: '181744', ebayCategoryName: 'Sensors' },
  'Motor Cable': { ebayCategoryId: '181744', ebayCategoryName: 'Sensors' },
  'Encoder Cable': { ebayCategoryId: '181744', ebayCategoryName: 'Sensors' },
};

// ============================================================================
// PRODUCT TYPE TO EBAY STORE CATEGORY MAPPING (COMPREHENSIVE)
// Maps AI-detected product type to YOUR eBay Store Categories
// ============================================================================

const PRODUCT_TYPE_TO_STORE_CATEGORY = {
  // ==================== AUTOMATION CONTROL ====================
  'PLC': '5404089015',
  'PLC Processor': '5404089015',
  'PLC CPU': '5404089015',
  'PLC Chassis': '5404089015',
  'PLC Rack': '5404089015',
  'PLC Power Supply': '2242362015',
  'PLC I/O Module': '18373835',
  'I/O Module': '18373835',
  'Input Module': '18373835',
  'Output Module': '18373835',
  'Communication Module': '18373835',
  'Network Module': '18373835',
  'HMI': '6686264015',
  'Touch Panel': '6686264015',
  'Operator Interface': '6686264015',
  'Operator Panel': '6686264015',
  'Touch Screen': '6686264015',
  'Power Supply': '2242362015',
  'Switching Power Supply': '2242362015',
  'DC Power Supply': '2242362015',
  'AC Power Supply': '2242362015',
  'Industrial Power Supply': '2242362015',
  'DIN Rail Power Supply': '2242362015',
  
  // ==================== POWER TRANSMISSION ====================
  'Servo Motor': '393389015',
  'AC Servo Motor': '393389015',
  'DC Servo Motor': '393389015',
  'Brushless Servo Motor': '393389015',
  'Stepper Motor': '17167471',
  'Step Motor': '17167471',
  'Stepping Motor': '17167471',
  'Electric Motor': '17167471',
  'AC Motor': '17167471',
  'Induction Motor': '17167471',
  'Three Phase Motor': '17167471',
  'Single Phase Motor': '17167471',
  'DC Motor': '17167471',
  'Brushless DC Motor': '17167471',
  'BLDC Motor': '17167471',
  'Gearmotor': '17167471',
  'Gear Motor': '17167471',
  'Geared Motor': '17167471',
  'Gearbox': '6688332015',
  'Gear Reducer': '6688332015',
  'Speed Reducer': '6688332015',
  'Worm Gear': '6688332015',
  'Planetary Gearbox': '6688332015',
  'Helical Gearbox': '6688332015',
  'Right Angle Gearbox': '6688332015',
  'Ball Screw': '6690432015',
  'Ball Screw Assembly': '6690432015',
  'Ball Nut': '6690432015',
  'Lead Screw': '6690432015',
  'Linear Actuator': '6690433015',
  'Electric Linear Actuator': '6690433015',
  'Linear Stage': '6690433015',
  'Linear Module': '6690433015',
  'Linear Guide': '6690434015',
  'Linear Rail': '6690434015',
  'Linear Slide': '6690434015',
  'Rail Block': '6690434015',
  'Carriage': '6690434015',
  'Belt': '6688333015',
  'Timing Belt': '6688333015',
  'V-Belt': '6688333015',
  'Pulley': '6688333015',
  'Timing Pulley': '6688333015',
  'Sprocket': '6688334015',
  'Chain': '6688335015',
  'Roller Chain': '6688335015',
  'Brake': '6688331015',
  'Motor Brake': '6688331015',
  'Electromagnetic Brake': '6688331015',
  'Clutch': '393386015',
  'Electromagnetic Clutch': '393386015',
  'Clutch Brake': '393386015',
  
  // ==================== MOTION CONTROL ====================
  'Servo Drive': '393390015',
  'Servo Amplifier': '393390015',
  'Servo Controller': '393390015',
  'Encoder': '1802953015',
  'Rotary Encoder': '1802953015',
  'Incremental Encoder': '1802953015',
  'Absolute Encoder': '1802953015',
  'Shaft Encoder': '1802953015',
  'Hollow Shaft Encoder': '1802953015',
  'Linear Encoder': '1802953015',
  'Magnetic Encoder': '1802953015',
  'Resolver': '1802953015',
  
  // ==================== SPEED CONTROLS ====================
  'VFD': '2242358015',
  'Variable Frequency Drive': '2242358015',
  'AC Drive': '2242358015',
  'Inverter': '2242358015',
  'Frequency Inverter': '2242358015',
  'DC Drive': '6688299015',
  'DC Motor Drive': '6688299015',
  'Stepper Drive': '393390015',
  'Stepper Controller': '393390015',
  'Step Drive': '393390015',
  
  // ==================== ELECTRICAL ====================
  'Circuit Breaker': '5634105015',
  'Molded Case Circuit Breaker': '5634105015',
  'MCCB': '5634105015',
  'Miniature Circuit Breaker': '5634105015',
  'MCB': '5634105015',
  'Disconnect Switch': '20338717',
  'Disconnect': '20338717',
  'Safety Switch': '20338717',
  'Fuse': '18373807',
  'Fuse Holder': '18373807',
  'Fuse Block': '18373807',
  'Transformer': '5634104015',
  'Control Transformer': '5634104015',
  'Isolation Transformer': '5634104015',
  'Step Down Transformer': '5634104015',
  'Enclosure': '18373801',
  'Electrical Enclosure': '18373801',
  'Junction Box': '18373801',
  'Control Panel': '18373801',
  
  // ==================== INDUSTRIAL CONTROL ====================
  'Contactor': '2348910015',
  'AC Contactor': '2348910015',
  'DC Contactor': '2348910015',
  'Motor Starter': '2348910015',
  'Soft Starter': '2348910015',
  'DOL Starter': '2348910015',
  'Motor Protector': '2348910015',
  'Overload Relay': '2348910015',
  'Relay': '2242359015',
  'Control Relay': '2242359015',
  'Ice Cube Relay': '2242359015',
  'Plug-in Relay': '2242359015',
  'Safety Relay': '2464037015',
  'Safety Controller': '2464037015',
  'Safety Interlock': '2464037015',
  'Safety Door Switch': '2464037015',
  'Safety Mat': '2464037015',
  'Solid State Relay': '2242359015',
  'SSR': '2242359015',
  'Time Delay Relay': '18373798',
  'Timer': '18373798',
  'Digital Timer': '18373798',
  'Analog Timer': '18373798',
  'Counter': '18373799',
  'Digital Counter': '18373799',
  'Totalizer': '18373799',
  'Tachometer': '18373799',
  'Limit Switch': '4173745015',
  'Micro Switch': '4173752015',
  'Miniature Switch': '4173752015',
  'Push Button': '4173735015',
  'Pushbutton': '4173735015',
  'Pushbutton Switch': '4173735015',
  'E-Stop': '4173756015',
  'Emergency Stop': '4173756015',
  'Selector Switch': '4173742015',
  'Rotary Switch': '4173742015',
  'Toggle Switch': '6688149015',
  'Key Switch': '4173738015',
  'Foot Switch': '4173739015',
  'Palm Switch': '4173743015',
  'Joystick': '4173758015',
  'Pendant': '6688149015',
  'Pendant Control': '6688149015',
  'Pilot Light': '2464042015',
  'Indicator Light': '2464042015',
  'Stack Light': '6690583015',
  'Tower Light': '6690583015',
  'Signal Light': '6690583015',
  'Illuminated Button': '4173737015',
  'Maintained Button': '4173736015',
  'Momentary Button': '4173735015',
  'Potentiometer': '4173757015',
  'Panel Meter': '5634088015',
  'Digital Panel Meter': '5634088015',
  'Ammeter': '5634088015',
  'Voltmeter': '5634088015',
  'Wattmeter': '5634088015',
  'Gauge': '1484016015',
  'Pressure Gauge': '1484016015',
  'Temperature Gauge': '1484016015',
  'Temperature Controller': '2461872015',
  'PID Controller': '2461872015',
  'Process Controller': '2461872015',
  'Pressure Control': '1484009015',
  'Transducer': '18373834',
  'Transmitter': '5634089015',
  'Sound Module': '6327053015',
  'Cord Set': '1856435015',
  'Cordset': '1856435015',
  
  // ==================== SENSING DEVICES ====================
  'Proximity Sensor': '4173791015',
  'Inductive Proximity Sensor': '4173791015',
  'Inductive Sensor': '4173791015',
  'Capacitive Proximity Sensor': '4173791015',
  'Capacitive Sensor': '4173791015',
  'Magnetic Proximity Sensor': '4173791015',
  'Photoelectric Sensor': '4173793015',
  'Photo Sensor': '4173793015',
  'Optical Sensor': '4173793015',
  'Through Beam Sensor': '4173793015',
  'Retroreflective Sensor': '4173793015',
  'Diffuse Sensor': '4173793015',
  'Fiber Optic Sensor': '5785856015',
  'Fiber Optic Amplifier': '5785856015',
  'Pressure Sensor': '6690386015',
  'Pressure Transducer': '6690386015',
  'Pressure Transmitter': '6690386015',
  'Temperature Sensor': '6690556015',
  'Thermocouple': '6690556015',
  'RTD': '6690556015',
  'Temperature Probe': '6690556015',
  'Flow Sensor': '4173798015',
  'Flow Meter': '4173798015',
  'Flow Switch': '4173798015',
  'Level Sensor': '4173792015',
  'Level Switch': '4173792015',
  'Float Switch': '4173792015',
  'Ultrasonic Sensor': '4173792015',
  'Laser Sensor': '2479732015',
  'Laser Distance Sensor': '2479732015',
  'Color Sensor': '4173796015',
  'Color Mark Sensor': '4173796015',
  'Vision Sensor': '6686267015',
  'Vision System': '6686267015',
  'Camera': '6686267015',
  'Current Sensor': '4173797015',
  'Current Transformer': '4173797015',
  'Light Sensor': '4173799015',
  'Load Cell': '5436340015',
  'Force Sensor': '5436340015',
  'Linear Sensor': '5634087015',
  'Position Sensor': '5634087015',
  'LVDT': '5634087015',
  'Light Curtain': '393379015',
  'Safety Light Curtain': '393379015',
  'Safety Barrier': '393379015',
  'Safety Scanner': '393379015',
  'Area Scanner': '393379015',
  'Barcode Scanner': '6690176015',
  'Barcode Reader': '6690176015',
  'Bar Code Scanner': '6690176015',
  'QR Code Reader': '6690176015',
  '2D Scanner': '6690176015',
  'RFID Reader': '6695702015',
  'RFID Antenna': '6695702015',
  'RFID Tag': '6695702015',
  
  // ==================== BEARINGS ====================
  'Bearing': '6690505015',
  'Ball Bearing': '4173714015',
  'Roller Bearing': '4173168015',
  'Tapered Roller Bearing': '4173167015',
  'Needle Bearing': '4173171015',
  'Thrust Bearing': '4173169015',
  'Pillow Block': '4173166015',
  'Pillow Block Bearing': '4173166015',
  'Flange Bearing': '4173165015',
  'Cam Follower': '4173170015',
  'Linear Bearing': '4173713015',
  'Linear Bushing': '4173713015',
  
  // ==================== PNEUMATICS ====================
  'Pneumatic Cylinder': '2461873015',
  'Air Cylinder': '2461873015',
  'Compact Cylinder': '2461873015',
  'Round Cylinder': '2461873015',
  'ISO Cylinder': '2461873015',
  'NFPA Cylinder': '2461873015',
  'Rodless Cylinder': '2461873015',
  'Guided Cylinder': '2461873015',
  'Slide Cylinder': '2461873015',
  'Rotary Cylinder': '2461873015',
  'Pneumatic Actuator': '2461878015',
  'Pneumatic Gripper': '6699359015',
  'Gripper': '6699359015',
  'Parallel Gripper': '6699359015',
  'Angular Gripper': '6699359015',
  'Pneumatic Valve': '2461874015',
  'Solenoid Valve': '6690468015',
  'Air Valve': '2461874015',
  'Directional Valve': '2461874015',
  'Manifold': '2461874015',
  'Valve Manifold': '2461874015',
  'Valve Terminal': '2461874015',
  'Air Regulator': '2461875015',
  'Pressure Regulator': '2461875015',
  'Filter Regulator': '2461875015',
  'FRL Unit': '2461875015',
  'FRL': '2461875015',
  'Air Filter': '2461880015',
  'Compressed Air Filter': '2461880015',
  'Coalescing Filter': '2461880015',
  'Lubricator': '2461876015',
  'Air Lubricator': '2461876015',
  'Air Dryer': '2461877015',
  'Muffler': '6690373015',
  'Silencer': '6690373015',
  'Nipper': '6699358015',
  
  // ==================== HYDRAULICS ====================
  'Hydraulic Cylinder': '6696061015',
  'Hydraulic Ram': '6696061015',
  'Hydraulic Actuator': '6696062015',
  'Hydraulic Valve': '6696060015',
  'Directional Control Valve': '6696060015',
  'Proportional Valve': '6696060015',
  'Servo Valve': '6696060015',
  'Hydraulic Pump': '6696064015',
  'Gear Pump': '6696064015',
  'Vane Pump': '6696064015',
  'Piston Pump': '6696064015',
  'Hydraulic Motor': '6689962015',
  'Hydraulic Power Unit': '6696064015',
  'HPU': '6696064015',
  'Hydraulic Accumulator': '6696063015',
  'Accumulator': '6696063015',
  'Hydraulic Filter': '2343163015',
  
  // ==================== PUMPS ====================
  'Pump': '6689959015',
  'Centrifugal Pump': '6689968015',
  'Diaphragm Pump': '6689969015',
  'Metering Pump': '6689970015',
  'Dosing Pump': '6689970015',
  'Vacuum Pump': '6689967015',
  'Condensate Pump': '6689971015',
  
  // ==================== VALVES ====================
  'Ball Valve': '6690466015',
  'Butterfly Valve': '6690465015',
  'Check Valve': '6690467015',
  'Globe Valve': '6690472015',
  'Gate Valve': '6690464015',
  'Relief Valve': '6690486015',
  'Pressure Relief Valve': '6690486015',
  'Safety Valve': '6690486015',
  'Control Valve': '6690464015',
  'Needle Valve': '6690464015',
  'Float Valve': '6690474015',
  'Gas Valve': '6690469015',
  'Steam Valve': '6690473015',
  'Lockout Valve': '6690470015',
  'Proportional Valves': '6690471015',
  
  // ==================== FILTRATION ====================
  'Coolant Filter': '2343166015',
  'Oil Filter': '2343165015',
  'Water Filter': '2343162015',
  
  // ==================== HVAC ====================
  'Fan': '2457884015',
  'Blower': '2457884015',
  'Cooling Fan': '2457884015',
  'Exhaust Fan': '2457884015',
  'Chiller': '2457873015',
  
  // ==================== COMPUTERS ====================
  'Industrial Computer': '19438754015',
  'Industrial PC': '19438754015',
  'Panel PC': '19438754015',
  'Embedded Computer': '19438754015',
  
  // ==================== ASSEMBLY TOOLS ====================
  'Assembly Tool': '11495474015',
  'Torque Wrench': '11495474015',
  'Screwdriver': '11495474015',
  
  // ==================== CABLES & MISC ====================
  'Cable': '1856435015',
  'Connector': '1856435015',
  'Sensor Cable': '1856435015',
  'Motor Cable': '1856435015',
  'Encoder Cable': '1856435015',
  'Heater': '6688149015',
  'Heater Band': '6688149015',
  'Cartridge Heater': '6688149015',
};

// ALL PRODUCTS store category ID (for Store Category 2)
const ALL_PRODUCTS_STORE_CATEGORY = '23399313015';

// ============================================================================
// AI PROMPT TO IDENTIFY PRODUCT TYPE
// ============================================================================

function buildProductIdentificationPrompt(brand, partNumber) {
  return `You are an expert industrial equipment specialist. Research and identify this EXACT product: ${brand} ${partNumber}

CRITICAL: You MUST find specifications for the EXACT model number "${partNumber}" by ${brand}. 
- Do NOT substitute specs from a similar or related model.
- Do NOT use specs from a different size, voltage, or variant.
- If you cannot find the exact specs for "${partNumber}", return what you CAN confirm and set "qualityFlag" to "NEEDS ATTENTION".
- The model/MPN in your response MUST be "${partNumber}" — not a similar part number.

FIRST, determine what TYPE of product this is. Choose the MOST SPECIFIC type from this list:

**MOTORS:** Servo Motor, AC Servo Motor, DC Servo Motor, Stepper Motor, Electric Motor, AC Motor, DC Motor, Gearmotor, Induction Motor
**DRIVES:** Servo Drive, Servo Amplifier, VFD, Variable Frequency Drive, AC Drive, DC Drive, Stepper Drive, Inverter
**PLCs:** PLC, PLC Processor, PLC Chassis, PLC Power Supply, PLC I/O Module, I/O Module, Communication Module, Network Module
**HMIs:** HMI, Touch Panel, Operator Interface, Touch Screen
**POWER:** Power Supply, Switching Power Supply, DC Power Supply, Transformer
**ELECTRICAL:** Circuit Breaker, Disconnect, Fuse, Contactor, Motor Starter, Soft Starter, Overload Relay
**RELAYS:** Relay, Control Relay, Safety Relay, Solid State Relay, Time Delay Relay
**SENSORS - PROXIMITY:** Proximity Sensor, Inductive Proximity Sensor, Capacitive Proximity Sensor
**SENSORS - PHOTOELECTRIC:** Photoelectric Sensor, Fiber Optic Sensor, Through Beam Sensor
**SENSORS - OTHER:** Pressure Sensor, Temperature Sensor, Flow Sensor, Level Sensor, Laser Sensor, Color Sensor, Current Sensor, Load Cell, Linear Sensor, Vision Sensor
**SAFETY:** Light Curtain, Safety Scanner, Safety Controller, Safety Interlock, E-Stop
**ENCODERS:** Encoder, Rotary Encoder, Incremental Encoder, Absolute Encoder, Linear Encoder, Resolver
**BARCODE/RFID:** Barcode Scanner, Barcode Reader, RFID Reader
**SWITCHES:** Limit Switch, Micro Switch, Push Button, Selector Switch, Key Switch, Foot Switch, Joystick
**INDICATORS:** Pilot Light, Stack Light, Tower Light
**PNEUMATIC CYLINDERS:** Pneumatic Cylinder, Air Cylinder, Compact Cylinder, Rodless Cylinder, Guided Cylinder, Pneumatic Gripper
**PNEUMATIC VALVES:** Pneumatic Valve, Solenoid Valve, Manifold
**PNEUMATIC OTHER:** Air Regulator, FRL, Air Filter, Lubricator, Air Dryer, Muffler
**HYDRAULICS:** Hydraulic Cylinder, Hydraulic Valve, Hydraulic Pump, Hydraulic Motor, Hydraulic Accumulator
**POWER TRANSMISSION:** Gearbox, Gear Reducer, Ball Screw, Linear Actuator, Linear Guide, Linear Rail, Brake, Clutch, Belt, Pulley, Sprocket, Chain
**BEARINGS:** Ball Bearing, Roller Bearing, Needle Bearing, Thrust Bearing, Pillow Block, Linear Bearing, Cam Follower
**PUMPS:** Centrifugal Pump, Diaphragm Pump, Vacuum Pump, Metering Pump
**VALVES:** Ball Valve, Butterfly Valve, Check Valve, Globe Valve, Relief Valve, Control Valve
**TIMERS/COUNTERS:** Timer, Counter, Tachometer
**TEMPERATURE:** Temperature Controller, PID Controller, Heater
**METERS:** Panel Meter, Ammeter, Voltmeter, Pressure Gauge

Return ONLY valid JSON (no markdown, no code blocks):
{
  "productType": "The specific product type from the list above",
  "title": "Professional eBay title, max 80 characters, include brand, model, key specs",
  "shortDescription": "SEO meta description, 150-160 characters",
  "description": "HTML description - SEE FORMAT BELOW",
  "specifications": {
    "brand": "${brand}",
    "mpn": "${partNumber}",
    "manufacturer": "Manufacturer name",
    "model": "Model number if different from MPN",
    "type": "The product type (same as productType above)"
  },
  "qualityFlag": "COMPLETE"
}

IMPORTANT RULES:
1. "productType" MUST be one of the specific types listed above - be as specific as possible
2. "type" in specifications should match "productType" 
3. Add ALL relevant technical specifications to the specifications object
4. Use lowercase keys with no spaces (e.g., "inputvoltage", "outputcurrent", "sensingdistance")

DESCRIPTION FORMAT (must be valid HTML):
<p>[2-3 sentence professional introduction explaining what this product is, its purpose, and key features. NO promotional language.]</p>

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
<!-- ADD ALL EXTRACTED TECHNICAL SPECS AS TABLE ROWS -->
</tbody>
</table>

<p style="margin-top: 20px;">We warranty all items for 30 days from date of purchase.</p>

REQUIREMENTS:
✅ Title MUST be 80 characters or less
✅ Description MUST include the HTML specs table with ALL found specifications
✅ NO promotional language, NO warranty claims in the specifications table
✅ NO URLs, emails, or phone numbers`;
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

  console.log('=== SEARCH PRODUCT V2 (AI-DRIVEN) ===');
  console.log('Brand:', brand);
  console.log('Part:', partNumber);

  try {
    const client = new Anthropic();
    
    // Step 1: Have AI identify product and generate listing
    const prompt = buildProductIdentificationPrompt(brand, partNumber);
    
    const response = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4096,
      messages: [{ role: 'user', content: prompt }]
    });

    // Extract the JSON from AI response
    const text = response.content?.filter(b => b.type === 'text').map(b => b.text).join('') || '';
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    
    if (!jsonMatch) {
      throw new Error('No valid JSON in AI response');
    }
    
    const product = JSON.parse(jsonMatch[0]);
    const productType = product.productType || '';
    
    console.log('AI Detected Product Type:', productType);
    
    // Step 2: Map product type to eBay Category
    const ebayMapping = PRODUCT_TYPE_TO_EBAY_CATEGORY[productType] || null;
    const ebayCategoryId = ebayMapping?.ebayCategoryId || '';
    const ebayCategoryName = ebayMapping?.ebayCategoryName || productType;
    
    console.log('eBay Category ID:', ebayCategoryId);
    console.log('eBay Category Name:', ebayCategoryName);
    
    // Step 3: Map product type to Store Category
    const ebayStoreCategoryId = PRODUCT_TYPE_TO_STORE_CATEGORY[productType] || '';
    const ebayStoreCategoryId2 = ALL_PRODUCTS_STORE_CATEGORY; // Always "ALL PRODUCTS"
    
    console.log('eBay Store Category 1:', ebayStoreCategoryId);
    console.log('eBay Store Category 2:', ebayStoreCategoryId2, '(ALL PRODUCTS)');
    
    // Step 4: Fetch eBay item specifics for this category (if we have a category ID)
    let ebayAspects = null;
    if (ebayCategoryId) {
      try {
        const baseUrl = req.headers.host?.includes('localhost') 
          ? `http://${req.headers.host}` 
          : `https://${req.headers.host}`;
        
        // Note: The endpoint is /api/ebay-category-aspects (NOT /api/ebay/get-category-aspects)
        const aspectsResponse = await fetch(`${baseUrl}/api/ebay-category-aspects?categoryId=${ebayCategoryId}`);
        if (aspectsResponse.ok) {
          ebayAspects = await aspectsResponse.json();
          console.log('eBay Aspects Loaded:', ebayAspects?.totalAspects || 0, 'aspects');
        } else {
          console.log('eBay Aspects API returned:', aspectsResponse.status);
        }
      } catch (error) {
        console.log('Failed to fetch eBay aspects:', error.message);
      }
    }
    
    // Return the full response with category mappings
    res.status(200).json({
      content: response.content,
      _metadata: {
        productType: productType,
        detectedCategory: ebayCategoryName,
        detectedCategoryId: ebayCategoryId,
        ebayStoreCategoryId: ebayStoreCategoryId,
        ebayStoreCategoryId2: ebayStoreCategoryId2,
        ebayAspectsLoaded: !!ebayAspects,
        totalAspects: ebayAspects?.totalAspects || 0,
        requiredAspects: ebayAspects?.required?.length || 0,
        recommendedAspects: ebayAspects?.recommended?.length || 0
      },
      _ebayAspects: ebayAspects
    });
    
  } catch (error) {
    console.error('Search API error:', error);
    res.status(500).json({ error: error.message });
  }
}
