import { useState, useEffect } from 'react';
import { trainingAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/ui/Toast';
import Modal from '../components/ui/Modal';
import { Plus, Edit2, BookOpen, Clock, BadgeDollarSign, Trash2 } from 'lucide-react';
import DataTable from '../components/ui/DataTable';

export default function Courses() {
    const { isAdmin } = useAuth();
    const toast = useToast();
    const [courses, setCourses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editing, setEditing] = useState(null);
    const [form, setForm] = useState({ title: '', description: '', syllabus: '', duration: '', total_fee: '' });
    const [saving, setSaving] = useState(false);

    const load = async () => {
        setLoading(true);
        try {
            const { data } = await trainingAPI.getCourses();
            setCourses(data?.courses || data || []);
        } catch { } finally { setLoading(false); }
    };

    useEffect(() => { load(); }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            const payload = { 
                ...form, 
                duration: parseInt(form.duration) || 0,
                total_fee: parseFloat(form.total_fee) || 0
            };

            if (editing) {
                await trainingAPI.updateCourse(editing, payload);
                toast('Course updated successfully');
            } else {
                await trainingAPI.createCourse(payload);
                toast('Course created successfully');
            }
            setShowModal(false);
            setEditing(null);
            setForm({ title: '', description: '', syllabus: '', duration: '', total_fee: '' });
            load();
        } catch (err) {
            toast(err.response?.data?.error || 'Failed to save', 'error');
        } finally { setSaving(false); }
    };

    const handleEdit = (c) => {
        setEditing(c.id);
        setForm({
            title: c.title,
            description: c.description || '',
            syllabus: c.syllabus || '',
            duration: c.duration.toString(),
            total_fee: c.total_fee.toString()
        });
        setShowModal(true);
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Are you sure you want to delete this course? This will remove all syllabus data.')) return;
        try {
            await trainingAPI.deleteCourse(id);
            toast('Course deleted successfully');
            load();
        } catch (err) {
            toast('Failed to delete course', 'error');
        }
    };

    const columns = [
        { header: 'Title', accessor: 'title', render: r => <span style={{ fontWeight: 600 }}>{r.title}</span> },
        { header: 'Duration', accessor: 'duration', render: r => `${r.duration} Days` },
        { header: 'Fee', accessor: 'total_fee', render: r => `$${r.total_fee}` },
        { 
            header: 'Status', 
            accessor: 'is_active', 
            render: r => <span className={`badge ${r.is_active ? 'green' : 'gray'}`}>{r.is_active ? 'Active' : 'Inactive'}</span> 
        },
        {
            header: 'Actions',
            key: 'actions',
            render: (c) => (
                <div style={{ display: 'flex', gap: 6 }}>
                    <button className="btn btn-sm btn-secondary" onClick={() => handleEdit(c)} title="Edit">
                        <Edit2 size={12} />
                    </button>
                    <button className="btn btn-sm btn-danger" onClick={() => handleDelete(c.id)} title="Delete">
                        <Trash2 size={12} />
                    </button>
                </div>
            )
        }
    ];

    return (
        <div className="page-content">
            <div className="header">
                <div className="header-left">
                    <h1>Training Courses</h1>
                    <p>Develop and manage your training programs and curricula</p>
                </div>
                <div className="header-actions">
                    <button className="btn btn-primary" onClick={() => { setEditing(null); setForm({ title: '', description: '', syllabus: '', duration: '', total_fee: '' }); setShowModal(true); }}>
                        <Plus size={15} /> New Course
                    </button>
                </div>
            </div>

            <div className="stats-grid" style={{ marginBottom: 24 }}>
                <div className="stat-card">
                    <div className="stat-icon" style={{ background: 'var(--blue-100)', color: 'var(--blue-600)' }}>
                        <BookOpen size={24} />
                    </div>
                    <div className="stat-info">
                        <label>Active Courses</label>
                        <h3>{courses.filter(c => c.is_active).length}</h3>
                    </div>
                </div>
            </div>

            <div className="card">
                {loading ? <div className="spinner" /> : (
                    <DataTable
                        columns={columns}
                        data={courses}
                        pageSize={10}
                        searchable={true}
                        emptyMessage="No courses found."
                    />
                )}
            </div>

            {showModal && (
                <Modal title={editing ? "Edit Course" : "Create New Course"} onClose={() => setShowModal(false)} size="lg">
                    <form onSubmit={handleSubmit}>
                        <div className="form-grid">
                            <div className="form-group full">
                                <label>Course Title *</label>
                                <input required value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="e.g. Full Stack Web Development" />
                            </div>
                            <div className="form-group">
                                <label>Duration (Days)</label>
                                <div style={{ position: 'relative' }}>
                                    <input type="number" required value={form.duration} onChange={e => setForm({ ...form, duration: e.target.value })} style={{ paddingLeft: 35 }} />
                                    <Clock size={16} style={{ position: 'absolute', left: 10, top: 12, color: 'var(--text-muted)' }} />
                                </div>
                            </div>
                            <div className="form-group">
                                <label>Total Fee ($)</label>
                                <div style={{ position: 'relative' }}>
                                    <input type="number" required value={form.total_fee} onChange={e => setForm({ ...form, total_fee: e.target.value })} style={{ paddingLeft: 35 }} />
                                    <BadgeDollarSign size={16} style={{ position: 'absolute', left: 10, top: 12, color: 'var(--text-muted)' }} />
                                </div>
                            </div>
                            <div className="form-group full">
                                <label>Description</label>
                                <textarea rows={3} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Summary of the course..." />
                            </div>
                            <div className="form-group full">
                                <label>Syllabus (Markdown Supported)</label>
                                <textarea 
                                    rows={10} 
                                    value={form.syllabus} 
                                    onChange={e => setForm({ ...form, syllabus: e.target.value })} 
                                    style={{ fontFamily: 'monospace', fontSize: '0.9rem' }}
                                    placeholder="# Topic 1: Introductions\n## Subtopic A\n- Item 1\n- Item 2" 
                                />
                                <small style={{ color: 'var(--text-muted)', marginTop: 5, display: 'block' }}>Use GitHub Flavored Markdown for formatting the syllabus.</small>
                            </div>
                        </div>
                        <div className="form-actions" style={{ marginTop: 24 }}>
                            <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                            <button type="submit" className="btn btn-primary" disabled={saving}>
                                {saving ? 'Saving...' : editing ? 'Update Course' : 'Create Course'}
                            </button>
                        </div>
                    </form>
                </Modal>
            )}
        </div>
    );
}
