# System Specification

**Project:** Industrial Equipment Listing Builder
**Stack:** Next.js 16.1.4 / React 18 / Tailwind CSS / Firebase Firestore / SureDone API
**AI:** Anthropic Claude (claude-sonnet-4-20250514) with web search
**Last updated:** 2026-02-09

---

## Architecture Overview

This is a Next.js application that helps create eBay and BigCommerce product listings for industrial equipment (motors, PLCs, sensors, drives, bearings, etc.). It uses AI to research products, detect categories, fill eBay item specifics, and generate titles/descriptions. Listings are submitted to SureDone, which syndicates to eBay and BigCommerce.

### External Services

| Service | Purpose |
|---|---|
| **Firebase Firestore** | Persistent queue/state for listing items |
| **Anthropic API** | Product research, spec extraction, title/description generation |
| **SureDone API** | Listing creation/updates, syndicates to eBay + BigCommerce |
| **eBay Taxonomy API** | Category aspect definitions (item specifics schema) |
| **eBay Browse/Trading API** | Token management, listing validation |

---

## Frontend Pages

### /pro (Primary — `pages/pro.js`, 2,646 lines)

The production listing builder. Full-featured single-page app.

**Capabilities:**
- Camera/image OCR for brand+part extraction (`/api/process-image`)
- Brand/part number manual entry with real-time duplicate detection (`InventoryCheckAlert`)
- SKU Lookup to search existing SureDone listings (`SkuLookup` component)
- Comparison Panel for side-by-side existing vs new data (160+ spec fields)
- AI product research (Pass 1) with auto Pass 2 eBay specifics fill
- Full eBay item specifics editing UI (Required/Recommended/Optional sections)
- 309 embedded eBay marketplace categories with manual override dropdown
- Hierarchical eBay store category selectors
- BigCommerce category tracking
- Condition selection (8 options)
- Create new listings AND edit existing ones
- Quality flag system (STRONG / NEEDS_REVIEW / EDITING)
- Keyword generation

**State:** Firebase `products` collection
**Search API:** `/api/search-product-v2`
**Listing API:** `/api/suredone-create-listing` (create) + `/api/suredone/update-item` (edit)

### /pro-v2 (Experimental — `pages/pro-v2.js`, 913 lines)

Clean rewrite with server-delegated architecture. Not yet feature-complete.

**Capabilities:**
- 5-stage pipeline with human confirmation gates
- Condition selection (9 options, adds Manufacturer Refurbished)
- Shipping profile selector
- Description HTML/Preview toggle
- Categories determined server-side (no embedded lookup tables)

**Missing vs /pro:** No camera OCR, no SKU lookup, no comparison panel, no edit-existing, no BigCommerce, no manual category override, no keyword generation.

**State:** Firebase `products-v2` collection
**Search API:** `/api/v2/research-product`
**Listing API:** `/api/v2/submit-listing`

### /tools/* (Utility Pages)

| Route | Component | Purpose |
|---|---|---|
| `/tools/ai-autofix` | `AIAutoFix` | AI-powered listing issue fixer |
| `/tools/bulk-audit` | `BulkAuditTool` | Batch audit existing listings |
| `/tools/category-health` | `CategoryHealthCheck` | Verify category assignments |
| `/tools/listing-manager` | `UnifiedListingManager` | Browse/manage SureDone inventory |
| `/tools/listing-quality` | `ListingQualityEditor` | Edit and improve listing quality |

---

## API Endpoints

### Product Research

#### `/api/search-product-v2` (1,025 lines) — Used by /pro

The primary research endpoint. Single AI call with web search, then maps results to eBay + store categories.

**Input:** `{ brand, partNumber }`
**Process:**
1. AI researches product with web search tool
2. AI returns `productType` (e.g., "AC Motor", "PLC", "Proximity Sensor")
3. Server maps productType → eBay Category ID (413+ entries in `PRODUCT_TYPE_TO_EBAY_CATEGORY`)
4. Server maps productType → eBay Store Category ID (400+ entries in `PRODUCT_TYPE_TO_STORE_CATEGORY`)
5. Server fetches eBay aspects via `/api/ebay-category-aspects?categoryId=...`

