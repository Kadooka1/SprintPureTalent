const express          = require('express');
const router           = express.Router();
const { authenticate, authorize } = require('../middlewares/auth');
const { avatarUpload } = require('../middlewares/upload');
const ctrl             = require('../controllers/candidateController');
const jobCtrl          = require('../controllers/jobController');

router.use(authenticate, authorize('candidate'));

router.get('/profile',             ctrl.getProfile);
router.put('/profile',             ctrl.updateProfile);
router.post('/avatar',             avatarUpload.single('avatar'), ctrl.uploadAvatar);

router.post('/education',          ctrl.addEducation);
router.put('/education/:id',       ctrl.updateEducation);
router.delete('/education/:id',    ctrl.deleteEducation);

router.post('/experience',         ctrl.addExperience);
router.put('/experience/:id',      ctrl.updateExperience);
router.delete('/experience/:id',   ctrl.deleteExperience);

router.get('/applications',        jobCtrl.getApplications);
router.get('/applications/count',  jobCtrl.getApplicationCount);

router.delete('/account',          ctrl.deleteAccount);

module.exports = router;
