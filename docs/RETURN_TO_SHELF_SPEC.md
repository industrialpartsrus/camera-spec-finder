# IPRU Return-to-Shelf Verification Workflow
## Feature Specification — February 14, 2026

---

## Overview

This feature adds a **Return-to-Shelf verification step** that completes the inventory lifecycle loop. After photos are taken, the photographer places items on a staging shelf. Warehouse workers using the Scanner app are notified, verify the item, and confirm it's returned to the correct stock location. Only items that complete this entire chain are marked as finished and removed from the Pro Builder queue.

**Goal**: Three-person accountability for every item from receipt to shelf — with full audit logging.

---

## Complete Item Lifecycle

```
Step 1: SCAN          Step 2: PHOTOGRAPH       Step 3: LIST           Step 4: RETURN
────────────────      ───────────────────      ──────────────         ──────────────────
Scanner App           Photo Station            Pro Listing Builder    Scanner App
(Warehouse Worker)    (Photographer)           (Listing Specialist)   (Warehouse Worker)
                                                                     
Enter brand/part  →   Take guided photos   →   AI builds listing  →  Get notification
Set condition         Upload to Firebase       Review & edit          See photo + shelf
Set qty + shelf       Click "Photos Done"      Send to SureDone       Verify stock level
Assign SKU            → Item goes to                                  Confirm returned
                        "Return to Shelf"                             → Item exits queue
                        staging queue

Logged: scannedBy     Logged: photographedBy   Logged: listedBy       Logged: returnedBy
        scannedAt             photographedAt           listedAt               returnedAt
```

---

## Firebase Schema Changes

### Products Collection — New Fields

```javascript
products/{docId}: {
  // ... existing fields ...

  // === NEW: Lifecycle Tracking ===
  lifecycle: {
    // Step 1: Scanning (already exists, just formalized)
    scannedBy: 'scott',              // Who scanned it
    scannedAt: serverTimestamp(),     // When

    // Step 2: Photography
    photographedBy: 'john',          // Who took photos
    photographedAt: serverTimestamp(),
    photosComplete: true,

    // Step 3: Listing
    listedBy: 'mike',               // Who built the listing
    listedAt: serverTimestamp(),
    suredoneId: '22015',             // SureDone product ID
    sentToSuredone: true,

    // Step 4: Return to Shelf
    returnQueuedAt: serverTimestamp(), // When photographer marked "done"
    returnedBy: 'scott',              // Who put it back on shelf
    returnedAt: serverTimestamp(),     // When confirmed
    returnVerified: true,             // Final confirmation
    shelfVerified: 'B-14',            // Shelf they confirmed it went to
    stockVerified: 2,                 // Stock level they confirmed
  },

  // === NEW: Condition Override Tracking ===
  conditionOverride: {
    wasOverridden: false,
    originalCondition: 'used',         // What Scanner set
    newCondition: 'new_open_box',      // What Pro Builder changed to
    overriddenBy: 'mike',             // Who changed it
    overriddenAt: serverTimestamp(),
    reason: 'Item was actually NIB'    // Optional note
  },

  // === NEW: Lifecycle Status ===
  // Replaces simple 'status' field with more granular tracking
  lifecycleStatus: 'return_pending',
  // Valid values:
  //   'scanned'          - Just entered by Scanner
  //   'photos_pending'   - In photo queue
  //   'photos_complete'  - Photos done, awaiting listing
  //   'listing_pending'  - In Pro Builder queue
  //   'listed'           - Sent to SureDone
  //   'return_pending'   - Photos done, waiting for return to shelf
  //   'return_in_progress' - Warehouse worker claimed the return
  //   'completed'        - All steps done, verified on shelf
}
```

### New Collection: `return_queue`

Lightweight collection for Scanner app to listen to. Items appear here when photographer clicks "Photos Done."

```javascript
return_queue/{docId}: {
  sku: 'AI0184',
  partNumber: 'C2-03CPU+206030304',
  brand: 'AutomationDirect',
  shelfLocation: 'B-14',           // Where it needs to go back
  quantity: 1,                      // Expected stock level
  firstPhotoUrl: 'https://...',    // First photo for visual ID
  photographedBy: 'john',
  queuedAt: serverTimestamp(),
  status: 'pending',               // pending | claimed | completed
  claimedBy: null,                 // Who picked it up
  claimedAt: null,
  completedBy: null,
  completedAt: null,
  productDocId: 'abc123',          // Reference to products collection
}
```

