import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { employeeAPI } from '../services/api';
import Modal from '../components/ui/Modal';
import { useToast } from '../components/ui/Toast';
import { User, Mail, Shield, Phone, Building, Calendar, Edit3, Key, Loader2, Camera } from 'lucide-react';
import { uploadToCloudinary } from '../services/cloudinary';
import { userAPI } from '../services/api';

export default function Profile() {
    const { user, login } = useAuth();
    const { dark } = useTheme();
    const toast = useToast();

    const [isPasswordModalOpen, setPasswordModalOpen] = useState(false);
    const [isProfileModalOpen, setProfileModalOpen] = useState(false);
    const [saving, setSaving] = useState(false);

    const [profileForm, setProfileForm] = useState({
        name: user?.name || '',
        phone: user?.phone || '',
        email: user?.email || '',
        designation: user?.designation || '',
        department: user?.department || ''
    });

    const [passwordForm, setPasswordForm] = useState({
        current: '',
        new: '',
        confirm: ''
    });

    const handleUpdateProfile = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            await userAPI.updateProfile(profileForm);
            toast('Profile updated successfully', 'success');
            setProfileModalOpen(false);
            window.location.reload();
        } catch (err) {
            toast(err.response?.data?.error || 'Failed to update profile', 'error');
        } finally { setSaving(false); }
    };

    const handleAvatarUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        setSaving(true);
        try {
            const url = await uploadToCloudinary(file);
            await userAPI.updateProfile({ avatar: url });
            toast('Avatar updated!', 'success');
            window.location.reload();
        } catch (err) {
            toast(err.message || 'Upload failed', 'error');
        } finally { setSaving(false); }
    };

    const handleUpdatePassword = async (e) => {
        e.preventDefault();
        if (passwordForm.new !== passwordForm.confirm) {
            return toast('Passwords do not match', 'error');
        }
        setSaving(true);
        try {
            await employeeAPI.update(user.id, { password: passwordForm.new });
            toast('Password updated successfully', 'success');
            setPasswordModalOpen(false);
            setPasswordForm({ current: '', new: '', confirm: '' });
        } catch (err) {
            toast(err.response?.data?.error || 'Failed to update password', 'error');
        } finally { setSaving(false); }
    };

    const initials = user?.name?.split(' ').map(n => n[0]).join('').toUpperCase() || '?';

    return (
        <div className="page-content">
            <div className="header-left" style={{ marginBottom: 32 }}>
                <h1 style={{ fontSize: '1.75rem', fontWeight: 800 }}>My Account</h1>
                <p style={{ color: 'var(--text-muted)' }}>Manage your workspace profile and security settings.</p>
            </div>

            <div className="profile-grid">
                <div className="profile-sidebar">
                    <div className="profile-avatar-card" style={{ marginBottom: 24, padding: '32px 24px', textAlign: 'center' }}>
                        <div className="profile-avatar-wrapper" style={{ position: 'relative', width: 90, height: 90, margin: '0 auto' }}>
                            {user?.avatar ? (
                                <img src={user.avatar} alt={user.name} style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
                            ) : (
                                <div className="profile-avatar-large" style={{ width: 90, height: 90, fontSize: '2rem' }}>{initials}</div>
                            )}
                            <label className="avatar-upload-btn" style={{
                                position: 'absolute', bottom: 0, right: 0, background: 'var(--primary-600)',
                                color: 'white', padding: 6, borderRadius: '50%', cursor: 'pointer',
                                border: '3px solid var(--bg-card)', display: 'flex'
                            }}>
                                <Camera size={14} />
                                <input type="file" hidden accept="image/*" onChange={handleAvatarUpload} />
                            </label>
                        </div>
                        <h2 style={{ marginTop: 16 }}>{user?.name}</h2>
                        <div style={{ display: 'flex', justifyContent: 'center', marginTop: 8 }}>
                            <div className="profile-role" style={{ background: 'var(--primary-100)', color: 'var(--primary-700)', padding: '4px 12px', borderRadius: 20, fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase' }}>
                                {user?.role}
                            </div>
                        </div>
                        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: 8 }}>{user?.email}</p>

                        <div style={{ marginTop: 32, display: 'flex', flexDirection: 'column', gap: 10 }}>
                            <button className="btn btn-secondary w-full" onClick={() => setProfileModalOpen(true)}>
                                <Edit3 size={15} /> Edit Profile
                            </button>
                            <button className="btn btn-secondary w-full" onClick={() => setPasswordModalOpen(true)}>
                                <Key size={15} /> Change Password
                            </button>
                        </div>
                    </div>
                </div>

                <div className="profile-content">
                    <div className="card">
                        <div className="card-header">
                            <h3>Personal Information</h3>
                        </div>
                        <div className="profile-details" style={{ padding: 0 }}>
                            <div className="profile-detail-row" style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)' }}>
                                <div className="label"><User size={14} style={{ display: 'inline', marginRight: 8 }} /> Full Name</div>
                                <div className="value" style={{ fontWeight: 600 }}>{user?.name}</div>
                            </div>
                            <div className="profile-detail-row" style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)' }}>
                                <div className="label"><Mail size={14} style={{ display: 'inline', marginRight: 8 }} /> Email</div>
                                <div className="value">{user?.email}</div>
                            </div>
                            <div className="profile-detail-row" style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)' }}>
                                <div className="label"><Shield size={14} style={{ display: 'inline', marginRight: 8 }} /> Role</div>
                                <div className="value"><span style={{ textTransform: 'capitalize' }}>{user?.role}</span> Portal Access</div>
                            </div>
                            <div className="profile-detail-row" style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)' }}>
                                <div className="label"><Phone size={14} style={{ display: 'inline', marginRight: 8 }} /> Phone</div>
                                <div className="value">{user?.phone || 'Not provided'}</div>
                            </div>
                            <div className="profile-detail-row" style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)' }}>
                                <div className="label"><Building size={14} style={{ display: 'inline', marginRight: 8 }} /> Department</div>
                                <div className="value">{user?.department || 'General'}</div>
                            </div>
                            <div className="profile-detail-row" style={{ padding: '16px 20px' }}>
                                <div className="label"><Calendar size={14} style={{ display: 'inline', marginRight: 8 }} /> Registered Date</div>
                                <div className="value">{new Date(user?.created_at).toLocaleDateString()}</div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {isPasswordModalOpen && (
                <Modal title="Security Settings" onClose={() => setPasswordModalOpen(false)}>
                    <form onSubmit={handleUpdatePassword}>
                        <div className="form-group" style={{ marginBottom: 20 }}>
                            <label>New Password</label>
                            <input
                                type="password"
                                required
                                value={passwordForm.new}
                                onChange={e => setPasswordForm({ ...passwordForm, new: e.target.value })}
                                placeholder="Create new password"
                                style={{ background: 'var(--bg-body)' }}
                            />
                        </div>
                        <div className="form-group" style={{ marginBottom: 24 }}>
                            <label>Confirm Password</label>
                            <input
                                type="password"
                                required
                                value={passwordForm.confirm}
                                onChange={e => setPasswordForm({ ...passwordForm, confirm: e.target.value })}
                                placeholder="Repeat new password"
                                style={{ background: 'var(--bg-body)' }}
                            />
                        </div>
                        <div className="form-actions">
                            <button type="button" className="btn btn-secondary" onClick={() => setPasswordModalOpen(false)}>Cancel</button>
                            <button type="submit" className="btn btn-primary" disabled={saving}>
                                {saving ? <Loader2 className="spinner-sm" /> : 'Update Security'}
                            </button>
                        </div>
                    </form>
                </Modal>
            )}

            {isProfileModalOpen && (
                <Modal title="Contact Details" onClose={() => setProfileModalOpen(false)}>
                    <form onSubmit={handleUpdateProfile}>
                        <div className="form-group" style={{ marginBottom: 20 }}>
                            <label>Full Name</label>
                            <input
                                type="text"
                                required
                                value={profileForm.name}
                                onChange={e => setProfileForm({ ...profileForm, name: e.target.value })}
                                style={{ background: 'var(--bg-body)' }}
                            />
                        </div>
                        <div className="form-group" style={{ marginBottom: 20 }}>
                            <label>Email Address</label>
                            <input
                                type="email"
                                required
                                value={profileForm.email}
                                onChange={e => setProfileForm({ ...profileForm, email: e.target.value })}
                                style={{ background: 'var(--bg-body)' }}
                            />
                        </div>
                        <div className="form-group" style={{ marginBottom: 24 }}>
                            <label>Phone Number</label>
                            <input
                                type="text"
                                value={profileForm.phone}
                                onChange={e => setProfileForm({ ...profileForm, phone: e.target.value })}
                                style={{ background: 'var(--bg-body)' }}
                                placeholder="+91 XXXX XXXX"
                            />
                        </div>
                        <div className="form-actions">
                            <button type="button" className="btn btn-secondary" onClick={() => setProfileModalOpen(false)}>Cancel</button>
                            <button type="submit" className="btn btn-primary" disabled={saving}>
                                {saving ? <Loader2 className="spinner-sm" /> : 'Save Contact'}
                            </button>
                        </div>
                    </form>
                </Modal>
            )}
        </div>
    );
}
