# SYSTEM AUDIT — IPRU (Industrial Parts Resale Utility)

> Generated: 2026-02-24
> Purpose: Full codebase state for external Claude review. Do not fix — report only.

---

## 1. File Inventory

### Pages (`pages/`)

| File | Lines | Description |
|------|------:|-------------|
| `_app.js` | 5 | Next.js app wrapper — imports global CSS |
| `index.js` | 559 | Original camera spec finder app — image upload queue with Claude AI analysis |
| `scanner.js` | 1,036 | Warehouse barcode scanner — lookup parts, manage stock, shelf return queue |
| `photos.js` | 1,365 | Photo Station — guided 4-view capture, Remove.bg, watermark, upload to Firebase |
| `pro.js` | 4,875 | Pro Listing Builder — main listing editor, AI research, send to SureDone/eBay |
| `pro-v2.js` | 913 | Alternate Pro Builder (v2) — streamlined listing builder with Firebase |
| `dashboard.js` | 1,117 | Admin dashboard — daily stats, worker status, inventory health |
| `admin.js` | 1,217 | Admin panel — SureDone config, team management, system tools |
| `scanner-test.js` | 200 | Diagnostic tool — test SureDone lookups by SKU/part number/brand |
| `tools/ai-autofix.js` | 9 | Page wrapper → `<AIAutoFix />` |
| `tools/bulk-audit.js` | 10 | Page wrapper → `<BulkAuditTool />` |
| `tools/category-health.js` | 9 | Page wrapper → `<CategoryHealthCheck />` |
| `tools/listing-manager.js` | 9 | Page wrapper → `<UnifiedListingManager />` |
| `tools/listing-quality.js` | 10 | Page wrapper → `<ListingQualityEditor />` |

### API Routes (`pages/api/`)

#### Scanner APIs

| File | Lines | Description |
|------|------:|-------------|
| `scanner/lookup.js` | 329 | Search SureDone by SKU, part number, or brand — returns matches |
| `scanner/update-stock.js` | 248 | Create new product or update stock in Firebase + SureDone |
| `scanner/check-duplicate.js` | 129 | Check if part number already exists across Firebase products |
| `scanner/diagnose.js` | 185 | Debug SureDone item lookups with detailed response info |

#### Photo APIs

| File | Lines | Description |
|------|------:|-------------|
| `photos/queue.js` | 141 | Get photo queue — items with `photoCount == 0` or `status == 'needs_photos'` |
| `photos/remove-bg.js` | 166 | Remove.bg API proxy — removes background, auto-crops, applies templates |
| `photos/watermark.js` | 175 | Apply logo/contact watermark to product photos (2000×2000 eBay format) |
| `photos/generate-alt-text.js` | 201 | Claude AI generates SEO alt text for product images |
| `photos/upload.js` | 144 | Upload photo to Firebase Storage (server-side) |
| `photos/upload-simple.js` | 71 | Simplified photo upload endpoint |
| `photos/proxy-image.js` | 43 | CORS proxy for fetching external images |

#### AI / Research APIs

| File | Lines | Description |
|------|------:|-------------|
| `search-product-v2.js` | 1,229 | Main AI product research — Claude with web search, specs extraction |
| `search-product.js` | 912 | Original product research (v1) |
| `auto-research.js` | 264 | Fire-and-forget AI research trigger for newly scanned items |
| `match-categories.js` | 117 | Claude AI matches product to eBay category |
| `match-brand.js` | 197 | Fuzzy brand matching against SureDone brand ID database |
| `price-research.js` | 112 | Claude AI for market price estimation |
| `process-image.js` | 34 | Image processing utility endpoint |
| `ai/extract-specs.js` | 209 | Claude AI extracts specifications from product title/description |

#### SureDone APIs

| File | Lines | Description |
|------|------:|-------------|
| `suredone-create-listing.js` | 1,690 | Full listing creation — photos, watermarks, alt text, eBay specifics, UPC |
| `suredone-check-sku.js` | 31 | Check if SKU exists in SureDone |
| `suredone/get-item.js` | 461 | Get full item data from SureDone by SKU |
| `suredone/update-item.js` | 199 | Update existing SureDone listing |
| `suredone/search.js` | 96 | Search SureDone inventory |
| `suredone/get-field-list.js` | 357 | Get SureDone custom field definitions |
| `suredone/get-listing-urls.js` | 117 | Get eBay/BigCommerce URLs for a listing |
| `suredone/listing-action.js` | 246 | Relist/end/revise eBay listings via SureDone |
| `suredone/debug-get-item.js` | 156 | Debug version of get-item with raw response |

