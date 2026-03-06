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
    const [leads, setLeads] = useState([]);
    const [employees, setEmployees] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editing, setEditing] = useState(null);
    const [form, setForm] = useState({ name: '', email: '', phone: '', company: '', source: 'other', status: 'new', assigned_to: '', notes: '' });
    const [saving, setSaving] = useState(false);

    const load = async () => {
        setLoading(true);
        try {
            const [leadRes, empRes] = await Promise.all([leadAPI.getAll(), employeeAPI.getAll().catch(() => ({ data: { employees: [] } }))]);
            setLeads(leadRes.data.leads || []);
            setEmployees(empRes.data.employees || []);
        } catch { } finally { setLoading(false); }
    };

    useEffect(() => { load(); }, []);

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
            setForm({ name: '', email: '', phone: '', company: '', source: 'other', status: 'new', assigned_to: '', notes: '' });
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
            notes: l.notes || ''
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

    const columns = [
        { header: 'Name', accessor: 'name', render: r => <span style={{ fontWeight: 600 }}>{r.name}</span> },
        { header: 'Company', accessor: 'company', render: r => r.company || '—' },
        { header: 'Email', accessor: 'email', render: r => r.email || '—' },
        { header: 'Phone', accessor: 'phone', render: r => r.phone || '—' },
        {
            header: 'Source',
            accessor: 'source',
            render: (r) => {
                const map = { website: 'blue', referral: 'green', social: 'purple', other: 'gray' };
                return <span className={`badge ${map[r.source] || 'gray'}`}>{r.source}</span>;
            }
        },
        {
            header: 'Status',
            accessor: 'status',
            render: (r) => {
                const map = { new: 'blue', contacted: 'amber', qualified: 'purple', proposal: 'cyan', won: 'green', lost: 'red' };
                return <span className={`badge ${map[r.status] || 'gray'}`}>{r.status}</span>;
            }
        },
        { header: 'Assigned To', accessor: r => r.assignee?.name || '—' },
        {
            header: 'Actions',
            key: 'actions',
            render: (l) => (
                <div style={{ display: 'flex', gap: 6 }}>
                    <button className="btn btn-sm btn-secondary" onClick={() => handleEdit(l)}>
                        <Edit2 size={12} />
                    </button>
                    {isAdmin && <button className="btn btn-danger btn-sm" onClick={() => handleDelete(l.id)}>×</button>}
                </div>
            )
        }
    ];

    return (
        <div>
            <div className="header">
                <div className="header-left">
                    <h1>Leads</h1>
                    <p>Manage customer relationships and your sales pipeline</p>
                </div>
                <div className="header-actions">
                    <button className="btn btn-primary" onClick={() => { setEditing(null); setForm({ name: '', email: '', phone: '', company: '', source: 'other', status: 'new', assigned_to: '', notes: '' }); setShowModal(true); }}>
                        <Plus size={15} /> New Lead
                    </button>
                </div>
            </div>

            <div className="page-content">
                <div className="card">
                    {loading ? <div className="spinner" /> : (
                        <DataTable
                            columns={columns}
                            data={leads}
                            pageSize={10}
                            searchable={true}
                            emptyMessage="No leads found."
                        />
                    )}
                </div>
            </div>

            {showModal && (
                <Modal title={editing ? "Edit Lead" : "Add New Lead"} onClose={() => setShowModal(false)}>
                    <form onSubmit={handleSubmit}>
                        <div className="form-grid">
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
                                <label>Phone</label>
                                <input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} />
                            </div>
                            <div className="form-group">
                                <label>Source</label>
                                <select value={form.source} onChange={e => setForm({ ...form, source: e.target.value })}>
                                    <option value="website">Website</option>
                                    <option value="referral">Referral</option>
                                    <option value="social">Social</option>
                                    <option value="other">Other</option>
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
                                <label>Notes</label>
                                <textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} placeholder="Additional notes about this lead..." />
                            </div>
                        </div>
                        <div className="form-actions">
                            <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                            <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Saving...' : editing ? 'Update Lead' : 'Add Lead'}</button>
                        </div>
                    </form>
                </Modal>
            )}
        </div>
    );
}
