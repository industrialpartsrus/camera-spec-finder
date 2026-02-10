// lib/field-name-resolver.js
// =============================================================================
// FIELD NAME RESOLVER: Maps eBay aspect names and AI spec keys to SureDone fields
// =============================================================================
// Three-tier resolution:
//   Tier 1: Multi-channel short name (routes to eBay + website)
//   Tier 2: Known registered eBay-only field (lowercase prefix, matches registered field)
//   Tier 3: Dynamic fallback (original casing prefix, SureDone auto-creates)
// =============================================================================

import {
  SUREDONE_FIELD_NAMES,
  SUREDONE_EBAY_ONLY_FIELDS,
  FIELD_ALIASES
} from '../data/suredone-field-names.js';

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
 * Three-tier resolution:
 *   Tier 1: Multi-channel short name → routes to eBay + website
 *   Tier 2: Known registered eBay-only → ebayitemspecifics + lowercase (matches registered field)
 *   Tier 3: Dynamic fallback → ebayitemspecifics + original casing (SureDone auto-creates)
 *
 * CRITICAL: Tier 2 produces "ebayitemspecificsacmotortype" (lowercase).
 *           Tier 3 produces "ebayitemspecificsAC Motor Type" (original casing).
 *           Sending Tier 3 format for a Tier 2 field won't match the registered field.
 *
 * @param {string} ebayAspectName - e.g., "Communication Standard", "AC Motor Type"
 * @returns {string} - e.g., "communicationstandard", "ebayitemspecificsacmotortype", "ebayitemspecificsAC Motor Type"
 */
export function resolveFieldName(ebayAspectName) {
  const shortName = toShortName(ebayAspectName);

  // Tier 1: Multi-channel short name (routes to eBay + website)
  if (SUREDONE_FIELD_NAMES.has(shortName)) {
    return shortName;
  }

  // Check aliases (e.g., typos or AI-generated names that map to a known canonical)
  if (FIELD_ALIASES[shortName]) {
    return FIELD_ALIASES[shortName];
  }

  // Tier 2: Known registered eBay-only field (lowercase prefix matches registered field)
  if (SUREDONE_EBAY_ONLY_FIELDS.has(shortName)) {
    return 'ebayitemspecifics' + shortName;
  }

  // Tier 3: Dynamic fallback (original casing — SureDone auto-creates the field)
  return 'ebayitemspecifics' + ebayAspectName.replace(/[^a-zA-Z0-9 ]/g, '');
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

  // Tier 1: Direct match in multi-channel fields
  if (SUREDONE_FIELD_NAMES.has(shortName)) {
    return shortName;
  }

  // Check aliases
  if (FIELD_ALIASES[shortName]) {
    return FIELD_ALIASES[shortName];
  }

  // Tier 2: Known registered eBay-only field
  if (SUREDONE_EBAY_ONLY_FIELDS.has(shortName)) {
    return shortName;
  }

  // Substring matching for common patterns where AI uses verbose names
  // Only match if the field name is at least 5 chars (avoid false positives on 'rpm', 'kw', etc.)
  for (const fieldName of SUREDONE_FIELD_NAMES) {
    if (fieldName.length < 5) continue;
    if (shortName.includes(fieldName) || fieldName.includes(shortName)) {
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
