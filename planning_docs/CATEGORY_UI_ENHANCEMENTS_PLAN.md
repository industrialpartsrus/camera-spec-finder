# Category-Specific UI Enhancements - Planning Document

**Created:** February 2, 2026  
**Status:** Planning / Future Implementation  
**Purpose:** Document domain-specific listing requirements that need to be built into the Pro Listing Builder UI to prevent mistakes and improve listing quality.

---

## Overview

The Pro Listing Builder needs category-aware behavior that adapts the UI based on detected product type. Rather than a one-size-fits-all form, certain product categories require special fields, photo prompts, and validation rules based on what buyers actually need to see.

---

## 1. Coil Voltage Items

**Affected Categories:** Contactors, Motor Starters, Control Relays, Safety Relays, Electric Solenoid Valves

**Why It Matters:**  
Coil voltage is the #1 purchase-deciding spec for these items. A contactor with the wrong coil voltage is useless to the buyer. Many of these products share the same base model number with only an extended suffix indicating coil voltage (e.g., LC1D09**B7** = 24VAC coil, LC1D09**F7** = 110VAC coil). Some don't have distinct part numbers at all and rely on the seller to specify.

**Requirements:**
- [ ] UI shows prominent alert: "⚠️ COIL VOLTAGE REQUIRED - Check nameplate and photograph it"
- [ ] Coil voltage field becomes **required** (blocks submission if empty)
- [ ] Photo workflow prompts: "Get a picture of the coil voltage label"
- [ ] AI should attempt to decode coil voltage from extended MPN suffix
- [ ] Common coil voltage values: 24VDC, 24VAC, 48VDC, 110VAC, 120VAC, 208VAC, 230VAC, 240VAC, 277VAC, 480VAC
- [ ] Coil voltage should appear in the listing title when space allows
- [ ] SureDone field: `coilvoltage`

**Detection Triggers:**  
Brand + part number patterns for Schneider/Telemecanique (LC1, LC2, LR2), Allen-Bradley (100-C, 700-), Siemens (3RT, 3RH), Eaton/Cutler-Hammer (DIL, XTCE), plus keywords: contactor, relay, starter, solenoid valve

---

## 2. Allen-Bradley Series & Firmware Revisions

**Affected Categories:** AB PLCs (SLC, MicroLogix, CompactLogix, ControlLogix), AB VFDs (PowerFlex), AB Servo Drives (Kinetix), AB HMIs (PanelView)

**Why It Matters:**  
Rockwell/Allen-Bradley products have Series letters (A, B, C, D) that indicate hardware revisions with potentially different capabilities. More critically, PLC processors, VFDs, and servo drives have **Firmware Revision (FRN)** numbers. Rockwell's programming software (Studio 5000, RSLogix) requires specific firmware versions - if the FRN doesn't match what the customer's project was built with, the software won't connect. This is a major pain point and return reason.

**Requirements:**
- [ ] When brand = Allen-Bradley/Rockwell, auto-show **Series** field with prominent label
- [ ] When category = PLCs/Drives/Servo, auto-show **Firmware Revision** field
- [ ] UI prompt: "Check front label for Series letter (A, B, C, D) and FRN/Rev number"
- [ ] Photo workflow: "Photograph the front label showing Series and Firmware"
- [ ] Title format: "Allen-Bradley 1756-L61 **Series B** PLC Processor **FRN 20**"
- [ ] Both fields should be in the eBay item specifics and description table
- [ ] SureDone fields: `series`, `firmwarerevision` (may need to create in SureDone)

**Detection Triggers:**  
Brand contains "allen" + "bradley" OR "rockwell", part numbers starting with 1756, 1769, 1746, 1766, 1762, 2711, 2198, 20A, 20F, 22A, 22B, 25A, 25B

**Common Series Values:** A, B, C, D, E, F  
**Common FRN Format:** FRN 5.x, FRN 10.x, FRN 13.x, FRN 16.x, FRN 20.x, FRN 24.x, FRN 30.x, FRN 31.x

---

## 3. Emitter/Receiver Pairs (Light Curtains & Paired Sensors)

**Affected Categories:** Light Curtains, Safety Light Curtains, Through-Beam Photoelectric Sensors, Area Sensors

**Why It Matters:**  
These products come as matched pairs (emitter + receiver) with two separate part numbers. This creates multiple listing challenges:
1. Title is limited to 80 characters - can't fit both long part numbers
2. MPN and Model fields only accept one value each
3. Buyers may search by either the emitter OR receiver part number
4. Listing the wrong combination is a return waiting to happen

**Requirements:**
- [ ] **Dual Part Number Mode:** When category detected, UI switches to show:
  - Emitter Part Number field
  - Receiver Part Number field  
  - OR: "Set Part Number" if sold as matched set with single PN
- [ ] **Title Strategy:** Use base/family model in title instead of both full PNs
  - Example: "Banner EZ-Screen LS 24-inch Safety Light Curtain Emitter/Receiver Set"
  - NOT: "Banner LS24E LS24R Safety Light Curtain" (wastes chars, incomplete PNs anyway)
