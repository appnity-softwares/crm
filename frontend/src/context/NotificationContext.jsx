import { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import { notificationAPI } from '../services/api';
import { useAuth } from './AuthContext';
import { initFirebase, requestFCMToken, onForegroundMessage } from '../services/firebase';

const NotificationContext = createContext();

// VAPID key from Firebase Console → Cloud Messaging → Web Push certificates
const VAPID_KEY = import.meta.env.VITE_FIREBASE_VAPID_KEY || '';

export function NotificationProvider({ children }) {
    const { user } = useAuth();
    const [notifications, setNotifications] = useState([]);
    const [loading, setLoading] = useState(false);

    const notifiedIds = useRef(new Set());
    const fcmInitialized = useRef(false);

    // ── FCM Setup: Initialize Firebase & register device token ──
    useEffect(() => {
        if (!user || fcmInitialized.current) return;
        if (!VAPID_KEY) {
            console.info('ℹ️ VITE_FIREBASE_VAPID_KEY not set — push notifications disabled');
            return;
        }

        fcmInitialized.current = true;
        initFirebase();

        (async () => {
            try {
                const token = await requestFCMToken(VAPID_KEY);
                if (token) {
                    await notificationAPI.saveToken(token, 'web');
                    console.log('✅ FCM device token registered');
                }
            } catch (err) {
                console.warn('FCM registration failed:', err);
            }
        })();
    }, [user]);

    // ── Listen for foreground FCM messages ──
    useEffect(() => {
        if (!user || !VAPID_KEY) return;

        const unsubscribe = onForegroundMessage(({ title, body, data }) => {
            // Show toast or in-app notification
            showBrowserNotification({ title, message: body, type: data?.type });
            // Refresh the notification list to pick up the new in-app notification
            fetchNotifications();
        });

        return () => {
            if (typeof unsubscribe === 'function') unsubscribe();
        };
    }, [user]); // eslint-disable-line react-hooks/exhaustive-deps

    const requestBrowserPermission = useCallback(async () => {
        if (!("Notification" in window)) return;
        if (Notification.permission === "default") {
            await Notification.requestPermission();
        }
    }, []);

    const showBrowserNotification = useCallback((n) => {
        if (!("Notification" in window) || Notification.permission !== "granted") return;
        if (document.visibilityState === 'visible' && !window.location.pathname.startsWith('/chat')) {
            // Optional: allow even if visible if user is not in chat module
        } else if (document.visibilityState === 'visible') {
            return;
        }
        
        const title = n.title || "New Notification";
        const options = {
            body: n.message,
            icon: "/favicon.ico",
            badge: "/favicon.ico",
            vibrate: [200, 100, 200],
            tag: n.id,
            requireInteraction: false
        };

        const notification = new Notification(title, options);
        notification.onclick = () => {
            window.focus();
            notification.close();
            if (n.url) window.location.href = n.url;
            else if (n.type === 'message') window.location.href = '/chat';
        };
    }, []);

    const fetchNotifications = useCallback(async () => {
        if (!user) return;
        try {
            setLoading(true);
            const { data } = await notificationAPI.getAll();
            const formatted = data.map(n => ({
                ...n,
                time: formatTime(n.created_at)
            }));
            setNotifications(formatted);

            // Trigger Browser Notification for new unread notifications
            data.forEach(n => {
                if (!n.read && !notifiedIds.current.has(n.id)) {
                    showBrowserNotification(n);
                    notifiedIds.current.add(n.id);
                }
            });
        } catch (err) {
            console.error("Failed to fetch notifications:", err);
        } finally {
            setLoading(false);
        }
    }, [user, showBrowserNotification]);

    useEffect(() => {
        requestBrowserPermission();
        fetchNotifications();
        const interval = setInterval(fetchNotifications, 30000);
        return () => clearInterval(interval);
    }, [fetchNotifications, requestBrowserPermission]);

    const addNotification = useCallback(async () => {
        fetchNotifications();
    }, [fetchNotifications]);

    const markAllRead = useCallback(async () => {
        try {
            await notificationAPI.markAllRead();
            setNotifications(prev => prev.map(n => ({ ...n, read: true })));
        } catch (err) {
            console.error("Failed to mark all read:", err);
        }
    }, []);

    const markAsRead = useCallback(async (id) => {
        try {
            await notificationAPI.markRead(id);
            setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
        } catch (err) {
            console.error("Failed to mark read:", err);
        }
    }, []);

    const removeNotification = useCallback(async (id) => {
        try {
            await notificationAPI.remove(id);
            setNotifications(prev => prev.filter(n => n.id !== id));
        } catch (err) {
            console.error("Failed to delete notification:", err);
        }
    }, []);

    return (
        <NotificationContext.Provider value={{
            notifications,
            loading,
            fetchNotifications,
            addNotification,
            markAllRead,
            markAsRead,
            removeNotification
        }}>
            {children}
        </NotificationContext.Provider>
    );
}

function formatTime(dateString) {
    const now = new Date();
    const past = new Date(dateString);
    const diffMs = now - past;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHrs = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHrs / 24);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHrs < 24) return `${diffHrs}h ago`;
    return `${diffDays}d ago`;
}

export const useNotifications = () => useContext(NotificationContext);
