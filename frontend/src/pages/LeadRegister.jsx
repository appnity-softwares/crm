import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { authAPI } from '../services/api';
import { UserPlus, ArrowRight, ShieldCheck } from 'lucide-react';

export default function LeadRegister() {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [phone, setPhone] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setSuccess('');
        setLoading(true);

        try {
            const res = await authAPI.register({ name, email, phone, password, role: 'prospect' });
            setSuccess(res.data.message);
            setTimeout(() => {
                navigate('/lead-login');
            }, 3000);
        } catch (err) {
            setError(err.response?.data?.error || 'Registration failed');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="login-container lead-branding">
            <div className="login-box">
                <div className="login-logo">
                    <div className="logo-icon" style={{ background: 'var(--blue-100)', color: 'var(--blue-600)' }}>
                        <UserPlus size={32} />
                    </div>
                    <h2>New Lead Request</h2>
                    <p>Register as a prospect to track project progress & collaborate with our team.</p>
                </div>

                {error && <div className="alert alert-error">{error}</div>}
                {success && <div className="alert alert-success">{success}</div>}

                <form onSubmit={handleSubmit} className="login-form">
                    <div className="form-group">
                        <label>Business Representative Name *</label>
                        <input
                            type="text"
                            required
                            placeholder="John Doe"
                            className="form-control"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                        />
                    </div>
                    <div className="form-group">
                        <label>Lead Email Address *</label>
                        <input
                            type="email"
                            required
                            placeholder="leads@example.com"
                            className="form-control"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                        />
                    </div>
                    <div className="form-group">
                        <label>Contact Number (Primary)</label>
                        <input
                            type="tel"
                            placeholder="+1 234 567 890"
                            className="form-control"
                            value={phone}
                            onChange={(e) => setPhone(e.target.value)}
                        />
                    </div>
                    <div className="form-group">
                        <label>System Password *</label>
                        <input
                            type="password"
                            required
                            minLength={6}
                            placeholder="••••••••"
                            className="form-control"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                        />
                    </div>
                    <button type="submit" disabled={loading} className="btn btn-primary w-full shadow-lg">
                        {loading ? 'Creating Lead Account...' : 'Submit Lead Request'} <ArrowRight size={18} style={{ marginLeft: 8 }} />
                    </button>

                    <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 20, textAlign: 'center' }}>
                        Our team will contact you for detailed requirements after registration.
                    </p>

                    <div style={{ textAlign: 'center', marginTop: 24, fontSize: '0.9rem' }}>
                        Already have a lead account? <Link to="/lead-login" style={{ color: 'var(--blue-600)', fontWeight: 700 }}>Lead Login</Link>
                    </div>
                </form>
            </div>
        </div>
    );
}
