import express from 'express';
import {
  generateMealPlan,
  toggleSaveMealPlan,
  getSavedMealPlans,
  toggleLikeMealPlan,
  deleteMealPlan,
  
} from '../controllers/mealPlanController.js';
import { protect } from '../Middlewares/Authmiddleware.js';

const router = express.Router();


router.post('/generate', generateMealPlan);


router.post('/save', protect, toggleSaveMealPlan);


router.get('/saved', protect, getSavedMealPlans);


router.post('/like', protect, toggleLikeMealPlan);

router.delete('/delete/:id', protect, deleteMealPlan);

export default router;
