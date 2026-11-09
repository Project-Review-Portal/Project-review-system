import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';

const SERVER_API_KEY = process.env.REACT_APP_SERVER_API_KEY || "http://localhost:3626";

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
            if (!token) {
                setError('Authentication token not found. Please login again.');
                setLoading(false);
                return;
            }

            const storedUser = JSON.parse(localStorage.getItem('user') || '{}');
            const selectedProgramme = storedUser.programme;

            // Fetch both assigned-teams and review-schedules to guarantee full panel metadata (coordinator & members)
            const [teamsRes, schedulesRes] = await Promise.all([
                axios.get(`${SERVER_API_KEY}/api/panels/assigned-teams`, {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'x-selected-programme': selectedProgramme || '',
                        'x-selected-role': storedUser.role || 'panel'
                    }
                }).catch(() => ({ data: [] })),
                axios.get(`${SERVER_API_KEY}/api/panels/review-schedules`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                }).catch(() => ({ data: [] }))
            ]);

            // Build panel metadata lookup from review schedules (which populates members & coordinator)
            const panelMetaMap = new Map();
            (schedulesRes.data || []).forEach(sch => {
                const p = sch.panel;
                if (!p) return;
                const pId = p._id ? String(p._id) : '';
                const pName = (p.name || '').trim().toLowerCase();
                if (pId && !panelMetaMap.has(pId)) panelMetaMap.set(pId, p);
                if (pName && !panelMetaMap.has(pName)) panelMetaMap.set(pName, p);
            });

            let fetchedTeams = teamsRes.data || [];
            if (selectedProgramme) {
                fetchedTeams = fetchedTeams.filter(t => t.programme?.toLowerCase() === selectedProgramme?.toLowerCase());
            }

            // Enrich each team with full panel details if missing
            const enrichedTeams = fetchedTeams.map(team => {
                const pObj = team.panel;
                const pId = pObj?._id ? String(pObj._id) : '';
                const pName = (pObj?.name || team.panelName || '').trim().toLowerCase();
                const meta = (pObj?.members && pObj.members.length > 0)
                    ? pObj
                    : (panelMetaMap.get(pId) || panelMetaMap.get(pName) || pObj);
                return {
                    ...team,
                    panel: meta,
                    panelName: meta?.name || team.panelName || 'Panel'
                };
            });

            setAssignedTeams(enrichedTeams);
            setLoading(false);
        } catch (err) {
            console.error('Error fetching assigned teams:', err);
            setError(`Failed to fetch assigned teams: ${err.response?.data?.message || err.message}`);
            setLoading(false);
        }
    };

    // Extract all team members with roll numbers and mark the leader
    const extractTeamMembers = (team) => {
        const list = [];
        const leader = team.teamLeader;
        if (leader?.name) {
            list.push({
                name: leader.name,
                rollNo: leader.username || '',
                isLeader: true
            });
        }
        const rawMembers = Array.isArray(team.members) ? team.members : [];
        rawMembers.forEach(m => {
            if (!m?.name) return;
            const isDuplicate = list.some(
                existing => existing.name === m.name || (m.username && existing.rollNo === m.username)
            );
            if (!isDuplicate) {
                list.push({
                    name: m.name,
                    rollNo: m.username || '',
                    isLeader: false
                });
            }
        });
        return list;
    };

    // Segregate teams panel-wise
    const panelGroups = useMemo(() => {
        const map = new Map();
        assignedTeams.forEach(team => {
            const pObj = team.panel;
            const panelId = pObj?._id ? String(pObj._id) : (team.panelName || 'unassigned');
            const panelName = pObj?.name || team.panelName || 'Unassigned Panel';
            const coordinator = pObj?.coordinator?.name || (typeof pObj?.coordinator === 'string' ? pObj.coordinator : '');

            // Build members list mentioning the coordinator
            const rawMembers = Array.isArray(pObj?.members) ? pObj.members : [];
            const memberNames = rawMembers.map(m => {
                if (!m) return null;
                const name = typeof m === 'string' ? m : (m.name || m.username);
                if (!name) return null;
                if (coordinator && name.toLowerCase() === coordinator.toLowerCase()) {
                    return `${name} (Coordinator)`;
                }
                return name;
            }).filter(Boolean);

            // If coordinator wasn't already in members list, add them explicitly
            if (coordinator && !memberNames.some(n => n.toLowerCase().includes(coordinator.toLowerCase()))) {
                memberNames.unshift(`${coordinator} (Coordinator)`);
            }

            const membersList = memberNames.join(', ');

            if (!map.has(panelId)) {
                map.set(panelId, {
                    id: panelId,
                    name: panelName,
                    coordinator,
                    membersList,
                    teams: []
                });
            }
            map.get(panelId).teams.push(team);
        });
        return Array.from(map.values());
    }, [assignedTeams]);

    if (loading) return <div className="text-center p-6 text-gray-500 font-medium">Loading assigned teams...</div>;
    if (error) return <div className="text-red-500 p-6 bg-red-50 rounded-lg border border-red-200">{error}</div>;

    return (
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 space-y-6">
            <div className="border-b border-gray-200 pb-4">
                <h2 className="text-xl font-bold text-gray-800">Your Assigned Teams</h2>
                <p className="text-xs text-gray-500 mt-0.5">
                    Teams allotted to your review panels
                </p>
            </div>

            {panelGroups.length === 0 ? (
                <div className="text-center py-10 text-xs text-gray-500 bg-gray-50 border border-dashed border-gray-200 rounded-lg">
                    No teams have been assigned to your panel yet.
                </div>
            ) : (
                panelGroups.map(panelGroup => (
                    <div key={panelGroup.id} className="border border-gray-200 rounded-lg p-5 bg-white shadow-xs space-y-4">
                        {/* Panel Header: Panel name, Coordinator, and Members (mentioning coordinator) */}
                        <div className="bg-slate-50 border border-slate-200 rounded-lg px-4 py-2.5 text-xs text-gray-800 flex flex-wrap items-center gap-x-6 gap-y-1.5 font-medium">
                            <div>
                                <span className="font-bold text-gray-900">Panel: </span>
                                <span className="text-indigo-900 font-bold">{panelGroup.name}</span>
                            </div>
                            {panelGroup.coordinator && (
                                <div>
                                    <span className="font-bold text-gray-900">Coordinator: </span>
                                    <span className="text-gray-700">{panelGroup.coordinator}</span>
                                </div>
                            )}
                            <div>
                                <span className="font-bold text-gray-900">Members: </span>
                                <span className="text-gray-700">
                                    {panelGroup.membersList || 'None listed'}
                                </span>
                            </div>
                        </div>

                        {/* Teams Table: Columns: Team Name, Members, Guide, Viva Panel (No programme name) */}
                        <div className="overflow-x-auto border border-gray-200 rounded-lg shadow-2xs">
                            <table className="w-full text-left border-collapse text-xs">
                                <thead>
                                    <tr className="bg-gray-100 text-gray-700 border-b border-gray-200">
                                        <th className="py-2.5 px-3 font-semibold text-center w-12">SNo</th>
                                        <th className="py-2.5 px-4 font-semibold whitespace-nowrap">Team Name</th>
                                        <th className="py-2.5 px-4 font-semibold">Members</th>
                                        <th className="py-2.5 px-4 font-semibold whitespace-nowrap">Guide</th>
                                        <th className="py-2.5 px-4 font-semibold whitespace-nowrap">Viva Panel</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200 bg-white">
                                    {panelGroup.teams.map((team, idx) => {
                                        const members = extractTeamMembers(team);
                                        const guideName = team.guidePreference?.name || '—';
                                        const vivaPanelName = team.vivaPanel?.name || '—';

                                        return (
                                            <tr key={team._id || idx} className="hover:bg-gray-50/80 transition-colors">
                                                {/* SNo */}
                                                <td className="py-2.5 px-3 align-top text-center text-gray-500 font-medium">
                                                    {idx + 1}
                                                </td>

                                                {/* Team Name (no programme name) */}
                                                <td className="py-2.5 px-4 align-top whitespace-nowrap">
                                                    <div className="font-bold text-gray-900">
                                                        {team.teamName}
                                                    </div>
                                                </td>

                                                {/* Members with Roll No and Leader indicator */}
                                                <td className="py-2.5 px-4 align-top min-w-[200px]">
                                                    {members.length > 0 ? (
                                                        <div className="space-y-1">
                                                            {members.map((m, mIdx) => (
                                                                <div key={mIdx} className="text-gray-800 text-xs">
                                                                    <span className="font-semibold text-gray-900">{m.name}</span>
                                                                    {m.rollNo && (
                                                                        <span className="text-gray-500 text-[11px] ml-1">({m.rollNo})</span>
                                                                    )}
                                                                    {m.isLeader && (
                                                                        <span className="ml-1.5 px-1.5 py-0.5 text-[9px] font-bold rounded bg-indigo-100 text-indigo-700">
                                                                            Leader
                                                                        </span>
                                                                    )}
                                                                </div>
                                                            ))}
                                                        </div>
                                                    ) : (
                                                        <span className="text-gray-400">No members listed</span>
                                                    )}
                                                </td>

                                                {/* Guide */}
                                                <td className="py-2.5 px-4 align-top whitespace-nowrap text-gray-800">
                                                    {guideName}
                                                </td>

                                                {/* Viva Panel */}
                                                <td className="py-2.5 px-4 align-top whitespace-nowrap text-gray-700">
                                                    {vivaPanelName}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                ))
            )}
        </div>
    );
};

export default PanelAssignedTeams;
