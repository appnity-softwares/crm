import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { portalAPI } from '../services/api';
import { useToast } from '../components/ui/Toast';
import { CheckCircle, Clock, ExternalLink, CreditCard, Layout, FileText, ArrowRight, LifeBuoy, Activity } from 'lucide-react';
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
    const [agreed, setAgreed] = useState(false);

    const load = async () => {
        try {
            const res = await portalAPI.getData(token);
            setData(res.data);
            const tRes = await portalAPI.getTickets(token);
            setTickets(tRes.data.tickets || []);
        } catch (err) {
            toast("Invalid portal link", "error");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        load();
    }, [token]);

    const handlePayment = async () => {
        setProcessing(true);
        try {
            const res = await portalAPI.initializePayment(token);
            const options = {
                key: res.data.key,
                amount: res.data.amount,
                currency: "INR",
                name: "Appnity Softwares Private Limited",
                description: "Invoice Payment",
                order_id: res.data.order_id,
                handler: async function (response) {
                    try {
                        await portalAPI.verifyPayment(token, {
                            razorpay_payment_id: response.razorpay_payment_id,
                            razorpay_order_id: response.razorpay_order_id,
                            razorpay_signature: response.razorpay_signature
                        });
                        toast("Payment Successful!", "success");
                        // Refresh data
                        const refresh = await portalAPI.getData(token);
                        setData(refresh.data);
                    } catch (err) {
                        toast("Payment verification failed", "error");
                    }
                },
                theme: { color: "#2563eb" }
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

    if (loading) return <div className="spinner" />;
    if (!data) return (
        <div style={{ textAlign: 'center', padding: '100px 20px' }}>
            <h1>Access Denied</h1>
            <p>This portal link is invalid or has expired.</p>
        </div>
    );

    const invoice = data.type === 'invoice' ? data.invoice : null;
    const project = data.type === 'project' ? data.project : (invoice?.project);
    const invoices = data.type === 'project' ? data.invoices : [invoice];

    return (
        <div className="portal-container" style={{ maxWidth: 1000, margin: '0 auto', padding: '40px 20px' }}>
            <div className="portal-header" style={{ marginBottom: 40, textAlign: 'center' }}>
                <h1 style={{ fontSize: '2.2rem', fontWeight: 800, marginBottom: 12 }}>Appnity Softwares - Client Portal</h1>
                <p style={{ color: 'var(--text-muted)' }}>Welcome! Track your project progress and manage invoices securely.</p>
            </div>

            <div className="portal-grid" style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 350px', gap: 30 }}>
                <div className="portal-main">
                    {project && (
                        <>
                            <div className="card" style={{ marginBottom: 30 }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                                    <div>
                                        <h3 style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                            <Layout size={20} className="text-primary" />
                                            Project: {project.name}
                                        </h3>
                                        <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>{project.description}</p>
                                    </div>
                                    <div className="badge blue">{project.status}</div>
                                </div>

                                <div className="progress-section">
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
                                        <span style={{ fontWeight: 600 }}>Development Progress</span>
                                        <span style={{ fontWeight: 800, color: 'var(--primary-600)' }}>{project.progress || 0}%</span>
                                    </div>
                                    <div style={{ height: 12, background: 'var(--bg-hover)', borderRadius: 10, overflow: 'hidden' }}>
                                        <div style={{
                                            height: '100%',
                                            width: `${project.progress || 0}%`,
                                            background: 'linear-gradient(90deg, var(--primary-500), var(--primary-600))',
                                            transition: 'width 1s ease-out'
                                        }} />
                                    </div>
                                </div>
                            </div>

                            {/* New Kanban Board */}
                            <div className="card" style={{ marginBottom: 30 }}>
                                <h3 style={{ marginBottom: 20, display: 'flex', alignItems: 'center', gap: 10 }}>
                                    <Layout size={20} className="text-primary" />
                                    Internal Project Kanban (Read-Only)
                                </h3>
                                <div className="kanban-mini" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 15 }}>
                                    {[
                                        { id: 'todo', title: 'To Do', color: 'gray' },
                                        { id: 'doing', title: 'Doing', color: 'blue' },
                                        { id: 'done', title: 'Done', color: 'green' }
                                    ].map(col => (
                                        <div key={col.id} style={{ background: 'var(--bg-body)', borderRadius: 12, padding: 12 }}>
                                            <div style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 10 }}>{col.title}</div>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                                {(data.tasks || []).filter(t => t.status === col.id).map(task => (
                                                    <div key={task.id} style={{ background: 'white', padding: '10px 12px', borderRadius: 8, fontSize: '0.8rem', border: '1px solid var(--border)', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
                                                        <div style={{ fontWeight: 700, marginBottom: 4 }}>{task.title}</div>
                                                        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Priority: {task.priority}</div>
                                                    </div>
                                                ))}
                                                {(data.tasks || []).filter(t => t.status === col.id).length === 0 && <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textAlign: 'center', py: 2 }}>—</div>}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* New Deliverables Vault */}
                            <div className="card" style={{ marginBottom: 30 }}>
                                <h3 style={{ marginBottom: 15, display: 'flex', alignItems: 'center', gap: 10 }}>
                                    <CreditCard size={20} className="text-primary" />
                                    Deliverables & Asset Vault
                                </h3>
                                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: 20 }}>Quick access to your finalized designs, source code repositories, and documentation.</p>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 15 }}>
                                    {(data.resources || []).length > 0 ? data.resources.map(res => (
                                        <a key={res.id} href={res.link} target="_blank" rel="noopener noreferrer" style={{ 
                                            display: 'flex', 
                                            alignItems: 'center', 
                                            gap: 12, 
                                            padding: 16, 
                                            background: 'white', 
                                            border: '1px solid var(--border)', 
                                            borderRadius: 12,
                                            textDecoration: 'none',
                                            color: 'inherit',
                                            transition: 'transform 0.2s',
                                        }} onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-2px)'} onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}>
                                            <div style={{ width: 40, height: 40, borderRadius: 10, background: 'var(--primary-50)', color: 'var(--primary-600)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                {res.type === 'design' ? <Layout size={20} /> : <ExternalLink size={20} />}
                                            </div>
                                            <div style={{ flex: 1 }}>
                                                <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>{res.title}</div>
                                                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{res.type?.toUpperCase()} Deliverable</div>
                                            </div>
                                        </a>
                                    )) : <div style={{ gridColumn: 'span 2', textAlign: 'center', padding: 20, background: 'var(--bg-hover)', borderRadius: 12, color: 'var(--text-muted)' }}>No deliverables linked yet.</div>}
                                </div>
                            </div>

                            <div className="card" style={{ marginBottom: 30, border: '1px solid var(--amber-200)', background: 'var(--amber-50)' }}>
                                <h3 style={{ marginBottom: 15, display: 'flex', alignItems: 'center', gap: 10 }}>
                                    <FileText size={20} style={{ color: 'var(--amber-600)' }} />
                                    Project Agreement (SOW)
                                </h3>
                                <div style={{ 
                                    padding: 20, 
                                    background: 'white', 
                                    borderRadius: 12, 
                                    fontSize: '0.95rem',
                                    lineHeight: 1.6,
                                    whiteSpace: 'pre-wrap',
                                    maxHeight: 300,
                                    overflowY: 'auto',
                                    border: '1px solid var(--border)',
                                    marginBottom: 20
                                }}>
                                    {project.sow || "No agreement document uploaded yet."}
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 15 }}>
                                    <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.85rem', fontWeight: 600, color: project.sow_accepted_by_client ? 'var(--green-600)' : 'var(--amber-600)' }}>
                                            {project.sow_accepted_by_client ? <CheckCircle size={16} /> : <Clock size={16} />}
                                            {project.sow_accepted_by_client ? "Accepted by You" : "Awaiting Your Acceptance"}
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.85rem', fontWeight: 600, color: project.sow_accepted_by_admin ? 'var(--green-600)' : 'var(--amber-600)' }}>
                                            {project.sow_accepted_by_admin ? <CheckCircle size={16} /> : <Clock size={16} />}
                                            {project.sow_accepted_by_admin ? "Approved by Admin" : "Awaiting Admin Approval"}
                                        </div>
                                    </div>
                                    {!project.sow_accepted_by_client && (
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.85rem' }}>
                                                <input id="sow-agree" type="checkbox" required style={{ width: 16, height: 16, cursor: 'pointer' }} onChange={(e) => setAgreed(e.target.checked)} />
                                                <label htmlFor="sow-agree" style={{ cursor: 'pointer' }}>I agree to the terms and conditions</label>
                                            </div>
                                            <button 
                                                className="btn btn-primary"
                                                disabled={!agreed}
                                                onClick={async () => {
                                                    try {
                                                        await portalAPI.acceptSOW(token);
                                                        toast("SOW Accepted!", "success");
                                                        load();
                                                    } catch { toast("Failed to accept SOW", "error"); }
                                                }}
                                            >
                                                Accept & Proceed
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="card" style={{ marginBottom: 30 }}>
                                <h3 style={{ marginBottom: 20, display: 'flex', alignItems: 'center', gap: 10 }}>
                                    <Activity size={20} className="text-primary" />
                                    Project Updates & Timeline
                                </h3>
                                <div className="timeline" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                                    {(data.updates || []).length === 0 ? (
                                        <p style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '20px 0' }}>No updates posted yet.</p>
                                    ) : (
                                        data.updates.map(update => (
                                            <div key={update.id} className="timeline-item" style={{ padding: 20, background: 'var(--bg-hover)', borderRadius: 12, borderLeft: '4px solid var(--primary-500)' }}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
                                                    <div>
                                                        <h4 style={{ fontWeight: 700, fontSize: '1.05rem', color: 'var(--text-primary)' }}>{update.title}</h4>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
                                                            <div style={{ width: 16, height: 16, borderRadius: '50%', background: 'var(--primary-100)', color: 'var(--primary-700)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.6rem', fontWeight: 800 }}>
                                                                {update.author?.name?.charAt(0)}
                                                            </div>
                                                            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                                                Posted by <strong>{update.author?.name}</strong> • {new Date(update.created_at).toLocaleDateString()}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>
                                                <p style={{ fontSize: '0.95rem', color: 'var(--text-secondary)', marginBottom: 15, lineHeight: 1.6 }}>{update.description}</p>
                                                
                                                {update.link && (
                                                    <a href={update.link} target="_blank" rel="noopener noreferrer" className="btn btn-sm btn-secondary" style={{ marginBottom: 15, display: 'inline-flex', gap: 6, fontSize: '0.8rem', background: 'white' }}>
                                                        <ExternalLink size={14} /> View Deliverable
                                                    </a>
                                                )}

                                                <div className="comments-section" style={{ borderTop: '1px solid var(--border)', paddingTop: 15, marginTop: 5 }}>
                                                    <h5 style={{ fontSize: '0.8rem', fontWeight: 700, marginBottom: 10, color: 'var(--text-muted)' }}>Team Discussion</h5>
                                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 15 }}>
                                                        {(update.comments || []).map(comment => (
                                                            <div key={comment.id} style={{ padding: '8px 12px', background: 'white', borderRadius: 8, border: '1px solid var(--border)', fontSize: '0.85rem' }}>
                                                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                                                                    <span style={{ fontWeight: 700, color: 'var(--primary-700)' }}>{comment.user?.name}</span>
                                                                    <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>{new Date(comment.created_at).toLocaleTimeString()}</span>
                                                                </div>
                                                                <div>{comment.content}</div>
                                                            </div>
                                                        ))}
                                                        {(update.comments || []).length === 0 && <p style={{ fontSize: '0.8rem', fontStyle: 'italic', color: 'var(--text-muted)' }}>No comments yet.</p>}
                                                    </div>
                                                    
                                                    <div style={{ display: 'flex', gap: 10 }}>
                                                        <input 
                                                            className="form-control" 
                                                            style={{ height: 36, fontSize: '0.85rem' }} 
                                                            placeholder="Write a comment..." 
                                                            onKeyDown={async (e) => {
                                                                if (e.key === 'Enter' && e.target.value.trim()) {
                                                                    try {
                                                                        const text = e.target.value;
                                                                        e.target.value = '';
                                                                        // Since it's a portal, we might need a special API or just use the project update comments API if it allows portal tokens
                                                                        await portalAPI.postComment(token, { update_id: update.id, content: text });
                                                                        toast("Comment posted", "success");
                                                                        load(); // Refresh data
                                                                    } catch { toast("Failed to post comment", "error"); }
                                                                }
                                                            }}
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                        </>
                    )}

                    <div className="card">
                        <h3 style={{ marginBottom: 20, display: 'flex', alignItems: 'center', gap: 10 }}>
                            <FileText size={20} className="text-primary" />
                            Outstanding Invoices
                        </h3>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                            {invoices.length > 0 ? invoices.map(inv => (
                                <div key={inv.id} className="invoice-item" style={{
                                    padding: 20,
                                    borderRadius: 12,
                                    border: '1px solid var(--border)',
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center'
                                }}>
                                    <div>
                                        <div style={{ fontWeight: 700, fontSize: '1.1rem' }}>{inv.invoice_number}</div>
                                        <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Due: {new Date(inv.due_date).toLocaleDateString()}</div>
                                        <div style={{ marginTop: 8 }}>
                                            <span style={{ fontSize: '1.25rem', fontWeight: 800 }}>₹{inv.total.toLocaleString()}</span>
                                            {inv.paid_amount > 0 && (
                                                <span style={{ marginLeft: 10, fontSize: '0.85rem', color: 'var(--green-600)' }}>
                                                    (Paid: ₹{inv.paid_amount.toLocaleString()})
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                    <div style={{ textAlign: 'right' }}>
                                        <div className={`badge ${inv.status === 'paid' ? 'green' : 'amber'}`} style={{ marginBottom: 12 }}>{inv.status}</div>
                                        {inv.status !== 'paid' && (
                                            <button
                                                className="btn btn-primary"
                                                onClick={() => {
                                                    // Set local state if project view to handle specific invoice payment
                                                    // In simplest form, redirect or handle here
                                                    handlePayment();
                                                }}
                                                disabled={processing}
                                            >
                                                <CreditCard size={15} style={{ marginRight: 8 }} />
                                                {processing ? 'Processing...' : 'Pay Now'}
                                            </button>
                                        )}
                                    </div>
                                </div>
                            )) : (
                                <p style={{ textAlign: 'center', color: 'var(--text-muted)' }}>No invoices found.</p>
                            )}
                        </div>
                    </div>
                </div>

                <div className="portal-sidebar">
                    {project && (
                        <div className="card" style={{ marginBottom: 24 }}>
                            <h4 style={{ marginBottom: 15, fontSize: '0.95rem' }}>Project Team</h4>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                                {project.creator && (
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                        <div className="avatar sm" style={{ background: 'var(--primary-100)', color: 'var(--primary-700)' }}>
                                            {project.creator.name?.charAt(0)}
                                        </div>
                                        <div>
                                            <div style={{ fontSize: '0.85rem', fontWeight: 700 }}>{project.creator.name}</div>
                                            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Project Account Manager</div>
                                        </div>
                                    </div>
                                )}
                                {(project.assignments || []).map(asg => (
                                    <div key={asg.id} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                        <div className="avatar sm" style={{ background: 'var(--bg-hover)', color: 'var(--text-secondary)' }}>
                                            {asg.user?.name?.charAt(0)}
                                        </div>
                                        <div>
                                            <div style={{ fontSize: '0.85rem', fontWeight: 600 }}>{asg.user?.name}</div>
                                            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{asg.role === 'lead' ? 'Tech Lead' : 'Developer'}</div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    <div className="card" style={{ background: 'var(--primary-600)', color: 'white' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                            <LifeBuoy size={20} />
                            <h4 style={{ margin: 0 }}>Help & Support</h4>
                        </div>
                        <p style={{ fontSize: '0.85rem', opacity: 0.9, marginBottom: 20 }}>
                            Need immediate assistance? Raise a priority ticket and our team will get back to you within 4 hours.
                        </p>
                        <button
                            className="btn w-full btn-white"
                            style={{ background: 'white', color: 'var(--primary-600)', fontWeight: 700 }}
                            onClick={() => setShowTicketModal(true)}
                        >
                            Raise Support Ticket
                        </button>
                    </div>

                    <div className="card" style={{ marginTop: 24, border: '1px dashed var(--primary-300)', background: 'var(--primary-50)' }}>
                        <h4 style={{ color: 'var(--primary-700)', fontSize: '0.95rem' }}>Refer & Earn</h4>
                        <p style={{ fontSize: '0.8rem', color: 'var(--primary-600)', marginTop: 8 }}>
                            Think we're doing a great job? Refer a colleague and get <strong>10% OFF</strong> your next invoice!
                        </p>
                        <button className="btn btn-sm btn-primary" style={{ marginTop: 12, width: '100%' }}>Copy Referral Link</button>
                    </div>

                    <div className="card" style={{ marginTop: 24 }}>
                        <h4>My Tickets</h4>
                        <div style={{ marginTop: 15, display: 'flex', flexDirection: 'column', gap: 10 }}>
                            {tickets.length > 0 ? tickets.map(t => (
                                <div key={t.id} style={{ padding: 12, background: 'var(--bg-hover)', borderRadius: 10, border: '1px solid var(--border)' }}>
                                    <div style={{ fontSize: '0.85rem', fontWeight: 700 }}>{t.subject}</div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 6 }}>
                                        <span className={`badge ${t.status === 'open' ? 'red' : t.status === 'closed' ? 'green' : 'blue'}`} style={{ fontSize: '0.6rem', padding: '2px 8px' }}>{t.status}</span>
                                        <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>{new Date(t.created_at).toLocaleDateString()}</span>
                                    </div>
                                </div>
                            )) : <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textAlign: 'center', padding: '10px 0' }}>No active tickets.</p>}
                        </div>
                    </div>

                    <div className="card" style={{ marginTop: 24 }}>
                        <h4>Financial Summary</h4>
                        <div style={{ marginTop: 20, display: 'flex', flexDirection: 'column', gap: 12 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                <span className="text-muted">Total Billed</span>
                                <span style={{ fontWeight: 600 }}>₹{invoices.reduce((a, b) => a + b.total, 0).toLocaleString()}</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                <span className="text-muted">Total Paid</span>
                                <span style={{ fontWeight: 600, color: 'var(--green-600)' }}>₹{invoices.reduce((a, b) => a + (b.paid_amount || 0), 0).toLocaleString()}</span>
                            </div>
                            <hr style={{ border: 'none', borderTop: '1px solid var(--border)' }} />
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1.1rem', fontWeight: 800 }}>
                                <span>Balance Due</span>
                                <span style={{ color: 'var(--red-500)' }}>₹{invoices.reduce((a, b) => a + (b.total - (b.paid_amount || 0)), 0).toLocaleString()}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            {showTicketModal && (
                <Modal title="Raise Support Ticket" onClose={() => setShowTicketModal(false)}>
                    <form onSubmit={handleRaiseTicket}>
                        <div className="form-group">
                            <label>Subject</label>
                            <input required value={ticketForm.subject} onChange={e => setTicketForm({ ...ticketForm, subject: e.target.value })} placeholder="E.g. Issue with website loading" />
                        </div>
                        <div className="form-group" style={{ marginTop: 15 }}>
                            <label>Priority</label>
                            <select value={ticketForm.priority} onChange={e => setTicketForm({ ...ticketForm, priority: e.target.value })}>
                                <option value="low">Low</option>
                                <option value="medium">Medium</option>
                                <option value="high">High</option>
                            </select>
                        </div>
                        <div className="form-group" style={{ marginTop: 15 }}>
                            <label>Description</label>
                            <textarea required rows={4} value={ticketForm.description} onChange={e => setTicketForm({ ...ticketForm, description: e.target.value })} placeholder="Describe your issue in detail..." />
                        </div>
                        <div className="form-actions" style={{ marginTop: 20 }}>
                            <button type="button" className="btn btn-secondary" onClick={() => setShowTicketModal(false)}>Cancel</button>
                            <button type="submit" className="btn btn-primary" disabled={savingTicket}>{savingTicket ? 'Raising...' : 'Raise Ticket'}</button>
                        </div>
                    </form>
                </Modal>
            )}
            <GlobalHelpButton />
        </div>
    );
}
