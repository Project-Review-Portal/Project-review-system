const express = require('express');
const router = express.Router();
const internalExaminerController = require('../controllers/internalExaminerController');
const auth = require('../middleware/auth');

// Internal Examiner Document Routes
router.get('/structure', auth, internalExaminerController.getTemplateStructure);
router.get('/sample-data', auth, internalExaminerController.getSampleData);
router.get('/guide', auth, internalExaminerController.getPreparationGuide);
router.get('/status', auth, internalExaminerController.checkTemplateStatus);
router.post('/generate', auth, internalExaminerController.generateDocument);

module.exports = router;
