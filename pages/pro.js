// pages/pro.js
// Pro Listing Builder with SKU Lookup and Comparison Features
// Updated: January 2025

import React, { useState, useRef, useEffect } from 'react';
import { Search, Plus, Trash2, CheckCircle, Loader, AlertCircle, X, Camera, Upload, Download, RefreshCw, ChevronDown, ChevronUp, ExternalLink, ArrowRight, Check } from 'lucide-react';
import { db } from '../firebase';
import { collection, addDoc, updateDoc, deleteDoc, doc, onSnapshot, query, orderBy, serverTimestamp } from 'firebase/firestore';
import InventoryCheckAlert from '../components/InventoryCheckAlert';
import { normalizeCoilVoltage, STANDARD_COIL_VOLTAGES } from '../lib/coil-voltage-normalizer';
import dynamic from 'next/dynamic';
const ReactQuill = dynamic(() => import('react-quill'), {
  ssr: false,
  loading: () => <div className="h-64 border rounded-lg flex items-center justify-center text-gray-400">Loading editor...</div>
});

const QUILL_MODULES = {
  toolbar: [
    [{ 'header': [1, 2, 3, false] }],
    ['bold', 'italic', 'underline', 'strikethrough'],
    [{ 'list': 'ordered' }, { 'list': 'bullet' }],
    [{ 'align': [] }],
    ['link'],
    ['clean']
  ]
};

const QUILL_FORMATS = [
  'header', 'bold', 'italic', 'underline', 'strikethrough',
  'list', 'align', 'link'
];

// ============================================================================
// TABLE PRESERVATION SYSTEM
// ReactQuill doesn't support <table> tags, so we split them out for editing
// ============================================================================

/**
 * Split HTML description by table tags
 * @param {string} html - Full HTML description with potential table
 * @returns {object} - { beforeTable, table, afterTable, hasTable }
 */
function splitDescriptionByTable(html) {
  if (!html) return { beforeTable: '', table: '', afterTable: '', hasTable: false };

  // Match the entire table including opening and closing tags
  const tableRegex = /<table[^>]*>[\s\S]*?<\/table>/i;
  const match = html.match(tableRegex);

  if (!match) {
    return { beforeTable: html, table: '', afterTable: '', hasTable: false };
  }

  const tableHtml = match[0];
  const tableStart = match.index;
  const tableEnd = tableStart + tableHtml.length;

  return {
    beforeTable: html.substring(0, tableStart).trim(),
    table: tableHtml,
    afterTable: html.substring(tableEnd).trim(),
    hasTable: true
  };
}

/**
 * Merge description parts back into single HTML
 * @param {string} beforeTable - Content before table (from ReactQuill)
 * @param {string} table - Table HTML (preserved as-is)
 * @param {string} afterTable - Content after table (editable or from original)
 * @returns {string} - Complete HTML description
 */
function mergeDescriptionParts(beforeTable, table, afterTable) {
  const parts = [];
  if (beforeTable && beforeTable.trim()) parts.push(beforeTable.trim());
  if (table && table.trim()) parts.push(table.trim());
  if (afterTable && afterTable.trim()) parts.push(afterTable.trim());
  return parts.join('\n\n');
}

// Product category options - will be built from EBAY_CATEGORY_ID_TO_NAME
let CATEGORY_OPTIONS = [];
// CATEGORY_DROPDOWN_OPTIONS will be built after EBAY_CATEGORY_ID_TO_NAME is defined
let CATEGORY_DROPDOWN_OPTIONS = [];
// EBAY_CATEGORY_TAXONOMY - will be built from EBAY_CATEGORY_ID_TO_NAME
let EBAY_CATEGORY_TAXONOMY = {};
// eBay MARKETPLACE Categories - will be built from EBAY_CATEGORY_ID_TO_NAME
let EBAY_MARKETPLACE_CATEGORIES = {};

// eBay Category ID to Name Lookup (309 categories from your active listings)
const EBAY_CATEGORY_ID_TO_NAME = {
  '184271': 'Address & Shipping Labels',
  '181993': 'Adjustable Power Supplies',
  '184114': 'Air Control Valves',
  '43509': 'Air Filters',
  '258224': 'Air Filtration Systems & Dust Collectors',
  '183985': 'Air Pressure Gauges',
  '183988': 'Air Pressure Regulators',
  '46575': 'Air Tool Accessories',
  '53147': 'Alarm Control Panels & Keypads',
  '181930': 'Autotransformers',
  '181750': 'Ball & Roller Bearings',
  '184117': 'Ball Valves',
  '46706': 'Barcode Scanners',
  '181737': 'Bearing Blocks & Supports',
  '131199': 'Belt Conveyors',
  '109490': 'Brackets & Joining Plates',
  '259065': 'Brakes & Brake Parts',
  '185138': 'Breadboards & Pinboards',
  '259067': 'Bucket Teeth, Linkage Parts, Pins & Bushings',
  '181751': 'Bushings & Plain Bearings',
  '184118': 'Butterfly Valves',
  '58162': 'Buzzers & Speakers',
  '131542': 'CD, DVD & Blu-ray Drives',
  '181843': 'Cable Carriers',
  '181752': 'Cam Followers',
  '66961': 'Canister & Wet/Dry Vacuums',
  '4662': 'Capacitors',
  '178187': 'Category 22',
  '183802': 'Caulk Guns',
  '124635': 'Centrifugal Pumps',
  '184120': 'Check & Foot Valves',
  '260064': 'Chillers',
  '185134': 'Circuit Breakers',
  '181699': 'Combination Starters',
  '124511': 'Commercial Door Hardware',
  '181878': 'Component Solenoids',
  '183990': 'Compressed Air Filters',
  '42887': 'Conduit',
  '260836': 'Connector Accessories',
  '181685': 'Contactor Accessories',
  '181688': 'Control & Machine Tool Relays',
  '260826': 'Control Switches',
  '184172': 'Conveyor Rollers',
  '181715': 'Counter Modules',
  '181931': 'Current Transformers',
  '58196': 'Cut-Off & Chop Wheels',
  '259066': 'Cutting Edges, Box Blade Parts & Shanks',
  '181682': 'Definite Purpose Contactors',
  '181731': 'Definite Purpose Motors',
  '124636': 'Diaphragm Pumps',
  '184121': 'Diaphragm Valves',
  '31388': 'Digital Cameras',
  '185135': 'Disconnectors & Load Switches',
  '184180': 'Dock Levelers',
  '180004': 'Edge Protectors',
  '42886': 'Electrical Boxes & Enclosures',
  '53112': 'Electrical Outlets & Receptacles',
  '55824': 'Electrical Panel & Distribution Boards',
  '73135': 'Electrical Plugs',
  '259281': 'Electrical Switches & Dimmers',
  '65489': 'Electronic Component Fans',
  '260262': 'Enclosures',
  '88433': 'Every Other Thing',
  '183948': 'Extension & Compression Springs',
  '183842': 'Eyewash Stations',
  '63897': 'Faucets',
  '65511': 'Fiber Optic Cable',
  '181786': 'Fiber Optic Sensors',
  '183965': 'Filter Driers',
  '183993': 'Filter Regulator Lubricators',
  '259094': 'Filters',
  '181912': 'Fixed Resistors',
  '181770': 'Flexible Couplings',
  '67070': 'Flow Meters',
  '258227': 'Fluid Filtration Systems, Vessels & Housings',
  '184183': 'Forklift Batteries & Chargers',
  '97185': 'Forklifts & Telehandlers',
  '260824': 'Fuse Accessories',
  '260823': 'Fuses & Links',
  '50965': 'Gas Detectors & Monitors',
  '182916': 'Gas Regulators, Valves & Accessories',
  '181772': 'Gearboxes & Speed Reducers',
  '65452': 'Gearmotors',
  '42894': 'General Purpose AC Drives',
  '78190': 'General Purpose DC Drives',
  '181732': 'General Purpose Motors',
  '36328': 'General Purpose Relays',
  '183791': 'Glue Guns',
  '27386': 'Graphics/Video Cards',
  '181709': 'HMI & Open Interface Panels',
  '53302': 'HVAC & Refrigeration Thermostats',
  '53296': 'HVAC & Refrigeration: Controls & Circuit Boards',
  '53297': 'HVAC & Refrigeration: Fans & Blowers',
  '66998': 'HVAC & Refrigeration: Gauges & Probes',
  '260430': 'HVAC Pumps',
  '53301': 'HVAC Sensors',
  '109484': 'Heat Exchangers',
  '109569': 'Heat Guns',
  '183835': 'Hot Glue Dispensers',
  '181767': 'Hydraulic & Pneumatic Clutches',
  '184027': 'Hydraulic & Pneumatic Cylinders',
  '257890': 'Hydraulic & Pneumatic Motors',
  '184029': 'Hydraulic Filters',
  '11773': 'Hydraulic Pumps',
  '259081': 'Hydraulics',
  '181680': 'IEC & NEMA Contactors',
  '58239': 'Indicators',
  '181880': 'Individual LEDS',
  '7288': 'Inductors, Coils & Filters',
  '260829': 'Industrial Control & General Purpose Transformers',
  '26219': 'Industrial Lighting Fixtures',
  '260272': 'Industrial Robot Parts',
  '50924': 'Industrial Robotic Arms',
  '260289': 'Industrial Vibrators',
  '58235': 'Inspection Gages',
  '56083': 'Internal Hard Disk Drives',
  '181847': 'Joystick & Lever Switches',
  '181887': 'LCD Display Modules',
  '185218': 'Lab Scales & Beam Balances',
  '25348': 'Label Makers',
  '184274': 'Label Printers & Applicators',
  '258074': 'Laser Cutting Machines',
  '185268': 'Laser Modules & Heads',
  '181739': 'Lead, Ball & Roller Screws',
  '184211': 'Lifting Magnets',
  '66915': 'Lighting Ballasts & Starters',
  '111606': 'Limit & Snap Action Switches',
  '55826': 'Linear Actuators',
  '181741': 'Linear Bearings & Bushings',
  '181742': 'Linear Encoders',
  '67054': 'MIG Guns & Torches',
  '124822': 'MIG Welders',
  '100180': 'Magnet & Enameled Wire',
  '260827': 'Magnetic & Reed Switches',
  '181759': 'Magnetic Brakes',
  '181766': 'Magnetic Clutches',
  '185210': 'Magnetic Stirrers & Hotplate Stirrers',
  '119111': 'Magnets',
  '181707': 'Manual Starters',
  '11760': 'Manufacturing',
  '80053': 'Monitors',
  '175668': 'Motherboard Components',
  '181753': 'Mounted Bearings & Housings',
  '73138': 'Multiple Conductor Cable',
  '88758': 'Multipurpose AC to DC Adapters',
  '171586': 'Nozzles, Collets & Lenses',
  '182012': 'Ohmmeters & Megohmmeters',
  '64043': 'Optical Fiber Cables',
  '181951': 'Optical Fiber Inspection',
  '104247': 'Oscilloscopes & Vectorscopes',
  '183837': 'Other Access Control Equipment',
  '41491': 'Other Air Compressors',
  '55809': 'Other Air Tools',
  '53145': 'Other Alarm Parts & Accessories',
  '36802': 'Other Automation Equipment',
  '185120': 'Other Bearing & Bushing Parts',
  '26261': 'Other Business & Industrial',
  '181953': 'Other Cameras & Imaging',
  '27432': 'Other Cameras & Photo',
  '183995': 'Other Compressed Air Treatment',
  '184169': 'Other Conveyor Systems',
  '92078': 'Other Electrical Equipment & Supplies',
  '66990': 'Other Electrical Tools',
  '184015': 'Other Fittings & Adapters',
  '184188': 'Other Forklift Parts & Accessories',
  '42912': 'Other HVAC & Refrigeration',
  '11752': 'Other Heavy Equipment Attachments',
  '97126': 'Other Heavy Equipment Parts & Accessories',
  '48718': 'Other Hydraulics & Pneumatics',
  '258267': 'Other Inspection Equipment & Components',
  '181962': 'Other Leads & Probes',
  '61574': 'Other Light Equipment & Tools',
  '42884': 'Other Lights & Lighting',
  '67031': 'Other Locks',
  '181783': 'Other Mechanical Power Transmission',
  '257874': 'Other Medical, Lab & Dental Supplies',
  '258086': 'Other Metalworking Equipment',
  '78193': 'Other Motor Controls',
  '71477': 'Other POS PC-Based Systems',
  '1290': 'Other Packing & Shipping',
  '109739': 'Other Packing Tapes & Straps',
  '11809': 'Other Process Engineering Equipment',
  '46547': 'Other Pumps',
  '181747': 'Other Rotary & Linear Motion',
  '58295': 'Other Semiconductor & PCB Manufacturing',
  '57520': 'Other Sensors',
  '46747': 'Other Specialty Printing',
  '181706': 'Other Starters',
  '25414': 'Other Test Equipment Parts & Accessories',
  '4678': 'Other Test Meters & Detectors',
  '40004': 'Other Test, Measurement & Inspection',
  '46548': 'Other Vacuum Pumps',
  '184148': 'Other Valves & Manifolds',
  '11774': 'Other Welding Equipment',
  '181690': 'Overcurrent Protection Relays',
  '181689': 'Overload Protection Relays',
  '181710': 'PLC Cables',
  '181711': 'PLC Chassis',
  '181717': 'PLC Ethernet & Communication',
  '181714': 'PLC Input & Output Modules',
  '181718': 'PLC Memory Modules',
  '181720': 'PLC Power Supplies',
  '181708': 'PLC Processors',
  '181721': 'PLC Redundancy Modules',
  '181722': 'PLC Servo Control Modules',
  '181712': 'PLC Software',
  '181723': 'PLC Temperature Modules',
  '184247': 'Packing Machines',
  '109738': 'Packing Tape Dispensers',
  '71403': 'Paint Sprayers & Striping Machines',
  '73129': 'Panel Indicators & Lamps',
  '58278': 'Panel Meters',
  '106402': 'Patio Heaters',
  '166672': 'Plasma Cutters',
  '67067': 'Plastic Granulators',
  '67066': 'Plastic Process Dryers',
  '71420': 'Plastic Welders & Sealers',
  '181691': 'Plug-In & Ice Cube Relays',
  '184145': 'Pneumatic Manifolds & Bases',
  '181913': 'Potentiometers',
  '182097': 'Power Cables & Connectors',
  '117000': 'Power Regulators & Converters',
  '67779': 'Power Strips & Surge Protectors',
  '42017': 'Power Supplies',
  '260831': 'Power Transformers',
  '65456': 'Pressure Sensors',
  '111607': 'Pressure Switches',
  '185140': 'Printed Circuit Boards (PCBs)',
  '182001': 'Process & Current Calibrators',
  '115949': 'Programmable Thermostats',
  '65459': 'Proximity Sensors',
  '181757': 'Pulleys & Sheaves',
  '260269': 'Pump Motors',
  '58166': 'Pushbutton Switches',
  '45019': 'Quick Change Tool Post',
  '184007': 'Quick Couplers',
  '184136': 'Quick Exhaust Valves',
  '36326': 'RFID Readers & Writers',
  '84236': 'Ratchet Wrenches',
  '258365': 'Reducer Bushings',
  '184097': 'Regenerative Blowers',
  '181697': 'Relay Accessories',
  '184137': 'Relief Valves',
  '181916': 'Rheostats',
  '258445': 'Riveting Machines',
  '181763': 'Roller Chain Sprockets',
  '181762': 'Roller Chains',
  '131200': 'Roller Conveyors',
  '181729': 'Rotary Actuators',
  '260300': 'Rotary Encoders',
  '65455': 'Rotary Encoders',
  '124638': 'Rotary Gear Pumps',
  '124608': 'Rotary Screw Air Compressors',
  '58168': 'Rotary Switches',
  '41943': 'Rotary Tables',
  '184098': 'Rotary Vane Pumps',
  '65464': 'Safety Relays',
  '52510': 'Scope Mounts & Accessories',
  '63917': 'Screwdrivers',
  '42255': 'Screwdrivers & Nutdrivers',
  '26217': 'Screws & Bolts',
  '11808': 'Sealers & Sealing Machines',
  '259667': 'Seals & O-Rings',
  '181780': 'Seals, O-Rings & Gaskets',
  '181850': 'Selector Switches',
  '184123': 'Selector Valves',
  '259670': 'Sensors',
  '78191': 'Servo Drives & Amplifiers',
  '124603': 'Servo Motors',
  '97201': 'Signal & Spectrum Analyzers',
  '257921': 'Signal Generators',
  '181806': 'Signal Towers',
  '53148': 'Sirens, Bells & Alarm Speakers',
  '183548': 'Slides, Rails & Carriages',
  '260291': 'Solenoid Valves & Coils',
  '181695': 'Solid State Relays',
  '71393': 'Speed Controls',
  '57028': 'Spindles',
  '149972': 'Splitters & Combiners',
  '184125': 'Spool Valves',
  '182901': 'Spot Welders',
  '181777': 'Spur Gears',
  '28062': 'Stair Machines & Steppers',
  '71394': 'Stepper Controls & Drives',
  '9723': 'Stepper Motors',
  '67007': 'Strapping Machines',
  '109614': 'Strobe & Beacon Lights',
  '260828': 'Switch Accessories',
  '181922': 'Switching Mode Power Supplies',
  '124825': 'TIG Welders',
  '184280': 'Tabletop Scales',
  '258416': 'Tap Collets',
  '65460': 'Temperature & Humidity Sensors',
  '48717': 'Terminal Blocks',
  '182016': 'Test Equipment Power Amplifiers',
  '185144': 'Thyristors & SCRs',
  '181696': 'Time Delay Relays',
  '181724': 'Timer Modules',
  '258398': 'Toggle Clamps',
  '58294': 'Tool & Machine Components',
  '4666': 'Transistors',
  '181791': 'Ultrasonic Sensors',
  '259687': 'Valves',
  '78192': 'Variable Frequency Drives',
  '258294': 'Wafer Processing Components',
  '182915': 'Welding Cables & Reels',
  '258304': 'Welding Wires',
  '260835': 'Wire & Cable Connectors',
  '259005': 'Work Tables',
};

// Initialize CATEGORY_OPTIONS from eBay category names (sorted alphabetically)
CATEGORY_OPTIONS = [...new Set(Object.values(EBAY_CATEGORY_ID_TO_NAME))].sort();

// Build EBAY_CATEGORY_TAXONOMY from EBAY_CATEGORY_ID_TO_NAME
// Path is "Business & Industrial > [category name]" - can be enhanced with full paths later
EBAY_CATEGORY_TAXONOMY = Object.fromEntries(
  Object.entries(EBAY_CATEGORY_ID_TO_NAME).map(([id, name]) => [
    id,
    { name, path: `Business & Industrial > ${name}` }
  ])
);

// Build dropdown options with category ID and path
// Format: "Category Name (123456)"
CATEGORY_DROPDOWN_OPTIONS = Object.entries(EBAY_CATEGORY_ID_TO_NAME)
  .map(([id, name]) => ({
    id,
    name,
    path: `Business & Industrial > ${name}`,
    display: `${name} (${id})`
  }))
  .sort((a, b) => a.name.localeCompare(b.name));

// Build EBAY_MARKETPLACE_CATEGORIES for backward compatibility
EBAY_MARKETPLACE_CATEGORIES = Object.fromEntries(
  Object.entries(EBAY_CATEGORY_ID_TO_NAME).map(([id, name]) => [
    name,
    { id, path: `Business & Industrial > ${name}` }
  ])
);

// Map eBay Store Category names to likely eBay Product Category IDs
// This helps infer the eBay Product Category when ebaycatid is empty
const STORE_TO_PRODUCT_CATEGORY = {
  // Automation Control
  'PLC': '181708',  // PLC Processors
  'HMI': '181709',  // HMI & Open Interface Panels
  'I/O BOARDS': '181714',  // PLC Input & Output Modules
  'POWER SUPPLY': '42017',  // Power Supplies
  // Motors
  'SERVO MOTORS': '124603',  // Servo Motors
  'SERVO DRIVES': '78191',  // Servo Drives & Amplifiers
  'STEPPER MOTORS': '9723',  // Stepper Motors
  'STEPPER DRIVES': '71394',  // Stepper Controls & Drives
  'AC MOTORS': '181732',  // General Purpose Motors
  'DC MOTORS': '181731',  // Definite Purpose Motors
  'GEARMOTORS': '65452',  // Gearmotors
  // Speed Controls
  'AC DRIVE': '78192',  // Variable Frequency Drives
  'VFD': '78192',  // Variable Frequency Drives
  'DC DRIVE': '78190',  // General Purpose DC Drives
  // Power Transmission
  'GEAR REDUCERS': '181772',  // Gearboxes & Speed Reducers
  'GEARBOXES': '181772',  // Gearboxes & Speed Reducers
  'POWER TRANSMISSION': '181772',  // Default to Gearboxes
  // Sensors
  'PROXIMITY SENSORS': '65459',  // Proximity Sensors
  'PHOTOELECTRIC SENSORS': '181786',  // Fiber Optic Sensors (or use 65459)
  'PRESSURE SENSORS': '65456',  // Pressure Sensors
  'TEMPERATURE SENSORS': '65460',  // Temperature & Humidity Sensors
  // Electrical
  'CIRCUIT BREAKERS': '185134',  // Circuit Breakers
  'TRANSFORMERS': '260829',  // Industrial Control & General Purpose Transformers
  'CONTACTORS': '181680',  // IEC & NEMA Contactors
  'RELAYS': '36328',  // General Purpose Relays
  // Pneumatics
  'PNEUMATIC CYLINDERS': '184027',  // Hydraulic & Pneumatic Cylinders
  'PNEUMATIC VALVES': '260291',  // Solenoid Valves & Coils
  'AIR PREPARATION': '183993',  // Filter Regulator Lubricators
  // Hydraulics
  'HYDRAULIC PUMPS': '11773',  // Hydraulic Pumps
  'HYDRAULIC VALVES': '259687',  // Valves
  'HYDRAULIC CYLINDERS': '184027',  // Hydraulic & Pneumatic Cylinders
  // Bearings
  'BALL': '181750',  // Ball & Roller Bearings
  'LINEAR': '181741',  // Linear Bearings & Bushings
  'PILLOW BLOCK': '181753',  // Mounted Bearings & Housings
  'FLANGE BEARINGS': '181753',  // Mounted Bearings & Housings
  // Pumps
  'PUMPS': '46547',  // Other Pumps
  'CENTRIFUGAL PUMP': '124635',  // Centrifugal Pumps
};

