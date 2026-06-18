const express  = require('express');
const router   = express.Router();
const { authenticate, authorize } = require('../middlewares/auth');
const { logoUpload } = require('../middlewares/upload');
const ctrl     = require('../controllers/companyController');

router.use(authenticate, authorize('company'));

router.get('/profile',  ctrl.getProfile);
router.put('/profile',  ctrl.updateProfile);
router.post('/logo',    logoUpload.single('logo'), ctrl.uploadLogo);

router.get('/jobs',              ctrl.listJobs);
router.post('/jobs',             ctrl.createJob);
router.get('/jobs/:id',          ctrl.getJobDetail);
router.put('/jobs/:id',          ctrl.updateJob);
router.delete('/jobs/:id',       ctrl.deleteJob);
router.get('/jobs/:id/applicants', ctrl.getApplicants);

router.patch('/applications/:id/status', ctrl.updateApplicationStatus);

router.get('/skills', ctrl.getSkills);
router.get('/candidates/:candidateId', ctrl.getCandidateProfile);

module.exports = router;
