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

  // CHANGED: Use 'geocode' type for broader results (addresses, neighborhoods, etc.)
  apiUrl.searchParams.append('types', 'geocode');

  // Keep country restriction
  apiUrl.searchParams.append('components', 'country:ph'); // Restrict to Philippines

  // UNCOMMENTED & CONFIGURED: Strong bias towards Davao City
  // Davao City, Philippines coordinates: approx 7.1907° N, 125.4553° E
  apiUrl.searchParams.append('location', '7.1907,125.4553');
  apiUrl.searchParams.append('radius', '50000'); // 50km radius around Davao (adjust as needed, e.g., 20000 for 20km)

  // The 'location_bias' parameter from the request query is not directly used here
  // as we're hardcoding the bias for Davao City for simplicity.
  // If you want dynamic biasing based on user input, you'd integrate `location_bias` here.
  if (location_bias && typeof location_bias === 'string') {
    // You could parse `location_bias` here if it contains coordinates or a place ID
    // to dynamically set location/radius, but for now, we're using fixed Davao coordinates.
  }

  try {
    const response = await fetch(apiUrl.toString());
    const data = await response.json();

    if (response.ok && data.status === 'OK') {
      // Filter predictions to only include places with a 'formatted_address' or 'description'
      const formattedPredictions = data.predictions.map((prediction: any) => ({
        id: prediction.place_id,
        name: prediction.structured_formatting.main_text, // Main name of the place (e.g., "Obrero")
        address: prediction.description, // Full address/description (e.g., "Obrero, Davao City, Davao del Sur, Philippines")
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