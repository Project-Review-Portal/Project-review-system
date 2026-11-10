import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useLocation } from 'react-router-dom';
import { toast } from '../../utils/toast';
import SpotlightCard from '../ui/SpotlightCard';
import StatusBadge from '../ui/StatusBadge';
import { 
  UsersIcon, 
  ClockIcon, 
  CheckCircleIcon, 
  AlertTriangleIcon, 
  SparklesIcon,
  ShieldCheckIcon
} from '../ui/Icons';

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
                    lastUpdated: new Date().toISOString(),
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
            <div className="flex flex-col justify-center items-center py-28 text-slate-500 font-medium space-y-3">
                <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin" />
                <span className="text-sm font-semibold tracking-wide">Loading team attendance records...</span>
            </div>
        );
    }

    return (
        <div className="max-w-6xl mx-auto space-y-6 pb-16">
            {/* Header Section */}
            <div className="glass-panel rounded-3xl p-6 sm:p-8 flex flex-col md:flex-row md:items-center justify-between gap-6 border border-white/80 shadow-lg">
                <div className="space-y-1.5">
                    <div className="flex items-center gap-3 flex-wrap">
                        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                            Team Attendance Management
                        </h1>
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200/60 shadow-xs">
                            <ShieldCheckIcon className="w-3.5 h-3.5 text-blue-600" />
                            <span>Guide Portal</span>
                        </span>
                    </div>
                    <p className="text-xs sm:text-sm text-slate-500 max-w-2xl">
                        Log student attended hours for each guided group. Percentages compute dynamically against the coordinator's benchmark hours.
                    </p>
                </div>

                <div className="bg-white/80 border border-slate-200/80 rounded-2xl p-4 sm:text-right shadow-xs min-w-[220px]">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">
                        Mandatory Benchmark ({programme})
                    </span>
                    <span className="text-lg font-black text-blue-900 block mt-0.5">
                        {totalAttendanceHours > 0 ? `${totalAttendanceHours} Total Hours` : 'Pending Coordinator Setup'}
                    </span>
                </div>
            </div>

            {/* Coordinator Notice Banner */}
            {totalAttendanceHours === 0 && (
                <div className="p-4 rounded-2xl bg-amber-50/90 border border-amber-200 text-amber-800 text-xs flex items-start gap-3 shadow-xs">
                    <AlertTriangleIcon className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                    <div className="leading-relaxed">
                        <strong className="font-bold">Coordinator Benchmark Pending:</strong> Total attendance hours have not yet been uploaded for this session and programme. You can still input and save attended hours now; attendance percentages will automatically compute once the benchmark is uploaded.
                    </div>
                </div>
            )}

            {/* Empty State */}
            {teams.length === 0 ? (
                <div className="glass-panel rounded-3xl p-12 text-center border border-white/80 shadow-xl max-w-md mx-auto">
                    <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400 mx-auto mb-3">
                        <UsersIcon className="w-7 h-7" />
                    </div>
                    <h3 className="text-base font-extrabold text-slate-800">No Approved Teams Found</h3>
                    <p className="text-xs text-slate-500 mt-1">
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
                                className={`glass-panel rounded-3xl border transition-all duration-300 shadow-xl overflow-hidden ${
                                    isTargeted ? 'ring-2 ring-blue-500/50 border-blue-400' : 'border-white/80'
                                }`}
                            >
                                {/* Team Card Header */}
                                <div className="p-5 sm:p-6 bg-slate-50/70 border-b border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                    <div className="flex items-center gap-3 flex-wrap">
                                        <div className="w-10 h-10 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 shadow-xs">
                                            <UsersIcon className="w-5 h-5" />
                                        </div>
                                        <div>
                                            <h2 className="text-lg font-black text-slate-900 tracking-tight">{team.teamName}</h2>
                                            <div className="flex items-center gap-2 mt-0.5">
                                                <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-200/80 text-slate-700">
                                                    {team.programme}
                                                </span>
                                                {team.panel && (
                                                    <span className="text-xs text-slate-500 font-medium">
                                                        Panel: <strong className="text-slate-700 font-semibold">{team.panel.name}</strong>
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Team Quick Fill Controls */}
                                    {totalAttendanceHours > 0 && (
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Quick Fill:</span>
                                            <button
                                                type="button"
                                                onClick={() => handleSetTeamAllHours(team._id, totalAttendanceHours)}
                                                className="px-3 py-1 text-xs font-bold rounded-xl bg-white/90 border border-slate-200 text-slate-700 hover:border-blue-300 hover:text-blue-600 active:scale-95 transition shadow-xs"
                                            >
                                                All Full ({totalAttendanceHours}h)
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => handleSetTeamAllHours(team._id, Math.round(totalAttendanceHours / 2))}
                                                className="px-3 py-1 text-xs font-bold rounded-xl bg-white/90 border border-slate-200 text-slate-700 hover:border-blue-300 hover:text-blue-600 active:scale-95 transition shadow-xs"
                                            >
                                                All Half ({Math.round(totalAttendanceHours / 2)}h)
                                            </button>
                                        </div>
                                    )}
                                </div>

                                {/* Students Table */}
                                <div className="overflow-x-auto">
                                    <table className="min-w-full divide-y divide-slate-100 text-left text-xs">
                                        <thead className="bg-white/70 text-slate-400 font-bold uppercase tracking-wider">
                                            <tr>
                                                <th className="px-6 py-3.5">Student Member</th>
                                                <th className="px-6 py-3.5">Register Number</th>
                                                <th className="px-6 py-3.5">Attended Hours</th>
                                                <th className="px-6 py-3.5 text-center">Progress %</th>
                                                <th className="px-6 py-3.5">Quick Presets</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100 bg-white/50 font-medium text-slate-700">
                                            {(team.students || []).map(student => {
                                                const currentHours = localAttendance[team._id]?.[student.studentId] ?? student.attendedHours ?? 0;
                                                const livePct = totalAttendanceHours > 0
                                                    ? Number(((Number(currentHours || 0) / totalAttendanceHours) * 100).toFixed(2))
                                                    : (student.attendancePercentage || 0);

                                                return (
                                                    <tr key={student.studentId} className="hover:bg-blue-50/20 transition-colors">
                                                        <td className="px-6 py-4">
                                                            <div className="font-bold text-slate-900 text-sm">{student.name}</div>
                                                            {student.isLeader && (
                                                                <span className="inline-block mt-0.5 text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200/60">
                                                                    Leader
                                                                </span>
                                                            )}
                                                        </td>
                                                        <td className="px-6 py-4 font-mono font-semibold text-slate-600">
                                                            {student.username}
                                                        </td>
                                                        <td className="px-6 py-4">
                                                            <div className="flex items-center gap-2">
                                                                <input
                                                                    type="number"
                                                                    min="0"
                                                                    max={totalAttendanceHours > 0 ? totalAttendanceHours * 2 : 500}
                                                                    step="0.5"
                                                                    value={currentHours}
                                                                    onChange={(e) => handleHourChange(team._id, student.studentId, e.target.value)}
                                                                    className="neo-input w-24 px-3 py-1.5 rounded-xl text-sm font-black text-slate-800"
                                                                />
                                                                {totalAttendanceHours > 0 && (
                                                                    <span className="text-xs text-slate-400 font-semibold">
                                                                        / {totalAttendanceHours} hrs
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </td>
                                                        <td className="px-6 py-4 text-center">
                                                            <div className="inline-flex items-center gap-2.5">
                                                                <div className="w-16 bg-slate-100 rounded-full h-2 overflow-hidden">
                                                                    <div
                                                                        className={`h-full rounded-full transition-all duration-300 ${
                                                                            livePct >= 75 ? 'bg-emerald-500' : livePct >= 50 ? 'bg-amber-500' : 'bg-rose-500'
                                                                        }`}
                                                                        style={{ width: `${Math.min(livePct, 100)}%` }}
                                                                    />
                                                                </div>
                                                                <span className="font-black text-xs text-slate-800">
                                                                    {totalAttendanceHours > 0 ? `${livePct}%` : '—'}
                                                                </span>
                                                            </div>
                                                        </td>
                                                        <td className="px-6 py-4">
                                                            <div className="flex items-center gap-1.5">
                                                                {totalAttendanceHours > 0 && (
                                                                    <>
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => handleSetStudentQuickHours(team._id, student.studentId, totalAttendanceHours)}
                                                                            className="px-2.5 py-1 rounded-lg text-xs font-bold bg-emerald-50 text-emerald-700 hover:bg-emerald-100 active:scale-95 transition border border-emerald-200/60"
                                                                        >
                                                                            {totalAttendanceHours}h
                                                                        </button>
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => handleSetStudentQuickHours(team._id, student.studentId, Math.round(totalAttendanceHours / 2))}
                                                                            className="px-2.5 py-1 rounded-lg text-xs font-bold bg-amber-50 text-amber-700 hover:bg-amber-100 active:scale-95 transition border border-amber-200/60"
                                                                        >
                                                                            {Math.round(totalAttendanceHours / 2)}h
                                                                        </button>
                                                                    </>
                                                                )}
                                                                <button
                                                                    type="button"
                                                                    onClick={() => handleSetStudentQuickHours(team._id, student.studentId, 0)}
                                                                    className="px-2.5 py-1 rounded-lg text-xs font-bold bg-slate-100 text-slate-600 hover:bg-slate-200 active:scale-95 transition border border-slate-200"
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

                                {/* Save Bar */}
                                <div className="p-4 sm:p-5 bg-slate-50/70 border-t border-slate-200/80 flex flex-col sm:flex-row items-center justify-between gap-3">
                                    <span className="text-xs text-slate-400 font-medium">
                                        Last synchronized: {team.lastUpdated ? new Date(team.lastUpdated).toLocaleString() : 'Never'}
                                    </span>
                                    <button
                                        type="button"
                                        onClick={() => handleSaveTeam(team._id)}
                                        disabled={isSaving}
                                        className="w-full sm:w-auto px-6 py-2.5 rounded-xl text-xs font-bold bg-slate-900 hover:bg-slate-800 text-white active:scale-[0.98] transition-all shadow-md hover:shadow-lg disabled:opacity-50 flex items-center justify-center gap-2"
                                    >
                                        {isSaving ? (
                                            <>
                                                <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                                <span>Saving Changes...</span>
                                            </>
                                        ) : (
                                            <>
                                                <CheckCircleIcon className="w-4 h-4 text-emerald-400" />
                                                <span>Save Attendance for {team.teamName}</span>
                                            </>
                                        )}
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
