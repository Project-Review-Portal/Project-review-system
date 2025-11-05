const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const authorize = require('../middleware/authorize');
const studentController = require('../controllers/studentController');

router.get('/review-schedule', auth, authorize(['student']), studentController.getReviewSchedule);

module.exports = router; 