import { useState, useEffect } from 'react';
import { projectAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/ui/Toast';
import Modal from '../components/ui/Modal';
import { Plus, Edit2, Copy, ExternalLink, LayoutGrid } from 'lucide-react';
import DataTable from '../components/ui/DataTable';
import { useNavigate } from 'react-router-dom';

export default function Projects() {
    const { user, hasElevated } = useAuth();
    const navigate = useNavigate();
    const toast = useToast();
    const [projects, setProjects] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editing, setEditing] = useState(null);
    const [form, setForm] = useState({ name: '', description: '', status: 'planning', start_date: '', end_date: '', progress: 0 });
    const [saving, setSaving] = useState(false);

    const load = async () => {
        setLoading(true);
        try {
            const { data } = await projectAPI.getAll();
            setProjects(data.projects || []);
        } catch { } finally { setLoading(false); }
    };

    useEffect(() => { load(); }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            if (editing) {
                await projectAPI.update(editing, form);
                toast('Project updated successfully');
            } else {
                await projectAPI.create(form);
                toast('Project created successfully');
            }
            setShowModal(false);
            setEditing(null);
            setForm({ name: '', description: '', status: 'planning', start_date: '', end_date: '', progress: 0 });
            load();
        } catch (err) {
            toast(err.response?.data?.error || 'Failed to save', 'error');
        } finally { setSaving(false); }
    };

    const handleEdit = (p) => {
        setEditing(p.id);
        setForm({
            name: p.name,
            description: p.description || '',
            status: p.status,
            start_date: p.start_date ? p.start_date.split('T')[0] : '',
            end_date: p.end_date ? p.end_date.split('T')[0] : '',
            progress: p.progress || 0
        });
        setShowModal(true);
    };

    const handleApprove = async (id, action) => {
        try {
            await projectAPI.approveUpdate(id, { action });
            toast(`Progress update ${action}d`);
            load();
        } catch { toast('Approval failed', 'error'); }
    };

    const copyPortalLink = (token) => {
        const link = `${window.location.origin}/portal/${token}`;
        navigator.clipboard.writeText(link);
        toast('Portal link copied!');
    };

    const formatDate = (d) => d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

    const columns = [
        {
            header: 'Project Name',
            accessor: 'name',
            render: r => (
                <div style={{ cursor: 'pointer', color: 'var(--primary-600)', fontWeight: 600 }} onClick={() => navigate(`/projects/${r.id}`)}>
                    {r.name}
                </div>
            )
        },
        { header: 'Client', accessor: 'client_name' },
        {
            header: 'Status',
            accessor: 'status',
            render: (r) => {
                const map = { planning: 'blue', active: 'green', on_hold: 'amber', completed: 'purple' };
                return <span className={`badge ${map[r.status] || 'gray'}`}>{r.status?.replace('_', ' ')}</span>;
            }
        },
        {
            header: 'Progress',
            accessor: 'progress',
            render: r => (
                <div style={{ width: 100 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                        <div style={{ fontSize: '0.75rem', fontWeight: 700 }}>{r.progress || 0}%</div>
                        {r.pending_progress !== null && (
                            <div style={{ fontSize: '0.65rem', color: 'var(--amber-600)', fontWeight: 800 }}>({r.pending_progress}% Pending)</div>
                        )}
                    </div>
                    <div style={{ height: 6, background: 'var(--bg-hover)', borderRadius: 3, overflow: 'hidden' }}>
                        <div style={{ width: `${r.progress || 0}%`, height: '100%', background: 'var(--primary-500)' }} />
                    </div>
                </div>
            )
        },
        { header: 'Start Date', accessor: 'start_date', render: r => formatDate(r.start_date) },
        { header: 'End Date', accessor: 'end_date', render: r => formatDate(r.end_date) },
        {
            header: 'Members',
            accessor: r => r.assignments?.filter(a => !a.removed_at).length || 0,
            render: r => <span className="badge blue">{r.assignments?.filter(a => !a.removed_at).length || 0} members</span>
        },
        { header: 'Created By', accessor: r => r.creator?.name || '—' },
        {
            header: 'Actions',
            key: 'actions',
            render: (p) => {
                const isAssigned = p.assignments?.some(a => a.user_id === user?.id && !a.removed_at);
                const canEdit = hasElevated || isAssigned;

                if (!canEdit) return null;

                return (
                    <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                        {hasElevated && p.pending_progress !== null && (
                            <div style={{ display: 'flex', gap: 4, background: 'var(--amber-50)', padding: 4, borderRadius: 6, border: '1px solid var(--amber-200)' }}>
                                <span style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--amber-700)' }}>Pending: {p.pending_progress}%</span>
                                <button className="btn btn-sm" style={{ padding: '2px 6px', fontSize: '0.65rem', background: 'var(--green-500)', color: 'white' }} onClick={() => handleApprove(p.id, 'approve')}>Approve</button>
                                <button className="btn btn-sm" style={{ padding: '2px 6px', fontSize: '0.65rem', background: 'var(--red-500)', color: 'white' }} onClick={() => handleApprove(p.id, 'reject')}>Reject</button>
                            </div>
                        )}
                        <button className="btn btn-sm btn-secondary" onClick={() => navigate(`/projects/${p.id}`)} title="View Kanban">
                            <LayoutGrid size={12} />
                        </button>
                        {hasElevated && (
                            <button className="btn btn-sm btn-secondary" onClick={() => copyPortalLink(p.client_portal_token)} title="Portal Link">
                                <Copy size={12} />
                            </button>
                        )}
                        <button className="btn btn-sm btn-secondary" onClick={() => handleEdit(p)}>
                            <Edit2 size={12} />
                        </button>
                    </div>
                );
            }
        }
    ];

    return (
        <div>
            <div className="header">
                <div className="header-left">
                    <h1>Projects</h1>
                    <p>Manage all professional projects and client assignments</p>
                </div>
                {hasElevated && (
                    <div className="header-actions">
                        <button className="btn btn-primary" onClick={() => { setEditing(null); setForm({ name: '', description: '', status: 'planning', start_date: '', end_date: '', progress: 0 }); setShowModal(true); }}>
                            <Plus size={15} /> New Project
                        </button>
                    </div>
                )}
            </div>

            <div className="page-content">
                <div className="card">
                    {loading ? <div className="spinner" /> : (
                        <DataTable
                            columns={columns}
                            data={projects}
                            pageSize={10}
                            searchable={true}
                            emptyMessage="No projects found."
                        />
                    )}
                </div>
            </div>

            {showModal && (
                <Modal title={editing ? "Edit Project" : "Create New Project"} onClose={() => setShowModal(false)}>
                    <form onSubmit={handleSubmit}>
                        <div className="form-grid">
                            <div className="form-group full">
                                <label>Project Name *</label>
                                <input required disabled={!hasElevated} value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
                            </div>
                            <div className="form-group full">
                                <label>Description</label>
                                <textarea disabled={!hasElevated} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
                            </div>
                            <div className="form-group">
                                <label>Status</label>
                                <select disabled={!hasElevated} value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}>
                                    <option value="planning">Planning</option>
                                    <option value="active">Active</option>
                                    <option value="on_hold">On Hold</option>
                                    <option value="completed">Completed</option>
                                </select>
                            </div>
                            <div className="form-group">
                                <label>Start Date *</label>
                                <input type="date" required disabled={!hasElevated} value={form.start_date} onChange={e => setForm({ ...form, start_date: e.target.value })} />
                            </div>
                            <div className="form-group">
                                <label>End Date</label>
                                <input type="date" disabled={!hasElevated} value={form.end_date} onChange={e => setForm({ ...form, end_date: e.target.value })} />
                            </div>
                            <div className="form-group">
                                <label>Progress ({form.progress}%)</label>
                                <input type="range" min="0" max="100" value={form.progress} onChange={e => setForm({ ...form, progress: parseInt(e.target.value) })} style={{ width: '100%' }} />
                            </div>
                        </div>
                        <div className="form-actions">
                            <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                            <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Saving...' : editing ? 'Update Project' : 'Create Project'}</button>
                        </div>
                    </form>
                </Modal>
            )}
        </div>
    );
}
