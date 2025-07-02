
import genAI from '../utils/gemini.js';
import HealthyRecipes from '../models/HealthyRecipes.js';


export const getAllRecipes = async (req, res) => {
  try {
    const recipes = await HealthyRecipes.find({}, 'title description imageUrl likes');
    res.status(200).json({ success: true, data: recipes });
  } catch (err) {
    console.error('❌ Error fetching recipes:', err.message);
    res.status(500).json({ success: false, message: 'Failed to fetch recipes' });
  }
};


export const generateFullDetailsFromId = async (req, res) => {
  try {
    const id = req.params.id?.trim();
    if (!id) {
      return res.status(400).json({ success: false, message: 'Recipe ID is required' });
    }

    const staticRecipe = await HealthyRecipes.findById(id);
    if (!staticRecipe) {
      return res.status(404).json({ success: false, message: 'Static recipe not found' });
    }

    const prompt = `
You are a healthy Indian recipe expert. Based on this dish:

Title: ${staticRecipe.title}
Description: ${staticRecipe.description}

Generate a complete Indian recipe in this JSON format only:
{
  "title": "",
  "description": "",
  "cookTime": "",
  "servingSize": "",
  "mealType": "",
  "imageUrl": "",
  "likes": 0,
  "ingredients": [ "..." ],
  "steps": [ "..." ],
  "tags": [ "..." ],
  "healthInfo": {
    "calories": "",
    "protein": "",
    "fat": "",
    "carbs": "",
    "dietary": [ "..." ]
  },
  "chefTip": "",
  "servingTip": "",
  "additionalInfo": ""
}
Only return valid JSON. No markdown, no explanation, no comments, no ellipsis (...), no trailing commas.
`;

    const model = genAI.getGenerativeModel({ model: 'models/gemini-2.5-flash' });
    const result = await model.generateContent(prompt);
    const text = await result.response.text();

    
    let jsonText = text.match(/\{[\s\S]*\}/)?.[0];
    if (!jsonText) throw new Error('No valid JSON found in Gemini response.');

    jsonText = jsonText
      .replace(/[“”]/g, '"')                  
      .replace(/,\s*([\]}])/g, '$1')        
      .replace(/\\n/g, '')                   
      .replace(/\u0000/g, '');               

    let generated;
    try {
      generated = JSON.parse(jsonText);
    } catch (parseErr) {
      console.error('💥 JSON parse error:\n', jsonText);
      throw new Error('Failed to parse JSON. Gemini returned invalid format.');
    }

    
    generated.title = staticRecipe.title;
    generated.description = staticRecipe.description;
    generated.imageUrl = staticRecipe.imageUrl;

    res.status(200).json({ success: true, data: generated });

  } catch (err) {
    console.error('❌ Error generating full recipe:', err.message);
    res.status(500).json({ success: false, message: 'Failed to generate recipe' });
  }
};


export const likeRecipe = async (req, res) => {
  try {
    const recipe = await HealthyRecipes.findById(req.params.id);
    if (!recipe) return res.status(404).json({ message: 'Recipe not found' });

    recipe.likes = (recipe.likes || 0) + 1;
    await recipe.save();

    res.json({ success: true, likes: recipe.likes });
  } catch (err) {
    console.error('❌ Error liking recipe:', err.message);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};


export const toggleLikeRecipe = async (req, res) => {
  try {
    const { action } = req.body; // 'like' or 'unlike'
    const recipe = await HealthyRecipes.findById(req.params.id);
    if (!recipe) return res.status(404).json({ message: 'Recipe not found' });

    if (action === 'like') {
      recipe.likes = (recipe.likes || 0) + 1;
    } else if (action === 'unlike') {
      recipe.likes = Math.max((recipe.likes || 0) - 1, 0);
    }

    await recipe.save();
    res.json({ success: true, likes: recipe.likes });
  } catch (err) {
    console.error('❌ Error toggling like:', err.message);
    res.status(500).json({ message: 'Server error' });
  }
};


