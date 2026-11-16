## IPRUS house rules (from IPRUS HQ)
- Listing rules used by code live in the private repo
  industrialpartsrus/iprus-standards. Read its README.md before any work on
  item specifics, values, categories or condition. Read it at runtime via
  lib/iprus-standards.js (IPRUS_STANDARDS_TOKEN). Never copy its CSV/JSON
  contents into this repo.
- The Consolidation Map is edited only in the Google Sheet "Consolidation Map
  2026-11-09" (synced hourly into iprus-standards). If a name is missing,
  don't add it in PLB code: report it so HQ adds it to the sheet.
- PLB must never create a SureDone field except an eBay-REQUIRED aspect from
  the live Taxonomy API, named 'ebayitemspecifics' + lowercase alphanumerics,
  logged as NEW_EBAY_REQUIRED_FIELD.
- Decisions, changelog and work board live in the Google Drive folder
  "IPRUS Source of Truth" (owned by IPRUS HQ). Don't change shared rules
  yourself; end each session with a short summary of what changed and any
  rule questions, so Scott can bring it to HQ.
- Ask Scott before: bulk SureDone or eBay writes, deleting products or fields,
  publishing, anything touching live payments.
- Never print or commit API keys or tokens.
- Start each session with git pull; commit and push when done (Vercel deploys
  from main).
