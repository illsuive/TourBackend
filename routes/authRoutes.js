import express from 'express';
import { 
  registerUser, 
  loginUser, 
  logoutUser,
  forgotPassword, 
  resendOtp, 
  resetPassword ,
  getMe
} from '../controllers/authController.js';

import {protect} from '../middleware/authMiddleware.js'

const router = express.Router();

router.post('/signup', registerUser);
router.post('/login', loginUser);
router.post('/logout', logoutUser);
router.post('/forgot-password', forgotPassword);
router.post('/resend-otp', resendOtp);
router.post('/reset-password', resetPassword);
router.get('/me', protect, getMe);

export default router;