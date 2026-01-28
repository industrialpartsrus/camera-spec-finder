import React, { useState, useEffect, useCallback } from 'react';

/**
 * UnifiedListingManager Component
 * 
 * All-in-one tool for managing listings:
 * - SKU lookup from SureDone
 * - Auto-detect brand/platform from MPN
 * - Category-aware AI spec extraction
 * - eBay field requirements by category
 * - Quality scoring
 * - Push updates back to SureDone
 */

// ============================================
// BRAND DETECTION PATTERNS
// ============================================
const BRAND_DETECTION = {
  // Allen-Bradley / Rockwell
  "1756": "Allen-Bradley", "1769": "Allen-Bradley", "1768": "Allen-Bradley",
  "1746": "Allen-Bradley", "1747": "Allen-Bradley", "1761": "Allen-Bradley",
  "1762": "Allen-Bradley", "1763": "Allen-Bradley", "1764": "Allen-Bradley",
  "1766": "Allen-Bradley", "1794": "Allen-Bradley", "1734": "Allen-Bradley",
  "2080": "Allen-Bradley", "2085": "Allen-Bradley", "20-": "Allen-Bradley",
  "22-": "Allen-Bradley", "25-": "Allen-Bradley", "150-": "Allen-Bradley",
  "1492": "Allen-Bradley", "700-": "Allen-Bradley", "800": "Allen-Bradley",
  "855": "Allen-Bradley", "MPL-": "Allen-Bradley", "MPM-": "Allen-Bradley",
  "VPL-": "Allen-Bradley",
  
  // Siemens
  "6ES": "Siemens", "6ED": "Siemens", "6AV": "Siemens", "6SL": "Siemens",
  "6SE": "Siemens", "6EP": "Siemens", "6GK": "Siemens", "3RV": "Siemens",
  "3RT": "Siemens", "3RU": "Siemens", "5SX": "Siemens", "5SY": "Siemens",
  
  // SMC Pneumatics
  "CDQ": "SMC", "CD85": "SMC", "CQ2": "SMC", "CM2": "SMC", "CG1": "SMC",
  "CDG": "SMC", "MGQL": "SMC", "MKB": "SMC", "MHS": "SMC", "CDRB": "SMC",
  "CRB": "SMC", "CDLA": "SMC", "MDNB": "SMC", "MNB": "SMC", "SY": "SMC",
  "VQ": "SMC", "VQZ": "SMC", "AM": "SMC", "AF": "SMC", "AW": "SMC",
  
  // Festo
  "MFH": "Festo", "DSNU": "Festo", "DNC": "Festo", "ADN": "Festo",
  "ADVU": "Festo", "DGC": "Festo", "CPE": "Festo", "VUVG": "Festo",
  
  // Yaskawa
  "SGDV": "Yaskawa", "SGDM": "Yaskawa", "SGDS": "Yaskawa", "SGMG": "Yaskawa",
  "SGMJ": "Yaskawa", "CIMR": "Yaskawa",
  
  // Mitsubishi
  "FX": "Mitsubishi", "QJ": "Mitsubishi", "A1S": "Mitsubishi", "Q0": "Mitsubishi",
  "HF-": "Mitsubishi", "MR-": "Mitsubishi", "FR-": "Mitsubishi",
  
  // FANUC
  "A06B": "FANUC", "A02B": "FANUC", "A03B": "FANUC", "A16B": "FANUC",
  
  // Omron
  "CJ1": "Omron", "CJ2": "Omron", "CP1": "Omron", "E2E": "Omron", "E3Z": "Omron",
  
  // Others
  "IC69": "GE Fanuc", "IC20": "GE Fanuc",
  "750-": "WAGO", "753-": "WAGO", "787-": "WAGO",
  "D2-": "Automation Direct", "D4-": "Automation Direct",
  "PJ-": "Keyence", "LV-": "Keyence", "FS-": "Keyence",
  "ACS": "ABB", "3HAC": "ABB",
  "LC1": "Schneider Electric", "ATV": "Schneider Electric",
  "SDN": "Sola", "EDS": "Hydac", "CW": "Sun Hydraulics",
  "EG": "Fuji Electric", "SC-": "Fuji Electric",
  "LPJ": "Cooper Bussmann", "697": "Werma", "EX10": "Toshiba",
  "5GU": "Oriental Motor", "5RK": "Oriental Motor", "BLM": "Oriental Motor",
  "KR": "THK", "SHS": "THK", "HSR": "THK"
};