**Output:**
```json
{
  "content": [ /* AI response blocks */ ],
  "_metadata": {
    "productType": "AC Motor",
    "detectedCategory": "Electric Motors",
    "detectedCategoryId": "181732",
    "ebayStoreCategoryId": "2242358015",
    "ebayStoreCategoryId2": "23399313015",
    "ebayAspectsLoaded": true,
    "totalAspects": 45
  },
  "_ebayAspects": {
    "categoryId": "181732",
    "required": [...],
    "recommended": [...],
    "optional": [...],
    "all": [...],
    "fieldMapping": {...}
  }
}
```

## Critical Configuration — DO NOT CHANGE
- search-product-v2.js MUST have web search enabled:
  `tools: [{ type: 'web_search_20250305', name: 'web_search' }]`
- Response parsing MUST use the LAST text block pattern (not join, not first)
- Removing web search causes AI to fail on obscure industrial parts
- This was a confirmed regression on 2/9/2026 — do not repeat it

#### `/api/search-product` (912 lines) — Legacy v1

Original research endpoint. Still exists but no longer called by /pro (was switched to v2).

**Key differences from v2:**
- Returns `product.productCategory` (not `productType`)
- Returns `product.ebayCategory.id` (nested, not flat)
- Has no `_metadata`, no `_ebayAspects`
- Has 15 hardcoded category definitions in `CATEGORY_FIELD_DEFINITIONS`
- Includes `_categoryDefinitions` and `_countryOfOriginValues` in response

#### `/api/v2/research-product` (266 lines) — Used by /pro-v2

Separate v2 architecture endpoint. Uses Anthropic SDK (not raw fetch).

**Input:** `{ brand, partNumber, condition }`
**Output:** `{ success, stage, data: { title, productType, description, specifications, condition } }`

### eBay Category Aspects

#### `/api/ebay-category-aspects` (151 lines)

Fetches real-time item specifics schema from eBay Taxonomy API for a given category.

**Input:** `GET ?categoryId=181732`
**Output:** `{ categoryId, totalAspects, required, recommended, optional, all, fieldMapping }`
**Caching:** In-memory Map, 24-hour TTL

### Pass 2 — eBay Item Specifics

#### `/api/v2/auto-fill-ebay-specifics` (266 lines) — Used by /pro

Called automatically after Pass 1. Takes eBay aspects + Pass 1 specs, AI fills all fields.

**Input:** `{ brand, partNumber, productType, ebayAspects, pass1Specs, title }`
**Output:** `{ success, data: { specificsForUI, specificsForSuredone, filledCount, totalCount } }`

Returns both UI format (for editing) and SureDone-ready format (field name → value).

#### `/api/v2/fill-specifics` (277 lines) — Used by /pro-v2

Alternative Pass 2 endpoint with explicit `EBAY_TO_SUREDONE_FIELD_MAP` (107 mappings).

**Input:** `{ brand, partNumber, productType, itemSpecifics, knownSpecs }`

#### `/api/v2/get-category-specifics` (376 lines) — Used by /pro-v2

Maps productType to eBay category, then fetches aspects. Combines lookup + fetch in one call.

### Pass 3 — Listing Revision

#### `/api/v2/revise-listing` (228 lines)

Compares filled item specifics against existing title/description and enriches them.

**Input:** `{ brand, partNumber, productType, title, description, shortDescription, filledSpecifics, condition }`
**Output:** `{ success, data: { title, description, shortDescription, keywords, changes } }`

**Note:** Not yet wired into either /pro or /pro-v2 frontend.

### Listing Submission

#### `/api/suredone-create-listing` (915 lines) — Used by /pro

Full-featured SureDone submission with UPC assignment, BigCommerce multi-categories, and comprehensive eBay item specifics.

**Key features:**
- UPC pool assignment from `data/upc_pool.json`
- Brand ID lookup: `bigcommerce_brands.json` (2,556 brands) → fallback to hardcoded `BRAND_IDS`
- BigCommerce categories: `BIGCOMMERCE_CATEGORY_MAP` (200+ product type → category array mappings)
- Format: `JSON.stringify(['26', '30'])` → `'["26","30"]'`
- `SPEC_TO_EBAY_FIELD` mapping for eBay item specifics (motor-centric, applied to all types)
- `generateUserType()` for SureDone usertype field
- Condition notes injected into description HTML
- Shipping profile: `69077991015` (default)
- Return profile: `61860297015` (default)

**SureDone API:** POST to `https://api.suredone.com/v1/editor/items/add`
**Auth:** `X-Auth-User` + `X-Auth-Token` headers from env vars

#### `/api/v2/submit-listing` (484 lines) — Used by /pro-v2

