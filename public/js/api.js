/**
 * CineScope - API Client Module
 * Communicates with the Express backend proxy for TMDB data.
 */

const MovieAPI = (() => {
  const BASE_API_URL = '/api/movies';
  const IMAGE_BASE_URL = 'https://image.tmdb.org/t/p';

  /**
   * Reusable fetch wrapper with error handling
   */
  async function request(endpoint, params = {}) {
    try {
      const url = new URL(window.location.origin + BASE_API_URL + endpoint);
      for (const [key, val] of Object.entries(params)) {
        if (val !== undefined && val !== null && val !== '') {
          url.searchParams.set(key, val);
        }
      }

      const response = await fetch(url.toString(), {
        headers: { 'Accept': 'application/json' }
      });

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        const error = new Error(data?.error || `Request failed with status ${response.status}`);
        error.code = data?.code || 'UNKNOWN_ERROR';
        error.status = response.status;
        error.hint = data?.hint;
        throw error;
      }

      return data;
    } catch (err) {
      console.error(`[MovieAPI Error] ${endpoint}:`, err);
      throw err;
    }
  }

  return {
    /**
     * Get system configuration (API key status, image paths)
     */
    async getConfig() {
      return request('/config');
    },

    /**
     * Fetch trending movies (day or week)
     */
    async getTrending(timeWindow = 'day', page = 1) {
      return request('/trending', { time_window: timeWindow, page });
    },

    /**
     * Fetch popular movies
     */
    async getPopular(page = 1) {
      return request('/popular', { page });
    },

    /**
     * Fetch top rated movies
     */
    async getTopRated(page = 1) {
      return request('/top-rated', { page });
    },

    /**
     * Fetch upcoming movies
     */
    async getUpcoming(page = 1) {
      return request('/upcoming', { page });
    },

    /**
     * Fetch list of genres
     */
    async getGenres() {
      return request('/genres');
    },

    /**
     * Discover movies filtered by genre
     */
    async discoverByGenre(genreId, page = 1) {
      return request('/discover', { with_genres: genreId, page, sort_by: 'popularity.desc' });
    },

    /**
     * Search movies by text query
     */
    async searchMovies(query, page = 1) {
      return request('/search', { query, page });
    },

    /**
     * Fetch detailed movie information including videos, credits & similar
     */
    async getMovieDetails(movieId) {
      return request(`/${movieId}`);
    },

    /**
     * Helper to construct poster image URL
     */
    getPosterUrl(posterPath, size = 'w500') {
      if (!posterPath) {
        return 'data:image/svg+xml;charset=UTF-8,<svg xmlns="http://www.w3.org/2000/svg" width="500" height="750" viewBox="0 0 500 750"><rect fill="%23121929" width="100%" height="100%"/><text fill="%2364748b" font-family="sans-serif" font-size="24" font-weight="600" text-anchor="middle" x="250" y="375">No Poster Available</text></svg>';
      }
      return `${IMAGE_BASE_URL}/${size}${posterPath}`;
    },

    /**
     * Helper to construct backdrop image URL
     */
    getBackdropUrl(backdropPath, size = 'original') {
      if (!backdropPath) return '';
      return `${IMAGE_BASE_URL}/${size}${backdropPath}`;
    },

    /**
     * Helper to construct actor profile image URL
     */
    getProfileUrl(profilePath, size = 'w185') {
      if (!profilePath) return '';
      return `${IMAGE_BASE_URL}/${size}${profilePath}`;
    }
  };
})();
