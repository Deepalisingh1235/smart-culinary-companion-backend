
import Recipe from '../models/RecipeModel.js';
import User from '../models/user.js';
import genAI from '../utils/gemini.js';
import getFoodImageFromPixabay from '../utils/pixabay.js';

export const smartRecipeFlow = async (req, res) => {
  try {
    const {
      step,
      query,
      title,
      cookTime,
      cuisine = [],
      diet = [],
      nutritionPref = [],
      allergies = [],
      servingSize,
      additionalNotes,
    } = req.body;

    const cuisineStr = Array.isArray(cuisine) ? cuisine.join(', ') : (cuisine?.trim?.() || '');
    const dietStr = Array.isArray(diet) ? diet.join(', ') : (diet?.trim?.() || '');
    const nutritionPrefStr = Array.isArray(nutritionPref) ? nutritionPref.join(', ') : (nutritionPref?.trim?.() || '');
    const allergyStr = Array.isArray(allergies) ? allergies.join(', ') : (allergies?.trim?.() || '');

    const model = genAI.getGenerativeModel({ model: 'models/gemini-2.5-flash' });

    if (step === 'titles') {
  if (!query?.trim()) {
    return res.status(400).json({ success: false, message: 'Query is required for titles' });
  }

      const prompt = `
🎯 Task: Suggest 2–4 beginner-friendly dish titles based on user's query and filters.

👤 User Input:
• Query (dish idea or ingredients): "${query.trim()}"
${cuisineStr ? `• Cuisine: ${cuisineStr}` : ''}
${dietStr ? `• Diet: ${dietStr}` : ''}
${cookTime ? `• Cook Time: ${cookTime}` : ''}
${servingSize ? `• Serving Size: ${servingSize}` : ''}
${additionalNotes ? `• Notes: ${additionalNotes}` : ''}

 Guidelines:
- Suggest only recipe **titles**
- Do NOT include ingredients or explanation
- Respect all filters and allergies
- Use familiar, practical, beginner-friendly names
- Avoid exotic, complex, or allergy-conflicting dishes

📦 Output (JSON only):
{
  "titles": ["Dish Name 1", "Dish Name 2", "Dish Name 3", "Dish Name 4"]
}
      `.trim();

      
  const result = await model.generateContent(prompt);
  const text = await result.response.text();
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) throw new Error('No valid JSON object found in response');

  const cleanedJson = match[0]
    .replace(/[“”]/g, '"')
    .replace(/,\s*([\]}])/g, '$1')
    .replace(/\s+/g, ' ')
    .replace(/\\n/g, ' ')
    .replace(/“|”/g, '"');

  const parsed = JSON.parse(cleanedJson);

  return res.status(200).json({
    success: true,
    titles: parsed.titles || [],
  });
}

    // === Step 2: Generate FULL RECIPE ===
    if (step === 'fullRecipe') {
      if (!title || !query) {
        return res.status(400).json({ success: false, message: 'Title and query are required' });
      }

      const prompt = `
You are an expert AI chef.

🎯 Your task:
Generate a detailed recipe in valid JSON format ONLY (no markdown, no explanation).

The recipe must:
- Match the given title, query, and dietary filters.
- Use simple ingredients that respect allergies.
- Be beginner-friendly with easy cooking steps.
- Include serving tips, chef advice, and health data.
- Use simple Hindi brackets for rare terms (e.g. "asafoetida (हींग)").

📦 Output structure:
{
  "title": "",
  "description": "",
  "cookTime": "",
  "servingSize": "",
  "ingredients": [ "..." ],
  "steps": [ "..." ],
  "healthInfo": {
    "calories": "",
    "protein": "",
    "fat": "",
    "carbs": "",
    "dietary": [ "Vegetarian", "Gluten-Free" ]
  },
  "chefTip": "",
  "servingTip": "",
  "additionalInfo": "",
  "imageUrl": "..."
}

👤 User Input:
- Query: "${query}"
- Title: ${title}
- Cuisine: ${cuisineStr || 'Not specified'}
- Cook Time: ${cookTime || 'Not specified'}
- Diet: ${dietStr || 'None'}
- Nutrition Preferences: ${nutritionPrefStr || 'None'}
- Allergies: ${allergyStr || 'None'}
- Serving Size: ${servingSize || 'Not specified'}
- Notes: ${additionalNotes || 'None'}

Return ONLY valid JSON.
      `.trim();
      
const result = await model.generateContent(prompt);
      const text = await result.response.text();

      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error('No valid JSON found in full recipe.');

      const jsonStr = jsonMatch[0]
        .replace(/[“”]/g, '"')
        .replace(/\\n/g, '')
        .replace(/,\s*([\]}])/g, '$1');

      const recipeData = JSON.parse(jsonStr);

      if (!Array.isArray(recipeData.healthInfo?.dietary) || recipeData.healthInfo.dietary.length === 0) {
        recipeData.healthInfo.dietary = [...new Set([...diet, ...nutritionPref])] || ['General'];
      }

      if (Array.isArray(recipeData.ingredients)) {
        recipeData.ingredients = recipeData.ingredients
          .map((i) => {
            if (typeof i === 'object') {
              const quantity = i.quantity?.trim() || '';
              const unit = i.unit?.trim() || '';
              const name = i.name?.trim() || '';
              const notes = i.notes?.trim() ? ` – ${i.notes}` : '';
              const full = [quantity, unit, name].filter(Boolean).join(' ').trim();
              return full + notes;
            }
            if (typeof i === 'string') {
              const clean = i.trim();
              if (
                clean.length < 5 ||
                /^[\d\/.\s]*(teaspoon|tablespoon|cup|can|grams?|ml|to taste|optional)/i.test(clean)
              ) return null;
              return clean;
            }
            return null;
          })
          .filter(Boolean);
        if (!recipeData.ingredients.length) {
          recipeData.ingredients.push('Ingredients missing or unclear. Please verify input.');
        }
      }

      if (Array.isArray(recipeData.steps)) {
        recipeData.steps = recipeData.steps
          .map((stepObj, idx) => {
            let desc = '';
            if (typeof stepObj === 'object') {
              desc = stepObj.description || stepObj.text || '';
            } else if (typeof stepObj === 'string') {
              desc = stepObj;
            }
            desc = desc.replace(/^\s*(Step\s*)?\d+[:.)\-\s]*/i, '').trim();
            if (!desc || desc.toLowerCase().includes('basic cooking instructions')) return null;
            return `Step ${idx + 1}: ${desc}`;
          })
          .filter(Boolean);
      }

      if (!recipeData.steps?.length) {
        recipeData.steps = ['Step 1: Heat oil, sauté aromatics, and cook ingredients step-by-step.'];
      }

      const image = await getFoodImageFromPixabay(recipeData.title || title);
      recipeData.imageUrl = image || recipeData.imageUrl || '';

      const savedRecipe = await Recipe.create(recipeData);
      return res.status(200).json({ success: true, recipe: savedRecipe });
    }

    return res.status(400).json({ success: false, message: 'Invalid step provided' });
  } catch (err) {
    console.error('❌ smartRecipeFlow error:', err.message);
    res.status(500).json({ success: false, message: 'Something went wrong.', error: err.message });
  }
};


