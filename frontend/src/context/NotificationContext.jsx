import { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { notificationAPI } from '../services/api';
import { useAuth } from './AuthContext';

const NotificationContext = createContext();

export function NotificationProvider({ children }) {
    const { user } = useAuth();
    const [notifications, setNotifications] = useState([]);
    const [loading, setLoading] = useState(false);

    const fetchNotifications = useCallback(async () => {
        if (!user) return;
        try {
            setLoading(true);
            const { data } = await notificationAPI.getAll();
            // Format for UI (convert snake_case to what UI expects if needed)
            const formatted = data.map(n => ({
                ...n,
                time: formatTime(n.created_at)
            }));
            setNotifications(formatted);
        } catch (err) {
            console.error("Failed to fetch notifications:", err);
        } finally {
            setLoading(false);
        }
    }, [user]);

    useEffect(() => {
        fetchNotifications();
        // Optional: poll every 2 minutes
        const interval = setInterval(fetchNotifications, 120000);
        return () => clearInterval(interval);
    }, [fetchNotifications]);

    const addNotification = useCallback(async (notif) => {
        // For client-side triggered notifications that we want to persist,
        // we'd need a POST /api/notifications. 
        // But for now, let's just refresh list as most come from backend actions.
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
