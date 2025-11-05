const express = require('express');
const router = express.Router();
const internalExaminerController = require('../controllers/internalExaminerController');
const { authenticate } = require('../middleware/auth');

// Internal Examiner Document Routes
router.get('/structure', authenticate, internalExaminerController.getTemplateStructure);
router.get('/sample-data', authenticate, internalExaminerController.getSampleData);
router.get('/guide', authenticate, internalExaminerController.getPreparationGuide);
router.get('/status', authenticate, internalExaminerController.checkTemplateStatus);
router.post('/generate', authenticate, internalExaminerController.generateDocument);

module.exports = router;
