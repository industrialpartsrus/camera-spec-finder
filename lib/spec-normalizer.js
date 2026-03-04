// ============================================================
// lib/spec-normalizer.js
// Normalizes freeform spec values to standardized formats
// for consistent eBay/BigCommerce filtering and search.
//
// Pattern: Each field that needs normalization has a function
// that takes raw input and returns:
//   { standardized: string, raw: string, confidence: 'high'|'low' }
//
// The UI checks: if the field being edited has a normalizer,
// show a suggestion banner when confidence is 'high'.
// ============================================================

// ============================================================
// VOLTAGE NORMALIZER (reused for voltage, inputvoltage, outputvoltage, coilvoltage)
// ============================================================

const VOLTAGE_MAP = {
  // DC
  '5DC': '5VDC', '12DC': '12VDC', '24DC': '24VDC', '48DC': '48VDC',
  '90DC': '90VDC', '125DC': '125VDC',
  // AC — exact
  '12AC': '12VAC', '24AC': '24VAC', '48AC': '48VAC',
  '110AC': '110VAC', '120AC': '120VAC', '208AC': '208VAC',
  '220AC': '220VAC', '230AC': '230VAC', '240AC': '240VAC',
  '277AC': '277VAC', '380AC': '380VAC', '400AC': '400VAC',
  '440AC': '440VAC', '460AC': '460VAC', '480AC': '480VAC',
  '575AC': '575VAC', '600AC': '600VAC',
  // Common aliases
  '100AC': '120VAC', '115AC': '120VAC',
  '200AC': '208VAC',
};

function normalizeVoltage(raw) {
  if (!raw || typeof raw !== 'string' || !raw.trim()) {
    return { standardized: '', raw: raw || '', confidence: 'low' };
  }
  const original = raw.trim();
  const cleaned = original.toUpperCase().replace(/\s+/g, '');

  // Handle dual voltage like "230/460V" or "208-230/460V"
  const dualMatch = cleaned.match(/(\d+)[\/\-](\d+)\s*V?(AC|DC)?/i);
  if (dualMatch) {
    const v1 = dualMatch[1];
    const v2 = dualMatch[2];
    const type = dualMatch[3] || (parseInt(v2) >= 100 ? 'AC' : 'DC');
    return { standardized: `${v1}/${v2}V${type}`, raw: original, confidence: 'high' };
  }

  // Triple voltage like "208-230/460"
  const tripleMatch = cleaned.match(/(\d+)[\/\-](\d+)[\/\-](\d+)\s*V?(AC|DC)?/i);
  if (tripleMatch) {
    const type = tripleMatch[4] || 'AC';
    return { standardized: `${tripleMatch[1]}-${tripleMatch[2]}/${tripleMatch[3]}V${type}`, raw: original, confidence: 'high' };
  }

  // Detect AC or DC
  let type = null;
  if (/VDC|DC|D\.C\./.test(cleaned)) type = 'DC';
  else if (/VAC|AC|A\.C\./.test(cleaned)) type = 'AC';

  const numbers = cleaned.match(/\d+/g);
  if (!numbers || numbers.length === 0) {
    return { standardized: '', raw: original, confidence: 'low' };
  }

  const voltage = Math.max(...numbers.map(Number));
  if (!type) type = voltage >= 100 ? 'AC' : 'DC';

  const key = `${voltage}${type}`;
  const match = VOLTAGE_MAP[key];
  if (match) {
    return { standardized: match, raw: original, confidence: 'high' };
  }

  // Not in map but we parsed a voltage — format it anyway
  return { standardized: `${voltage}V${type}`, raw: original, confidence: 'high' };
}


// ============================================================
// HORSEPOWER NORMALIZER
// ============================================================

// Decimal → fraction lookup for common motor HPs
const HP_FRACTIONS = {
  0.167: '1/6', 0.17: '1/6',
  0.25: '1/4',
  0.33: '1/3', 0.34: '1/3',
  0.5: '1/2',
  0.75: '3/4',
};

// Standard HP values (for validation)
const STANDARD_HP = [
  '1/6 HP', '1/4 HP', '1/3 HP', '1/2 HP', '3/4 HP',
  '1 HP', '1.5 HP', '2 HP', '3 HP', '5 HP', '7.5 HP',
  '10 HP', '15 HP', '20 HP', '25 HP', '30 HP', '40 HP',
  '50 HP', '60 HP', '75 HP', '100 HP', '125 HP', '150 HP',
  '200 HP', '250 HP', '300 HP', '350 HP', '400 HP', '500 HP'
];