### Activity Log Entries

```javascript
activity_log/{auto_id}: {
  sku: 'AI0184',
  action: 'return_verified',        // New action type
  user: 'scott',
  timestamp: serverTimestamp(),
  details: {
    shelfLocation: 'B-14',
    stockLevel: 2,
    photographedBy: 'john',
    listedBy: 'mike',
    totalLifecycleMinutes: 47       // Time from scan to return
  }
}
```

---

## Scanner App Changes

### New Screen: "Return to Shelf" Tab

Add a tab or button on the Scanner's main screen:

```
┌─────────────────────────────────────┐
│  📦 Inventory Scanner               │
│  Logged in: scott                    │
│                                      │
│  ┌──────────┐  ┌──────────────────┐ │
│  │  🔍 Scan │  │ 📋 Returns (3)  │ │
│  └──────────┘  └──────────────────┘ │
│                  ↑ Badge shows count │
└─────────────────────────────────────┘
```

### Return Queue List View

When user taps "Returns", show items from `return_queue` where `status: 'pending'`:

```
┌─────────────────────────────────────┐
│  ← Back                             │
│  Items Ready for Return (3)          │
│                                      │
│  ┌─────────────────────────────────┐│
│  │ [PHOTO]  AutomationDirect       ││
│  │          C2-03CPU+206030304     ││
│  │          📍 Shelf: B-14         ││
│  │          📦 Qty: 1              ││
│  │          📸 Photos by: john     ││
│  │                    [Claim →]    ││
│  └─────────────────────────────────┘│
│                                      │
│  ┌─────────────────────────────────┐│
│  │ [PHOTO]  Allen-Bradley          ││
│  │          1769-L33ER             ││
│  │          📍 Shelf: A-7          ││
│  │          📦 Qty: 1              ││
│  │          📸 Photos by: john     ││
│  │                    [Claim →]    ││
│  └─────────────────────────────────┘│
└─────────────────────────────────────┘
```

### Return Verification Screen

After tapping "Claim", show verification screen:

```
┌─────────────────────────────────────┐
│  Return Item to Shelf                │
│                                      │
│  ┌─────────────────────────────────┐│
│  │                                 ││
│  │    [LARGE PHOTO OF ITEM]        ││
│  │    (first photo from session)   ││
│  │                                 ││
│  └─────────────────────────────────┘│
│                                      │
│  AutomationDirect                    │
│  C2-03CPU+206030304                  │
│  SKU: AI0184                         │
│                                      │
│  ┌─ Return To ─────────────────────┐│
│  │  📍 Shelf Location: B-14        ││
│  └─────────────────────────────────┘│
│                                      │
│  ┌─ Verify Stock ──────────────────┐│
│  │  Current qty on shelf:          ││
│  │       [  -  ]  [ 1 ]  [  +  ]  ││
│  │  (Verify total qty including    ││
│  │   this item is correct)         ││
│  └─────────────────────────────────┘│
│                                      │
│  ┌─ Status Checks ─────────────────┐│
│  │  ✅ Photos taken by john        ││
│  │  ✅ Published to SureDone       ││
│  │  ✅ Listed on eBay              ││
│  │  ⬜ Returned to shelf B-14      ││
│  └─────────────────────────────────┘│
│                                      │
│  ┌─────────────────────────────────┐│
│  │  ✅ CONFIRM RETURNED TO SHELF   ││
│  │         (big green button)      ││
│  └─────────────────────────────────┘│
│                                      │
└─────────────────────────────────────┘
```

### Confirmation Success Screen

```
┌─────────────────────────────────────┐
│                                      │
│         ✅ Item Returned!            │
│                                      │
│    AutomationDirect                  │
│    C2-03CPU+206030304                │
│    → Shelf B-14                      │
│    → Stock: 1                        │
│                                      │
│    Scanned by: scott (2:10 PM)       │
│    Photos by: john (2:25 PM)         │
│    Listed by: mike (2:35 PM)         │
│    Returned by: scott (2:42 PM)      │
│                                      │
│    Total time: 32 minutes            │
│                                      │
│       [ Return to Queue → ]         │
│                                      │
└─────────────────────────────────────┘
```