// ============================================
// PLATFORM DETECTION
// ============================================
const PLATFORM_DETECTION = {
  "Allen-Bradley": {
    "1756-": "ControlLogix", "1769-": "CompactLogix", "1768-": "CompactLogix",
    "1746-": "SLC 500", "1747-": "SLC 500", "1761-": "MicroLogix1000",
    "1762-": "MicroLogix1200", "1763-": "MicroLogix1100", "1764-": "MicroLogix1500",
    "1766-": "MicroLogix1400", "1734-": "POINT I/O", "1794-": "FLEX I/O",
    "2080-": "Micro800", "20-": "PowerFlex", "22-": "PowerFlex"
  },
  "Siemens": {
    "6ES7 21": "S7-200", "6ES7 22": "S7-200", "6ES7 31": "S7-300",
    "6ES7 32": "S7-300", "6ES7 41": "S7-400", "6ES7 51": "S7-1500",
    "6ED1": "LOGO!", "6AV": "HMI Panel"
  },
  "GE Fanuc": {
    "IC693": "90-30", "IC697": "90-70", "IC200": "VersaMax", "IC695": "RX3i"
  }
};

// ============================================
// PRODUCT TYPE DETECTION & FIELD MAPPING
// ============================================
const PRODUCT_TYPES = {
  // Pneumatic Cylinders
  cylinder: {
    keywords: ['cylinder', 'pneumatic cylinder', 'air cylinder', 'cdq', 'cq2', 'dsnu', 'dnc', 'adn'],
    fields: ['Brand', 'MPN', 'Bore', 'Stroke', 'Port Size', 'Action Type', 'Body Material', 'Rod Type'],
    extractPrompt: 'bore size (mm), stroke length (mm), port size, mounting style, rod type (single/double)'
  },
  // Pneumatic Valves
  valve: {
    keywords: ['valve', 'solenoid valve', 'pneumatic valve', 'mfh', 'vq', 'sy', 'cpe'],
    fields: ['Brand', 'MPN', 'Port Size', 'Voltage', 'Number of Ways', 'Number of Positions', 'Actuation Type'],
    extractPrompt: 'port size, coil voltage (Vdc/Vac), ways/positions (like 5/2 or 3/2), actuation type'
  },
  // PLCs / Controllers
  plc: {
    keywords: ['plc', 'processor', 'cpu', 'controller', '1756', '1769', '6es7', 'cj1', 'cj2'],
    fields: ['Brand', 'MPN', 'Controller Platform', 'Memory Size', 'I/O Count', 'Communication'],
    extractPrompt: 'controller platform/series, memory size, I/O count, communication protocols'
  },
  // I/O Modules
  io_module: {
    keywords: ['input module', 'output module', 'i/o module', 'analog input', 'digital input', 'analog output'],
    fields: ['Brand', 'MPN', 'Controller Platform', 'Number of Points', 'Voltage', 'Type'],
    extractPrompt: 'number of I/O points, input/output voltage, digital or analog, controller platform'
  },
  // Servo Motors
  servo_motor: {
    keywords: ['servo motor', 'ac servo', 'servomotor', 'mpl-', 'sgm', 'hf-'],
    fields: ['Brand', 'MPN', 'Voltage', 'Power (kW)', 'Torque (Nm)', 'RPM', 'Frame Size', 'Encoder Type'],
    extractPrompt: 'voltage, power in kW or HP, torque in Nm, max RPM, frame size, encoder type'
  },
  // Servo Drives
  servo_drive: {
    keywords: ['servo drive', 'servo amplifier', 'sgdv', 'sgdm', 'mr-j', 'kinetix'],
    fields: ['Brand', 'MPN', 'Voltage', 'Current Rating', 'Power (kW)', 'Communication'],
    extractPrompt: 'input voltage, output current, power rating, communication protocol'
  },
  // VFDs / AC Drives
  vfd: {
    keywords: ['vfd', 'variable frequency', 'ac drive', 'inverter', 'frequency drive', 'cimr', 'powerflex', 'atv'],
    fields: ['Brand', 'MPN', 'HP', 'Input Voltage', 'Output Voltage', 'Phase', 'Current Rating'],
    extractPrompt: 'horsepower or kW, input voltage, output voltage, phase (single/three), current rating'
  },
  // Power Supplies
  power_supply: {
    keywords: ['power supply', 'psu', '6ep', 'sdn', 'quint'],
    fields: ['Brand', 'MPN', 'Input Voltage', 'Output Voltage', 'Output Current', 'Power (W)'],
    extractPrompt: 'input voltage range, output voltage (usually 24Vdc), output current in amps, power in watts'
  },
  // Circuit Breakers
  circuit_breaker: {
    keywords: ['circuit breaker', 'breaker', '5sx', '3rv', 'eg3'],
    fields: ['Brand', 'MPN', 'Current Rating', 'Voltage Rating', 'Number of Poles', 'Trip Type'],
    extractPrompt: 'amperage rating, voltage rating, number of poles (1P/2P/3P), trip curve type'
  },
  // Contactors
  contactor: {
    keywords: ['contactor', 'lc1', '3rt', 'sc-'],
    fields: ['Brand', 'MPN', 'Coil Voltage', 'Current Rating', 'Number of Poles', 'Auxiliary Contacts'],
    extractPrompt: 'coil voltage, current rating in amps, number of poles, auxiliary contact configuration'
  },
  // Sensors
  sensor: {
    keywords: ['sensor', 'proximity', 'photoelectric', 'inductive', 'e2e', 'e3z', 'bi', 'ni'],
    fields: ['Brand', 'MPN', 'Sensing Range', 'Output Type', 'Voltage', 'Connection Type'],
    extractPrompt: 'sensing range/distance, output type (NPN/PNP/analog), operating voltage, connector type'
  },
  // Light Towers / Stack Lights
  light_tower: {
    keywords: ['light tower', 'stack light', 'signal tower', '855', '697'],
    fields: ['Brand', 'MPN', 'Voltage', 'Colors', 'Number of Tiers', 'Mount Type'],
    extractPrompt: 'operating voltage, light colors, number of light tiers, mounting style'
  },
  // Linear Actuators / Motion
  linear_actuator: {
    keywords: ['linear actuator', 'ball screw', 'linear guide', 'kr', 'lm guide'],
    fields: ['Brand', 'MPN', 'Stroke', 'Load Capacity', 'Speed', 'Drive Type'],
    extractPrompt: 'stroke length, load capacity, max speed, drive mechanism type'
  },
  // Transformers
  transformer: {
    keywords: ['transformer', 'kva'],
    fields: ['Brand', 'MPN', 'KVA', 'Primary Voltage', 'Secondary Voltage', 'Phase'],
    extractPrompt: 'KVA rating, primary voltage, secondary voltage, phase (single/three)'
  },
  // Default / Generic
  generic: {
    keywords: [],
    fields: ['Brand', 'MPN', 'Model', 'Voltage', 'Type'],
    extractPrompt: 'brand, model/part number, voltage if applicable, product type'
  }
};

