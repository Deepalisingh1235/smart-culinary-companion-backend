import express from 'express';
import {
  signup,
  login,
  verifyToken,
  getProfile,
  logout,
} from '../controllers/AuthController.js';
import { protect } from '../Middlewares/Authmiddleware.js';

const router = express.Router();

router.post('/signup', signup);
router.post('/login', login);
router.get('/verify', verifyToken); 
router.get('/profile', protect, getProfile); 
router.post('/logout', logout); 

export default router;
