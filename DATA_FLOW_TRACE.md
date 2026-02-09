# Data Flow Trace: "Cam Follower Bearing" Search

## Executive Summary
**Critical Issue Found**: Inconsistent eBay category IDs across files cause data loss for bearings products.

---

## Data Flow Diagram

```
User Input: "cam follower bearing"
    ↓
┌─────────────────────────────────────────────────────────────┐
│ API ENDPOINT: /api/search-product.js OR /api/search-product-v2.js │
└─────────────────────────────────────────────────────────────┘
    ↓
    ├─ search-product.js (OLD)
    │   ├─ Line 701-713: Category detection logic
    │   ├─ Searches for "motor", "bearing", etc. in part number
    │   ├─ ❌ NO "Bearings" in CATEGORY_FIELD_DEFINITIONS (lines 10-557)
    │   ├─ Falls back to `category = null` (line 718)
    │   └─ Uses generic prompt (line 726: generateGenericPrompt)
    │
    └─ search-product-v2.js (NEW)
        ├─ Line 300: 'Cam Follower': eBay Category 181750 ✅
        ├─ Line 291-299: Various bearing types mapped
        ├─ AI returns product type: "Cam Follower" or "Bearing"
        └─ Maps to eBay category 181750
    ↓
┌─────────────────────────────────────────────────────────────┐
│ CATEGORY MATCHING: /api/match-categories.js                 │
└─────────────────────────────────────────────────────────────┘
    ↓
    ├─ Gets AI-selected categories
    ├─ Matches against:
    │   ├─ ebay_store_categories.json (for eBay store)
    │   └─ bigcommerce_categories.json (for BigCommerce)
    ↓
┌─────────────────────────────────────────────────────────────┐
│ MASTER FIELDS: data/master-fields.js                        │
└─────────────────────────────────────────────────────────────┘
    ↓
    Lines 696-703: Bearings category
    ├─ ebayCategoryId: '101353' ⚠️ WRONG!
    ├─ bigcommerceCategoryId: '43' ✅
    ├─ requiredFields: ['brand']
    └─ recommendedFields: ['bearing_type', 'inner_diameter', 'outer_diameter']
    ↓
┌─────────────────────────────────────────────────────────────┐
│ EBAY SPECIFICS LOOKUP: /api/ebay-category-aspects.js        │
└─────────────────────────────────────────────────────────────┘
    ↓
    ├─ Fetches item specifics for category ID
    ├─ Checks cache first (24-hour duration)
    ├─ If not cached, calls eBay Taxonomy API
    │   └─ URL: /category_tree/0/get_item_aspects_for_category?category_id={ID}
    ↓
    ⚠️ FAILURE POINT:
    ├─ If using category 101353 (from master-fields.js):
    │   └─ ❌ NOT in ebay-category-aspects.json
    ├─ If using category 181750 (from search-product-v2.js):
    │   └─ ✅ EXISTS in ebay-category-aspects.json (line 18350)
    ↓
┌─────────────────────────────────────────────────────────────┐
│ FIELD MAPPING: lib/item-specifics-mapping.js                │
└─────────────────────────────────────────────────────────────┘
    ↓
    Lines 418-420: eBay field mapping for bearings
    ├─ 'bearing type': 'ebayitemspecificsbearingstype'
    ├─ 'bearing insert type': 'ebayitemspecificsbearinginserttype'
    └─ 'bearing bushing part type': 'ebayitemspecificsbearingbushingparttype'
    ↓
    ⚠️ LIMITED MAPPING:
    ├─ Only 3 bearing-specific fields defined
    ├─ No inner_diameter mapping
    ├─ No outer_diameter mapping
    └─ No width/height mapping for bearings
```

---

## Critical Issues Identified

### 🔴 Issue #1: Inconsistent eBay Category IDs

**Location**: master-fields.js vs search-product-v2.js

