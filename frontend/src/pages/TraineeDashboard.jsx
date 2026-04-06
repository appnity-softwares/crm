import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Link } from 'react-router-dom';
import { trainingAPI, attendanceAPI } from '../services/api';
import { useToast } from '../components/ui/Toast';
import { BookOpen, Calendar, CheckCircle, Clock, Award, FileText, MessageSquare, IndianRupee, ChevronRight, Activity, Globe, CheckSquare, Square } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

export default function TraineeDashboard() {
    const { user } = useAuth();
    const toast = useToast();
    const [enrollments, setEnrollments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeEnrollment, setActiveEnrollment] = useState(null);
    const [attendance, setAttendance] = useState([]);

    const loadData = async () => {
        try {
            const [enRes, attRes] = await Promise.all([
                trainingAPI.getMyEnrollments(),
                attendanceAPI.getMine({ limit: 8 })
            ]);
            setEnrollments(enRes.data || []);
            setAttendance(attRes.data.attendance || []);
            if (enRes.data.length > 0) setActiveEnrollment(enRes.data[0]);
        } catch (err) {
            toast('Failed to load training data', 'error');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { loadData(); }, []);

    if (loading) return <div className="spinner" />;

    if (enrollments.length === 0) {
        return (
            <div className="page-content" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', textAlign: 'center' }}>
                <div style={{ padding: 40, background: 'var(--bg-card)', borderRadius: 24, border: '1px solid var(--border)', maxWidth: 500, boxShadow: 'var(--shadow-xl)' }}>
                    <div style={{ width: 80, height: 80, background: 'var(--primary-100)', color: 'var(--primary-600)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px' }}>
                        <BookOpen size={40} />
                    </div>
                    <h2 style={{ fontSize: '1.75rem', fontWeight: 800, marginBottom: 12 }}>No Active Training</h2>
                    <p style={{ color: 'var(--text-muted)', lineHeight: 1.6, marginBottom: 32 }}>You haven't been enrolled in any training curricula yet. Enrollments provide access to syllabi, certificates, and attendance tracking.</p>
                    <Link to="/chat" className="btn btn-primary" style={{ padding: '12px 32px' }}>Contact Support</Link>
                </div>
            </div>
        );
    }

    const syllabus = activeEnrollment.course?.syllabus || '';
    const totalFee = activeEnrollment.total_fee || activeEnrollment.course?.total_fee || 0;
    const paidAmount = activeEnrollment.paid_amount || 0;
    const payProgress = Math.min(100, (paidAmount / (totalFee || 1)) * 100);

    return (
        <div className="page-content" style={{ paddingBottom: 60 }}>
            <div className="trainee-header card" style={{ padding: 0, overflow: 'hidden', border: 'none', background: 'transparent', boxShadow: 'none', marginBottom: 32 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 20 }}>
                    <div>
                        <h1 style={{ fontSize: '2.4rem', fontWeight: 900, letterSpacing: '-1px', marginBottom: 8 }}>Mitaan Training <span className="text-primary">Portal</span></h1>
                        <p style={{ color: 'var(--text-muted)', fontSize: '1.1rem' }}>Welcome back, {user?.name.split(' ')[0]}! Track your professional growth and curriculum milestones.</p>
                    </div>
                    <div style={{ display: 'flex', gap: 12 }}>
                        <Link to="/chat" className="btn" style={{ background: 'var(--primary-100)', color: 'var(--primary-700)', padding: '12px 20px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
                            <MessageSquare size={18} /> Company Chat
                        </Link>
                        <button className="btn btn-primary" style={{ padding: '12px 24px', fontWeight: 700 }}>
                            <Award size={18} style={{ marginRight: 8 }} /> Certification
                        </button>
                    </div>
                </div>
            </div>

            <div className="trainee-stats-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 20, marginBottom: 32 }}>
                <div className="card" style={{ padding: '24px', background: 'linear-gradient(135deg, white, #f8fafc)', borderLeft: '4px solid var(--primary-500)' }}>
                    <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', marginBottom: 8 }}>Active Curriculum</div>
                    <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{activeEnrollment.course?.title}</div>
                    <div style={{ fontSize: '0.85rem', color: 'var(--primary-600)', fontWeight: 600, marginTop: 4 }}>Current Enrollment</div>
                </div>
                <div className="card" style={{ padding: '24px', background: 'linear-gradient(135deg, white, #f8fafc)', borderLeft: '4px solid var(--amber-500)' }}>
                    <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', marginBottom: 8 }}>Training Progress</div>
                    <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-primary)' }}>{Math.floor((new Date() - new Date(activeEnrollment.start_date)) / (1000 * 60 * 60 * 24))} Days</div>
                    <div style={{ fontSize: '0.85rem', color: 'var(--amber-600)', fontWeight: 600, marginTop: 4 }}>Elapsed Time</div>
                </div>
                <div className="card" style={{ padding: '24px', background: 'linear-gradient(135deg, white, #f8fafc)', borderLeft: '4px solid var(--green-500)' }}>
                    <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', marginBottom: 8 }}>Attendance Rate</div>
                    <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-primary)' }}>{(attendance.filter(a => a.status === 'present').length / (attendance.length || 1) * 100).toFixed(0)}%</div>
                    <div style={{ fontSize: '0.85rem', color: 'var(--green-600)', fontWeight: 600, marginTop: 4 }}>Based on recent</div>
                </div>
                <div className="card" style={{ padding: '24px', background: 'linear-gradient(135deg, white, #f8fafc)', borderLeft: '4px solid var(--red-500)' }}>
                    <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', marginBottom: 8 }}>Pending Balance</div>
                    <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-primary)' }}>₹{(totalFee - paidAmount).toLocaleString()}</div>
                    <div style={{ fontSize: '0.85rem', color: 'var(--red-600)', fontWeight: 600, marginTop: 4 }}>Due Record</div>
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: 32 }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
                    <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                        <div style={{ padding: '24px 32px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                <div style={{ width: 40, height: 40, borderRadius: 12, background: 'var(--primary-600)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <BookOpen size={20} />
                                </div>
                                <div>
                                    <h3 style={{ margin: 0, fontSize: '1.1rem' }}>Syllabus & Curriculum</h3>
                                    <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-muted)' }}>Mitaan Official Training Program</p>
                                </div>
                            </div>
                            <div style={{ textAlign: 'right' }}>
                                <div style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Current Topic</div>
                                <div style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--primary-600)' }}>{activeEnrollment.completed_topic || 'Introduction'}</div>
                            </div>
                        </div>
                        <div style={{ padding: '32px', display: 'grid', gridTemplateColumns: '1fr 300px', gap: 40 }}>
                            <div className="prose-syllabus-modern">
                                <ReactMarkdown remarkPlugins={[remarkGfm]}>{syllabus}</ReactMarkdown>
                            </div>
                            <div style={{ borderLeft: '1px solid var(--border)', paddingLeft: 32 }}>
                                <h4 style={{ marginBottom: 20, display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.95rem' }}><CheckSquare size={18} /> Course Checklist</h4>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                                    {activeEnrollment.course?.modules?.split(',').map(m => m.trim()).filter(Boolean).map((mod, i) => {
                                        const isDone = activeEnrollment.completed_modules?.split(',').includes(mod);
                                        return (
                                            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, opacity: isDone ? 1 : 0.6 }}>
                                                {isDone ? <CheckCircle className="green" size={18} /> : <div style={{ width: 18, height: 18, borderRadius: '50%', border: '2px solid var(--border)' }} />}
                                                <span style={{ fontSize: '0.85rem', fontWeight: isDone ? 700 : 500, color: isDone ? 'var(--text-primary)' : 'var(--text-muted)' }}>{mod}</span>
                                            </div>
                                        );
                                    })}
                                    {(!activeEnrollment.course?.modules || activeEnrollment.course.modules === '') && (
                                        <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>No modules defined yet.</div>
                                    )}
                                </div>

                                <div style={{ marginTop: 40 }}>
                                    <h4 style={{ marginBottom: 20, display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.95rem' }}><IndianRupee size={18} /> Installment History</h4>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                                        {(() => {
                                            try {
                                                const installments = JSON.parse(activeEnrollment.installments || '[]');
                                                return installments.length > 0 ? installments.map((ins, i) => (
                                                    <div key={i} style={{ padding: '10px 12px', borderRadius: 8, background: 'var(--bg-hover)', borderLeft: '3px solid var(--green-500)' }}>
                                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
                                                            <span style={{ fontWeight: 700, fontSize: '0.85rem' }}>₹{ins.amount}</span>
                                                            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{new Date(ins.date).toLocaleDateString()}</span>
                                                        </div>
                                                        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{ins.description || 'Installment'}</div>
                                                    </div>
                                                )) : <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>No installment records found.</div>;
                                            } catch {
                                                return <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>No records yet.</div>;
                                            }
                                        })()}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
                    <div className="card" style={{ padding: 24 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
                            <Activity size={18} className="text-primary" />
                            <h3 style={{ margin: 0, fontSize: '1rem' }}>Fee & Financials</h3>
                        </div>
                        <div style={{ marginBottom: 24 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                                <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>Payment Progress</span>
                                <span style={{ fontSize: '0.9rem', fontWeight: 800 }}>{payProgress.toFixed(0)}%</span>
                            </div>
                            <div style={{ height: 10, background: 'var(--bg-hover)', borderRadius: 10, overflow: 'hidden' }}>
                                <div style={{ width: `${payProgress}%`, height: '100%', background: 'linear-gradient(90deg, var(--primary-500), var(--primary-600))' }} />
                            </div>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 16px', borderRadius: 12, background: 'var(--bg-hover)' }}>
                                <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Total Fee</span>
                                <span style={{ fontSize: '0.9rem', fontWeight: 700 }}>₹{totalFee.toLocaleString()}</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 16px', borderRadius: 12, background: 'var(--bg-hover)' }}>
                                <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Paid to Date</span>
                                <span style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--green-600)' }}>₹{paidAmount.toLocaleString()}</span>
                            </div>
                            <hr style={{ border: 'none', borderTop: '1px solid var(--border)', margin: '8px 0' }} />
                            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0 8px' }}>
                                <span style={{ fontSize: '0.95rem', fontWeight: 700 }}>Remaining Due</span>
                                <span style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--red-500)' }}>₹{(totalFee - paidAmount).toLocaleString()}</span>
                            </div>
                        </div>
                    </div>

                    <div className="card" style={{ padding: 24 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
                            <Globe size={18} className="text-primary" />
                            <h3 style={{ margin: 0, fontSize: '1rem' }}>Resources & Links</h3>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                            {[
                                ...(activeEnrollment.course?.resources?.split(',') || []),
                                ...(activeEnrollment.resources?.split(',') || [])
                            ].filter(Boolean).map((res, i) => {
                                const parts = res.trim().includes(':') ? res.trim().split(':') : ['Resource', res.trim()];
                                const name = parts[0];
                                const url = parts.slice(1).join(':');
                                return (
                                    <a key={i} href={url.trim()} target="_blank" rel="noopener noreferrer" className="resource-link">
                                        <div className="resource-icon blue"><Globe size={16} /></div>
                                        <div className="resource-info">
                                            <div className="resource-name" style={{ textTransform: 'capitalize' }}>{name}</div>
                                            <div className="resource-meta">External Link</div>
                                        </div>
                                        <ChevronRight size={16} className="text-muted" />
                                    </a>
                                );
                            })}
                            {(!activeEnrollment.course?.resources && !activeEnrollment.resources) && (
                                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', textAlign: 'center', padding: 20 }}>No resources shared yet.</p>
                            )}
                        </div>
                    </div>

                    <div className="card" style={{ padding: 24 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
                            <Clock size={16} className="text-primary" />
                            <h3 style={{ margin: 0, fontSize: '1rem' }}>Attendance Trend</h3>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                            {attendance.length > 0 ? attendance.map(a => (
                                <div key={a.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', borderRadius: 10, background: 'var(--bg-app)', border: '1px solid var(--border)' }}>
                                    <div style={{ fontSize: '0.85rem', fontWeight: 600 }}>{new Date(a.date).toLocaleDateString(undefined, { day: '2-digit', month: 'short' })}</div>
                                    <div className={`badge ${a.status === 'present' ? 'green' : 'amber'}`} style={{ fontSize: '0.65rem', textTransform: 'uppercase', fontWeight: 800 }}>{a.status}</div>
                                </div>
                            )) : <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', textAlign: 'center', padding: 20 }}>No records found.</p>}
                        </div>
                        <Link to="/attendance" className="btn btn-text w-full" style={{ marginTop: 16, fontSize: '0.85rem', color: 'var(--primary-600)' }}>Full Attendance Report</Link>
                    </div>
                </div>
            </div>
            
            <style>{`
                .prose-syllabus-modern {
                    line-height: 1.7;
                    color: var(--text-secondary);
                    font-size: 1rem;
                }
                .prose-syllabus-modern h1, .prose-syllabus-modern h2, .prose-syllabus-modern h3 {
                    color: var(--text-primary);
                    font-weight: 800;
                    margin-top: 2rem;
                    margin-bottom: 1rem;
                    letter-spacing: -0.02em;
                }
                .prose-syllabus-modern h1 { font-size: 1.75rem; border-bottom: 1px solid var(--border); padding-bottom: 0.5rem; }
                .prose-syllabus-modern h2 { font-size: 1.4rem; }
                .prose-syllabus-modern h3 { font-size: 1.2rem; }
                .prose-syllabus-modern ul, .prose-syllabus-modern ol {
                    margin-bottom: 1.5rem;
                    padding-left: 1.25rem;
                }
                .prose-syllabus-modern li {
                    margin-bottom: 0.5rem;
                }
                .prose-syllabus-modern p {
                    margin-bottom: 1.25rem;
                }
                .resource-link {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                    padding: 12px;
                    border-radius: 12px;
                    border: 1px solid var(--border);
                    transition: all 0.2s;
                }
                .resource-link:hover {
                    background: var(--bg-hover);
                    border-color: var(--primary-300);
                    transform: translateX(4px);
                }
                .resource-icon {
                    width: 36px;
                    height: 36px;
                    border-radius: 8px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    flex-shrink: 0;
                }
                .resource-icon.green { background: var(--green-50); color: var(--green-600); }
                .resource-icon.blue { background: var(--primary-50); color: var(--primary-600); }
                .resource-info {
                    flex: 1;
                }
                .resource-name {
                    font-size: 0.85rem;
                    font-weight: 700;
                    color: var(--text-primary);
                }
                .resource-meta {
                    font-size: 0.7rem;
                    color: var(--text-muted);
                }
            `}</style>
        </div>
    );
}