- [ ] **Field Mapping:**
  - Model field → Emitter part number (or set PN)
  - MPN field → Receiver part number (or set PN)
  - Both full PNs go in description specs table
  - Both full PNs go in meta keywords for search
- [ ] **Description table** should clearly list:
  - Emitter Part Number: XXXXX
  - Receiver Part Number: XXXXX
  - Sensing Height/Range
  - Number of Beams
  - Resolution

**Detection Triggers:**  
Keywords: light curtain, safety curtain, emitter, receiver, through-beam, area sensor  
Brands: Banner, Keyence, SICK, Omron, Allen-Bradley (GuardShield), Pilz

---

## 4. Series Field (Expanded Use)

**Affected Categories:** All categories where product family/series identification adds value

**Why It Matters:**  
The "Series" field is currently used primarily for Allen-Bradley PLC series letters, but it has broader value for identifying product families. Buyers often search by series name rather than exact part numbers.

**Requirements:**
- [ ] AI should auto-populate Series when identifiable from part number or product data
- [ ] SureDone field: `series` (already exists)

**Examples by Brand/Category:**
| Brand | Product | Series Examples |
|-------|---------|----------------|
| Allen-Bradley | PLCs | Series A, B, C, D |
| Yaskawa | VFDs | V1000, A1000, GA500, GA700 |
| Siemens | PLCs | S7-300, S7-400, S7-1200, S7-1500 |
| Siemens | VFDs | MicroMaster 420/430/440, SINAMICS G120 |
| SMC | Cylinders | CM2, CQ2, CDQ2, MBB, MGPM |
| Festo | Cylinders | DSNU, DNC, ADVU, ADN |
| Parker | Hydraulic | PVP, PV, PVB |
| Banner | Sensors | Q45, Q60, QS30, S18, M18 |
| SICK | Sensors | WTB, WL, DT35, DFS60 |

---

## 5. Pump Nomenclature Decoding

**Affected Categories:** Hydraulic Pumps, Hydraulic Motors, Centrifugal Pumps, Gear Pumps

**Why It Matters:**  
Pump manufacturers encode extensive specifications directly in the model number. A customer searching for a Vickers PVB5-RSY-20-C-11 can decode: Piston pump, Series B, 5 GPM, right-hand shaft, Y-mounting, 20cc displacement, C-configuration, 11-series. AI should decode this nomenclature to populate item specifics accurately.

**Requirements:**
- [ ] AI prompt should include instruction: "For pumps, decode the model number nomenclature to extract specs"
- [ ] Key specs to extract: pump type, displacement, flow rate (GPM), pressure rating, shaft type/rotation, mounting style, port sizes
- [ ] Brand-specific nomenclature guides could be added to the system for:
  - Vickers (PVB, PVH, V/VQ vane, 2520V, 3525V)
  - Parker (PVP, F1, F2, F3)
  - Rexroth (A4V, A10V, A2F)
  - Eaton/Char-Lynn (H-series, 2000 series, 6000 series)
  - Danfoss (OMP, OMR, OMS, OMT, OMV)

---

## 6. SMC Cylinder/Actuator Nomenclature (Already Partially Addressed)

**Status:** Some work already done on parsing SMC model numbers

**Remaining Work:**
- [ ] Parse suffix codes for: magnetic sensors (-D-), cushions (-K-), mounting brackets (-F1-)
- [ ] Identify main cylinder type from prefix (CM2, CDQ2, MGPM, etc.)
- [ ] Extract bore size and stroke length from model number
- [ ] Flag special options that should be mentioned in listing (double-acting, single-acting, magnetic, cushioned)

---

## Implementation Priority (Suggested)

| Priority | Enhancement | Impact | Effort |
|----------|-------------|--------|--------|
| 1 | Coil Voltage alerts | High - prevents returns | Medium |
| 2 | AB Series & Firmware | High - major customer need | Medium |
| 3 | Emitter/Receiver pairs | Medium - affects subset | Medium |
| 4 | Series field expansion | Medium - improves SEO | Low |
| 5 | Pump nomenclature | Medium - complex items | High |
| 6 | SMC nomenclature refinement | Low - partially done | Low |

---

## Technical Approach

All of these share a common pattern: **category-aware UI configuration**

```javascript
const CATEGORY_UI_CONFIG = {
  'Contactors': {
    requiredFields: ['coilvoltage'],
    photoPrompts: ['Photograph the coil voltage nameplate'],
    alerts: ['⚠️ COIL VOLTAGE REQUIRED'],
    extraFields: ['coilvoltage', 'nemasize', 'auxiliarycontacts']
  },
  'PLCs': {
    conditionalFields: {
      'allen-bradley': ['series', 'firmwarerevision']
    },
    photoPrompts: ['Photograph front label showing Series and FRN'],
    alerts: ['Check for Series letter and Firmware Revision']
  },
  'Light Curtains': {
    dualPartNumber: true,
    partNumberLabels: ['Emitter Part Number', 'Receiver Part Number'],
    titleStrategy: 'family-name',
    photoPrompts: ['Photograph both emitter and receiver labels']
  }
  // ... etc
};
```

This config-driven approach means adding new categories just requires adding an entry to the config object, not rewriting UI code.
