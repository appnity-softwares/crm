import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { employeeAPI } from '../services/api';
import { useToast } from '../components/ui/Toast';
import {
    Building2, Briefcase, Clock, FolderKanban, TrendingUp,
    ChevronLeft, ExternalLink, Filter, Target, Phone
} from 'lucide-react';
import {
    ResponsiveContainer, AreaChart, Area, XAxis, YAxis,
    CartesianGrid, Tooltip
} from 'recharts';

export default function EmployeeDetail() {
    const { id } = useParams();
    const navigate = useNavigate();
    const toast = useToast();
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const res = await employeeAPI.getStats(id);
                setData(res.data);
            } catch (err) {
                toast('Failed to load employee reports', 'error');
                navigate('/employees');
            } finally {
                setLoading(false);
            }
        };
        fetchStats();
    }, [id]);

    if (loading) return <div className="spinner" />;
    if (!data) return <div className="error-state">Employee not found</div>;

    const { employee, attendance, work_logs, projects, reports, stats } = data;

    // Prepare chart data for hours worked (last 10 days of work logs)
    const hoursData = [...work_logs].reverse().slice(-10).map(log => ({
        date: new Date(log.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        hours: log.hours
    }));

    return (
        <div className="page-content">
            {/* Header section with breadcrumbs and primary info */}
            <div style={{ marginBottom: 32 }}>
                <button className="btn btn-secondary btn-sm" onClick={() => navigate('/employees')} style={{ marginBottom: 16 }}>
                    <ChevronLeft size={16} /> Back to Directory
                </button>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: 16 }}>
                    <div>
                        <h1 style={{ fontSize: '2rem', fontWeight: 800, letterSpacing: '-0.5px', marginBottom: 4 }}>
                            {employee.name}'s Portfolio
                        </h1>
                        <p style={{ color: 'var(--text-muted)', fontSize: '1rem' }}>
                            Comprehensive performance analytics and historical contributions for <strong>{employee.designation || 'Specialist'}</strong>.
                        </p>
                    </div>
                    <div style={{ display: 'flex', gap: 12 }}>
                        <span className={`badge ${employee.is_active ? 'green' : 'red'}`} style={{ padding: '6px 12px', fontSize: '0.85rem' }}>
                            {employee.is_active ? 'Active' : 'Inactive'}
                        </span>
                        <span className="badge purple" style={{ padding: '6px 12px', fontSize: '0.85rem' }}>
                            {employee.role.toUpperCase()}
                        </span>
                    </div>
                </div>
            </div>

            <div className="portfolio-layout">
                {/* ─── Sidebar: Profile & Highlights ──────────────── */}
                <aside className="portfolio-sidebar">
                    <div className="card">
                        <div className="card-body" style={{ textAlign: 'center' }}>
                            <div className="profile-avatar-large" style={{
                                width: 110, height: 110, fontSize: '2.5rem', marginBottom: 20,
                                boxShadow: '0 0 0 4px var(--bg-body), 0 0 0 6px var(--primary-100)'
                            }}>
                                {employee.name.charAt(0)}
                            </div>
                            <h2 style={{ fontSize: '1.25rem', fontWeight: 700 }}>{employee.name}</h2>
                            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: 24 }}>{employee.email}</p>

                            <div className="info-list">
                                <div className="info-card-item">
                                    <Building2 size={16} />
                                    <div className="content">
                                        <div className="label">Department</div>
                                        <div className="value">{employee.department || 'General'}</div>
                                    </div>
                                </div>
                                <div className="info-card-item">
                                    <Briefcase size={16} />
                                    <div className="content">
                                        <div className="label">Designation</div>
                                        <div className="value" title={employee.designation}>{employee.designation || 'Team Member'}</div>
                                    </div>
                                </div>
                                <div className="info-card-item">
                                    <Phone size={16} />
                                    <div className="content">
                                        <div className="label">Phone</div>
                                        <div className="value">{employee.phone || 'Not Provided'}</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="card">
                        <div className="card-header">
                            <h3 style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <TrendingUp size={16} color="var(--primary-600)" />
                                Key Indicators
                            </h3>
                        </div>
                        <div className="card-body">
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                                <div className="stat-card-mini" style={{ background: 'var(--primary-50)' }}>
                                    <div className="label">Total Hours</div>
                                    <div className="value" style={{ color: 'var(--primary-600)' }}>{stats.total_hours}h</div>
                                </div>
                                <div className="stat-card-mini" style={{ background: 'var(--green-50)' }}>
                                    <div className="label">Attendance</div>
                                    <div className="value" style={{ color: 'var(--green-600)' }}>{stats.present_days}d</div>
                                </div>
                                <div className="stat-card-mini" style={{ background: 'var(--purple-50)' }}>
                                    <div className="label">Projects</div>
                                    <div className="value" style={{ color: 'var(--purple-600)' }}>{stats.project_count || projects.length}</div>
                                </div>
                                <div className="stat-card-mini" style={{ background: 'var(--amber-50)' }}>
                                    <div className="label">Reports</div>
                                    <div className="value" style={{ color: 'var(--amber-600)' }}>{reports.length}</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </aside>

                {/* ─── Main Content Area ────────────────────────── */}
                <main className="portfolio-main" style={{ flex: 1, minWidth: 0 }}>
                    {/* Performance Chart Card */}
                    <div className="card" style={{ overflow: 'hidden' }}>
                        <div className="card-header">
                            <div>
                                <h3>Work Intensity & Efficiency</h3>
                                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Historical billable hours over the latest 10 working days.</p>
                            </div>
                            <div className="badge blue">Billable Hours</div>
                        </div>
                        <div className="card-body">
                            <div style={{ height: 320, width: '100%' }}>
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={hoursData}>
                                        <defs>
                                            <linearGradient id="colorHours" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="var(--primary-500)" stopOpacity={0.15} />
                                                <stop offset="95%" stopColor="var(--primary-500)" stopOpacity={0} />
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                                        <XAxis
                                            dataKey="date"
                                            stroke="var(--text-muted)"
                                            fontSize={11}
                                            tickLine={false}
                                            axisLine={false}
                                            dy={10}
                                        />
                                        <YAxis
                                            stroke="var(--text-muted)"
                                            fontSize={11}
                                            tickLine={false}
                                            axisLine={false}
                                            dx={-10}
                                        />
                                        <Tooltip
                                            contentStyle={{
                                                background: 'var(--bg-card)',
                                                border: '1px solid var(--border)',
                                                borderRadius: '8px',
                                                boxShadow: 'var(--shadow-lg)'
                                            }}
                                            itemStyle={{ color: 'var(--primary-600)', fontWeight: 600 }}
                                        />
                                        <Area
                                            type="monotone"
                                            dataKey="hours"
                                            stroke="var(--primary-600)"
                                            strokeWidth={3}
                                            fillOpacity={1}
                                            fill="url(#colorHours)"
                                            animationDuration={1500}
                                        />
                                    </AreaChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: 24 }}>
                        {/* Current Projects Section */}
                        <div className="card">
                            <div className="card-header">
                                <h3 style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                    <FolderKanban size={18} />
                                    Active Assignments
                                </h3>
                            </div>
                            <div className="card-body">
                                {projects.length > 0 ? (
                                    <div className="info-list">
                                        {projects.map(p => (
                                            <div key={p.id} className="info-card-item">
                                                <div style={{
                                                    width: 8, height: 8, borderRadius: '50%',
                                                    background: p.status === 'active' ? 'var(--green-500)' : 'var(--amber-500)',
                                                    marginRight: 6
                                                }} />
                                                <div className="content" style={{ flex: 1 }}>
                                                    <div style={{ fontWeight: 600, fontSize: '0.95rem' }}>{p.name}</div>
                                                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Status: {p.status}</div>
                                                </div>
                                                <button className="btn btn-icon btn-sm" style={{ border: 'none', background: 'transparent' }}>
                                                    <ExternalLink size={14} />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="empty-state">
                                        <FolderKanban size={32} />
                                        <h4>No Projects</h4>
                                        <p>This employee isn't assigned to any projects yet.</p>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Recent KPI Reports */}
                        <div className="card">
                            <div className="card-header">
                                <h3 style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                    <Target size={18} />
                                    Objective Progress
                                </h3>
                            </div>
                            <div className="card-body" style={{ maxHeight: 350, overflowY: 'auto' }}>
                                {reports.length > 0 ? (
                                    <div className="feed-list">
                                        {reports.slice(0, 5).map(r => {
                                            const m = JSON.parse(r.metrics);
                                            return (
                                                <div key={r.id} className="feed-item">
                                                    <div className="feed-item-header">
                                                        <span className="feed-item-date">{new Date(r.date).toLocaleDateString()}</span>
                                                        <span className={`badge ${m.role_type === 'bdr' ? 'cyan' : 'purple'}`}>
                                                            {m.role_type?.toUpperCase()}
                                                        </span>
                                                    </div>
                                                    <div className="feed-item-notes" style={{ marginBottom: 8 }}>{r.notes}</div>
                                                    {/* Dynamic Metrics Badge Display */}
                                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                                                        {Object.entries(m).map(([key, val]) => {
                                                            if (key === 'role_type') return null;
                                                            return (
                                                                <span key={key} style={{
                                                                    fontSize: '0.65rem', padding: '2px 6px', borderRadius: 4,
                                                                    background: 'var(--bg-hover)', color: 'var(--text-secondary)',
                                                                    border: '1px solid var(--border)'
                                                                }}>
                                                                    {key.replace(/_/g, ' ')}: <strong>{val === true ? 'Yes' : val}</strong>
                                                                </span>
                                                            );
                                                        })}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                ) : (
                                    <div className="empty-state">
                                        <Target size={32} />
                                        <h4>No KPI History</h4>
                                        <p>Daily responsibility reports have not been filed yet.</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Detailed Feed Section */}
                    <div className="card">
                        <div className="card-header">
                            <h3 style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <Clock size={18} />
                                Full Contribution Feed
                            </h3>
                            <button className="btn btn-secondary btn-sm">
                                <Filter size={14} /> Filter
                            </button>
                        </div>
                        <div className="table-wrapper">
                            <table style={{ tableLayout: 'fixed' }}>
                                <thead>
                                    <tr>
                                        <th style={{ width: '120px' }}>Date</th>
                                        <th style={{ width: '150px' }}>Project</th>
                                        <th style={{ width: '80px' }}>Hours</th>
                                        <th>Contribution Details</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {work_logs.map(log => (
                                        <tr key={log.id}>
                                            <td style={{ fontSize: '0.85rem' }}>{new Date(log.date).toLocaleDateString()}</td>
                                            <td>
                                                <span className="badge gray" style={{ maxWidth: '100%', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                    {log.project?.name || 'General Task'}
                                                </span>
                                            </td>
                                            <td style={{ fontWeight: 700, color: 'var(--primary-700)' }}>{log.hours}h</td>
                                            <td style={{ whiteSpace: 'normal', fontSize: '0.85rem', lineHeight: '1.4' }}>
                                                {log.description}
                                            </td>
                                        </tr>
                                    ))}
                                    {work_logs.length === 0 && (
                                        <tr>
                                            <td colSpan={4} style={{ textAlign: 'center', padding: '40px' }} className="text-muted">
                                                No historical data available for this employee.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </main>
            </div>
        </div>
    );
}
