const express = require('express');
const router = express.Router();
const DocumentController = require('../controllers/documentController');
const auth = require('../middleware/auth');
const authorize = require('../middleware/authorize');
const TemplatePreparator = require('../utils/templatePreparator');

// Create an instance of the DocumentController
const documentController = new DocumentController();

// Get all available templates - coordinator only
router.get('/templates', auth, authorize(['coordinator']), documentController.getTemplates.bind(documentController));

// Get template structure for form generation - coordinator only
router.get('/templates/:templateId/structure', auth, authorize(['coordinator']), documentController.getTemplateStructure.bind(documentController));

// Auto-detect template structure from document - coordinator only
router.get('/templates/:templateId/auto-detect', auth, authorize(['coordinator']), documentController.autoDetectStructure.bind(documentController));

// Preview template variables - coordinator only
router.get('/templates/:templateId/preview', auth, authorize(['coordinator']), documentController.previewTemplate.bind(documentController));

// Generate document from template - coordinator only
router.post('/generate', auth, authorize(['coordinator']), documentController.generateDocument.bind(documentController));

// Get preparation guide for a template - coordinator only
router.get('/templates/:templateId/guide', auth, authorize(['coordinator']), (req, res) => {
    try {
        const { templateId } = req.params;
        const preparator = new TemplatePreparator();
        const guide = preparator.generatePreparationGuide(`${templateId}.docx`);
        
        res.json({
            success: true,
            templateId,
            guide
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error generating guide'
        });
    }
});

// Get sample data for testing a template - coordinator only
router.get('/templates/:templateId/sample-data', auth, authorize(['coordinator']), (req, res) => {
    try {
        const { templateId } = req.params;
        const preparator = new TemplatePreparator();
        const sampleData = preparator.createSampleData(templateId);
        
        res.json({
            success: true,
            templateId,
            sampleData
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error generating sample data'
        });
    }
});

module.exports = router;
