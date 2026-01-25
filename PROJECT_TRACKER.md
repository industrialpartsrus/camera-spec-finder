# Industrial Parts R Us - Tool Suite Project Tracker

> **Purpose:** This document tracks all tools being developed for the Industrial Parts R Us
> e-commerce operation. Update this file when starting/completing major features so all
> development sessions (Claude Code, claude.ai, etc.) stay coordinated.

---

## Master Application: "Scott's Spec Finder Cloud"

**Status:** 🟢 Active Development
**Primary Repo:** `camera-spec-finder`
**Hosting:** Vercel + Firebase
**Integrations:** SureDone, eBay, BigCommerce

---

## Tool Components

### 1. Camera Spec Finder (Core Tool)
| Aspect | Details |
|--------|---------|
| **Status** | 🟢 Functional - Active Refinement |
| **Location** | `/pages/index.js`, `/pages/pro.js` |
| **Purpose** | Scan nameplates → Extract specs → Generate listings |
| **Features** | Image recognition, AI spec extraction, multi-channel export |
| **Last Updated** | 2026-01-25 |
| **Assigned To** | Claude Code (primary), claude.ai (review) |

**Completed:**
- [x] Nameplate image scanning (Claude Vision)
- [x] AI-powered spec extraction
- [x] eBay category mapping (store + marketplace)
- [x] BigCommerce category/brand matching
- [x] SureDone listing creation API
- [x] Firebase real-time sync (Pro mode)
- [x] UPC pool assignment
- [x] Shipping profile selection
- [x] Condition state management

**In Progress:**
- [ ] eBay listing template HTML/CSS
- [ ] Category pre-detection refinement
- [ ] Bulk listing improvements

---

### 2. eBay Listing Template System
| Aspect | Details |
|--------|---------|
| **Status** | 🟡 Not Started |
| **Location** | TBD (suggest: `/templates/ebay/`) |
| **Purpose** | Generate professional HTML templates for eBay listings |
| **Features** | Responsive design, brand consistency, spec tables |
| **Assigned To** | Claude Code |

**Requirements:**
- [ ] Mobile-responsive HTML template
- [ ] Industrial Parts R Us branding
- [ ] Dynamic spec table generation
- [ ] Cross-sell/related items section
- [ ] Warranty/return policy section
- [ ] Contact information block
- [ ] Integration with spec finder output

---

### 3. SureDone MCP Handler
| Aspect | Details |
|--------|---------|
| **Status** | 🟡 Not Started |
| **Location** | TBD (suggest: `/mcp/suredone/`) |
| **Purpose** | MCP (Model Context Protocol) server for direct SureDone operations |
| **Features** | Inventory sync, order management, bulk updates |
| **Assigned To** | TBD |

**Requirements:**
- [ ] MCP server setup
- [ ] SureDone API wrapper functions
- [ ] Inventory read/write operations
- [ ] Order status tracking
- [ ] Bulk update capabilities
- [ ] Error handling and logging

---

### 4. Inventory Scanner & Update Tool
| Aspect | Details |
|--------|---------|
| **Status** | 🟡 Not Started |
| **Location** | TBD (suggest: `/pages/inventory.js` or separate repo) |
| **Purpose** | Scan existing inventory, detect changes, sync across channels |
| **Features** | Barcode scanning, quantity updates, price sync |
| **Assigned To** | TBD |

**Requirements:**
- [ ] Barcode/QR code scanning
- [ ] Inventory count reconciliation
- [ ] Multi-channel sync (eBay, BigCommerce, SureDone)
- [ ] Low stock alerts
- [ ] Location tracking (shelf management)
- [ ] Audit trail/history

---

### 5. Photo Tool (Picture Taking, Editing, Standardization)
| Aspect | Details |
|--------|---------|
| **Status** | 🟡 Not Started |
| **Location** | TBD (suggest: `/pages/photos.js` or separate tool) |
| **Purpose** | Standardize product photography for professional listings |
| **Features** | Background removal, sizing, watermarks, batch processing |
| **Assigned To** | TBD |

