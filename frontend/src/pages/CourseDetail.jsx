import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { trainingAPI } from '../services/api';
import { useToast } from '../components/ui/Toast';
import { ChevronLeft, Clock, BadgeDollarSign, BookOpen, Calendar, Share2, Download, CheckCircle2 } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

export default function CourseDetail() {
    const { id } = useParams();
    const navigate = useNavigate();
    const toast = useToast();
    const [course, setCourse] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const load = async () => {
            try {
                const { data } = await trainingAPI.getCourse(id);
                setCourse(data);
            } catch (err) {
                toast(err.response?.data?.error || 'Failed to load course details', 'error');
                navigate('/training/courses');
            } finally {
                setLoading(false);
            }
        };
        load();
    }, [id, navigate, toast]);

    if (loading) return (
        <div className="flex items-center justify-center min-h-[400px]">
            <div className="spinner" />
        </div>
    );

    if (!course) return null;

    return (
        <div className="course-detail-page">
            {/* Breadcrumb & Navigation */}
            <div className="detail-header-nav">
                <button 
                    className="back-btn" 
                    onClick={() => navigate('/training/courses')}
                >
                    <ChevronLeft size={18} />
                    Back to Courses
                </button>
                <div className="flex gap-2">
                    <button className="btn-icon" title="Share Course">
                        <Share2 size={18} />
                    </button>
                    <button className="btn-primary flex items-center gap-2">
                        <Download size={18} />
                        Brochure
                    </button>
                </div>
            </div>

            <div className="course-hero">
                <div className="hero-content">
                    <span className="course-badge">Training Program</span>
                    <h1>{course.title}</h1>
                    <p className="hero-description">{course.description}</p>
                    
                    <div className="hero-stats">
                        <div className="hero-stat">
                            <Clock size={20} className="text-blue-500" />
                            <div>
                                <label>Duration</label>
                                <span>{course.duration} Days</span>
                            </div>
                        </div>
                        <div className="hero-stat">
                            <BadgeDollarSign size={20} className="text-green-500" />
                            <div>
                                <label>Program Fee</label>
                                <span>${course.total_fee.toLocaleString()}</span>
                            </div>
                        </div>
                        <div className="hero-stat">
                            <BookOpen size={20} className="text-purple-500" />
                            <div>
                                <label>Curriculum</label>
                                <span>Complete Syllabus</span>
                            </div>
                        </div>
                    </div>
                </div>
                
                <div className="course-cta-card">
                    <div className="cta-header">
                        <h3>Enroll Now</h3>
                        <p>Start your learning journey today</p>
                    </div>
                    <div className="cta-price">
                        <span className="price-label">Total Investment</span>
                        <span className="price-value">${course.total_fee.toLocaleString()}</span>
                    </div>
                    <ul className="cta-features">
                        <li><CheckCircle2 size={16} /> Lifetime access</li>
                        <li><CheckCircle2 size={16} /> Industry certificate</li>
                        <li><CheckCircle2 size={16} /> Placement support</li>
                    </ul>
                </div>
            </div>

            <div className="detail-grid">
                <div className="detail-main">
                    <section className="detail-section">
                        <h2>Course Overview</h2>
                        <div className="overview-content">
                            {course.description || "No description provided for this course."}
                        </div>
                    </section>

                    <section className="detail-section">
                        <h2>Curriculum / Syllabus</h2>
                        <div className="syllabus-container card">
                            {course.syllabus ? (
                                <div className="markdown-content">
                                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                        {course.syllabus}
                                    </ReactMarkdown>
                                </div>
                            ) : (
                                <div className="empty-state p-8 text-center text-gray-500">
                                    <BookOpen size={48} style={{ margin: '0 auto 16px', opacity: 0.3 }} />
                                    <p>The syllabus for this course is being prepared.</p>
                                </div>
                            )}
                        </div>
                    </section>
                </div>

                <div className="detail-sidebar">
                    <div className="sidebar-card">
                        <h3>Highlights</h3>
                        <div className="highlights-list">
                            <div className="highlight-item">
                                <Calendar size={18} />
                                <div>
                                    <label>Next Intake</label>
                                    <span>Rolling Admissions</span>
                                </div>
                            </div>
                            <div className="highlight-item">
                                <CheckCircle2 size={18} />
                                <div>
                                    <label>Status</label>
                                    <span className={course.is_active ? 'text-green-600' : 'text-gray-500'}>
                                        {course.is_active ? 'Currently Active' : 'On Hold'}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <div className="sidebar-contact">
                        <h4>Questions?</h4>
                        <p>Speak with one of our counselors for guidance.</p>
                        <button className="btn btn-secondary w-full mt-4">Contact Admissions</button>
                    </div>
                </div>
            </div>

            <style dangerouslySetInnerHTML={{ __html: `
                .course-detail-page {
                    padding: 24px;
                    max-width: 1200px;
                    margin: 0 auto;
                }
                .detail-header-nav {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 24px;
                }
                .back-btn {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    color: var(--text-muted);
                    font-weight: 500;
                    transition: color 0.2s;
                    background: transparent;
                    border: none;
                    font-family: inherit;
                    cursor: pointer;
                }
                .back-btn:hover {
                    color: var(--primary-600);
                }
                .course-hero {
                    background: var(--bg-card);
                    border-radius: var(--radius-xl);
                    padding: 48px;
                    display: flex;
                    justify-content: space-between;
                    gap: 48px;
                    margin-bottom: 48px;
                    box-shadow: var(--shadow-lg);
                    border: 1px solid var(--border);
                    position: relative;
                    overflow: hidden;
                }
                .course-hero::before {
                    content: '';
                    position: absolute;
                    top: -100px;
                    right: -100px;
                    width: 300px;
                    height: 300px;
                    background: radial-gradient(circle, var(--primary-100) 0%, transparent 70%);
                    z-index: 0;
                    opacity: 0.3;
                }
                .hero-content {
                    flex: 1;
                    position: relative;
                    z-index: 1;
                }
                .course-badge {
                    display: inline-block;
                    padding: 6px 14px;
                    background: var(--primary-50);
                    color: var(--primary-600);
                    border-radius: 50px;
                    font-size: 0.75rem;
                    font-weight: 700;
                    text-transform: uppercase;
                    margin-bottom: 20px;
                    letter-spacing: 0.5px;
                }
                .course-hero h1 {
                    font-size: 2.8rem;
                    font-weight: 800;
                    margin-bottom: 20px;
                    color: var(--text-primary);
                    line-height: 1.1;
                }
                .hero-description {
                    font-size: 1.15rem;
                    color: var(--text-secondary);
                    line-height: 1.7;
                    margin-bottom: 40px;
                    max-width: 650px;
                }
                .hero-stats {
                    display: flex;
                    gap: 40px;
                    flex-wrap: wrap;
                }
                .hero-stat {
                    display: flex;
                    align-items: center;
                    gap: 14px;
                }
                .hero-stat svg {
                    opacity: 0.8;
                }
                .hero-stat label {
                    display: block;
                    font-size: 0.7rem;
                    color: var(--text-muted);
                    text-transform: uppercase;
                    letter-spacing: 1px;
                    font-weight: 700;
                    margin-bottom: 2px;
                }
                .hero-stat span {
                    font-weight: 700;
                    font-size: 1.05rem;
                    color: var(--text-primary);
                }
                .course-cta-card {
                    width: 340px;
                    background: linear-gradient(135deg, var(--primary-600), var(--primary-700));
                    border-radius: var(--radius-lg);
                    padding: 32px;
                    color: #fff;
                    display: flex;
                    flex-direction: column;
                    gap: 24px;
                    z-index: 1;
                    box-shadow: 0 20px 40px rgba(37, 99, 235, 0.2);
                }
                .cta-header h3 {
                    font-size: 1.5rem;
                    font-weight: 700;
                    margin-bottom: 6px;
                }
                .cta-header p {
                    opacity: 0.85;
                    font-size: 0.9rem;
                    line-height: 1.4;
                }
                .cta-price {
                    padding: 24px 0;
                    border-top: 1px solid rgba(255,255,255,0.15);
                    border-bottom: 1px solid rgba(255,255,255,0.15);
                }
                .price-label {
                    display: block;
                    font-size: 0.85rem;
                    opacity: 0.75;
                    margin-bottom: 6px;
                    font-weight: 500;
                }
                .price-value {
                    font-size: 2.2rem;
                    font-weight: 800;
                }
                .cta-features {
                    list-style: none;
                    padding: 0;
                    display: flex;
                    flex-direction: column;
                    gap: 14px;
                }
                .cta-features li {
                    display: flex;
                    align-items: center;
                    gap: 10px;
                    font-size: 0.95rem;
                    font-weight: 500;
                }
                .detail-grid {
                    display: grid;
                    grid-template-columns: 1fr 320px;
                    gap: 48px;
                }
                .detail-section {
                    margin-bottom: 56px;
                }
                .detail-section h2 {
                    font-size: 1.6rem;
                    font-weight: 700;
                    margin-bottom: 24px;
                    position: relative;
                    padding-bottom: 16px;
                    color: var(--text-primary);
                }
                .detail-section h2::after {
                    content: '';
                    position: absolute;
                    bottom: 0;
                    left: 0;
                    width: 50px;
                    height: 5px;
                    background: var(--primary-500);
                    border-radius: 10px;
                }
                .overview-content {
                    font-size: 1.1rem;
                    line-height: 1.8;
                    color: var(--text-secondary);
                    white-space: pre-wrap;
                    background: var(--bg-card);
                    padding: 32px;
                    border-radius: var(--radius-lg);
                    border: 1px solid var(--border);
                }
                .syllabus-container {
                    padding: 40px;
                    background: var(--bg-card);
                    border: 1px solid var(--border);
                    border-radius: var(--radius-lg);
                    box-shadow: var(--shadow-sm);
                }
                .markdown-content {
                    color: var(--text-primary);
                    line-height: 1.8;
                }
                .markdown-content h1 { font-size: 1.8rem; margin: 32px 0 16px; font-weight: 700; color: var(--primary-600); }
                .markdown-content h2 { font-size: 1.5rem; margin: 28px 0 14px; font-weight: 700; border-bottom: 1px solid var(--border); padding-bottom: 8px; }
                .markdown-content h3 { font-size: 1.2rem; margin: 24px 0 12px; font-weight: 700; }
                .markdown-content ul, .markdown-content ol { padding-left: 24px; margin-bottom: 20px; }
                .markdown-content li { margin-bottom: 10px; }
                .markdown-content li::marker { color: var(--primary-500); font-weight: bold; }
                .markdown-content p { margin-bottom: 16px; }
                .sidebar-card {
                    background: var(--bg-card);
                    border-radius: var(--radius-lg);
                    padding: 32px;
                    border: 1px solid var(--border);
                    margin-bottom: 32px;
                    box-shadow: var(--shadow-sm);
                }
                .sidebar-card h3 {
                    font-size: 1.2rem;
                    font-weight: 700;
                    margin-bottom: 24px;
                    color: var(--text-primary);
                }
                .highlights-list {
                    display: flex;
                    flex-direction: column;
                    gap: 24px;
                }
                .highlight-item {
                    display: flex;
                    gap: 16px;
                }
                .highlight-item svg {
                    color: var(--primary-500);
                    flex-shrink: 0;
                }
                .highlight-item label {
                    display: block;
                    font-size: 0.75rem;
                    color: var(--text-muted);
                    text-transform: uppercase;
                    letter-spacing: 0.5px;
                    font-weight: 600;
                    margin-bottom: 2px;
                }
                .highlight-item span {
                    font-weight: 700;
                    font-size: 1rem;
                    color: var(--text-primary);
                }
                .sidebar-contact {
                    text-align: center;
                    padding: 32px;
                    background: var(--primary-50);
                    border-radius: var(--radius-lg);
                    border: 1px dashed var(--primary-200);
                }
                .sidebar-contact h4 {
                    font-weight: 700;
                    margin-bottom: 10px;
                    color: var(--primary-700);
                    font-size: 1.1rem;
                }
                .sidebar-contact p {
                    color: var(--primary-600);
                    font-size: 0.9rem;
                    margin-bottom: 20px;
                }

                @media (max-width: 1024px) {
                    .course-hero {
                        flex-direction: column;
                        padding: 32px;
                        gap: 32px;
                    }
                    .course-cta-card {
                        width: 100%;
                    }
                    .detail-grid {
                        grid-template-columns: 1fr;
                    }
                    .course-hero h1 {
                        font-size: 2.2rem;
                    }
                }
            `}} />
        </div>
    );
}