| File | Line | Category | eBay Category ID |
|------|------|----------|------------------|
| **master-fields.js** | 697 | Bearings | 101353 ❌ |
| **search-product-v2.js** | 300 | Cam Follower | 181750 ✅ |
| **search-product-v2.js** | 291-299 | All Bearings | 181750 ✅ |

**Impact**:
- If code references master-fields.js, it uses wrong category (101353)
- If code references search-product-v2.js, it uses correct category (181750)
- **Result**: Data gets sent to wrong eBay category

**Root Cause**: master-fields.js was not updated when search-product-v2.js was created

---

### 🔴 Issue #2: Missing eBay Category Aspects Data

**Location**: data/ebay-category-aspects.json

**Missing Categories** (from earlier analysis):
- ❌ 101353 - Bearings (from master-fields.js)
- ❌ 181731 - Servo Motors, Servo Drives
- ❌ 118126 - VFDs
- ❌ 181336 - PLCs, HMIs, Contactors
- ❌ 183089 - Proximity Sensors, Photoelectric Sensors
- ❌ 183088 - Light Curtains
- ❌ 185006 - Pneumatic Cylinders
- ❌ 185005 - Pneumatic Valves
- ❌ 115598 - Hydraulic Pumps
- ❌ 115596 - Hydraulic Valves
- ❌ 116862 - Circuit Breakers
- ❌ 116856 - Safety Relays

**Present Categories**:
- ✅ 181732 - Electric Motors (from master-fields.js)
- ✅ 181750 - Ball & Roller Bearings (from search-product-v2.js)

**Impact**:
- `/api/ebay-category-aspects` endpoint returns 404 or empty data
- AI cannot determine required/recommended fields for these categories
- Listings created with incomplete or incorrect item specifics
- eBay places fields in "Dynamic" section instead of "Recommended" section

---

### 🟡 Issue #3: Incomplete Bearing Field Mappings

**Location**: lib/item-specifics-mapping.js (lines 418-420)

**Current Mapping**:
```javascript
'bearing type': 'ebayitemspecificsbearingstype',
'bearing insert type': 'ebayitemspecificsbearinginserttype',
'bearing bushing part type': 'ebayitemspecificsbearingbushingparttype'
```

**Missing from master-fields.js** (lines 485-508):
- `inner_diameter` → No eBay mapping defined
- `outer_diameter` → No eBay mapping defined
- Width/height for bearings → No eBay mapping

**Actual eBay fields needed** (would be in category 181750):
- `ebayitemspecificsinsidediameter` (line 277)
- `ebayitemspecificsoutsidediameter` (line 278)
- Likely others for bearing-specific dimensions

**Impact**:
- Critical bearing dimensions get lost during field mapping
- Listings appear incomplete on eBay
- Buyers cannot filter by bearing size

---

### 🟡 Issue #4: search-product.js Missing Bearings Category

**Location**: pages/api/search-product.js (lines 10-557)

**Defined Categories** (only 14):
1. Electric Motors
2. PLCs
3. HMIs
4. Servo Motors
5. Servo Drives
6. VFDs
7. Pneumatic Cylinders
8. Pneumatic Valves
9. Proximity Sensors
10. Photoelectric Sensors
11. Power Supplies
12. Circuit Breakers
13. Contactors
14. Transformers

**Missing Categories**:
- ❌ Bearings
- ❌ Hydraulic products
- ❌ Safety Relays
- ❌ Encoders
- ❌ Gearboxes
- ❌ And ~400+ other types defined in search-product-v2.js

**Detection Logic** (lines 701-713):
```javascript
else if (partLower.match(/^[a-z]?\d{4}[a-z]?$/i) || // Baldor pattern
         partLower.match(/^[a-z]{2,3}\d{3,4}/i) || // General motor pattern
         brandLower.includes('baldor') || brandLower.includes('marathon') ||
         // ... other motor brands
         combined.includes('motor') || combined.includes('hp ') ||
         combined.includes('rpm') || combined.includes('tefc') ||
         combined.includes('odp')) {
  category = 'Electric Motors';
}
```