// Condition options
const CONDITION_OPTIONS = [
  { value: 'new_in_box', label: 'New In Box' },
  { value: 'new_open_box', label: 'New - Open Box' },
  { value: 'new_missing_hardware', label: 'New - No Packaging' },
  { value: 'like_new_excellent', label: 'Used - Excellent' },
  { value: 'used_very_good', label: 'Used - Very Good' },
  { value: 'used_good', label: 'Used - Good' },
  { value: 'used_fair', label: 'Used - Fair' },
  { value: 'refurbished', label: 'Refurbished' },
  { value: 'for_parts', label: 'For Parts or Not Working' }
];

const CONDITION_NOTES = {
  // New conditions
  'new': 'Brand new, unused item in original manufacturer packaging. All original components included. We warranty all items for 30 days.',
  'new_in_box': 'New item in original sealed manufacturer packaging. Unopened and unused. We warranty all items for 30 days.',
  'new_open_box': 'New item, packaging has been opened. All original components included. Never installed or used. We warranty all items for 30 days.',
  'new_missing_hardware': 'New item, some hardware or accessories may be missing. Otherwise unused and fully functional. We warranty all items for 30 days.',
  'new_surplus': 'New surplus stock. Unused item, may have older packaging or no original box. Fully functional. We warranty all items for 30 days.',
  'open_box': 'New item, packaging has been opened. All original components included. Never installed or used. We warranty all items for 30 days.',

  // Like New / Excellent conditions
  'like_new_excellent': 'Excellent condition, appears unused or very lightly used. Tested and fully functional. All components included. We warranty all items for 30 days.',

  // Refurbished conditions
  'refurbished': 'Professionally refurbished to working condition. Tested and verified functional. May show cosmetic wear. We warranty all items for 30 days.',
  'manufacturer_refurbished': 'Refurbished by the original manufacturer to factory specifications. Tested and fully functional. We warranty all items for 30 days.',

  // Used conditions
  'used': 'Previously used item. Tested and fully functional. May show signs of wear from normal use. We warranty all items for 30 days.',
  'used_very_good': 'Previously used item in very good condition. Minimal signs of wear. Tested and fully functional. We warranty all items for 30 days.',
  'used_good': 'Previously used item in good condition. Tested and fully functional. May show normal signs of wear from use. We warranty all items for 30 days.',
  'used_fair': 'Previously used item in fair condition. Tested and fully functional. May show noticeable wear or cosmetic damage. We warranty all items for 30 days.',

  // For Parts
  'for_parts': 'Item sold as-is for parts or repair. Not tested or may not be fully functional. No warranty provided.'
};

// Map Scanner/legacy condition values to Pro Builder values
const CONDITION_NORMALIZER = {
  // ===== Pro Builder native values (compound) =====
  'new_in_box': 'new_in_box',
  'new_open_box': 'new_open_box',
  'new_missing_hardware': 'new_missing_hardware',
  'like_new_excellent': 'like_new_excellent',
  'used_very_good': 'used_very_good',
  'used_good': 'used_good',
  'used_fair': 'used_fair',
  'for_parts': 'for_parts',

  // ===== Scanner simple values (lowercase) =====
  'new': 'new_in_box',
  'like_new': 'like_new_excellent',
  'good': 'used_good',
  'fair': 'used_fair',
  'poor': 'used_fair',
  'parts': 'for_parts',

  // ===== Scanner simple values (capitalized) =====
  'New': 'new_in_box',
  'Good': 'used_good',
  'Fair': 'used_fair',
  'Parts': 'for_parts',

  // ===== SureDone display values (what comes back from the API) =====
  'New In Box': 'new_in_box',
  'New Other': 'new_open_box',
  'Used - Good': 'used_good',
  'Used - Fair': 'used_fair',
  'For Parts or Not Working': 'for_parts',

  // ===== Legacy/fallback values =====
  'Used': 'used_good',
  'used': 'used_good',
};

function normalizeCondition(condition) {
  if (!condition) return 'used_good';
  return CONDITION_NORMALIZER[condition] || 'used_good';
}

// Coil voltage enforcement — product types that commonly have coil voltages
const COIL_VOLTAGE_PRODUCT_TYPES = new Set([
  'Contactor', 'AC Contactor', 'DC Contactor',
  'Motor Starter', 'Soft Starter', 'DOL Starter', 'Magnetic Starter',
  'Control Relay', 'Relay', 'Ice Cube Relay', 'Plug-in Relay',
  'Safety Relay', 'Safety Controller',
  'Overload Relay',
  'Solid State Relay', 'SSR',
  'Time Delay Relay', 'Latching Relay',
  'Solenoid Valve', 'Pneumatic Valve', 'Air Valve', 'Directional Valve'
]);
const COIL_VOLTAGE_KEYWORDS = ['relay', 'contactor', 'starter', 'solenoid'];

const needsCoilVoltage = (productCategory) => {
  if (!productCategory) return false;
  if (COIL_VOLTAGE_PRODUCT_TYPES.has(productCategory)) return true;
  const lower = productCategory.toLowerCase();
  return COIL_VOLTAGE_KEYWORDS.some(kw => lower.includes(kw));
};

// Emitter/Receiver set detection for photoelectric sensors, light curtains, etc.
const EMITTER_RECEIVER_PRODUCT_TYPES = new Set([
  'Photoelectric Sensor', 'Through Beam Sensor',
  'Fiber Optic Sensor', 'Light Curtain', 'Safety Light Curtain',
  'Area Scanner', 'Safety Scanner'
]);
const EMITTER_RECEIVER_KEYWORDS = ['emitter', 'receiver', 'through-beam', 'through beam', 'light curtain', 'beam'];
const needsEmitterReceiverCheck = (productCategory) => {
  if (!productCategory) return false;
  if (EMITTER_RECEIVER_PRODUCT_TYPES.has(productCategory)) return true;
  const lower = productCategory.toLowerCase();
  return EMITTER_RECEIVER_KEYWORDS.some(kw => lower.includes(kw));
};

// Country of Origin options - eBay accepted values
// Sorted with most common industrial equipment manufacturing countries first
const COUNTRIES = [
  // Most common for industrial equipment (prioritized at top)
  'China', 'Germany', 'Japan', 'United States', 'Taiwan', 'South Korea', 'Italy', 
  'France', 'United Kingdom', 'Switzerland', 'Sweden', 'Canada', 'Mexico', 'India',
  'Malaysia', 'Thailand', 'Vietnam', 'Poland', 'Czech Republic', 'Austria', 'Denmark',
  'Finland', 'Netherlands', 'Belgium', 'Spain', 'Brazil', 'Singapore', 'Indonesia',
  'Philippines', 'Turkey', 'Israel', 'Australia', 'Ireland', 'Hungary', 'Romania',
  'Slovakia', 'Slovenia', 'Portugal', 'Norway', 'New Zealand', 'South Africa',
  // Rest alphabetically
  'Afghanistan', 'Albania', 'Algeria', 'Andorra', 'Angola', 'Argentina', 'Armenia',
  'Azerbaijan', 'Bahamas', 'Bahrain', 'Bangladesh', 'Barbados', 'Belarus', 'Belize',
  'Benin', 'Bhutan', 'Bolivia', 'Bosnia and Herzegovina', 'Botswana', 'Brunei',
  'Bulgaria', 'Burkina Faso', 'Cambodia', 'Cameroon', 'Chile', 'Colombia', 'Costa Rica',
  'Croatia', 'Cuba', 'Cyprus', 'Dominican Republic', 'Ecuador', 'Egypt', 'El Salvador',
  'Estonia', 'Ethiopia', 'Fiji', 'Georgia', 'Ghana', 'Greece', 'Guatemala', 'Haiti',
  'Honduras', 'Hong Kong', 'Iceland', 'Iran', 'Iraq', 'Jamaica', 'Jordan', 'Kazakhstan',
  'Kenya', 'Kuwait', 'Kyrgyzstan', 'Laos', 'Latvia', 'Lebanon', 'Libya', 'Liechtenstein',
  'Lithuania', 'Luxembourg', 'Macau', 'Madagascar', 'Malawi', 'Maldives', 'Mali', 'Malta',
  'Mauritius', 'Moldova', 'Monaco', 'Mongolia', 'Montenegro', 'Morocco', 'Mozambique',
  'Myanmar', 'Namibia', 'Nepal', 'Nicaragua', 'Niger', 'Nigeria', 'North Korea',
  'North Macedonia', 'Oman', 'Pakistan', 'Panama', 'Papua New Guinea', 'Paraguay',
  'Peru', 'Puerto Rico', 'Qatar', 'Russia', 'Rwanda', 'Saudi Arabia', 'Senegal',
  'Serbia', 'Sierra Leone', 'Sri Lanka', 'Sudan', 'Suriname', 'Swaziland', 'Syria',
  'Tajikistan', 'Tanzania', 'Togo', 'Trinidad and Tobago', 'Tunisia', 'Turkmenistan',
  'Uganda', 'Ukraine', 'United Arab Emirates', 'Uruguay', 'Uzbekistan', 'Venezuela',
  'Yemen', 'Zambia', 'Zimbabwe',
  // Special values
  'Unknown', 'Regional'
];

