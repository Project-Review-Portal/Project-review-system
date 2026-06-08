import React, { useState, useEffect } from 'react';
import axios from 'axios';

const ManualPanelAssignment = () => {
    const [teams, setTeams] = useState([]);
    const [availablePanels, setAvailablePanels] = useState([]);
    const [selectedTeam, setSelectedTeam] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [filterStatus, setFilterStatus] = useState('all'); // all | assigned | unassigned
    const [autoAssignLoading, setAutoAssignLoading] = useState(false);

    useEffect(() => {
        fetchAllTeams();
    }, []);

    const fetchAllTeams = async () => {
        try {
            setLoading(true);
            const token = localStorage.getItem('token');
            const headers = { Authorization: `Bearer ${token}` };
            
            const response = await axios.get('http://localhost:5000/api/admin/teams', { headers });
            const allTeams = response.data || [];
            // Sort: teams with panel first, then without; within group by name
            allTeams.sort((a, b) => {
                const aHas = !!a.panel;
                const bHas = !!b.panel;
                if (aHas !== bHas) return aHas ? -1 : 1;
                return (a.teamName || '').localeCompare(b.teamName || '');
            });
            setTeams(allTeams);
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to fetch teams');
        } finally {
            setLoading(false);
        }
    };

    const fetchAvailablePanels = async (teamId) => {
        try {
            const token = localStorage.getItem('token');
            const headers = { Authorization: `Bearer ${token}` };
            
            const response = await axios.get(`http://localhost:5000/api/panel-assignments/available-panels/${teamId}`, { headers });

            // Build counts from current teams state
            const panelIdToCount = new Map();
            for (const t of teams) {
                if (t.panel && t.panel._id) {
                    const key = t.panel._id;
                    panelIdToCount.set(key, (panelIdToCount.get(key) || 0) + 1);
                }
            }

            const sorted = [...response.data].sort((p1, p2) => {
                const c1 = panelIdToCount.get(p1._id) || 0;
                const c2 = panelIdToCount.get(p2._id) || 0;
                if (c1 !== c2) return c1 - c2; // fewer teams first
                return (p1.name || '').localeCompare(p2.name || '');
            });
            setAvailablePanels(sorted);
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to fetch available panels');
        }
    };

    const handleAssignPanel = async (teamId, panelId) => {
        try {
            setError('');
            setSuccess('');
            
            const token = localStorage.getItem('token');
            const headers = { Authorization: `Bearer ${token}` };
            
            await axios.post('http://localhost:5000/api/panel-assignments/assign-panel', {
                teamId,
                panelId
            }, { headers });
            
            setSuccess('Panel assigned successfully!');
            fetchAllTeams(); // Refresh the list and counts
            setSelectedTeam(null);
            setAvailablePanels([]);
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to assign panel');
        }
    };

    const handleShowPanels = (team) => {
        setSelectedTeam(team);
        fetchAvailablePanels(team._id);
    };

    const handleAutoAssignPanels = async () => {
        try {
            setError('');
            setSuccess('');
            setAutoAssignLoading(true);
            const token = localStorage.getItem('token');
            const headers = { Authorization: `Bearer ${token}` };
            const res = await axios.post('http://localhost:5000/api/panel-assignments/auto-assign', {}, { headers });
            const assignedCount = res.data?.assignedCount ?? 0;
            const skippedCount = Array.isArray(res.data?.skipped) ? res.data.skipped.length : 0;
            setSuccess(`Auto-assign completed. Assigned: ${assignedCount}. Skipped: ${skippedCount}.`);
            await fetchAllTeams();
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to auto-assign panels');
        } finally {
            setAutoAssignLoading(false);
        }
    };

    if (loading) {
        return <div className="flex justify-center items-center h-64">
            <div className="text-lg text-gray-600">Loading...</div>
        </div>;
    }

    const filteredTeams = teams.filter(t => {
        if (filterStatus === 'assigned') return !!t.panel;
        if (filterStatus === 'unassigned') return !t.panel;
        return true;
    });

    return (
        <div className="bg-white p-6 rounded-lg shadow space-y-6">
            <h2 className="text-2xl font-semibold mb-4">Manual Panel Assignment</h2>
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                <div className="flex items-center gap-2">
                    <label className="text-sm text-gray-700">Filter Teams:</label>
                    <select
                        className="border rounded px-2 py-1"
                        value={filterStatus}
                        onChange={e => setFilterStatus(e.target.value)}
                    >
                        <option value="all">All</option>
                        <option value="assigned">Assigned</option>
                        <option value="unassigned">Unassigned</option>
                    </select>
                </div>
                <div>
                    <button
                        onClick={handleAutoAssignPanels}
                        disabled={autoAssignLoading}
                        className={`px-4 py-2 rounded text-white ${autoAssignLoading ? 'bg-gray-400 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-700'}`}
                    >
                        {autoAssignLoading ? 'Auto Assigning...' : 'Auto Assign Panels'}
                    </button>
                </div>
            </div>
            
            {error && (
                <div className="p-3 bg-red-100 text-red-700 rounded sticky top-0">
                    {error}
                </div>
            )}
            
            {success && (
                <div className="p-3 bg-green-100 text-green-700 rounded">
                    {success}
                </div>
            )}

            {filteredTeams.length === 0 ? (
                <p className="text-gray-500">No teams found.</p>
            ) : (
                <div className="space-y-4">
                    <h3 className="text-lg font-medium">Teams ({filterStatus.charAt(0).toUpperCase() + filterStatus.slice(1)})</h3>
                    <div className="grid gap-4">
                        {filteredTeams.map(team => (
                            <div key={team._id} className="border p-4 rounded-lg bg-gray-50">
                                <div className="flex justify-between items-start">
                                    <div className="flex-1">
                                        <h4 className="font-semibold text-lg">{team.teamName}</h4>
                                        <div className="mt-2 space-y-1">
                                            <p><span className="font-medium">Team Leader:</span> {team.teamLeader?.name} ({team.teamLeader?.username})</p>
                                            <p><span className="font-medium">Members:</span> {team.members.map(m => m.name).join(', ')}</p>
                                            <p><span className="font-medium">Guide:</span> {team.guidePreference ? team.guidePreference.name : 'Not assigned'}</p>
                                            <p><span className="font-medium">Panel:</span> {team.panel ? team.panel.name : 'Not assigned'}</p>
                                        </div>
                                    </div>
                                    <div className="ml-4">
                                        <button
                                            onClick={() => handleShowPanels(team)}
                                            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
                                        >
                                            {team.panel ? 'Change Panel' : 'Assign Panel'}
                                        </button>
                                    </div>
                                </div>
                                
                                {selectedTeam && selectedTeam._id === team._id && (
                                    <div className="mt-4 pt-4 border-t">
                                        <h5 className="font-medium mb-2">Available Panels (Fewest assigned teams first):</h5>
                                        {availablePanels.length === 0 ? (
                                            <p className="text-gray-500">No available panels (all have conflicts with team guide)</p>
                                        ) : (
                                            <div className="grid gap-2">
                                                {availablePanels.map(panel => {
                                                    const count = teams.filter(t => t.panel && t.panel._id === panel._id).length;
                                                    return (
                                                        <div key={panel._id} className="flex justify-between items-center p-2 bg-white rounded border">
                                                            <div>
                                                                <span className="font-medium">{panel.name}</span>
                                                                <div className="text-sm text-gray-600">
                                                                    <p>Assigned teams: {count}</p>
                                                                    <p>Members: {panel.members.map(m => m.name).join(', ')}</p>
                                                                    <p>Coordinator: {panel.coordinator ? panel.coordinator.name : 'Not assigned'}</p>
                                                                </div>
                                                            </div>
                                                            {
                                                                // console.log({
                                                                //     team : {
                                                                //          team, tp : team.panel
                                                                //     },
                                                                //     panel : {
                                                                //         panel, id : panel?._id
                                                                //     }
                                                                // }),
                                                                console.log({p : panel._id, t: team.panel._id, eq : panel._id === team.panel._id })
                                                            }
                                                            {panel._id === team.panel._id && 
                                                                <button
                                                                    className="bg-green-400 text-white px-3 py-1 rounded text-sm hover:bg-green-300 cursor-not-allowed"
                                                                >
                                                                    Assigned
                                                                </button>
                                                            }
                                                            {panel._id !== team.panel._id &&
                                                                <button
                                                                    onClick={() => handleAssignPanel(team._id, panel._id)}
                                                                    className="bg-green-600 text-white px-3 py-1 rounded text-sm hover:bg-green-700"
                                                                >
                                                                    Assign
                                                                </button>
                                                            }

                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

export default ManualPanelAssignment;
