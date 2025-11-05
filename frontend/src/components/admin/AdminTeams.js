import React, { useEffect, useState } from 'react';
import axios from 'axios';

const AdminTeams = () => {
    const [teams, setTeams] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [message, setMessage] = useState('');

    const headers = { Authorization: `Bearer ${localStorage.getItem('token')}` };

    const fetchTeams = async () => {
        setLoading(true);
        setError('');
        setMessage('');
        try {
            const res = await axios.get('/api/admin/teams', { headers });
            setTeams(res.data);
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to fetch teams');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchTeams(); }, []);

    const deleteTeam = async (teamId) => {
        if (!window.confirm('Are you sure you want to delete this team? This cannot be undone.')) return;
        setError('');
        setMessage('');
        try {
            await axios.delete(`/api/admin/teams/${teamId}`, { headers });
            setMessage('Team deleted successfully');
            await fetchTeams();
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to delete team');
        }
    };

    if (loading) {
        return <div className="flex justify-center items-center h-64"><div className="text-lg text-gray-600">Loading...</div></div>;
    }

    return (
        <div className="bg-white p-6 rounded-lg shadow space-y-4">
            <h2 className="text-2xl font-semibold">Teams</h2>
            {message && <div className="p-3 bg-green-100 text-green-700 rounded">{message}</div>}
            {error && <div className="p-3 bg-red-100 text-red-700 rounded">{error}</div>}

            {teams.length === 0 ? (
                <p className="text-gray-500">No teams found.</p>
            ) : (
                <div className="overflow-x-auto">
                    <table className="min-w-full border border-gray-200">
                        <thead>
                            <tr className="bg-gray-100 text-left">
                                <th className="px-3 py-2 border">Name</th>
                                <th className="px-3 py-2 border">Leader</th>
                                <th className="px-3 py-2 border">Members</th>
                                <th className="px-3 py-2 border">Guide</th>
                                <th className="px-3 py-2 border">Panel</th>
                                <th className="px-3 py-2 border">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {teams.map(team => (
                                <tr key={team._id}>
                                    <td className="px-3 py-2 border">{team.teamName}</td>
                                    <td className="px-3 py-2 border">{team.teamLeader ? `${team.teamLeader.name} (${team.teamLeader.username})` : '—'}</td>
                                    <td className="px-3 py-2 border">{(team.members || []).map(m => m.username).join(', ') || '—'}</td>
                                    <td className="px-3 py-2 border">{team.guidePreference ? team.guidePreference.username : '—'}</td>
                                    <td className="px-3 py-2 border">{team.panel ? team.panel.name : '—'}</td>
                                    <td className="px-3 py-2 border">
                                        <button onClick={() => deleteTeam(team._id)} className="px-3 py-1 text-sm bg-red-600 text-white rounded hover:bg-red-700">Delete</button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
};

export default AdminTeams;


