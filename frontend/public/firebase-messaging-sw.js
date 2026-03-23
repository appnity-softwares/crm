// Firebase Messaging Service Worker
// This handles push notifications when the app is in the background.

/* eslint-disable no-undef */
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js');

const urlParams = new URLSearchParams(location.search);

firebase.initializeApp({
    apiKey: urlParams.get('apiKey') || '',
    authDomain: urlParams.get('authDomain') || '',
    projectId: urlParams.get('projectId') || 'appnity-crm',
    storageBucket: urlParams.get('storageBucket') || '',
    messagingSenderId: urlParams.get('messagingSenderId') || '985815704701',
    appId: urlParams.get('appId') || '',
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
    console.log('[SW] Background message received:', payload);

    const title = payload.notification?.title || payload.data?.title || 'Appnity CRM';
    const options = {
        body: payload.notification?.body || payload.data?.body || '',
        icon: '/icon-192.png',
        badge: '/icon-72.png',
        tag: payload.data?.type || 'default',
        data: payload.data || {},
    };

    self.registration.showNotification(title, options);
});

// Handle notification click — open the app
self.addEventListener('notificationclick', (event) => {
    event.notification.close();

    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
            // If a window is already open, focus it
            for (const client of clientList) {
                if (client.url.includes(self.location.origin) && 'focus' in client) {
                    return client.focus();
                }
            }
            // Otherwise open a new window
            if (clients.openWindow) {
                return clients.openWindow('/');
            }
        })
    );
});