#### eBay APIs

| File | Lines | Description |
|------|------:|-------------|
| `ebay-token.js` | 86 | Get eBay OAuth access token |
| `ebay-category-aspects.js` | 151 | Get required item specifics for an eBay category |
| `ebay-field-options.js` | 184 | Get allowed values for eBay category fields |
| `ebay/get-access-token.js` | 65 | eBay OAuth token (v2 endpoint) |
| `ebay/check-category.js` | 63 | Verify if an eBay category ID is valid |
| `ebay/get-category-aspects.js` | 126 | Get eBay category aspects (v2 endpoint) |
| `ebay/taxonomy-search.js` | 79 | Search eBay taxonomy for category by keyword |
| `ebay/validate-listing.js` | 200 | Validate listing data against eBay requirements |

#### V2 API Routes

| File | Lines | Description |
|------|------:|-------------|
| `v2/research-product.js` | 295 | Product research with Claude retry logic |
| `v2/revise-listing.js` | 257 | Revise existing listing via Claude AI |
| `v2/fill-specifics.js` | 306 | AI fills missing eBay item specifics |
| `v2/auto-fill-ebay-specifics.js` | 294 | Auto-populate eBay category-specific fields |
| `v2/get-category-specifics.js` | 376 | Get eBay category specifics with caching |
| `v2/submit-listing.js` | 484 | Submit listing to SureDone (v2 flow) |
| `v2/debug-suredone.js` | 126 | Debug SureDone API calls |

#### Task / Cron APIs

| File | Lines | Description |
|------|------:|-------------|
| `tasks/escalate.js` | 202 | Cron: escalate unacknowledged part requests every 2 min |
| `tasks/morning-reminder.js` | 85 | Cron: 8:15 AM EST morning scanning reminder |
| `tasks/daily-summary.js` | 181 | Cron: 5:00 PM EST daily activity summary |
| `tasks/complete.js` | 173 | Mark part request task as completed |
| `tasks/snooze.js` | 73 | Snooze a part request alert |
| `tasks/clear-all.js` | 67 | Clear all pending part requests |

#### Inventory APIs

| File | Lines | Description |
|------|------:|-------------|
| `inventory/crawl.js` | 339 | Cron: daily 6 AM EST — crawl all SureDone items, score quality, queue refreshes |
| `inventory/weekly-report.js` | 149 | Cron: Saturday 8 PM EST — weekly listing quality report |

#### Other APIs

| File | Lines | Description |
|------|------:|-------------|
| `notify.js` | 267 | Send FCM push notifications to users by ID or role |
| `devices/remove.js` | 55 | Remove FCM device token from user |
| `generate-sku.js` | 30 | Generate next AI#### SKU via atomic Firestore counter |
| `assign-upc.js` | 80 | Assign next available UPC from pre-loaded pool |
| `check-inventory.js` | 322 | Check SureDone inventory for duplicate/existing parts |
| `debug-suredone.js` | 62 | Debug SureDone API connectivity |
| `brand-ids-update.js` | 306 | **Not an endpoint** — exports a constant brand ID mapping object |

### Components (`components/`)

| File | Lines | Description |
|------|------:|-------------|
| `UserPicker.jsx` | 59 | Shared login modal — groups team members by role, writes to localStorage |
| `NotificationCenter.jsx` | 519 | Push notification UI — FCM registration, permission prompts, alert history |
| `PartRequestModal.jsx` | 174 | "Request Part" modal — sends push notifications to warehouse workers |
| `PhotoEditor.js` | 751 | Photo editor — zoom, pan, rotate, brightness, crop to 2000×2000 eBay format |
| `ExistingListingPanel.js` | 326 | Side panel showing current SureDone listing for comparison |
| `InventoryCheckAlert.js` | 473 | Displays existing inventory matches during scanning |
| `SkuLookup.js` | 128 | SKU lookup input for loading existing listings |
| `AIAutoFix.js` | 632 | AI auto-fix tool — extracts specs from titles, populates missing fields |
| `BulkAuditTool.js` | 582 | Bulk audit — scans multiple SKUs against eBay category requirements |
| `CategoryHealthCheck.js` | 526 | Scans listings for invalid/outdated eBay category IDs |
| `ListingQualityEditor.js` | 1,041 | Listing quality analyzer — scores against eBay requirements, suggests improvements |
| `UnifiedListingManager.js` | 913 | All-in-one listing manager — lookup, AI specs, SureDone updates |

### Libraries (`lib/`)

