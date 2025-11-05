const express = require('express');
const router = express.Router();
const guideController = require('../controllers/guideController');
const auth = require('../middleware/auth');
const authorize = require('../middleware/authorize');

// Guide-specific routes (allow both guide and admin)
router.get('/team-requests', auth, authorize(['guide', 'admin']), guideController.getGuideRequests);
router.post('/team-requests/accept', auth, authorize(['guide', 'admin']), guideController.acceptRequest);
router.post('/team-requests/reject', auth, authorize(['guide', 'admin']), guideController.rejectRequest);

// Review functionality routes (allow both guide and admin)
router.get('/approved-teams', auth, authorize(['guide', 'admin']), guideController.getApprovedTeams);
router.post('/request-timetable', auth, authorize(['guide', 'admin']), guideController.requestTimeTable);

// Availability routes (allow both guide and admin)
router.get('/availability', auth, authorize(['guide', 'admin']), guideController.getGuideAvailability);
router.post('/availability', auth, authorize(['guide', 'admin']), guideController.submitGuideAvailability);

// New route to get review schedules for a guide (allow both guide and admin)
router.get('/review-schedules', auth, authorize(['guide', 'admin']), guideController.getGuideReviewSchedules);

// New route for fetching public guide selection dates
router.get('/selection-dates', auth, guideController.getGuideSelectionDatesPublic);

// New route for getting assigned teams
router.get('/assigned-teams', auth, guideController.getAssignedTeams);

// New route for getting review period dates
router.get('/review-period-dates', auth, guideController.getReviewPeriodDatesPublic);

// New route for getting daily attendance
router.get('/daily-attendance', auth, guideController.getDailyAttendance);

// New route for uploading attendance
router.post('/upload-attendance', auth, guideController.uploadAttendance);

// New route for submitting marks (allow both guide and admin)
router.post('/marks', auth, authorize(['guide', 'admin']), guideController.submitMarks);

// New route for getting marks (allow both guide and admin)
router.get('/marks', auth, authorize(['guide', 'admin']), guideController.getMarks);

// Final report routes (allow both guide and admin)
router.get('/reports', auth, authorize(['guide', 'admin']), guideController.getReportsForGuide);
router.put('/reports/:reportId/approve', auth, authorize(['guide', 'admin']), guideController.approveReport);
router.get('/reports/:reportId/download', auth, authorize(['guide', 'admin']), guideController.downloadReport);

module.exports = router; 