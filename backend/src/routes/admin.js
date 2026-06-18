const router     = require('express').Router();
const { authenticate, authorize } = require('../middlewares/auth');
const ctrl = require('../controllers/adminController');

router.use(authenticate, authorize('admin'));

// Dashboard
router.get('/dashboard', ctrl.getDashboard);

// Usuários
router.get('/users',              ctrl.listUsers);
router.patch('/users/:id/toggle', ctrl.toggleUser);
router.delete('/users/:id',       ctrl.deleteUser);

// Empresas
router.get('/companies',                    ctrl.listCompanies);
router.patch('/companies/:id/toggle-verify', ctrl.toggleCompanyVerified);

// Vagas
router.get('/jobs',                ctrl.listJobs);
router.patch('/jobs/:id/moderate', ctrl.moderateJob);
router.delete('/jobs/:id',         ctrl.deleteJob);

// Certificados
router.get('/certificates',                ctrl.listCerts);
router.patch('/certificates/:id/moderate', ctrl.moderateCert);

// Logs de IA
router.get('/ai-logs',      ctrl.listAiLogs);
router.get('/ai-logs/:id',  ctrl.getAiLog);

module.exports = router;
