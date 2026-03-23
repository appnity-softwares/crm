import { useState, useEffect } from 'react';
import { trainingAPI, employeeAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/ui/Toast';
import Modal from '../components/ui/Modal';
import { GraduationCap, Edit2, CheckCircle2, DollarSign, ExternalLink, UserPlus } from 'lucide-react';
import DataTable from '../components/ui/DataTable';

export default function Students() {
    const { isAdmin } = useAuth();
    const toast = useToast();
    const [enrollments, setEnrollments] = useState([]);
    const [courses, setCourses] = useState([]);
    const [allStudents, setAllStudents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editing, setEditing] = useState(null);
    const [form, setForm] = useState({ 
        student_id: '', 
        course_id: '', 
        status: 'active', 
        start_date: new Date().toISOString().split('T')[0], 
        end_date: '',
        total_fee: '', 
        paid_amount: '0', 
        completed_topic: '', 
        cert_link: '', 
        offer_link: '' 
    });
    const [saving, setSaving] = useState(false);
    const [showPaymentModal, setShowPaymentModal] = useState(false);
    const [payingEnrollment, setPayingEnrollment] = useState(null);
    const [paymentForm, setPaymentForm] = useState({ amount: '', date: new Date().toISOString().split('T')[0], description: 'Installment' });

    const load = async () => {
        setLoading(true);
        try {
            const [enRes, coRes, usRes] = await Promise.all([
                trainingAPI.getEnrollments(),
                trainingAPI.getCourses(),
                employeeAPI.getAll()
            ]);
            setEnrollments(enRes.data || []);
            setCourses(coRes.data || []);
            setAllStudents(usRes.data.filter(u => u.role === 'trainee') || []);
        } catch { } finally { setLoading(false); }
    };

    useEffect(() => { load(); }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            const payload = { 
                ...form, 
                total_fee: parseFloat(form.total_fee) || 0,
                paid_amount: parseFloat(form.paid_amount) || 0
            };

            if (editing) {
                await trainingAPI.updateEnrollment(editing, payload);
                toast('Enrollment updated successfully');
            } else {
                await trainingAPI.enroll(payload);
                toast('Student enrolled successfully');
            }
            setShowModal(false);
            setEditing(null);
            load();
        } catch (err) {
            toast(err.response?.data?.error || 'Failed to save', 'error');
        } finally { setSaving(false); }
    };

    const handleEdit = (en) => {
        setEditing(en.id);
        setForm({
            student_id: en.student_id,
            course_id: en.course_id,
            status: en.status,
            start_date: en.start_date.split('T')[0],
            end_date: en.end_date ? en.end_date.split('T')[0] : '',
            total_fee: en.total_fee.toString(),
            paid_amount: en.paid_amount.toString(),
            completed_topic: en.completed_topic || '',
            cert_link: en.cert_link || '',
            offer_link: en.offer_link || ''
        });
        setShowModal(true);
    };

    const handlePaymentSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            await trainingAPI.addPayment(payingEnrollment.id, {
                ...paymentForm,
                amount: parseFloat(paymentForm.amount)
            });
            toast('Payment recorded successfully');
            setShowPaymentModal(false);
            load();
        } catch (err) {
            toast(err.response?.data?.error || 'Failed to record payment', 'error');
        } finally { setSaving(false); }
    };

    const columns = [
        { 
            header: 'Student', 
            accessor: 'student.name', 
            render: r => (
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div className="table-avatar" style={{ 
                        width: 32, height: 32, borderRadius: '50%', overflow: 'hidden', 
                        background: 'var(--primary-100)', color: 'var(--primary-700)',
                        fontSize: '0.75rem', fontWeight: 700, display: 'flex', 
                        alignItems: 'center', justifyContent: 'center', flexShrink: 0 
                    }}>
                        {r.student?.avatar ? (
                            <img src={r.student.avatar} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        ) : (
                            r.student?.name?.charAt(0).toUpperCase()
                        )}
                    </div>
                    <div>
                        <div style={{ fontWeight: 600 }}>{r.student?.name}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{r.student?.email}</div>
                    </div>
                </div>
            )
        },
        { header: 'Course', accessor: 'course.title', render: r => <span>{r.course?.title}</span> },
        { 
            header: 'Status', 
            accessor: 'status', 
            render: r => <span className={`badge ${r.status === 'active' ? 'blue' : r.status === 'completed' ? 'green' : 'gray'}`}>{r.status}</span> 
        },
        { 
            header: 'Payments', 
            accessor: 'paid_amount', 
            render: r => (
                <div style={{ fontSize: '0.85rem' }}>
                    <span style={{ fontWeight: 600 }}>${r.paid_amount}</span> / <span style={{ color: 'var(--text-muted)' }}>${r.total_fee}</span>
                </div>
            )
        },
        { header: 'Started', accessor: 'start_date', render: r => new Date(r.start_date).toLocaleDateString() },
        {
            header: 'Actions',
            key: 'actions',
            render: (en) => (
                <div style={{ display: 'flex', gap: 6 }}>
                    <button className="btn btn-sm btn-secondary" onClick={() => handleEdit(en)} title="Update Progress/Fees">
                        <Edit2 size={12} />
                    </button>
                    <button className="btn btn-sm btn-primary" onClick={() => { setPayingEnrollment(en); setPaymentForm({ amount: '', date: new Date().toISOString().split('T')[0], description: 'Installment' }); setShowPaymentModal(true); }} title="Add Fee Payment">
                        <DollarSign size={12} />
                    </button>
                    {(en.cert_link || en.offer_link) && (
                        <button className="btn btn-sm btn-text" onClick={() => window.open(en.cert_link || en.offer_link, '_blank')} title="View Docs">
                            <ExternalLink size={12} />
                        </button>
                    )}
                </div>
            )
        }
    ];

    return (
        <div className="page-content">
            <div className="header">
                <div className="header-left">
                    <h1>Student Enrollments</h1>
                    <p>Track student progress, fees, and training outcomes</p>
                </div>
                <div className="header-actions">
                    <button className="btn btn-primary" onClick={() => { setEditing(null); setForm({ student_id: '', course_id: '', status: 'active', start_date: new Date().toISOString().split('T')[0], end_date: '', total_fee: '', paid_amount: '0', completed_topic: '', cert_link: '', offer_link: '' }); setShowModal(true); }}>
                        <UserPlus size={15} /> Enroll Student
                    </button>
                </div>
            </div>

            <div className="stats-grid" style={{ marginBottom: 24 }}>
                <div className="stat-card">
                    <div className="stat-icon" style={{ background: 'var(--blue-100)', color: 'var(--blue-600)' }}>
                        <GraduationCap size={24} />
                    </div>
                    <div className="stat-info">
                        <label>Total Enrolled</label>
                        <h3>{enrollments.length}</h3>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon" style={{ background: 'var(--green-100)', color: 'var(--green-600)' }}>
                        <CheckCircle2 size={24} />
                    </div>
                    <div className="stat-info">
                        <label>Completed</label>
                        <h3>{enrollments.filter(e => e.status === 'completed').length}</h3>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon" style={{ background: 'var(--amber-100)', color: 'var(--amber-600)' }}>
                        <DollarSign size={24} />
                    </div>
                    <div className="stat-info">
                        <label>Revenue Collected</label>
                        <h3>${enrollments.reduce((sum, e) => sum + (e.paid_amount || 0), 0).toFixed(2)}</h3>
                    </div>
                </div>
            </div>

            <div className="card">
                {loading ? <div className="spinner" /> : (
                    <DataTable
                        columns={columns}
                        data={enrollments}
                        pageSize={15}
                        searchable={true}
                        emptyMessage="No student enrollments found."
                    />
                )}
            </div>

            {showModal && (
                <Modal title={editing ? "Update Enrollment" : "New Enrollment"} onClose={() => setShowModal(false)} size="lg">
                    <form onSubmit={handleSubmit}>
                        <div className="form-grid">
                            <div className="form-group">
                                <label>Select Student *</label>
                                <select required value={form.student_id} onChange={e => setForm({ ...form, student_id: e.target.value })} disabled={!!editing}>
                                    <option value="">-- Choose Trainee --</option>
                                    {allStudents.map(s => <option key={s.id} value={s.id}>{s.name} ({s.email})</option>)}
                                </select>
                            </div>
                            <div className="form-group">
                                <label>Select Course *</label>
                                <select required value={form.course_id} onChange={e => {
                                    const c = courses.find(cc => cc.id === e.target.value);
                                    setForm({ ...form, course_id: e.target.value, total_fee: c ? c.total_fee.toString() : '' });
                                }} disabled={!!editing}>
                                    <option value="">-- Choose Training --</option>
                                    {courses.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
                                </select>
                            </div>
                            <div className="form-group">
                                <label>Start Date *</label>
                                <input type="date" required value={form.start_date} onChange={e => setForm({ ...form, start_date: e.target.value })} />
                            </div>
                            <div className="form-group">
                                <label>Status</label>
                                <select value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}>
                                    <option value="active">Active Learning</option>
                                    <option value="completed">Completed / Alumni</option>
                                    <option value="on_hold">On Hold</option>
                                    <option value="dropped">Dropped / Incomplete</option>
                                </select>
                            </div>
                            <div className="form-group">
                                <label>Total Fee Agreed ($)</label>
                                <input type="number" required value={form.total_fee} onChange={e => setForm({ ...form, total_fee: e.target.value })} />
                            </div>
                            <div className="form-group">
                                <label>Current Paid Amount (Manual override) ($)</label>
                                <input type="number" step="0.01" value={form.paid_amount} onChange={e => setForm({ ...form, paid_amount: e.target.value })} />
                            </div>
                            <div className="form-group full">
                                <label>Currently Completed Topic</label>
                                <input value={form.completed_topic} onChange={e => setForm({ ...form, completed_topic: e.target.value })} placeholder="e.g. Module 3: Database Design" />
                            </div>
                            <div className="form-group full">
                                <label>Certificate Link</label>
                                <input value={form.cert_link} onChange={e => setForm({ ...form, cert_link: e.target.value })} placeholder="Cloud URL or ID" />
                            </div>
                            <div className="form-group full">
                                <label>Training Offer/Program Link</label>
                                <input value={form.offer_link} onChange={e => setForm({ ...form, offer_link: e.target.value })} placeholder="Offers or Agreement Link" />
                            </div>
                        </div>
                        <div className="form-actions" style={{ marginTop: 24 }}>
                            <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                            <button type="submit" className="btn btn-primary" disabled={saving}>
                                {saving ? 'Saving...' : editing ? 'Update Enrollment' : 'Enroll Student'}
                            </button>
                        </div>
                    </form>
                </Modal>
            )}

            {showPaymentModal && (
                <Modal title={`Add Payment: ${payingEnrollment?.student?.name}`} onClose={() => setShowPaymentModal(false)}>
                    <form onSubmit={handlePaymentSubmit}>
                        <div className="form-group">
                            <label>Amount ($) *</label>
                            <input type="number" step="0.01" required value={paymentForm.amount} onChange={e => setPaymentForm({ ...paymentForm, amount: e.target.value })} />
                            <small>This will be added to total paid: ${payingEnrollment?.paid_amount}</small>
                        </div>
                        <div className="form-group">
                            <label>Date *</label>
                            <input type="date" required value={paymentForm.date} onChange={e => setPaymentForm({ ...paymentForm, date: e.target.value })} />
                        </div>
                        <div className="form-group">
                            <label>Description</label>
                            <input value={paymentForm.description} onChange={e => setPaymentForm({ ...paymentForm, description: e.target.value })} placeholder="e.g. Monthly Installment" />
                        </div>
                        <div className="form-actions" style={{ marginTop: 20 }}>
                            <button type="button" className="btn btn-secondary" onClick={() => setShowPaymentModal(false)}>Cancel</button>
                            <button type="submit" className="btn btn-primary" disabled={saving}>
                                {saving ? 'Processing...' : 'Record Payment'}
                            </button>
                        </div>
                    </form>
                </Modal>
            )}
        </div>
    );
}
