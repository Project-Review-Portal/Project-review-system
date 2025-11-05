import React, { useState } from 'react';
import axios from 'axios';
import '../../styles/AuthForms.css'; // Reusing styling

const GuideAllotmentApproval = () => {
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleApproveAllotment = async () => {
        setLoading(true);
        setMessage('');
        setError('');
        try {
            const token = localStorage.getItem('token');
            if (!token) {
                setError('Authentication required.');
                setLoading(false);
                return;
            }

            const res = await axios.put('http://localhost:5000/api/guide/approve-allotment', {}, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            setMessage(res.data.message);
        } catch (err) {
            console.error('Error approving allotment:', err);
            setError(err.response?.data?.message || 'Failed to approve allotment.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="auth-container">
            <div className="auth-card">
                <h2 className="auth-title">Approve Guide Allotment</h2>
                {error && <p className="error-message">{error}</p>}
                {message && <p className="success-message">{message}</p>}

                <p>Click the button below to approve your guide allotment request.</p>
                <p className="info-message">
                    Once approved, this will finalize your assignment to the team and cannot be changed later.
                </p>

                <button
                    className="auth-button"
                    onClick={handleApproveAllotment}
                    disabled={loading}
                >
                    {loading ? 'Approving...' : 'Approve Allotment'}
                </button>
            </div>
        </div>
    );
};

export default GuideAllotmentApproval;