import { Api } from './api.js';
import { GraphVisualizer } from './graphVisualizer.js';

let visualizer = null;
let currentMovieToEdit = null;
let currentMovieToDelete = null;
let currentMovieForReview = null;
let allGenresList = [];
let allPeopleList = [];

// Toast Notifications Helper
function showToast(message, type = 'success') {
  const container = document.getElementById('toastContainer');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `
    <span>${type === 'success' ? '✅' : '⚠️'}</span>
    <span>${message}</span>
  `;
  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(100%)';
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}

// Format Cypher Query Inspector Display
function updateCypherInspector(query, params = {}, executionTimeMs = 0) {
  const inspector = document.getElementById('activeCypherQuery');
  const latencyBadge = document.getElementById('queryLatencyBadge');
  if (inspector) {
    let text = query.trim();
    if (Object.keys(params).length > 0) {
      text += `\n\n// Parameters:\n${JSON.stringify(params, null, 2)}`;
    }
    inspector.textContent = text;
  }
  if (latencyBadge) {
    latencyBadge.textContent = `${executionTimeMs}ms`;
  }
}

// Load Database Connection Health & Metrics
async function loadHealthAndStats() {
  try {
    const health = await Api.getHealth();
    const statusPill = document.getElementById('dbStatusPill');
    const statusText = document.getElementById('dbStatusText');

    if (health.success) {
      statusPill.className = 'db-status-pill';
      statusText.textContent = `CognoDB Online (${health.status.latencyMs}ms)`;
    } else {
      statusPill.className = 'db-status-pill disconnected';
      statusText.textContent = `CognoDB Disconnected`;
    }

    const stats = await Api.getStats();
    if (stats.success) {
      document.getElementById('metricMovies').textContent = 
        stats.labels.find(l => l.label === 'Movie')?.count || '0';
      document.getElementById('metricPeople').textContent = 
        stats.labels.find(l => l.label === 'Person')?.count || '0';
      document.getElementById('metricGenres').textContent = 
        stats.labels.find(l => l.label === 'Genre')?.count || '0';
      document.getElementById('metricRelationships').textContent = 
        stats.totalRelationships || '0';
    }
  } catch (err) {
    console.error('Failed to load health/stats:', err);
  }
}

// Load Genres Filter Dropdown & Pills
async function loadGenres() {
  try {
    const res = await Api.getGenres();
    if (res.success) {
      allGenresList = res.genres.map(g => g.name);
      const genreSelect = document.getElementById('genreFilter');
      if (genreSelect) {
        genreSelect.innerHTML = '<option value="">All Genres</option>';
        res.genres.forEach(g => {
          const opt = document.createElement('option');
          opt.value = g.name;
          opt.textContent = `${g.name} (${g.movieCount})`;
          genreSelect.appendChild(opt);
        });
      }
    }
  } catch (err) {
    console.error('Failed to load genres:', err);
  }
}

