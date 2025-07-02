import mongoose from 'mongoose';

const HealthyRecipesSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String },
  imageUrl: { type: String },
  likes: { type: Number, default: 0 }, 

 
  cookTime: { type: String },
  servingSize: { type: String },
  mealType: { type: String },
  ingredients: [String],
  steps: [String],
  tags: [String],

  healthInfo: {
    calories: String,
    protein: String,
    fat: String,
    carbs: String,
    dietary: [String],
  },

  chefTip: String,
  servingTip: String,
  additionalInfo: String,

}, { timestamps: true });

const HealthyRecipes = mongoose.models.HealthyRecipes || mongoose.model('HealthyRecipes', HealthyRecipesSchema);
export default HealthyRecipes;
