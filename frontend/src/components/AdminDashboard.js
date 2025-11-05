import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import Navbar from './Navbar';
import MaxTeamSizeSettings from './admin/MaxTeamSizeSettings';
import PanelManagement from './admin/PanelManagement';
import PanelAssignment from './admin/PanelAssignment';
import GuideSelectionSettings from './admin/GuideSelectionSettings';
import GuideAssignmentManagement from './admin/GuideAssignmentManagement';
import AdminViewAttendance from './admin/AdminViewAttendance';
import AdminManageReviewSchedules from './admin/AdminManageReviewSchedules';
import AdminViewAvailabilities from './admin/AdminViewAvailabilities';
import UserManagement from './admin/UserManagement';
import AdminTeams from './admin/AdminTeams';
import GuideMe from './GuideMe';

const AdminDashboard = () => {
    const location = useLocation();
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
    };

    const renderContent = () => {
        switch (location.pathname) {
            case '/admin-dashboard/settings':
                return <MaxTeamSizeSettings />;
            case '/admin-dashboard/panel-creation':
                return <PanelManagement />;
            case '/admin-dashboard/panel-assignment':
                return <PanelAssignment />;
            case '/admin-dashboard/guide-selection':
                return <GuideSelectionSettings />;
            case '/admin-dashboard/guide-assignment-summary':
                return <GuideAssignmentManagement />;
            case '/admin-dashboard/view-attendance':
                return <AdminViewAttendance />;
            case '/admin-dashboard/manage-review-schedules':
                return <AdminManageReviewSchedules />;
            case '/admin-dashboard/view-availabilities':
                return <AdminViewAvailabilities />;
            case '/admin-dashboard/user-management':
                return <UserManagement />;
            case '/admin-dashboard/teams':
                return <AdminTeams />;
            case '/admin-dashboard/guide-me':
                return <GuideMe userRole={user.role} memberType={user.memberType} />;
            default:
                return (
                    <div className="bg-white p-6 rounded-lg shadow">
                        <h2 className="text-xl font-semibold mb-4">Welcome to Admin Dashboard!</h2>
                        <div className="mb-4">
                            <ul className="list-disc list-inside space-y-2 text-gray-700">
                                <li>You can configure periods for team formation, guide selection, and reviews.</li>
                                <li>You can approve or reject teams and guides.</li>
                                <li>You can view and manage all users, teams, and panels.</li>
                                <li>You can set the maximum team size.</li>
                                <li>You can manage review schedules and panel assignments.</li>
                                <li>You can view attendance records and faculty availabilities.</li>
                                <li>You can upload and manage faculty and student data via CSV files.</li>
                            </ul>
                        </div>
                        <p>Select an option from the navigation bar.</p>
                    </div>
                );
        }
    };

    if (!user) {
        // Optionally redirect to login or show a loading state
        return null; 
    }

    return (
        <div className="min-h-screen bg-gray-50">
            <Navbar user={user} onLogout={handleLogout} />
            <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
                <div className="px-4 py-6 sm:px-0">
                    {renderContent()}
                </div>
            </div>
        </div>
    );
};

export default AdminDashboard; 