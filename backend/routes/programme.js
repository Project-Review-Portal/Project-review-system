const express = require('express');
const router = express.Router();
const programmeController = require('../controllers/programmeController');
const auth = require('../middleware/auth');
const authorize = require('../middleware/authorize');

router.get('/', auth, authorize(['admin']), programmeController.getAllProgrammes);
router.post('/', auth, authorize(['admin']), programmeController.addProgramme);
router.post('/bulk', auth, authorize(['admin']), programmeController.bulkAddProgrammes);
router.put('/:id', auth, authorize(['admin']), programmeController.updateProgramme);
router.delete('/:id', auth, authorize(['admin']), programmeController.deleteProgramme);

module.exports = router;
