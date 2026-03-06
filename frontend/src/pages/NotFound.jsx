import { useNavigate } from 'react-router-dom';
import { AlertTriangle, Home } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

export default function NotFound() {
    const navigate = useNavigate();
    const { dark } = useTheme();

    return (
        <div style={{
            minHeight: '100vh',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'var(--bg-main)',
            color: 'var(--text-main)',
            textAlign: 'center',
            padding: 20
        }}>
            <div style={{
                background: dark ? '#1e293b' : '#fff',
                padding: '40px 60px',
                borderRadius: 16,
                boxShadow: dark ? '0 10px 25px rgba(0,0,0,0.5)' : '0 10px 25px rgba(0,0,0,0.05)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 20
            }}>
                <div style={{
                    width: 72, height: 72,
                    background: dark ? '#332727' : '#fee2e2',
                    color: '#ef4444',
                    borderRadius: '50%',
                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}>
                    <AlertTriangle size={36} />
                </div>
                <div>
                    <h1 style={{ fontSize: '3rem', margin: 0, fontWeight: 800 }}>404</h1>
                    <h2 style={{ margin: '10px 0', fontWeight: 600 }}>Page Not Found</h2>
                    <p style={{ color: 'var(--text-muted)', maxWidth: 300, lineHeight: 1.5 }}>
                        The page you are looking for doesn't exist or has been moved.
                    </p>
                </div>
                <button
                    className="btn btn-primary"
                    onClick={() => navigate('/')}
                    style={{ marginTop: 10, width: '100%', justifyContent: 'center' }}
                >
                    <Home size={16} /> Back to Dashboard
                </button>
            </div>
        </div>
    );
}
