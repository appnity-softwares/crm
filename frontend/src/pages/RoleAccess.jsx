import { useState, useEffect } from 'react';
import { configAPI } from '../services/api';
import { useToast } from '../components/ui/Toast';
import { ToggleLeft, ToggleRight, ShieldCheck, Info } from 'lucide-react';

export default function RoleAccess() {
    const toast = useToast();
    const [flags, setFlags] = useState([]);
    const [loading, setLoading] = useState(true);

    const loadData = async () => {
        setLoading(true);
        try {
            const { data } = await configAPI.getFlags();
            setFlags(data || []);
        } catch { toast('Failed to load settings', 'error'); }
        finally { setLoading(false); }
    };

    useEffect(() => { loadData(); }, []);

    const handleToggle = async (key) => {
        try {
            await configAPI.toggleFlag(key);
            setFlags(flags.map(f => f.key === key ? { ...f, enabled: !f.enabled } : f));
            toast('Feature updated successfully', 'success');
        } catch { toast('Failed to update feature', 'error'); }
    };

    if (loading) return <div className="spinner" />;

    return (
        <div className="page-content">
            <div className="header" style={{ padding: 0, border: 'none', marginBottom: 24, background: 'transparent' }}>
                <div className="header-left">
                    <h1>Role & Feature Control</h1>
                    <p>Manage global feature flags and access restrictions</p>
                </div>
            </div>

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
                                onClick={() => handleToggle(f.key)}
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

                {flags.length === 0 && (
                    <div className="card" style={{ gridColumn: '1 / -1', padding: 40, textAlign: 'center' }}>
                        <Info size={40} style={{ color: 'var(--text-muted)', marginBottom: 12 }} />
                        <h3>No feature flags found</h3>
                        <p style={{ color: 'var(--text-muted)' }}>Flags are seeded when the server starts.</p>
                    </div>
                )}
            </div>
        </div>
    );
}
