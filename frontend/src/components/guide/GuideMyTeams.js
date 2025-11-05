import React, { useState, useEffect } from 'react';
import axios from 'axios';

const GuideMyTeams = () => {
    const [approvedTeams, setApprovedTeams] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        fetchApprovedTeams();
    }, []);

    const fetchApprovedTeams = async () => {
        setLoading(true);
        setError('');
        try {
            const token = localStorage.getItem('token');
            if (!token) {
                setError('Authentication token not found.');
                setLoading(false);
                return;
            }
            const headers = { Authorization: `Bearer ${token}` };
            // Use endpoint that returns only approved teams with panel populated
            const res = await axios.get('http://localhost:5000/api/guide/approved-teams', { headers });
            setApprovedTeams(res.data || []);
        } catch (err) {
            console.error('Error fetching approved teams:', err);
            setError(err.response?.data?.message || 'Failed to fetch approved teams.');
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return <div className="flex justify-center items-center h-64"><div className="text-lg text-gray-600">Loading...</div></div>;
    }

    return (
        <div className="bg-white p-6 rounded-lg shadow space-y-6">
            <h2 className="text-2xl font-semibold mb-4">My Teams</h2>

            {error && (
                <div className="mb-4 p-3 bg-red-100 text-red-700 rounded">
                    {error}
                </div>
            )}

            {approvedTeams.length === 0 ? (
                <p className="text-gray-500">No teams approved by you yet.</p>
            ) : (
                <ul className="space-y-4">
                    {approvedTeams.map(team => (
                        <li key={team._id} className="border p-4 rounded-md bg-gray-50">
                            <div className="font-medium text-lg mb-2">Team: {team.teamName}</div>
                            
                            <div className="mb-4">
                                <h4 className="font-medium mb-2">Team Leader:</h4>
                                <p className="text-gray-700">{team.teamLeader.name} ({team.teamLeader.username})</p>
                            </div>

                            <div className="mb-4">
                                <h4 className="font-medium mb-2">Panel:</h4>
                                <p className="text-gray-700">{team.panel?.name || 'Not assigned'}</p>
                            </div>

                            <div className="mb-4">
                                <h4 className="font-medium mb-2">Team Members:</h4>
                                <ul className="space-y-1">
                                    {team.members.map(member => (
                                        <li key={member._id} className="text-gray-700">
                                            {member.name} ({member.username})
                                        </li>
                                    ))}
                                </ul>
                            </div>

                            <div className="mt-2">
                                <span className="px-2 py-1 rounded text-sm font-medium bg-green-100 text-green-800">
                                    Approved ✓
                                </span>
                            </div>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
};

export default GuideMyTeams; 