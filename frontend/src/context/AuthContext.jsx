import { createContext, useContext, useState, useEffect } from 'react';
import { authAPI } from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const token = localStorage.getItem('access_token');
        if (token) {
            authAPI.getProfile()
                .then(res => setUser(res.data.user))
                .catch(() => { localStorage.clear(); setUser(null); })
                .finally(() => setLoading(false));
        } else {
            setLoading(false);
        }
    }, []);

    const login = async (email, password) => {
        const { data } = await authAPI.login({ email, password });
        localStorage.setItem('access_token', data.access_token);
        localStorage.setItem('refresh_token', data.refresh_token);
        setUser(data.user);
        return data;
    };

    const logout = () => {
        localStorage.clear();
        setUser(null);
    };

    const isAdmin = user?.role === 'admin';
    const isManager = user?.role === 'manager';
    const isClient = user?.role === 'client';
    const isProspect = user?.role === 'prospect';
    const hasElevated = isAdmin || isManager;
    const isExternal = isClient || isProspect;

    const canAccess = (moduleKey, action = 'read') => {
        if (isAdmin) return true;
        if (!user) return false;
        
        try {
            // Support JSON granular permissions
            const perms = JSON.parse(user.permissions || '{}');
            if (perms[moduleKey]) {
                const modulePerms = perms[moduleKey];
                // If it's just a boolean true, it's legacy-style allow-all-for-module
                if (modulePerms === true) return true;
                // If it's a string, it might be legacy comma-separated
                if (typeof modulePerms === 'string') return modulePerms.includes(action);
                // If it's an object with c,r,u,d flags
                if (modulePerms[action] === true) return true;
            }
        } catch (e) {
            // Fallback for non-JSON strings
            const perms = user.permissions ? user.permissions.split(',') : [];
            return perms.includes(moduleKey);
        }
        return false;
    };

    return (
        <AuthContext.Provider value={{ user, loading, login, logout, isAdmin, isManager, isClient, isProspect, hasElevated, isExternal, canAccess }}>
            {children}
        </AuthContext.Provider>
    );
}

export const useAuth = () => {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error('useAuth must be used within AuthProvider');
    return ctx;
};
