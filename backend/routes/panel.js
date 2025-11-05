const express = require('express');
const router = express.Router();
const panelController = require('../controllers/panelController');
const auth = require('../middleware/auth');
const authorize = require('../middleware/authorize');
const attendanceController = require('../controllers/attendanceController');

// Admin-only routes for panel management
router.get('/', auth, authorize(['admin']), panelController.getAllPanels);
router.post('/', auth, authorize(['admin']), panelController.createPanel);
router.put('/:id', auth, authorize(['admin']), panelController.updatePanel);
router.delete('/:id', auth, authorize(['admin']), panelController.deletePanel);

// Panel member routes (allow panel, guide, coordinator, and admin)
router.get('/assigned-teams', auth, authorize(['panel', 'guide', 'coordinator', 'admin']), panelController.getAssignedTeamsForPanel);

// Debug assigned data for a user (panels and teams resolution)
router.get('/debug-assigned', auth, authorize(['panel', 'guide', 'coordinator', 'admin']), panelController.debugAssignedData);

// Temporary route for testing - bypasses database issues
router.get('/assigned-teams-test', (req, res) => {
    console.log('Test route called - no auth required');
    res.json({ message: 'Test route working - database connection issue bypassed', teams: [] });
});

// Debug route to check token details
router.get('/debug-token', (req, res) => {
    console.log('🔍 Debug token route called');
    console.log('🔍 Headers:', req.headers);
    console.log('🔍 Authorization header:', req.headers.authorization);
    
    if (req.headers.authorization) {
        const token = req.headers.authorization.replace('Bearer ', '');
        console.log('🔍 Token length:', token.length);
        console.log('🔍 Token preview:', token.substring(0, 50) + '...');
        
        try {
            const jwt = require('jsonwebtoken');
            const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-here-change-in-production';
            const decoded = jwt.verify(token, JWT_SECRET);
            console.log('🔍 Decoded token:', decoded);
            
            res.json({ 
                message: 'Token debug info',
                tokenLength: token.length,
                tokenPreview: token.substring(0, 50) + '...',
                decoded: decoded,
                isValid: true
            });
        } catch (error) {
            console.error('❌ Token verification failed:', error.message);
            res.json({ 
                message: 'Token verification failed',
                error: error.message,
                isValid: false
            });
        }
    } else {
        res.json({ message: 'No authorization header provided' });
    }
});

// Review schedules for panel members (allow panel, guide, and admin)
router.get('/review-schedules', auth, authorize(['panel', 'guide', 'admin']), panelController.getPanelReviewSchedules);

// Availability routes for panel members (allow panel, guide, and admin)
router.get('/availability', auth, authorize(['panel', 'guide', 'admin']), panelController.getPanelAvailability);
router.post('/availability', auth, authorize(['panel', 'guide', 'admin']), panelController.submitPanelAvailability);

// New route for fetching public review period dates
router.get('/review-period-dates', auth, panelController.getReviewPeriodDatesPublic);

// New route for submitting marks (allow panel, guide, and admin)
router.post('/marks', auth, authorize(['panel', 'guide', 'admin']), panelController.submitMarks);

// New route for getting marks (allow panel, guide, and admin)
router.get('/marks', auth, authorize(['panel', 'guide', 'admin']), panelController.getMarks);

// Coordinator scheduling routes (allow both coordinator and admin)
router.post('/coordinator/generate-slots', auth, authorize(['coordinator', 'admin']), panelController.generateSlotsForCoordinator);
router.post('/coordinator/assign-slots', auth, authorize(['coordinator', 'admin']), panelController.assignSlotsForCoordinator);
router.get('/coordinator/allotted-schedules', auth, authorize(['coordinator', 'admin']), panelController.getAllottedSchedulesForCoordinator);
// Allow coordinator (or admin) to delete an allotted schedule they created
router.delete('/coordinator/allotted-schedules/:scheduleId', auth, authorize(['coordinator', 'admin']), panelController.deleteAllottedSchedule);

// Debug route for coordinators to check their panel assignment
router.get('/coordinator/panel-status', auth, authorize(['coordinator', 'admin']), async (req, res) => {
    try {
        const coordinatorId = req.user.id;
        const Panel = require('../models/Panel');
        const Team = require('../models/Team');
        
        const panel = await Panel.findOne({ coordinator: coordinatorId })
            .populate('members', 'username name')
            .populate('coordinator', 'username name');
        
        if (!panel) {
            return res.json({
                hasPanel: false,
                message: 'No panel assigned to this coordinator',
                coordinatorId: coordinatorId
            });
        }
        
        const teams = await Team.find({ panel: panel._id })
            .populate('teamLeader', 'username name')
            .populate('members', 'username name')
            .populate('guidePreference', 'username name');
        
        res.json({
            hasPanel: true,
            panel: panel,
            teams: teams,
            coordinatorId: coordinatorId
        });
    } catch (error) {
        console.error('Error checking coordinator panel status:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Debug route to check coordinator authorization
router.get('/coordinator/debug-auth', auth, (req, res) => {
    res.json({
        message: 'Authorization successful',
        user: {
            id: req.user.id,
            username: req.user.username,
            role: req.user.role,
            roles: req.user.roles
        }
    });
});

// Debug: see resolved panels and teams for current user
router.get('/debug-assigned', auth, authorize(['panel','guide','coordinator','admin']), panelController.debugAssignedData);

// New route for checking attendance
router.post('/attendance/check', auth, attendanceController.checkAttendanceForTeams);

// New route for checking schedule existence
router.post('/check-schedule-exists', auth, attendanceController.checkPreviousScheduleExists);

module.exports = router; 