function normalizeHorsepower(raw) {
  if (!raw || typeof raw !== 'string' || !raw.trim()) {
    return { standardized: '', raw: raw || '', confidence: 'low' };
  }
  const original = raw.trim();
  const cleaned = original.toUpperCase().replace(/\s+/g, '');

  // Handle fractions: "1/2", "1/2HP", "1/2 HP"
  const fracMatch = cleaned.match(/^(\d+)\/(\d+)\s*H?P?$/);
  if (fracMatch) {
    const frac = `${fracMatch[1]}/${fracMatch[2]}`;
    return { standardized: `${frac} HP`, raw: original, confidence: 'high' };
  }

  // Handle decimal: "0.5", "0.5HP", ".5HP", "0.5 HP"
  const decMatch = cleaned.match(/^(\d*\.?\d+)\s*H?P?$/);
  if (decMatch) {
    // parseFloat handles ".5" → 0.5 correctly
    const num = parseFloat(cleaned.replace(/H?P?$/i, ''));
    // Check if it maps to a fraction
    const fracStr = HP_FRACTIONS[num];
    if (fracStr) {
      return { standardized: `${fracStr} HP`, raw: original, confidence: 'high' };
    }
    // Whole or standard decimal
    const formatted = num % 1 === 0 ? `${Math.round(num)} HP` : `${num} HP`;
    return { standardized: formatted, raw: original, confidence: 'high' };
  }

  // Handle "1 Horsepower", "1Horsepower"
  const hpWordMatch = cleaned.match(/^(\d*\.?\d+)\s*HORSEPOWER$/);
  if (hpWordMatch) {
    const num = parseFloat(hpWordMatch[1]);
    const fracStr = HP_FRACTIONS[num];
    if (fracStr) {
      return { standardized: `${fracStr} HP`, raw: original, confidence: 'high' };
    }
    const formatted = num % 1 === 0 ? `${Math.round(num)} HP` : `${num} HP`;
    return { standardized: formatted, raw: original, confidence: 'high' };
  }

  return { standardized: '', raw: original, confidence: 'low' };
}


// ============================================================
// PHASE NORMALIZER
// ============================================================

function normalizePhase(raw) {
  if (!raw || typeof raw !== 'string' || !raw.trim()) {
    return { standardized: '', raw: raw || '', confidence: 'low' };
  }
  const cleaned = raw.trim().toLowerCase().replace(/[\s\-_]+/g, '');

  const singlePatterns = ['1', '1phase', '1ph', 'single', 'singlephase', '1p', 'mono'];
  const threePatterns = ['3', '3phase', '3ph', 'three', 'threephase', '3p', 'tri'];
  const dcPatterns = ['dc', 'directcurrent'];

  if (singlePatterns.includes(cleaned)) {
    return { standardized: 'Single Phase', raw: raw.trim(), confidence: 'high' };
  }
  if (threePatterns.includes(cleaned)) {
    return { standardized: 'Three Phase', raw: raw.trim(), confidence: 'high' };
  }
  if (dcPatterns.includes(cleaned)) {
    return { standardized: 'DC', raw: raw.trim(), confidence: 'high' };
  }

  return { standardized: '', raw: raw.trim(), confidence: 'low' };
}


// ============================================================
// RPM NORMALIZER
// ============================================================

function normalizeRPM(raw) {
  if (!raw || typeof raw !== 'string' || !raw.trim()) {
    return { standardized: '', raw: raw || '', confidence: 'low' };
  }
  const original = raw.trim();
  // Extract just the number, strip "RPM", "rpm", commas
  const cleaned = original.toUpperCase().replace(/,/g, '').replace(/RPM/g, '').trim();
  const num = parseInt(cleaned);
  if (!isNaN(num) && num > 0 && num < 100000) {
    return { standardized: String(num), raw: original, confidence: 'high' };
  }
  return { standardized: '', raw: original, confidence: 'low' };
}


// ============================================================
// FRAME SIZE NORMALIZER
// ============================================================

