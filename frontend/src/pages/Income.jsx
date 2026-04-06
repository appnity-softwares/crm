import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/ui/Toast';
import { incomeAPI, projectAPI } from '../services/api';
import Modal from '../components/ui/Modal';
import DataTable from '../components/ui/DataTable';
import { Plus, Edit2, Trash2, TrendingUp } from 'lucide-react';

export default function Income() {
    const { isAdmin, canAccess } = useAuth();
    const canWrite = canAccess('income', 'create') || canAccess('income', 'update');
    const canDelete = canAccess('income', 'delete');
    // For 'show financials', we can use a custom logic or just 'read'
    const showFinancials = isAdmin; 
    const toast = useToast();
    const [incomeRecords, setIncomeRecords] = useState([]);
    const [projects, setProjects] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editing, setEditing] = useState(null);
    const [saving, setSaving] = useState(false);
    
    const [form, setForm] = useState({
        source: '',
        amount: '',
        description: '',
        category: 'project_payment',
        date: new Date().toISOString().split('T')[0],
        project_id: ''
    });

    const loadData = async () => {
        if (!isAdmin) return;
        try {
            setLoading(true);
            const res = await Promise.all([
                incomeAPI.getAll(),
                projectAPI.getAll()
            ]);
            const incomeData = res[0].data;
            const projectData = res[1].data;
            
            setIncomeRecords(incomeData?.income || []);
            setProjects(projectData?.projects || []);
        } catch { 
            toast('Failed to load data', 'error'); 
        } finally { 
            setLoading(false); 
        }
    };

    useEffect(() => { loadData(); }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            const payload = { 
                ...form, 
                amount: parseFloat(form.amount),
                project_id: form.project_id || null
            };
            
            if (editing) {
                await incomeAPI.update(editing, payload);
                toast('Income updated successfully', 'success');
            } else {
                await incomeAPI.create(payload);
                toast('Income recorded successfully', 'success');
            }
            setShowModal(false);
            setEditing(null);
            setForm({ source: '', amount: '', description: '', category: 'project_payment', date: new Date().toISOString().split('T')[0], project_id: '' });
            loadData();
        } catch (err) { 
            toast(err.response?.data?.error || 'Failed to save', 'error'); 
        } finally { 
            setSaving(false); 
        }
    };

    const handleEdit = (inc) => {
        setEditing(inc.id);
        setForm({
            source: inc.source,
            amount: inc.amount,
            description: inc.description || '',
            category: inc.category || 'project_payment',
            date: inc.date ? inc.date.split('T')[0] : '',
            project_id: inc.project_id || ''
        });
        setShowModal(true);
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Are you sure you want to delete this record?')) return;
        try {
            await incomeAPI.delete(id);
            toast('Record deleted', 'success');
            loadData();
        } catch { 
            toast('Failed to delete', 'error'); 
        }
    };

    const columns = [
        { 
            header: 'Date', 
            accessor: 'date',
            render: r => new Date(r.date).toLocaleDateString()
        },
        { header: 'Source', accessor: 'source' },
        { 
            header: 'Project', 
            accessor: r => r.project?.name || '—',
            render: r => r.project ? <span className="badge blue">{r.project.name}</span> : '—'
        },
        { 
            header: 'Category', 
            accessor: 'category',
            render: r => <span className="badge gray">{r.category.replace('_', ' ')}</span>
        },
        { 
            header: 'Amount', 
            accessor: 'amount',
            render: r => {
                if (!isAdmin) return <span style={{ color: 'var(--text-muted)' }}>*** Confidential ***</span>;
                return <span style={{ fontWeight: 600, color: '#10b981' }}>+ ₹{r.amount.toLocaleString()}</span>;
            }
        }
    ];

    if (isAdmin) {
        columns.push({
            header: 'Actions',
            accessor: 'id',
            sortable: false,
            render: (row) => (
                <div style={{ display: 'flex', gap: 8 }}>
                    <button className="btn btn-sm btn-secondary" onClick={() => handleEdit(row)}>
                        <Edit2 size={12} />
                    </button>
                    <button className="btn btn-sm btn-danger" onClick={() => handleDelete(row.id)}>
                        <Trash2 size={12} />
                    </button>
                </div>
            )
        });
    }

    const totalIncome = (Array.isArray(incomeRecords) ? incomeRecords : []).reduce((sum, r) => sum + r.amount, 0);

    if (loading && isAdmin) return <div className="spinner" />;
    
    if (!isAdmin) {
        return (
            <div className="page-content" style={{ textAlign: 'center', padding: '100px 20px' }}>
                <TrendingUp size={64} style={{ color: 'var(--red-400)', marginBottom: 20 }} />
                <h2>Access Denied</h2>
                <p style={{ color: 'var(--text-muted)' }}>This module is restricted to Administrators only.</p>
            </div>
        );
    }

    return (
        <div className="page-content">
            <div className="header" style={{ padding: 0, border: 'none', marginBottom: 24, background: 'transparent' }}>
                <div className="header-left">
                    <h1>Income Management</h1>
                    <p>Track your earnings and project payments</p>
                </div>
                {isAdmin && (
                    <div className="header-actions">
                        <button className="btn btn-primary" onClick={() => { setEditing(null); setForm({ source: '', amount: '', description: '', category: 'project_payment', date: new Date().toISOString().split('T')[0], project_id: '' }); setShowModal(true); }}>
                            <Plus size={15} /> Add Income
                        </button>
                    </div>
                )}
            </div>

            <div className="stats-grid" style={{ marginBottom: 24 }}>
                <div className="stat-card">
                    <div className="stat-icon" style={{ background: '#ecfdf5', color: '#10b981' }}>
                        <TrendingUp size={24} />
                    </div>
                    <div className="stat-info">
                        <label>Total Earnings</label>
                        <h3>₹{totalIncome.toLocaleString()}</h3>
                    </div>
                </div>
            </div>

            <div className="card">
                <DataTable
                    columns={columns}
                    data={incomeRecords}
                    searchable={true}
                    pageSize={10}
                    emptyMessage="No income records found."
                />
            </div>

            {showModal && (
                <Modal title={editing ? "Edit Income Record" : "Add New Income"} onClose={() => setShowModal(false)}>
                    <form onSubmit={handleSubmit}>
                        <div className="form-grid">
                            <div className="form-group">
                                <label>Source / Payer *</label>
                                <input required value={form.source} onChange={e => setForm({ ...form, source: e.target.value })} placeholder="e.g. Client Name or Service" />
                            </div>
                            <div className="form-group">
                                <label>Amount ($) *</label>
                                <input type="number" step="0.01" required value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} placeholder="0.00" />
                            </div>
                            <div className="form-group">
                                <label>Date *</label>
                                <input type="date" required value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} />
                            </div>
                            <div className="form-group">
                                <label>Category</label>
                                <select value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}>
                                    <option value="project_payment">Project Payment</option>
                                    <option value="consultancy">Consultancy</option>
                                    <option value="subscription">Subscription</option>
                                    <option value="other">Other</option>
                                </select>
                            </div>
                            <div className="form-group" style={{ gridColumn: 'span 2' }}>
                                <label>Related Project (Optional)</label>
                                <select value={form.project_id} onChange={e => setForm({ ...form, project_id: e.target.value })}>
                                    <option value="">None</option>
                                    {projects.map(p => (
                                        <option key={p.id} value={p.id}>{p.name}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="form-group" style={{ gridColumn: 'span 2' }}>
                                <label>Description</label>
                                <textarea rows="3" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Additional details..." />
                            </div>
                        </div>
                        <div className="form-actions">
                            <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                            <button type="submit" className="btn btn-primary" disabled={saving}>
                                {saving ? 'Saving...' : editing ? 'Update Record' : 'Record Income'}
                            </button>
                        </div>
                    </form>
                </Modal>
            )}
        </div>
    );
}
