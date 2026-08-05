import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';

const SERVER_API_KEY = process.env.REACT_APP_SERVER_API_KEY || 'http://localhost:3626';

const normalizeProgramme = (prog) => {
    if (!prog) return 'b.e cse';
    const clean = String(prog).trim().toLowerCase();
    if (clean === 'ug' || clean === 'b.e. cse' || clean === 'b.e cse' || clean === 'b.e computer science and engineering') {
        return 'b.e cse';
    }
    return clean;
};

const GuideMarking = () => {
    const [teams, setTeams] = useState([]);
    const [marks, setMarks] = useState({}); // { studentId: { review1: { components: [{name, value}] }, ... } }
    const [slotTypes, setSlotTypes] = useState(['review1', 'review2', 'review3', 'viva']);
    const [activeSlotType, setActiveSlotType] = useState('review1');
    const [userProgramme, setUserProgramme] = useState('B.E CSE');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [submittingTeamId, setSubmittingTeamId] = useState(null);

    // Marking schemes: { panelId: { slotType: { components: [{name, maxMarks}] } } }
    const [schemes, setSchemes] = useState({});
    const [schemeLoading, setSchemeLoading] = useState(false);

    useEffect(() => {
        const storedUser = JSON.parse(localStorage.getItem('user') || '{}');
        const prog = storedUser.programme || 'B.E CSE';
        setUserProgramme(prog);
        fetchSettingsAndData(prog);
    }, []);

    const fetchSettingsAndData = async (prog) => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const headers = { Authorization: `Bearer ${token}` };

            const settingsRes = await axios.get(`${SERVER_API_KEY}/api/auth/review-settings`, { headers });
            const validSlots = (settingsRes.data.validSlotTypes || ['review1', 'review2', 'review3', 'viva']).filter(s => s !== 'review0');
            setSlotTypes(validSlots);
            if (validSlots.length > 0) {
                setActiveSlotType(validSlots[0]);
            }

            const teamsRes = await axios.get(`${SERVER_API_KEY}/api/guide/marking-teams`, { headers });
            const fetchedTeams = teamsRes.data || [];

            const targetProg = normalizeProgramme(prog);
            const filtered = fetchedTeams.filter(t => normalizeProgramme(t.programme) === targetProg);
            setTeams(filtered);

            const marksRes = await axios.get(`${SERVER_API_KEY}/api/guide/marks`, { headers });
            setMarks(marksRes.data || {});

            setLoading(false);
        } catch (err) {
            console.error('Error fetching guide marking data:', err);
            setError('Failed to fetch data.');
            setLoading(false);
        }
    };

    // Fetch marking scheme for a given panelId + slotType (cache by panelId.slotType)
    const fetchSchemeForPanel = useCallback(async (panelId, slotType) => {
        if (!panelId || !slotType) return;
        
        // Check if already cached
        if (schemes[panelId] && schemes[panelId][slotType] !== undefined) return;

        setSchemeLoading(true);
        try {
            const token = localStorage.getItem('token');
            const res = await axios.get(
                `${SERVER_API_KEY}/api/marking-scheme/for-panel?panelId=${panelId}&slotType=${slotType}`,
                { headers: { Authorization: `Bearer ${token}` } }
            );
            const schemeComponents = res.data?.components || [];
            setSchemes(prev => ({
                ...prev,
                [panelId]: {
                    ...(prev[panelId] || {}),
                    [slotType]: schemeComponents
                }
            }));
        } catch (err) {
            // If no scheme, store empty array so we don't re-fetch
            setSchemes(prev => ({
                ...prev,
                [panelId]: {
                    ...(prev[panelId] || {}),
                    [slotType]: []
                }
            }));
        } finally {
            setSchemeLoading(false);
        }
    }, [schemes]);

    // When activeSlotType changes, fetch schemes for all teams that have a panel
    useEffect(() => {
        if (!teams.length) return;
        teams.forEach(team => {
            const panelId = team.panel?._id || team.panel;
            if (panelId) fetchSchemeForPanel(panelId, activeSlotType);
        });
    }, [activeSlotType, teams, fetchSchemeForPanel]);

    /**
     * Get the scheme components for a team's panel and active slot.
     */
    const getSchemeComponents = (team) => {
        const panelId = team.panel?._id || team.panel;
        if (!panelId) return [];
        const panelSchemes = schemes[panelId];
        if (!panelSchemes || panelSchemes[activeSlotType] === undefined) return null; // still loading
        const comps = panelSchemes[activeSlotType];
        return comps || [];
    };

    /**
     * Get current entered value for a student/slot/component (by name).
     */
    const getComponentValue = (studentId, compName) => {
        const slotMarks = ((marks[studentId] || {})[activeSlotType] || {});
        const comps = slotMarks.components || [];
        const found = comps.find(c => c.name === compName);
        return found ? found.value : '';
    };

    /**
     * Update a single component value for a student.
     */
    const handleMarkChange = (studentId, compName, rawValue, maxMarks) => {
        const val = rawValue === '' ? '' : Number(rawValue);
        if (val !== '' && (val < 0 || val > maxMarks)) return;

        setMarks(prev => {
            const studentMarks = prev[studentId] || {};
            const slotMarks = studentMarks[activeSlotType] || {};
            const existingComps = slotMarks.components || [];

            // Update or insert the component
            const idx = existingComps.findIndex(c => c.name === compName);
            let newComps;
            if (idx >= 0) {
                newComps = existingComps.map((c, i) => i === idx ? { ...c, value: val } : c);
            } else {
                newComps = [...existingComps, { name: compName, value: val }];
            }

            return {
                ...prev,
                [studentId]: {
                    ...studentMarks,
                    [activeSlotType]: { ...slotMarks, components: newComps }
                }
            };
        });
    };

    /**
     * Submit all marks for a team.
     */
    const handleSubmitTeamMarks = async (team, schemeComps) => {
        try {
            setSubmittingTeamId(team._id);
            const token = localStorage.getItem('token');
            const headers = { Authorization: `Bearer ${token}` };
            const students = [team.teamLeader, ...(team.members || [])].filter(Boolean);

            const requests = students.map(stu => {
                const studentId = stu._id;
                const slotMarks = ((marks[studentId] || {})[activeSlotType] || {});
                const existingComps = slotMarks.components || [];

                // Build final components array: fill missing with 0
                const finalComponents = schemeComps.map(sc => {
                    const found = existingComps.find(c => c.name === sc.name);
                    return { name: sc.name, value: found ? (found.value === '' ? 0 : Number(found.value)) : 0 };
                });

                return axios.post(`${SERVER_API_KEY}/api/guide/marks`, {
                    teamId: team._id,
                    studentId,
                    components: finalComponents,
                    slotType: activeSlotType
                }, { headers });
            });

            await Promise.all(requests);
            alert('All marks submitted successfully!');
            await fetchSettingsAndData(userProgramme);
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to submit marks.');
        } finally {
            setSubmittingTeamId(null);
        }
    };

    const formatSlotLabel = (s) => s === 'viva' ? 'VIVA' : `REVIEW ${s.replace('review', '')}`;

    if (loading) return (
        <div className="flex items-center justify-center p-16">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600"></div>
            <span className="ml-3 text-gray-600 font-medium">Loading guide marking data...</span>
        </div>
    );
    if (error) return <div className="p-6 text-red-500 font-semibold">{error}</div>;

    return (
        <div className="space-y-8">
            {/* Header */}
            <div className="bg-white p-6 rounded-lg shadow">
                <h2 className="text-2xl font-bold text-gray-800">Mark Teams</h2>
                <p className="text-sm text-gray-500 mt-1">Enter and submit evaluation marks for teams you guide. Mark columns are defined by the coordinator's marking scheme.</p>
            </div>

            {/* Slot type tabs */}
            <div className="flex space-x-2">
                {slotTypes.map(st => (
                    <button
                        key={st}
                        onClick={() => setActiveSlotType(st)}
                        className={`px-4 py-2 rounded-md font-semibold text-sm transition-colors ${
                            activeSlotType === st
                                ? 'bg-indigo-600 text-white shadow'
                                : 'bg-gray-200 text-gray-800 hover:bg-gray-300'
                        }`}
                    >
                        {formatSlotLabel(st)}
                    </button>
                ))}
            </div>

            {teams.length === 0 ? (
                <div className="p-8 bg-white rounded-lg shadow text-center text-gray-500 font-medium">
                    No teams assigned to you under <strong>{userProgramme}</strong> for evaluation.
                </div>
            ) : (
                teams.map(team => {
                    const schemeComps = getSchemeComponents(team);
                    const panelId = team.panel?._id || team.panel;
                    const isSchemeLoading = schemeLoading && panelId && (
                        !schemes[panelId] || schemes[panelId][activeSlotType] === undefined
                    );

                    return (
                        <div key={team._id} className="p-6 bg-white rounded-lg shadow space-y-4">
                            <div className="flex items-center gap-3 flex-wrap">
                                <h3 className="text-xl font-semibold text-gray-900">{team.teamName}</h3>
                                <span className="px-2.5 py-0.5 text-xs font-bold rounded-full bg-indigo-100 text-indigo-700">
                                    {team.programme || 'B.E CSE'}
                                </span>
                                {panelId && (
                                    <span className="px-2.5 py-0.5 text-xs font-medium rounded-full bg-gray-100 text-gray-600">
                                        Panel: {team.panel?.name || 'Assigned'}
                                    </span>
                                )}
                            </div>

                            {isSchemeLoading ? (
                                <div className="flex items-center gap-2 py-4 text-gray-500 text-sm">
                                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-indigo-500"></div>
                                    Loading marking scheme...
                                </div>
                            ) : !schemeComps ? (
                                <div className="flex items-center gap-2 py-4 text-gray-500 text-sm">
                                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-indigo-500"></div>
                                    Loading...
                                </div>
                            ) : (
                                <>
                                    {/* Scheme info banner */}
                                    {schemeComps.length === 0 ? (
                                        <div className="p-6 text-center bg-amber-50 border border-amber-200 rounded-md text-amber-800 font-medium">
                                            The coordinator hasn't uploaded the marking scheme yet.
                                        </div>
                                    ) : (
                                        <>
                                            <div className="text-xs text-indigo-600 bg-indigo-50 border border-indigo-200 rounded-md px-3 py-2 flex items-center gap-2 flex-wrap">
                                                <span className="font-semibold">Scheme:</span>
                                                {schemeComps.map((c, i) => (
                                                    <span key={i} className="bg-indigo-100 px-2 py-0.5 rounded-full">
                                                        {c.name} <span className="font-semibold">/{c.maxMarks}</span>
                                                    </span>
                                                ))}
                                                <span className="ml-auto font-semibold text-gray-600">
                                                    Total: {schemeComps.reduce((s, c) => s + c.maxMarks, 0)} marks
                                                </span>
                                            </div>

                                            <div className="overflow-x-auto">
                                                <table className="min-w-full divide-y divide-gray-200">
                                                    <thead>
                                                        <tr className="bg-gray-100">
                                                            <th className="py-2.5 px-4 text-left text-sm font-semibold text-gray-700 whitespace-nowrap">Student Name</th>
                                                            {schemeComps.map((comp, ci) => (
                                                                <th key={ci} className="py-2.5 px-4 text-center text-sm font-semibold text-gray-700 whitespace-nowrap">
                                                                    {comp.name}
                                                                    <span className="ml-1 text-xs font-normal text-gray-400">({comp.maxMarks})</span>
                                                                </th>
                                                            ))}
                                                            <th className="py-2.5 px-4 text-center text-sm font-semibold text-gray-700">Total</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-gray-100">
                                                        {[
                                                            team.teamLeader && { ...team.teamLeader, isLeader: true },
                                                            ...(team.members || []).map(m => ({ ...m, isLeader: false }))
                                                        ].filter(Boolean).map(stu => {
                                                            const studentId = stu._id;
                                                            const studentComps = ((marks[studentId] || {})[activeSlotType] || {}).components || [];
                                                            const total = schemeComps.reduce((sum, sc) => {
                                                                const found = studentComps.find(c => c.name === sc.name);
                                                                return sum + (found && found.value !== '' ? Number(found.value) : 0);
                                                            }, 0);
                                                            const maxTotal = schemeComps.reduce((s, c) => s + c.maxMarks, 0);

                                                            return (
                                                                <tr key={studentId} className={stu.isLeader ? 'bg-indigo-50/30' : ''}>
                                                                    <td className={`py-2.5 px-4 font-medium text-gray-900 ${stu.isLeader ? 'font-semibold' : ''}`}>
                                                                        {stu.name}
                                                                        {stu.isLeader && <span className="ml-1.5 text-xs text-indigo-600 font-bold">(Leader)</span>}
                                                                    </td>
                                                                    {schemeComps.map((comp, ci) => (
                                                                        <td key={ci} className="py-2.5 px-4 text-center">
                                                                            <input
                                                                                type="number"
                                                                                min="0"
                                                                                max={comp.maxMarks}
                                                                                value={getComponentValue(studentId, comp.name)}
                                                                                onChange={e => handleMarkChange(studentId, comp.name, e.target.value, comp.maxMarks)}
                                                                                className="w-20 p-1.5 border border-gray-300 rounded text-center font-medium focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                                                                                placeholder="0"
                                                                            />
                                                                        </td>
                                                                    ))}
                                                                    <td className="py-2.5 px-4 text-center">
                                                                        <span className={`text-sm font-bold ${total > 0 ? 'text-indigo-700' : 'text-gray-400'}`}>
                                                                            {total}/{maxTotal}
                                                                        </span>
                                                                    </td>
                                                                </tr>
                                                            );
                                                        })}
                                                    </tbody>
                                                </table>
                                            </div>

                                            <div className="mt-4 flex justify-end">
                                                <button
                                                    onClick={() => handleSubmitTeamMarks(team, schemeComps)}
                                                    disabled={submittingTeamId === team._id}
                                                    className={`px-5 py-2 rounded-md font-semibold text-white transition-colors ${
                                                        submittingTeamId === team._id
                                                            ? 'bg-gray-400 cursor-not-allowed'
                                                            : 'bg-indigo-600 hover:bg-indigo-700 shadow'
                                                    }`}
                                                >
                                                    {submittingTeamId === team._id ? 'Submitting...' : 'Submit All Marks'}
                                                </button>
                                            </div>
                                        </>
                                    )}
                                </>
                            )}
                        </div>
                    );
                })
            )}
        </div>
    );
};

export default GuideMarking;