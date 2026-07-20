const express = require('express');
const router = express.Router();
const panelAssignmentController = require('../controllers/panelAssignmentController');
const auth = require('../middleware/auth');
const authorize = require('../middleware/authorize');

// Get all panel assignments
router.get('/', auth, authorize(['admin', 'coordinator']), panelAssignmentController.getAllAssignments);

// Get all panels and teams for assignment
router.get('/panels-teams', auth, authorize(['admin', 'coordinator']), panelAssignmentController.getPanelsAndTeams);

// Create panel assignments
router.post('/', auth, authorize(['admin', 'coordinator']), panelAssignmentController.createAssignments);

// Manual team-panel assignment routes
router.get('/unassigned-teams', auth, authorize(['admin', 'coordinator']), panelAssignmentController.getUnassignedTeams);
router.get('/available-panels/:teamId', auth, authorize(['admin', 'coordinator']), panelAssignmentController.getAvailablePanelsForTeam);
router.post('/assign-panel', auth, authorize(['admin', 'coordinator']), panelAssignmentController.assignPanelToTeam);
router.post('/remove-panel', auth, authorize(['admin', 'coordinator']), panelAssignmentController.removePanelFromTeam);
// Auto-assign unassigned teams to panels with fewest load avoiding guide conflicts
router.post('/auto-assign', auth, authorize(['admin', 'coordinator']), panelAssignmentController.autoAssignPanels);

module.exports = router; 