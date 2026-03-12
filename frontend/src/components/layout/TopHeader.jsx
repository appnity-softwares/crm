import { useState, useEffect, useCallback, useRef } from 'react';
import { Bell, Info, CheckCircle, AlertTriangle, X, Search, ChevronDown, Sun, Moon, PanelLeftOpen, PanelLeftClose } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { useNotifications } from '../../context/NotificationContext';
import CommandPalette from '../ui/CommandPalette';

export default function TopHeader() {
    const { user, logout } = useAuth();
    const { dark, toggle: toggleTheme } = useTheme();
    const { notifications, markAllRead, removeNotification, markAsRead } = useNotifications();
    const [showDropdown, setShowDropdown] = useState(false);
    const [showUserMenu, setShowUserMenu] = useState(false);
    const [showPalette, setShowPalette] = useState(false);
    const [sidebarHidden, setSidebarHidden] = useState(localStorage.getItem('sidebar_hidden') === 'true');

    const notificationRef = useRef(null);
    const userMenuRef = useRef(null);

    const unreadCount = notifications.filter(n => !n.read).length;

    // Listen for sidebar toggles from other components
    useEffect(() => {
        const handleToggle = () => {
            setSidebarHidden(localStorage.getItem('sidebar_hidden') === 'true');
        };
        window.addEventListener('sidebar-toggle', handleToggle);
        return () => window.removeEventListener('sidebar-toggle', handleToggle);
    }, []);

    // ⌘K / Ctrl+K global shortcut
    const handleGlobalKeydown = useCallback((e) => {
        if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
            e.preventDefault();
            setShowPalette(prev => !prev);
        }
    }, []);

    useEffect(() => {
        window.addEventListener('keydown', handleGlobalKeydown);
        return () => window.removeEventListener('keydown', handleGlobalKeydown);
    }, [handleGlobalKeydown]);

    // Close on click outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (showDropdown && notificationRef.current && !notificationRef.current.contains(event.target)) {
                setShowDropdown(false);
            }
            if (showUserMenu && userMenuRef.current && !userMenuRef.current.contains(event.target)) {
                setShowUserMenu(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [showDropdown, showUserMenu]);

    return (
        <>
            <header className="top-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <button 
                        className="header-action-btn" 
                        title={sidebarHidden ? "Show Sidebar" : "Hide Sidebar"}
                        onClick={() => {
                            const nextHidden = localStorage.getItem('sidebar_hidden') !== 'true';
                            localStorage.setItem('sidebar_hidden', nextHidden);
                            window.dispatchEvent(new Event('sidebar-toggle'));
                            setSidebarHidden(nextHidden);
                        }}
                    >
                        {sidebarHidden ? <PanelLeftOpen size={20} /> : <PanelLeftClose size={20} />}
                    </button>
                    <div className="header-search-container">
                        <button
                            className="header-search-bar"
                            onClick={() => setShowPalette(true)}
                            type="button"
                        >
                            <Search size={16} />
                            <span className="search-placeholder">Search anything…</span>
                            <kbd className="search-command">⌘K</kbd>
                        </button>
                    </div>
                </div>

                <div className="header-actions">
                    <button className="header-action-btn theme-toggle" onClick={toggleTheme} title="Toggle theme">
                        {dark ? <Sun size={18} /> : <Moon size={18} />}
                    </button>

                    <div className="notification-wrapper" ref={notificationRef}>
                        <button
                            className={`header-action-btn notification-trigger ${unreadCount > 0 ? 'has-unread' : ''}`}
                            onClick={() => {
                                setShowDropdown(!showDropdown);
                                setShowUserMenu(false);
                            }}
                        >
                            <Bell size={20} />
                            {unreadCount > 0 && <span className="notification-badge">{unreadCount}</span>}
                        </button>

                        {showDropdown && (
                            <div className="notification-dropdown">
                                <div className="dropdown-header">
                                    <div className="header-title-row">
                                        <h3>Notifications</h3>
                                        <span className="count-tag">{unreadCount} New</span>
                                    </div>
                                    {unreadCount > 0 && (
                                        <button className="mark-read-btn" onClick={markAllRead}>
                                            <CheckCircle size={14} />
                                            Mark all as read
                                        </button>
                                    )}
                                </div>
                                <div className="dropdown-body">
                                    {notifications.length > 0 ? (
                                        notifications.map(n => (
                                            <div
                                                key={n.id}
                                                className={`notification-item ${n.read ? 'read' : 'unread'}`}
                                                onClick={() => markAsRead(n.id)}
                                            >
                                                <div className={`notification-icon ${n.type}`}>
                                                    {n.type === 'info' && <Info size={16} />}
                                                    {n.type === 'success' && <CheckCircle size={16} />}
                                                    {n.type === 'warning' && <AlertTriangle size={16} />}
                                                </div>
                                                <div className="notification-content">
                                                    <div className="notification-top">
                                                        <span className="notification-title">{n.title}</span>
                                                        <span className="notification-time">{n.time}</span>
                                                    </div>
                                                    <p className="notification-message">{n.message}</p>
                                                </div>
                                                <button className="notification-close" onClick={(e) => { e.stopPropagation(); removeNotification(n.id); }}>
                                                    <X size={14} />
                                                </button>
                                            </div>
                                        ))
                                    ) : (
                                        <div className="empty-notifications">
                                            <div className="empty-icon-wrap">
                                                <Bell size={32} />
                                            </div>
                                            <p>All caught up!</p>
                                            <span>No new notifications at the moment.</span>
                                        </div>
                                    )}
                                </div>
                                <div className="dropdown-footer">
                                    <button>See all notifications</button>
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="header-user-wrap" ref={userMenuRef}>
                        <button className="header-user-btn" onClick={() => {
                            setShowUserMenu(!showUserMenu);
                            setShowDropdown(false);
                        }}>
                            <div className="user-avatar-mini">
                                {user?.name?.charAt(0)}
                            </div>
                            <div className="user-meta-mini">
                                <span className="user-name">{user?.name?.split(' ')[0]}</span>
                                <ChevronDown size={14} />
                            </div>
                        </button>

                        {showUserMenu && (
                            <div className="user-menu-dropdown">
                                <div className="user-menu-header">
                                    <div className="user-avatar-lg">{user?.name?.charAt(0)}</div>
                                    <div className="user-text">
                                        <h4>{user?.name}</h4>
                                        <span>{user?.role}</span>
                                    </div>
                                </div>
                                <div className="user-menu-body">
                                    <a href="/profile">My Profile</a>
                                    <a href="/settings">Account Settings</a>
                                    <div className="menu-divider"></div>
                                    <button onClick={logout} className="logout-menu-btn">Sign Out</button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </header>

            {/* Command Palette (⌘K) */}
            <CommandPalette isOpen={showPalette} onClose={() => setShowPalette(false)} />
        </>
    );
}
