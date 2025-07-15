import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';

// Route imports
import recipeRoutes from './Routes/recipeRoutes.js';
import AuthRoutes from './Routes/AuthRoutes.js';
import mealPlanRoutes from './Routes/mealPlanRoutes.js';
import AirecipeRoutes from './Routes/Aireciperoutes.js';



// MongoDB connection
import connectDB from './config/mongodb.js';
dotenv.config();
connectDB();

const app = express();
const PORT = process.env.PORT || 5000;

// Enable CORS
app.use(cors({
  origin: [
  'http://localhost:5173', // For local development
    'https://smart-culinary-companion-frontend-4.onrender.com' // For production
  ],
  
  credentials: true,
}));

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));


const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
app.use('/images', express.static(path.join(__dirname, 'public/images')));



// Routes
app.use('/auth', AuthRoutes);
app.use('/api/recipes', recipeRoutes);
app.use('/api/mealplanner', mealPlanRoutes);
app.use('/api/generated', AirecipeRoutes); 


// Root check route
app.get('/', (req, res) => {
  res.send('✅ Backend server is running!');
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});



