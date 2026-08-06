import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from '../../utils/toast';
import '../../styles/AuthForms.css'; // Reusing styling
const SERVER_API_KEY= process.env.REACT_APP_SERVER_API_KEY ||"http://localhost:3626"; 
const GuideAllotmentApproval = () => {
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (error) {
            toast.error(error);
            setError('');
        }
    }, [error]);

    useEffect(() => {
        if (message) {
            toast.success(message);
            setMessage('');
        }
    }, [message]);

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

            const res = await axios.put(`${SERVER_API_KEY}/api/guide/approve-allotment`, {}, {
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