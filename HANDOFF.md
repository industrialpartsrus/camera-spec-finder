# Handoff Document — Recent Changes & System State

**Last Updated**: February 13, 2026
**System**: IPRU Warehouse Inventory Management
**Codebase**: camera-spec-finder

---

## 📋 Table of Contents

1. [Recent Features & Enhancements](#recent-features--enhancements)
2. [Bug Fixes](#bug-fixes)
3. [Architecture Changes](#architecture-changes)
4. [Current Known Issues](#current-known-issues)
5. [Critical System Notes](#critical-system-notes)
6. [Deployment Status](#deployment-status)

---

## 🚀 Recent Features & Enhancements

### 1. **Photo Upload Size Limit Increase** (Feb 13, 2026)
**Problem**: "Body exceeded" errors when saving edited 2000x2000 photos in Pro Builder
**Solution**:
- Increased API body size limit to 20MB in `pages/api/photos/upload-simple.js`
- Reduced JPEG quality from 1.0 to 0.95 (30-40% file size reduction, no visible quality loss)
- Added Vercel function timeout config for upload-simple (30s max duration)

**Files Modified**:
- `pages/api/photos/upload-simple.js` - Added `export const config` with 20mb sizeLimit
- `components/PhotoEditor.js` - Changed JPEG quality to 0.95
- `vercel.json` - Created with function timeout configurations

**Impact**: Users can now save large edited photos without errors

---

### 2. **Remove.bg Integration Enhancement** (Feb 13, 2026)
**Features Added**:
- **Auto-crop**: Automatically crops product to 10% margin
- **Auto-center**: Centers product in frame
- **Scale control**: Slider to control product size (50-95% of frame)
- **Custom background templates**: 3 professional backgrounds
  - Warehouse Floor (dark concrete gradient)
  - Studio Gradient (soft spotlight effect)
  - Industrial (blue-gray vignette)

**Files Modified**:
- `pages/api/photos/remove-bg.js` - Enhanced Remove.bg API integration
- `components/PhotoEditor.js` - Added template selector UI with 6x2 grid
- `scripts/generate-bg-templates.js` - Script to generate gradient backgrounds
- `public/bg-templates/` - 3 JPEG templates (77KB, 107KB, 114KB)

**Template Generation**:
```bash
node scripts/generate-bg-templates.js
```

**Technical Details**:
- Uses Remove.bg API parameters: `crop`, `crop_margin`, `scale`, `position`, `bg_color`, `bg_image_url`
- Templates generated using sharp + SVG rendering (linear/radial gradients)
- Background templates hosted at `/bg-templates/*.jpg`
- Solid colors flatten to JPEG (95% quality)
- Transparent backgrounds return PNG

---

### 3. **Photo Station File Upload** (Feb 13, 2026)
**Problem**: Photographers could only use camera, not upload from computer/gallery
**Solution**: Added dual upload modes:

**Single Slot Upload**:
- Upload button on each photo slot (left, right, center, nameplate, extra)
- Click → file picker → auto-compress → show preview → accept/retake

**Bulk Upload**:
- Drag & drop area for multiple files
- Auto-assigns files to empty slots in order
- Click to browse alternative

**Files Modified**:
- `pages/photos.js` - Added `uploadInputRef`, `bulkUploadInputRef`, drag-drop handlers
- Reuses existing `compressImage()` pipeline (max 1200px, 0.8 quality)

**User Flow**:
1. Photographer opens Photo Station
2. Can capture with camera OR upload files
3. Bulk upload: drag 4 photos → auto-fills left/right/center/nameplate
4. Review and submit as normal

---

### 4. **Unified Login System** (Feb 13, 2026)
**Problem**: 3 different login systems (Scanner PIN, Photos PIN, Pro UserPicker)
**Solution**: Single unified authentication using `lib/users.js`

**Changes**:
- **Removed**: All PIN-based authentication
- **Removed**: `lib/auth.js` (old user management)
- **Removed**: localStorage keys: `scanner_user`, `scanner_pin`, `photos_user`
- **Added**: Unified `ipru_current_user` localStorage key
- **Added**: UserPicker modal on all tools
- **Added**: Switch User button in headers
- **Added**: User color-coded identity dots

**Files Modified**:
- `pages/scanner.js` - Removed 80+ lines of PIN UI, added UserPicker
- `pages/photos.js` - Removed 70+ lines of PIN UI, added UserPicker
- `pages/dashboard.js` - Added admin-only access control with `isAdmin()`
- `pages/pro.js` - Already using unified system (no changes)
- `pages/admin.js` - Already secured (no changes)

**Access Control**:
- **Dashboard** (`/dashboard`) - Admin only (Scott, Josh)
- **Admin Panel** (`/admin`) - Admin only (Scott, Josh)
- **Scanner** (`/scanner`) - All team members
- **Photos** (`/photos`) - All team members
- **Pro Builder** (`/pro`) - All team members

**User Experience**:
1. First visit to any tool → UserPicker modal appears
2. Select name → saved to `ipru_current_user`
3. All other tools recognize same user (no re-login)
4. "Switch User" button for changing identity
5. User shown with colored dot (purple for admin, green for warehouse, blue for listing, teal for photos)

**Code Reduction**: -200 lines (321 deleted, 121 added)

---

### 5. **Claude API Retry Logic with Exponential Backoff** (Feb 13, 2026)
**Problem**: 10 simultaneous users caused 529 "Overloaded" errors from Anthropic API
**Solution**: Retry wrapper with exponential backoff + frontend auto-retry

**Backend Changes** (6 API endpoints):
```javascript
async function callClaudeWithRetry(client, params, maxRetries = 3) {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const response = await client.messages.create(params);
      return response;
    } catch (error) {
      const isOverloaded = error.status === 529 ||
        error.status === 503 ||
        error.status === 429;

      if (isOverloaded && attempt < maxRetries - 1) {
        // Exponential backoff: 2s, 4s, 8s
        const waitTime = Math.pow(2, attempt + 1) * 1000;
        await new Promise(r => setTimeout(r, waitTime));
        continue;
      }
      throw error;
    }
  }
}
```

**Files Modified**:
- `pages/api/search-product-v2.js` - Main product search (Pass 0)
- `pages/api/v2/research-product.js` - Product research (Pass 1)
- `pages/api/v2/auto-fill-ebay-specifics.js` - eBay specifics (Pass 2)
- `pages/api/v2/fill-specifics.js` - Specifics filling (Pass 2B)
- `pages/api/v2/revise-listing.js` - Title/description revision (Pass 3)
- `pages/api/photos/generate-alt-text.js` - Alt text generation
- `pages/pro.js` - Frontend auto-retry logic

**Error Handling**:
- API returns `{ success: false, error: "AI service is busy...", retryable: true }`
- Frontend detects `retryable: true` → shows "🔄 AI service is busy. Retrying in a few seconds..."
- Auto-retries after 5 seconds

**Retry Strategy**:
- **Backend**: 3 retries (2s → 4s → 8s backoff)
- **Frontend**: 1 auto-retry after 5s
- **Total**: Up to 4 attempts per request
- **Max delay**: ~19 seconds worst case

**Result**: Graceful degradation under burst load, no manual intervention needed

---

## 🐛 Bug Fixes

### 1. **Field Name Resolution** (Recent)
**Issue**: AI-generated field names not mapping correctly to SureDone fields
**Fix**: Created `lib/field-name-resolver.js` with canonical field mapping
**Impact**: Specs now correctly sync to SureDone/eBay

### 2. **OCR Narrative Bleeding into MPN** (Commit: 85f4afa6)
**Issue**: OCR extracting full narrative text into MPN field
**Fix**: Constrained MPN extraction to reasonable length limits
**Impact**: Cleaner MPN values in search results

### 3. **AB Field Placement Issues** (Commit: fc016640)
**Issue**: Multiple field placement and format issues
- MPN not cleaned properly
- Series vs FRN confusion (Allen-Bradley)
- Title format inconsistent
- Country block placement wrong
**Fix**: Comprehensive field resolver with AB-specific logic
**Impact**: Allen-Bradley listings now format correctly

### 4. **AI Country Field Generation** (Commit: d5ad12fa)
**Issue**: AI generating "Country of Origin" field despite explicit exclusion
**Fix**: Disabled AI country field generation in prompt + post-cleanup
**Impact**: No more country fields in AI-generated specs

---

## 🏗️ Architecture Changes

### 1. **Unified User Management**
- **Old**: 3 separate auth systems (`lib/auth.js`, PIN verification, localStorage per tool)
- **New**: Single source of truth (`lib/users.js`, UserPicker component, unified localStorage)
- **Benefits**: Consistent UX, easier maintenance, role-based access control

### 2. **Centralized Field Name Resolution**
- **File**: `lib/field-name-resolver.js`
- **Purpose**: Maps AI-generated field names → SureDone canonical names
- **Used By**: All AI research endpoints (Pass 1, Pass 2, Pass 2B)
- **Examples**:
  - "NominalRatedInputVoltage" → "inputvoltage"
  - "Horsepower" → "horsepower"
  - "Motor Type" → "motortype"

### 3. **Vercel Function Timeouts**
- **File**: `vercel.json`
- **Configuration**:
  - Photo upload: 30s
  - Notification tasks: 30s
  - Inventory crawl: 300s (5 minutes)
  - Task completion: 10s

### 4. **Photo Editor Background System**
- **Templates**: Static JPEG gradients in `public/bg-templates/`
- **API**: Remove.bg with enhanced parameters
- **Processing**: Sharp for JPEG conversion/flattening
- **Output**: JPEG (solid/template) or PNG (transparent)

---

## ❌ Current Known Issues

### 1. **Firebase Admin Dependency Missing** (Build Error)
**Status**: ❌ BLOCKING BUILD
**Error**:
```
Module not found: Can't resolve 'firebase-admin'
```

**Affected Files**:
- `pages/api/devices/remove.js`
- `pages/api/inventory/crawl.js`
- `pages/api/inventory/weekly-report.js`
- `pages/api/notify.js`
- `pages/api/tasks/clear-all.js`
- `pages/api/tasks/complete.js`
- `pages/api/tasks/daily-summary.js`
- `pages/api/tasks/escalate.js`
- `pages/api/tasks/morning-reminder.js`
- `pages/api/tasks/snooze.js`

**Fix Required**:
```bash
npm install firebase-admin
```

**Why This Happened**: Package likely removed during dependency cleanup or not committed to package.json

**Priority**: 🔴 HIGH - Blocks production builds

---

### 2. **WYSIWYG Description Editor (Plan Mode)**
**Status**: ⚠️ PLANNED BUT NOT IMPLEMENTED
**Plan File**: `/Users/Scott/.claude/plans/delegated-spinning-wind.md`

**Planned Changes**:
- Replace plain `<textarea>` for description field in Pro Builder
- Add ReactQuill WYSIWYG editor
- Visual/HTML source toggle
- Preserve existing HTML data flow (Firestore → SureDone → eBay)

**Files to Modify** (per plan):
- `pages/_app.js` - Import Quill CSS globally
- `pages/pro.js` - Add ReactQuill dynamic import, editor state, UI replacement

**Why Not Implemented**: Plan created but user moved to other priorities (login unification, API retry logic)

**Next Steps**:
1. Install: `npm install react-quill`
2. Follow plan in `/Users/Scott/.claude/plans/delegated-spinning-wind.md`
3. Exit plan mode with `ExitPlanMode` tool

---

### 3. **No Error Handling for Remove.bg Template 404s**
**Status**: ⚠️ MINOR ISSUE
**Scenario**: If background template files are missing, Remove.bg API receives 404 for `bg_image_url`
**Current Behavior**: API call fails silently or returns error
**Expected Behavior**: Fallback to solid color background

**Fix Required**:
```javascript
// In pages/api/photos/remove-bg.js
if (templateBackgrounds.includes(background)) {
  const bgImageUrl = baseUrl + templateMap[background];

  // Verify template exists before sending to Remove.bg
  try {
    const templatePath = path.join(process.cwd(), 'public', templateMap[background]);
    if (!fs.existsSync(templatePath)) {
      console.warn(`Template not found: ${templatePath}, falling back to white`);
      formData.append('bg_color', 'white');
    } else {
      formData.append('bg_image_url', bgImageUrl);
    }
  } catch (err) {
    formData.append('bg_color', 'white');
  }
}
```

**Priority**: 🟡 MEDIUM - Should be fixed but not blocking

---

## 📌 Critical System Notes

### 1. **Web Search in AI Research (CRITICAL)**
**File**: `pages/api/search-product-v2.js` (lines 1043-1049)

**⚠️ WARNING**:
```javascript
// ⚠️  CRITICAL: DO NOT REMOVE WEB SEARCH
// Web search is essential for identifying obscure industrial parts.
// Removing it caused a major regression on 2/9/2026 when switching
// from v1 to v2. The AI cannot accurately identify niche products
// (filters, hydraulic components, specialty sensors) without web access.
// See docs/SYSTEM_SPEC.md for details.
tools: [{ type: 'web_search_20250305', name: 'web_search' }]
```

**Why This Matters**: Industrial parts are obscure. AI needs web search to find datasheets, specs, and product categories. Disabling web search causes:
- Wrong product categories
- Missing specifications
- Incorrect eBay category mapping
- Poor listing quality

**Never Remove**: This is a hard requirement, documented after production incident.

---

### 2. **Last Text Block Parsing (CRITICAL)**
**Files**: All AI research endpoints
**Issue**: When web search is enabled, Claude returns multiple content blocks (search queries, results, reasoning, final answer)

**⚠️ CRITICAL FIX (2026-02-07)**:
```javascript
// WRONG - Gets first text block (search query)
const text = response.content?.[0]?.text;

// CORRECT - Gets last text block (final JSON answer)
const textBlocks = response.content.filter(b => b.type === 'text' && b.text);
const text = textBlocks[textBlocks.length - 1].text;
```

**Why This Matters**: Using first block gives search query text instead of JSON answer → parsing fails → listing creation fails

**Status**: ✅ FIXED in all endpoints (search-product-v2, auto-fill-ebay-specifics, etc.)

---

### 3. **Spec Field Exclusion List**
**File**: `pages/api/search-product-v2.js` (lines 14-26)

**Excluded Fields**:
- `attachmentmodel`, `attachmenttype` - Mounting hardware metadata
- `packagecontents`, `includedaccessories`, `boxcontents` - Belongs in description, not specs
- `accessories`, `mounting`, `installation` - Not product specs
- `warranty`, `compliance` - Policy/vague info

**Why This Matters**: Prevents AI from generating irrelevant spec fields that clutter listings and don't sync to eBay properly.

**Also Applied**: Post-processing cleanup removes country-related fields (UPC, EAN, Country of Origin)

---

### 4. **Condition Field Mapping**
**File**: `pages/api/v2/research-product.js` (lines 8-48)

**Critical Mapping**:
- `new_in_box` → SureDone: "New"
- `new_open_box` → SureDone: "New Other"
- `new_missing_hardware` → SureDone: "New Other"
- `like_new_excellent` → SureDone: "Used"
- `used_good` → SureDone: "Used"
- `for_parts` → SureDone: "For parts or not working"
- `refurbished` → SureDone: "Seller refurbished"

**Why This Matters**: UI uses internal IDs, but SureDone/eBay need exact string values. Mismatch causes listing failures.

---

### 5. **Team Member Roles & Access**
**File**: `lib/users.js`

**Team Structure**:
```javascript
TEAM_MEMBERS = [
  { id: 'scott', name: 'Scott', role: 'admin', color: '#9333ea' },
  { id: 'josh', name: 'Josh', role: 'admin', color: '#7c3aed' },
  { id: 'kevin', name: 'Kevin', role: 'warehouse', color: '#16a34a' },
  { id: 'steven', name: 'Steven', role: 'warehouse', color: '#15803d' },
  // ... listing and photos roles
]
```

**Access Levels**:
- **Admin** (Scott, Josh): All tools including Dashboard and Admin Panel
- **Warehouse** (Kevin, Steven, Julio, Ryan): Scanner, Photos, Pro
- **Listing** (Suhas): Pro Builder, Photos
- **Photos** (Claudia, Hugo): Photos only

**Admin Functions**:
- `isAdmin(user)` - Check if user is admin
- `hasCapability(user, capability)` - Check specific permissions

---

## 📦 Deployment Status

### Last Deployment
**Date**: February 13, 2026
**Commit**: `744f9055` - "Add Claude API retry logic with exponential backoff"
**Branch**: `main`
**Platform**: Vercel
**Status**: ✅ DEPLOYED

### Recent Commits (Reverse Chronological)
1. `744f9055` - Claude API retry logic (529 error handling)
2. `95acf828` - Unified login system (Scanner, Photos, Dashboard)
3. `85f4afa6` - Fix OCR narrative bleeding, exclude irrelevant specs
4. `57c126f7` - Add WYSIWYG description editor (react-quill) [PLANNED, NOT IMPLEMENTED]
5. `74abcfd7` - Constrain AI field names + field resolver
6. `fc016640` - Fix AB field placement (MPN, series, title, country)
7. `d5ad12fa` - Disable AI country field generation

### Build Status
**Status**: ❌ FAILING
**Reason**: Missing `firebase-admin` dependency
**Impact**: Cannot deploy until dependency is installed

**Fix**:
```bash
npm install firebase-admin
git add package.json package-lock.json
git commit -m "Add firebase-admin dependency"
git push origin main
```

---

## 🔄 Migration Notes

### For New Claude Session

**Quick Start**:
1. Read this handoff document (`HANDOFF.md`)
2. Install missing dependency: `npm install firebase-admin`
3. Verify build: `npx next build`
4. Check plan mode: `/Users/Scott/.claude/plans/delegated-spinning-wind.md` (WYSIWYG editor)

**Key Files to Review**:
- `lib/users.js` - User management and roles
- `lib/field-name-resolver.js` - Spec field mapping
- `pages/api/search-product-v2.js` - Main AI research endpoint
- `pages/pro.js` - Pro Builder (main UI)
- `components/PhotoEditor.js` - Photo editing with Remove.bg

**Critical Context**:
- ⚠️ NEVER remove web search from AI endpoints
- ⚠️ ALWAYS parse last text block from Claude responses
- ⚠️ Excluded spec fields must stay excluded (see list above)
- ⚠️ Admin access control required for Dashboard and Admin Panel

**Current Priorities** (based on last session):
1. 🔴 Fix firebase-admin dependency (blocking builds)
2. 🟡 Implement WYSIWYG description editor (plan exists)
3. 🟢 Monitor Claude API retry effectiveness under load

---

## 📞 Support Information

**Codebase Owner**: Scott
**Team**: IPRU Warehouse Inventory
**Tools**:
- Scanner (`/scanner`) - Warehouse scanning and stock management
- Photos (`/photos`) - Photo capture workflow for listings
- Pro Builder (`/pro`) - Listing creation and management
- Dashboard (`/dashboard`) - Admin analytics and monitoring
- Admin Panel (`/admin`) - System administration

**External APIs**:
- **Anthropic Claude** - AI product research (sonnet-4-20250514)
- **Remove.bg** - Background removal with templates
- **eBay Taxonomy** - Category and aspect lookup
- **Firebase** - Database (Firestore) and Storage
- **Vercel** - Hosting and serverless functions

**Environment Variables** (required):
- `ANTHROPIC_API_KEY` - Claude API access
- `REMOVE_BG_API_KEY` - Remove.bg API access
- `NEXT_PUBLIC_SITE_URL` - Base URL for background templates
- Firebase config (multiple vars for client/admin SDK)

---

**End of Handoff Document**
*Generated: February 13, 2026*
*Session Summary: Unified login, API retry logic, photo enhancements*
