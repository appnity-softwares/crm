import { useState, useEffect } from 'react';
import { expenseAPI, balanceAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/ui/Toast';
import { useApi } from '../hooks/useApi';
import { Wallet, Plus, Trash2, Edit2, Download, Search, Calendar, Filter } from 'lucide-react';
import DataTable from '../components/ui/DataTable';
import Modal from '../components/ui/Modal';

export default function Expenses() {
    const { isAdmin } = useAuth();
    const toast = useToast();
    const { data: balanceData } = useApi(balanceAPI.get);
    const [expenses, setExpenses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editing, setEditing] = useState(null);
    const [saving, setSaving] = useState(false);

    // Filters
    const [filterDate, setFilterDate] = useState('');
    const [filterMonth, setFilterMonth] = useState('');
    const [filterYear, setFilterYear] = useState(new Date().getFullYear().toString());

    const [form, setForm] = useState({
        title: '',
        description: '',
        amount: '',
        date: new Date().toISOString().split('T')[0],
        category: 'other'
    });

    const loadExpenses = async () => {
        setLoading(true);
        const params = {};
        if (filterDate) {
            params.from = filterDate;
            params.to = filterDate;
        } else if (filterMonth && filterYear) {
            const firstDay = `${filterYear}-${filterMonth.padStart(2, '0')}-01`;
            const lastDay = new Date(filterYear, filterMonth, 0).getDate();
            params.from = firstDay;
            params.to = `${filterYear}-${filterMonth.padStart(2, '0')}-${lastDay}`;
        } else if (filterYear) {
            params.from = `${filterYear}-01-01`;
            params.to = `${filterYear}-12-31`;
        }

        try {
            const { data } = await expenseAPI.getAll(params);
            setExpenses(data.expenses || []);
        } catch {
            toast('Failed to load expenses', 'error');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { loadExpenses(); }, [filterDate, filterMonth, filterYear]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            const payload = { ...form, amount: parseFloat(form.amount) };
            if (editing) {
                await expenseAPI.update(editing, payload);
                toast('Expense updated successfully');
            } else {
                await expenseAPI.create(payload);
                toast('Expense recorded successfully');
            }
            setShowModal(false);
            setEditing(null);
            loadExpenses();
        } catch (err) {
            toast(err.response?.data?.error || 'Operation failed', 'error');
        } finally {
            setSaving(false);
        }
    };

    const handleEdit = (ex) => {
        setEditing(ex.id);
        setForm({
            title: ex.title,
            description: ex.description || '',
            amount: ex.amount,
            date: ex.date ? ex.date.split('T')[0] : '',
            category: ex.category
        });
        setShowModal(true);
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Are you sure you want to delete this expense?')) return;
        try {
            await expenseAPI.remove(id);
            toast('Expense deleted');
            loadExpenses();
        } catch {
            toast('Failed to delete', 'error');
        }
    };

    const columns = [
        { header: 'Title', accessor: 'title' },
        { header: 'Amount', accessor: 'amount', render: r => <span style={{ fontWeight: 700, color: 'var(--red-500)' }}>₹{r.amount.toLocaleString('en-IN')}</span> },
        { header: 'Date', accessor: 'date', render: r => new Date(r.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) },
        { header: 'Category', accessor: 'category', render: r => <span className="badge gray">{r.category}</span> },
        { header: 'Description', accessor: 'description', render: r => <span style={{ fontSize: '0.85rem' }}>{r.description || '—'}</span> },
        { header: 'Added By', accessor: r => r.user?.name || 'System' },
    ];

    if (isAdmin) {
        columns.push({
            header: 'Actions',
            key: 'actions',
            render: (r) => (
                <div style={{ display: 'flex', gap: 8 }}>
                    <button className="btn btn-sm btn-secondary" onClick={() => handleEdit(r)}><Edit2 size={12} /></button>
                    <button className="btn btn-sm btn-danger" onClick={() => handleDelete(r.id)}><Trash2 size={12} /></button>
                </div>
            )
        });
    }

    const totalExpense = expenses.reduce((sum, e) => sum + e.amount, 0);

    return (
        <div className="page-content">
            <div className="header">
                <div className="header-left">
                    <h1>Company Expenses</h1>
                    <p>Track where company funds are being utilized</p>
                </div>
                <div className="header-actions">
                    <button className="btn btn-primary" onClick={() => { setEditing(null); setForm({ title: '', description: '', amount: '', date: new Date().toISOString().split('T')[0], category: 'other' }); setShowModal(true); }}>
                        <Plus size={16} /> Add Expense
                    </button>
                </div>
            </div>

            <div className="stats-grid" style={{ marginBottom: 24 }}>
                <div className="card stat-card shadow-sm" style={{ background: 'var(--primary-50)' }}>
                    <div className="stat-icon primary"><Wallet size={24} /></div>
                    <div className="stat-content">
                        <span className="stat-label">Available Balance</span>
                        <div className="stat-value" style={{ color: 'var(--primary-600)' }}>₹{balanceData?.total_balance?.toLocaleString('en-IN') || '0'}</div>
                        <span className="stat-trend positive">On Account</span>
                    </div>
                </div>
                <div className="card stat-card shadow-sm">
                    <div className="stat-icon red"><Wallet size={24} /></div>
                    <div className="stat-content">
                        <span className="stat-label">Total Expense (Filtered)</span>
                        <div className="stat-value" style={{ color: 'var(--red-500)' }}>₹{totalExpense.toLocaleString('en-IN')}</div>
                    </div>
                </div>
            </div>

            {/* Advanced Filters */}
            <div className="card" style={{ marginBottom: 24, padding: '16px 20px' }}>
                <div style={{ display: 'flex', gap: 16, alignItems: 'flex-end', flexWrap: 'wrap' }}>
                    <div className="form-group" style={{ marginBottom: 0, minWidth: 150 }}>
                        <label style={{ fontSize: '0.75rem' }}>Filter by Year</label>
                        <select className="form-control" value={filterYear} onChange={e => { setFilterYear(e.target.value); setFilterDate(''); }}>
                            {[2024, 2025, 2026].map(y => <option key={y} value={y}>{y}</option>)}
                        </select>
                    </div>
                    <div className="form-group" style={{ marginBottom: 0, minWidth: 150 }}>
                        <label style={{ fontSize: '0.75rem' }}>Filter by Month</label>
                        <select className="form-control" value={filterMonth} onChange={e => { setFilterMonth(e.target.value); setFilterDate(''); }}>
                            <option value="">All Months</option>
                            {['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'].map((m, i) => (
                                <option key={m} value={i + 1}>{m}</option>
                            ))}
                        </select>
                    </div>
                    <div className="form-group" style={{ marginBottom: 0, minWidth: 150 }}>
                        <label style={{ fontSize: '0.75rem' }}>Specific Date</label>
                        <div style={{ position: 'relative' }}>
                            <input type="date" className="form-control" value={filterDate} onChange={e => { setFilterDate(e.target.value); setFilterMonth(''); }} />
                        </div>
                    </div>
                    <button className="btn btn-secondary" onClick={() => { setFilterDate(''); setFilterMonth(''); setFilterYear(new Date().getFullYear().toString()); }}>
                        Clear Filters
                    </button>
                </div>
            </div>

            <div className="card">
                {loading ? <div className="spinner" /> : (
                    <DataTable
                        columns={columns}
                        data={expenses}
                        pageSize={10}
                        searchable={true}
                        emptyMessage="No expenses found for this period."
                    />
                )}
            </div>

            {showModal && (
                <Modal title={editing ? "Edit Expense" : "Add New Expense"} onClose={() => setShowModal(false)}>
                    <form onSubmit={handleSubmit}>
                        <div className="form-grid">
                            <div className="form-group full">
                                <label>Expense Title / Task *</label>
                                <input required className="form-control" placeholder="E.g. Server hosting, Office supplies" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} />
                            </div>
                            <div className="form-group">
                                <label>Amount (₹) *</label>
                                <input required type="number" step="0.01" className="form-control" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} />
                            </div>
                            <div className="form-group">
                                <label>Date *</label>
                                <input required type="date" className="form-control" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} />
                            </div>
                            <div className="form-group">
                                <label>Category</label>
                                <select className="form-control" value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}>
                                    <option value="office">Office Rent/Supplies</option>
                                    <option value="marketing">Marketing & Ads</option>
                                    <option value="tech">Tech / Infrastructure</option>
                                    <option value="payroll">Payroll Extras</option>
                                    <option value="other">Other</option>
                                </select>
                            </div>
                            <div className="form-group full">
                                <label>Description / More Info</label>
                                <textarea className="form-control" rows="3" placeholder="Provide more details..." value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
                            </div>
                        </div>
                        <div className="form-actions">
                            <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                            <button type="submit" className="btn btn-primary" disabled={saving}>
                                {saving ? 'Saving...' : editing ? 'Update Expense' : 'Record Expense'}
                            </button>
                        </div>
                    </form>
                </Modal>
            )}
        </div>
    );
}
