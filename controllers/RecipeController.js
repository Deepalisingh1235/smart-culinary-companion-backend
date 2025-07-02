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
      additionalNotes
    } = req.body;

    const cuisineStr = Array.isArray(cuisine) ? cuisine.join(', ') : (cuisine?.trim?.() || '');
    const dietStr = Array.isArray(diet) ? diet.join(', ') : (diet?.trim?.() || '');
    const nutritionPrefStr = Array.isArray(nutritionPref) ? nutritionPref.join(', ') : (nutritionPref?.trim?.() || '');
    const allergyStr = Array.isArray(allergies) ? allergies.join(', ') : (allergies?.trim?.() || '');

    const model = genAI.getGenerativeModel({ model: 'models/gemini-2.5-flash' });

    const filtersPromptParts = [];

    if (query?.trim()) filtersPromptParts.push(`Query: "${query.trim()}"`);
    if (cuisineStr) filtersPromptParts.push(`Cuisine: ${cuisineStr}`);
    if (dietStr) filtersPromptParts.push(`Diet: ${dietStr}`);
    if (nutritionPrefStr) filtersPromptParts.push(`Nutrition Preferences: ${nutritionPrefStr}`);
    if (allergyStr) filtersPromptParts.push(`Allergies: ${allergyStr}`);
    if (cookTime?.trim()) filtersPromptParts.push(`Cook Time: ${cookTime.trim()}`);
    if (servingSize?.toString().trim()) filtersPromptParts.push(`Serving Size: ${servingSize.toString().trim()}`);
    if (additionalNotes?.trim()) filtersPromptParts.push(`Notes: ${additionalNotes.trim()}`);

    const filtersPrompt = filtersPromptParts.length > 0
      ? filtersPromptParts.join('\n')
      : 'No specific filters or ingredients provided.';

    if (step === 'titles') {
      if (!query?.trim()) {
        return res.status(400).json({ success: false, message: 'Query is required for titles' });
      }

      const prompt = `
You are an AI chef.
Based on the following user input, suggest 3–4 relevant, easy-to-medium recipe titles. 
Avoid very modern or complex dishes. Titles should be clear, traditional, and user-friendly.

${filtersPrompt}

Respond ONLY with a valid JSON array of strings:
["Title 1", "Title 2", "Title 3"]
      `.trim();

      const result = await model.generateContent(prompt);
      const text = await result.response.text();
      const match = text.match(/\[[\s\S]*\]/);
      if (!match) throw new Error('No valid recipe titles found.');

      const titles = JSON.parse(match[0].replace(/[“”]/g, '"'));
      return res.status(200).json({ success: true, titles });
    }

    if (step === 'fullRecipe') {
      if (!title || !query) {
        return res.status(400).json({ success: false, message: 'Title and query are required' });
      }

      const prompt = `  
You are an AI chef.

ONLY respond with a valid JSON object. No markdown, no explanation, no formatting. No "Here is your recipe", just pure JSON.

The recipe should be:
- Simple and traditional — avoid overly modern or exotic styles.
- Use ingredients and steps that are easy to understand for everyday users.
- For difficult or rare words (like spices, uncommon ingredients, cooking terms), provide a simple Hindi explanation in brackets.
  Do NOT translate or explain common everyday words like salt, sugar, water, etc.

Include these fields in the JSON:
- title (string)
- description (string)
- cookTime (string)
- servingSize (string)
- ingredients: array of strings like "1 cup chopped onions"
- steps: array of strings like "Step 1: Do this..."
- healthInfo: calories, protein, fat, carbs, dietary[] (all strings)
- imageUrl (string)
- chefTip, servingTip, additionalInfo (all strings)

User Request: "${query}"
Title: ${title}
Cuisine: ${cuisine || 'Not specified'}
Cook Time: ${cookTime || 'Not specified'}
Diet: ${
  diet.includes('Vegetarian')
    ? 'Strict vegetarian (no meat, fish, or eggs)'
    : diet.includes('Eggetarian')
    ? 'Eggetarian (vegetarian with eggs, no meat or fish)'
    : diet.includes('Non-Veg')
    ? 'Non-vegetarian (meat, fish, eggs allowed)'
    : (diet.length > 0 ? diet.join(', ') : 'None')
}
Nutrition Preferences: ${nutritionPref.length > 0 ? nutritionPref.join(', ') : 'None'}
Allergies: ${allergies.length > 0 ? allergies.join(', ') : 'None'}
Serving Size: ${servingSize}
Notes: ${additionalNotes || 'None'}

Generate a clear, helpful, easy-to-follow recipe accordingly.

Respond ONLY with valid JSON. Do not wrap in markdown or code block.
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
    console.error(' smartRecipeFlow error:', err.message);
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




