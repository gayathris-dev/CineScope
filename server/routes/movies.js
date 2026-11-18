const express = require('express');
const router = express.Router();

const TMDB_BASE_URL = process.env.TMDB_BASE_URL || 'https://api.themoviedb.org/3';
const TMDB_IMAGE_BASE_URL = process.env.TMDB_IMAGE_BASE_URL || 'https://image.tmdb.org/t/p';

/**
 * Helper to check if TMDB API key is properly configured
 */
function isApiKeyConfigured() {
  const key = process.env.TMDB_API_KEY;
  return Boolean(key && key.trim() !== '' && key !== 'your_tmdb_api_key_here');
}

/**
 * Fetch helper for TMDB API requests
 * Supports both TMDB v3 API Key and v4 Read Access Token (Bearer)
 */
async function fetchFromTMDB(endpoint, queryParams = {}) {
  const apiKey = process.env.TMDB_API_KEY ? process.env.TMDB_API_KEY.trim() : '';

  if (!isApiKeyConfigured()) {
    const error = new Error('TMDB API key is missing or not configured.');
    error.statusCode = 503;
    error.code = 'API_KEY_MISSING';
    throw error;
  }

  // Construct URL
  const url = new URL(`${TMDB_BASE_URL}${endpoint}`);
  
  const headers = {
    'Accept': 'application/json'
  };

  // Support v4 Read Access Token (JWT format starting with ey) or v3 API Key
  if (apiKey.startsWith('ey')) {
    headers['Authorization'] = `Bearer ${apiKey}`;
  } else {
    url.searchParams.set('api_key', apiKey);
  }

  // Append additional query parameters
  for (const [key, value] of Object.entries(queryParams)) {
    if (value !== undefined && value !== null && value !== '') {
      url.searchParams.set(key, value);
    }
  }

  const response = await fetch(url.toString(), {
    method: 'GET',
    headers: headers
  });

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    const message = data?.status_message || `TMDB API responded with status ${response.status}`;
    const error = new Error(message);
    error.statusCode = response.status;
    error.tmdbData = data;
    throw error;
  }

  return data;
}

/**
 * Route: GET /api/movies/config
 * Returns image base URL and API key status for the client
 */
router.get('/config', (req, res) => {
  res.json({
    success: true,
    configured: isApiKeyConfigured(),
    imageBaseUrl: TMDB_IMAGE_BASE_URL,
    posterSizes: {
      small: `${TMDB_IMAGE_BASE_URL}/w342`,
      medium: `${TMDB_IMAGE_BASE_URL}/w500`,
      original: `${TMDB_IMAGE_BASE_URL}/original`
    },
    backdropSizes: {
      medium: `${TMDB_IMAGE_BASE_URL}/w780`,
      large: `${TMDB_IMAGE_BASE_URL}/w1280`,
      original: `${TMDB_IMAGE_BASE_URL}/original`
    }
  });
});

/**
 * Route: GET /api/movies/trending
 * Fetch trending movies for day or week
 */
router.get('/trending', async (req, res, next) => {
  try {
    const timeWindow = req.query.time_window === 'week' ? 'week' : 'day';
    const page = req.query.page || 1;
    const data = await fetchFromTMDB(`/trending/movie/${timeWindow}`, { page });
    res.json(data);
  } catch (err) {
    next(err);
  }
});

/**
 * Route: GET /api/movies/popular
 * Fetch popular movies
 */
router.get('/popular', async (req, res, next) => {
  try {
    const page = req.query.page || 1;
    const data = await fetchFromTMDB('/movie/popular', { page });
    res.json(data);
  } catch (err) {
    next(err);
  }
});

/**
 * Route: GET /api/movies/top-rated
 * Fetch top rated movies
 */
router.get('/top-rated', async (req, res, next) => {
  try {
    const page = req.query.page || 1;
    const data = await fetchFromTMDB('/movie/top_rated', { page });
    res.json(data);
  } catch (err) {
    next(err);
  }
});

/**
 * Route: GET /api/movies/upcoming
 * Fetch upcoming movies
 */
router.get('/upcoming', async (req, res, next) => {
  try {
    const page = req.query.page || 1;
    const data = await fetchFromTMDB('/movie/upcoming', { page });
    res.json(data);
  } catch (err) {
    next(err);
  }
});

/**
 * Route: GET /api/movies/genres
 * Fetch list of official movie genres
 */
router.get('/genres', async (req, res, next) => {
  try {
    const data = await fetchFromTMDB('/genre/movie/list');
    res.json(data);
  } catch (err) {
    next(err);
  }
});

/**
 * Route: GET /api/movies/discover
 * Filter movies by genre, sort by popularity or rating
 */
router.get('/discover', async (req, res, next) => {
  try {
    const { with_genres, sort_by = 'popularity.desc', page = 1 } = req.query;
    const data = await fetchFromTMDB('/discover/movie', {
      with_genres,
      sort_by,
      page,
      include_adult: false
    });
    res.json(data);
  } catch (err) {
    next(err);
  }
});

/**
 * Route: GET /api/movies/search
 * Search movies by title/query
 */
router.get('/search', async (req, res, next) => {
  try {
    const { query, page = 1 } = req.query;
    if (!query || query.trim() === '') {
      return res.status(400).json({
        success: false,
        error: 'Search query is required.'
      });
    }

    const data = await fetchFromTMDB('/search/movie', {
      query: query.trim(),
      page,
      include_adult: false
    });
    res.json(data);
  } catch (err) {
    next(err);
  }
});

/**
 * Route: GET /api/movies/:id
 * Fetch detailed movie information including videos, credits, and similar titles
 */
router.get('/:id', async (req, res, next) => {
  try {
    const movieId = req.params.id;
    if (!movieId || isNaN(movieId)) {
      return res.status(400).json({
        success: false,
        error: 'Valid numeric Movie ID is required.'
      });
    }

    const data = await fetchFromTMDB(`/movie/${movieId}`, {
      append_to_response: 'videos,credits,similar,release_dates'
    });
    res.json(data);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
