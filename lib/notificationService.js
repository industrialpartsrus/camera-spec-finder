// ============================================================
// notificationService.js
// Client-side Firebase Cloud Messaging service
// ============================================================

import { getMessaging, getToken, onMessage } from 'firebase/messaging';
import { getFirestore, doc, setDoc, getDoc, collection, getDocs, serverTimestamp } from 'firebase/firestore';

// ------------------------------------------------------------
// CONFIGURATION
// ------------------------------------------------------------
const VAPID_KEY = process.env.NEXT_PUBLIC_VAPID_KEY;

// ------------------------------------------------------------
// Initialize FCM
// ------------------------------------------------------------
let messaging = null;

export function initMessaging(firebaseApp) {
  try {
    messaging = getMessaging(firebaseApp);
    console.log('✅ FCM initialized');
    return messaging;
  } catch (err) {
    console.error('❌ FCM init failed:', err);
    return null;
  }
}

// ------------------------------------------------------------
// Request notification permission + get device token
// ------------------------------------------------------------
export async function requestNotificationPermission(firebaseApp, userId, deviceName = 'Unknown Device') {
  if (!('Notification' in window)) {
    throw new Error('This browser does not support notifications');
  }

  const permission = await Notification.requestPermission();
  if (permission !== 'granted') {
    throw new Error('Notification permission denied');
  }

  if (!messaging) {
    initMessaging(firebaseApp);
  }

  // Register service worker
  const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
  console.log('✅ Service Worker registered');

  // Get FCM token
  const token = await getToken(messaging, {
    vapidKey: VAPID_KEY,
    serviceWorkerRegistration: registration,
  });

  if (!token) {
    throw new Error('Failed to get FCM token');
  }

  // Save token to Firestore under the user's device list
  const db = getFirestore(firebaseApp);
  const deviceId = generateDeviceId();

  await setDoc(doc(db, 'users', userId, 'devices', deviceId), {
    token: token,
    deviceName: deviceName,
    platform: detectPlatform(),
    lastActive: serverTimestamp(),
    createdAt: serverTimestamp(),
    notificationsEnabled: true,
  });

  console.log(`✅ Device registered: ${deviceName} (${deviceId})`);
  return { token, deviceId };
}

// ------------------------------------------------------------
// Listen for foreground messages (app is open/visible)
// ------------------------------------------------------------
export function onForegroundMessage(callback) {
  if (!messaging) {
    console.error('FCM not initialized. Call initMessaging() first.');
    return;
  }

  return onMessage(messaging, (payload) => {
    console.log('📬 Foreground message:', payload);

    const { title, body, data } = parsePayload(payload);

    // Trigger vibration if supported
    triggerVibration(data?.alertType || 'default');

    // Play notification sound
    playAlertSound(data?.alertType || 'default');

    // Pass to callback for UI updates
    callback({
      title,
      body,
      data,
      timestamp: new Date(),
    });
  });
}

// ------------------------------------------------------------
// Vibration patterns for different alert types
// ------------------------------------------------------------
const VIBRATION_PATTERNS = {
  // [vibrate, pause, vibrate, pause, ...] in milliseconds
  reshelve:  [200, 100, 200, 100, 400],       // Short-short-long: "put it back"
  retrieve:  [400, 200, 400, 200, 400],        // Three long pulses: "come get this"
  urgent:    [100, 50, 100, 50, 100, 50, 800], // Rapid + long: "hurry!"
  default:   [300, 100, 300],                   // Two medium pulses
};

export function triggerVibration(alertType = 'default') {
  if ('vibrate' in navigator) {
    const pattern = VIBRATION_PATTERNS[alertType] || VIBRATION_PATTERNS.default;
    navigator.vibrate(pattern);
    console.log(`📳 Vibration: ${alertType}`);
  } else {
    console.warn('Vibration API not supported on this device');
  }
}

// ------------------------------------------------------------
// Audio alerts
// ------------------------------------------------------------
const ALERT_SOUNDS = {
  reshelve: '/sounds/reshelve-chime.mp3',
  retrieve: '/sounds/retrieve-alert.mp3',
  urgent:   '/sounds/urgent-beep.mp3',
  default:  '/sounds/default-notify.mp3',
};

export function playAlertSound(alertType = 'default') {
  try {
    const soundUrl = ALERT_SOUNDS[alertType] || ALERT_SOUNDS.default;
    const audio = new Audio(soundUrl);
    audio.volume = 0.7;
    audio.play().catch((err) => {
      // Browsers block autoplay until user interaction
      console.warn('Audio play blocked:', err.message);
    });
  } catch (err) {
    console.warn('Could not play alert sound:', err);
  }
}

// ------------------------------------------------------------
// Get all registered devices for a user
// ------------------------------------------------------------
export async function getUserDevices(firebaseApp, userId) {
  const db = getFirestore(firebaseApp);
  const devicesRef = collection(db, 'users', userId, 'devices');
  const snapshot = await getDocs(devicesRef);

  const devices = [];
  snapshot.forEach((doc) => {
    devices.push({ id: doc.id, ...doc.data() });
  });
  return devices;
}

// ------------------------------------------------------------
// Toggle notifications for a specific device
// ------------------------------------------------------------
export async function toggleDeviceNotifications(firebaseApp, userId, deviceId, enabled) {
  const db = getFirestore(firebaseApp);
  await setDoc(
    doc(db, 'users', userId, 'devices', deviceId),
    { notificationsEnabled: enabled },
    { merge: true }
  );
}

// ------------------------------------------------------------
// Utility: Parse FCM payload into a consistent format
// ------------------------------------------------------------
function parsePayload(payload) {
  return {
    title: payload.notification?.title || payload.data?.title || 'Alert',
    body: payload.notification?.body || payload.data?.body || '',
    data: payload.data || {},
  };
}

// ------------------------------------------------------------
// Utility: Generate a unique device ID
// ------------------------------------------------------------
function generateDeviceId() {
  return 'device_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 8);
}

// ------------------------------------------------------------
// Utility: Detect platform
// ------------------------------------------------------------
function detectPlatform() {
  const ua = navigator.userAgent;
  if (/android/i.test(ua)) return 'Android';
  if (/iPad|iPhone|iPod/.test(ua)) return 'iOS';
  if (/Windows/.test(ua)) return 'Windows';
  if (/Mac/.test(ua)) return 'macOS';
  if (/Linux/.test(ua)) return 'Linux';
  return 'Unknown';
}
