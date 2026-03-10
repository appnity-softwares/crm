import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { dashboardAPI, balanceAPI, noticeAPI } from '../services/api';
import { Clock, FolderKanban, DollarSign, Activity, TrendingUp, Target, Users, Briefcase, FileText, UserPlus, Wallet, Plus, IndianRupee, Bell, Megaphone, Trash2 } from 'lucide-react';
import { CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Legend, PieChart, Pie, Cell, AreaChart, Area } from 'recharts';
import { useTheme } from '../context/ThemeContext';
import { useApi } from '../hooks/useApi';
import Modal from '../components/ui/Modal';

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];

export default function Dashboard() {
    const { user, hasElevated } = useAuth();
    const { dark } = useTheme();

    const { data: statsData, loading: statsLoading } = useApi(dashboardAPI.getStats);
    const { data: balanceData, loading: balanceLoading, refresh: refreshBalance } = useApi(balanceAPI.get);
    const { data: noticeData, refresh: refreshNotices } = useApi(noticeAPI.getAll);

    const [showBalanceModal, setShowBalanceModal] = useState(false);
    const [balanceInput, setBalanceInput] = useState({ amount: '', notes: '' });
    const [updatingBalance, setUpdatingBalance] = useState(false);
    const [showNoticeModal, setShowNoticeModal] = useState(false);
    const [noticeForm, setNoticeForm] = useState({ title: '', content: '', type: 'general' });
    const [savingNotice, setSavingNotice] = useState(false);

    const handleUpdateBalance = async (e) => {
        e.preventDefault();
        setUpdatingBalance(true);
        try {
            await balanceAPI.updateManual({
                amount: parseFloat(balanceInput.amount),
                notes: balanceInput.notes
            });
            refreshBalance();
            setShowBalanceModal(false);
            setBalanceInput({ amount: '', notes: '' });
        } catch (err) {
            console.error("Failed to update balance", err);
        } finally {
            setUpdatingBalance(false);
        }
    };

    const handleCreateNotice = async (e) => {
        e.preventDefault();
        setSavingNotice(true);
        try {
            await noticeAPI.create(noticeForm);
            refreshNotices();
            setShowNoticeModal(false);
            setNoticeForm({ title: '', content: '', type: 'general' });
        } catch { } finally { setSavingNotice(false); }
    };

    const handleDeleteNotice = async (id) => {
        if (!window.confirm("Delete this notice?")) return;
        try {
            await noticeAPI.remove(id);
            refreshNotices();
        } catch { }
    };

    const metrics = {
        employees: hasElevated ? (statsData?.employees || 0) : '-',
        projects: statsData?.projects || 0,
        attendance: statsData?.attendance || 0,
        leads: hasElevated ? (statsData?.leads || 0) : '-'
    };

    const projectData = statsData?.project_status?.map(ps => ({
        name: ps.Status.charAt(0).toUpperCase() + ps.Status.slice(1),
        count: ps.Count
    })) || [];

    const deptData = statsData?.departments?.map(d => ({
        name: d.Department || 'General',
        value: d.Count
    })) || [];

    const revenueData = statsData?.revenue_growth?.map(r => ({
        name: r.Month,
        revenue: r.Total
    })) || [];

    const greeting = () => {
        const h = new Date().getHours();
        if (h < 12) return 'Good Morning';
        if (h < 17) return 'Good Afternoon';
        return 'Good Evening';
    };

    if (statsLoading) return <div className="spinner" />;

    return (
        <div className="page-content">
            <div className="dashboard-header">
                <div className="dashboard-header-left">
                    <h1>{greeting()}, {user?.name?.split(' ')[0]} 👋</h1>
                    <p>Overview of your management workspace and team performance.</p>
                </div>
            </div>

            <div className="stats-grid">
                {hasElevated && (
                    <div className="stat-card" style={{ border: '2px solid var(--primary-100)', background: 'var(--primary-50)' }}>
                        <div className="stat-icon primary"><Wallet size={20} /></div>
                        <div className="stat-info">
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <h4>Total Balance</h4>
                                {user?.role === 'admin' && (
                                    <button onClick={() => setShowBalanceModal(true)} style={{ background: 'none', border: 'none', color: 'var(--primary-600)', cursor: 'pointer', padding: 4 }}>
                                        <Plus size={16} />
                                    </button>
                                )}
                            </div>
                            <div className="stat-value" style={{ color: 'var(--primary-700)' }}>
                                ₹{balanceData?.total_balance?.toLocaleString('en-IN') || '0'}
                            </div>
                            <div className="stat-sub">Available Funds</div>
                        </div>
                    </div>
                )}
                {hasElevated && (
                    <div className="stat-card">
                        <div className="stat-icon blue"><Users size={20} /></div>
                        <div className="stat-info">
                            <h4>Employees</h4>
                            <div className="stat-value">{metrics.employees}</div>
                            <div className="stat-sub">Total team members</div>
                        </div>
                    </div>
                )}
                <div className="stat-card">
                    <div className="stat-icon purple"><FolderKanban size={20} /></div>
                    <div className="stat-info">
                        <h4>Projects</h4>
                        <div className="stat-value">{metrics.projects}</div>
                        <div className="stat-sub">Resource allocation</div>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon green"><Clock size={20} /></div>
                    <div className="stat-info">
                        <h4>Attendance</h4>
                        <div className="stat-value">{metrics.attendance}</div>
                        <div className="stat-sub">Recorded entries</div>
                    </div>
                </div>
                {hasElevated && (
                    <div className="stat-card">
                        <div className="stat-icon amber"><Target size={20} /></div>
                        <div className="stat-info">
                            <h4>Leads</h4>
                            <div className="stat-value">{metrics.leads}</div>
                            <div className="stat-sub">Active pipeline</div>
                        </div>
                    </div>
                )}
            </div>

            <div className="dashboard-grid-2-1" style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 350px', gap: 24, marginBottom: 30 }}>
                <div className="card revenue-card" style={{ marginBottom: 0 }}>
                    <div className="card-header">
                        <h3><DollarSign size={16} /> Revenue Growth Trend</h3>
                    </div>
                    <div className="card-body">
                        <div style={{ width: '100%', height: 320, minHeight: 320 }}>
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={revenueData}>
                                    <defs>
                                        <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.15} />
                                            <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                                    <XAxis dataKey="name" stroke="var(--text-muted)" fontSize={12} tickLine={false} axisLine={false} />
                                    <YAxis stroke="var(--text-muted)" fontSize={12} tickLine={false} axisLine={false} tickFormatter={v => '₹' + v} />
                                    <Tooltip
                                        contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8 }}
                                    />
                                    <Area type="monotone" dataKey="revenue" stroke="#3b82f6" fillOpacity={1} fill="url(#colorRev)" />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>

                <div className="card notice-card" style={{ height: 'fit-content' }}>
                    <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <h3 style={{ display: 'flex', alignItems: 'center', gap: 8 }}><Megaphone size={16} color="var(--amber-500)" /> Notice Board</h3>
                        {hasElevated && (
                            <button className="btn btn-sm btn-secondary" onClick={() => setShowNoticeModal(true)} style={{ padding: '4px 8px' }}>
                                <Plus size={14} /> New
                            </button>
                        )}
                    </div>
                    <div className="card-body" style={{ maxHeight: 400, overflowY: 'auto', padding: '10px 0' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                            {noticeData?.notices?.length > 0 ? noticeData.notices.map(notice => (
                                <div key={notice.id} style={{ padding: '12px 16px', borderRadius: 12, background: 'var(--bg-hover)', position: 'relative' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                                        <span className={`badge ${notice.type === 'holiday' ? 'amber' : notice.type === 'win' ? 'green' : 'blue'}`} style={{ fontSize: '0.65rem' }}>{notice.type.toUpperCase()}</span>
                                        <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>{new Date(notice.created_at).toLocaleDateString()}</span>
                                    </div>
                                    <h4 style={{ margin: '0 0 4px 0', fontSize: '0.95rem' }}>{notice.title}</h4>
                                    <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: 1.4 }}>{notice.content}</p>
                                    {hasElevated && (
                                        <button
                                            onClick={() => handleDeleteNotice(notice.id)}
                                            style={{ position: 'absolute', top: 12, right: 12, background: 'none', border: 'none', color: 'var(--red-400)', cursor: 'pointer', padding: 4, visibility: 'hidden' }}
                                            className="hover-visible"
                                        >
                                            <Trash2 size={12} />
                                        </button>
                                    )}
                                </div>
                            )) : (
                                <div style={{ textAlign: 'center', padding: 20, color: 'var(--text-muted)', fontSize: '0.9rem' }}>No active notices.</div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            <div className="charts-grid shadow-charts">
                <div className="chart-card">
                    <h3 style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <Briefcase size={16} color="var(--primary-600)" />
                        Project Distribution
                    </h3>
                    <div style={{ width: '100%', height: 300, minHeight: 300, marginTop: 20 }}>
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={projectData}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                                <XAxis dataKey="name" stroke="var(--text-muted)" fontSize={12} tickLine={false} axisLine={false} />
                                <YAxis stroke="var(--text-muted)" fontSize={12} tickLine={false} axisLine={false} />
                                <Tooltip
                                    contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8 }}
                                    cursor={{ fill: 'var(--bg-hover)' }}
                                />
                                <Bar dataKey="count" fill="var(--primary-500)" radius={[4, 4, 0, 0]} barSize={40} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <div className="chart-card">
                    <h3 style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <Activity size={16} color="var(--green-600)" />
                        Attendance Trend
                    </h3>
                    <div style={{ width: '100%', height: 300, minHeight: 300, marginTop: 20 }}>
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={statsData?.attendance_trend || []}>
                                <defs>
                                    <linearGradient id="colorAtt" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.1} />
                                        <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                                <XAxis dataKey="Date" stroke="var(--text-muted)" fontSize={12} tickLine={false} axisLine={false} />
                                <YAxis stroke="var(--text-muted)" fontSize={12} tickLine={false} axisLine={false} />
                                <Tooltip contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8 }} />
                                <Area type="monotone" dataKey="Count" stroke="#10b981" fillOpacity={1} fill="url(#colorAtt)" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <div className="chart-card">
                    <h3 style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <Users size={16} color="var(--purple-600)" />
                        Departmental Breakdown
                    </h3>
                    <div style={{ width: '100%', height: 300, marginTop: 20 }}>
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={deptData}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={60}
                                    outerRadius={100}
                                    paddingAngle={5}
                                    dataKey="value"
                                >
                                    {deptData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip
                                    contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8 }}
                                />
                                <Legend verticalAlign="bottom" height={36} />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            <div className="dashboard-lower-grid">
                <div className="card">
                    <div className="card-header">
                        <h3 style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <Activity size={18} />
                            Recent Pipeline Activity (Leads)
                        </h3>
                    </div>
                    <div className="table-wrapper">
                        <table>
                            <thead>
                                <tr>
                                    <th>Name</th>
                                    <th>Company</th>
                                    <th>Source</th>
                                    <th>Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {statsData?.recent_leads?.map(lead => (
                                    <tr key={lead.id}>
                                        <td style={{ fontWeight: 600 }}>{lead.name}</td>
                                        <td>{lead.company}</td>
                                        <td><span className="badge gray">{lead.source}</span></td>
                                        <td><span className={`badge ${lead.status === 'won' ? 'green' : lead.status === 'lost' ? 'red' : 'blue'}`}>{lead.status}</span></td>
                                    </tr>
                                ))}
                                {!statsData?.recent_leads?.length && <tr><td colSpan={4} className="text-center">No recent leads found.</td></tr>}
                            </tbody>
                        </table>
                    </div>
                </div>

                <div className="card">
                    <div className="card-header">
                        <h3 style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <TrendingUp size={18} />
                            Quick Operations
                        </h3>
                    </div>
                    <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                        <a href="/attendance" className="btn btn-primary" style={{ justifyContent: 'center' }}>
                            <Clock size={16} /> Mark Attendance
                        </a>
                        <a href="/worklogs" className="btn btn-secondary" style={{ justifyContent: 'center' }}>
                            <FileText size={16} /> Log Daily Work
                        </a>
                        <a href="/projects" className="btn btn-secondary" style={{ justifyContent: 'center' }}>
                            <FolderKanban size={16} /> Project View
                        </a>
                        {hasElevated && (
                            <a href="/leads" className="btn btn-secondary" style={{ justifyContent: 'center' }}>
                                <UserPlus size={16} /> Acquisition (CRM)
                            </a>
                        )}
                        {hasElevated && (
                            <a href="/payroll" className="btn btn-secondary" style={{ justifyContent: 'center' }}>
                                <DollarSign size={16} /> Finance & Payroll
                            </a>
                        )}
                    </div>
                </div>
            </div>
            {showBalanceModal && (
                <Modal title="Update Company Balance" onClose={() => setShowBalanceModal(false)}>
                    <form onSubmit={handleUpdateBalance}>
                        <div className="form-group">
                            <label>Amount to Add/Subtract (₹)</label>
                            <input
                                type="number"
                                step="0.01"
                                className="form-control"
                                placeholder="E.g. 1000 or -500"
                                value={balanceInput.amount}
                                onChange={e => setBalanceInput({ ...balanceInput, amount: e.target.value })}
                                required
                            />
                            <small className="text-muted">Use negative values to deduct from balance manually.</small>
                        </div>
                        <div className="form-group" style={{ marginTop: 15 }}>
                            <label>Description / Notes</label>
                            <textarea
                                className="form-control"
                                rows="3"
                                placeholder="Reason for manual update..."
                                value={balanceInput.notes}
                                onChange={e => setBalanceInput({ ...balanceInput, notes: e.target.value })}
                            />
                        </div>
                        <div className="form-actions" style={{ marginTop: 20 }}>
                            <button type="button" className="btn btn-secondary" onClick={() => setShowBalanceModal(false)}>Cancel</button>
                            <button type="submit" className="btn btn-primary" disabled={updatingBalance}>
                                {updatingBalance ? 'Updating...' : 'Update Balance'}
                            </button>
                        </div>
                    </form>
                </Modal>
            )}

            {showNoticeModal && (
                <Modal title="Post Global Notice" onClose={() => setShowNoticeModal(false)}>
                    <form onSubmit={handleCreateNotice}>
                        <div className="form-group">
                            <label>Notice Type</label>
                            <select
                                className="form-control"
                                value={noticeForm.type}
                                onChange={e => setNoticeForm({ ...noticeForm, type: e.target.value })}
                            >
                                <option value="general">General Announcement</option>
                                <option value="holiday">Office Holiday</option>
                                <option value="event">Company Event</option>
                                <option value="win">New Project Win</option>
                            </select>
                        </div>
                        <div className="form-group" style={{ marginTop: 15 }}>
                            <label>Title</label>
                            <input
                                required
                                className="form-control"
                                value={noticeForm.title}
                                onChange={e => setNoticeForm({ ...noticeForm, title: e.target.value })}
                            />
                        </div>
                        <div className="form-group" style={{ marginTop: 15 }}>
                            <label>Content / Message</label>
                            <textarea
                                required
                                className="form-control"
                                rows="4"
                                value={noticeForm.content}
                                onChange={e => setNoticeForm({ ...noticeForm, content: e.target.value })}
                            />
                        </div>
                        <div className="form-actions" style={{ marginTop: 20 }}>
                            <button type="button" className="btn btn-secondary" onClick={() => setShowNoticeModal(false)}>Cancel</button>
                            <button type="submit" className="btn btn-primary" disabled={savingNotice}>
                                {savingNotice ? 'Posting...' : 'Post Notice'}
                            </button>
                        </div>
                    </form>
                </Modal>
            )}
        </div>
    );
}