**Requirements:**
- [ ] Camera capture interface
- [ ] Background removal/replacement
- [ ] Standard sizing (eBay optimal: 1600x1600)
- [ ] Automatic cropping/centering
- [ ] Watermark application (optional)
- [ ] Batch processing queue
- [ ] Cloud storage integration
- [ ] Naming convention enforcement

---

## Integration Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                  Scott's Spec Finder Cloud                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐           │
│  │ Photo Tool   │  │ Spec Finder  │  │  Inventory   │           │
│  │              │──▶│    (Core)    │◀──│   Scanner    │           │
│  └──────────────┘  └──────┬───────┘  └──────────────┘           │
│                           │                                      │
│                    ┌──────▼───────┐                              │
│                    │   Template   │                              │
│                    │   Generator  │                              │
│                    └──────┬───────┘                              │
│                           │                                      │
│              ┌────────────┼────────────┐                         │
│              ▼            ▼            ▼                         │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐             │
│  │   SureDone   │ │    eBay      │ │  BigCommerce │             │
│  │  MCP Handler │ │   Direct     │ │    Direct    │             │
│  └──────────────┘ └──────────────┘ └──────────────┘             │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Shared Resources

### Data Files (in `/data/`)
| File | Used By | Purpose |
|------|---------|---------|
| `ebay_store_categories.json` | Spec Finder, Templates | eBay store category hierarchy |
| `bigcommerce_categories.json` | Spec Finder | BigCommerce category mapping |
| `bigcommerce_brands.json` | Spec Finder | Brand ID lookup (10K+ brands) |
| `shipping_profiles.json` | Spec Finder, Inventory | Shipping profile options |
| `condition_options.json` | Spec Finder, Inventory | Product condition states |
| `upc_pool.json` | Spec Finder | Available UPC codes |
| `master-fields.js` | ALL TOOLS | Field schema and normalization |

### API Endpoints (in `/pages/api/`)
| Endpoint | Used By | Purpose |
|----------|---------|---------|
| `/api/process-image` | Spec Finder, Photo Tool | AI image analysis |
| `/api/search-product` | Spec Finder | Product lookup |
| `/api/suredone-*` | All Tools | SureDone operations |
| `/api/match-categories` | Spec Finder | Category AI matching |

---

## Development Coordination

### Active Sessions
| Session | Tool | Interface | Branch | Status |
|---------|------|-----------|--------|--------|
| Current | eBay Templates | Claude Code | `claude/ebay-camera-template-nGjCV` | 🟢 Active |
| TBD | MCP Handler | TBD | TBD | 🔴 Not Started |
| TBD | Inventory Scanner | TBD | TBD | 🔴 Not Started |
| TBD | Photo Tool | TBD | TBD | 🔴 Not Started |

### Coordination Rules
1. **Always read this file** at the start of a new session
2. **Update this file** when completing major features
3. **Use separate git branches** for each tool/feature
4. **Document API changes** that affect other tools
5. **Check `/data/` files** before modifying shared resources

---

## Tech Stack Reference

- **Framework:** Next.js 16.x + React 18.x
- **Styling:** Tailwind CSS 3.x
- **Database:** Firebase Firestore
- **Auth:** Firebase Auth
- **AI:** Anthropic Claude (Sonnet 4 for API, Opus 4.5 for dev)
- **Hosting:** Vercel
- **E-commerce:** SureDone (hub), eBay, BigCommerce

---

## Change Log

| Date | Tool | Change | By |
|------|------|--------|-----|
| 2026-01-25 | Core | Category separator fixes, ALL PRODUCTS support | Claude Code |
| 2026-01-25 | Tracker | Created PROJECT_TRACKER.md | Claude Code |

---

*Last Updated: 2026-01-25*
