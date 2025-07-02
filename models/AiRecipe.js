import mongoose from 'mongoose';

const HealthyRecipesSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: String,
  imageUrl: String,

  cookTime: String,
  servingSize: String,
  mealType: String,

  ingredients: [String],
  steps: [String],
  tags: [String],

  healthInfo: {
    calories: String,
    protein: String,
    fat: String,
    carbs: String,
    dietary: [String]
  },

  chefTip: String,
  servingTip: String,
  additionalInfo: String,

  likes: { type: Number, default: 0 },
   likedBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  savedBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
}, { timestamps: true });

const HealthyRecipes = mongoose.models.HealthyRecipes || mongoose.model('HealthyRecipes', HealthyRecipesSchema);
export default HealthyRecipes;