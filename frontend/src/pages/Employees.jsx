import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/ui/Toast';
import { employeeAPI } from '../services/api';
import Modal from '../components/ui/Modal';
import DataTable from '../components/ui/DataTable';
import { UserPlus, Eye, Edit2 } from 'lucide-react';

export default function Employees() {
    const { isAdmin, user } = useAuth();
    const toast = useToast();
    const [employees, setEmployees] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editing, setEditing] = useState(null);
    const [creating, setCreating] = useState(false);
    const [form, setForm] = useState({ name: '', email: '', password: '', role: 'employee', department: '', designation: '' });

    const loadData = async () => {
        try {
            setLoading(true);
            const { data } = await employeeAPI.getAll();
            setEmployees(data.employees || []);
        } catch { toast('Failed to load employees', 'error'); }
        finally { setLoading(false); }
    };

    useEffect(() => { loadData(); }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setCreating(true);
        try {
            if (editing) {
                const payload = { ...form };
                if (!payload.password) delete payload.password;
                await employeeAPI.update(editing, payload);
                toast('Employee updated successfully', 'success');
            } else {
                await employeeAPI.create(form);
                toast('Employee created successfully', 'success');
            }
            setShowModal(false);
            setEditing(null);
            setForm({ name: '', email: '', password: '', role: 'employee', department: '', designation: '' });
            loadData();
        } catch (err) { toast(err.response?.data?.error || 'Failed to save', 'error'); }
        finally { setCreating(false); }
    };

    const handleEdit = (emp) => {
        setEditing(emp.id);
        setForm({
            name: emp.name,
            email: emp.email,
            password: '',
            role: emp.role,
            department: emp.department || '',
            designation: emp.designation || ''
        });
        setShowModal(true);
    };

    const handleDeactivate = async (id) => {
        if (!window.confirm('Are you sure you want to deactivate this employee?')) return;
        try {
            await employeeAPI.deactivate(id);
            toast('Employee deactivated', 'success');
            loadData();
        } catch { toast('Failed to deactivate', 'error'); }
    };

    const columns = [
        { header: 'ID', key: 'uid', accessor: 'id', sortable: false, render: r => <span style={{ color: 'var(--text-muted)' }}>...{r.id.slice(0, 4)}</span> },
        {
            header: 'Name',
            accessor: 'name',
            render: (r) => (
                <Link to={`/employees/${r.id}`} style={{ fontWeight: 600, color: 'var(--primary)', textDecoration: 'none' }}>
                    {r.name}
                </Link>
            )
        },
        { header: 'Email', accessor: 'email' },
        {
            header: 'Role',
            accessor: 'role',
            render: (r) => (
                <span className={`badge ${r.role === 'admin' ? 'purple' : r.role === 'manager' ? 'blue' : 'gray'}`}>
                    {r.role}
                </span>
            )
        },
        { header: 'Department', accessor: (r) => r.department || '—' },
        { header: 'Designation', accessor: (r) => r.designation || '—' },
        {
            header: 'Status',
            accessor: 'is_active',
            render: (r) => (
                <span className={`badge ${r.is_active ? 'green' : 'red'}`}>
                    {r.is_active ? 'Active' : 'Inactive'}
                </span>
            )
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
                    <Link to={`/employees/${row.id}`} className="btn btn-sm btn-secondary">
                        <Eye size={12} />
                    </Link>
                    <button
                        className="btn btn-sm btn-danger"
                        onClick={() => handleDeactivate(row.id)}
                        disabled={user.id === row.id || !row.is_active}
                    >
                        Deactivate
                    </button>
                </div>
            )
        });
    }

    if (loading) return <div className="spinner" />;

    return (
        <div className="page-content">
            <div className="header" style={{ padding: 0, border: 'none', marginBottom: 24, background: 'transparent' }}>
                <div className="header-left">
                    <h1>Employees</h1>
                    <p>Manage your team members</p>
                </div>
                {isAdmin && (
                    <div className="header-actions">
                        <button className="btn btn-primary" onClick={() => { setEditing(null); setForm({ name: '', email: '', password: '', role: 'employee', department: '', designation: '' }); setShowModal(true); }}>
                            <UserPlus size={15} /> Add Employee
                        </button>
                    </div>
                )}
            </div>

            <div className="card">
                <DataTable
                    columns={columns}
                    data={employees}
                    searchable={true}
                    pageSize={10}
                    emptyMessage="No employees found in the system."
                />
            </div>

            {showModal && (
                <Modal title={editing ? "Edit Employee" : "Add New Employee"} onClose={() => setShowModal(false)}>
                    <form onSubmit={handleSubmit}>
                        <div className="form-grid">
                            <div className="form-group">
                                <label>Full Name *</label>
                                <input required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="John Doe" />
                            </div>
                            <div className="form-group">
                                <label>Email *</label>
                                <input type="email" required value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="john@erp.com" />
                            </div>
                            <div className="form-group">
                                <label>Password {editing && '(leave blank to keep current)'}</label>
                                <input type="password" required={!editing} value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} />
                            </div>
                            <div className="form-group">
                                <label>Role *</label>
                                <select value={form.role} onChange={e => setForm({ ...form, role: e.target.value })}>
                                    <option value="employee">Employee</option>
                                    <option value="manager">Manager</option>
                                    <option value="admin">Admin</option>
                                    <option value="client">Client</option>
                                </select>
                            </div>
                            <div className="form-group">
                                <label>Department</label>
                                <input value={form.department} onChange={e => setForm({ ...form, department: e.target.value })} placeholder="e.g. Engineering" />
                            </div>
                            <div className="form-group">
                                <label>Designation</label>
                                <input value={form.designation} onChange={e => setForm({ ...form, designation: e.target.value })} placeholder="e.g. Senior Developer" />
                            </div>
                        </div>
                        <div className="form-actions">
                            <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                            <button type="submit" className="btn btn-primary" disabled={creating}>
                                {creating ? 'Saving...' : editing ? 'Update Employee' : 'Create Employee'}
                            </button>
                        </div>
                    </form>
                </Modal>
            )}
        </div>
    );
}
