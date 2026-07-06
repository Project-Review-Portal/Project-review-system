import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate, Route, Routes } from 'react-router-dom';
import Navbar from './Navbar';
import AdminSettings from './admin/AdminSettings';
import PanelManagement from './admin/PanelManagement';
import AdminViewAttendance from './admin/AdminViewAttendance';
import AdminManageReviewSchedules from './admin/AdminManageReviewSchedules';
import AdminViewAvailabilities from './admin/AdminViewAvailabilities';
import UserManagement from './admin/UserManagement';
import AllocationsDashboard from './admin/AllocationsDashboard';
import GuideMe from './GuideMe';
import GuideUploadAttendance from './guide/GuideUploadAttendance';
import AdminHome from './admin/AdminHome';
import GlobalManagement from './admin/GlobalManagement';
import ProgrammeDashboard from './admin/ProgrammeDashboard';

const AdminDashboard = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const [user, setUser] = useState(null);

    useEffect(() => {
        const storedUser = localStorage.getItem('user');
        if (storedUser) {
            setUser(JSON.parse(storedUser));
        }
    }, []);

    const handleLogout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        setUser(null);
        navigate('/');
    };

    if (!user) return null;

    // Determine if we're inside a programme context for the key reset
    const contentKey = location.pathname;

    const isHome = location.pathname === '/admin-dashboard' || location.pathname === '/admin-dashboard/';
    const showNavbar = !isHome;

    const programmeMatch = location.pathname.match(/\/programme\/([^/]+)/);
    const activeProgramme = programmeMatch ? decodeURIComponent(programmeMatch[1]) : null;

    return (
        <div className="min-h-screen bg-gray-50">
            {showNavbar && <Navbar user={user} onLogout={handleLogout} activeProgramme={activeProgramme} />}
            <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
                <div key={contentKey} className="px-4 py-6 sm:px-0">
                    <Routes>
                        {/* Default home — programme selection */}
                        <Route index element={<AdminHome />} />

                        {/* Global management (faculty + designation limits + programmes) */}
                        <Route path="global-management" element={<GlobalManagement />} />

                        {/* Legacy Registration route for backward compat */}
                        <Route path="user-management" element={<UserManagement globalOnly />} />

                        {/* Programme-scoped dashboard — handles /programme/:name and /programme/:name/:section */}
                        <Route path="programme/:programmeName" element={<ProgrammeDashboard />} />
                        <Route path="programme/:programmeName/:section" element={<ProgrammeDashboard />} />

                        {/* Shared admin routes (not programme-scoped) */}
                        <Route path="admin-settings" element={<AdminSettings />} />
                        <Route path="view-availabilities" element={<AdminViewAvailabilities />} />
                        <Route path="guide-me" element={user ? <GuideMe userRole={user.role} memberType={user.memberType} /> : null} />

                        {/* Legacy routes — kept for backward compatibility */}
                        <Route path="review-panels" element={<PanelManagement key="review" panelType="review" />} />
                        <Route path="viva-panels" element={<PanelManagement key="viva" panelType="viva" />} />
                        <Route path="allocations" element={<AllocationsDashboard />} />
                        <Route path="view-attendance" element={<AdminViewAttendance />} />
                        <Route path="upload-attendance" element={<GuideUploadAttendance />} />
                        <Route path="manage-review-schedules" element={<AdminManageReviewSchedules />} />
                    </Routes>
                </div>
            </div>
        </div>
    );
};

export default AdminDashboard;