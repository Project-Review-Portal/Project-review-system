import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import '../styles/Dashboard.css';

const GuideDashboard = () => {
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState('requests');
    const [guideRequests, setGuideRequests] = useState([]);
    const [assignedTeams, setAssignedTeams] = useState([]);
    const [loading, setLoading] = useState(true);
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');

    useEffect(() => {
        const token = localStorage.getItem('token');
        if (!token) {
            navigate('/login');
            return;
        }

        fetchData();
    }, [navigate]);

    const fetchData = async () => {
        try {
            setLoading(true);
            const token = localStorage.getItem('token');
            
            // Fetch guide requests
            const requestsResponse = await fetch('http://localhost:5000/api/guide/requests', {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            
            if (!requestsResponse.ok) {
                throw new Error('Failed to fetch guide requests');
            }
            
            const requestsData = await requestsResponse.json();
            setGuideRequests(requestsData);

            // Fetch assigned teams
            const teamsResponse = await fetch('http://localhost:5000/api/guide/assigned-teams', {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            
            if (!teamsResponse.ok) {
                throw new Error('Failed to fetch assigned teams');
            }
            
            const teamsData = await teamsResponse.json();
            setAssignedTeams(teamsData);
            
            setError('');
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleRequestAction = async (teamId, action) => {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`http://localhost:5000/api/guide/requests/${teamId}/${action}`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error(`Failed to ${action} request`);
            }

            setMessage(`Request ${action}ed successfully`);
            fetchData(); // Refresh data
        } catch (err) {
            setError(err.message);
        }
    };

    const handleTeamAction = async (teamId, action) => {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`http://localhost:5000/api/guide/teams/${teamId}/${action}`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error(`Failed to ${action} team`);
            }

            setMessage(`Team ${action}ed successfully`);
            fetchData(); // Refresh data
        } catch (err) {
            setError(err.message);
        }
    };

    if (loading) {
        return (
            <div className="dashboard-container">
                <div className="loading">Loading...</div>
            </div>
        );
    }

    return (
        <div className="dashboard-container">
            <div className="dashboard-sidebar">
                <h2>Guide Dashboard</h2>
                <nav>
                    <button 
                        className={`nav-item ${activeTab === 'requests' ? 'active' : ''}`}
                        onClick={() => setActiveTab('requests')}
                    >
                        Guide Requests
                    </button>
                    <button 
                        className={`nav-item ${activeTab === 'teams' ? 'active' : ''}`}
                        onClick={() => setActiveTab('teams')}
                    >
                        My Teams
                    </button>
                </nav>
            </div>

            <div className="dashboard-content">
                {message && <div className="success-message">{message}</div>}
                {error && <div className="error-message">{error}</div>}

                {activeTab === 'requests' && (
                    <div className="dashboard-section">
                        <h3>Pending Guide Requests</h3>
                        {guideRequests.length === 0 ? (
                            <div className="info-message">No pending guide requests</div>
                        ) : (
                            <div className="team-list">
                                {guideRequests.map(request => (
                                    <div key={request._id} className="team-card">
                                        <h4>{request.teamName}</h4>
                                        <p><strong>Project Title:</strong> {request.projectTitle}</p>
                                        <p><strong>Status:</strong> {request.status}</p>
                                        <p><strong>Members:</strong></p>
                                        <ul>
                                            {request.members.map(member => (
                                                <li key={member._id}>
                                                    {member.name} ({member.rollNumber})
                                                </li>
                                            ))}
                                        </ul>
                                        <div className="button-group">
                                            <button 
                                                className="btn btn-accept"
                                                onClick={() => handleRequestAction(request._id, 'accept')}
                                            >
                                                Accept
                                            </button>
                                            <button 
                                                className="btn btn-reject"
                                                onClick={() => handleRequestAction(request._id, 'reject')}
                                            >
                                                Reject
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {activeTab === 'teams' && (
                    <div className="dashboard-section">
                        <h3>My Assigned Teams</h3>
                        {assignedTeams.length === 0 ? (
                            <div className="info-message">No teams assigned yet</div>
                        ) : (
                            <div className="team-list">
                                {assignedTeams.map(team => (
                                    <div key={team._id} className="team-card">
                                        <h4>{team.teamName}</h4>
                                        <p><strong>Project Title:</strong> {team.projectTitle}</p>
                                        <p><strong>Status:</strong> {team.status}</p>
                                        <p><strong>Members:</strong></p>
                                        <ul>
                                            {team.members.map(member => (
                                                <li key={member._id}>
                                                    {member.name} ({member.rollNumber})
                                                </li>
                                            ))}
                                        </ul>
                                        <div className="team-actions">
                                            <button 
                                                className="btn btn-primary"
                                                onClick={() => handleTeamAction(team._id, 'review')}
                                            >
                                                Review Progress
                                            </button>
                                            <button 
                                                className="btn btn-secondary"
                                                onClick={() => handleTeamAction(team._id, 'feedback')}
                                            >
                                                Provide Feedback
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default GuideDashboard;