import express from 'express';
import { protect } from '../middleware/authMiddleware.js';
import { 
  createTrip, 
  getUserTrips, 
  getTripById, 
  modifyManualActivity, 
  regenerateDay,
  createAICoreTripPackage ,
  initializePackagePayment,
  verifyPackagePayment,
} from '../controllers/tripController.js';

const router = express.Router();

router.use(protect);

router.get('/', getUserTrips);
router.get('/:id', getTripById);

router.post('/generate', createAICoreTripPackage); 
router.post('/:id/payment', initializePackagePayment);
router.post('/:id/payment/verify', verifyPackagePayment);

router.post('/', createTrip);
router.put('/:id/activity', modifyManualActivity);
router.post('/:id/regenerate-day', regenerateDay);

export default router;