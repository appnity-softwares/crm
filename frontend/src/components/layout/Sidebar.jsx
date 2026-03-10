import { useState, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import {
    LayoutDashboard, Users, Clock, FolderKanban, FileText,
    DollarSign, Receipt, UserPlus, LogOut, User, Sun, Moon, Menu, X, ClipboardList, ShieldCheck, PieChart, MessageSquare, LifeBuoy
} from 'lucide-react';

const navStructure = [
    {
        section: 'Overview', items: [
            { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
            { to: '/chat', icon: MessageSquare, label: 'Company Chat' },
        ]
    },
    {
        section: 'People', items: [
            { to: '/employees', icon: Users, label: 'Employees', module: 'employees' },
            { to: '/attendance', icon: Clock, label: 'Attendance' },
            { to: '/leaves', icon: ClipboardList, label: 'Leaves' },
        ]
    },
    {
        section: 'Work', items: [
            { to: '/projects', icon: FolderKanban, label: 'Projects' },
            { to: '/worklogs', icon: FileText, label: 'Work Logs' },
            { to: '/reports', icon: ClipboardList, label: 'Daily Reports' },
        ]
    },
    {
        section: 'Finance', items: [
            { to: '/finance-analytics', icon: PieChart, label: 'Analytics', module: 'finance' },
            { to: '/expenses', icon: Receipt, label: 'Expenses', module: 'expenses' },
            { to: '/payroll', icon: DollarSign, label: 'Payroll', module: 'payroll' },
            { to: '/invoices', icon: Receipt, label: 'Invoices', module: 'invoices' },
        ]
    },
    {
        section: 'Acquisition', items: [
            { to: '/leads', icon: UserPlus, label: 'Pipeline/Leads', module: 'leads' },
            { to: '/tickets', icon: LifeBuoy, label: 'Support Tickets', module: 'tickets' },
        ]
    },
    {
        section: 'System', items: [
            { to: '/role-access', icon: ShieldCheck, label: 'Role Access', module: 'role-access' },
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
        items: section.items.filter(item => !item.module || canAccess(item.module))
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

    if (isHidden) return (
        <button className="mobile-menu-btn" style={{ display: 'flex' }} onClick={() => {
            localStorage.setItem('sidebar_hidden', 'false');
            window.dispatchEvent(new Event('sidebar-toggle'));
        }}>
            <Menu size={20} />
        </button>
    );

    return (
        <>
            {/* Mobile hamburger */}
            <button className="mobile-menu-btn" onClick={() => setOpen(true)}>
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
                            <div className="sidebar-section-title">{section.section}</div>
                            {section.items.map(item => (
                                <NavLink
                                    key={item.to}
                                    to={item.to}
                                    end={item.to === '/'}
                                    className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
                                    onClick={closeMobile}
                                >
                                    <item.icon size={18} className="sidebar-link-icon" />
                                    <span>{item.label}</span>
                                </NavLink>
                            ))}
                        </div>
                    ))}
                </nav>

                <div className="sidebar-footer">
                    <button className="sidebar-logout" onClick={logout}>
                        <LogOut size={18} />
                        <span>Sign Out</span>
                    </button>
                </div>
            </aside>
        </>
    );
}
