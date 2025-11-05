import React, { useState, useEffect } from 'react';
import axios from 'axios';
import '../../styles/AuthForms.css'; // Reusing styling
import '../../styles/Dashboard.css'; // For team list display

const UnassignedTeams = () => {
    const [unassignedTeams, setUnassignedTeams] = useState([]);
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchUnassignedTeams = async () => {
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

                const res = await axios.get('http://localhost:5000/api/admin/unassigned-teams-after-period', {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                setUnassignedTeams(res.data);
                if (res.data.length === 0) {
                    setMessage('No unassigned teams found after the guide assignment period.');
                }
            } catch (err) {
                console.error('Error fetching unassigned teams:', err);
                setError(err.response?.data?.message || 'Failed to fetch unassigned teams. Make sure the guide assignment period has ended.');
            } finally {
                setLoading(false);
            }
        };

        fetchUnassignedTeams();
    }, []);

    if (loading) {
        return <div className="auth-container"><p>Loading unassigned teams...</p></div>;
    }

    return (
        <div className="auth-container">
            <div className="auth-card">
                <h2 className="auth-title">Unassigned Teams (After Period End)</h2>
                {error && <p className="error-message">{error}</p>}
                {message && <p className="success-message">{message}</p>}

                {unassignedTeams.length === 0 && !error ? (
                    <p>All approved teams have a guide, or the assignment period has not yet ended, or no teams meet the criteria.</p>
                ) : (
                    <div className="team-list">
                        {unassignedTeams.map(team => (
                            <div key={team._id} className="team-card">
                                <h4>Team Name: {team.teamName}</h4>
                                <p>Team Leader: {team.teamLeader?.username || 'N/A'}</p>
                                <p>Members: {team.members.map(member => member.username).join(', ') || 'None'}</p>
                                <p>Status: {team.status}</p>
                                <p>Guide Request Status: {team.guidePreference?.status || 'None'}</p>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default UnassignedTeams;