export const toggleSaveRecipe = async (req, res) => {
  try {
    const userId = req.user.userId; 
    const { recipeId } = req.body;

    if (!recipeId) return res.status(400).json({ success: false, message: 'Recipe ID is required' });

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    const savedIndex = user.savedRecipes.findIndex(id => id.toString() === recipeId);

    if (savedIndex === -1) {
      user.savedRecipes.push(recipeId);
      await user.save();
      return res.status(200).json({ success: true, message: 'Recipe saved' });
    } else {
      user.savedRecipes.splice(savedIndex, 1);
      await user.save();
      return res.status(200).json({ success: true, message: 'Recipe removed from saved' });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server error toggling saved recipe' });
  }
};

      


export const getSavedRecipes = async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).populate('savedRecipes');
    if (!user) return res.status(404).json({ message: 'User not found' });

    res.status(200).json({ success: true, recipes: user.savedRecipes });
  } catch (error) {
    console.error('❌ Fetch saved recipes error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch saved recipes' });
  }
};


export const toggleLikeRecipe = async (req, res) => {
  try {
    const userId = req.user._id;
    const { recipeId } = req.body;

    const recipe = await Recipe.findById(recipeId);
    if (!recipe) return res.status(404).json({ success: false, message: 'Recipe not found' });

    const index = recipe.likes.indexOf(userId);

    if (index === -1) {
     
      recipe.likes.push(userId);
    } else {
      
      recipe.likes.splice(index, 1);
    }

    await recipe.save();

    const liked = recipe.likes.includes(userId);
    return res.status(200).json({ success: true, liked });
  } catch (error) {
    console.error('toggleLike error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

export const deleteRecipe = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { id } = req.params;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    if (!user.savedRecipes.includes(id)) {
      return res.status(404).json({ success: false, message: 'Recipe not found in saved list' });
    }

    
    user.savedRecipes = user.savedRecipes.filter(recipeId => String(recipeId) !== id);
    await user.save();

    res.status(200).json({ success: true, message: 'Recipe removed from saved list' });
  } catch (error) {
    console.error('❌ deleteRecipe error:', error.message);
    res.status(500).json({ success: false, message: 'Server error while deleting recipe' });
  }
};