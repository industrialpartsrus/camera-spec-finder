// lib/generate-alt-text-templates.js
// Template-based alt-text generator for product photos
// Replaces AI-generated alt-text (Claude Vision API) with instant, free, SEO-optimized templates
// Each view type produces a unique description with varied word order to avoid duplicate content penalties

// ============================================================================
// CONDITION LABELS - Clean short labels for alt-text use
// ============================================================================

const CONDITION_ALT_LABELS = {
  'new_in_box':           'New Factory Sealed',
  'new_open_box':         'New Open Box',
  'new_no_packaging':     'New Surplus',
  'new_missing_hardware': 'New Surplus',
  'refurbished':          'Refurbished',
  'used_excellent':       'Used Excellent Condition',
  'like_new_excellent':   'Used Excellent Condition',
  'used_very_good':       'Used Very Good Condition',
  'used_good':            'Used Good Condition',
  'used_fair':            'Used Fair Condition',
  'for_parts':            'For Parts or Repair',
  // SureDone/eBay condition values (in case those get passed instead)
  'New':                          'New',
  'New Other':                    'New Surplus',
  'Used':                         'Used',
  'Manufacturer Refurbished':     'Refurbished',
  'For Parts or Not Working':     'For Parts or Repair',
};

// ============================================================================
// VIEW TEMPLATES - Each view has a unique sentence pattern
// ============================================================================
// Tokens: {brand} {part} {type} {condition}
//
// Why varied patterns matter for SEO:
//   Google penalizes identical alt-text across multiple images on the same page.
//   By varying word order and phrasing per view, each image gets indexed
//   independently while still targeting the same buyer search keywords.
//
// All templates keep alt-text under 125 characters (eBay recommended max).
// ============================================================================

const VIEW_TEMPLATES = {
  // Primary views - most important for SEO
  center: {
    withType:    '{brand} {part} {type} - Front View - {condition}',
    withoutType: '{brand} {part} - Front View - {condition}',
  },
  front: {
    withType:    '{brand} {part} {type} - Front View - {condition}',
    withoutType: '{brand} {part} - Front View - {condition}',
  },
  left: {
    withType:    '{brand} {part} {type} Left Side View {condition}',
    withoutType: '{brand} {part} Left Side View {condition}',
  },
  right: {
    withType:    'Right Side {brand} {part} {type} - {condition}',
    withoutType: 'Right Side {brand} {part} - {condition}',
  },
  back: {
    withType:    '{brand} {part} {type} Rear View Showing Connections - {condition}',
    withoutType: '{brand} {part} Rear View Showing Connections - {condition}',
  },
  top: {
    withType:    'Top View of {brand} {part} {type} - {condition}',
    withoutType: 'Top View of {brand} {part} - {condition}',
  },
  bottom: {
    withType:    '{brand} {part} {type} Bottom View Showing Mounting - {condition}',
    withoutType: '{brand} {part} Bottom View Showing Mounting - {condition}',
  },

  // Nameplate - always unique, no condition needed
  nameplate: {
    withType:    '{brand} {part} Nameplate Showing Model Number and Specifications',
    withoutType: '{brand} {part} Nameplate Showing Model Number and Specifications',
  },
  data_plate: {
    withType:    '{brand} {part} Data Plate with Rating and Specification Details',
    withoutType: '{brand} {part} Data Plate with Rating and Specification Details',
  },

  // Extra photos - rotating patterns so extras do not repeat
  extra_1: {
    withType:    '{brand} {part} {type} Close-Up Detail View - {condition}',
    withoutType: '{brand} {part} Close-Up Detail View - {condition}',
  },
  extra_2: {
    withType:    '{brand} {part} {type} Additional Angle - {condition}',
    withoutType: '{brand} {part} Additional Angle - {condition}',
  },
  extra_3: {
    withType:    'Detail Shot {brand} {part} {type} Showing Condition - {condition}',
    withoutType: 'Detail Shot {brand} {part} Showing Condition - {condition}',
  },
  extra_4: {
    withType:    '{brand} {part} {type} - Supplemental Photo - {condition}',
    withoutType: '{brand} {part} - Supplemental Photo - {condition}',
  },
  extra_5: {
    withType:    '{condition} {brand} {part} {type} - Additional Detail View',
    withoutType: '{condition} {brand} {part} - Additional Detail View',
  },
  extra_6: {
    withType:    '{brand} {part} {type} Alternate Perspective - {condition}',
    withoutType: '{brand} {part} Alternate Perspective - {condition}',
  },
};

// Fallback pattern for any view not in the map above (extra_7, extra_8, etc.)
const FALLBACK_TEMPLATES = [
  { withType: '{brand} {part} {type} - Photo {index} - {condition}', withoutType: '{brand} {part} - Photo {index} - {condition}' },
  { withType: '{condition} {brand} {part} {type} Image {index}',     withoutType: '{condition} {brand} {part} Image {index}' },
  { withType: '{brand} {part} {type} View {index} - {condition}',    withoutType: '{brand} {part} View {index} - {condition}' },
];

// ============================================================================
// MAIN FUNCTION
// ============================================================================

