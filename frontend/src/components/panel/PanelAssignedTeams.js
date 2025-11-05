import React, { useState, useEffect } from 'react';
import axios from 'axios';

const PanelAssignedTeams = () => {
    const [assignedTeams, setAssignedTeams] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        fetchAssignedTeams();
    }, []);

    const fetchAssignedTeams = async () => {
        try {
            const token = localStorage.getItem('token');
            
            // Debug logging
            console.log('🔍 Frontend Debug - Token from localStorage:', token ? 'Present' : 'Missing');
            console.log('🔍 Frontend Debug - Token length:', token ? token.length : 0);
            console.log('🔍 Frontend Debug - User object from context:', JSON.parse(localStorage.getItem('user') || '{}'));
            
            if (!token) {
                console.error('❌ No token found in localStorage');
                setError('Authentication token not found. Please login again.');
                setLoading(false);
                return;
            }
            
            // Check if token is expired
            try {
                const tokenPayload = JSON.parse(atob(token.split('.')[1]));
                const currentTime = Math.floor(Date.now() / 1000);
                if (tokenPayload.exp < currentTime) {
                    console.error('❌ Token has expired');
                    localStorage.removeItem('token');
                    localStorage.removeItem('user');
                    setError('Your session has expired. Please login again.');
                    setLoading(false);
                    return;
                }
                console.log('✅ Token is valid, expires at:', new Date(tokenPayload.exp * 1000));
            } catch (error) {
                console.error('❌ Invalid token format');
                setError('Invalid authentication token. Please login again.');
                setLoading(false);
                return;
            }
            
            // First, let's debug the token
            console.log('🔍 Testing token with debug endpoint...');
            console.log('🔍 Full token:', token);
            try {
                const debugResponse = await axios.get('http://localhost:5000/api/panels/debug-token', {
                    headers: { 
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    }
                });
                console.log('🔍 Token debug result:', debugResponse.data);
            } catch (debugError) {
                console.error('❌ Token debug failed:', debugError.response?.status, debugError.response?.data);
                console.error('❌ Full debug error:', debugError);
            }
            
            console.log('🚀 Making request to /api/panels/assigned-teams');
            const response = await axios.get('http://localhost:5000/api/panels/assigned-teams', {
                headers: { 
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });
            
            console.log('✅ Success! Response:', response.status, response.data);
            setAssignedTeams(response.data);
            setLoading(false);
        } catch (err) {
            console.error('❌ Error fetching assigned teams:', err);
            console.error('❌ Error response:', err.response?.data);
            console.error('❌ Error status:', err.response?.status);
            setError(`Failed to fetch assigned teams: ${err.response?.data?.message || err.message}`);
            setLoading(false);
        }
    };

    if (loading) return <div className="text-center p-4">Loading assigned teams...</div>;
    if (error) return <div className="text-red-500 p-4">{error}</div>;

    return (
        <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-2xl font-bold mb-6">Your Assigned Teams</h2>

            {assignedTeams.length === 0 ? (
                <p>No teams have been assigned to your panel yet.</p>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {assignedTeams.map(team => (
                        <div key={team._id} className="border p-4 rounded-lg shadow-sm">
                            <h3 className="font-semibold text-lg mb-2">Team: {team.teamName}</h3>
                            <p className="text-gray-700">Team Leader: {team.teamLeader?.name || 'N/A'} ({team.teamLeader?.username || 'N/A'})</p>
                            <p className="text-gray-700">Panel: {team.panel?.name || 'Not Assigned'}</p>
                            <p className="text-gray-700">Guide: {team.guidePreference?.name || 'Not Assigned'}</p>
                            <div className="mt-2">
                                <p className="font-medium">Members:</p>
                                {team.members && team.members.length > 0 ? (
                                    <ul className="list-disc list-inside ml-4 text-gray-700">
                                        {team.members.map(member => (
                                            <li key={member._id}>{member.name || member.username}</li>
                                        ))}
                                    </ul>
                                ) : (
                                    <p className="text-gray-500">No members listed.</p>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default PanelAssignedTeams; 