| File | Lines | Description |
|------|------:|-------------|
| `users.js` | 66 | User identity — TEAM_MEMBERS array, localStorage get/set/clear, role checks |
| `auth.js` | 77 | **DEAD CODE** — old Firestore PIN-based auth, no longer imported anywhere |
| `sku-generator.js` | 98 | SKU generation — atomic Firestore counter, format AI0001-AI9999 |
| `item-specifics-mapping.js` | 769 | Maps AI-extracted specs → eBay item specifics + website standardized fields |
| `field-name-resolver.js` | 214 | Three-tier field resolution: eBay aspect names → SureDone field names |
| `listingScorer.js` | 222 | Quality scoring engine — returns 0-100 based on title, description, photos, fields |
| `notificationService.js` | 209 | Client-side FCM service — token management, permission prompts, foreground handling |
| `coil-voltage-normalizer.js` | 75 | Normalizes voltage values (e.g., "24vdc" → "24V DC") for consistent filtering |

### Config Files (root)

| File | Lines | Description |
|------|------:|-------------|
| `firebase.js` | 27 | Firebase client SDK init — Firestore, Storage, Auth (hardcoded config) |
| `next.config.js` | 5 | Next.js config — default settings |
| `vercel.json` | 53 | Vercel config — 5 cron job schedules, function maxDuration settings |
| `package.json` | 26 | Dependencies and scripts |
| `styles/globals.css` | 2 | Tailwind CSS imports |

### Public Assets (`public/`)

| File/Dir | Description |
|----------|-------------|
| `firebase-messaging-sw.js` (189 lines) | FCM service worker — notification display, click/close handlers, vibration patterns, action buttons |
| `favicon-*.svg` (5 files) | Page-specific favicons: admin, dashboard, photos, pro, scanner |
| `bg-templates/` (3 JPGs) | Remove.bg background templates: industrial, studio-gradient, warehouse-floor |
| `watermarks/` (2 PNGs + README) | Watermark overlays: logo.png, contact-info.png |

### Project Totals

| Category | Files | Lines |
|----------|------:|------:|
| Pages | 14 | 10,324 |
| API Routes | 43 | 12,542 |
| Components | 12 | 6,124 |
| Libraries | 8 | 1,730 |
| Config | 5 | 113 |
| Public JS | 1 | 189 |
| **TOTAL** | **83** | **31,022** |

---

## 2. Authentication / User System

### Architecture

**There is no real authentication.** The system uses a localStorage-based name picker. No passwords, tokens, sessions, or server-side validation exist.

### Core Files

**`lib/users.js`** — The identity module:

```javascript
export const TEAM_MEMBERS = [
  { id: 'scott',   name: 'Scott',   role: 'admin',     capabilities: ['admin', 'warehouse', 'listing', 'photos'], color: '#3b82f6' },
  { id: 'mikayla', name: 'Mikayla', role: 'admin',     capabilities: ['admin', 'warehouse', 'listing', 'photos'], color: '#f97316' },
  { id: 'dade',    name: 'Dade',    role: 'warehouse', capabilities: ['warehouse'],                               color: '#10b981' },
  { id: 'gavin',   name: 'Gavin',   role: 'warehouse', capabilities: ['warehouse'],                               color: '#f59e0b' },
  { id: 'donald',  name: 'Donald',  role: 'warehouse', capabilities: ['warehouse'],                               color: '#ef4444' },
  { id: 'doug',    name: 'Doug',    role: 'warehouse', capabilities: ['warehouse'],                               color: '#6b7280' },
  { id: 'austin',  name: 'Austin',  role: 'warehouse', capabilities: ['warehouse', 'listing'],                    color: '#06b6d4' },
  { id: 'beth',    name: 'Beth',    role: 'listing',   capabilities: ['listing'],                                 color: '#8b5cf6' },
  { id: 'bean',    name: 'Bean',    role: 'listing',   capabilities: ['listing'],                                 color: '#ec4899' },
  { id: 'claire',  name: 'Claire',  role: 'photos',    capabilities: ['photos'],                                  color: '#14b8a6' },
];
```

10 team members, 4 roles. **No `username` property exists** — only `id` and `name`.

### Exported Functions

