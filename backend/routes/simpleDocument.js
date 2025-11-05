const express = require('express');
const router = express.Router();
const SimpleDocumentController = require('../controllers/simpleDocumentController');
const auth = require('../middleware/auth');
const authorize = require('../middleware/authorize');

const controller = new SimpleDocumentController();

// Protect all document routes
router.use(auth);
// Authorize coordinator role for all routes in this file
router.use(authorize(['coordinator']));


// Get list of available templates
router.get('/templates', (req, res) => {
    console.log('Templates route called by user:', req.user.username);
    controller.getTemplates(req, res);
});

// Get structure for a specific template
router.get('/templates/:templateId/structure', (req, res) => {
    console.log(`Template structure route called for: ${req.params.templateId}`);
    controller.getTemplateStructure(req, res);
});

// Generate a document
router.post('/generate', (req, res) => {
    console.log('Generate document route called');
    controller.generateDocument(req, res);
});

module.exports = router;