// ============================================
// STYLES
// ============================================
const styles = {
  container: {
    fontFamily: 'system-ui, -apple-system, sans-serif',
    maxWidth: '1400px',
    margin: '0 auto',
    padding: '20px'
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '20px',
    paddingBottom: '15px',
    borderBottom: '2px solid #e5e7eb'
  },
  title: {
    fontSize: '24px',
    fontWeight: '600',
    color: '#1f2937'
  },
  tabs: {
    display: 'flex',
    gap: '5px',
    marginBottom: '20px',
    borderBottom: '2px solid #e5e7eb',
    paddingBottom: '0'
  },
  tab: {
    padding: '12px 20px',
    border: 'none',
    backgroundColor: 'transparent',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '500',
    color: '#6b7280',
    borderBottom: '2px solid transparent',
    marginBottom: '-2px'
  },
  tabActive: {
    padding: '12px 20px',
    border: 'none',
    backgroundColor: 'transparent',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '600',
    color: '#2563eb',
    borderBottom: '2px solid #2563eb',
    marginBottom: '-2px'
  },
  inputSection: {
    backgroundColor: '#f9fafb',
    borderRadius: '8px',
    padding: '20px',
    marginBottom: '20px'
  },
  inputRow: {
    display: 'grid',
    gridTemplateColumns: '200px 1fr',
    gap: '15px',
    marginBottom: '15px',
    alignItems: 'start'
  },
  input: {
    padding: '10px 12px',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    fontSize: '14px',
    width: '100%'
  },
  buttonRow: {
    display: 'flex',
    gap: '10px',
    marginTop: '15px'
  },
  button: {
    padding: '10px 20px',
    backgroundColor: '#2563eb',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontWeight: '500',
    fontSize: '14px',
    display: 'flex',
    alignItems: 'center',
    gap: '8px'
  },
  buttonGreen: {
    padding: '10px 20px',
    backgroundColor: '#16a34a',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontWeight: '500',
    fontSize: '14px'
  },
  buttonOrange: {
    padding: '10px 20px',
    backgroundColor: '#ea580c',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontWeight: '500',
    fontSize: '14px'
  },
  buttonSecondary: {
    padding: '10px 20px',
    backgroundColor: '#6b7280',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontWeight: '500',
    fontSize: '14px'
  },
  card: {
    backgroundColor: 'white',
    borderRadius: '8px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
    marginBottom: '20px',
    overflow: 'hidden'
  },
  cardHeader: {
    padding: '15px 20px',
    backgroundColor: '#f9fafb',
    borderBottom: '1px solid #e5e7eb',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  cardBody: {
    padding: '20px'
  },
  grid2: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '20px'
  },
  grid3: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '15px'
  },
  fieldGroup: {
    marginBottom: '15px'
  },
  label: {
    display: 'block',
    fontSize: '12px',
    fontWeight: '500',
    color: '#6b7280',
    marginBottom: '5px',
    textTransform: 'uppercase'
  },
  value: {
    fontSize: '14px',
    color: '#1f2937'
  },
  badge: {
    padding: '4px 10px',
    borderRadius: '12px',
    fontSize: '12px',
    fontWeight: '500'
  },
  badgeBlue: {
    backgroundColor: '#dbeafe',
    color: '#2563eb'
  },
  badgeGreen: {
    backgroundColor: '#dcfce7',
    color: '#16a34a'
  },
  badgeOrange: {
    backgroundColor: '#ffedd5',
    color: '#ea580c'
  },
  badgeRed: {
    backgroundColor: '#fee2e2',
    color: '#dc2626'
  },
  scoreCircle: {
    width: '60px',
    height: '60px',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '20px',
    fontWeight: '700',
    color: 'white'
  },
  specRow: {
    display: 'grid',
    gridTemplateColumns: '150px 1fr 100px',
    padding: '10px 0',
    borderBottom: '1px solid #f3f4f6',
    alignItems: 'center'
  },
  specInput: {
    padding: '8px 12px',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    fontSize: '14px'
  },
  aiSuggestion: {
    backgroundColor: '#fef3c7',
    padding: '2px 8px',
    borderRadius: '4px',
    fontSize: '12px',
    color: '#92400e'
  },
  progressBar: {
    width: '100%',
    height: '8px',
    backgroundColor: '#e5e7eb',
    borderRadius: '4px',
    overflow: 'hidden',
    marginTop: '10px'
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#2563eb',
    transition: 'width 0.3s ease'
  }
};