| Function | Signature | Description |
|---|---|---|
| `getCurrentUser()` | `() → object \| null` | Reads `ipru_current_user` from localStorage; SSR-safe |
| `setCurrentUser(user)` | `(user) → void` | Writes full user object to localStorage |
| `clearCurrentUser()` | `() → void` | Removes `ipru_current_user` from localStorage |
| `getTeamMemberById(id)` | `(id) → object \| null` | Finds member by `id` in hardcoded array |
| `isAdmin(user)` | `(user) → boolean` | Returns `user?.role === 'admin'` |
| `hasCapability(user, cap)` | `(user, cap) → boolean` | Returns true if admin (bypass) or has capability |
| `getWarehouseWorkers()` | `() → array` | Returns members with `role === 'warehouse'` OR `role === 'admin'` |
| `getMembersByRole(role)` | `(role) → array` | Filters by exact role match |

### `components/UserPicker.jsx` — The Login Modal

Props: `onSelect` (callback), `title`, `subtitle`

Behavior:
1. Renders full-screen dark backdrop with centered card
2. Groups members by `ROLE_GROUPS` (Admin, Warehouse, Listing, Photos)
3. Each member button shows colored dot + name
4. On click: calls `setCurrentUser(member)` then `onSelect(member)`

### Per-Page Login Patterns

| Page | Login Gate | User State | Switch User | Clears localStorage? |
|------|-----------|-----------|-------------|---------------------|
| `scanner.js` | `{!currentUser && <UserPicker />}` | Full user object | `handleSwitchUser()` | Yes — calls `clearCurrentUser()` |
| `photos.js` | `{!currentUser && <UserPicker />}` | Full user object | `handleSwitchUser()` | Yes — calls `clearCurrentUser()` |
| `pro.js` | `{!isNameSet && <UserPicker />}` | `userName` string + `isNameSet` bool | Resets state only | **NO — does NOT call `clearCurrentUser()`** |
| `dashboard.js` | `{!currentUserState && <UserPicker />}` + `isAdmin()` check | Full user object | N/A | N/A |
| `admin.js` | `{!user && <UserPicker />}` + `isAdmin()` check | Full user object | N/A | N/A |

### Stored User Object Shape (localStorage `ipru_current_user`)

```json
{
  "id": "scott",
  "name": "Scott",
  "role": "admin",
  "capabilities": ["admin", "warehouse", "listing", "photos"],
  "color": "#3b82f6"
}
```

### All localStorage Keys

| Key | Used By | Purpose | Status |
|-----|---------|---------|--------|
| `ipru_current_user` | `lib/users.js` | Full user object JSON | **Active — primary auth** |
| `ipru_admin_api_key` | `pages/admin.js` | SureDone API key string | **Active** |
| `fcm_device_info` | `NotificationCenter.jsx` | FCM device token | **Active** |
| `scanner_user` | `pages/scanner.js` | Legacy login | **Cleaned up on mount** |
| `scanner_name` | `pages/scanner.js` | Legacy login | **Cleaned up on mount** |
| `scanner_pin` | `pages/scanner.js` | Legacy login | **Cleaned up on mount** |
| `photos_user` | `pages/photos.js` | Legacy login | **Cleaned up on mount** |

### Dead Code: `lib/auth.js`

Still exists at `lib/auth.js`. Contains old Firestore-backed PIN auth (`verifyUser()`, `getActiveUsers()`) that queries `approved_users` collection. **No file imports it.** Safe to delete.

---

## 3. Firebase Collections (Firestore)

### 16 Collections Identified

| Collection | Read By | Written By | Primary Fields |
|------------|---------|-----------|----------------|
| `products` | pro.js, photos/queue.js, dashboard.js, crawl.js | scanner/update-stock.js, photos.js, pro.js, search-product-v2.js, crawl.js | sku, brand, partNumber, status, photos, specifications, photoCount |
| `products-v2` | pro-v2.js | pro-v2.js | Same shape as products (alternate workflow) |
| `inventory` | daily-summary.js | Unknown | scannedAt, photosCompletedAt, listedAt, status |
| `activityLog` | dashboard.js, admin.js | dashboard.js, admin.js | action, userId, details, timestamp |
| `activity_log` | None found | scanner/update-stock.js, photos.js | action, user, sku, details, timestamp |
| `scan_log` | None found | scanner/update-stock.js | sku, partNumber, action, scannedBy, timestamp |
| `approved_users` | lib/auth.js (dead code) | None | username, passcode, name |
| `users` | notify.js, escalate.js, morning-reminder.js, daily-summary.js | NotificationCenter.jsx | Subcollection: `users/{userId}/devices` |
| `users/{id}/devices` | notify.js, escalate.js | NotificationCenter.jsx, devices/remove.js | token, platform, subscribedAt |
| `partRequests` | escalate.js, complete.js | PartRequestModal.jsx, escalate.js | sku, status, requestedBy, assignedTo, escalationCount |
| `alertHistory` | daily-summary.js | complete.js | completedAt, responseTime, alertType |
| `counters` | generate-sku.js, sku-generator.js | generate-sku.js, sku-generator.js | `counters/skuCounter` → `{ value: number }` |
| `crawlHistory` | weekly-report.js | crawl.js | crawledAt, totalItems, averageScore, gradeDistribution |
| `inventoryHealth` | weekly-report.js, crawl.js | crawl.js | sku, score, issues[], lastRefreshed |
| `snoozedAlerts` | escalate.js | snooze.js | alertId, snoozedUntil |
| `weeklyReports` | None found | weekly-report.js | weekOf, scores, refreshCount |
| `dailySummaries` | None found | daily-summary.js | date, scanned, photographed, published |

