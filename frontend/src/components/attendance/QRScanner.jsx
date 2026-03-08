import { useRef, useState } from 'react';
import { Scanner } from '@yudiel/react-qr-scanner';
import Modal from '../ui/Modal';
import { attendanceAPI } from '../../services/api';
import { useToast } from '../ui/Toast';
import { SwitchCamera } from 'lucide-react';

export default function QRScanner({ onClose, onScanSuccess }) {
    const toast = useToast();
    const [scanning, setScanning] = useState(false);
    const [facingMode, setFacingMode] = useState('environment');
    const scanningRef = useRef(false);

    const handleScan = async (result) => {
        if (!result || scanningRef.current) return;

        // Handle varying library versions/responses safely
        let token = null;
        if (Array.isArray(result) && result.length > 0) {
            token = result[0].rawValue;
        } else if (result.rawValue) {
            token = result.rawValue;
        } else if (typeof result === 'string') {
            token = result;
        }

        if (!token) return;

        scanningRef.current = true;
        setScanning(true);

        try {
            await attendanceAPI.qrCheckIn({ token });
            toast('Attendance marked successfully via QR!', 'success');
            onScanSuccess();
            onClose();
        } catch (err) {
            const errMsg = err.response?.data?.error || 'Failed to scan QR or QR expired';
            toast(errMsg, 'error');

            if (errMsg.toLowerCase().includes('already checked in')) {
                onScanSuccess();
                setTimeout(onClose, 1000);
                return;
            }

            setTimeout(() => {
                scanningRef.current = false;
                setScanning(false);
            }, 2500); // Retry after 2.5s if failed
        }
    };

    const toggleCamera = () => {
        setFacingMode((prev) => (prev === 'environment' ? 'user' : 'environment'));
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
                    position: 'relative',
                    overflow: 'hidden',
                    borderRadius: 16,
                    border: '4px solid var(--border)',
                    boxShadow: '0 10px 30px rgba(0,0,0,0.1)',
                }}>
                    <button
                        onClick={toggleCamera}
                        style={{
                            position: 'absolute',
                            top: 10,
                            right: 10,
                            zIndex: 10,
                            background: 'rgba(0, 0, 0, 0.5)',
                            color: 'white',
                            border: 'none',
                            borderRadius: '50%',
                            width: 40,
                            height: 40,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                            backdropFilter: 'blur(4px)'
                        }}
                        title="Switch Camera"
                    >
                        <SwitchCamera size={20} />
                    </button>
                    <Scanner
                        onScan={handleScan}
                        onError={(err) => console.log('QR Scanner Error:', err)}
                        constraints={{ facingMode }}
                        components={{
                            audio: false,  // crucial for preventing autoplay failures on mobile browsers
                            video: true,
                            tracker: true
                        }}
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
