/**
 * CineScope — UI Rendering & View Component Module
 * Aesthetic: A24 Storytelling + Apple TV Polish + Letterboxd Curation
 */

const UI = (() => {
  // DOM Element Selectors
  const modalBackdrop = document.getElementById('movie-modal');
  const modalCard = document.getElementById('modal-card');
  const modalBody = document.getElementById('modal-body');
  const modalCloseBtn = document.getElementById('modal-close-btn');

  const trailerModal = document.getElementById('trailer-modal');
  const trailerVideoWrapper = document.getElementById('trailer-video-wrapper');
  const trailerCloseBtn = document.getElementById('trailer-close-btn');

  const toastContainer = document.getElementById('toast-container');
  const watchlistBadge = document.getElementById('watchlist-count-badge');
  const mobileWatchlistCount = document.getElementById('mobile-watchlist-count');

  /**
   * Format rating to 1 decimal place (e.g. 8.4)
   */
  function formatRating(vote) {
    if (!vote || isNaN(vote)) return 'NR';
    return Number(vote).toFixed(1);
  }

  /**
   * Format release year from ISO date string
   */
  function formatYear(dateString) {
    if (!dateString) return 'TBA';
    const year = new Date(dateString).getFullYear();
    return isNaN(year) ? 'TBA' : year;
  }

  /**
   * Format full human-readable date
   */
  function formatFullDate(dateString) {
    if (!dateString) return 'TBA';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return dateString;
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }

  /**
   * Format runtime in minutes to "2h 15m" format
   */
  function formatRuntime(minutes) {
    if (!minutes || minutes <= 0) return 'Runtime unavailable';
    const hrs = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hrs === 0) return `${mins}m`;
    if (mins === 0) return `${hrs}h`;
    return `${hrs}h ${mins}m`;
  }

  /**
   * Format language code to full language name
   */
  function formatLanguage(isoCode) {
    if (!isoCode) return 'Original Audio';
    try {
      const languageNames = new Intl.DisplayNames(['en'], { type: 'language' });
      return languageNames.of(isoCode) || isoCode.toUpperCase();
    } catch {
      return isoCode.toUpperCase();
    }
  }

  /**
   * Update Watchlist badges in the navbar
   */
  function updateWatchlistBadges(count) {
    if (watchlistBadge) watchlistBadge.textContent = count;
    if (mobileWatchlistCount) mobileWatchlistCount.textContent = count;
  }

  /**
   * Show an understated floating toast notification
   */
  function showToast(message, type = 'success') {
    if (!toastContainer) return;

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;

    const icon = type === 'success' 
      ? '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>'
      : '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>';

    toast.innerHTML = `${icon}<span>${message}</span>`;
    toastContainer.appendChild(toast);

    setTimeout(() => {
      toast.classList.add('toast-out');
      setTimeout(() => toast.remove(), 250);
    }, 3000);
  }

  /**
   * Render loading skeleton cards into a container
   */
  function renderSkeletons(container, count = 8) {
    if (!container) return;
    let html = '';
    for (let i = 0; i < count; i++) {
      html += `
        <div class="movie-card">
          <div class="card-poster-wrapper skeleton" style="aspect-ratio: 2/3;"></div>
          <div class="card-info">
            <div class="skeleton" style="height: 14px; width: 75%; margin-bottom: 6px;"></div>
            <div class="skeleton" style="height: 12px; width: 40%;"></div>
          </div>
        </div>
      `;
    }
    container.innerHTML = html;
  }

  /**
   * Render empty state inside a container (no emoji, clean SVG iconography)
   */
  function renderEmptyState(container, title, message, actionText = '', actionCallback = null) {
    if (!container) return;

    const wrapper = document.createElement('div');
    wrapper.className = 'empty-state';
    wrapper.innerHTML = `
      <div class="empty-state-icon">
        <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
          <rect width="20" height="20" x="2" y="2" rx="2"/>
          <line x1="7" x2="7" y1="2" y2="22"/>
          <line x1="17" x2="17" y1="2" y2="22"/>
          <line x1="2" x2="22" y1="12" y2="12"/>
          <line x1="2" x2="7" y1="7" y2="7"/>
          <line x1="2" x2="7" y1="17" y2="17"/>
          <line x1="17" x2="22" y1="7" y2="7"/>
          <line x1="17" x2="22" y1="17" y2="17"/>
        </svg>
      </div>
      <h3 class="empty-state-title">${title}</h3>
      <p class="empty-state-desc">${message}</p>
      ${actionText ? `<button class="btn btn-outline btn-sm empty-state-btn">${actionText}</button>` : ''}
    `;

    if (actionText && actionCallback) {
      const btn = wrapper.querySelector('.empty-state-btn');
      if (btn) btn.addEventListener('click', actionCallback);
    }

    container.innerHTML = '';
    container.appendChild(wrapper);
  }

  /**
   * Render hero section with featured movie (A24 / Apple TV style)
   */
  function renderHero(movie, genresMap, onDetails, onTrailer, onWatchlist) {
    const heroBackdrop = document.getElementById('hero-backdrop');
    const heroContent = document.getElementById('hero-content');

    if (!movie || !heroContent) return;

    const backdropUrl = MovieAPI.getBackdropUrl(movie.backdrop_path || movie.poster_path, 'original');
    if (heroBackdrop && backdropUrl) {
      heroBackdrop.style.backgroundImage = `url('${backdropUrl}')`;
    }

    const title = movie.title || movie.name || 'Featured Cinema';
    const year = formatYear(movie.release_date || movie.first_air_date);
    const rating = formatRating(movie.vote_average);
    const overview = movie.overview || 'Synopsis is currently unavailable for this featured cinema release.';
    
    // Curate genres
    const genreNames = (movie.genre_ids || [])
      .map(id => genresMap.get(id))
      .filter(Boolean)
      .slice(0, 3)
      .join('  •  ');

    const isInList = Watchlist.has(movie.id);

    heroContent.innerHTML = `
      <div class="hero-kicker">FEATURED SPOTLIGHT</div>
      <h1 class="hero-title">${title}</h1>
      <div class="hero-meta">
        <span class="hero-rating">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" stroke="none"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
          ${rating}
        </span>
        <span class="hero-meta-divider">•</span>
        <span>${year}</span>
        ${genreNames ? `
          <span class="hero-meta-divider">•</span>
          <span>${genreNames}</span>
        ` : ''}
      </div>
      <p class="hero-overview">${overview}</p>
      <div class="hero-actions">
        <button class="btn btn-primary" id="hero-details-btn">
          Explore Details
        </button>
        <button class="btn btn-secondary" id="hero-watchlist-btn">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="${isInList ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2"><path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z"/></svg>
          <span class="watchlist-text">${isInList ? 'In Watchlist' : '+ Watchlist'}</span>
        </button>
      </div>
    `;

    document.getElementById('hero-details-btn')?.addEventListener('click', () => onDetails(movie.id));
    
    document.getElementById('hero-watchlist-btn')?.addEventListener('click', (e) => {
      const result = Watchlist.toggle(movie);
      const textSpan = e.currentTarget.querySelector('.watchlist-text');
      const iconSvg = e.currentTarget.querySelector('svg');
      if (result.added) {
        textSpan.textContent = 'In Watchlist';
        iconSvg.setAttribute('fill', 'currentColor');
        showToast(`Saved "${title}" to your Watchlist`);
      } else {
        textSpan.textContent = '+ Watchlist';
        iconSvg.setAttribute('fill', 'none');
        showToast(`Removed "${title}" from Watchlist`);
      }
      if (onWatchlist) onWatchlist();
    });
  }

  /**
   * Create a single movie card (Letterboxd-inspired)
   */
  function createMovieCard(movie, genresMap, options = {}) {
    const { isWatchlist = false, onDetailsClick, onWatchlistChange } = options;
    const card = document.createElement('article');
    card.className = 'movie-card';
    card.dataset.movieId = movie.id;

    const posterUrl = MovieAPI.getPosterUrl(movie.poster_path, 'w500');
    const title = movie.title || movie.name || 'Untitled';
    const year = formatYear(movie.release_date || movie.first_air_date);
    const rating = formatRating(movie.vote_average);
    const isInList = Watchlist.has(movie.id);

    card.innerHTML = `
      <div class="card-poster-wrapper">
        <img src="${posterUrl}" alt="${title} Poster" class="card-poster" loading="lazy">
        <div class="card-poster-gradient"></div>
        <button class="card-bookmark-btn ${isInList ? 'active' : ''}" aria-label="${isInList ? 'Remove from Watchlist' : 'Add to Watchlist'}" title="${isInList ? 'Remove from Watchlist' : 'Add to Watchlist'}">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="${isInList ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2"><path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z"/></svg>
        </button>
      </div>
      <div class="card-info">
        <h3 class="card-title" title="${title}">${title}</h3>
        <div class="card-meta">
          <span class="card-year">${year}</span>
          <span class="card-rating-wrap">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor" stroke="none"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
            ${rating}
          </span>
        </div>
        ${isWatchlist ? `
          <button class="btn btn-crimson-subtle btn-sm card-remove-btn">
            Remove
          </button>
        ` : ''}
      </div>
    `;

    // Card click opens modal
    card.addEventListener('click', (e) => {
      if (e.target.closest('.card-bookmark-btn') || e.target.closest('.card-remove-btn')) {
        return;
      }
      if (onDetailsClick) onDetailsClick(movie.id);
    });

    // Bookmark button click
    const bookmarkBtn = card.querySelector('.card-bookmark-btn');
    if (bookmarkBtn) {
      bookmarkBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const result = Watchlist.toggle(movie);
        const iconSvg = bookmarkBtn.querySelector('svg');
        if (result.added) {
          bookmarkBtn.classList.add('active');
          iconSvg.setAttribute('fill', 'currentColor');
          showToast(`Saved "${title}" to your Watchlist`);
        } else {
          bookmarkBtn.classList.remove('active');
          iconSvg.setAttribute('fill', 'none');
          showToast(`Removed "${title}" from Watchlist`);
        }
        if (onWatchlistChange) onWatchlistChange();
      });
    }

    // Watchlist Remove Button
    const removeBtn = card.querySelector('.card-remove-btn');
    if (removeBtn) {
      removeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        Watchlist.remove(movie.id);
        showToast(`Removed "${title}" from Watchlist`);
        if (onWatchlistChange) onWatchlistChange();
      });
    }

    return card;
  }

  /**
   * Render a grid of movies
   */
  function renderMovieGrid(container, movies, genresMap, options = {}) {
    if (!container) return;
    container.innerHTML = '';

    if (!movies || movies.length === 0) {
      const emptyMsg = options.emptyMessage || 'No cinema entries found in this catalogue view.';
      renderEmptyState(container, 'No Titles Found', emptyMsg);
      return;
    }

    const fragment = document.createDocumentFragment();
    movies.forEach(movie => {
      const card = createMovieCard(movie, genresMap, options);
      fragment.appendChild(card);
    });
    container.appendChild(fragment);
  }

  /**
   * Render Genre pills
   */
  function renderGenrePills(container, genres, activeGenreId, onSelect) {
    if (!container) return;
    container.innerHTML = '';

    // 'All Genres' Pill
    const allPill = document.createElement('button');
    allPill.className = `genre-pill ${activeGenreId === null ? 'active' : ''}`;
    allPill.textContent = 'All Genres';
    allPill.addEventListener('click', () => onSelect(null));
    container.appendChild(allPill);

    genres.forEach(genre => {
      const pill = document.createElement('button');
      pill.className = `genre-pill ${activeGenreId === genre.id ? 'active' : ''}`;
      pill.textContent = genre.name;
      pill.dataset.genreId = genre.id;
      pill.addEventListener('click', () => onSelect(genre.id, genre.name));
      container.appendChild(pill);
    });
  }

  /**
   * Open Movie Details Modal (A24 / Apple TV style)
   */
  function openDetailsModal(movie, genresMap, onWatchlistChange, onPlayTrailer) {
    if (!modalBackdrop || !modalBody) return;

    modalBackdrop.classList.add('open');
    modalBackdrop.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';

    // Show loading spinner first
    modalBody.innerHTML = '<div class="modal-loading-spinner"></div>';

    const backdropUrl = MovieAPI.getBackdropUrl(movie.backdrop_path || movie.poster_path, 'large');
    const posterUrl = MovieAPI.getPosterUrl(movie.poster_path, 'w500');
    const title = movie.title || movie.name || 'Untitled';
    const tagline = movie.tagline ? `"${movie.tagline}"` : '';
    const rating = formatRating(movie.vote_average);
    const voteCount = movie.vote_count ? movie.vote_count.toLocaleString() : '0';
    const releaseDate = formatFullDate(movie.release_date || movie.first_air_date);
    const runtime = formatRuntime(movie.runtime);
    const language = formatLanguage(movie.original_language);
    const overview = movie.overview || 'No official synopsis has been archived for this title.';
    const isInList = Watchlist.has(movie.id);

    // Genres
    const genresList = (movie.genres || []).map(g => `<span class="modal-genre-tag">${g.name}</span>`).join('');

    // Cast members
    const castMembers = (movie.credits?.cast || []).slice(0, 8);
    let castHtml = '';
    if (castMembers.length > 0) {
      castHtml = `
        <div class="modal-section-title">PRINCIPAL CAST</div>
        <div class="cast-scroller">
          ${castMembers.map(actor => {
            const avatarUrl = MovieAPI.getProfileUrl(actor.profile_path);
            const initials = actor.name ? actor.name.split(' ').map(n => n[0]).slice(0, 2).join('') : '?';
            return `
              <div class="cast-chip" title="${actor.name} as ${actor.character || 'Role'}">
                ${avatarUrl 
                  ? `<img src="${avatarUrl}" alt="${actor.name}" class="cast-avatar">`
                  : `<div class="cast-avatar-fallback">${initials}</div>`
                }
                <div>
                  <div class="cast-name">${actor.name}</div>
                  <div class="cast-role">${actor.character || 'Cast Member'}</div>
                </div>
              </div>
            `;
          }).join('')}
        </div>
      `;
    }

    // Trailer Video
    const videos = movie.videos?.results || [];
    const officialTrailer = videos.find(v => v.site === 'YouTube' && (v.type === 'Trailer' || v.type === 'Teaser'));
    const trailerKey = officialTrailer ? officialTrailer.key : null;

    modalBody.innerHTML = `
      <div class="modal-backdrop-header" style="background-image: url('${backdropUrl}');">
        <div class="modal-backdrop-gradient"></div>
      </div>
      <div class="modal-content-grid">
        <div class="modal-poster-col">
          <img src="${posterUrl}" alt="${title} Poster" class="modal-poster">
          ${trailerKey ? `
            <button class="btn btn-crimson btn-sm" id="modal-trailer-btn" style="width: 100%;">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>
              Watch Trailer
            </button>
          ` : ''}
        </div>
        <div class="modal-info-col">
          <h2 class="modal-title">${title}</h2>
          ${tagline ? `<div class="modal-tagline">${tagline}</div>` : ''}
          
          <div class="modal-meta-row">
            <span class="modal-rating-badge">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" stroke="none"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
              ${rating} <span style="color: var(--text-subtle); font-size: 0.8rem;">(${voteCount} votes)</span>
            </span>
            <span style="color: var(--border-subtle);">•</span>
            <span>${runtime}</span>
            <span style="color: var(--border-subtle);">•</span>
            <span>${releaseDate}</span>
            <span style="color: var(--border-subtle);">•</span>
            <span>${language}</span>
          </div>

          ${genresList ? `<div class="modal-genres">${genresList}</div>` : ''}

          <div class="modal-section-title">SYNOPSIS</div>
          <p class="modal-overview">${overview}</p>

          ${castHtml}

          <div class="modal-actions">
            <button class="btn ${isInList ? 'btn-secondary' : 'btn-primary'}" id="modal-watchlist-toggle-btn">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="${isInList ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2"><path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z"/></svg>
              <span id="modal-watchlist-text">${isInList ? 'In Watchlist' : '+ Add to Watchlist'}</span>
            </button>
            ${trailerKey ? `
              <button class="btn btn-secondary" id="modal-trailer-btn-action">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>
                Play Official Trailer
              </button>
            ` : ''}
          </div>
        </div>
      </div>
    `;

    // Modal Watchlist Toggle
    const modalWatchlistBtn = document.getElementById('modal-watchlist-toggle-btn');
    if (modalWatchlistBtn) {
      modalWatchlistBtn.addEventListener('click', () => {
        const result = Watchlist.toggle(movie);
        const textSpan = document.getElementById('modal-watchlist-text');
        const iconSvg = modalWatchlistBtn.querySelector('svg');
        if (result.added) {
          if (textSpan) textSpan.textContent = 'In Watchlist';
          if (iconSvg) iconSvg.setAttribute('fill', 'currentColor');
          modalWatchlistBtn.className = 'btn btn-secondary';
          showToast(`Saved "${title}" to your Watchlist`);
        } else {
          if (textSpan) textSpan.textContent = '+ Add to Watchlist';
          if (iconSvg) iconSvg.setAttribute('fill', 'none');
          modalWatchlistBtn.className = 'btn btn-primary';
          showToast(`Removed "${title}" from Watchlist`);
        }
        if (onWatchlistChange) onWatchlistChange();
      });
    }

    // Modal Trailer Button
    if (trailerKey) {
      const handleTrailer = () => openTrailerModal(trailerKey);
      document.getElementById('modal-trailer-btn')?.addEventListener('click', handleTrailer);
      document.getElementById('modal-trailer-btn-action')?.addEventListener('click', handleTrailer);
    }
  }

  /**
   * Close Details Modal
   */
  function closeDetailsModal() {
    if (!modalBackdrop) return;
    modalBackdrop.classList.remove('open');
    modalBackdrop.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
    if (modalBody) modalBody.innerHTML = '';
  }

  /**
   * Open Trailer Video Modal
   */
  function openTrailerModal(youtubeKey) {
    if (!trailerModal || !trailerVideoWrapper || !youtubeKey) return;
    trailerVideoWrapper.innerHTML = `
      <iframe 
        src="https://www.youtube-nocookie.com/embed/${youtubeKey}?autoplay=1&rel=0" 
        title="Official Cinema Trailer" 
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
        allowfullscreen>
      </iframe>
    `;
    trailerModal.classList.add('open');
    trailerModal.setAttribute('aria-hidden', 'false');
  }

  /**
   * Close Trailer Video Modal
   */
  function closeTrailerModal() {
    if (!trailerModal || !trailerVideoWrapper) return;
    trailerModal.classList.remove('open');
    trailerModal.setAttribute('aria-hidden', 'true');
    trailerVideoWrapper.innerHTML = '';
  }

  // Setup Event Listeners for Modals Close
  if (modalCloseBtn) modalCloseBtn.addEventListener('click', closeDetailsModal);
  if (modalBackdrop) {
    modalBackdrop.addEventListener('click', (e) => {
      if (e.target === modalBackdrop) closeDetailsModal();
    });
  }

  if (trailerCloseBtn) trailerCloseBtn.addEventListener('click', closeTrailerModal);
  if (trailerModal) {
    trailerModal.addEventListener('click', (e) => {
      if (e.target === trailerModal) closeTrailerModal();
    });
  }

  // Close modals on ESC key
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      if (trailerModal && trailerModal.classList.contains('open')) {
        closeTrailerModal();
      } else if (modalBackdrop && modalBackdrop.classList.contains('open')) {
        closeDetailsModal();
      }
    }
  });

  return {
    formatRating,
    formatYear,
    formatFullDate,
    formatRuntime,
    formatLanguage,
    updateWatchlistBadges,
    showToast,
    renderSkeletons,
    renderEmptyState,
    renderHero,
    createMovieCard,
    renderMovieGrid,
    renderGenrePills,
    openDetailsModal,
    closeDetailsModal,
    openTrailerModal,
    closeTrailerModal
  };
})();
