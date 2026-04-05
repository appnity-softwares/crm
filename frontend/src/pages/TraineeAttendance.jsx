import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { attendanceAPI } from '../services/api';
import { useToast } from '../components/ui/Toast';
import { Clock, Calendar, CheckCircle, Smartphone, MapPin, AlertCircle, RefreshCw, LogOut } from 'lucide-react';
import DataTable from '../components/ui/DataTable';

export default function TraineeAttendance() {
    const { user, isAdmin, isManager } = useAuth();
    const toast = useToast();
    const [attendance, setAttendance] = useState([]);
    const [loading, setLoading] = useState(true);
    const [summary, setSummary] = useState({ present: 0, late: 0, absent: 0 });
    const [checking, setChecking] = useState(false);

    const isTrainee = user?.role === 'trainee';

    const loadData = async () => {
        setLoading(true);
        try {
            let res;
            if (isAdmin || isManager) {
                res = await attendanceAPI.getAll({ role: 'trainee' });
            } else {
                res = await attendanceAPI.getMine();
            }
            const data = res.data.attendance || [];
            setAttendance(data);

            // Calculate simple stats
            const present = data.filter(a => a.status === 'present').length;
            const late = data.filter(a => a.is_late).length;
            setSummary({ present, late, absent: 0 }); // Absent calculation would need more logic
        } catch (err) {
            toast('Failed to load attendance records', 'error');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { loadData(); }, []);

    const handleCheckIn = async () => {
        setChecking(true);
        try {
            await attendanceAPI.checkIn();
            toast('Checked in successfully!');
            loadData();
        } catch (err) {
            toast(err.response?.data?.error || 'Check-in failed', 'error');
        } finally {
            setChecking(false);
        }
    };

    const handleCheckOut = async () => {
        setChecking(true);
        try {
            await attendanceAPI.checkOut();
            toast('Checked out successfully!');
            loadData();
        } catch (err) {
            toast(err.response?.data?.error || 'Check-out failed', 'error');
        } finally {
            setChecking(false);
        }
    };

    const columns = [
        { 
            header: 'Date', 
            accessor: 'date', 
            render: r => <span>{new Date(r.date).toLocaleDateString(undefined, { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })}</span> 
        },
        ...(isAdmin || isManager ? [{
            header: 'Student',
            accessor: 'user.name',
            render: r => (
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div className="avatar-sm" style={{ width: 24, height: 24, borderRadius: '50%', background: 'var(--primary-100)', color: 'var(--primary-700)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem', fontWeight: 700 }}>
                        {r.User?.name?.charAt(0)}
                    </div>
                    <span>{r.User?.name}</span>
                </div>
            )
        }] : []),
        { 
            header: 'Check In', 
            accessor: 'check_in', 
            render: r => r.check_in ? <span style={{ fontWeight: 500 }}>{new Date(r.check_in).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span> : '-' 
        },
        { 
            header: 'Check Out', 
            accessor: 'check_out', 
            render: r => r.check_out ? <span style={{ fontWeight: 500 }}>{new Date(r.check_out).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span> : '-' 
        },
        { 
            header: 'Status', 
            accessor: 'status', 
            render: r => (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span className={`badge ${r.status === 'present' ? 'green' : 'red'}`}>{r.status}</span>
                    {r.is_late && <span className="badge amber" style={{ fontSize: '0.65rem' }}>LATE</span>}
                </div>
            )
        },
        {
            header: 'Remark',
            accessor: 'remark',
            render: r => <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{r.remark || '-'}</span>
        }
    ];

    const todayAtt = attendance.find(a => new Date(a.date).toDateString() === new Date().toDateString());

    return (
        <div className="page-content">
            <div className="header" style={{ marginBottom: 30 }}>
                <div className="header-left">
                    <h1>{isTrainee ? 'My Attendance' : 'Trainee Attendance'}</h1>
                    <p>{isTrainee ? 'Track your daily workshop presence and timing' : 'Monitor student presence and workshop timing'}</p>
                </div>
                <div className="header-actions">
                    <button className="btn btn-secondary" onClick={loadData} style={{ borderRadius: '50%', width: 40, height: 40, padding: 0 }}>
                        <RefreshCw size={18} />
                    </button>
                    {isTrainee && !todayAtt && (
                        <button className="btn btn-primary" onClick={handleCheckIn} disabled={checking}>
                            <Clock size={16} /> Mark Present
                        </button>
                    )}
                    {isTrainee && todayAtt && !todayAtt.check_out && (
                        <button className="btn btn-danger" onClick={handleCheckOut} disabled={checking}>
                            <LogOut size={16} /> Clock Out
                        </button>
                    )}
                </div>
            </div>

            <div className="stats-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 }}>
                <div className="stat-card">
                    <div className="stat-icon blue"><Calendar size={20} /></div>
                    <div className="stat-info">
                        <label>Sessions Recorded</label>
                        <h3>{attendance.length}</h3>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon green"><CheckCircle size={20} /></div>
                    <div className="stat-info">
                        <label>Present Days</label>
                        <h3>{summary.present}</h3>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon amber"><AlertCircle size={20} /></div>
                    <div className="stat-info">
                        <label>Late Marks</label>
                        <h3>{summary.late}</h3>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon purple"><Clock size={20} /></div>
                    <div className="stat-info">
                        <label>Attendance %</label>
                        <h3>{attendance.length > 0 ? Math.round((summary.present / attendance.length) * 100) : 0}%</h3>
                    </div>
                </div>
            </div>

            {isTrainee && (
                <div className="card" style={{ marginBottom: 24, padding: '24px', background: 'var(--primary-50)', border: '1px solid var(--primary-100)' }}>
                    <div style={{ display: 'flex', gap: 20, alignItems: 'center' }}>
                        <div style={{ width: 60, height: 60, borderRadius: '50%', background: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary-600)', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
                            <Smartphone size={30} />
                        </div>
                        <div>
                            <h3 style={{ margin: 0, color: 'var(--primary-900)' }}>Ready to session?</h3>
                            <p style={{ margin: '4px 0 0', color: 'var(--primary-700)', fontSize: '0.9rem' }}>
                                Use your mobile device to scan the QR code in the lab for faster entry.
                            </p>
                        </div>
                        <div style={{ marginLeft: 'auto' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.8rem', fontWeight: 600, color: 'var(--primary-700)' }}>
                                <MapPin size={14} /> Global Academy Hub
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <div className="card">
                {loading ? <div className="spinner" /> : (
                    <DataTable 
                        columns={columns} 
                        data={attendance} 
                        pageSize={15} 
                        searchable={true}
                        emptyMessage="No attendance records found."
                    />
                )}
            </div>
        </div>
    );
}
