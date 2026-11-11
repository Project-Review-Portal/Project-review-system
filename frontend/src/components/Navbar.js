import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { 
  CalendarIcon, 
  LockIcon, 
  UserIcon, 
  UsersIcon,
  LogoutIcon, 
  RefreshIcon, 
  LayersIcon,
  ClockIcon,
  CheckCircleIcon,
  SparklesIcon,
  MailIcon,
  KeyIcon,
  ShieldCheckIcon,
  ChevronRightIcon
} from './ui/Icons';

const Navbar = ({ user, onLogout, activeProgramme }) => {
    const location = useLocation();
    const navigate = useNavigate();
    const [isMobileOpen, setIsMobileOpen] = useState(false);

    const handleLogout = () => {
        onLogout();
        navigate('/');
    };

    const getNavItems = () => {
        switch (user?.role) {
            case 'student':
                return [
                    { label: 'Dashboard', path: '/student-dashboard', icon: LayersIcon },
                    { label: 'Team Formation', path: '/student-dashboard/team', icon: UsersIcon },
                    { label: 'My Team', path: '/student-dashboard/my-team', icon: UsersIcon },
                    { label: 'Guide Requests', path: '/student-dashboard/guide-requests', icon: UserIcon },
                    { label: 'My Panel', path: '/student-dashboard/my-panel', icon: LayersIcon },
                    { label: 'Review Schedules', path: '/student-dashboard/review-schedules', icon: CalendarIcon },
                    { label: 'Project Uploads', path: '/student-dashboard/final-report', icon: LayersIcon },
                    { label: 'Announcements', path: '/student-dashboard/coordinator-instructions', icon: MailIcon },
                    { label: 'Guide Me', path: '/student-dashboard/guide-me', icon: ShieldCheckIcon }
                ];
            case 'guide':
                return [
                    { label: 'Guide Cockpit', path: '/guide-dashboard', icon: LayersIcon },
                    { label: 'My Teams', path: '/guide-dashboard/my-teams', icon: UsersIcon },
                    { label: 'Team Attendance', path: '/guide-dashboard/attendance', icon: ClockIcon },
                    { label: 'Student Requests', path: '/guide-dashboard/requests', icon: UserIcon },
                    { label: 'Review Schedules', path: '/guide-dashboard/review-schedules', icon: CalendarIcon },
                    { label: 'Mark Teams', path: '/guide-dashboard/mark-teams', icon: CheckCircleIcon },
                    { label: 'Announcements', path: '/guide-dashboard/announcements', icon: MailIcon },
                    { label: 'Final Uploads', path: '/guide-dashboard/final-reports', icon: LayersIcon },
                    { label: 'Guide Me', path: '/guide-dashboard/guide-me', icon: ShieldCheckIcon }
                ];
            case 'panel':
                const panelItems = [
                    { label: 'Dashboard', path: '/panel-dashboard', icon: LayersIcon },
                    { label: 'Assigned Teams', path: '/panel-dashboard/assigned-teams', icon: UsersIcon },
                    { label: 'Review Attendance', path: '/panel-dashboard/upload-attendance', icon: ClockIcon }
                ];
                if (user.memberType === 'external' || user.memberType === 'internal') {
                    panelItems.push({ label: 'Review Schedules', path: '/panel-dashboard/review-schedules', icon: CalendarIcon });
                }
                panelItems.push(
                    { label: 'Mark Teams', path: '/panel-dashboard/mark-teams', icon: CheckCircleIcon },
                    { label: 'Guide Me', path: '/panel-dashboard/guide-me', icon: ShieldCheckIcon }
                );
                return panelItems;
            case 'admin':
                if (!activeProgramme) return [];
                const prefix = `/admin-dashboard/programme/${encodeURIComponent(activeProgramme)}`;
                return [
                    { label: 'Student Registration', path: `${prefix}/user-management`, icon: UserIcon },
                    { label: 'Settings', path: `${prefix}/admin-settings`, icon: KeyIcon },
                    { label: 'Review Panels', path: `${prefix}/review-panels`, icon: LayersIcon },
                    { label: 'Panel Allocations', path: `${prefix}/allocations`, icon: UsersIcon },
                    { label: 'Review Attendance', path: `${prefix}/upload-attendance`, icon: ClockIcon },
                    { label: 'Student Attendance', path: `${prefix}/view-attendance`, icon: ClockIcon },
                    { label: 'Schedules', path: `${prefix}/manage-review-schedules`, icon: CalendarIcon },
                    { label: 'Guide Me', path: `${prefix}/guide-me`, icon: ShieldCheckIcon }
                ];
            case 'assistant coordinator':
            case 'coordinator':
                return [
                    { label: 'Overview Dashboard', path: '/coordinator-dashboard/dashboard', icon: LayersIcon },
                    { label: 'Project Attendance', path: '/coordinator-dashboard/project-attendance', icon: ClockIcon },
                    { label: 'Assigned Teams', path: '/coordinator-dashboard/assigned-teams', icon: UsersIcon },
                    { label: 'Review Schedule', path: '/coordinator-dashboard/review-schedule', icon: CalendarIcon },
                    { label: 'Viva Panel Formation', path: '/coordinator-dashboard/viva-panel-formation', icon: UserIcon },
                    { label: 'Marking Scheme', path: '/coordinator-dashboard/marking-scheme', icon: CheckCircleIcon },
                    { label: 'Student Uploads', path: '/coordinator-dashboard/materials', icon: LayersIcon },
                    { label: 'Letter Generation', path: '/coordinator-dashboard/letter-generation', icon: SparklesIcon },
                    { label: 'Review Attendance', path: '/coordinator-dashboard/upload-attendance', icon: ClockIcon },
                    { label: 'Student Registration', path: '/coordinator-dashboard/registration', icon: KeyIcon },
                    { label: 'Broadcasts', path: '/coordinator-dashboard/instruction-template', icon: MailIcon },
                    { label: 'Guide Me', path: '/coordinator-dashboard/guide-me', icon: ShieldCheckIcon }
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

    const sessionName = localStorage.getItem('selectedSessionName') || 'Current Session';
    const isReadOnly = localStorage.getItem('isSessionReadOnly') === 'true';
    const navItems = getNavItems();

    // Reusable Sidebar Content (Used on desktop and in mobile slide-over)
    const renderSidebarContent = () => (
        <div className="flex flex-col h-full justify-between">
            {/* Top: Brand Header & Context */}
            <div className="p-5 border-b border-slate-100">
                <div 
                    onClick={() => {
                        if (user?.role === 'admin') navigate('/admin-dashboard');
                        else if (user?.role === 'student') navigate('/student-dashboard');
                        else if (user?.role === 'coordinator') navigate('/coordinator-dashboard');
                        else if (user?.role === 'guide') navigate('/guide-dashboard');
                        setIsMobileOpen(false);
                    }}
                    className="flex items-center gap-3 cursor-pointer group mb-5"
                >
                    <div className="w-10 h-10 rounded-2xl bg-slate-900 text-white flex items-center justify-center shadow-md shadow-slate-900/10 group-hover:bg-blue-600 transition-colors">
                        <LayersIcon className="w-5 h-5 text-blue-400 group-hover:text-white transition-colors" />
                    </div>
                    <div>
                        <span className="text-base font-extrabold tracking-tight text-slate-900 block leading-tight">
                            Project Review
                        </span>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">
                            Academic Portal · v2.4
                        </span>
                    </div>
                </div>

                {/* User Profile Capsule */}
                <div className="p-3 rounded-2xl bg-slate-50/80 border border-slate-200/80 space-y-2">
                    <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-xl bg-slate-900 text-white flex items-center justify-center font-bold text-xs flex-shrink-0">
                            {user?.name ? user.name.slice(0, 2).toUpperCase() : (user?.role?.slice(0, 2).toUpperCase() || 'US')}
                        </div>
                        <div className="min-w-0 flex-1">
                            <div className="text-xs font-extrabold text-slate-900 truncate">
                                {user?.name || user?.username || 'Authenticated User'}
                            </div>
                            <div className="text-[11px] font-semibold text-slate-500 truncate">
                                {userRoleText}
                            </div>
                        </div>
                    </div>

                    {/* Session indicator */}
                    <div className="flex items-center justify-between pt-2 border-t border-slate-200/60 text-[11px]">
                        <div className="flex items-center gap-1.5 text-blue-700 font-semibold truncate">
                            <CalendarIcon className="w-3.5 h-3.5 flex-shrink-0 text-blue-500" />
                            <span className="truncate">{sessionName}</span>
                        </div>
                        {isReadOnly && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">
                                <LockIcon className="w-3 h-3 text-amber-600" />
                                Read-Only
                            </span>
                        )}
                    </div>

                    {/* Panel Switcher for Multi-panel Coordinators */}
                    {displayPanelsSelect && (
                        <div className="pt-2 border-t border-slate-200/60">
                            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                                Active Panel
                            </label>
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
                                className="w-full text-xs px-2.5 py-1.5 border border-slate-200 rounded-xl bg-white text-slate-800 font-bold focus:outline-none focus:ring-2 focus:ring-blue-500/20 shadow-xs"
                            >
                                {coordinatorPanels.map(p => (
                                    <option key={p._id} value={p._id}>{p.name}</option>
                                ))}
                            </select>
                        </div>
                    )}
                </div>
            </div>

            {/* Middle: Navigation Links */}
            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-1 scrollbar-hide">
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-3 py-1 mb-1">
                    Navigation
                </div>
                {navItems.map((item) => {
                    const Icon = item.icon || LayersIcon;
                    const isActive = location.pathname === item.path || (item.path !== '/' && location.pathname.startsWith(item.path + '/'));
                    return (
                        <button
                            key={item.path}
                            onClick={() => {
                                navigate(item.path);
                                setIsMobileOpen(false);
                            }}
                            className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all duration-150 group ${
                                isActive
                                    ? 'bg-slate-900 text-white shadow-sm shadow-slate-900/10'
                                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/80 active:scale-[0.99]'
                            }`}
                        >
                            <div className="flex items-center gap-3 min-w-0">
                                <Icon className={`w-4 h-4 flex-shrink-0 transition-colors ${isActive ? 'text-blue-400' : 'text-slate-400 group-hover:text-slate-600'}`} />
                                <span className="truncate">{item.label}</span>
                            </div>
                            {isActive && (
                                <ChevronRightIcon className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                            )}
                        </button>
                    );
                })}
            </div>

            {/* Bottom: Utility Controls */}
            <div className="p-4 border-t border-slate-100 bg-slate-50/50 space-y-2">
                {['guide', 'panel', 'coordinator', 'assistant coordinator'].includes(user?.role) && (
                    <button
                        onClick={() => {
                            navigate('/role-selection');
                            setIsMobileOpen(false);
                        }}
                        className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-xs font-bold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200/90 shadow-xs active:scale-95 transition"
                    >
                        <RefreshIcon className="w-3.5 h-3.5 text-slate-500" />
                        <span>Switch Role</span>
                    </button>
                )}

                {user?.role === 'admin' && (
                    <button
                        onClick={() => {
                            navigate('/admin-dashboard');
                            setIsMobileOpen(false);
                        }}
                        className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-xs font-bold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200/90 shadow-xs active:scale-95 transition"
                    >
                        <CalendarIcon className="w-3.5 h-3.5 text-slate-500" />
                        <span>Switch Session</span>
                    </button>
                )}

                <button
                    onClick={handleLogout}
                    className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-xs font-bold text-rose-600 bg-rose-50/80 hover:bg-rose-100 border border-rose-200/60 shadow-xs active:scale-95 transition"
                >
                    <LogoutIcon className="w-3.5 h-3.5 text-rose-500" />
                    <span>Sign Out</span>
                </button>
            </div>
        </div>
    );

    return (
        <>
            {/* Desktop Left Sidebar (Fixed) */}
            <aside className="hidden lg:flex fixed inset-y-0 left-0 w-72 z-40 bg-white/90 backdrop-blur-2xl border-r border-slate-200/80 shadow-[1px_0_3px_rgba(15,23,42,0.03),4px_0_24px_-4px_rgba(15,23,42,0.05)]">
                {renderSidebarContent()}
            </aside>

            {/* Mobile Top Header (Screens < lg) */}
            <header className="lg:hidden sticky top-0 z-40 w-full glass-nav px-4 h-16 flex items-center justify-between border-b border-slate-200/80">
                <div 
                    onClick={() => {
                        if (user?.role === 'admin') navigate('/admin-dashboard');
                        else if (user?.role === 'student') navigate('/student-dashboard');
                        else if (user?.role === 'coordinator') navigate('/coordinator-dashboard');
                        else if (user?.role === 'guide') navigate('/guide-dashboard');
                    }}
                    className="flex items-center gap-2.5 cursor-pointer"
                >
                    <div className="w-8 h-8 rounded-xl bg-slate-900 text-white flex items-center justify-center shadow-xs">
                        <LayersIcon className="w-4 h-4 text-blue-400" />
                    </div>
                    <div>
                        <span className="text-sm font-black tracking-tight text-slate-900 block leading-tight">
                            Project Review
                        </span>
                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block">
                            {user?.role || 'Portal'}
                        </span>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setIsMobileOpen(true)}
                        className="p-2 rounded-xl bg-slate-100 text-slate-700 hover:bg-slate-200 transition"
                        aria-label="Open Navigation Menu"
                    >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
                        </svg>
                    </button>
                </div>
            </header>

            {/* Mobile Slide-Over Drawer */}
            {isMobileOpen && (
                <div className="lg:hidden fixed inset-0 z-50 flex">
                    {/* Backdrop */}
                    <div 
                        onClick={() => setIsMobileOpen(false)}
                        className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity"
                    />

                    {/* Drawer Content */}
                    <div className="relative w-80 max-w-[85vw] bg-white h-full shadow-2xl z-10 animate-slide-in flex flex-col">
                        <div className="absolute top-4 right-4 z-20">
                            <button
                                onClick={() => setIsMobileOpen(false)}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 bg-slate-100"
                            >
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>
                        {renderSidebarContent()}
                    </div>
                </div>
            )}
        </>
    );
};

export default Navbar;
