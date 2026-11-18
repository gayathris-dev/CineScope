/**
 * CineScope - Main Application Controller
 * Orchestrates API communication, views, event routing, and UI interactions.
 */

document.addEventListener('DOMContentLoaded', () => {
  // Application State
  const state = {
    genresMap: new Map(),
    genresList: [],
    activeGenreId: null,
    activeGenreName: '',
    trendingTimeWindow: 'day',
    activeView: 'home',
    searchQuery: '',
    searchDebounceTimer: null,
    isApiKeyConfigured: true,
    cache: {
      trendingDay: null,
      trendingWeek: null,
      popular: null,
      topRated: null,
      upcoming: null,
      featuredHeroMovie: null
    }
  };

  // DOM Elements
  const navbar = document.getElementById('navbar');
  const navLinksContainer = document.getElementById('nav-links');
  const mobileToggleBtn = document.getElementById('mobile-toggle-btn');
  const mobileMenu = document.getElementById('mobile-menu');
  const apiKeyBanner = document.getElementById('api-key-banner');
  const bannerCloseBtn = document.getElementById('banner-close-btn');

  // Search Elements
  const searchForm = document.getElementById('search-form');
  const searchInput = document.getElementById('search-input');
  const searchSpinner = document.getElementById('search-spinner');
  const searchClearBtn = document.getElementById('search-clear-btn');
  const searchResultsSection = document.getElementById('search-results-section');
  const searchQueryDisplay = document.getElementById('search-query-display');
  const searchMovieGrid = document.getElementById('search-movie-grid');
  const closeSearchBtn = document.getElementById('close-search-btn');

  // Content Sections
  const homeSections = document.getElementById('home-sections');
  const trendingGrid = document.getElementById('trending-movie-grid');
  const popularGrid = document.getElementById('popular-movie-grid');
  const topRatedGrid = document.getElementById('top-rated-movie-grid');
  const upcomingGrid = document.getElementById('upcoming-movie-grid');

  // Genre Elements
  const genrePillsContainer = document.getElementById('genre-pills');
  const genreMoviesWrapper = document.getElementById('genre-movies-wrapper');
  const genreActiveTitle = document.getElementById('genre-active-title');
  const genreMovieGrid = document.getElementById('genre-movie-grid');
  const resetGenreBtn = document.getElementById('reset-genre-btn');

  // Watchlist Elements
  const watchlistSection = document.getElementById('watchlist-section');
  const watchlistGrid = document.getElementById('watchlist-movie-grid');
  const watchlistTotalCount = document.getElementById('watchlist-total-count');
  const clearWatchlistBtn = document.getElementById('clear-watchlist-btn');

  // Trending Tabs
  const trendingTabs = document.querySelectorAll('.toggle-tab');

  // Footer year
  const currentYearSpan = document.getElementById('current-year');
  if (currentYearSpan) {
    currentYearSpan.textContent = new Date().getFullYear();
  }

  /* ------------------------------------------------------------------------
     1. Initialization Flow
     ------------------------------------------------------------------------ */
  async function init() {
    setupScrollEffects();
    setupNavigation();
    setupSearch();
    setupWatchlistListeners();

    // Initial badge count
    UI.updateWatchlistBadges(Watchlist.getCount());

    // Show initial skeleton loaders
    UI.renderSkeletons(trendingGrid, 8);
    UI.renderSkeletons(popularGrid, 8);
    UI.renderSkeletons(topRatedGrid, 8);
    UI.renderSkeletons(upcomingGrid, 8);

    try {
      // 1. Check API Key configuration & basic setup
      const config = await MovieAPI.getConfig();
      state.isApiKeyConfigured = config.configured;

      if (!state.isApiKeyConfigured && apiKeyBanner) {
        apiKeyBanner.classList.remove('hidden');
      }

      // 2. Fetch and register Genres
      await loadGenres();

      // 3. Load all movie data sections in parallel
      await Promise.all([
        loadTrending('day'),
        loadPopular(),
        loadTopRated(),
        loadUpcoming()
      ]);

    } catch (err) {
      console.warn('Initialization notice:', err.message);
      if (apiKeyBanner) apiKeyBanner.classList.remove('hidden');
      handleGeneralError(err);
    }
  }

  /* ------------------------------------------------------------------------
     2. Data Fetching & Rendering
     ------------------------------------------------------------------------ */

  /**
   * Fetch and display genres list
   */
  async function loadGenres() {
    try {
      const data = await MovieAPI.getGenres();
      if (data && data.genres) {
        state.genresList = data.genres;
        data.genres.forEach(g => state.genresMap.set(g.id, g.name));

        UI.renderGenrePills(
          genrePillsContainer,
          state.genresList,
          state.activeGenreId,
          handleGenreSelect
        );
      }
    } catch (err) {
      console.error('Failed to load genres:', err);
    }
  }

  /**
   * Fetch and display trending movies
   */
  async function loadTrending(timeWindow = 'day') {
    state.trendingTimeWindow = timeWindow;
    UI.renderSkeletons(trendingGrid, 8);

    try {
      const data = await MovieAPI.getTrending(timeWindow);
      const movies = data.results || [];
      state.cache[timeWindow === 'day' ? 'trendingDay' : 'trendingWeek'] = movies;

      // Populate hero with first top movie if not already done
      if (!state.cache.featuredHeroMovie && movies.length > 0) {
        state.cache.featuredHeroMovie = movies[0];
        renderHeroSection(movies[0]);
      }

      UI.renderMovieGrid(trendingGrid, movies, state.genresMap, {
        onDetailsClick: openMovieDetails,
        onWatchlistChange: handleWatchlistCardChange
      });
    } catch (err) {
      renderSectionError(trendingGrid, 'Trending Movies', err);
    }
  }

  /**
   * Fetch and display popular movies
   */
  async function loadPopular() {
    try {
      const data = await MovieAPI.getPopular();
      const movies = data.results || [];
      state.cache.popular = movies;

      UI.renderMovieGrid(popularGrid, movies, state.genresMap, {
        onDetailsClick: openMovieDetails,
        onWatchlistChange: handleWatchlistCardChange
      });
    } catch (err) {
      renderSectionError(popularGrid, 'Popular Movies', err);
    }
  }

  /**
   * Fetch and display top rated movies
   */
  async function loadTopRated() {
    try {
      const data = await MovieAPI.getTopRated();
      const movies = data.results || [];
      state.cache.topRated = movies;

      UI.renderMovieGrid(topRatedGrid, movies, state.genresMap, {
        onDetailsClick: openMovieDetails,
        onWatchlistChange: handleWatchlistCardChange
      });
    } catch (err) {
      renderSectionError(topRatedGrid, 'Top Rated Movies', err);
    }
  }

  /**
   * Fetch and display upcoming movies
   */
  async function loadUpcoming() {
    try {
      const data = await MovieAPI.getUpcoming();
      const movies = data.results || [];
      state.cache.upcoming = movies;

      UI.renderMovieGrid(upcomingGrid, movies, state.genresMap, {
        onDetailsClick: openMovieDetails,
        onWatchlistChange: handleWatchlistCardChange
      });
    } catch (err) {
      renderSectionError(upcomingGrid, 'Upcoming Movies', err);
    }
  }

  /**
   * Render hero section with featured movie
   */
  function renderHeroSection(movie) {
    UI.renderHero(
      movie,
      state.genresMap,
      openMovieDetails,
      null, // Trailer will be handled inside details modal
      () => updateAllBookmarkButtons()
    );
  }

  /**
   * Open Movie Details Modal by Movie ID
   */
  async function openMovieDetails(movieId) {
    try {
      // First open modal in loading state
      UI.openDetailsModal({ id: movieId, title: 'Loading movie...' }, state.genresMap);

      // Fetch comprehensive details from backend
      const details = await MovieAPI.getMovieDetails(movieId);

      // Re-render modal with full details
      UI.openDetailsModal(
        details,
        state.genresMap,
        () => {
          updateAllBookmarkButtons();
          if (state.activeView === 'watchlist') {
            renderWatchlistView();
          }
        }
      );
    } catch (err) {
      UI.closeDetailsModal();
      UI.showToast(err.message || 'Unable to load movie details', 'error');
    }
  }

  /* ------------------------------------------------------------------------
     3. Genre Filtering
     ------------------------------------------------------------------------ */
  async function handleGenreSelect(genreId, genreName = '') {
    state.activeGenreId = genreId;
    state.activeGenreName = genreName;

    // Update pill active classes
    UI.renderGenrePills(
      genrePillsContainer,
      state.genresList,
      state.activeGenreId,
      handleGenreSelect
    );

    if (genreId === null) {
      // Show all sections, hide filtered genre view
      if (genreMoviesWrapper) genreMoviesWrapper.classList.add('hidden');
      if (homeSections) homeSections.classList.remove('hidden');
      return;
    }

    // Filter by genre
    if (genreMoviesWrapper) genreMoviesWrapper.classList.remove('hidden');
    if (genreActiveTitle) genreActiveTitle.textContent = `${genreName} Movies`;
    UI.renderSkeletons(genreMovieGrid, 8);

    try {
      const data = await MovieAPI.discoverByGenre(genreId);
      const movies = data.results || [];

      UI.renderMovieGrid(genreMovieGrid, movies, state.genresMap, {
        emptyMessage: `No ${genreName} movies found at this time.`,
        onDetailsClick: openMovieDetails,
        onWatchlistChange: handleWatchlistCardChange
      });

      // Smooth scroll to the genre results
      genreMoviesWrapper.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } catch (err) {
      renderSectionError(genreMovieGrid, `${genreName} Movies`, err);
    }
  }

  if (resetGenreBtn) {
    resetGenreBtn.addEventListener('click', () => handleGenreSelect(null));
  }

  /* ------------------------------------------------------------------------
     4. Movie Search
     ------------------------------------------------------------------------ */
  function setupSearch() {
    if (!searchInput) return;

    // Live search on input with debounce
    searchInput.addEventListener('input', (e) => {
      const query = e.target.value.trim();
      state.searchQuery = query;

      if (query.length > 0) {
        if (searchClearBtn) searchClearBtn.style.display = 'flex';
      } else {
        if (searchClearBtn) searchClearBtn.style.display = 'none';
        exitSearchView();
        return;
      }

      clearTimeout(state.searchDebounceTimer);
      state.searchDebounceTimer = setTimeout(() => {
        executeSearch(query);
      }, 400);
    });

    // Form submit
    searchForm?.addEventListener('submit', (e) => {
      e.preventDefault();
      const query = searchInput.value.trim();
      if (query) {
        clearTimeout(state.searchDebounceTimer);
        executeSearch(query);
      }
    });

    // Clear search button
    searchClearBtn?.addEventListener('click', () => {
      searchInput.value = '';
      state.searchQuery = '';
      searchClearBtn.style.display = 'none';
      exitSearchView();
      searchInput.focus();
    });

    // Close search / Back to Home
    closeSearchBtn?.addEventListener('click', () => {
      searchInput.value = '';
      state.searchQuery = '';
      if (searchClearBtn) searchClearBtn.style.display = 'none';
      exitSearchView();
    });
  }

  async function executeSearch(query) {
    if (!query) return;

    // Switch view to search results
    switchView('search');
    if (searchQueryDisplay) searchQueryDisplay.textContent = `"${query}"`;
    if (searchSpinner) searchSpinner.style.display = 'block';
    UI.renderSkeletons(searchMovieGrid, 8);

    try {
      const data = await MovieAPI.searchMovies(query);
      const results = data.results || [];

      if (searchSpinner) searchSpinner.style.display = 'none';

      if (results.length === 0) {
        UI.renderEmptyState(
          searchMovieGrid,
          'No Matching Movies Found',
          `We couldn't find any titles matching "${query}". Try searching for another movie title, actor, or franchise.`,
          'Clear Search',
          () => {
            searchInput.value = '';
            exitSearchView();
          }
        );
      } else {
        UI.renderMovieGrid(searchMovieGrid, results, state.genresMap, {
          onDetailsClick: openMovieDetails,
          onWatchlistChange: handleWatchlistCardChange
        });
      }

      // Smooth scroll to results
      searchResultsSection?.scrollIntoView({ behavior: 'smooth', block: 'start' });

    } catch (err) {
      if (searchSpinner) searchSpinner.style.display = 'none';
      renderSectionError(searchMovieGrid, `Search for "${query}"`, err);
    }
  }

  function exitSearchView() {
    switchView('home');
    if (searchSpinner) searchSpinner.style.display = 'none';
  }

  /* ------------------------------------------------------------------------
     5. Watchlist View & Management
     ------------------------------------------------------------------------ */
  function setupWatchlistListeners() {
    // Listen for custom watchlist change events
    window.addEventListener('cinescope:watchlist-change', (e) => {
      const { count } = e.detail;
      UI.updateWatchlistBadges(count);
      updateAllBookmarkButtons();

      if (state.activeView === 'watchlist') {
        renderWatchlistView();
      }
    });

    // Clear All Watchlist button
    clearWatchlistBtn?.addEventListener('click', () => {
      if (Watchlist.getCount() === 0) return;
      if (confirm('Are you sure you want to clear your entire watchlist?')) {
        Watchlist.clear();
        UI.showToast('Watchlist cleared');
        renderWatchlistView();
      }
    });
  }

  function renderWatchlistView() {
    const list = Watchlist.getAll();
    const count = list.length;

    if (watchlistTotalCount) {
      watchlistTotalCount.textContent = `${count} ${count === 1 ? 'movie' : 'movies'} saved`;
    }

    if (clearWatchlistBtn) {
      clearWatchlistBtn.style.display = count > 0 ? 'inline-flex' : 'none';
    }

    if (count === 0) {
      UI.renderEmptyState(
        watchlistGrid,
        'Your Watchlist is Empty',
        'You have not added any movies to your watchlist yet. Explore trending, popular, or genre categories and tap the bookmark icon to save titles for later!',
        'Discover Movies',
        () => switchView('home')
      );
      return;
    }

    UI.renderMovieGrid(watchlistGrid, list, state.genresMap, {
      isWatchlist: true,
      onDetailsClick: openMovieDetails,
      onWatchlistChange: () => {
        renderWatchlistView();
      }
    });
  }

  function handleWatchlistCardChange() {
    UI.updateWatchlistBadges(Watchlist.getCount());
    if (state.activeView === 'watchlist') {
      renderWatchlistView();
    }
  }

  function updateAllBookmarkButtons() {
    const cards = document.querySelectorAll('.movie-card');
    cards.forEach(card => {
      const movieId = card.dataset.movieId;
      const bookmarkBtn = card.querySelector('.card-bookmark-btn');
      if (movieId && bookmarkBtn) {
        const isIn = Watchlist.has(movieId);
        const iconSvg = bookmarkBtn.querySelector('svg');
        if (isIn) {
          bookmarkBtn.classList.add('active');
          if (iconSvg) iconSvg.setAttribute('fill', '#fff');
        } else {
          bookmarkBtn.classList.remove('active');
          if (iconSvg) iconSvg.setAttribute('fill', 'none');
        }
      }
    });
  }

  /* ------------------------------------------------------------------------
     6. Navigation & View Switching
     ------------------------------------------------------------------------ */
  function setupNavigation() {
    // Brand logo returns to top of Home
    document.getElementById('brand-logo')?.addEventListener('click', (e) => {
      e.preventDefault();
      switchView('home');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });

    // Desktop Nav Links
    const navButtons = navLinksContainer?.querySelectorAll('.nav-link');
    navButtons?.forEach(btn => {
      btn.addEventListener('click', () => {
        const view = btn.dataset.view;
        const sectionId = btn.dataset.section;
        handleNavSelection(view, sectionId);
      });
    });

    // Mobile Nav Links
    const mobileLinks = mobileMenu?.querySelectorAll('.mobile-nav-link');
    mobileLinks?.forEach(btn => {
      btn.addEventListener('click', () => {
        const view = btn.dataset.view;
        const sectionId = btn.dataset.section;
        mobileMenu.classList.remove('open');
        handleNavSelection(view, sectionId);
      });
    });

    // Mobile Toggle Button
    mobileToggleBtn?.addEventListener('click', () => {
      mobileMenu?.classList.toggle('open');
    });

    // Trending Carousel Controls
    const prevArrow = document.getElementById('trending-carousel-prev');
    const nextArrow = document.getElementById('trending-carousel-next');
    prevArrow?.addEventListener('click', () => {
      trendingGrid?.scrollBy({ left: -440, behavior: 'smooth' });
    });
    nextArrow?.addEventListener('click', () => {
      trendingGrid?.scrollBy({ left: 440, behavior: 'smooth' });
    });

    // Trending Tabs (Day vs Week)
    trendingTabs.forEach(tab => {
      tab.addEventListener('click', () => {
        trendingTabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        const timeWindow = tab.dataset.timeWindow;
        loadTrending(timeWindow);
      });
    });

    // Banner close button
    bannerCloseBtn?.addEventListener('click', () => {
      apiKeyBanner?.classList.add('hidden');
    });

    // Footer Navigation Links
    document.querySelectorAll('[data-footer-view]').forEach(link => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        const targetView = link.dataset.footerView;
        const targetSection = `${targetView}-section`;
        handleNavSelection(targetView, targetSection);
      });
    });
  }

  function handleNavSelection(view, sectionId) {
    if (view === 'watchlist') {
      switchView('watchlist');
      renderWatchlistView();
      watchlistSection?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } else {
      switchView('home');
      if (sectionId) {
        const target = document.getElementById(sectionId);
        if (target) {
          target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      } else {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    }

    // Update active state in nav
    document.querySelectorAll('.nav-link, .mobile-nav-link').forEach(btn => {
      if (btn.dataset.view === view) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });
  }

  function switchView(viewName) {
    state.activeView = viewName;

    // Reset views
    searchResultsSection?.classList.add('hidden');
    watchlistSection?.classList.add('hidden');
    homeSections?.classList.remove('hidden');

    if (viewName === 'search') {
      searchResultsSection?.classList.remove('hidden');
      homeSections?.classList.add('hidden');
    } else if (viewName === 'watchlist') {
      watchlistSection?.classList.remove('hidden');
      homeSections?.classList.add('hidden');
    }
  }

  /* ------------------------------------------------------------------------
     7. Scroll & UI Enhancements
     ------------------------------------------------------------------------ */
  function setupScrollEffects() {
    window.addEventListener('scroll', () => {
      if (window.scrollY > 40) {
        navbar?.classList.add('scrolled');
      } else {
        navbar?.classList.remove('scrolled');
      }
    }, { passive: true });
  }

  function renderSectionError(container, sectionTitle, error) {
    console.error(`Error loading ${sectionTitle}:`, error);
    const isMissingKey = error.code === 'API_KEY_MISSING' || error.status === 401;

    UI.renderEmptyState(
      container,
      isMissingKey ? 'TMDB API Key Required' : `Unable to Load ${sectionTitle}`,
      isMissingKey 
        ? 'Please add your TMDB API key to the .env file in the project root to fetch real-time data.'
        : (error.message || 'A network error occurred while connecting to the movie database.'),
      'Try Again',
      () => init()
    );
  }

  function handleGeneralError(error) {
    const isMissingKey = error.code === 'API_KEY_MISSING' || error.status === 401;
    if (isMissingKey) {
      if (apiKeyBanner) apiKeyBanner.classList.remove('hidden');
    }
  }

  // Launch Application
  init();
});
