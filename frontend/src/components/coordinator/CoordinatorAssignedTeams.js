import React, { useEffect, useState, useMemo } from 'react';
import axios from 'axios';

const SERVER_API_KEY = process.env.REACT_APP_SERVER_API_KEY || "http://localhost:3626";

// Tooltip popover to display panel details (coordinator & members) on hover
const PanelHoverTooltip = ({ panel, panelName, panelType = 'Viva Panel' }) => {
    const [isHovered, setIsHovered] = useState(false);

    if (!panelName || panelName === '—' || panelName === 'Not Assigned') {
        return <span className="text-gray-400">—</span>;
    }

    const coordinator = panel?.coordinator?.name || '';
    const members = Array.isArray(panel?.members) ? panel.members : [];

    return (
        <div
            className="relative inline-block"
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
        >
            <span className="font-semibold text-indigo-700 hover:text-indigo-900 cursor-pointer underline decoration-dotted decoration-indigo-300 underline-offset-2 transition-colors">
                {panelName}
            </span>

            {isHovered && (
                <div className="absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 p-3 bg-gray-900 text-white text-xs rounded-lg shadow-xl pointer-events-none border border-gray-700 animate-fadeIn">
                    <div className="font-bold text-indigo-300 text-[11px] uppercase tracking-wider mb-1.5 border-b border-gray-700 pb-1">
                        {panelName} ({panelType})
                    </div>
                    {coordinator && (
                        <div className="mb-1.5 text-[11px]">
                            <span className="text-gray-400 font-medium">Coordinator: </span>
                            <span className="font-semibold text-gray-200">{coordinator}</span>
                        </div>
                    )}
                    <div>
                        <div className="text-gray-400 font-semibold text-[10px] uppercase tracking-wider mb-1">
                            Panel Members:
                        </div>
                        {members.length > 0 ? (
                            <ul className="space-y-1 text-[11px] text-gray-200">
                                {members.map((m, idx) => (
                                    <li key={m._id || idx} className="flex items-center gap-1.5">
                                        <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 flex-shrink-0"></span>
                                        <span className="font-medium">{m.name || m.username || 'Unknown'}</span>
                                        {m.designation && (
                                            <span className="text-gray-400 text-[10px]">({m.designation})</span>
                                        )}
                                    </li>
                                ))}
                            </ul>
                        ) : (
                            <div className="text-gray-400 italic text-[11px]">No panel members listed</div>
                        )}
                    </div>
                    {/* Arrow pointer */}
                    <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-900"></div>
                </div>
            )}
        </div>
    );
};

