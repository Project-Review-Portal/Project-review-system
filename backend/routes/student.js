const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const authorize = require('../middleware/authorize');
const studentController = require('../controllers/studentController');

router.get('/review-schedule', auth, authorize(['student']), studentController.getReviewSchedule);
// Fetch instructions route using a query parameter
router.get('/get-instructions-template', auth,authorize(['student']), studentController.getInstructionTemplate);
// Download file route using a path parameter
router.get('/download-template/:templateId', auth,authorize(['student']), studentController.downloadTemplateFile);
module.exports = router; 