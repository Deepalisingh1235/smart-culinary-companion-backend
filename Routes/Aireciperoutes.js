import express from 'express';
import {
  getAllRecipes,
  generateFullDetailsFromId,
  toggleLikeRecipe,
 
} from '../controllers/AirecipeController.js';

const router = express.Router();

router.get('/all', getAllRecipes);
router.get('/static-full/:id', generateFullDetailsFromId);

router.patch('/:id/toggle-like', toggleLikeRecipe);

export default router;
