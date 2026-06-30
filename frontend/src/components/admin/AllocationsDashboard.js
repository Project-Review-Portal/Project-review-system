import React, { useEffect, useState } from 'react';
import axios from 'axios';

const AllocationsDashboard = () => {
    const [teams, setTeams] = useState([]);
    const [guides, setGuides] = useState([]);
    const [panels, setPanels] = useState([]);
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
            const [teamsRes, facultyRes, panelsRes] = await Promise.all([
                axios.get('/api/admin/teams', { headers }),
                axios.get('/api/auth/faculty', { headers }),
                axios.get('/api/panels', { headers })
            ]);

            const allTeams = teamsRes.data || [];
            setTeams(allTeams);

            const internalGuides = (facultyRes.data || []).filter(f => 
                f && String(f.memberType).toLowerCase() !== 'external'
            );
            setGuides(internalGuides);

            setPanels(panelsRes.data || []);

            // Initialize allocations state
            const initAllocations = {};
            allTeams.forEach(team => {
                initAllocations[team._id] = {
                    guideId: team.guidePreference ? team.guidePreference._id || team.guidePreference : '',
                    panelId: team.panel ? team.panel._id || team.panel : ''
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

    const handleSave = async (teamId) => {
        setError('');
        try {
            const { guideId, panelId } = allocations[teamId];
            const res = await axios.put(`/api/admin/allocations/${teamId}`, {
                guideId: guideId || null,
                panelId: panelId || null
            }, { headers });
            
            const teamInfo = teams.find(t => t._id === teamId);
            const teamName = teamInfo ? teamInfo.teamName : 'Unknown Team';
            
            const guideInfo = guides.find(g => g._id === guideId);
            const guideName = guideInfo ? guideInfo.name : 'No Guide';
            
            const panelInfo = panels.find(p => p._id === panelId);
            const panelName = panelInfo ? panelInfo.name : 'No Panel';

            // Check if backend returned any soft capacity warnings
            if (res.data.warnings && res.data.warnings.length > 0) {
                setWarningModalSummary({
                    title: 'Allocation Saved with Warnings',
                    message: `Guide ${guideName} and Panel ${panelName} have been assigned to team ${teamName}, but capacity conditions were breached.`,
                    warnings: res.data.warnings
                });
                setWarningModalOpen(true);
            } else {
                // If clean execution, show standard toast message
                setMessage(`Guide ${guideName} and Panel ${panelName} have been saved to team ${teamName}.`);
                setTimeout(() => setMessage(''), 5000); 
            }
            
            // Update original states
            setOriginalAllocations(prev => ({
                ...prev,
                [teamId]: { ...allocations[teamId] }
            }));
            
            fetchData();
        } catch (err) {
            console.error('Error saving allocation:', err);
            setError(err.response?.data?.message || 'Failed to save allocation');
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

    const handleAutoAssign = async () => {
        setAutoAssigning(true);
        setError('');
        try {
            const res = await axios.post('/api/admin/auto-assign-panels', {}, { headers });
            setWarningModalSummary({
                title: 'Auto-Assignment Complete',
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
        return current && original && (current.guideId !== original.guideId || current.panelId !== original.panelId);
    };

    const handleMouseEnterPanel = (e, panelId) => {
        const panelObj = panels.find(p => p._id === panelId);
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
                <button 
                    onClick={handleAutoAssign} 
                    disabled={autoAssigning}
                    className="px-4 py-2 bg-indigo-600 text-white rounded font-medium hover:bg-indigo-700 disabled:bg-indigo-400"
                >
                    {autoAssigning ? 'Assigning...' : 'Auto-Assign Panels'}
                </button>
            </div>

            {message && <div className="p-3 bg-green-100 text-green-700 rounded transition-all">{message}</div>}
            {error && <div className="p-3 bg-red-100 text-red-700 rounded">{error}</div>}

            {teams.length === 0 ? (
                <p className="text-gray-500">No teams found.</p>
            ) : (
                <div className="overflow-x-auto">
                    <table className="min-w-full border border-gray-200">
                        <thead>
                            <tr className="bg-gray-100 text-left">
                                <th className="px-3 py-2 border">Team Name</th>
                                <th className="px-3 py-2 border">Leader</th>
                                <th className="px-3 py-2 border">Members</th>
                                <th className="px-3 py-2 border">Guide</th>
                                <th className="px-3 py-2 border">Panel</th>
                                <th className="px-3 py-2 border">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {teams.map(team => {
                                const currentAlloc = allocations[team._id] || {};
                                
                                return (
                                <tr key={team._id} className="hover:bg-gray-50">
                                    <td className="px-3 py-2 border font-medium">{team.teamName}</td>
                                    <td className="px-3 py-2 border">{team.teamLeader ? `${team.teamLeader.name}` : '—'}</td>
                                    <td className="px-3 py-2 border">{(team.members || []).map(m => m.name).join(', ') || '—'}</td>
                                    
                                    <td className="px-3 py-2 border">
                                        <select 
                                            className="w-full border rounded px-2 py-1"
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
                                        className="px-3 py-2 border"
                                        onMouseEnter={(e) => currentAlloc.panelId && handleMouseEnterPanel(e, currentAlloc.panelId)}
                                        onMouseMove={currentAlloc.panelId ? updateTooltipPosition : undefined}
                                        onMouseLeave={handleMouseLeavePanel}
                                    >
                                        <select 
                                            className="w-full border rounded px-2 py-1"
                                            value={currentAlloc.panelId}
                                            onChange={(e) => {
                                                handleAllocationChange(team._id, 'panelId', e.target.value);
                                                handleMouseLeavePanel(); 
                                            }}
                                        >
                                            <option value="">No Panel</option>
                                            {panels.map(p => {
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
                                    
                                    <td className="px-3 py-2 border text-center">
                                        <div className="flex space-x-2 justify-center items-center h-full">
                                            {hasChanges(team._id) ? (
                                                <>
                                                    <button onClick={() => handleSave(team._id)} className="px-3 py-1 bg-green-600 text-white rounded text-xs hover:bg-green-700">Save</button>
                                                    <button onClick={() => handleCancel(team._id)} className="px-3 py-1 bg-gray-400 text-white rounded text-xs hover:bg-gray-500">Cancel</button>
                                                </>
                                            ) : (
                                                <span className="text-gray-400 text-xs italic px-3 py-1">Saved</span>
                                            )}
                                            <button 
                                                onClick={() => handleRemove(team._id)} 
                                                className="p-1 text-red-500 hover:text-red-700 hover:bg-red-50 rounded"
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