---

## 4. Firebase Storage

### Path Convention

```
photos/{SKU}/{view}.jpg                    — Original photo
photos/{SKU}/{view}_nobg.png               — Background-removed version
photos/{SKU}/{view}_watermarked_v{N}.jpg   — Cached watermarked version
```

### Views

Required: `left`, `right`, `center`, `nameplate`
Optional: `extra_1`, `extra_2`, etc.

### Upload Methods

| File | Method | Format |
|------|--------|--------|
| `photos.js` (client) | `uploadString()` | data URI (base64 JPEG/PNG) |
| `photos/upload.js` (server) | `uploadBytes()` | Buffer from base64 |
| `photos/upload-simple.js` (server) | `uploadBytes()` | Buffer from base64 |
| `photos/watermark.js` (server) | `uploadBytes()` | Buffer from canvas |

### Metadata

Each upload includes custom metadata:
```javascript
{
  sku: "AI00042",
  view: "left",
  uploadedBy: currentUser.username,  // BUG: undefined
  uploadedAt: "2026-02-24T..."
}
```

---

## 5. Activity Tracking

### CRITICAL BUG: Split Collections

The codebase has **two different Firestore collections** for activity logging:

| Collection | Written By | Read By |
|------------|-----------|---------|
| `activity_log` (underscore) | `scanner/update-stock.js`, `photos.js` | **Nothing** |
| `activityLog` (camelCase) | `dashboard.js`, `admin.js` | `dashboard.js`, `admin.js` |

**Impact:** Scanner and Photos activity (scans, stock updates, photo uploads) is written to `activity_log` but the Dashboard reads from `activityLog`. These are **different Firestore collections**. Worker status dots on the dashboard will never reflect scan/photo activity.

### `scan_log` Collection

Written by `scanner/update-stock.js` on every scan action. Contains:
```javascript
{
  sku: "AI00042",
  partNumber: "6ES7315-2AH14-0AB0",
  action: "create_new",  // or "increase_stock", "update_shelf"
  scannedBy: currentUser.username,  // BUG: undefined
  timestamp: serverTimestamp()
}
```

### `alertHistory` Collection

Written by `tasks/complete.js` when a part request is fulfilled. Read by `tasks/daily-summary.js` for response time metrics.

---

## 6. API Endpoints — Full Inventory

### Authentication Status

**51 of 57 endpoints have NO authentication.**

Only 6 endpoints check authorization:

| Endpoint | Auth Method |
|----------|-----------|
| `tasks/escalate.js` | `CRON_SECRET` header check |
| `tasks/daily-summary.js` | `CRON_SECRET` header check |
| `tasks/morning-reminder.js` | `CRON_SECRET` header check |
| `inventory/crawl.js` | `CRON_SECRET` header check |
| `inventory/weekly-report.js` | `CRON_SECRET` header check |
| `notify.js` | `INTERNAL_API_KEY` header check |

All other endpoints (SureDone, eBay, Claude AI, photos, scanner) are completely open — anyone with the URL can call them.

### `callClaudeWithRetry` — Duplicated 6 Times

The exact same retry function (exponential backoff: 2s, 4s, 8s for HTTP 529/503/429) is copy-pasted into:

1. `pages/api/search-product-v2.js`
2. `pages/api/photos/generate-alt-text.js`
3. `pages/api/v2/research-product.js`
4. `pages/api/v2/revise-listing.js`
5. `pages/api/v2/fill-specifics.js`
6. `pages/api/v2/auto-fill-ebay-specifics.js`

```javascript
async function callClaudeWithRetry(client, params, maxRetries = 3) {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const response = await client.messages.create(params);
      return response;
    } catch (error) {
      const isOverloaded = error.status === 529 || error.status === 503 || error.status === 429;
      if (isOverloaded && attempt < maxRetries - 1) {
        const waitTime = Math.pow(2, attempt + 1) * 1000;
        await new Promise(r => setTimeout(r, waitTime));
        continue;
      }
      throw error;
    }
  }
}
```

