# Project Knowledge Update — 2026-06-29

**Session summary:** Claire reported the Pro Listing Builder failing with
"Error processing item: API returned 500." Root cause was a retired Anthropic
model string hardcoded across the API layer. Fixed repo-wide and deployed.
This session also confirmed the **true** state of two subsystems (alt-text
generation and background removal) that the Project Knowledge doc had listed as
"pending" but are actually **already complete**. Corrections below.

---

## 1. COMPLETED THIS SESSION — Retired model string fix

### Root cause
Every Claude API call used the model string `claude-sonnet-4-20250514`
(Claude Sonnet 4, May 2025). Anthropic has **retired** that model, so the API
now returns `404 not_found_error: model: claude-sonnet-4-20250514`. The
frontend only surfaced the generic status, which is why users saw
"API returned 500" instead of the real 404.

### The fix
Global find-and-replace, identical everywhere:

```
claude-sonnet-4-20250514   →   claude-sonnet-4-6
```

`claude-sonnet-4-6` = **Claude Sonnet 4.6**, the current production Sonnet
(supports web search + vision, verified against Anthropic's official model docs
on 2026-06-29). No logic changed — only the model identifier.

### Files changed (19 replacements across 18 files)

**Active API endpoints (these were broken / would have broken):**

| File | Line(s) | Purpose |
|------|---------|---------|
| `pages/api/search-product-v2.js` | 1112 | Pass 1 — AI product research (the one Claire hit) |
| `pages/api/v2/auto-fill-ebay-specifics.js` | 159 | Pass 2 — eBay item specifics |
| `pages/api/v2/fill-specifics.js` | 202 | Item specifics fill |
| `pages/api/v2/research-product.js` | 210, 254 | Product research (254 = `aiModel` log field) |
| `pages/api/v2/revise-listing.js` | 150, 200 | Revise existing listing (200 = `aiModel` log field) |
| `pages/api/search-product.js` | 889 | Legacy v1 product search |
| `pages/api/match-categories.js` | 35 | Category matching |
| `pages/api/ai/extract-specs.js` | 29 | Spec extraction |
| `pages/api/price-research.js` | 19 | Price research |
| `pages/api/process-image.js` | 18 | Image processing (vision) |
| `pages/api/photos/generate-alt-text.js` | 96 | **DORMANT** — see note below |

**Non-active (updated for consistency only):**
`archive/search-product-old.js`, `archive/search-product-old-2-7-25.js`,
`archive/search-product-old-2-7-26.js`, `archive/search-product-v2-old-2-7-26.js`,
`docs/SYSTEM_SPEC.md`, `SYSTEM-AUDIT.md`.

### Deploy
Done via Claude Code: `git add .` → `git commit` → `git push` → Vercel
auto-deploy.

### Post-deploy check
Spot-check the first 1–2 listings (title / specs / description). Sonnet 4.6 may
word things slightly differently than the retired model; web-search and
text-block parsing logic are unchanged.

---

## 2. CORRECTIONS TO PROJECT KNOWLEDGE (these were marked pending — they're DONE)

### 2a. Alt-text template system — ✅ INTEGRATED (was listed as "ready to deploy")
The local template generator (`lib/generate-alt-text-templates.js`) is **fully
wired in**. There are **zero** `fetch('/api/photos/generate-alt-text')` calls
remaining. No Claude Vision API calls happen for alt-text.

- `pages/pro.js` → imports `generateAltText` (line 26); uses it in the manual
  "Generate Alt Text" button handler (~L2279) and in the auto-generate-on-publish
  path (~L3222).
- `pages/api/suredone-create-listing.js` → imports the template module (line 9);
  flow checks **cached Firebase alt-text first**, falls back to template
  generation, then caches the result to Firebase for reuse (~L1391–1428).

**Implication:** No alt-text API costs. Do not re-introduce a `fetch` to the
alt-text endpoint without an explicit decision.

### 2b. Background removal 800px pre-resize — ✅ DEPLOYED (was listed as "on the horizon")
`pages/api/photos/remove-bg.js` (141 lines) current pipeline:

1. Pre-resize to **800px max with `sharp`** (L38–55) — *this is the fix that was
   pending; it's in place.*
2. POST raw bytes to `http://104.131.11.17:7000/remove-bg-raw` (L59–63) — rembg
   droplet is **primary**.
3. Upscale result to 1600px PNG (L80–83).
4. JPEG fallback if result > 3MB (L87–97).
5. **Remove.bg fallback** only if rembg throws AND `REMOVE_BG_API_KEY` exists
   (L108–134).

**We did NOT revert to Remove.bg.** The droplet is primary; Remove.bg is an
error-only catch-all. The Vercel 30-second timeout on large images should be
resolved by the 800px pre-resize.

### 2c. Claude endpoint count was wrong
`SYSTEM-AUDIT.md` said "All 6 Claude API endpoints." Actual count is **10
actively-called** Claude endpoints (plus 1 dormant: `generate-alt-text.js`).
All now on `claude-sonnet-4-6`.

---

## 3. HOUSEKEEPING NOTES

- **Dormant file:** `pages/api/photos/generate-alt-text.js` still exists but
  nothing calls it (alt-text is now template-based). Its model string was
  updated along with the rest — harmless. **Optional cleanup:** delete this file
  later so no one accidentally re-wires a call to the paid endpoint.
- **Stale snapshot reminder:** The Project Knowledge file copies loaded into the
  Claude.ai project were ~3–4 months old this session (line numbers and file
  paths had drifted; several files were missing). When in doubt, confirm against
  the live repo via Claude Code rather than the project snapshot.
- **Uncommitted-but-harmless:** `.DS_Store` (macOS Finder junk) and `HANDOFF.md`
  were the only uncommitted local changes. `.DS_Store` should ideally be added to
  `.gitignore` so it stops getting tracked.

---

## 4. OPEN / ON THE HORIZON (still genuinely pending)

- **Verify first listings post-deploy** look correct on Sonnet 4.6 (title, specs,
  description wording).
- **Background removal — confirm the original pain point is resolved.** If the
  remembered "issues" were the Vercel large-image timeout, the 800px pre-resize
  should cover it — confirm in real use. The silver/white-on-white limitation is
  a photography fix (colored backdrop), not code.
- **`.DS_Store` → `.gitignore`** (minor cleanup).
- **Optional:** delete dormant `generate-alt-text.js`.
- **Future model retirements:** all Claude model strings live in the `pages/api/`
  endpoints listed in §1. Next retirement is a known one-step find-and-replace
  of the model string — not a mystery 500.
- Carried over from prior notes (not addressed this session): Firebase App Check
  hardening; FCM push-notification integration; item specifics not reloading from
  SureDone when an existing listing is reopened in PLB.
