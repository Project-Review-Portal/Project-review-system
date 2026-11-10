import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { 
  MailIcon, 
  LockIcon, 
  KeyIcon, 
  EyeIcon, 
  EyeOffIcon, 
  ShieldCheckIcon, 
  AlertTriangleIcon, 
  CheckCircleIcon,
  ArrowRightIcon,
  SparklesIcon
} from './ui/Icons';

const SERVER_API_KEY = process.env.REACT_APP_SERVER_API_KEY || "http://localhost:3626";

const Login = () => {
    const [formData, setFormData] = useState({
        email: '',
        password: '',
    });
    const [showPassword, setShowPassword] = useState(false);
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
            const user = res.data.user;
            const session = res.data.session;

            if (session) {
                localStorage.setItem('selectedSessionId', session._id);
                localStorage.setItem('selectedSessionName', session.name);
            }

            // If non-admin and the current session is paused, prevent direct access
            if (user.role === 'student' && session && session.status === 'paused') {
                setError('The portal is currently paused by the administrator for this session.');
                localStorage.removeItem('token');
                localStorage.removeItem('user');
                setLoading(false);
                return;
            }

            localStorage.setItem('token', res.data.token);
            localStorage.setItem('user', JSON.stringify(res.data.user));
            
            // Navigate based on the user's primary role
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
                // Faculty always goes through session/role selection
                navigate('/role-selection');
            }
        } catch (error) {
            setError(error.response?.data?.message || 'Invalid credentials. Please verify your username and password.');
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
            setSuccess('One-time password (OTP) sent to your registered email.');
            setMode('verify-otp');
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to send OTP. Please check the email.');
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
            setSuccess('OTP verified successfully. Create a new password.');
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
                setError('New password and confirmation do not match.');
                setLoading(false);
                return;
            }
            await axios.post(`${SERVER_API_KEY}/api/auth/reset-password-otp`, { identifier, otp, newPassword });
            setSuccess('Password reset successful. You can now sign in.');
            setMode('login');
            setFormData({ email: identifier, password: '' });
            setConfirmNewPassword('');
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to reset password.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-[100dvh] flex items-center justify-center bg-mesh-pattern relative overflow-hidden px-4 py-16">
            {/* Taste Skill: Ambient Multi-Layer Lighting Wash */}
            <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-[650px] h-[450px] bg-gradient-to-b from-blue-500/10 to-transparent rounded-full blur-3xl pointer-events-none" />
            <div className="absolute -bottom-24 right-1/4 w-[500px] h-[350px] bg-slate-300/20 rounded-full blur-3xl pointer-events-none" />

            {/* Central Liquid Glass Card with Edge Refraction */}
            <div className="liquid-glass max-w-md w-full rounded-3xl p-8 sm:p-11 relative z-10 transition-all">
                {/* Brand Header */}
                <div className="text-center mb-8">
                    {/* Emblem */}
                    <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-slate-900 text-white shadow-md shadow-slate-900/10 mb-4 ring-4 ring-white/60">
                        <svg className="w-6 h-6 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                        </svg>
                    </div>

                    <div className="flex items-center justify-center gap-2 mb-2">
                        <span className="text-[11px] font-bold uppercase tracking-widest text-slate-400">
                            Academic Portal · v2.4
                        </span>
                    </div>

                    <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                        {mode === 'login' && 'Welcome Back'}
                        {mode === 'forgot-email' && 'Reset Password'}
                        {mode === 'verify-otp' && 'Verify Code'}
                        {mode === 'reset' && 'Create Password'}
                    </h1>
                    <p className="text-xs text-slate-500 mt-1 max-w-[32ch] mx-auto leading-relaxed">
                        {mode === 'login' && 'Sign in with your institutional credentials to access reviews & attendance.'}
                        {mode === 'forgot-email' && 'Enter your registered email to receive an instant verification code.'}
                        {mode === 'verify-otp' && `Enter the 6-digit verification code sent to ${identifier}.`}
                        {mode === 'reset' && 'Choose a strong password to secure your portal account.'}
                    </p>
                </div>

                {/* Notifications */}
                {error && (
                    <div className="mb-6 p-4 rounded-2xl text-xs font-semibold bg-rose-50/90 border border-rose-200/90 text-rose-800 flex items-start gap-3 shadow-xs" role="alert">
                        <AlertTriangleIcon className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />
                        <span className="leading-relaxed">{error}</span>
                    </div>
                )}
                {success && (
                    <div className="mb-6 p-4 rounded-2xl text-xs font-semibold bg-emerald-50/90 border border-emerald-200/90 text-emerald-800 flex items-start gap-3 shadow-xs" role="alert">
                        <CheckCircleIcon className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                        <span className="leading-relaxed">{success}</span>
                    </div>
                )}

                {/* Mode: Sign In */}
                {mode === 'login' && (
                    <form className="space-y-4" onSubmit={handleSubmit}>
                        <div>
                            <label htmlFor="email" className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1.5">
                                Institutional ID / Email
                            </label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                                    <MailIcon className="w-4 h-4" />
                                </div>
                                <input
                                    id="email"
                                    name="email"
                                    type="text"
                                    required
                                    className="neo-input block w-full pl-10 pr-3.5 py-2.5 rounded-xl text-sm font-medium text-slate-900 placeholder-slate-400"
                                    placeholder="e.g. john.doe@univ.edu"
                                    value={formData.email}
                                    onChange={handleChange}
                                />
                            </div>
                        </div>

                        <div>
                            <div className="flex items-center justify-between mb-1.5">
                                <label htmlFor="password" className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                                    Password
                                </label>
                                <button
                                    type="button"
                                    onClick={startForgot}
                                    className="text-xs font-semibold text-blue-600 hover:text-blue-800 transition"
                                >
                                    Forgot?
                                </button>
                            </div>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                                    <LockIcon className="w-4 h-4" />
                                </div>
                                <input
                                    id="password"
                                    name="password"
                                    type={showPassword ? 'text' : 'password'}
                                    required
                                    className="neo-input block w-full pl-10 pr-10 py-2.5 rounded-xl text-sm font-medium text-slate-900 placeholder-slate-400"
                                    placeholder="••••••••••••"
                                    value={formData.password}
                                    onChange={handleChange}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 transition"
                                >
                                    {showPassword ? <EyeOffIcon className="w-4 h-4" /> : <EyeIcon className="w-4 h-4" />}
                                </button>
                            </div>
                        </div>

                        <div className="pt-3">
                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full py-3 px-4 rounded-xl text-xs font-bold uppercase tracking-wider text-white bg-slate-900 hover:bg-slate-800 active:scale-[0.98] transition-all shadow-md shadow-slate-900/10 hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                            >
                                {loading ? (
                                    <>
                                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                        <span>Authenticating...</span>
                                    </>
                                ) : (
                                    <>
                                        <span>Sign In to Portal</span>
                                        <ArrowRightIcon className="w-4 h-4" />
                                    </>
                                )}
                            </button>
                        </div>
                    </form>
                )}

                {/* Mode: Forgot Password */}
                {mode === 'forgot-email' && (
                    <form className="space-y-4" onSubmit={submitForgot}>
                        <div>
                            <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1.5">
                                Registered Email Address
                            </label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                                    <MailIcon className="w-4 h-4" />
                                </div>
                                <input
                                    type="email"
                                    required
                                    className="neo-input block w-full pl-10 pr-3.5 py-2.5 rounded-xl text-sm font-medium text-slate-900 placeholder-slate-400"
                                    placeholder="Enter registered email"
                                    value={identifier}
                                    onChange={(e) => setIdentifier(e.target.value)}
                                />
                            </div>
                        </div>

                        <div className="space-y-2 pt-2">
                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full py-3 px-4 rounded-xl text-xs font-bold uppercase tracking-wider text-white bg-slate-900 hover:bg-slate-800 active:scale-[0.98] transition-all shadow-md disabled:opacity-50 flex items-center justify-center gap-2"
                            >
                                {loading ? 'Dispatching Code...' : 'Send Verification Code'}
                            </button>
                            <button 
                                type="button" 
                                onClick={() => setMode('login')} 
                                className="w-full py-2 text-xs font-semibold text-slate-500 hover:text-slate-800 transition"
                            >
                                ← Return to Sign In
                            </button>
                        </div>
                    </form>
                )}

                {/* Mode: Verify OTP */}
                {mode === 'verify-otp' && (
                    <form className="space-y-4" onSubmit={submitVerify}>
                        <div>
                            <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1.5">
                                Verification Code (OTP)
                            </label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                                    <KeyIcon className="w-4 h-4" />
                                </div>
                                <input
                                    type="text"
                                    required
                                    className="neo-input block w-full pl-10 pr-3.5 py-2.5 rounded-xl text-sm font-mono tracking-widest text-slate-900 placeholder-slate-400"
                                    placeholder="Enter 6-digit OTP"
                                    value={otp}
                                    onChange={(e) => setOtp(e.target.value)}
                                />
                            </div>
                        </div>

                        <div className="space-y-2 pt-2">
                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full py-3 px-4 rounded-xl text-xs font-bold uppercase tracking-wider text-white bg-slate-900 hover:bg-slate-800 active:scale-[0.98] transition-all shadow-md disabled:opacity-50 flex items-center justify-center gap-2"
                            >
                                {loading ? 'Verifying...' : 'Verify Security Code'}
                            </button>
                            <button 
                                type="button" 
                                onClick={() => setMode('forgot-email')} 
                                className="w-full py-2 text-xs font-semibold text-slate-500 hover:text-slate-800 transition"
                            >
                                ← Back
                            </button>
                        </div>
                    </form>
                )}

                {/* Mode: Reset Password */}
                {mode === 'reset' && (
                    <form className="space-y-4" onSubmit={submitReset}>
                        <div>
                            <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1.5">
                                New Password
                            </label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                                    <LockIcon className="w-4 h-4" />
                                </div>
                                <input
                                    type="password"
                                    required
                                    className="neo-input block w-full pl-10 pr-3.5 py-2.5 rounded-xl text-sm font-medium text-slate-900 placeholder-slate-400"
                                    placeholder="Enter new password"
                                    value={newPassword}
                                    onChange={(e) => setNewPassword(e.target.value)}
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1.5">
                                Confirm New Password
                            </label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                                    <LockIcon className="w-4 h-4" />
                                </div>
                                <input
                                    type="password"
                                    required
                                    className="neo-input block w-full pl-10 pr-3.5 py-2.5 rounded-xl text-sm font-medium text-slate-900 placeholder-slate-400"
                                    placeholder="Re-enter password"
                                    value={confirmNewPassword}
                                    onChange={(e) => setConfirmNewPassword(e.target.value)}
                                />
                            </div>
                        </div>

                        <div className="space-y-2 pt-2">
                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full py-3 px-4 rounded-xl text-xs font-bold uppercase tracking-wider text-white bg-slate-900 hover:bg-slate-800 active:scale-[0.98] transition-all shadow-md disabled:opacity-50 flex items-center justify-center gap-2"
                            >
                                {loading ? 'Saving...' : 'Update Password'}
                            </button>
                            <button 
                                type="button" 
                                onClick={() => setMode('login')} 
                                className="w-full py-2 text-xs font-semibold text-slate-500 hover:text-slate-800 transition"
                            >
                                ← Return to Sign In
                            </button>
                        </div>
                    </form>
                )}
            </div>
        </div>
    );
};

export default Login;