**Candidate for refactoring into `lib/claude-retry.js`.**

### Claude Model Used

All 6 Claude API endpoints use `claude-sonnet-4-20250514`. Several enable the `web_search_20250305` tool.

### Firebase SDK Split

| SDK | Used By | Init Method |
|-----|---------|-------------|
| **Client SDK** | scanner/, photos/, root endpoints | `import { db } from '../../firebase'` |
| **Admin SDK** | tasks/, inventory/, notify, devices/ | `firebase-admin` with `FIREBASE_SERVICE_ACCOUNT_JSON` |

### Non-Functional Endpoint

`pages/api/brand-ids-update.js` (306 lines) — Only exports a constant mapping object. No handler function. Not an API endpoint.

---

## 7. Cron Jobs

### Schedule Summary

| Endpoint | Schedule (UTC) | Schedule (EST) | Max Duration |
|----------|---------------|----------------|-------------|
| `/api/tasks/escalate` | `*/2 * * * *` | Every 2 min, 24/7 | 30s |
| `/api/tasks/morning-reminder` | `15 13 * * 1-5` | 8:15 AM Mon-Fri | 30s |
| `/api/tasks/daily-summary` | `0 22 * * 1-5` | 5:00 PM Mon-Fri | 30s |
| `/api/inventory/crawl` | `0 11 * * *` | 6:00 AM daily | 300s (5 min) |
| `/api/inventory/weekly-report` | `0 1 * * 0` | 8:00 PM Saturday | 30s |

### Cron 1: Task Escalation (`tasks/escalate.js`)

Runs every 2 minutes. Checks `partRequests` for pending requests older than 10 minutes:
- If escalated 3+ times → marks `status: 'expired'` with reason `max_escalations`
- If older than 1 hour → marks `status: 'expired'` with reason `timeout_1h`
- Otherwise → sends FCM push to assigned worker, increments `escalationCount`
- Also checks `snoozedAlerts` for expired snoozes and reactivates them

Collections: `partRequests`, `snoozedAlerts`, `users` (devices subcollection)

### Cron 2: Morning Reminder (`tasks/morning-reminder.js`)

Sends "Good morning! Time to start scanning" FCM notification to all warehouse + admin users.

Collections: `users` (devices subcollection)

### Cron 3: Daily Summary (`tasks/daily-summary.js`)

Calculates today's activity from the `inventory` collection:
- Items scanned (by `scannedAt`)
- Items photographed (by `photosCompletedAt`)
- Items published (by `listedAt` where `status == 'listed'`)
- Alert performance from `alertHistory`

Sends summary notification to admin users. Saves to `dailySummaries`.

Collections: `inventory` (reads), `alertHistory` (reads), `users` (reads), `dailySummaries` (writes)

**Issue:** Queries `inventory` collection, but the product workflow uses `products` collection. See Known Issues.

### Cron 4: Inventory Crawl (`crawl.js`)

Paginates ALL SureDone items (up to 8,000). Scores each with `listingScorer.js`. Writes worst items to `inventoryHealth`. Queues top 20 for refresh in `products` with `status: 'refresh'`. Has 4.5-minute safety timer.

Collections: `inventoryHealth` (writes), `products` (reads/writes), `crawlHistory` (writes)
External: SureDone `/editor/items` API

### Cron 5: Weekly Report (`weekly-report.js`)

Compares two most recent `crawlHistory` entries for week-over-week scoring changes. Saves to `weeklyReports`.

Collections: `crawlHistory` (reads), `inventoryHealth` (reads), `products` (reads), `weeklyReports` (writes)

---

## 8. Environment Variables

### Complete Inventory (16 Variables)

