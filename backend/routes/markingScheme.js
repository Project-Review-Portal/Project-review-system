const express = require('express');
const router = express.Router();
const markingSchemeController = require('../controllers/markingSchemeController');
const auth = require('../middleware/auth');
const authorize = require('../middleware/authorize');

// Coordinator-only: get their coordinated panels (for the dropdown)
router.get(
    '/coordinator/my-panels',
    auth,
    authorize(['coordinator', 'assistant coordinator']),
    markingSchemeController.getMyPanels
);

// Coordinator-only: fetch a scheme
router.get(
    '/coordinator',
    auth,
    authorize(['coordinator', 'assistant coordinator']),
    markingSchemeController.getSchemeForCoordinator
);

// Coordinator-only: save / upsert a scheme
router.post(
    '/coordinator',
    auth,
    authorize(['coordinator', 'assistant coordinator']),
    markingSchemeController.saveSchemeForCoordinator
);

// Any authenticated user (guide, panel member, etc.): read a scheme
router.get(
    '/for-panel',
    auth,
    markingSchemeController.getSchemePublic
);

module.exports = router;