/**
 * Generate SEO-optimized alt-text for a product photo using templates.
 *
 * @param {Object} params
 * @param {string} params.brand       - e.g. "Allen-Bradley"
 * @param {string} params.partNumber  - e.g. "1756-L72"
 * @param {string} params.viewType    - e.g. "left", "right", "center", "nameplate", "extra_1"
 * @param {string} [params.condition] - e.g. "used_good", "New", "new_in_box"
 * @param {string} [params.productType] - e.g. "ControlLogix PLC Processor" (from AI research)
 * @param {number} [params.photoIndex]  - 1-based index for fallback numbering
 * @returns {string} Alt-text string, max ~125 characters
 */
function generateAltText({ brand, partNumber, viewType, condition, productType, photoIndex }) {
  // Clean inputs
  const cleanBrand = (brand || '').trim();
  const cleanPart = (partNumber || '').trim();
  const cleanType = (productType || '').trim();
  const cleanView = (viewType || 'center').trim().toLowerCase();
  const index = photoIndex || 1;

  // Get condition label
  const conditionLabel = CONDITION_ALT_LABELS[condition]
    || CONDITION_ALT_LABELS[(condition || '').toLowerCase()]
    || condition
    || 'Industrial Equipment';

  // Choose template
  let template;
  if (VIEW_TEMPLATES[cleanView]) {
    template = VIEW_TEMPLATES[cleanView];
  } else {
    // For extra_7, extra_8, etc. - rotate through fallback patterns
    const fallbackIndex = (index - 1) % FALLBACK_TEMPLATES.length;
    template = FALLBACK_TEMPLATES[fallbackIndex];
  }

  // Pick withType or withoutType variant
  const hasType = cleanType.length > 0;
  let altText = hasType ? template.withType : template.withoutType;

  // Fill in tokens
  altText = altText
    .replace(/\{brand\}/g, cleanBrand)
    .replace(/\{part\}/g, cleanPart)
    .replace(/\{type\}/g, cleanType)
    .replace(/\{condition\}/g, conditionLabel)
    .replace(/\{index\}/g, String(index));

  // Clean up any double spaces or trailing dashes from missing values
  altText = altText
    .replace(/\s{2,}/g, ' ')
    .replace(/\s*-\s*-\s*/g, ' - ')
    .replace(/^\s*-\s*/, '')
    .replace(/\s*-\s*$/, '')
    .trim();

  // Enforce 125 char limit (eBay recommendation)
  if (altText.length > 125) {
    altText = altText.substring(0, 122) + '...';
  }

  return altText;
}

// ============================================================================
// BATCH FUNCTION - Generate alt-text for all photos in one call
// ============================================================================

/**
 * Generate alt-text for an array of photos.
 * Designed to replace the per-photo Claude Vision API call.
 *
 * @param {Object} params
 * @param {string} params.brand
 * @param {string} params.partNumber
 * @param {string} [params.condition]
 * @param {string} [params.productType]
 * @param {Array}  params.photos - Array of { url, viewType, order } objects
 * @returns {Array} Same array with altText added to each photo object
 */
function generateAllAltTexts({ brand, partNumber, condition, productType, photos }) {
  if (!photos || !Array.isArray(photos)) return [];

  return photos.map((photo, i) => ({
    ...photo,
    altText: generateAltText({
      brand,
      partNumber,
      viewType: photo.viewType || photo.view || ('extra_' + (i + 1)),
      condition,
      productType,
      photoIndex: photo.order || i + 1,
    }),
  }));
}

// ============================================================================
// MEDIA FIELD MAPPER - Maps photos array to SureDone media1-12 + alttext fields
// ============================================================================

/**
 * Map photos array to SureDone media fields.
 * Returns an object like: { media1: url, media1alttext: alt, media2: url, ... }
 *
 * @param {Object} params
 * @param {string} params.brand
 * @param {string} params.partNumber
 * @param {string} [params.condition]
 * @param {string} [params.productType]
 * @param {Array}  params.photos - Array of { url, viewType, order } objects
 * @returns {Object} SureDone-compatible field map
 */
function mapPhotosToSureDoneFields({ brand, partNumber, condition, productType, photos }) {
  const fields = {};
  if (!photos || !Array.isArray(photos)) return fields;

  // Sort by order if available
  const sorted = [...photos].sort((a, b) => (a.order || 0) - (b.order || 0));

  sorted.forEach((photo, i) => {
    if (i >= 12) return; // SureDone supports media1-media12

    const slot = i + 1;
    const altText = generateAltText({
      brand,
      partNumber,
      viewType: photo.viewType || photo.view || ('extra_' + (i + 1)),
      condition,
      productType,
      photoIndex: slot,
    });

    fields['media' + slot] = photo.url;
    fields['media' + slot + 'alttext'] = altText;
  });

  return fields;
}

// ============================================================================
// EXPORTS - Support both ES modules and CommonJS
// ============================================================================

module.exports = {
  generateAltText,
  generateAllAltTexts,
  mapPhotosToSureDoneFields,
  CONDITION_ALT_LABELS,
  VIEW_TEMPLATES,
};
