# 🔔 Warehouse Notification Module
## For Listing Builder Pro / Photo Station / Inventory Scanner

Free push notifications with vibration and sound alerts for warehouse operations.
Built on Firebase Cloud Messaging (FCM) — **zero per-message cost**.

---

## 📁 Files Overview

| File | Purpose | Where it goes |
|------|---------|---------------|
| `notificationService.js` | Client-side FCM setup, permissions, vibration | Your app's `/lib` or `/services` folder |
| `firebase-messaging-sw.js` | Background push handler (Service Worker) | **Must be in `/public` root** |
| `sendNotification.js` | Server-side notification sender | `/api/notify.js` (Vercel API route) |
| `NotificationCenter.jsx` | React UI component (bell + alert panel) | Your components folder |

---

## 🚀 Setup Steps

### Step 1: Firebase Console Setup

1. Go to [Firebase Console](https://console.firebase.google.com) → Your Project
2. Navigate to **Project Settings** → **Cloud Messaging** tab
3. Under **Web Push certificates**, click **Generate key pair**
4. Copy the key — this is your `VAPID_KEY`

### Step 2: Get Firebase Admin Credentials

1. In Firebase Console → **Project Settings** → **Service accounts**
2. Click **Generate new private key**
3. Save the JSON file securely
4. In Vercel Dashboard → **Settings** → **Environment Variables**, add:
   - `FIREBASE_SERVICE_ACCOUNT_JSON` = (paste the entire JSON contents)
   - `INTERNAL_API_KEY` = (generate a random secret string for API auth)

### Step 3: Install Dependencies

```bash
# You likely have these already, but just in case:
npm install firebase firebase-admin
```

### Step 4: Add Files to Your Project

```
your-project/
├── public/
│   ├── firebase-messaging-sw.js    ← Service worker (MUST be here)
│   ├── sounds/
│   │   ├── reshelve-chime.mp3      ← Optional alert sounds
│   │   ├── retrieve-alert.mp3
│   │   ├── urgent-beep.mp3
│   │   └── default-notify.mp3
│   └── icons/
│       ├── reshelve-icon.png        ← 192x192 notification icons
│       ├── retrieve-icon.png
│       ├── urgent-icon.png
│       └── default-icon.png
├── lib/
│   └── notificationService.js       ← Client-side service
├── components/
│   └── NotificationCenter.jsx       ← React UI
└── api/  (or pages/api/ for Next.js)
    └── notify.js                    ← Server endpoint
```

### Step 5: Update Configuration

**In `notificationService.js`:**
```js
const VAPID_KEY = 'your-actual-vapid-key-from-step-1';
```

**In `firebase-messaging-sw.js`:**
```js
firebase.initializeApp({
  apiKey:            'your-api-key',
  authDomain:        'your-project.firebaseapp.com',
  projectId:         'your-project-id',
  storageBucket:     'your-project.appspot.com',
  messagingSenderId: 'your-sender-id',
  appId:             'your-app-id',
});
```

### Step 6: Add NotificationCenter to Your App

```jsx
// In your main App.jsx or layout component:
import NotificationCenter from './components/NotificationCenter';
import { initializeApp } from 'firebase/app';

const firebaseApp = initializeApp({
  // ... your existing Firebase config
});

function App() {
  const currentUserId = 'worker_123'; // From your auth system

  return (
    <div>
      {/* Your existing app header */}
      <header style={{ display: 'flex', justifyContent: 'space-between', padding: '12px' }}>
        <h1>Listing Builder Pro</h1>
        <NotificationCenter
          firebaseApp={firebaseApp}
          userId={currentUserId}
          deviceName="Scott's iPhone"
        />
      </header>

      {/* Rest of your app */}
    </div>
  );
}
```

---

## 📲 How It Works

### Flow: Reshelve a Part

```
Listing Builder Pro                Firebase                  Worker's Phone
      │                               │                           │
      │  POST /api/notify              │                           │
      │  { type: "reshelve",           │                           │
      │    sku: "AI2847",              │                           │
      │    shelfLocation: "B-14" }     │                           │
      │ ─────────────────────────────► │                           │
      │                                │  FCM Push Notification    │
      │                                │ ─────────────────────────►│
      │                                │                           │ 📳 VIBRATE
      │                                │                           │ 🔔 "Return AI2847
      │                                │                           │     to shelf B-14"
      │                                │                           │
      │                                │                           │ [✅ Done] [⏰ 5min]
```

### Vibration Patterns

| Alert Type | Pattern | Feel |
|------------|---------|------|
| Reshelve   | short-short-long | "put it back" |
| Retrieve   | long-long-long | "come get this" |
| Urgent     | rapid-rapid-rapid-LONG | "hurry!" |

---

## 🔧 Usage Examples

### Send from Listing Builder Pro (client-side)

```js
// When a listing is complete and the part needs to go back on the shelf:
async function reshelvepart(sku, shelf, workerId) {
  await fetch('/api/notify', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.NEXT_PUBLIC_INTERNAL_API_KEY}`,
    },
    body: JSON.stringify({
      userId: workerId,
      type: 'reshelve',
      sku: sku,
      shelfLocation: shelf,
    }),
  });
}

