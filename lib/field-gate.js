// lib/field-gate.js
// =============================================================================
// FIELD GATE: runs on every item specific right before PLB sends a listing to
// SureDone. Rules (IPRUS HQ / Scott, see CLAUDE.md and iprus-standards README):
//
//  1. A name must be on the Consolidation Map (consolidation_map.csv). It is
//     matched by compact name against every suredone_field, then against every
//     display_name (-> that name's preferred field).
//  2. Values with a standard (voltage, HP, phase, RPM, kVA, amps, enclosure)
//     are normalized by lib/value-standards.js; the map's name is kept.
//     A bare kVA number always stops the push (needs VA or kVA).
//  3. A name NOT on the map is created only when the live eBay Taxonomy API
//     marks it REQUIRED for this listing's eBay category, as
//     'ebayitemspecifics' + lowercase alphanumerics, with a value from eBay's
//     allowed list when the aspect is SELECTION_ONLY. Logged as
//     NEW_EBAY_REQUIRED_FIELD so HQ can add it to the Google Sheet.
//  4. Any other unknown name:
//       FIELD_GATE_MODE=warn  (default) -> left out, logged FIELD_GATE_WARN,
//                                          returned with the closest map name
//       FIELD_GATE_MODE=block           -> the push stops until it is renamed
//                                          or removed
//
// Required eBay aspects that end up with no value are returned (and logged)
// as a report; they don't stop the push.
// =============================================================================

import { getStandards, compactName } from './iprus-standards.js';
import { standardizeValue } from './value-standards.js';
import { SUREDONE_FIELD_NAMES } from '../data/suredone-field-names.js';

// Live eBay Taxonomy API (cached per instance). Loaded lazily; tests inject getAspects.
async function liveCategoryAspects(categoryId) {
  const { getCategoryAspects } = await import('./ebay-aspects.js');
  return getCategoryAspects(categoryId);
}

const PREFIX = 'ebayitemspecifics';

// Core listing fields: not item specifics, never gated (decision 4).
// custombundle / bundledescription: passed through unchanged (with or without the
// eBay prefix) until the "Included Part Numbers" standard exists (Scott, 2026-11-16).
export const CORE_FIELDS = new Set([
  'sku', 'guid', 'identifier', 'title', 'longdescription', 'description', 'price', 'stock',
  'brand', 'mpn', 'model', 'condition', 'notes', 'usertype', 'upc', 'ean',
  'weight', 'boxlength', 'boxwidth', 'boxheight', 'shelf',
  'custombundle', 'bundledescription',
]);
const PASS_THROUGH = new Set(['custombundle', 'bundledescription']);

// Flags that don't need a person (same as apply_standards.py QUIET_FLAGS)
const QUIET_FLAGS = new Set(['', 'extra text removed']);

export function getFieldGateMode() {
  return String(process.env.FIELD_GATE_MODE || '').toLowerCase() === 'block' ? 'block' : 'warn';
}

// SureDone key for a map field: multi-channel fields are sent bare, every
// other item specific with the eBay prefix.
function suredoneKey(field) {
  return SUREDONE_FIELD_NAMES.has(field) ? field : PREFIX + field;
}

function stripPrefix(key) {
  return key.toLowerCase().startsWith(PREFIX) ? key.slice(PREFIX.length) : key;
}

// Resolve a compact name against the map. Returns { field, display } or null.
export function resolveOnMap(compact, map) {
  if (!compact) return null;
  // SureDone field names on the map are cut at 25-26 characters
  for (const c of [compact, compact.slice(0, 26), compact.slice(0, 25)]) {
    if (map.fieldToDisplay.has(c)) return { field: c, display: map.fieldToDisplay.get(c) };
  }
  const display = map.compactDisplay.get(compact);
  if (display) return { field: map.preferredField.get(display), display };
  return null;
}

function levenshtein(a, b) {
  const prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    let diag = prev[0];
    prev[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const tmp = prev[j];
      prev[j] = Math.min(prev[j] + 1, prev[j - 1] + 1, diag + (a[i - 1] === b[j - 1] ? 0 : 1));
      diag = tmp;
    }
  }
  return prev[b.length];
}

function words(s) {
  return new Set(String(s).toLowerCase().split(/[^a-z0-9]+/).filter(Boolean));
}

