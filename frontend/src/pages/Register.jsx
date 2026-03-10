import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { authAPI } from '../services/api';
import { Briefcase } from 'lucide-react';

export default function Register() {
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
            const res = await authAPI.register({ name, email, phone, password });
            setSuccess(res.data.message);
            setTimeout(() => {
                navigate('/login');
            }, 3000);
        } catch (err) {
            setError(err.response?.data?.error || 'Registration failed');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="login-container">
            <div className="login-box">
                <div className="login-logo" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <div className="logo-icon" style={{ marginBottom: 15, background: 'var(--primary-100)', padding: 16, borderRadius: '50%' }}>
                        <Briefcase size={36} color="var(--primary-600)" />
                    </div>
                    <h2>Create an Account</h2>
                    <p>Start your project journey with Appnity Softwares</p>
                </div>

                {error && <div className="alert alert-error">{error}</div>}
                {success && <div className="alert alert-success">{success}</div>}

                <form onSubmit={handleSubmit} className="login-form">
                    <div className="form-group" style={{ marginBottom: 20 }}>
                        <label>Full Name</label>
                        <input
                            type="text"
                            required
                            placeholder="John Doe"
                            className="form-control"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                        />
                    </div>
                    <div className="form-group" style={{ marginBottom: 20 }}>
                        <label>Email Address</label>
                        <input
                            type="email"
                            required
                            placeholder="john@example.com"
                            className="form-control"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                        />
                    </div>
                    <div className="form-group" style={{ marginBottom: 20 }}>
                        <label>Phone Number</label>
                        <input
                            type="tel"
                            placeholder="+1 234 567 890"
                            className="form-control"
                            value={phone}
                            onChange={(e) => setPhone(e.target.value)}
                        />
                    </div>
                    <div className="form-group" style={{ marginBottom: 25 }}>
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
                    <button type="submit" disabled={loading} className="btn btn-primary w-full" style={{ padding: '12px', fontSize: '1rem', fontWeight: 600 }}>
                        {loading ? 'Creating Account...' : 'Sign Up'}
                    </button>

                    <div style={{ textAlign: 'center', marginTop: 20, fontSize: '0.9rem', color: 'var(--text-muted)' }}>
                        Already have an account? <Link to="/login" style={{ color: 'var(--primary-600)', fontWeight: 600 }}>Login here</Link>
                    </div>
                </form>
            </div>
        </div>
    );
}
