import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import {
    LayoutDashboard, Users, Clock, FolderKanban, FileText,
    DollarSign, Receipt, UserPlus, LogOut, User, Sun, Moon, Menu, X, ClipboardList, ShieldCheck
} from 'lucide-react';

const adminNav = [
    {
        section: 'Overview', items: [
            { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
        ]
    },
    {
        section: 'People', items: [
            { to: '/employees', icon: Users, label: 'Employees' },
            { to: '/attendance', icon: Clock, label: 'Attendance' },
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
            { to: '/payroll', icon: DollarSign, label: 'Payroll' },
            { to: '/invoices', icon: Receipt, label: 'Invoices' },
        ]
    },
    {
        section: 'CRM', items: [
            { to: '/leads', icon: UserPlus, label: 'Leads' },
        ]
    },
    {
        section: 'System', items: [
            { to: '/role-access', icon: ShieldCheck, label: 'Role Access' },
        ]
    },
    {
        section: 'Account', items: [
            { to: '/profile', icon: User, label: 'Profile' },
        ]
    },
];

const employeeNav = [
    {
        section: 'Overview', items: [
            { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
        ]
    },
    {
        section: 'My Work', items: [
            { to: '/attendance', icon: Clock, label: 'Attendance' },
            { to: '/reports', icon: ClipboardList, label: 'Daily Reports' },
            { to: '/worklogs', icon: FileText, label: 'Work Logs' },
            { to: '/projects', icon: FolderKanban, label: 'Projects' },
        ]
    },
    {
        section: 'Finance', items: [
            { to: '/payroll', icon: DollarSign, label: 'My Payroll' },
        ]
    },
    {
        section: 'Account', items: [
            { to: '/profile', icon: User, label: 'Profile' },
        ]
    },
];

export default function Sidebar() {
    const { user, logout, hasElevated } = useAuth();
    const nav = hasElevated ? adminNav : employeeNav;

    const initials = user?.name ? user.name.split(' ').map(n => n[0]).join('').toUpperCase() : '?';
    const [open, setOpen] = useState(false);

    const closeMobile = () => setOpen(false);

    return (
        <>
            {/* Mobile hamburger */}
            <button className="mobile-menu-btn" onClick={() => setOpen(true)}>
                <Menu size={20} />
            </button>

            {/* Overlay for mobile */}
            <div className={`sidebar-overlay ${open ? 'open' : ''}`} onClick={closeMobile} />

            <aside className={`sidebar ${open ? 'open' : ''}`}>
                <div className="sidebar-brand">
                    <div className="sidebar-brand-icon">A</div>
                    <div className="sidebar-brand-text">
                        <h2>Appnity</h2>
                        <small>ERP &bull; CRM</small>
                    </div>
                </div>

                <nav className="sidebar-nav">
                    {nav.map(section => (
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
