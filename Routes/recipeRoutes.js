import express from 'express';
import { protect } from '../Middlewares/Authmiddleware.js';
import {
  smartRecipeFlow,
  toggleSaveRecipe,
  getSavedRecipes,
  deleteRecipe,
  toggleLikeRecipe,
} from '../controllers/RecipeController.js';

const router = express.Router();


router.post('/smart', smartRecipeFlow);



router.get('/saved', protect, getSavedRecipes);
router.post('/toggle-save', protect, toggleSaveRecipe);

router.post('/toggle-like', protect, toggleLikeRecipe);
router.delete('/delete/:id', protect, deleteRecipe);


export default router;