// Load Movies Grid (CRUD: Read)
async function loadMovies() {
  const grid = document.getElementById('movieGrid');
  grid.innerHTML = `
    <div class="empty-state" style="grid-column: 1 / -1;">
      <div class="empty-icon">⏳</div>
      <p>Querying CognoDB graph nodes...</p>
    </div>
  `;

  const search = document.getElementById('movieSearchInput').value.trim();
  const genre = document.getElementById('genreFilter').value;
  const yearMin = document.getElementById('yearMinInput').value;

  try {
    const res = await Api.getMovies({ search, genre, yearMin });
    if (!res.success || res.movies.length === 0) {
      grid.innerHTML = `
        <div class="empty-state" style="grid-column: 1 / -1;">
          <div class="empty-icon">🎬</div>
          <h3>No Movies Found</h3>
          <p>Try refining your search or add a new movie to CognoDB.</p>
        </div>
      `;
      return;
    }

    if (res.querySummary) {
      updateCypherInspector(res.querySummary.query, res.querySummary.params, res.querySummary.executionTimeMs);
    }

    grid.innerHTML = res.movies.map(m => `
      <div class="movie-card" data-title="${encodeURIComponent(m.title)}">
        <div class="movie-poster-wrap">
          <img class="movie-poster" src="${m.poster || 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=500&auto=format&fit=crop&q=80'}" alt="${m.title}" loading="lazy" onerror="this.src='https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=500&auto=format&fit=crop&q=80'" />
          <div class="movie-rating-badge">
            <span>★</span>
            <span>${m.imdbRating || 'N/A'}</span>
          </div>
        </div>
        <div class="movie-content">
          <div class="movie-header">
            <h3 class="movie-title">${m.title}</h3>
            <span class="movie-year">${m.released || ''}</span>
          </div>
          ${m.tagline ? `<p class="movie-tagline">"${m.tagline}"</p>` : ''}
          <div class="genre-tags">
            ${(m.genres || []).map(g => `<span class="genre-tag">${g}</span>`).join('')}
          </div>
          ${m.directors?.length ? `<div class="cast-preview"><strong>Dir:</strong> ${m.directors.join(', ')}</div>` : ''}
          ${m.cast?.length ? `<div class="cast-preview"><strong>Cast:</strong> ${m.cast.map(c => c.name).slice(0, 3).join(', ')}</div>` : ''}
          
          <div class="card-actions">
            <button class="btn btn-sm btn-primary view-details-btn" data-title="${encodeURIComponent(m.title)}">
              🔍 Inspect Graph
            </button>
            <div class="action-buttons-group">
              <button class="btn btn-sm review-btn" title="Add Review" data-title="${encodeURIComponent(m.title)}">
                ⭐
              </button>
              <button class="btn btn-sm edit-movie-btn" title="Edit Movie" data-title="${encodeURIComponent(m.title)}">
                ✏️
              </button>
              <button class="btn btn-sm btn-danger delete-movie-btn" title="Delete Movie" data-title="${encodeURIComponent(m.title)}">
                🗑️
              </button>
            </div>
          </div>
        </div>
      </div>
    `).join('');

    // Attach card event listeners
    grid.querySelectorAll('.view-details-btn').forEach(btn => {
      btn.addEventListener('click', () => openMovieDetails(decodeURIComponent(btn.dataset.title)));
    });
    grid.querySelectorAll('.edit-movie-btn').forEach(btn => {
      btn.addEventListener('click', () => openEditMovieModal(decodeURIComponent(btn.dataset.title)));
    });
    grid.querySelectorAll('.delete-movie-btn').forEach(btn => {
      btn.addEventListener('click', () => openDeleteModal(decodeURIComponent(btn.dataset.title)));
    });
    grid.querySelectorAll('.review-btn').forEach(btn => {
      btn.addEventListener('click', () => openReviewModal(decodeURIComponent(btn.dataset.title)));
    });

  } catch (err) {
    grid.innerHTML = `
      <div class="empty-state" style="grid-column: 1 / -1;">
        <div class="empty-icon">⚠️</div>
        <h3>Failed to Connect</h3>
        <p>${err.message}</p>
      </div>
    `;
  }
}

