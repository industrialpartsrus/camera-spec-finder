# Consolidated Task: Fix Field Name Mapping & eBay Item Specifics Pipeline

Read docs/SYSTEM_SPEC.md and docs/suredone_consolidation_map.xlsx first.

## Background Context

We have a 3-pass listing system:
- Pass 1 (`search-product-v2.js`): AI researches product, generates title/description/specs, detects eBay category
- Pass 2 (`auto-fill-ebay-specifics.js`): Fills eBay item specifics based on category requirements
- Pass 3 (`revise-listing.js`): Revises title/description with enriched specs (NOT YET WIRED)

We just switched pro.js from calling `/api/search-product` (v1) to `/api/search-product-v2`. 
eBay categories, store categories, and BigCommerce brands are now working correctly.
Two problems remain: custom spec field names are wrong, and eBay item specifics don't reach SureDone.

---

## CRITICAL DISCOVERY: How SureDone Field Names Work

We inspected SureDone's HTML with browser dev tools and discovered TWO types of item specific fields:

**Type 1 — Multi-channel "inline" fields (short names)**
Example HTML: `<input id="communicationstandard" ... defaults[field].ma === 'both'">`
- These use short names like `communicationstandard`, `servicefactor`, `enclosuretype`
- The `ma === 'both'` flag means SureDone routes them to eBay AND BigCommerce/WooCommerce automatically
- Behind the scenes, SureDone maps `servicefactor` → `ebayitemspecificsservicefactor` for eBay
- We do NOT need to send both — just the short name handles everything

**Type 2 — eBay-only fields (prefixed)**
Example HTML: `<input id="ebayitemspecificsshafttype" ...>` (no `ma === 'both'`)
- These use the `ebayitemspecifics` prefix
- They ONLY push to eBay, not to other channels
- These are for specs that don't have a multi-channel equivalent in our account

**THE RULE:**
1. Convert eBay aspect name to short name: "Service Factor" → "servicefactor" (lowercase, no spaces/special chars)
2. Check if that short name exists in our consolidation map
3. If YES → use the short name only (SureDone auto-routes to eBay + website)
4. If NO → use "ebayitemspecifics" + shortname (eBay only)

---

## Task 1: Extract Field Names from Consolidation Map

Read `docs/suredone_consolidation_map.xlsx`. It has 4 sheets:

- **Sheet 1 "Consolidation Map"** (468 rows): WooCommerce Attribute → Suredone Source Column(s) → # Merged
- **Sheet 3 "Full Header Lookup"** (840 rows): Suredone Header → Maps To → Category

From Sheet 3, extract ALL rows where Category = "Attribute" (skip "Platform (skip)" rows).
The "Suredone Header" column contains the actual field names we need.

Create `data/suredone-field-names.js` that exports:

```javascript
// SUREDONE_FIELD_NAMES: Set of all valid multi-channel short field names from our SureDone account
// Source: suredone_consolidation_map.xlsx Sheet 3 "Full Header Lookup" (Attribute rows only)
// These are "inline fields" in SureDone with ma === 'both' — they route to eBay AND website channels
export const SUREDONE_FIELD_NAMES = new Set([
  'actiontype',
  'actualfieldofview', 
  'actualratedinputvoltage',
  'actualvoltageratingac',
  'actualvoltageratingdc',
  'actuation',
  'actuatortype',
  'amperage',
  'amperagerange',
  'analogdigital',
  'analoginput',
  'angle',
  'application',
  // ... ALL attribute rows from Sheet 3
]);

// FIELD_DISPLAY_NAMES: Maps short field name to human-readable display label
// Source: Sheet 3 "Maps To" column
export const FIELD_DISPLAY_NAMES = {
  'actiontype': 'Action Type',
  'actualfieldofview': 'Field of View',
  'actualratedinputvoltage': 'Input Voltage',
  // ... ALL attribute rows
};
```

Also from Sheet 1 "Consolidation Map", create a reverse lookup so we know which short names
map to the same canonical attribute:

```javascript
// FIELD_ALIASES: Maps any SureDone header to its canonical short name
// Example: 'ratedloadhp' → 'horsepower', 'maxpsi' → 'maxpressure'
// Source: Sheet 1 — parse the "Suredone Source Column(s)" comma-separated list
// The FIRST non-ebayitemspecifics entry in each list is the canonical short name
export const FIELD_ALIASES = {
  'ratedloadhp': 'horsepower',
  'spindlehorsepower': 'horsepower',
  'maxpsi': 'maxpressure',
  'maxbar': 'maxpressure',
  'maxmpa': 'maxpressure',
  'mpa': 'maxpressure',
  'maxoperatingpressure': 'maxpressure',
  'maximumpressure': 'maxpressure',
  // ... ALL alias mappings from Sheet 1
};
```

**STOP HERE AND SHOW ME THE COMPLETE EXTRACTED LISTS BEFORE PROCEEDING.**
I need to review the field names before any code changes are made.

---

## Task 2: Create Field Name Resolver

After I approve the field list, create `lib/field-name-resolver.js`:

```javascript
import { SUREDONE_FIELD_NAMES, FIELD_ALIASES } from '../data/suredone-field-names.js';

/**
 * Resolves an eBay aspect name to the correct SureDone field name.
 * 
 * Rule: If a multi-channel short name exists in our consolidation map,
 * use it (SureDone auto-routes to eBay + website). Otherwise, use the
 * ebayitemspecifics prefix (eBay only).
 *
 * @param {string} ebayAspectName - e.g., "Communication Standard", "Service Factor"
 * @returns {string} - e.g., "communicationstandard" or "ebayitemspecificsshafttype"
 */
export function resolveFieldName(ebayAspectName) {
  // Convert to potential short name: "Communication Standard" → "communicationstandard"
  const shortName = ebayAspectName.toLowerCase().replace(/[^a-z0-9]/g, '');
  
  // Check if this exact short name exists in our multi-channel fields
  if (SUREDONE_FIELD_NAMES.has(shortName)) {
    return shortName;
  }
  
  // Check if it's a known alias (e.g., "ratedhorsepower" → "horsepower")
  if (FIELD_ALIASES[shortName]) {
    return FIELD_ALIASES[shortName];
  }
  
  // No match — use eBay-only prefix
  return 'ebayitemspecifics' + shortName;
}

/**
 * Resolves a spec key from AI output to the correct SureDone field name.
 * Used for Pass 1 custom specs (non-eBay).
 * 
 * @param {string} aiSpecKey - e.g., "NominalRatedInputVoltage", "Horsepower"
 * @returns {string} - the canonical short field name, e.g., "inputvoltage", "horsepower"
 */
export function resolveSpecFieldName(aiSpecKey) {
  const shortName = aiSpecKey.toLowerCase().replace(/[^a-z0-9]/g, '');
  
  // Direct match
  if (SUREDONE_FIELD_NAMES.has(shortName)) {
    return shortName;
  }
  
  // Alias match
  if (FIELD_ALIASES[shortName]) {
    return FIELD_ALIASES[shortName];
  }
  
  // Check if any part of the name matches common patterns
  // e.g., "nominalratedinputvoltage" should resolve to "inputvoltage" or "actualratedinputvoltage"
  for (const fieldName of SUREDONE_FIELD_NAMES) {
    if (shortName.includes(fieldName) || fieldName.includes(shortName)) {
      return fieldName;
    }
  }
  
  // No match found — return the short name as-is (it will become a new custom field)
  return shortName;
}
```

---

## Task 3: Fix Pass 2 (eBay Item Specifics) to Use Field Resolver

Update `auto-fill-ebay-specifics.js` so that when it generates `specificsForSuredone`, 
each field name goes through `resolveFieldName()`.

Currently Pass 2 likely generates field names like:
```javascript
{ "ebayitemspecificscommunicationstandard": "EtherNet/IP" }
```

It should instead generate:
```javascript
{ "communicationstandard": "EtherNet/IP" }  // because consolidation map has this field
```

But for fields NOT in the consolidation map:
```javascript
{ "ebayitemspecificscontrollerplatform": "ControlLogix" }  // no short name exists
```

Wait — actually "controllerplatform" IS in SureDone (we saw it in the HTML inspection).
The resolver handles this automatically — it will find "controllerplatform" in the Set and use the short name.

---

## Task 4: Fix suredone-create-listing.js to Include Pass 2 Results

**THIS IS CRITICAL.** Right now, suredone-create-listing.js completely IGNORES Pass 2 output.

The diagnostic found: `grep -n "ebayItemSpecificsForSuredone" suredone-create-listing.js` returns ZERO matches.

Here's the data flow that needs to work:

1. Pass 2 returns `specificsForSuredone` — an object of resolved field names → values
   Example: `{ "communicationstandard": "EtherNet/IP", "voltage": "24V DC", "ebayitemspecificscontrollerplatform": "ControlLogix" }`

2. pro.js stores these in Firebase AND sends them in the payload to suredone-create-listing.js 
   as `ebayItemSpecificsForSuredone`

3. **suredone-create-listing.js needs to READ this field and include each key-value pair in the SureDone formData**

Add this to suredone-create-listing.js:

```javascript
// Include Pass 2 eBay item specifics (resolved field names)
const ebaySpecifics = product.ebayItemSpecificsForSuredone || {};
for (const [fieldName, value] of Object.entries(ebaySpecifics)) {
  if (value && value.trim()) {
    formData.append(fieldName, value);
  }
}
```

**PRIORITY ORDER for field values:**
1. Pass 2 results (category-specific, most accurate) — HIGHEST PRIORITY
2. User-edited values from the UI — override Pass 2 if user changed them
3. Old SPEC_TO_EBAY_FIELD generic mapping — LOWEST PRIORITY, fallback only

The existing SPEC_TO_EBAY_FIELD mapping (which maps things like 'type' → 'acmotortype' for ALL products) 
should only fill fields that Pass 2 didn't already cover. This generic mapping is motor-centric and 
causes PLC products to get motor-specific fields, which is wrong.

---

## Task 5: Fix Pass 1 Custom Specs to Use Standardized Field Names

Update `search-product-v2.js` so that when the AI generates the `specifications` object in Pass 1,
it uses field names from our SUREDONE_FIELD_NAMES set.

Currently AI generates arbitrary names like:
```json
{
  "NominalRatedInputVoltage": "24V DC",
  "ProgrammingMethod": "Ladder Logic",
  "CommunicationProtocol": "EtherNet/IP"
}
```

It should generate:
```json
{
  "inputvoltage": "24V DC",       // matches consolidation map
  "programmingmethod": "Ladder Logic",  // matches consolidation map
  "communicationstandard": "EtherNet/IP"  // matches consolidation map (not "protocol")
}
```

Two approaches (pick whichever is more maintainable):

**Option A:** Include the top 150 most common field names in the AI prompt as a reference list,
instructing the AI to ONLY use these names for specs. This is simpler but uses prompt tokens.

**Option B:** Let AI generate any names, then run them through `resolveSpecFieldName()` 
on the server before returning to the frontend. This is more flexible but adds processing.

I prefer Option B since it doesn't bloat the AI prompt, but show me both approaches and 
let me decide.

---

## Files That Will Be Created or Modified

**New files:**
- `data/suredone-field-names.js` — extracted field name sets from consolidation map
- `lib/field-name-resolver.js` — resolveFieldName() and resolveSpecFieldName() functions

**Modified files:**
- `pages/api/v2/auto-fill-ebay-specifics.js` — use resolveFieldName() for Pass 2 output
- `pages/api/suredone-create-listing.js` — read and include Pass 2 results in payload, set priority order
- `pages/api/search-product-v2.js` — use resolveSpecFieldName() for Pass 1 custom specs

**Reference files (read-only):**
- `docs/suredone_consolidation_map.xlsx` — source of truth for field names
- `docs/SYSTEM_SPEC.md` — system architecture reference
- `data/ebay-category-aspects.json` — eBay category requirements

---

## Order of Operations

1. **Extract field names** (Task 1) → STOP AND SHOW ME FOR REVIEW
2. **Create resolver** (Task 2) → after I approve the field list
3. **Fix Pass 2 field names** (Task 3)
4. **Fix suredone-create-listing.js** (Task 4) — this is what actually pushes specs to SureDone
5. **Fix Pass 1 custom specs** (Task 5) — standardize the UI display names

Test after each step with Allen-Bradley 1756-PA75.

---

## What NOT to Change

- Do NOT modify eBay category detection (it's working correctly now)
- Do NOT modify store category mapping (it's working correctly now)  
- Do NOT modify BigCommerce brand lookup (it's working correctly now)
- Do NOT modify the 3-pass architecture flow
- Do NOT touch pro-v2.js (it's an incomplete rewrite, not in use)
- Do NOT remove or modify the AI prompt's product-specific instructions (Allen-Bradley series detection, SMC nomenclature, etc.)
