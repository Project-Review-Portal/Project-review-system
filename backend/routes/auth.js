const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const auth = require('../middleware/auth');
const authorize = require('../middleware/authorize');

router.post('/login', authController.login);
router.post('/register-panel', authController.registerPanel);
router.post('/reset-password', auth, authController.resetPassword);
router.get('/faculty', auth, authController.getFaculty);
router.get('/profile', auth, authController.getProfile);
router.get('/users', auth, authorize(['admin']), authController.getAllUsers);

// Forgot-password OTP flow (public)
router.post('/forgot-password', authController.forgotPassword);
router.post('/verify-otp', authController.verifyOtp);
router.post('/reset-password-otp', authController.resetPasswordOtp);

module.exports = router;