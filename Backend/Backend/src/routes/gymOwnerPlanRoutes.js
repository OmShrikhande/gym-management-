import express from 'express';
import * as gymOwnerPlanController from '../controllers/gymOwnerPlanController.js';
import { protect, restrictTo } from '../middleware/authMiddleware.js';

const router = express.Router();

// Protect all routes
router.use(protect);

// Routes for gym owners (keeping only used endpoints)
router.get('/', restrictTo('gym-owner'), gymOwnerPlanController.getGymOwnerPlans);
router.get('/default', restrictTo('gym-owner'), gymOwnerPlanController.getOrCreateDefaultPlans);
router.post('/', restrictTo('gym-owner'), gymOwnerPlanController.createGymOwnerPlan);
// Additional CRUD routes
router.get('/:id', restrictTo('gym-owner'), gymOwnerPlanController.getGymOwnerPlan);
router.patch('/:id', restrictTo('gym-owner'), gymOwnerPlanController.updateGymOwnerPlan);
router.delete('/:id', restrictTo('gym-owner'), gymOwnerPlanController.deleteGymOwnerPlan);

export default router;