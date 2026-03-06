import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Search, X, Users, FolderKanban, Receipt, UserPlus, Clock,
    DollarSign, LayoutDashboard, FileText, ClipboardList, User,
    ArrowRight, Hash, CornerDownLeft, ArrowUp, ArrowDown, ShieldCheck,
    Plus, Zap
} from 'lucide-react';
import { employeeAPI, projectAPI, invoiceAPI, leadAPI } from '../../services/api';
import { useAuth } from '../../context/AuthContext';

// ── Quick action definitions ──
const QUICK_ACTIONS = [
    { id: 'nav-dashboard', label: 'Go to Dashboard', icon: LayoutDashboard, section: 'Navigation', path: '/' },
    { id: 'nav-employees', label: 'Go to Employees', icon: Users, section: 'Navigation', path: '/employees', elevated: true },
    { id: 'nav-attendance', label: 'Go to Attendance', icon: Clock, section: 'Navigation', path: '/attendance' },
    { id: 'nav-projects', label: 'Go to Projects', icon: FolderKanban, section: 'Navigation', path: '/projects' },
    { id: 'nav-worklogs', label: 'Go to Work Logs', icon: FileText, section: 'Navigation', path: '/worklogs' },
    { id: 'nav-reports', label: 'Go to Daily Reports', icon: ClipboardList, section: 'Navigation', path: '/reports' },
    { id: 'nav-payroll', label: 'Go to Payroll', icon: DollarSign, section: 'Navigation', path: '/payroll' },
    { id: 'nav-invoices', label: 'Go to Invoices', icon: Receipt, section: 'Navigation', path: '/invoices', elevated: true },
    { id: 'nav-leads', label: 'Go to Leads', icon: UserPlus, section: 'Navigation', path: '/leads', elevated: true },
    { id: 'nav-roles', label: 'Go to Role Access', icon: ShieldCheck, section: 'Navigation', path: '/role-access', elevated: true },
    { id: 'nav-profile', label: 'Go to My Profile', icon: User, section: 'Navigation', path: '/profile' },
    { id: 'act-new-lead', label: 'Create New Lead', icon: Plus, section: 'Quick Actions', path: '/leads', action: 'create', elevated: true },
    { id: 'act-new-project', label: 'Create New Project', icon: Plus, section: 'Quick Actions', path: '/projects', action: 'create', elevated: true },
    { id: 'act-new-invoice', label: 'Create New Invoice', icon: Plus, section: 'Quick Actions', path: '/invoices', action: 'create', elevated: true },
];

const SECTION_ICONS = {
    Employees: Users,
    Projects: FolderKanban,
    Invoices: Receipt,
    Leads: UserPlus,
    Navigation: Zap,
    'Quick Actions': Plus,
    'Recent Searches': Clock,
};

// Helpers
const getRecent = () => {
    try { return JSON.parse(localStorage.getItem('cmd_palette_recent') || '[]'); }
    catch { return []; }
};
const addRecent = (item) => {
    const saved = getRecent().filter(r => r.id !== item.id);
    saved.unshift({ id: item.id, label: item.label, path: item.path, section: item.section });
    localStorage.setItem('cmd_palette_recent', JSON.stringify(saved.slice(0, 5)));
};