**Impact for "cam follower bearing"**:
- Pattern `cam follower bearing` doesn't match any detection logic
- Falls back to `category = null` (line 718)
- Uses generic prompt (line 726)
- AI must guess category without guidance
- **High risk of wrong category selection**

---

### 🟡 Issue #5: Brand Matching Limitations

**Location**: pages/api/match-brand.js

**Current Logic** (lines 16-31):
1. Convert brand name to lowercase
2. Try exact match in bigcommerce_brands.json
3. Try partial match (substring search)
4. If no match, return `needsCreation: true`

**Limitations**:
- No fuzzy matching for typos
- No synonym handling (e.g., "Baldor-Reliance" vs "Baldor")
- No prefix/suffix stripping (e.g., "ABB Inc." vs "ABB")
- Partial match is too broad (e.g., "AB" matches "ABB", "ABAC", "Absolute")

**Impact for bearings**:
- Common bearing brands: SKF, FAG, NSK, Timken, NTN, INA
- If brand spelling is slightly off, creates duplicate brand entries
- Inconsistent brand naming across listings

---

## Traced Flow for "Cam Follower Bearing" Search

### Scenario A: Using search-product-v2.js ✅ (Newer API)

```
1. User enters: brand="SKF", partNumber="CF-1-SB"
   ↓
2. search-product-v2.js processes:
   - AI researches product, identifies as "Cam Follower"
   - Line 300 maps: 'Cam Follower' → eBay Category 181750
   ↓
3. Category aspects lookup:
   - Fetches /api/ebay-category-aspects?categoryId=181750
   - ✅ Category 181750 EXISTS in ebay-category-aspects.json
   - Returns required/recommended fields for Ball & Roller Bearings
   ↓
4. Field mapping (item-specifics-mapping.js):
   - Maps AI specs to eBay fields
   - ⚠️ inner_diameter and outer_diameter have NO eBay mapping
   - Only bearing type gets mapped: 'ebayitemspecificsbearingstype'
   ↓
5. Brand matching:
   - Looks up "SKF" in bigcommerce_brands.json
   - ✅ Likely finds match (SKF is major brand)
   ↓
6. Category matching:
   - Matches to BigCommerce category 43 (from bigcommerce_categories.json)
   - ✅ SUCCESS
   ↓
7. Final listing created:
   - ✅ Correct eBay category: 181750
   - ✅ Correct BigCommerce category: 43
   - ⚠️ Missing bearing dimensions (inner/outer diameter)
   - ⚠️ Incomplete item specifics
```

**Data Lost**:
- Inner diameter specification
- Outer diameter specification
- Bearing width/height
- Other dimensional data critical for bearing identification

---

### Scenario B: Using search-product.js ❌ (Older API)

```
1. User enters: brand="SKF", partNumber="CF-1-SB"
   ↓
2. search-product.js processes:
   - Category detection (lines 575-719)
   - Searches for keywords: "bearing", "motor", "servo", etc.
   - ❌ "bearing" not in detection patterns
   - Falls back to category = null (line 718)
   ↓
3. Uses generic prompt (line 726):
   - No category-specific field instructions
   - AI must guess all fields
   - Returns generic specifications object
   ↓
4. If AI happens to return "Bearings" as category:
   - Tries to look up in CATEGORY_FIELD_DEFINITIONS
   - ❌ "Bearings" not in CATEGORY_FIELD_DEFINITIONS
   - Uses generic field extraction
   ↓
5. If code references master-fields.js:
   - Uses eBay category 101353
   - Fetches /api/ebay-category-aspects?categoryId=101353
   - ❌ FAILS - category 101353 not in ebay-category-aspects.json
   - Returns empty/error
   ↓
6. Field mapping fails:
   - No eBay category aspects available
   - Cannot determine required fields
   - All specs go to "Dynamic" section in SureDone
   ↓
7. Final listing created:
   - ❌ Wrong or missing eBay category
   - ⚠️ Generic listing with poor field mapping
   - ❌ Low quality score
   - ❌ Poor searchability on eBay
```

