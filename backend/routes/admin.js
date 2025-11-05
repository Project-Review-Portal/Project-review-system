const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const auth = require('../middleware/auth');
const authorize = require('../middleware/authorize');

router.post('/team-size', auth, authorize(['admin']), adminController.setMaxTeamSize);
router.get('/team-size', auth, authorize(['admin']), adminController.getMaxTeamSize);

router.post('/guide-selection-dates', auth, authorize(['admin']), adminController.setGuideSelectionDates);
router.get('/guide-selection-dates', auth, authorize(['admin']), adminController.getGuideSelectionDates);

// Route to ensure team formation is always open
router.post('/ensure-team-formation-open', auth, authorize(['admin']), adminController.ensureTeamFormationOpen);

// Route to get unassigned coordinators
router.get('/unassigned-coordinators', auth, authorize(['admin']), adminController.getUnassignedCoordinators);

// New routes for global review period
router.post('/review-period-dates', auth, authorize(['admin']), adminController.setReviewPeriodDates);
router.get('/review-period-dates', auth, authorize(['admin']), adminController.getReviewPeriodDates);

router.get('/unassigned-teams', auth, authorize(['admin']), adminController.getUnassignedTeams);
router.get('/guides-with-team-counts', auth, authorize(['admin']), adminController.getGuidesWithTeamCounts);

router.get('/eligible-guides-for-team/:teamId', auth, authorize(['admin']), adminController.getEligibleGuidesForTeam);
router.post('/assign-guide', auth, authorize(['admin']), adminController.assignGuideToTeam);

router.post('/assign-all-unassigned-guides', auth, authorize(['admin']), adminController.assignAllUnassignedGuides);

router.post('/remove-guide', auth, authorize(['admin']), adminController.removeGuideFromTeam);

// New route for fetching attendance records
router.get('/attendance', auth, authorize(['admin']), adminController.getAttendanceRecords);

// New routes for Admin to manage review schedules
router.get('/review-schedules', auth, authorize(['admin']), adminController.getReviewSchedules);
router.post('/review-schedules', auth, authorize(['admin']), adminController.createReviewSchedule);
router.get('/panels-with-members', auth, authorize(['admin']), adminController.getAllPanels);
router.get('/teams', auth, authorize(['admin']), adminController.getAllTeams);
router.delete('/teams/:teamId', auth, authorize(['admin']), adminController.deleteTeam);

// New route for fetching all user availabilities (guide and panel)
router.get('/availabilities', auth, authorize(['admin']), adminController.getAllAvailabilities);

// New route for schedule generation
router.post('/generate-schedules', auth, authorize(['admin']), adminController.generateSchedules);

// New route for generating a single slot for a team
router.post('/generate-slot-for-team', auth, authorize(['admin']), adminController.generateSlotForTeam);

// New route to clear all schedules
router.delete('/clear-schedules', auth, authorize(['admin']), adminController.clearSchedules);

// New route to send schedule notification
router.post('/send-schedule-notification', auth, authorize(['admin']), adminController.sendScheduleNotification);

// New route for daily attendance records
router.get('/daily-attendance-records', auth, authorize(['admin']), adminController.getDailyAttendanceRecords);

// New route for assigned teams summary
router.get('/assigned-teams-summary', auth, authorize(['admin']), adminController.getAssignedTeamsSummary);

// User Management Routes
router.post('/upload-faculty', auth, authorize(['admin']), adminController.uploadFaculty);
router.post('/upload-students', auth, authorize(['admin']), adminController.uploadStudents);
router.put('/update-faculty/:facultyId', auth, authorize(['admin']), adminController.updateFaculty);
router.put('/update-student/:regno', auth, authorize(['admin']), adminController.updateStudent);
router.delete('/delete-faculty/:facultyId', auth, authorize(['admin']), adminController.deleteFaculty);
router.delete('/delete-student/:regno', auth, authorize(['admin']), adminController.deleteStudent);
router.delete('/delete-user/:userId', auth, authorize(['admin']), adminController.deleteUser);
router.get('/faculty-list', auth, authorize(['admin']), adminController.getAllFaculty);
router.get('/student-list', auth, authorize(['admin']), adminController.getAllStudents);

// Danger: Delete all teams and related assignments/schedules
router.delete('/teams', auth, authorize(['admin']), adminController.deleteAllTeams);
router.delete('/solo-teams', auth, authorize(['admin']), adminController.deleteSoloTeams);
router.delete('/students', auth, authorize(['admin']), adminController.deleteAllStudents);
router.delete('/faculty', auth, authorize(['admin']), adminController.deleteAllFaculty);

module.exports = router; 