// Country Autocomplete Component
const CountryAutocomplete = ({ value, onChange }) => {
  const [inputValue, setInputValue] = React.useState(value || '');
  const [showSuggestions, setShowSuggestions] = React.useState(false);
  const [filteredCountries, setFilteredCountries] = React.useState([]);
  const wrapperRef = React.useRef(null);

  // Update input when value prop changes
  React.useEffect(() => {
    setInputValue(value || '');
  }, [value]);

  // Close dropdown when clicking outside
  React.useEffect(() => {
    const handleClickOutside = (event) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleInputChange = (e) => {
    const val = e.target.value;
    setInputValue(val);
    
    if (val.length > 0) {
      const filtered = COUNTRIES.filter(country => 
        country.toLowerCase().includes(val.toLowerCase())
      ).slice(0, 10); // Limit to 10 suggestions
      setFilteredCountries(filtered);
      setShowSuggestions(true);
    } else {
      // Show top countries when empty
      setFilteredCountries(COUNTRIES.slice(0, 10));
      setShowSuggestions(true);
    }
  };

  const handleSelect = (country) => {
    setInputValue(country);
    onChange(country);
    setShowSuggestions(false);
  };

  const handleFocus = () => {
    if (inputValue.length === 0) {
      setFilteredCountries(COUNTRIES.slice(0, 10));
    } else {
      const filtered = COUNTRIES.filter(country => 
        country.toLowerCase().includes(inputValue.toLowerCase())
      ).slice(0, 10);
      setFilteredCountries(filtered);
    }
    setShowSuggestions(true);
  };

  const handleBlur = () => {
    // Delay to allow click on suggestion
    setTimeout(() => {
      // If input doesn't match a country, try to find closest match
      if (inputValue && !COUNTRIES.includes(inputValue)) {
        const match = COUNTRIES.find(c => 
          c.toLowerCase() === inputValue.toLowerCase()
        );
        if (match) {
          setInputValue(match);
          onChange(match);
        }
      }
    }, 200);
  };

  return (
    <div ref={wrapperRef} className="relative">
      <input
        type="text"
        value={inputValue}
        onChange={handleInputChange}
        onFocus={handleFocus}
        onBlur={handleBlur}
        placeholder="Type to search countries..."
        className="w-full px-3 py-2 border rounded-lg"
      />
      {showSuggestions && filteredCountries.length > 0 && (
        <ul className="absolute z-50 w-full mt-1 bg-white border rounded-lg shadow-lg max-h-48 overflow-y-auto">
          {filteredCountries.map((country, index) => (
            <li
              key={country}
              onClick={() => handleSelect(country)}
              className={`px-3 py-2 cursor-pointer hover:bg-blue-50 ${
                index === 0 ? 'rounded-t-lg' : ''
              } ${index === filteredCountries.length - 1 ? 'rounded-b-lg' : ''}`}
            >
              {country}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

// Shipping profiles
const SHIPPING_PROFILES = [
  { id: '69077991015', name: 'Small Package Shipping' },
  { id: '71204399015', name: 'Small Package Free Shipping' },
  { id: '109762088015', name: 'Medium Package Shipping' },
  { id: '110997109015', name: 'Medium Package Free Shipping' },
  { id: '260268833015', name: 'UPS Ground' },
  { id: '257255165015', name: 'Calculated: UPS Ground Free, Same Day' },
  { id: '257300245015', name: 'Calculated: UPS Ground, 1 Business Day' },
  { id: '274446469015', name: 'Small Freight Items under 1000 Lbs' },
  { id: '274433302015', name: 'Freight Shipping 2000 Lbs & Over' },
  { id: '124173115015', name: 'Domestic and International Freight' },
  { id: '253736784015', name: 'Freight' },
  { id: '161228820015', name: 'Local Pickup Only' }
];

// eBay Store Categories (YOUR store's categories)
// Complete list from eBay Store - Updated January 2025
const EBAY_STORE_CATEGORIES = [
  // Special - All Products (standalone, selectable)
  { id: '23399313015', name: 'ALL PRODUCTS', level: 1, hasChildren: false },

  // ASSEMBLY TOOLS (standalone)
  { id: '11495474015', name: 'ASSEMBLY TOOLS', level: 1, hasChildren: false },

  // AUTOMATION CONTROL
  { id: '5384028015', name: 'AUTOMATION CONTROL', level: 1, hasChildren: true },
  { id: '6686264015', name: 'HMI', level: 2, hasChildren: false },
  { id: '18373835', name: 'I/O BOARDS', level: 2, hasChildren: false },
  { id: '5404089015', name: 'PLC', level: 2, hasChildren: false },
  { id: '2242362015', name: 'POWER SUPPLY', level: 2, hasChildren: false },

  // BEARINGS
  { id: '6690505015', name: 'BEARINGS', level: 1, hasChildren: true },
  { id: '4173714015', name: 'BALL', level: 2, hasChildren: false },
  { id: '4173170015', name: 'CAM FOLLOWER', level: 2, hasChildren: false },
  { id: '4173165015', name: 'FLANGE BEARINGS', level: 2, hasChildren: false },
  { id: '4173713015', name: 'LINEAR', level: 2, hasChildren: false },
  { id: '4173171015', name: 'NEEDLE', level: 2, hasChildren: false },
  { id: '4173166015', name: 'PILLOW BLOCK', level: 2, hasChildren: false },
  { id: '4173168015', name: 'ROLLER', level: 2, hasChildren: false },
  { id: '4173167015', name: 'TAPERED', level: 2, hasChildren: false },
  { id: '4173169015', name: 'THRUST', level: 2, hasChildren: false },

  // COMPUTERS & ACCESSORIES (standalone)
  { id: '19438754015', name: 'COMPUTERS & ACCESSORIES', level: 1, hasChildren: false },

  // ELECTRICAL
  { id: '393385015', name: 'ELECTRICAL', level: 1, hasChildren: true },
  { id: '5634105015', name: 'CIRCUIT BREAKERS', level: 2, hasChildren: false },
  { id: '20338717', name: 'DISCONNECTS', level: 2, hasChildren: false },
  { id: '18373801', name: 'ENCLOSURES', level: 2, hasChildren: false },
  { id: '18373807', name: 'FUSES & HOLDERS', level: 2, hasChildren: false },
  { id: '5634104015', name: 'TRANSFORMERS', level: 2, hasChildren: false },

  // FILTRATION
  { id: '2343161015', name: 'FILTRATION', level: 1, hasChildren: true },
  { id: '2343164015', name: 'AIR FILTER', level: 2, hasChildren: false },
  { id: '2343166015', name: 'COOLANT FILTER', level: 2, hasChildren: false },
  { id: '2343163015', name: 'HYDRAULIC FILTER', level: 2, hasChildren: false },
  { id: '2343165015', name: 'OIL FILTER', level: 2, hasChildren: false },
  { id: '2343162015', name: 'WATER FILTER', level: 2, hasChildren: false },

  // HVAC
  { id: '17167473', name: 'HVAC', level: 1, hasChildren: true },
  { id: '2457873015', name: 'CHILLERS', level: 2, hasChildren: false },
  { id: '2457884015', name: 'FANS', level: 2, hasChildren: false },

  // HYDRAULICS
  { id: '6689962015', name: 'HYDRAULICS', level: 1, hasChildren: true },
  { id: '6696063015', name: 'HYDRAULIC ACCUMULATORS', level: 2, hasChildren: false },
  { id: '6696062015', name: 'HYDRAULIC ACTUATORS', level: 2, hasChildren: false },
  { id: '6696061015', name: 'HYDRAULIC CYLINDERS', level: 2, hasChildren: false },
  { id: '6696064015', name: 'HYDRAULIC PUMPS', level: 2, hasChildren: false },
  { id: '6696060015', name: 'HYDRAULIC VALVES', level: 2, hasChildren: false },

  // INDUSTRIAL CONTROL
  { id: '6688149015', name: 'INDUSTRIAL CONTROL', level: 1, hasChildren: true },
  { id: '2242359015', name: 'CONTROL RELAYS', level: 2, hasChildren: false },
  { id: '1856435015', name: 'CORD SETS', level: 2, hasChildren: false },
  { id: '18373799', name: 'COUNTERS', level: 2, hasChildren: false },
  { id: '4173756015', name: 'E-STOP SWITCHES', level: 2, hasChildren: false },
  { id: '4173739015', name: 'FOOT SWITCHES', level: 2, hasChildren: false },
  { id: '1484016015', name: 'GAUGES', level: 2, hasChildren: false },
  { id: '4173737015', name: 'ILLUMINATED BUTTONS', level: 2, hasChildren: false },
  { id: '4173758015', name: 'JOYSTICKS', level: 2, hasChildren: false },
  { id: '4173738015', name: 'KEY SWITCHES', level: 2, hasChildren: false },
  { id: '4173745015', name: 'LIMIT SWITCHES', level: 2, hasChildren: false },
  { id: '2464037015', name: 'MACHINE SAFETY', level: 2, hasChildren: false },
  { id: '4173736015', name: 'MAINTAINED BUTTONS', level: 2, hasChildren: false },
  { id: '4173752015', name: 'MICRO SWITCHES', level: 2, hasChildren: false },
  { id: '4173735015', name: 'MOMENTARY BUTTONS', level: 2, hasChildren: false },
  { id: '2348910015', name: 'MOTOR CONTROLS', level: 2, hasChildren: false },
  { id: '4173743015', name: 'PALM OPERATED BUTTONS', level: 2, hasChildren: false },
  { id: '5634088015', name: 'PANEL METERS', level: 2, hasChildren: false },
  { id: '2464042015', name: 'PILOT LIGHTS', level: 2, hasChildren: false },
  { id: '4173757015', name: 'POTENTIOMETERS', level: 2, hasChildren: false },
  { id: '1484009015', name: 'PRESSURE CONTROLS', level: 2, hasChildren: false },
  { id: '4173742015', name: 'SELECTOR SWITCHES', level: 2, hasChildren: false },
  { id: '6327053015', name: 'SOUND MODULES', level: 2, hasChildren: false },
  { id: '6690583015', name: 'STACK LIGHTS', level: 2, hasChildren: false },
  { id: '2461872015', name: 'TEMPERATURE CONTROLS', level: 2, hasChildren: false },
  { id: '18373798', name: 'TIMERS', level: 2, hasChildren: false },
  { id: '18373834', name: 'TRANSDUCERS', level: 2, hasChildren: false },
  { id: '5634089015', name: 'TRANSMITTERS', level: 2, hasChildren: false },

  // LIGHTING BALLASTS (standalone)
  { id: '20030375015', name: 'LIGHTING BALLASTS', level: 1, hasChildren: false },

  // MACHINERY (standalone)
  { id: '5384029015', name: 'MACHINERY', level: 1, hasChildren: false },

  // MATERIAL HANDLING (standalone)
  { id: '2348909015', name: 'MATERIAL HANDLING', level: 1, hasChildren: false },

  // MOTION CONTROL
  { id: '6686262015', name: 'MOTION CONTROL', level: 1, hasChildren: true },
  { id: '1802953015', name: 'ENCODERS', level: 2, hasChildren: false },
  { id: '393390015', name: 'SERVO DRIVES', level: 2, hasChildren: false },

  // PNEUMATICS
  { id: '6689961015', name: 'PNEUMATICS', level: 1, hasChildren: true },
  { id: '2461878015', name: 'ACTUATORS', level: 2, hasChildren: false },
  { id: '2461873015', name: 'CYLINDERS', level: 2, hasChildren: false },
  { id: '2461877015', name: 'DRYERS', level: 2, hasChildren: false },
  { id: '2461880015', name: 'FILTERS', level: 2, hasChildren: false },
  { id: '6699359015', name: 'GRIPPER', level: 2, hasChildren: false },
  { id: '2461876015', name: 'LUBRICATORS', level: 2, hasChildren: false },
  { id: '6690373015', name: 'MUFFLER', level: 2, hasChildren: false },
  { id: '6699358015', name: 'NIPPER', level: 2, hasChildren: false },
  { id: '2461874015', name: 'PNEUMATIC VALVES', level: 2, hasChildren: false },
  { id: '2461875015', name: 'REGULATORS', level: 2, hasChildren: false },

  // POWER TRANSMISSION
  { id: '17167474', name: 'POWER TRANSMISSION', level: 1, hasChildren: true },
  { id: '6690432015', name: 'BALL SCREWS', level: 2, hasChildren: false },
  { id: '6688333015', name: 'BELTS', level: 2, hasChildren: false },
  { id: '6688331015', name: 'BRAKES', level: 2, hasChildren: false },
  { id: '393386015', name: 'CLUTCHES', level: 2, hasChildren: false },
  { id: '17167471', name: 'ELECTRIC MOTORS', level: 2, hasChildren: false },
  { id: '6688332015', name: 'GEAR REDUCERS', level: 2, hasChildren: false },
  { id: '6690433015', name: 'LINEAR ACTUATORS', level: 2, hasChildren: false },
  { id: '6690434015', name: 'LINEAR RAILS', level: 2, hasChildren: false },
  { id: '6688335015', name: 'ROLLER CHAINS', level: 2, hasChildren: false },
  { id: '393389015', name: 'SERVO MOTORS', level: 2, hasChildren: false },
  { id: '6688334015', name: 'SPROCKETS', level: 2, hasChildren: false },

  // PUMPS
  { id: '6689959015', name: 'PUMPS', level: 1, hasChildren: true },
  { id: '6689968015', name: 'CENTRIFUGAL PUMP', level: 2, hasChildren: false },
  { id: '6689971015', name: 'CONDENSATE PUMP', level: 2, hasChildren: false },
  { id: '6689969015', name: 'DIAPHRAGM PUMP', level: 2, hasChildren: false },
  { id: '6689966015', name: 'HYDRAULIC PUMP', level: 2, hasChildren: false },
  { id: '6689970015', name: 'METERING PUMP', level: 2, hasChildren: false },
  { id: '6689967015', name: 'VACUUM PUMP', level: 2, hasChildren: false },

  // QUALITY & TEST (standalone)
  { id: '6686263015', name: 'QUALITY & TEST', level: 1, hasChildren: false },

  // REGENERATIVE BLOWERS (standalone)
  { id: '18206302015', name: 'REGENERATIVE BLOWERS', level: 1, hasChildren: false },

  // ROBOTICS (standalone)
  { id: '5384030015', name: 'ROBOTICS', level: 1, hasChildren: false },

  // SEARCH BY BRAND
  { id: '5933544015', name: 'SEARCH BY BRAND', level: 1, hasChildren: true },
  { id: '5933571015', name: 'ABB', level: 2, hasChildren: false },
  { id: '5933639015', name: 'ACME', level: 2, hasChildren: false },
  { id: '5933572015', name: 'ADEPT TECH', level: 2, hasChildren: false },
  { id: '5933557015', name: 'ALLEN BRADLEY', level: 2, hasChildren: false },
  { id: '6690346015', name: 'ALPHA', level: 2, hasChildren: false },
  { id: '6706056015', name: 'ARO', level: 2, hasChildren: false },
  { id: '6690590015', name: 'ARROW', level: 2, hasChildren: false },
  { id: '5933573015', name: 'ASCO', level: 2, hasChildren: false },
  { id: '6675026015', name: 'ATLAS COPCO', level: 2, hasChildren: false },
  { id: '6690334015', name: 'ATO', level: 2, hasChildren: false },
  { id: '5933586015', name: 'AUTOMATION DIRECT', level: 2, hasChildren: false },
  { id: '6690335015', name: 'BALDOR', level: 2, hasChildren: false },
  { id: '5933595015', name: 'BALLUFF', level: 2, hasChildren: false },
  { id: '5933560015', name: 'BANNER ENGINEERING', level: 2, hasChildren: false },
  { id: '6690371015', name: 'BARKSDALE', level: 2, hasChildren: false },
  { id: '6690342015', name: 'BAYSIDE', level: 2, hasChildren: false },
  { id: '5933583015', name: 'BEI', level: 2, hasChildren: false },
  { id: '5933591015', name: 'BIMBA', level: 2, hasChildren: false },
  { id: '6690337015', name: 'BISON', level: 2, hasChildren: false },
  { id: '6690336015', name: 'BODINE', level: 2, hasChildren: false },
  { id: '6690445015', name: 'BOSCH', level: 2, hasChildren: false },
  { id: '6690344015', name: 'BOSTON GEAR', level: 2, hasChildren: false },
  { id: '6690582015', name: 'BRAD HARRISON', level: 2, hasChildren: false },
  { id: '6695680015', name: 'BUSSMAN', level: 2, hasChildren: false },
  { id: '6690461015', name: 'CKD', level: 2, hasChildren: false },
  { id: '5933568015', name: 'CONTROL TECHNIQUES', level: 2, hasChildren: false },
  { id: '5933563015', name: 'CUTLER HAMMER', level: 2, hasChildren: false },
  { id: '6690485015', name: 'DAIKIN', level: 2, hasChildren: false },
  { id: '6690121015', name: 'DAYTON', level: 2, hasChildren: false },
  { id: '6690341015', name: 'DODGE', level: 2, hasChildren: false },
  { id: '6690484015', name: 'DYNAQUIP', level: 2, hasChildren: false },
  { id: '5933593015', name: 'EAGLE SIGNAL', level: 2, hasChildren: false },
  { id: '5933596015', name: 'EFECTOR', level: 2, hasChildren: false },
  { id: '5933567015', name: 'EMERSON', level: 2, hasChildren: false },
  { id: '6690094015', name: 'ENERPAC', level: 2, hasChildren: false },
  { id: '5933569015', name: 'FANUC', level: 2, hasChildren: false },
  { id: '6690589015', name: 'FEDERAL SIGNAL', level: 2, hasChildren: false },
  { id: '6695705015', name: 'FERRAZ SHAWMUT', level: 2, hasChildren: false },
  { id: '5933575015', name: 'FESTO', level: 2, hasChildren: false },
  { id: '5933564015', name: 'FUJI', level: 2, hasChildren: false },
  { id: '5933599015', name: 'GE', level: 2, hasChildren: false },
  { id: '6690367015', name: 'GIDDINGS & LEWIS', level: 2, hasChildren: false },
  { id: '6695677015', name: 'GOULD', level: 2, hasChildren: false },
  { id: '6690116015', name: 'GRACO', level: 2, hasChildren: false },
  { id: '6695679015', name: 'HEIDENHAIN', level: 2, hasChildren: false },
  { id: '6671553015', name: 'HOFFMAN', level: 2, hasChildren: false },
  { id: '5933602015', name: 'HONEYWELL', level: 2, hasChildren: false },
  { id: '6690347015', name: 'HORTON', level: 2, hasChildren: false },
  { id: '6690437015', name: 'HYDAC', level: 2, hasChildren: false },
  { id: '6695678015', name: 'IAI', level: 2, hasChildren: false },
  { id: '5933600015', name: 'IDEC', level: 2, hasChildren: false },
  { id: '5933603015', name: 'INGERSOLL RAND', level: 2, hasChildren: false },
  { id: '5933601015', name: 'JOHNSON CONTROLS', level: 2, hasChildren: false },
  { id: '6695864015', name: 'JOKAB SAFETY', level: 2, hasChildren: false },
  { id: '5933559015', name: 'KEYENCE', level: 2, hasChildren: false },
  { id: '6690338015', name: 'LEESON', level: 2, hasChildren: false },
  { id: '6695888015', name: 'LIEBERT', level: 2, hasChildren: false },
  { id: '7989168015', name: 'LITTELFUSE', level: 2, hasChildren: false },
  { id: '6689963015', name: 'MAC VALVE', level: 2, hasChildren: false },
  { id: '5933580015', name: 'MILLER', level: 2, hasChildren: false },
  { id: '5933585015', name: 'MITSUBISHI', level: 2, hasChildren: false },
  { id: '5933582015', name: 'MODICON', level: 2, hasChildren: false },
  { id: '5933590015', name: 'MOOG', level: 2, hasChildren: false },
  { id: '6690370015', name: 'MOTION INDUSTRIES', level: 2, hasChildren: false },
  { id: '5933570015', name: 'MOTOMAN', level: 2, hasChildren: false },
  { id: '5933597015', name: 'MTS', level: 2, hasChildren: false },
  { id: '6688143015', name: 'NATIONAL INSTRUMENTS', level: 2, hasChildren: false },
  { id: '8615563015', name: 'NEMIC LAMBDA', level: 2, hasChildren: false },
  { id: '6690343015', name: 'NEUGART', level: 2, hasChildren: false },
  { id: '5933581015', name: 'NORDSON', level: 2, hasChildren: false },
  { id: '6690460015', name: 'NORGREN', level: 2, hasChildren: false },
  { id: '6690459015', name: 'NUMATICS', level: 2, hasChildren: false },
  { id: '5933558015', name: 'OMRON', level: 2, hasChildren: false },
  { id: '6718027015', name: 'ORIENTAL MOTOR CO.', level: 2, hasChildren: false },
  { id: '5933565015', name: 'PACIFIC SCIENTIFIC', level: 2, hasChildren: false },
  { id: '5933566015', name: 'PANASONIC', level: 2, hasChildren: false },
  { id: '5933577015', name: 'PARKER', level: 2, hasChildren: false },
  { id: '6690588015', name: 'PATLITE', level: 2, hasChildren: false },
  { id: '6717974015', name: 'PEPPERL+FUCHS', level: 2, hasChildren: false },
  { id: '6688145015', name: 'PHD', level: 2, hasChildren: false },
  { id: '5933592015', name: 'PHOENIX CONTACT', level: 2, hasChildren: false },
  { id: '5933578015', name: 'PILZ', level: 2, hasChildren: false },
  { id: '5933579015', name: 'PINNACLE', level: 2, hasChildren: false },
  { id: '9100281015', name: 'PROFACE', level: 2, hasChildren: false },
  { id: '6688144015', name: 'RED LION', level: 2, hasChildren: false },
  { id: '6690340015', name: 'RELIANCE', level: 2, hasChildren: false },
  { id: '5933589015', name: 'REXROTH', level: 2, hasChildren: false },
  { id: '6689964015', name: 'ROSS VALVE', level: 2, hasChildren: false },
  { id: '5933584015', name: 'SANYO DENKI', level: 2, hasChildren: false },
  { id: '6706057015', name: 'SCHMERSAL', level: 2, hasChildren: false },
  { id: '6690345015', name: 'SEW EURODRIVE', level: 2, hasChildren: false },
  { id: '5933594015', name: 'SICK', level: 2, hasChildren: false },
  { id: '5933561015', name: 'SIEMENS', level: 2, hasChildren: false },
  { id: '8530044015', name: 'SKF', level: 2, hasChildren: false },
  { id: '6690446015', name: 'SKINNER', level: 2, hasChildren: false },
  { id: '5933574015', name: 'SMC', level: 2, hasChildren: false },
  { id: '5933638015', name: 'SOLA', level: 2, hasChildren: false },
  { id: '6695902015', name: 'SONY', level: 2, hasChildren: false },
  { id: '6690456015', name: 'SPEEDAIR', level: 2, hasChildren: false },
  { id: '6690368015', name: 'SPRECHER SCHUH', level: 2, hasChildren: false },
  { id: '5933562015', name: 'SQUARE D', level: 2, hasChildren: false },
  { id: '5933588015', name: 'STI', level: 2, hasChildren: false },
  { id: '5933587015', name: 'SUNX', level: 2, hasChildren: false },
  { id: '5933598015', name: 'TELEMECANIQUE', level: 2, hasChildren: false },
  { id: '6690369015', name: 'THOMSON INDUSTRIES', level: 2, hasChildren: false },
  { id: '7989166015', name: 'TIMKEN', level: 2, hasChildren: false },
  { id: '6690385015', name: 'TOL-O-MATIC', level: 2, hasChildren: false },
  { id: '6690366015', name: 'TURCK', level: 2, hasChildren: false },
  { id: '6695908015', name: 'UTICOR', level: 2, hasChildren: false },
  { id: '5933576015', name: 'VICKERS', level: 2, hasChildren: false },
  { id: '6686271015', name: 'YASKAWA', level: 2, hasChildren: false },
  { id: '6692842015', name: 'YOKOGAWA', level: 2, hasChildren: false },
  { id: '6690339015', name: 'ZANDER', level: 2, hasChildren: false },

  // SENSING DEVICES
  { id: '6686267015', name: 'SENSING DEVICES', level: 1, hasChildren: true },
  { id: '6690176015', name: 'BARCODE SCANNERS', level: 2, hasChildren: false },
  { id: '4173796015', name: 'COLOR SENSORS', level: 2, hasChildren: false },
  { id: '4173797015', name: 'CURRENT SENSORS', level: 2, hasChildren: false },
  { id: '5785856015', name: 'FIBER OPTIC SENSORS', level: 2, hasChildren: false },
  { id: '4173798015', name: 'FLOW SENSORS', level: 2, hasChildren: false },
  { id: '2479732015', name: 'LASER SENSORS', level: 2, hasChildren: false },
  { id: '4173792015', name: 'LEVEL SENSORS', level: 2, hasChildren: false },
  { id: '393379015', name: 'LIGHT CURTAINS', level: 2, hasChildren: false },
  { id: '4173799015', name: 'LIGHT SENSORS', level: 2, hasChildren: false },
  { id: '5634087015', name: 'LINEAR SENSORS', level: 2, hasChildren: false },
  { id: '5436340015', name: 'LOAD CELLS', level: 2, hasChildren: false },
  { id: '4173793015', name: 'PHOTOELECTRIC SENSORS', level: 2, hasChildren: false },
  { id: '6690386015', name: 'PRESSURE SENSORS', level: 2, hasChildren: false },
  { id: '4173791015', name: 'PROXIMITY SENSORS', level: 2, hasChildren: false },
  { id: '6695702015', name: 'RFID READER', level: 2, hasChildren: false },
  { id: '6690556015', name: 'TEMPERATURE SENSORS', level: 2, hasChildren: false },

  // SPEED CONTROLS
  { id: '6686272015', name: 'SPEED CONTROLS', level: 1, hasChildren: true },
  { id: '2242358015', name: 'AC DRIVE', level: 2, hasChildren: false },
  { id: '6688299015', name: 'DC DRIVE', level: 2, hasChildren: false },

  // VALVES
  { id: '6690464015', name: 'VALVES', level: 1, hasChildren: true },
  { id: '6690466015', name: 'BALL VALVES', level: 2, hasChildren: false },
  { id: '6690465015', name: 'BUTTERFLY VALVES', level: 2, hasChildren: false },
  { id: '6690467015', name: 'CHECK VALVES', level: 2, hasChildren: false },
  { id: '6690474015', name: 'FLOAT VALVES', level: 2, hasChildren: false },
  { id: '6690469015', name: 'GAS VALVES', level: 2, hasChildren: false },
  { id: '6690472015', name: 'GLOBE VALVES', level: 2, hasChildren: false },
  { id: '6690470015', name: 'LOCKOUT VALVES', level: 2, hasChildren: false },
  { id: '6690486015', name: 'PRESSURE RELIEF', level: 2, hasChildren: false },
  { id: '6690471015', name: 'PROPORTIONAL VALVES', level: 2, hasChildren: false },
  { id: '6690468015', name: 'SOLENOID VALVES', level: 2, hasChildren: false },
  { id: '6690473015', name: 'STEAM VALVES', level: 2, hasChildren: false },

  // Other
  { id: '1', name: 'Other Items', level: 1, hasChildren: false }
];

// Helper: render store category <select> options with optgroup for parents
// Parents with children become <optgroup> (non-selectable, bold)
// Standalone parents and all children become <option> (selectable)
function renderStoreCategoryOptions() {
  const result = [];
  let i = 0;
  while (i < EBAY_STORE_CATEGORIES.length) {
    const cat = EBAY_STORE_CATEGORIES[i];
    if (cat.level === 1 && cat.hasChildren) {
      const children = [];
      let j = i + 1;
      while (j < EBAY_STORE_CATEGORIES.length && EBAY_STORE_CATEGORIES[j].level === 2) {
        children.push(EBAY_STORE_CATEGORIES[j]);
        j++;
      }
      result.push(
        React.createElement('optgroup', { key: cat.id, label: cat.name },
          children.map(c => React.createElement('option', { key: c.id, value: c.id }, c.name))
        )
      );
      i = j;
    } else {
      result.push(React.createElement('option', { key: cat.id, value: cat.id }, cat.name));
      i++;
    }
  }
  return result;
}

// Spec field labels (proper display names - includes lowercase variants)
const SPEC_LABELS = {
  voltage: 'Voltage', amperage: 'Amperage', horsepower: 'Horsepower', rpm: 'RPM',
  frame_size: 'Frame Size', framesize: 'Frame Size',
  nema_frame_suffix: 'NEMA Frame Suffix', nema_design: 'NEMA Design',
  service_factor: 'Service Factor', servicefactor: 'Service Factor',
  phase: 'Phase', frequency: 'Frequency',
  enclosure: 'Enclosure Type', enclosure_type: 'Enclosure Type',
  insulation_class: 'Insulation Class', insulationclass: 'Insulation Class',
  motor_type: 'Motor Type',
  sensing_range: 'Sensing Range', output_type: 'Output Type',
  bore_diameter: 'Bore Diameter', stroke_length: 'Stroke Length',
  port_size: 'Port Size', max_pressure: 'Max Pressure',
  coil_voltage: 'Coil Voltage', contact_rating: 'Contact Rating',
  number_of_poles: 'Number of Poles',
  communication_protocol: 'Communication Protocol', communication: 'Communication Protocol',
  input_voltage: 'Input Voltage', output_voltage: 'Output Voltage',
  kw_rating: 'kW Rating', kw: 'kW Rating',
  ip_rating: 'IP Rating', mounting_type: 'Mounting Type', weight: 'Weight',
  current: 'Current', hp: 'Horsepower',
  shaft_type: 'Shaft Type', shaft_diameter: 'Shaft Diameter',
  efficiency: 'Efficiency', duty_cycle: 'Duty Cycle'
};

// ============================================
// SKU LOOKUP COMPONENT (INLINE)
// ============================================
function SkuLookup({ onLoadListing, onCompareClick }) {
  const [sku, setSku] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);

  const searchSku = async () => {
    if (!sku.trim()) return;
    
    setLoading(true);
    setError(null);
    setResult(null);
    
    try {
      const response = await fetch(`/api/suredone/get-item?sku=${encodeURIComponent(sku.trim())}`);
      const data = await response.json();
      
      if (data.success && data.item) {
        setResult(data.item);
      } else {
        setError('SKU not found in SureDone');
      }
    } catch (err) {
      setError(`Error: ${err.message}`);
    }
    
    setLoading(false);
  };

  const handleLoadIntoEditor = () => {
    if (result && onLoadListing) {
      onLoadListing(result);
      setSku('');
      setResult(null);
    }
  };

  return (
    <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-lg p-3 mb-3">
      <h3 className="font-semibold text-amber-900 mb-2 flex items-center gap-2 text-sm">
        <Search className="w-4 h-4" />
        Edit Existing Listing
      </h3>
      
      <div className="flex gap-2">
        <input
          type="text"
          value={sku}
          onChange={(e) => setSku(e.target.value.toUpperCase())}
          onKeyPress={(e) => e.key === 'Enter' && searchSku()}
          placeholder="Enter SKU"
          className="flex-1 px-2 py-1.5 border border-amber-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
        />
        <button
          onClick={searchSku}
          disabled={loading || !sku.trim()}
          className="px-3 py-1.5 bg-amber-600 text-white rounded hover:bg-amber-700 disabled:opacity-50 flex items-center gap-1 text-sm"
        >
          {loading ? <Loader className="w-3 h-3 animate-spin" /> : <Search className="w-3 h-3" />}
        </button>
      </div>

      {error && (
        <div className="mt-2 text-xs text-red-600 bg-red-50 px-2 py-1 rounded">
          {error}
        </div>
      )}

      {result && (
        <div className="mt-2 bg-white border border-amber-200 rounded p-2">
          <div className="flex justify-between items-start mb-1">
            <div>
              <span className="font-bold text-amber-900 text-sm">{result.sku || result.guid}</span>
              <span className="ml-2 text-xs px-1.5 py-0.5 bg-green-100 text-green-700 rounded">
                Stock: {result.stock || 0}
              </span>
            </div>
            <span className="text-sm font-bold text-green-600">${result.price}</span>
          </div>
          
          <p className="text-xs text-gray-700 mb-2 line-clamp-1">{result.title}</p>
          
          <div className="grid grid-cols-2 gap-1 text-xs text-gray-600 mb-2">
            <div><strong>Brand:</strong> {result.brand || 'N/A'}</div>
            <div><strong>MPN:</strong> {result.mpn || result.model || 'N/A'}</div>
          </div>

          <div className="flex gap-2">
            <button
              onClick={handleLoadIntoEditor}
              className="flex-1 px-2 py-1.5 bg-amber-600 text-white rounded hover:bg-amber-700 text-xs font-medium"
            >
              Load into Editor
            </button>
            {onCompareClick && (
              <button
                onClick={() => onCompareClick(result.sku || result.guid, result)}
                className="px-2 py-1.5 bg-blue-600 text-white rounded hover:bg-blue-700 text-xs"
                title="Compare side-by-side"
              >
                <ExternalLink className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================
// COMPARISON PANEL COMPONENT (INLINE)
// ============================================
function ComparisonPanel({ existingData, currentData, onUseValue, onClose, isOpen }) {
  if (!isOpen || !existingData) return null;

  // All possible spec field keys with labels - comprehensive list from SureDone headers
  const ALL_SPEC_FIELDS = [
    // Electrical - Voltage
    { key: 'voltage', label: 'Voltage' },
    { key: 'inputvoltage', label: 'Input Voltage' },
    { key: 'outputvoltage', label: 'Output Voltage' },
    { key: 'voltagerating', label: 'Voltage Rating' },
    { key: 'voltagecompatibility', label: 'Voltage Compatibility' },
    { key: 'actualvoltageratingac', label: 'Actual Voltage Rating AC' },
    { key: 'actualvoltageratingdc', label: 'Actual Voltage Rating DC' },
    { key: 'nominalvoltageratingac', label: 'Nominal Voltage Rating AC' },
    { key: 'nominalratedinputvoltage', label: 'Nominal Rated Input Voltage' },
    { key: 'actualratedinputvoltage', label: 'Actual Rated Input Voltage' },
    { key: 'dcvoltagerange', label: 'DC Voltage Range' },
    { key: 'supplyvoltage', label: 'Supply Voltage' },
    { key: 'coilvoltage', label: 'Coil Voltage' },
    // Electrical - Current/Amperage
    { key: 'amperage', label: 'Amperage' },
    { key: 'inputamperage', label: 'Input Amperage' },
    { key: 'outputamperage', label: 'Output Amperage' },
    { key: 'amperagerange', label: 'Amperage Range' },
    { key: 'current', label: 'Current' },
    { key: 'currentrating', label: 'Current Rating' },
    { key: 'nominalcurrentrating', label: 'Nominal Current Rating' },
    { key: 'currenttype', label: 'Current Type' },
    { key: 'maxinputcurrent', label: 'Max Input Current' },
    { key: 'fullloadamps', label: 'Full Load Amps' },
    { key: 'stallcurrent', label: 'Stall Current' },
    { key: 'maximumamperage', label: 'Maximum Amperage' },
    // Electrical - Phase/Frequency
    { key: 'phase', label: 'Phase' },
    { key: 'numberofphases', label: 'Number of Phases' },
    { key: 'powerphase', label: 'Power Phase' },
    { key: 'hz', label: 'Hz' },
    { key: 'frequency', label: 'Frequency' },
    { key: 'powerfrequency', label: 'Power Frequency' },
    { key: 'outputhz', label: 'Output Hz' },
    // Electrical - Power
    { key: 'watts', label: 'Watts' },
    { key: 'watt', label: 'Watt' },
    { key: 'maxwattage', label: 'Max Wattage' },
    { key: 'kw', label: 'kW' },
    { key: 'kva', label: 'kVA' },
    { key: 'powerrating', label: 'Power Rating' },
    { key: 'ratedpower', label: 'Rated Power' },
    { key: 'nominalpowerrating', label: 'Nominal Power Rating' },
    { key: 'outputpower', label: 'Output Power' },
    // Motor
    { key: 'horsepower', label: 'Horsepower' },
    { key: 'ratedloadhp', label: 'Rated Load HP' },
    { key: 'spindlehorsepower', label: 'Spindle Horsepower' },
    { key: 'rpm', label: 'RPM' },
    { key: 'baserpm', label: 'Base RPM' },
    { key: 'noloadrpm', label: 'No Load RPM' },
    { key: 'highestspindlespeedrpm', label: 'Highest Spindle Speed RPM' },
    { key: 'torque', label: 'Torque' },
    { key: 'stalltorque', label: 'Stall Torque' },
    { key: 'ratedfullloadtorque', label: 'Rated Full Load Torque' },
    { key: 'contstalltorqueinlb', label: 'Cont. Stall Torque (in-lb)' },
    { key: 'nm', label: 'Nm' },
    { key: 'frame', label: 'Frame' },
    { key: 'motortype', label: 'Motor Type' },
    { key: 'enclosuretype', label: 'Enclosure Type' },
    { key: 'insulationclass', label: 'Insulation Class' },
    { key: 'nemadesignletter', label: 'NEMA Design Letter' },
    { key: 'fullstepangle', label: 'Full Step Angle' },
    { key: 'dcstatorwindingtype', label: 'DC Stator Winding Type' },
    { key: 'reversiblenonreversible', label: 'Reversible' },
    // Gearbox/Drive
    { key: 'ratio', label: 'Ratio' },
    { key: 'gearratio', label: 'Gear Ratio' },
    // Pneumatic/Hydraulic - Pressure
    { key: 'psi', label: 'PSI' },
    { key: 'maxpsi', label: 'Max PSI' },
    { key: 'maxbar', label: 'Max Bar' },
    { key: 'maxmpa', label: 'Max MPa' },
    { key: 'mpa', label: 'MPa' },
    { key: 'pressure', label: 'Pressure' },
    { key: 'maxpressure', label: 'Max Pressure' },
    { key: 'maximumpressure', label: 'Maximum Pressure' },
    { key: 'ratedpressure', label: 'Rated Pressure' },
    { key: 'maxoperatingpressure', label: 'Max Operating Pressure' },
    { key: 'maxfluidpressure', label: 'Max Fluid Pressure' },
    // Pneumatic/Hydraulic - Size/Flow
    { key: 'portsize', label: 'Port Size' },
    { key: 'portdiameter', label: 'Port Diameter' },
    { key: 'bore', label: 'Bore' },
    { key: 'borediameter', label: 'Bore Diameter' },
    { key: 'stroke', label: 'Stroke' },
    { key: 'strokelength', label: 'Stroke Length' },
    { key: 'flowrate', label: 'Flow Rate' },
    { key: 'gpm', label: 'GPM' },
    { key: 'maximumairflow', label: 'Maximum Airflow' },
    { key: 'cylinderaction', label: 'Cylinder Action' },
    { key: 'cylindertype', label: 'Cylinder Type' },
    { key: 'hydraulicpumptype', label: 'Hydraulic Pump Type' },
    { key: 'pumpaction', label: 'Pump Action' },
    { key: 'reservoircapacity', label: 'Reservoir Capacity' },
    { key: 'actuation', label: 'Actuation' },
    { key: 'actuatortype', label: 'Actuator Type' },
    { key: 'numberofways', label: 'Number of Ways' },
    // Control/Automation
    { key: 'controllerplatform', label: 'Controller Platform' },
    { key: 'processor', label: 'Processor' },
    { key: 'communications', label: 'Communications' },
    { key: 'communicationstandard', label: 'Communication Standard' },
    { key: 'series', label: 'Series' },
    { key: 'revision', label: 'Revision' },
    { key: 'version', label: 'Version' },
    { key: 'firmwarerevision', label: 'Firmware Revision' },
    { key: 'fwrevision', label: 'FW Revision' },
    { key: 'rev', label: 'Rev' },
    { key: 'controltype', label: 'Control Type' },
    { key: 'controlinput', label: 'Control Input' },
    { key: 'analoginput', label: 'Analog Input' },
    { key: 'analogdigital', label: 'Analog/Digital' },
    { key: 'interfacetype', label: 'Interface Type' },
    { key: 'connectiontype', label: 'Connection Type' },
    { key: 'connectionsize', label: 'Connection Size' },
    // Sensor
    { key: 'sensingrange', label: 'Sensing Range' },
    { key: 'operatingdistance', label: 'Operating Distance' },
    { key: 'sensortype', label: 'Sensor Type' },
    { key: 'sensingtechnology', label: 'Sensing Technology' },
    { key: 'outputtype', label: 'Output Type' },
    { key: 'outputvdc', label: 'Output VDC' },
    { key: 'responsetime', label: 'Response Time' },
    { key: 'minobjsize', label: 'Min Object Size' },
    { key: 'beamgap', label: 'Beam Gap' },
    { key: 'guardedarea', label: 'Guarded Area' },
    // Switch/Relay
    { key: 'numberofpoles', label: 'Number of Poles' },
    { key: 'numberofcircuits', label: 'Number of Circuits' },
    { key: 'contactmaterial', label: 'Contact Material' },
    { key: 'switchaction', label: 'Switch Action' },
    { key: 'actiontype', label: 'Action Type' },
    { key: 'trippingtype', label: 'Tripping Type' },
    // Mechanical
    { key: 'shaftdiameter', label: 'Shaft Diameter' },
    { key: 'rotation', label: 'Rotation' },
    { key: 'capacity', label: 'Capacity' },
    { key: 'load', label: 'Load' },
    { key: 'loadcapacitylbs', label: 'Load Capacity (lbs)' },
    { key: 'displacement', label: 'Displacement' },
    { key: 'thread', label: 'Thread' },
    { key: 'npt', label: 'NPT' },
    { key: 'pipesize', label: 'Pipe Size' },
    { key: 'mountingtype', label: 'Mounting Type' },
    { key: 'mountingstyle', label: 'Mounting Style' },
    // Material/Construction
    { key: 'material', label: 'Material' },
    { key: 'construction', label: 'Construction' },
    { key: 'bodytype', label: 'Body Type' },
    { key: 'bodymaterial', label: 'Body Material' },
    // Other
    { key: 'application', label: 'Application' },
    { key: 'features', label: 'Features' },
    { key: 'serialnumber', label: 'Serial Number' },
    { key: 'datecode', label: 'Date Code' },
    { key: 'countryoforigin', label: 'Country of Origin' },
    { key: 'countryregionofmanufacture', label: 'Country/Region of Manufacture' },
    { key: 'series', label: 'Series' }
  ];

  // Filter to only specs that have values in existing data
  const activeSpecFields = ALL_SPEC_FIELDS.filter(spec => 
    existingData[spec.key] && existingData[spec.key].toString().trim() !== ''
  ).map(spec => ({
    key: spec.key,
    label: spec.label,
    currentKey: `specifications.${spec.key}`
  }));

  const fieldGroups = [
    {
      title: 'Basic Info',
      fields: [
        { key: 'title', label: 'Title', currentKey: 'title' },
        { key: 'brand', label: 'Brand', currentKey: 'brand' },
        { key: 'mpn', label: 'MPN', currentKey: 'partNumber' },
        { key: 'model', label: 'Model', currentKey: 'model' },
        { key: 'usertype', label: 'Category', currentKey: 'productCategory' }
      ]
    },
    {
      title: 'Categories',
      fields: [
        { key: 'ebaycatid', label: 'eBay Cat ID', currentKey: 'ebayCategoryId' },
        { key: 'ebaystoreid', label: 'Store Cat 1', currentKey: 'ebayStoreCategoryId' },
        { key: 'ebaystoreid2', label: 'Store Cat 2', currentKey: 'ebayStoreCategoryId2' }
      ]
    },
    {
      title: 'Pricing & Stock',
      fields: [
        { key: 'price', label: 'Price', currentKey: 'price' },
        { key: 'stock', label: 'Stock', currentKey: 'quantity' },
        { key: 'condition', label: 'Condition', currentKey: 'condition' },
        { key: 'shelf', label: 'Shelf', currentKey: 'shelf' }
      ]
    },
    {
      title: 'Shipping',
      fields: [
        { key: 'boxlength', label: 'Length', currentKey: 'boxLength' },
        { key: 'boxwidth', label: 'Width', currentKey: 'boxWidth' },
        { key: 'boxheight', label: 'Height', currentKey: 'boxHeight' },
        { key: 'weight', label: 'Weight', currentKey: 'weight' }
      ]
    },
    {
      title: `Specifications (${activeSpecFields.length})`,
      fields: activeSpecFields
    }
  ];

  return (
    <div className="w-80 bg-white border-l shadow-lg flex flex-col max-h-[calc(100vh-140px)]">
      {/* Header */}
      <div className="p-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white flex-shrink-0">
        <div className="flex justify-between items-center">
          <div>
            <h3 className="font-bold text-sm">Existing Listing</h3>
            <p className="text-xs text-blue-100">{existingData.sku || existingData.guid}</p>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-blue-500 rounded">
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Legend */}
      <div className="px-3 py-2 bg-gray-50 border-b text-xs flex items-center gap-3 flex-shrink-0">
        <span className="flex items-center gap-1">
          <div className="w-2 h-2 bg-yellow-300 rounded"></div>
          Different
        </span>
        <span className="flex items-center gap-1">
          <div className="w-2 h-2 bg-green-300 rounded"></div>
          Same
        </span>
      </div>

      {/* Content - scrollable */}
      <div className="flex-1 overflow-y-auto min-h-0">
        {fieldGroups.map(group => (
          <div key={group.title}>
            <div className="px-3 py-1.5 bg-gray-100 font-semibold text-xs text-gray-700 border-b">
              {group.title}
            </div>
            {group.fields.map(field => {
              const existingVal = existingData[field.key] || '';
              // Handle nested paths like 'specifications.voltage'
              let currentVal = '';
              if (field.currentKey.includes('.')) {
                const parts = field.currentKey.split('.');
                currentVal = currentData?.[parts[0]]?.[parts[1]] || '';
              } else {
                currentVal = currentData?.[field.currentKey] || '';
              }
              const isDifferent = existingVal.toString().toLowerCase() !== currentVal.toString().toLowerCase();
              
              // Skip empty fields in Specifications section
              if (group.title === 'Specifications' && !existingVal && !currentVal) {
                return null;
              }
              
              return (
                <div 
                  key={field.key} 
                  className={`px-3 py-2 border-b border-gray-100 ${isDifferent ? 'bg-yellow-50' : ''}`}
                >
                  <div className="flex justify-between items-start">
                    <span className="text-xs text-gray-600">{field.label}</span>
                    {isDifferent && existingVal && (
                      <button
                        onClick={() => onUseValue(field.currentKey, existingVal)}
                        className="text-blue-600 hover:text-blue-800 text-xs flex items-center gap-0.5"
                        title="Use existing value"
                      >
                        Use <ArrowRight className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-2 mt-1">
                    <div className="text-xs">
                      <span className="text-gray-400 text-[10px]">Existing:</span>
                      <div className="font-medium truncate">{existingVal || <em className="text-gray-400">empty</em>}</div>
                    </div>
                    <div className="text-xs">
                      <span className="text-gray-400 text-[10px]">Current:</span>
                      <div className="font-medium truncate">{currentVal || <em className="text-gray-400">empty</em>}</div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ))}
      </div>

      {/* Footer - always visible */}
      <div className="p-3 border-t bg-gray-50 flex-shrink-0">
        <button
          onClick={() => {
            // Use all existing values
            fieldGroups.forEach(group => {
              group.fields.forEach(field => {
                const val = existingData[field.key];
                if (val) onUseValue(field.currentKey, val);
              });
            });
          }}
          className="w-full px-3 py-2 bg-blue-600 text-white rounded text-sm font-medium flex items-center justify-center gap-2 hover:bg-blue-700"
        >
          <Check className="w-4 h-4" />
          Keep All Existing
        </button>
      </div>
    </div>
  );
}

// ============================================
// MAIN COMPONENT
// ============================================
export default function ProListingBuilder() {
  const [queue, setQueue] = useState([]);
  const [activeTab, setActiveTab] = useState('all');
  const [brandName, setBrandName] = useState('');
  const [partNumber, setPartNumber] = useState('');
  const [isProcessingImage, setIsProcessingImage] = useState(false);
  const [userName, setUserName] = useState('');
  const [isNameSet, setIsNameSet] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [isSending, setIsSending] = useState(false);
  const [submitAttempted, setSubmitAttempted] = useState({});
  const [coilVoltageVerified, setCoilVoltageVerified] = useState({});
  const [emitterReceiverStatus, setEmitterReceiverStatus] = useState({});
  const [descriptionViewMode, setDescriptionViewMode] = useState({});
  const [photoOrderOverrides, setPhotoOrderOverrides] = useState({}); // { itemId: [0, 1, 2, 3, ...] }
  const [isUploadingPhotos, setIsUploadingPhotos] = useState(false);
  const [isPullingSuredonePhotos, setIsPullingSuredonePhotos] = useState(false);
  const [showSpecs, setShowSpecs] = useState(true);
  const [showEbaySpecifics, setShowEbaySpecifics] = useState(false);
  const fileInputRef = useRef(null);
  
  // NEW: State for SKU comparison
  const [showComparePanel, setShowComparePanel] = useState(false);
  const [existingListingData, setExistingListingData] = useState(null);

  // Debounced local state for text inputs (prevents cursor jumping from Firestore writes)
  const [localFields, setLocalFields] = useState({});

  // Real-time Firebase sync
  useEffect(() => {
    if (!isNameSet) return;
    const q = query(collection(db, 'products'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const items = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        items.push({
          id: doc.id,
          ...data,
          condition: normalizeCondition(data.condition),
          conditionNotes: data.conditionNotes || CONDITION_NOTES[normalizeCondition(data.condition)] || '',
        });
      });
      setQueue(items);
    });
    return () => unsubscribe();
  }, [isNameSet]);

  // Debounced Firestore updates for text inputs (prevents cursor jumping)
  useEffect(() => {
    const timeouts = {};

    Object.entries(localFields).forEach(([key, fieldsForItem]) => {
      const [itemId, ...rest] = key.split('::');
      if (!itemId) return;

      Object.entries(fieldsForItem).forEach(([fieldName, value]) => {
        const timeoutKey = `${itemId}::${fieldName}`;
        timeouts[timeoutKey] = setTimeout(() => {
          updateField(itemId, fieldName, value);
        }, 500); // 500ms debounce
      });
    });

    return () => Object.values(timeouts).forEach(clearTimeout);
  }, [localFields]);

  // Helper: Get field value (local state if exists, otherwise from item)
  const getFieldValue = (item, fieldName) => {
    const localValue = localFields[item.id]?.[fieldName];
    return localValue !== undefined ? localValue : (item[fieldName] || '');
  };

  // Helper: Set local field value (triggers debounced Firestore update)
  const setFieldValue = (itemId, fieldName, value) => {
    setLocalFields(prev => ({
      ...prev,
      [itemId]: {
        ...prev[itemId],
        [fieldName]: value
      }
    }));
  };

  // Helper: Get photo order (returns array of indices, respecting local override)
  const getPhotoOrder = (item) => {
    if (!item.photos || item.photos.length === 0) return [];
    // Check if we have a local override for this item
    if (photoOrderOverrides[item.id]) {
      return photoOrderOverrides[item.id];
    }
    // Default: [0, 1, 2, 3, ...]
    return Array.from({ length: item.photos.length }, (_, i) => i);
  };

  // Helper: Move photo left or right
  const handleMovePhoto = async (item, index, direction) => {
    const currentOrder = getPhotoOrder(item);
    const newOrder = [...currentOrder];
    const targetIndex = direction === 'left' ? index - 1 : index + 1;

    // Boundary check
    if (targetIndex < 0 || targetIndex >= newOrder.length) return;

    // Swap positions
    [newOrder[index], newOrder[targetIndex]] = [newOrder[targetIndex], newOrder[index]];

    // Update local state for immediate UI feedback
    setPhotoOrderOverrides(prev => ({
      ...prev,
      [item.id]: newOrder
    }));

    // Reorder Firebase arrays
    const reorderedPhotos = newOrder.map(i => item.photos[i]);
    const reorderedViews = newOrder.map(i => item.photoViews?.[i] || null).filter(Boolean);

    try {
      await updateDoc(doc(db, 'products', item.id), {
        photos: reorderedPhotos,
        photoViews: reorderedViews
      });
      console.log(`Reordered photos for ${item.sku}: ${newOrder}`);
    } catch (error) {
      console.error('Failed to reorder photos:', error);
      alert('Failed to reorder photos: ' + error.message);
      // Revert local state on error
      setPhotoOrderOverrides(prev => {
        const updated = { ...prev };
        delete updated[item.id];
        return updated;
      });
    }
  };

  const compressImage = (file, maxWidth = 1200, quality = 0.8) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target.result;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width, height = img.height;
          if (width > maxWidth) { height = (height * maxWidth) / width; width = maxWidth; }
          canvas.width = width; canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);
          canvas.toBlob((blob) => {
            const r = new FileReader();
            r.readAsDataURL(blob);
            r.onloadend = () => resolve(r.result.split(',')[1]);
          }, 'image/jpeg', quality);
        };
        img.onerror = reject;
      };
      reader.onerror = reject;
    });
  };

  const handlePhotoUpload = async (files, itemId) => {
    if (!files || files.length === 0) return;

    const item = queue.find(q => q.id === itemId);
    if (!item) return;

    setIsUploadingPhotos(true);

    try {
      const sku = item.sku || itemId;
      const existingPhotos = item.photos || [];
      const existingViews = item.photoViews || [];
      const newPhotoUrls = [];
      const newViewNames = [];

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const uploadIndex = existingPhotos.length + i + 1;
        const viewName = `upload_${uploadIndex}`;

        // Convert file to base64
        const base64 = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result.split(',')[1]);
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });

        // Upload via new simple upload API
        const response = await fetch('/api/photos/upload-simple', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sku: sku,
            view: viewName,
            imageData: base64,
            contentType: file.type || 'image/jpeg'
          })
        });

        if (response.ok) {
          const data = await response.json();
          newPhotoUrls.push(data.url);
          newViewNames.push(viewName);
          console.log(`Uploaded ${viewName}: ${file.name}`);
        } else {
          const errorText = await response.text();
          console.error(`Failed to upload ${file.name}:`, errorText);
        }
      }

      if (newPhotoUrls.length > 0) {
        // Append to existing arrays in Firebase
        const updatedPhotos = [...existingPhotos, ...newPhotoUrls];
        const updatedViews = [...existingViews, ...newViewNames];

        await updateDoc(doc(db, 'products', itemId), {
          photos: updatedPhotos,
          photoViews: updatedViews
        });

        console.log(`Added ${newPhotoUrls.length} photos to ${sku}`);
      }
    } catch (err) {
      console.error('Photo upload error:', err);
      alert('Failed to upload photos: ' + err.message);
    } finally {
      setIsUploadingPhotos(false);
    }
  };

  const handlePullPhotosFromSuredone = async (item) => {
    const sku = item.sku;
    if (!sku) {
      alert('No SKU found for this item');
      return;
    }

    setIsPullingSuredonePhotos(true);

    try {
      // Step 1: Get item from SureDone
      const response = await fetch(`/api/suredone/get-item?sku=${encodeURIComponent(sku)}`);
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`SureDone API error: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      if (!data.success || !data.item) {
        throw new Error('Item not found in SureDone');
      }

      const suredoneItem = data.item;

      // Step 2: Extract media URLs (media1 through media12)
      const mediaUrls = [];
      const viewNames = [];

      for (let i = 1; i <= 12; i++) {
        const url = suredoneItem[`media${i}`];
        if (url && url.trim() && url !== '' && !url.includes('no-image') && !url.includes('placeholder')) {
          mediaUrls.push(url);
          viewNames.push(`suredone_${i}`);
        }
      }

      if (mediaUrls.length === 0) {
        alert(`No photos found in SureDone for SKU: ${sku}`);
        setIsPullingSuredonePhotos(false);
        return;
      }

      // Step 3: Save URLs directly to Firebase
      // SureDone URLs are already public - no need to re-upload
      await updateDoc(doc(db, 'products', item.id), {
        photos: mediaUrls,
        photoViews: viewNames,
        photosSource: 'suredone',
        photosPulledAt: serverTimestamp(),
        photosPulledFrom: sku
      });

      console.log(`Pulled ${mediaUrls.length} photos from SureDone for ${sku}`);
      alert(`✅ Success! Pulled ${mediaUrls.length} photo${mediaUrls.length !== 1 ? 's' : ''} from SureDone`);

    } catch (err) {
      console.error('Failed to pull photos from SureDone:', err);
      alert('Failed to pull photos from SureDone:\n' + err.message);
    } finally {
      setIsPullingSuredonePhotos(false);
    }
  };

  const handleImageUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setIsProcessingImage(true);
    try {
      const base64Data = await compressImage(file);
      const response = await fetch('/api/process-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageData: base64Data, mimeType: 'image/jpeg' })
      });
      const data = await response.json();
      const text = data.content?.filter(b => b.type === 'text').map(b => b.text).join('') || '';
      const brandMatch = text.match(/BRAND:\s*([^\|\n\r]+)/i);
      const partMatch = text.match(/PART:\s*([^\|\n\r]+)/i);
      const seriesMatch = text.match(/SERIES:\s*([^\|\n\r]+)/i);
      const frnMatch = text.match(/FRN:\s*([^\|\n\r]+)/i);
      const extractedBrand = brandMatch?.[1]?.trim() || '';
      const extractedPart = partMatch?.[1]?.trim() || '';
      if (extractedBrand && extractedPart && extractedPart.length <= 60) {
        const ocrSeries = seriesMatch ? seriesMatch[1].trim() : '';
        const ocrFrn = frnMatch ? frnMatch[1].trim() : '';
        addToQueueWithValues(extractedBrand, extractedPart, ocrSeries, ocrFrn);
      } else {
        alert('Could not extract brand and part number from scan. Please enter manually.');
        setBrandName(extractedBrand.length <= 60 ? extractedBrand : '');
        setPartNumber(extractedPart.length <= 60 ? extractedPart : '');
      }
    } catch (error) {
      console.error('Image error:', error);
      alert('Error: ' + error.message);
    }
    setIsProcessingImage(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const generateKeywords = (item) => {
    const keywords = new Set();
    if (item.brand) keywords.add(item.brand.toLowerCase());
    if (item.partNumber) keywords.add(item.partNumber.toLowerCase());
    if (item.model && item.model !== item.partNumber) keywords.add(item.model.toLowerCase());
    if (item.productCategory) {
      keywords.add(item.productCategory.toLowerCase());
      const catWords = item.productCategory.toLowerCase().split(' ');
      catWords.forEach(w => keywords.add(w));
    }
    if (item.specifications) {
      Object.values(item.specifications).forEach(v => {
        if (v && typeof v === 'string' && v.length < 30) keywords.add(v.toLowerCase());
      });
    }
    return Array.from(keywords).slice(0, 20).join(', ');
  };

  const addToQueueWithValues = async (brand, part, ocrSeries = '', ocrFrn = '') => {
    if (!brand.trim() || !part.trim()) return alert('Enter brand and part number');
    try {
      // If OCR captured series/FRN from the label, seed them into specifications
      const initialSpecs = {};
      if (ocrSeries) initialSpecs.series = ocrSeries;
      if (ocrFrn) {
        initialSpecs.firmwarerevision = ocrFrn;
        initialSpecs.fwrevision = ocrFrn;
        initialSpecs.frn = ocrFrn;
      }
      const docRef = await addDoc(collection(db, 'products'), {
        brand: brand.trim(), partNumber: part.trim(), model: part.trim(),
        status: 'pending', createdBy: userName || 'Unknown', createdAt: serverTimestamp(),
        title: '', productCategory: '', shortDescription: '', description: '', rawDescription: '',
        specifications: initialSpecs, rawSpecifications: [],
        condition: '', conditionNotes: '',
        price: '', quantity: '1', shelf: '',
        boxLength: '', boxWidth: '', boxHeight: '', weight: '',
        qualityFlag: '', ebayCategoryId: '', ebayStoreCategoryId: '', ebayStoreCategoryId2: '',
        bigcommerceCategoryId: '', ebayShippingProfileId: '69077991015'
      });
      setBrandName(''); setPartNumber('');
      setSelectedItem(docRef.id);
      setTimeout(() => processItemById(docRef.id, brand.trim(), part.trim()), 1000);
    } catch (error) {
      console.error('Error adding to queue:', error);
      alert('Error adding item: ' + error.message);
    }
  };

  const addToQueue = () => addToQueueWithValues(brandName, partNumber);

  // NEW: Load existing listing from SureDone into the editor
  const loadExistingListing = async (existingData) => {
    try {
      // Map SureDone condition back to our condition values
      const conditionMap = {
        'New': 'new_in_box',
        'New Other': 'new_open_box',
        'New other (see details)': 'new_open_box',
        'Manufacturer Refurbished': 'refurbished',
        'Seller refurbished': 'refurbished',
        'Used': 'used_good',
        'For Parts or Not Working': 'for_parts',
        'For parts or not working': 'for_parts'
      };
      const mappedCondition = conditionMap[existingData.condition] || 'used_good';

      // Build specs object from ALL SureDone spec fields
      const specs = {};
      const specFields = [
        // Electrical - Voltage
        'voltage', 'inputvoltage', 'outputvoltage', 'voltagerating', 'voltagecompatibility',
        'actualvoltageratingac', 'actualvoltageratingdc', 'nominalvoltageratingac',
        'nominalratedinputvoltage', 'actualratedinputvoltage', 'dcvoltagerange',
        'supplyvoltage', 'coilvoltage',
        // Electrical - Current/Amperage
        'amperage', 'inputamperage', 'outputamperage', 'amperagerange', 'current',
        'currentrating', 'nominalcurrentrating', 'currenttype', 'maxinputcurrent',
        'fullloadamps', 'stallcurrent', 'maximumamperage',
        // Electrical - Phase/Frequency
        'phase', 'numberofphases', 'powerphase', 'hz', 'frequency', 'powerfrequency', 'outputhz',
        // Electrical - Power
        'watts', 'watt', 'maxwattage', 'kw', 'kva', 'powerrating', 'ratedpower',
        'nominalpowerrating', 'outputpower',
        // Motor
        'horsepower', 'ratedloadhp', 'spindlehorsepower', 'rpm', 'baserpm', 'noloadrpm',
        'highestspindlespeedrpm', 'torque', 'stalltorque', 'ratedfullloadtorque',
        'contstalltorqueinlb', 'nm', 'frame', 'motortype', 'enclosuretype',
        'insulationclass', 'nemadesignletter', 'fullstepangle', 'dcstatorwindingtype',
        'reversiblenonreversible',
        // Gearbox/Drive
        'ratio', 'gearratio',
        // Pneumatic/Hydraulic - Pressure
        'psi', 'maxpsi', 'maxbar', 'maxmpa', 'mpa', 'pressure', 'maxpressure',
        'maximumpressure', 'ratedpressure', 'maxoperatingpressure', 'maxfluidpressure',
        // Pneumatic/Hydraulic - Size/Flow
        'portsize', 'portdiameter', 'bore', 'borediameter', 'stroke', 'strokelength',
        'flowrate', 'gpm', 'maximumairflow', 'cylinderaction', 'cylindertype',
        'hydraulicpumptype', 'pumpaction', 'reservoircapacity', 'actuation',
        'actuatortype', 'numberofways',
        // Control/Automation
        'controllerplatform', 'processor', 'communications', 'communicationstandard',
        'series', 'revision', 'version', 'firmwarerevision', 'fwrevision', 'rev',
        'controltype', 'controlinput', 'analoginput', 'analogdigital',
        'interfacetype', 'connectiontype', 'connectionsize',
        // Sensor
        'sensingrange', 'operatingdistance', 'sensortype', 'sensingtechnology',
        'outputtype', 'outputvdc', 'responsetime', 'minobjsize', 'beamgap', 'guardedarea',
        // Switch/Relay
        'numberofpoles', 'numberofcircuits', 'contactmaterial', 'switchaction',
        'actiontype', 'trippingtype', 'resetactuatortype',
        // Mechanical
        'shaftdiameter', 'shaftinput', 'rotation', 'dynamicloadrating', 'load',
        'capacity', 'liftcapacity', 'loadcapacitylbs', 'capacitymaxweight',
        'liftheight', 'maximummastliftheight', 'loweredmastliftheight', 'platformheight',
        'overalllength', 'displacement', 'pipesize', 'npt', 'thread',
        'terminationtype', 'mountingtype', 'mountingstyle', 'mount', 'compatiblemountingtype',
        // Material/Construction
        'material', 'construction', 'constuction', 'body', 'bodytype', 'bodymaterial',
        'bladematerial', 'ventilationtype',
        // Equipment/Machine
        'equipmenttype', 'equipmentmake', 'toolmodel', 'make', 'robottype',
        'roboticscontrolstype', 'payload', 'axis', 'cycles', 'increment', 'resolver',
        'tablelength', 'tablewidth', 'xaxistravelbed', 'yaxistravelbed', 'zaxistravelbed',
        'suitablefor', 'compatibleequipmenttype',
        // Transformer
        'primaryinput', 'primaryvoltageratingac', 'primarycurrentrating',
        'secondaryoutput', 'secondaryvoltageratingac', 'secondarycurrentrating',
        'turnsratio', 'minimumoperatingfrequency', 'maximumoperatingfrequency',
        'conversionfunction', 'currentconversion',
        // Fan/Blower
        'fanblowertype', 'axialfanbearingtype',
        // Other
        'application', 'features', 'unittype', 'parttype', 'outlets', 'outlettype',
        'numberofoutlets', 'cable', 'screensize', 'tension', 'pulsesperrevolution',
        'switchingfrequency', 'dischargeopening', 'numberofrods', 'suitablemedia',
        'bundlelisting', 'rmin', 'shape', 'angle',
        // Date/Reference
        'serialnumber', 'datecode', 'mfgdate', 'modelyear', 'replaces',
        // Equipment-specific
        'forklifttype', 'tiretype', 'hours', 'attachmentmodel', 'fueltype',
        'powersource', 'tonnage', 'refrigerant', 'emptyweight', 'bussinput',
        'centrifugalpumptype', 'countryoforigin', 'countryregionofmanufacture',
        'modifieditem', 'indicatortype', 'measuredparameters', 'gpu',
        'graphicsprocessingtype', 'chipsetgpumodel', 'connectivity'
      ];
      
      specFields.forEach(key => {
        if (existingData[key] && existingData[key].toString().trim() !== '') {
          specs[key] = existingData[key];
        }
      });

      // Determine product category - prefer eBay category name if we have an eBay cat ID
      let productCategory = '';
      let detectedEbayCatId = existingData.ebaycatid || '';
      
      // DEBUG: Log what we received from SureDone
      console.log('=== CATEGORY DETECTION DEBUG ===');
      console.log('ebaycatid from SureDone:', existingData.ebaycatid);
      console.log('ebaystoreid from SureDone:', existingData.ebaystoreid);
      console.log('ebaystoreid2 from SureDone:', existingData.ebaystoreid2);
      console.log('usertype from SureDone:', existingData.usertype);
      console.log('EBAY_CATEGORY_ID_TO_NAME lookup for', detectedEbayCatId, ':', EBAY_CATEGORY_ID_TO_NAME[detectedEbayCatId]);
      
      if (detectedEbayCatId && EBAY_CATEGORY_ID_TO_NAME[detectedEbayCatId]) {
        // Best case: we have a valid eBay category ID
        productCategory = EBAY_CATEGORY_ID_TO_NAME[detectedEbayCatId];
        console.log('Using eBay category from ebaycatid:', productCategory);
      } else {
        console.log('ebaycatid not found or not in lookup, trying store category...');
        // Try to infer from eBay Store Category
        const storeCategory = existingData.ebaystoreid || '';
        const storeCat = EBAY_STORE_CATEGORIES.find(c => c.id === storeCategory);
        console.log('Store category found:', storeCat);
        if (storeCat) {
          // Clean up store category name
          const cleanStoreName = storeCat.name.trim().toUpperCase();
          console.log('Clean store name:', cleanStoreName);
          if (STORE_TO_PRODUCT_CATEGORY[cleanStoreName]) {
            detectedEbayCatId = STORE_TO_PRODUCT_CATEGORY[cleanStoreName];
            productCategory = EBAY_CATEGORY_ID_TO_NAME[detectedEbayCatId] || cleanStoreName;
            console.log('Inferred eBay category from store:', productCategory);
          }
        }
        // Fall back to usertype only if we still don't have a category
        if (!productCategory && existingData.usertype && existingData.usertype.trim()) {
          productCategory = existingData.usertype;
          console.log('Falling back to usertype:', productCategory);
        } else if (!productCategory && existingData.type && existingData.type.trim()) {
          productCategory = existingData.type;
          console.log('Falling back to type:', productCategory);
        }
      }
      console.log('Final productCategory:', productCategory);
      console.log('Final detectedEbayCatId:', detectedEbayCatId);

      const loadedDesc = existingData.longdescription || '';
      const docRef = await addDoc(collection(db, 'products'), {
        brand: existingData.brand || existingData.manufacturer || '',
        partNumber: existingData.mpn || existingData.partnumber || existingData.model || '',
        model: existingData.model || existingData.mpn || '',
        status: 'complete',
        createdBy: userName || 'Unknown',
        createdAt: serverTimestamp(),
        title: existingData.title || '',
        productCategory: productCategory,
        shortDescription: existingData.shortdescription || '',
        description: loadedDesc,
        rawDescription: loadedDesc, // Store original HTML from SureDone
        specifications: specs,
        rawSpecifications: [],
        condition: mappedCondition,
        conditionNotes: CONDITION_NOTES[mappedCondition] || '',
        price: existingData.price || '',
        quantity: existingData.stock || '1',
        shelf: existingData.shelf || '',
        boxLength: existingData.boxlength || '',
        boxWidth: existingData.boxwidth || '',
        boxHeight: existingData.boxheight || '',
        weight: existingData.weight || existingData.boxweight || '',
        qualityFlag: 'EDITING',
        ebayCategoryId: detectedEbayCatId || existingData.ebaycatid || '',
        ebayStoreCategoryId: existingData.ebaystoreid || '',
        ebayStoreCategoryId2: existingData.ebaystoreid2 || '',
        bigcommerceCategoryId: existingData.bigcommercecategories || '',
        ebayShippingProfileId: existingData.ebayshippingprofileid || '69077991015',
        // Mark as editing existing
        isEditingExisting: true,
        originalSku: existingData.sku || existingData.guid,
        sku: existingData.sku || existingData.guid
      });
      
      setSelectedItem(docRef.id);
      setExistingListingData(existingData);
      setShowComparePanel(true);
      
      // Clear the brand/part fields after loading
      setBrandName('');
      setPartNumber('');
      
    } catch (error) {
      console.error('Error loading existing listing:', error);
      alert('Error loading listing: ' + error.message);
    }
  };

  // NEW: Load existing listing by SKU (for InventoryCheckAlert)
  const loadExistingBySku = async (sku) => {
    try {
      const response = await fetch(`/api/suredone/get-item?sku=${encodeURIComponent(sku)}`);
      const data = await response.json();
      
      if (data.success && data.item) {
        await loadExistingListing(data.item);
      } else {
        alert('Could not load listing: ' + (data.error || 'Item not found'));
      }
    } catch (error) {
      console.error('Error loading by SKU:', error);
      alert('Error loading listing: ' + error.message);
    }
  };

  // NEW: Handle using a value from comparison panel
  const useExistingValue = async (fieldKey, value) => {
    if (!selectedItem) return;
    
    // Handle nested paths like 'specifications.voltage'
    if (fieldKey.includes('.')) {
      const parts = fieldKey.split('.');
      if (parts[0] === 'specifications') {
        const item = queue.find(q => q.id === selectedItem);
        if (item) {
          const newSpecs = { ...item.specifications, [parts[1]]: value };
          await updateDoc(doc(db, 'products', selectedItem), { specifications: newSpecs });
        }
      }
    } else {
      await updateField(selectedItem, fieldKey, value);
    }
  };

  // NEW: Open comparison panel
  const openComparePanel = (sku, data) => {
    setExistingListingData(data);
    setShowComparePanel(true);
  };

  const processItemById = async (itemId, brandOverride, partOverride) => {
    let item = queue.find(q => q.id === itemId);
    if (!item && brandOverride && partOverride) {
      item = { id: itemId, brand: brandOverride, partNumber: partOverride };
    }
    if (!item) return;

    try {
      await updateDoc(doc(db, 'products', itemId), { status: 'searching' });
      
      // v2 API: AI detection + eBay category/store mapping + eBay aspects lookup
      const response = await fetch('/api/search-product-v2', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ brand: item.brand, partNumber: item.partNumber })
      });
      
      if (!response.ok) throw new Error(`API returned ${response.status}`);
      const data = await response.json();
      
      // Log metadata about eBay aspects for debugging
      if (data._metadata) {
        console.log('=== eBay Aspects Metadata ===');
        console.log('Detected Category:', data._metadata.detectedCategory);
        console.log('Category ID:', data._metadata.detectedCategoryId);
        console.log('Aspects Loaded:', data._metadata.ebayAspectsLoaded);
        console.log('Total Aspects:', data._metadata.totalAspects);
      }
      
      const text = data.content?.filter(b => b.type === 'text').map(b => b.text).join('') || '';
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error('No product data found');
      const product = JSON.parse(jsonMatch[0]);
      
      // Store eBay aspects with the product for reference
      // The aspects have 'ebayName' not 'name' based on ebay-category-aspects.js
      let ebayAspects = null;
      if (data._ebayAspects) {
        ebayAspects = {
          required: (data._ebayAspects.required || []).map(a => a.ebayName || a.name).filter(Boolean),
          recommended: (data._ebayAspects.recommended || []).map(a => a.ebayName || a.name).filter(Boolean)
        };
      }
      
      // Build update object, filtering out any undefined values
      const rawDesc = product.description || '';
      const updateData = {
        status: 'complete',
        title: product.title || `${item.brand} ${item.partNumber}`,
        productCategory: product.productType || data._metadata?.detectedCategory || '',
        usertype: product.productType || data._metadata?.productType || '',
        shortDescription: product.shortDescription || '',
        description: rawDesc,
        rawDescription: rawDesc, // Store original AI-generated HTML (source of truth for SureDone)
        specifications: data._resolvedSpecs || product.specifications || {},
        rawSpecifications: product.rawSpecifications || [],
        qualityFlag: product.qualityFlag || 'NEEDS_REVIEW',
        ebayCategoryId: data._metadata?.detectedCategoryId || product.ebayCategoryId || '',
        ebayStoreCategoryId: data._metadata?.ebayStoreCategoryId || product.ebayStoreCategoryId || '',
        ebayStoreCategoryId2: data._metadata?.ebayStoreCategoryId2 || '23399313015'
      };
      
      // Only add optional fields if they have values (Firebase doesn't allow undefined)
      if (product.bigcommerceCategoryId) {
        updateData.bigcommerceCategoryId = product.bigcommerceCategoryId;
      }
      if (ebayAspects) {
        updateData.ebayAspects = ebayAspects;
      }
      
      await updateDoc(doc(db, 'products', itemId), updateData);
      setSubmitAttempted(prev => ({ ...prev, [itemId]: true }));

      // =================================================================
      // PASS 2 + PASS 3: Auto-fill eBay specifics, then revise title/desc
      // Uses reusable runPass2() which auto-triggers runPass3()
      // Only run if Pass 2 hasn't already completed via auto-research
      // =================================================================
      if (data._ebayAspects && data._ebayAspects.all?.length > 0 && item.pass2Status !== 'complete') {
        const updatedItem = {
          ...item,
          title: product.title || `${item.brand} ${item.partNumber}`,
          productCategory: product.productType || data._metadata?.detectedCategory || '',
          description: product.description || '',
          shortDescription: product.shortDescription || '',
          specifications: data._resolvedSpecs || product.specifications || {}
        };
        await runPass2(itemId, updatedItem, data._ebayAspects);
      }
    } catch (error) {
      console.error('Processing error:', error);
      await updateDoc(doc(db, 'products', itemId), { status: 'error', error: error.message });
    }
  };

  const processItem = (itemId) => {
    const item = queue.find(q => q.id === itemId);
    if (item) processItemById(itemId, item.brand, item.partNumber);
  };

  const updateField = async (itemId, field, value) => {
    try { await updateDoc(doc(db, 'products', itemId), { [field]: value }); }
    catch (error) { console.error('Error updating field:', error); }
  };

  // Auto-modify title and description when emitter/receiver status changes
  const applyEmitterReceiverToListing = async (itemId, status, item) => {
    let title = item.title || '';
    let description = item.description || '';

    // Strip any previous ER suffixes/banners so they don't stack
    title = title
      .replace(/\s*-\s*EMITTER ONLY$/i, '')
      .replace(/\s*-\s*RECEIVER ONLY$/i, '')
      .replace(/\s*-\s*Complete Emitter\/Receiver Set$/i, '');
    description = description
      .replace(/<p[^>]*style="[^"]*background[^"]*"[^>]*>.*?(EMITTER ONLY|RECEIVER ONLY|COMPLETE SET).*?<\/p>/gi, '');

    if (status === 'emitter') {
      title = (title + ' - EMITTER ONLY').substring(0, 80);
      const warning = '<p style="background:#fff3cd;padding:10px;border:1px solid #ffc107;font-weight:bold;margin-bottom:15px;">This listing is for the EMITTER ONLY. The receiver is NOT included.</p>';
      description = warning + description;
    } else if (status === 'receiver') {
      title = (title + ' - RECEIVER ONLY').substring(0, 80);
      const warning = '<p style="background:#fff3cd;padding:10px;border:1px solid #ffc107;font-weight:bold;margin-bottom:15px;">This listing is for the RECEIVER ONLY. The emitter is NOT included.</p>';
      description = warning + description;
    } else if (status === 'set') {
      title = (title + ' - Complete Emitter/Receiver Set').substring(0, 80);
      const notice = '<p style="background:#d4edda;padding:10px;border:1px solid #28a745;font-weight:bold;margin-bottom:15px;">This listing includes the COMPLETE SET with both emitter and receiver units.</p>';
      description = notice + description;
    }
    // 'na' = no changes, just stripped previous modifications

    try {
      await updateDoc(doc(db, 'products', itemId), {
        title,
        description,
        rawDescription: description // Keep rawDescription in sync when modifying for emitter/receiver
      });
    }
    catch (error) { console.error('Error applying ER status to listing:', error); }
  };

  const updateSpecification = async (itemId, specKey, value) => {
    const item = queue.find(q => q.id === itemId);
    if (!item) return;
    const newSpecs = { ...item.specifications, [specKey]: value };
    await updateDoc(doc(db, 'products', itemId), { specifications: newSpecs });
  };

  const updateCondition = async (itemId, conditionValue) => {
    try {
      await updateDoc(doc(db, 'products', itemId), {
        condition: conditionValue,
        conditionNotes: CONDITION_NOTES[conditionValue]
      });
    } catch (error) { console.error('Error updating condition:', error); }
  };

  // =================================================================
  // PASS 2: Reusable eBay Item Specifics fill
  // Called from: processItemById (initial search) AND category override
  // =================================================================
  const runPass2 = async (itemId, item, ebayAspects) => {
    try {
      console.log('=== RUNNING PASS 2 ===');
      console.log(`${ebayAspects.all?.length || 0} eBay aspects available`);
      await updateDoc(doc(db, 'products', itemId), { pass2Status: 'filling', categoryOverrideMessage: '' });

      const pass2Response = await fetch('/api/v2/auto-fill-ebay-specifics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          brand: item.brand,
          partNumber: item.partNumber,
          productType: item.productCategory || '',
          title: item.title || `${item.brand} ${item.partNumber}`,
          ebayAspects: ebayAspects,
          pass1Specs: item.specifications || {}
        })
      });

      if (pass2Response.ok) {
        const pass2Data = await pass2Response.json();
        if (pass2Data.success && pass2Data.data) {
          console.log(`Pass 2 filled ${pass2Data.data.filledCount}/${pass2Data.data.totalCount} eBay fields`);

          await updateDoc(doc(db, 'products', itemId), {
            ebayItemSpecifics: pass2Data.data.specificsForUI || [],
            ebayItemSpecificsForSuredone: pass2Data.data.specificsForSuredone || {},
            pass2Status: 'complete',
            pass2FilledCount: pass2Data.data.filledCount || 0,
            pass2TotalCount: pass2Data.data.totalCount || 0
          });

          // Auto-trigger Pass 3: revise title/description with discovered specs
          await runPass3(itemId, item, pass2Data.data.specificsForUI || []);
          return pass2Data.data;
        }
      }

      console.error('Pass 2 API error:', pass2Response.status);
      await updateDoc(doc(db, 'products', itemId), { pass2Status: 'error' });
      return null;
    } catch (error) {
      console.error('Pass 2 error:', error);
      await updateDoc(doc(db, 'products', itemId), { pass2Status: 'error' });
      return null;
    }
  };

  // =================================================================
  // PASS 3: Revise title/description using Pass 2 specs
  // Auto-fires after Pass 2 completes (initial search or category override)
  // =================================================================
  const runPass3 = async (itemId, item, specificsForUI) => {
    try {
      console.log('=== RUNNING PASS 3 ===');
      await updateDoc(doc(db, 'products', itemId), { pass3Status: 'revising' });

      // Convert UI specifics array to { ebayName: value } for revise-listing API
      const filledSpecifics = {};
      for (const spec of specificsForUI) {
        if (spec.value && spec.ebayName) {
          filledSpecifics[spec.ebayName] = spec.value;
        }
      }

      console.log(`Pass 3: ${Object.keys(filledSpecifics).length} filled specs for revision`);

      const pass3Response = await fetch('/api/v2/revise-listing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          brand: item.brand,
          partNumber: item.partNumber,
          productType: item.productCategory || '',
          title: item.title || '',
          description: item.description || '',
          shortDescription: item.shortDescription || '',
          filledSpecifics,
          condition: { descriptionNote: item.conditionNotes || '' }
        })
      });

      if (pass3Response.ok) {
        const pass3Data = await pass3Response.json();
        if (pass3Data.success && pass3Data.data) {
          console.log('Pass 3 result:', pass3Data.data.revised ? 'Revised' : 'No changes needed');
          console.log('Pass 3 changes:', pass3Data.data.changes);

          const updateFields = {
            pass3Status: 'complete',
            pass3Changes: pass3Data.data.changes || []
          };

          if (pass3Data.data.revised) {
            updateFields.title = pass3Data.data.title;
            updateFields.description = pass3Data.data.description;
            updateFields.rawDescription = pass3Data.data.description; // Keep rawDescription in sync
            updateFields.shortDescription = pass3Data.data.shortDescription;
            if (pass3Data.data.keywords) {
              updateFields.metaKeywords = pass3Data.data.keywords;
            }
          }

          await updateDoc(doc(db, 'products', itemId), updateFields);
          return pass3Data.data;
        }
      }

      console.error('Pass 3 API error:', pass3Response.status);
      await updateDoc(doc(db, 'products', itemId), { pass3Status: 'error' });
      return null;
    } catch (error) {
      console.error('Pass 3 error:', error);
      await updateDoc(doc(db, 'products', itemId), { pass3Status: 'error' });
      return null;
    }
  };

  const deleteItem = async (itemId) => {
    try {
      await deleteDoc(doc(db, 'products', itemId));
      if (selectedItem === itemId) {
        setSelectedItem(null);
        setShowComparePanel(false);
        setExistingListingData(null);
      }
    } catch (error) { console.error('Error deleting item:', error); }
  };

  const sendToSureDone = async (itemId) => {
    const item = queue.find(q => q.id === itemId);
    if (!item) return alert('Item not found');
    setSubmitAttempted(prev => ({ ...prev, [itemId]: true }));
    if (!item.title || !item.price) return alert('Please fill in Title and Price');
    if (!item.condition) return alert('Please select a Condition');
    if (!item.shelf) return alert('Please enter a Shelf Location');
    if (needsCoilVoltage(item.productCategory)) {
      if (!item.specifications?.coilvoltage) return alert('Coil voltage is required for ' + item.productCategory + '. Please check the product nameplate.');
      if (!item.coilVoltageVerified && !coilVoltageVerified[itemId]) return alert('Please verify the coil voltage by checking the confirmation checkbox.');
    }
    if (needsEmitterReceiverCheck(item.productCategory)) {
      if (!item.emitterReceiverStatus && !emitterReceiverStatus[itemId]) return alert('Please select the emitter/receiver status for this product.');
    }

    setIsSending(true);
    try {
      const conditionOption = CONDITION_OPTIONS.find(c => c.value === item.condition);
      const keywords = generateKeywords(item);
      
      // Check if updating existing or creating new
      if (item.isEditingExisting && item.originalSku) {
        // UPDATE existing listing in SureDone
        const updateData = {
          guid: item.originalSku,
          title: item.title,
          longdescription: item.description || '',
          price: item.price || '0.00',
          stock: item.quantity || '1',
          brand: item.brand,
          mpn: item.partNumber,
          model: item.model || item.partNumber,
          condition: conditionOption?.label || 'Used',
          usertype: item.usertype || item.productCategory || '',
          ...(item.boxLength && { boxlength: item.boxLength }),
          ...(item.boxWidth && { boxwidth: item.boxWidth }),
          ...(item.boxHeight && { boxheight: item.boxHeight }),
          ...(item.weight && { weight: item.weight }),
          ...(item.shelf && { shelf: item.shelf }),
          ...(item.countryOfOrigin && { countryoforigin: item.countryOfOrigin }),
          ebaycatid: item.ebayCategoryId || '',
          ebaystoreid: item.ebayStoreCategoryId || '',
          ebaystoreid2: item.ebayStoreCategoryId2 || '',
          ebayshippingprofileid: item.ebayShippingProfileId || '69077991015',
          photos: item.photos || [],
          photosNobg: item.photosNobg || {},
          photoViews: item.photoViews || [],
          removeBgFlags: item.removeBgFlags || {}
        };
        
        console.log('Updating existing listing:', updateData);
        
        const response = await fetch('/api/suredone/update-item', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updateData)
        });

        const responseData = await response.json();
        if (!response.ok || !responseData.success) {
          throw new Error(responseData.error || 'Failed to update listing');
        }
        alert(`✅ Successfully updated in SureDone!\n\nSKU: ${item.originalSku}\n\n${item.title}`);
        
      } else {
        // CREATE new listing
        const productData = {
          sku: item.sku || item.id || '', // Pass Scanner's SKU to prevent double generation
          title: item.title,
          description: item.description || '',
          shortDescription: item.shortDescription || '',
          price: item.price || '0.00',
          stock: item.quantity || '1',
          brand: item.brand,
          partNumber: item.partNumber,
          model: item.model || item.partNumber,
          productCategory: item.productCategory || '',
          usertype: item.usertype || item.productCategory || '',
          condition: conditionOption?.label || 'Used',
          conditionNotes: item.conditionNotes || '',
          specifications: item.specifications || {},
          rawSpecifications: item.rawSpecifications || [],
          metaKeywords: keywords,
          ...(item.boxLength && { boxLength: item.boxLength }),
          ...(item.boxWidth && { boxWidth: item.boxWidth }),
          ...(item.boxHeight && { boxHeight: item.boxHeight }),
          ...(item.weight && { weight: item.weight }),
          ...(item.shelf && { shelfLocation: item.shelf }),
          ...(item.countryOfOrigin && { countryOfOrigin: item.countryOfOrigin }),
          ebayCategoryId: item.ebayCategoryId || '',
          ebayStoreCategoryId: item.ebayStoreCategoryId || '',
          ebayStoreCategoryId2: item.ebayStoreCategoryId2 || '',
          bigcommerceCategoryId: item.bigcommerceCategoryId || '',
          ebayShippingProfileId: item.ebayShippingProfileId || '69077991015',
          // Pass 2: eBay item specifics (pre-filled by AI)
          ebayItemSpecificsForSuredone: item.ebayItemSpecificsForSuredone || {},
          photos: item.photos || [],
          photosNobg: item.photosNobg || {},
          photoViews: item.photoViews || [],
          removeBgFlags: item.removeBgFlags || {}
        };
        
        console.log('Creating new listing:', productData);
        
        const response = await fetch('/api/suredone-create-listing', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ product: productData })
        });

        const responseData = await response.json();
        if (!response.ok) throw new Error(responseData.error || 'Failed to create listing');
        alert(`✅ Successfully sent to SureDone!\n\nSKU: ${responseData.sku}\n\n${item.title}`);
      }
    } catch (error) {
      console.error('SureDone error:', error);
      alert(`[X] Error: ${error.message}`);
    }
    setIsSending(false);
  };

  // Enhanced status badge for queue items
  const getStatusBadge = (item) => {
    const hasPhotos = item.photos && item.photos.length > 0;
    const hasTitle = item.title && item.title.length > 5;
    const hasCategory = item.ebayCategoryId;

    if (item.status === 'error') {
      return <span className="text-xs text-red-600 font-semibold">❌ Error</span>;
    }
    if (item.status === 'searching') {
      return <span className="text-xs text-blue-600 flex items-center gap-1">
        <Loader size={12} className="animate-spin" /> Researching...
      </span>;
    }
    if (item.status === 'complete' || item.status === 'photos_complete') {
      if (!hasPhotos) {
        return <span className="text-xs text-orange-600 font-semibold animate-pulse">📷 Needs Photos</span>;
      }
      if (hasPhotos && hasTitle && hasCategory) {
        return <span className="text-xs text-green-600 font-semibold">✅ Ready to Publish</span>;
      }
      return <span className="text-xs text-blue-600 font-semibold">✏️ Editing</span>;
    }
    if (item.status === 'needs_photos') {
      return <span className="text-xs text-gray-500">⏳ Waiting...</span>;
    }
    return <span className="text-xs text-gray-400">{item.status}</span>;
  };

  const stats = {
    total: queue.length,
    complete: queue.filter(q => q.status === 'complete' || q.status === 'photos_complete').length,
    searching: queue.filter(q => q.status === 'searching').length,
    error: queue.filter(q => q.status === 'error').length
  };

  // Tab-specific counts
  const tabCounts = {
    all: queue.length,
    edit: queue.filter(q => q.status === 'complete' || q.status === 'photos_complete').length,
    needsPhotos: queue.filter(q =>
      (q.status === 'complete' || q.status === 'searching' || q.status === 'photos_complete') &&
      (!q.photos || q.photos.length === 0)
    ).length,
    publishReady: queue.filter(q =>
      (q.status === 'complete' || q.status === 'photos_complete') &&
      q.photos && q.photos.length > 0 &&
      q.title && q.title.length > 5 &&
      q.ebayCategoryId
    ).length,
    errors: queue.filter(q => q.status === 'error').length,
  };

  // Filter queue based on active tab
  const filteredQueue = queue.filter(item => {
    // Always show selected item regardless of filter
    if (item.id === selectedItem) return true;

    switch (activeTab) {
      case 'edit':
        return item.status === 'complete' || item.status === 'photos_complete';
      case 'needsPhotos':
        return (item.status === 'complete' || item.status === 'searching' || item.status === 'photos_complete') &&
          (!item.photos || item.photos.length === 0);
      case 'publishReady':
        return (item.status === 'complete' || item.status === 'photos_complete') &&
          item.photos && item.photos.length > 0 &&
          item.title && item.title.length > 5 &&
          item.ebayCategoryId;
      case 'errors':
        return item.status === 'error';
      default:
        return true; // 'all' tab
    }
  });

  // Login screen
  if (!isNameSet) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center p-6">
        <div className="bg-white rounded-xl shadow-lg p-8 max-w-md w-full">
          <h1 className="text-2xl font-bold mb-4">Pro Listing Builder</h1>
          <p className="text-gray-600 mb-6">Enter your name to begin</p>
          <input type="text" placeholder="Your Name" value={userName}
            onChange={e => setUserName(e.target.value)}
            onKeyPress={e => e.key === 'Enter' && userName.trim() && setIsNameSet(true)}
            className="w-full px-4 py-3 border rounded-lg mb-4" />
          <button onClick={() => userName.trim() && setIsNameSet(true)} disabled={!userName.trim()}
            className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">
            Start
          </button>
        </div>
      </div>
    );
  }

  const selected = queue.find(q => q.id === selectedItem);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b px-6 py-4">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h1 className="text-2xl font-bold">Pro Listing Builder 🚀</h1>
            <p className="text-sm text-gray-600">
              Logged in: <span className="font-semibold">{userName}</span> • 
              <span className="text-green-600 ml-2">● Live Sync</span>
            </p>
          </div>
          {/* Toggle Compare Panel Button */}
          {selected?.isEditingExisting && (
            <button
              onClick={() => setShowComparePanel(!showComparePanel)}
              className={`px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 ${
                showComparePanel 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              <ExternalLink className="w-4 h-4" />
              {showComparePanel ? 'Hide Comparison' : 'Show Comparison'}
            </button>
          )}
        </div>
        <div className="flex gap-2 flex-wrap">
          <div className="px-3 py-2 bg-blue-50 rounded-lg text-sm">Total: <span className="font-bold text-blue-800">{stats.total}</span></div>
          <div className="px-3 py-2 bg-yellow-50 rounded-lg text-sm">Searching: <span className="font-bold text-yellow-800">{stats.searching}</span></div>
          <div className="px-3 py-2 bg-blue-50 rounded-lg text-sm">Edit: <span className="font-bold text-blue-800">{tabCounts.edit}</span></div>
          <div className="px-3 py-2 bg-orange-50 rounded-lg text-sm">Need Photos: <span className="font-bold text-orange-800">{tabCounts.needsPhotos}</span></div>
          <div className="px-3 py-2 bg-green-50 rounded-lg text-sm">Publish Ready: <span className="font-bold text-green-800">{tabCounts.publishReady}</span></div>
          <div className="px-3 py-2 bg-red-50 rounded-lg text-sm">Errors: <span className="font-bold text-red-800">{stats.error}</span></div>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row h-auto lg:h-[calc(100vh-140px)]">
        {/* Sidebar */}
        <div className="w-full lg:w-80 bg-white border-b lg:border-r lg:border-b-0 overflow-y-auto max-h-[40vh] lg:max-h-none">
          {/* Add New Item Section */}
          <div className="p-4 border-b">
            <h2 className="font-semibold mb-3">Add Item</h2>
            <div className="flex gap-2 mb-2">
              <input ref={fileInputRef} type="file" accept="image/*" capture="environment" onChange={handleImageUpload} className="hidden" id="cam" />
              <label htmlFor="cam" className="flex-1 px-3 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 cursor-pointer flex items-center justify-center gap-2 text-sm">
                <Camera className="w-4 h-4" />{isProcessingImage ? '...' : 'Camera'}
              </label>
              <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" id="upload" />
              <label htmlFor="upload" className="flex-1 px-3 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 cursor-pointer flex items-center justify-center gap-2 text-sm">
                <Upload className="w-4 h-4" />Upload
              </label>
            </div>
            <input type="text" placeholder="Brand" value={brandName} onChange={e => setBrandName(e.target.value)} className="w-full px-3 py-2 border rounded-lg mb-2 text-sm" />
            <input type="text" placeholder="Part Number" value={partNumber} onChange={e => setPartNumber(e.target.value)} onKeyPress={e => e.key === 'Enter' && addToQueue()} className="w-full px-3 py-2 border rounded-lg mb-2 text-sm" />
            
            {/* Inventory Check Alert */}
            <InventoryCheckAlert 
              brand={brandName}
              partNumber={partNumber}
              onSelectExisting={(match) => {
                // Load the existing listing directly into the editor
                console.log('Loading existing item:', match);
                loadExistingBySku(match.sku);
              }}
              onCreateNew={() => {
                // User chose to create new despite duplicates
                console.log('User chose to create new listing anyway');
                addToQueue();
              }}
            />
            
            <button onClick={addToQueue} className="w-full px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm">
              <Plus className="w-4 h-4 inline mr-1" /> Add
            </button>
          </div>

          {/* NEW: SKU Lookup Section */}
          <div className="p-4 border-b">
            <SkuLookup 
              onLoadListing={loadExistingListing}
              onCompareClick={openComparePanel}
            />
          </div>

          {/* Queue Filter Tabs */}
          <div className="p-2 border-b">
            <div className="flex flex-wrap gap-1 mb-2">
              {[
                { key: 'all', label: '📋 All', color: 'gray' },
                { key: 'edit', label: '✏️ Edit', color: 'blue' },
                { key: 'needsPhotos', label: '📷 Photos', color: 'orange' },
                { key: 'publishReady', label: '✅ Publish', color: 'green' },
                { key: 'errors', label: '❌ Error', color: 'red' },
              ].map(tab => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`px-2 py-1 rounded-lg font-semibold text-xs transition ${
                    activeTab === tab.key
                      ? tab.color === 'gray' ? 'bg-gray-800 text-white' :
                        tab.color === 'blue' ? 'bg-blue-600 text-white' :
                        tab.color === 'orange' ? 'bg-orange-500 text-white' :
                        tab.color === 'green' ? 'bg-green-600 text-white' :
                        'bg-red-600 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {tab.label} <span className="font-bold">({tabCounts[tab.key]})</span>
                </button>
              ))}
            </div>
          </div>

          {/* Queue */}
          <div className="p-2">
            <h3 className="text-sm font-semibold text-gray-600 mb-2 px-2">Queue ({filteredQueue.length})</h3>
            {filteredQueue.map(item => (
              <div key={item.id} onClick={() => {
                setSelectedItem(item.id);
                // If this item has existing data, show comparison
                if (item.isEditingExisting && existingListingData) {
                  setShowComparePanel(true);
                }
              }} className={`p-3 mb-2 rounded-lg border cursor-pointer transition ${selectedItem === item.id ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300 bg-white'}`}>
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      {item.status === 'searching' && <Loader className="w-4 h-4 text-blue-500 animate-spin flex-shrink-0" />}
                      {item.status === 'complete' && <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />}
                      {item.status === 'error' && <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />}
                      <span className="text-sm font-semibold text-gray-800 truncate">{item.brand}</span>
                      {item.isEditingExisting && (
                        <span className="text-[10px] px-1.5 py-0.5 bg-amber-100 text-amber-700 rounded">EDIT</span>
                      )}
                    </div>
                    <p className="text-xs text-gray-600 truncate">{item.partNumber}</p>
                    {item.sku && (
                      <p className="text-[10px] text-gray-500 font-mono mt-0.5">SKU: {item.sku}</p>
                    )}
                    <div className="mt-1">{getStatusBadge(item)}</div>
                    {item.productCategory && <p className="text-xs text-blue-600 mt-0.5">{item.productCategory}</p>}
                    {item.shelvedAt && (
                      <p className="text-[10px] text-green-700 font-semibold mt-0.5">
                        📦 Shelved at {item.shelf || 'shelf'} ✓
                      </p>
                    )}
                    {item.pass2Status === 'complete' && (
                      <p className="text-[10px] text-purple-600 mt-0.5">🏷️ {item.pass2FilledCount || 0} eBay specs filled</p>
                    )}
                    {item.pass2Status === 'filling' && (
                      <p className="text-[10px] text-purple-500 mt-0.5 animate-pulse">⏳ Filling eBay specs...</p>
                    )}
                  </div>
                  <button onClick={(e) => { e.stopPropagation(); deleteItem(item.id); }} className="text-red-600 hover:bg-red-50 p-1 rounded ml-2">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 overflow-y-auto p-4 lg:p-6">
          {selected ? (
            <div className="max-w-4xl mx-auto bg-white rounded-xl shadow-sm p-6">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h2 className="text-2xl font-bold">{selected.brand} {selected.partNumber}</h2>
                  {selected.sku && (
                    <p className="text-sm text-gray-600 font-mono mt-1 select-all">SKU: {selected.sku}</p>
                  )}
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    <span className={`text-sm px-2 py-1 rounded flex items-center gap-1 ${
                      selected.status === 'complete' ? 'bg-green-100 text-green-700' :
                      selected.status === 'searching' ? 'bg-blue-100 text-blue-700' :
                      selected.status === 'error' ? 'bg-red-100 text-red-700' :
                      'bg-yellow-100 text-yellow-700'
                    }`}>
                      {selected.status === 'searching' && <Loader size={14} className="animate-spin" />}
                      {selected.status === 'searching' ? '🔍 Researching...' :
                       selected.status === 'complete' ? '✅ Ready' :
                       selected.status === 'needs_photos' ? '📷 Needs Photos' :
                       selected.status === 'photos_complete' ? '📸 Photos Done' :
                       selected.status === 'error' ? '❌ Error' :
                       selected.status}
                    </span>
                    {selected.isEditingExisting && (
                      <span className="text-sm px-2 py-1 rounded bg-amber-100 text-amber-700">
                        Editing: {selected.originalSku}
                      </span>
                    )}
                    {selected.qualityFlag && (
                      <span className={`text-sm px-2 py-1 rounded ${selected.qualityFlag === 'STRONG' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                        {selected.qualityFlag}
                      </span>
                    )}
                    {selected.productCategory && <span className="text-sm px-2 py-1 rounded bg-blue-100 text-blue-700">{selected.productCategory}</span>}
                    {selected.pass2Status === 'complete' && (
                      <span className="text-sm px-2 py-1 rounded bg-purple-100 text-purple-700">
                        🏷️ {selected.pass2FilledCount}/{selected.pass2TotalCount} eBay specs
                      </span>
                    )}
                    {selected.pass2Status === 'filling' && (
                      <span className="text-sm px-2 py-1 rounded bg-purple-100 text-purple-600 animate-pulse">
                        ⏳ Filling eBay specs...
                      </span>
                    )}
                  </div>
                </div>
                <button onClick={() => processItem(selected.id)} className="px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm flex items-center gap-1">
                  <RefreshCw className="w-4 h-4" /> Re-search
                </button>
              </div>

              {['complete', 'photos_complete', 'searching'].includes(selected.status) && (
                <div className="space-y-6">
                  {/* Title */}
                  <div>
                    <label className="block text-sm font-semibold mb-2">Title ({getFieldValue(selected, 'title').length}/80)</label>
                    <input type="text" value={getFieldValue(selected, 'title')} onChange={e => setFieldValue(selected.id, 'title', e.target.value.slice(0, 80))} className="w-full px-3 py-2 border rounded-lg" maxLength={80} />
                  </div>

                  {/* MPN and Model */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-semibold mb-2">MPN (Full Part Number)</label>
                      <input type="text" value={getFieldValue(selected, 'partNumber')} onChange={e => setFieldValue(selected.id, 'partNumber', e.target.value)} className="w-full px-3 py-2 border rounded-lg" />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold mb-2">Model (Base/Series)</label>
                      <input type="text" value={getFieldValue(selected, 'model')} onChange={e => setFieldValue(selected.id, 'model', e.target.value)} className="w-full px-3 py-2 border rounded-lg" placeholder="Same as MPN if identical" />
                    </div>
                  </div>

                  {/* eBay Product Category */}
                  <div>
                    <label className="block text-sm font-semibold mb-2">eBay Product Category</label>
                    <div className="flex gap-2">
                      <div className="flex-1 px-3 py-2 bg-gray-100 border rounded-lg text-sm">
                        {selected.productCategory ? (
                          <span className="font-medium">
                            {selected.productCategory}
                            {selected.ebayCategoryId && <span className="text-gray-500 ml-2">(ID: {selected.ebayCategoryId})</span>}
                          </span>
                        ) : (
                          <span className="text-gray-400">Not detected</span>
                        )}
                      </div>
                      <button 
                        onClick={() => processItem(selected.id)} 
                        className="px-3 py-2 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded-lg text-sm flex items-center gap-1"
                      >
                        <RefreshCw className="w-4 h-4" /> Re-detect
                      </button>
                    </div>
                    {selected.ebayCategoryId && EBAY_CATEGORY_TAXONOMY[selected.ebayCategoryId] && (
                      <p className="text-xs text-green-700 mt-2 p-2 bg-green-50 rounded border border-green-200">
                        📦 <strong>Full eBay Path:</strong> {EBAY_CATEGORY_TAXONOMY[selected.ebayCategoryId].path}
                      </p>
                    )}
                    <details className="mt-2">
                      <summary className="text-xs text-blue-600 cursor-pointer hover:underline">Override category manually</summary>
                      <select
                        value={selected.ebayCategoryId || ''}
                        onChange={async (e) => {
                          const catId = e.target.value;
                          const catName = EBAY_CATEGORY_ID_TO_NAME[catId] || '';
                          updateField(selected.id, 'ebayCategoryId', catId);
                          if (catName) {
                            updateField(selected.id, 'productCategory', catName);
                          }
                          // Re-run Pass 2 with new category's eBay aspects
                          if (catId) {
                            try {
                              const aspectsRes = await fetch(`/api/ebay-category-aspects?categoryId=${catId}`);
                              if (aspectsRes.ok) {
                                const aspects = await aspectsRes.json();
                                if (aspects.all?.length > 0) {
                                  const item = { ...selected, productCategory: catName };
                                  await runPass2(selected.id, item, aspects);
                                  await updateDoc(doc(db, 'products', selected.id), {
                                    categoryOverrideMessage: `Category changed \u2014 item specifics refreshed for ${catName}`
                                  });
                                }
                              }
                            } catch (err) {
                              console.error('Category override error:', err);
                            }
                          }
                        }}
                        className="w-full px-3 py-2 border rounded-lg text-xs mt-2"
                      >
                        <option value="">Select eBay category...</option>
                        {CATEGORY_DROPDOWN_OPTIONS.map(cat => (
                          <option key={cat.id} value={cat.id}>
                            {cat.name} ({cat.id})
                          </option>
                        ))}
                      </select>
                    </details>
                    {selected.categoryOverrideMessage && (
                      <div className="mt-2 p-2 bg-green-50 border border-green-200 rounded text-xs text-green-700">
                        {selected.categoryOverrideMessage}
                      </div>
                    )}
                  </div>

                  {/* eBay Store Categories */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-semibold mb-2">eBay Store Category 1</label>
                      <select value={selected.ebayStoreCategoryId || ''} onChange={e => updateField(selected.id, 'ebayStoreCategoryId', e.target.value)} className="w-full px-3 py-2 border rounded-lg text-sm">
                        <option value="">Select...</option>
                        {renderStoreCategoryOptions()}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-semibold mb-2">eBay Store Category 2</label>
                      <select value={selected.ebayStoreCategoryId2 || ''} onChange={e => updateField(selected.id, 'ebayStoreCategoryId2', e.target.value)} className="w-full px-3 py-2 border rounded-lg text-sm">
                        <option value="">Select...</option>
                        {renderStoreCategoryOptions()}
                      </select>
                    </div>
                  </div>

                  {/* Specifications */}
                  <div className="border rounded-lg overflow-hidden">
                    <button onClick={() => setShowSpecs(!showSpecs)} className="w-full px-4 py-3 bg-blue-50 flex justify-between items-center hover:bg-blue-100 transition">
                      <span className="font-semibold text-blue-800">📋 Specifications ({Object.keys(selected.specifications || {}).length} fields)</span>
                      {showSpecs ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                    </button>
                    {showSpecs && selected.specifications && Object.keys(selected.specifications).length > 0 && (
                      <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                        {Object.entries(selected.specifications)
                          .sort(([a], [b]) => a.localeCompare(b))
                          .map(([key, value]) => (
                            <div key={key} className="flex flex-col">
                              <label className="text-xs font-medium text-gray-600 mb-1">{SPEC_LABELS[key] || SPEC_LABELS[key.toLowerCase()] || SPEC_LABELS[key.replace(/([A-Z])/g, '_$1').toLowerCase()] || key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}</label>
                              <input type="text" value={value || ''} onChange={e => updateSpecification(selected.id, key, e.target.value)} className="px-3 py-2 border rounded-lg text-sm" />
                            </div>
                          ))}
                      </div>
                    )}
                    {showSpecs && (!selected.specifications || Object.keys(selected.specifications).length === 0) && (
                      <div className="p-4 text-gray-500 text-sm">No specifications found</div>
                    )}
                  </div>

                  {/* Conflict Detection: Pass 1 productType vs Pass 2 "Type" field */}
                  {selected.ebayItemSpecifics?.length > 0 && selected.productCategory && (() => {
                    const typeSpec = selected.ebayItemSpecifics.find(s => s.ebayName === 'Type');
                    if (typeSpec?.value && selected.productCategory) {
                      const p2Type = typeSpec.value.toLowerCase();
                      const p1Type = selected.productCategory.toLowerCase();
                      if (p2Type !== p1Type && !p2Type.includes(p1Type) && !p1Type.includes(p2Type)) {
                        return (
                          <div className="p-3 bg-yellow-50 border border-yellow-300 rounded-lg text-sm text-yellow-800">
                            <strong>Category mismatch:</strong> AI detected <strong>{selected.productCategory}</strong> but eBay specifics suggest <strong>{typeSpec.value}</strong>. Consider changing the eBay category.
                          </div>
                        );
                      }
                    }
                    return null;
                  })()}

                  {/* Pass 3 Status Indicators */}
                  {selected.pass3Status === 'revising' && (
                    <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-700 animate-pulse">
                      Pass 3: Revising title and description with discovered specs...
                    </div>
                  )}
                  {selected.pass3Status === 'complete' && selected.pass3Changes?.length > 0 && (
                    <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-700">
                      Pass 3: {selected.pass3Changes.join('; ')}
                    </div>
                  )}
                  {selected.pass3Status === 'error' && (
                    <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                      Pass 3 revision failed
                    </div>
                  )}

                  {/* Coil Voltage Enforcement — for relays, contactors, starters, solenoid valves */}
                  {needsCoilVoltage(selected.productCategory) && (
                    <div className="p-4 bg-yellow-50 border-2 border-yellow-400 rounded-lg">
                      <p className="font-bold text-yellow-800 text-sm">
                        ⚡ COIL VOLTAGE REQUIRED — This product type commonly has a coil voltage. Please verify and enter the coil voltage. Check the product label/nameplate and add a photo showing the coil voltage.
                      </p>
                      {/* Raw input — what's on the nameplate */}
                      <div className="mt-3">
                        <label className="text-sm font-bold text-yellow-900">Coil Voltage (as shown on nameplate):</label>
                        <input type="text" placeholder="e.g. 24V DC, 110/120VAC, DC48V"
                          value={selected.coilVoltageRaw || ''}
                          onChange={e => {
                            const raw = e.target.value;
                            updateField(selected.id, 'coilVoltageRaw', raw);
                            const result = normalizeCoilVoltage(raw);
                            if (result.confidence === 'high') {
                              updateSpecification(selected.id, 'coilvoltage', result.standardized);
                            }
                          }}
                          className="w-full mt-1 px-3 py-2 border-2 border-yellow-400 rounded-lg bg-white font-semibold text-lg"
                        />
                        {selected.coilVoltageRaw && (() => {
                          const result = normalizeCoilVoltage(selected.coilVoltageRaw);
                          if (result.confidence === 'high' && result.standardized !== 'Other') {
                            return <p className="text-sm text-green-700 mt-1 font-medium">Standardized as: {result.standardized}</p>;
                          } else if (result.standardized === 'Other') {
                            return <p className="text-sm text-orange-600 mt-1 font-medium">Could not auto-detect — please select from dropdown</p>;
                          }
                          return null;
                        })()}
                      </div>
                      {/* Standard value dropdown */}
                      <div className="mt-2">
                        <label className="text-sm font-bold text-yellow-900">Standard Value (used in listing):</label>
                        <select
                          value={selected.specifications?.coilvoltage || ''}
                          onChange={e => updateSpecification(selected.id, 'coilvoltage', e.target.value)}
                          className="w-full mt-1 px-3 py-2 border-2 border-yellow-400 rounded-lg bg-white font-semibold"
                        >
                          <option value="">-- Select Standard Value --</option>
                          {STANDARD_COIL_VOLTAGES.map(v => <option key={v} value={v}>{v}</option>)}
                        </select>
                      </div>
                      <label className="flex items-center gap-2 mt-3 cursor-pointer">
                        <input type="checkbox"
                          checked={selected.coilVoltageVerified || coilVoltageVerified[selected.id] || false}
                          onChange={e => { const checked = e.target.checked; setCoilVoltageVerified(prev => ({ ...prev, [selected.id]: checked })); updateField(selected.id, 'coilVoltageVerified', checked); }}
                          className="w-5 h-5 accent-yellow-600"
                        />
                        <span className="text-sm font-semibold text-yellow-900">I have verified the coil voltage from the product nameplate/label</span>
                      </label>
                      {submitAttempted[selected.id] && !selected.specifications?.coilvoltage && (
                        <div className="mt-3 p-3 bg-red-100 border border-red-400 rounded-lg">
                          <p className="text-sm font-bold text-red-800">
                            Coil voltage is required for {selected.productCategory}. This is the #1 reason for returns. Please check the product nameplate and enter the coil voltage before submitting.
                          </p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Emitter/Receiver Set Detection — for photoelectric sensors, light curtains, through-beam sensors */}
                  {needsEmitterReceiverCheck(selected.productCategory) && (
                    <div className="p-4 bg-yellow-50 border-2 border-yellow-400 rounded-lg">
                      <p className="font-bold text-yellow-800 text-sm">
                        EMITTER/RECEIVER DETECTION — This product type often comes as a paired set (emitter + receiver). Please select:
                      </p>
                      <div className="mt-3 space-y-2">
                        {[
                          { value: 'set', label: 'Complete Set (Emitter + Receiver together)' },
                          { value: 'emitter', label: 'Emitter Only' },
                          { value: 'receiver', label: 'Receiver Only' },
                          { value: 'na', label: 'Not Applicable (single unit sensor)' }
                        ].map(opt => (
                          <label key={opt.value} className="flex items-center gap-2 cursor-pointer">
                            <input type="radio" name={`er-${selected.id}`}
                              value={opt.value}
                              checked={(selected.emitterReceiverStatus || emitterReceiverStatus[selected.id]) === opt.value}
                              onChange={() => {
                                setEmitterReceiverStatus(prev => ({ ...prev, [selected.id]: opt.value }));
                                updateField(selected.id, 'emitterReceiverStatus', opt.value);
                                applyEmitterReceiverToListing(selected.id, opt.value, selected);
                              }}
                              className="w-4 h-4 accent-yellow-600"
                            />
                            <span className="text-sm font-medium text-yellow-900">{opt.label}</span>
                          </label>
                        ))}
                      </div>

                      {/* If Complete Set — show both part number fields */}
                      {(selected.emitterReceiverStatus || emitterReceiverStatus[selected.id]) === 'set' && (
                        <div className="mt-3 space-y-2">
                          <div>
                            <label className="text-sm font-bold text-yellow-900">Emitter Part Number:</label>
                            <input type="text"
                              value={selected.emitterPartNumber || ''}
                              onChange={e => {
                                const val = e.target.value;
                                updateField(selected.id, 'emitterPartNumber', val);
                                const recvPN = selected.receiverPartNumber || '';
                                if (val && recvPN) updateField(selected.id, 'partNumber', val + ' / ' + recvPN);
                              }}
                              className="w-full mt-1 px-3 py-2 border-2 border-yellow-400 rounded-lg bg-white"
                            />
                          </div>
                          <div>
                            <label className="text-sm font-bold text-yellow-900">Receiver Part Number:</label>
                            <input type="text"
                              value={selected.receiverPartNumber || ''}
                              onChange={e => {
                                const val = e.target.value;
                                updateField(selected.id, 'receiverPartNumber', val);
                                const emitPN = selected.emitterPartNumber || '';
                                if (emitPN && val) updateField(selected.id, 'partNumber', emitPN + ' / ' + val);
                              }}
                              className="w-full mt-1 px-3 py-2 border-2 border-yellow-400 rounded-lg bg-white"
                            />
                          </div>
                        </div>
                      )}

                      {/* Validation: must select an option before submit */}
                      {submitAttempted[selected.id] && !(selected.emitterReceiverStatus || emitterReceiverStatus[selected.id]) && (
                        <div className="mt-3 p-3 bg-red-100 border border-red-400 rounded-lg">
                          <p className="text-sm font-bold text-red-800">
                            Please select whether this is a complete set, emitter only, receiver only, or not applicable.
                          </p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* eBay Item Specifics (Pass 2) */}
                  {(selected.ebayItemSpecifics?.length > 0 || selected.pass2Status === 'filling') && (
                    <div className="border rounded-lg overflow-hidden">
                      <button onClick={() => setShowEbaySpecifics(!showEbaySpecifics)} className="w-full px-4 py-3 bg-purple-50 flex justify-between items-center hover:bg-purple-100 transition">
                        <span className="font-semibold text-purple-800">
                          🏷️ eBay Item Specifics
                          {selected.pass2Status === 'filling' && (
                            <span className="ml-2 text-sm text-purple-600 animate-pulse">⏳ AI filling...</span>
                          )}
                          {selected.pass2Status === 'complete' && (
                            <span className="ml-2 text-sm text-green-600">
                              ✔ {selected.pass2FilledCount || 0}/{selected.pass2TotalCount || 0} filled
                            </span>
                          )}
                          {selected.pass2Status === 'error' && (
                            <span className="ml-2 text-sm text-red-600">⚠ Error</span>
                          )}
                        </span>
                        {showEbaySpecifics ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                      </button>
                      {showEbaySpecifics && selected.pass2Status === 'filling' && (
                        <div className="p-6 text-center">
                          <Loader className="w-8 h-8 text-purple-500 animate-spin mx-auto mb-2" />
                          <p className="text-sm text-gray-600">AI is filling eBay item specifics...</p>
                        </div>
                      )}
                      {showEbaySpecifics && selected.ebayItemSpecifics?.length > 0 && (
                        <div className="p-4">
                          {/* Required fields first */}
                          {selected.ebayItemSpecifics.filter(s => s.required).length > 0 && (
                            <div className="mb-4">
                              <p className="text-xs font-bold text-red-600 mb-2 uppercase">Required</p>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                {selected.ebayItemSpecifics.filter(s => s.required).map((spec) => (
                                  <div key={spec.ebayName || spec.name} className="flex flex-col">
                                    <label className="text-xs font-medium text-red-700 mb-1">{spec.ebayName} *</label>
                                    {spec.mode === 'SELECTION_ONLY' && spec.allowedValues?.length > 0 ? (
                                      <select
                                        value={spec.value || ''}
                                        onChange={e => {
                                          const newSpecifics = [...selected.ebayItemSpecifics];
                                          const i = newSpecifics.findIndex(s => s.ebayName === spec.ebayName);
                                          if (i !== -1) {
                                            newSpecifics[i] = { ...newSpecifics[i], value: e.target.value };
                                            // Update both UI and SureDone data
                                            const newSuredone = { ...selected.ebayItemSpecificsForSuredone };
                                            if (spec.suredoneInlineField) newSuredone[spec.suredoneInlineField] = e.target.value;
                                            if (spec.suredoneDynamicField) newSuredone[spec.suredoneDynamicField] = e.target.value;
                                            updateField(selected.id, 'ebayItemSpecifics', newSpecifics);
                                            updateField(selected.id, 'ebayItemSpecificsForSuredone', newSuredone);
                                          }
                                        }}
                                        className={`px-3 py-2 border rounded-lg text-sm ${!spec.value ? 'border-red-300 bg-red-50' : 'border-green-300 bg-green-50'}`}
                                      >
                                        <option value="">Select...</option>
                                        {spec.allowedValues.map(v => <option key={v} value={v}>{v}</option>)}
                                      </select>
                                    ) : (
                                      <input
                                        type="text"
                                        value={spec.value || ''}
                                        onChange={e => {
                                          const newSpecifics = [...selected.ebayItemSpecifics];
                                          const i = newSpecifics.findIndex(s => s.ebayName === spec.ebayName);
                                          if (i !== -1) {
                                            newSpecifics[i] = { ...newSpecifics[i], value: e.target.value };
                                            const newSuredone = { ...selected.ebayItemSpecificsForSuredone };
                                            if (spec.suredoneInlineField) newSuredone[spec.suredoneInlineField] = e.target.value;
                                            if (spec.suredoneDynamicField) newSuredone[spec.suredoneDynamicField] = e.target.value;
                                            updateField(selected.id, 'ebayItemSpecifics', newSpecifics);
                                            updateField(selected.id, 'ebayItemSpecificsForSuredone', newSuredone);
                                          }
                                        }}
                                        className={`px-3 py-2 border rounded-lg text-sm ${!spec.value ? 'border-red-300 bg-red-50' : 'border-green-300 bg-green-50'}`}
                                      />
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                          {/* Recommended fields */}
                          {selected.ebayItemSpecifics.filter(s => !s.required && s.usage === 'RECOMMENDED').length > 0 && (
                            <div className="mb-4">
                              <p className="text-xs font-bold text-blue-600 mb-2 uppercase">Recommended</p>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                {selected.ebayItemSpecifics.filter(s => !s.required && s.usage === 'RECOMMENDED').map((spec) => (
                                  <div key={spec.ebayName || spec.name} className="flex flex-col">
                                    <label className="text-xs font-medium text-blue-700 mb-1">{spec.ebayName}</label>
                                    {spec.mode === 'SELECTION_ONLY' && spec.allowedValues?.length > 0 ? (
                                      <select
                                        value={spec.value || ''}
                                        onChange={e => {
                                          const newSpecifics = [...selected.ebayItemSpecifics];
                                          const i = newSpecifics.findIndex(s => s.ebayName === spec.ebayName);
                                          if (i !== -1) {
                                            newSpecifics[i] = { ...newSpecifics[i], value: e.target.value };
                                            const newSuredone = { ...selected.ebayItemSpecificsForSuredone };
                                            if (spec.suredoneInlineField) newSuredone[spec.suredoneInlineField] = e.target.value;
                                            if (spec.suredoneDynamicField) newSuredone[spec.suredoneDynamicField] = e.target.value;
                                            updateField(selected.id, 'ebayItemSpecifics', newSpecifics);
                                            updateField(selected.id, 'ebayItemSpecificsForSuredone', newSuredone);
                                          }
                                        }}
                                        className={`px-3 py-2 border rounded-lg text-sm ${spec.value ? 'bg-green-50 border-green-200' : 'bg-white'}`}
                                      >
                                        <option value="">Select...</option>
                                        {spec.allowedValues.map(v => <option key={v} value={v}>{v}</option>)}
                                      </select>
                                    ) : (
                                      <input
                                        type="text"
                                        value={spec.value || ''}
                                        onChange={e => {
                                          const newSpecifics = [...selected.ebayItemSpecifics];
                                          const i = newSpecifics.findIndex(s => s.ebayName === spec.ebayName);
                                          if (i !== -1) {
                                            newSpecifics[i] = { ...newSpecifics[i], value: e.target.value };
                                            const newSuredone = { ...selected.ebayItemSpecificsForSuredone };
                                            if (spec.suredoneInlineField) newSuredone[spec.suredoneInlineField] = e.target.value;
                                            if (spec.suredoneDynamicField) newSuredone[spec.suredoneDynamicField] = e.target.value;
                                            updateField(selected.id, 'ebayItemSpecifics', newSpecifics);
                                            updateField(selected.id, 'ebayItemSpecificsForSuredone', newSuredone);
                                          }
                                        }}
                                        className={`px-3 py-2 border rounded-lg text-sm ${spec.value ? 'bg-green-50 border-green-200' : 'bg-white'}`}
                                      />
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                          {/* Optional fields (collapsed by default) */}
                          {selected.ebayItemSpecifics.filter(s => !s.required && s.usage !== 'RECOMMENDED').length > 0 && (
                            <details className="mt-2">
                              <summary className="text-xs text-gray-500 cursor-pointer hover:text-gray-700">
                                Optional fields ({selected.ebayItemSpecifics.filter(s => !s.required && s.usage !== 'RECOMMENDED').length})
                              </summary>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-2">
                                {selected.ebayItemSpecifics.filter(s => !s.required && s.usage !== 'RECOMMENDED').map((spec, idx) => (
                                  <div key={`opt-${idx}`} className="flex flex-col">
                                    <label className="text-xs font-medium text-gray-500 mb-1">{spec.ebayName}</label>
                                    {spec.mode === 'SELECTION_ONLY' && spec.allowedValues?.length > 0 ? (
                                      <select
                                        value={spec.value || ''}
                                        onChange={e => {
                                          const newSpecifics = [...selected.ebayItemSpecifics];
                                          const i = newSpecifics.findIndex(s => s.ebayName === spec.ebayName);
                                          if (i !== -1) {
                                            newSpecifics[i] = { ...newSpecifics[i], value: e.target.value };
                                            const newSuredone = { ...selected.ebayItemSpecificsForSuredone };
                                            if (spec.suredoneInlineField) newSuredone[spec.suredoneInlineField] = e.target.value;
                                            if (spec.suredoneDynamicField) newSuredone[spec.suredoneDynamicField] = e.target.value;
                                            updateField(selected.id, 'ebayItemSpecifics', newSpecifics);
                                            updateField(selected.id, 'ebayItemSpecificsForSuredone', newSuredone);
                                          }
                                        }}
                                        className={`px-3 py-2 border rounded-lg text-sm ${spec.value ? 'bg-green-50 border-green-200' : 'bg-white'}`}
                                      >
                                        <option value="">Select...</option>
                                        {spec.allowedValues.map(v => <option key={v} value={v}>{v}</option>)}
                                      </select>
                                    ) : (
                                      <input
                                        type="text"
                                        value={spec.value || ''}
                                        onChange={e => {
                                          const newSpecifics = [...selected.ebayItemSpecifics];
                                          const i = newSpecifics.findIndex(s => s.ebayName === spec.ebayName);
                                          if (i !== -1) {
                                            newSpecifics[i] = { ...newSpecifics[i], value: e.target.value };
                                            const newSuredone = { ...selected.ebayItemSpecificsForSuredone };
                                            if (spec.suredoneInlineField) newSuredone[spec.suredoneInlineField] = e.target.value;
                                            if (spec.suredoneDynamicField) newSuredone[spec.suredoneDynamicField] = e.target.value;
                                            updateField(selected.id, 'ebayItemSpecifics', newSpecifics);
                                            updateField(selected.id, 'ebayItemSpecificsForSuredone', newSuredone);
                                          }
                                        }}
                                        className={`px-3 py-2 border rounded-lg text-sm ${spec.value ? 'bg-green-50 border-green-200' : 'bg-white'}`}
                                      />
                                    )}
                                  </div>
                                ))}
                              </div>
                            </details>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Description */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="block text-sm font-semibold">Description</label>
                      <div className="flex border rounded-lg overflow-hidden text-xs">
                        <button
                          type="button"
                          onClick={() => setDescriptionViewMode(prev => ({ ...prev, [selected.id]: 'visual' }))}
                          className={`px-3 py-1 ${(descriptionViewMode[selected.id] || 'visual') === 'visual' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                        >
                          Visual
                        </button>
                        <button
                          type="button"
                          onClick={() => setDescriptionViewMode(prev => ({ ...prev, [selected.id]: 'html' }))}
                          className={`px-3 py-1 ${descriptionViewMode[selected.id] === 'html' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                        >
                          HTML Source
                        </button>
                      </div>
                    </div>
                    {(descriptionViewMode[selected.id] || 'visual') === 'visual' ? (
                      (() => {
                        // Split description by table for editing
                        const rawDesc = selected.rawDescription || selected.description || '';
                        const { beforeTable, table, afterTable, hasTable } = splitDescriptionByTable(rawDesc);

                        return hasTable ? (
                          <div className="space-y-4">
                            {/* Editable prose before table */}
                            <ReactQuill
                              theme="snow"
                              value={beforeTable}
                              onChange={(content) => {
                                const merged = mergeDescriptionParts(content, table, afterTable);
                                updateField(selected.id, 'description', merged);
                                updateField(selected.id, 'rawDescription', merged);
                              }}
                              modules={QUILL_MODULES}
                              formats={QUILL_FORMATS}
                              style={{ minHeight: '150px' }}
                            />

                            {/* Read-only table preview */}
                            <div className="border-2 border-blue-200 bg-blue-50 rounded-lg p-4">
                              <div className="flex items-center justify-between mb-2">
                                <p className="text-sm font-semibold text-blue-900">
                                  📊 Technical Specifications Table (Read-Only)
                                </p>
                                <p className="text-xs text-blue-700">
                                  Use "HTML Source" to edit table
                                </p>
                              </div>
                              <div
                                className="bg-white rounded p-3 overflow-x-auto"
                                dangerouslySetInnerHTML={{ __html: table }}
                              />
                            </div>

                            {/* Remaining content after table */}
                            {afterTable && afterTable.trim() && (
                              <div className="border-l-4 border-gray-300 pl-4">
                                <p className="text-xs text-gray-500 mb-2">Content after table:</p>
                                <div
                                  className="prose prose-sm max-w-none"
                                  dangerouslySetInnerHTML={{ __html: afterTable }}
                                />
                              </div>
                            )}
                          </div>
                        ) : (
                          // No table - use regular ReactQuill
                          <ReactQuill
                            theme="snow"
                            value={selected.description || ''}
                            onChange={(content) => {
                              updateField(selected.id, 'description', content);
                              updateField(selected.id, 'rawDescription', content);
                            }}
                            modules={QUILL_MODULES}
                            formats={QUILL_FORMATS}
                            style={{ minHeight: '300px' }}
                          />
                        );
                      })()
                    ) : (
                      <textarea
                        value={selected.rawDescription || selected.description || ''}
                        onChange={e => {
                          updateField(selected.id, 'description', e.target.value);
                          updateField(selected.id, 'rawDescription', e.target.value);
                        }}
                        className="w-full px-3 py-2 border rounded-lg font-mono text-sm"
                        style={{ minHeight: '300px' }}
                      />
                    )}
                  </div>

                  {/* Product Photos */}
                  {selected.photos && selected.photos.length > 0 && (
                    <div>
                      <label className="block text-sm font-semibold mb-2">
                        📷 Product Photos ({selected.photos.length})
                      </label>
                      <div className="grid grid-cols-3 gap-3">
                        {selected.photoViews.map((view, idx) => {
                          // Use the download URLs saved in Firestore (includes access tokens)
                          const originalUrl = selected.photos[idx];
                          const hasBgRemoved = selected.removeBgFlags && selected.removeBgFlags[view];

                          // Use saved _nobg URL if available, otherwise use original
                          const imageUrl = (hasBgRemoved && selected.photosNobg && selected.photosNobg[view])
                            ? selected.photosNobg[view]
                            : originalUrl;

                          return (
                            <div key={idx} className="relative border-2 border-gray-300 rounded-lg overflow-hidden bg-gray-50">
                              <div className="aspect-square relative">
                                <img
                                  src={imageUrl}
                                  alt={view}
                                  className="w-full h-full object-contain"
                                  onError={(e) => {
                                    // Fallback to original if _nobg fails to load
                                    if (hasBgRemoved && originalUrl) {
                                      e.target.src = originalUrl;
                                    }
                                  }}
                                />
                              </div>
                              <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-60 text-white text-xs px-2 py-1 text-center capitalize">
                                {view.replace('_', ' ')}
                                {hasBgRemoved && <span className="ml-1">✨</span>}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Short Description */}
                  <div>
                    <label className="block text-sm font-semibold mb-2">Meta Description ({getFieldValue(selected, 'shortDescription').length}/160)</label>
                    <textarea value={getFieldValue(selected, 'shortDescription')} onChange={e => setFieldValue(selected.id, 'shortDescription', e.target.value.slice(0, 160))} className="w-full px-3 py-2 border rounded-lg h-20 text-sm" maxLength={160} />
                  </div>

                  {/* Photos Section */}
                  <div>
                    <h3 className="text-sm font-semibold mb-2">
                      Product Photos {selected.photos?.length > 0 && (
                        <span className="text-gray-500 font-normal">({selected.photos.length} photo{selected.photos.length !== 1 ? 's' : ''})</span>
                      )}
                    </h3>
                    {selected.photos && selected.photos.length > 0 ? (
                      <div className="grid grid-cols-4 gap-2">
                        {getPhotoOrder(selected).map((originalIdx, displayIdx) => {
                          const url = selected.photos[originalIdx];
                          const viewName = selected.photoViews?.[originalIdx];
                          const nobgUrl = viewName ? selected.photosNobg?.[viewName] : null;
                          const displayUrl = nobgUrl || url;
                          const isNobg = !!nobgUrl;

                          return (
                            <div key={`${selected.id}-${originalIdx}`} className="relative group">
                              <img
                                src={displayUrl}
                                alt={`Photo ${displayIdx + 1}`}
                                className="w-full h-24 object-cover rounded-lg border-2 border-gray-200 hover:border-blue-500 transition cursor-pointer"
                                onClick={() => window.open(displayUrl, '_blank')}
                              />
                              {/* Position badge */}
                              <span className="absolute top-1 left-1 bg-black bg-opacity-70 text-white text-xs font-bold px-2 py-0.5 rounded">
                                {displayIdx + 1}
                              </span>
                              {/* Main image badge */}
                              {displayIdx === 0 && (
                                <span className="absolute top-1 right-1 bg-yellow-500 text-white text-xs font-bold px-1.5 py-0.5 rounded">
                                  ★ MAIN
                                </span>
                              )}
                              {/* No-background badge */}
                              {isNobg && (
                                <span className="absolute bottom-1 right-1 bg-green-600 text-white text-xs font-bold px-1.5 py-0.5 rounded">
                                  NOBG
                                </span>
                              )}
                              {/* Reorder arrows - always visible on mobile, hover-reveal on desktop */}
                              <div className="absolute inset-0 flex items-center justify-between px-1 pointer-events-none">
                                {displayIdx > 0 && (
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleMovePhoto(selected, displayIdx, 'left');
                                    }}
                                    className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center shadow-lg hover:bg-blue-700 transition pointer-events-auto opacity-100 sm:opacity-0 sm:group-hover:opacity-100"
                                    title="Move left"
                                  >
                                    ←
                                  </button>
                                )}
                                <div className="flex-1"></div>
                                {displayIdx < selected.photos.length - 1 && (
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleMovePhoto(selected, displayIdx, 'right');
                                    }}
                                    className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center shadow-lg hover:bg-blue-700 transition pointer-events-auto opacity-100 sm:opacity-0 sm:group-hover:opacity-100"
                                    title="Move right"
                                  >
                                    →
                                  </button>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="bg-orange-50 border-2 border-orange-200 rounded-lg p-4 text-center">
                        <p className="text-orange-700 font-semibold">📷 No photos yet</p>
                        <p className="text-orange-600 text-sm mt-1">Item is in the photo queue — photos will appear here automatically</p>

                        {/* Pull from SureDone option */}
                        <button
                          onClick={() => handlePullPhotosFromSuredone(selected)}
                          disabled={isPullingSuredonePhotos}
                          className="mt-3 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm font-semibold transition disabled:opacity-50 flex items-center gap-2 mx-auto"
                        >
                          {isPullingSuredonePhotos ? (
                            <>
                              <Loader size={16} className="animate-spin" />
                              Pulling from SureDone...
                            </>
                          ) : (
                            <>
                              <Download size={16} />
                              Pull Photos from SureDone
                            </>
                          )}
                        </button>
                        <p className="text-xs text-gray-500 mt-2">
                          For legacy items with existing photos in SureDone
                        </p>
                      </div>
                    )}

                    {/* Watermark Toggle */}
                    {selected.photos && selected.photos.length > 0 && (
                      <div className="flex items-center justify-between mt-3 p-3 bg-gray-50 rounded-lg border">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-gray-700">
                            🏷️ Apply Watermarks
                          </span>
                          <span className="text-xs text-gray-500">
                            (Logo + contact info on published photos)
                          </span>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={selected.watermarkEnabled !== false}
                            onChange={(e) => updateField(selected.id, 'watermarkEnabled', e.target.checked)}
                            className="sr-only peer"
                          />
                          <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600"></div>
                        </label>
                      </div>
                    )}

                    {/* Photo Upload from Computer */}
                    <div className="mt-3">
                      <label
                        className="flex items-center justify-center gap-2 w-full py-3 px-4 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition"
                      >
                        {isUploadingPhotos ? (
                          <>
                            <Loader size={18} className="animate-spin text-blue-600" />
                            <span className="text-sm font-semibold text-blue-600">
                              Uploading...
                            </span>
                          </>
                        ) : (
                          <>
                            <Upload size={18} className="text-gray-500" />
                            <span className="text-sm font-semibold text-gray-600">
                              Upload Photos from Computer
                            </span>
                          </>
                        )}
                        <input
                          type="file"
                          accept="image/*"
                          multiple
                          className="hidden"
                          disabled={isUploadingPhotos}
                          onChange={(e) => {
                            handlePhotoUpload(e.target.files, selected.id);
                            e.target.value = ''; // Reset so same file can be selected again
                          }}
                        />
                      </label>
                      <p className="text-xs text-gray-400 mt-1 text-center">
                        Accepts JPG, PNG, WebP — multiple files OK
                      </p>
                    </div>
                  </div>

                  {/* Condition */}
                  <div>
                    {/* Condition Verification Banner */}
                    {selected.condition && (
                      <div className="bg-amber-50 border-2 border-amber-400 rounded-lg p-4 mb-4">
                        <div className="flex items-start gap-3">
                          <div className="text-amber-600 mt-0.5 text-xl">⚠️</div>
                          <div className="flex-1">
                            <div className="font-bold text-amber-900 text-lg mb-2 uppercase">
                              {(() => {
                                const opt = CONDITION_OPTIONS.find(o => o.value === selected.condition);
                                return opt ? opt.label : selected.condition.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
                              })()}
                            </div>
                            <div className="text-sm text-amber-800 mb-3 leading-relaxed">
                              {CONDITION_NOTES[selected.condition] || 'No description available'}
                            </div>
                            <div className="text-xs text-amber-700 border-t border-amber-300 pt-2">
                              {selected.lifecycle?.scannedBy ? (
                                <>Set by: <span className="font-medium">{selected.lifecycle.scannedBy}</span> during scanning</>
                              ) : selected.createdBy ? (
                                <>Set by: <span className="font-medium">{selected.createdBy}</span></>
                              ) : (
                                <>Set during item creation</>
                              )}
                              <br />
                              <span className="italic">Verify this condition matches the item photos</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    <label className="block text-sm font-semibold mb-2">Condition <span className="text-red-500">*</span></label>
                    <select value={normalizeCondition(selected.condition)} onChange={e => updateCondition(selected.id, e.target.value)} className={`w-full px-3 py-2 border rounded-lg ${!selected.condition && submitAttempted[selected.id] ? 'border-red-500 bg-red-50' : ''}`}>
                      <option value="" disabled>-- Select Condition --</option>
                      {CONDITION_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                    </select>
                    {!selected.condition && submitAttempted[selected.id] && (
                      <p className="text-xs text-red-600 mt-1 font-medium">Condition is required before submitting</p>
                    )}
                  </div>

                  {/* Country of Origin - Autocomplete */}
                  <div>
                    <label className="block text-sm font-semibold mb-2">Country of Origin</label>
                    <CountryAutocomplete 
                      value={selected.countryOfOrigin || selected.specifications?.countryoforigin || ''} 
                      onChange={(value) => {
                        updateField(selected.id, 'countryOfOrigin', value);
                        updateSpecification(selected.id, 'countryoforigin', value);
                      }}
                    />
                  </div>

                  {/* Shipping Profile */}
                  <div>
                    <label className="block text-sm font-semibold mb-2">Shipping Profile</label>
                    <select value={selected.ebayShippingProfileId || '69077991015'} onChange={e => updateField(selected.id, 'ebayShippingProfileId', e.target.value)} className="w-full px-3 py-2 border rounded-lg">
                      {SHIPPING_PROFILES.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                  </div>

                  {/* Dimensions & Quantity */}
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                    <div>
                      <label className="block text-xs font-semibold mb-1">Length (in)</label>
                      <input type="text" value={getFieldValue(selected, 'boxLength')} onChange={e => setFieldValue(selected.id, 'boxLength', e.target.value)} className="w-full px-3 py-2 border rounded-lg text-sm" />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold mb-1">Width (in)</label>
                      <input type="text" value={getFieldValue(selected, 'boxWidth')} onChange={e => setFieldValue(selected.id, 'boxWidth', e.target.value)} className="w-full px-3 py-2 border rounded-lg text-sm" />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold mb-1">Height (in)</label>
                      <input type="text" value={getFieldValue(selected, 'boxHeight')} onChange={e => setFieldValue(selected.id, 'boxHeight', e.target.value)} className="w-full px-3 py-2 border rounded-lg text-sm" />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold mb-1">Weight (lbs)</label>
                      <input type="text" value={getFieldValue(selected, 'weight')} onChange={e => setFieldValue(selected.id, 'weight', e.target.value)} className="w-full px-3 py-2 border rounded-lg text-sm" />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold mb-1">Quantity</label>
                      <input type="number" min="1" value={getFieldValue(selected, 'quantity') || '1'} onChange={e => setFieldValue(selected.id, 'quantity', e.target.value)} className="w-full px-3 py-2 border rounded-lg text-sm" />
                    </div>
                  </div>

                  {/* Price & Shelf */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-semibold mb-2">Price ($) *</label>
                      <input type="text" placeholder="0.00" value={getFieldValue(selected, 'price')} onChange={e => setFieldValue(selected.id, 'price', e.target.value)} className="w-full px-3 py-2 border rounded-lg" />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold mb-2">Shelf Location <span className="text-red-500">*</span></label>
                      <input type="text" placeholder="A1" value={getFieldValue(selected, 'shelf')} onChange={e => { let val = e.target.value; if (val.length > 0) val = val.charAt(0).toUpperCase() + val.slice(1); setFieldValue(selected.id, 'shelf', val); }} className={`w-full px-3 py-2 border rounded-lg ${!selected.shelf && submitAttempted[selected.id] ? 'border-red-500 bg-red-50' : ''}`} />
                      {!selected.shelf && submitAttempted[selected.id] && (
                        <p className="text-xs text-red-600 mt-1 font-medium">Shelf location is required before submitting</p>
                      )}
                    </div>
                  </div>

                  {/* Send Button */}
                  {(() => {
                    // Existing validation
                    const coilBlocking = needsCoilVoltage(selected.productCategory) && (!selected.specifications?.coilvoltage || !(selected.coilVoltageVerified || coilVoltageVerified[selected.id]));
                    const erBlocking = needsEmitterReceiverCheck(selected.productCategory) && !(selected.emitterReceiverStatus || emitterReceiverStatus[selected.id]);

                    // NEW: Photo requirement
                    const hasPhotos = selected.photos && selected.photos.length > 0;
                    const hasTitle = selected.title && selected.title.length > 5;
                    const hasCategory = selected.ebayCategoryId;
                    const photoBlocking = !hasPhotos;

                    const isBlocked = isSending || !selected.title || !selected.price || !selected.condition || !selected.shelf || coilBlocking || erBlocking || photoBlocking;

                    return (
                      <>
                        <button
                          onClick={() => sendToSureDone(selected.id)}
                          disabled={isBlocked}
                          className={`w-full px-6 py-4 rounded-lg font-semibold text-lg disabled:cursor-not-allowed flex items-center justify-center gap-2 ${
                            isBlocked
                              ? 'bg-gray-300 text-gray-500'
                              : 'bg-green-600 text-white hover:bg-green-700'
                          }`}
                        >
                          {isSending ? <><Loader className="w-5 h-5 animate-spin" /> Sending...</> :
                            isBlocked ? '🔒 Send to SureDone' :
                            selected.isEditingExisting ? '📝 Update in SureDone' : '🚀 Send to SureDone'}
                        </button>

                        {/* Show what's blocking */}
                        {isBlocked && !isSending && (
                          <div className="mt-3 text-sm space-y-1">
                            {photoBlocking && (
                              <p className="text-orange-600 font-semibold">📷 Waiting for photos</p>
                            )}
                            {!hasTitle && (
                              <p className="text-red-600 font-semibold">❌ Title required</p>
                            )}
                            {!hasCategory && (
                              <p className="text-red-600 font-semibold">❌ eBay category required</p>
                            )}
                            {!selected.price && (
                              <p className="text-red-600 font-semibold">❌ Price required</p>
                            )}
                            {!selected.condition && (
                              <p className="text-red-600 font-semibold">❌ Condition required</p>
                            )}
                            {!selected.shelf && (
                              <p className="text-red-600 font-semibold">❌ Shelf location required</p>
                            )}
                            {coilBlocking && (
                              <p className="text-red-600 font-semibold">⚠️ Coil voltage verification required</p>
                            )}
                            {erBlocking && (
                              <p className="text-red-600 font-semibold">⚠️ Emitter/Receiver check required</p>
                            )}
                          </div>
                        )}
                      </>
                    );
                  })()}
                </div>
              )}

              {selected.status === 'searching' && (
                <div className="text-center py-16">
                  <Loader className="w-16 h-16 text-blue-500 animate-spin mx-auto mb-4" />
                  <p className="text-gray-600 text-lg">AI is searching for product specifications...</p>
                  <p className="text-gray-400 text-sm mt-2">This may take 15-30 seconds</p>
                </div>
              )}

              {selected.status === 'error' && (
                <div className="text-center py-16">
                  <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
                  <p className="text-red-600 font-semibold text-lg">Error Processing Item</p>
                  <p className="text-red-500 mt-2">{selected.error}</p>
                  <button onClick={() => processItem(selected.id)} className="mt-6 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700">🔄 Retry</button>
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center justify-center h-full text-gray-400 py-20">
              <div className="text-center">
                <Search className="w-20 h-20 mx-auto mb-4 opacity-30" />
                <p className="text-xl">Select an item to view details</p>
                <p className="text-sm mt-2">Or use "Edit Existing Listing" to load from SureDone</p>
              </div>
            </div>
          )}
        </div>

        {/* Comparison Panel (Desktop) */}
        {showComparePanel && existingListingData && (
          <ComparisonPanel
            existingData={existingListingData}
            currentData={selected}
            onUseValue={useExistingValue}
            onClose={() => setShowComparePanel(false)}
            isOpen={showComparePanel}
          />
        )}
      </div>
    </div>
  );
}
