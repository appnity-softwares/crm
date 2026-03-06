import { useState, useEffect } from 'react';
import QRCode from 'react-qr-code';
import { attendanceAPI } from '../../services/api';
import Modal from '../ui/Modal';
import { RefreshCw } from 'lucide-react';

export default function QRGenerator({ onClose }) {
    const [token, setToken] = useState(null);
    const [expiresIn, setExpiresIn] = useState(0);
    const [loading, setLoading] = useState(true);

    const fetchToken = async () => {
        setLoading(true);
        try {
            const { data } = await attendanceAPI.getQRToken();
            setToken(data.token);
            setExpiresIn(Math.floor(data.expires_in));
        } catch (err) {
            console.error('Failed to generate token');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchToken();
    }, []);

    useEffect(() => {
        if (expiresIn <= 0) return;
        const timer = setInterval(() => {
            setExpiresIn(prev => {
                if (prev <= 1) {
                    fetchToken();
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);
        return () => clearInterval(timer);
    }, [expiresIn]);

    return (
        <Modal title="Attendance QR Code" onClose={onClose}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '20px 0' }}>
                <p style={{ textAlign: 'center', color: 'var(--text-muted)', marginBottom: 20 }}>
                    Employees can scan this code to check in. The code changes automatically.
                </p>

                {loading && !token ? (
                    <div className="spinner" style={{ margin: '40px 0' }} />
                ) : (
                    <div style={{ background: '#fff', padding: 20, borderRadius: 12, border: '2px solid var(--border)' }}>
                        <QRCode value={token || 'loading'} size={256} />
                    </div>
                )}

                <div style={{ marginTop: 24, display: 'flex', alignItems: 'center', gap: 8, color: expiresIn <= 5 ? '#ef4444' : 'var(--text-main)', fontWeight: 600 }}>
                    <RefreshCw size={16} className={loading ? 'spinning' : ''} />
                    Refreshes in {expiresIn}s
                </div>
            </div>
        </Modal>
    );
}
