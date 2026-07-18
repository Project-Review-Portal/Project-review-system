const express = require('express');
const router = express.Router();
const materialController = require('../controllers/materialController');
const auth = require('../middleware/auth');
const authorize = require('../middleware/authorize');
const { materialUpload } = require('../middleware/upload');

// Setting Routes (Coordinator only)
router.get('/settings', auth, authorize(['coordinator', 'assistant coordinator']), materialController.getMaterialSettings);
router.post('/settings', auth, authorize(['coordinator']), materialController.createMaterialSetting);
router.put('/settings/:id', auth, authorize(['coordinator']), materialController.updateMaterialSetting);
router.delete('/settings/:id', auth, authorize(['coordinator']), materialController.deleteMaterialSetting);

// Student Routes
router.get('/student/requirements', auth, authorize(['student']), materialController.getStudentRequirements);
router.post('/student/upload/:settingId', auth, authorize(['student']), materialUpload, materialController.uploadMaterial);

// Guide / Coordinator Review Routes
router.get('/review/teams', auth, authorize(['coordinator', 'assistant coordinator', 'guide']), materialController.getTeamsMaterials);
router.put('/review/:uploadId/status', auth, authorize(['coordinator', 'guide']), materialController.updateUploadStatus);
router.get('/download/:uploadId', auth, authorize(['coordinator', 'assistant coordinator', 'guide', 'student']), materialController.downloadMaterial);

module.exports = router;
