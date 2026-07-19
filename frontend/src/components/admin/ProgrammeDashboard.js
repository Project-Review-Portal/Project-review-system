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
import ReviewRail from '../ReviewRail';

const ProgrammeDashboard = () => {
    const { programmeName } = useParams();
    const location = useLocation();
    const decodedProgramme = decodeURIComponent(programmeName || 'B.E. CSE');
    const pathParts = location.pathname.split('/');
    const progIdx = pathParts.indexOf('programme');
    const section = progIdx >= 0 && pathParts[progIdx + 2] ? pathParts[progIdx + 2] : 'home';

    const sessions = {
        home: { label: 'Programme register', title: 'Programme overview', description: 'A considered record of the people, panels, and review milestones for this programme.', step: 1 },
        'user-management': { label: 'Student registry', title: 'Student registration', description: 'Maintain an accurate cohort record before teams and review panels are formed.', step: 0 },
        'admin-settings': { label: 'Academic rules', title: 'Cycle settings', description: 'Set the operational rules that govern formation, selections, reviews, and viva.', step: 0 },
        'review-panels': { label: 'Review board', title: 'Panel register', description: 'Constitute review panels and record the faculty responsible for each assessment.', step: 1 },
        allocations: { label: 'Allocation ledger', title: 'Team allocations', description: 'Connect each team to its guide, review board, and viva panel with clarity.', step: 1 },
        'upload-attendance': { label: 'Attendance register', title: 'Review attendance', description: 'Capture review-day attendance as part of the formal academic record.', step: 2 },
        'view-attendance': { label: 'Student record', title: 'Attendance & marks', description: 'Review the attendance and score history that supports every final decision.', step: 2 },
        'manage-review-schedules': { label: 'Review calendar', title: 'Schedule register', description: 'Publish a structured timetable for reviews and viva milestones.', step: 2 },
        'guide-me': { label: 'Reference desk', title: 'Programme guidance', description: 'Role-specific guidance for completing this programme’s review cycle.', step: 1 }
    };
    const details = sessions[section] || sessions.home;

    const renderSection = () => {
        switch (section) {
            case 'guide-me': return <GuideMe userRole="admin" />;
            case 'user-management': return <UserManagement key={`user-${decodedProgramme}`} programme={decodedProgramme} studentsOnly />;
            case 'admin-settings': return <AdminSettings />;
            case 'review-panels': return <PanelManagement key={`review-${decodedProgramme}`} panelType="review" programme={decodedProgramme} />;
            case 'allocations': return <AllocationsDashboard key={`alloc-${decodedProgramme}`} programme={decodedProgramme} />;
            case 'upload-attendance': return <GuideUploadAttendance key={`upatt-${decodedProgramme}`} programme={decodedProgramme} />;
            case 'view-attendance': return <AdminViewAttendance key={`viewatt-${decodedProgramme}`} programme={decodedProgramme} />;
            case 'manage-review-schedules': return <AdminManageReviewSchedules key={`manage-${decodedProgramme}`} programme={decodedProgramme} />;
            default: return <div className="programme-overview-card"><div className="overview-stamp">{decodedProgramme === 'UG' || decodedProgramme.includes('CSE') ? 'UG' : 'PG'}</div><div><h2>Ready to maintain the record.</h2><p>Use the rail to register students, define review rules, create panels, and allocate teams for <strong>{decodedProgramme}</strong>.</p></div></div>;
        }
    };

    return (
        <main className="programme-workspace">
            <header className="programme-hero">
                <div><p className="page-kicker">{details.label}</p><h1>{details.title}</h1><p>{details.description}</p></div>
                <div className="programme-code"><small>PROGRAMME</small><strong>{decodedProgramme}</strong></div>
            </header>
            <ReviewRail current={details.step} scores={details.step > 1 ? ['—', '—'] : details.step > 0 ? ['—'] : []} label="Programme review cycle" />
            <section className="programme-session" key={section}>{renderSection()}</section>
        </main>
    );
};

export default ProgrammeDashboard;
