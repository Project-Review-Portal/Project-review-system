import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
const SERVER_API_KEY= process.env.REACT_APP_SERVER_API_KEY ||"http://localhost:3626";
const Login = () => {
    const [formData, setFormData] = useState({
        email: '',
        password: '',
    });
    const [mode, setMode] = useState('login');
    const [identifier, setIdentifier] = useState('');
    const [otp, setOtp] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmNewPassword, setConfirmNewPassword] = useState('');
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
        setError(''); // Clear error when user makes changes
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        setSuccess('');

        try {
            // Backend expects 'username'. We send the email as username.
            const payload = {
                username: formData.email,
                password: formData.password
            };
            const res = await axios.post(`${SERVER_API_KEY}/api/auth/login`, payload);
            localStorage.setItem('token', res.data.token);
            localStorage.setItem('user', JSON.stringify(res.data.user));
            
            // Navigate based on the user's primary role
            const user = res.data.user;
            const primaryRole = user.role;
            if (user.mustChangePassword) {
                navigate('/reset-password');
                return;
            }
            
            if (primaryRole === 'admin') {
                navigate('/admin-dashboard');
            } else if (primaryRole === 'student') {
                navigate('/student-dashboard');
            } else {
                // Faculty user (coordinator, assistant coordinator, guide, panel)
                const facultyRoles = (user.roles || []).filter(r => ['guide', 'panel', 'coordinator', 'assistant coordinator'].includes(r.role));
                if (facultyRoles.length > 1) {
                    navigate('/role-selection');
                } else if (primaryRole === 'coordinator' || primaryRole === 'assistant coordinator') {
                    navigate('/coordinator-dashboard/review-schedule');
                } else if (primaryRole === 'guide') {
                    navigate('/guide-dashboard');
                } else if (primaryRole === 'panel') {
                    navigate('/panel-dashboard');
                } else {
                    navigate('/faculty-dashboard');
                }
            }
        } catch (error) {
            setError(error.response?.data?.message || 'Login failed. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const startForgot = () => {
        setMode('forgot-email');
        setIdentifier(formData.email || '');
        setError('');
        setSuccess('');
        setOtp('');
        setNewPassword('');
    };

    const submitForgot = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        setSuccess('');
        try {
            await axios.post(`${SERVER_API_KEY}/api/auth/forgot-password`, { identifier });
            setSuccess('OTP sent to your email.');
            setMode('verify-otp');
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to send OTP');
        } finally {
            setLoading(false);
        }
    };

    const submitVerify = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        setSuccess('');
        try {
            await axios.post(`${SERVER_API_KEY}/api/auth/verify-otp`, { identifier, otp });
            setSuccess('OTP verified.');
            setMode('reset');
        } catch (err) {
            setError(err.response?.data?.message || 'Invalid or expired OTP');
        } finally {
            setLoading(false);
        }
    };

    const submitReset = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        setSuccess('');
        try {
            if (newPassword !== confirmNewPassword) {
                setError('New password and confirmation do not match');
                setLoading(false);
                return;
            }
            await axios.post(`${SERVER_API_KEY}/api/auth/reset-password-otp`, { identifier, otp, newPassword });
            setSuccess('Password reset successful. You can sign in now.');
            setMode('login');
            setFormData({ email: identifier, password: '' });
            setConfirmNewPassword('');
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to reset password');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="auth-shell">
            <aside className="auth-aside" aria-label="Project Review System">
                <div className="brand-lockup">
                    <div className="brand-mark">PR</div>
                    <div className="auth-aside-copy">
                        <h1>Every review, clearly in control.</h1>
                        <p>A focused workspace for project teams, guides, panels, and coordinators to manage the complete review lifecycle.</p>
                    </div>
                </div>
                <div className="auth-aside-meta"><span className="w-2 h-2 rounded-full bg-emerald-300"></span> Secure academic workspace</div>
            </aside>
            <div className="auth-panel">
            <div className="auth-card space-y-6">
                <p className="auth-eyebrow">Project review system</p>
                <h2>
                    {mode === 'login' ? 'Welcome back' : mode === 'forgot-email' ? 'Reset your password' : mode === 'verify-otp' ? 'Verify your identity' : 'Create a new password'}
                </h2>
                <p className="auth-description">
                    {mode === 'login' ? 'Sign in to continue to your review workspace.' : 'Follow the secure steps below to regain access to your workspace.'}
                </p>
                {error && (
                    <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
                        <span className="block sm:inline">{error}</span>
                    </div>
                )}
                {success && (
                    <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded relative" role="alert">
                        <span className="block sm:inline">{success}</span>
                    </div>
                )}
                {mode === 'login' && (
                    <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
                        <div className="space-y-4">
                            <div>
                                <label htmlFor="email" className="block text-sm font-medium text-gray-700">Email or Username</label>
                                <div className="mt-1">
                                    <input
                                        id="email"
                                        name="email"
                                        type="text"
                                        required
                                        className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                                        placeholder="Enter your email or username"
                                        value={formData.email}
                                        onChange={handleChange}
                                    />
                                </div>
                            </div>
                            <div>
                                <label htmlFor="password" className="block text-sm font-medium text-gray-700">Password</label>
                                <div className="mt-1">
                                    <input
                                        id="password"
                                        name="password"
                                        type="password"
                                        required
                                        className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                                        placeholder="Enter your password"
                                        value={formData.password}
                                        onChange={handleChange}
                                    />
                                </div>
                            </div>
                        
                        </div>
                        
                        <div className="space-y-3">
                            <button
                                type="submit"
                                disabled={loading}
                                className={`auth-primary group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium text-white ${
                                    loading ? 'opacity-60' : ''
                                } focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500`}
                            >
                                {loading ? 'Signing in...' : 'Sign in'}
                            </button>
                            <button
                                type="button"
                                onClick={startForgot}
                                className="auth-link w-full text-sm"
                            >
                                Forgot password?
                            </button>
                        </div>
                    </form>
                )}

                {mode === 'forgot-email' && (
                    <form className="mt-8 space-y-6" onSubmit={submitForgot}>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Email or Username</label>
                            <input
                                type="text"
                                required
                                className="mt-1 appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                                placeholder="Enter your registered email or username"
                                value={identifier}
                                onChange={(e) => setIdentifier(e.target.value)}
                            />
                        </div>
                        <div className="space-y-3">
                            <button
                                type="submit"
                                disabled={loading}
                                className={`auth-primary w-full py-2 px-4 text-sm font-medium text-white ${
                                    loading ? 'opacity-60' : ''
                                }`}
                            >
                                {loading ? 'Sending...' : 'Send OTP'}
                            </button>
                            <button type="button" onClick={() => setMode('login')} className="auth-link w-full text-sm">Back to sign in</button>
                        </div>
                    </form>
                )}

                {mode === 'verify-otp' && (
                    <form className="mt-8 space-y-6" onSubmit={submitVerify}>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Email or Username</label>
                            <input
                                type="text"
                                required
                                className="mt-1 appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                                value={identifier}
                                onChange={(e) => setIdentifier(e.target.value)}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">OTP</label>
                            <input
                                type="text"
                                required
                                className="mt-1 appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                                placeholder="Enter 6-digit OTP"
                                value={otp}
                                onChange={(e) => setOtp(e.target.value)}
                            />
                        </div>
                        <div className="space-y-3">
                            <button
                                type="submit"
                                disabled={loading}
                                className={`auth-primary w-full py-2 px-4 text-sm font-medium text-white ${
                                    loading ? 'opacity-60' : ''
                                }`}
                            >
                                {loading ? 'Verifying...' : 'Verify OTP'}
                            </button>
                            <button type="button" onClick={() => setMode('forgot-email')} className="auth-link w-full text-sm">Back</button>
                        </div>
                    </form>
                )}

                {mode === 'reset' && (
                    <form className="mt-8 space-y-6" onSubmit={submitReset}>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Email or Username</label>
                            <input
                                type="text"
                                required
                                className="mt-1 appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                                value={identifier}
                                onChange={(e) => setIdentifier(e.target.value)}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">OTP</label>
                            <input
                                type="text"
                                required
                                className="mt-1 appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                                placeholder="Enter 6-digit OTP"
                                value={otp}
                                onChange={(e) => setOtp(e.target.value)}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">New Password</label>
                            <input
                                type="password"
                                required
                                className="mt-1 appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                                placeholder="Enter new password"
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Confirm New Password</label>
                            <input
                                type="password"
                                required
                                className="mt-1 appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                                placeholder="Re-enter new password"
                                value={confirmNewPassword}
                                onChange={(e) => setConfirmNewPassword(e.target.value)}
                            />
                        </div>
                        <div className="space-y-3">
                            <button
                                type="submit"
                                disabled={loading}
                                className={`auth-primary w-full py-2 px-4 text-sm font-medium text-white ${
                                    loading ? 'opacity-60' : ''
                                }`}
                            >
                                {loading ? 'Resetting...' : 'Reset Password'}
                            </button>
                            <button type="button" onClick={() => setMode('login')} className="auth-link w-full text-sm">Back to sign in</button>
                        </div>
                    </form>
                )}
                
                {/* Login form footer */}
            </div>
            </div>
        </div>
    );
};

export default Login;
