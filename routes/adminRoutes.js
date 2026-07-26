import express from 'express';
import { admin, protect } from '../middleware/authMiddleware.js';
import { 
  getPlatformStats, 
  getAllPlatformTrips, 
  adminDeleteTrip,
  getAllUsers,
  adminDeleteUser,
  getAllPayments,
  adminCreateTrip,        
  adminEditTrip,          
  adminAllotSeat,         
  adminToggleUserAccess   
} from '../controllers/adminController.js';

const router = express.Router();

// Twin Guard Structural Firewall Layer Insertion
router.use(protect);
router.use(admin);

// --- User Governance Portal ---
router.get('/users', getAllUsers);
router.delete('/users/:id', adminDeleteUser);
router.patch('/users/:id/toggle-access', adminToggleUserAccess);

// --- Package Control & Inventory Matrix ---
router.post('/trips', adminCreateTrip);
router.put('/trips/:id', adminEditTrip);
router.post('/trips/:id/allot-seat', adminAllotSeat);
router.delete('/trips/:id', adminDeleteTrip);
router.get('/trips', getAllPlatformTrips);

// --- Analytics & Financial Auditing ---
router.get('/dashboard-stats', getPlatformStats);
router.get('/payments', getAllPayments);

export default router;