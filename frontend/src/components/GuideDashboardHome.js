import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import SpotlightCard from './ui/SpotlightCard';
import StatusBadge from './ui/StatusBadge';
import { 
  UsersIcon, 
  CalendarIcon, 
  ClockIcon, 
  CheckCircleIcon, 
  ArrowRightIcon, 
  ShieldCheckIcon,
  SparklesIcon,
  LayersIcon
} from './ui/Icons';

const SERVER_API_KEY = process.env.REACT_APP_SERVER_API_KEY || "http://localhost:3626";

const GuideDashboardHome = () => {
    const [teamFormationOpen, setTeamFormationOpen] = useState(true);
    const [guideSelectionStart, setGuideSelectionStart] = useState(null);
    const [guideSelectionEnd, setGuideSelectionEnd] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const navigate = useNavigate();

    useEffect(() => {
        const fetchData = async () => {
            try {
                const token = localStorage.getItem('token');
                const configRes = await fetch(`${SERVER_API_KEY}/api/teams/config/public`);
                const configData = await configRes.json();
                setTeamFormationOpen(configData.teamFormationOpen);
                if (token) {
                    const guideDatesRes = await fetch(`${SERVER_API_KEY}/api/guide/selection-dates`, {
                        headers: { Authorization: `Bearer ${token}` }
                    });
                    if (guideDatesRes.ok) {
                        const guideDates = await guideDatesRes.json();
                        setGuideSelectionStart(guideDates.startDate);
                        setGuideSelectionEnd(guideDates.endDate);
                    }
                }
            } catch (err) {
                setError('Could not load session parameters.');
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    const quickActions = [
        {
            title: 'Manage Requests',
            description: 'Accept or decline student team guide supervision requests.',
            path: '/guide-dashboard/requests',
            icon: UsersIcon,
            tag: 'Action Required'
        },
        {
            title: 'My Supervised Teams',
            description: 'View members, allocated review panels, and project details.',
            path: '/guide-dashboard/my-teams',
            icon: LayersIcon,
            tag: 'Active Groups'
        },
        {
            title: 'Team Attendance',
            description: 'Log and track total project hours against coordinator benchmarks.',
            path: '/guide-dashboard/attendance',
            icon: ClockIcon,
            tag: 'Dynamic Hours'
        },
        {
            title: 'Review Schedules',
            description: 'Check dates, timeslots, and rubrics for upcoming evaluations.',
            path: '/guide-dashboard/review-schedules',
            icon: CalendarIcon,
            tag: 'Timeline'
        }
    ];

    return (
        <div className="max-w-6xl mx-auto space-y-6 pb-16">
            {/* Header Hero */}
            <div className="glass-panel rounded-3xl p-6 sm:p-8 flex flex-col md:flex-row md:items-center justify-between gap-6 border border-white/80 shadow-lg">
                <div className="space-y-1.5">
                    <div className="flex items-center gap-3">
                        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                            Guide Cockpit
                        </h1>
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200/60 shadow-xs">
                            <SparklesIcon className="w-3.5 h-3.5 text-blue-600" />
                            <span>Faculty Guide</span>
                        </span>
                    </div>
                    <p className="text-xs sm:text-sm text-slate-500 max-w-2xl">
                        Oversee your assigned student project teams, verify weekly attendance hours, and prepare for upcoming review viva sessions.
                    </p>
                </div>
            </div>

            {/* Status & Windows Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <SpotlightCard className="p-6 bg-white/80">
                    <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                        <div className="flex items-center gap-2">
                            <ShieldCheckIcon className="w-4 h-4 text-blue-600" />
                            <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">Team Formation Window</span>
                        </div>
                        <StatusBadge 
                            type={teamFormationOpen ? 'success' : 'neutral'} 
                            label={teamFormationOpen ? 'Active' : 'Closed'}
                            dot={teamFormationOpen}
                        />
                    </div>
                    <p className="text-xs text-slate-500 mt-3 leading-relaxed">
                        {teamFormationOpen
                            ? 'Students can currently form groups, invite team members, and send guide supervision requests.'
                            : 'Team formation has been closed by administration. Only approved teams can proceed.'}
                    </p>
                </SpotlightCard>

                <SpotlightCard className="p-6 bg-white/80">
                    <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                        <div className="flex items-center gap-2">
                            <CalendarIcon className="w-4 h-4 text-blue-600" />
                            <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">Guide Selection Window</span>
                        </div>
                        <StatusBadge 
                            type={guideSelectionStart ? 'info' : 'neutral'} 
                            label={guideSelectionStart ? 'Scheduled' : 'Pending Dates'}
                            dot={!!guideSelectionStart}
                        />
                    </div>
                    <div className="mt-3 text-xs text-slate-600 font-medium">
                        {guideSelectionStart ? (
                            <div className="space-y-1">
                                <div>Starts: <strong className="text-slate-800 font-semibold">{new Date(guideSelectionStart).toLocaleString()}</strong></div>
                                {guideSelectionEnd && (
                                    <div>Ends: <strong className="text-slate-800 font-semibold">{new Date(guideSelectionEnd).toLocaleString()}</strong></div>
                                )}
                            </div>
                        ) : (
                            <span className="text-slate-400">Selection timeline has not yet been designated by the coordinator.</span>
                        )}
                    </div>
                </SpotlightCard>
            </div>

            {/* Quick Action Hub */}
            <div>
                <h2 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4 px-1">
                    Quick Workflows
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {quickActions.map(action => {
                        const Icon = action.icon;
                        return (
                            <SpotlightCard 
                                key={action.title}
                                onClick={() => navigate(action.path)}
                                className="p-5 bg-white/80 cursor-pointer flex flex-col justify-between hover:border-blue-400 transition group"
                            >
                                <div>
                                    <div className="flex items-center justify-between mb-3">
                                        <div className="w-9 h-9 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-colors shadow-xs">
                                            <Icon className="w-4 h-4" />
                                        </div>
                                        <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
                                            {action.tag}
                                        </span>
                                    </div>
                                    <h3 className="text-sm font-extrabold text-slate-900 group-hover:text-blue-600 transition-colors">
                                        {action.title}
                                    </h3>
                                    <p className="text-xs text-slate-500 mt-1 line-clamp-2">
                                        {action.description}
                                    </p>
                                </div>

                                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-blue-600">
                                    <span>Access</span>
                                    <ArrowRightIcon className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                                </div>
                            </SpotlightCard>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};

export default GuideDashboardHome;
