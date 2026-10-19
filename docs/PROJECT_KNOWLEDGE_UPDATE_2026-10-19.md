# PLB — 2026-10-19 Session Summary + Item-Specifics Consolidation Roadmap

Repo: `industrialpartsrus/camera-spec-finder` (Next.js, deploys to Vercel).
Live Pro Listing Builder = `pages/pro.js`. Session worked from live `main`.

---

## 1. Fixes shipped this session

**A. Warranty/guarantee item specifics left blank (DEPLOYED, verified in prod).**
`pages/api/v2/auto-fill-ebay-specifics.js` — any eBay aspect whose name contains
"warranty" or "guarantee" is left blank (sent "None" only if eBay marks it
*required*). Reason: IPRU sells new-surplus/used and does not offer factory
warranties; the real 30-day warranty lives in the description + condition notes.
This also fixed an eBay publish bounce (ErrorCode:21919324 "Durability Guarantee
must be a number 3–99"). Verified via logs: `⊘ Durability Guarantee left blank`.

**B. Pass-2 eBay aspects fetched in-process with retry (DEPLOYED).**
Root cause of intermittent empty Pass-2 specifics: `search-product-v2.js` was
fetching its own `/api/ebay-category-aspects` endpoint over HTTP (a serverless
function calling itself), which cold-starts and fails silently (error swallowed,
no retry) → Pass 2 empty → falls to the clunky fallback mapping. Fix: extracted
the fetch+format+cache into `lib/ebay-aspects.js` (`getCategoryAspects()`, with
built-in retry: 2 attempts, 400/800ms backoff). `ebay-category-aspects.js` is now
a thin HTTP wrapper; `search-product-v2.js` calls `getCategoryAspects()` directly
in-process. The eBay token module (`ebay-token.js`) was NOT the problem — it's
robust (2hr token, 5-min buffer). Intermittency was cold-instance + self-HTTP +
swallowed error. High-volume daily use (the office team) kept instances warm,
masking it; a first-of-day cold listing is where it bit.

**C. Deprecation notes added** to `pages/pro-v2.js` and
`pages/api/v2/get-category-specifics.js` — the abandoned "v2" rebuild. NOT used in
production (nothing navigates to `/pro-v2`; live builder is `pro.js`).
`get-category-specifics.js` contains a HARDCODED, stale product-type→category
table (sensors→183089) — do not trust it. Live category path is
`search-product-v2.js`, which pulls the correct category + aspects from eBay.
Kept, not deleted, because Scott recalls possibly needing parts of them.

**D. Motor-centric fallback gated to motors only (Option A — IN PROGRESS).**
`pages/api/suredone-create-listing.js` — the `SPEC_TO_EBAY_FIELD` fallback is a
MOTOR-ONLY table, but ran on everything. Generic spec keys (`type`, `current`,
`voltage`, `torque`) map to motor-only eBay fields, stamping WRONG data on
non-motors (a sensor got `acmotortype = Inductive Proximity Sensor`,
`fullloadamps = ≤0.1 mA`). Fix: gate on `/motor/i.test(userType)`. Motors keep
the existing table (unchanged, well-tested). Non-motors route leftover specs
through the canonical resolver: known field → send canonical (multi-channel,
eBay + WooCommerce); unknown → send as dynamic `ebayitemspecifics<field>` AND log
`UNMAPPED_DYNAMIC_FIELD:` for the consolidation feedback loop. Edge: "Motor
Starter" contains "motor" → uses motor table (low-harm, rare).

---

## 2. Key architectural facts (confirmed this session)

- **eBay ranks on item specifics + title, NOT description** (Scott's gibberish
  keyword test: keyword in description = not found; in an item specific or title =
  found). → Goal is to fill as many *applicable* item specifics as possible.
- **The resolver never drops a field.** `resolveFieldName` tier-4 always produces
  a valid `ebayitemspecifics<name>` dynamic field, which SureDone auto-creates and
  which DOES appear on the eBay listing. So in the healthy Pass-2 path, specifics
  are not lost — they just may land as eBay-only dynamic fields instead of
  canonical multi-channel ones.
- **Dynamic fields are the sprawl source.** Every new `ebayitemspecifics<x>`
  auto-creates a SureDone custom field, which syncs to WooCommerce as an
  attribute. Too many → slows the WooCommerce site. This is the core tension to
  manage: fill more specifics (search) vs. fewer distinct fields (consolidation).
  They reconcile only if every spec resolves into a finite, curated vocabulary.

### THE BIG FINDING — the consolidation map is ~60% designed, ~40% implemented
`docs/suredone_consolidation_map.xlsx` (built early 2026) documents:
- 840 SureDone headers → **468** canonical attributes
- **276** duplicate columns to eliminate, across **152** merge groups
- Sheets: "Consolidation Map", "Merged Groups Detail", "Full Header Lookup"
  (840 headers → canonical), "Summary Stats".

But the LIVE resolver code only wires:
- `FIELD_ALIASES` (data/suredone-field-names.js): **62** entries
- `AI_FIELD_OVERRIDES` (lib/field-name-resolver.js): **48** entries
- ≈ **110** of the ~276 designed consolidations.

**→ The sprawl keeps growing because ~60% of the designed consolidation was never
translated into the resolver. Finishing that is the single highest-value next
step, and the data already exists in the map.**

Also: the map is ~10 months / 1,000+ listings old, so the LIVE SureDone inventory
has grown past 840 headers. The audit must pull LIVE data, not just the map.

---

## 3. The consolidation goal (Scott's words)

Fill all applicable eBay custom specifics (search), while standardizing to avoid
accumulating thousands of redundant custom fields in SureDone (which bloat
WooCommerce). Two axes of standardization:
1. **Field names:** voltage / AC voltage / input voltage / power requirement → one
   canonical field.
2. **Field values:** 110V / 110vac / 110Vac / 110-120V / 115V / 115Vac → one
   normalized value. (Pattern already exists: `lib/coil-voltage-normalizer.js`
   collapses 115AC/110AC → 120VAC, etc.)

---

## 4. Roadmap (reprioritized by the Big Finding)

1. **Wire the existing map into the resolver (HIGHEST VALUE, do first).**
   Generate the full `FIELD_ALIASES` from the map's "Full Header Lookup"
   (840 headers → canonical) so the resolver executes all 152 merge groups, not
   ~110. Largely mechanical (transform xlsx → resolver format). Collapses most
   ongoing sprawl immediately. Review carefully — it's a core file.
2. **Audit live SureDone inventory** (now >840 after 1,000+ new items). Pull the
   current custom-field list via the SureDone API (app holds SUREDONE_USER/TOKEN);
   enumerate via a fields/settings endpoint or by sampling many items and
   collecting distinct keys. WooCommerce MCP = cross-check (fields sync as
   attributes). Diff vs map+resolver → the gap is the new sprawl worklist.
3. **Consolidation console (Scott's feature idea — the feedback loop).**
   - Allow dynamic field creation when a spec doesn't fit (keep coverage).
   - Log each unmapped field to a persistent store (Firestore `unmappedSpecifics`:
     field, example value, product type, count, first-seen). (Option A seeds this
     via the `UNMAPPED_DYNAMIC_FIELD:` log marker; next step = persist to
     Firestore.)
   - When ≥10 accumulate, badge/alert in PLB/admin → link to a review page.
   - Review page: list unmapped specifics; map each to a canonical field via
     drag-drop OR type-to-search the ~1,000-field set.
   - Persist the decision to a **Firestore-backed dynamic alias store** that the
     resolver reads IN ADDITION to the static `FIELD_ALIASES` — so consolidation
     happens from the UI with no code deploy.
4. **Retroactive bulk migration + delete dead field (RISKY — guard it).**
   Find all listings using the discontinued field, swap in the canonical, delete
   the old field. RECOMMENDATION: NOT fully automatic. One-click with a DRY-RUN
   PREVIEW ("this will change 143 listings: powerrequirement → voltage, 5
   samples"), explicit confirm, BATCHED execution (respect SureDone rate limits),
   rollback log. Delete the old field only after migration confirms zero remaining
   users. Reason: silent auto bulk-edit of live listings = a single bad mapping
   corrupts hundreds of listings at once.
5. **Generalize value normalization** — extend the `coil-voltage-normalizer`
   pattern to a broader normalizer (voltage, amperage, HP, RPM…) applied right
   before specifics are sent.

---

## 5. Where things live (file map)

- Live PLB page: `pages/pro.js`. (Abandoned: `pages/pro-v2.js`.)
- Create/push listing: `pages/api/suredone-create-listing.js` (draft mode:
  `ebayskip=1`, `bigcommerceskip=1`; publish later via Listing Actions → Start/Relist).
- Pass 1 (AI research + category + aspects): `pages/api/search-product-v2.js`.
- Pass 2 (AI fills eBay aspects): `pages/api/v2/auto-fill-ebay-specifics.js`.
- Shared aspects fetcher (NEW): `lib/ebay-aspects.js`.
- eBay OAuth token: `pages/api/ebay-token.js` (env: EBAY_CLIENT_ID/SECRET).
- Name resolver: `lib/field-name-resolver.js` (+ `data/suredone-field-names.js`:
  SUREDONE_FIELD_NAMES, SUREDONE_EBAY_ONLY_FIELDS, FIELD_ALIASES).
- Value normalizer (pattern): `lib/coil-voltage-normalizer.js`.
- Condition mapping: `lib/condition-map.js`.
- Consolidation map: `docs/suredone_consolidation_map.xlsx`.
- Listing links (eBay/SureDone/BigCommerce): `pages/api/suredone/get-listing-urls.js`.

---

## 6. Standing policies / gotchas

- **Warranty/guarantee** eBay specifics: always blank (or "None" if required).
- **Condition**: all internal conditions map via `lib/condition-map.js` to the 5
  SureDone values (New / New Other / Refurbished / Used / For Parts). Idempotent.
- **Claude model string**: `claude-sonnet-4-6` across all API endpoints.
- **Empty Pass-2 specifics on first listing of the day** was a cold-instance token
  timing issue — now fixed by the in-process refactor (B).
- **`usertype`** is Scott's custom field holding the real product description
  (e.g. "Inductive Proximity Sensor", "AC Motor") — distinct from SureDone's own
  `type` field. It's the reliable signal for product-type gating.

---

## 7. Immediate next steps

1. Apply + deploy Option A (motor gating + unmapped logging).
2. Build #1: generate full `FIELD_ALIASES` from the consolidation map (biggest win).
3. Then the live-inventory audit (#2), then the console (#3).
