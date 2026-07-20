const express = require('express');
const router = express.Router();
const externalExaminerController = require('../controllers/externalExaminerController');
const auth = require('../middleware/auth');

// External Examiner Document Routes

// GET /api/external-examiner/structure - Get template structure for form generation
router.get('/structure', auth, externalExaminerController.getTemplateStructure);

// GET /api/external-examiner/sample-data - Get sample data for testing
router.get('/sample-data', auth, externalExaminerController.getSampleData);

// GET /api/external-examiner/status - Check if template is ready
router.get('/status', auth, externalExaminerController.checkTemplateStatus);

// GET /api/external-examiner/guide - Get template preparation guide
router.get('/guide', auth, externalExaminerController.getPreparationGuide);

// POST /api/external-examiner/generate - Generate document
router.post('/generate', auth, externalExaminerController.generateDocument);

module.exports = router;
