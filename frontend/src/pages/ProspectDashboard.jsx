import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { leadAPI } from '../services/api';
import { useToast } from '../components/ui/Toast';
import { Send, FileText, CheckCircle } from 'lucide-react';

export default function ProspectDashboard() {
    const { user } = useAuth();
    const toast = useToast();
    const [form, setForm] = useState({ name: user.name, company: '', notes: '', phone: user.phone || '' });
    const [saving, setSaving] = useState(false);
    const [submitted, setSubmitted] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            await leadAPI.submitRequirement(form);
            toast('Requirement submitted successfully!', 'success');
            setSubmitted(true);
        } catch (err) {
            toast(err.response?.data?.error || 'Failed to submit', 'error');
        } finally {
            setSaving(false);
        }
    };

    if (submitted) {
        return (
            <div className="page-content" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '80vh' }}>
                <div className="card" style={{ maxWidth: 500, textAlign: 'center', padding: '40px 20px' }}>
                    <CheckCircle size={64} className="text-green-500" style={{ margin: '0 auto 20px' }} />
                    <h2 style={{ marginBottom: 15 }}>Thank you, {user.name}!</h2>
                    <p style={{ color: 'var(--text-muted)' }}>
                        Your requirements have been successfully submitted to Appnity Softwares. Our team will review them and get back to you shortly to discuss your project.
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="page-content" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '80vh' }}>
            <div className="card" style={{ maxWidth: 600, width: '100%' }}>
                <div className="card-header" style={{ paddingBottom: 0, borderBottom: 'none' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 15 }}>
                        <div style={{ padding: 12, background: 'var(--primary-100)', borderRadius: 12, color: 'var(--primary-600)' }}>
                            <FileText size={24} />
                        </div>
                        <div>
                            <h2 style={{ fontSize: '1.5rem', marginBottom: 4 }}>Submit Your Requirements</h2>
                            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Tell us about your project needs</p>
                        </div>
                    </div>
                </div>

                <div className="card-body">
                    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                        <div className="form-group">
                            <label>Your Name *</label>
                            <input
                                required
                                className="form-control"
                                value={form.name}
                                onChange={e => setForm({ ...form, name: e.target.value })}
                            />
                        </div>
                        <div className="form-group">
                            <label>Company/Brand Name</label>
                            <input
                                className="form-control"
                                placeholder="Optional"
                                value={form.company}
                                onChange={e => setForm({ ...form, company: e.target.value })}
                            />
                        </div>
                        <div className="form-group">
                            <label>Phone Number</label>
                            <input
                                className="form-control"
                                type="tel"
                                value={form.phone}
                                onChange={e => setForm({ ...form, phone: e.target.value })}
                            />
                        </div>
                        <div className="form-group">
                            <label>Detailed Requirements / Notes *</label>
                            <textarea
                                required
                                className="form-control"
                                rows={6}
                                placeholder="Describe what kind of website or application you need..."
                                value={form.notes}
                                onChange={e => setForm({ ...form, notes: e.target.value })}
                            />
                        </div>

                        <button type="submit" className="btn btn-primary w-full" disabled={saving} style={{ padding: 14, fontSize: '1rem', marginTop: 10 }}>
                            <Send size={18} style={{ marginRight: 8 }} />
                            {saving ? 'Submitting...' : 'Submit Profile & Requirements'}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
}
