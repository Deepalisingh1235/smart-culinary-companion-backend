import mongoose from 'mongoose';

const MealPlanSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  goal: { type: String, required: true },
  weight: { type: Number, required: true },
  height: { type: Number, required: true },
  duration: { type: Number, required: true },  
  startDate: { type: Date, required: true },
  age: { type: Number },
  gender: { type: String },
  activity: { type: String },
  dietType: { type: String },
  allergies: { type: String },
  healthIssues: { type: String },

  plan: { type: Array, required: true },         
  nutritionTips: { type: Array, default: [] },    

  savedBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  likedBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  likes: { type: Number, default: 0 },

}, { timestamps: true });

const MealPlan = mongoose.model('MealPlan', MealPlanSchema);
export default MealPlan;


