# Handoff Document — Recent Changes & System State

**Last Updated**: March 17, 2026
**System**: IPRU Warehouse Inventory Management
**Codebase**: camera-spec-finder

---

## Table of Contents

1. [Recent Changes (March 2026)](#recent-changes-march-2026)
2. [Recent Changes (February 2026)](#recent-changes-february-2026)
3. [Current Known Issues](#current-known-issues)
4. [Critical System Notes](#critical-system-notes)
5. [Architecture Quick Reference](#architecture-quick-reference)

---

## Recent Changes (March 2026)

### 1. SureDone Relist & Action Routing Fixes (c6f5ffc1)
**Files:** `pages/api/suredone/listing-action.js`, `pages/api/scanner/update-stock.js`, `pages/api/suredone/update-item.js`, `pages/api/suredone-create-listing.js`

**Problem:** Relisting items on eBay was failing for two reasons:
- Using `/start` endpoint for existing items → SureDone error 55 (SKU already exists)
- Missing `ebaytitle` field → SureDone error 62 (relist requires ebaytitle)

**Fix:**
- `listing-action.js` now ALWAYS uses POST `/relist` for existing items (never `/start`)
- Before every `/relist`, fetches item title from SureDone and sets `ebaytitle` (REQUIRED — error 62 if blank)
- Edit/revise action: checks for eBay ID → if present, uses `/edit`; if not, falls through to `/relist` (not `/start`)
- Added `googleskip=1` to ALL SureDone API calls in ALL files
- Added `ebay2skip=1` everywhere (skip secondary eBay account)
- Auto-fix for payment profile errors: clears `ebaypaymentprofileid` + `paymentprofileidebay` and retries

**SureDone API rules (CRITICAL):**
- POST form-urlencoded to `/v1/editor/items/{action}` (NOT JSON PUT)
- Always include `identifier=guid` + `guid={sku}` in form data
- Endpoints: `/edit` (update fields), `/relist` (re-list ended item), `/start` (first-time publish ONLY), `/end`, `/delete`
- NEVER send `sku` as an editable field when using `identifier=guid` (triggers error 51)
- Both `ebaypaymentprofileid` and `paymentprofileidebay` field patterns exist — clear both
- `/relist` REQUIRES `ebaytitle` to be populated (error 62 if blank)
- `/start` REJECTS existing SKUs (error 55) — use `/relist` instead

---

### 2. Background Removal: Remove.bg → Self-Hosted rembg (abbdbf12 through 90552c53)
**Files:** `pages/api/photos/remove-bg.js`, `components/PhotoEditor.js`

**What changed:** Replaced paid Remove.bg API (~$500/month) with self-hosted rembg server on DigitalOcean. Remove.bg kept as fallback.

**Server details:**
- URL: `http://104.131.11.17:7000` (env var: `REMBG_SERVER_URL`)
- Model: birefnet-general
- Endpoint: POST `/remove-bg-raw` with `Content-Type: application/octet-stream` (raw image bytes)
- Response: `{ success: true, image_base64: "...", format: "png", width: N, height: N }`
- Health check: GET `/health`

**Current pipeline (after 7 iterations of fixes):**
1. **Client-side (PhotoEditor.js):** Resize image to max 1200px, export as JPEG quality 0.85
2. **API receives base64**, decodes to buffer
3. **Pre-resize to 800px max** using sharp (CRITICAL — rembg times out on larger images)
4. Send raw bytes to rembg `/remove-bg-raw`
5. **Upscale result to 1600px** using sharp (eBay listing quality)
6. Output as PNG; if >3MB, compress to JPEG quality 90
7. **Fallback:** If rembg fails AND `REMOVE_BG_API_KEY` env var exists, falls back to Remove.bg API

**Why this pipeline matters:**
- rembg processes 95KB images in ~1.6s but 516KB images cause 30s+ timeouts
- Pre-resizing to 800px keeps processing fast
- Upscaling to 1600px after ensures eBay-quality images
- Vercel has 4.5MB response limit, so JPEG compression fallback is needed
- `maxDuration: 30` set in API config

**Previous iterations that failed:**
1. URL-encoded base64 → too large for form body
2. Multipart file upload → server parsing issues
3. Raw bytes worked but response too large → Vercel crash
4. Added sharp resize after → sharp autoCrop/scale caused timeouts
5. Stripped autoCrop/scale → still timing out on large inputs
6. Added pre-resize to 800px before rembg → **WORKING** (current)

---

### 3. Scanner Lookup Case-Sensitivity Fix (b40adb0c)
**File:** `pages/api/scanner/lookup.js`

**Problem:** Desktop scanner stopped finding existing listings:
1. Firebase brand matching was case-sensitive — `data.brand?.toUpperCase().includes(brand)` broke because `brand` was no longer pre-uppercased
2. Firebase queries only searched lowercase partNumber

**Fix:**
- Changed brand matching to use existing `verifyBrand()` function (normalized soft matching)
- Added uppercase `partNumber` variant to Firebase queries

---

### 4. Shipping Measurements in Scanner (e15c8af5)
**Files:** `pages/scanner.js`, `pages/api/scanner/update-stock.js`

Added shipping measurement fields (boxlength, boxwidth, boxheight, weight) to scanner stock updates. Queue badge shows on lookup matches.

**Note:** Collapsible UI for shipping fields in add-stock/new-item screens was planned but NOT built yet. The API support exists.

---

### 5. Additional SureDone Fixes (various commits)
- `93dc2f81` — Verify stock before auto-relist + skip ebay2
- `d3bc204b` — Smart edit/revise: detect no eBay ID and use /start instead
- `63c545f9` — Clear eBay channel overrides (ebayprice/ebaytitle) that block listings

---

## Recent Changes (February 2026)

### Photo Upload Size Limit Increase
- Increased API body size to 20MB in `pages/api/photos/upload-simple.js`
- Reduced JPEG quality to 0.95 (smaller files, no visible quality loss)

### Photo Station File Upload
- Added single-slot and bulk upload modes to `pages/photos.js`
- Drag & drop for multiple files, auto-assigns to empty slots

### Unified Login System
- Replaced 3 separate PIN-based auth systems with single UserPicker
- `lib/users.js` is the single source of truth
- `ipru_current_user` localStorage key shared across all tools

### Claude API Retry Logic
- Exponential backoff for 529/503/429 errors (2s → 4s → 8s, 3 retries)
- Frontend auto-retry after 5s
- Applied to all 6 AI research endpoints

### Firebase Print Queue
- `cfef6209` — Firebase-based print queue for mobile Zebra label printing
- Chrome extension integration via postMessage API

---

## Current Known Issues

### 1. SKU Counter Reset (Manual Fix Needed)
**Status:** Needs manual Firestore fix
**File:** `lib/sku-generator.js`

Firestore document `counters/sku_counter` had its `currentNumber` reset to 0. New SKUs started over at AI0001.

**Fix:** Go to Firebase Console → Firestore → `counters/sku_counter` → set `currentNumber` to the highest existing SKU number (e.g., if last SKU was AI0847, set to 847).

This is NOT a code bug — the sku-generator.js logic is correct.

### 2. Background Removal May Need Testing
The rembg pipeline went through 7 iterations. Current version (commit `90552c53`) should work but watch for:
- Timeout errors (should be fixed by pre-resize to 800px)
- Response size errors (should be fixed by JPEG compression fallback)
- Quality concerns (upscale from 800px to 1600px may lose fine detail)

### 3. Shipping Measurements UI Incomplete
Scanner add-stock and new-item screens need a collapsible shipping fields UI. API/state support exists, frontend UI not built.

---

## Critical System Notes

### SureDone API (NEVER FORGET)
- POST form-urlencoded (NOT JSON PUT) to `/v1/editor/items/{action}`
- Always: `identifier=guid`, `guid={sku}`, `ebay2skip=1`, `googleskip=1`
- `/relist` requires `ebaytitle` populated (error 62)
- `/start` rejects existing SKUs (error 55) — use `/relist`
- Clear both `ebaypaymentprofileid` AND `paymentprofileidebay`

### Web Search in AI Research (NEVER REMOVE)
**File**: `pages/api/search-product-v2.js`

Web search is essential for identifying obscure industrial parts. Removing it caused a major regression on 2/9/2026. The `tools: [{ type: 'web_search_20250305', name: 'web_search' }]` line must stay.

### Last Text Block Parsing (CRITICAL)
When web search is enabled, Claude returns multiple content blocks. Always parse the LAST text block:
```javascript
const textBlocks = response.content.filter(b => b.type === 'text' && b.text);
const text = textBlocks[textBlocks.length - 1].text;
```
Using `response.content?.[0]?.text` gets the search query, not the answer.

### Condition Field Mapping
- `new_in_box` → "New"
- `new_open_box` → "New Other"
- `like_new_excellent` / `used_good` → "Used"
- `for_parts` → "For parts or not working"
- `refurbished` → "Seller refurbished"

---

## Architecture Quick Reference

- **Framework:** Next.js (pages router) deployed on Vercel
- **Database:** Firebase Firestore (product data, SKU counter, print queue)
- **Inventory:** SureDone (multi-channel listing management)
- **Channels:** eBay (primary), BigCommerce, Google Shopping (skipped)
- **Image processing:** Sharp (Node.js), self-hosted rembg (DigitalOcean)
- **Label printing:** Zebra printer via Chrome extension (postMessage API)
- **AI:** Anthropic Claude with web search for product research

### Key Environment Variables
- `ANTHROPIC_API_KEY` — Claude API
- `SUREDONE_USER`, `SUREDONE_TOKEN` — SureDone API
- `REMBG_SERVER_URL` — Self-hosted rembg (fallback: `http://104.131.11.17:7000`)
- `REMOVE_BG_API_KEY` — Remove.bg fallback (optional)
- Firebase config vars (client + admin SDK)

### Key Files
- `pages/api/suredone/listing-action.js` — Central listing action router (start/relist/end/revise/delete)
- `pages/api/suredone/update-item.js` — Pro Builder item updates
- `pages/api/suredone-create-listing.js` — New listing creation
- `pages/api/scanner/update-stock.js` — Stock updates + auto-relist
- `pages/api/scanner/lookup.js` — Scanner barcode/model lookup
- `pages/api/photos/remove-bg.js` — Background removal API
- `components/PhotoEditor.js` — Photo editing UI (crop, bg removal, etc.)
- `pages/api/search-product-v2.js` — Main AI product research
- `lib/suredone-config.js` — SureDone credentials helper
- `lib/sku-generator.js` — SKU generation (AI0001-AI9999)
- `lib/users.js` — Unified user management
- `lib/field-name-resolver.js` — AI field name → SureDone mapping

---

**End of Handoff Document**
*Generated: March 17, 2026*
*Recent sessions: relist routing fixes, rembg migration, scanner lookup fix*
