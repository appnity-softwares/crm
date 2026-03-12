import { useState, useEffect } from 'react';
import { attendanceAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/ui/Toast';
import { useNotifications } from '../context/NotificationContext';
import { Clock, LogIn, LogOut, CheckCircle, QrCode, Scan, Plus, UserCheck, Edit2 } from 'lucide-react';
import { employeeAPI } from '../services/api';
import DataTable from '../components/ui/DataTable';
import Modal from '../components/ui/Modal';
import QRGenerator from '../components/attendance/QRGenerator';
import QRScanner from '../components/attendance/QRScanner';

export default function Attendance() {
    const { hasElevated, user } = useAuth();
    const toast = useToast();
    const { addNotification } = useNotifications();
    const [records, setRecords] = useState([]);
    const [loading, setLoading] = useState(true);
    const [checkingIn, setCheckingIn] = useState(false);
    const [checkingOut, setCheckingOut] = useState(false);
    const [showQRGen, setShowQRGen] = useState(false);
    const [showQRScan, setShowQRScan] = useState(false);
    const [showModal, setShowModal] = useState(false);
    const [editing, setEditing] = useState(null);
    const [form, setForm] = useState({ user_id: '', date: '', status: 'present', check_in: '', check_out: '' });
    const [employees, setEmployees] = useState([]);
    const [saving, setSaving] = useState(false);

    // Filters
    const [filterDate, setFilterDate] = useState('');
    const [filterMonth, setFilterMonth] = useState('');
    const [filterYear, setFilterYear] = useState(new Date().getFullYear().toString());

    const load = async () => {
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
            const { data } = hasElevated
                ? await attendanceAPI.getAll(params)
                : await attendanceAPI.getMine(params);
            setRecords(data.attendance || []);
            if (hasElevated) {
                const { data: empData } = await employeeAPI.getAll();
                setEmployees(empData.employees || []);
            }
        } catch { } finally { setLoading(false); }
    };

    useEffect(() => { load(); }, [filterDate, filterMonth, filterYear]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            if (editing) {
                await attendanceAPI.update(editing, form);
                toast('Attendance updated');
            } else {
                await attendanceAPI.create(form);
                toast('Attendance recorded');
                const emp = employees.find(e => e.id === form.user_id);
                addNotification({
                    type: 'success',
                    title: 'Attendance Recorded',
                    message: `Manual attendance marked as ${form.status} for ${emp?.name || 'Employee'}.`,
                });
            }
            setShowModal(false);
            setEditing(null);
            load();
        } catch (err) {
            toast(err.response?.data?.error || 'Failed', 'error');
        } finally { setSaving(false); }
    };

    const handleEdit = (r) => {
        setEditing(r.id);
        
        // ISO to HH:MM helper
        const formatToHHMM = (iso) => {
            if (!iso) return '';
            const d = new Date(iso);
            return String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
        };

        setForm({
            user_id: r.user_id,
            date: r.date ? r.date.split('T')[0] : '',
            status: r.status,
            check_in: formatToHHMM(r.check_in),
            check_out: formatToHHMM(r.check_out)
        });
        setShowModal(true);
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Delete this record?')) return;
        try {
            await attendanceAPI.delete(id);
            toast('Record deleted');
            load();
        } catch { toast('Failed', 'error'); }
    };

    const statusBadge = (s) => {
        const map = { present: 'green', absent: 'red', half_day: 'amber', leave: 'purple' };
        return <span className={`badge ${map[s] || 'gray'}`}>{s?.replace('_', ' ')}</span>;
    };

    const formatTime = (t) => t ? new Date(t).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : '—';
    const formatDate = (d) => new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

    const columns = [
        { header: 'Employee', accessor: r => r.user?.name || '—', show: hasElevated },
        { header: 'Date', accessor: 'date', render: r => formatDate(r.date) },
        { header: 'Check In', accessor: 'check_in', render: r => formatTime(r.check_in) },
        { header: 'Check Out', accessor: 'check_out', render: r => formatTime(r.check_out) },
        { header: 'Status', accessor: 'status', render: r => statusBadge(r.status) }
    ];

    if (hasElevated) {
        columns.push({
            header: 'Actions',
            key: 'actions',
            render: (r) => (
                <div style={{ display: 'flex', gap: 6 }}>
                    <button className="btn btn-sm btn-secondary" onClick={() => handleEdit(r)}>
                        <Edit2 size={12} />
                    </button>
                    <button className="btn btn-sm btn-danger" onClick={() => handleDelete(r.id)}>×</button>
                </div>
            )
        });
    }

    return (
        <div>
            <div className="header">
                <div className="header-left">
                    <h1>Attendance</h1>
                    <p>{hasElevated ? 'Manage team attendance and shifts' : 'Your daily clock-in records'}</p>
                </div>
                <div className="header-actions">
                    {hasElevated ? (
                        <>
                            <button className="btn btn-primary" onClick={() => setShowQRGen(true)}>
                                <QrCode size={15} /> Live QR Code
                            </button>
                            <button className="btn btn-secondary" onClick={() => { setEditing(null); setForm({ user_id: '', date: '', status: 'present', check_in: '', check_out: '' }); setShowModal(true); }}>
                                <Plus size={15} /> Manual Entry
                            </button>
                        </>
                    ) : (
                        <button className="btn btn-primary" onClick={() => setShowQRScan(true)}>
                            <Scan size={15} /> Scan to Mark Attendance
                        </button>
                    )}
                </div>
            </div>

            <div className="page-content">
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
                            Clear
                        </button>
                    </div>
                </div>

                <div className="card">
                    {loading ? <div className="spinner" /> : (
                        <DataTable
                            columns={columns.filter(c => c.show !== false)}
                            data={records}
                            pageSize={10}
                            searchable={hasElevated}
                            filters={[
                                {
                                    key: 'status',
                                    label: 'Status',
                                    options: [
                                        { value: 'present', label: 'Present' },
                                        { value: 'absent', label: 'Absent' },
                                        { value: 'half_day', label: 'Half Day' },
                                        { value: 'leave', label: 'Leave' }
                                    ]
                                }
                            ]}
                            emptyMessage="No attendance records found."
                        />
                    )}
                </div>
            </div>

            {showModal && (
                <Modal title={editing ? "Edit Attendance Record" : "Manual Attendance Entry"} onClose={() => setShowModal(false)}>
                    <form onSubmit={handleSubmit}>
                        <div className="form-grid">
                            <div className="form-group full">
                                <label>Employee *</label>
                                <select required value={form.user_id} onChange={e => setForm({ ...form, user_id: e.target.value })}>
                                    <option value="">Select Employee</option>
                                    {employees.map(e => <option key={e.id} value={e.id}>{e.name} ({e.email})</option>)}
                                </select>
                            </div>
                            <div className="form-group">
                                <label>Date *</label>
                                <input type="date" required value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} />
                            </div>
                            <div className="form-group">
                                <label>Status *</label>
                                <select value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}>
                                    <option value="present">Present</option>
                                    <option value="absent">Absent</option>
                                    <option value="half_day">Half Day</option>
                                    <option value="leave">Leave</option>
                                </select>
                            </div>
                            <div className="form-group">
                                <label>Check In</label>
                                <input type="time" value={form.check_in} onChange={e => setForm({ ...form, check_in: e.target.value })} />
                            </div>
                            <div className="form-group">
                                <label>Check Out</label>
                                <input type="time" value={form.check_out} onChange={e => setForm({ ...form, check_out: e.target.value })} />
                            </div>
                        </div>
                        <div className="form-actions">
                            <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                            <button type="submit" className="btn btn-primary" disabled={saving}>
                                {saving ? 'Saving...' : editing ? 'Update Record' : 'Record Attendance'}
                            </button>
                        </div>
                    </form>
                </Modal>
            )}
            {showQRGen && <QRGenerator onClose={() => setShowQRGen(false)} />}
            {showQRScan && <QRScanner onClose={() => setShowQRScan(false)} onScanSuccess={load} />}
        </div>
    );
}
