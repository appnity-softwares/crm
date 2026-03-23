import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { authAPI } from '../services/api';
import { Search, ArrowRight, UserPlus } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function LeadLogin() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const { login, logout } = useAuth();
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const data = await login(email, password);
            if (data.user.role !== 'prospect') {
                setError('This login is for Leads/Prospects only.');
                logout(); // Clear tokens if role mismatch
                return;
            }
            navigate('/prospect-dashboard');
        } catch (err) {
            setError(err.response?.data?.error || 'Login failed');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="login-container lead-branding">
            <div className="login-box">
                <div className="login-logo">
                    <div className="logo-icon" style={{ background: 'var(--blue-100)', color: 'var(--blue-600)' }}>
                        <Search size={32} />
                    </div>
                    <h2>Lead Portal</h2>
                    <p>Track your project acquisition & initial requirements</p>
                </div>

                {error && <div className="alert alert-error">{error}</div>}

                <form onSubmit={handleSubmit} className="login-form">
                    <div className="form-group">
                        <label>Lead Email</label>
                        <input
                            type="email"
                            required
                            placeholder="your.email@example.com"
                            className="form-control"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                        />
                    </div>
                    <div className="form-group">
                        <label>Password</label>
                        <input
                            type="password"
                            required
                            placeholder="••••••••"
                            className="form-control"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                        />
                    </div>
                    <button type="submit" disabled={loading} className="btn btn-primary w-full shadow-lg">
                        {loading ? 'Accessing...' : 'Lead Login'} <ArrowRight size={18} style={{ marginLeft: 8 }} />
                    </button>

                    <div style={{ textAlign: 'center', marginTop: 24, fontSize: '0.9rem' }}>
                        Don't have a lead account? <Link to="/lead-register" style={{ color: 'var(--blue-600)', fontWeight: 700 }}>Request Access</Link>
                    </div>
                    <div style={{ textAlign: 'center', marginTop: 12, fontSize: '0.8rem' }}>
                        <Link to="/login" style={{ color: 'var(--text-muted)' }}>Internal Employee Login</Link>
                    </div>
                </form>
            </div>
        </div>
    );
}
