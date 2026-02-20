// ============================================================
// firebase-messaging-sw.js
// SERVICE WORKER - Handles push notifications when app is in background or closed
// ============================================================

// Import Firebase scripts for service worker
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js');

// ------------------------------------------------------------
// CONFIGURATION - Matches main app's Firebase config
// ------------------------------------------------------------
firebase.initializeApp({
  apiKey:            'AIzaSyB5irj-80rpE73sdDESmvpZ6_bTzlwNjdo',
  authDomain:        'camera-spec-finder.firebaseapp.com',
  projectId:         'camera-spec-finder',
  storageBucket:     'camera-spec-finder.firebasestorage.app',
  messagingSenderId: '862939642767',
  appId:             '1:862939642767:web:7f056f12e67f7be5d329fa',
});

const messaging = firebase.messaging();

// ------------------------------------------------------------
// Handle background messages (app not in foreground)
// ------------------------------------------------------------
messaging.onBackgroundMessage((payload) => {
  console.log('📬 Background message received:', payload);

  const alertType = payload.data?.alertType || 'default';
  const sku       = payload.data?.sku || '';
  const shelf     = payload.data?.shelfLocation || '';

  // Build notification based on alert type
  let title, body, tag;

  switch (alertType) {
    case 'reshelve':
      title = '📦 Reshelve Part';
      body  = `Return ${sku} to shelf ${shelf}`;
      tag   = `reshelve-${sku}`;
      break;

    case 'retrieve':
      title = '🔍 Retrieve Part';
      body  = `Pick up ${sku} from shelf ${shelf}`;
      tag   = `retrieve-${sku}`;
      break;

    case 'urgent':
      title = '🚨 Urgent: Part Needed';
      body  = `${sku} needed immediately — ${shelf}`;
      tag   = `urgent-${sku}`;
      break;

    default:
      title = payload.notification?.title || 'Warehouse Alert';
      body  = payload.notification?.body || 'You have a new notification';
      tag   = `alert-${Date.now()}`;
  }

  // Use custom message if provided
  if (payload.data?.message) {
    body = payload.data.message;
  }

  const notificationOptions = {
    body: body,
    icon: '/icons/icon-192x192.png',
    badge: '/icons/icon-192x192.png',
    tag: tag,
    renotify: true,
    requireInteraction: alertType === 'urgent',
    vibrate: getVibrationPattern(alertType),
    data: {
      ...payload.data,
      url: payload.data?.actionUrl || '/',
    },
    actions: getActions(alertType, sku),
  };

  return self.registration.showNotification(title, notificationOptions);
});

// ------------------------------------------------------------
// Handle notification click — open the relevant page
// ------------------------------------------------------------
self.addEventListener('notificationclick', (event) => {
  console.log('🖱️ Notification clicked:', event.notification.tag);
  event.notification.close();

  const action = event.action;
  const data = event.notification.data || {};
  let targetUrl = data.url || '/';

  // Route based on which action button was pressed
  if (action === 'mark-done') {
    // Mark the task as complete via API then open scanner
    targetUrl = '/scanner';
  } else if (action === 'view-details') {
    targetUrl = '/pro';
  }

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      // Focus existing tab if open
      for (const client of windowClients) {
        if ('focus' in client) {
          return client.focus();
        }
      }
      // Otherwise open new tab
      return clients.openWindow(targetUrl);
    })
  );
});

// ------------------------------------------------------------
// Handle notification close (dismissed without clicking)
// ------------------------------------------------------------
self.addEventListener('notificationclose', (event) => {
  console.log('❌ Notification dismissed:', event.notification.tag);
});

// ------------------------------------------------------------
// Vibration patterns per alert type
// ------------------------------------------------------------
function getVibrationPattern(alertType) {
  switch (alertType) {
    case 'reshelve':  return [200, 100, 200, 100, 400];
    case 'retrieve':  return [400, 200, 400, 200, 400];
    case 'urgent':    return [100, 50, 100, 50, 100, 50, 800];
    default:          return [300, 100, 300];
  }
}

// ------------------------------------------------------------
// Action buttons per alert type (max 2 on most platforms)
// ------------------------------------------------------------
function getActions(alertType, sku) {
  switch (alertType) {
    case 'reshelve':
      return [
        { action: 'mark-done', title: '✅ Done' },
        { action: 'view-details', title: '📋 Details' },
      ];
    case 'retrieve':
      return [
        { action: 'mark-done', title: '✅ Picked Up' },
        { action: 'view-details', title: '📋 Details' },
      ];
    case 'urgent':
      return [
        { action: 'mark-done', title: '✅ On It' },
        { action: 'view-details', title: '📋 Details' },
      ];
    default:
      return [
        { action: 'view-details', title: '📋 View' },
      ];
  }
}