/** Closest allowed display_name for an unknown name: edit distance + word overlap. */
export function suggestName(name, map) {
  const c = compactName(name);
  const w = words(name.replace(/([a-z])([A-Z])/g, '$1 $2'));
  let best = null, bestScore = 0;
  for (const display of map.displayToFields.keys()) {
    const dc = compactName(display);
    const editScore = 1 - levenshtein(c, dc) / Math.max(c.length, dc.length, 1);
    const dw = words(display);
    const shared = [...w].filter(x => dw.has(x)).length;
    const wordScore = shared / Math.max(new Set([...w, ...dw]).size, 1);
    const containScore = c.length >= 4 && dc.length >= 4 && (c.includes(dc) || dc.includes(c)) ? 0.25 : 0;
    const score = 0.5 * editScore + 0.5 * wordScore + containScore;
    if (score > bestScore) { bestScore = score; best = display; }
  }
  return bestScore >= 0.35 ? best : null;
}

/**
 * entries:        [[key, value], ...] — item specifics in priority order
 *                 (an earlier entry wins only for an exact duplicate SureDone key)
 * ebayCategoryId: the listing's eBay category (for required aspects)
 * category:       text naming the product category (for voltage rules)
 * sku:            for logs
 * mode:           'warn' | 'block' (default from FIELD_GATE_MODE)
 * coreValues:     core fields the route already sends, e.g. { usertype }.
 *                 A map name whose preferred field is a core field (Type ->
 *                 usertype) only fills it when the route's value is empty.
 *
 * Returns {
 *   ok,               false = do not send (blocked list says why)
 *   mode,
 *   fields,           [[suredoneKey, value], ...] to send
 *   blocked,          [{ name, value, reason, suggested }]  push stopped
 *   warnings,         [{ name, value, reason, suggested }]  left out, push continues
 *   created,          [{ aspect, field, value }]           NEW_EBAY_REQUIRED_FIELD
 *   changed,          [{ name, from, to, flag }]           values normalized
 *   missingRequired,  [aspect names]                        report only
 *   conflicts,        [{ display, fields: [{ field, value, sent }] }]
 *                     same display name, different values (all sent; report only)
 *   standardsStale, standardsWarning
 * }
 * Throws StandardsUnavailableError when no copy of the standards exists.
 */
