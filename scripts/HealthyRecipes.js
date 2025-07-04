import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();


const recipeSchema = new mongoose.Schema({
  title: String,
  description: String,
  imageUrl: String,
});

const Recipe = mongoose.model('HealthyRecipes', recipeSchema); 


const recipes = [
  {
    title: "Avocado Egg Salad",
    description: "Creamy avocado mixed with boiled eggs for a protein-rich salad.",
    imageUrl: "/images/avocado-egg-salad.jpg"
  },
  {
    title: "Grilled Chicken Salad",
    description: "Tender grilled chicken served over leafy greens and avocado.",
    imageUrl: "/images/grilled-chicken-salad-recipe.jpg"
  },
  {
    title: "Lentil Soup",
    description: "Hearty and fiber-rich soup made with red lentils and veggies.",
    imageUrl: "/images/lentil-soup-2.jpg"
  },
  {
    title: "Oats Banana Pancakes",
    description: "Wholesome pancakes made with oats, bananas, and no sugar.",
    imageUrl: "/images/banana-oatmeal-pancakes.jpg"
  },
  {
    title: "Chickpea Stir Fry",
    description: "Quick and healthy stir fry with chickpeas, bell peppers, and herbs.",
    imageUrl: "/images/checkpea-stir-fry.jpg"
  },
  {
    title: "Avocado Toast",
    description: "Whole grain toast topped with smashed avocado and spices.",
    imageUrl: "/images/avocado-toast-11.jpg"
  },
  {
    title: "Zucchini Noodles",
    description: "Low-carb zucchini noodles tossed with tomato basil sauce.",
    imageUrl: "/images/Asian-Zucchini-Noodles.jpg"
  },
  {
    title: "Chilla with Coconut",
    description: "Savory gram flour pancake topped with fresh coconut.",
    imageUrl: "/images/chilla-with-coconut.jpg"
  },
  {
    title: "Cauliflower Pizza Crust",
    description: "Healthy, low-carb pizza base made from cauliflower.",
    imageUrl: "/images/Cauliflower-Pizza-Crust-low-carb.webp"
  },
  {
    title: "Paneer Lettuce Wraps",
    description: "Spiced paneer wrapped in crunchy lettuce leaves.",
    imageUrl: "/images/paneer-lettuce-wraps-low-carb.jpg"
  },
  {
  title: "Grilled Tandoori Chicken Skewers",
  description: "Lean chicken marinated in tandoori spices, grilled to perfection for a high-protein meal.",
  imageUrl: "/images/grilled-tandoori-chicken-skewers.jpg"
},
{
  title: "Chia Yogurt Parfait",
  description: "Layered Greek yogurt with chia seeds, berries, and nuts — a nutritious and fiber-rich breakfast.",
  imageUrl: "/images/chia-yogurt-parfait.jpg"
}

];

async function insertRecipes() {
  try {
    await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    await Recipe.deleteMany(); 
    await Recipe.insertMany(recipes);
    console.log('✅ Healthy recipes inserted successfully!');
    process.exit();
  } catch (err) {
    console.error('❌ Insert failed:', err);
    process.exit(1);
  }
}

insertRecipes();
