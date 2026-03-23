import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { leadAPI } from '../services/api';
import { useToast } from '../components/ui/Toast';
import { Send, FileText, CheckCircle, Clock, Info, ShieldCheck } from 'lucide-react';

export default function ProspectDashboard() {
    const { user } = useAuth();
    const toast = useToast();
    const [form, setForm] = useState({ name: user.name, company: '', notes: '', phone: user.phone || '' });
    const [saving, setSaving] = useState(false);
    const [myLead, setMyLead] = useState(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('overview');
    const [sowDraft, setSowDraft] = useState('');

    const loadMyLead = async () => {
        try {
            const { data } = await leadAPI.getMyProfile();
            setMyLead(data.lead);
            setSowDraft(data.lead?.sow || '');
        } catch { /* No lead found yet */ } 
        finally { setLoading(false); }
    };

    useEffect(() => { loadMyLead(); }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            await leadAPI.submitRequirement(form);
            toast('Requirement submitted successfully!', 'success');
            loadMyLead();
        } catch (err) {
            toast(err.response?.data?.error || 'Failed to submit', 'error');
        } finally { setSaving(false); }
    };

    const handleSaveSOW = async () => {
        setSaving(true);
        try {
            await leadAPI.update(myLead.id, { sow: sowDraft });
            toast('Statement of Work updated!', 'success');
            loadMyLead();
        } catch { toast('Failed to update SOW', 'error'); } 
        finally { setSaving(false); }
    };

    const handleAcceptSOW = async () => {
        if(!window.confirm("Do you formally accept this Statement of Work?")) return;
        setSaving(true);
        try {
            await leadAPI.acceptSOW(myLead.id);
            toast('Statement of Work accepted!', 'success');
            loadMyLead();
        } catch (err) { toast(err.response?.data?.error || 'Failed to accept', 'error'); } 
        finally { setSaving(false); }
    };

    if (loading) return <div className="spinner" />;

    if (!myLead) {
        return (
            <div className="page-content" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '80vh' }}>
                <div className="card" style={{ maxWidth: 600, width: '100%', padding: 30 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
                        <div style={{ padding: 12, background: 'var(--primary-100)', borderRadius: 12, color: 'var(--primary-600)' }}>
                            <FileText size={24} />
                        </div>
                        <div>
                            <h2 style={{ margin: 0 }}>Start Your Project</h2>
                            <p style={{ color: 'var(--text-muted)', margin: 0 }}>Submit your requirements to get started</p>
                        </div>
                    </div>
                    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                        <div className="form-group">
                            <label>Full Name *</label>
                            <input required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
                        </div>
                        <div className="form-group">
                            <label>Company Name</label>
                            <input value={form.company} onChange={e => setForm({ ...form, company: e.target.value })} />
                        </div>
                        <div className="form-group">
                            <label>Phone Number</label>
                            <input type="tel" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} />
                        </div>
                        <div className="form-group">
                            <label>Project Goals & Requirement Brief *</label>
                            <textarea required rows={5} value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} placeholder="Describe what you want to build..." />
                        </div>
                        <button type="submit" className="btn btn-primary w-full" disabled={saving}>
                            {saving ? 'Submitting...' : 'Submit Requirements'}
                        </button>
                    </form>
                </div>
            </div>
        );
    }

    return (
        <div className="page-content">
            <div className="header" style={{ marginBottom: 30 }}>
                <div className="header-left">
                    <h1>Lead Portal</h1>
                    <p>Track your project acquisition and formalize agreements</p>
                </div>
            </div>

            <div className="tabs" style={{ display: 'flex', gap: 32, borderBottom: '1px solid var(--border)', marginBottom: 24 }}>
                <button className={`tab ${activeTab === 'overview' ? 'active' : ''}`} onClick={() => setActiveTab('overview')} style={{ background: 'none', border: 'none', borderBottom: activeTab === 'overview' ? '2px solid var(--primary-500)' : 'none', color: activeTab === 'overview' ? 'var(--primary-600)' : 'var(--text-muted)', paddingBottom: 12, fontWeight: 600, cursor: 'pointer' }}>Overview</button>
                <button className={`tab ${activeTab === 'sow' ? 'active' : ''}`} onClick={() => setActiveTab('sow')} style={{ background: 'none', border: 'none', borderBottom: activeTab === 'sow' ? '2px solid var(--primary-500)' : 'none', color: activeTab === 'sow' ? 'var(--primary-600)' : 'var(--text-muted)', paddingBottom: 12, fontWeight: 600, cursor: 'pointer' }}>Agreement (SOW)</button>
            </div>

            {activeTab === 'overview' ? (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 350px', gap: 24 }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                        <div className="card" style={{ padding: 24 }}>
                            <h3 style={{ marginBottom: 20 }}>Requirement Summary</h3>
                            <div style={{ background: 'var(--bg-app)', padding: 20, borderRadius: 12, border: '1px solid var(--border)' }}>
                                <div style={{ marginBottom: 20 }}>
                                    <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Scope Overview</label>
                                    <div style={{ marginTop: 5, whiteSpace: 'pre-wrap' }}>{myLead.notes}</div>
                                </div>
                            </div>
                        </div>

                        <div className="card" style={{ padding: 24, borderLeft: '4px solid var(--primary-500)' }}>
                            <h3 style={{ marginBottom: 15 }}>Next Steps</h3>
                            <div className="timeline-light">
                                <div style={{ display: 'flex', gap: 15, marginBottom: 20 }}>
                                    <div style={{ width: 24, height: 24, borderRadius: '50%', background: 'var(--green-500)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem' }}>1</div>
                                    <div>
                                        <div style={{ fontWeight: 600 }}>Requirements Submitted</div>
                                        <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>We have received your brief.</div>
                                    </div>
                                </div>
                                <div style={{ display: 'flex', gap: 15, marginBottom: 20 }}>
                                    <div style={{ width: 24, height: 24, borderRadius: '50%', background: myLead.sow ? 'var(--green-500)' : 'var(--bg-hover)', color: myLead.sow ? 'white' : 'var(--text-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem' }}>2</div>
                                    <div>
                                        <div style={{ fontWeight: 600 }}>Formalize SOW</div>
                                        <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Draft the detailed Statement of Work in the Agreement tab.</div>
                                    </div>
                                </div>
                                <div style={{ display: 'flex', gap: 15 }}>
                                    <div style={{ width: 24, height: 24, borderRadius: '50%', background: myLead.advance_paid_confirm ? 'var(--green-500)' : 'var(--bg-hover)', color: myLead.advance_paid_confirm ? 'white' : 'var(--text-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem' }}>3</div>
                                    <div>
                                        <div style={{ fontWeight: 600 }}>Advance Payment</div>
                                        <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Once SOW is agreed, advance payment is required for conversion.</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                        <div className="card" style={{ padding: 24, textAlign: 'center' }}>
                            <div style={{ width: 64, height: 64, background: 'var(--primary-100)', color: 'var(--primary-600)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 15px' }}>
                                <Clock size={32} />
                            </div>
                            <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: 5 }}>Current Status</label>
                            <h2 style={{ textTransform: 'capitalize', margin: 0 }}>{myLead.status.replace('_', ' ')}</h2>
                        </div>

                        <div className="card" style={{ padding: 24 }}>
                            <h4 style={{ marginBottom: 15 }}>Acquisition Progress</h4>
                            <div style={{ height: 8, background: 'var(--bg-hover)', borderRadius: 4, overflow: 'hidden', marginBottom: 15 }}>
                                <div style={{ width: myLead.status === 'won' ? '100%' : '30%', height: '100%', background: 'var(--green-500)' }} />
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: myLead.advance_paid_confirm ? 'var(--green-600)' : 'var(--amber-600)', fontWeight: 600 }}>
                                {myLead.advance_paid_confirm ? <CheckCircle size={18} /> : <Clock size={18} />}
                                {myLead.advance_paid_confirm ? 'Payment Verified' : 'Awaiting Advance'}
                            </div>
                        </div>
                    </div>
                </div>
            ) : (
                <div className="card" style={{ padding: 24 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 15 }}>
                            <div>
                                <h3 style={{ margin: 0 }}>Statement of Work (SOW)</h3>
                                <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', margin: '5px 0 0 0' }}>Write or edit your project's technical and commercial agreement</p>
                            </div>
                            {myLead.sow_accepted && (
                                <span className="badge green" style={{ fontSize: '0.8rem', padding: '6px 12px' }}>
                                    ACCEPTED {myLead.sow_accepted_at ? `ON ${new Date(myLead.sow_accepted_at).toLocaleDateString()}` : ''}
                                </span>
                            )}
                        </div>
                        <div style={{ display: 'flex', gap: 10 }}>
                            {!myLead.sow_accepted && (
                                <>
                                    <button className="btn btn-secondary" onClick={handleSaveSOW} disabled={saving}>
                                        {saving ? 'Saving...' : 'Save Draft'}
                                    </button>
                                    {sowDraft && (
                                        <button className="btn btn-primary" onClick={handleAcceptSOW} disabled={saving}>
                                            Accept & Proceed
                                        </button>
                                    )}
                                </>
                            )}
                        </div>
                    </div>
                    <textarea 
                        rows={20} 
                        className="form-control" 
                        style={{ fontFamily: 'monospace', fontSize: '0.95rem', lineHeight: 1.6, padding: 20, background: 'var(--bg-main)' }}
                        value={sowDraft}
                        onChange={e => setSowDraft(e.target.value)}
                        placeholder="Define scope, milestones, and payment terms..."
                        disabled={myLead.sow_accepted}
                    />
                </div>
            )}
        </div>
    );
}
