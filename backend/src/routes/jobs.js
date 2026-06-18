const express  = require('express');
const router   = express.Router();
const { authenticate, authorize } = require('../middlewares/auth');
const ctrl     = require('../controllers/jobController');

// Rotas públicas
router.get('/',    ctrl.listJobs);
router.get('/:id', ctrl.getJob);

// Candidatura — requer candidato autenticado
router.post('/:id/apply', authenticate, authorize('candidate'), ctrl.applyJob);

module.exports = router;
