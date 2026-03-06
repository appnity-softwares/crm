import { useState, useEffect } from 'react';
import { invoiceAPI, projectAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/ui/Toast';
import { useNotifications } from '../context/NotificationContext';
import Modal from '../components/ui/Modal';
import { Receipt, Plus, Download, Eye, CheckCircle, Clock, Edit2, FileText } from 'lucide-react';
import DataTable from '../components/ui/DataTable';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

export default function Invoices() {
    const { isAdmin } = useAuth();
    const toast = useToast();
    const { addNotification } = useNotifications();
    const [invoices, setInvoices] = useState([]);
    const [projects, setProjects] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editing, setEditing] = useState(null);
    const [showPreview, setShowPreview] = useState(null);
    const [form, setForm] = useState({ client_name: '', client_email: '', project_id: '', amount: '', tax: '0', due_date: '' });
    const [saving, setSaving] = useState(false);
    const [generating, setGenerating] = useState(false);

    const load = async () => {
        setLoading(true);
        try {
            const [invRes, projRes] = await Promise.all([invoiceAPI.getAll(), projectAPI.getAll()]);
            setInvoices(invRes.data.invoices || []);
            setProjects(projRes.data.projects || []);
        } catch { } finally { setLoading(false); }
    };

    useEffect(() => { load(); }, []);

    const handleDownloadPDF = async () => {
        if (!showPreview) return;
        setGenerating(true);
        const element = document.getElementById('invoice-capture');

        try {
            const canvas = await html2canvas(element, {
                scale: 2,
                useCORS: true,
                logging: false,
                backgroundColor: '#ffffff'
            });

            const imgData = canvas.toDataURL('image/png');
            const pdf = new jsPDF('p', 'mm', 'a4');
            const pdfWidth = pdf.internal.pageSize.getWidth();
            const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

            pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
            pdf.save(`Invoice_${showPreview.invoice_number}_${showPreview.client_name.replace(/\s+/g, '_')}.pdf`);
            toast('Invoice Downloaded!', 'success');
        } catch (err) {
            console.error(err);
            toast('Failed to generate PDF', 'error');
        } finally {
            setGenerating(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            const payload = { ...form, amount: parseFloat(form.amount), tax: parseFloat(form.tax || 0) };
            if (!payload.project_id) delete payload.project_id;

            if (editing) {
                await invoiceAPI.update(editing, payload);
                toast('Invoice updated successfully');
            } else {
                await invoiceAPI.create(payload);
                toast('Invoice created successfully');
                addNotification({
                    type: 'info',
                    title: 'Invoice Generated',
                    message: `Invoice created for ${form.client_name} - ${currency(form.amount)}`,
                });
            }
            setShowModal(false);
            setEditing(null);
            setForm({ client_name: '', client_email: '', project_id: '', amount: '', tax: '0', due_date: '' });
            load();
        } catch (err) {
            toast(err.response?.data?.error || 'Failed to save', 'error');
        } finally { setSaving(false); }
    };

    const handleEdit = (inv) => {
        setEditing(inv.id);
        setForm({
            client_name: inv.client_name,
            client_email: inv.client_email || '',
            project_id: inv.project_id || '',
            amount: inv.amount.toString(),
            tax: inv.tax.toString(),
            due_date: inv.due_date ? inv.due_date.split('T')[0] : ''
        });
        setShowModal(true);
    };

    const handleStatus = async (id, status) => {
        try {
            await invoiceAPI.updateStatus(id, { status });
            toast(`Invoice marked as ${status}`);
            if (status === 'paid') {
                const inv = invoices.find(i => i.id === id);
                addNotification({
                    type: 'success',
                    title: 'Payment Received',
                    message: `Payment of ${currency(inv?.total || 0)} confirmed from ${inv?.client_name}.`,
                });
            }
            load();
        } catch { toast('Failed', 'error'); }
    };

    const currency = (n) => `₹${Number(n).toLocaleString('en-IN')}`;
    const formatDate = (d) => d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

    const columns = [
        { header: 'Number', accessor: 'invoice_number', render: r => <span style={{ fontFamily: 'monospace', fontWeight: 700 }}>{r.invoice_number}</span> },
        { header: 'Client', accessor: 'client_name' },
        { header: 'Project', accessor: r => r.project?.name || '—' },
        { header: 'Amount', accessor: 'amount', render: r => currency(r.amount) },
        { header: 'Total', accessor: 'total', render: r => <span style={{ fontWeight: 700 }}>{currency(r.total)}</span> },
        { header: 'Due Date', accessor: 'due_date', render: r => formatDate(r.due_date) },
        {
            header: 'Status',
            accessor: 'status',
            render: (r) => {
                const map = { draft: 'gray', sent: 'blue', paid: 'green', overdue: 'red' };
                return <span className={`badge ${map[r.status] || 'gray'}`}>{r.status}</span>;
            }
        },
        {
            header: 'Actions',
            key: 'actions',
            render: (inv) => (
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <button className="btn btn-sm btn-secondary" onClick={() => setShowPreview(inv)} title="Preview">
                        <Download size={12} />
                    </button>
                    <button className="btn btn-sm btn-secondary" onClick={() => handleEdit(inv)} title="Edit">
                        <Edit2 size={12} />
                    </button>
                    {isAdmin && (
                        <select
                            className="btn btn-sm btn-secondary"
                            value=""
                            onChange={e => { if (e.target.value) handleStatus(inv.id, e.target.value); }}
                            style={{ padding: '4px 8px', fontSize: '0.75rem' }}
                        >
                            <option value="">Status...</option>
                            <option value="draft">Draft</option>
                            <option value="sent">Sent</option>
                            <option value="paid">Paid</option>
                            <option value="overdue">Overdue</option>
                        </select>
                    )}
                </div>
            )
        }
    ];

    return (
        <div>
            <div className="header">
                <div className="header-left">
                    <h1>Invoices</h1>
                    <p>Manage client billing and financial records</p>
                </div>
                <div className="header-actions">
                    <button className="btn btn-primary" onClick={() => { setEditing(null); setForm({ client_name: '', client_email: '', project_id: '', amount: '', tax: '0', due_date: '' }); setShowModal(true); }}>
                        <Plus size={15} /> New Invoice
                    </button>
                </div>
            </div>

            <div className="page-content">
                <div className="card">
                    {loading ? <div className="spinner" /> : (
                        <DataTable
                            columns={columns}
                            data={invoices}
                            pageSize={10}
                            emptyMessage="No invoices found."
                        />
                    )}
                </div>
            </div>

            {showModal && (
                <Modal title={editing ? "Edit Invoice" : "Create Invoice"} onClose={() => setShowModal(false)}>
                    <form onSubmit={handleSubmit}>
                        <div className="form-grid">
                            <div className="form-group">
                                <label>Client Name *</label>
                                <input required value={form.client_name} onChange={e => setForm({ ...form, client_name: e.target.value })} />
                            </div>
                            <div className="form-group">
                                <label>Client Email</label>
                                <input type="email" value={form.client_email} onChange={e => setForm({ ...form, client_email: e.target.value })} />
                            </div>
                            <div className="form-group full">
                                <label>Project</label>
                                <select value={form.project_id} onChange={e => setForm({ ...form, project_id: e.target.value })}>
                                    <option value="">— No Project —</option>
                                    {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                </select>
                            </div>
                            <div className="form-group">
                                <label>Amount (₹) *</label>
                                <input type="number" required value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} />
                            </div>
                            <div className="form-group">
                                <label>Tax (₹)</label>
                                <input type="number" value={form.tax} onChange={e => setForm({ ...form, tax: e.target.value })} />
                            </div>
                            <div className="form-group">
                                <label>Due Date *</label>
                                <input type="date" required value={form.due_date} onChange={e => setForm({ ...form, due_date: e.target.value })} />
                            </div>
                        </div>
                        <div className="form-actions">
                            <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                            <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Saving...' : editing ? 'Update Invoice' : 'Create Invoice'}</button>
                        </div>
                    </form>
                </Modal>
            )}
            {showPreview && (
                <Modal title={`Invoice ${showPreview.invoice_number}`} onClose={() => setShowPreview(null)} maxWidth="800px">
                    <div id="invoice-capture" style={{ padding: 40, background: '#fff', color: '#333', minHeight: 600 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 40 }}>
                            <div>
                                <h1 style={{ color: '#2563eb', margin: 0, fontSize: '2.5rem' }}>INVOICE</h1>
                                <p style={{ margin: '4px 0', color: '#666' }}>#{showPreview.invoice_number}</p>
                            </div>
                            <div style={{ textAlign: 'right' }}>
                                <h3 style={{ margin: 0 }}>APPNITY CORE</h3>
                                <p style={{ margin: '2px 0', fontSize: '0.85rem' }}>123 Business Hub, Tech Park</p>
                                <p style={{ margin: '2px 0', fontSize: '0.85rem' }}>Bangalore, KA 560001</p>
                            </div>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 40, marginBottom: 40 }}>
                            <div>
                                <h4 style={{ textTransform: 'uppercase', color: '#999', marginBottom: 8, fontSize: '0.75rem' }}>Billed To</h4>
                                <h3 style={{ margin: 0 }}>{showPreview.client_name}</h3>
                                <p style={{ margin: '4px 0', color: '#666' }}>{showPreview.client_email}</p>
                            </div>
                            <div style={{ textAlign: 'right' }}>
                                <h4 style={{ textTransform: 'uppercase', color: '#999', marginBottom: 8, fontSize: '0.75rem' }}>Details</h4>
                                <p style={{ margin: '4px 0' }}><strong>Issued:</strong> {formatDate(showPreview.created_at)}</p>
                                <p style={{ margin: '4px 0' }}><strong>Due Date:</strong> {formatDate(showPreview.due_date)}</p>
                                <p style={{ margin: '4px 0' }}><strong>Status:</strong> <span style={{ textTransform: 'uppercase', fontWeight: 700, color: showPreview.status === 'paid' ? 'green' : 'orange' }}>{showPreview.status}</span></p>
                            </div>
                        </div>

                        <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 40 }}>
                            <thead>
                                <tr style={{ borderBottom: '2px solid #eee' }}>
                                    <th style={{ textAlign: 'left', padding: '12px 0' }}>Description</th>
                                    <th style={{ textAlign: 'right', padding: '12px 0' }}>Amount</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr style={{ borderBottom: '1px solid #eee' }}>
                                    <td style={{ padding: '20px 0' }}>
                                        <strong>{showPreview.project?.name || 'Professional Services'}</strong>
                                        <p style={{ margin: '4px 0', fontSize: '0.85rem', color: '#666' }}>Comprehensive service billing and resource management.</p>
                                    </td>
                                    <td style={{ textAlign: 'right', padding: '20px 0' }}>{currency(showPreview.amount)}</td>
                                </tr>
                            </tbody>
                        </table>

                        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                            <div style={{ width: 250 }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                                    <span>Subtotal</span>
                                    <span>{currency(showPreview.amount)}</span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                                    <span>Tax</span>
                                    <span>{currency(showPreview.tax)}</span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 16, paddingTop: 16, borderTop: '2px solid #333', fontWeight: 800, fontSize: '1.25rem' }}>
                                    <span>Total</span>
                                    <span>{currency(showPreview.total)}</span>
                                </div>
                            </div>
                        </div>

                        <div style={{ marginTop: 80, fontSize: '0.75rem', color: '#999', textAlign: 'center' }}>
                            <p>Thank you for your business! Please settle the due amount by the date mentioned above.</p>
                            <p>Computer generated invoice. No signature required.</p>
                        </div>
                    </div>
                    <div className="form-actions" style={{ marginTop: 20 }}>
                        <button className="btn btn-secondary" onClick={() => setShowPreview(null)}>Close</button>
                        <button className="btn btn-primary" onClick={handleDownloadPDF} disabled={generating}>
                            {generating ? 'Generating...' : <><Download size={15} /> Save as PDF</>}
                        </button>
                    </div>
                </Modal>
            )}
        </div>
    );
}
