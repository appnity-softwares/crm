import { useState, useEffect } from 'react';
import { trainingAPI, employeeAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/ui/Toast';
import Modal from '../components/ui/Modal';
import { GraduationCap, Edit2, CheckCircle2, IndianRupee, ExternalLink, UserPlus, Eye, EyeOff, CheckSquare, Square, Search, Clock } from 'lucide-react';
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
        offer_link: '',
        resources: ''
    });
    const [saving, setSaving] = useState(false);
    const [showPaymentModal, setShowPaymentModal] = useState(false);
    const [payingEnrollment, setPayingEnrollment] = useState(null);
    const [paymentForm, setPaymentForm] = useState({ amount: '', date: new Date().toISOString().split('T')[0], description: 'Installment' });

    const [showAddTraineeModal, setShowAddTraineeModal] = useState(false);
    const [traineeForm, setTraineeForm] = useState({ name: '', email: '', password: '', role: 'trainee' });
    const [filterStatus, setFilterStatus] = useState('all');
    const [showRevenue, setShowRevenue] = useState(false);
    const [selectedEnrollment, setSelectedEnrollment] = useState(null);
    const [enrollmentPayments, setEnrollmentPayments] = useState([]);
    const [loadingPayments, setLoadingPayments] = useState(false);

    const load = async () => {
        setLoading(true);
        try {
            const [enRes, coRes, usRes] = await Promise.all([
                trainingAPI.getEnrollments(),
                trainingAPI.getCourses(),
                employeeAPI.getAll()
            ]);
            setEnrollments(enRes.data?.enrollments || enRes.data || []);
            setCourses(coRes.data?.courses || coRes.data || []);
            setAllStudents(usRes.data?.employees || usRes.data || []);
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
        const course = courses.find(c => c.id === en.course_id);
        setForm({
            student_id: en.student_id,
            course_id: en.course_id,
            status: en.status,
            start_date: en.start_date.split('T')[0],
            end_date: en.end_date ? en.end_date.split('T')[0] : '',
            total_fee: en.total_fee.toString(),
            paid_amount: en.paid_amount.toString(),
            completed_topic: en.completed_topic || '',
            completed_modules: en.completed_modules || '',
            cert_link: en.cert_link || '',
            offer_link: en.offer_link || '',
            resources: en.resources || ''
        });
        setShowModal(true);
    };

    const fetchPayments = async (eid) => {
        setLoadingPayments(true);
        try {
            const { data } = await trainingAPI.getEnrollments({ enrollment_id: eid }); // Assuming this might work or use incomeAPI
            // Actually let's use incomeAPI to get payments for this enrollment
            // I'll call incomeAPI directly if available in this scope
        } catch {} finally { setLoadingPayments(false); }
    };

    const handleOpenDetail = async (en) => {
        setSelectedEnrollment(en);
        // We'll also fetch payments if needed, but let's start with checklist
    };

    const toggleModule = async (en, moduleName) => {
        const currentModules = en.completed_modules ? en.completed_modules.split(',') : [];
        let newModules;
        if (currentModules.includes(moduleName)) {
            newModules = currentModules.filter(m => m !== moduleName);
        } else {
            newModules = [...currentModules, moduleName];
        }
        
        try {
            await trainingAPI.updateEnrollment(en.id, { completed_modules: newModules.join(',') });
            toast(`Progress updated for ${moduleName}`);
            load();
            // Update local selected state if any
            if (selectedEnrollment?.id === en.id) {
                setSelectedEnrollment({ ...en, completed_modules: newModules.join(',') });
            }
        } catch {
            toast('Failed to update module progress', 'error');
        }
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

    const handleAddTrainee = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            await employeeAPI.create(traineeForm);
            toast('New trainee record created!');
            setShowAddTraineeModal(false);
            setTraineeForm({ name: '', email: '', password: '', role: 'trainee' });
            load();
        } catch (err) {
            toast(err.response?.data?.error || 'Failed to create trainee', 'error');
        } finally { setSaving(false); }
    };

    const filteredEnrollments = enrollments.filter(e => filterStatus === 'all' || e.status === filterStatus);

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
            header: 'Fee Progress', 
            accessor: 'paid_amount', 
            render: r => {
                const pct = Math.min(100, Math.round((r.paid_amount / r.total_fee) * 100) || 0);
                return (
                    <div style={{ width: 120 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', marginBottom: 4 }}>
                            <span>₹{r.paid_amount}</span>
                            <span style={{ color: pct === 100 ? 'var(--green-600)' : 'var(--text-muted)' }}>{pct}%</span>
                        </div>
                        <div style={{ height: 4, background: 'var(--border)', borderRadius: 2, overflow: 'hidden' }}>
                            <div style={{ height: '100%', width: `${pct}%`, background: pct === 100 ? 'var(--green-500)' : 'var(--primary-500)' }} />
                        </div>
                    </div>
                );
            }
        },
        { 
            header: 'Modules', 
            accessor: 'completed_modules', 
            render: r => {
                const total = r.course?.modules?.split(',').filter(Boolean).length || 0;
                const done = r.completed_modules?.split(',').filter(Boolean).length || 0;
                return (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }} onClick={() => handleOpenDetail(r)}>
                        <CheckSquare size={14} className={done === total && total > 0 ? 'green' : 'blue'} />
                        <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>{done}/{total}</span>
                    </div>
                );
            }
        },
        { header: 'Current Progress', accessor: 'completed_topic', render: r => <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{r.completed_topic || 'Not started'}</span> },
        {
            header: 'Actions',
            key: 'actions',
            render: (en) => (
                <div style={{ display: 'flex', gap: 6 }}>
                    <button className="btn btn-sm btn-secondary" onClick={() => handleEdit(en)} title="Update Progress/Fees">
                        <Edit2 size={12} />
                    </button>
                    <button className="btn btn-sm btn-primary" onClick={() => { setPayingEnrollment(en); setPaymentForm({ amount: '', date: new Date().toISOString().split('T')[0], description: 'Installment' }); setShowPaymentModal(true); }} title="Add Fee Payment">
                        <IndianRupee size={12} />
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
                    <button className="btn btn-secondary" onClick={() => setShowAddTraineeModal(true)}>
                        <UserPlus size={15} /> Create Trainee Record
                    </button>
                    <button className="btn btn-primary" onClick={() => { setEditing(null); setForm({ student_id: '', course_id: '', status: 'active', start_date: new Date().toISOString().split('T')[0], end_date: '', total_fee: '', paid_amount: '0', completed_topic: '', cert_link: '', offer_link: '' }); setShowModal(true); }}>
                        <GraduationCap size={15} /> Enroll Student
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
                <div className="stat-card" style={{ position: 'relative' }}>
                    <div className="stat-icon" style={{ background: 'var(--amber-100)', color: 'var(--amber-600)' }}>
                        <IndianRupee size={24} />
                    </div>
                    <div className="stat-info">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <label>Revenue Collected</label>
                            <button onClick={() => setShowRevenue(!showRevenue)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: 0 }}>
                                {showRevenue ? <EyeOff size={14} /> : <Eye size={14} />}
                            </button>
                        </div>
                        <h3>{showRevenue ? `₹${(Array.isArray(enrollments) ? enrollments : []).reduce((sum, e) => sum + (e.paid_amount || 0), 0).toFixed(2)}` : '₹ ••••••••'}</h3>
                    </div>
                </div>
            </div>
            <div className="tabs" style={{ marginBottom: 20, display: 'flex', gap: 10 }}>
                {['all', 'active', 'completed', 'dropped', 'on_hold'].map(s => (
                    <button 
                        key={s} 
                        className={`tab-btn ${filterStatus === s ? 'active' : ''}`}
                        onClick={() => setFilterStatus(s)}
                        style={{
                            padding: '8px 16px', borderRadius: '8px', border: '1px solid var(--border)',
                            background: filterStatus === s ? 'var(--primary-500)' : 'var(--bg-card)',
                            color: filterStatus === s ? '#fff' : 'var(--text-secondary)',
                            fontWeight: 600, fontSize: '0.85rem', cursor: 'pointer', textTransform: 'capitalize'
                        }}
                    >
                        {s.replace('_', ' ')}
                    </button>
                ))}
            </div>

            <div className="card">
                {loading ? <div className="spinner" /> : (
                    <DataTable
                        columns={columns}
                        data={filteredEnrollments}
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
                                <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    Select Student * 
                                    {!editing && <span onClick={() => { setShowModal(false); setShowAddTraineeModal(true); }} style={{ color: 'var(--primary-600)', cursor: 'pointer', fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase' }}>+ Add New Trainee</span>}
                                </label>
                                <select required value={form.student_id} onChange={e => setForm({ ...form, student_id: e.target.value })} disabled={!!editing}>
                                    <option value="">-- Choose Person --</option>
                                    {(Array.isArray(allStudents) ? [...allStudents] : []).sort((a,b) => (a.name || '').localeCompare(b.name || '')).map(s => (
                                        <option key={s.id} value={s.id}>{s.name} ({s.role})</option>
                                    ))}
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
                                <label>Total Fee Agreed (₹)</label>
                                <input type="number" required value={form.total_fee} onChange={e => setForm({ ...form, total_fee: e.target.value })} />
                            </div>
                            <div className="form-group">
                                <label>Current Paid Amount (Manual override) (₹)</label>
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
                            <div className="form-group full">
                                <label>Student-Specific Resources (Comma separated links)</label>
                                <textarea rows="2" value={form.resources} onChange={e => setForm({ ...form, resources: e.target.value })} placeholder="e.g. project-repo:https://github.com/..., slides:https://googledrive/..." />
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
                            <label>Amount (₹) *</label>
                            <input type="number" step="0.01" required value={paymentForm.amount} onChange={e => setPaymentForm({ ...paymentForm, amount: e.target.value })} />
                            <small>This will be added to total paid: ₹{payingEnrollment?.paid_amount}</small>
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

            {showAddTraineeModal && (
                <Modal title="Create New Trainee Record" onClose={() => setShowAddTraineeModal(false)}>
                    <form onSubmit={handleAddTrainee}>
                        <div className="form-group">
                            <label>Full Name *</label>
                            <input required value={traineeForm.name} onChange={e => setTraineeForm({ ...traineeForm, name: e.target.value })} placeholder="John Doe" />
                        </div>
                        <div className="form-group">
                            <label>Email *</label>
                            <input type="email" required value={traineeForm.email} onChange={e => setTraineeForm({ ...traineeForm, email: e.target.value })} placeholder="john@example.com" />
                        </div>
                        <div className="form-group">
                            <label>Secure Password *</label>
                            <input type="password" required value={traineeForm.password} onChange={e => setTraineeForm({ ...traineeForm, password: e.target.value })} />
                        </div>
                        <div className="form-actions" style={{ marginTop: 20 }}>
                            <button type="button" className="btn btn-secondary" onClick={() => setShowAddTraineeModal(false)}>Cancel</button>
                            <button type="submit" className="btn btn-primary" disabled={saving}>
                                {saving ? 'Creating...' : 'Create Trainee'}
                            </button>
                        </div>
                    </form>
                </Modal>
            )}
            {selectedEnrollment && (
                <Modal title="Trainee Progress & Installments" onClose={() => setSelectedEnrollment(null)} size="lg">
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 350px', gap: 24 }}>
                        <div>
                            <h4 style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}><CheckSquare size={18} /> Module Completion Checklist</h4>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                                {selectedEnrollment.course?.modules?.split(',').map(m => m.trim()).filter(Boolean).map((mod, i) => {
                                    const isDone = selectedEnrollment.completed_modules?.split(',').includes(mod);
                                    return (
                                        <div 
                                            key={i} 
                                            onClick={() => toggleModule(selectedEnrollment, mod)}
                                            style={{ 
                                                display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', 
                                                borderRadius: 10, background: isDone ? 'var(--green-50)' : 'var(--bg-hover)',
                                                border: `1px solid ${isDone ? 'var(--green-200)' : 'var(--border)'}`,
                                                cursor: 'pointer', transition: '0.2s'
                                            }}
                                        >
                                            {isDone ? <CheckSquare className="green" size={20} /> : <Square size={20} color="var(--text-muted)" />}
                                            <span style={{ fontWeight: 600, color: isDone ? 'var(--green-700)' : 'var(--text-primary)' }}>{mod}</span>
                                        </div>
                                    );
                                })}
                                {(!selectedEnrollment.course?.modules || selectedEnrollment.course.modules === '') && (
                                    <div className="text-center" style={{ padding: 20, color: 'var(--text-muted)' }}>No modules defined for this course.</div>
                                )}
                            </div>
                        </div>
                        <div style={{ borderLeft: '1px solid var(--border)', paddingLeft: 24 }}>
                            <h4 style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}><IndianRupee size={18} /> Installment History</h4>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                                <div style={{ padding: 16, background: 'var(--bg-app)', borderRadius: 12, marginBottom: 10 }}>
                                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: 4 }}>Fee Progress</div>
                                    <div style={{ fontSize: '1.25rem', fontWeight: 800 }}>₹{selectedEnrollment.paid_amount} / ₹{selectedEnrollment.total_fee}</div>
                                </div>
                                <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Recent Payments</div>
                                <div style={{ padding: 12, borderRadius: 8, background: 'var(--bg-hover)', border: '1px dashed var(--border)', fontSize: '0.8rem', textAlign: 'center' }}>
                                    Click the Rupee icon in the table to add more installments.
                                </div>

                                <hr style={{ margin: '16px 0', border: 'none', borderTop: '1px solid var(--border)' }} />
                                <h4 style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}><ExternalLink size={18} color="var(--primary-600)" /> Student Resources</h4>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                                    {[
                                        ...(selectedEnrollment.course?.resources?.split(',') || []),
                                        ...(selectedEnrollment.resources?.split(',') || [])
                                    ].filter(Boolean).map((res, i) => {
                                        const parts = res.trim().includes(':') ? res.trim().split(':') : ['Resource', res.trim()];
                                        const name = parts[0];
                                        const url = parts.slice(1).join(':'); // handle double colons in URLs
                                        return (
                                            <a key={i} href={url.trim()} target="_blank" rel="noopener noreferrer" 
                                                style={{ 
                                                    display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', 
                                                    borderRadius: 10, background: 'var(--bg-hover)', border: '1px solid var(--border)', 
                                                    textDecoration: 'none', transition: '0.2s' 
                                                }}
                                                onMouseOver={(e) => e.currentTarget.style.borderColor = 'var(--primary-300)'}
                                                onMouseOut={(e) => e.currentTarget.style.borderColor = 'var(--border)'}
                                            >
                                                <div style={{ width: 28, height: 28, borderRadius: 8, background: 'var(--primary-100)', color: 'var(--primary-700)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                    <ExternalLink size={14} />
                                                </div>
                                                <span style={{ fontWeight: 600, fontSize: '0.85rem', color: 'var(--text-primary)' }}>{name}</span>
                                            </a>
                                        );
                                    })}
                                    {(!selectedEnrollment.course?.resources && !selectedEnrollment.resources) && (
                                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>No resources shared yet.</div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </Modal>
            )}
        </div>
    );
}
