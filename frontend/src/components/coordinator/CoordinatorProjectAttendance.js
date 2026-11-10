import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from '../../utils/toast';
import SpotlightCard from '../ui/SpotlightCard';
import AnimatedNumber from '../ui/AnimatedNumber';
import StatusBadge from '../ui/StatusBadge';
import { 
  ClockIcon, 
  UsersIcon, 
  SearchIcon, 
  FilterIcon, 
  CheckCircleIcon, 
  AlertTriangleIcon,
  ShieldCheckIcon,
  SparklesIcon
} from '../ui/Icons';

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
        ? Number((allStudentsList.reduce((acc, s) => acc + (s.attendancePercentage || 0), 0) / totalStudentsCount).toFixed(1))
        : 0;

    if (loading) {
        return (
            <div className="flex flex-col justify-center items-center py-28 text-slate-500 font-medium space-y-3">
                <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin" />
                <span className="text-sm font-semibold tracking-wide">Loading project attendance benchmarks & teams...</span>
            </div>
        );
    }

    return (
        <div className="max-w-7xl mx-auto space-y-6 pb-16">
            {/* Header Section */}
            <div className="glass-panel rounded-3xl p-6 sm:p-8 flex flex-col md:flex-row md:items-center justify-between gap-6 border border-white/80 shadow-lg">
                <div className="space-y-1.5">
                    <div className="flex items-center gap-3 flex-wrap">
                        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                            Project Attendance Management
                        </h1>
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200/60 shadow-xs">
                            <ShieldCheckIcon className="w-3.5 h-3.5 text-blue-600" />
                            <span>{programme || 'B.E. CSE'}</span>
                        </span>
                    </div>
                    <p className="text-xs sm:text-sm text-slate-500 max-w-2xl">
                        Upload the total project attendance hours for this session. Guides will update their respective teams against this benchmark with real-time percentage tracking.
                    </p>
                </div>

                <div className="bg-white/80 border border-slate-200/80 rounded-2xl p-4 sm:text-right shadow-xs min-w-[200px]">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Academic Session</span>
                    <span className="text-sm font-extrabold text-slate-800 block mt-0.5">{sessionName}</span>
                </div>
            </div>

            {/* Total Attendance Hours Config Card (SpotlightCard) */}
            <SpotlightCard className="p-6 sm:p-8 bg-white/90">
                <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                    <div>
                        <div className="flex items-center gap-2">
                            <ClockIcon className="w-5 h-5 text-blue-600" />
                            <h2 className="text-lg font-extrabold text-slate-900 tracking-tight">
                                Mandatory Project Attendance Hours
                            </h2>
                        </div>
                        <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-xl">
                            Set the benchmark hours (e.g. 30, 35, 40, or 45 hours) for this programme. Any change immediately recalculates attendance percentages across all teams.
                        </p>
                    </div>

                    <div className="px-5 py-3 rounded-2xl bg-blue-50/80 border border-blue-200/70 text-center sm:text-right shadow-xs">
                        <span className="text-[10px] font-bold text-blue-600 uppercase tracking-wider block">Current Benchmark</span>
                        <span className="text-2xl font-black text-blue-900 mt-0.5 block">
                            {configuredHours > 0 ? `${configuredHours} hrs` : 'Not Configured'}
                        </span>
                    </div>
                </div>

                <form onSubmit={handleSaveTotalHours} className="mt-6 pt-6 border-t border-slate-100 flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-5">
                    {/* Quick Presets */}
                    <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-bold text-slate-500 uppercase tracking-wider mr-1">Presets:</span>
                        {quickHourPresets.map(h => {
                            const isSelected = Number(totalHoursInput) === h;
                            return (
                                <button
                                    key={h}
                                    type="button"
                                    onClick={() => setTotalHoursInput(h)}
                                    className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all duration-200 border active:scale-95 ${
                                        isSelected
                                            ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                                            : 'bg-slate-50/80 text-slate-700 border-slate-200 hover:bg-slate-100 hover:border-slate-300'
                                    }`}
                                >
                                    {h} Hours
                                </button>
                            );
                        })}
                    </div>

                    {/* Custom Input & Action Button */}
                    <div className="flex items-center gap-3">
                        <div className="relative w-44">
                            <input
                                type="number"
                                min="0"
                                max="500"
                                placeholder="e.g. 40"
                                value={totalHoursInput}
                                onChange={(e) => setTotalHoursInput(e.target.value)}
                                className="neo-input w-full pl-3.5 pr-12 py-2 rounded-xl text-sm font-bold text-slate-800 placeholder-slate-400"
                            />
                            <span className="absolute right-3.5 top-2.5 text-xs text-slate-400 font-bold uppercase">hrs</span>
                        </div>
                        <button
                            type="submit"
                            disabled={saving || !totalHoursInput}
                            className="px-5 py-2 rounded-xl text-xs font-bold bg-slate-900 hover:bg-slate-800 text-white active:scale-[0.98] transition-all shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap flex items-center gap-2"
                        >
                            {saving ? (
                                <>
                                    <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    <span>Saving Benchmark...</span>
                                </>
                            ) : (
                                <>
                                    <SparklesIcon className="w-3.5 h-3.5 text-blue-400" />
                                    <span>Upload Total Hours</span>
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </SpotlightCard>

            {/* Metrics Ribbon */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <SpotlightCard className="p-5 bg-white/80">
                    <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total Teams</span>
                        <UsersIcon className="w-4 h-4 text-slate-400" />
                    </div>
                    <div className="text-3xl font-black text-slate-900 mt-2">
                        <AnimatedNumber value={teamsSummary.length} />
                    </div>
                    <span className="text-[11px] text-slate-500 font-medium mt-1 block">Active guided groups</span>
                </SpotlightCard>

                <SpotlightCard className="p-5 bg-white/80">
                    <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total Students</span>
                        <UsersIcon className="w-4 h-4 text-slate-400" />
                    </div>
                    <div className="text-3xl font-black text-slate-900 mt-2">
                        <AnimatedNumber value={totalStudentsCount} />
                    </div>
                    <span className="text-[11px] text-slate-500 font-medium mt-1 block">Enrolled candidates</span>
                </SpotlightCard>

                <SpotlightCard className="p-5 bg-white/80">
                    <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold text-blue-500 uppercase tracking-wider">Average Attendance</span>
                        <ClockIcon className="w-4 h-4 text-blue-500" />
                    </div>
                    <div className="text-3xl font-black text-blue-600 mt-2 flex items-baseline">
                        <AnimatedNumber value={avgAttendance} decimals={1} />
                        <span className="text-lg font-bold ml-0.5">%</span>
                    </div>
                    <span className="text-[11px] text-blue-600/80 font-medium mt-1 block">Across all teams</span>
                </SpotlightCard>

                <SpotlightCard className="p-5 bg-white/80">
                    <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold text-emerald-600 uppercase tracking-wider">Eligible (&ge;75%)</span>
                        <CheckCircleIcon className="w-4 h-4 text-emerald-600" />
                    </div>
                    <div className="text-3xl font-black text-emerald-600 mt-2 flex items-baseline gap-2">
                        <AnimatedNumber value={eligibleCount} />
                        <span className="text-xs font-semibold text-rose-500">
                            ({shortageCount} shortage)
                        </span>
                    </div>
                    <span className="text-[11px] text-slate-500 font-medium mt-1 block">Exam clearance status</span>
                </SpotlightCard>
            </div>

            {/* Attendance Records Table */}
            <div className="glass-panel rounded-3xl border border-white/80 shadow-xl overflow-hidden">
                {/* Search & Filter Header */}
                <div className="p-5 border-b border-slate-200/80 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 bg-white/60">
                    <div className="relative flex-1 max-w-md">
                        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                            <SearchIcon className="w-4 h-4" />
                        </div>
                        <input
                            type="text"
                            placeholder="Search by student, register no, team, or guide..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="neo-input w-full pl-10 pr-4 py-2 rounded-xl text-xs font-medium text-slate-800 placeholder-slate-400"
                        />
                    </div>

                    <div className="flex items-center gap-2.5">
                        <FilterIcon className="w-4 h-4 text-slate-400" />
                        <span className="text-xs text-slate-500 font-bold uppercase tracking-wider">Filter:</span>
                        <select
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                            className="neo-input text-xs font-semibold rounded-xl px-3 py-2 bg-white text-slate-800 focus:outline-none cursor-pointer"
                        >
                            <option value="all">All Students ({allStudentsList.length})</option>
                            <option value="eligible">Eligible (&ge; 75%) ({eligibleCount})</option>
                            <option value="shortage">Shortage (&lt; 75%) ({shortageCount})</option>
                        </select>
                    </div>
                </div>

                {/* Table */}
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-slate-100 text-left text-xs">
                        <thead className="bg-slate-50/80 text-slate-500 font-bold uppercase tracking-wider">
                            <tr>
                                <th className="px-5 py-3.5">Student Details</th>
                                <th className="px-5 py-3.5">Register Number</th>
                                <th className="px-5 py-3.5">Team & Guide</th>
                                <th className="px-5 py-3.5 text-center">Attended / Benchmark</th>
                                <th className="px-5 py-3.5 text-center">Percentage</th>
                                <th className="px-5 py-3.5 text-center">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 bg-white/60 font-medium text-slate-700">
                            {filteredStudents.length === 0 ? (
                                <tr>
                                    <td colSpan="6" className="text-center py-12 text-slate-400 font-medium">
                                        <AlertTriangleIcon className="w-6 h-6 text-slate-300 mx-auto mb-2" />
                                        No student attendance records match the selected filter.
                                    </td>
                                </tr>
                            ) : (
                                filteredStudents.map((st, idx) => {
                                    const pct = st.attendancePercentage || 0;
                                    const isEligible = pct >= 75;
                                    return (
                                        <tr key={`${st.studentId}-${idx}`} className="hover:bg-blue-50/30 transition-colors">
                                            <td className="px-5 py-3.5">
                                                <div className="font-bold text-slate-900 text-sm">{st.name}</div>
                                                {st.isLeader && (
                                                    <span className="inline-block mt-0.5 text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200/60">
                                                        Leader
                                                    </span>
                                                )}
                                            </td>
                                            <td className="px-5 py-3.5 font-mono text-slate-600 font-semibold">{st.username}</td>
                                            <td className="px-5 py-3.5">
                                                <div className="font-bold text-slate-900">{st.teamName}</div>
                                                <div className="text-[11px] text-slate-500 font-medium">Guide: {st.guideName}</div>
                                            </td>
                                            <td className="px-5 py-3.5 text-center">
                                                <span className="font-black text-slate-900 text-sm">{st.attendedHours}</span>
                                                <span className="text-slate-400 font-medium"> / {configuredHours} hrs</span>
                                            </td>
                                            <td className="px-5 py-3.5 text-center">
                                                <div className="flex items-center justify-center gap-2.5">
                                                    <div className="w-20 bg-slate-100 rounded-full h-2 overflow-hidden">
                                                        <div
                                                            className={`h-full rounded-full transition-all duration-500 ${
                                                                pct >= 75 ? 'bg-emerald-500' : pct >= 50 ? 'bg-amber-500' : 'bg-rose-500'
                                                            }`}
                                                            style={{ width: `${Math.min(pct, 100)}%` }}
                                                        />
                                                    </div>
                                                    <span className="font-black text-xs text-slate-800">{pct}%</span>
                                                </div>
                                            </td>
                                            <td className="px-5 py-3.5 text-center">
                                                <StatusBadge 
                                                    type={isEligible ? 'success' : 'danger'}
                                                    label={isEligible ? 'Eligible' : 'Shortage'}
                                                    dot={true}
                                                />
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
