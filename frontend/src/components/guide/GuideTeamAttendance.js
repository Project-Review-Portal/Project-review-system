import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useLocation } from 'react-router-dom';
import { toast } from '../../utils/toast';

const SERVER_API_KEY = process.env.REACT_APP_SERVER_API_KEY || 'http://localhost:3626';

const GuideTeamAttendance = () => {
    const location = useLocation();
    const [teams, setTeams] = useState([]);
    const [totalAttendanceHours, setTotalAttendanceHours] = useState(0);
    const [programme, setProgramme] = useState('');
    const [loading, setLoading] = useState(true);
    const [savingTeamId, setSavingTeamId] = useState(null);
    const [localAttendance, setLocalAttendance] = useState({}); // { [teamId]: { [studentId]: hours } }

    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const token = localStorage.getItem('token');
    const headers = { Authorization: `Bearer ${token}` };

    // Check if a specific teamId was passed in query
    const searchParams = new URLSearchParams(location.search);
    const targetTeamId = searchParams.get('teamId');

    useEffect(() => {
        fetchTeamAttendance();
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    const fetchTeamAttendance = async () => {
        try {
            setLoading(true);
            const res = await axios.get(`${SERVER_API_KEY}/api/guide/team-attendance`, { headers });
            const fetchedTeams = res.data.teams || [];
            const benchmarkHours = res.data.totalAttendanceHours || 0;

            setTeams(fetchedTeams);
            setTotalAttendanceHours(benchmarkHours);
            setProgramme(res.data.programme || user.programme || 'B.E. CSE');

            // Initialize local input state from fetched data
            const initialMap = {};
            fetchedTeams.forEach(team => {
                initialMap[team._id] = {};
                (team.students || []).forEach(student => {
                    initialMap[team._id][student.studentId] = student.attendedHours ?? 0;
                });
            });
            setLocalAttendance(initialMap);
        } catch (err) {
            console.error('Error fetching team attendance:', err);
            toast.error(err.response?.data?.message || 'Failed to load team attendance.');
        } finally {
            setLoading(false);
        }
    };

    const handleHourChange = (teamId, studentId, value) => {
        const numVal = value === '' ? '' : Math.max(0, Number(value));
        setLocalAttendance(prev => ({
            ...prev,
            [teamId]: {
                ...(prev[teamId] || {}),
                [studentId]: numVal
            }
        }));
    };

    const handleSetStudentQuickHours = (teamId, studentId, hours) => {
        setLocalAttendance(prev => ({
            ...prev,
            [teamId]: {
                ...(prev[teamId] || {}),
                [studentId]: hours
            }
        }));
    };

    const handleSetTeamAllHours = (teamId, hours) => {
        const team = teams.find(t => t._id === teamId);
        if (!team) return;
        const newTeamHours = {};
        (team.students || []).forEach(s => {
            newTeamHours[s.studentId] = hours;
        });
        setLocalAttendance(prev => ({
            ...prev,
            [teamId]: {
                ...(prev[teamId] || {}),
                ...newTeamHours
            }
        }));
    };

    const handleSaveTeam = async (teamId) => {
        const team = teams.find(t => t._id === teamId);
        if (!team) return;

        const teamHours = localAttendance[teamId] || {};
        const studentAttendances = (team.students || []).map(s => ({
            studentId: s.studentId,
            attendedHours: Number(teamHours[s.studentId] || 0)
        }));

        try {
            setSavingTeamId(teamId);
            const res = await axios.post(`${SERVER_API_KEY}/api/guide/team-attendance`, {
                teamId,
                studentAttendances
            }, { headers });

            toast.success(res.data.message || `Attendance for ${team.teamName} saved successfully.`);
            // Update local teams state with updated percentages
            setTeams(prevTeams => prevTeams.map(t => {
                if (t._id !== teamId) return t;
                return {
                    ...t,
                    students: t.students.map(s => {
                        const newHours = Number(teamHours[s.studentId] || 0);
                        const newPct = totalAttendanceHours > 0
                            ? Number(((newHours / totalAttendanceHours) * 100).toFixed(2))
                            : 0;
                        return {
                            ...s,
                            attendedHours: newHours,
                            attendancePercentage: newPct
                        };
                    })
                };
            }));
        } catch (err) {
            console.error('Error saving team attendance:', err);
            toast.error(err.response?.data?.message || 'Failed to save attendance.');
        } finally {
            setSavingTeamId(null);
        }
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center py-20 text-indigo-600 font-medium">
                <svg className="animate-spin -ml-1 mr-3 h-6 w-6 text-indigo-600" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
                </svg>
                Loading team attendance...
            </div>
        );
    }

    return (
        <div className="max-w-6xl mx-auto space-y-6 pb-12">
            {/* Header */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <div className="flex items-center gap-3">
                        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Team Attendance Management</h1>
                        <span className="px-3 py-1 rounded-full text-xs font-bold bg-indigo-100 text-indigo-700 uppercase tracking-wide">
                            Guide Portal
                        </span>
                    </div>
                    <p className="text-sm text-slate-500 mt-1">
                        Update and record project attendance hours for students in your respective guided teams.
                    </p>
                </div>
                <div className="px-4 py-2.5 bg-indigo-50 border border-indigo-200 rounded-xl text-right">
                    <span className="text-xs text-indigo-600 font-semibold uppercase tracking-wider block">
                        Mandatory Benchmark ({programme})
                    </span>
                    <span className="text-lg font-extrabold text-indigo-700">
                        {totalAttendanceHours > 0 ? `${totalAttendanceHours} Total Hours` : 'Not Set by Coordinator'}
                    </span>
                </div>
            </div>

            {totalAttendanceHours === 0 && (
                <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 text-xs flex items-center gap-3">
                    <svg className="w-5 h-5 text-amber-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    <span>
                        <strong>Coordinator Notice:</strong> Total attendance hours have not yet been configured by the coordinator for this programme. You can still input and save attended hours now; percentages will automatically compute once the coordinator uploads the benchmark.
                    </span>
                </div>
            )}

            {teams.length === 0 ? (
                <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center shadow-sm">
                    <svg className="w-12 h-12 text-slate-400 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                    <h3 className="text-lg font-bold text-slate-800">No Approved Teams Found</h3>
                    <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                        You do not currently have any approved teams assigned to guide in this session and programme.
                    </p>
                </div>
            ) : (
                <div className="space-y-6">
                    {teams.map(team => {
                        const isTargeted = targetTeamId && targetTeamId === team._id;
                        const isSaving = savingTeamId === team._id;
                        return (
                            <div
                                key={team._id}
                                className={`bg-white rounded-2xl border shadow-sm transition-all overflow-hidden ${
                                    isTargeted ? 'border-indigo-400 ring-2 ring-indigo-100' : 'border-slate-200'
                                }`}
                            >
                                {/* Team Card Header */}
                                <div className="p-5 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                    <div className="flex items-center gap-3">
                                        <h2 className="text-lg font-extrabold text-slate-900">{team.teamName}</h2>
                                        <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-200 text-slate-700">
                                            {team.programme}
                                        </span>
                                        {team.panel && (
                                            <span className="text-xs text-slate-500">
                                                Panel: <span className="font-semibold text-slate-700">{team.panel.name}</span>
                                            </span>
                                        )}
                                    </div>

                                    {/* Team Quick Fill Controls */}
                                    {totalAttendanceHours > 0 && (
                                        <div className="flex items-center gap-2">
                                            <span className="text-xs font-semibold text-slate-500">Team Quick Fill:</span>
                                            <button
                                                type="button"
                                                onClick={() => handleSetTeamAllHours(team._id, totalAttendanceHours)}
                                                className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-white border border-slate-300 text-slate-700 hover:bg-slate-100 transition"
                                            >
                                                All Full ({totalAttendanceHours}h)
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => handleSetTeamAllHours(team._id, Math.round(totalAttendanceHours / 2))}
                                                className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-white border border-slate-300 text-slate-700 hover:bg-slate-100 transition"
                                            >
                                                All Half ({Math.round(totalAttendanceHours / 2)}h)
                                            </button>
                                        </div>
                                    )}
                                </div>

                                {/* Students Table */}
                                <div className="overflow-x-auto">
                                    <table className="min-w-full divide-y divide-slate-100 text-left text-xs">
                                        <thead className="bg-white text-slate-500 font-semibold uppercase">
                                            <tr>
                                                <th className="px-5 py-3">Student Name</th>
                                                <th className="px-5 py-3">Register Number</th>
                                                <th className="px-5 py-3">Attended Hours</th>
                                                <th className="px-5 py-3 text-center">Attendance %</th>
                                                <th className="px-5 py-3">Quick Presets</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                                            {(team.students || []).map(student => {
                                                const currentHours = localAttendance[team._id]?.[student.studentId] ?? student.attendedHours ?? 0;
                                                const livePct = totalAttendanceHours > 0
                                                    ? Number(((Number(currentHours || 0) / totalAttendanceHours) * 100).toFixed(2))
                                                    : (student.attendancePercentage || 0);

                                                return (
                                                    <tr key={student.studentId} className="hover:bg-slate-50/70 transition">
                                                        <td className="px-5 py-3.5">
                                                            <div className="font-bold text-slate-900">{student.name}</div>
                                                            {student.isLeader && (
                                                                <span className="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-600">
                                                                    Leader
                                                                </span>
                                                            )}
                                                        </td>
                                                        <td className="px-5 py-3.5 font-mono text-slate-600">
                                                            {student.username}
                                                        </td>
                                                        <td className="px-5 py-3.5">
                                                            <div className="flex items-center gap-2">
                                                                <input
                                                                    type="number"
                                                                    min="0"
                                                                    max={totalAttendanceHours > 0 ? totalAttendanceHours * 2 : 500}
                                                                    step="0.5"
                                                                    value={currentHours}
                                                                    onChange={(e) => handleHourChange(team._id, student.studentId, e.target.value)}
                                                                    className="w-24 px-3 py-1.5 border border-slate-300 rounded-lg text-sm font-bold text-slate-800 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                                                                />
                                                                {totalAttendanceHours > 0 && (
                                                                    <span className="text-xs text-slate-400 font-medium">
                                                                        / {totalAttendanceHours} hrs
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </td>
                                                        <td className="px-5 py-3.5 text-center">
                                                            <div className="inline-flex items-center gap-2">
                                                                <div className="w-14 bg-slate-100 rounded-full h-1.5 overflow-hidden">
                                                                    <div
                                                                        className={`h-full rounded-full ${
                                                                            livePct >= 75 ? 'bg-emerald-500' : livePct >= 50 ? 'bg-amber-500' : 'bg-rose-500'
                                                                        }`}
                                                                        style={{ width: `${Math.min(livePct, 100)}%` }}
                                                                    ></div>
                                                                </div>
                                                                <span className="font-bold text-xs">
                                                                    {totalAttendanceHours > 0 ? `${livePct}%` : '—'}
                                                                </span>
                                                            </div>
                                                        </td>
                                                        <td className="px-5 py-3.5">
                                                            <div className="flex items-center gap-1.5">
                                                                {totalAttendanceHours > 0 && (
                                                                    <>
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => handleSetStudentQuickHours(team._id, student.studentId, totalAttendanceHours)}
                                                                            className="px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition"
                                                                        >
                                                                            {totalAttendanceHours}h
                                                                        </button>
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => handleSetStudentQuickHours(team._id, student.studentId, Math.round(totalAttendanceHours / 2))}
                                                                            className="px-2 py-0.5 rounded text-[11px] font-semibold bg-amber-50 text-amber-700 hover:bg-amber-100 transition"
                                                                        >
                                                                            {Math.round(totalAttendanceHours / 2)}h
                                                                        </button>
                                                                    </>
                                                                )}
                                                                <button
                                                                    type="button"
                                                                    onClick={() => handleSetStudentQuickHours(team._id, student.studentId, 0)}
                                                                    className="px-2 py-0.5 rounded text-[11px] font-semibold bg-slate-100 text-slate-600 hover:bg-slate-200 transition"
                                                                >
                                                                    0h
                                                                </button>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>

                                {/* Save Button */}
                                <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
                                    <span className="text-xs text-slate-400">
                                        Last saved: {team.lastUpdated ? new Date(team.lastUpdated).toLocaleString() : 'Never'}
                                    </span>
                                    <button
                                        type="button"
                                        onClick={() => handleSaveTeam(team._id)}
                                        disabled={isSaving}
                                        className="px-5 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white transition-all shadow-sm hover:shadow disabled:opacity-50"
                                    >
                                        {isSaving ? 'Saving...' : `Save Attendance for ${team.teamName}`}
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

export default GuideTeamAttendance;
