const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController')
const { authenticateToken } = require('../middleware/tokenVerification');
/**
 * @route  POST /api/auth/login/
 * @desc   Route requests straight to the controller
*/

router.post('/login', authController.login);
router.post('/logout', authController.logout);
router.post('/register', authController.register);
router.post('/forgotPassword', authController.forgotPassword);
router.post('/resetPassword', authController.resetPassword);
router.get('/verifyEmail', authController.verifyEmail);
router.get('/me', authenticateToken, authController.me);
router.get('/checkUsername', authenticateToken, authController.checkUsername);
router.put('/profile', authenticateToken, authController.profile); 
router.put('/account', authenticateToken, authController.account); 
router.delete('/account', authenticateToken, authController.deleteAccount);
router.post('/resendEmailVerification', authController.resendEmailVerification);

module.exports = router;