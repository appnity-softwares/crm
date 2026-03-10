import { useState, useEffect } from 'react';
import { balanceAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { IndianRupee, TrendingUp, TrendingDown, Landmark, PieChart as PieIcon, Calculator } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, PieChart, Pie } from 'recharts';

export default function FinanceDashboard() {
    const { isAdmin } = useAuth();
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const load = async () => {
            try {
                const res = await balanceAPI.getStats();
                setData(res.data);
            } catch { } finally { setLoading(false); }
        };
        load();
    }, []);

    if (loading) return <div className="spinner" />;

    const stats = [
        { label: 'Total Income', value: data.total_income, icon: TrendingUp, color: 'green' },
        { label: 'Total Expenses', value: data.total_expense, icon: TrendingDown, color: 'red' },
        { label: 'Net Profit', value: data.net_profit, icon: IndianRupee, color: 'blue' },
        { label: 'Estimated GST Payable', value: data.gst_payable, icon: Calculator, color: 'amber' },
    ];

    const pieData = [
        { name: 'Income', value: data.total_income },
        { name: 'Expense', value: data.total_expense },
    ];
    const PIE_COLORS = ['#10b981', '#ef4444'];

    return (
        <div className="page-content">
            <div className="header" style={{ marginBottom: 24 }}>
                <div className="header-left">
                    <h1>Finance Analytics</h1>
                    <p>Profit, Loss, and GST reports for Appnity Softwares Private Limited</p>
                </div>
            </div>

            <div className="stats-grid" style={{ marginBottom: 24 }}>
                {stats.map(s => (
                    <div key={s.label} className="stat-card">
                        <div className={`stat-icon ${s.color}`}><s.icon size={20} /></div>
                        <div className="stat-info">
                            <h4>{s.label}</h4>
                            <div className="stat-value">₹{s.value?.toLocaleString('en-IN') || '0'}</div>
                            <div className="stat-sub">Current Lifecycle</div>
                        </div>
                    </div>
                ))}
            </div>

            <div className="charts-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: 24 }}>
                <div className="card">
                    <div className="card-header">
                        <h3><Landmark size={18} /> Financial Health (Income vs Expense)</h3>
                    </div>
                    <div className="card-body">
                        <div style={{ width: '100%', height: 350, minHeight: 350 }}>
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={[{ name: 'Total', income: data.total_income, expense: data.total_expense }]}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                    <XAxis dataKey="name" />
                                    <YAxis />
                                    <Tooltip />
                                    <Bar dataKey="income" fill="#10b981" radius={[4, 4, 0, 0]} name="Total Income (Paid)" />
                                    <Bar dataKey="expense" fill="#ef4444" radius={[4, 4, 0, 0]} name="Total Expenses" />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>

                <div className="card">
                    <div className="card-header">
                        <h3><PieIcon size={18} /> Budget Allocation</h3>
                    </div>
                    <div className="card-body" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <div style={{ width: '100%', height: 350, minHeight: 350 }}>
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={pieData}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={80}
                                        outerRadius={120}
                                        paddingAngle={5}
                                        dataKey="value"
                                    >
                                        {pieData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <Tooltip />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>
            </div>

            <div className="card" style={{ marginTop: 24 }}>
                <div className="card-header">
                    <h3>Important Notice on GST</h3>
                </div>
                <div className="card-body">
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                        The "Estimated GST Payable" is calculated as 18% of Total Paid Invoices minus 18% of Total Expenses.
                        This is a simplified estimation for Appnity Softwares Private Limited's internal reference and does not replace formal accounting audits.
                    </p>
                </div>
            </div>
        </div>
    );
}
