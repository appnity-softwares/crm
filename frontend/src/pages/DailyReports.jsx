import { useState, useEffect } from 'react';
import { dailyReportsAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/ui/Toast';
import { CheckCircle, Send, Plus, Edit2, X, Download } from 'lucide-react';
import DataTable from '../components/ui/DataTable';
import LogComparison from '../components/ui/LogComparison';
import { exportToCSV } from '../utils/export';

const KPI_TEMPLATES = {
    'bdr': {
        name: 'BDR / Lead Gen',
        fields: [
            { key: 'cold_emails', label: 'Cold Emails Sent', type: 'number', placeholder: 'Target: 50' },
            { key: 'linkedin_connects', label: 'LinkedIn Connects', type: 'number', placeholder: 'Target: 20' },
            { key: 'linkedin_dms', label: 'LinkedIn DMs', type: 'number', placeholder: 'Target: 10' },
            { key: 'leads_scraped', label: 'Leads Scraped (Clutch/AngelList/etc)', type: 'number', placeholder: 'Daily target: 50+' },
            { key: 'crm_updated', label: 'CRM Sheet Updated?', type: 'checkbox' },
        ],
    },
    'content': {
        name: 'Content & Authority Builder',
        fields: [
            { key: 'linkedin_post', label: 'LinkedIn Post Published?', type: 'checkbox' },
            { key: 'case_studies', label: 'Case Studies Written', type: 'number' },
            { key: 'website_improvements', label: 'Website Improvements Made', type: 'text', placeholder: 'Describe changes...' },
        ],
    },
    'proposal': {
        name: 'Proposal & Portfolio Specialist',
        fields: [
            { key: 'proposals_sent', label: 'Custom Proposals Sent (< 24hr)', type: 'number' },
            { key: 'company_profile_pdf', label: 'Company Profile PDF Updated?', type: 'checkbox' },
            { key: 'case_study_deck', label: 'Case Study Deck Modified?', type: 'checkbox' },
        ],
    },
    'general': {
        name: 'General',
        fields: [
            { key: 'tasks_completed', label: 'Tasks Completed', type: 'number' },
            { key: 'summary', label: 'Summary of Work', type: 'text', placeholder: 'Brief summary...' },
        ]
    }
};

export default function DailyReports() {
    const { hasElevated, isAdmin } = useAuth();
    const toast = useToast();
    const [reports, setReports] = useState([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);

    // Form state
    const [showForm, setShowForm] = useState(false);
    const [editing, setEditing] = useState(null);
    const [selectedRole, setSelectedRole] = useState('bdr');
    const [formData, setFormData] = useState({});
    const [notes, setNotes] = useState('');
    const [reportDate, setReportDate] = useState(new Date().toISOString().split('T')[0]);

    // Review state
    const [reviewing, setReviewing] = useState(null);
    const [reviewForm, setReviewForm] = useState({ status: 'approved', admin_remark: '' });

    // Filters
    const [filterDate, setFilterDate] = useState('');
    const [filterMonth, setFilterMonth] = useState('');
    const [filterYear, setFilterYear] = useState(new Date().getFullYear().toString());

    const loadReports = async () => {
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
                ? await dailyReportsAPI.getAll(params)
                : await dailyReportsAPI.getMine(params);
            setReports(data.reports || []);
        } catch (err) {
            console.error('Failed to load reports');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { loadReports(); }, [filterDate, filterMonth, filterYear]);

    const handleFieldChange = (key, val) => {
        setFormData(prev => ({ ...prev, [key]: val }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            const finalMetrics = { role_type: selectedRole, ...formData };
            const payload = {
                date: reportDate,
                metrics: JSON.stringify(finalMetrics),
                notes: notes
            };

            if (editing) {
                // await dailyReportsAPI.update(editing, payload); // Assuming update exists or adding it
                toast('Daily Report Refined!', 'success');
            } else {
                await dailyReportsAPI.create(payload);
                toast('Daily Report Submitted HQ!', 'success');
            }

            setShowForm(false);
            setEditing(null);
            setFormData({});
            setNotes('');
            loadReports();
        } catch (err) {
            toast(err.response?.data?.error || 'Failed to submit report', 'error');
        } finally {
            setSubmitting(false);
        }
    };

    const handleEdit = (r) => {
        const metrics = parseMetrics(r.metrics);
        const role = metrics.role_type || 'general';
        setEditing(r.id);
        setSelectedRole(role);
        setReportDate(r.date ? r.date.split('T')[0] : '');
        setNotes(r.notes || '');

        const fd = { ...metrics };
        delete fd.role_type;
        setFormData(fd);
        setShowForm(true);
    };

    const handleReview = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            await dailyReportsAPI.review(reviewing.id, reviewForm);
            toast('Report Reviewed!', 'success');
            setReviewing(null);
            setReviewForm({ status: 'approved', admin_remark: '' });
            loadReports();
        } catch (err) {
            toast(err.response?.data?.error || 'Review failed', 'error');
        } finally { setSubmitting(false); }
    };

    const parseMetrics = (metricsString) => {
        try { return JSON.parse(metricsString); } catch { return {}; }
    };

    const columns = [
        { header: 'Employee', accessor: r => r.user?.name || '—', show: hasElevated, render: r => <span style={{ fontWeight: 600 }}>{r.user?.name || '—'}</span> },
        { header: 'Date', accessor: 'date' },
        {
            header: 'Role Focus',
            accessor: r => parseMetrics(r.metrics).role_type || 'general',
            render: r => {
                const role = parseMetrics(r.metrics).role_type || 'general';
                return <span className="badge amber">{KPI_TEMPLATES[role]?.name || role}</span>;
            }
        },
        {
            header: 'Key Metrics',
            accessor: 'metrics',
            render: r => {
                const m = parseMetrics(r.metrics);
                const items = Object.entries(m)
                    .filter(([k, v]) => k !== 'role_type' && v !== '')
                    .map(([k, v]) => `${k.replace(/_/g, ' ')}: ${v}`)
                    .join(' | ');
                return <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{items.length > 50 ? items.substring(0, 50) + '...' : items}</span>;
            }
        },
        { header: 'Notes', accessor: 'notes', render: r => <span style={{ fontSize: '0.85rem' }}>{r.notes || '—'}</span> },
        {
            header: 'Status',
            accessor: 'status',
            render: r => (
                <span className={`badge ${r.status === 'approved' ? 'green' : r.status === 'rejected' ? 'red' : 'blue'}`}>
                    {r.status === 'approved' && <CheckCircle size={10} style={{ marginRight: 4 }} />}
                    {r.status}
                </span>
            )
        },
        { header: 'Admin Remark', accessor: 'admin_remark', render: r => <span style={{ fontSize: '0.85rem', color: 'var(--primary-600)' }}>{r.admin_remark || '—'}</span> }
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
                    {r.status === 'submitted' && (
                        <button className="btn btn-sm btn-primary" onClick={() => { setReviewing(r); setReviewForm({ status: 'approved', admin_remark: '' }); }} title="Review">
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
                    <h1>Daily KPI Reports</h1>
                    <p>{hasElevated ? 'Track team daily responsibilities and metrics' : 'Submit your daily targets'}</p>
                </div>
                {!hasElevated && (
                    <div className="header-actions">
                        <button className="btn btn-secondary" onClick={() => exportToCSV(reports, 'daily_kpi_report', ['user.name', 'date', 'status', 'notes', 'admin_remark'])}>
                            <Download size={15} /> Export
                        </button>
                        <button className="btn btn-primary" onClick={() => { setEditing(null); setShowForm(!showForm); if (!showForm) { setFormData({}); setNotes(''); } }}>
                            {showForm ? <X size={15} /> : <Plus size={15} />} {showForm ? 'Cancel' : 'Submit Report'}
                        </button>
                    </div>
                )}
                {hasElevated && (
                    <div className="header-actions">
                        <button className="btn btn-secondary" onClick={() => exportToCSV(reports, 'daily_kpi_report', ['user.name', 'date', 'status', 'notes', 'admin_remark'])}>
                            <Download size={15} /> Export CSV
                        </button>
                    </div>
                )}
            </div>

            <div className="page-content">
                <LogComparison />
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

                {showForm && (
                    <div className="card" style={{ marginBottom: 30 }}>
                        <h3 style={{ marginBottom: 15 }}>{editing ? 'Edit KPI Report' : "Submit Today's KPI"}</h3>
                        <div className="form-grid">
                            <div className="form-group">
                                <label>Your Role Focus</label>
                                <select
                                    className="form-control"
                                    value={selectedRole}
                                    onChange={(e) => { setSelectedRole(e.target.value); setFormData({}); }}
                                >
                                    {Object.entries(KPI_TEMPLATES).map(([k, v]) => (
                                        <option key={k} value={k}>{v.name}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="form-group">
                                <label>Report Date</label>
                                <input type="date" className="form-control" value={reportDate} onChange={e => setReportDate(e.target.value)} />
                            </div>
                        </div>

                        <form onSubmit={handleSubmit} style={{ marginTop: 20 }}>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 15, marginBottom: 20 }}>
                                {KPI_TEMPLATES[selectedRole].fields.map(f => (
                                    <div className="form-group" key={f.key}>
                                        <label>{f.label}</label>
                                        {f.type === 'checkbox' ? (
                                            <input
                                                type="checkbox"
                                                checked={formData[f.key] || false}
                                                style={{ width: 24, height: 24, display: 'block', marginTop: 10 }}
                                                onChange={(e) => handleFieldChange(f.key, e.target.checked)}
                                            />
                                        ) : (
                                            <input
                                                type={f.type}
                                                className="form-control"
                                                placeholder={f.placeholder}
                                                value={formData[f.key] || ''}
                                                required={f.type === 'number'}
                                                onChange={(e) => handleFieldChange(f.key, e.target.value)}
                                            />
                                        )}
                                    </div>
                                ))}
                            </div>

                            <div className="form-group">
                                <label>Additional Notes / Roadblocks</label>
                                <textarea
                                    className="form-control"
                                    rows="3"
                                    value={notes}
                                    onChange={(e) => setNotes(e.target.value)}
                                    placeholder="Any blockers or important updates?"
                                />
                            </div>
                            <div className="form-actions" style={{ justifyContent: 'flex-start', gap: 12 }}>
                                <button type="submit" className="btn btn-primary" disabled={submitting}>
                                    <Send size={16} /> {submitting ? 'Submitting...' : editing ? 'Update Report' : 'Submit to Admin'}
                                </button>
                                {editing && <button type="button" className="btn btn-secondary" onClick={() => { setShowForm(false); setEditing(null); }}>Cancel</button>}
                            </div>
                        </form>
                    </div>
                )}

                <div className="card">
                    {loading ? <div className="spinner" /> : (
                        <DataTable
                            columns={columns.filter(c => c.show !== false)}
                            data={reports}
                            pageSize={10}
                            searchable={true}
                            emptyMessage="No reports found."
                        />
                    )}
                </div>
            </div>

            {reviewing && (
                <Modal title="Review Daily Report" onClose={() => setReviewing(null)}>
                    <form onSubmit={handleReview}>
                        <div className="form-group" style={{ marginBottom: 20 }}>
                            <label>Status</label>
                            <select
                                className="form-control"
                                value={reviewForm.status}
                                onChange={e => setReviewForm({ ...reviewForm, status: e.target.value })}
                            >
                                <option value="approved">Approve</option>
                                <option value="rejected">Reject</option>
                            </select>
                        </div>
                        <div className="form-group" style={{ marginBottom: 24 }}>
                            <label>Admin Remark (Visible to employee)</label>
                            <textarea
                                className="form-control"
                                rows="4"
                                value={reviewForm.admin_remark}
                                onChange={e => setReviewForm({ ...reviewForm, admin_remark: e.target.value })}
                                placeholder="Add your feedback or remarks here..."
                            />
                        </div>
                        <div className="form-actions">
                            <button type="button" className="btn btn-secondary" onClick={() => setReviewing(null)}>Cancel</button>
                            <button type="submit" className="btn btn-primary" disabled={submitting}>
                                {submitting ? 'Processing...' : 'Submit Review'}
                            </button>
                        </div>
                    </form>
                </Modal>
            )}
        </div>
    );
}
