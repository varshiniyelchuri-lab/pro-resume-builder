const express = require('express');
const router = express.Router();
const auth = require('../middleware/authMiddleware');
const resumeController = require('../controllers/resumeController');

router.get('/', auth, resumeController.getResumes);
router.get('/:id', auth, resumeController.getResumeById);
router.post('/', auth, resumeController.createResume);
router.put('/:id', auth, resumeController.updateResume);
router.delete('/:id', auth, resumeController.deleteResume);

module.exports = router;
