
import axios from 'axios';

const PIXABAY_API_KEY = process.env.PIXABAY_API_KEY;

const getFoodImageFromPixabay = async (query) => {
  try {
    const response = await axios.get('https://pixabay.com/api/', {
      params: {
        key: PIXABAY_API_KEY,
        q: query,
        image_type: 'photo',
        category: 'food',
        safesearch: true,
        per_page: 5,
      },
    });

    const hits = response.data.hits;
    if (hits && hits.length > 0) {
      return hits[0].webformatURL; 
    } else {
      console.warn(' No images found for:', query);
      return '';
    }
  } catch (error) {
    console.error(' Failed to fetch image from Pixabay:', error.message);
    throw new Error('Image fetch failed');
  }
};

export default getFoodImageFromPixabay;