function normalizeFrameSize(raw) {
  if (!raw || typeof raw !== 'string' || !raw.trim()) {
    return { standardized: '', raw: raw || '', confidence: 'low' };
  }
  const original = raw.trim();
  // Strip "NEMA" or "IEC" prefix
  let cleaned = original.toUpperCase().replace(/^(NEMA|IEC)\s*/i, '').trim();
  // Frame sizes: numeric + optional letter suffix (56C, 213T, 184TC, 256T, 364TS)
  const frameMatch = cleaned.match(/^(\d+)([A-Z]{0,3})$/);
  if (frameMatch) {
    return { standardized: `${frameMatch[1]}${frameMatch[2]}`, raw: original, confidence: 'high' };
  }
  return { standardized: '', raw: original, confidence: 'low' };
}


// ============================================================
// CONTROLLER PLATFORM NORMALIZER
// ============================================================

const PLATFORM_MAP = {
  // Allen-Bradley / Rockwell
  'controllogix': 'ControlLogix',
  'compactlogix': 'CompactLogix',
  'micrologix': 'MicroLogix',
  'flexlogix': 'FlexLogix',
  'guardlogix': 'GuardLogix',
  'micro800': 'Micro800',
  'micro810': 'Micro810',
  'micro820': 'Micro820',
  'micro830': 'Micro830',
  'micro850': 'Micro850',
  'plc5': 'PLC-5',
  'plc-5': 'PLC-5',
  'slc500': 'SLC 500',
  'slc-500': 'SLC 500',
  'slc': 'SLC 500',
  'logix5000': 'Logix 5000',
  'flex500': 'FLEX 500',
  'flexio': 'FLEX I/O',
  'pointio': 'Point I/O',
  // Siemens
  's7300': 'S7-300',
  's7-300': 'S7-300',
  's7400': 'S7-400',
  's7-400': 'S7-400',
  's71200': 'S7-1200',
  's7-1200': 'S7-1200',
  's71500': 'S7-1500',
  's7-1500': 'S7-1500',
  'et200': 'ET 200',
  'et200sp': 'ET 200SP',
  'logo': 'LOGO!',
  'simatics5': 'SIMATIC S5',
  // Schneider / Modicon
  'm340': 'Modicon M340',
  'modiconm340': 'Modicon M340',
  'm580': 'Modicon M580',
  'modiconm580': 'Modicon M580',
  'quantum': 'Modicon Quantum',
  'modiconquantum': 'Modicon Quantum',
  'premium': 'Modicon Premium',
  'modiconpremium': 'Modicon Premium',
  'micro': 'Modicon Micro',
  'momentum': 'Momentum',
  'twido': 'Twido',
  'm221': 'Modicon M221',
  'm241': 'Modicon M241',
  'm251': 'Modicon M251',
  'm262': 'Modicon M262',
  // Mitsubishi
  'melsecq': 'MELSEC-Q',
  'melsec-q': 'MELSEC-Q',
  'qseries': 'MELSEC-Q',
  'melsecf': 'MELSEC-F',
  'melsec-f': 'MELSEC-F',
  'fseries': 'MELSEC-F',
  'melsecl': 'MELSEC-L',
  'melsec-l': 'MELSEC-L',
  'melseciq': 'MELSEC iQ-R',
  'iqr': 'MELSEC iQ-R',
  'fx5u': 'MELSEC iQ-F',
  'fx3u': 'FX3U',
  'fx3g': 'FX3G',
  'fx5': 'MELSEC iQ-F',
  // Omron
  'cj2': 'CJ2',
  'cj1': 'CJ1',
  'cp1': 'CP1',
  'cs1': 'CS1',
  'nx1': 'NX1',
  'nj': 'NJ Series',
  'nx': 'NX Series',
  // GE
  'gefanuc': 'GE Fanuc',
  'ge90-30': '90-30',
  '9030': '90-30',
  'ge90-70': '90-70',
  '9070': '90-70',
  'versapoint': 'VersaPoint',
  'rx3i': 'RX3i',
  'versamax': 'VersaMax',
  // ABB
  'ac500': 'AC500',
  'ac500eco': 'AC500-eCo',
  // Honeywell
  'c300': 'C300',
  'experion': 'Experion PKS',
  // Beckhoff
  'cx': 'CX Series',
  'twincat': 'TwinCAT',
};

