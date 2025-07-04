import asyncHandler from 'express-async-handler';
import genAI from '../utils/gemini.js';
import MealPlan from '../models/MealPlan.js';
import User from '../models/user.js';

export const generateMealPlan = asyncHandler(async (req, res) => {
  const {
    goal,
    weight,
    height,
    duration,
    startDate,
    age,
    gender,
    activity,
    dietType,
    allergies,
    healthIssues,
  } = req.body;

  if (!goal || !weight || !height || !duration || !startDate) {
    return res.status(400).json({ success: false, message: 'Required fields are missing.' });
  }

  const model = genAI.getGenerativeModel({ model: 'models/gemini-2.5-flash' });

  const mealPlanPrompt = `
You are a smart AI dietician.
Generate a ${duration}-day Indian meal plan based on:
- Goal: ${goal}
- Weight: ${weight} kg
- Height: ${height} cm
- Start Date: ${startDate}
${age ? `- Age: ${age}` : ''}
${gender ? `- Gender: ${gender}` : ''}
${activity ? `- Activity Level: ${activity}` : ''}
${dietType ? `- Diet Type: ${dietType}` : ''}
${allergies ? `- Allergies: ${allergies}` : ''}
${healthIssues ? `- Health Issues: ${healthIssues}` : ''}


# IMPORTANT:
# If optional fields like Age, Gender, Activity Level, Diet Type, Allergies, or Health Issues are provided, 
# consider them carefully while generating the meal plan.
# If they are not provided, do not assume or fill default values for them.

Each day must include:
- Breakfast
- Lunch
- Dinner
- Snacks

Respond strictly in JSON format:
[
  {
    "day": "Day 1",
    "breakfast": "...",
    "lunch": "...",
    "dinner": "...",
    "snacks": "..."
  },
  ...
]
ONLY return valid JSON array. No markdown or extra text.
  `;

  const tipsPrompt = `
You are a smart nutritionist.
Based on the following inputs:
- Goal: ${goal}
- Weight: ${weight} kg
- Height: ${height} cm
${age ? `- Age: ${age}` : ''}
${gender ? `- Gender: ${gender}` : ''}
${activity ? `- Activity Level: ${activity}` : ''}
${dietType ? `- Diet Type: ${dietType}` : ''}
${allergies ? `- Allergies: ${allergies}` : ''}
${healthIssues ? `- Health Issues: ${healthIssues}` : ''}

Give 5 personalized nutrition tips in JSON format like this:
[
  "Tip 1",
  "Tip 2",
  ...
]
Only return valid JSON array.
  `;

  try {
    const mealResult = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: mealPlanPrompt }] }],
      generationConfig: { responseMimeType: 'application/json' },
    });

    const mealRaw = await mealResult.response.text();
    const mealClean = mealRaw.replace(/^```json|```$/g, '').trim();

    let plan;
    try {
      plan = JSON.parse(mealClean);
    } catch (err) {
      return res.status(500).json({ success: false, message: 'Invalid meal plan JSON from Gemini.' });
    }

    if (!Array.isArray(plan) || plan.length === 0) {
      return res.status(400).json({ success: false, message: 'Meal plan structure invalid.' });
    }

    const tipResult = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: tipsPrompt }] }],
      generationConfig: { responseMimeType: 'application/json' },
    });

    const tipsRaw = await tipResult.response.text();
    const tipsClean = tipsRaw.replace(/^```json|```$/g, '').trim();

    let nutritionTips;
    try {
      nutritionTips = JSON.parse(tipsClean);
    } catch {
      nutritionTips = [];
    }

    
    const saved = await MealPlan.create({
      user: req.user?._id || null,
      goal,
      weight,
      height,
      duration,
      startDate,
      age,
      gender,
      activity,
      dietType,
      allergies,
      healthIssues,
      plan,
      nutritionTips,
      likes: 0,
      likedBy: [],
      savedBy: [],
    });

    res.status(200).json({
      success: true,
      message: 'Meal plan generated successfully.',
      plan: saved.plan, 
      nutritionTips: saved.nutritionTips || [],
      metadata: {
        id: saved._id, 
        createdAt: saved.createdAt,
        startDate: saved.startDate,
        goal: saved.goal,
        duration: saved.duration,
      },
    });
  } catch (err) {
    console.error('❌ Gemini Error:', err.message);
    res.status(500).json({ success: false, message: 'Server error while generating meal plan.' });
  }
});




export const toggleSaveMealPlan = asyncHandler(async (req, res) => {
  const { id } = req.body;
  const userId = req.user?.userId;

  if (!userId) {
    return res.status(401).json({ success: false, message: 'Unauthorized user' });
  }

  const meal = await MealPlan.findById(id);
  if (!meal) return res.status(404).json({ success: false, message: 'Meal plan not found' });

  const user = await User.findById(userId);
  if (!user) return res.status(404).json({ success: false, message: 'User not found' });

  const isSaved = meal.savedBy.includes(userId);

  if (isSaved) {
    meal.savedBy = meal.savedBy.filter(uid => uid.toString() !== userId.toString());
    user.savedMealPlans = user.savedMealPlans.filter(mid => mid.toString() !== id);
  } else {
    meal.savedBy.push(userId);
    user.savedMealPlans.push(id);
  }

  await meal.save();
  await user.save();

  res.status(200).json({ success: true, message: isSaved ? 'Meal plan unsaved' : 'Meal plan saved' });
});


export const getSavedMealPlans = asyncHandler(async (req, res) => {
  const userId = req.user.userId;
  const user = await User.findById(userId).populate('savedMealPlans');
  if (!user) return res.status(404).json({ success: false, message: 'User not found' });

  res.status(200).json({ success: true, meals: user.savedMealPlans });
});


export const toggleLikeMealPlan = asyncHandler(async (req, res) => {
  const { id } = req.body;
  const userId = req.user?.userId;

  if (!userId) {
    return res.status(401).json({ success: false, message: 'Unauthorized user' });
  }

  const meal = await MealPlan.findById(id);
  if (!meal) return res.status(404).json({ success: false, message: 'Meal plan not found' });

  const index = meal.likedBy.findIndex(uid => uid.toString() === userId.toString());

  if (index === -1) {
    meal.likedBy.push(userId);
  } else {
    meal.likedBy.splice(index, 1);
  }

  meal.likes = meal.likedBy.length;
  await meal.save();

  res.status(200).json({ success: true, liked: index === -1 });
});




export const deleteMealPlan = asyncHandler(async (req, res) => {
  const userId = req.user.userId;
  const { id } = req.params;

  const user = await User.findById(userId);
  if (!user) {
    return res.status(404).json({ success: false, message: 'User not found' });
  }

  const mealPlan = await MealPlan.findById(id);
  if (!mealPlan) {
    return res.status(404).json({ success: false, message: 'Meal plan not found' });
  }

  const wasSaved = user.savedMealPlans.includes(id);
  if (wasSaved) {
    user.savedMealPlans = user.savedMealPlans.filter(pid => String(pid) !== id);
    await user.save();
  }

  res.status(200).json({
    success: true,
    message: wasSaved
      ? 'Meal plan removed from saved list'
      : 'Meal plan was not in saved list',
  });
});
