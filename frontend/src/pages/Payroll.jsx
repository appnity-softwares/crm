import { useState, useEffect } from 'react';
import { payrollAPI, employeeAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/ui/Toast';
import Modal from '../components/ui/Modal';
import { DollarSign, Plus, Edit2, CheckCircle, Wallet } from 'lucide-react';
import DataTable from '../components/ui/DataTable';
import { useApi } from '../hooks/useApi';
import { balanceAPI } from '../services/api';

export default function Payroll() {
    const { isAdmin, hasElevated } = useAuth();
    const toast = useToast();
    const { data: balanceData } = useApi(balanceAPI.get);
    const [records, setRecords] = useState([]);
    const [employees, setEmployees] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editing, setEditing] = useState(null);
    const [form, setForm] = useState({ user_id: '', month: new Date().getMonth() + 1, year: new Date().getFullYear(), basic_salary: '', bonus: '0', deductions: '0' });
    const [saving, setSaving] = useState(false);

    const load = async () => {
        setLoading(true);
        try {
            const [payRes, empRes] = await Promise.all([
                isAdmin ? payrollAPI.getAll() : payrollAPI.getMine(),
                isAdmin ? employeeAPI.getAll() : Promise.resolve({ data: { employees: [] } }),
            ]);
            setRecords(payRes.data.payroll || []);
            setEmployees(empRes.data.employees || []);
        } catch { } finally { setLoading(false); }
    };

    useEffect(() => { load(); }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            const payload = {
                ...form,
                month: parseInt(form.month),
                year: parseInt(form.year),
                basic_salary: parseFloat(form.basic_salary),
                bonus: parseFloat(form.bonus || 0),
                deductions: parseFloat(form.deductions || 0),
            };

            if (editing) {
                await payrollAPI.update(editing, payload);
                toast('Payroll updated');
            } else {
                await payrollAPI.create(payload);
                toast('Payroll entry created');
            }
            setShowModal(false);
            setEditing(null);
            load();
        } catch (err) {
            toast(err.response?.data?.error || 'Failed to save', 'error');
        } finally { setSaving(false); }
    };

    const handleEdit = (r) => {
        setEditing(r.id);
        setForm({
            user_id: r.user_id,
            month: r.month,
            year: r.year,
            basic_salary: r.basic_salary.toString(),
            bonus: r.bonus.toString(),
            deductions: r.deductions.toString()
        });
        setShowModal(true);
    };

    const handleMarkPaid = async (id) => {
        try {
            await payrollAPI.update(id, { status: 'paid' });
            toast('Marked as paid');
            load();
        } catch { toast('Failed', 'error'); }
    };

    const currency = (n) => `₹${Number(n).toLocaleString('en-IN')}`;
    const monthName = (m) => ['', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][m];

    const columns = [
        { header: 'Employee', accessor: r => r.user?.name || '—', show: isAdmin, render: r => <span style={{ fontWeight: 600 }}>{r.user?.name || '—'}</span> },
        { header: 'Period', accessor: r => `${monthName(r.month)} ${r.year}` },
        { header: 'Basic', accessor: 'basic_salary', render: r => currency(r.basic_salary) },
        { header: 'Bonus', accessor: 'bonus', render: r => <span style={{ color: 'var(--green-600)' }}>+{currency(r.bonus)}</span> },
        { header: 'Deductions', accessor: 'deductions', render: r => <span style={{ color: 'var(--red-500)' }}>-{currency(r.deductions)}</span> },
        { header: 'Net Salary', accessor: 'net_salary', render: r => <span style={{ fontWeight: 700 }}>{currency(r.net_salary)}</span> },
        {
            header: 'Status',
            accessor: 'status',
            render: (r) => <span className={`badge ${r.status === 'paid' ? 'green' : 'amber'}`}>{r.status}</span>
        }
    ];

    if (isAdmin) {
        columns.push({
            header: 'Actions',
            key: 'actions',
            render: (r) => (
                <div style={{ display: 'flex', gap: 6 }}>
                    <button className="btn btn-sm btn-secondary" onClick={() => handleEdit(r)} title="Edit">
                        <Edit2 size={12} />
                    </button>
                    {r.status !== 'paid' && (
                        <button className="btn btn-sm btn-success" onClick={() => handleMarkPaid(r.id)} title="Mark Paid">
                            <CheckCircle size={12} />
                        </button>
                    )}
                </div>
            )
        });
    }

    return (
        <div>
            <div className="header">
                <div className="header-left">
                    <h1>Payroll</h1>
                    <p>{isAdmin ? 'Manage salary payments' : 'Your salary records'}</p>
                </div>
                {isAdmin && (
                    <div className="header-actions">
                        <button className="btn btn-primary" onClick={() => { setEditing(null); setForm({ user_id: '', month: new Date().getMonth() + 1, year: new Date().getFullYear(), basic_salary: '', bonus: '0', deductions: '0' }); setShowModal(true); }}>
                            <Plus size={15} /> Create Payroll
                        </button>
                    </div>
                )}
            </div>

            <div className="page-content">
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
                        <div className="stat-icon purple"><DollarSign size={24} /></div>
                        <div className="stat-content">
                            <span className="stat-label">Total Payroll (Paid)</span>
                            <div className="stat-value" style={{ color: 'var(--purple-600)' }}>₹{records.filter(r => r.status === 'paid').reduce((sum, r) => sum + r.net_salary, 0).toLocaleString('en-IN')}</div>
                        </div>
                    </div>
                </div>

                <div className="card">
                    {loading ? <div className="spinner" /> : (
                        <DataTable
                            columns={columns.filter(c => c.show !== false)}
                            data={records}
                            pageSize={10}
                            searchable={isAdmin}
                            emptyMessage="No payroll records found."
                        />
                    )}
                </div>
            </div>

            {showModal && (
                <Modal title={editing ? "Edit Payroll Entry" : "Create Payroll Entry"} onClose={() => setShowModal(false)}>
                    <form onSubmit={handleSubmit}>
                        <div className="form-grid">
                            <div className="form-group full">
                                <label>Employee *</label>
                                <select required value={form.user_id} onChange={e => setForm({ ...form, user_id: e.target.value })}>
                                    <option value="">Select employee</option>
                                    {employees.map(e => <option key={e.id} value={e.id}>{e.name} — {e.designation}</option>)}
                                </select>
                            </div>
                            <div className="form-group">
                                <label>Month *</label>
                                <select value={form.month} onChange={e => setForm({ ...form, month: e.target.value })}>
                                    {[...Array(12)].map((_, i) => <option key={i + 1} value={i + 1}>{monthName(i + 1)}</option>)}
                                </select>
                            </div>
                            <div className="form-group">
                                <label>Year *</label>
                                <input type="number" required value={form.year} onChange={e => setForm({ ...form, year: e.target.value })} />
                            </div>
                            <div className="form-group">
                                <label>Basic Salary (₹) *</label>
                                <input type="number" required value={form.basic_salary} onChange={e => setForm({ ...form, basic_salary: e.target.value })} />
                            </div>
                            <div className="form-group">
                                <label>Bonus (₹)</label>
                                <input type="number" value={form.bonus} onChange={e => setForm({ ...form, bonus: e.target.value })} />
                            </div>
                            <div className="form-group">
                                <label>Deductions (₹)</label>
                                <input type="number" value={form.deductions} onChange={e => setForm({ ...form, deductions: e.target.value })} />
                            </div>
                        </div>
                        <div className="form-actions">
                            <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                            <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Saving...' : editing ? 'Update Entry' : 'Create Entry'}</button>
                        </div>
                    </form>
                </Modal>
            )}
        </div>
    );
}