---

## Photo Station Changes

### "Photos Done" Button Behavior

When photographer clicks the existing "Photos Done" / completion button:

1. **Current behavior** (keep): Mark `photo_queue` item as complete, write photo URLs to `products` collection
2. **New behavior** (add): Also create a `return_queue` entry:

```javascript
// In Photo Station's completion handler, ADD:
await addDoc(collection(db, 'return_queue'), {
  sku: item.sku,
  partNumber: item.partNumber,
  brand: item.brand,
  shelfLocation: item.shelf || item.shelfLocation || '',
  quantity: item.quantity || 1,
  firstPhotoUrl: photos[0]?.url || photos[0] || '',
  photographedBy: currentUser,
  queuedAt: serverTimestamp(),
  status: 'pending',
  claimedBy: null,
  claimedAt: null,
  completedBy: null,
  completedAt: null,
  productDocId: item.id || item.docId,
});

// Also update products collection:
await updateDoc(doc(db, 'products', item.productDocId), {
  'lifecycle.photographedBy': currentUser,
  'lifecycle.photographedAt': serverTimestamp(),
  'lifecycle.photosComplete': true,
  'lifecycle.returnQueuedAt': serverTimestamp(),
  lifecycleStatus: 'return_pending',
});
```

### Display Instruction to Photographer

After clicking "Done", show:

```
┌─────────────────────────────────────┐
│  ✅ Photos Complete!                 │
│                                      │
│  Please place this item on the       │
│  RETURN TO STOCK shelf.              │
│                                      │
│  📍 Original location: B-14         │
│                                      │
│  A warehouse worker will be          │
│  notified to return it to the shelf. │
│                                      │
│       [ Next Item → ]               │
└─────────────────────────────────────┘
```

---

## Pro Listing Builder Changes

### Queue Lock — Remove ❌ Button

**Current**: Each queue item has an ❌ button to remove it.

**New**: Remove the ❌ button entirely. Items can only leave the queue when `lifecycleStatus: 'completed'`.

```javascript
// BEFORE (current):
<span onClick={() => removeFromQueue(item.id)}
  className="text-red-400 cursor-pointer">✕</span>

// AFTER (new):
// Only show remove for admin users
{isAdmin && (
  <span onClick={() => {
    if (confirm('ADMIN: Remove item from queue? This bypasses the return verification.')) {
      removeFromQueue(item.id);
      logActivity({
        sku: item.sku,
        action: 'admin_queue_removal',
        user: userName,
        details: { reason: 'Admin override' }
      });
    }
  }} className="text-red-400 cursor-pointer text-xs" title="Admin Only">✕</span>
)}
```

**Admin detection**: Simple approach — check username against an admin list:

```javascript
const ADMIN_USERS = ['scott'];  // Add admin usernames here
const isAdmin = ADMIN_USERS.includes(userName?.toLowerCase());
```

### Auto-Remove Completed Items

Items with `lifecycleStatus: 'completed'` should auto-disappear from the queue (or move to a "Completed" section at the bottom):

```javascript
// In the Firestore query, filter to only show non-completed items:
const q = query(
  collection(db, 'products'),
  where('lifecycleStatus', '!=', 'completed'),
  orderBy('createdAt', 'desc')
);

// OR: Show completed items in a collapsible "Completed" section
// at the bottom of the queue with a green checkmark
```

### Condition Override Lock

**Current**: Condition dropdown is always editable.

**New**: Condition dropdown is locked by default. User must check an override box to change it.

```
┌─ Condition ──────────────────────────────┐
│                                           │
│  🔒 Used - Good  (set by scanner: scott) │
│                                           │
│  ☐ Override condition assessment          │
│                                           │
│  [Dropdown appears only when checked]     │
│  [Reason for override: _____________ ]    │
│                                           │
└───────────────────────────────────────────┘
```

