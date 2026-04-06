import { useState, useEffect } from 'react';
import { leadAPI, employeeAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/ui/Toast';
import { useNotifications } from '../context/NotificationContext';
import Modal from '../components/ui/Modal';
import { UserPlus, Plus, Edit2 } from 'lucide-react';

import DataTable from '../components/ui/DataTable';

export default function Leads() {
    const { isAdmin } = useAuth();
    const toast = useToast();
    const { addNotification } = useNotifications();
    const [activeTab, setActiveTab] = useState('direct');
    const [leads, setLeads] = useState([]);
    const [employees, setEmployees] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editing, setEditing] = useState(null);
    const [form, setForm] = useState({ name: '', email: '', phone: '', company: '', source: 'other', status: 'new', assigned_to: '', notes: '', description: '', type: 'outbound', sow: '' });
    const [saving, setSaving] = useState(false);
    const [showConvertModal, setShowConvertModal] = useState(false);
    const [activeLead, setActiveLead] = useState(null);
    const [convertForm, setConvertForm] = useState({ total_value: '', advance_payment: '', project_name: '' });

    const load = async (params = {}) => {
        setLoading(true);
        try {
            const [leadRes, empRes] = await Promise.all([
                leadAPI.getAll({ ...params, type: activeTab }),
                employeeAPI.getAll().catch(() => ({ data: { employees: [] } }))
            ]);
            setLeads(leadRes.data.leads || []);
            setEmployees(empRes.data.employees || []);
        } catch { } finally { setLoading(false); }
    };

    useEffect(() => { load(); }, [activeTab]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            const payload = { ...form };
            if (!payload.assigned_to) delete payload.assigned_to;

            if (editing) {
                await leadAPI.update(editing, payload);
                toast('Lead updated successfully');
            } else {
                await leadAPI.create(payload);
                toast('Lead created successfully');
                addNotification({
                    type: 'info',
                    title: `Lead Captured: ${form.name}`,
                    message: `A new lead from ${form.source}${form.company ? ` (for ${form.company})` : ''} has been added to the pipeline.`,
                });
            }
            setShowModal(false);
            setEditing(null);
            setForm({ name: '', email: '', phone: '', company: '', source: 'other', status: 'new', assigned_to: '', notes: '', description: '', type: 'outbound', sow: '' });
            load();
        } catch (err) {
            toast(err.response?.data?.error || 'Failed to save', 'error');
        } finally { setSaving(false); }
    };

    const handleEdit = (l) => {
        setEditing(l.id);
        setForm({
            name: l.name,
            email: l.email || '',
            phone: l.phone || '',
            company: l.company || '',
            source: l.source,
            status: l.status,
            assigned_to: l.assigned_to || '',
            notes: l.notes || '',
            description: l.description || '',
            type: l.type || 'outbound',
            sow: l.sow || ''
        });
        setShowModal(true);
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Delete this lead?')) return;
        try {
            await leadAPI.remove(id);
            toast('Lead deleted');
            load();
        } catch { toast('Failed', 'error'); }
    };

    const handleConfirmPayment = async (leadId) => {
        if(!window.confirm("Confirm that advance payment for this lead has been received?")) return;
        try {
            await leadAPI.update(leadId, { advance_paid_confirm: true });
            toast("Payment confirmed!");
            load();
        } catch { toast("Failed to confirm payment", "error"); }
    };

    const handleConvert = (lead) => {
        if(lead.type === 'direct' && !lead.advance_paid_confirm) {
            return toast("Direct leads must have confirmed advance payment before conversion.", "warning");
        }
        setActiveLead(lead);
        setConvertForm({ 
            project_name: lead.name + "'s Project",
            total_value: '',
            advance_payment: ''
        });
        setShowConvertModal(true);
    };

    const handleConfirmConvert = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            await leadAPI.convertToClient(activeLead.id, {
                ...convertForm,
                total_value: parseFloat(convertForm.total_value),
                advance_payment: parseFloat(convertForm.advance_payment) || 0
            });
            toast('Lead successfully converted to Client!', 'success');
            setShowConvertModal(false);
            load();
        } catch (err) {
            toast(err.response?.data?.error || 'Failed to convert lead', 'error');
        } finally { setSaving(false); }
    };

    const columns = [
        { header: 'Name', accessor: 'name', render: r => <span style={{ fontWeight: 600 }}>{r.name}</span> },
        { header: 'Company', accessor: 'company', render: r => r.company || '—' },
        { header: 'Email', accessor: 'email', render: r => r.email || '—' },
        { header: 'Phone', accessor: 'phone', render: r => r.phone || '—' },
        { 
            header: 'Status', 
            accessor: 'status', 
            render: r => {
                const map = { 
                    won: 'green', 
                    lost: 'red', 
                    in_review: 'purple', 
                    quotation_sent: 'blue', 
                    negotiation: 'amber',
                    new: 'gray'
                };
                return <span className={`badge ${map[r.status] || 'blue'}`}>{r.status.toUpperCase()}</span>;
            }
        },
        { 
            header: 'Payment', 
            accessor: 'advance_paid_confirm', 
            render: r => (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span className={`badge ${r.advance_paid_confirm ? 'green' : 'amber'}`}>
                        {r.advance_paid_confirm ? 'Confirmed' : 'Pending'}
                    </span>
                    {!r.advance_paid_confirm && isAdmin && (
                        <button className="btn btn-sm btn-secondary" onClick={() => handleConfirmPayment(r.id)} style={{ padding: '2px 8px', fontSize: '0.7rem' }}>Confirm</button>
                    )}
                </div>
            )
        },
        { header: 'Assigned To', accessor: r => r.assignee?.name || '—', render: r => <span style={{ color: 'var(--primary-600)', fontWeight: 500 }}>{r.assignee?.name || '—'}</span> },
        {
            header: 'Actions',
            key: 'actions',
            render: (l) => (
                <div style={{ display: 'flex', gap: 6 }}>
                    <button className="btn btn-sm btn-secondary" onClick={() => handleEdit(l)}>
                        <Edit2 size={12} />
                    </button>
                    {l.status !== 'won' && (
                        <button 
                            className={`btn btn-sm ${l.type === 'direct' && !l.advance_paid_confirm ? 'btn-disabled' : 'btn-primary'}`} 
                            onClick={() => handleConvert(l)} 
                            title="Convert to Client"
                        >
                            <UserPlus size={12} /> Convert
                        </button>
                    )}
                    {isAdmin && <button className="btn btn-danger btn-sm" onClick={() => handleDelete(l.id)}>×</button>}
                </div>
            )
        }
    ];

    return (
        <div>
            <div className="header">
                <div className="header-left">
                    <h1>Lead Management</h1>
                    <p>Track your sales pipeline and convert prospects to clients</p>
                </div>
                <div className="header-actions">
                    <button className="btn btn-primary" onClick={() => { setEditing(null); setForm({ name: '', email: '', phone: '', company: '', source: 'other', status: 'new', assigned_to: '', notes: '', description: '', type: 'outbound', sow: '' }); setShowModal(true); }}>
                        <Plus size={15} /> New Lead
                    </button>
                </div>
            </div>

            <div className="page-content">
                <div className="tabs" style={{ display: 'flex', gap: 32, borderBottom: '1px solid var(--border)', marginBottom: 24 }}>
                    <button 
                        className={`tab ${activeTab === 'direct' ? 'active' : ''}`} 
                        onClick={() => setActiveTab('direct')}
                        style={{ background: 'none', border: 'none', borderBottom: activeTab === 'direct' ? '2px solid var(--primary-500)' : 'none', color: activeTab === 'direct' ? 'var(--primary-600)' : 'var(--text-muted)', paddingBottom: 12, fontWeight: 600, cursor: 'pointer' }}
                    >
                        Platform Leads (Direct)
                    </button>
                    <button 
                        className={`tab ${activeTab === 'outbound' ? 'active' : ''}`} 
                        onClick={() => setActiveTab('outbound')}
                        style={{ background: 'none', border: 'none', borderBottom: activeTab === 'outbound' ? '2px solid var(--primary-500)' : 'none', color: activeTab === 'outbound' ? 'var(--primary-600)' : 'var(--text-muted)', paddingBottom: 12, fontWeight: 600, cursor: 'pointer' }}
                    >
                        CRM Leads (Outbound)
                    </button>
                </div>

                <div className="card">
                    {loading ? <div className="spinner" /> : (
                        <DataTable
                            columns={columns}
                            data={leads}
                            pageSize={10}
                            searchable={true}
                            emptyMessage={`No ${activeTab} leads found.`}
                        />
                    )}
                </div>
            </div>

            {showModal && (
                <Modal title={editing ? "Edit Lead" : "Add New Lead"} onClose={() => setShowModal(false)}>
                    <form onSubmit={handleSubmit}>
                        <div className="form-grid">
                            <div className="form-group">
                                <label>Lead Type</label>
                                <select value={form.type} onChange={e => setForm({ ...form, type: e.target.value })}>
                                    <option value="direct">Direct (Platform Signup)</option>
                                    <option value="outbound">Outbound (CRM Manual)</option>
                                </select>
                            </div>
                            <div className="form-group">
                                <label>Name *</label>
                                <input required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
                            </div>
                            <div className="form-group">
                                <label>Company</label>
                                <input value={form.company} onChange={e => setForm({ ...form, company: e.target.value })} />
                            </div>
                            <div className="form-group">
                                <label>Email</label>
                                <input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
                            </div>
                            <div className="form-group">
                                <label>Phone Number</label>
                                <input type="tel" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} />
                            </div>
                            <div className="form-group">
                                <label>Status</label>
                                <select value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}>
                                    <option value="new">New</option>
                                    <option value="in_review">In Review</option>
                                    <option value="quotation_sent">Quotation Sent</option>
                                    <option value="negotiation">Negotiation</option>
                                    <option value="won">Won</option>
                                    <option value="lost">Lost</option>
                                </select>
                            </div>
                            <div className="form-group">
                                <label>Assign To</label>
                                <select value={form.assigned_to} onChange={e => setForm({ ...form, assigned_to: e.target.value })}>
                                    <option value="">— Unassigned —</option>
                                    {employees.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
                                </select>
                            </div>
                            <div className="form-group full">
                                <label>Statement of Work (SOW)</label>
                                <textarea rows={4} value={form.sow} onChange={e => setForm({ ...form, sow: e.target.value })} placeholder="Project details and scope..." />
                            </div>
                            <div className="form-group full">
                                <label>Internal Notes</label>
                                <textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} placeholder="Private notes for team..." />
                            </div>
                            <div className="form-group full">
                                <label>Website / Problem Description (Optional)</label>
                                <textarea 
                                    rows={3}
                                    value={form.description} 
                                    onChange={e => setForm({ ...form, description: e.target.value })} 
                                    placeholder="Enter website details, issues, or specific requirements..." 
                                />
                            </div>
                        </div>
                        <div className="form-actions">
                            <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                            <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Saving...' : editing ? 'Update Lead' : 'Add Lead'}</button>
                        </div>
                    </form>
                </Modal>
            )}
            {showConvertModal && (
                <Modal title={`Convert ${activeLead?.name} to Client`} onClose={() => setShowConvertModal(false)}>
                    <form onSubmit={handleConfirmConvert}>
                        <p style={{ marginBottom: 20, color: 'var(--text-muted)' }}>This will promote the user to a Client and create their first project. Please enter the contract details.</p>
                        
                        <div className="form-group">
                            <label>Project Name</label>
                            <input 
                                required 
                                value={convertForm.project_name} 
                                onChange={e => setConvertForm({ ...convertForm, project_name: e.target.value })} 
                                placeholder="E.g. E-commerce Development" 
                            />
                        </div>

                        <div className="form-grid" style={{ marginTop: 15 }}>
                            <div className="form-group">
                                <label>Total Contract Value (₹)</label>
                                <input 
                                    type="number" 
                                    required 
                                    value={convertForm.total_value} 
                                    onChange={e => setConvertForm({ ...convertForm, total_value: e.target.value })} 
                                    placeholder="5000" 
                                />
                            </div>
                            <div className="form-group">
                                <label>Advance Paid (₹)</label>
                                <input 
                                    type="number" 
                                    value={convertForm.advance_payment} 
                                    onChange={e => setConvertForm({ ...convertForm, advance_payment: e.target.value })} 
                                    placeholder="2500" 
                                />
                            </div>
                        </div>

                        <div className="form-actions" style={{ marginTop: 24 }}>
                            <button type="button" className="btn btn-secondary" onClick={() => setShowConvertModal(false)}>Cancel</button>
                            <button type="submit" className="btn btn-primary" disabled={saving}>
                                {saving ? 'Converting...' : 'Confirm Conversion & Create Project'}
                            </button>
                        </div>
                    </form>
                </Modal>
            )}
        </div>
    );
}
