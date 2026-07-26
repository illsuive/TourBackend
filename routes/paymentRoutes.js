import express from 'express';
import { protect } from '../middleware/authMiddleware.js';
import { 
  initializeCheckout, 
  verifyPaymentTransaction, 
  getUserPaymentHistory 
} from '../controllers/paymentController.js';

const router = express.Router();

router.use(protect);

router.post('/checkout', initializeCheckout);
router.post('/verify', verifyPaymentTransaction);
router.get('/history', getUserPaymentHistory);

export default router;