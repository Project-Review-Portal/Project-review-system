import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast } from '../../utils/toast';
import SpotlightCard from '../ui/SpotlightCard';
import StatusBadge from '../ui/StatusBadge';
import { 
  UsersIcon, 
  UserIcon, 
  LayersIcon, 
  ClockIcon, 
  CheckCircleIcon, 
  ArrowRightIcon 
} from '../ui/Icons';

const SERVER_API_KEY = process.env.REACT_APP_SERVER_API_KEY || "http://localhost:3626";

const GuideMyTeams = () => {
    const navigate = useNavigate();
    const [approvedTeams, setApprovedTeams] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        if (error) {
            toast.error(error);
            setError('');
        }
    }, [error]);

    useEffect(() => {
        fetchApprovedTeams();
    }, []);

    const fetchApprovedTeams = async () => {
        setLoading(true);
        setError('');
        try {
            const token = localStorage.getItem('token');
            if (!token) {
                setError('Authentication token not found.');
                setLoading(false);
                return;
            }
            const headers = { Authorization: `Bearer ${token}` };
            // Use endpoint that returns only approved teams with panel populated
            const res = await axios.get(`${SERVER_API_KEY}/api/guide/approved-teams`, { headers });
            const storedUser = JSON.parse(localStorage.getItem('user') || '{}');
            const selectedProgramme = storedUser.programme;
            let fetchedTeams = res.data || [];
            if (selectedProgramme) {
                fetchedTeams = fetchedTeams.filter(t => t.programme?.toLowerCase() === selectedProgramme?.toLowerCase());
            }
            setApprovedTeams(fetchedTeams);
        } catch (err) {
            console.error('Error fetching approved teams:', err);
            setError(err.response?.data?.message || 'Failed to fetch approved teams.');
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="flex flex-col justify-center items-center py-28 text-slate-500 font-medium space-y-3">
                <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin" />
                <span className="text-sm font-semibold tracking-wide">Loading your approved teams...</span>
            </div>
        );
    }

    return (
        <div className="max-w-6xl mx-auto space-y-6 pb-16">
            {/* Header */}
            <div className="glass-panel rounded-3xl p-6 sm:p-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border border-white/80 shadow-lg">
                <div className="space-y-1">
                    <div className="flex items-center gap-3">
                        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                            My Supervised Teams
                        </h1>
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200/60 shadow-xs">
                            <UsersIcon className="w-3.5 h-3.5 text-blue-600" />
                            <span>{approvedTeams.length} Active Groups</span>
                        </span>
                    </div>
                    <p className="text-xs sm:text-sm text-slate-500">
                        View approved project groups, team rosters, and quickly update session attendance hours.
                    </p>
                </div>
            </div>

            {/* Teams Grid */}
            {approvedTeams.length === 0 ? (
                <div className="glass-panel rounded-3xl p-12 text-center border border-white/80 shadow-xl max-w-md mx-auto">
                    <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400 mx-auto mb-3">
                        <UsersIcon className="w-7 h-7" />
                    </div>
                    <h3 className="text-base font-extrabold text-slate-800">No Approved Teams</h3>
                    <p className="text-xs text-slate-500 mt-1">
                        You do not currently have any approved teams assigned to guide for this session.
                    </p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {approvedTeams.map(team => (
                        <SpotlightCard key={team._id} className="p-6 bg-white/90 flex flex-col justify-between">
                            <div>
                                <div className="flex items-start justify-between gap-2 pb-4 border-b border-slate-100">
                                    <div>
                                        <h3 className="text-lg font-black text-slate-900 tracking-tight">{team.teamName}</h3>
                                        <div className="flex items-center gap-2 mt-1">
                                            <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-100">
                                                {team.programme || 'UG'}
                                            </span>
                                            <StatusBadge type="success" label="Approved" dot={true} />
                                        </div>
                                    </div>
                                    <div className="w-9 h-9 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-500">
                                        <LayersIcon className="w-4 h-4" />
                                    </div>
                                </div>

                                <div className="space-y-4 my-5 text-xs">
                                    {/* Leader */}
                                    <div className="flex items-center gap-2.5">
                                        <div className="w-7 h-7 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600 flex-shrink-0">
                                            <UserIcon className="w-3.5 h-3.5" />
                                        </div>
                                        <div>
                                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Team Leader</span>
                                            <span className="font-bold text-slate-800">
                                                {team.teamLeader?.name || 'N/A'}{' '}
                                                {team.teamLeader?.username && (
                                                    <span className="font-mono text-slate-500 font-semibold">({team.teamLeader.username})</span>
                                                )}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Panels */}
                                    <div className="grid grid-cols-2 gap-3 p-3 rounded-2xl bg-slate-50/70 border border-slate-100">
                                        <div>
                                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Review Panel</span>
                                            <span className="font-bold text-slate-700 mt-0.5 block truncate">
                                                {team.panel?.name || 'Unassigned'}
                                            </span>
                                        </div>
                                        <div>
                                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Viva Panel</span>
                                            <span className="font-bold text-slate-700 mt-0.5 block truncate">
                                                {team.vivaPanel?.name || 'Unassigned'}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Members */}
                                    <div>
                                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
                                            Team Members ({team.members?.length || 0})
                                        </span>
                                        <div className="flex flex-wrap gap-1.5">
                                            {(team.members || []).filter(Boolean).map((member, idx) => (
                                                <span 
                                                    key={member._id || idx}
                                                    className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-semibold bg-white border border-slate-200 text-slate-700 shadow-xs"
                                                >
                                                    {member.name || 'Member'}{' '}
                                                    {member.username && <span className="font-mono text-[10px] text-slate-400 ml-1">({member.username})</span>}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Card Footer Actions */}
                            <div className="pt-4 border-t border-slate-100 flex items-center justify-between gap-3">
                                <span className="text-[11px] text-slate-400 font-medium">Session Guided Group</span>
                                <button
                                    onClick={() => navigate(`/guide-dashboard/attendance?teamId=${team._id}`)}
                                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-slate-900 hover:bg-slate-800 text-white active:scale-95 transition-all shadow-sm hover:shadow-md"
                                >
                                    <ClockIcon className="w-3.5 h-3.5 text-blue-400" />
                                    <span>Log Attendance</span>
                                    <ArrowRightIcon className="w-3 h-3 text-slate-400" />
                                </button>
                            </div>
                        </SpotlightCard>
                    ))}
                </div>
            )}
        </div>
    );
};

export default GuideMyTeams;
