import React, { useState, useEffect } from 'react';
import axios from 'axios';
import '../../styles/AuthForms.css'; // Reusing styling

const GuideConfig = () => {
    const [maxTeamsPerGuide, setMaxTeamsPerGuide] = useState('');
    const [guideAssignmentPeriodEnd, setGuideAssignmentPeriodEnd] = useState('');
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchConfig = async () => {
            setLoading(true);
            try {
                const token = localStorage.getItem('token');
                if (!token) {
                    setError('Authentication required.');
                    return;
                }

                // Fetch maxTeamsPerGuide
                const teamsPerGuideRes = await axios.get('http://localhost:5000/api/admin/max-teams-per-guide', {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                setMaxTeamsPerGuide(teamsPerGuideRes.data.maxTeamsPerGuide || '');

                // Fetch guideAssignmentPeriodEnd
                const periodEndRes = await axios.get('http://localhost:5000/api/admin/guide-assignment-period-end', {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (periodEndRes.data.guideAssignmentPeriodEnd) {
                    // Format date for input type="date" (YYYY-MM-DD)
                    const date = new Date(periodEndRes.data.guideAssignmentPeriodEnd);
                    setGuideAssignmentPeriodEnd(date.toISOString().split('T')[0]);
                } else {
                    setGuideAssignmentPeriodEnd('');
                }

            } catch (err) {
                console.error('Error fetching guide configuration:', err);
                setError(err.response?.data?.message || 'Failed to fetch guide configuration.');
            } finally {
                setLoading(false);
            }
        };

        fetchConfig();
    }, []);

    const handleSetMaxTeamsPerGuide = async (e) => {
        e.preventDefault();
        setMessage('');
        setError('');
        try {
            const token = localStorage.getItem('token');
            const res = await axios.post('http://localhost:5000/api/admin/max-teams-per-guide', {
                maxTeamsPerGuide: parseInt(maxTeamsPerGuide)
            }, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            setMessage(res.data.message);
        } catch (err) {
            console.error('Error setting max teams per guide:', err);
            setError(err.response?.data?.message || 'Failed to set max teams per guide.');
        }
    };

    const handleSetGuideAssignmentPeriodEnd = async (e) => {
        e.preventDefault();
        setMessage('');
        setError('');
        try {
            const token = localStorage.getItem('token');
            const res = await axios.post('http://localhost:5000/api/admin/guide-assignment-period-end', {
                endDate: guideAssignmentPeriodEnd
            }, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            setMessage(res.data.message);
        } catch (err) {
            console.error('Error setting guide assignment period end:', err);
            setError(err.response?.data?.message || 'Failed to set guide assignment period end.');
        }
    };

    if (loading) {
        return <div className="auth-container"><p>Loading configuration...</p></div>;
    }

    return (
        <div className="auth-container">
            <div className="auth-card">
                <h2 className="auth-title">Guide Configuration</h2>
                {error && <p className="error-message">{error}</p>}
                {message && <p className="success-message">{message}</p>}

                <form onSubmit={handleSetMaxTeamsPerGuide}>
                    <div className="form-group">
                        <label htmlFor="maxTeamsPerGuide">Max Teams Per Guide:</label>
                        <input
                            type="number"
                            id="maxTeamsPerGuide"
                            className="form-control"
                            value={maxTeamsPerGuide}
                            onChange={(e) => setMaxTeamsPerGuide(e.target.value)}
                            min="1"
                            required
                        />
                    </div>
                    <button type="submit" className="auth-button">Set Max Teams Per Guide</button>
                </form>

                <hr style={{ margin: '20px 0' }} />

                <form onSubmit={handleSetGuideAssignmentPeriodEnd}>
                    <div className="form-group">
                        <label htmlFor="guideAssignmentPeriodEnd">Guide Assignment Period End Date:</label>
                        <input
                            type="date"
                            id="guideAssignmentPeriodEnd"
                            className="form-control"
                            value={guideAssignmentPeriodEnd}
                            onChange={(e) => setGuideAssignmentPeriodEnd(e.target.value)}
                            required
                        />
                    </div>
                    <button type="submit" className="auth-button">Set Period End Date</button>
                </form>
            </div>
        </div>
    );
};

export default GuideConfig;