Cleaner submission endpoint. BigCommerce categories as pre-formatted JSON strings.

**Key differences from v1:**
- Categories stored as string literals: `'["26","30"]'` (not computed at runtime)
- Simpler field mapping
- No SPEC_TO_EBAY_FIELD (relies on Pass 2 output)

### Supporting APIs

| Endpoint | Purpose |
|---|---|
| `/api/process-image` | OCR extraction of brand/part from photos |
| `/api/check-inventory` | Duplicate SKU detection |
| `/api/suredone-check-sku` | Check if SKU exists in SureDone |
| `/api/suredone/get-item` | Fetch existing SureDone listing by SKU |
| `/api/suredone/update-item` | Update existing SureDone listing |
| `/api/assign-upc` | Get next available UPC from pool |
| `/api/match-brand` | Fuzzy brand name matching |
| `/api/match-categories` | Category matching helper |
| `/api/price-research` | Price comparison research |
| `/api/ebay-token` | eBay OAuth token management |
| `/api/ebay/get-access-token` | eBay token refresh |
| `/api/ebay/check-category` | Validate eBay category ID |
| `/api/ebay/validate-listing` | Pre-submission listing validation |
| `/api/ai/extract-specs` | AI-based spec extraction |
| `/api/debug-suredone` | Debug SureDone connection |
| `/api/v2/debug-suredone` | Debug SureDone connection (v2) |
| `/api/ebay-field-options` | eBay field allowed values |

---

## Data Files

| File | Contents |
|---|---|
| `data/bigcommerce_brands.json` | 2,556 brands with BigCommerce IDs |
| `data/bigcommerce_categories.json` | BigCommerce category tree |
| `data/ebay_store_categories.json` | eBay store category hierarchy |
| `data/ebay-category-aspects.json` | Cached eBay category aspect definitions |
| `data/condition_options.json` | Item condition presets |
| `data/shipping_profiles.json` | eBay shipping profile IDs |
| `data/upc_pool.json` | Available UPC codes for assignment |

---

## Components

| Component | Used By | Purpose |
|---|---|---|
| `InventoryCheckAlert` | /pro | Real-time duplicate warning on brand/part entry |
| `SkuLookup` | /pro | Search existing SureDone listings by SKU |
| `ExistingListingPanel` | /pro | Display/compare existing listing data |
| `AIAutoFix` | /tools/ai-autofix | AI-powered listing fixer |
| `BulkAuditTool` | /tools/bulk-audit | Batch listing audit |
| `CategoryHealthCheck` | /tools/category-health | Category assignment verification |
| `UnifiedListingManager` | /tools/listing-manager | Inventory browser |
| `ListingQualityEditor` | /tools/listing-quality | Quality editing tool |

---

## Data Flow: /pro Listing Creation

```
User enters Brand + Part Number
         │
         ▼
┌─────────────────────────────────┐
│  PASS 1: /api/search-product-v2 │
│  • AI researches product (web)  │
│  • Detects productType          │
│  • Maps → eBay Category ID      │
│  • Maps → Store Category ID     │
│  • Fetches eBay aspects          │
└─────────────┬───────────────────┘
              │
              ▼
┌─────────────────────────────────────────┐
│  PASS 2: /api/v2/auto-fill-ebay-specifics│
│  • Takes eBay aspects + Pass 1 specs    │
│  • AI fills all item specifics          │
│  • Returns UI format + SureDone format  │
│  (auto-fires if _ebayAspects present)   │
└─────────────┬───────────────────────────┘
              │
              ▼
┌─────────────────────────────────────┐
│  User reviews/edits in UI           │
│  • Title, description, specs        │
│  • eBay item specifics (dropdowns)  │
│  • Condition, price, shipping       │
│  • Category overrides if needed     │
└─────────────┬───────────────────────┘
              │
              ▼
┌─────────────────────────────────────────┐
│  SUBMIT: /api/suredone-create-listing    │
│  • Formats all fields for SureDone API  │
│  • Assigns UPC from pool                │
│  • Maps BigCommerce categories          │
│  • Resolves brand ID                    │
│  • Builds URLSearchParams POST body     │
│  • POSTs to SureDone /v1/editor/items   │
└─────────────────────────────────────────┘
```

---

## Known Issues & Gaps

1. **Pass 3 not wired up.** `/api/v2/revise-listing` exists but neither /pro nor /pro-v2 calls it. Title/description revision after Pass 2 does not happen.

