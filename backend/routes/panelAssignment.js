const express = require('express');
const router = express.Router();
const panelAssignmentController = require('../controllers/panelAssignmentController');
const auth = require('../middleware/auth');

// Get all panel assignments
router.get('/', auth, panelAssignmentController.getAllAssignments);

// Get all panels and teams for assignment
router.get('/panels-teams', auth, panelAssignmentController.getPanelsAndTeams);

// Create panel assignments
router.post('/', auth, panelAssignmentController.createAssignments);

// Manual team-panel assignment routes
router.get('/unassigned-teams', auth, panelAssignmentController.getUnassignedTeams);
router.get('/available-panels/:teamId', auth, panelAssignmentController.getAvailablePanelsForTeam);
router.post('/assign-panel', auth, panelAssignmentController.assignPanelToTeam);
router.post('/remove-panel', auth, panelAssignmentController.removePanelFromTeam);
// Auto-assign unassigned teams to panels with fewest load avoiding guide conflicts
router.post('/auto-assign', auth, panelAssignmentController.autoAssignPanels);

module.exports = router; 