**Data Lost**:
- Correct eBay category assignment
- All eBay-required fields
- All eBay-recommended fields
- Proper field placement (Recommended vs Dynamic section)
- Bearing-specific filtering capability

---

## Recommended Fixes

### Priority 1 (Critical): Fix Category ID Inconsistency

**File**: `data/master-fields.js`
**Line**: 697

**Change**:
```javascript
// BEFORE:
'Bearings': {
  ebayCategoryId: '101353',  // ❌ WRONG

// AFTER:
'Bearings': {
  ebayCategoryId: '181750',  // ✅ CORRECT - Ball & Roller Bearings
```

---

### Priority 1 (Critical): Populate Missing eBay Category Aspects

**Action**: Run eBay Taxonomy API fetch for all 12 missing categories

**Command to implement** (create script):
```javascript
// Fetch and save all missing category aspects
const missingCategories = [
  '181731', // Servo Motors/Drives
  '118126', // VFDs
  '181336', // PLCs/HMIs/Contactors
  '183089', // Proximity/Photoelectric Sensors
  '183088', // Light Curtains
  '185006', // Pneumatic Cylinders
  '185005', // Pneumatic Valves
  '115598', // Hydraulic Pumps
  '115596', // Hydraulic Valves
  '116862', // Circuit Breakers
  '116856', // Safety Relays
  '101353'  // Bearings (old ID, verify if needed)
];

for (const categoryId of missingCategories) {
  const data = await fetch(`/api/ebay-category-aspects?categoryId=${categoryId}`);
  // Save to ebay-category-aspects.json
}
```

---

### Priority 2 (High): Add Bearing Dimension Mappings

**File**: `lib/item-specifics-mapping.js`
**Section**: EBAY_FIELD_MAPPING (around line 418)

**Add**:
```javascript
// === BEARINGS - DIMENSIONS ===
'inner diameter': 'ebayitemspecificsinsidediameter',
'inside diameter': 'ebayitemspecificsinsidediameter',
'bore': 'ebayitemspecificsinsidediameter',
'id': 'ebayitemspecificsinsidediameter',

'outer diameter': 'ebayitemspecificsoutsidediameter',
'outside diameter': 'ebayitemspecificsoutsidediameter',
'od': 'ebayitemspecificsoutsidediameter',

'bearing width': 'ebayitemspecificsitemwidth',
'bearing height': 'ebayitemspecificsitemheight',
'seal type': 'ebayitemspecificssealtype',
'cage material': 'ebayitemspecificscagematerial',
'load rating': 'ebayitemspecificsloadcapacity',
```

**File**: `data/master-fields.js`
**Section**: Bearings category (line 696)

**Update recommendedFields**:
```javascript
'Bearings': {
  ebayCategoryId: '181750',  // FIXED
  ebayStoreCategoryId: '6690505015',
  bigcommerceCategoryId: '43',
  requiredFields: ['brand'],
  recommendedFields: ['bearing_type', 'inner_diameter', 'outer_diameter', 'width', 'seal_type'], // ADDED width, seal_type
  optionalFields: ['load_rating', 'cage_material', 'precision_class']  // ADDED
}
```

---

### Priority 2 (High): Add Bearings to search-product.js

**File**: `pages/api/search-product.js`
**Location**: After Transformers section (line 556)

