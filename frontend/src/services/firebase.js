import { initializeApp } from 'firebase/app';
import { getMessaging, getToken, onMessage } from 'firebase/messaging';

// Firebase config — these are PUBLIC keys, safe to commit.
// They only identify the project; the private service account key stays on the backend.
const firebaseConfig = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY || '',
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || '',
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || 'appnity-crm',
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || '',
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '985815704701',
    appId: import.meta.env.VITE_FIREBASE_APP_ID || '',
};

let app = null;
let messaging = null;

/**
 * Initialize Firebase. Safe to call multiple times — idempotent.
 */
export function initFirebase() {
    if (app) return;

    try {
        app = initializeApp(firebaseConfig);
        messaging = getMessaging(app);
        console.log('🔥 Firebase initialized');
    } catch (err) {
        console.warn('Firebase init failed:', err.message);
    }
}

/**
 * Request notification permission and get the FCM device token.
 * @param {string} vapidKey - The VAPID key from Firebase Console → Cloud Messaging → Web Push certificates
 * @returns {Promise<string|null>} The FCM token or null if denied/failed.
 */
export async function requestFCMToken(vapidKey) {
    if (!messaging) {
        initFirebase();
        if (!messaging) return null;
    }

    try {
        const permission = await Notification.requestPermission();
        if (permission !== 'granted') {
            console.log('🔕 Notification permission denied');
            return null;
        }

        const swUrl = `/firebase-messaging-sw.js?apiKey=${firebaseConfig.apiKey}&authDomain=${firebaseConfig.authDomain}&projectId=${firebaseConfig.projectId}&storageBucket=${firebaseConfig.storageBucket}&messagingSenderId=${firebaseConfig.messagingSenderId}&appId=${firebaseConfig.appId}`;

        const token = await getToken(messaging, {
            vapidKey,
            serviceWorkerRegistration: await navigator.serviceWorker.register(swUrl),
        });

        console.log('📱 FCM token obtained');
        return token;
    } catch (err) {
        console.error('Failed to get FCM token:', err);
        return null;
    }
}

/**
 * Listen for foreground messages (when the app is open).
 * @param {function} callback - Called with { title, body, data } for each message.
 */
export function onForegroundMessage(callback) {
    if (!messaging) return () => {};

    return onMessage(messaging, (payload) => {
        console.log('📩 Foreground message received:', payload);
        callback({
            title: payload.notification?.title || payload.data?.title || 'Notification',
            body: payload.notification?.body || payload.data?.body || '',
            data: payload.data || {},
        });
    });
}
