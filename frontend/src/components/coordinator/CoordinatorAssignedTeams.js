import React, { useEffect, useState } from 'react';
import axios from 'axios';

const CoordinatorAssignedTeams = () => {
    const [teams, setTeams] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        const fetchTeams = async () => {
            try {
                setError('');
                const token = localStorage.getItem('token');
                if (!token) {
                    setError('Not authenticated. Please login again.');
                    setLoading(false);
                    return;
                }
                const res = await axios.get('http://localhost:5000/api/panels/assigned-teams', {
                    headers: { Authorization: `Bearer ${token}` }
                });
                setTeams(res.data || []);
            } catch (err) {
                setError(err.response?.data?.message || 'Failed to load assigned teams');
            } finally {
                setLoading(false);
            }
        };
        fetchTeams();
    }, []);

    if (loading) return <div className="text-center p-4">Loading assigned teams...</div>;
    if (error) return <div className="text-red-500 p-4">{error}</div>;

    return (
        <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-2xl font-bold mb-6">Your Assigned Teams</h2>
            {teams.length === 0 ? (
                <p>No teams have been assigned to your panel yet.</p>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {teams.map(team => (
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

export default CoordinatorAssignedTeams;