// Example call:
reshelvepart('AI2847', 'B-14', 'worker_mike');
```

### Send from your backend/scripts

```js
import { notifyReshelve, notifyRetrieve, notifyUrgent, broadcastAlert } from './sendNotification';

// Tell Mike to return a part
await notifyReshelve('worker_mike', 'AI2847', 'B-14');

// Tell Mike to pick up a part
await notifyRetrieve('worker_mike', 'AI3021', 'C-07');

// Urgent request to everyone
await broadcastAlert({
  type: 'urgent',
  sku: 'AI1055',
  shelfLocation: 'A-02',
  message: 'Customer waiting — need this ASAP!',
});
```

### Trigger from Inventory Scanner

```js
// After scanning a part that was checked out for photos:
async function onScanComplete(sku, shelfLocation) {
  // Part is done being photographed → tell warehouse to reshelve
  await fetch('/api/notify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      userId: getAssignedWorker(sku),
      type: 'reshelve',
      sku: sku,
      shelfLocation: shelfLocation,
    }),
  });
}
```

---

## ⚠️ Important Notes

### iOS Limitations
- **Safari on iOS** requires the user to "Add to Home Screen" for push notifications to work.
  Regular Safari tabs don't support the Push API.
- **Vibration API is NOT supported on iOS** at all. The phone will still show the
  notification and play a sound, but it won't vibrate from the browser.
- For full vibration support on iOS, you'd need a native app wrapper (like Capacitor).

### Android — Works Great
- Chrome on Android supports everything: push notifications, vibration, and sounds.
- Workers should keep the app "installed" via Chrome's Add to Home Screen for reliability.

### Sound Files
- The module references MP3 files in `/public/sounds/`. You can grab free notification
  sounds from sites like [Pixabay](https://pixabay.com/sound-effects/search/notification/)
  or [Freesound](https://freesound.org/).
- If you skip the sound files, notifications will just use the device's default sound.

### Firestore Structure

The module creates/reads these collections:

```
users/
  {userId}/
    devices/
      {deviceId}/
        token: "fcm-token-string"
        deviceName: "Mike's Android"
        platform: "Android"
        notificationsEnabled: true
        lastActive: Timestamp
        createdAt: Timestamp

alertHistory/
  {alertId}/
    userId: "worker_mike"
    alertType: "reshelve"
    sku: "AI2847"
    shelfLocation: "B-14"
    result: { success: true, sent: 1, failed: 0 }
    createdAt: Timestamp
```

---

## 🔜 Optional Enhancements

1. **Snooze API route** — Create `/api/tasks/snooze` that uses `setTimeout` or a
   scheduled Cloud Function to re-send the notification after N minutes.

2. **Task completion tracking** — Create `/api/tasks/complete` to log when workers
   mark tasks done, giving you metrics on response times.

3. **Worker assignment** — Add a `assignedWorker` field to your inventory items in
   Firestore so the system automatically routes alerts to the right person.

4. **Quiet hours** — Add a `quietHoursStart` / `quietHoursEnd` to user profiles
   to suppress non-urgent alerts outside work hours.

5. **Dashboard** — Query `alertHistory` to show metrics like average response time,
   alerts per worker, and busiest shelves.
