import { useState, useEffect } from 'react';
import { configAPI } from '../services/api';
import { useToast } from '../components/ui/Toast';
import { 
    Settings as SettingsIcon, ShieldCheck, Activity, Info, 
    ToggleLeft, ToggleRight, Server, Globe, Cpu, Database, 
    Clock, Search, Filter, ArrowRight
} from 'lucide-react';
import DataTable from '../components/ui/DataTable';

const FEATURE_MODULES = [
    { key: 'attendance', name: 'Attendance Tracking', desc: 'Enable manual and QR-based attendance recording' },
    { key: 'payroll', name: 'Payroll Management', desc: 'Manage basic salary slips and disbursements' },
    { key: 'reports', name: 'Daily Reporting', desc: 'Daily KPI submission and management review' },
    { key: 'finance', name: 'Finance Analytics', desc: 'Income, expense, and company balance analysis' },
    { key: 'training', name: 'Student Training', desc: 'Independent student/course management' },
];

export default function Settings() {
    const toast = useToast();
    const [activeTab, setActiveTab] = useState('features');
    const [flags, setFlags] = useState([]);
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    const loadData = async () => {
        setLoading(true);
        try {
            const [flagsRes, logsRes] = await Promise.all([
                configAPI.getFlags(),
                configAPI.getAuditLogs({ limit: 50 })
            ]);
            setFlags(flagsRes.data || []);
            setLogs(logsRes.data || []);
        } catch { toast('Failed to refresh system settings', 'error'); }
        finally { setLoading(false); }
    };

    useEffect(() => { loadData(); }, []);

    const handleToggleFlag = async (key) => {
        try {
            await configAPI.toggleFlag(key);
            setFlags(flags.map(f => f.key === key ? { ...f, enabled: !f.enabled } : f));
            toast('Feature state updated', 'success');
        } catch { toast('Update failed', 'error'); }
    };

    const auditColumns = [
        { 
            header: 'Timestamp', 
            accessor: 'created_at',
            render: r => <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{new Date(r.created_at).toLocaleString()}</div>
        },
        { 
            header: 'User', 
            accessor: r => r.user?.name || 'System',
            render: r => (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div className="badge gray" style={{ width: 24, height: 24, borderRadius: '50%', padding: 0, display: 'flex', alignItems: 'center', justifyCenter: 'center' }}>{r.user?.name?.[0] || 'S'}</div>
                    <span style={{ fontWeight: 600 }}>{r.user?.name || 'System'}</span>
                </div>
            )
        },
        { 
            header: 'Action', 
            accessor: 'action',
            render: r => (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span className={`badge ${r.action === 'delete' ? 'red' : r.action === 'create' ? 'green' : 'blue'}`} style={{ textTransform: 'uppercase', fontSize: '10px' }}>{r.action}</span>
                    <ArrowRight size={10} style={{ color: 'var(--text-muted)' }} />
                    <span style={{ fontWeight: 500 }}>{r.module}</span>
                </div>
            )
        },
        { 
            header: 'Target ID', 
            accessor: 'target_id',
            render: r => <code style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{r.target_id.split('-')[0]}...</code>
        },
        {
            header: 'Result',
            accessor: 'changes',
            render: r => (
                <div style={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    {r.changes}
                </div>
            )
        }
    ];

    if (loading) return <div className="spinner" />;

    return (
        <div className="page-content">
            <div className="header" style={{ padding: 0, border: 'none', marginBottom: 32, background: 'transparent' }}>
                <div className="header-left">
                    <h1>System Settings</h1>
                    <p>Configure global platform behaviors and monitor administrative activity.</p>
                </div>
            </div>

            <div className="settings-container" style={{ display: 'grid', gridTemplateColumns: '250px 1fr', gap: 32 }}>
                <div className="settings-sidebar">
                    <div className="card" style={{ padding: 8 }}>
                        <button onClick={() => setActiveTab('features')} className={`nav-item ${activeTab === 'features' ? 'active' : ''}`} style={navItemStyle(activeTab === 'features')}>
                            <ShieldCheck size={18} />
                            <span>Global Features</span>
                        </button>
                        <button onClick={() => setActiveTab('audit')} className={`nav-item ${activeTab === 'audit' ? 'active' : ''}`} style={navItemStyle(activeTab === 'audit')}>
                            <Activity size={18} />
                            <span>Audit Logs</span>
                        </button>
                        <button onClick={() => setActiveTab('system')} className={`nav-item ${activeTab === 'system' ? 'active' : ''}`} style={navItemStyle(activeTab === 'system')}>
                            <Server size={18} />
                            <span>System Status</span>
                        </button>
                    </div>
                </div>

                <div className="settings-main">
                    {activeTab === 'features' && (
                        <div className="features-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 20 }}>
                            {flags.map(flag => {
                                const info = FEATURE_MODULES.find(m => m.key === flag.key) || { name: flag.key, desc: 'Advanced platform capability' };
                                return (
                                    <div key={flag.key} className="card" style={{ padding: 24 }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                                            <h3 style={{ margin: 0, fontSize: '1.05rem' }}>{info.name}</h3>
                                            <button onClick={() => handleToggleFlag(flag.key)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: flag.enabled ? 'var(--green-500)' : 'var(--text-muted)' }}>
                                                {flag.enabled ? <ToggleRight size={36} /> : <ToggleLeft size={36} />}
                                            </button>
                                        </div>
                                        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: 0, lineHeight: 1.5 }}>{info.desc}</p>
                                        <div style={{ marginTop: 20, paddingTop: 16, borderTop: '1px solid var(--border)', fontSize: '0.75rem', color: flag.enabled ? 'var(--green-600)' : 'var(--text-muted)', fontWeight: 600 }}>
                                            STATUS: {flag.enabled ? 'ACTIVE' : 'DISABLED'}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    {activeTab === 'audit' && (
                        <div className="card" style={{ padding: 0 }}>
                            <div style={{ padding: 24, borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <h3>Administrative Activity</h3>
                                <div className="datatable-search" style={{ width: 300, margin: 0 }}>
                                    <Search size={16} />
                                    <input placeholder="Search logs..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
                                </div>
                            </div>
                            <DataTable 
                                columns={auditColumns} 
                                data={logs.filter(l => l.module.includes(searchTerm) || l.action.includes(searchTerm))} 
                                pageSize={15}
                            />
                        </div>
                    )}

                    {activeTab === 'system' && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                            <div className="card" style={{ padding: 24 }}>
                                <h3 style={{ marginBottom: 20 }}>Infrastructure Overview</h3>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
                                    <div style={healthItemStyle}>
                                        <Globe size={20} className="blue" />
                                        <div>
                                            <label style={labelStyle}>API Endpoint</label>
                                            <div style={{ fontSize: '0.9rem', fontWeight: 600 }}>https://crmapi.appnity.cloud</div>
                                        </div>
                                    </div>
                                    <div style={healthItemStyle}>
                                        <Database size={20} className="green" />
                                        <div>
                                            <label style={labelStyle}>Database Connection</label>
                                            <div style={{ fontSize: '0.9rem', fontWeight: 600 }}>PostgreSQL 15 (Active)</div>
                                        </div>
                                    </div>
                                    <div style={healthItemStyle}>
                                        <Cpu size={20} className="amber" />
                                        <div>
                                            <label style={labelStyle}>Server Runtime</label>
                                            <div style={{ fontSize: '0.9rem', fontWeight: 600 }}>Go 1.21 / Gin Gonic</div>
                                        </div>
                                    </div>
                                    <div style={healthItemStyle}>
                                        <Clock size={20} className="purple" />
                                        <div>
                                            <label style={labelStyle}>System Uptime</label>
                                            <div style={{ fontSize: '0.9rem', fontWeight: 600 }}>99.9% Reliable</div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            
                            <div className="card" style={{ padding: 24, background: 'var(--red-50)', borderColor: 'var(--red-200)' }}>
                                <div style={{ display: 'flex', gap: 16 }}>
                                    <div className="stat-icon red"><Info size={20} /></div>
                                    <div>
                                        <h3 style={{ color: 'var(--red-700)', marginBottom: 8 }}>Danger Zone</h3>
                                        <p style={{ color: 'var(--red-600)', fontSize: '0.85rem', marginBottom: 16 }}>Resetting system configs will revert all feature flags and customizations. This action is irreversible.</p>
                                        <button className="btn btn-danger" disabled>Reset System Defaults</button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

const navItemStyle = (active) => ({
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    width: '100%',
    padding: '12px 16px',
    borderRadius: 8,
    border: 'none',
    background: active ? 'var(--primary-50)' : 'transparent',
    color: active ? 'var(--primary-700)' : 'var(--text-muted)',
    fontWeight: active ? 700 : 500,
    cursor: 'pointer',
    textAlign: 'left',
    transition: '0.2s'
});

const healthItemStyle = {
    padding: '20px',
    background: 'var(--bg-body)',
    borderRadius: 12,
    display: 'flex',
    alignItems: 'center',
    gap: 16
};

const labelStyle = {
    display: 'block',
    fontSize: '0.7rem',
    color: 'var(--text-muted)',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    marginBottom: 4
};
