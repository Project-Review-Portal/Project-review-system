import React from 'react';
import { useParams, useLocation } from 'react-router-dom';
import AdminSettings from './AdminSettings';
import PanelManagement from './PanelManagement';
import AllocationsDashboard from './AllocationsDashboard';
import AdminViewAttendance from './AdminViewAttendance';
import AdminManageReviewSchedules from './AdminManageReviewSchedules';
import UserManagement from './UserManagement';
import GuideUploadAttendance from '../guide/GuideUploadAttendance';

import GuideMe from '../GuideMe';

/**
 * ProgrammeDashboard — renders the full suite of admin sub-features for a given programme.
 * The programme name comes from the URL: /admin-dashboard/programme/:programmeName/:section
 */
const ProgrammeDashboard = () => {
    const { programmeName } = useParams();
    const location = useLocation();

    // Decode the programme name from URL encoding
    const decodedProgramme = decodeURIComponent(programmeName || 'B.E. CSE');

    // Extract the sub-section from the path after the programme segment
    // e.g. /admin-dashboard/programme/UG/review-panels  → section = 'review-panels'
    const pathParts = location.pathname.split('/');
    const progIdx = pathParts.indexOf('programme');
    const section = progIdx >= 0 && pathParts[progIdx + 2] ? pathParts[progIdx + 2] : 'home';

    // Sync programme to stored user in case of direct URL access/refresh
    React.useEffect(() => {
        try {
            const storedUser = JSON.parse(localStorage.getItem('user') || '{}');
            if (storedUser && storedUser.programme !== decodedProgramme) {
                storedUser.programme = decodedProgramme;
                localStorage.setItem('user', JSON.stringify(storedUser));
            }
        } catch (e) {}
    }, [decodedProgramme]);

    const renderSection = () => {
        switch (section) {
            case 'guide-me':
                return <GuideMe userRole="admin" />;
            case 'user-management':
                return <UserManagement key={`user-${decodedProgramme}`} programme={decodedProgramme} studentsOnly />;
            case 'admin-settings':
                return <AdminSettings key={`settings-${decodedProgramme}`} programme={decodedProgramme} />;
            case 'review-panels':
                return <PanelManagement key={`review-${decodedProgramme}`} panelType="review" programme={decodedProgramme} />;
            case 'allocations':
                return <AllocationsDashboard key={`alloc-${decodedProgramme}`} programme={decodedProgramme} />;
            case 'upload-attendance':
                return <GuideUploadAttendance key={`upatt-${decodedProgramme}`} programme={decodedProgramme} />;
            case 'view-attendance':
                return <AdminViewAttendance key={`viewatt-${decodedProgramme}`} programme={decodedProgramme} />;
            case 'manage-review-schedules':
                return <AdminManageReviewSchedules key={`manage-${decodedProgramme}`} programme={decodedProgramme} />;

            default:
                return (
                    <div className="bg-white p-6 rounded-lg shadow mt-4">
                        <h2 className="text-2xl font-bold mb-2 text-gray-800">
                            {(decodedProgramme === 'UG' || decodedProgramme === 'B.E COMPUTER SCIENCE AND ENGINEERING' || decodedProgramme === 'B.E. CSE') ? '📚 B.E. CSE Programme' : `🎓 ${decodedProgramme}`}
                        </h2>
                        <p className="text-gray-500">
                            Welcome to the <strong>{decodedProgramme}</strong> programme dashboard. 
                            Use the navigation bar above to manage students, panels, and reviews for this programme.
                        </p>
                    </div>
                );
        }
    };

    return (
        <div>
            {renderSection()}
        </div>
    );
};

export default ProgrammeDashboard;
