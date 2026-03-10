import { useState, useEffect } from 'react';
import { configAPI, employeeAPI } from '../services/api';
import { useToast } from '../components/ui/Toast';
import { ToggleLeft, ToggleRight, ShieldCheck, Info, User, Check, X, Search, Settings } from 'lucide-react';

const MODULES = [
    { key: 'employees', name: 'Employees Management' },
    { key: 'attendance', name: 'Attendance Records' },
    { key: 'worklogs', name: 'Work Logs' },
    { key: 'reports', name: 'KPI Reports' },
    { key: 'projects', name: 'Project Management' },
    { key: 'payroll', name: 'Payroll & Salary' },
    { key: 'expenses', name: 'Expense Tracking' },
    { key: 'invoices', name: 'Invoice Control' },
    { key: 'leads', name: 'Lead CRM' },
    { key: 'role-access', name: 'Access Control' },
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

    const togglePermission = async (user, moduleKey) => {
        setSaving(true);
        try {
            const currentPerms = user.permissions ? user.permissions.split(',') : [];
            let newPerms;
            if (currentPerms.includes(moduleKey)) {
                newPerms = currentPerms.filter(p => p !== moduleKey);
            } else {
                newPerms = [...currentPerms, moduleKey];
            }
            const permissionsString = newPerms.join(',');

            await employeeAPI.update(user.id, { permissions: permissionsString });

            setUsers(users.map(u => u.id === user.id ? { ...u, permissions: permissionsString } : u));
            toast(`Permissions updated for ${user.name}`, 'success');
        } catch {
            toast('Failed to update permissions', 'error');
        } finally {
            setSaving(false);
        }
    };

    const hasPermission = (user, moduleKey) => {
        if (user.role === 'admin') return true;
        const perms = user.permissions ? user.permissions.split(',') : [];
        return perms.includes(moduleKey);
    };

    if (loading) return <div className="spinner" />;

    const filteredUsers = users.filter(u =>
        u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        u.email.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="page-content">
            <div className="header" style={{ padding: 0, border: 'none', marginBottom: 24, background: 'transparent' }}>
                <div className="header-left">
                    <h1>Access & Feature Control</h1>
                    <p>Manage global modules and granular employee permissions</p>
                </div>
            </div>

            <div className="card" style={{ padding: 0, overflow: 'hidden', border: 'none', background: 'transparent', marginBottom: 24 }}>
                <div style={{ display: 'flex', gap: 32, borderBottom: '1px solid var(--border-color)', marginBottom: 24 }}>
                    <button
                        onClick={() => setActiveTab('global')}
                        style={{
                            padding: '12px 4px',
                            background: 'none',
                            border: 'none',
                            borderBottom: activeTab === 'global' ? '2px solid var(--primary-500)' : '2px solid transparent',
                            color: activeTab === 'global' ? 'var(--primary-500)' : 'var(--text-muted)',
                            fontWeight: 600,
                            cursor: 'pointer'
                        }}
                    >
                        Global Features
                    </button>
                    <button
                        onClick={() => setActiveTab('users')}
                        style={{
                            padding: '12px 4px',
                            background: 'none',
                            border: 'none',
                            borderBottom: activeTab === 'users' ? '2px solid var(--primary-500)' : '2px solid transparent',
                            color: activeTab === 'users' ? 'var(--primary-500)' : 'var(--text-muted)',
                            fontWeight: 600,
                            cursor: 'pointer'
                        }}
                    >
                        User Permissions (Granular)
                    </button>
                </div>
            </div>

            {activeTab === 'global' ? (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: 20 }}>
                    {flags.map(f => (
                        <div key={f.key} className="card" style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                <div style={{ display: 'flex', gap: 12 }}>
                                    <div className="stat-icon blue" style={{ width: 40, height: 40 }}>
                                        <ShieldCheck size={20} />
                                    </div>
                                    <div>
                                        <h3 style={{ margin: 0, fontSize: '1rem' }}>{f.name}</h3>
                                        <code style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{f.key}</code>
                                    </div>
                                </div>
                                <button
                                    onClick={() => handleToggleFlag(f.key)}
                                    style={{
                                        background: 'none',
                                        border: 'none',
                                        cursor: 'pointer',
                                        color: f.enabled ? 'var(--green-500)' : 'var(--text-muted)',
                                        display: 'flex',
                                        padding: 0
                                    }}
                                >
                                    {f.enabled ? <ToggleRight size={40} /> : <ToggleLeft size={40} />}
                                </button>
                            </div>

                            <div style={{
                                background: 'var(--bg-body)',
                                padding: '12px 16px',
                                borderRadius: 'var(--radius-sm)',
                                display: 'flex',
                                gap: 10,
                                alignItems: 'center',
                                fontSize: '0.85rem'
                            }}>
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
                            <input
                                placeholder="Search employees to manage access..."
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                            />
                        </div>
                        <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                            Showing {filteredUsers.length} employees
                        </div>
                    </div>

                    <div className="table-wrapper">
                        <table>
                            <thead>
                                <tr>
                                    <th>Employee</th>
                                    <th>Role</th>
                                    {MODULES.map(m => (
                                        <th key={m.key} style={{ textAlign: 'center', fontSize: '10px' }}>{m.name.split(' ')[0]}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {filteredUsers.map(u => (
                                    <tr key={u.id}>
                                        <td>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                                <div className="stat-icon gray" style={{ width: 32, height: 32 }}><User size={16} /></div>
                                                <div>
                                                    <div style={{ fontWeight: 600 }}>{u.name}</div>
                                                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{u.email}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td><span className={`badge ${u.role === 'admin' ? 'blue' : 'gray'}`}>{u.role}</span></td>
                                        {MODULES.map(m => {
                                            const active = hasPermission(u, m.key);
                                            return (
                                                <td key={m.key} style={{ textAlign: 'center' }}>
                                                    <button
                                                        disabled={u.role === 'admin' || saving}
                                                        onClick={() => togglePermission(u, m.key)}
                                                        style={{
                                                            width: 28,
                                                            height: 28,
                                                            borderRadius: '50%',
                                                            border: 'none',
                                                            background: active ? 'var(--green-100)' : 'var(--red-100)',
                                                            color: active ? 'var(--green-600)' : 'var(--red-600)',
                                                            cursor: u.role === 'admin' ? 'default' : 'pointer',
                                                            display: 'inline-flex',
                                                            alignItems: 'center',
                                                            justifyContent: 'center',
                                                            transition: 'all 0.2s',
                                                            opacity: u.role === 'admin' ? 0.5 : 1
                                                        }}
                                                    >
                                                        {active ? <Check size={14} /> : <X size={14} />}
                                                    </button>
                                                </td>
                                            );
                                        })}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    <div style={{ marginTop: 24, padding: 16, background: 'var(--bg-body)', borderRadius: 8, fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                        <Info size={14} style={{ marginRight: 8, verticalAlign: 'middle', color: 'var(--primary-500)' }} />
                        Admins have all-access by default and cannot be restricted. Assigning permissions allows non-admin employees to access specific managerial/admin pages.
                    </div>
                </div>
            )}
        </div>
    );
}
