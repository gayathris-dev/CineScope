/**
 * CineScope - Watchlist Storage Module
 * Manages saving, removing, and retrieving movies in localStorage.
 */

const Watchlist = (() => {
  const STORAGE_KEY = 'cinescope_watchlist_v1';

  /**
   * Retrieve all saved movies from localStorage
   */
  function getAll() {
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      return data ? JSON.parse(data) : [];
    } catch (err) {
      console.error('Failed to read watchlist from localStorage:', err);
      return [];
    }
  }

  /**
   * Save array of movies to localStorage
   */
  function save(list) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
      dispatchChange();
    } catch (err) {
      console.error('Failed to save watchlist to localStorage:', err);
    }
  }

  /**
   * Dispatch custom event to notify listeners across the application
   */
  function dispatchChange() {
    window.dispatchEvent(new CustomEvent('cinescope:watchlist-change', {
      detail: {
        count: getCount(),
        watchlist: getAll()
      }
    }));
  }

  /**
   * Check if a movie is already saved in the watchlist
   */
  function has(movieId) {
    const list = getAll();
    const id = Number(movieId);
    return list.some(item => Number(item.id) === id);
  }

  /**
   * Add a movie to the watchlist
   */
  function add(movie) {
    if (!movie || !movie.id) return false;
    const list = getAll();
    const id = Number(movie.id);

    if (list.some(item => Number(item.id) === id)) {
      return false; // already exists
    }

    // Store essential movie details
    const cleanMovie = {
      id: movie.id,
      title: movie.title || movie.name || 'Untitled Movie',
      poster_path: movie.poster_path || null,
      backdrop_path: movie.backdrop_path || null,
      vote_average: movie.vote_average || 0,
      release_date: movie.release_date || movie.first_air_date || '',
      overview: movie.overview || '',
      genres: movie.genres || [],
      genre_ids: movie.genre_ids || [],
      savedAt: new Date().toISOString()
    };

    list.unshift(cleanMovie);
    save(list);
    return true;
  }

  /**
   * Remove a movie from the watchlist
   */
  function remove(movieId) {
    const list = getAll();
    const id = Number(movieId);
    const filtered = list.filter(item => Number(item.id) !== id);

    if (filtered.length !== list.length) {
      save(filtered);
      return true;
    }
    return false;
  }

  /**
   * Toggle movie in watchlist: adds if not present, removes if present
   */
  function toggle(movie) {
    if (has(movie.id)) {
      remove(movie.id);
      return { added: false, count: getCount() };
    } else {
      add(movie);
      return { added: true, count: getCount() };
    }
  }

  /**
   * Clear all movies from watchlist
   */
  function clear() {
    localStorage.removeItem(STORAGE_KEY);
    dispatchChange();
  }

  /**
   * Get total count of movies in watchlist
   */
  function getCount() {
    return getAll().length;
  }

  return {
    getAll,
    has,
    add,
    remove,
    toggle,
    clear,
    getCount
  };
})();
