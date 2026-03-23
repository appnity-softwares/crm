import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import GlobalHelpButton from '../components/ui/GlobalHelpButton';
import { authAPI } from '../services/api';
import { Briefcase, User, Mail, Phone, Lock, ArrowRight, CheckCircle, Sun, Moon } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

const RegistrationIllustration = "https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&q=80&w=2426&ixlib=rb-4.0.3"; // Fallback URL or use generated one

export default function Register() {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [phone, setPhone] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [loading, setLoading] = useState(false);
    const { dark, toggle } = useTheme();
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setSuccess('');
        setLoading(true);

        try {
            const res = await authAPI.register({ name, email, phone, password });
            setSuccess(res.data.message || 'Account created successfully!');
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
        <div className="register-container">
            {/* Background Decorations */}
            <div className="bg-decoration blur-1"></div>
            <div className="bg-decoration blur-2"></div>
            
            <div className="register-card glass-card">
                <div className="register-content">
                    <div className="register-left">
                        <div className="brand-header">
                            <div className="brand-logo">
                                <Briefcase size={28} />
                            </div>
                            <div className="brand-text">
                                <h3>Appnity</h3>
                                <p>ERP & CRM Solutions</p>
                            </div>
                        </div>
                        
                        <div className="promo-section">
                            <h1>Scale your business <br/><span>faster than ever.</span></h1>
                            <p>Join over 1,000+ businesses managing their team, projects, and finance in one unified workspace.</p>
                            
                            <ul className="feature-list">
                                <li><CheckCircle size={18} /> Centralized Project Management</li>
                                <li><CheckCircle size={18} /> Real-time Finance Analytics</li>
                                <li><CheckCircle size={18} /> Automated Attendance Tracking</li>
                                <li><CheckCircle size={18} /> Secure Client Portals</li>
                            </ul>
                        </div>
                    </div>

                    <div className="register-right">
                        <div className="form-header">
                            <button className="theme-toggle-btn" onClick={toggle} title="Toggle Theme">
                                {dark ? <Sun size={20} /> : <Moon size={20} />}
                            </button>
                            <h2>Get Started</h2>
                            <p>Create your account in seconds</p>
                        </div>

                        {error && <div className="alert-box error">{error}</div>}
                        {success && <div className="alert-box success">
                            <CheckCircle size={20} />
                            <span>{success}</span>
                        </div>}

                        <form onSubmit={handleSubmit} className="modern-form">
                            <div className="input-group">
                                <User size={18} />
                                <input
                                    type="text"
                                    required
                                    placeholder="Full Name"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                />
                            </div>
                            
                            <div className="input-group">
                                <Mail size={18} />
                                <input
                                    type="email"
                                    required
                                    placeholder="Email Address"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                />
                            </div>
                            
                            <div className="input-group">
                                <Phone size={18} />
                                <input
                                    type="tel"
                                    placeholder="Phone Number (Optional)"
                                    value={phone}
                                    onChange={(e) => setPhone(e.target.value)}
                                />
                            </div>
                            
                            <div className="input-group">
                                <Lock size={18} />
                                <input
                                    type="password"
                                    required
                                    placeholder="Password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                />
                            </div>

                            <button type="submit" disabled={loading} className="submit-btn">
                                {loading ? 'Creating Account...' : (
                                    <>
                                        Sign Up Now <ArrowRight size={18} />
                                    </>
                                )}
                            </button>

                            <div className="login-link">
                                Already have an account? <Link to="/login">Sign In</Link>
                            </div>
                        </form>
                    </div>
                </div>
            </div>

            <GlobalHelpButton />

            <style>{`
                .register-container {
                    min-height: 100vh;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    padding: 40px 20px;
                    background: var(--bg-body);
                    position: relative;
                    overflow: hidden;
                }

                .bg-decoration {
                    position: absolute;
                    width: 500px;
                    height: 500px;
                    border-radius: 50%;
                    filter: blur(100px);
                    z-index: 0;
                    opacity: 0.15;
                }

                .blur-1 {
                    top: -100px;
                    right: -100px;
                    background: var(--primary-500);
                }

                .blur-2 {
                    bottom: -100px;
                    left: -100px;
                    background: var(--purple-500);
                }

                .register-card {
                    width: 100%;
                    max-width: 1000px;
                    background: rgba(var(--bg-card-rgb), 0.8) !important;
                    backdrop-filter: blur(20px);
                    -webkit-backdrop-filter: blur(20px);
                    border: 1px solid rgba(255, 255, 255, 0.1);
                    border-radius: 24px;
                    box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
                    z-index: 10;
                    overflow: hidden;
                }

                .register-content {
                    display: grid;
                    grid-template-columns: 1.2fr 1fr;
                    min-height: 600px;
                }

                .register-left {
                    padding: 60px;
                    background: linear-gradient(135deg, var(--primary-600), var(--primary-800));
                    color: white;
                    display: flex;
                    flex-direction: column;
                    justify-content: space-between;
                }

                .brand-header {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                }

                .brand-logo {
                    background: rgba(255, 255, 255, 0.2);
                    padding: 10px;
                    border-radius: 12px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }

                .brand-text h3 {
                    margin: 0;
                    font-size: 1.5rem;
                    font-weight: 800;
                    letter-spacing: -0.5px;
                }

                .brand-text p {
                    margin: 0;
                    font-size: 0.8rem;
                    opacity: 0.8;
                }

                .promo-section h1 {
                    font-size: 2.8rem;
                    line-height: 1.2;
                    margin-bottom: 20px;
                    font-weight: 800;
                }

                .promo-section h1 span {
                    color: var(--primary-200);
                }

                .promo-section p {
                    font-size: 1.1rem;
                    opacity: 0.9;
                    line-height: 1.6;
                    margin-bottom: 40px;
                }

                .feature-list {
                    list-style: none;
                    padding: 0;
                    margin: 0;
                    display: flex;
                    flex-direction: column;
                    gap: 16px;
                }

                .feature-list li {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                    font-weight: 500;
                }

                .register-right {
                    padding: 60px;
                    display: flex;
                    flex-direction: column;
                    justify-content: center;
                    background: var(--bg-card);
                }

                .form-header {
                    margin-bottom: 32px;
                    position: relative;
                }

                .theme-toggle-btn {
                    position: absolute;
                    top: -40px;
                    right: -40px;
                    background: var(--bg-hover);
                    border: none;
                    color: var(--text-primary);
                    width: 40px;
                    height: 40px;
                    border-radius: 10px;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    transition: all 0.2s;
                }

                .theme-toggle-btn:hover {
                    background: var(--primary-100);
                    color: var(--primary-600);
                }

                .form-header h2 {
                    font-size: 2rem;
                    font-weight: 800;
                    margin-bottom: 8px;
                }

                .form-header p {
                    color: var(--text-muted);
                    font-size: 0.95rem;
                }

                .input-group {
                    position: relative;
                    margin-bottom: 20px;
                }

                .input-group svg {
                    position: absolute;
                    left: 16px;
                    top: 50%;
                    transform: translateY(-50%);
                    color: var(--text-muted);
                    transition: all 0.2s;
                }

                .input-group input {
                    width: 100%;
                    padding: 14px 14px 14px 50px;
                    border-radius: 12px;
                    border: 2px solid var(--border);
                    background: var(--bg-body);
                    color: var(--text-primary);
                    font-size: 1rem;
                    transition: all 0.2s;
                }

                .input-group input:focus {
                    outline: none;
                    border-color: var(--primary-500);
                    box-shadow: 0 0 0 4px var(--primary-100);
                }

                .input-group input:focus + svg,
                .input-group:focus-within svg {
                    color: var(--primary-500);
                }

                .submit-btn {
                    width: 100%;
                    padding: 16px;
                    background: var(--primary-600);
                    color: white;
                    border: none;
                    border-radius: 12px;
                    font-size: 1.1rem;
                    font-weight: 700;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 12px;
                    transition: all 0.3s;
                    margin-top: 10px;
                }

                .submit-btn:hover {
                    background: var(--primary-700);
                    transform: translateY(-2px);
                    box-shadow: 0 10px 20px -5px rgba(var(--primary-600-rgb), 0.4);
                }

                .submit-btn:disabled {
                    opacity: 0.7;
                    cursor: not-allowed;
                    transform: none;
                }

                .login-link {
                    text-align: center;
                    margin-top: 24px;
                    font-size: 0.95rem;
                    color: var(--text-muted);
                }

                .login-link a {
                    color: var(--primary-600);
                    font-weight: 700;
                    text-decoration: none;
                }

                .alert-box {
                    padding: 16px;
                    border-radius: 12px;
                    margin-bottom: 24px;
                    display: flex;
                    align-items: center;
                    gap: 12px;
                    font-size: 0.95rem;
                }

                .alert-box.error {
                    background: #fef2f2;
                    color: #991b1b;
                    border: 1px solid #fee2e2;
                }

                .alert-box.success {
                    background: #f0fdf4;
                    color: #166534;
                    border: 1px solid #dcfce7;
                }

                @media (max-width: 900px) {
                    .register-content {
                        grid-template-columns: 1fr;
                    }
                    .register-left {
                        display: none;
                    }
                    .register-right {
                        padding: 40px;
                    }
                }
                
                @media (max-width: 480px) {
                    .register-right {
                        padding: 30px 20px;
                    }
                    .form-header h2 {
                        font-size: 1.75rem;
                    }
                }
            `}</style>
        </div>
    );
}