2. **ebayItemSpecificsForSuredone not consumed.** Pass 2 output (`specificsForSuredone`) is stored in Firebase but neither `suredone-create-listing` nor `v2/submit-listing` reads it from the submitted payload. The listing endpoints use their own `SPEC_TO_EBAY_FIELD` mapping instead.

3. **SPEC_TO_EBAY_FIELD is motor-centric.** In `suredone-create-listing`, the spec-to-eBay field mapping (e.g., `type` → `acmotortype`, `voltage` → `nominalratedinputvoltage`) is applied to ALL product types, not just motors.

4. **BigCommerce category format uncertainty.** Categories changed from comma-separated (`'23,26,30'`) to JSON array (`'["26","30"]'`). Whether SureDone accepts this format has not been verified in production.

5. **Two parallel listing systems.** /pro and /pro-v2 use different Firebase collections (`products` vs `products-v2`), different API endpoints, and different submission flows. They do not share state.

---

## Environment Variables

```
ANTHROPIC_API_KEY          — Anthropic API key for Claude
SUREDONE_API_USER          — SureDone API username
SUREDONE_API_TOKEN         — SureDone API token
EBAY_CLIENT_ID             — eBay OAuth client ID
EBAY_CLIENT_SECRET         — eBay OAuth client secret
EBAY_REFRESH_TOKEN         — eBay OAuth refresh token
```

Firebase config is hardcoded in `firebase.js` (project: `camera-spec-finder`).

---

## File Structure

```
camera-spec-finder/
├── pages/
│   ├── pro.js                          # Primary listing builder (2,646 lines)
│   ├── pro-v2.js                       # Experimental rewrite (913 lines)
│   ├── index.js                        # Landing page
│   ├── _app.js                         # Next.js app wrapper
│   ├── tools/
│   │   ├── ai-autofix.js
│   │   ├── bulk-audit.js
│   │   ├── category-health.js
│   │   ├── listing-manager.js
│   │   └── listing-quality.js
│   └── api/
│       ├── search-product.js           # v1 research (legacy, still exists)
│       ├── search-product-v2.js        # v2 research (used by /pro)
│       ├── suredone-create-listing.js  # Listing submission (used by /pro)
│       ├── ebay-category-aspects.js    # eBay Taxonomy API proxy
│       ├── ebay-token.js               # eBay OAuth token
│       ├── process-image.js            # OCR
│       ├── check-inventory.js          # Duplicate detection
│       ├── assign-upc.js              # UPC pool
│       ├── match-brand.js             # Brand matching
│       ├── match-categories.js        # Category matching
│       ├── price-research.js          # Price research
│       ├── suredone-check-sku.js      # SKU check
│       ├── debug-suredone.js          # Debug
│       ├── ebay-field-options.js      # Field options
│       ├── ai/
│       │   └── extract-specs.js       # AI spec extraction
│       ├── ebay/
│       │   ├── get-access-token.js
│       │   ├── check-category.js
│       │   ├── get-category-aspects.js
│       │   └── validate-listing.js
│       ├── suredone/
│       │   ├── get-item.js
│       │   ├── update-item.js
│       │   └── debug-get-item.js
│       └── v2/
│           ├── research-product.js     # Pass 1 (used by /pro-v2)
│           ├── get-category-specifics.js
│           ├── auto-fill-ebay-specifics.js  # Pass 2 (used by /pro)
│           ├── fill-specifics.js       # Pass 2 alt (used by /pro-v2)
│           ├── revise-listing.js       # Pass 3 (not wired up)
│           ├── submit-listing.js       # Submission (used by /pro-v2)
│           └── debug-suredone.js
├── components/
│   ├── InventoryCheckAlert.js
│   ├── SkuLookup.js
│   ├── ExistingListingPanel.js
│   ├── AIAutoFix.js
│   ├── BulkAuditTool.js
│   ├── CategoryHealthCheck.js
│   ├── UnifiedListingManager.js
│   └── ListingQualityEditor.js
├── data/
│   ├── bigcommerce_brands.json        # 2,556 brands
│   ├── bigcommerce_categories.json
│   ├── ebay_store_categories.json
│   ├── ebay-category-aspects.json
│   ├── condition_options.json
│   ├── shipping_profiles.json
│   └── upc_pool.json
├── archive/                            # Old/backup files moved out of pages/
├── firebase.js                         # Firebase singleton init
├── package.json
├── tailwind.config.js
├── postcss.config.js
└── next.config.js
```
