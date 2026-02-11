// lib/coil-voltage-normalizer.js
// Normalizes user-entered coil voltage values to a standard set for consistent filtering/search

export const STANDARD_COIL_VOLTAGES = [
  '12VDC', '24VDC', '48VDC',
  '12VAC', '24VAC', '48VAC',
  '110VAC', '120VAC', '208VAC', '220VAC', '230VAC', '240VAC',
  '277VAC', '380VAC', '400VAC', '480VAC', '600VAC',
  'Other'
];

// Map of normalized key → standard value
// Key format: "<voltage><AC|DC>"
const VOLTAGE_MAP = {
  // DC voltages
  '12DC': '12VDC', '24DC': '24VDC', '48DC': '48VDC',
  // AC voltages — exact
  '12AC': '12VAC', '24AC': '24VAC', '48AC': '48VAC',
  '110AC': '110VAC', '120AC': '120VAC', '208AC': '208VAC',
  '220AC': '220VAC', '230AC': '230VAC', '240AC': '240VAC',
  '277AC': '277VAC', '380AC': '380VAC', '400AC': '400VAC',
  '480AC': '480VAC', '600AC': '600VAC',
  // Common aliases → standard (higher value in range)
  '100AC': '120VAC', '115AC': '120VAC',   // 100-120V range
  '200AC': '208VAC',                       // close to 208
  '440AC': '480VAC', '460AC': '480VAC',   // 440-480V range
  '575AC': '600VAC',                       // 575-600V range
};

/**
 * Normalize a raw coil voltage string to a standard value.
 *
 * @param {string} raw - User-entered voltage (e.g. "24V DC", "110/120Vac", "DC48V")
 * @returns {{ standardized: string, raw: string, confidence: 'high' | 'low' }}
 */
export function normalizeCoilVoltage(raw) {
  if (!raw || typeof raw !== 'string' || raw.trim() === '') {
    return { standardized: 'Other', raw: raw || '', confidence: 'low' };
  }

  const original = raw.trim();
  const cleaned = original.toUpperCase().replace(/\s+/g, '');

  // Detect AC or DC
  let type = null;
  if (/VDC|DC|D\.C\./i.test(cleaned)) {
    type = 'DC';
  } else if (/VAC|AC|A\.C\./i.test(cleaned)) {
    type = 'AC';
  }

  // Extract numeric values — handle ranges like 110/120 or 460-480
  const numbers = cleaned.match(/\d+/g);
  if (!numbers || numbers.length === 0) {
    return { standardized: 'Other', raw: original, confidence: 'low' };
  }

  // Use the highest number in the string (for ranges like 110/120 → 120)
  const voltage = Math.max(...numbers.map(Number));

  // If no AC/DC indicator detected, infer from voltage
  if (!type) {
    type = voltage >= 100 ? 'AC' : 'DC';
  }

  // Look up in the map
  const key = `${voltage}${type}`;
  const match = VOLTAGE_MAP[key];

  if (match) {
    return { standardized: match, raw: original, confidence: 'high' };
  }

  return { standardized: 'Other', raw: original, confidence: 'low' };
}
