// pages/pro.js
// Pro Listing Builder with SKU Lookup and Comparison Features
// Updated: January 2025

import React, { useState, useRef, useEffect } from 'react';
import { Search, Plus, Trash2, CheckCircle, Loader, AlertCircle, X, Camera, Upload, RefreshCw, ChevronDown, ChevronUp, ExternalLink, ArrowRight, Check } from 'lucide-react';
import { db } from '../firebase';
import { collection, addDoc, updateDoc, deleteDoc, doc, onSnapshot, query, orderBy, serverTimestamp } from 'firebase/firestore';
import InventoryCheckAlert from '../components/InventoryCheckAlert';

// Product category options (internal categories)
const CATEGORY_OPTIONS = [
  'Electric Motors', 'Servo Motors', 'Servo Drives', 'VFDs', 'PLCs', 'HMIs',
  'Power Supplies', 'I/O Modules',
  'Proximity Sensors', 'Photoelectric Sensors', 'Light Curtains', 'Laser Sensors',
  'Pressure Sensors', 'Temperature Sensors',
  'Pneumatic Cylinders', 'Pneumatic Valves', 'Pneumatic Grippers',
  'Hydraulic Pumps', 'Hydraulic Valves', 'Hydraulic Cylinders',
  'Circuit Breakers', 'Contactors', 'Safety Relays', 'Control Relays',
  'Bearings', 'Linear Bearings', 'Encoders', 'Gearboxes', 'Transformers',
  'Industrial Gateways', 'Network Modules'
];

// eBay MARKETPLACE Categories (main eBay listing categories - for display)
const EBAY_MARKETPLACE_CATEGORIES = {
  'Electric Motors': { id: '181732', path: 'Business & Industrial > Electric Motors' },
  'Servo Motors': { id: '181732', path: 'Business & Industrial > Electric Motors' },
  'Servo Drives': { id: '181737', path: 'Business & Industrial > Drives & Starters' },
  'VFDs': { id: '181737', path: 'Business & Industrial > Drives & Starters' },
  'PLCs': { id: '181739', path: 'Business & Industrial > PLCs & HMIs' },
  'HMIs': { id: '181739', path: 'Business & Industrial > PLCs & HMIs' },
  'Power Supplies': { id: '181738', path: 'Business & Industrial > Power Supplies' },
  'I/O Modules': { id: '181739', path: 'Business & Industrial > PLCs & HMIs' },
  'Proximity Sensors': { id: '181744', path: 'Business & Industrial > Sensors' },
  'Photoelectric Sensors': { id: '181744', path: 'Business & Industrial > Sensors' },
  'Light Curtains': { id: '181744', path: 'Business & Industrial > Sensors' },
  'Laser Sensors': { id: '181744', path: 'Business & Industrial > Sensors' },
  'Pressure Sensors': { id: '181744', path: 'Business & Industrial > Sensors' },
  'Temperature Sensors': { id: '181744', path: 'Business & Industrial > Sensors' },
  'Pneumatic Cylinders': { id: '181738', path: 'Business & Industrial > Pneumatics' },
  'Pneumatic Valves': { id: '181738', path: 'Business & Industrial > Pneumatics' },
  'Pneumatic Grippers': { id: '181738', path: 'Business & Industrial > Pneumatics' },
  'Hydraulic Pumps': { id: '181738', path: 'Business & Industrial > Hydraulics' },
  'Hydraulic Valves': { id: '181738', path: 'Business & Industrial > Hydraulics' },
  'Hydraulic Cylinders': { id: '181738', path: 'Business & Industrial > Hydraulics' },
  'Circuit Breakers': { id: '181738', path: 'Business & Industrial > Circuit Breakers' },
  'Contactors': { id: '181738', path: 'Business & Industrial > Motor Starters' },
  'Safety Relays': { id: '181739', path: 'Business & Industrial > Safety Equipment' },
  'Control Relays': { id: '181738', path: 'Business & Industrial > Relays' },
  'Bearings': { id: '181745', path: 'Business & Industrial > Bearings' },
  'Linear Bearings': { id: '181745', path: 'Business & Industrial > Bearings' },
  'Encoders': { id: '181737', path: 'Business & Industrial > Encoders' },
  'Gearboxes': { id: '181732', path: 'Business & Industrial > Gearboxes' },
  'Transformers': { id: '181738', path: 'Business & Industrial > Transformers' },
  'Industrial Gateways': { id: '181739', path: 'Business & Industrial > Automation' },
  'Network Modules': { id: '181739', path: 'Business & Industrial > Automation' }
};

