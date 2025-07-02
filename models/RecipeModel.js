import mongoose from 'mongoose';

const recipeSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  description: { type: String, trim: true },
  imageUrl: { type: String, trim: true },
  cookTime: { type: String, trim: true },
  servingSize: { type: String, trim: true },

  mealType: { type: String, trim: true },

  nutritionPref: { type: [String], default: [] },
  diet: { type: [String], default: [] },
  allergies: { type: [String], default: [] },
  ingredients: { type: [String], default: [] },
  steps: { type: [String], default: [] },

  healthInfo: {
    calories: { type: String, default: '' },
    protein: { type: String, default: '' },
    fat: { type: String, default: '' },
    carbs: { type: String, default: '' },
    dietary: { type: [String], default: [] },
  },

  chefTip: { type: String, default: '' },
  servingTip: { type: String, default: '' },
  additionalInfo: { type: String, default: '' },

  likes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],


  
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },

}, { timestamps: true });

export default mongoose.model('Recipe', recipeSchema);
