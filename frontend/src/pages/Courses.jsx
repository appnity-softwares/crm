import { useState, useEffect } from 'react';
import { trainingAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/ui/Toast';
import Modal from '../components/ui/Modal';
import { Plus, Edit2, BookOpen, Clock, Trash2, Eye, IndianRupee, Layers, Users } from 'lucide-react';
import DataTable from '../components/ui/DataTable';
import { Link } from 'react-router-dom';

export default function Courses() {
    const { isAdmin } = useAuth();
    const toast = useToast();
    const [courses, setCourses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editing, setEditing] = useState(null);
    const [form, setForm] = useState({ title: '', description: '', syllabus: '', duration: '', total_fee: '', modules: '', resources: '' });
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
            setEditing(null);
            setForm({ title: '', description: '', syllabus: '', duration: '', total_fee: '', modules: '', resources: '' });
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
            total_fee: c.total_fee.toString(),
            modules: c.modules || '',
            resources: c.resources || ''
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
        { 
            header: 'Curriculum Title', 
            accessor: 'title', 
            render: r => (
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ width: 36, height: 36, borderRadius: 8, background: 'var(--primary-100)', color: 'var(--primary-700)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <BookOpen size={18} />
                    </div>
                    <div>
                        <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{r.title}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{r.description?.slice(0, 40)}...</div>
                    </div>
                </div>
            )
        },
        { header: 'Duration', accessor: 'duration', render: r => <span className="badge gray"><Clock size={12} style={{marginRight: 4}} /> {r.duration} Days</span> },
        { header: 'Course Fee', accessor: 'total_fee', render: r => <span style={{ fontWeight: 700, color: 'var(--green-600)' }}>₹{r.total_fee?.toLocaleString()}</span> },
        { 
            header: 'Status', 
            accessor: 'is_active', 
            render: r => <span className={`badge ${r.is_active ? 'green' : 'gray'}`}>{r.is_active ? 'Published' : 'Draft'}</span> 
        },
        {
            header: 'Action Hub',
            key: 'actions',
            render: (c) => (
                <div style={{ display: 'flex', gap: 8 }}>
                    <Link className="btn btn-sm" style={{ background: 'var(--bg-app)', border: '1px solid var(--border)' }} to={`/training/courses/${c.id}`} title="Preview Syllabus">
                        <Eye size={14} />
                    </Link>
                    <button className="btn btn-sm btn-secondary" onClick={() => handleEdit(c)} title="Edit Curriculum">
                        <Edit2 size={14} />
                    </button>
                    {isAdmin && (
                        <button className="btn btn-sm btn-danger" onClick={() => handleDelete(c.id)} title="Remove">
                            <Trash2 size={14} />
                        </button>
                    )}
                </div>
            )
        }
    ];

    return (
        <div className="page-content">
            <div className="header" style={{ marginBottom: 32 }}>
                <div className="header-left">
                    <h1>Training <span className="text-primary">Academy</span></h1>
                    <p>Design, manage and distribute professional training programs.</p>
                </div>
                <div className="header-actions">
                    <button className="btn btn-primary" style={{ padding: '10px 24px', fontWeight: 700 }} onClick={() => { setEditing(null); setForm({ title: '', description: '', syllabus: '', duration: '', total_fee: '', modules: '', resources: '' }); setShowModal(true); }}>
                        <Plus size={18} style={{marginRight: 8}} /> Build New Course
                    </button>
                </div>
            </div>

            <div className="stats-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20, marginBottom: 32 }}>
                <div className="stat-card modern" style={{ padding: 24, background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 20 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                            <div style={{ fontSize: '0.8rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 4 }}>Published Programs</div>
                            <div style={{ fontSize: '1.75rem', fontWeight: 900 }}>{courses.filter(c => c.is_active).length}</div>
                        </div>
                        <div style={{ width: 48, height: 48, background: 'var(--primary-100)', color: 'var(--primary-600)', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <Layers size={24} />
                        </div>
                    </div>
                </div>
                <div className="stat-card modern" style={{ padding: 24, background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 20 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                            <div style={{ fontSize: '0.8rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 4 }}>Total Curricula</div>
                            <div style={{ fontSize: '1.75rem', fontWeight: 900 }}>{courses.length}</div>
                        </div>
                        <div style={{ width: 48, height: 48, background: 'var(--amber-100)', color: 'var(--amber-600)', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <BookOpen size={24} />
                        </div>
                    </div>
                </div>
                <div className="stat-card modern" style={{ padding: 24, background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 20 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                            <div style={{ fontSize: '0.8rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 4 }}>Avg. Duration</div>
                            <div style={{ fontSize: '1.75rem', fontWeight: 900 }}>
                                {courses.length ? Math.floor(courses.reduce((acc, curr) => acc + curr.duration, 0) / courses.length) : 0} Days
                            </div>
                        </div>
                        <div style={{ width: 48, height: 48, background: 'var(--green-100)', color: 'var(--green-600)', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <Clock size={24} />
                        </div>
                    </div>
                </div>
            </div>

            <div className="card" style={{ padding: 0, borderRadius: 20, overflow: 'hidden' }}>
                <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h3 style={{ fontSize: '1rem', fontWeight: 800 }}>Course Repository</h3>
                </div>
                {loading ? <div className="spinner" /> : (
                    <DataTable
                        columns={columns}
                        data={courses}
                        pageSize={10}
                        searchable={true}
                        emptyMessage="No training courses have been created yet."
                    />
                )}
            </div>

            {showModal && (
                <Modal title={editing ? "Update Curriculum" : "Architect New Program"} onClose={() => setShowModal(false)} size="lg">
                    <form onSubmit={handleSubmit}>
                        <div className="form-grid">
                            <div className="form-group full">
                                <label style={{ fontWeight: 700, fontSize: '0.85rem' }}>Course Architecture Title *</label>
                                <input required value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="e.g. Advanced Full Stack Engineering v3" style={{ padding: '12px 16px', borderRadius: 12 }} />
                            </div>
                            <div className="form-group">
                                <label style={{ fontWeight: 700, fontSize: '0.85rem' }}>Duration Estimate (Days)</label>
                                <div style={{ position: 'relative' }}>
                                    <input type="number" required value={form.duration} onChange={e => setForm({ ...form, duration: e.target.value })} style={{ padding: '12px 16px 12px 40px', borderRadius: 12 }} />
                                    <Clock size={16} style={{ position: 'absolute', left: 14, top: 15, color: 'var(--text-muted)' }} />
                                </div>
                            </div>
                            <div className="form-group">
                                <label style={{ fontWeight: 700, fontSize: '0.85rem' }}>Total Program Fee (₹)</label>
                                <div style={{ position: 'relative' }}>
                                    <input type="number" required value={form.total_fee} onChange={e => setForm({ ...form, total_fee: e.target.value })} style={{ padding: '12px 16px 12px 40px', borderRadius: 12 }} />
                                    <IndianRupee size={16} style={{ position: 'absolute', left: 14, top: 15, color: 'var(--text-muted)' }} />
                                </div>
                            </div>
                            <div className="form-group full">
                                <label style={{ fontWeight: 700, fontSize: '0.85rem' }}>Core Objective / Description</label>
                                <textarea rows={2} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="What will the students achieve?..." style={{ padding: '12px 16px', borderRadius: 12 }} />
                            </div>
                            <div className="form-group full">
                                <label style={{ fontWeight: 700, fontSize: '0.85rem' }}>Core Modules (Checklist) *</label>
                                <input required value={form.modules} onChange={e => setForm({ ...form, modules: e.target.value })} placeholder="e.g. Introduction, Database Design, React Basics, Deployment (Comma separated)" style={{ padding: '12px 16px', borderRadius: 12 }} />
                                <small style={{ color: 'var(--text-muted)' }}>These will form the progress checklist for students.</small>
                            </div>
                            <div className="form-group full">
                                <label style={{ fontWeight: 700, fontSize: '0.85rem' }}>Global Course Resources (Comma separated links)</label>
                                <textarea rows={2} value={form.resources} onChange={e => setForm({ ...form, resources: e.target.value })} placeholder="e.g. documentation:https://docs.link, textbook:https://drive.link" style={{ padding: '12px 16px', borderRadius: 12 }} />
                                <small style={{ color: 'var(--text-muted)' }}>These resources will be visible to ALL students enrolled in this course.</small>
                            </div>
                            <div className="form-group full">
                                <label style={{ fontWeight: 700, fontSize: '0.85rem' }}>Detailed Syllabus Configuration (Markdown Enabled)</label>
                                <textarea 
                                    rows={12} 
                                    value={form.syllabus} 
                                    onChange={e => setForm({ ...form, syllabus: e.target.value })} 
                                    style={{ fontFamily: 'monospace', fontSize: '0.9rem', padding: '16px', borderRadius: 12 }}
                                    placeholder="# Module 1: Core Fundamentals\n## Topic A\n- Requirement 1\n- Requirement 2" 
                                />
                                <small style={{ color: 'var(--text-muted)', marginTop: 8, display: 'block' }}>Architect your curriculum using Markdown for professional formatting.</small>
                            </div>
                        </div>
                        <div className="form-actions" style={{ marginTop: 32, paddingTop: 24, borderTop: '1px solid var(--border)' }}>
                            <button type="button" className="btn btn-secondary" style={{ padding: '10px 24px' }} onClick={() => setShowModal(false)}>Discard</button>
                            <button type="submit" className="btn btn-primary" style={{ padding: '10px 32px', fontWeight: 700 }} disabled={saving}>
                                {saving ? 'Architecting...' : editing ? 'Optimize Curriculum' : 'Initialize Program'}
                            </button>
                        </div>
                    </form>
                </Modal>
            )}
        </div>
    );
}