// Condition options
const CONDITION_OPTIONS = [
  { value: 'new_in_box', label: 'New In Box (NIB)' },
  { value: 'new_open_box', label: 'New - Open Box' },
  { value: 'new_missing_hardware', label: 'New - Missing Hardware' },
  { value: 'like_new_excellent', label: 'Excellent - Barely Used' },
  { value: 'used_very_good', label: 'Used - Very Good' },
  { value: 'used_good', label: 'Used - Good' },
  { value: 'used_fair', label: 'Used - Fair' },
  { value: 'for_parts', label: 'For Parts or Not Working' }
];

const CONDITION_NOTES = {
  'new_in_box': 'New item in original manufacturer packaging. Unopened and unused. Includes all original components, manuals, and hardware. We warranty all items for 30 days.',
  'new_open_box': 'New item, factory seal broken or packaging removed. All original components included. Never used. We warranty all items for 30 days.',
  'new_missing_hardware': 'New item, may be missing original packaging, manuals, or minor hardware. Fully functional and unused. We warranty all items for 30 days.',
  'like_new_excellent': 'Previously owned, appears barely used with minimal signs of wear. Tested and fully functional. We warranty all items for 30 days.',
  'used_very_good': 'Previously used, shows light cosmetic wear from normal use. Tested and fully functional. We warranty all items for 30 days.',
  'used_good': 'Previously used, shows signs of wear or discoloration due to normal use. Tested and fully functional. We warranty all items for 30 days.',
  'used_fair': 'Previously used, shows moderate to heavy wear. May have cosmetic damage. Tested and fully functional. We warranty all items for 30 days.',
  'for_parts': 'Item sold as-is for parts or repair. Not tested or may not be fully functional. No warranty provided.'
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
  // Top Level - All Products
  { id: '23399313015', name: '★ ALL PRODUCTS', level: 1 },
  
  // Assembly Tools
  { id: '11495474015', name: 'ASSEMBLY TOOLS', level: 1 },
  
  // Automation Control
  { id: '5384028015', name: 'AUTOMATION CONTROL', level: 1 },
  { id: '6686264015', name: '  └ HMI', level: 2 },
  { id: '18373835', name: '  └ I/O BOARDS', level: 2 },
  { id: '5404089015', name: '  └ PLC', level: 2 },
  { id: '2242362015', name: '  └ POWER SUPPLY', level: 2 },
  
  // Bearings
  { id: '6690505015', name: 'BEARINGS', level: 1 },
  { id: '4173714015', name: '  └ BALL', level: 2 },
  { id: '4173170015', name: '  └ CAM FOLLOWER', level: 2 },
  { id: '4173165015', name: '  └ FLANGE BEARINGS', level: 2 },
  { id: '4173713015', name: '  └ LINEAR', level: 2 },
  { id: '4173171015', name: '  └ NEEDLE', level: 2 },
  { id: '4173166015', name: '  └ PILLOW BLOCK', level: 2 },
  { id: '4173168015', name: '  └ ROLLER', level: 2 },
  { id: '4173167015', name: '  └ TAPERED', level: 2 },
  { id: '4173169015', name: '  └ THRUST', level: 2 },
  
  // Computers
  { id: '19438754015', name: 'COMPUTERS & ACCESSORIES', level: 1 },
  
  // Electrical
  { id: '393385015', name: 'ELECTRICAL', level: 1 },
  { id: '5634105015', name: '  └ CIRCUIT BREAKERS', level: 2 },
  { id: '20338717', name: '  └ DISCONNECTS', level: 2 },
  { id: '18373801', name: '  └ ENCLOSURES', level: 2 },
  { id: '18373807', name: '  └ FUSES & HOLDERS', level: 2 },
  { id: '5634104015', name: '  └ TRANSFORMERS', level: 2 },
  
  // Filtration
  { id: '2343161015', name: 'FILTRATION', level: 1 },
  { id: '2343164015', name: '  └ AIR FILTER', level: 2 },
  { id: '2343166015', name: '  └ COOLANT FILTER', level: 2 },
  { id: '2343163015', name: '  └ HYDRAULIC FILTER', level: 2 },
  { id: '2343165015', name: '  └ OIL FILTER', level: 2 },
  { id: '2343162015', name: '  └ WATER FILTER', level: 2 },
  
  // HVAC
  { id: '17167473', name: 'HVAC', level: 1 },
  { id: '2457873015', name: '  └ CHILLERS', level: 2 },
  { id: '2457884015', name: '  └ FANS', level: 2 },
  
  // Hydraulics
  { id: '6689962015', name: 'HYDRAULICS', level: 1 },
  { id: '6696063015', name: '  └ HYDRAULIC ACCUMULATORS', level: 2 },
  { id: '6696062015', name: '  └ HYDRAULIC ACTUATORS', level: 2 },
  { id: '6696061015', name: '  └ HYDRAULIC CYLINDERS', level: 2 },
  { id: '6696064015', name: '  └ HYDRAULIC PUMPS', level: 2 },
  { id: '6696060015', name: '  └ HYDRAULIC VALVES', level: 2 },
  
  // Industrial Control
  { id: '6688149015', name: 'INDUSTRIAL CONTROL', level: 1 },
  { id: '2242359015', name: '  └ CONTROL RELAYS', level: 2 },
  { id: '1856435015', name: '  └ CORD SETS', level: 2 },
  { id: '18373799', name: '  └ COUNTERS', level: 2 },
  { id: '4173756015', name: '  └ E-STOP SWITCHES', level: 2 },
  { id: '4173739015', name: '  └ FOOT SWITCHES', level: 2 },
  { id: '1484016015', name: '  └ GAUGES', level: 2 },
  { id: '4173737015', name: '  └ ILLUMINATED BUTTONS', level: 2 },
  { id: '4173758015', name: '  └ JOYSTICKS', level: 2 },
  { id: '4173738015', name: '  └ KEY SWITCHES', level: 2 },
  { id: '4173745015', name: '  └ LIMIT SWITCHES', level: 2 },
  { id: '2464037015', name: '  └ MACHINE SAFETY', level: 2 },
  { id: '4173736015', name: '  └ MAINTAINED BUTTONS', level: 2 },
  { id: '4173752015', name: '  └ MICRO SWITCHES', level: 2 },
  { id: '4173735015', name: '  └ MOMENTARY BUTTONS', level: 2 },
  { id: '2348910015', name: '  └ MOTOR CONTROLS', level: 2 },
  { id: '4173743015', name: '  └ PALM OPERATED BUTTONS', level: 2 },
  { id: '5634088015', name: '  └ PANEL METERS', level: 2 },
  { id: '2464042015', name: '  └ PILOT LIGHTS', level: 2 },
  { id: '4173757015', name: '  └ POTENTIOMETERS', level: 2 },
  { id: '1484009015', name: '  └ PRESSURE CONTROLS', level: 2 },
  { id: '4173742015', name: '  └ SELECTOR SWITCHES', level: 2 },
  { id: '6327053015', name: '  └ SOUND MODULES', level: 2 },
  { id: '6690583015', name: '  └ STACK LIGHTS', level: 2 },
  { id: '2461872015', name: '  └ TEMPERATURE CONTROLS', level: 2 },
  { id: '18373798', name: '  └ TIMERS', level: 2 },
  { id: '18373834', name: '  └ TRANSDUCERS', level: 2 },
  { id: '5634089015', name: '  └ TRANSMITTERS', level: 2 },
  
  // Motion Control
  { id: '6686262015', name: 'MOTION CONTROL', level: 1 },
  { id: '1802953015', name: '  └ ENCODERS', level: 2 },
  { id: '393390015', name: '  └ SERVO DRIVES', level: 2 },
  
  // Pneumatics
  { id: '6689961015', name: 'PNEUMATICS', level: 1 },
  { id: '2461878015', name: '  └ ACTUATORS', level: 2 },
  { id: '2461873015', name: '  └ CYLINDERS', level: 2 },
  { id: '2461877015', name: '  └ DRYERS', level: 2 },
  { id: '2461880015', name: '  └ FILTERS', level: 2 },
  { id: '6699359015', name: '  └ GRIPPER', level: 2 },
  { id: '2461876015', name: '  └ LUBRICATORS', level: 2 },
  { id: '6690373015', name: '  └ MUFFLER', level: 2 },
  { id: '6699358015', name: '  └ NIPPER', level: 2 },
  { id: '2461874015', name: '  └ PNEUMATIC VALVES', level: 2 },
  { id: '2461875015', name: '  └ REGULATORS', level: 2 },
  
  // Power Transmission
  { id: '17167474', name: 'POWER TRANSMISSION', level: 1 },
  { id: '6690432015', name: '  └ BALL SCREWS', level: 2 },
  { id: '6688333015', name: '  └ BELTS', level: 2 },
  { id: '6688331015', name: '  └ BRAKES', level: 2 },
  { id: '393386015', name: '  └ CLUTCHES', level: 2 },
  { id: '17167471', name: '  └ ELECTRIC MOTORS', level: 2 },
  { id: '6688332015', name: '  └ GEAR REDUCERS', level: 2 },
  { id: '6690433015', name: '  └ LINEAR ACTUATORS', level: 2 },
  { id: '6690434015', name: '  └ LINEAR RAILS', level: 2 },
  { id: '6688335015', name: '  └ ROLLER CHAINS', level: 2 },
  { id: '393389015', name: '  └ SERVO MOTORS', level: 2 },
  { id: '6688334015', name: '  └ SPROCKETS', level: 2 },
  
  // Pumps
  { id: '6689959015', name: 'PUMPS', level: 1 },
  { id: '6689968015', name: '  └ CENTRIFUGAL PUMP', level: 2 },
  { id: '6689971015', name: '  └ CONDENSATE PUMP', level: 2 },
  { id: '6689969015', name: '  └ DIAPHRAGM PUMP', level: 2 },
  { id: '6689966015', name: '  └ HYDRAULIC PUMP', level: 2 },
  { id: '6689970015', name: '  └ METERING PUMP', level: 2 },
  { id: '6689967015', name: '  └ VACUUM PUMP', level: 2 },
  
  // Sensing Devices
  { id: '6686267015', name: 'SENSING DEVICES', level: 1 },
  { id: '6690176015', name: '  └ BARCODE SCANNERS', level: 2 },
  { id: '4173796015', name: '  └ COLOR SENSORS', level: 2 },
  { id: '4173797015', name: '  └ CURRENT SENSORS', level: 2 },
  { id: '5785856015', name: '  └ FIBER OPTIC SENSORS', level: 2 },
  { id: '4173798015', name: '  └ FLOW SENSORS', level: 2 },
  { id: '2479732015', name: '  └ LASER SENSORS', level: 2 },
  { id: '4173792015', name: '  └ LEVEL SENSORS', level: 2 },
  { id: '393379015', name: '  └ LIGHT CURTAINS', level: 2 },
  { id: '4173799015', name: '  └ LIGHT SENSORS', level: 2 },
  { id: '5634087015', name: '  └ LINEAR SENSORS', level: 2 },
  { id: '5436340015', name: '  └ LOAD CELLS', level: 2 },
  { id: '4173793015', name: '  └ PHOTOELECTRIC SENSORS', level: 2 },
  { id: '6690386015', name: '  └ PRESSURE SENSORS', level: 2 },
  { id: '4173791015', name: '  └ PROXIMITY SENSORS', level: 2 },
  { id: '6695702015', name: '  └ RFID READER', level: 2 },
  { id: '6690556015', name: '  └ TEMPERATURE SENSORS', level: 2 },
  
  // Speed Controls
  { id: '6686272015', name: 'SPEED CONTROLS', level: 1 },
  { id: '2242358015', name: '  └ AC DRIVE', level: 2 },
  { id: '6688299015', name: '  └ DC DRIVE', level: 2 },
  
  // Valves
  { id: '6690464015', name: 'VALVES', level: 1 },
  { id: '6690466015', name: '  └ BALL VALVES', level: 2 },
  { id: '6690465015', name: '  └ BUTTERFLY VALVES', level: 2 },
  { id: '6690467015', name: '  └ CHECK VALVES', level: 2 },
  { id: '6690474015', name: '  └ FLOAT VALVES', level: 2 },
  { id: '6690469015', name: '  └ GAS VALVES', level: 2 },
  { id: '6690472015', name: '  └ GLOBE VALVES', level: 2 },
  { id: '6690470015', name: '  └ LOCKOUT VALVES', level: 2 },
  { id: '6690486015', name: '  └ PRESSURE RELIEF', level: 2 },
  { id: '6690471015', name: '  └ PROPORTIONAL VALVES', level: 2 },
  { id: '6690468015', name: '  └ SOLENOID VALVES', level: 2 },
  { id: '6690473015', name: '  └ STEAM VALVES', level: 2 },
  
  // Other
  { id: '1', name: 'Other Items', level: 1 }
];

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
      title: 'Specifications',
      fields: [
        { key: 'voltage', label: 'Voltage', currentKey: 'specifications.voltage' },
        { key: 'amperage', label: 'Amperage', currentKey: 'specifications.amperage' },
        { key: 'horsepower', label: 'HP', currentKey: 'specifications.horsepower' },
        { key: 'phase', label: 'Phase', currentKey: 'specifications.phase' },
        { key: 'hz', label: 'Hz', currentKey: 'specifications.hz' },
        { key: 'rpm', label: 'RPM', currentKey: 'specifications.rpm' },
        { key: 'kw', label: 'kW', currentKey: 'specifications.kw' },
        { key: 'ratio', label: 'Ratio', currentKey: 'specifications.ratio' }
      ]
    }
  ];

  return (
    <div className="w-80 bg-white border-l shadow-lg overflow-hidden flex flex-col h-full">
      {/* Header */}
      <div className="p-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white">
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
      <div className="px-3 py-2 bg-gray-50 border-b text-xs flex items-center gap-3">
        <span className="flex items-center gap-1">
          <div className="w-2 h-2 bg-yellow-300 rounded"></div>
          Different
        </span>
        <span className="flex items-center gap-1">
          <div className="w-2 h-2 bg-green-300 rounded"></div>
          Same
        </span>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
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

      {/* Footer */}
      <div className="p-3 border-t bg-gray-50">
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
  const [brandName, setBrandName] = useState('');
  const [partNumber, setPartNumber] = useState('');
  const [isProcessingImage, setIsProcessingImage] = useState(false);
  const [userName, setUserName] = useState('');
  const [isNameSet, setIsNameSet] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [isSending, setIsSending] = useState(false);
  const [showSpecs, setShowSpecs] = useState(true);
  const fileInputRef = useRef(null);
  
  // NEW: State for SKU comparison
  const [showComparePanel, setShowComparePanel] = useState(false);
  const [existingListingData, setExistingListingData] = useState(null);

  // Real-time Firebase sync
  useEffect(() => {
    if (!isNameSet) return;
    const q = query(collection(db, 'products'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const items = [];
      snapshot.forEach((doc) => items.push({ id: doc.id, ...doc.data() }));
      setQueue(items);
    });
    return () => unsubscribe();
  }, [isNameSet]);

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
      const brandMatch = text.match(/BRAND:\s*([^\|]+)/i);
      const partMatch = text.match(/PART:\s*(.+)/i);
      if (brandMatch && partMatch) {
        addToQueueWithValues(brandMatch[1].trim(), partMatch[1].trim());
      } else {
        alert('Could not extract info. Please enter manually.');
        setBrandName(brandMatch?.[1]?.trim() || '');
        setPartNumber(partMatch?.[1]?.trim() || '');
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

  const addToQueueWithValues = async (brand, part) => {
    if (!brand.trim() || !part.trim()) return alert('Enter brand and part number');
    try {
      const docRef = await addDoc(collection(db, 'products'), {
        brand: brand.trim(), partNumber: part.trim(), model: part.trim(),
        status: 'pending', createdBy: userName || 'Unknown', createdAt: serverTimestamp(),
        title: '', productCategory: '', shortDescription: '', description: '',
        specifications: {}, rawSpecifications: [],
        condition: 'used_good', conditionNotes: CONDITION_NOTES['used_good'],
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
        // Electrical
        'voltage', 'inputvoltage', 'outputvoltage', 'current', 'amperage',
        'inputamperage', 'outputamperage', 'phase', 'hz', 'frequency',
        // Motor
        'horsepower', 'rpm', 'kw', 'nm', 'torque', 'frame',
        // Pneumatic/Hydraulic
        'psi', 'maxpressure', 'portsize', 'bore', 'borediameter', 'stroke', 'strokelength',
        // Control/Automation
        'controllerplatform', 'communications', 'processor', 'series', 'revision',
        // Other
        'coilvoltage', 'enclosuretype', 'sensingrange', 'outputtype', 'ratio',
        'flowrate', 'capacity', 'kva', 'watts'
      ];
      specFields.forEach(key => {
        if (existingData[key] && existingData[key].toString().trim() !== '') {
          specs[key] = existingData[key];
        }
      });

      const docRef = await addDoc(collection(db, 'products'), {
        brand: existingData.brand || existingData.manufacturer || '',
        partNumber: existingData.mpn || existingData.partnumber || existingData.model || '',
        model: existingData.model || existingData.mpn || '',
        status: 'complete',
        createdBy: userName || 'Unknown',
        createdAt: serverTimestamp(),
        title: existingData.title || '',
        productCategory: existingData.usertype || existingData.type || '',
        shortDescription: existingData.shortdescription || '',
        description: existingData.longdescription || '',
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
        ebayCategoryId: existingData.ebaycatid || '',
        ebayStoreCategoryId: existingData.ebaystoreid || '',
        ebayStoreCategoryId2: existingData.ebaystoreid2 || '',
        bigcommerceCategoryId: existingData.bigcommercecategories || '',
        ebayShippingProfileId: existingData.ebayshippingprofileid || '69077991015',
        // Mark as editing existing
        isEditingExisting: true,
        originalSku: existingData.sku || existingData.guid
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
      const response = await fetch('/api/search-product', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ brand: item.brand, partNumber: item.partNumber })
      });
      if (!response.ok) throw new Error(`API returned ${response.status}`);
      const data = await response.json();
      const text = data.content?.filter(b => b.type === 'text').map(b => b.text).join('') || '';
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error('No product data found');
      const product = JSON.parse(jsonMatch[0]);
      
      await updateDoc(doc(db, 'products', itemId), {
        status: 'complete',
        title: product.title || `${item.brand} ${item.partNumber}`,
        productCategory: product.productCategory || '',
        shortDescription: product.shortDescription || '',
        description: product.description || '',
        specifications: product.specifications || {},
        rawSpecifications: product.rawSpecifications || [],
        qualityFlag: product.qualityFlag || 'NEEDS_REVIEW',
        ebayCategoryId: product.ebayCategory?.id || product.ebayCategoryId || '',
        ebayStoreCategoryId: product.ebayStoreCategoryId || '',
        bigcommerceCategoryId: product.bigcommerceCategoryId || ''
      });
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
    if (!item.title || !item.price) return alert('Please fill in Title and Price');

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
          condition: conditionOption?.label || 'Used - Good',
          ...(item.boxLength && { boxlength: item.boxLength }),
          ...(item.boxWidth && { boxwidth: item.boxWidth }),
          ...(item.boxHeight && { boxheight: item.boxHeight }),
          ...(item.weight && { weight: item.weight }),
          ...(item.shelf && { shelf: item.shelf }),
          ebaycatid: item.ebayCategoryId || '',
          ebaystoreid: item.ebayStoreCategoryId || '',
          ebaystoreid2: item.ebayStoreCategoryId2 || '',
          ebayshippingprofileid: item.ebayShippingProfileId || '69077991015'
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
          title: item.title,
          description: item.description || '',
          shortDescription: item.shortDescription || '',
          price: item.price || '0.00',
          stock: item.quantity || '1',
          brand: item.brand,
          partNumber: item.partNumber,
          model: item.model || item.partNumber,
          productCategory: item.productCategory || '',
          condition: conditionOption?.label || 'Used - Good',
          conditionNotes: item.conditionNotes || '',
          specifications: item.specifications || {},
          rawSpecifications: item.rawSpecifications || [],
          metaKeywords: keywords,
          ...(item.boxLength && { boxLength: item.boxLength }),
          ...(item.boxWidth && { boxWidth: item.boxWidth }),
          ...(item.boxHeight && { boxHeight: item.boxHeight }),
          ...(item.weight && { weight: item.weight }),
          ...(item.shelf && { shelfLocation: item.shelf }),
          ebayCategoryId: item.ebayCategoryId || '',
          ebayStoreCategoryId: item.ebayStoreCategoryId || '',
          ebayStoreCategoryId2: item.ebayStoreCategoryId2 || '',
          bigcommerceCategoryId: item.bigcommerceCategoryId || '',
          ebayShippingProfileId: item.ebayShippingProfileId || '69077991015'
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
      alert(`❌ Error: ${error.message}`);
    }
    setIsSending(false);
  };

  const stats = {
    total: queue.length,
    complete: queue.filter(q => q.status === 'complete').length,
    searching: queue.filter(q => q.status === 'searching').length,
    error: queue.filter(q => q.status === 'error').length
  };

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
              <span className="text-green-600 ml-2">● Live Sync</span>
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
          <div className="px-3 py-2 bg-green-50 rounded-lg text-sm">Complete: <span className="font-bold text-green-800">{stats.complete}</span></div>
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

          {/* Queue */}
          <div className="p-2">
            <h3 className="text-sm font-semibold text-gray-600 mb-2 px-2">Queue ({queue.length})</h3>
            {queue.map(item => (
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
                    {item.productCategory && <p className="text-xs text-blue-600 mt-1">{item.productCategory}</p>}
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
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    <span className={`text-sm px-2 py-1 rounded ${selected.status === 'complete' ? 'bg-green-100 text-green-700' : selected.status === 'error' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'}`}>
                      {selected.status}
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
                  </div>
                </div>
                <button onClick={() => processItem(selected.id)} className="px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm flex items-center gap-1">
                  <RefreshCw className="w-4 h-4" /> Re-search
                </button>
              </div>

              {selected.status === 'complete' && (
                <div className="space-y-6">
                  {/* Title */}
                  <div>
                    <label className="block text-sm font-semibold mb-2">Title ({selected.title?.length || 0}/80)</label>
                    <input type="text" value={selected.title || ''} onChange={e => updateField(selected.id, 'title', e.target.value.slice(0, 80))} className="w-full px-3 py-2 border rounded-lg" maxLength={80} />
                  </div>

                  {/* MPN and Model */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-semibold mb-2">MPN (Full Part Number)</label>
                      <input type="text" value={selected.partNumber || ''} onChange={e => updateField(selected.id, 'partNumber', e.target.value)} className="w-full px-3 py-2 border rounded-lg" />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold mb-2">Model (Base/Series)</label>
                      <input type="text" value={selected.model || ''} onChange={e => updateField(selected.id, 'model', e.target.value)} className="w-full px-3 py-2 border rounded-lg" placeholder="Same as MPN if identical" />
                    </div>
                  </div>

                  {/* eBay Product Category */}
                  <div>
                    <label className="block text-sm font-semibold mb-2">eBay Product Category</label>
                    <div className="flex gap-2">
                      <div className="flex-1 px-3 py-2 bg-gray-100 border rounded-lg text-sm">
                        {selected.productCategory ? (
                          <span className="font-medium">{selected.productCategory}</span>
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
                    {selected.productCategory && EBAY_MARKETPLACE_CATEGORIES[selected.productCategory] && (
                      <p className="text-xs text-green-700 mt-2 p-2 bg-green-50 rounded border border-green-200">
                        📦 <strong>Full Path:</strong> {EBAY_MARKETPLACE_CATEGORIES[selected.productCategory].path}
                        <br/>
                        <span className="text-gray-500">Category ID: {EBAY_MARKETPLACE_CATEGORIES[selected.productCategory].id}</span>
                      </p>
                    )}
                    <details className="mt-2">
                      <summary className="text-xs text-blue-600 cursor-pointer hover:underline">Override category manually</summary>
                      <select 
                        value={selected.productCategory || ''} 
                        onChange={e => updateField(selected.id, 'productCategory', e.target.value)} 
                        className="w-full px-3 py-2 border rounded-lg text-sm mt-2"
                      >
                        <option value="">Select category...</option>
                        {CATEGORY_OPTIONS.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                      </select>
                    </details>
                  </div>

                  {/* eBay Store Categories */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-semibold mb-2">eBay Store Category 1</label>
                      <select value={selected.ebayStoreCategoryId || ''} onChange={e => updateField(selected.id, 'ebayStoreCategoryId', e.target.value)} className="w-full px-3 py-2 border rounded-lg text-sm">
                        <option value="">Select...</option>
                        {EBAY_STORE_CATEGORIES.map(cat => (
                          <option key={cat.id} value={cat.id}>{cat.name}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-semibold mb-2">eBay Store Category 2</label>
                      <select value={selected.ebayStoreCategoryId2 || ''} onChange={e => updateField(selected.id, 'ebayStoreCategoryId2', e.target.value)} className="w-full px-3 py-2 border rounded-lg text-sm">
                        <option value="">Select...</option>
                        {EBAY_STORE_CATEGORIES.map(cat => (
                          <option key={cat.id} value={cat.id}>{cat.name}</option>
                        ))}
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
                        {Object.entries(selected.specifications).map(([key, value]) => (
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

                  {/* Description */}
                  <div>
                    <label className="block text-sm font-semibold mb-2">Description</label>
                    <textarea value={selected.description || ''} onChange={e => updateField(selected.id, 'description', e.target.value)} className="w-full px-3 py-2 border rounded-lg h-40 font-mono text-sm" />
                    {selected.description?.includes('<') && (
                      <div className="mt-2 p-3 bg-gray-50 border rounded-lg">
                        <p className="text-xs font-semibold text-gray-600 mb-2">Preview:</p>
                        <div className="text-sm prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: selected.description }} />
                      </div>
                    )}
                  </div>

                  {/* Short Description */}
                  <div>
                    <label className="block text-sm font-semibold mb-2">Meta Description ({selected.shortDescription?.length || 0}/160)</label>
                    <textarea value={selected.shortDescription || ''} onChange={e => updateField(selected.id, 'shortDescription', e.target.value.slice(0, 160))} className="w-full px-3 py-2 border rounded-lg h-20 text-sm" maxLength={160} />
                  </div>

                  {/* Condition */}
                  <div>
                    <label className="block text-sm font-semibold mb-2">Condition</label>
                    <select value={selected.condition || 'used_good'} onChange={e => updateCondition(selected.id, e.target.value)} className="w-full px-3 py-2 border rounded-lg">
                      {CONDITION_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                    </select>
                    <p className="text-xs text-gray-600 mt-2 p-2 bg-gray-50 rounded">{selected.conditionNotes}</p>
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
                      <input type="text" value={selected.boxLength || ''} onChange={e => updateField(selected.id, 'boxLength', e.target.value)} className="w-full px-3 py-2 border rounded-lg text-sm" />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold mb-1">Width (in)</label>
                      <input type="text" value={selected.boxWidth || ''} onChange={e => updateField(selected.id, 'boxWidth', e.target.value)} className="w-full px-3 py-2 border rounded-lg text-sm" />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold mb-1">Height (in)</label>
                      <input type="text" value={selected.boxHeight || ''} onChange={e => updateField(selected.id, 'boxHeight', e.target.value)} className="w-full px-3 py-2 border rounded-lg text-sm" />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold mb-1">Weight (lbs)</label>
                      <input type="text" value={selected.weight || ''} onChange={e => updateField(selected.id, 'weight', e.target.value)} className="w-full px-3 py-2 border rounded-lg text-sm" />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold mb-1">Quantity</label>
                      <input type="number" min="1" value={selected.quantity || '1'} onChange={e => updateField(selected.id, 'quantity', e.target.value)} className="w-full px-3 py-2 border rounded-lg text-sm" />
                    </div>
                  </div>

                  {/* Price & Shelf */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-semibold mb-2">Price ($) *</label>
                      <input type="text" placeholder="0.00" value={selected.price || ''} onChange={e => updateField(selected.id, 'price', e.target.value)} className="w-full px-3 py-2 border rounded-lg" />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold mb-2">Shelf Location</label>
                      <input type="text" placeholder="A1" value={selected.shelf || ''} onChange={e => updateField(selected.id, 'shelf', e.target.value)} className="w-full px-3 py-2 border rounded-lg" />
                    </div>
                  </div>

                  {/* Send Button */}
                  <button onClick={() => sendToSureDone(selected.id)} disabled={isSending || !selected.title || !selected.price}
                    className="w-full px-6 py-4 bg-green-600 text-white rounded-lg hover:bg-green-700 font-semibold text-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2">
                    {isSending ? <><Loader className="w-5 h-5 animate-spin" /> Sending...</> : 
                      selected.isEditingExisting ? '📝 Update in SureDone' : '🚀 Send to SureDone'}
                  </button>
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
