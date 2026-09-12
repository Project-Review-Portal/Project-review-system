const express = require('express');
const router = express.Router();
const sessionController = require('../controllers/sessionController');
const auth = require('../middleware/auth');
const authorize = require('../middleware/authorize');

// Public/Authenticated list of sessions & current session resolution
router.get('/', auth, sessionController.getAllSessions);
router.get('/current', auth, sessionController.getCurrentSession);

// Admin-only session management
router.post('/', auth, authorize(['admin']), sessionController.createSession);
router.put('/:id', auth, authorize(['admin']), sessionController.updateSession);
router.delete('/:id', auth, authorize(['admin']), sessionController.deleteSession);
router.patch('/:id/toggle-status', auth, authorize(['admin']), sessionController.toggleSessionStatus);
router.post('/rollover-ug', auth, authorize(['admin']), sessionController.rolloverUgData);

module.exports = router;
