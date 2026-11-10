import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from '../../utils/toast';

const SERVER_API_KEY = process.env.REACT_APP_SERVER_API_KEY || 'http://localhost:3626';

const CoordinatorProjectAttendance = () => {
    const [totalHoursInput, setTotalHoursInput] = useState('');
    const [configuredHours, setConfiguredHours] = useState(0);
    const [programme, setProgramme] = useState('');
    const [sessionName, setSessionName] = useState('');
    const [teamsSummary, setTeamsSummary] = useState([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('all'); // 'all' | 'eligible' | 'shortage'

    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const token = localStorage.getItem('token');
    const headers = { Authorization: `Bearer ${token}` };

    const quickHourPresets = [30, 35, 40, 45, 50];

    useEffect(() => {
        const storedSession = localStorage.getItem('selectedSessionName') || 'Current Session';
        setSessionName(storedSession);
        fetchAttendanceData();
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    const fetchAttendanceData = async () => {
        try {
            setLoading(true);
            const [hoursRes, summaryRes] = await Promise.all([
                axios.get(`${SERVER_API_KEY}/api/panels/coordinator/attendance-hours`, { headers }),
                axios.get(`${SERVER_API_KEY}/api/panels/coordinator/project-attendance-summary`, { headers })
            ]);

            const currentTotal = hoursRes.data.totalAttendanceHours || 0;
            setConfiguredHours(currentTotal);
            setTotalHoursInput(currentTotal > 0 ? currentTotal : '');
            setProgramme(hoursRes.data.programme || user.programme || 'B.E. CSE');

            setTeamsSummary(summaryRes.data.teams || []);
        } catch (err) {
            console.error('Error fetching coordinator attendance data:', err);
            toast.error(err.response?.data?.message || 'Failed to load attendance configuration');
        } finally {
            setLoading(false);
        }
    };

    const handleSaveTotalHours = async (e) => {
        if (e) e.preventDefault();
        const parsed = Number(totalHoursInput);
        if (isNaN(parsed) || parsed < 0) {
            toast.error('Please enter a valid positive number of hours (e.g. 40, 45, 30, 35).');
            return;
        }

        try {
            setSaving(true);
            const res = await axios.post(`${SERVER_API_KEY}/api/panels/coordinator/attendance-hours`, {
                totalAttendanceHours: parsed,
                programme
            }, { headers });

            toast.success(res.data.message || `Total attendance hours set to ${parsed} hours.`);
            setConfiguredHours(parsed);
            // Refresh summary to reflect recalculated percentages
            const summaryRes = await axios.get(`${SERVER_API_KEY}/api/panels/coordinator/project-attendance-summary`, { headers });
            setTeamsSummary(summaryRes.data.teams || []);
        } catch (err) {
            console.error('Error saving total attendance hours:', err);
            toast.error(err.response?.data?.message || 'Failed to save total attendance hours.');
        } finally {
            setSaving(false);
        }
    };

    // Flatten student records for table viewing & filtering
    const allStudentsList = [];
    teamsSummary.forEach(team => {
        (team.students || []).forEach(student => {
            allStudentsList.push({
                ...student,
                teamName: team.teamName,
                teamId: team.teamId,
                guideName: team.guide?.name || 'Unassigned',
                panelName: team.panel?.name || 'Unassigned'
            });
        });
    });

    const filteredStudents = allStudentsList.filter(student => {
        const matchesSearch =
            student.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            student.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
            student.teamName.toLowerCase().includes(searchTerm.toLowerCase()) ||
            student.guideName.toLowerCase().includes(searchTerm.toLowerCase());

        if (!matchesSearch) return false;

        const isEligible = (student.attendancePercentage || 0) >= 75;
        if (statusFilter === 'eligible') return isEligible;
        if (statusFilter === 'shortage') return !isEligible;
        return true;
    });

    // Statistical summary
    const totalStudentsCount = allStudentsList.length;
    const eligibleCount = allStudentsList.filter(s => (s.attendancePercentage || 0) >= 75).length;
    const shortageCount = totalStudentsCount - eligibleCount;
    const avgAttendance = totalStudentsCount > 0
        ? (allStudentsList.reduce((acc, s) => acc + (s.attendancePercentage || 0), 0) / totalStudentsCount).toFixed(1)
        : 0;

    if (loading) {
        return (
            <div className="flex justify-center items-center py-20 text-indigo-600 font-medium">
                <svg className="animate-spin -ml-1 mr-3 h-6 w-6 text-indigo-600" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
                </svg>
                Loading project attendance configuration...
            </div>
        );
    }

    return (
        <div className="max-w-7xl mx-auto space-y-6 pb-12">
            {/* Header */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <div className="flex items-center gap-3">
                        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Project Attendance Management</h1>
                        <span className="px-3 py-1 rounded-full text-xs font-bold bg-indigo-100 text-indigo-700 uppercase tracking-wide">
                            {programme || 'B.E. CSE'}
                        </span>
                    </div>
                    <p className="text-sm text-slate-500 mt-1">
                        Configure mandatory project attendance hours for this session and monitor student progress across all teams.
                    </p>
                </div>
                <div className="text-right">
                    <span className="text-xs font-semibold text-slate-400 block uppercase">Academic Session</span>
                    <span className="text-sm font-bold text-slate-700">{sessionName}</span>
                </div>
            </div>

            {/* Total Attendance Hours Config Card */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
                <div className="flex items-start justify-between">
                    <div>
                        <h2 className="text-lg font-bold text-slate-900">Total Project Attendance Hours</h2>
                        <p className="text-xs text-slate-500 mt-0.5">
                            Set the total attendance hours required for this project (e.g., 30h, 35h, 40h, 45h). Guides will update each student's attendance hours against this benchmark.
                        </p>
                    </div>
                    <div className="px-4 py-2 bg-indigo-50 border border-indigo-200 rounded-xl text-center">
                        <span className="text-xs text-indigo-600 font-semibold uppercase tracking-wider block">Current Benchmark</span>
                        <span className="text-xl font-extrabold text-indigo-700">
                            {configuredHours > 0 ? `${configuredHours} Hours` : 'Not Set'}
                        </span>
                    </div>
                </div>

                <form onSubmit={handleSaveTotalHours} className="mt-6 flex flex-col md:flex-row items-stretch md:items-center gap-4">
                    {/* Quick Presets */}
                    <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-semibold text-slate-500">Presets:</span>
                        {quickHourPresets.map(h => (
                            <button
                                key={h}
                                type="button"
                                onClick={() => setTotalHoursInput(h)}
                                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border ${
                                    Number(totalHoursInput) === h
                                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                                }`}
                            >
                                {h} Hours
                            </button>
                        ))}
                    </div>

                    {/* Custom Input & Submit */}
                    <div className="flex items-center gap-3 flex-1 md:justify-end">
                        <div className="relative w-44">
                            <input
                                type="number"
                                min="0"
                                max="500"
                                placeholder="e.g. 45"
                                value={totalHoursInput}
                                onChange={(e) => setTotalHoursInput(e.target.value)}
                                className="w-full pl-3 pr-12 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none text-sm font-semibold text-slate-800"
                            />
                            <span className="absolute right-3 top-2.5 text-xs text-slate-400 font-medium">hrs</span>
                        </div>
                        <button
                            type="submit"
                            disabled={saving || !totalHoursInput}
                            className="px-5 py-2 rounded-xl text-sm font-bold bg-indigo-600 hover:bg-indigo-700 text-white transition-all shadow-sm hover:shadow disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                        >
                            {saving ? 'Saving...' : 'Upload Total Hours'}
                        </button>
                    </div>
                </form>
            </div>

            {/* Metrics Ribbon */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                    <span className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Total Teams</span>
                    <p className="text-2xl font-bold text-slate-900 mt-1">{teamsSummary.length}</p>
                </div>
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                    <span className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Total Students</span>
                    <p className="text-2xl font-bold text-slate-900 mt-1">{totalStudentsCount}</p>
                </div>
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                    <span className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Avg Attendance</span>
                    <p className="text-2xl font-bold text-indigo-600 mt-1">{avgAttendance}%</p>
                </div>
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                    <span className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Eligible (&ge;75%)</span>
                    <p className="text-2xl font-bold text-emerald-600 mt-1">
                        {eligibleCount} <span className="text-xs font-normal text-slate-400">({shortageCount} shortage)</span>
                    </p>
                </div>
            </div>

            {/* Attendance Records Table */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3">
                    <div className="relative w-full sm:w-80">
                        <input
                            type="text"
                            placeholder="Search by student, reg no, team, guide..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-9 pr-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                        />
                        <svg className="w-4 h-4 text-slate-400 absolute left-2.5 top-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                    </div>

                    <div className="flex items-center gap-2">
                        <span className="text-xs text-slate-500 font-medium">Filter:</span>
                        <select
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                            className="text-xs border border-slate-300 rounded-lg px-2.5 py-1.5 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        >
                            <option value="all">All Records ({allStudentsList.length})</option>
                            <option value="eligible">Eligible &ge; 75% ({eligibleCount})</option>
                            <option value="shortage">Shortage &lt; 75% ({shortageCount})</option>
                        </select>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-slate-200 text-left text-xs">
                        <thead className="bg-slate-50 text-slate-600 uppercase font-semibold">
                            <tr>
                                <th className="px-4 py-3">Student Name</th>
                                <th className="px-4 py-3">Register No</th>
                                <th className="px-4 py-3">Team</th>
                                <th className="px-4 py-3">Assigned Guide</th>
                                <th className="px-4 py-3 text-center">Attended / Total</th>
                                <th className="px-4 py-3 text-center">Attendance %</th>
                                <th className="px-4 py-3 text-center">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 bg-white font-medium text-slate-700">
                            {filteredStudents.length === 0 ? (
                                <tr>
                                    <td colSpan="7" className="text-center py-8 text-slate-400 font-medium">
                                        No student attendance records match the selected criteria.
                                    </td>
                                </tr>
                            ) : (
                                filteredStudents.map((st, idx) => {
                                    const pct = st.attendancePercentage || 0;
                                    const isEligible = pct >= 75;
                                    return (
                                        <tr key={`${st.studentId}-${idx}`} className="hover:bg-slate-50 transition">
                                            <td className="px-4 py-3">
                                                <div className="font-bold text-slate-900">{st.name}</div>
                                                {st.isLeader && (
                                                    <span className="text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-600">
                                                        Leader
                                                    </span>
                                                )}
                                            </td>
                                            <td className="px-4 py-3 font-mono text-slate-600">{st.username}</td>
                                            <td className="px-4 py-3 text-slate-800 font-semibold">{st.teamName}</td>
                                            <td className="px-4 py-3 text-slate-600">{st.guideName}</td>
                                            <td className="px-4 py-3 text-center">
                                                <span className="font-bold text-slate-900">{st.attendedHours}</span>
                                                <span className="text-slate-400 font-normal"> / {configuredHours} hrs</span>
                                            </td>
                                            <td className="px-4 py-3 text-center">
                                                <div className="flex items-center justify-center gap-2">
                                                    <div className="w-16 bg-slate-100 rounded-full h-2 overflow-hidden">
                                                        <div
                                                            className={`h-full rounded-full ${
                                                                pct >= 75 ? 'bg-emerald-500' : pct >= 50 ? 'bg-amber-500' : 'bg-rose-500'
                                                            }`}
                                                            style={{ width: `${Math.min(pct, 100)}%` }}
                                                        ></div>
                                                    </div>
                                                    <span className="font-bold text-xs">{pct}%</span>
                                                </div>
                                            </td>
                                            <td className="px-4 py-3 text-center">
                                                <span
                                                    className={`inline-flex px-2 py-0.5 rounded-full text-[11px] font-bold ${
                                                        isEligible
                                                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                                            : 'bg-rose-50 text-rose-700 border border-rose-200'
                                                    }`}
                                                >
                                                    {isEligible ? 'Eligible' : 'Shortage'}
                                                </span>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default CoordinatorProjectAttendance;
