import { useState, useEffect } from 'react';
import { attendanceAPI, trainingAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/ui/Toast';
import { Clock, LogIn, LogOut, CheckCircle, QrCode, Scan, UserCheck } from 'lucide-react';
import DataTable from '../components/ui/DataTable';
import QRScanner from '../components/attendance/QRScanner';

export default function StudentAttendance() {
    const { user, hasElevated } = useAuth();
    const isTrainee = user?.role === 'trainee';
    const toast = useToast();
    const [records, setRecords] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showQRScan, setShowQRScan] = useState(false);
    const [enrollment, setEnrollment] = useState(null);

    const load = async () => {
        setLoading(true);
        try {
            let enData = [];
            
            const params = { limit: 100 };
            if (hasElevated) {
                params.role = 'trainee';
            }

            const attRes = hasElevated 
                ? await attendanceAPI.getAll(params)
                : await attendanceAPI.getMine(params);
            
            // Only show one active enrollment for simplicity
            if (!hasElevated && enData.length > 0) {
                setEnrollment(enData[0]);
            }
            
            setRecords(attRes.data.attendance || []);
        } catch { 
            toast('Failed to load attendance data', 'error');
        } finally { 
            setLoading(false); 
        }
    };


    useEffect(() => { load(); }, []);

    const formatTime = (t) => t ? new Date(t).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : '—';
    const formatDate = (d) => new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

    const calculateHours = (cin, cout) => {
        if (!cin || !cout) return '—';
        const diff = new Date(cout) - new Date(cin);
        const hours = (diff / (1000 * 60 * 60)).toFixed(1);
        return hours + 'h';
    };

    const columns = [
        { header: 'Student', accessor: r => r.user?.name || '—', show: hasElevated },
        { header: 'Date', accessor: 'date', render: r => formatDate(r.date) },
        { header: 'Check In', accessor: 'check_in', render: r => formatTime(r.check_in) },
        { header: 'Check Out', accessor: 'check_out', render: r => formatTime(r.check_out) },
        { header: 'Duration', key: 'duration', render: r => calculateHours(r.check_in, r.check_out) },
        { 
            header: 'Status', 
            accessor: 'status', 
            render: r => (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span className={`badge ${r.status === 'present' ? 'green' : 'red'}`}>{r.status}</span>
                    {r.is_late && <span className="badge red" style={{ fontSize: '0.6rem' }}>LATE</span>}
                </div>
            )
        }
    ];

    const todayRecord = records.find(r => r.date?.split('T')[0] === new Date().toISOString().split('T')[0]);

    return (
        <div className="page-content">
            <div className="header" style={{ marginBottom: 30 }}>
                <div className="header-left">
                    <h1>Training Attendance</h1>
                    <p>Mark your daily presence and track your learning hours</p>
                </div>
                <div className="header-actions">
                    {!todayRecord?.check_out && (
                        <button className="btn btn-primary" onClick={() => setShowQRScan(true)}>
                            <Scan size={15} /> {todayRecord ? 'Check Out' : 'Check In'}
                        </button>
                    )}
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 24, marginBottom: 24 }}>
                {!hasElevated && (
                    <div className="card" style={{ padding: 24, background: 'var(--primary-50)', border: '1px solid var(--primary-100)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div>
                                <h3 style={{ margin: 0, color: 'var(--primary-700)' }}>Current Session</h3>
                                {todayRecord ? (
                                    <p style={{ fontSize: '0.9rem', color: 'var(--primary-600)', margin: '8px 0 0' }}>
                                        You checked in at <strong>{formatTime(todayRecord.check_in)}</strong> today.
                                    </p>
                                ) : (
                                    <p style={{ fontSize: '0.9rem', color: 'var(--primary-600)', margin: '8px 0 0' }}>
                                        You haven't checked in yet today.
                                    </p>
                                )}
                            </div>
                            <div style={{ textAlign: 'right' }}>
                                <div style={{ fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', color: 'var(--primary-600)' }}>Today's Time</div>
                                <div style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--primary-700)' }}>
                                    {calculateHours(todayRecord?.check_in, todayRecord?.check_out || new Date())}
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {!hasElevated && (
                    <div className="card" style={{ padding: 20 }}>
                        <h3 style={{ fontSize: '1rem', marginBottom: 12 }}>Course Info</h3>
                        {enrollment ? (
                            <>
                                <div style={{ fontSize: '0.9rem', fontWeight: 600 }}>{enrollment.course?.title}</div>
                                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 4 }}>
                                    Status: <span className="badge blue" style={{ fontSize: '0.6rem' }}>{enrollment.status}</span>
                                </div>
                            </>
                        ) : (
                            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>No active enrollment</p>
                        )}
                    </div>
                )}
            </div>

            <div className="card">
                <DataTable
                    columns={columns}
                    data={records}
                    pageSize={10}
                    emptyMessage="No attendance records found."
                />
            </div>

            {showQRScan && (
                <QRScanner 
                    onClose={() => setShowQRScan(false)} 
                    onScanSuccess={() => {
                        toast('Attendance marked successfully!');
                        load();
                    }} 
                />
            )}
        </div>
    );
}
