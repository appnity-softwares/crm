import { useState, useEffect } from 'react';
import { balanceAPI } from '../services/api';
import { useToast } from '../components/ui/Toast';
import { 
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
    PieChart, Pie, Cell, Legend, BarChart, Bar 
} from 'recharts';
import { TrendingUp, TrendingDown, DollarSign, PieChart as PieIcon, BarChart3, ArrowUpRight, ArrowDownRight } from 'lucide-react';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

export default function FinanceAnalytics() {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const toast = useToast();

    useEffect(() => {
        const load = async () => {
            try {
                const res = await balanceAPI.getAnalytics();
                setData(res.data);
            } catch (err) {
                toast('Failed to load financial analytics', 'error');
            } finally {
                setLoading(false);
            }
        };
        load();
    }, []);

    if (loading) return <div className="spinner" />;
    if (!data) return <div className="error">No data available</div>;

    const { summary, trend, income_categories, expense_categories, project_revenue } = data || {};
    
    // Defensive checks for charts
    const safeExpenseCategories = expense_categories || [];
    const safeIncomeCategories = income_categories || [];
    const safeTrend = trend || [];
    const safeProjectRevenue = project_revenue || [];
    const safeSummary = summary || { total_income: 0, total_expense: 0, net_profit: 0 };

    return (
        <div className="page-content">
            <div className="header" style={{ marginBottom: 30 }}>
                <div className="header-left">
                    <h1>Finance Analytics</h1>
                    <p>Comprehensive overview of your revenue, expenses, and profitability</p>
                </div>
            </div>

            {/* Summary Grid */}
            <div className="stats-grid" style={{ marginBottom: 30 }}>
                <div className="stat-card">
                    <div className="stat-icon" style={{ background: '#eff6ff', color: '#3b82f6' }}>
                        <DollarSign size={24} />
                    </div>
                    <div className="stat-info">
                        <label>Total Revenue</label>
                        <h3>${summary.total_income.toLocaleString()}</h3>
                        <span style={{ color: '#10b981', fontSize: '0.8rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
                            <ArrowUpRight size={14} /> Cumulative
                        </span>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon" style={{ background: '#fef2f2', color: '#ef4444' }}>
                        <TrendingDown size={24} />
                    </div>
                    <div className="stat-info">
                        <label>Total Expenses</label>
                        <h3>${summary.total_expense.toLocaleString()}</h3>
                        <span style={{ color: '#ef4444', fontSize: '0.8rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
                            All Categories
                        </span>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon" style={{ background: '#f0fdf4', color: '#10b981' }}>
                        <TrendingUp size={24} />
                    </div>
                    <div className="stat-info">
                        <label>Net Profit</label>
                        <h3 style={{ color: summary.net_profit >= 0 ? '#10b981' : '#ef4444' }}>
                            ${summary.net_profit.toLocaleString()}
                        </h3>
                        <span style={{ color: '#64748b', fontSize: '0.8rem' }}>
                            After all costs
                        </span>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon" style={{ background: '#fffbeb', color: '#f59e0b' }}>
                        <PieIcon size={24} />
                    </div>
                    <div className="stat-info">
                        <label>Profit Margin</label>
                        <h3>{summary.total_income > 0 ? ((summary.net_profit / summary.total_income) * 100).toFixed(1) : 0}%</h3>
                        <span style={{ color: '#64748b', fontSize: '0.8rem' }}>Efficiency Ratio</span>
                    </div>
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 24, marginBottom: 24 }}>
                {/* Income vs Expense Trend */}
                <div className="card" style={{ padding: 24 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                        <h3 style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <TrendingUp size={18} color="var(--primary-500)" /> Revenue vs Expenses
                        </h3>
                    </div>
                    <div style={{ height: 350 }}>
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={safeTrend}>
                                <defs>
                                    <linearGradient id="colorInc" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.1}/>
                                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                                    </linearGradient>
                                    <linearGradient id="colorExp" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#ef4444" stopOpacity={0.1}/>
                                        <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                                <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: 'var(--text-muted)' }} />
                                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: 'var(--text-muted)' }} />
                                <Tooltip 
                                    contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 12, boxShadow: 'var(--shadow-lg)' }}
                                />
                                <Area type="monotone" dataKey="income" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#colorInc)" name="Income" />
                                <Area type="monotone" dataKey="expense" stroke="#ef4444" strokeWidth={3} fillOpacity={1} fill="url(#colorExp)" name="Expense" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Expense Breakdown */}
                <div className="card" style={{ padding: 24 }}>
                    <h3>Expense Breakdown</h3>
                    <div style={{ height: 350 }}>
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={safeExpenseCategories}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={60}
                                    outerRadius={80}
                                    paddingAngle={5}
                                    dataKey="value"
                                    nameKey="category"
                                >
                                    {safeExpenseCategories.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip />
                                <Legend layout="vertical" align="right" verticalAlign="middle" />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
                {/* Project Revenue */}
                <div className="card" style={{ padding: 24 }}>
                    <h3 style={{ marginBottom: 20 }}>Project-wise Revenue</h3>
                    <div style={{ height: 300 }}>
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={safeProjectRevenue}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                                <XAxis dataKey="project_name" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: 'var(--text-muted)' }} />
                                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: 'var(--text-muted)' }} />
                                <Tooltip cursor={{ fill: 'var(--bg-hover)' }} />
                                <Bar dataKey="total" fill="#3b82f6" radius={[4, 4, 0, 0]} name="Revenue ($)" />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Income Categories */}
                <div className="card" style={{ padding: 24 }}>
                    <h3 style={{ marginBottom: 20 }}>Income Sources</h3>
                    <div style={{ height: 300 }}>
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={safeIncomeCategories}
                                    cx="50%"
                                    cy="50%"
                                    outerRadius={100}
                                    dataKey="value"
                                    nameKey="category"
                                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                                >
                                    {safeIncomeCategories.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[(index + 2) % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>
        </div>
    );
}