// ============================================
// HELPER FUNCTIONS
// ============================================
function detectBrand(partNumber) {
  if (!partNumber) return null;
  const pn = partNumber.toUpperCase().replace(/[\s-]/g, '');
  
  for (const [prefix, brand] of Object.entries(BRAND_DETECTION)) {
    if (pn.startsWith(prefix.replace('-', ''))) {
      return brand;
    }
  }
  return null;
}

function detectPlatform(brand, partNumber) {
  if (!brand || !partNumber) return null;
  const patterns = PLATFORM_DETECTION[brand];
  if (!patterns) return null;
  
  const pn = partNumber.toUpperCase();
  for (const [prefix, platform] of Object.entries(patterns)) {
    if (pn.includes(prefix.replace(/[\s-]/g, ''))) {
      return platform;
    }
  }
  return null;
}

function detectProductType(title, mpn) {
  const text = `${title} ${mpn}`.toLowerCase();
  
  for (const [type, config] of Object.entries(PRODUCT_TYPES)) {
    if (type === 'generic') continue;
    for (const keyword of config.keywords) {
      if (text.includes(keyword.toLowerCase())) {
        return { type, ...config };
      }
    }
  }
  return { type: 'generic', ...PRODUCT_TYPES.generic };
}

function calculateScore(item, productType) {
  const fields = productType.fields;
  let filled = 0;
  
  for (const field of fields) {
    const key = field.toLowerCase().replace(/[\s()\/]/g, '');
    if (item[key] || item[field] || item.extracted?.[field]) {
      filled++;
    }
  }
  
  return Math.round((filled / fields.length) * 100);
}

