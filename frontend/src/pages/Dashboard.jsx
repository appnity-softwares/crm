import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { dashboardAPI } from '../services/api';
import { Clock, FolderKanban, DollarSign, Activity, TrendingUp, Target, Users, Briefcase, FileText, UserPlus } from 'lucide-react';
import { CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Legend, PieChart, Pie, Cell, AreaChart, Area } from 'recharts';
import { useTheme } from '../context/ThemeContext';
import { useApi } from '../hooks/useApi';

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];

export default function Dashboard() {
    const { user, hasElevated } = useAuth();
    const { dark } = useTheme();

    const { data: statsData, loading: statsLoading } = useApi(dashboardAPI.getStats);

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
            <div className="header" style={{ marginBottom: 32, padding: 0, border: 'none', background: 'transparent' }}>
                <div className="header-left">
                    <h1 style={{ fontSize: '1.75rem', fontWeight: 800 }}>{greeting()}, {user?.name?.split(' ')[0]} 👋</h1>
                    <p style={{ color: 'var(--text-muted)' }}>Overview of your management workspace and team performance.</p>
                </div>
            </div>

            <div className="stats-grid" style={{ marginBottom: 32 }}>
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

            <div className="card" style={{ marginBottom: 32 }}>
                <div className="card-header">
                    <h3><DollarSign size={16} /> Revenue Growth Trend</h3>
                </div>
                <div className="card-body">
                    <div style={{ width: '100%', height: 320 }}>
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

            <div className="charts-grid" style={{ marginBottom: 32 }}>
                <div className="chart-card">
                    <h3 style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <Briefcase size={16} color="var(--primary-600)" />
                        Project Distribution
                    </h3>
                    <div style={{ width: '100%', height: 300, marginTop: 20 }}>
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
                    <div style={{ width: '100%', height: 300, marginTop: 20 }}>
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

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 32, alignItems: 'start' }}>
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
        </div>
    );
}
