import { useState, useEffect } from 'react';
import { notificationAPI } from '../services/api';
import { useToast } from '../components/ui/Toast';
import { Loader2, Bell, Smartphone, Mail } from 'lucide-react';
import './NotificationPreferences.css';

export default function NotificationPreferences() {
    const toast = useToast();
    const [types, setTypes] = useState([]);
    const [prefs, setPrefs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            setLoading(true);
            const [typesRes, prefsRes] = await Promise.all([
                notificationAPI.getTypes(),
                notificationAPI.getPreferences()
            ]);
            
            setTypes(typesRes.data);
            setPrefs(prefsRes.data);
        } catch (err) {
            console.error('Failed to load preferences:', err);
            toast('Failed to load notification settings', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleToggle = (typeKey, channel) => {
        setPrefs(prev => {
            const exists = prev.find(p => p.type === typeKey);
            if (exists) {
                return prev.map(p => 
                    p.type === typeKey ? { ...p, [channel]: !p[channel] } : p
                );
            } else {
                return [...prev, {
                    type: typeKey,
                    in_app: channel === 'in_app' ? false : true,
                    push: channel === 'push' ? false : true,
                    email: channel === 'email' ? false : false,
                    [channel]: !true
                }];
            }
        });
    };

    const handleSave = async () => {
        try {
            setSaving(true);
            const updates = prefs.map(p => ({
                type: p.type,
                in_app: p.in_app,
                push: p.push,
                email: p.email
            }));
            
            await notificationAPI.updatePreferences(updates);
            toast('Notification preferences saved successfully', 'success');
        } catch (err) {
            console.error('Failed to save preferences:', err);
            toast('Failed to save preferences', 'error');
        } finally {
            setSaving(false);
        }
    };

    // Group types by category
    const groupedTypes = types.reduce((acc, t) => {
        if (!acc[t.category]) acc[t.category] = [];
        acc[t.category].push(t);
        return acc;
    }, {});

    if (loading) return <div className="p-8 text-center"><Loader2 className="spinner" /></div>;

    return (
        <div className="card" style={{ marginTop: 24 }}>
            <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                    <h3>Notification Preferences</h3>
                    <p style={{ margin: '4px 0 0', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                        Choose how you want to be notified.
                    </p>
                </div>
                <button 
                    className="btn btn-primary" 
                    onClick={handleSave} 
                    disabled={saving}
                    style={{ padding: '6px 16px' }}
                >
                    {saving ? <Loader2 className="spinner-sm" /> : 'Save Settings'}
                </button>
            </div>
            
            <div className="card-body" style={{ padding: 0 }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'minmax(200px, 1fr) 80px 80px 80px', padding: '12px 20px', borderBottom: '1px solid var(--border)', background: 'var(--bg-card-hover)' }}>
                    <div style={{ fontWeight: 600, fontSize: '0.85rem', color: 'var(--text-muted)' }}>Type</div>
                    <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                        <Bell size={16} />
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>In-App</span>
                    </div>
                    <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                        <Smartphone size={16} />
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Push</span>
                    </div>
                    <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, opacity: 0.5 }}>
                        <Mail size={16} />
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Email</span>
                    </div>
                </div>

                {Object.entries(groupedTypes).map(([category, catTypes]) => (
                    <div key={category}>
                        <div style={{ padding: '8px 20px', background: 'var(--bg-body)', fontWeight: 700, fontSize: '0.8rem', color: 'var(--primary-600)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                            {category}
                        </div>
                        {catTypes.map(t => {
                            const pref = prefs.find(p => p.type === t.key) || { in_app: true, push: true, email: false };
                            
                            return (
                                <div key={t.key} style={{ display: 'grid', gridTemplateColumns: 'minmax(200px, 1fr) 80px 80px 80px', padding: '16px 20px', borderBottom: '1px solid var(--border)', alignItems: 'center' }}>
                                    <div>
                                        <div style={{ fontWeight: 500, fontSize: '0.95rem' }}>{t.label}</div>
                                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: 2 }}>{t.description}</div>
                                    </div>
                                    
                                    <div style={{ display: 'flex', justifyContent: 'center' }}>
                                        <label className="toggle-switch">
                                            <input 
                                                type="checkbox" 
                                                checked={pref.in_app} 
                                                onChange={() => handleToggle(t.key, 'in_app')} 
                                            />
                                            <span className="toggle-slider"></span>
                                        </label>
                                    </div>
                                    
                                    <div style={{ display: 'flex', justifyContent: 'center' }}>
                                        <label className="toggle-switch">
                                            <input 
                                                type="checkbox" 
                                                checked={pref.push} 
                                                onChange={() => handleToggle(t.key, 'push')} 
                                            />
                                            <span className="toggle-slider"></span>
                                        </label>
                                    </div>

                                    <div style={{ display: 'flex', justifyContent: 'center', opacity: 0.5 }} title="Email notifications coming soon">
                                        <label className="toggle-switch">
                                            <input 
                                                type="checkbox" 
                                                checked={pref.email} 
                                                disabled
                                            />
                                            <span className="toggle-slider"></span>
                                        </label>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                ))}
            </div>
        </div>
    );
}
