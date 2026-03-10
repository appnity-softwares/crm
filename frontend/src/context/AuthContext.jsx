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
    const hasElevated = isAdmin || isManager;

    const canAccess = (moduleKey) => {
        if (isAdmin) return true;
        if (!user) return false;
        const perms = user.permissions ? user.permissions.split(',') : [];
        return perms.includes(moduleKey);
    };

    return (
        <AuthContext.Provider value={{ user, loading, login, logout, isAdmin, isManager, hasElevated, canAccess }}>
            {children}
        </AuthContext.Provider>
    );
}

export const useAuth = () => {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error('useAuth must be used within AuthProvider');
    return ctx;
};
