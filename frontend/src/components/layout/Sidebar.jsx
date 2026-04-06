import { useState, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import {
    LayoutDashboard, Users, Clock, FolderKanban, FileText,
    DollarSign, Receipt, UserPlus, LogOut, User, Sun, Moon, Menu, X, ClipboardList, ShieldCheck, PieChart, MessageSquare, LifeBuoy, BookOpen, GraduationCap, Briefcase, Settings as SettingsIcon
} from 'lucide-react';

const navStructure = [
    {
        section: 'Overview', items: [
            { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
            { to: '/chat', icon: MessageSquare, label: 'Company Chat', roles: ['admin', 'manager', 'employee'] },
        ]
    },
    {
        section: 'People', items: [
            { to: '/employees', icon: Users, label: 'Employees', module: 'employees' },
            { to: '/clients', icon: UserPlus, label: 'Clients', module: 'employees' },
            { to: '/chat/permissions', icon: ShieldCheck, label: 'Chat Access', module: 'employees' },
            { to: '/attendance', icon: Clock, label: 'Attendance', roles: ['admin', 'manager', 'employee', 'trainee'] },
            { to: '/leaves', icon: ClipboardList, label: 'Leaves', roles: ['admin', 'manager', 'employee'] },
        ]
    },
    {
        section: 'Training', items: [
            { to: '/training/courses', icon: BookOpen, label: 'Curricula/Courses', roles: ['admin', 'manager', 'employee', 'trainee'] },
            { to: '/training/students', icon: GraduationCap, label: 'Trainees/Students', module: 'employees' },
            { to: '/training/attendance', icon: Clock, label: 'Trainee Attendance', module: 'employees' },
        ]
    },
    {
        section: 'Work', items: [
            { to: '/projects', icon: FolderKanban, label: 'Projects', roles: ['admin', 'manager', 'employee', 'client'] },
            { to: '/worklogs', icon: FileText, label: 'Work Logs', roles: ['admin', 'manager', 'employee'] },
            { to: '/reports', icon: ClipboardList, label: 'Daily Reports', roles: ['admin', 'manager', 'employee'] },
        ]
    },
    {
        section: 'Finance', items: [
            { to: '/finance-analytics', icon: PieChart, label: 'Analytics', module: 'finance' },
            { to: '/income', icon: DollarSign, label: 'Income', roles: ['admin'] },
            { to: '/expenses', icon: Receipt, label: 'Expenses', module: 'expenses' },
            { to: '/payroll', icon: DollarSign, label: 'Payroll', module: 'payroll' },
            { to: '/invoices', icon: Receipt, label: 'Invoices', roles: ['admin', 'manager', 'employee', 'client'] },
        ]
    },
    {
        section: 'Acquisition', items: [
            { to: '/leads', icon: UserPlus, label: 'Pipeline/Leads', module: 'leads' },
            { to: '/tickets', icon: LifeBuoy, label: 'Support Tickets', roles: ['admin', 'manager', 'employee', 'client', 'trainee', 'prospect'] },
        ]
    },
    {
        section: 'System', items: [
            { to: '/role-access', icon: ShieldCheck, label: 'Role Access', module: 'role-access' },
            { to: '/settings', icon: SettingsIcon, label: 'Settings', module: 'role-access' },
        ]
    },
    {
        section: 'Account', items: [
            { to: '/profile', icon: User, label: 'Profile' },
        ]
    },
];

export default function Sidebar() {
    const { user, logout, canAccess } = useAuth();

    const filteredNav = navStructure.map(section => ({
        ...section,
        items: section.items.filter(item => {
            // If it has a module, use module check
            if (item.module) return canAccess(item.module);
            // If it has explicit roles, check role
            if (item.roles) return item.roles.includes(user?.role);
            // Default: visible to everyone
            return true;
        })
    })).filter(section => section.items.length > 0);

    const initials = user?.name ? user.name.split(' ').map(n => n[0]).join('').toUpperCase() : '?';
    const [open, setOpen] = useState(false);
    const [isMini, setIsMini] = useState(() => localStorage.getItem('sidebar_mode') === 'mini');
    const [isHidden, setIsHidden] = useState(() => localStorage.getItem('sidebar_hidden') === 'true');

    useEffect(() => {
        const handleToggle = () => {
            const hidden = localStorage.getItem('sidebar_hidden') === 'true';
            setIsHidden(hidden);
            document.body.classList.toggle('sidebar-hidden', hidden);
        };
        window.addEventListener('sidebar-toggle', handleToggle);

        // Initial setup
        if (isMini) document.body.classList.add('sidebar-mini');
        if (isHidden) document.body.classList.add('sidebar-hidden');

        return () => window.removeEventListener('sidebar-toggle', handleToggle);
    }, []);

    const toggleSidebarMode = () => {
        const next = !isMini;
        setIsMini(next);
        localStorage.setItem('sidebar_mode', next ? 'mini' : 'full');
        document.body.classList.toggle('sidebar-mini', next);
    };

    const closeMobile = () => setOpen(false);

    if (isHidden) return null; // Let TopHeader handle the show icon

    return (
        <>
            {/* Mobile hamburger (only if not hidden) */}
            <button className="mobile-menu-btn" onClick={() => setOpen(true)} style={{ position: 'fixed', top: 15, left: 15, zIndex: 100, background: 'var(--primary-600)', color: 'white', border: 'none', borderRadius: 8, padding: 8, display: 'none' }}>
                <Menu size={20} />
            </button>

            {/* Overlay for mobile */}
            <div className={`sidebar-overlay ${open ? 'open' : ''}`} onClick={closeMobile} />

            <aside className={`sidebar ${open ? 'open' : ''} ${isMini ? 'mini' : ''}`}>
                <div className="sidebar-brand">
                    <div className="sidebar-brand-icon">A</div>
                    {!isMini && (
                        <div className="sidebar-brand-text">
                            <h2>Appnity</h2>
                            <small>ERP &bull; CRM</small>
                        </div>
                    )}
                    <button className="sidebar-mode-toggle" onClick={toggleSidebarMode}>
                        <Menu size={16} />
                    </button>
                </div>

                <nav className="sidebar-nav">
                    {filteredNav.map(section => (
                        <div className="sidebar-section" key={section.section}>
                            {!isMini && <div className="sidebar-section-title">{section.section}</div>}
                            {section.items.map(item => (
                                <NavLink
                                    key={item.to}
                                    to={item.to}
                                    end={item.to === '/'}
                                    className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
                                    onClick={closeMobile}
                                    title={isMini ? item.label : ''}
                                >
                                    <item.icon size={18} className="sidebar-link-icon" />
                                    {!isMini && <span>{item.label}</span>}
                                </NavLink>
                            ))}
                        </div>
                    ))}
                </nav>

                <div className="sidebar-footer">
                    <div className="user-info">
                        <div className="user-avatar">{initials}</div>
                        {!isMini && (
                            <div className="user-details">
                                <div className="user-name">{user?.name}</div>
                                <div className="user-role">{user?.role}</div>
                            </div>
                        )}
                        <button className="logout-btn" onClick={logout} title="Logout">
                            <LogOut size={18} />
                        </button>
                    </div>
                </div>
            </aside>
        </>
    );
}

const footerStyle = `
.sidebar-footer {
    padding: 16px;
    border-top: 1px solid var(--border);
    margin-top: auto;
}
.user-info {
    display: flex;
    align-items: center;
    gap: 12px;
}
.user-avatar {
    width: 36px;
    height: 36px;
    border-radius: 8px;
    background: var(--primary-100);
    color: var(--primary-700);
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: 700;
    font-size: 0.8rem;
    flex-shrink: 0;
}
.user-details {
    flex: 1;
    overflow: hidden;
}
.user-name {
    font-weight: 600;
    font-size: 0.85rem;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}
.user-role {
    font-size: 0.7rem;
    color: var(--text-muted);
    text-transform: capitalize;
}
.logout-btn {
    background: none;
    border: none;
    color: var(--red-500);
    cursor: pointer;
    padding: 8px;
    border-radius: 6px;
    transition: 0.2s;
}
.logout-btn:hover {
    background: var(--red-50);
}
`;
