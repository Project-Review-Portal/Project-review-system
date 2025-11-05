import React, { useState, useEffect } from 'react';
import axios from 'axios';

const MyTeam = () => {
    const [team, setTeam] = useState(null);
    const [loading, setLoading] = useState(true);
    const [apiError, setApiError] = useState('');
    const [noTeamFound, setNoTeamFound] = useState(false);

    useEffect(() => {
        fetchMyTeam();
    }, []);

    const fetchMyTeam = async () => {
        setLoading(true);
        setApiError('');
        setNoTeamFound(false);
        try {
            const token = localStorage.getItem('token');
            if (!token) {
                setApiError('Authentication token not found.');
                setLoading(false);
                return;
            }
            const response = await axios.get('http://localhost:5000/api/teams/my-team', {
                headers: { Authorization: `Bearer ${token}` }
            });
            setTeam(response.data);
        } catch (err) {
            console.error('Error fetching my team:', err);
            if (err.response && err.response.status === 404) {
                setNoTeamFound(true);
                setTeam(null);
            } else {
                setApiError(err.response?.data?.message || 'Failed to fetch team data.');
            }
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return <div className="flex justify-center items-center h-64"><div className="text-lg text-gray-600">Loading...</div></div>;
    }

    if (apiError) {
        return <div className="bg-white p-6 rounded-lg shadow text-red-600">Error: {apiError}</div>;
    }

    if (noTeamFound) {
        return (
            <div className="bg-white p-6 rounded-lg shadow">
                <h2 className="text-xl font-semibold mb-4">My Team</h2>
                <p className="text-gray-600">You are not currently part of any team.</p>
                <p className="text-gray-500 mt-2">
                    Please go to <b>Team Formation</b> to create or join a team.
                </p>
            </div>
        );
    }

    if (!team) {
        return (
            <div className="bg-white p-6 rounded-lg shadow">
                <h2 className="text-xl font-semibold mb-4">My Team</h2>
                <p className="text-gray-600">You are not currently part of any team.</p>
                <p className="text-gray-500 mt-2">
                    Please go to <b>Team Formation</b> to create or join a team.
                </p>
            </div>
        );
    }

    return (
        <div className="bg-white p-6 rounded-lg shadow space-y-6">
            <h2 className="text-xl font-semibold mb-4">My Team</h2>
            
            <div className="mb-4 p-3 bg-blue-100 text-blue-700 rounded">
                <h3 className="font-semibold">Team Name: {team.teamName}</h3>
            </div>

            <div className="border p-4 rounded-lg">
                <h3 className="text-xl font-semibold mb-3">Team Members</h3>
                <ul className="space-y-2">
                    <li className="flex items-center p-2 rounded-md bg-gray-50">
                        <span className="font-medium">Team Leader: {team.teamLeader?.name} ({team.teamLeader?.username})</span>
                    </li>
                    {team.members.map(member => (
                        <li key={member._id} className="flex items-center p-2 rounded-md bg-gray-50">
                            <span className="text-sm">Member: {member.name} ({member.username})</span>
                        </li>
                    ))}
                </ul>
            </div>

            {team.guidePreference && (
                <div className="border p-4 rounded-lg">
                    <h3 className="text-xl font-semibold mb-3">Guide</h3>
                    <p className="text-gray-700">
                        Name: <span className="font-medium">{team.guidePreference.name}</span>
                    </p>
                    <p className="text-gray-700">
                        Status: <span className={`font-medium ${team.status === 'approved' ? 'text-green-600' : team.status === 'rejected' ? 'text-red-600' : 'text-orange-600'}`}>
                            {team.status}
                        </span>
                    </p>
                </div>
            )}
        </div>
    );
};

export default MyTeam; 