| Variable | Files Using It | Purpose |
|----------|---------------|---------|
| `FIREBASE_SERVICE_ACCOUNT_JSON` | 10 API files (tasks/*, inventory/*, notify, devices/remove) | Firebase Admin SDK service account (JSON string) |
| `CRON_SECRET` | 5 cron endpoints | Vercel cron job authentication |
| `INTERNAL_API_KEY` | 7 task/inventory endpoints + notify | Internal API-to-API authentication |
| `ANTHROPIC_API_KEY` | 6 AI endpoints | Claude API key |
| `SUREDONE_USER` | 12 SureDone endpoints | SureDone API username |
| `SUREDONE_TOKEN` | 12 SureDone endpoints | SureDone API token |
| `SUREDONE_URL` | 7 SureDone endpoints | SureDone API base URL (defaults to `https://api.suredone.com/v1`) |
| `SUREDONE_PASS` | 1 file (`suredone-check-sku.js`) | SureDone password (legacy) |
| `SUREDONE_API_USER` | 4 files (`search.js`, `crawl.js`, `get-listing-urls.js`, `listing-action.js`) | Alternative SureDone API user |
| `SUREDONE_API_TOKEN` | Same 4 files | Alternative SureDone API token |
| `EBAY_CLIENT_ID` | 2 eBay token endpoints | eBay OAuth client ID |
| `EBAY_CLIENT_SECRET` | 2 eBay token endpoints | eBay OAuth client secret |
| `REMOVE_BG_API_KEY` | 1 file (`photos/remove-bg.js`) | remove.bg API key |
| `VERCEL_URL` | 2 files | Auto-set by Vercel, used for self-referencing API calls |
| `NEXT_PUBLIC_VAPID_KEY` | 1 file (`lib/notificationService.js`) | Web Push VAPID key (client-side) |
| `NEXT_PUBLIC_SITE_URL` | 3 files | App base URL (defaults to `https://camera-spec-finder.vercel.app`) |

### Issues

1. **Duplicate SureDone credentials:** Both `SUREDONE_USER`/`SUREDONE_TOKEN` and `SUREDONE_API_USER`/`SUREDONE_API_TOKEN` exist. Some files use one pair, some the other, some use fallback logic. If only one pair is configured, certain endpoints fail silently.

2. **`SUREDONE_PASS` vs `SUREDONE_TOKEN`:** `suredone-check-sku.js` uses `SUREDONE_PASS` while all others use `SUREDONE_TOKEN`. Different auth mechanisms.

3. **No `.env.example` file:** No documentation of required environment variables for new deployments.

4. **Hardcoded Firebase client config:** `firebase.js` has API keys hardcoded (acceptable for client SDK, but worth noting).

---

## 9. Data Flow Diagrams

### Workflow A: Scan → Firebase → Photo Queue

```
[Scanner App]
    │
    ├── POST /api/scanner/lookup        → SureDone search
    ├── POST /api/scanner/check-duplicate → Firebase products query
    ├── GET  /api/generate-sku          → Atomic counter (AI0001 format)
    │
    └── POST /api/scanner/update-stock
            │
            ├── Creates doc in `products` collection:
            │     { sku, brand, partNumber, stock, shelf,
            │       condition, scannedBy: currentUser.username,  ← BUG: undefined
            │       photoCount: 0, status: 'needs_photos' }
            │
            ├── Creates doc in `scan_log`
            ├── Creates doc in `activity_log`  ← Note: underscore
            │
            └── Fire-and-forget: POST /api/auto-research
                    │
                    └── POST /api/search-product-v2
                            │
                            └── Updates `products` doc:
                                  { status: 'complete', title, description,
                                    specifications, ebayCategoryId, ... }

    [Photo Queue picks up items where photoCount == 0]
```

### Workflow B: Photos → Firebase Storage → Listing

```
[Photo Station]
    │
    ├── GET /api/photos/queue           → Items with photoCount == 0
    │
    ├── [Camera capture: left, right, center, nameplate + extras]
    │     └── Client-side: compress to 1200px, 80% JPEG quality
    │
    ├── POST /api/photos/remove-bg      → remove.bg API
    │     └── Returns transparent PNG, auto-cropped + template applied
    │
    └── [Upload to Firebase Storage]
            │
            ├── photos/{SKU}/{view}.jpg           (original)
            ├── photos/{SKU}/{view}_nobg.png      (bg removed)
            │
            └── Updates `products` doc:
                  { photos: [url1, url2, ...],
                    photosNobg: { left: url, ... },
                    photoCount: 5,
                    photographedBy: currentUser.username,  ← BUG: undefined
                    status: 'photos_complete' }
            │
            └── Creates doc in `activity_log`  ← Note: underscore
```

### Workflow C: Pro Builder → SureDone → eBay

```
[Pro Listing Builder]
    │
    ├── Loads from `products` collection (status: 'complete')
    │
    ├── User edits: title, description, price, condition, specs, photos
    │
    ├── POST /api/photos/watermark      → Apply logo overlay to photos
    ├── POST /api/photos/generate-alt-text → Claude AI alt text
    ├── GET  /api/assign-upc            → Next available UPC
    │
    └── POST /api/suredone-create-listing (new)
        OR POST /api/suredone/update-item (existing)
            │
            ├── Maps photos → media1-media12
            ├── Maps specs → eBay item specifics
            ├── Maps condition → SureDone condition value
            ├── Sets ebayskip=1, bigcommerceskip=1 (DRAFT mode)
            │
            └── SureDone API: POST /editor/items/add
                  (x-www-form-urlencoded)
                  Auth: X-Auth-User + X-Auth-Token headers

    [No status change written back to Firebase `products`]
    [Manual action in SureDone required to publish to eBay]
```

### Status Lifecycle

```
needs_photos      ← Created by Scanner
     │
     v
searching         ← AI research in progress (auto-research)
     │
     v
complete          ← AI research finished, ready for Pro Builder
     │
     v
photos_complete   ← Photos uploaded (only if status wasn't already 'complete')
     │
     v
[sent to SureDone] ← No status change — remains 'complete'
     │
     v
refresh           ← Queued by inventory crawl for re-optimization
```

---

## 10. Known Issues & Bugs

### CRITICAL

#### 1. `currentUser.username` is `undefined`

**Impact:** Every Firestore document written by Scanner and Photos has `undefined` in user attribution fields.

**Root cause:** `TEAM_MEMBERS` objects have `id` and `name` but no `username` property.

**Scanner.js** (3 occurrences):
```javascript
scannedBy: currentUser.username,  // line ~349 — writes undefined
scannedBy: currentUser.username,  // line ~426 — writes undefined
shelvedBy: currentUser.username   // line ~489 — writes undefined
```

**Photos.js** (6 occurrences):
```javascript
uploadedBy: currentUser.username,       // writes undefined
photographedBy: currentUser.username,   // writes undefined
photoCompletedBy: currentUser.username  // writes undefined
user: currentUser.username,             // activity_log — writes undefined
```

**Fix:** Change all `currentUser.username` to `currentUser.name` or `currentUser.id`.

#### 2. `activityLog` vs `activity_log` — Split Collections

**Impact:** Dashboard worker status dots never show scanner/photo activity.

**Root cause:** Scanner and Photos write to `activity_log` (underscore). Dashboard and Admin read from `activityLog` (camelCase). These are different Firestore collections.

**Fix:** Pick one name and use it everywhere.

#### 3. `inventory` vs `products` — Collection Mismatch in Cron

**Impact:** Daily summary (`tasks/daily-summary.js`) queries the `inventory` collection for `scannedAt`, `photosCompletedAt`, `listedAt`. But the product workflow writes to `products`. If `inventory` is empty, daily summaries show zero activity.

**Fix:** Verify whether `inventory` collection exists and has data, or change the query to use `products`.

### HIGH

#### 4. No `listed` Status After SureDone Submission

**Impact:** After a listing is sent to SureDone, the `products` document status remains `complete`. There is no `listed` status written back. The daily summary queries for `status == 'listed'` and `listedAt` which may never exist.

#### 5. 51 of 57 API Endpoints Have No Authentication

**Impact:** Any user with the API URL can call scanner, photo, SureDone, eBay, and Claude AI endpoints.

#### 6. pro.js Does Not Call `clearCurrentUser()` on Switch

**Impact:** When switching users in Pro Builder, localStorage retains the old user. Page refresh auto-logs in as the previous user. Other pages see the wrong user.

### MEDIUM

#### 7. `callClaudeWithRetry` Duplicated 6 Times

Should be a shared `lib/claude-retry.js` module.

#### 8. `hasCapability()` Defined But Never Enforced

The capability-based access control system exists in `lib/users.js` but no page checks capabilities. A warehouse-only worker can access Photos. A photos-only worker can access Scanner.

#### 9. Duplicate SureDone Credential Variables

`SUREDONE_USER`/`SUREDONE_TOKEN` vs `SUREDONE_API_USER`/`SUREDONE_API_TOKEN` — some endpoints use one pair, some the other. If only one pair is configured, certain endpoints fail.

#### 10. `lib/auth.js` Dead Code

Old PIN-based auth file still exists. Never imported. Should be deleted.

#### 11. `brand-ids-update.js` Is Not an API Endpoint

306-line file that only exports a constant mapping object. No handler function. Misleading placement in `pages/api/`.

### LOW

#### 12. Firebase Admin Build Warnings

10 API files that import `firebase-admin` show build warnings because the firebase-admin package isn't listed in `package.json` dependencies (it's available in Vercel's runtime but not locally).

#### 13. No `.env.example` File

No documentation of required environment variables.

---

*End of audit. This document reports the current deployed state. No fixes have been applied.*
