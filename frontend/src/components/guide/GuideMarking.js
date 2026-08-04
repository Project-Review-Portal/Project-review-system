import React, { useState, useEffect } from 'react';
import axios from 'axios';

const SERVER_API_KEY = process.env.REACT_APP_SERVER_API_KEY || "http://localhost:3626";

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
    const [marks, setMarks] = useState({}); // { studentId: { review1: {...}, review2: {...}, review3: {...}, viva: {...} } }
    const [slotTypes, setSlotTypes] = useState(['review1', 'review2', 'review3', 'viva']);
    const [activeSlotType, setActiveSlotType] = useState('review1');
    const [userProgramme, setUserProgramme] = useState('B.E CSE');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [submittingTeamId, setSubmittingTeamId] = useState(null);

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

            // Fetch all teams guided by this guide using dedicated marking endpoint
            const teamsRes = await axios.get(`${SERVER_API_KEY}/api/guide/marking-teams`, { headers });
            const fetchedTeams = teamsRes.data || [];

            // Get user's programme directly from parameter or localStorage
            const targetProg = normalizeProgramme(prog);

            // Filter guided teams matching the user's programme
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

    const handleMarkChange = (studentId, markName, value) => {
        const intValue = value === '' ? '' : parseInt(value, 10);
        if (intValue > 10) return;
        setMarks(prev => ({
            ...prev,
            [studentId]: {
                ...(prev[studentId] || {}),
                [activeSlotType]: {
                    ...(((prev[studentId] || {})[activeSlotType]) || {}),
                    [markName]: intValue,
                }
            },
        }));
    };

    const handleSubmitTeamMarks = async (team) => {
        try {
            setSubmittingTeamId(team._id);
            const token = localStorage.getItem('token');
            const headers = { Authorization: `Bearer ${token}` };
            const students = [team.teamLeader, ...(team.members || [])].filter(Boolean);
            const requests = students.map(stu => {
                const studentId = stu._id;
                const studentMarks = ((marks[studentId] || {})[activeSlotType]) || {};
                const { mark1 = 0, mark2 = 0, mark3 = 0, mark4 = 0 } = studentMarks;
                return axios.post(`${SERVER_API_KEY}/api/guide/marks`, { teamId: team._id, studentId, mark1, mark2, mark3, mark4, slotType: activeSlotType }, { headers });
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

    if (loading) return <div className="p-6 text-gray-600 font-semibold">Loading guide marking data...</div>;
    if (error) return <div className="p-6 text-red-500 font-semibold">{error}</div>;

    return (
        <div className="space-y-8">
            <div className="bg-white p-6 rounded-lg shadow">
                <h2 className="text-2xl font-bold text-gray-800">Mark Teams</h2>
                <p className="text-sm text-gray-500 mt-1">Enter and submit evaluation marks for teams you guide.</p>
            </div>

            {/* Slot type tabs */}
            <div className="flex space-x-2">
                {slotTypes.map(st => (
                    <button 
                        key={st} 
                        onClick={() => setActiveSlotType(st)} 
                        className={`px-4 py-2 rounded-md font-semibold text-sm transition-colors ${activeSlotType === st ? 'bg-indigo-600 text-white shadow' : 'bg-gray-200 text-gray-800 hover:bg-gray-300'}`}
                    >
                        {st === 'viva' ? 'VIVA' : `REVIEW ${st.replace('review', '')}`}
                    </button>
                ))}
            </div>

            {teams.length === 0 ? (
                <div className="p-8 bg-white rounded-lg shadow text-center text-gray-500 font-medium">
                    No teams assigned to you under <strong>{userProgramme}</strong> for evaluation.
                </div>
            ) : (
                teams.map(team => (
                    <div key={team._id} className="p-6 bg-white rounded-lg shadow space-y-4">
                        <div className="flex items-center gap-3">
                            <h3 className="text-xl font-semibold text-gray-900">{team.teamName}</h3>
                            <span className="px-2.5 py-0.5 text-xs font-bold rounded-full bg-indigo-100 text-indigo-700">
                                {team.programme || 'B.E CSE'}
                            </span>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead>
                                    <tr className="bg-gray-100">
                                        <th className="py-2.5 px-4 text-left text-sm font-semibold text-gray-700">Student Name</th>
                                        <th className="py-2.5 px-4 text-center text-sm font-semibold text-gray-700">Mark 1 (10)</th>
                                        <th className="py-2.5 px-4 text-center text-sm font-semibold text-gray-700">Mark 2 (10)</th>
                                        <th className="py-2.5 px-4 text-center text-sm font-semibold text-gray-700">Mark 3 (10)</th>
                                        <th className="py-2.5 px-4 text-center text-sm font-semibold text-gray-700">Mark 4 (10)</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {/* Team Leader */}
                                    {team.teamLeader && (
                                        <tr key={team.teamLeader._id} className="bg-indigo-50/30">
                                            <td className="py-2.5 px-4 font-semibold text-gray-900">
                                                {team.teamLeader.name} <span className="text-xs text-indigo-600 font-bold">(Leader)</span>
                                            </td>
                                            {[1, 2, 3, 4].map(num => (
                                                <td key={num} className="py-2.5 px-4 text-center">
                                                    <input
                                                        type="number"
                                                        min="0"
                                                        max="10"
                                                        value={((marks[team.teamLeader._id]||{})[activeSlotType]||{})[`mark${num}`] ?? ''}
                                                        onChange={(e) => handleMarkChange(team.teamLeader._id, `mark${num}`, e.target.value)}
                                                        className="w-20 p-1.5 border border-gray-300 rounded text-center font-medium focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                                                    />
                                                </td>
                                            ))}
                                        </tr>
                                    )}

                                    {/* Team Members */}
                                    {team.members && team.members.map(member => (
                                        <tr key={member._id}>
                                            <td className="py-2.5 px-4 text-gray-800 font-medium">{member.name}</td>
                                            {[1, 2, 3, 4].map(num => (
                                                <td key={num} className="py-2.5 px-4 text-center">
                                                    <input
                                                        type="number"
                                                        min="0"
                                                        max="10"
                                                        value={((marks[member._id]||{})[activeSlotType]||{})[`mark${num}`] ?? ''}
                                                        onChange={(e) => handleMarkChange(member._id, `mark${num}`, e.target.value)}
                                                        className="w-20 p-1.5 border border-gray-300 rounded text-center font-medium focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                                                    />
                                                </td>
                                            ))}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        <div className="mt-4 flex justify-end">
                            <button
                                onClick={() => handleSubmitTeamMarks(team)}
                                disabled={submittingTeamId === team._id}
                                className={`px-5 py-2 rounded-md font-semibold text-white transition-colors ${submittingTeamId === team._id ? 'bg-gray-400 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-700 shadow'}`}
                            >
                                {submittingTeamId === team._id ? 'Submitting...' : 'Submit All Marks'}
                            </button>
                        </div>
                    </div>
                ))
            )}
        </div>
    );
};

export default GuideMarking;