import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { portalAPI } from '../services/api';
import { useToast } from '../components/ui/Toast';
import { CheckCircle, Clock, ExternalLink, CreditCard, Layout, FileText, ArrowRight, LifeBuoy } from 'lucide-react';
import Modal from '../components/ui/Modal';

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
                    <div className="card" style={{ background: 'var(--primary-600)', color: 'white' }}>
                        <h4>Help & Support</h4>
                        <p style={{ fontSize: '0.85rem', opacity: 0.9, marginTop: 10, marginBottom: 20 }}>
                            If you have any questions regarding your project or invoices, please reach out to our team.
                        </p>
                        <button
                            className="btn w-full"
                            style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.3)', color: 'white' }}
                            onClick={() => setShowTicketModal(true)}
                        >
                            Raise Support Ticket
                        </button>
                    </div>

                    <div className="card" style={{ marginTop: 24 }}>
                        <h4>My Tickets</h4>
                        <div style={{ marginTop: 15, display: 'flex', flexDirection: 'column', gap: 10 }}>
                            {tickets.length > 0 ? tickets.map(t => (
                                <div key={t.id} style={{ padding: 10, background: 'var(--bg-hover)', borderRadius: 8, border: '1px solid var(--border)' }}>
                                    <div style={{ fontSize: '0.8rem', fontWeight: 700 }}>{t.subject}</div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 }}>
                                        <span className={`badge ${t.status === 'open' ? 'red' : t.status === 'closed' ? 'green' : 'blue'}`} style={{ fontSize: '0.6rem' }}>{t.status}</span>
                                        <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>{new Date(t.created_at).toLocaleDateString()}</span>
                                    </div>
                                </div>
                            )) : <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>No tickets found.</p>}
                        </div>
                    </div>

                    <div className="card" style={{ marginTop: 24 }}>
                        <h4>Account Summary</h4>
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
                                <span>Total Due</span>
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
        </div>
    );
}