export default function CommandPalette({ isOpen, onClose }) {
    const navigate = useNavigate();
    const { hasElevated } = useAuth();
    const [query, setQuery] = useState('');
    const [results, setResults] = useState([]);
    const [loading, setLoading] = useState(false);
    const [activeIndex, setActiveIndex] = useState(0);
    const inputRef = useRef(null);
    const listRef = useRef(null);
    const abortRef = useRef(null);

    // Focus input on open
    useEffect(() => {
        if (isOpen) {
            setQuery('');
            setResults([]);
            setActiveIndex(0);
            setTimeout(() => inputRef.current?.focus(), 80);
        }
    }, [isOpen]);

    // Filter quick actions based on user role
    const filteredActions = useMemo(() =>
        QUICK_ACTIONS.filter(a => !a.elevated || hasElevated),
        [hasElevated]
    );

    // Debounced API search
    const searchAPI = useCallback(async (q) => {
        if (abortRef.current) abortRef.current.abort();
        const controller = new AbortController();
        abortRef.current = controller;

        if (!q.trim()) {
            setResults([]);
            setLoading(false);
            return;
        }

        setLoading(true);

        try {
            const fetches = [
                employeeAPI.getAll().then(r => (r.data.employees || []).map(e => ({
                    id: `emp-${e.id}`, label: e.name, sub: e.email || e.department || e.role,
                    icon: Users, section: 'Employees',
                    path: hasElevated ? `/employees/${e.id}` : '/employees',
                }))),
                projectAPI.getAll().then(r => (r.data.projects || []).map(p => ({
                    id: `proj-${p.id}`, label: p.name, sub: p.status || p.client_name || '',
                    icon: FolderKanban, section: 'Projects', path: '/projects',
                }))),
            ];

            if (hasElevated) {
                fetches.push(
                    invoiceAPI.getAll().then(r => (r.data.invoices || []).map(i => ({
                        id: `inv-${i.id}`, label: `${i.invoice_number} — ${i.client_name}`,
                        sub: `₹${Number(i.total).toLocaleString('en-IN')} • ${i.status}`,
                        icon: Receipt, section: 'Invoices', path: '/invoices',
                    }))),
                    leadAPI.getAll().then(r => (r.data.leads || []).map(l => ({
                        id: `lead-${l.id}`, label: l.name, sub: `${l.company || ''} • ${l.source}`,
                        icon: UserPlus, section: 'Leads', path: '/leads',
                    }))),
                );
            }

            const allData = (await Promise.all(fetches)).flat();

            if (controller.signal.aborted) return;

            const lq = q.toLowerCase();
            const matched = allData.filter(item =>
                item.label.toLowerCase().includes(lq) ||
                (item.sub && item.sub.toLowerCase().includes(lq))
            );

            setResults(matched.slice(0, 20));
            setActiveIndex(0);
        } catch (err) {
            if (err.name !== 'AbortError') console.error('Search error:', err);
        } finally {
            if (!controller.signal.aborted) setLoading(false);
        }
    }, [hasElevated]);

    // Debounce user input
    useEffect(() => {
        if (!isOpen) return;

        const timer = setTimeout(() => {
            searchAPI(query);
        }, 250);

        return () => clearTimeout(timer);
    }, [query, isOpen, searchAPI]);

    // Build display list: combined quick actions filter + api results
    const displayItems = useMemo(() => {
        const lq = query.toLowerCase().trim();

        if (!lq) {
            // Show recent + navigation actions
            const recent = getRecent();
            const recentItems = recent.map(r => ({
                ...r, icon: SECTION_ICONS[r.section] || Hash, section: 'Recent Searches',
            }));
            return [...recentItems, ...filteredActions.slice(0, 8)];
        }

        // Filter quick actions
        const matchedActions = filteredActions.filter(a =>
            a.label.toLowerCase().includes(lq)
        );

        return [...results, ...matchedActions];
    }, [query, results, filteredActions]);

    // Group items by section
    const grouped = useMemo(() => {
        const map = new Map();
        displayItems.forEach(item => {
            const key = item.section || 'Results';
            if (!map.has(key)) map.set(key, []);
            map.get(key).push(item);
        });
        return map;
    }, [displayItems]);

    // Flatten grouped items for keyboard nav
    const flatItems = useMemo(() => {
        const flat = [];
        grouped.forEach(items => flat.push(...items));
        return flat;
    }, [grouped]);

    // Keyboard handling
    useEffect(() => {
        if (!isOpen) return;

        const handler = (e) => {
            switch (e.key) {
                case 'ArrowDown':
                    e.preventDefault();
                    setActiveIndex(i => Math.min(i + 1, flatItems.length - 1));
                    break;
                case 'ArrowUp':
                    e.preventDefault();
                    setActiveIndex(i => Math.max(i - 1, 0));
                    break;
                case 'Enter':
                    e.preventDefault();
                    if (flatItems[activeIndex]) selectItem(flatItems[activeIndex]);
                    break;
                case 'Escape':
                    e.preventDefault();
                    onClose();
                    break;
            }
        };

        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [isOpen, activeIndex, flatItems]);

    // Scroll active item into view
    useEffect(() => {
        const el = listRef.current?.querySelector(`[data-index="${activeIndex}"]`);
        if (el) el.scrollIntoView({ block: 'nearest' });
    }, [activeIndex]);

    const selectItem = (item) => {
        addRecent(item);
        navigate(item.path);
        onClose();
    };

    if (!isOpen) return null;

    let flatIndex = -1;

    return (
        <>
            <div className="cmd-overlay" onClick={onClose} />
            <div className="cmd-palette">
                {/* Search Input */}
                <div className="cmd-input-wrap">
                    <Search size={20} className="cmd-search-icon" />
                    <input
                        ref={inputRef}
                        type="text"
                        className="cmd-input"
                        placeholder="Search employees, projects, invoices, leads or type a command..."
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        autoComplete="off"
                        spellCheck={false}
                    />
                    {query && (
                        <button className="cmd-clear" onClick={() => { setQuery(''); inputRef.current?.focus(); }}>
                            <X size={16} />
                        </button>
                    )}
                    <kbd className="cmd-esc-key">ESC</kbd>
                </div>

                {/* Loading bar */}
                {loading && <div className="cmd-loading"><div className="cmd-loading-bar" /></div>}

                {/* Results Body */}
                <div className="cmd-body" ref={listRef}>
                    {flatItems.length === 0 && query.trim() && !loading ? (
                        <div className="cmd-empty">
                            <Search size={40} />
                            <p>No results for "<strong>{query}</strong>"</p>
                            <span>Try a different search term or browse using the navigation.</span>
                        </div>
                    ) : (
                        Array.from(grouped.entries()).map(([section, items]) => (
                            <div key={section} className="cmd-section">
                                <div className="cmd-section-title">
                                    {section}
                                </div>
                                {items.map(item => {
                                    flatIndex++;
                                    const idx = flatIndex;
                                    const Icon = item.icon || Hash;
                                    return (
                                        <button
                                            key={item.id}
                                            data-index={idx}
                                            className={`cmd-item ${idx === activeIndex ? 'active' : ''}`}
                                            onClick={() => selectItem(item)}
                                            onMouseEnter={() => setActiveIndex(idx)}
                                        >
                                            <div className="cmd-item-icon">
                                                <Icon size={18} />
                                            </div>
                                            <div className="cmd-item-text">
                                                <span className="cmd-item-label">{item.label}</span>
                                                {item.sub && <span className="cmd-item-sub">{item.sub}</span>}
                                            </div>
                                            <ArrowRight size={14} className="cmd-item-arrow" />
                                        </button>
                                    );
                                })}
                            </div>
                        ))
                    )}
                </div>

                {/* Footer with keyboard hints */}
                <div className="cmd-footer">
                    <div className="cmd-hint">
                        <kbd><ArrowUp size={10} /></kbd>
                        <kbd><ArrowDown size={10} /></kbd>
                        <span>Navigate</span>
                    </div>
                    <div className="cmd-hint">
                        <kbd><CornerDownLeft size={10} /></kbd>
                        <span>Select</span>
                    </div>
                    <div className="cmd-hint">
                        <kbd>ESC</kbd>
                        <span>Close</span>
                    </div>
                </div>
            </div>
        </>
    );
}
