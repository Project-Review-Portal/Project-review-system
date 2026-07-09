import React, { useState } from 'react';
import { useLocation } from 'react-router-dom'; // required for displaying activeness of section items
import { useNavigate } from 'react-router-dom';


const Navbar = ({ user, onLogout, activeProgramme }) => {
    const location = useLocation();
    const navigate = useNavigate();

    const handleLogout = () => {
        onLogout();
        navigate('/');
    };

    const getNavItems = () => {
        console.log('Navbar user object:', user);
        switch (user.role) {
            case 'student':
                return [
                    { label: 'Dashboard', path: '/student-dashboard' },
                    { label: 'Team Formation', path: '/student-dashboard/team' },
                    { label: 'My Team', path: '/student-dashboard/my-team' },
                    { label: 'Guide Requests', path: '/student-dashboard/guide-requests' },
                    { label: 'My Panel', path: '/student-dashboard/my-panel' },
                    { label: 'Review Schedules', path: '/student-dashboard/review-schedules' },
                    { label: 'Final Report', path: '/student-dashboard/final-report' },
                    { label: 'Announcements', path: '/student-dashboard/coordinator-instructions' },
                    { label: 'Guide Me', path: '/student-dashboard/guide-me' }
                ];
            case 'guide':
                return [
                    { label: 'Dashboard', path: '/guide-dashboard' },
                    { label: 'Requests', path: '/guide-dashboard/requests' },
                    { label: 'My Teams', path: '/guide-dashboard/my-teams' },
                    { label: 'Review Schedules', path: '/guide-dashboard/review-schedules' },
                    { label: 'Mark Teams', path: '/guide-dashboard/mark-teams' },
                    { label: 'Final Reports', path: '/guide-dashboard/final-reports' },
                    { label: 'Guide Me', path: '/guide-dashboard/guide-me' }
                ];
            case 'panel':
                const panelNavItems = [
                    { label: 'Dashboard', path: '/panel-dashboard' },
                    { label: 'Assigned Teams', path: '/panel-dashboard/assigned-teams' },
                    { label: 'Upload Attendance', path: '/panel-dashboard/upload-attendance' }
                ];
                if (user.memberType === 'external') {
                    panelNavItems.push({ label: 'Schedules', path: '/panel-dashboard/review-schedules' });
                }
                if (user.memberType === 'internal') {
                    panelNavItems.push({ label: 'Schedules', path: '/panel-dashboard/review-schedules' });
                }
                panelNavItems.push({ label: 'Mark Teams', path: '/panel-dashboard/mark-teams' });
                panelNavItems.push({ label: 'Guide Me', path: '/panel-dashboard/guide-me' });
                return panelNavItems;
            case 'admin':
                if (!activeProgramme) return []; // Hidden on home screen via parent, but extra safeguard
                const prefix = `/admin-dashboard/programme/${encodeURIComponent(activeProgramme)}`;
                return [
                    { label: 'Student Registration', path: `${prefix}/user-management` },
                    { label: 'Settings', path: `${prefix}/admin-settings` },
                    { label: 'Review Panels', path: `${prefix}/review-panels` },
                    { label: 'Viva Panels', path: `${prefix}/viva-panels` },
                    { label: 'Team Panel Allocations', path: `${prefix}/allocations` },
                    { label: 'Upload Attendance', path: `${prefix}/upload-attendance` },
                    { label: 'Student Attendance', path: `${prefix}/view-attendance` },
                    { label: 'Schedules', path: `${prefix}/manage-review-schedules` },
                    { label: 'Guide Me', path: `${prefix}/guide-me` }
                ];
            case 'coordinator':
                return [
                    { label: 'Dashboard', path: '/coordinator-dashboard/dashboard' },
                    { label: 'Assigned Teams', path: '/coordinator-dashboard/assigned-teams' },
                    { label: 'Upload Attendance', path: '/coordinator-dashboard/upload-attendance' },
                    { label: 'Review Schedule', path: '/coordinator-dashboard/review-schedule' },
                    { label: 'Viva Schedule', path: '/coordinator-dashboard/viva-schedule' },
                    { label: 'Letter Generation', path: '/coordinator-dashboard/letter-generation' },
                    { label: 'Broadcasts', path: '/coordinator-dashboard/instruction-template' },
                    { label: 'Guide Me', path: '/coordinator-dashboard/guide-me' }
                ];
            default:
                return [];
        }
    };

    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    return (
        <nav className="bg-indigo-600">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex items-center justify-between h-16">
                    <div className="flex items-center">
                        {user && (() => {
                            let text = '';
                            if (user.role === 'admin') {
                                text = `Admin${activeProgramme ? ` (${activeProgramme})` : ''}`;
                            } else if (['guide', 'panel', 'coordinator'].includes(user.role)) {
                                const activeRoleObjects = user.roles?.filter(r => r.role === user.role) || [];
                                const uniqueProgrammes = Array.from(new Set(activeRoleObjects.map(r => r.programme).filter(Boolean)));
                                const displayProg = uniqueProgrammes.length > 0 ? uniqueProgrammes.join(', ') : (user.programme || 'UG');
                                const roleLabel = user.role === 'panel' ? 'Panel Member' : user.role.charAt(0).toUpperCase() + user.role.slice(1);
                                text = `${roleLabel} (${displayProg})`;
                            } else if (user.role === 'student') {
                                text = `${user.username} - ${user.name}`;
                            }

                            if (!text) return null;

                            return (
                                <span className="text-indigo-200 font-semibold mr-3 bg-indigo-800/40 px-2.5 py-1.5 rounded-lg text-xs sm:text-sm whitespace-nowrap flex items-center gap-1.5 shadow-inner">
                                    <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-indigo-300 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                    </svg>
                                    <span>{text}</span>
                                </span>
                            );
                        })()}
                        <div className="flex-shrink-0 flex items-center">
                            <span className="text-white font-bold">Project Review</span>
                            
                        </div>
                        
                        {/* Desktop Navigation */}
                        <div className="hidden md:block ml-10">
                            <div className="flex items-baseline space-x-1 overflow-x-auto scrollbar-hide max-w-4xl">
                                {getNavItems().map((item) => {
                                    const isActive = location.pathname === item.path;

                                    return (
                                        <button
                                            key={item.path}
                                            onClick={() => navigate(item.path)}
                                            className={`text-white hover:bg-indigo-500 px-2 py-2 rounded-md text-xs lg:text-sm font-medium whitespace-nowrap flex-shrink-0 ${
                                                isActive ? 'border-b-2 border-r-2 border-black' : ''
                                            }`}
                                        >
                                            {item.label}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    </div>

                    {/* Right side - User info and buttons */}
                    <div className="flex items-center space-x-2">
                        {/* <span className="text-white text-xs lg:text-sm hidden sm:block truncate max-w-32">Welcome!</span> */}
                        
                        {/* Switch Role button for faculty users with multiple roles */}
                        {['guide', 'panel', 'coordinator'].includes(user.role) && user.roles && user.roles.length > 1 && (
                            <button
                                onClick={() => navigate('/role-selection')}
                                className="bg-indigo-500 text-white px-2 py-2 rounded-md text-xs sm:text-sm font-medium hover:bg-indigo-600 whitespace-nowrap"
                            >
                                Switch Role
                            </button>
                        )}

                        {user.role === 'admin' && (
                            <button
                                onClick={() => navigate('/admin-dashboard')}
                                className="bg-indigo-500 text-white px-2 py-2 rounded-md text-xs sm:text-sm font-medium hover:bg-indigo-600 whitespace-nowrap mr-2"
                            >
                                Control Panel
                            </button>
                        )}
                        
                        <button
                            onClick={handleLogout}
                            className="bg-indigo-700 text-white px-2 py-2 rounded-md text-xs sm:text-sm font-medium hover:bg-indigo-800 whitespace-nowrap"
                        >
                            Logout
                        </button>

                        {/* Mobile menu button */}
                        <div className="md:hidden">
                            <button
                                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                                className="text-white hover:bg-indigo-500 p-2 rounded-md"
                            >
                                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                                </svg>
                            </button>
                        </div>
                    </div>
                </div>

                {/* Mobile Navigation */}
                {isMobileMenuOpen && (
                    <div className="md:hidden">
                        <div className="px-2 pt-2 pb-3 space-y-1 bg-indigo-700 rounded-b-lg">
                            {getNavItems().map((item) => (
                                <button
                                    key={item.path}
                                    onClick={() => {
                                        navigate(item.path);
                                        setIsMobileMenuOpen(false);
                                    }}
                                    className="text-white hover:bg-indigo-600 block w-full text-left px-3 py-2 rounded-md text-sm font-medium"
                                >
                                    {item.label}
                                </button>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </nav>
    );
};

export default Navbar; 