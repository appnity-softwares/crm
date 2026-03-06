import { useState, useEffect } from 'react';
import { projectAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/ui/Toast';
import Modal from '../components/ui/Modal';
import { FolderKanban, Plus, Edit2 } from 'lucide-react';

import DataTable from '../components/ui/DataTable';

export default function Projects() {
    const { hasElevated } = useAuth();
    const toast = useToast();
    const [projects, setProjects] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editing, setEditing] = useState(null);
    const [form, setForm] = useState({ name: '', description: '', status: 'planning', start_date: '', end_date: '' });
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
            setForm({ name: '', description: '', status: 'planning', start_date: '', end_date: '' });
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
            end_date: p.end_date ? p.end_date.split('T')[0] : ''
        });
        setShowModal(true);
    };

    const currency = (n) => `₹${Number(n).toLocaleString('en-IN')}`;
    const formatDate = (d) => d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

    const columns = [
        { header: 'Project Name', accessor: 'name', render: r => <span style={{ fontWeight: 600 }}>{r.name}</span> },
        {
            header: 'Status',
            accessor: 'status',
            render: (r) => {
                const map = { planning: 'blue', active: 'green', on_hold: 'amber', completed: 'purple' };
                return <span className={`badge ${map[r.status] || 'gray'}`}>{r.status?.replace('_', ' ')}</span>;
            }
        },
        { header: 'Start Date', accessor: 'start_date', render: r => formatDate(r.start_date) },
        { header: 'End Date', accessor: 'end_date', render: r => formatDate(r.end_date) },
        {
            header: 'Members',
            accessor: r => r.assignments?.filter(a => !a.removed_at).length || 0,
            render: r => <span className="badge blue">{r.assignments?.filter(a => !a.removed_at).length || 0} members</span>
        },
        { header: 'Created By', accessor: r => r.creator?.name || '—' }
    ];

    if (hasElevated) {
        columns.push({
            header: 'Actions',
            key: 'actions',
            render: (p) => (
                <button className="btn btn-sm btn-secondary" onClick={() => handleEdit(p)}>
                    <Edit2 size={12} /> Edit
                </button>
            )
        });
    }

    return (
        <div>
            <div className="header">
                <div className="header-left">
                    <h1>Projects</h1>
                    <p>Manage all professional projects and client assignments</p>
                </div>
                {hasElevated && (
                    <div className="header-actions">
                        <button className="btn btn-primary" onClick={() => { setEditing(null); setForm({ name: '', description: '', status: 'planning', start_date: '', end_date: '' }); setShowModal(true); }}>
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
                                <input required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
                            </div>
                            <div className="form-group full">
                                <label>Description</label>
                                <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
                            </div>
                            <div className="form-group">
                                <label>Status</label>
                                <select value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}>
                                    <option value="planning">Planning</option>
                                    <option value="active">Active</option>
                                    <option value="on_hold">On Hold</option>
                                    <option value="completed">Completed</option>
                                </select>
                            </div>
                            <div className="form-group">
                                <label>Start Date *</label>
                                <input type="date" required value={form.start_date} onChange={e => setForm({ ...form, start_date: e.target.value })} />
                            </div>
                            <div className="form-group">
                                <label>End Date</label>
                                <input type="date" value={form.end_date} onChange={e => setForm({ ...form, end_date: e.target.value })} />
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