```javascript
// State
const [conditionLocked, setConditionLocked] = useState(true);
const [overrideReason, setOverrideReason] = useState('');

// When override checkbox is toggled ON and condition changed:
const handleConditionOverride = async (itemId, newCondition) => {
  await updateDoc(doc(db, 'products', itemId), {
    condition: newCondition,
    conditionNotes: CONDITION_NOTES[newCondition],
    'conditionOverride.wasOverridden': true,
    'conditionOverride.originalCondition': item.condition,
    'conditionOverride.newCondition': newCondition,
    'conditionOverride.overriddenBy': userName,
    'conditionOverride.overriddenAt': serverTimestamp(),
    'conditionOverride.reason': overrideReason,
  });

  logActivity({
    sku: item.sku,
    action: 'condition_override',
    user: userName,
    details: {
      original: item.condition,
      new: newCondition,
      reason: overrideReason,
      originalAssessedBy: item.lifecycle?.scannedBy || 'unknown',
    }
  });
};
```

---

## Lifecycle Status Progression

```
Scanner creates item
    │
    ▼
 ┌──────────┐    Photo Station     ┌─────────────────┐
 │ scanned   │ ──────────────────→ │ photos_complete   │
 └──────────┘    picks up item     └────────┬──────────┘
                                            │
                                   Photo Station marks
                                   "Photos Done"
                                            │
                              ┌─────────────┼─────────────┐
                              ▼                           ▼
                   ┌──────────────────┐       ┌───────────────────┐
                   │ return_pending    │       │ listing_pending    │
                   │ (return_queue     │       │ (Pro Builder       │
                   │  created)         │       │  queue)            │
                   └────────┬─────────┘       └────────┬──────────┘
                            │                          │
                   Scanner claims                Pro Builder
                   return item                   sends to SureDone
                            │                          │
                            ▼                          ▼
                   ┌──────────────────┐       ┌───────────────────┐
                   │ return_verified   │       │ listed             │
                   └────────┬─────────┘       └────────┬──────────┘
                            │                          │
                            └──────────┬───────────────┘
                                       │
                              BOTH steps complete?
                                       │
                                       ▼
                              ┌──────────────────┐
                              │   completed       │
                              │                   │
                              │ Item exits queue  │
                              │ Full audit trail  │
                              └──────────────────┘
```

**Important**: Listing and Return happen in PARALLEL. The listing specialist can work on the listing while the warehouse worker returns it to the shelf. Both must complete before the item is marked `completed`.

---

## Notification System

### Scanner App — Return Queue Badge

Use Firestore `onSnapshot` on `return_queue` where `status == 'pending'`:

```javascript
// In Scanner app, listen for pending returns
const q = query(
  collection(db, 'return_queue'),
  where('status', '==', 'pending')
);

onSnapshot(q, (snapshot) => {
  setReturnCount(snapshot.size);  // Updates badge: "Returns (3)"
});
```

This is real-time — as soon as photographer marks photos done, the Scanner app badge updates automatically. No push notifications needed (Firebase onSnapshot handles it).

---

## Implementation Priority

| Phase | What | Effort | Impact |
|-------|------|--------|--------|
| 1 | Condition override lock in Pro Builder | Small | Medium |
| 2 | Return queue creation in Photo Station | Small | Foundation |
| 3 | Return queue screen in Scanner app | Medium | High |
| 4 | Queue lock in Pro Builder (remove ❌) | Small | High |
| 5 | Auto-complete lifecycle status check | Medium | High |
| 6 | Completed items section in Pro Builder | Small | Nice-to-have |

**Recommended approach**: Build phases 1-4 together as one deployment. Phase 5 can follow once the basic flow is tested.

---

## Testing Checklist

- [ ] Photo Station: "Photos Done" creates return_queue entry
- [ ] Scanner: Return badge shows correct count
- [ ] Scanner: Return list shows photo + shelf + brand + part
- [ ] Scanner: Claim button works, locks item to user
- [ ] Scanner: Verify screen shows correct shelf and stock
- [ ] Scanner: Confirm button updates all Firebase fields
- [ ] Scanner: Item disappears from return queue after confirm
- [ ] Pro Builder: ❌ button hidden for non-admin users
- [ ] Pro Builder: Admin can still remove with confirmation
- [ ] Pro Builder: Completed items auto-hide from queue
- [ ] Pro Builder: Condition locked by default, override logs change
- [ ] Activity log: Full chain visible (scan → photo → list → return)
- [ ] Edge case: Item returned before listing is complete (still shows in Pro Builder)
- [ ] Edge case: Item listed before return is confirmed (waiting for return)
