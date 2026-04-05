import { useState, useEffect } from 'react';
import { configAPI, employeeAPI } from '../services/api';
import { useToast } from '../components/ui/Toast';
import { ToggleLeft, ToggleRight, ShieldCheck, Info, User, Check, X, Search, Settings, Lock, EyeOff } from 'lucide-react';

const MODULES = [
    { key: 'employees', name: 'Employees Management' },
    { key: 'attendance', name: 'Attendance Records' },
    { key: 'worklogs', name: 'Work Logs' },
    { key: 'reports', name: 'KPI Reports' },
    { key: 'projects', name: 'Project Management' },
    { key: 'payroll', name: 'Payroll & Salary', confidential: true },
    { key: 'expenses', name: 'Expense Tracking', confidential: true },
    { key: 'invoices', name: 'Invoice Control', confidential: true },
    { key: 'leads', name: 'Lead CRM' },
    { key: 'income', name: 'Income Data', confidential: true },
    { key: 'role-access', name: 'Access Control' },
];

const PERM_ACTIONS = [
    { key: 'read', label: 'R', color: 'blue' },
    { key: 'create', label: 'C', color: 'green' },
    { key: 'update', label: 'U', color: 'amber' },
    { key: 'delete', label: 'D', color: 'red' },
];

export default function RoleAccess() {
    const toast = useToast();
    const [activeTab, setActiveTab] = useState('global');
    const [flags, setFlags] = useState([]);
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');

    const loadData = async () => {
        setLoading(true);
        try {
            const [flagRes, userRes] = await Promise.all([
                configAPI.getFlags(),
                employeeAPI.getAll()
            ]);
            setFlags(flagRes.data || []);
            setUsers(userRes.data.employees || []);
        } catch { toast('Failed to load settings', 'error'); }
        finally { setLoading(false); }
    };

    useEffect(() => { loadData(); }, []);

    const handleToggleFlag = async (key) => {
        try {
            await configAPI.toggleFlag(key);
            setFlags(flags.map(f => f.key === key ? { ...f, enabled: !f.enabled } : f));
            toast('Feature updated successfully', 'success');
        } catch { toast('Failed to update feature', 'error'); }
    };

    const toggleGranularPermission = async (user, moduleKey, actionKey) => {
        setSaving(true);
        try {
            let perms = {};
            try { 
                perms = user.permissions && user.permissions.startsWith('{') 
                    ? JSON.parse(user.permissions) 
                    : {}; 
            } catch(e) { perms = {}; }

            if (!perms[moduleKey]) perms[moduleKey] = {};
            
            // Handle conversion from legacy comma-string
            if (typeof perms[moduleKey] !== 'object') {
                perms[moduleKey] = { read: true, create: false, update: false, delete: false };
            }
            
            perms[moduleKey][actionKey] = !perms[moduleKey][actionKey];
            const permissionsString = JSON.stringify(perms);

            await employeeAPI.update(user.id, { permissions: permissionsString });
            setUsers(users.map(u => u.id === user.id ? { ...u, permissions: permissionsString } : u));
            toast(`Permissions updated`, 'success');
        } catch { toast('Update failed', 'error'); }
        finally { setSaving(false); }
    };

    const hasSpecificPermission = (user, moduleKey, actionKey) => {
        if (user.role === 'admin') return true;
        try {
            if (!user.permissions) return false;
            if (!user.permissions.startsWith('{')) {
                // Legacy support
                return user.permissions.split(',').includes(moduleKey);
            }
            const perms = JSON.parse(user.permissions);
            if (perms[moduleKey]) {
                const p = perms[moduleKey];
                return p[actionKey] === true;
            }
        } catch (e) {
            return false;
        }
        return false;
    };

    if (loading) return <div className="spinner" />;

    const filteredUsers = users.filter(u =>
        u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        u.email.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="page-content">
            <style>{`
                .perm-btn { width: 32px; height: 32px; border: 1px solid var(--border); border-radius: 6px; cursor: pointer; display: flex; align-items: center; justify-content: center; font-size: 0.65rem; font-weight: 800; transition: 0.2s; background: var(--bg-card); color: var(--text-muted); }
                .perm-btn:hover { border-color: var(--primary-500); }
                .perm-btn--active-read { background: var(--blue-500) !important; border-color: var(--blue-600) !important; color: #fff !important; }
                .perm-btn--active-create { background: var(--green-500) !important; border-color: var(--green-600) !important; color: #fff !important; }
                .perm-btn--active-update { background: var(--amber-500) !important; border-color: var(--amber-600) !important; color: #fff !important; }
                .perm-btn--active-delete { background: var(--red-500) !important; border-color: var(--red-600) !important; color: #fff !important; }
                .perm-btn:disabled { opacity: 0.4; cursor: not-allowed; }
                .module-header { display: flex; flex-direction: column; align-items: center; gap: 4px; }
                .confidential-tag { display: flex; align-items: center; gap: 4px; font-size: 10px; color: var(--red-500); font-weight: bold; }
            `}</style>
            
            <div className="header" style={{ padding: 0, border: 'none', marginBottom: 24, background: 'transparent' }}>
                <div className="header-left">
                    <h1>Role Access Control</h1>
                    <p>Manage system features and user capabilities with granular precision</p>
                </div>
            </div>

            <div className="card" style={{ padding: 0, overflow: 'hidden', border: 'none', background: 'transparent', marginBottom: 24 }}>
                <div style={{ display: 'flex', gap: 32, borderBottom: '1px solid var(--border)', marginBottom: 24 }}>
                    <button onClick={() => setActiveTab('global')} className={`tab-btn ${activeTab === 'global' ? 'active' : ''}`} style={{ padding: '12px 4px', background: 'none', border: 'none', borderBottom: activeTab === 'global' ? '2px solid var(--primary-500)' : '2px solid transparent', color: activeTab === 'global' ? 'var(--primary-500)' : 'var(--text-muted)', fontWeight: 600, cursor: 'pointer' }}>Global Features</button>
                    <button onClick={() => setActiveTab('users')} className={`tab-btn ${activeTab === 'users' ? 'active' : ''}`} style={{ padding: '12px 4px', background: 'none', border: 'none', borderBottom: activeTab === 'users' ? '2px solid var(--primary-500)' : '2px solid transparent', color: activeTab === 'users' ? 'var(--primary-500)' : 'var(--text-muted)', fontWeight: 600, cursor: 'pointer' }}>User Permissions</button>
                </div>
            </div>

            {activeTab === 'global' ? (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: 20 }}>
                    {flags.map(f => (
                        <div key={f.key} className="card" style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                <div style={{ display: 'flex', gap: 12 }}>
                                    <div className="stat-icon blue" style={{ width: 40, height: 40 }}><ShieldCheck size={20} /></div>
                                    <div>
                                        <h3 style={{ margin: 0, fontSize: '1rem' }}>{f.name}</h3>
                                        <code style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{f.key}</code>
                                    </div>
                                </div>
                                <button onClick={() => handleToggleFlag(f.key)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: f.enabled ? 'var(--green-500)' : 'var(--text-muted)', display: 'flex', padding: 0 }}>
                                    {f.enabled ? <ToggleRight size={40} /> : <ToggleLeft size={40} />}
                                </button>
                            </div>
                            <div style={{ background: 'var(--bg-body)', padding: '12px 16px', borderRadius: 'var(--radius-sm)', display: 'flex', gap: 10, alignItems: 'center', fontSize: '0.85rem' }}>
                                <Info size={14} style={{ color: 'var(--primary-500)' }} />
                                <span>This feature is currently <strong>{f.enabled ? 'Enabled' : 'Disabled'}</strong> globally.</span>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="card" style={{ padding: 24 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, gap: 16 }}>
                        <div className="datatable-search" style={{ flex: 1, maxWidth: 400 }}>
                            <Search size={16} />
                            <input placeholder="Search users by name or email..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
                        </div>
                        <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Showing {filteredUsers.length} users</div>
                    </div>

                    <div className="table-wrapper" style={{ overflowX: 'auto' }}>
                        <table style={{ borderCollapse: 'separate', borderSpacing: '0 8px' }}>
                            <thead>
                                <tr style={{ background: 'none' }}>
                                    <th style={{ background: 'none', paddingLeft: 0, minWidth: 200 }}>User & Role</th>
                                    {MODULES.map(m => (
                                        <th key={m.key} style={{ textAlign: 'center', minWidth: 160, background: 'none' }}>
                                            <div className="module-header">
                                                <div style={{ fontSize: '0.8rem', fontWeight: 600 }}>{m.name.split(' ')[0]}</div>
                                                {m.confidential && (
                                                    <div className="confidential-tag">
                                                        <Lock size={10} /> LOCK
                                                    </div>
                                                )}
                                                <div style={{ fontSize: '0.65rem', fontWeight: 500, color: 'var(--text-muted)' }}>C | R | U | D</div>
                                            </div>
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {filteredUsers.map(u => (
                                    <tr key={u.id}>
                                        <td style={{ borderBottom: '1px solid var(--border)', background: 'none' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                                <div className="stat-icon gray" style={{ width: 36, height: 36, borderRadius: '50%' }}><User size={18} /></div>
                                                <div>
                                                    <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>{u.name}</div>
                                                    <div className="badge gray" style={{ fontSize: '0.65rem', padding: '2px 6px' }}>{u.role.toUpperCase()}</div>
                                                </div>
                                            </div>
                                        </td>
                                        {MODULES.map(m => (
                                            <td key={m.key} style={{ borderBottom: '1px solid var(--border)', background: 'none' }}>
                                                <div style={{ display: 'flex', justifyContent: 'center', gap: 4 }}>
                                                    {PERM_ACTIONS.map(a => {
                                                        const active = hasSpecificPermission(u, m.key, a.key);
                                                        return (
                                                            <button
                                                                key={a.key}
                                                                title={`${a.key} permission for ${m.name}`}
                                                                className={`perm-btn ${active ? `perm-btn--active-${a.key}` : ''}`}
                                                                disabled={u.role === 'admin' || saving}
                                                                onClick={() => toggleGranularPermission(u, m.key, a.key)}
                                                            >
                                                                {a.label}
                                                            </button>
                                                        );
                                                    })}
                                                </div>
                                            </td>
                                        ))}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    <div style={{ marginTop: 24, padding: 16, background: 'var(--bg-body)', borderRadius: 8, fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                        <Info size={14} style={{ marginRight: 8, verticalAlign: 'middle', color: 'var(--primary-500)' }} />
                        <strong>CRUD Matrix:</strong> (C) Create, (R) Read, (U) Update, (D) Delete. Granular control allows you to restrict Managers or Employees from specific actions like deleting projects or viewing income.
                    </div>
                </div>
            )}
        </div>
    );
}