function normalizeControllerPlatform(raw) {
  if (!raw || typeof raw !== 'string' || !raw.trim()) {
    return { standardized: '', raw: raw || '', confidence: 'low' };
  }
  const original = raw.trim();
  const key = original.toLowerCase().replace(/[\s\-_\/\.]+/g, '');

  if (PLATFORM_MAP[key]) {
    return { standardized: PLATFORM_MAP[key], raw: original, confidence: 'high' };
  }

  // Try with hyphens preserved (for S7-300 style)
  const keyWithHyphens = original.toLowerCase().replace(/[\s_\/\.]+/g, '');
  if (PLATFORM_MAP[keyWithHyphens]) {
    return { standardized: PLATFORM_MAP[keyWithHyphens], raw: original, confidence: 'high' };
  }

  // Partial match — check if the input starts with a known platform
  for (const [mapKey, mapVal] of Object.entries(PLATFORM_MAP)) {
    if (key.startsWith(mapKey) || mapKey.startsWith(key)) {
      return { standardized: mapVal, raw: original, confidence: 'high' };
    }
  }

  return { standardized: '', raw: original, confidence: 'low' };
}


// ============================================================
// SERIES NORMALIZER
// ============================================================

function normalizeSeries(raw) {
  if (!raw || typeof raw !== 'string' || !raw.trim()) {
    return { standardized: '', raw: raw || '', confidence: 'low' };
  }
  const original = raw.trim();
  // Match patterns like "Ser A", "Ser. A", "Series A", "SER C", "ser. b"
  const seriesMatch = original.match(/^(?:ser\.?\s*|series\s*)([A-Z0-9]+)$/i);
  if (seriesMatch) {
    return { standardized: `Series ${seriesMatch[1].toUpperCase()}`, raw: original, confidence: 'high' };
  }

  // Single letter that's likely a series designator
  if (/^[A-Z]$/i.test(original)) {
    // Don't auto-expand — could be ambiguous
    return { standardized: original.toUpperCase(), raw: original, confidence: 'high' };
  }

  // Already formatted like "Series A" or "Rev. 3"
  if (/^series\s/i.test(original)) {
    return { standardized: original.replace(/^series\s*/i, 'Series '), raw: original, confidence: 'high' };
  }

  return { standardized: '', raw: original, confidence: 'low' };
}


// ============================================================
// AMPERAGE NORMALIZER
// ============================================================

function normalizeAmperage(raw) {
  if (!raw || typeof raw !== 'string' || !raw.trim()) {
    return { standardized: '', raw: raw || '', confidence: 'low' };
  }
  const original = raw.trim();
  // Strip "A", "Amp", "Amps", "amp" suffix and standardize
  const cleaned = original.toUpperCase().replace(/\s+/g, '');
  const numMatch = cleaned.match(/^(\d+\.?\d*)\s*(A|AMP|AMPS)?$/);
  if (numMatch) {
    const num = parseFloat(numMatch[1]);
    const formatted = num % 1 === 0 ? `${Math.round(num)}A` : `${num}A`;
    return { standardized: formatted, raw: original, confidence: 'high' };
  }
  return { standardized: '', raw: original, confidence: 'low' };
}


// ============================================================
// ENCLOSURE TYPE NORMALIZER
// ============================================================

const ENCLOSURE_MAP = {
  'odp': 'ODP',
  'opendrip': 'ODP',
  'opendripproof': 'ODP',
  'tefc': 'TEFC',
  'totallyenclosed': 'TEFC',
  'totallyenclosedfancooled': 'TEFC',
  'tenv': 'TENV',
  'totallyenclosednonventilated': 'TENV',
  'teao': 'TEAO',
  'xp': 'Explosion Proof',
  'explosionproof': 'Explosion Proof',
  'washdown': 'Washdown',
  'ip54': 'IP54',
  'ip55': 'IP55',
  'ip65': 'IP65',
  'ip66': 'IP66',
  'ip67': 'IP67',
  'nema1': 'NEMA 1',
  'nema2': 'NEMA 2',
  'nema3': 'NEMA 3',
  'nema3r': 'NEMA 3R',
  'nema4': 'NEMA 4',
  'nema4x': 'NEMA 4X',
  'nema12': 'NEMA 12',
  'nema13': 'NEMA 13',
};

