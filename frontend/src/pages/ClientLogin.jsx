import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Navigate, Link } from 'react-router-dom';

export default function ClientLogin() {
    const { user, login, logout } = useAuth();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            const data = await login(email, password);
            if (data.user.role !== 'client') {
                setError('This login is for Clients only.');
                logout();
                return;
            }
        } catch (err) {
            setError(err.response?.data?.error || 'Login failed');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="login-page client-login">
            <div className="login-card">
                <div className="brand">
                    <div className="brand-icon" style={{ background: 'linear-gradient(135deg, #6366f1, #a855f7)' }}>C</div>
                    <span>Client Portal</span>
                </div>
                <h1 style={{ fontSize: '1.8rem', marginBottom: '0.5rem' }}>Welcome to Your Portal</h1>
                <p className="subtitle">Manage your projects and interact with our team</p>

                {error && <div className="login-error" style={{ background: '#fee2e2', color: '#b91c1c', padding: '10px', borderRadius: '8px', marginBottom: '1rem', fontSize: '0.9rem' }}>{error}</div>}

                <form onSubmit={handleSubmit}>
                    <div className="login-field" style={{ marginBottom: '1.2rem' }}>
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', fontWeight: 500 }}>Email Address</label>
                        <input
                            type="email"
                            placeholder="client@company.com"
                            style={{ width: '100%', padding: '0.8rem', borderRadius: '8px', border: '1px solid #e2e8f0', outline: 'none' }}
                            value={email}
                            onChange={e => setEmail(e.target.value)}
                            required
                        />
                    </div>
                    <div className="login-field" style={{ marginBottom: '1.2rem' }}>
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', fontWeight: 500 }}>Password</label>
                        <input
                            type="password"
                            placeholder="••••••••"
                            style={{ width: '100%', padding: '0.8rem', borderRadius: '8px', border: '1px solid #e2e8f0', outline: 'none' }}
                            value={password}
                            onChange={e => setPassword(e.target.value)}
                            required
                        />
                    </div>
                    <button 
                        className="login-btn" 
                        disabled={loading} 
                        style={{ 
                            marginTop: '1rem', 
                            padding: '1rem', 
                            width: '100%', 
                            border: 'none', 
                            borderRadius: '12px', 
                            background: 'linear-gradient(135deg, #6366f1, #a855f7)', 
                            color: 'white', 
                            fontWeight: 600, 
                            cursor: 'pointer',
                            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)'
                        }}
                    >
                        {loading ? 'Authenticating...' : 'Access Portal'}
                    </button>
                    <div style={{ textAlign: 'center', marginTop: 20, fontSize: '0.9rem', color: '#64748b' }}>
                        Interested in our services? <Link to="/register" style={{ color: '#6366f1', fontWeight: 600, textDecoration: 'none' }}>Get a Quote</Link>
                    </div>
                </form>
            </div>
            <style dangerouslySetInnerHTML={{ __html: `
                .client-login {
                    background: radial-gradient(circle at top right, #f8fafc, #f1f5f9);
                    min-height: 100vh;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }
                .login-card {
                    background: white;
                    padding: 2.5rem;
                    border-radius: 20px;
                    box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
                    width: 100%;
                    max-width: 420px;
                }
                .brand {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                    margin-bottom: 2rem;
                }
                .brand-icon {
                    width: 40px;
                    height: 40px;
                    border-radius: 10px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    color: white;
                    font-weight: bold;
                    font-size: 1.2rem;
                }
                .brand span {
                    font-weight: 700;
                    letter-spacing: -0.5px;
                    color: #1e293b;
                }
                .subtitle {
                    color: #64748b;
                    margin-bottom: 2rem;
                    font-size: 0.95rem;
                }
            `}} />
        </div>
    );
}
