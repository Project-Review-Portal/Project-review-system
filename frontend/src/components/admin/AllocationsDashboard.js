import React, { useEffect, useState } from 'react';
import axios from 'axios';

const AllocationsDashboard = ({ programme }) => {
    const [teams, setTeams] = useState([]);
    const [guides, setGuides] = useState([]);
    const [reviewPanels, setReviewPanels] = useState([]);
    const [vivaPanels, setVivaPanels] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [message, setMessage] = useState('');
    
    // Unified Modal state for auto-assign alerts and single-save capacity warnings
    const [warningModalOpen, setWarningModalOpen] = useState(false);
    const [warningModalSummary, setWarningModalSummary] = useState({ title: '', message: '', warnings: [] });
    const [autoAssigning, setAutoAssigning] = useState(false);

    // Store allocations as a map: { teamId: { guideId, panelId } }
    const [allocations, setAllocations] = useState({});
    const [originalAllocations, setOriginalAllocations] = useState({});

    // Global floating tooltip state
    const [hoveredPanel, setHoveredPanel] = useState(null);
    const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });

    const headers = { Authorization: `Bearer ${localStorage.getItem('token')}` };

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        setError('');
        try {
            const progParam = programme ? `?programme=${encodeURIComponent(programme)}` : '';
            const [teamsRes, facultyRes, panelsRes] = await Promise.all([
                axios.get(`/api/admin/teams${progParam}`, { headers }),
                axios.get('/api/auth/faculty', { headers }),
                axios.get('/api/panels', { headers })
            ]);

            const allTeams = teamsRes.data || [];
            setTeams(allTeams);

            const internalGuides = (facultyRes.data || []).filter(f => 
                f && String(f.memberType).toLowerCase() !== 'external'
            );
            setGuides(internalGuides);

            const allPanels = panelsRes.data || [];
            setReviewPanels(allPanels.filter(p => p.panelType !== 'viva'));
            setVivaPanels(allPanels.filter(p => p.panelType === 'viva'));

            // Initialize allocations state
            const initAllocations = {};
            allTeams.forEach(team => {
                initAllocations[team._id] = {
                    guideId: team.guidePreference ? team.guidePreference._id || team.guidePreference : '',
                    panelId: team.panel ? team.panel._id || team.panel : '',
                    vivaPanelId: team.vivaPanel ? team.vivaPanel._id || team.vivaPanel : ''
                };
            });
            setAllocations(initAllocations);
            setOriginalAllocations(JSON.parse(JSON.stringify(initAllocations)));

        } catch (err) {
            console.error('Error fetching data:', err);
            setError(err.response?.data?.message || 'Failed to fetch dashboard data');
        } finally {
            setLoading(false);
        }
    };

    const handleAllocationChange = (teamId, field, value) => {
        setAllocations(prev => ({
            ...prev,
            [teamId]: {
                ...prev[teamId],
                [field]: value
            }
        }));
    };

    const handleSaveAll = async () => {
        setError('');
        setMessage('');
        const modifiedTeamIds = Object.keys(allocations).filter(teamId => hasChanges(teamId));
        if (modifiedTeamIds.length === 0) return;

        try {
            const results = await Promise.all(
                modifiedTeamIds.map(async (teamId) => {
                    const { guideId, panelId, vivaPanelId } = allocations[teamId];
                    const res = await axios.put(`/api/admin/allocations/${teamId}`, {
                        guideId: guideId || null,
                        panelId: panelId || null,
                        vivaPanelId: vivaPanelId || null
                    }, { headers });

                    const teamInfo = teams.find(t => t._id === teamId);
                    return {
                        teamName: teamInfo ? teamInfo.teamName : 'Unknown Team',
                        warnings: res.data.warnings || []
                    };
                })
            );

            // Consolidate warnings
            const allWarnings = [];
            results.forEach(res => {
                if (res.warnings && res.warnings.length > 0) {
                    allWarnings.push(...res.warnings.map(w => `[${res.teamName}] ${w}`));
                }
            });

            if (allWarnings.length > 0) {
                setWarningModalSummary({
                    title: 'Allocations Saved with Warnings',
                    message: 'All allocations have been successfully updated, but some capacity constraints were exceeded.',
                    warnings: allWarnings
                });
                setWarningModalOpen(true);
            } else {
                setMessage('All allocations saved successfully!');
                setTimeout(() => setMessage(''), 5000);
            }

            // Sync original allocations state
            setOriginalAllocations(JSON.parse(JSON.stringify(allocations)));
            fetchData();
        } catch (err) {
            console.error('Error saving all allocations:', err);
            setError(err.response?.data?.message || 'Failed to save all allocations');
        }
    };

    const handleCancel = (teamId) => {
        setAllocations(prev => ({
            ...prev,
            [teamId]: { ...originalAllocations[teamId] }
        }));
    };

    const handleRemove = async (teamId) => {
        if (!window.confirm('Are you sure you want to completely remove and delete this team?')) return;
        
        setError('');
        setMessage('');
        try {
            await axios.delete(`/api/admin/teams/${teamId}`, { headers });
            setMessage('Team successfully removed and deleted.');
            setTimeout(() => setMessage(''), 5000);
            fetchData();
        } catch (err) {
            console.error('Error deleting team:', err);
            setError(err.response?.data?.message || 'Failed to delete team.');
        }
    };

    const handleAutoAssignGuides = async () => {
        setAutoAssigning(true);
        setError('');
        try {
            const res = await axios.post('/api/admin/auto-assign-guides', {}, { headers });
            setWarningModalSummary({
                title: 'Guide Auto-Assignment Complete',
                message: res.data.message,
                warnings: res.data.warnings || []
            });
            setWarningModalOpen(true);
            fetchData();
        } catch (err) {
            console.error('Error auto-assigning guides:', err);
            setError(err.response?.data?.message || 'Failed to auto-assign guides.');
        } finally {
            setAutoAssigning(false);
        }
    };

    const handleAutoAssign = async (type = 'review') => {
        setAutoAssigning(true);
        setError('');
        try {
            const res = await axios.post('/api/admin/auto-assign-panels', { panelType: type }, { headers });
            setWarningModalSummary({
                title: `${type === 'viva' ? 'Viva Panel' : 'Review Panel'} Auto-Assignment Complete`,
                message: res.data.message,
                warnings: res.data.warnings || []
            });
            setWarningModalOpen(true);
            fetchData();
        } catch (err) {
            console.error('Error auto-assigning panels:', err);
            setError(err.response?.data?.message || 'Failed to auto-assign panels.');
        } finally {
            setAutoAssigning(false);
        }
    };

    const hasChanges = (teamId) => {
        const current = allocations[teamId];
        const original = originalAllocations[teamId];
        return current && original && (current.guideId !== original.guideId || current.panelId !== original.panelId || current.vivaPanelId !== original.vivaPanelId);
    };

    const handleMouseEnterPanel = (e, panelId, type) => {
        const allPanels = type === 'viva' ? vivaPanels : reviewPanels;
        const panelObj = allPanels.find(p => p._id === panelId);
        if (panelObj) {
            setHoveredPanel(panelObj);
            updateTooltipPosition(e);
        }
    };

    const updateTooltipPosition = (e) => {
        setTooltipPos({
            x: e.clientX + 15, 
            y: e.clientY + 15  
        });
    };

    const handleMouseLeavePanel = () => {
        setHoveredPanel(null);
    };

    if (loading) {
        return <div className="flex justify-center items-center h-64"><div className="text-lg text-gray-600">Loading...</div></div>;
    }

    return (
        <div className="bg-white p-6 rounded-lg shadow space-y-4 relative">
            <div className="flex justify-between items-center">
                <h2 className="text-2xl font-semibold">Allocations Dashboard</h2>
                <div className="flex space-x-2">
                    <button 
                        onClick={handleSaveAll} 
                        disabled={Object.keys(allocations).filter(teamId => hasChanges(teamId)).length === 0}
                        className={`px-4 py-2 rounded font-medium transition duration-200 ${
                            Object.keys(allocations).filter(teamId => hasChanges(teamId)).length > 0
                                ? 'bg-green-600 hover:bg-green-700 text-white shadow-sm hover:shadow' 
                                : 'bg-gray-150 text-gray-400 cursor-not-allowed'
                        }`}
                    >
                        Save All Changes ({Object.keys(allocations).filter(teamId => hasChanges(teamId)).length})
                    </button>
                </div>
            </div>

            {message && <div className="p-3 bg-green-100 text-green-700 rounded transition-all">{message}</div>}
            {error && <div className="p-3 bg-red-100 text-red-700 rounded">{error}</div>}

            {teams.length === 0 ? (
                <p className="text-slate-500 font-medium">No teams found.</p>
            ) : (
                <div className="overflow-x-auto border border-slate-200 rounded-2xl shadow-md bg-white">
                    <table className="min-w-full divide-y divide-slate-200 bg-white">
                        <thead className="bg-slate-100/80">
                            <tr className="text-left text-xs font-bold text-slate-600 uppercase tracking-wider">
                                <th className="px-4 py-3.5 border-b border-slate-200">Team Name</th>
                                <th className="px-4 py-3.5 border-b border-slate-200">Leader</th>
                                <th className="px-4 py-3.5 border-b border-slate-200">Members</th>
                                <th className="px-4 py-3.5 border-b border-slate-200">
                                    <div className="flex flex-col space-y-1">
                                        <span>Guide</span>
                                        <button onClick={handleAutoAssignGuides} disabled={autoAssigning} className="text-[10px] bg-indigo-100 text-indigo-700 px-2 py-1 rounded hover:bg-indigo-200 disabled:opacity-50 w-fit">Auto Assign</button>
                                    </div>
                                </th>
                                <th className="px-4 py-3.5 border-b border-slate-200">
                                    <div className="flex flex-col space-y-1">
                                        <span>Review Panel</span>
                                        <button onClick={() => handleAutoAssign('review')} disabled={autoAssigning} className="text-[10px] bg-indigo-100 text-indigo-700 px-2 py-1 rounded hover:bg-indigo-200 disabled:opacity-50 w-fit">Auto Assign</button>
                                    </div>
                                </th>
                                <th className="px-4 py-3.5 border-b border-slate-200">
                                    <div className="flex flex-col space-y-1">
                                        <span>Viva Panel</span>
                                        <button onClick={() => handleAutoAssign('viva')} disabled={autoAssigning} className="text-[10px] bg-indigo-100 text-indigo-700 px-2 py-1 rounded hover:bg-indigo-200 disabled:opacity-50 w-fit">Auto Assign</button>
                                    </div>
                                </th>
                                <th className="px-4 py-3.5 text-center border-b border-slate-200">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200">
                            {teams.map(team => {
                                const currentAlloc = allocations[team._id] || {};
                                
                                return (
                                <tr key={team._id} className="hover:bg-slate-50/50">
                                    <td className="px-4 py-3.5 font-bold text-slate-900 border-b border-slate-200/60">{team.teamName}</td>
                                    <td className="px-4 py-3.5 text-sm text-slate-800 border-b border-slate-200/60">{team.teamLeader ? `${team.teamLeader.name}` : '—'}</td>
                                    <td className="px-4 py-3.5 text-sm text-slate-600 border-b border-slate-200/60">{(team.members || []).map(m => m.name).join(', ') || '—'}</td>
                                    
                                    <td className="px-4 py-3.5 border-b border-slate-200/60">
                                        <select 
                                            className="w-full border border-slate-200 rounded-lg px-2.5 py-1.5 text-sm text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                            value={currentAlloc.guideId}
                                            onChange={(e) => handleAllocationChange(team._id, 'guideId', e.target.value)}
                                        >
                                            <option value="">No Guide</option>
                                            {guides.map(g => (
                                                <option key={g._id} value={g._id}>{g.name}</option>
                                            ))}
                                        </select>
                                    </td>
                                    
                                    <td 
                                        className="px-4 py-3.5 border-b border-slate-200/60"
                                        onMouseEnter={(e) => currentAlloc.panelId && handleMouseEnterPanel(e, currentAlloc.panelId, 'review')}
                                        onMouseMove={currentAlloc.panelId ? updateTooltipPosition : undefined}
                                        onMouseLeave={handleMouseLeavePanel}
                                    >
                                        <select 
                                            className="w-full border border-slate-200 rounded-lg px-2.5 py-1.5 text-sm text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                            value={currentAlloc.panelId}
                                            onChange={(e) => {
                                                const val = e.target.value;
                                                handleAllocationChange(team._id, 'panelId', val);
                                                handleMouseLeavePanel();
                                                if (val && !currentAlloc.guideId) {
                                                    alert(`Warning: You are assigning a review panel to team "${team.teamName || team.teamId}", but no guide is assigned to this team.`);
                                                }
                                            }}
                                        >
                                            <option value="">No Panel</option>
                                            {reviewPanels.filter(p => (p.programme || 'UG').trim().toLowerCase() === (team.programme || 'UG').trim().toLowerCase()).map(p => {
                                                const coordName = p.coordinator ? p.coordinator.name : 'None';
                                                const membersList = p.members && p.members.length > 0 
                                                    ? p.members.map(m => m.name).join(', ') 
                                                    : 'None';
                                                const nativeTooltip = `Coordinator: ${coordName}\nMembers: ${membersList}`;

                                                return (
                                                    <option 
                                                        key={p._id} 
                                                        value={p._id}
                                                        title={nativeTooltip}
                                                    >
                                                        {p.name}
                                                    </option>
                                                );
                                            })}
                                        </select>
                                    </td>
                                    
                                    <td 
                                        className="px-4 py-3.5 border-b border-slate-200/60"
                                        onMouseEnter={(e) => currentAlloc.vivaPanelId && handleMouseEnterPanel(e, currentAlloc.vivaPanelId, 'viva')}
                                        onMouseMove={currentAlloc.vivaPanelId ? updateTooltipPosition : undefined}
                                        onMouseLeave={handleMouseLeavePanel}
                                    >
                                        <select 
                                            className="w-full border border-slate-200 rounded-lg px-2.5 py-1.5 text-sm text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                            value={currentAlloc.vivaPanelId}
                                            onChange={(e) => {
                                                const val = e.target.value;
                                                handleAllocationChange(team._id, 'vivaPanelId', val);
                                                handleMouseLeavePanel();
                                                if (val && !currentAlloc.guideId) {
                                                    alert(`Warning: You are assigning a viva panel to team "${team.teamName || team.teamId}", but no guide is assigned to this team.`);
                                                }
                                            }}
                                        >
                                            <option value="">No Viva Panel</option>
                                            {vivaPanels.filter(p => (p.programme || 'UG').trim().toLowerCase() === (team.programme || 'UG').trim().toLowerCase()).map(p => {
                                                const coordName = p.coordinator ? p.coordinator.name : 'None';
                                                const membersList = p.members && p.members.length > 0 
                                                    ? p.members.map(m => m.name).join(', ') 
                                                    : 'None';
                                                const nativeTooltip = `Coordinator: ${coordName}\nMembers: ${membersList}`;

                                                return (
                                                    <option 
                                                        key={p._id} 
                                                        value={p._id}
                                                        title={nativeTooltip}
                                                    >
                                                        {p.name}
                                                    </option>
                                                );
                                            })}
                                        </select>
                                    </td>
                                    
                                    <td className="px-4 py-3.5 border-b border-slate-200/60 text-center">
                                        <div className="flex space-x-3 justify-center items-center h-full">
                                            {hasChanges(team._id) ? (
                                                <div className="flex items-center space-x-2">
                                                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-yellow-100 text-yellow-800 border border-yellow-200">
                                                        Unsaved
                                                    </span>
                                                    <button 
                                                        onClick={() => handleCancel(team._id)} 
                                                        className="text-gray-500 hover:text-gray-700 text-xs font-semibold underline"
                                                        title="Revert changes for this team"
                                                    >
                                                        Undo
                                                    </button>
                                                </div>
                                            ) : (
                                                <span className="text-emerald-600 text-xs font-semibold px-3 py-1 flex items-center gap-1 justify-center">
                                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                                                    Saved
                                                </span>
                                            )}
                                            <button 
                                                onClick={() => handleRemove(team._id)} 
                                                className="p-1 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded"
                                                title="Completely remove and delete team"
                                            >
                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                                  <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                                                </svg>
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            )})}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Global Tooltip Element */}
            {hoveredPanel && (
                <div 
                    className="fixed z-50 w-64 p-3 bg-gray-800 text-white text-xs rounded shadow-xl pointer-events-none transition-all duration-75"
                    style={{
                        top: `${tooltipPos.y}px`,
                        left: `${tooltipPos.x}px`
                    }}
                >
                    <p className="font-bold mb-1 text-indigo-300">{hoveredPanel.name}</p>
                    <p><span className="text-gray-400">Coordinator:</span> {hoveredPanel.coordinator ? hoveredPanel.coordinator.name : 'None'}</p>
                    <p className="mt-1"><span className="text-gray-400">Members:</span> {hoveredPanel.members && hoveredPanel.members.length > 0 ? hoveredPanel.members.map(m => m.name).join(', ') : 'None'}</p>
                </div>
            )}

            {/* Unified Summary & Warning Notification Modal */}
            {warningModalOpen && warningModalSummary && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white p-6 rounded-lg shadow-xl max-w-lg w-full">
                        <h3 className="text-xl font-bold mb-4">{warningModalSummary.title}</h3>
                        <p className="text-gray-700 font-medium mb-4">{warningModalSummary.message}</p>
                        
                        {warningModalSummary.warnings.length > 0 && (
                            <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-4 max-h-60 overflow-y-auto">
                                <div className="flex">
                                    <div className="ml-3">
                                        <h3 className="text-sm font-medium text-yellow-800">Alert Notification</h3>
                                        <div className="mt-2 text-sm text-yellow-700">
                                            <ul className="list-disc pl-5 space-y-1">
                                                {warningModalSummary.warnings.map((w, idx) => (
                                                    <li key={idx} className="font-medium">{w}</li>
                                                ))}
                                            </ul>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                        
                        <div className="flex justify-end mt-4">
                            <button 
                                onClick={() => setWarningModalOpen(false)}
                                className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AllocationsDashboard;