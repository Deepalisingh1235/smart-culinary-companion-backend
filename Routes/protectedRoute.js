import express from 'express';
import ensureAuthenticated from '../Middlewares/ensureAuth.js';

const router = express.Router();


router.get('/profile', ensureAuthenticated, (req, res) => {
  res.json({
    success: true,
    message: 'Access granted to protected route',
    user: req.user  
  });
});

export default router;
