import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { jobsAPI } from '../services/api';
import { useToast } from '../components/ui/Toast';
import { Briefcase, MapPin, Building2, Calendar, DollarSign, Plus, Trash2, Search, Filter } from 'lucide-react';
import Modal from '../components/ui/Modal';
import DataTable from '../components/ui/DataTable';

export default function JobBoard() {
    const { canAccess, user } = useAuth();
    const { toast } = useToast();
    const [jobs, setJobs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [saving, setSaving] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');

    const [form, setForm] = useState({
        title: '',
        company: '',
        description: '',
        location: '',
        salary: '',
        type: 'full-time',
        deadline: ''
    });

    const loadJobs = async () => {
        setLoading(true);
        try {
            const { data } = await jobsAPI.get();
            setJobs(data);
        } catch (err) {
            toast('Failed to load jobs', 'error');
        } finally { setLoading(false); }
    };

    useEffect(() => { loadJobs(); }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            await jobsAPI.create(form);
            toast('Job posted successfully');
            setShowModal(false);
            loadJobs();
        } catch (err) {
            toast('Failed to post job', 'error');
        } finally { setSaving(false); }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Are you sure you want to delete this job posting?')) return;
        try {
            await jobsAPI.delete(id);
            toast('Job deleted');
            loadJobs();
        } catch (err) {
            toast('Failed to delete job', 'error');
        }
    };

    const filteredJobs = jobs.filter(j => 
        j.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        j.company.toLowerCase().includes(searchTerm.toLowerCase()) ||
        j.location.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const isAdmin = canAccess('employees');

    return (
        <div className="page-content">
            <div className="header">
                <div className="header-left">
                    <h1>Job Board</h1>
                    <p>Opportunities for our alumni and trainees</p>
                </div>
                {isAdmin && (
                    <div className="header-actions">
                        <button className="btn btn-primary" onClick={() => setShowModal(true)}>
                            <Plus size={16} /> Post New Job
                        </button>
                    </div>
                )}
            </div>

            <div className="card" style={{ marginBottom: 24, padding: '16px 20px' }}>
                <div style={{ display: 'flex', gap: 12 }}>
                    <div className="search-input" style={{ flex: 1, position: 'relative' }}>
                        <Search size={18} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                        <input 
                            type="text" 
                            placeholder="Search by role, company or location..." 
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            style={{ width: '100%', paddingLeft: 40 }}
                        />
                    </div>
                    <button className="btn btn-secondary">
                        <Filter size={16} /> Filter
                    </button>
                </div>
            </div>

            {loading ? <div className="spinner" /> : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: 20 }}>
                    {filteredJobs.map(job => (
                        <div key={job.id} className="card job-card" style={{ transition: 'all 0.3s ease', position: 'relative' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                                <div>
                                    <h3 style={{ margin: 0, color: 'var(--primary-600)' }}>{job.title}</h3>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: 4 }}>
                                        <Building2 size={14} /> {job.company}
                                    </div>
                                </div>
                                <span className={`badge ${job.type === 'full-time' ? 'blue' : job.type === 'part-time' ? 'amber' : 'green'}`}>
                                    {job.type}
                                </span>
                            </div>

                            <p style={{ fontSize: '0.9rem', color: 'var(--text-main)', marginBottom: 16 }}>{job.description}</p>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                    <MapPin size={14} /> {job.location}
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                    <DollarSign size={14} /> {job.salary}
                                </div>
                                {job.deadline && (
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                        <Calendar size={14} /> Closes: {new Date(job.deadline).toLocaleDateString()}
                                    </div>
                                )}
                            </div>

                            <div style={{ marginTop: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <button className="btn btn-primary btn-sm">Apply Now</button>
                                {isAdmin && (
                                    <button className="btn btn-text btn-sm" style={{ color: 'var(--danger)' }} onClick={() => handleDelete(job.id)}>
                                        <Trash2 size={14} />
                                    </button>
                                )}
                            </div>
                        </div>
                    ))}
                    {filteredJobs.length === 0 && (
                        <div className="full-width" style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>
                            No job opportunities match your search.
                        </div>
                    )}
                </div>
            )}

            {showModal && (
                <Modal title="Post New Opportunity" onClose={() => setShowModal(false)} size="lg">
                    <form onSubmit={handleSubmit}>
                        <div className="form-grid">
                            <div className="form-group">
                                <label>Job Title *</label>
                                <input type="text" required value={form.title} onChange={e => setForm({...form, title: e.target.value})} placeholder="e.g. Senior Frontend Developer" />
                            </div>
                            <div className="form-group">
                                <label>Company Name *</label>
                                <input type="text" required value={form.company} onChange={e => setForm({...form, company: e.target.value})} placeholder="e.g. Appnity Softwares" />
                            </div>
                            <div className="form-group">
                                <label>Job Type</label>
                                <select value={form.type} onChange={e => setForm({...form, type: e.target.value})}>
                                    <option value="full-time">Full Time</option>
                                    <option value="part-time">Part Time</option>
                                    <option value="internship">Internship</option>
                                    <option value="contract">Contract</option>
                                </select>
                            </div>
                            <div className="form-group">
                                <label>Location</label>
                                <input type="text" value={form.location} onChange={e => setForm({...form, location: e.target.value})} placeholder="e.g. Remote or City" />
                            </div>
                            <div className="form-group">
                                <label>Salary / Range</label>
                                <input type="text" value={form.salary} onChange={e => setForm({...form, salary: e.target.value})} placeholder="e.g. $60k - $80k or Negotiable" />
                            </div>
                            <div className="form-group">
                                <label>Application Deadline</label>
                                <input type="date" value={form.deadline} onChange={e => setForm({...form, deadline: e.target.value})} />
                            </div>
                            <div className="form-group full">
                                <label>Job Description *</label>
                                <textarea required value={form.description} onChange={e => setForm({...form, description: e.target.value})} rows={5} placeholder="Briefly describe the role and requirements..."></textarea>
                            </div>
                        </div>
                        <div className="form-actions" style={{ marginTop: 20 }}>
                            <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                            <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Posting...' : 'Post Job'}</button>
                        </div>
                    </form>
                </Modal>
            )}
        </div>
    );
}