function getScoreColor(score) {
  if (score >= 80) return '#16a34a';
  if (score >= 60) return '#d97706';
  return '#dc2626';
}

// ============================================
// MAIN COMPONENT
// ============================================
export default function UnifiedListingManager({ categoryAspects = null }) {
  const [activeTab, setActiveTab] = useState('single');
  const [sku, setSku] = useState('');
  const [item, setItem] = useState(null);
  const [productType, setProductType] = useState(null);
  const [extracted, setExtracted] = useState({});
  const [edited, setEdited] = useState({});
  const [loading, setLoading] = useState(false);
  const [extracting, setExtracting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);
  
  // Bulk mode state
  const [bulkSkus, setBulkSkus] = useState('');
  const [bulkItems, setBulkItems] = useState([]);
  const [bulkProgress, setBulkProgress] = useState({ current: 0, total: 0, phase: '' });

  // Load single item
  const loadItem = async () => {
    if (!sku) return;
    
    setLoading(true);
    setMessage(null);
    setItem(null);
    setExtracted({});
    setEdited({});
    
    try {
      const response = await fetch(`/api/suredone/get-item?sku=${encodeURIComponent(sku)}`);
      const data = await response.json();
      
      if (data.success && data.item) {
        const loadedItem = data.item;
        setItem(loadedItem);
        
        // Auto-detect product type
        const detected = detectProductType(loadedItem.title, loadedItem.mpn || loadedItem.model);
        setProductType(detected);
        
        // Auto-detect brand if missing
        if (!loadedItem.brand) {
          const detectedBrand = detectBrand(loadedItem.mpn || loadedItem.model || loadedItem.title);
          if (detectedBrand) {
            setEdited(prev => ({ ...prev, brand: detectedBrand }));
          }
        }
        
        // Auto-detect platform
        const brand = loadedItem.brand || detectBrand(loadedItem.mpn || loadedItem.model);
        const platform = detectPlatform(brand, loadedItem.mpn || loadedItem.model);
        if (platform && !loadedItem.controllerplatform) {
          setEdited(prev => ({ ...prev, controllerplatform: platform }));
        }
        
        setMessage({ type: 'success', text: `Loaded ${loadedItem.sku} - Detected as: ${detected.type}` });
      } else {
        setMessage({ type: 'error', text: 'SKU not found in SureDone' });
      }
    } catch (err) {
      setMessage({ type: 'error', text: `Error: ${err.message}` });
    }
    
    setLoading(false);
  };

  // Extract specs with AI
  const extractWithAI = async () => {
    if (!item) return;
    
    setExtracting(true);
    setMessage({ type: 'info', text: 'Extracting specifications with AI...' });
    
    try {
      const response = await fetch('/api/ai/extract-specs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: item.title,
          description: item.longdescription,
          brand: item.brand || edited.brand,
          categoryId: item.ebaycatid,
          productType: productType?.type,
          fieldsToExtract: productType?.fields,
          extractPrompt: productType?.extractPrompt
        })
      });
      
      const data = await response.json();
      
      if (data.success && data.extracted) {
        setExtracted(data.extracted);
        setMessage({ type: 'success', text: `AI extracted ${Object.keys(data.extracted).length} fields` });
      } else {
        setMessage({ type: 'error', text: data.error || 'AI extraction failed' });
      }
    } catch (err) {
      setMessage({ type: 'error', text: `AI Error: ${err.message}` });
    }
    
    setExtracting(false);
  };

  // Accept AI suggestion
  const acceptSuggestion = (field, value) => {
    const suredoneField = mapToSuredoneField(field);
    setEdited(prev => ({ ...prev, [suredoneField]: value }));
  };

  // Accept all AI suggestions
  const acceptAllSuggestions = () => {
    const newEdited = { ...edited };
    for (const [field, value] of Object.entries(extracted)) {
      if (value && value !== 'null' && field !== 'confidence') {
        const suredoneField = mapToSuredoneField(field);
        newEdited[suredoneField] = value;
      }
    }
    setEdited(newEdited);
    setMessage({ type: 'success', text: 'All AI suggestions accepted' });
  };

  // Map display field to SureDone field name
  const mapToSuredoneField = (field) => {
    const map = {
      'Brand': 'brand',
      'MPN': 'mpn',
      'Model': 'model',
      'Voltage': 'voltage',
      'Current': 'current',
      'Current Rating': 'current',
      'Type': 'usertype',
      'Controller Platform': 'controllerplatform',
      'Bore': 'bore',
      'Stroke': 'stroke',
      'Port Size': 'portsize',
      'HP': 'horsepower',
      'Power (kW)': 'kw',
      'Power (W)': 'watts',
      'RPM': 'rpm',
      'Torque (Nm)': 'nm',
      'Input Voltage': 'inputvoltage',
      'Output Voltage': 'outputvoltage',
      'Output Current': 'outputamperage',
      'Coil Voltage': 'coilvoltage',
      'Number of Poles': 'numberofpoles',
      'KVA': 'kva',
      'Phase': 'phase',
      'Primary Voltage': 'primaryvoltage',
      'Secondary Voltage': 'secondaryvoltage'
    };
    return map[field] || field.toLowerCase().replace(/[\s()\/]/g, '');
  };

  // Save to SureDone
  const saveToSureDone = async () => {
    if (!item || Object.keys(edited).length === 0) {
      setMessage({ type: 'error', text: 'No changes to save' });
      return;
    }
    
    setSaving(true);
    setMessage({ type: 'info', text: 'Saving to SureDone...' });
    
    try {
      const updateData = {
        guid: item.sku || item.guid,
        ...edited
      };
      
      const response = await fetch('/api/suredone/update-item', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData)
      });
      
      const data = await response.json();
      
      if (data.success) {
        setMessage({ type: 'success', text: `✓ Saved ${item.sku} to SureDone!` });
        // Merge edited values into item
        setItem(prev => ({ ...prev, ...edited }));
        setEdited({});
      } else {
        setMessage({ type: 'error', text: data.error || 'Save failed' });
      }
    } catch (err) {
      setMessage({ type: 'error', text: `Save Error: ${err.message}` });
    }
    
    setSaving(false);
  };

  // Calculate current score
  const score = item && productType ? calculateScore({ ...item, ...edited, extracted }, productType) : 0;

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <h1 style={styles.title}>🛠️ Unified Listing Manager</h1>
        <div style={{ display: 'flex', gap: '10px' }}>
          <span style={{ ...styles.badge, ...styles.badgeBlue }}>v2.0</span>
        </div>
      </div>

      {/* Tabs */}
      <div style={styles.tabs}>
        <button
          style={activeTab === 'single' ? styles.tabActive : styles.tab}
          onClick={() => setActiveTab('single')}
        >
          📝 Single Item
        </button>
        <button
          style={activeTab === 'bulk' ? styles.tabActive : styles.tab}
          onClick={() => setActiveTab('bulk')}
        >
          📊 Bulk Process
        </button>
      </div>

      {/* Single Item Mode */}
      {activeTab === 'single' && (
        <>
          {/* SKU Input */}
          <div style={styles.inputSection}>
            <div style={styles.inputRow}>
              <label style={{ ...styles.label, marginBottom: 0, alignSelf: 'center' }}>SKU:</label>
              <div style={{ display: 'flex', gap: '10px' }}>
                <input
                  type="text"
                  style={{ ...styles.input, maxWidth: '200px' }}
                  value={sku}
                  onChange={(e) => setSku(e.target.value.toUpperCase())}
                  placeholder="e.g., IP6388"
                  onKeyPress={(e) => e.key === 'Enter' && loadItem()}
                />
                <button style={styles.button} onClick={loadItem} disabled={loading || !sku}>
                  {loading ? '⏳' : '🔍'} Load Item
                </button>
              </div>
            </div>
            
            {message && (
              <div style={{
                padding: '10px 15px',
                borderRadius: '6px',
                marginTop: '10px',
                backgroundColor: message.type === 'success' ? '#dcfce7' : 
                               message.type === 'error' ? '#fee2e2' : '#dbeafe',
                color: message.type === 'success' ? '#16a34a' : 
                       message.type === 'error' ? '#dc2626' : '#2563eb'
              }}>
                {message.text}
              </div>
            )}
          </div>

          {/* Item Details */}
          {item && (
            <>
              {/* Item Info Card */}
              <div style={styles.card}>
                <div style={styles.cardHeader}>
                  <div>
                    <strong style={{ fontSize: '18px' }}>{item.sku}</strong>
                    <span style={{ marginLeft: '15px', color: '#6b7280' }}>{item.title}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                    <span style={{ ...styles.badge, ...styles.badgeOrange }}>
                      {productType?.type || 'Unknown'}
                    </span>
                    <div style={{ ...styles.scoreCircle, backgroundColor: getScoreColor(score) }}>
                      {score}
                    </div>
                  </div>
                </div>
                
                <div style={styles.cardBody}>
                  <div style={styles.grid2}>
                    {/* Current Data */}
                    <div>
                      <h4 style={{ marginTop: 0, marginBottom: '15px', color: '#374151' }}>
                        📦 Current Data
                      </h4>
                      <div style={styles.grid3}>
                        <div style={styles.fieldGroup}>
                          <label style={styles.label}>Brand</label>
                          <div style={styles.value}>{item.brand || <em style={{ color: '#9ca3af' }}>empty</em>}</div>
                        </div>
                        <div style={styles.fieldGroup}>
                          <label style={styles.label}>MPN</label>
                          <div style={styles.value}>{item.mpn || item.model || <em style={{ color: '#9ca3af' }}>empty</em>}</div>
                        </div>
                        <div style={styles.fieldGroup}>
                          <label style={styles.label}>Category</label>
                          <div style={styles.value}>{item.ebaycatid || <em style={{ color: '#9ca3af' }}>empty</em>}</div>
                        </div>
                        <div style={styles.fieldGroup}>
                          <label style={styles.label}>Price</label>
                          <div style={styles.value}>${item.price}</div>
                        </div>
                        <div style={styles.fieldGroup}>
                          <label style={styles.label}>Stock</label>
                          <div style={styles.value}>{item.stock}</div>
                        </div>
                        <div style={styles.fieldGroup}>
                          <label style={styles.label}>Condition</label>
                          <div style={styles.value}>{item.condition || 'N/A'}</div>
                        </div>
                      </div>
                    </div>
                    
                    {/* AI Actions */}
                    <div>
                      <h4 style={{ marginTop: 0, marginBottom: '15px', color: '#374151' }}>
                        🤖 AI Extraction
                      </h4>
                      <p style={{ color: '#6b7280', fontSize: '14px', marginBottom: '15px' }}>
                        Product type: <strong>{productType?.type}</strong><br />
                        Fields to extract: {productType?.fields.slice(0, 4).join(', ')}...
                      </p>
                      <button
                        style={styles.buttonOrange}
                        onClick={extractWithAI}
                        disabled={extracting}
                      >
                        {extracting ? '🧠 Extracting...' : '🤖 Extract Specs with AI'}
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Specs Editor Card */}
              <div style={styles.card}>
                <div style={styles.cardHeader}>
                  <h3 style={{ margin: 0 }}>📋 Specifications Editor</h3>
                  {Object.keys(extracted).length > 0 && (
                    <button
                      style={{ ...styles.buttonGreen, padding: '6px 12px', fontSize: '13px' }}
                      onClick={acceptAllSuggestions}
                    >
                      ✓ Accept All AI Suggestions
                    </button>
                  )}
                </div>
                
                <div style={styles.cardBody}>
                  {productType?.fields.map(field => {
                    const suredoneKey = mapToSuredoneField(field);
                    const currentValue = edited[suredoneKey] || item[suredoneKey] || '';
                    const aiValue = extracted[field];
                    
                    return (
                      <div key={field} style={styles.specRow}>
                        <label style={{ fontWeight: '500', color: '#374151' }}>{field}</label>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <input
                            type="text"
                            style={{ ...styles.specInput, flex: 1 }}
                            value={currentValue}
                            onChange={(e) => setEdited(prev => ({ ...prev, [suredoneKey]: e.target.value }))}
                            placeholder={`Enter ${field}`}
                          />
                          {aiValue && aiValue !== 'null' && aiValue !== currentValue && (
                            <button
                              style={{ ...styles.aiSuggestion, cursor: 'pointer', border: 'none' }}
                              onClick={() => acceptSuggestion(field, aiValue)}
                              title="Click to accept"
                            >
                              AI: {aiValue}
                            </button>
                          )}
                        </div>
                        <div>
                          {currentValue ? (
                            <span style={{ ...styles.badge, ...styles.badgeGreen }}>✓</span>
                          ) : (
                            <span style={{ ...styles.badge, ...styles.badgeRed }}>Missing</span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Action Buttons */}
              <div style={styles.buttonRow}>
                <button
                  style={styles.buttonGreen}
                  onClick={saveToSureDone}
                  disabled={saving || Object.keys(edited).length === 0}
                >
                  {saving ? '💾 Saving...' : `💾 Save to SureDone (${Object.keys(edited).length} changes)`}
                </button>
                <button
                  style={styles.buttonSecondary}
                  onClick={() => {
                    setItem(null);
                    setExtracted({});
                    setEdited({});
                    setSku('');
                    setMessage(null);
                  }}
                >
                  Clear
                </button>
              </div>
            </>
          )}
        </>
      )}

      {/* Bulk Mode - Placeholder for now */}
      {activeTab === 'bulk' && (
        <div style={styles.inputSection}>
          <p style={{ textAlign: 'center', color: '#6b7280', padding: '40px' }}>
            🚧 Bulk processing mode coming soon!<br />
            For now, use the Single Item tab to process items one at a time.
          </p>
        </div>
      )}
    </div>
  );
}
