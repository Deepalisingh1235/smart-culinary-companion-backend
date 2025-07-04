import dotenv from 'dotenv';
dotenv.config();

const getFoodImageFromSpoonacular = async (dishName) => {
  try {
    const response = await fetch(
      `https://api.spoonacular.com/recipes/complexSearch?query=${encodeURIComponent(dishName)}&number=1&apiKey=${process.env.SPOONACULAR_API_KEY}`
    );
    const data = await response.json();
    return data.results?.[0]?.image || null;
  } catch (error) {
    console.error('❌ Spoonacular image fetch error:', error.message);
    return null;
  }
};

export default getFoodImageFromSpoonacular;