function normalizeEnclosure(raw) {
  if (!raw || typeof raw !== 'string' || !raw.trim()) {
    return { standardized: '', raw: raw || '', confidence: 'low' };
  }
  const original = raw.trim();
  const key = original.toLowerCase().replace(/[\s\-_\/\.]+/g, '');
  if (ENCLOSURE_MAP[key]) {
    return { standardized: ENCLOSURE_MAP[key], raw: original, confidence: 'high' };
  }
  return { standardized: '', raw: original, confidence: 'low' };
}


// ============================================================
// FREQUENCY NORMALIZER
// ============================================================

function normalizeFrequency(raw) {
  if (!raw || typeof raw !== 'string' || !raw.trim()) {
    return { standardized: '', raw: raw || '', confidence: 'low' };
  }
  const original = raw.trim();
  const cleaned = original.toUpperCase().replace(/\s+/g, '');

  // Handle dual frequency: "50/60Hz", "50/60", "50-60Hz"
  const dualMatch = cleaned.match(/(\d+)[\/\-](\d+)\s*(HZ|HERTZ)?/);
  if (dualMatch) {
    return { standardized: `${dualMatch[1]}/${dualMatch[2]} Hz`, raw: original, confidence: 'high' };
  }

  // Single frequency: "60Hz", "60 Hz", "60", "60 Hertz"
  const singleMatch = cleaned.match(/^(\d+)\s*(HZ|HERTZ)?$/);
  if (singleMatch) {
    return { standardized: `${singleMatch[1]} Hz`, raw: original, confidence: 'high' };
  }

  return { standardized: '', raw: original, confidence: 'low' };
}


// ============================================================
// MASTER REGISTRY: field name → normalizer function
// ============================================================

// Any spec field listed here will get normalization suggestions
// in the Pro Builder UI. Add new normalizers by just adding
// entries to this map.
export const FIELD_NORMALIZERS = {
  // Voltage fields — all use the same normalizer
  voltage: normalizeVoltage,
  inputvoltage: normalizeVoltage,
  outputvoltage: normalizeVoltage,
  coilvoltage: normalizeVoltage,
  operatingvoltage: normalizeVoltage,
  supplyvoltage: normalizeVoltage,
  primaryvoltageratingac: normalizeVoltage,
  secondaryvoltageratingac: normalizeVoltage,

  // Power / Motor fields
  horsepower: normalizeHorsepower,
  ratedloadhp: normalizeHorsepower,
  phase: normalizePhase,
  powerphase: normalizePhase,
  rpm: normalizeRPM,
  baserpm: normalizeRPM,
  framesize: normalizeFrameSize,
  amperage: normalizeAmperage,
  currentrating: normalizeAmperage,
  fullloadamps: normalizeAmperage,
  frequency: normalizeFrequency,
  hz: normalizeFrequency,
  powerfrequency: normalizeFrequency,

  // Enclosure
  enclosure: normalizeEnclosure,
  enclosuretype: normalizeEnclosure,

  // PLC / Automation
  controllerplatform: normalizeControllerPlatform,

  // General
  series: normalizeSeries,
};

/**
 * Check if a spec field has a normalizer.
 * @param {string} fieldName — SureDone field name (e.g. 'voltage', 'horsepower')
 * @returns {boolean}
 */
export function hasNormalizer(fieldName) {
  return !!FIELD_NORMALIZERS[fieldName?.toLowerCase()];
}

/**
 * Normalize a spec value if a normalizer exists for the field.
 * @param {string} fieldName — SureDone field name
 * @param {string} rawValue — User-entered value
 * @returns {{ standardized: string, raw: string, confidence: 'high'|'low' } | null}
 */
export function normalizeSpecValue(fieldName, rawValue) {
  const normalizer = FIELD_NORMALIZERS[fieldName?.toLowerCase()];
  if (!normalizer) return null;
  return normalizer(rawValue);
}

// Export individual normalizers for direct use (e.g., coil voltage section)
export {
  normalizeVoltage,
  normalizeHorsepower,
  normalizePhase,
  normalizeRPM,
  normalizeFrameSize,
  normalizeControllerPlatform,
  normalizeSeries,
  normalizeAmperage,
  normalizeEnclosure,
  normalizeFrequency,
  STANDARD_HP,
  PLATFORM_MAP,
  ENCLOSURE_MAP,
};
