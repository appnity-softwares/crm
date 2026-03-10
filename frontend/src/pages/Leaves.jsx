import { useState, useEffect } from 'react';
import { leaveAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/ui/Toast';
import Modal from '../components/ui/Modal';
import { Calendar, Plus, CheckCircle, XCircle, Clock, Filter } from 'lucide-react';
import DataTable from '../components/ui/DataTable';

export default function Leaves() {
    const { user, hasElevated, isAdmin } = useAuth();
    const toast = useToast();
    const [leaves, setLeaves] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [filter, setFilter] = useState('');
    const [form, setForm] = useState({ leave_type: 'sick', start_date: '', end_date: '', reason: '' });
    const [saving, setSaving] = useState(false);
    const [showReview, setShowReview] = useState(null);
    const [reviewForm, setReviewForm] = useState({ status: 'approved', admin_remark: '' });

    const load = async () => {
        setLoading(true);
        try {
            const res = hasElevated
                ? await leaveAPI.getAll({ status: filter })
                : await leaveAPI.getMyLeaves();
            setLeaves(res.data.leaves || []);
        } catch { } finally { setLoading(false); }
    };

    useEffect(() => { load(); }, [filter, hasElevated]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            await leaveAPI.apply(form);
            toast('Leave application submitted!');
            setShowModal(false);
            setForm({ leave_type: 'sick', start_date: '', end_date: '', reason: '' });
            load();
        } catch (err) {
            toast(err.response?.data?.error || 'Failed to submit', 'error');
        } finally { setSaving(false); }
    };

    const handleReview = async (e) => {
        e.preventDefault();
        try {
            await leaveAPI.review(showReview.id, reviewForm);
            toast(`Leave request ${reviewForm.status}`);
            setShowReview(null);
            setReviewForm({ status: 'approved', admin_remark: '' });
            load();
        } catch { toast('Action failed', 'error'); }
    };

    const formatDate = (d) => d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

    const columns = [
        ...(hasElevated ? [{ header: 'Employee', accessor: r => r.user?.name || '—' }] : []),
        { header: 'Type', accessor: 'leave_type', render: r => <span className="badge blue">{r.leave_type.toUpperCase()}</span> },
        { header: 'From', accessor: 'start_date', render: r => formatDate(r.start_date) },
        { header: 'To', accessor: 'end_date', render: r => formatDate(r.end_date) },
        { header: 'Reason', accessor: 'reason' },
        {
            header: 'Status',
            accessor: 'status',
            render: (r) => {
                const map = { pending: 'amber', approved: 'green', rejected: 'red' };
                return <span className={`badge ${map[r.status]}`}>{r.status.toUpperCase()}</span>;
            }
        },
        {
            header: 'Actions',
            key: 'actions',
            render: (r) => (
                hasElevated && r.status === 'pending' ? (
                    <button className="btn btn-sm btn-secondary" onClick={() => setShowReview(r)}>
                        Review
                    </button>
                ) : r.admin_remark ? (
                    <span title={r.admin_remark} style={{ fontSize: '0.75rem', color: 'var(--text-muted)', cursor: 'help' }}>Remark...</span>
                ) : '—'
            )
        }
    ];

    return (
        <div>
            <div className="header">
                <div className="header-left">
                    <h1>Leave Management</h1>
                    <p>{hasElevated ? "Manage and review employee leave requests" : "Apply for leave and track your requests"}</p>
                </div>
                <div className="header-actions">
                    {hasElevated && (
                        <div style={{ marginRight: 15 }}>
                            <select
                                className="btn btn-secondary"
                                value={filter}
                                onChange={e => setFilter(e.target.value)}
                                style={{ padding: '8px 12px' }}
                            >
                                <option value="">All Status</option>
                                <option value="pending">Pending</option>
                                <option value="approved">Approved</option>
                                <option value="rejected">Rejected</option>
                            </select>
                        </div>
                    )}
                    <button className="btn btn-primary" onClick={() => setShowModal(true)}>
                        <Plus size={15} /> Apply Leave
                    </button>
                </div>
            </div>

            <div className="page-content">
                <div className="card">
                    {loading ? <div className="spinner" /> : (
                        <DataTable
                            columns={columns}
                            data={leaves}
                            pageSize={10}
                            searchable={true}
                            emptyMessage="No leave records found."
                        />
                    )}
                </div>
            </div>

            {showModal && (
                <Modal title="Apply for Leave" onClose={() => setShowModal(false)}>
                    <form onSubmit={handleSubmit}>
                        <div className="form-grid">
                            <div className="form-group">
                                <label>Leave Type</label>
                                <select value={form.leave_type} onChange={e => setForm({ ...form, leave_type: e.target.value })}>
                                    <option value="sick">Sick Leave</option>
                                    <option value="casual">Casual Leave</option>
                                    <option value="paid">Paid Leave</option>
                                    <option value="other">Other</option>
                                </select>
                            </div>
                            <div className="form-group">
                                <label>Start Date</label>
                                <input type="date" required value={form.start_date} onChange={e => setForm({ ...form, start_date: e.target.value })} />
                            </div>
                            <div className="form-group">
                                <label>End Date</label>
                                <input type="date" required value={form.end_date} onChange={e => setForm({ ...form, end_date: e.target.value })} />
                            </div>
                            <div className="form-group full">
                                <label>Reason/Details</label>
                                <textarea required rows={3} value={form.reason} onChange={e => setForm({ ...form, reason: e.target.value })} />
                            </div>
                        </div>
                        <div className="form-actions">
                            <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                            <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Submitting...' : 'Submit Application'}</button>
                        </div>
                    </form>
                </Modal>
            )}

            {showReview && (
                <Modal title="Review Leave Request" onClose={() => setShowReview(null)}>
                    <form onSubmit={handleReview}>
                        <div style={{ marginBottom: 20 }}>
                            <p><strong>Employee:</strong> {showReview.user?.name}</p>
                            <p><strong>Type:</strong> {showReview.leave_type.toUpperCase()}</p>
                            <p><strong>Duration:</strong> {formatDate(showReview.start_date)} to {formatDate(showReview.end_date)}</p>
                            <p><strong>Reason:</strong> {showReview.reason}</p>
                        </div>
                        <div className="form-grid">
                            <div className="form-group">
                                <label>Action</label>
                                <select value={reviewForm.status} onChange={e => setReviewForm({ ...reviewForm, status: e.target.value })}>
                                    <option value="approved">Approve</option>
                                    <option value="rejected">Reject</option>
                                </select>
                            </div>
                            <div className="form-group full">
                                <label>Admin Remark</label>
                                <textarea rows={2} value={reviewForm.admin_remark} onChange={e => setReviewForm({ ...reviewForm, admin_remark: e.target.value })} placeholder="Optional remark for the employee..." />
                            </div>
                        </div>
                        <div className="form-actions" style={{ marginTop: 20 }}>
                            <button type="button" className="btn btn-secondary" onClick={() => setShowReview(null)}>Cancel</button>
                            <button type="submit" className="btn btn-primary">Submit Review</button>
                        </div>
                    </form>
                </Modal>
            )}
        </div>
    );
}
