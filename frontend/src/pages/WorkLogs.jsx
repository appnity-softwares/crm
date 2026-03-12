import { useState, useEffect } from 'react';
import { worklogAPI, projectAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/ui/Toast';
import Modal from '../components/ui/Modal';
import { FileText, Plus, Edit2, Trash2 } from 'lucide-react';
import DataTable from '../components/ui/DataTable';
import LogComparison from '../components/ui/LogComparison';

export default function WorkLogs() {
    const { hasElevated, isAdmin } = useAuth();
    const toast = useToast();
    const [logs, setLogs] = useState([]);
    const [projects, setProjects] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editing, setEditing] = useState(null);
    const [form, setForm] = useState({ project_id: '', date: new Date().toISOString().split('T')[0], hours: '', description: '' });
    const [saving, setSaving] = useState(false);

    const load = async () => {
        setLoading(true);
        try {
            const [logRes, projRes] = await Promise.all([
                hasElevated ? worklogAPI.getAll() : worklogAPI.getMine(),
                projectAPI.getAll(),
            ]);
            setLogs(logRes.data.work_logs || []);
            setProjects(projRes.data.projects || []);
        } catch { } finally { setLoading(false); }
    };

    useEffect(() => { load(); }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            const payload = { ...form, hours: parseFloat(form.hours) };
            if (!payload.project_id) delete payload.project_id;

            if (editing) {
                await worklogAPI.update(editing, payload);
                toast('Work log updated');
            } else {
                await worklogAPI.create(payload);
                toast('Work log created');
            }
            setShowModal(false);
            setEditing(null);
            setForm({ project_id: '', date: new Date().toISOString().split('T')[0], hours: '', description: '' });
            load();
        } catch (err) {
            toast(err.response?.data?.error || 'Failed to save', 'error');
        } finally { setSaving(false); }
    };

    const handleEdit = (l) => {
        setEditing(l.id);
        setForm({
            project_id: l.project_id || '',
            date: l.date ? l.date.split('T')[0] : '',
            hours: l.hours.toString(),
            description: l.description
        });
        setShowModal(true);
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Delete this work log?')) return;
        try {
            await worklogAPI.remove(id);
            toast('Work log deleted');
            load();
        } catch { toast('Failed to delete', 'error'); }
    };

    const formatDate = (d) => new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

    const columns = [
        { header: 'Employee', accessor: r => r.user?.name || '—', show: hasElevated, render: r => <span style={{ fontWeight: 600 }}>{r.user?.name || '—'}</span> },
        { header: 'Date', accessor: 'date', render: r => formatDate(r.date) },
        { header: 'Project', accessor: r => r.project?.name || 'General Task', render: r => <span className="badge gray">{r.project?.name || 'General Task'}</span> },
        { header: 'Hours', accessor: 'hours', render: r => <span className="badge blue">{r.hours}h</span> },
        { header: 'Description', accessor: 'description', render: r => <div style={{ maxWidth: 300, whiteSpace: 'normal', fontSize: '0.85rem' }}>{r.description}</div> }
    ];

    columns.push({
        header: 'Actions',
        key: 'actions',
        render: (l) => (
            <div style={{ display: 'flex', gap: 6 }}>
                <button className="btn btn-sm btn-secondary" onClick={() => handleEdit(l)}>
                    <Edit2 size={12} />
                </button>
                {isAdmin && (
                    <button className="btn btn-sm btn-danger" onClick={() => handleDelete(l.id)}>
                        <Trash2 size={12} />
                    </button>
                )}
            </div>
        )
    });

    return (
        <div>
            <div className="header">
                <div className="header-left">
                    <h1>Work Logs</h1>
                    <p>{hasElevated ? 'All team work logs' : 'Your daily work logs'}</p>
                </div>
                <div className="header-actions">
                    <button className="btn btn-primary" onClick={() => { setEditing(null); setForm({ project_id: '', date: new Date().toISOString().split('T')[0], hours: '', description: '' }); setShowModal(true); }}>
                        <Plus size={15} /> Log Work
                    </button>
                </div>
            </div>

            <div className="page-content">
                <LogComparison />
                <div className="card">
                    {loading ? <div className="spinner" /> : (
                        <DataTable
                            columns={columns.filter(c => c.show !== false)}
                            data={logs}
                            pageSize={10}
                            searchable={true}
                            emptyMessage="No work logs found."
                        />
                    )}
                </div>
            </div>

            {showModal && (
                <Modal title={editing ? "Edit Work Log" : "Log Daily Work"} onClose={() => setShowModal(false)}>
                    <form onSubmit={handleSubmit}>
                        <div className="form-grid">
                            <div className="form-group">
                                <label>Date *</label>
                                <input type="date" required value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} />
                            </div>
                            <div className="form-group">
                                <label>Hours *</label>
                                <input type="number" step="0.5" min="0.5" max="24" required value={form.hours} onChange={e => setForm({ ...form, hours: e.target.value })} />
                            </div>
                            <div className="form-group full">
                                <label>Project</label>
                                <select value={form.project_id} onChange={e => setForm({ ...form, project_id: e.target.value })}>
                                    <option value="">— No Project —</option>
                                    {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                </select>
                            </div>
                            <div className="form-group full">
                                <label>Description *</label>
                                <textarea required value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="What did you work on today?" />
                            </div>
                        </div>
                        <div className="form-actions">
                            <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                            <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Saving...' : editing ? 'Update Log' : 'Save Log'}</button>
                        </div>
                    </form>
                </Modal>
            )}
        </div>
    );
}
