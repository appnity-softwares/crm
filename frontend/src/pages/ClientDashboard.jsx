import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { projectAPI } from '../services/api';
import { LayoutDashboard, ExternalLink, Activity } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function ClientDashboard() {
    const { user } = useAuth();
    const [projects, setProjects] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const load = async () => {
            try {
                const res = await projectAPI.getAll();
                setProjects(res.data.projects || []);
            } catch (err) { }
            finally { setLoading(false); }
        };
        load();
    }, []);

    if (loading) return <div className="spinner" />;

    return (
        <div className="page-content" style={{ padding: '40px 20px', maxWidth: 1000, margin: '0 auto' }}>
            <div className="header" style={{ marginBottom: 30, display: 'flex', alignItems: 'center', gap: 15 }}>
                <div style={{ padding: 15, background: 'var(--primary-100)', borderRadius: 12, color: 'var(--primary-600)' }}>
                    <LayoutDashboard size={32} />
                </div>
                <div>
                    <h1 style={{ fontSize: '2rem', marginBottom: 5 }}>Welcome, {user.name}</h1>
                    <p style={{ color: 'var(--text-muted)' }}>Manage your projects and access your portal here.</p>
                </div>
            </div>

            <div style={{ display: 'grid', gap: 20 }}>
                {projects.length === 0 ? (
                    <div className="card" style={{ textAlign: 'center', padding: '60px 20px' }}>
                        <Activity size={48} style={{ margin: '0 auto 15px', color: 'var(--text-muted)', opacity: 0.5 }} />
                        <h3>No Active Projects</h3>
                        <p style={{ color: 'var(--text-muted)', marginTop: 10 }}>Your account is set up, but we don't have any projects assigned to you yet.</p>
                    </div>
                ) : (
                    <>
                        <h3 style={{ marginTop: 10, marginBottom: 10 }}>Your Projects</h3>
                        {projects.map(p => (
                            <div key={p.id} className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 25 }}>
                                <div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                                        <h2 style={{ fontSize: '1.4rem' }}>{p.name}</h2>
                                        <span className="badge blue">{p.status}</span>
                                    </div>
                                    <p style={{ color: 'var(--text-muted)' }}>{p.description}</p>

                                    <div style={{ marginTop: 15, display: 'flex', gap: 20, fontSize: '0.9rem' }}>
                                        <div>
                                            <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.8rem' }}>Overall Progress</span>
                                            <span style={{ fontWeight: 800, color: 'var(--primary-600)' }}>{p.progress || 0}%</span>
                                        </div>
                                        <div>
                                            <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.8rem' }}>Started</span>
                                            <span style={{ fontWeight: 600 }}>{new Date(p.start_date).toLocaleDateString()}</span>
                                        </div>
                                    </div>
                                </div>
                                <div style={{ textAlign: 'right' }}>
                                    <Link
                                        to={`/portal/${p.client_portal_token}`}
                                        className="btn btn-primary"
                                        style={{ padding: '12px 24px', fontSize: '1.1rem', gap: 8 }}
                                    >
                                        Access Project Portal <ExternalLink size={18} />
                                    </Link>
                                </div>
                            </div>
                        ))}
                    </>
                )}
            </div>
        </div>
    );
}
