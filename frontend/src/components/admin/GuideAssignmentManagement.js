import React, { useState, useEffect } from 'react';
import axios from 'axios';

const GuideAssignmentManagement = () => {
    const [unassignedTeams, setUnassignedTeams] = useState([]);
    const [guidesWithCounts, setGuidesWithCounts] = useState([]);
    const [assignedTeamsSummary, setAssignedTeamsSummary] = useState([]);
    const [guideSelectionDates, setGuideSelectionDates] = useState({ startDate: null, endDate: null });
    const [loading, setLoading] = useState(true);
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');
    const [selectedGuide, setSelectedGuide] = useState(null);
    const [isEditing, setIsEditing] = useState(false);

    useEffect(() => {
        fetchManagementData();
    }, []);

    const fetchManagementData = async () => {
        setLoading(true);
        setError('');
        setMessage('');
        try {
            const token = localStorage.getItem('token');
            if (!token) {
                setError('Authentication token not found.');
                setLoading(false);
                return;
            }
            const headers = { Authorization: `Bearer ${token}` };

            // Fetch summary of currently assigned teams (always fetch this)
            const summaryRes = await axios.get('http://localhost:5000/api/admin/assigned-teams-summary', { headers });
            setAssignedTeamsSummary(summaryRes.data);

            // Fetch guide selection dates
            const datesRes = await axios.get('http://localhost:5000/api/admin/guide-selection-dates', { headers });
            setGuideSelectionDates(datesRes.data);

            const now = new Date();
            const selectionEndDate = datesRes.data.endDate ? new Date(datesRes.data.endDate) : null;

            if (selectionEndDate && now > selectionEndDate) {
                // Fetch unassigned teams
                const teamsRes = await axios.get('http://localhost:5000/api/admin/unassigned-teams', { headers });
                setUnassignedTeams(teamsRes.data);

                // Fetch guides with team counts
                const guidesRes = await axios.get('http://localhost:5000/api/admin/guides-with-team-counts', { headers });

                // Cross-check with full faculty list to reliably exclude externals
                const facultyRes = await axios.get('http://localhost:5000/api/auth/faculty', { headers });
                const internalIds = new Set(
                    (facultyRes.data || [])
                        .filter(f => f && String(f.memberType).toLowerCase() !== 'external')
                        .map(f => f._id)
                );

                const internalGuides = Array.isArray(guidesRes.data)
                    ? guidesRes.data.filter(g => {
                        const id = g?._id || g?.user?._id;
                        if (!id) return false;
                        return internalIds.has(id);
                    })
                    : [];

                setGuidesWithCounts(internalGuides);
            } else {
                // If selection period is still active or not set, clear data
                setUnassignedTeams([]);
                setGuidesWithCounts([]);
            }

        } catch (err) {
            console.error('Error fetching management data:', err);
            setError(err.response?.data?.message || 'Failed to fetch management data.');
        } finally {
            setLoading(false);
        }
    };

    const handleAssignAllUnassigned = async () => {
        setMessage('');
        setError('');
        try {
            const token = localStorage.getItem('token');
            const headers = { Authorization: `Bearer ${token}` };

            const res = await axios.post('http://localhost:5000/api/admin/assign-all-unassigned-guides', {}, { headers });
            setMessage(res.data.message);
            fetchManagementData(); // Refresh data
        } catch (err) {
            console.error('Error assigning all unassigned guides:', err);
            setError(err.response?.data?.message || 'Failed to assign guides.');
        }
    };

    const handleEditGuide = (guide) => {
        setSelectedGuide(guide);
        setIsEditing(true);
    };

    const handleAssignTeam = async (teamId) => {
        try {
            const token = localStorage.getItem('token');
            const headers = { Authorization: `Bearer ${token}` };
            
            await axios.post('http://localhost:5000/api/admin/assign-guide', {
                teamId,
                guideId: selectedGuide._id
            }, { headers });

            setMessage('Team assigned successfully!');
            fetchManagementData();
        } catch (err) {
            console.error('Error assigning team:', err);
            setError(err.response?.data?.message || 'Failed to assign team.');
        }
    };

    const handleRemoveTeam = async (teamId) => {
        try {
            const token = localStorage.getItem('token');
            const headers = { Authorization: `Bearer ${token}` };
            
            await axios.post('http://localhost:5000/api/admin/remove-guide', {
                teamId
            }, { headers });

            setMessage('Team removed successfully!');
            fetchManagementData();
        } catch (err) {
            console.error('Error removing team:', err);
            setError(err.response?.data?.message || 'Failed to remove team.');
        }
    };

    const selectionHasEnded = guideSelectionDates.endDate && new Date() > new Date(guideSelectionDates.endDate);

    if (loading) {
        return <div className="flex justify-center items-center h-64"><div className="text-lg text-gray-600">Loading...</div></div>;
    }

    return (
        <div className="bg-white p-6 rounded-lg shadow space-y-6">
            <h2 className="text-2xl font-semibold mb-4">Guide Assignment Management</h2>

            {message && (
                <div className="mb-4 p-3 bg-green-100 text-green-700 rounded">
                    {message}
                </div>
            )}
            {error && (
                <div className="mb-4 p-3 bg-red-100 text-red-700 rounded">
                    {error}
                </div>
            )}

            {!selectionHasEnded && (
                <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <p className="text-yellow-700">
                        Guide selection period is still active. Auto-assignment will be available after the selection period ends.
                    </p>
                </div>
            )}

            {/* Current Assignments Section - Always Visible */}
            <div className="mt-8">
                <h3 className="text-xl font-semibold mb-4">Current Guide Assignments</h3>
                {assignedTeamsSummary.length === 0 ? (
                    <p className="text-gray-500">No guides have been assigned to teams yet.</p>
                ) : (
                    <div className="overflow-x-auto border rounded-lg">
                        <table className="min-w-full bg-white">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="py-3 px-6 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Team Name</th>
                                    <th className="py-3 px-6 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Assigned Guide</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200">
                                {assignedTeamsSummary.map(team => (
                                    <tr key={team._id}>
                                        <td className="py-4 px-6 whitespace-nowrap">{team.teamName}</td>
                                        <td className="py-4 px-6 whitespace-nowrap">{team.guidePreference ? team.guidePreference.name : 'N/A'}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {selectionHasEnded && (
                <>
                    <div className="mb-8 flex justify-between items-center">
                        <h3 className="text-xl font-semibold">Teams Requiring Guide Assignment</h3>
                        {unassignedTeams.length > 0 && (
                            <button
                                onClick={handleAssignAllUnassigned}
                                className="px-4 py-2 text-sm bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
                            >
                                Auto-Assign Guides to All Unassigned Teams
                            </button>
                        )}
                    </div>
                    {unassignedTeams.length === 0 ? (
                        <p className="text-gray-500">No teams currently require guide assignment.</p>
                    ) : (
                        <ul className="space-y-3">
                            {unassignedTeams.map(team => (
                                <li key={team._id} className="p-4 border rounded-md bg-gray-50 space-y-2">
                                    <span className="font-medium">Team: {team.teamName}</span>
                                    <p className="text-sm text-gray-700">Leader: {team.teamLeader?.name} ({team.teamLeader?.username})</p>
                                    {team.members.length > 0 && (
                                        <div className="text-sm text-gray-700">
                                            Members:
                                            <ul className="list-disc list-inside ml-4">
                                                {team.members.map(member => (
                                                    <li key={member._id}>{member.name} ({member.username})</li>
                                                ))}
                                            </ul>
                                        </div>
                                    )}
                                    <p className="text-sm text-gray-700">Status: <span className="font-semibold">{team.status === 'pending' ? 'Pending Guide Request' : team.status === 'rejected' ? 'Guide Request Rejected' : 'No Guide Assigned'}</span></p>
                                </li>
                            ))}
                        </ul>
                    )}

                    <div className="mt-8">
                        <h3 className="text-xl font-semibold mb-4">Guides by Assigned Team Count</h3>
                        {guidesWithCounts.length === 0 ? (
                            <p className="text-gray-500">No guides found or no teams have been assigned yet.</p>
                        ) : (
                            <ul className="space-y-3">
                                {guidesWithCounts.map(guide => (
                                    <li key={guide._id} className="p-4 border rounded-md bg-gray-50">
                                        {isEditing && selectedGuide?._id === guide._id ? (
                                            // Editing Interface
                                            <div>
                                                <div className="flex justify-between items-center mb-4">
                                                    <h4 className="text-lg font-semibold">Manage Teams for {guide.name}</h4>
                                                    <button
                                                        onClick={() => setIsEditing(false)}
                                                        className="px-3 py-1 text-sm bg-gray-600 text-white rounded hover:bg-gray-700"
                                                    >
                                                        Done
                                                    </button>
                                                </div>
                                                
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                    {/* Assigned Teams Section */}
                                                    <div className="p-4 bg-white rounded-md border">
                                                        <h5 className="font-medium mb-3">Currently Assigned Teams</h5>
                                                        {guide.assignedTeams && guide.assignedTeams.length > 0 ? (
                                                            <ul className="space-y-2">
                                                                {guide.assignedTeams.map(team => (
                                                                    <li key={team._id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                                                                        <span>{team.teamName}</span>
                                                                        <button
                                                                            onClick={() => handleRemoveTeam(team._id)}
                                                                            className="px-2 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700"
                                                                        >
                                                                            Remove
                                                                        </button>
                                                                    </li>
                                                                ))}
                                                            </ul>
                                                        ) : (
                                                            <p className="text-gray-500">No teams currently assigned.</p>
                                                        )}
                                                    </div>

                                                    {/* Available Teams Section */}
                                                    <div className="p-4 bg-white rounded-md border">
                                                        <h5 className="font-medium mb-3">Available Teams to Assign</h5>
                                                        {unassignedTeams.length > 0 ? (
                                                            <ul className="space-y-2">
                                                                {unassignedTeams.map(team => (
                                                                    <li key={team._id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                                                                        <div>
                                                                            <span className="font-medium">{team.teamName}</span>
                                                                            <p className="text-xs text-gray-600">Leader: {team.teamLeader?.name}</p>
                                                                        </div>
                                                                        <button
                                                                            onClick={() => handleAssignTeam(team._id)}
                                                                            className="px-2 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700"
                                                                        >
                                                                            Add
                                                                        </button>
                                                                    </li>
                                                                ))}
                                                            </ul>
                                                        ) : (
                                                            <p className="text-gray-500">No teams available for assignment.</p>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        ) : (
                                            // Display-only view
                                            <div className="flex justify-between items-center">
                                                <div>
                                                    <p className="font-semibold">{guide.name}</p>
                                                    <p className="text-sm text-gray-600">Assigned Teams: {guide.teamCount}</p>
                                                </div>
                                                <button
                                                    onClick={() => handleEditGuide(guide)}
                                                    className="px-4 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
                                                >
                                                    Manage Teams
                                                </button>
                                            </div>
                                        )}
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                </>
            )}
        </div>
    );
};

export default GuideAssignmentManagement; 