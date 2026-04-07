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
                                <span>₹{course.total_fee.toLocaleString()}</span>
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
                        <span className="price-value">₹{course.total_fee.toLocaleString()}</span>
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
                        <div className="overview-content markdown-content prose">
                            <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                {course.description || "No description provided for this course."}
                            </ReactMarkdown>
                        </div>
                    </section>

                    <section className="detail-section">
                        <h2>Curriculum / Syllabus</h2>
                        <div className="syllabus-container">
                            {course.syllabus ? (
                                <div className="markdown-content prose">
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
                    color: var(--text-primary);
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
                    border-radius: 24px;
                    padding: 48px;
                    display: flex;
                    justify-content: space-between;
                    gap: 40px;
                    margin-bottom: 48px;
                    box-shadow: var(--shadow-lg);
                    border: 1px solid var(--border);
                    position: relative;
                    z-index: 1;
                }
                .hero-content {
                    flex: 1;
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
                    font-size: 3rem;
                    font-weight: 800;
                    margin-bottom: 20px;
                    line-height: 1.1;
                    letter-spacing: -1px;
                }
                .hero-description {
                    font-size: 1.15rem;
                    color: var(--text-secondary);
                    line-height: 1.6;
                    margin-bottom: 40px;
                    max-width: 700px;
                }
                .hero-stats {
                    display: flex;
                    gap: 40px;
                }
                .hero-stat {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                }
                .hero-stat label {
                    display: block;
                    font-size: 0.7rem;
                    color: var(--text-muted);
                    text-transform: uppercase;
                    letter-spacing: 1px;
                    font-weight: 700;
                }
                .hero-stat span {
                    font-weight: 700;
                    font-size: 1.1rem;
                }
                .course-cta-card {
                    width: 320px;
                    background: var(--primary-600);
                    border-radius: 20px;
                    padding: 32px;
                    color: #fff;
                    box-shadow: 0 20px 40px rgba(37, 99, 235, 0.25);
                }
                .cta-price {
                    margin: 24px 0;
                    padding: 24px 0;
                    border-top: 1px solid rgba(255,255,255,0.2);
                    border-bottom: 1px solid rgba(255,255,255,0.2);
                }
                .price-value {
                    font-size: 2.5rem;
                    font-weight: 800;
                }
                .cta-features {
                    list-style: none;
                    padding: 0;
                    display: flex;
                    flex-direction: column;
                    gap: 12px;
                }
                .cta-features li {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    font-size: 0.9rem;
                    font-weight: 500;
                }
                .detail-grid {
                    display: grid;
                    grid-template-columns: 1fr 300px;
                    gap: 48px;
                }
                .detail-section h2 {
                    font-size: 1.5rem;
                    margin-bottom: 24px;
                    font-weight: 700;
                }
                .overview-content {
                    font-size: 1.1rem;
                    line-height: 1.8;
                    color: var(--text-secondary);
                    background: var(--bg-card);
                    padding: 32px;
                    border-radius: 16px;
                    border: 1px solid var(--border);
                }
                .syllabus-container {
                    background: var(--bg-card);
                    border: 1px solid var(--border);
                    border-radius: 16px;
                    padding: 40px;
                }
                .markdown-content.prose {
                    max-width: none;
                    color: var(--text-primary);
                }
                .markdown-content.prose h1 { font-size: 2rem; margin: 0 0 20px; color: var(--primary-600); border-bottom: 2px solid var(--primary-100); padding-bottom: 12px; }
                .markdown-content.prose h2 { font-size: 1.5rem; margin: 24px 0 16px; color: var(--text-primary); }
                .markdown-content.prose h3 { font-size: 1.25rem; margin: 20px 0 12px; }
                .markdown-content.prose p { margin-bottom: 20px; line-height: 1.8; color: var(--text-secondary); }
                .markdown-content.prose ul { padding-left: 20px; margin-bottom: 20px; list-style-type: disc; }
                .markdown-content.prose ul li { margin-bottom: 8px; color: var(--text-secondary); }
                .markdown-content.prose li input[type="checkbox"] { margin-right: 8px; transform: scale(1.1); vertical-align: middle; }
                .markdown-content.prose table { width: 100%; border-collapse: collapse; margin: 24px 0; font-size: 0.9rem; background: var(--bg-body); border-radius: 8px; overflow: hidden; }
                .markdown-content.prose th, .markdown-content.prose td { padding: 12px 16px; border: 1px solid var(--border); text-align: left; }
                .markdown-content.prose th { background: var(--primary-50); color: var(--primary-700); font-weight: 700; text-transform: uppercase; font-size: 0.75rem; letter-spacing: 0.5px; }
                
                .sidebar-card {
                    background: var(--bg-card);
                    border: 1px solid var(--border);
                    border-radius: 16px;
                    padding: 24px;
                    margin-bottom: 24px;
                }
                .highlight-item {
                    display: flex;
                    gap: 12px;
                    margin-bottom: 20px;
                }
                .highlight-item label {
                    display: block;
                    font-size: 0.75rem;
                    color: var(--text-muted);
                    font-weight: 600;
                }
                .highlight-item span {
                    font-weight: 700;
                    color: var(--text-primary);
                }
                .sidebar-contact {
                    background: var(--primary-50);
                    padding: 24px;
                    border-radius: 16px;
                    text-align: center;
                }
                @media (max-width: 900px) {
                    .course-hero { flex-direction: column; padding: 32px; }
                    .course-cta-card { width: 100%; }
                    .detail-grid { grid-template-columns: 1fr; }
                    .hero-stats { flex-wrap: wrap; }
                }
            `}} />
        </div>
    );
}
