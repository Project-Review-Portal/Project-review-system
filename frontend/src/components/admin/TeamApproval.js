import React, { useState, useEffect } from 'react';
import axios from 'axios';
import '../../styles/TeamApproval.css'; // Import new CSS

const TeamApproval = () => {
    const [teams, setTeams] = useState([]);
    const [message, setMessage] = useState('');
    const [messageType, setMessageType] = useState('');

    const fetchTeams = async () => {
        try {
            const token = localStorage.getItem('token');
            // We're using the existing panel-assignment endpoint that returns teams
            // as there's no specific 'get all teams' or 'get pending teams' route for admin
            const response = await axios.get('http://localhost:5000/api/panel-assignments/panels-teams', {
                headers: { Authorization: `Bearer ${token}` }
            });
            // Filter for pending teams on the frontend
            const pendingTeams = response.data.teams.filter(team => team.status === 'pending');
            setTeams(pendingTeams);
            setMessage('');
        } catch (error) {
            console.error('Error fetching teams:', error.response?.data || error.message);
            setMessage('Failed to load teams for approval.');
            setMessageType('error');
        }
    };

    useEffect(() => {
        fetchTeams();
    }, []);

    const handleApproval = async (teamId, status) => {
        setMessage(''); // Clear previous messages
        try {
            const token = localStorage.getItem('token');
            const response = await axios.post('http://localhost:5000/api/admin/approve-reject-team',
                { teamId, status },
                { headers: { Authorization: `Bearer ${token}` } }
            );
            setMessage(response.data.message);
            setMessageType('success');
            fetchTeams(); // Refresh the list of teams
        } catch (error) {
            console.error(`Error ${status}ing team:`, error.response?.data || error.message);
            setMessage(error.response?.data?.message || `Failed to ${status} team.`);
            setMessageType('error');
        }
    };

    return (
        <div className="team-approval-container">
            <h2>Team Approval & Rejection</h2>
            {message && <p className={`message ${messageType}`}>{message}</p>}
            {teams.length === 0 ? (
                <p className="no-teams-message">No pending teams to display.</p>
            ) : (
                <ul className="team-list">
                    {teams.map((team) => (
                        <li key={team._id} className="team-item">
                            <p><strong>Team Name:</strong> {team.teamName}</p>
                            <p><strong>Leader:</strong> {team.teamLeader ? team.teamLeader.username : 'N/A'}</p>
                            <p><strong>Members:</strong> {team.members && team.members.length > 0
                                ? team.members.map(m => m.username).join(', ')
                                : 'No members'}</p>
                            <p><strong>Guide Preference:</strong> {team.guidePreference ? team.guidePreference.username : 'None'}</p>
                            <p><strong>Current Status:</strong> <span className={`status-${team.status}`}>{team.status.toUpperCase()}</span></p>
                            <div className="team-actions">
                                <button
                                    onClick={() => handleApproval(team._id, 'approved')}
                                    className="approve-btn"
                                >
                                    Approve
                                </button>
                                <button
                                    onClick={() => handleApproval(team._id, 'rejected')}
                                    className="reject-btn"
                                >
                                    Reject
                                </button>
                            </div>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
};

export default TeamApproval;