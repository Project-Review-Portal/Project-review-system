import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './components/Login';
import RoleSelection from './components/RoleSelection';
import AdminDashboard from './components/AdminDashboard';
import StudentDashboard from './components/StudentDashboard';
import MyTeam from './components/student/MyTeam';
import MyPanel from './components/student/MyPanel';
import GuideDashboardHome from './components/GuideDashboardHome';
import GuideLayout from './components/guide/GuideLayout';
import GuideRequestManagementForGuide from './components/guide/GuideRequestManagementForGuide';
import GuideMyTeams from './components/guide/GuideMyTeams';
import GuideReview from './components/guide/GuideReview';
import GuideUploadAttendance from './components/guide/GuideUploadAttendance';
import GuideMarking from './components/guide/GuideMarking';
import PanelDashboard from './components/PanelDashboard';
import PanelAssignedTeams from './components/panel/PanelAssignedTeams';
import PanelReviewSchedules from './components/panel/PanelReviewSchedules';
import PanelMarking from './components/panel/PanelMarking';
import PanelAssignedReviews from './components/panel/PanelAssignedReviews';
import PanelManagement from './components/admin/PanelManagement';
import PanelAssignment from './components/admin/PanelAssignment';
import AdminManageReviewSchedules from './components/admin/AdminManageReviewSchedules';
import AdminViewAttendance from './components/admin/AdminViewAttendance';
import FacultyDashboard from './components/FacultyDashboard';
import CoordinatorDashboard from './components/CoordinatorDashboard';
import ProtectedRoute from './components/ProtectedRoute';
import GuideMe from './components/GuideMe';
import GuideFinalReports from './components/guide/FinalReports';
import CoordinatorLetterLiveEditorCK from './components/CoordinatorLetterLiveEditorCK';
import ResetPassword from './components/ResetPassword';

const App = () => {
  return (
        <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
            <Routes>
                <Route path="/" element={<Login />} />
                <Route path="/role-selection" element={<RoleSelection />} />
                <Route path="/reset-password" element={<ResetPassword />} />
                <Route path="/admin-dashboard/*" element={<AdminDashboard />} />
                <Route path="/student-dashboard/*" element={<StudentDashboard />} />
                <Route path="/student/my-team" element={
                    <ProtectedRoute allowedRoles={['student']}>
                        <MyTeam />
                    </ProtectedRoute>
                } />
                <Route path="/student/my-panel" element={
                    <ProtectedRoute allowedRoles={['student']}>
                        <MyPanel />
                    </ProtectedRoute>
                } />
                <Route path="/guide-dashboard/*" element={<ProtectedRoute allowedRoles={['guide']}><GuideLayout /></ProtectedRoute>}>
                    <Route index element={<GuideDashboardHome />} />
                    <Route path="requests" element={<GuideRequestManagementForGuide />} />
                    <Route path="my-teams" element={<GuideMyTeams />} />
                    <Route path="guide-request-management" element={<GuideRequestManagementForGuide />} />
                    <Route path="review-schedules" element={<GuideReview />} />
                    <Route path="upload-attendance" element={<GuideUploadAttendance />} />
                    <Route path="mark-teams" element={<GuideMarking />} />
                    <Route path="final-reports" element={<GuideFinalReports />} />

                    <Route path="guide-me" element={<GuideMe userRole="guide" />} />
                </Route>
                <Route path="/panel-dashboard/*" element={<PanelDashboard />}>
                    <Route index element={<PanelAssignedTeams />} />
                    <Route path="assigned-teams" element={<PanelAssignedTeams />} />
                    <Route path="review-schedules" element={<PanelReviewSchedules />} />
                    <Route path="mark-teams" element={<PanelMarking />} />
                    <Route path="assigned-reviews" element={<PanelAssignedReviews />} />
                    <Route path="guide-me" element={<GuideMe userRole="panel" />} />
                </Route>
                <Route path="/admin/panel-management" element={
                    <ProtectedRoute allowedRoles={['admin']}>
                        <PanelManagement />
                    </ProtectedRoute>
                } />
                <Route path="/admin/panel-assignment" element={
                    <ProtectedRoute allowedRoles={['admin']}>
                        <PanelAssignment />
                    </ProtectedRoute>
                } />
                <Route path="/admin/manage-review-schedules" element={
                    <ProtectedRoute allowedRoles={['admin']}>
                        <AdminManageReviewSchedules />
                    </ProtectedRoute>
                } />
                <Route path="/admin/view-attendance" element={
                    <ProtectedRoute allowedRoles={['admin']}>
                        <AdminViewAttendance />
                    </ProtectedRoute>
                } />
                <Route path="/coordinator-dashboard/*" element={
                    <ProtectedRoute allowedRoles={['coordinator']}>
                        <CoordinatorDashboard />
                    </ProtectedRoute>
                } />
                {/* Document routes moved to coordinator dashboard */}

                {/* Coordinator Live Letter Editor (frontend-only) */}
                <Route path="/coordinator/letters/live" element={
                    <ProtectedRoute allowedRoles={['coordinator']}>
                        <CoordinatorLetterLiveEditorCK />
                    </ProtectedRoute>
                } />

                <Route path="/faculty-dashboard" element={<FacultyDashboard />} />
                <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
        </Router>
  );
};

export default App;
