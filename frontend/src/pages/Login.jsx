import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Navigate, Link } from 'react-router-dom';

export default function Login() {
    const { user, login } = useAuth();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    if (user) {
        if (user.role === 'prospect') return <Navigate to="/prospect-dashboard" replace />;
        if (user.role === 'client') return <Navigate to="/client-dashboard" replace />;
        return <Navigate to="/" replace />;
    }

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            await login(email, password);
        } catch (err) {
            setError(err.response?.data?.error || 'Login failed');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="login-page">
            <div className="login-card">
                <div className="brand">
                    <div className="brand-icon">A</div>
                    <span>Appnity Core</span>
                </div>
                <h1>Welcome back</h1>
                <p className="subtitle">Sign in to your ERP dashboard</p>

                {error && <div className="login-error">{error}</div>}

                <form onSubmit={handleSubmit}>
                    <div className="login-field">
                        <label>Email Address</label>
                        <input
                            type="email"
                            placeholder="admin@erp.com"
                            value={email}
                            onChange={e => setEmail(e.target.value)}
                            required
                        />
                    </div>
                    <div className="login-field">
                        <label>Password</label>
                        <input
                            type="password"
                            placeholder="••••••••"
                            value={password}
                            onChange={e => setPassword(e.target.value)}
                            required
                        />
                    </div>
                    <button className="login-btn" disabled={loading} style={{ marginTop: '1rem', padding: '0.8rem', width: '100%', border: 'none', borderRadius: '8px', background: 'var(--primary-600)', color: 'white', fontWeight: 600, cursor: 'pointer' }}>
                        {loading ? 'Signing in...' : 'Sign In'}
                    </button>
                    <div style={{ textAlign: 'center', marginTop: 15, fontSize: '0.9rem', color: 'var(--text-muted)' }}>
                        Don't have an account? <Link to="/register" style={{ color: 'var(--primary-600)', fontWeight: 600, textDecoration: 'none' }}>Create one here</Link>
                    </div>
                </form>
            </div>
        </div>
    );
}
