const express = require('express');
const router = express.Router();
const externalExaminerController = require('../controllers/externalExaminerController');

// External Examiner Document Routes

// GET /api/external-examiner/structure - Get template structure for form generation
router.get('/structure', externalExaminerController.getTemplateStructure);

// GET /api/external-examiner/sample-data - Get sample data for testing
router.get('/sample-data', externalExaminerController.getSampleData);

// GET /api/external-examiner/status - Check if template is ready
router.get('/status', externalExaminerController.checkTemplateStatus);

// GET /api/external-examiner/guide - Get template preparation guide
router.get('/guide', externalExaminerController.getPreparationGuide);

// POST /api/external-examiner/generate - Generate document
router.post('/generate', externalExaminerController.generateDocument);

module.exports = router;