// Open Movie Details & Graph Drawer
async function openMovieDetails(title) {
  try {
    const res = await Api.getMovie(title);
    if (!res.success) return;
    const m = res.movie;

    document.getElementById('detailModalTitle').textContent = m.title;
    document.getElementById('detailModalYear').textContent = m.released ? `(${m.released})` : '';
    document.getElementById('detailModalPoster').src = m.poster || 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=500&auto=format&fit=crop&q=80';
    document.getElementById('detailModalTagline').textContent = m.tagline ? `"${m.tagline}"` : '';
    document.getElementById('detailModalOverview').textContent = m.overview || 'No synopsis provided.';
    document.getElementById('detailModalRating').textContent = `IMDb: ${m.imdbRating || 'N/A'} ★`;
    document.getElementById('detailModalDuration').textContent = m.duration ? `${m.duration} mins` : '';
    
    // Genres
    document.getElementById('detailModalGenres').innerHTML = (m.genres || [])
      .map(g => `<span class="genre-tag">${g}</span>`).join('');

    // Directors & Cast
    document.getElementById('detailModalDirectors').innerHTML = (m.directors || [])
      .map(d => `<span class="tag-badge">🎬 ${d.name}</span>`).join('') || '<span class="text-muted">None listed</span>';

    document.getElementById('detailModalCast').innerHTML = (m.cast || [])
      .map(c => `<div class="cast-chip"><strong>${c.name}</strong> ${c.roles ? `as <em>${c.roles.join(', ')}</em>` : ''}</div>`).join('') || '<span class="text-muted">None listed</span>';

    // User reviews
    const reviewsWrap = document.getElementById('detailModalReviews');
    if (m.reviews && m.reviews.length > 0) {
      reviewsWrap.innerHTML = m.reviews.map(r => `
        <div class="review-card">
          <div class="review-header">
            <strong>👤 ${r.username}</strong>
            <span class="review-score">★ ${r.rating}/10</span>
          </div>
          <p class="review-body">${r.review || ''}</p>
        </div>
      `).join('');
    } else {
      reviewsWrap.innerHTML = '<p class="text-muted" style="font-size: 0.85rem;">No community reviews yet. Be the first to rate!</p>';
    }

    // Load recommendations in detail modal
    loadRecommendationsForModal(m.title);

    // Open Modal
    document.getElementById('movieDetailModal').classList.add('active');

    // Focus on Visualizer button
    document.getElementById('focusGraphFromDetailBtn').onclick = () => {
      document.getElementById('movieDetailModal').classList.remove('active');
      switchTab('graphTab');
      loadVisualizerData(m.title);
    };

  } catch (err) {
    showToast(`Error: ${err.message}`, 'error');
  }
}

// Load Recommendations for a Movie
async function loadRecommendationsForModal(title) {
  const container = document.getElementById('detailModalRecommendations');
  container.innerHTML = '<p class="text-muted">Traversing multi-hop graph paths...</p>';
  try {
    const res = await Api.getRecommendations(title);
    if (!res.success || res.recommendations.length === 0) {
      container.innerHTML = '<p class="text-muted">No graph recommendations found for this node.</p>';
      return;
    }

    container.innerHTML = res.recommendations.map(r => `
      <div class="rec-mini-card">
        <div class="rec-header">
          <strong>${r.title}</strong>
          <span class="score-pill">+${r.relevanceScore} affinity</span>
        </div>
        <div class="rec-reasons">
          ${r.reasons.sharedDirectors.length ? `<div>🎬 Shared Dir: ${r.reasons.sharedDirectors.join(', ')}</div>` : ''}
          ${r.reasons.sharedActors.length ? `<div>🎭 Shared Cast: ${r.reasons.sharedActors.join(', ')}</div>` : ''}
          ${r.reasons.sharedGenres.length ? `<div>🏷️ Shared Genre: ${r.reasons.sharedGenres.join(', ')}</div>` : ''}
        </div>
      </div>
    `).join('');
  } catch (err) {
    container.innerHTML = `<p class="text-muted">Could not calculate recommendations: ${err.message}</p>`;
  }
}

// Load Full Graph Data for Canvas Visualizer
async function loadVisualizerData(centerTitle = '') {
  if (!visualizer) {
    visualizer = new GraphVisualizer('graphCanvas');
  }

  const indicator = document.getElementById('visualizerCenterTitle');
  if (indicator) {
    indicator.textContent = centerTitle ? `Centered on: "${centerTitle}"` : 'Full Graph Overview';
  }

  try {
    const res = await Api.getGraphData(centerTitle);
    if (res.success) {
      visualizer.setData(res.nodes, res.links);
      if (res.summary) {
        updateCypherInspector(res.summary.query, res.summary.params, res.summary.executionTimeMs);
      }
    }
  } catch (err) {
    showToast(`Visualizer error: ${err.message}`, 'error');
  }
}

