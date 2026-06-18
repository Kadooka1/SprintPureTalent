const express       = require('express');
const router        = express.Router();
const authController = require('../controllers/authController');
const rateLimitLogin = require('../middlewares/rateLimit');

router.post('/register/candidate', authController.registerCandidate);
router.post('/register/company',   authController.registerCompany);
router.post('/login',              rateLimitLogin, authController.login);
router.post('/logout',             authController.logout);
router.post('/refresh',            authController.refreshToken);
router.get( '/verify-email/:token', authController.verifyEmail);
router.post('/forgot-password',    authController.forgotPassword);
router.post('/reset-password/:token', authController.resetPassword);

module.exports = router;
