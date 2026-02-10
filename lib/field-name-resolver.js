// lib/field-name-resolver.js
// =============================================================================
// FIELD NAME RESOLVER: Maps eBay aspect names and AI spec keys to SureDone fields
// =============================================================================
// Rule: If a multi-channel short name exists in our consolidation map,
// use it (SureDone auto-routes to eBay + website). Otherwise, use the
// ebayitemspecifics prefix (eBay only).
// =============================================================================

import { SUREDONE_FIELD_NAMES, FIELD_ALIASES } from '../data/suredone-field-names.js';

/**
 * Convert any string to a potential SureDone short name.
 * "Communication Standard" → "communicationstandard"
 * "AC Phase" → "acphase"
 * "Country/Region of Manufacture" → "countryregionofmanufacture"
 */
function toShortName(str) {
  return str.toLowerCase().replace(/[^a-z0-9]/g, '');
}

/**
 * Resolves an eBay aspect name to the correct SureDone field name.
 * Used by Pass 2 (auto-fill-ebay-specifics) to generate specificsForSuredone.
 *
 * @param {string} ebayAspectName - e.g., "Communication Standard", "Service Factor"
 * @returns {string} - e.g., "communicationstandard" or "ebayitemspecificsshafttype"
 */
export function resolveFieldName(ebayAspectName) {
  const shortName = toShortName(ebayAspectName);

  // Check aliases FIRST — ensures consolidated fields always use canonical name
  // e.g., "nominalratedinputvoltage" exists in Set but should resolve to "inputvoltage"
  if (FIELD_ALIASES[shortName]) {
    return FIELD_ALIASES[shortName];
  }

  // Direct match in multi-channel fields (not aliased)
  if (SUREDONE_FIELD_NAMES.has(shortName)) {
    return shortName;
  }

  // No match — use eBay-only prefix
  return 'ebayitemspecifics' + shortName;
}

/**
 * Resolves a spec key from AI output to the correct SureDone field name.
 * Used by Pass 1 (search-product-v2) to standardize AI-generated spec keys.
 *
 * @param {string} aiSpecKey - e.g., "NominalRatedInputVoltage", "Horsepower", "acphase"
 * @returns {string} - the canonical short field name, e.g., "inputvoltage", "horsepower"
 */
export function resolveSpecFieldName(aiSpecKey) {
  const shortName = toShortName(aiSpecKey);

  // Check aliases FIRST — ensures consolidated fields use canonical name
  if (FIELD_ALIASES[shortName]) {
    return FIELD_ALIASES[shortName];
  }

  // Direct match
  if (SUREDONE_FIELD_NAMES.has(shortName)) {
    return shortName;
  }

  // Substring matching for common patterns where AI uses verbose names
  // Only match if the field name is at least 5 chars (avoid false positives on 'rpm', 'kw', etc.)
  // Check if shortName contains a known field or vice versa
  for (const fieldName of SUREDONE_FIELD_NAMES) {
    if (fieldName.length < 5) continue; // skip short generic names like 'rpm', 'hz', 'kw'
    if (shortName.includes(fieldName) || fieldName.includes(shortName)) {
      // Avoid matching on very short input strings
      if (shortName.length >= 5) {
        return fieldName;
      }
    }
  }

  // No match found — return the short name as-is (will become a custom field)
  return shortName;
}

/**
 * Batch-resolve a specs object from AI output.
 * Takes { "NominalRatedInputVoltage": "24V DC", ... }
 * Returns { "inputvoltage": "24V DC", ... } with canonical field names.
 *
 * @param {Object} specs - AI-generated specifications object
 * @returns {Object} - specs with resolved field names
 */
export function resolveSpecsObject(specs) {
  if (!specs || typeof specs !== 'object') return {};

  const resolved = {};
  for (const [key, value] of Object.entries(specs)) {
    if (value === null || value === undefined || value === '') continue;
    const resolvedKey = resolveSpecFieldName(key);
    // If multiple AI keys resolve to the same canonical, keep the first non-empty value
    if (!resolved[resolvedKey]) {
      resolved[resolvedKey] = value;
    }
  }
  return resolved;
}
