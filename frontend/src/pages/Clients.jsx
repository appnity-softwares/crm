import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/ui/Toast';
import { clientAPI, projectAPI } from '../services/api';
import Modal from '../components/ui/Modal';
import DataTable from '../components/ui/DataTable';
import { UserPlus, Eye, Edit2, Trash2, Mail, Phone, Briefcase, DollarSign, Ticket, FileText, CheckCircle, Clock, AlertCircle, UserMinus, UserCheck } from 'lucide-react';

export default function Clients() {
    const { isAdmin, hasElevated } = useAuth();
    const toast = useToast();
    const [clients, setClients] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [showDetail, setShowDetail] = useState(false);
    const [editing, setEditing] = useState(null);
    const [selectedClient, setSelectedClient] = useState(null);
    const [clientDetail, setClientDetail] = useState(null);
    const [detailLoading, setDetailLoading] = useState(false);
    const [creating, setCreating] = useState(false);
    const [form, setForm] = useState({ name: '', email: '', password: '', role: 'client', phone: '' });
    const [activeTab, setActiveTab] = useState('overview');

    const loadData = async () => {
        try {
            setLoading(true);
            const { data } = await clientAPI.getAll();
            setClients(data.clients || []);
        } catch { 
            toast('Failed to load clients', 'error'); 
        } finally { 
            setLoading(false); 
        }
    };

    useEffect(() => { loadData(); }, []);

    const fetchDetail = async (id) => {
        setDetailLoading(true);
        try {
            const { data } = await clientAPI.get(id);
            setClientDetail(data);
            setShowDetail(true);
        } catch {
            toast('Failed to fetch client details', 'error');
        } finally {
            setDetailLoading(false);
        }
    };

    const handleSOWApprove = async (projectId) => {
        try {
            await projectAPI.update(projectId, { sow_accepted_by_admin: true });
            toast('SOW Approved successfully');
            fetchDetail(clientDetail.client.id);
        } catch {
            toast('Failed to approve SOW', 'error');
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setCreating(true);
        try {
            if (editing) {
                const payload = { ...form };
                if (!payload.password) delete payload.password;
                await clientAPI.update(editing, payload);
                toast('Client updated successfully', 'success');
            } else {
                await clientAPI.create(form);
                toast('Client created successfully', 'success');
            }
            setShowModal(false);
            setEditing(null);
            setForm({ name: '', email: '', password: '', role: 'client', phone: '' });
            loadData();
        } catch (err) { 
            toast(err.response?.data?.error || 'Failed to save', 'error'); 
        } finally { 
            setCreating(false); 
        }
    };

    const columns = [
        { 
            header: 'Client ID', 
            accessor: 'id', 
            render: r => <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>#{r.id?.slice(0, 8)}</span> 
        },
        {
            header: 'Name',
            accessor: 'name',
            render: (r) => (
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <span style={{ fontWeight: 600 }}>{r.name}</span>
                    {r.phone && <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}><Phone size={10} style={{ marginRight: 4 }} />{r.phone}</span>}
                </div>
            )
        },
        { 
            header: 'Status', 
            accessor: 'is_active',
            render: r => <span className={`badge ${r.is_active ? 'green' : 'red'}`}>{r.is_active ? 'Active' : 'Inactive'}</span>
        },
        {
            header: 'Actions',
            key: 'actions',
            render: (row) => (
                <div style={{ display: 'flex', gap: 8 }}>
                    <button className="btn btn-sm btn-secondary" onClick={() => fetchDetail(row.id)} title="View Detail">
                        <Eye size={12} />
                    </button>
                    {hasElevated && (
                        <>
                            <button className="btn btn-sm btn-secondary" onClick={() => {
                                setEditing(row.id);
                                setForm({ name: row.name, email: row.email, password: '', role: 'client', phone: row.phone || '' });
                                setShowModal(true);
                            }} title="Edit"><Edit2 size={12} /></button>
                            {row.is_active ? (
                                <button className="btn btn-sm btn-warning" onClick={async () => {
                                    if(window.confirm('Deactivate client?')) {
                                        await clientAPI.delete(row.id);
                                        toast('Client deactivated');
                                        loadData();
                                    }
                                }} title="Deactivate"><UserMinus size={12} /></button>
                            ) : (
                                <button className="btn btn-sm btn-success" onClick={async () => {
                                    await clientAPI.activate(row.id);
                                    toast('Client activated');
                                    loadData();
                                }} title="Activate"><UserCheck size={12} /></button>
                            )}
                            {isAdmin && (
                                <button className="btn btn-sm btn-danger" onClick={async () => {
                                    if(window.confirm('PERMANENTLY DELETE this client?')) {
                                        // Hard delete endpoint needed or reuse delete if it handles it
                                        await clientAPI.delete(row.id); 
                                        loadData();
                                    }
                                }} title="Delete"><Trash2 size={12} /></button>
                            )}
                        </>
                    )}
                </div>
            )
        }
    ];

    return (
        <div className="page-content">
            <div className="header" style={{ padding: 0, border: 'none', marginBottom: 24, background: 'transparent' }}>
                <div className="header-left">
                    <h1>Clients</h1>
                    <p>Manage your external clients and their professional engagements</p>
                </div>
                {isAdmin && (
                    <div className="header-actions">
                        <button className="btn btn-primary" onClick={() => { setEditing(null); setForm({ name: '', email: '', password: '', role: 'client', phone: '' }); setShowModal(true); }}>
                            <UserPlus size={15} /> Add New Client
                        </button>
                    </div>
                )}
            </div>

            <div className="card">
                {loading ? <div className="spinner" /> : (
                    <DataTable 
                        columns={columns} 
                        data={clients} 
                        searchable={true} 
                        pageSize={10} 
                        filters={[
                            {
                                key: 'is_active',
                                label: 'Status',
                                options: [
                                    { value: 'true', label: 'Active Only' },
                                    { value: 'false', label: 'Inactive Only' }
                                ]
                            }
                        ]}
                    />
                )}
            </div>

            {/* Client Detail Modal */}
            {showDetail && clientDetail && (
                <Modal title={`Client: ${clientDetail.client.name}`} onClose={() => setShowDetail(false)} size="large">
                    <div className="client-detail-container">
                        <div className="detail-tabs">
                            <button className={activeTab === 'overview' ? 'active' : ''} onClick={() => setActiveTab('overview')}>Overview</button>
                            <button className={activeTab === 'projects' ? 'active' : ''} onClick={() => setActiveTab('projects')}>Projects ({clientDetail.stats.project_count})</button>
                            <button className={activeTab === 'finance' ? 'active' : ''} onClick={() => setActiveTab('finance')}>Financials</button>
                            <button className={activeTab === 'tickets' ? 'active' : ''} onClick={() => setActiveTab('tickets')}>Support ({clientDetail.stats.ticket_count})</button>
                        </div>

                        <div className="detail-content">
                            {activeTab === 'overview' && (
                                <div className="overview-tab">
                                    <div className="stats-grid">
                                        <div className="stat-card">
                                            <Briefcase size={20} className="blue" />
                                            <div><h3>{clientDetail.stats.project_count}</h3><p>Projects</p></div>
                                        </div>
                                        <div className="stat-card">
                                            <DollarSign size={20} className="green" />
                                            <div><h3>₹{clientDetail.stats.total_paid.toLocaleString()}</h3><p>Total Paid</p></div>
                                        </div>
                                        <div className="stat-card">
                                            <Ticket size={20} className="amber" />
                                            <div><h3>{clientDetail.stats.ticket_count}</h3><p>Tickets</p></div>
                                        </div>
                                    </div>
                                    <div className="info-list">
                                        <div className="info-item"><Mail size={14} /> <span>{clientDetail.client.email}</span></div>
                                        <div className="info-item"><Phone size={14} /> <span>{clientDetail.client.phone || 'No phone'}</span></div>
                                        <div className="info-item"><Clock size={14} /> <span>Joined {new Date(clientDetail.client.created_at).toLocaleDateString()}</span></div>
                                    </div>
                                </div>
                            )}

                            {activeTab === 'projects' && (
                                <div className="projects-tab">
                                    {clientDetail.projects.length === 0 ? <p className="empty">No projects assigned.</p> : (
                                        clientDetail.projects.map(p => (
                                            <div key={p.id} className="detail-project-card">
                                                <div className="project-top">
                                                    <div>
                                                        <h4>{p.name}</h4>
                                                        <span className={`badge ${p.status === 'active' ? 'green' : 'gray'}`}>{p.status}</span>
                                                    </div>
                                                    <div className="progress-mini">
                                                        <span>{p.progress}%</span>
                                                        <div className="bar"><div style={{ width: `${p.progress}%` }} /></div>
                                                    </div>
                                                </div>
                                                <div className="project-sow">
                                                    <div className="sow-header">
                                                        <FileText size={14} /> <strong>Project Agreement (SOW)</strong>
                                                    </div>
                                                    <div className="sow-content">{p.sow || 'No SOW document provided.'}</div>
                                                    <div className="sow-status">
                                                        <div className={`status-item ${p.sow_accepted_by_client ? 'success' : 'pending'}`}>
                                                            {p.sow_accepted_by_client ? <CheckCircle size={12}/> : <AlertCircle size={12}/>} Client Accepted
                                                        </div>
                                                        <div className={`status-item ${p.sow_accepted_by_admin ? 'success' : 'pending'}`}>
                                                            {p.sow_accepted_by_admin ? <CheckCircle size={12}/> : <AlertCircle size={12}/>} Admin Accepted
                                                        </div>
                                                        {isAdmin && !p.sow_accepted_by_admin && (
                                                            <button className="btn btn-sm btn-primary" onClick={() => handleSOWApprove(p.id)}>Approve SOW</button>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            )}

                            {activeTab === 'finance' && (
                                <div className="finance-tab">
                                    <div className="total-summary">
                                        <div className="sum-box"><span>Total Value</span><h3>₹{(clientDetail.stats.total_paid + clientDetail.stats.total_pending).toLocaleString()}</h3></div>
                                        <div className="sum-box green"><span>Total Paid</span><h3>₹{clientDetail.stats.total_paid.toLocaleString()}</h3></div>
                                        <div className="sum-box amber"><span>Pending Installments</span><h3>₹{clientDetail.stats.total_pending.toLocaleString()}</h3></div>
                                    </div>
                                    <table className="detail-table">
                                        <thead><tr><th>Invoices</th><th>Status</th><th>Total</th><th>Paid</th></tr></thead>
                                        <tbody>
                                            {clientDetail.invoices.map(inv => (
                                                <tr key={inv.id}>
                                                    <td>{inv.invoice_number} <br/><small>{new Date(inv.issued_at).toLocaleDateString()}</small></td>
                                                    <td><span className={`badge ${inv.status==='paid'?'green':'amber'}`}>{inv.status}</span></td>
                                                    <td>₹{inv.total}</td>
                                                    <td>₹{inv.paid_amount}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}

                            {activeTab === 'tickets' && (
                                <div className="tickets-tab">
                                    {clientDetail.tickets.length === 0 ? <p className="empty">No tickets found.</p> : (
                                        clientDetail.tickets.map(t => (
                                            <div key={t.id} className="detail-ticket-card">
                                                <div className="ticket-header">
                                                    <strong>{t.subject}</strong>
                                                    <span className={`badge ${t.status === 'open' ? 'red' : 'gray'}`}>{t.status}</span>
                                                </div>
                                                <p>{t.description}</p>
                                                <small>{new Date(t.created_at).toLocaleString()}</small>
                                            </div>
                                        ))
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </Modal>
            )}

            {/* Profile Modal */}
            {showModal && (
                <Modal title={editing ? "Edit Client Profile" : "Create New Client Account"} onClose={() => setShowModal(false)}>
                    <form onSubmit={handleSubmit}>
                        <div className="form-grid">
                            <div className="form-group full">
                                <label>Client Full Name *</label>
                                <input required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
                            </div>
                            <div className="form-group">
                                <label>Client Email *</label>
                                <input type="email" required value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
                            </div>
                            <div className="form-group">
                                <label>Portal Password</label>
                                <input type="password" required={!editing} value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} />
                            </div>
                            <div className="form-group full">
                                <label>Phone Number</label>
                                <input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} />
                            </div>
                        </div>
                        <div className="form-actions">
                            <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                            <button type="submit" className="btn btn-primary" disabled={creating}>{creating ? 'Saving...' : editing ? 'Update' : 'Create'}</button>
                        </div>
                    </form>
                </Modal>
            )}

            <style>{`
                .client-detail-container { min-height: 480px; display: flex; flex-direction: column; }
                .detail-tabs { display: flex; border-bottom: 2px solid var(--border); margin-bottom: 20px; gap: 20px; }
                .detail-tabs button { background: none; border: none; padding: 10px 5px; font-weight: 600; color: var(--text-muted); cursor: pointer; position: relative; }
                .detail-tabs button.active { color: var(--primary-500); }
                .detail-tabs button.active:after { content: ''; position: absolute; bottom: -2px; left: 0; right: 0; height: 2px; background: var(--primary-500); }
                
                .detail-content { flex: 1; overflow-y: auto; max-height: 500px; }
                .stats-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 15px; margin-bottom: 25px; }
                .stat-card { background: var(--bg-hover); padding: 15px; border-radius: 10px; display: flex; align-items: center; gap: 12px; }
                .stat-card h3 { margin: 0; font-size: 1.2rem; }
                .stat-card p { margin: 0; font-size: 0.75rem; color: var(--text-muted); font-weight: 600; text-transform: uppercase; }
                
                .info-list { display: flex; flex-direction: column; gap: 12px; background: var(--bg-card); padding: 20px; border-radius: 12px; border: 1px solid var(--border); }
                .info-item { display: flex; align-items: center; gap: 10px; color: var(--text-primary); font-size: 0.9rem; }
                .info-item svg { color: var(--text-muted); }

                .detail-project-card { border: 1px solid var(--border); border-radius: 12px; padding: 15px; margin-bottom: 15px; background: var(--bg-card); }
                .project-top { display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px; }
                .project-top h4 { margin: 0; font-size: 1rem; }
                .progress-mini { width: 100px; font-size: 0.75rem; font-weight: 700; }
                .progress-mini .bar { height: 4px; background: var(--border); border-radius: 2px; margin-top: 4px; overflow: hidden; }
                .progress-mini .bar div { height: 100%; background: var(--primary-500); }

                .project-sow { background: var(--bg-hover); padding: 12px; border-radius: 8px; border: 1px dashed var(--border); }
                .sow-header { font-size: 0.8rem; display: flex; align-items: center; gap: 6px; margin-bottom: 8px; color: var(--text-muted); }
                .sow-content { font-size: 0.85rem; line-height: 1.5; color: var(--text-primary); margin-bottom: 12px; white-space: pre-wrap; }
                .sow-status { display: flex; align-items: center; gap: 15px; font-size: 0.75rem; font-weight: 600; }
                .status-item { display: flex; align-items: center; gap: 4px; padding: 4px 8px; border-radius: 6px; }
                .status-item.success { color: #15803d; background: #f0fdf4; }
                .status-item.pending { color: #b45309; background: #fffbeb; }

                .total-summary { display: flex; gap: 10px; margin-bottom: 20px; }
                .sum-box { flex: 1; padding: 15px; border-radius: 10px; border: 1px solid var(--border); }
                .sum-box h3 { margin: 0; font-size: 1.1rem; margin-top: 5px; }
                .sum-box span { font-size: 0.7rem; font-weight: 600; color: var(--text-muted); text-transform: uppercase; }
                .sum-box.green { background: #f0fdf4; border-color: #bbf7d0; color: #15803d; }
                .sum-box.amber { background: #fff9eb; border-color: #fef3c7; color: #b45309; }

                .detail-table { width: 100%; border-collapse: collapse; font-size: 0.85rem; }
                .detail-table th { text-align: left; padding: 10px; border-bottom: 1px solid var(--border); color: var(--text-muted); }
                .detail-table td { padding: 12px 10px; border-bottom: 1px solid var(--border); }

                .detail-ticket-card { border-bottom: 1px solid var(--border); padding: 12px 0; }
                .ticket-header { display: flex; justify-content: space-between; margin-bottom: 5px; }
                .detail-ticket-card p { margin: 0; font-size: 0.85rem; color: var(--text-secondary); margin-bottom: 4px; }
                .detail-ticket-card small { color: var(--text-muted); font-size: 0.7rem; }

                .empty { text-align: center; color: var(--text-muted); padding: 40px; font-style: italic; }
                .form-group.full { grid-column: span 2; }
            `}</style>
        </div>
    );
}
