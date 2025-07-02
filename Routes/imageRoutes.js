import express from 'express';
import upload from '../middleware/upload.js';
import HealthyRecipes from '../models/HealthyRecipes.js';

const router = express.Router();


router.post('/upload', upload.single('image'), async (req, res) => {
  try {
    const { title, description } = req.body;
    const imageUrl = `/images/${req.file.filename}`;

    const recipe = new HealthyRecipes({
      title,
      description,
      imageUrl
    });

    await recipe.save();
    res.status(201).json({ success: true, data: recipe });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Upload failed' });
  }
});

export default router;
