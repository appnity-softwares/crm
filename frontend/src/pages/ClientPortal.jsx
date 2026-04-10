import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { portalAPI } from '../services/api';
import { useToast } from '../components/ui/Toast';
import { CheckCircle, Clock, ExternalLink, CreditCard, Layout, FileText, ArrowRight, LifeBuoy, Activity, MessageSquare, FolderKanban, Users, TrendingUp, ShieldCheck, Heart, Share2 } from 'lucide-react';
import Modal from '../components/ui/Modal';
import GlobalHelpButton from '../components/ui/GlobalHelpButton';

export default function ClientPortal() {
    const { token } = useParams();
    const toast = useToast();
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [processing, setProcessing] = useState(false);
    const [tickets, setTickets] = useState([]);
    const [showTicketModal, setShowTicketModal] = useState(false);
    const [ticketForm, setTicketForm] = useState({ subject: '', description: '', priority: 'medium' });
    const [savingTicket, setSavingTicket] = useState(false);

    const [showSowModal, setShowSowModal] = useState(false);
    const [sowForm, setSowForm] = useState({ sow: '' });
    const [savingSOW, setSavingSOW] = useState(false);

    const [chatStatus, setChatStatus] = useState('none');
    const [agreed, setAgreed] = useState(false);

    const load = async () => {
        try {
            const res = await portalAPI.getData(token);
            setData(res.data);
            const tRes = await portalAPI.getTickets(token);
            setTickets(tRes.data.tickets || []);
            
            const cRes = await portalAPI.getChatStatus(token);
            setChatStatus(cRes.data.status);
        } catch (err) {
            toast("Invalid portal link", "error");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        load();
        // Load Razorpay Script
        const script = document.createElement("script");
        script.src = "https://checkout.razorpay.com/v1/checkout.js";
        script.async = true;
        document.body.appendChild(script);
        return () => {
            if (document.body.contains(script)) {
                document.body.removeChild(script);
            }
        }
    }, [token]);

    const handlePayment = async () => {
        if (!window.Razorpay) {
            toast("Razorpay SDK not loaded", "error");
            return;
        }
        setProcessing(true);
        try {
            const res = await portalAPI.initializePayment(token);
            const options = {
                key: res.data.key,
                amount: res.data.amount,
                currency: "INR",
                name: "Appnity Softwares",
                description: "Project/Invoice Payment",
                order_id: res.data.order_id,
                handler: async function (response) {
                    try {
                        await portalAPI.verifyPayment(token, {
                            razorpay_payment_id: response.razorpay_payment_id,
                            razorpay_order_id: response.razorpay_order_id,
                            razorpay_signature: response.razorpay_signature
                        });
                        toast("Payment Verified!", "success");
                        load();
                    } catch (err) {
                        toast("Payment verification failed", "error");
                    }
                },
                prefill: {
                    name: data.type === 'invoice' ? data.invoice.client_name : '',
                    email: data.type === 'invoice' ? data.invoice.client_email : ''
                },
                theme: { color: "#4f46e5" }
            };
            const rzp = new window.Razorpay(options);
            rzp.open();
        } catch (err) {
            toast("Failed to initialize payment", "error");
        } finally {
            setProcessing(false);
        }
    };

    const handleRaiseTicket = async (e) => {
        e.preventDefault();
        setSavingTicket(true);
        try {
            const project = data.type === 'project' ? data.project : data.invoice?.project;
            if (!project) return;
            await portalAPI.createTicket(token, { ...ticketForm, project_id: project.id });
            toast("Ticket raised successfully", "success");
            setShowTicketModal(false);
            setTicketForm({ subject: '', description: '', priority: 'medium' });
            load();
        } catch { toast("Failed to raise ticket", "error"); }
        finally { setSavingTicket(false); }
    };
    
    const handleUpdateSOW = async (e) => {
        e.preventDefault();
        setSavingSOW(true);
        try {
            await portalAPI.updateSOW(token, sowForm);
            toast("SOW Proposal Submitted!", "success");
            setShowSowModal(false);
            load();
        } catch { toast("Failed to update SOW", "error"); }
        finally { setSavingSOW(false); }
    };

    if (loading) return <div className="portal-loading"><div className="spinner" /></div>;
    if (!data) return (
        <div className="portal-error">
            <ShieldCheck size={64} className="text-red-500" />
            <h1>Access Restricted</h1>
            <p>This secure portal link has been restricted or is invalid. Please contact your project lead for access.</p>
            <button className="btn btn-indigo" onClick={() => window.location.href = 'mailto:support@appnity.cloud?subject=Portal Access Request'}>
                Contact Support
            </button>
        </div>
    );

    const invoice = data.type === 'invoice' ? data.invoice : null;
    const project = data.type === 'project' ? data.project : (invoice?.project);
    const invoices = (data.invoices || []).sort((a, b) => b.created_at.localeCompare(a.created_at));

    return (
        <div className="portal-page">
            {/* Rich Global Header */}
            <div className="portal-hero">
                <div className="portal-container">
                    <div className="hero-content">
                        <div className="brand-badge">Appnity Client Portal</div>
                        <h1>{project ? project.name : 'Welcome to Your Portal'}</h1>
                        <p>{project?.description || 'Track your invoices, project progress, and communicate with the team.'}</p>
                        
                        {project && (
                            <div className="hero-stats">
                                <div className="stat-pill">
                                    <Activity size={16} />
                                    <span>{project.status?.replace('_', ' ')}</span>
                                </div>
                                <div className="stat-pill primary">
                                    <TrendingUp size={16} />
                                    <span>{project.progress || 0}% Complete</span>
                                </div>
                                <div className="stat-pill">
                                    <Users size={16} />
                                    <span>{Array.from(new Set(project.assignments?.filter(a => !a.removed_at).map(a => a.user_id))).length || 0} Experts Assigned</span>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <div className="portal-container portal-content-grid">
                <main className="portal-main">
                    {project && (
                        <>
                            {/* Milestone Tracker */}
                            <div className="card glass-card milestone-card">
                                <div className="card-header">
                                    <h3 className="card-title">
                                        <TrendingUp size={20} className="icon-blue" />
                                        Project Journey
                                    </h3>
                                </div>
                                <div className="milestone-track">
                                    <div className={`milestone-node ${project.progress >= 25 ? 'active' : ''}`}>
                                        <div className="node-icon"><Clock size={14} /></div>
                                        <span>Planning</span>
                                    </div>
                                    <div className="milestone-line" />
                                    <div className={`milestone-node ${project.progress >= 50 ? 'active' : ''}`}>
                                        <div className="node-icon"><Layout size={14} /></div>
                                        <span>Alpha Build</span>
                                    </div>
                                    <div className="milestone-line" />
                                    <div className={`milestone-node ${project.progress >= 75 ? 'active' : ''}`}>
                                        <div className="node-icon"><ShieldCheck size={14} /></div>
                                        <span>Beta Testing</span>
                                    </div>
                                    <div className="milestone-line" />
                                    <div className={`milestone-node ${project.progress >= 100 ? 'active' : ''}`}>
                                        <div className="node-icon"><CheckCircle size={14} /></div>
                                        <span>Launch</span>
                                    </div>
                                </div>
                            </div>

                            {/* Kanban Board View */}
                            <div className="card glass-card">
                                <div className="card-header">
                                    <h3 className="card-title">
                                        <FolderKanban size={20} className="icon-blue" />
                                        Task Board (Read-only)
                                    </h3>
                                    <span className="badge-outline">Live Progress</span>
                                </div>
                                <div className="mini-kanban">
                                    {['todo', 'doing', 'done'].map(status => (
                                        <div key={status} className="kanban-col">
                                            <div className="col-label">{status.toUpperCase()}</div>
                                            <div className="col-tasks">
                                                {(data.tasks || []).filter(t => t.status === status).slice(0, 3).map(task => (
                                                    <div key={task.id} className="task-mini-card">
                                                        {task.title}
                                                    </div>
                                                ))}
                                                {(data.tasks || []).filter(t => t.status === status).length === 0 && <div className="task-empty">—</div>}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Resources & SOW */}
                            <div className="card-group-two">
                                <div className="card glass-card">
                                    <div className="card-header">
                                        <h3 className="card-title"><CreditCard size={20} className="icon-purple" /> Deliverables Vault</h3>
                                    </div>
                                    <div className="vault-list">
                                        {(data.resources || []).map(res => (
                                            <a key={res.id} href={res.link} target="_blank" rel="noreferrer" className="vault-item">
                                                <ExternalLink size={16} />
                                                <span>{res.title}</span>
                                            </a>
                                        ))}
                                        {(data.resources || []).length === 0 && <p className="text-muted">No shared assets yet.</p>}
                                    </div>
                                </div>

                                <div className={`card glass-card sow-card ${project.sow_accepted_by_client ? 'accepted' : 'pending'}`}>
                                    <div className="card-header">
                                        <h3 className="card-title"><FileText size={20} /> Agreement & SOW</h3>
                                    </div>
                                    <p className="sow-summary">{project.sow ? project.sow.substring(0, 100) + '...' : "Check your project agreement here."}</p>
                                    <div className="sow-actions" style={{ display: 'flex', gap: 10, marginTop: 15 }}>
                                        {project.sow_accepted_by_client ? (
                                            <div className="sow-status">
                                                <CheckCircle size={16} className="text-green-500" />
                                                <span>Accepted</span>
                                            </div>
                                        ) : (
                                            <button className="btn btn-indigo btn-sm" onClick={async () => {
                                                if (window.confirm("Do you agree to the SOW terms?")) {
                                                    try { await portalAPI.acceptSOW(token); toast("SOW Accepted!", "success"); load(); }
                                                    catch { toast("Error", "error"); }
                                                }
                                            }}>Accept Terms</button>
                                        )}
                                        <button className="btn btn-outline btn-sm" onClick={() => {
                                            setSowForm({ sow: project.sow || '' });
                                            setShowSowModal(true);
                                        }}>
                                            {project.sow ? 'Edit Proposal' : 'Propose SOW'}
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {/* Communication Hub */}
                            <div className="card glass-card">
                                <div className="card-header">
                                    <h3 className="card-title">
                                        <MessageSquare size={20} className="icon-indigo" />
                                        Project Timeline & Discussion
                                    </h3>
                                </div>
                                <div className="portal-timeline">
                                    {(data.updates || []).length === 0 ? (
                                        <div className="timeline-empty">We will post your project updates here.</div>
                                    ) : (
                                        data.updates.map(update => (
                                            <div key={update.id} className="timeline-entry">
                                                <div className="entry-header">
                                                    <div className="entry-user">
                                                        {update.author?.name?.charAt(0)}
                                                    </div>
                                                    <div className="entry-meta">
                                                        <strong>{update.title}</strong>
                                                        <span>{new Date(update.created_at).toLocaleDateString()}</span>
                                                    </div>
                                                </div>
                                                <p className="entry-desc">{update.description}</p>
                                                <div className="entry-comments">
                                                    {(update.comments || []).map(c => (
                                                        <div key={c.id} className="comment-bubble">
                                                            <strong>{c.user?.name}:</strong> {c.content}
                                                        </div>
                                                    ))}
                                                    <input 
                                                        className="comment-input" 
                                                        placeholder="Post a reply..." 
                                                        onKeyDown={async (e) => {
                                                            if (e.key === 'Enter' && e.target.value.trim()) {
                                                                try {
                                                                    await portalAPI.postComment(token, { update_id: update.id, content: e.target.value });
                                                                    e.target.value = '';
                                                                    toast("Comment Posted", "success");
                                                                    load();
                                                                } catch { toast("Failed", "error"); }
                                                            }
                                                        }}
                                                    />
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                        </>
                    )}

                    {/* Financial Section */}
                    <div className="card glass-card financial-card">
                        <div className="card-header">
                            <h3 className="card-title">
                                <CreditCard size={20} className="icon-green" />
                                Invoices & Milestone Payments
                            </h3>
                        </div>
                        <div className="portal-invoices">
                            {invoices.length > 0 ? invoices.map(inv => (
                                <div key={inv.id} className={`inv-row ${inv.status}`}>
                                    <div className="inv-info">
                                        <span className="inv-num">{inv.invoice_number}</span>
                                        <span className="inv-date">Due: {new Date(inv.due_date).toLocaleDateString()}</span>
                                    </div>
                                    <div className="inv-amount">₹{inv.total.toLocaleString()}</div>
                                    <div className="inv-status">
                                        {inv.status === 'paid' ? (
                                            <span className="paid-badge"><CheckCircle size={14} /> Paid</span>
                                        ) : (
                                            <button className="btn btn-primary btn-sm" onClick={handlePayment} disabled={processing}>
                                                {processing ? '...' : 'Pay Now'}
                                            </button>
                                        )}
                                    </div>
                                </div>
                            )) : <p className="text-center p-4">No invoices records found.</p>}
                        </div>
                    </div>
                </main>

                <aside className="portal-sidebar">
                    {/* PM Contact Card */}
                    <div className="card PM-card">
                        <h4>Direct Support</h4>
                        <div className="pm-info">
                            <div className="pm-avatar">{project?.creator?.name?.charAt(0) || 'A'}</div>
                            <div className="pm-text">
                                <strong>{project?.creator?.name || 'Account Manager'}</strong>
                                <span>{project?.creator?.role || 'Project Lead'}</span>
                            </div>
                        </div>
                        <button 
                            className={`btn btn-block ${chatStatus === 'approved' ? 'btn-green' : 'btn-indigo'}`} 
                            disabled={chatStatus === 'requested' || chatStatus === 'rejected'}
                            onClick={async () => {
                                if (chatStatus === 'approved') {
                                    window.open('/chat', '_blank');
                                    return;
                                }
                                if (!project) return;
                                try {
                                    await portalAPI.requestChat(token, { user_id: project.created_by });
                                    toast("Chat Request Sent!", "success");
                                    setChatStatus('requested');
                                } catch (err) {
                                    toast(err.response?.data?.error || "Error", "error");
                                }
                            }}
                        >
                             <MessageSquare size={16} /> 
                             {chatStatus === 'requested' ? 'Access Pending...' : 
                              chatStatus === 'approved' ? 'Open Chat' : 
                              chatStatus === 'rejected' ? 'Access Denied' : 'Request Chat Access'}
                        </button>
                    </div>

                    {/* Referral Card */}
                    <div className="card referral-card">
                        <Share2 className="ref-icon" />
                        <h4>Refer & Earn 10%</h4>
                        <p>Loving your product? Refer us to another client and earn 10% cashback on your next invoice.</p>
                        <button className="btn btn-outline btn-block" onClick={() => {
                            navigator.clipboard.writeText("Check out Appnity Softwares for high-end web/app development!");
                            toast("Referral link copied!", "success");
                        }}>Copy Referral Link</button>
                    </div>

                    {/* Quick Access Card */}
                    <div className="card quick-card">
                        <h4>Need Assistance?</h4>
                        <button className="q-link" onClick={() => setShowTicketModal(true)}>
                            <LifeBuoy size={16} /> Raise Support Ticket
                        </button>
                        <button className="q-link" onClick={() => toast("Redirecting to billing...", "info")}>
                            <FileText size={16} /> Request Quotation
                        </button>
                    </div>

                    {/* Help Heart */}
                    <div className="help-heart">
                        <Heart size={20} fill="#ef4444" stroke="none" />
                        <span>Built with care by Appnity</span>
                    </div>
                </aside>
            </div>

            {showTicketModal && (
                <Modal title="Report an Issue" onClose={() => setShowTicketModal(false)}>
                    <form onSubmit={handleRaiseTicket} className="portal-form">
                        <div className="form-group">
                            <label>Subject</label>
                            <input required value={ticketForm.subject} onChange={e => setTicketForm({...ticketForm, subject: e.target.value})} placeholder="E.g. Error in beta build" />
                        </div>
                        <div className="form-group">
                            <label>Detailed Description</label>
                            <textarea required rows={4} value={ticketForm.description} onChange={e => setTicketForm({...ticketForm, description: e.target.value})} placeholder="What's happening?" />
                        </div>
                        <div className="form-group">
                            <label>Priority</label>
                            <select value={ticketForm.priority} onChange={e => setTicketForm({...ticketForm, priority: e.target.value})}>
                                <option value="low">Low - Minor issue</option>
                                <option value="medium">Medium - Standard issue</option>
                                <option value="high">High - Critical blocker</option>
                            </select>
                        </div>
                        <div className="modal-footer" style={{ marginTop: 20 }}>
                            <button type="button" className="btn btn-secondary" onClick={() => setShowTicketModal(false)} style={{ marginRight: 10 }}>Back</button>
                            <button type="submit" className="btn btn-indigo" disabled={savingTicket}>
                                {savingTicket ? 'Submitting...' : 'Send Request'}
                            </button>
                        </div>
                    </form>
                </Modal>
            )}

            {showSowModal && (
                <Modal title="Propose Statement of Work" onClose={() => setShowSowModal(false)}>
                    <form onSubmit={handleUpdateSOW} className="portal-form">
                        <div className="form-group">
                            <label>Scope of Work / Requirements</label>
                            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: 10 }}>
                                Provide a detailed list of features, deadlines, and technical requirements you expect for this project.
                            </p>
                            <textarea 
                                required 
                                rows={10} 
                                value={sowForm.sow} 
                                onChange={e => setSowForm({sow: e.target.value})} 
                                placeholder="E.g. 1. Authentication system, 2. Payment dashboard..." 
                                style={{ fontSize: '0.9rem', lineHeight: '1.5' }}
                            />
                        </div>
                        <div className="modal-footer" style={{ marginTop: 24 }}>
                            <button type="button" className="btn btn-secondary" onClick={() => setShowSowModal(false)} style={{ marginRight: 10 }}>Cancel</button>
                            <button type="submit" className="btn btn-indigo" disabled={savingSOW}>
                                {savingSOW ? 'Saving...' : 'Submit Proposal'}
                            </button>
                        </div>
                    </form>
                </Modal>
            )}

            <GlobalHelpButton />

            <style>{`
                .portal-page {
                    min-height: 100vh;
                    background: var(--bg-body);
                    color: var(--text-primary);
                    padding-bottom: 60px;
                }
                .portal-hero {
                    background: linear-gradient(135deg, #4f46e5 0%, #1e1b4b 100%);
                    padding: 80px 0;
                    color: white;
                    margin-bottom: -60px;
                    text-align: left;
                }
                .hero-content { max-width: 850px; }
                .brand-badge {
                    display: inline-block;
                    padding: 6px 14px;
                    background: rgba(255,255,255,0.1);
                    border: 1px solid rgba(255,255,255,0.2);
                    border-radius: 30px;
                    font-size: 0.75rem;
                    font-weight: 700;
                    text-transform: uppercase;
                    letter-spacing: 1.5px;
                    margin-bottom: 25px;
                }
                .hero-content h1 { font-size: 3rem; font-weight: 900; margin-bottom: 15px; letter-spacing: -1px; }
                .hero-content p { font-size: 1.25rem; opacity: 0.8; margin-bottom: 40px; line-height: 1.5; }
                .hero-stats { display: flex; gap: 20px; flex-wrap: wrap; }
                .stat-pill {
                    display: flex;
                    align-items: center;
                    gap: 10px;
                    padding: 10px 20px;
                    background: rgba(255,255,255,0.08);
                    border-radius: 16px;
                    font-size: 0.9rem;
                    font-weight: 600;
                    backdrop-filter: blur(12px);
                    border: 1px solid rgba(255,255,255,0.1);
                }
                .stat-pill.primary { background: #6366f1; border-color: #818cf8; }

                .portal-container { max-width: 1300px; margin: 0 auto; padding: 0 40px; }
                .portal-content-grid { display: grid; grid-template-columns: 1fr 360px; gap: 60px; }
                
                .glass-card {
                    background: var(--bg-card);
                    border: 1px solid var(--border);
                    border-radius: 30px;
                    padding: 40px;
                    margin-bottom: 50px;
                    box-shadow: 0 10px 30px rgba(0,0,0,0.03);
                    transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
                }
                .glass-card:hover { transform: translateY(-8px); box-shadow: 0 30px 60px rgba(0,0,0,0.08); border-color: var(--primary-200); }
                
                .card-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 30px; }
                .card-title { font-size: 1.5rem; font-weight: 900; display: flex; align-items: center; gap: 15px; letter-spacing: -0.5px; }
                
                .milestone-track { display: flex; align-items: center; justify-content: space-between; padding: 30px 0; max-width: 90%; margin: 0 auto; }
                .milestone-node { position: relative; display: flex; flex-direction: column; align-items: center; gap: 15px; z-index: 1; }
                .node-icon { 
                    width: 44px; height: 44px; background: var(--bg-hover); border: 2px solid var(--border); 
                    border-radius: 50%; display: flex; align-items: center; justify-content: center; color: var(--text-muted); 
                    transition: 0.4s;
                }
                .milestone-node.active .node-icon { background: #4f46e5; border-color: #4f46e5; color: white; box-shadow: 0 0 20px rgba(79, 70, 229, 0.4); }
                .milestone-node span { font-size: 0.9rem; font-weight: 800; color: var(--text-muted); }
                .milestone-node.active span { color: var(--text-primary); }
                .milestone-line { flex: 1; height: 3px; background: var(--border); margin: 0 -15px; margin-top: -30px; }

                .mini-kanban { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; }
                .kanban-col { background: var(--bg-hover); padding: 20px; border-radius: 20px; min-height: 150px; border: 1px solid var(--border-light); }
                .col-label { font-size: 0.75rem; font-weight: 900; color: var(--text-muted); margin-bottom: 20px; text-transform: uppercase; letter-spacing: 1px; }
                .task-mini-card { background: var(--bg-card); padding: 12px 16px; border-radius: 12px; font-size: 0.9rem; font-weight: 700; margin-bottom: 12px; border: 1px solid var(--border); box-shadow: var(--shadow-sm); }
                
                .card-group-two { display: grid; grid-template-columns: 1fr 1fr; gap: 60px; margin-bottom: 50px; }
                .card-group-two .glass-card { margin-bottom: 0; }
                
                .vault-list { display: flex; flex-direction: column; gap: 12px; }
                .vault-item { display: flex; align-items: center; gap: 12px; padding: 15px 20px; background: var(--bg-hover); border-radius: 16px; font-weight: 700; transition: all 0.3s; color: var(--text-secondary); }
                .vault-item:hover { background: var(--primary-50); color: #4f46e5; transform: translateX(5px); }
                
                .sow-card.accepted { border-color: #10b981; background: #f0fdf4; }
                .sow-summary { font-size: 1rem; color: var(--text-secondary); line-height: 1.6; margin-bottom: 25px; font-style: italic; }

                .portal-timeline { display: flex; flex-direction: column; gap: 30px; }
                .timeline-entry { position: relative; padding-left: 30px; border-left: 3px solid #eef2ff; }
                .entry-header { display: flex; gap: 15px; align-items: center; margin-bottom: 15px; }
                .entry-user { width: 42px; height: 42px; background: #4f46e5; color: white; border-radius: 12px; display: flex; align-items: center; justify-content: center; font-weight: 900; font-size: 1.1rem; }
                .entry-meta { display: flex; flex-direction: column; }
                .entry-meta strong { font-size: 1.1rem; font-weight: 800; }
                .entry-meta span { font-size: 0.8rem; color: var(--text-muted); }
                .entry-desc { font-size: 1rem; color: var(--text-secondary); margin-bottom: 20px; line-height: 1.7; }
                .entry-comments { background: var(--bg-hover); padding: 25px; border-radius: 24px; border: 1px solid var(--border-light); }
                .comment-bubble { font-size: 0.95rem; margin-bottom: 12px; background: var(--bg-card); padding: 12px 18px; border-radius: 14px; border: 1px solid var(--border); }
                .comment-input { width: 100%; background: var(--bg-card); border: 1px solid var(--border); padding: 14px 20px; border-radius: 14px; outline: none; transition: 0.3s; font-weight: 500; }
                .comment-input:focus { border-color: #4f46e5; box-shadow: 0 0 0 4px rgba(79, 70, 229, 0.1); }

                .portal-invoices { display: flex; flex-direction: column; gap: 20px; }
                .inv-row { display: flex; align-items: center; justify-content: space-between; padding: 25px; background: var(--bg-hover); border-radius: 20px; border: 1px solid var(--border); transition: 0.3s; }
                .inv-row:hover { border-color: var(--primary-300); background: var(--bg-card); }
                .inv-row.paid { border-left: 6px solid #10b981; }
                .inv-info { display: flex; flex-direction: column; gap: 4px; }
                .inv-num { font-weight: 900; font-size: 1.1rem; }
                .inv-date { font-size: 0.85rem; color: var(--text-muted); }
                .inv-amount { font-size: 1.4rem; font-weight: 900; color: var(--text-primary); letter-spacing: -0.5px; }
                .paid-badge { background: #f0fdf4; color: #059669; padding: 6px 14px; border-radius: 20px; font-weight: 800; font-size: 0.85rem; display: flex; align-items: center; gap: 6px; }

                .portal-sidebar { display: flex; flex-direction: column; gap: 30px; position: sticky; top: 100px; height: fit-content; }
                .PM-card { background: var(--bg-card); border: 1px solid var(--border); border-radius: 30px; padding: 35px; box-shadow: var(--shadow-md); }
                .PM-card h4 { margin-bottom: 25px; font-weight: 900; font-size: 1.1rem; }
                .pm-info { display: flex; align-items: center; gap: 15px; margin-bottom: 25px; }
                .pm-avatar { width: 50px; height: 50px; background: #6366f1; color: white; border-radius: 15px; display: flex; align-items: center; justify-content: center; font-weight: 900; font-size: 1.2rem; }
                .pm-text { display: flex; flex-direction: column; }
                .pm-text strong { font-size: 1rem; font-weight: 800; }
                .pm-text span { font-size: 0.8rem; color: var(--text-muted); }
                
                .referral-card { background: linear-gradient(135deg, #1e1b4b 0%, #312e81 100%); color: white; padding: 35px; border-radius: 30px; text-align: center; box-shadow: 0 20px 40px rgba(30, 27, 75, 0.2); }
                .ref-icon { font-size: 40px; color: #fbbf24; margin-bottom: 20px; }
                .referral-card h4 { font-weight: 900; font-size: 1.2rem; margin-bottom: 10px; }
                .referral-card p { font-size: 0.9rem; opacity: 0.8; margin-bottom: 25px; line-height: 1.5; }

                .quick-card { padding: 35px; border-radius: 30px; }
                .quick-card h4 { margin-bottom: 20px; font-weight: 900; }
                .q-link { 
                    display: flex; align-items: center; gap: 12px; width: 100%; padding: 15px; background: none; 
                    border: none; border-bottom: 1px solid var(--border-light); color: var(--text-primary); font-weight: 700; 
                    text-align: left; transition: all 0.3s;
                }
                .q-link:last-child { border-bottom: none; }
                .q-link:hover { padding-left: 20px; color: #4f46e5; background: #f5f3ff; border-radius: 12px; }

                .help-heart { display: flex; align-items: center; justify-content: center; gap: 12px; margin-top: 30px; color: var(--text-muted); font-size: 0.85rem; font-weight: 800; }

                .btn-indigo { background: #4f46e5; color: white; transition: 0.3s; font-weight: 800; }
                .btn-indigo:hover { background: #4338ca; transform: translateY(-2px); box-shadow: 0 10px 20px rgba(79, 70, 229, 0.2); }
                .btn-block { width: 100%; display: flex; justify-content: center; gap: 12px; margin-top: 15px; padding: 14px; border-radius: 16px; font-size: 0.95rem; }
                .btn-outline { background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.2); backdrop-filter: blur(10px); }
                .btn-outline:hover { background: rgba(255,255,255,0.1); border-color: rgba(255,255,255,0.3); }

                .text-green-500 { color: #10b981; }
                .badge-outline { padding: 4px 12px; border: 1px solid #4f46e5; color: #4f46e5; border-radius: 20px; font-size: 0.7rem; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px; }

                .portal-loading, .portal-error { min-height: 100vh; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 20px; text-align: center; padding: 40px; }
                .portal-error h1 { font-size: 2rem; font-weight: 900; }
                
                @media (max-width: 1200px) {
                    .portal-content-grid { grid-template-columns: 1fr; gap: 40px; }
                    .portal-sidebar { position: static; }
                    .card-group-two { grid-template-columns: 1fr; gap: 40px; }
                }
            `}</style>
        </div>
    );
}
