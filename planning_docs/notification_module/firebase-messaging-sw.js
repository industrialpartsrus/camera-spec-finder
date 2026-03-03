// ============================================================
// firebase-messaging-sw.js
// SERVICE WORKER - Place in your /public folder (root of site)
// Handles push notifications when app is in background or closed
// ============================================================

// Import Firebase scripts for service worker
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js');

// ------------------------------------------------------------
// CONFIGURATION - Must match your main app's Firebase config
// ------------------------------------------------------------
firebase.initializeApp({
  apiKey:            'YOUR_API_KEY',
  authDomain:        'YOUR_PROJECT.firebaseapp.com',
  projectId:         'YOUR_PROJECT_ID',
  storageBucket:     'YOUR_PROJECT.appspot.com',
  messagingSenderId: 'YOUR_SENDER_ID',
  appId:             'YOUR_APP_ID',
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
  const action    = payload.data?.action || 'check';

  // Build notification based on alert type
  let title, body, icon, badge, tag;

  switch (alertType) {
    case 'reshelve':
      title = '📦 Reshelve Part';
      body  = `Return ${sku} to shelf ${shelf}`;
      icon  = '/icons/reshelve-icon.png';
      badge = '/icons/badge-reshelve.png';
      tag   = `reshelve-${sku}`;
      break;

    case 'retrieve':
      title = '🔍 Retrieve Part';
      body  = `Pick up ${sku} from shelf ${shelf}`;
      icon  = '/icons/retrieve-icon.png';
      badge = '/icons/badge-retrieve.png';
      tag   = `retrieve-${sku}`;
      break;

    case 'urgent':
      title = '🚨 Urgent: Part Needed';
      body  = `${sku} needed immediately — ${shelf}`;
      icon  = '/icons/urgent-icon.png';
      badge = '/icons/badge-urgent.png';
      tag   = `urgent-${sku}`;
      break;

    default:
      title = payload.notification?.title || 'Listing Builder Alert';
      body  = payload.notification?.body || 'You have a new notification';
      icon  = '/icons/default-icon.png';
      badge = '/icons/badge-default.png';
      tag   = `alert-${Date.now()}`;
  }

  const notificationOptions = {
    body: body,
    icon: icon,
    badge: badge,
    tag: tag,                        // Prevents duplicate notifications for same item
    renotify: true,                  // Still vibrate/sound even if tag matches
    requireInteraction: alertType === 'urgent',  // Urgent alerts stay until dismissed
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

  const actionUrl = event.notification.data?.url || '/';
  const action = event.action;  // Which button was clicked

  let targetUrl = actionUrl;

  // Route based on which action button was pressed
  if (action === 'mark-done') {
    targetUrl = `/api/tasks/complete?sku=${event.notification.data?.sku}`;
  } else if (action === 'view-details') {
    targetUrl = `/inventory/${event.notification.data?.sku}`;
  } else if (action === 'snooze') {
    // Re-send notification in 5 minutes (handled by opening a snooze endpoint)
    targetUrl = `/api/tasks/snooze?sku=${event.notification.data?.sku}&minutes=5`;
  }

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      // Focus existing tab if open
      for (const client of windowClients) {
        if (client.url.includes(targetUrl) && 'focus' in client) {
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
  // Optionally log dismissed notifications for follow-up
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
        { action: 'mark-done', title: '✅ Done', icon: '/icons/check.png' },
        { action: 'snooze',    title: '⏰ 5 min', icon: '/icons/snooze.png' },
      ];
    case 'retrieve':
      return [
        { action: 'mark-done',    title: '✅ Picked Up', icon: '/icons/check.png' },
        { action: 'view-details', title: '📋 Details',   icon: '/icons/info.png' },
      ];
    case 'urgent':
      return [
        { action: 'mark-done',    title: '✅ On It', icon: '/icons/check.png' },
        { action: 'view-details', title: '📋 Details', icon: '/icons/info.png' },
      ];
    default:
      return [
        { action: 'view-details', title: '📋 View', icon: '/icons/info.png' },
      ];
  }
}
