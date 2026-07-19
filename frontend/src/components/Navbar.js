import React, { useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

const icons = {
    Dashboard: '⌂',
    Team: '◫',
    Guide: '◇',
    Panel: '◎',
    Review: '◷',
    Upload: '↥',
    Attendance: '✓',
    Schedule: '◴',
    Materials: '▤',
    Letter: '✦',
    Broadcasts: '◌',
    Settings: '⚙',
    Students: '▦',
    Allocation: '↔',
    Help: '?'
};

const iconFor = (label) => {
    const key = Object.keys(icons).find((name) => label.toLowerCase().includes(name.toLowerCase()));
    return key ? icons[key] : '•';
};

const Navbar = ({ user, onLogout, activeProgramme }) => {
    const location = useLocation();
    const navigate = useNavigate();
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    const items = useMemo(() => {
        if (!user) return [];
        switch (user.role) {
            case 'student': return [
                ['Dashboard', '/student-dashboard'], ['Team Formation', '/student-dashboard/team'],
                ['My Team', '/student-dashboard/my-team'], ['Guide Requests', '/student-dashboard/guide-requests'],
                ['My Panel', '/student-dashboard/my-panel'], ['Review Schedules', '/student-dashboard/review-schedules'],
                ['Uploads', '/student-dashboard/final-report'], ['Announcements', '/student-dashboard/coordinator-instructions'], ['Guide Me', '/student-dashboard/guide-me']
            ];
            case 'guide': return [
                ['Dashboard', '/guide-dashboard'], ['Requests', '/guide-dashboard/requests'], ['My Teams', '/guide-dashboard/my-teams'],
                ['Review Schedules', '/guide-dashboard/review-schedules'], ['Mark Teams', '/guide-dashboard/mark-teams'], ['Uploads', '/guide-dashboard/final-reports'], ['Guide Me', '/guide-dashboard/guide-me']
            ];
            case 'panel': {
                const panelItems = [['Dashboard', '/panel-dashboard'], ['Assigned Teams', '/panel-dashboard/assigned-teams'], ['Review Schedules', '/panel-dashboard/review-schedules'], ['Mark Teams', '/panel-dashboard/mark-teams'], ['Upload Attendance', '/panel-dashboard/upload-attendance'], ['Guide Me', '/panel-dashboard/guide-me']];
                return panelItems;
            }
            case 'admin': {
                if (!activeProgramme) return [['Programme desk', '/admin-dashboard'], ['Global management', '/admin-dashboard/global-management']];
                const prefix = `/admin-dashboard/programme/${encodeURIComponent(activeProgramme)}`;
                return [['Students', `${prefix}/user-management`], ['Settings', `${prefix}/admin-settings`], ['Review Panels', `${prefix}/review-panels`], ['Team Allocations', `${prefix}/allocations`], ['Review Attendance', `${prefix}/upload-attendance`], ['Student Attendance', `${prefix}/view-attendance`], ['Schedules', `${prefix}/manage-review-schedules`], ['Guide Me', `${prefix}/guide-me`]];
            }
            case 'coordinator':
            case 'assistant coordinator': return [
                ['Dashboard', '/coordinator-dashboard/dashboard'], ['Viva Panels', '/coordinator-dashboard/viva-panel-formation'], ['Assigned Teams', '/coordinator-dashboard/assigned-teams'], ['Upload Attendance', '/coordinator-dashboard/upload-attendance'], ['Review Schedule', '/coordinator-dashboard/review-schedule'], ['Viva Schedule', '/coordinator-dashboard/viva-schedule'], ['Materials', '/coordinator-dashboard/materials'], ['Letter Generation', '/coordinator-dashboard/letter-generation'], ['Broadcasts', '/coordinator-dashboard/instruction-template'], ['Guide Me', '/coordinator-dashboard/guide-me']
            ];
            default: return [];
        }
    }, [user, activeProgramme]);

    const roleLabel = user?.role === 'panel' ? 'Panel member' : user?.role === 'assistant coordinator' ? 'Assistant coordinator' : user?.role;
    const identity = user?.name || user?.username || 'Academic workspace';
    const isActive = (path) => location.pathname === path || (path !== '/student-dashboard' && path !== '/guide-dashboard' && path !== '/panel-dashboard' && location.pathname.startsWith(`${path}/`));
    const go = (path) => { navigate(path); setIsMobileMenuOpen(false); };

    return (
        <>
            <button className="rail-mobile-toggle" onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} aria-label="Toggle navigation">☰</button>
            <aside className={`nav-shell ${isMobileMenuOpen ? 'nav-shell-open' : ''}`}>
                <div className="rail-brand" onClick={() => user?.role !== 'admin' && items[0] && go(items[0][1])} role="button" tabIndex="0">
                    <span className="rail-brand-mark">RR</span>
                    <span><small>THE</small> REVIEW RAIL</span>
                </div>

                <div className="rail-profile">
                    <span className="rail-avatar">{identity.slice(0, 1).toUpperCase()}</span>
                    <div><strong>{identity}</strong><small>{roleLabel}{activeProgramme ? ` · ${activeProgramme}` : ''}</small></div>
                </div>

                <nav className="rail-nav" aria-label="Primary navigation">
                    <p>Workspace</p>
                    {items.map(([label, path]) => (
                        <button key={path} onClick={() => go(path)} className={isActive(path) ? 'nav-link nav-link-active' : 'nav-link'}>
                            <span className="rail-nav-icon">{iconFor(label)}</span>{label}
                        </button>
                    ))}
                </nav>

                <div className="rail-footer">
                    {['guide', 'panel', 'coordinator', 'assistant coordinator'].includes(user?.role) && user?.roles?.length > 1 && <button className="rail-utility" onClick={() => go('/role-selection')}>⇄ Switch role</button>}
                    {user?.role === 'admin' && <button className="rail-utility" onClick={() => go('/admin-dashboard')}>← Programme desk</button>}
                    <button className="rail-logout" onClick={() => { onLogout(); navigate('/'); }}>↗ Sign out</button>
                </div>
            </aside>
        </>
    );
};

export default Navbar;