// Degrees of Separation Path Finder (Multi-Hop Shortest Path)
async function runDegreesFinder() {
  const person1 = document.getElementById('pathPerson1').value.trim();
  const person2 = document.getElementById('pathPerson2').value.trim();
  const resultDiv = document.getElementById('pathResultContainer');

  if (!person1 || !person2) {
    showToast('Please specify both Actor/Director names', 'error');
    return;
  }

  resultDiv.innerHTML = '<div class="empty-state"><div class="empty-icon">⏳</div><p>Calculating shortest path traversal in CognoDB...</p></div>';

  try {
    const res = await Api.getDegreesOfSeparation(person1, person2);
    if (res.summary) {
      updateCypherInspector(res.summary.query, res.summary.params, res.summary.executionTimeMs);
    }

    if (!res.found) {
      resultDiv.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">🔍</div>
          <h3>No Connection Found</h3>
          <p>${res.message}</p>
        </div>
      `;
      return;
    }

    const steps = res.pathNodes || [];
    resultDiv.innerHTML = `
      <div class="path-success-box">
        <div class="path-degree-header">
          <span class="badge-accent">🎯 ${res.degree} Degrees of Separation</span>
          <span class="text-muted">Shortest Path Found</span>
        </div>
        <div class="path-stepper">
          ${steps.map((step, idx) => `
            <div class="step-node">
              <div class="step-number">${idx + 1}</div>
              <div class="step-info">
                <span class="step-name">${step.name}</span>
                <span class="step-type">${step.labels[0]}</span>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    `;

  } catch (err) {
    resultDiv.innerHTML = `<div class="empty-state"><div class="empty-icon">⚠️</div><p>${err.message}</p></div>`;
  }
}

// Populate Actor Selection Dropdowns for Degrees of Separation
async function loadPeopleForDegrees() {
  try {
    const res = await Api.getPeople();
    if (res.success) {
      allPeopleList = res.people;
      const datalist = document.getElementById('peopleDataList');
      if (datalist) {
        datalist.innerHTML = res.people.map(p => `<option value="${p.name}">`).join('');
      }
    }
  } catch (err) {
    console.error('Failed to load people:', err);
  }
}

// Frequent Co-Star Collaborations
async function loadCoStars() {
  const container = document.getElementById('costarGrid');
  if (!container) return;
  container.innerHTML = '<div class="empty-state" style="grid-column: 1 / -1;"><div class="empty-icon">⏳</div><p>Calculating co-star networks...</p></div>';

  try {
    const res = await Api.getCoStars();
    if (res.summary) {
      updateCypherInspector(res.summary.query, res.summary.params, res.summary.executionTimeMs);
    }
    if (!res.success || res.collaborations.length === 0) {
      container.innerHTML = '<div class="empty-state" style="grid-column: 1 / -1;"><p>No multi-film co-stars found.</p></div>';
      return;
    }

    container.innerHTML = res.collaborations.map(c => `
      <div class="card-panel">
        <div class="costar-header">
          <div>
            <h4 style="font-weight: 700;">${c.actor1} & ${c.actor2}</h4>
            <span class="text-muted" style="font-size: 0.8rem;">${c.count} shared films together</span>
          </div>
          <span class="badge-accent">${c.count} Films</span>
        </div>
        <div class="costar-movies">
          ${c.movies.map(m => `<span class="movie-pill">🎬 ${m}</span>`).join('')}
        </div>
      </div>
    `).join('');
  } catch (err) {
    container.innerHTML = `<div class="empty-state" style="grid-column: 1 / -1;"><p>${err.message}</p></div>`;
  }
}

// Cypher Playground Query Runner
async function runCypherPlayground() {
  const query = document.getElementById('cypherPlaygroundEditor').value.trim();
  const output = document.getElementById('cypherOutputConsole');
  if (!query) return;

  output.textContent = '// Executing query on CognoDB instance...';
  try {
    const res = await Api.runCustomCypher(query);
    if (!res.success) {
      output.textContent = `// Error:\n${res.error}`;
      return;
    }
    output.textContent = `// Result (${res.records.length} records returned in ${res.summary?.executionTimeMs || 0}ms):\n` +
      JSON.stringify(res.records, null, 2);
  } catch (err) {
    output.textContent = `// Query Failed:\n${err.message}`;
  }
}

// Modal Handlers: Add Movie
function openAddMovieModal() {
  document.getElementById('movieModalTitle').textContent = 'Add New Movie to CognoDB';
  document.getElementById('movieForm').reset();
  document.getElementById('movieFormTitle').value = '';
  document.getElementById('movieFormOldTitle').value = '';
  document.getElementById('movieModal').classList.add('active');
}

// Modal Handlers: Edit Movie
async function openEditMovieModal(title) {
  try {
    const res = await Api.getMovie(title);
    if (!res.success) return;
    const m = res.movie;

    document.getElementById('movieModalTitle').textContent = `Edit Movie: ${m.title}`;
    document.getElementById('movieFormOldTitle').value = m.title;
    document.getElementById('movieFormTitle').value = m.title;
    document.getElementById('movieFormYear').value = m.released || '';
    document.getElementById('movieFormDuration').value = m.duration || '';
    document.getElementById('movieFormRating').value = m.imdbRating || '';
    document.getElementById('movieFormTagline').value = m.tagline || '';
    document.getElementById('movieFormOverview').value = m.overview || '';
    document.getElementById('movieFormPoster').value = m.poster || '';
    document.getElementById('movieFormDirectors').value = (m.directors || []).map(d => d.name).join(', ');
    document.getElementById('movieFormCast').value = (m.cast || []).map(c => c.name).join(', ');
    document.getElementById('movieFormGenres').value = (m.genres || []).join(', ');

    document.getElementById('movieModal').classList.add('active');
  } catch (err) {
    showToast(`Error: ${err.message}`, 'error');
  }
}

// Modal Handlers: Review
function openReviewModal(title) {
  currentMovieForReview = title;
  document.getElementById('reviewModalMovieTitle').textContent = title;
  document.getElementById('reviewForm').reset();
  document.getElementById('reviewModal').classList.add('active');
}

// Modal Handlers: Delete
function openDeleteModal(title) {
  currentMovieToDelete = title;
  document.getElementById('deleteMovieTargetTitle').textContent = `"${title}"`;
  document.getElementById('deleteConfirmModal').classList.add('active');
}

// Tab Switching
function switchTab(tabId) {
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));

  const btn = document.querySelector(`.tab-btn[data-tab="${tabId}"]`);
  const content = document.getElementById(tabId);

  if (btn) btn.classList.add('active');
  if (content) content.classList.add('active');

  if (tabId === 'graphTab') {
    setTimeout(() => {
      if (!visualizer) {
        visualizer = new GraphVisualizer('graphCanvas');
        loadVisualizerData();
      } else {
        visualizer.initCanvasSize();
        if (visualizer.nodes.length === 0) {
          loadVisualizerData();
        }
      }
    }, 50);
  } else if (tabId === 'degreesTab') {
    loadPeopleForDegrees();
  } else if (tabId === 'networkTab') {
    loadCoStars();
  }
}

// Global hook when a node is clicked inside the Canvas Visualizer
window.onGraphNodeClick = (node) => {
  if (node.label === 'Movie') {
    openMovieDetails(node.name);
  } else if (node.label === 'Person') {
    document.getElementById('pathPerson1').value = node.name;
    switchTab('degreesTab');
    showToast(`Selected "${node.name}" in Degrees of Separation Explorer!`);
  }
};

// DOM Initialization
document.addEventListener('DOMContentLoaded', () => {
  // Navigation Tabs
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => switchTab(btn.dataset.tab));
  });

  // Action: Add Movie Button
  document.getElementById('addMovieBtn').addEventListener('click', openAddMovieModal);

  // Search & Filter Events
  document.getElementById('movieSearchInput').addEventListener('input', () => loadMovies());
  document.getElementById('genreFilter').addEventListener('change', () => loadMovies());
  document.getElementById('yearMinInput').addEventListener('change', () => loadMovies());

  // Close modals
  document.querySelectorAll('.modal-close-btn, .modal-cancel-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.modal-overlay').forEach(m => m.classList.remove('active'));
    });
  });

  // Form Submit: Add / Edit Movie
  document.getElementById('movieForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const oldTitle = document.getElementById('movieFormOldTitle').value.trim();
    const title = document.getElementById('movieFormTitle').value.trim();
    const released = document.getElementById('movieFormYear').value;
    const duration = document.getElementById('movieFormDuration').value;
    const imdbRating = document.getElementById('movieFormRating').value;
    const tagline = document.getElementById('movieFormTagline').value.trim();
    const overview = document.getElementById('movieFormOverview').value.trim();
    const poster = document.getElementById('movieFormPoster').value.trim();
    
    const directors = document.getElementById('movieFormDirectors').value
      .split(',').map(s => s.trim()).filter(Boolean);
    const cast = document.getElementById('movieFormCast').value
      .split(',').map(s => s.trim()).filter(Boolean).map(name => ({ name, roles: ['Cast'] }));
    const genres = document.getElementById('movieFormGenres').value
      .split(',').map(s => s.trim()).filter(Boolean);

    const payload = { title, released, duration, imdbRating, tagline, overview, poster, directors, cast, genres };

    try {
      let res;
      if (oldTitle) {
        res = await Api.updateMovie(oldTitle, payload);
        showToast(`Updated "${title}" successfully!`);
      } else {
        res = await Api.createMovie(payload);
        showToast(`Created "${title}" and linked graph relations!`);
      }

      document.getElementById('movieModal').classList.remove('active');
      await loadMovies();
      await loadHealthAndStats();
      await loadGenres();
    } catch (err) {
      showToast(`Operation failed: ${err.message}`, 'error');
    }
  });

  // Form Submit: Delete Movie
  document.getElementById('confirmDeleteBtn').addEventListener('click', async () => {
    if (!currentMovieToDelete) return;
    try {
      const res = await Api.deleteMovie(currentMovieToDelete);
      showToast(`Deleted "${currentMovieToDelete}" from CognoDB.`);
      document.getElementById('deleteConfirmModal').classList.remove('active');
      currentMovieToDelete = null;
      await loadMovies();
      await loadHealthAndStats();
    } catch (err) {
      showToast(`Delete failed: ${err.message}`, 'error');
    }
  });

  // Form Submit: Review
  document.getElementById('reviewForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!currentMovieForReview) return;
    const username = document.getElementById('reviewUsername').value.trim();
    const rating = document.getElementById('reviewRating').value;
    const review = document.getElementById('reviewComment').value.trim();

    try {
      await Api.addReview(currentMovieForReview, { username, rating, review });
      showToast(`Review added for "${currentMovieForReview}"!`);
      document.getElementById('reviewModal').classList.remove('active');
      currentMovieForReview = null;
      await loadMovies();
    } catch (err) {
      showToast(`Review failed: ${err.message}`, 'error');
    }
  });

  // Degrees of Separation controls
  document.getElementById('findPathBtn').addEventListener('click', runDegreesFinder);

  // Cypher Playground controls
  document.getElementById('runCypherBtn').addEventListener('click', runCypherPlayground);
  document.querySelectorAll('.preset-query-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.getElementById('cypherPlaygroundEditor').value = btn.dataset.query;
      runCypherPlayground();
    });
  });

  // Visualizer Controls
  document.getElementById('visZoomIn')?.addEventListener('click', () => visualizer?.zoomIn());
  document.getElementById('visZoomOut')?.addEventListener('click', () => visualizer?.zoomOut());
  document.getElementById('visReset')?.addEventListener('click', () => {
    visualizer?.resetView();
    loadVisualizerData();
  });

  // Initial Data Load
  loadHealthAndStats();
  loadGenres();
  loadMovies();
});
