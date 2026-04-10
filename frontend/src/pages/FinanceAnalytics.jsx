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
                        <h3>${(safeSummary.total_income || 0).toLocaleString()}</h3>
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
                        <h3>${(safeSummary.total_expense || 0).toLocaleString()}</h3>
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
                        <h3 style={{ color: (safeSummary.net_profit || 0) >= 0 ? '#10b981' : '#ef4444' }}>
                            ${(safeSummary.net_profit || 0).toLocaleString()}
                        </h3>
                        <span style={{ color: '#64748b', fontSize: '0.75rem' }}>
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
                        <h3>{safeSummary.total_income > 0 ? ((safeSummary.net_profit / safeSummary.total_income) * 100).toFixed(1) : 0}%</h3>
                        <span style={{ color: '#64748b', fontSize: '0.8rem' }}>Efficiency Ratio</span>
                    </div>
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 400px', gap: 30 }}>
                <div className="card shadow-sm" style={{ padding: 24 }}>
                    <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
                        <h3 style={{ margin: 0 }}>Project Revenue Matrix</h3>
                        <BarChart3 size={18} style={{ color: '#64748b' }} />
                    </div>
                    <div style={{ height: 350 }}>
                        <ResponsiveContainer width="100%" height={320}>
                            <BarChart data={safeProjectRevenue}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                                <XAxis dataKey="name" fontSize={12} stroke="var(--text-muted)" />
                                <YAxis fontSize={12} stroke="var(--text-muted)" />
                                <Tooltip 
                                    contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8 }} 
                                    labelStyle={{ color: 'var(--text-app)' }} 
                                />
                                <Bar dataKey="revenue" fill="var(--primary-500)" radius={[4, 4, 0, 0]} barSize={40} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 30 }}>
                    <div className="card shadow-sm" style={{ padding: 24, flex: 1 }}>
                        <h3 style={{ margin: '0 0 20px 0', fontSize: '0.95rem' }}>Expense Distribution</h3>
                        <div style={{ height: 250 }}>
                            <ResponsiveContainer width="100%" height={320}>
                                <PieChart>
                                    <Pie
                                        data={safeExpenseCategories}
                                        innerRadius={60}
                                        outerRadius={80}
                                        paddingAngle={5}
                                        dataKey="value"
                                    >
                                        {safeExpenseCategories.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <Tooltip />
                                    <Legend />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>
            </div>

            <div className="card shadow-sm" style={{ padding: 24, marginTop: 30 }}>
                <h3 style={{ margin: '0 0 20px 0' }}>Financial Trajectory</h3>
                <div style={{ height: 350 }}>
                    <ResponsiveContainer width="100%" height={320}>
                        <AreaChart data={safeTrend}>
                            <defs>
                                <linearGradient id="colorIncome" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.1}/>
                                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                            <XAxis dataKey="month" fontSize={12} stroke="var(--text-muted)" />
                            <YAxis fontSize={12} stroke="var(--text-muted)" />
                            <Tooltip 
                                contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8 }}
                                labelStyle={{ color: 'var(--text-app)' }}
                            />
                            <Area type="monotone" dataKey="income" stroke="#3b82f6" fillOpacity={1} fill="url(#colorIncome)" strokeWidth={2} />
                            <Area type="monotone" dataKey="expense" stroke="#ef4444" fill="none" strokeWidth={2} strokeDasharray="5 5" />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </div>
    );
}
