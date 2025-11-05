import React, { useEffect, useState } from 'react';
import axios from 'axios';

const ResetPassword = () => {
  const [form, setForm] = useState({ oldPassword: '', newPassword: '', confirmPassword: '' });
  const [status, setStatus] = useState({ type: '', message: '' });
  const [loading, setLoading] = useState(false);
  const [hasToken, setHasToken] = useState(false);

  useEffect(() => {
    const t = localStorage.getItem('token');
    if (!t) {
      setStatus({ type: 'error', message: 'You must login first to reset your password.' });
      setTimeout(() => { window.location.href = '/'; }, 1200);
    } else {
      setHasToken(true);
    }
  }, []);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    setStatus({ type: '', message: '' });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setStatus({ type: '', message: '' });
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setStatus({ type: 'error', message: 'Missing login session. Please sign in again.' });
        setTimeout(() => { window.location.href = '/'; }, 1000);
        return;
      }
      const res = await axios.post('http://localhost:5000/api/auth/reset-password', form, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setStatus({ type: 'success', message: res.data.message || 'Password updated successfully. Please sign in again.' });
      // Clear session and force re-login
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      setTimeout(() => { window.location.href = '/'; }, 1200);
    } catch (err) {
      setStatus({ type: 'error', message: err.response?.data?.message || 'Failed to reset password' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full space-y-8 p-8 bg-white rounded-lg shadow">
        <h2 className="text-center text-2xl font-bold text-gray-900">Reset Password</h2>
        {status.message && (
          <div className={`${status.type === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'} border px-4 py-3 rounded`}>
            {status.message}
          </div>
        )}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Current (default) password</label>
            <input type="password" name="oldPassword" value={form.oldPassword} onChange={handleChange}
              required className="mt-1 block w-full border border-gray-300 rounded px-3 py-2" />
           
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">New password</label>
            <input type="password" name="newPassword" value={form.newPassword} onChange={handleChange}
              required className="mt-1 block w-full border border-gray-300 rounded px-3 py-2" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Confirm new password</label>
            <input type="password" name="confirmPassword" value={form.confirmPassword} onChange={handleChange}
              required className="mt-1 block w-full border border-gray-300 rounded px-3 py-2" />
          </div>
          <button type="submit" disabled={loading || !hasToken}
            className={`w-full py-2 px-4 text-white rounded ${loading ? 'bg-indigo-400' : 'bg-indigo-600 hover:bg-indigo-700'}`}>
            {loading ? 'Updating...' : 'Update Password'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default ResetPassword;