export async function gateItemSpecifics({
  entries, ebayCategoryId, category = '', sku = '', mode = getFieldGateMode(), getAspects = liveCategoryAspects,
  coreValues = {},
}) {
  const hasCore = (f) => coreValues[f] !== undefined && coreValues[f] !== null && String(coreValues[f]).trim() !== '';
  const { standards, stale, warning } = await getStandards();
  const { map, values } = standards;

  let aspects = null, aspectsError = null;
  const loadAspects = async () => {
    if (aspects || aspectsError) return aspects;
    if (!ebayCategoryId) { aspectsError = new Error('no eBay category ID'); return null; }
    try {
      aspects = await getAspects(String(ebayCategoryId));
    } catch (e) {
      aspectsError = e;
      console.warn(`FIELD_GATE: eBay aspects unavailable for ${ebayCategoryId}: ${e.message}`);
    }
    return aspects;
  };

  const fields = [], blocked = [], warnings = [], created = [], changed = [];
  const usedDisplays = new Set();
  const usedKeys = new Set();
  const byDisplay = new Map();   // display_name -> [{ field, value, sent }] for conflict reporting
  const reject = (item) => {
    if (mode === 'block') blocked.push(item);
    else warnings.push(item);
    console.log(`FIELD_GATE_WARN ${JSON.stringify({ sku, ebayCategoryId, mode, ...item })}`);
  };

  for (const [rawKey, rawValue] of entries) {
    if (rawValue === null || rawValue === undefined) continue;
    let value = String(rawValue).trim();
    if (!value || value === 'null' || value === 'N/A' || value === 'Unknown') continue;
    const key = String(rawKey || '').trim();
    const bare = stripPrefix(key);
    const compact = compactName(bare);
    if (!compact) continue;

    // Core field (or bundle field): send untouched under its own key
    if (CORE_FIELDS.has(key) || PASS_THROUGH.has(compact)) {
      if (key === 'usertype' && hasCore('usertype')) continue;   // route's usertype wins
      if (!usedKeys.has(key)) { fields.push([key, value]); usedKeys.add(key); }
      continue;
    }

    const hit = resolveOnMap(compact, map);
    if (hit) {
      let { field, display } = hit;
      const std = standardizeValue(display, value, category, values);
      if (std) {
        if (!std.value) {
          const item = { name: display, value, reason: `left out: ${std.flag}`, suggested: null };
          if (/needs a unit/.test(std.flag)) blocked.push(item);   // decision 5: always stops
          else reject(item);
          continue;
        }
        if (std.name !== display && map.displayToFields.has(std.name)) {
          display = std.name;
          field = map.preferredField.get(display);
        }
        if (std.value !== value || !QUIET_FLAGS.has(std.flag)) {
          changed.push({ name: display, from: value, to: std.value, flag: std.flag });
        }
        value = std.value;
      }
      // Every mapped field is sent (several fields may share a display name);
      // only an exact duplicate key is skipped. Differing values are reported as conflicts.
      usedDisplays.add(display);
      if (!byDisplay.has(display)) byDisplay.set(display, []);
      if (CORE_FIELDS.has(field)) {
        // e.g. eBay "Type" -> usertype: the route's own value is kept when it has one
        if (hasCore(field) || usedKeys.has(field)) {
          console.log(`FIELD_GATE: "${display}" = "${value}" not used; ${field} is already set`);
          byDisplay.get(display).push({ field, value, sent: false });
          continue;
        }
        usedKeys.add(field);
        fields.push([field, value]);
        byDisplay.get(display).push({ field, value, sent: true });
        continue;
      }
      const out = suredoneKey(field);
      if (usedKeys.has(out)) {
        console.log(`FIELD_GATE: duplicate key ${out} from ${key} ignored (kept the first value)`);
        byDisplay.get(display).push({ field: out, value, sent: false });
        continue;
      }
      usedKeys.add(out);
      fields.push([out, value]);
      byDisplay.get(display).push({ field: out, value, sent: true });
      continue;
    }

    // Not on the map: only an eBay-REQUIRED aspect from the live Taxonomy API may be created
    const a = await loadAspects();
    const aspect = a?.all?.find(x => compactName(x.ebayName) === compact);
    if (aspect?.required) {
      if (aspect.mode === 'SELECTION_ONLY' && aspect.allowedValues?.length) {
        const allowed = aspect.allowedValues.find(v => v.toLowerCase() === value.toLowerCase());
        if (!allowed) {
          reject({ name: aspect.ebayName, value, reason: 'eBay requires one of its allowed values', suggested: null });
          continue;
        }
        value = allowed;
      }
      const out = PREFIX + compact;
      if (usedKeys.has(out)) continue;
      usedKeys.add(out);
      usedDisplays.add(aspect.ebayName);
      fields.push([out, value]);
      created.push({ aspect: aspect.ebayName, field: out, value });
      console.log(`NEW_EBAY_REQUIRED_FIELD ${JSON.stringify({ sku, ebayCategoryId, aspect: aspect.ebayName, field: out })}`);
      continue;
    }

    const why = aspect ? `not on the Consolidation Map (eBay: ${aspect.usage.toLowerCase()})`
      : aspectsError ? `not on the Consolidation Map (eBay aspects unavailable: ${aspectsError.message})`
      : 'not on the Consolidation Map';
    reject({ name: aspect?.ebayName || bare, value, reason: why, suggested: suggestName(aspect?.ebayName || bare, map) });
  }

  // Report: required eBay aspects with no value
  const missingRequired = [];
  const a = await loadAspects();
  for (const aspect of a?.required || []) {
    const compact = compactName(aspect.ebayName);
    const hit = resolveOnMap(compact, map);
    if (hit && (usedDisplays.has(hit.display) || hasCore(hit.field) || usedKeys.has(hit.field))) continue;
    // Other core fields (brand, mpn, ...) are set by the route outside the gate
    if (hit && CORE_FIELDS.has(hit.field) && hit.field !== 'usertype') continue;
    if (usedDisplays.has(aspect.ebayName) || usedKeys.has(PREFIX + compact)) continue;
    missingRequired.push(aspect.ebayName);
  }
  if (missingRequired.length) {
    console.log(`FIELD_GATE_MISSING_REQUIRED ${JSON.stringify({ sku, ebayCategoryId, aspects: missingRequired })}`);
  }

  // Conflicts: one display name, different values (all sent; a person should check)
  const conflicts = [];
  for (const [display, list] of byDisplay) {
    if (new Set(list.map(x => x.value)).size < 2) continue;
    const c = { display, fields: list };
    conflicts.push(c);
    console.log(`FIELD_GATE_CONFLICT ${JSON.stringify({ sku, ...c })}`);
  }

  return {
    ok: blocked.length === 0,
    mode, fields, blocked, warnings, created, changed, missingRequired, conflicts,
    standardsStale: stale, standardsWarning: warning || null,
  };
}
