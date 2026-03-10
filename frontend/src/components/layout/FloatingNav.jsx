import { useState, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import {
    LayoutDashboard, Users, Clock, FolderKanban, FileText,
    DollarSign, Receipt, UserPlus, LogOut, User, Menu, X, ClipboardList, ShieldCheck, ChevronRight, ChevronLeft, Eye, EyeOff
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const combinedNav = [
    { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/employees', icon: Users, label: 'Employees', module: 'employees' },
    { to: '/attendance', icon: Clock, label: 'Attendance' },
    { to: '/projects', icon: FolderKanban, label: 'Projects' },
    { to: '/worklogs', icon: FileText, label: 'Work Logs' },
    { to: '/reports', icon: ClipboardList, label: 'Daily Reports' },
    { to: '/expenses', icon: Receipt, label: 'Expenses', module: 'expenses' },
    { to: '/payroll', icon: DollarSign, label: 'Payroll', module: 'payroll' },
    { to: '/invoices', icon: Receipt, label: 'Invoices', module: 'invoices' },
    { to: '/leads', icon: UserPlus, label: 'Leads', module: 'leads' },
    { to: '/role-access', icon: ShieldCheck, label: 'Role Access', module: 'role-access' },
    { to: '/profile', icon: User, label: 'Profile' },
];

export default function FloatingNav() {
    const { canAccess } = useAuth();
    const navItems = combinedNav.filter(item => !item.module || canAccess(item.module));

    const [isMobile, setIsMobile] = useState(window.innerWidth < 1024);

    useEffect(() => {
        const handleResize = () => setIsMobile(window.innerWidth < 1024);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    // Check if user has hidden it before
    const [isVisible, setIsVisible] = useState(() => {
        const saved = localStorage.getItem('floating_nav_visible');
        return saved === null ? true : saved === 'true';
    });

    const toggleVisibility = () => {
        setIsVisible(!isVisible);
        localStorage.setItem('floating_nav_visible', (!isVisible).toString());
    };

    if (!isVisible) {
        return (
            <button
                onClick={toggleVisibility}
                style={{
                    position: 'fixed',
                    [isMobile ? 'left' : 'right']: 0,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'var(--primary-600)',
                    color: 'white',
                    border: 'none',
                    padding: '12px 6px',
                    borderRadius: isMobile ? '0 8px 8px 0' : '8px 0 0 8px',
                    cursor: 'pointer',
                    zIndex: 2000,
                    boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                }}
            >
                {isMobile ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
            </button>
        );
    }

    return (
        <div className={`modern-floating-nav ${isMobile ? 'mobile' : 'desktop'}`} style={{
            position: 'fixed',
            [isMobile ? 'left' : 'right']: '12px',
            top: '50%',
            transform: 'translateY(-50%)',
            background: 'var(--bg-card)',
            backdropFilter: 'blur(12px)',
            padding: '10px 8px',
            borderRadius: '24px',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
            boxShadow: '0 10px 30px rgba(0,0,0,0.12)',
            border: '1px solid var(--border)',
            zIndex: 1000,
            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
        }}>
            {navItems.map((item) => (
                <NavLink
                    key={item.to}
                    to={item.to}
                    end={item.to === '/'}
                    className={({ isActive }) => `modern-nav-item ${isActive ? 'active' : ''}`}
                    title={item.label}
                    style={({ isActive }) => ({
                        width: '40px',
                        height: '40px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        borderRadius: '16px',
                        color: isActive ? 'white' : 'var(--text-muted)',
                        background: isActive ? 'var(--primary-600)' : 'transparent',
                        transition: 'all 0.2s ease',
                        position: 'relative',
                        cursor: 'pointer'
                    })}
                >
                    <item.icon size={20} />
                    {/* Tooltip purely CSS would be better, but title works for now */}
                </NavLink>
            ))}

            <div style={{ margin: '4px 0', borderTop: '1px solid var(--border-color)', opacity: 0.5 }} />

            <button
                onClick={toggleVisibility}
                style={{
                    width: '40px',
                    height: '40px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: '16px',
                    color: 'var(--text-muted)',
                    background: 'transparent',
                    border: 'none',
                    cursor: 'pointer'
                }}
                title="Hide Menu"
            >
                {isMobile ? <ChevronLeft size={20} /> : <ChevronRight size={20} />}
            </button>
        </div>
    );
}