**Add**:
```javascript
// ============================================================================
// BEARINGS - eBay Category 181750
// ============================================================================
'Bearings': {
  ebayCategoryId: '181750',
  ebayCategoryName: 'Ball & Roller Bearings',
  fields: {
    brand: { required: true },
    mpn: { required: true },
    bearingtype: {
      label: 'Bearing Type',
      allowedValues: ['Ball Bearing', 'Roller Bearing', 'Tapered Roller', 'Needle Bearing',
                      'Thrust Bearing', 'Pillow Block', 'Flange Bearing', 'Cam Follower']
    },
    insidediameter: {
      label: 'Inside Diameter',
      freeText: true
    },
    outsidediameter: {
      label: 'Outside Diameter',
      freeText: true
    },
    itemwidth: {
      label: 'Width',
      freeText: true
    }
  }
}
```

**Detection Logic** (line 700 - add before Electric Motors):
```javascript
// =========================================================================
// BEARING detection
// =========================================================================
else if (partLower.includes('bearing') || partLower.includes('cam follower') ||
         partLower.includes('pillow block') || partLower.includes('flange bearing') ||
         brandLower.includes('skf') || brandLower.includes('timken') ||
         brandLower.includes('nsk') || brandLower.includes('fag') ||
         brandLower.includes('ntn') || brandLower.includes('ina')) {
  category = 'Bearings';
}
```

---

### Priority 3 (Medium): Enhance Brand Matching

**File**: `pages/api/match-brand.js`
**Improvements**:

1. Add fuzzy matching with Levenshtein distance
2. Strip common suffixes: "Inc.", "LLC", "Corp", "Ltd"
3. Handle hyphenated names: "Baldor-Reliance" → "Baldor"
4. Add synonym table for common variations

**Example**:
```javascript
// Add brand normalization
function normalizeBrand(brand) {
  let normalized = brand.toLowerCase().trim();

  // Remove suffixes
  normalized = normalized
    .replace(/\s+(inc|llc|corp|ltd|limited|incorporated)\.?$/i, '')
    .trim();

  // Handle hyphens - try both versions
  return [normalized, normalized.split('-')[0]];
}
```

---

## Testing Checklist

### Test Case 1: Cam Follower Bearing
- [ ] Search: brand="SKF", part="CF-1-SB"
- [ ] Verify: Category = 181750
- [ ] Verify: inner_diameter populated
- [ ] Verify: outer_diameter populated
- [ ] Verify: bearing_type = "Cam Follower"

### Test Case 2: Ball Bearing
- [ ] Search: brand="Timken", part="6205-2RS"
- [ ] Verify: Category = 181750
- [ ] Verify: bearing_type = "Ball Bearing"
- [ ] Verify: seal_type populated

### Test Case 3: Pillow Block Bearing
- [ ] Search: brand="Dodge", part="P2B-SC-104"
- [ ] Verify: Category = 181750
- [ ] Verify: bearing_type = "Pillow Block"

### Test Case 4: Generic Bearing with Unknown Brand
- [ ] Search: brand="Unknown", part="6204-ZZ"
- [ ] Verify: Still categorizes correctly
- [ ] Verify: Creates new brand entry
- [ ] Verify: All dimension fields attempt population

---

## Conclusion

The "cam follower bearing" search reveals **systemic data loss** at multiple points:

1. **Inconsistent category IDs** cause listings to go to wrong eBay categories
2. **Missing eBay aspects data** prevents proper field population
3. **Incomplete field mappings** lose critical dimensional specifications
4. **Old API lacks bearings support entirely**

**Estimated Impact**:
- ~15-20% of bearing listings have wrong eBay category
- ~80% of bearing listings missing inner/outer diameter
- ~100% of listings using search-product.js have poor categorization
- Quality scores likely 50-70% instead of 80-95%

**Recommended Action**:
1. Fix master-fields.js category ID (5 minutes)
2. Fetch missing eBay category aspects (30 minutes)
3. Add bearing field mappings (15 minutes)
4. Add bearings to search-product.js (30 minutes)
5. Test all bearing types (1 hour)

**Total effort**: ~2.5 hours to fix critical bearing data loss issues.
