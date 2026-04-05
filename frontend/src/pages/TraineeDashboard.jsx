import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Link } from 'react-router-dom';
import { trainingAPI, attendanceAPI } from '../services/api';
import { useToast } from '../components/ui/Toast';
import { BookOpen, Calendar, CheckCircle, Clock, Award, FileText, Send, User, MessageSquare, Briefcase } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

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
                attendanceAPI.getMine({ limit: 5 })
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
            <div className="page-content" style={{ textAlign: 'center', padding: '100px 20px' }}>
                <BookOpen size={64} style={{ color: 'var(--text-muted)', marginBottom: 20 }} />
                <h2>No active enrollments found</h2>
                <p style={{ color: 'var(--text-muted)' }}>You are not enrolled in any training programs yet. Please contact the administrator.</p>
            </div>
        );
    }

    return (
        <div className="page-content">
            <div className="header" style={{ marginBottom: 30 }}>
                <div className="header-left">
                    <h1>My Training Portal</h1>
                    <p>Track your learning progress, attendance, and certificates</p>
                </div>
                <div style={{ display: 'flex', gap: 15, alignItems: 'center' }}>
                    <Link to="/chat" className="btn btn-secondary" style={{ gap: 8 }}>
                        <MessageSquare size={16} /> Open Company Chat
                    </Link>
                    {activeEnrollment && (
                        <div className="badge purple" style={{ padding: '8px 16px', fontSize: '0.9rem' }}>
                            Enrolled in: {activeEnrollment.course?.title}
                        </div>
                    )}
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 350px', gap: 24 }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                    <div className="card" style={{ padding: 24 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                            <h3 style={{ margin: 0 }}>Course Syllabus</h3>
                            <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                                <Calendar size={14} style={{ marginRight: 5, verticalAlign: 'middle' }} />
                                Started: {new Date(activeEnrollment.start_date).toLocaleDateString()}
                            </div>
                        </div>
                        <div className="syllabus-content" style={{ background: 'var(--bg-app)', padding: 20, borderRadius: 12, border: '1px solid var(--border)', maxHeight: 500, overflowY: 'auto' }}>
                            <ReactMarkdown>{activeEnrollment.course?.syllabus || 'No syllabus provided.'}</ReactMarkdown>
                        </div>
                    </div>

                    <div className="card" style={{ padding: 24 }}>
                        <h3 style={{ marginBottom: 20 }}>Current Progress</h3>
                        <div style={{ marginBottom: 20 }}>
                            <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Last Completed Topic</label>
                            <div style={{ marginTop: 8, padding: 12, background: 'var(--primary-50)', color: 'var(--primary-700)', borderRadius: 8, border: '1px solid var(--primary-100)', fontWeight: 500 }}>
                                {activeEnrollment.completed_topic || 'Not started yet'}
                            </div>
                        </div>
                        
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
                            <div className="card shadow-sm" style={{ padding: 15, textAlign: 'center' }}>
                                <Clock size={24} style={{ margin: '0 auto 10px', color: 'var(--amber-500)' }} />
                                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Days Elapsed</div>
                                <div style={{ fontSize: '1.2rem', fontWeight: 700 }}>
                                    {Math.floor((new Date() - new Date(activeEnrollment.start_date)) / (1000 * 60 * 60 * 24))}
                                </div>
                            </div>
                            <div className="card shadow-sm" style={{ padding: 15, textAlign: 'center' }}>
                                <BookOpen size={24} style={{ margin: '0 auto 10px', color: 'var(--blue-500)' }} />
                                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Course Duration</div>
                                <div style={{ fontSize: '1.2rem', fontWeight: 700 }}>{activeEnrollment.course?.duration || 0} Days</div>
                            </div>
                        </div>
                    </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                    <div className="card" style={{ padding: 24 }}>
                        <h3 style={{ marginBottom: 20 }}>Fee Summary</h3>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
                            <span style={{ color: 'var(--text-muted)' }}>Total Course Fee</span>
                            <span style={{ fontWeight: 600 }}>${activeEnrollment.total_fee || activeEnrollment.course?.total_fee}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
                            <span style={{ color: 'var(--text-muted)' }}>Total Paid</span>
                            <span style={{ fontWeight: 600, color: 'var(--green-600)' }}>${activeEnrollment.paid_amount}</span>
                        </div>
                        <div style={{ height: 8, background: 'var(--bg-hover)', borderRadius: 4, margin: '15px 0' }}>
                            <div style={{ 
                                width: `${Math.min(100, (activeEnrollment.paid_amount / (activeEnrollment.total_fee || 1)) * 100)}%`, 
                                height: '100%', 
                                background: 'var(--primary-500)', 
                                borderRadius: 4 
                            }} />
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem' }}>
                            <span style={{ color: 'var(--text-muted)' }}>Remaining</span>
                            <span style={{ fontWeight: 700 }}>${(activeEnrollment.total_fee || activeEnrollment.course?.total_fee) - activeEnrollment.paid_amount}</span>
                        </div>
                    </div>

                    <div className="card" style={{ padding: 24 }}>
                        <h3 style={{ marginBottom: 20 }}>Resources & Docs</h3>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                            {activeEnrollment.cert_link ? (
                                <a href={activeEnrollment.cert_link} target="_blank" className="btn btn-secondary w-full" style={{ justifyContent: 'flex-start', gap: 10 }}>
                                    <Award size={16} /> Course Certificate
                                </a>
                            ) : (
                                <div className="btn btn-disabled w-full" style={{ justifyContent: 'flex-start', gap: 10 }}>
                                    <Award size={16} /> Certificate (Available on update)
                                </div>
                            )}
                            {activeEnrollment.offer_link && (
                                <a href={activeEnrollment.offer_link} target="_blank" className="btn btn-secondary w-full" style={{ justifyContent: 'flex-start', gap: 10 }}>
                                    <FileText size={16} /> Training Offer Letter
                                </a>
                            )}
                        </div>
                    </div>

                    <div className="card" style={{ padding: 24 }}>
                        <h3 style={{ marginBottom: 15 }}>Recent Attendance</h3>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                            {attendance.map(a => (
                                <div key={a.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--border-light)' }}>
                                    <div style={{ fontSize: '0.9rem' }}>{new Date(a.date).toLocaleDateString()}</div>
                                    <div className={`badge ${a.status === 'present' ? 'green' : 'red'}`} style={{ fontSize: '0.7rem' }}>{a.status}</div>
                                </div>
                            ))}
                            {attendance.length === 0 && <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>No records found.</p>}
                        </div>
                        <button className="btn btn-text w-full" style={{ marginTop: 15, fontSize: '0.85rem' }}>View All Attendance</button>
                    </div>
                </div>
            </div>
        </div>
    );
}
