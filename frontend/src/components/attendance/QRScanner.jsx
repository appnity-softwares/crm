import { useState } from 'react';
import { Scanner } from '@yudiel/react-qr-scanner';
import Modal from '../ui/Modal';
import { attendanceAPI } from '../../services/api';
import { useToast } from '../ui/Toast';

export default function QRScanner({ onClose, onScanSuccess }) {
    const toast = useToast();
    const [scanning, setScanning] = useState(false);

    const handleScan = async (result) => {
        if (!result || !result.length || scanning) return;
        const token = result[0].rawValue;
        if (!token) return;

        setScanning(true);
        try {
            await attendanceAPI.qrCheckIn({ token });
            toast('Attendance marked successfully via QR!', 'success');
            onScanSuccess();
            onClose();
        } catch (err) {
            toast(err.response?.data?.error || 'Failed to scan QR or QR expired', 'error');
            setTimeout(() => setScanning(false), 2000); // Retry after 2s if failed
        }
    };

    return (
        <Modal title="Scan QR Code" onClose={onClose}>
            <div style={{ textAlign: 'center', padding: '10px 0' }}>
                <p style={{ color: 'var(--text-muted)', marginBottom: 20 }}>
                    Point your camera at the admin's screen to check in automatically.
                </p>

                <div style={{
                    width: '100%',
                    maxWidth: 400,
                    margin: '0 auto',
                    overflow: 'hidden',
                    borderRadius: 16,
                    border: '4px solid var(--border)',
                    boxShadow: '0 10px 30px rgba(0,0,0,0.1)',
                }}>
                    <Scanner
                        onScan={handleScan}
                        onError={(err) => console.log('QR Scanner Error', err)}
                        styles={{ container: { paddingBottom: '100%' } }}
                    />
                </div>

                {scanning && (
                    <div style={{ marginTop: 20, color: 'var(--primary)', fontWeight: 'bold' }}>
                        Verifying QR code...
                    </div>
                )}
            </div>
        </Modal>
    );
}