const CoordinatorAssignedTeams = () => {
    const [teams, setTeams] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [selectedVivaPanel, setSelectedVivaPanel] = useState('all');

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

                const storedUser = JSON.parse(localStorage.getItem('user') || '{}');
                const selectedProgramme = storedUser.programme || 'UG';

                const res = await axios.get(`${SERVER_API_KEY}/api/panels/coordinator/coordinated-teams`, {
                    headers: {
                        Authorization: `Bearer ${token}`,
                        'x-selected-programme': selectedProgramme
                    }
                });

                setTeams(res.data || []);
            } catch (err) {
                setError(err.response?.data?.message || 'Failed to load coordinated teams');
            } finally {
                setLoading(false);
            }
        };
        fetchTeams();
    }, []);

    // 1. Deduplicate teams by ID to ensure no redundancy
    const uniqueTeams = useMemo(() => {
        const seen = new Set();
        return teams.filter(t => {
            const id = t._id ? String(t._id) : t.teamName;
            if (!id || seen.has(id)) return false;
            seen.add(id);
            return true;
        });
    }, [teams]);

    // 2. Extract unique Viva panels for the filter
    const vivaPanelOptions = useMemo(() => {
        const set = new Set();
        uniqueTeams.forEach(t => {
            const name = t.vivaPanel?.name;
            if (name) set.add(name);
        });
        return Array.from(set).sort();
    }, [uniqueTeams]);

    // 3. Filter teams by selected Viva Panel
    const filteredTeams = useMemo(() => {
        if (selectedVivaPanel === 'all') return uniqueTeams;
        return uniqueTeams.filter(team => {
            const vivName = team.vivaPanel?.name || 'Not Assigned';
            return vivName === selectedVivaPanel;
        });
    }, [uniqueTeams, selectedVivaPanel]);

    // 4. Format members with no redundancy (leader not repeated)
    const formatTeamMembers = (team) => {
        const leader = team.teamLeader;
        const leaderDisplay = leader?.name
            ? `${leader.name}${leader.username ? ` (${leader.username})` : ''}`
            : null;

        const rawMembers = Array.isArray(team.members) ? team.members : [];
        // Exclude leader from members list to eliminate duplication
        const otherMembers = rawMembers.filter(m => {
            if (!m) return false;
            if (leader?._id && m._id && String(leader._id) === String(m._id)) return false;
            if (leader?.username && m.username && leader.username === m.username) return false;
            if (leader?.name && m.name && leader.name === m.name) return false;
            return true;
        });

        const otherMembersDisplay = otherMembers
            .map(m => `${m.name || 'Unknown'}${m.username ? ` (${m.username})` : ''}`)
            .join(', ');

        return { leaderDisplay, otherMembersDisplay };
    };

    if (loading) return <div className="text-center p-6 text-gray-500 font-medium">Loading assigned teams...</div>;
    if (error) return <div className="text-red-500 p-6 bg-red-50 rounded-lg border border-red-200">{error}</div>;

    return (
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 space-y-5">
            {/* Header: Title and Viva Panel Filter */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-gray-200 pb-4">
                <div>
                    <h2 className="text-xl font-bold text-gray-800">Assigned Teams</h2>
                </div>

                {/* Viva Panel Filter */}
                <div className="flex items-center gap-2">
                    <label className="text-xs font-semibold text-gray-700 whitespace-nowrap">
                        Viva Panel:
                    </label>
                    <select
                        value={selectedVivaPanel}
                        onChange={(e) => setSelectedVivaPanel(e.target.value)}
                        className="text-xs px-2.5 py-1.5 border border-gray-300 rounded-md bg-white shadow-xs focus:outline-none focus:ring-1 focus:ring-indigo-500 text-gray-800 font-medium"
                    >
                        <option value="all">All Viva Panels</option>
                        {vivaPanelOptions.map(pName => (
                            <option key={pName} value={pName}>{pName}</option>
                        ))}
                    </select>

                    {/* Reset Filter button if active */}
                    {selectedVivaPanel !== 'all' && (
                        <button
                            type="button"
                            onClick={() => setSelectedVivaPanel('all')}
                            className="text-xs text-indigo-600 hover:text-indigo-800 underline font-medium ml-1"
                        >
                            Reset
                        </button>
                    )}
                </div>
            </div>

            {/* Teams Table */}
            {uniqueTeams.length === 0 ? (
                <div className="text-center py-10 text-xs text-gray-500 bg-gray-50 border border-dashed border-gray-200 rounded-lg">
                    No teams have been assigned to your panel yet.
                </div>
            ) : filteredTeams.length === 0 ? (
                <div className="text-center py-8 text-xs text-gray-500 bg-gray-50 border border-dashed border-gray-200 rounded-lg">
                    No teams match the selected viva panel filter.
                </div>
            ) : (
                <div className="overflow-x-auto border border-gray-200 rounded-lg shadow-2xs">
                    <table className="w-full text-left border-collapse text-xs">
                        <thead>
                            <tr className="bg-gray-100 text-gray-700 border-b border-gray-200">
                                <th className="py-2.5 px-3 font-semibold text-center w-12">SNo</th>
                                <th className="py-2.5 px-4 font-semibold whitespace-nowrap">Team</th>
                                <th className="py-2.5 px-4 font-semibold">Members</th>
                                <th className="py-2.5 px-4 font-semibold whitespace-nowrap">Guide</th>
                                <th className="py-2.5 px-4 font-semibold whitespace-nowrap">Viva Panel</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200 bg-white">
                            {filteredTeams.map((team, idx) => {
                                const { leaderDisplay, otherMembersDisplay } = formatTeamMembers(team);
                                const guideName = team.guidePreference?.name || '—';
                                const vivaPanelName = team.vivaPanel?.name || '—';

                                return (
                                    <tr key={team._id || idx} className="hover:bg-gray-50/80 transition-colors">
                                        {/* SNo */}
                                        <td className="py-2.5 px-3 align-top text-center text-gray-500 font-medium">
                                            {idx + 1}
                                        </td>

                                        {/* Team Name (no programme name below) */}
                                        <td className="py-2.5 px-4 align-top whitespace-nowrap">
                                            <div className="font-bold text-gray-900">
                                                {team.teamName}
                                            </div>
                                        </td>

                                        {/* Members (No Redundancy: Leader labeled once, members listed without duplicate leader) */}
                                        <td className="py-2.5 px-4 align-top min-w-[200px]">
                                            {leaderDisplay && (
                                                <div>
                                                    <span className="font-semibold text-gray-800">Leader: </span>
                                                    <span className="text-gray-900">{leaderDisplay}</span>
                                                </div>
                                            )}
                                            {otherMembersDisplay && (
                                                <div className="text-gray-600 text-[11px] mt-0.5">
                                                    <span className="font-medium text-gray-700">Members: </span>
                                                    <span>{otherMembersDisplay}</span>
                                                </div>
                                            )}
                                            {!leaderDisplay && !otherMembersDisplay && (
                                                <span className="text-gray-400">No members listed</span>
                                            )}
                                        </td>

                                        {/* Guide */}
                                        <td className="py-2.5 px-4 align-top whitespace-nowrap text-gray-800">
                                            {guideName}
                                        </td>

                                        {/* Viva Panel with Hover Details */}
                                        <td className="py-2.5 px-4 align-top whitespace-nowrap">
                                            <PanelHoverTooltip
                                                panel={team.vivaPanel}
                                                panelName={vivaPanelName}
                                                panelType="Viva Panel"
                                            />
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
};

export default CoordinatorAssignedTeams;
