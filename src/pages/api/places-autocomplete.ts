// src/pages/api/places-autocomplete.ts
import type { NextApiRequest, NextApiResponse } from 'next';

// IMPORTANT: Ensure your Google Places API Key is in your .env.local file
const GOOGLE_PLACES_API_KEY = process.env.GOOGLE_PLACES_API_KEY;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  const { input, location_bias } = req.query;

  if (!input || typeof input !== 'string') {
    return res.status(400).json({ message: 'Missing or invalid "input" query parameter.' });
  }

  if (!GOOGLE_PLACES_API_KEY) {
    console.error('GOOGLE_PLACES_API_KEY is not set in environment variables.');
    return res.status(500).json({ message: 'Server configuration error: Places API key not found.' });
  }

  // Construct the Google Places Autocomplete API URL
  const apiUrl = new URL('https://maps.googleapis.com/maps/api/place/autocomplete/json');
  apiUrl.searchParams.append('input', input);
  apiUrl.searchParams.append('key', GOOGLE_PLACES_API_KEY);
  apiUrl.searchParams.append('types', '(cities)'); // Restrict to cities, or 'geocode' for broader results
  apiUrl.searchParams.append('components', 'country:ph'); // Optionally restrict to Philippines

  if (location_bias && typeof location_bias === 'string') {
    // Example for location bias: 'point:latitude,longitude' or 'circle:radius@latitude,longitude'
    // For "Davao City, Philippines" as a strong bias:
    // This is more complex and usually requires a specific lat/lng.
    // For simplicity, we can use it to suggest results biased towards the Philippines.
    // You might need to adjust this based on the exact bias you want.
    // For biasing towards Davao City, you'd need its coordinates.
    // For now, let's keep it simple with components or just let Google handle it.
  }
  // For Davao City bias, you would ideally get its lat/lng:
  // For Davao City, Philippines: 7.1907° N, 125.4553° E
  // apiUrl.searchParams.append('location', '7.1907,125.4553');
  // apiUrl.searchParams.append('radius', '50000'); // 50km radius around Davao

  try {
    const response = await fetch(apiUrl.toString());
    const data = await response.json();

    if (data.status === 'OK') {
      // Filter predictions to only include places with a 'formatted_address' or 'description'
      const formattedPredictions = data.predictions.map((prediction: any) => ({
        id: prediction.place_id,
        name: prediction.structured_formatting.main_text, // Main name of the place
        address: prediction.description, // Full address/description
      }));
      return res.status(200).json({ places: formattedPredictions });
    } else {
      console.error('Google Places API Error:', data.status, data.error_message);
      return res.status(data.status === 'OVER_QUERY_LIMIT' ? 429 : 500).json({
        message: `Google Places API error: ${data.status} - ${data.error_message || 'Unknown error'}`,
        predictions: [] // Ensure an empty array is always returned on error
      });
    }
  } catch (error: any) {
    console.error('Error fetching from Google Places API:', error);
    return res.status(500).json({ message: `Internal server error: ${error.message || 'Unknown error'}` });
  }
}