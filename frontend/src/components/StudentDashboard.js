import React from 'react';
import { Routes, Route } from 'react-router-dom';
import Navbar from './Navbar';
import TeamFormation from './student/TeamFormation';
import MyTeam from './student/MyTeam';
import GuideRequestManagement from './student/GuideRequestManagement';
import MyPanel from './student/MyPanel';
import FinalReport from './student/FinalReport';
import StudentReviewSchedule from './student/StudentReviewSchedule';
import TeamRules from './student/TeamRules';
import GuideMe from './GuideMe';

const StudentDashboard = () => {
    const user = JSON.parse(localStorage.getItem('user'));

    const handleLogout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/';
    };

    return (
        <div>
            <Navbar user={user} onLogout={handleLogout} />
            <main className="p-4">
                <Routes>
                    <Route index element={<TeamRules />} />
                    <Route path="team" element={<TeamFormation />} />
                    <Route path="my-team" element={<MyTeam />} />
                    <Route path="guide-requests" element={<GuideRequestManagement />} />
                    <Route path="my-panel" element={<MyPanel />} />
                    <Route path="review-schedules" element={<StudentReviewSchedule />} />
                    <Route path="final-report" element={<FinalReport />} />
                    <Route path="guide-me" element={<GuideMe userRole="student" />} />
                </Routes>
            </main>
        </div>
    );
};

export default StudentDashboard; 