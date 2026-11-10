import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { 
  CalendarIcon, 
  LockIcon, 
  UserIcon, 
  LogoutIcon, 
  RefreshIcon, 
  LayersIcon 
} from './ui/Icons';

const Navbar = ({ user, onLogout, activeProgramme }) => {
    const location = useLocation();
    const navigate = useNavigate();
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    const handleLogout = () => {
        onLogout();
        navigate('/');
    };

    const getNavItems = () => {
        switch (user?.role) {
            case 'student':
                return [
                    { label: 'Dashboard', path: '/student-dashboard' },
                    { label: 'Team Formation', path: '/student-dashboard/team' },
                    { label: 'My Team', path: '/student-dashboard/my-team' },
                    { label: 'Guide Requests', path: '/student-dashboard/guide-requests' },
                    { label: 'My Panel', path: '/student-dashboard/my-panel' },
                    { label: 'Review Schedules', path: '/student-dashboard/review-schedules' },
                    { label: 'Uploads', path: '/student-dashboard/final-report' },
                    { label: 'Announcements', path: '/student-dashboard/coordinator-instructions' },
                    { label: 'Guide Me', path: '/student-dashboard/guide-me' }
                ];
            case 'guide':
                return [
                    { label: 'Dashboard', path: '/guide-dashboard' },
                    { label: 'Requests', path: '/guide-dashboard/requests' },
                    { label: 'My Teams', path: '/guide-dashboard/my-teams' },
                    { label: 'Attendance', path: '/guide-dashboard/attendance' },
                    { label: 'Review Schedules', path: '/guide-dashboard/review-schedules' },
                    { label: 'Announcements', path: '/guide-dashboard/announcements' },
                    { label: 'Mark Teams', path: '/guide-dashboard/mark-teams' },
                    { label: 'Uploads', path: '/guide-dashboard/final-reports' },
                    { label: 'Guide Me', path: '/guide-dashboard/guide-me' }
                ];
            case 'panel':
                const panelNavItems = [
                    { label: 'Dashboard', path: '/panel-dashboard' },
                    { label: 'Assigned Teams', path: '/panel-dashboard/assigned-teams' },
                    { label: 'Review Attendance', path: '/panel-dashboard/upload-attendance' }
                ];
                if (user.memberType === 'external' || user.memberType === 'internal') {
                    panelNavItems.push({ label: 'Schedules', path: '/panel-dashboard/review-schedules' });
                }
                panelNavItems.push({ label: 'Mark Teams', path: '/panel-dashboard/mark-teams' });
                panelNavItems.push({ label: 'Guide Me', path: '/panel-dashboard/guide-me' });
                return panelNavItems;
            case 'admin':
                if (!activeProgramme) return [];
                const prefix = `/admin-dashboard/programme/${encodeURIComponent(activeProgramme)}`;
                return [
                    { label: 'Student Registration', path: `${prefix}/user-management` },
                    { label: 'Settings', path: `${prefix}/admin-settings` },
                    { label: 'Review Panels', path: `${prefix}/review-panels` },
                    { label: 'Team Panel Allocations', path: `${prefix}/allocations` },
                    { label: 'Review Attendance', path: `${prefix}/upload-attendance` },
                    { label: 'Student Attendance', path: `${prefix}/view-attendance` },
                    { label: 'Schedules', path: `${prefix}/manage-review-schedules` },
                    { label: 'Guide Me', path: `${prefix}/guide-me` }
                ];
            case 'assistant coordinator':
            case 'coordinator':
                return [
                    { label: 'Dashboard', path: '/coordinator-dashboard/dashboard' },
                    { label: 'Registration', path: '/coordinator-dashboard/registration' },
                    { label: 'Viva Panel Formation', path: '/coordinator-dashboard/viva-panel-formation' },
                    { label: 'Assigned Teams', path: '/coordinator-dashboard/assigned-teams' },
                    { label: 'Project Attendance', path: '/coordinator-dashboard/project-attendance' },
                    { label: 'Review Attendance', path: '/coordinator-dashboard/upload-attendance' },
                    { label: 'Review Schedule', path: '/coordinator-dashboard/review-schedule' },
                    { label: 'Marking Scheme', path: '/coordinator-dashboard/marking-scheme' },
                    { label: 'Student Uploads', path: '/coordinator-dashboard/materials' },
                    { label: 'Letter Generation', path: '/coordinator-dashboard/letter-generation' },
                    { label: 'Broadcasts', path: '/coordinator-dashboard/instruction-template' },
                    { label: 'Guide Me', path: '/coordinator-dashboard/guide-me' }
                ];
            default:
                return [];
        }
    };

    let userRoleText = '';
    let displayPanelsSelect = false;
    let coordinatorPanels = [];
    let activePanelId = '';

    if (user) {
        if (user.role === 'admin') {
            userRoleText = `Admin${activeProgramme ? ` (${activeProgramme})` : ''}`;
        } else if (['guide', 'panel', 'coordinator', 'assistant coordinator'].includes(user.role)) {
            const displayProg = user.programme || 'B.E. CSE';
            const roleLabel = user.role === 'panel' 
                ? 'Panel Member' 
                : user.role === 'assistant coordinator'
                    ? 'Assistant Coordinator'
                    : user.role.charAt(0).toUpperCase() + user.role.slice(1);
            userRoleText = `${roleLabel} · ${displayProg}`;

            if (['coordinator', 'assistant coordinator'].includes(user.role)) {
                try {
                    coordinatorPanels = JSON.parse(localStorage.getItem('coordinatorPanels') || '[]');
                    activePanelId = localStorage.getItem('selectedPanelId') || '';
                    if (coordinatorPanels.length > 1) {
                        displayPanelsSelect = true;
                    }
                } catch (e) {
                    console.warn(e);
                }
            }
        } else if (user.role === 'student') {
            userRoleText = `${user.username} · ${user.name}`;
        }
    }

    const sessionName = localStorage.getItem('selectedSessionName');
    const isReadOnly = localStorage.getItem('isSessionReadOnly') === 'true';

    return (
        <header className="sticky top-0 z-50 w-full glass-nav transition-all">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex items-center justify-between h-16 gap-4">
                    {/* Left: Brand & Context Pills */}
                    <div className="flex items-center min-w-0 gap-3 flex-1">
                        <div 
                            onClick={() => {
                                if (user?.role === 'admin') navigate('/admin-dashboard');
                                else if (user?.role === 'student') navigate('/student-dashboard');
                                else if (user?.role === 'coordinator') navigate('/coordinator-dashboard');
                                else if (user?.role === 'guide') navigate('/guide-dashboard');
                            }}
                            className="flex items-center gap-2.5 cursor-pointer group flex-shrink-0"
                        >
                            <div className="w-9 h-9 rounded-xl bg-slate-900 text-white flex items-center justify-center shadow-sm group-hover:bg-blue-600 transition-colors">
                                <LayersIcon className="w-4 h-4 text-white" />
                            </div>
                            <div className="hidden sm:block">
                                <span className="text-sm font-bold tracking-tight text-slate-900 block leading-tight">
                                    Project Review
                                </span>
                                <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest block">
                                    Portal
                                </span>
                            </div>
                        </div>

                        {/* User Role & Session Badges */}
                        {userRoleText && (
                            <div className="flex items-center gap-1.5 flex-wrap">
                                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-slate-100/90 text-slate-700 border border-slate-200/80 shadow-sm">
                                    <UserIcon className="w-3.5 h-3.5 text-slate-400" />
                                    <span>{userRoleText}</span>
                                </div>

                                {sessionName && (
                                    <div className="hidden md:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-blue-50/80 text-blue-700 border border-blue-200/60 shadow-sm">
                                        <CalendarIcon className="w-3.5 h-3.5 text-blue-500" />
                                        <span>{sessionName}</span>
                                    </div>
                                )}

                                {isReadOnly && (
                                    <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200 shadow-sm">
                                        <LockIcon className="w-3 h-3 text-amber-600" />
                                        <span>Read-Only</span>
                                    </div>
                                )}

                                {displayPanelsSelect && (
                                    <select
                                        value={activePanelId}
                                        onChange={(e) => {
                                            const panelId = e.target.value;
                                            const selectedPanel = coordinatorPanels.find(p => p._id === panelId);
                                            if (selectedPanel) {
                                                localStorage.setItem('selectedPanelId', selectedPanel._id);
                                                localStorage.setItem('selectedPanelName', selectedPanel.name);
                                                window.location.reload();
                                            }
                                        }}
                                        className="text-xs px-2.5 py-1 border border-slate-200 rounded-lg bg-white/90 text-slate-700 font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500/20 max-w-[150px] truncate shadow-sm"
                                    >
                                        {coordinatorPanels.map(p => (
                                            <option key={p._id} value={p._id}>{p.name}</option>
                                        ))}
                                    </select>
                                )}
                            </div>
                        )}

                        {/* Desktop Navigation Links */}
                        <nav className="hidden lg:flex items-center space-x-1 overflow-x-auto scrollbar-hide ml-2">
                            {getNavItems().map((item) => {
                                const isActive = location.pathname === item.path || location.pathname.startsWith(item.path + '/');
                                return (
                                    <button
                                        key={item.path}
                                        onClick={() => navigate(item.path)}
                                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all duration-150 ${
                                            isActive
                                                ? 'bg-slate-900 text-white shadow-sm'
                                                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/80 active:scale-[0.98]'
                                        }`}
                                    >
                                        {item.label}
                                    </button>
                                );
                            })}
                        </nav>
                    </div>

                    {/* Right: Actions (Role Switch, Logout) */}
                    <div className="flex items-center gap-2 flex-shrink-0">
                        {['guide', 'panel', 'coordinator', 'assistant coordinator'].includes(user?.role) && (
                            <button
                                onClick={() => navigate('/role-selection')}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200/90 shadow-sm active:scale-[0.98] transition-all"
                            >
                                <RefreshIcon className="w-3.5 h-3.5 text-slate-500" />
                                <span className="hidden sm:inline">Switch Role</span>
                            </button>
                        )}

                        {user?.role === 'admin' && (
                            <button
                                onClick={() => navigate('/admin-dashboard')}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200/90 shadow-sm active:scale-[0.98] transition-all"
                            >
                                <CalendarIcon className="w-3.5 h-3.5 text-slate-500" />
                                <span className="hidden sm:inline">Sessions</span>
                            </button>
                        )}

                        <button
                            onClick={handleLogout}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-rose-600 bg-rose-50/80 hover:bg-rose-100/80 border border-rose-200/60 shadow-sm active:scale-[0.98] transition-all"
                        >
                            <LogoutIcon className="w-3.5 h-3.5 text-rose-500" />
                            <span>Logout</span>
                        </button>

                        {/* Mobile Hamburger */}
                        <div className="lg:hidden">
                            <button
                                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                                className="p-2 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors"
                                aria-label="Toggle Navigation"
                            >
                                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={isMobileMenuOpen ? "M6 18L18 6M6 6l12 12" : "M4 6h16M4 12h16M4 18h16"} />
                                </svg>
                            </button>
                        </div>
                    </div>
                </div>

                {/* Mobile Drawer */}
                {isMobileMenuOpen && (
                    <div className="lg:hidden border-t border-slate-200/80 py-3 space-y-1 animate-slide-in">
                        {getNavItems().map((item) => {
                            const isActive = location.pathname === item.path;
                            return (
                                <button
                                    key={item.path}
                                    onClick={() => {
                                        navigate(item.path);
                                        setIsMobileMenuOpen(false);
                                    }}
                                    className={`w-full text-left px-3 py-2 rounded-lg text-xs font-semibold transition-all ${
                                        isActive
                                            ? 'bg-slate-900 text-white shadow-sm'
                                            : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                                    }`}
                                >
                                    {item.label}
                                </button>
                            );
                        })}
                    </div>
                )}
            </div>
        </header>
    );
};

export default Navbar;
