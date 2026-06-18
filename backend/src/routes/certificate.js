const express                     = require('express');
const router                      = express.Router();
const { authenticate, authorize } = require('../middlewares/auth');
const { certificateUpload }       = require('../middlewares/upload');
const ctrl                        = require('../controllers/certificateController');

router.use(authenticate, authorize('candidate'));

router.post('/certificates',                      certificateUpload.single('certificate'), ctrl.upload);
router.get('/certificates',                      ctrl.list);
router.delete('/certificates/:id',               ctrl.remove);
router.post('/certificates/:id/reprocess-skills', ctrl.reprocessSkills);
router.get('/skills',                            ctrl.getSkills);

module.exports = router;
