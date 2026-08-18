import express from 'express';
import { testConnection } from '../config/database.js';
import { MovieService } from '../services/movieService.js';

const router = express.Router();

// Middleware helper for standardized error handling
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(err => {
    console.error(`[API Error] ${req.method} ${req.originalUrl}:`, err);
    res.status(500).json({
      success: false,
      error: err.message || 'Internal Database / Server Error',
      stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
  });
};

/**
 * Health check & CognoDB connection test
 */
router.get('/health', asyncHandler(async (req, res) => {
  const status = await testConnection();
  res.json({
    success: status.connected,
    database: 'CognoDB (openCypher / Bolt)',
    status
  });
}));

/**
 * Database overview metrics & label distributions
 */
router.get('/stats', asyncHandler(async (req, res) => {
  const stats = await MovieService.getDatabaseStats();
  res.json({ success: true, ...stats });
}));

/**
 * List / Search / Filter movies (CRUD: Read)
 */
router.get('/movies', asyncHandler(async (req, res) => {
  const { search, genre, yearMin, yearMax, limit, skip } = req.query;
  const result = await MovieService.getMovies({ search, genre, yearMin, yearMax, limit, skip });
  res.json({
    success: true,
    total: result.movies.length,
    movies: result.movies,
    querySummary: result.summary
  });
}));

/**
 * Get single movie details by title
 */
router.get('/movies/:title', asyncHandler(async (req, res) => {
  const title = decodeURIComponent(req.params.title);
  const result = await MovieService.getMovieByTitle(title);
  if (!result) {
    return res.status(404).json({ success: false, error: `Movie "${title}" not found.` });
  }
  res.json({
    success: true,
    movie: result.movie,
    querySummary: result.summary
  });
}));

/**
 * Create a new Movie node & link relationships (CRUD: Create)
 */
router.post('/movies', asyncHandler(async (req, res) => {
  const { title, released, tagline, poster, imdbRating, overview, duration, directors, cast, genres } = req.body;
  if (!title || !title.trim()) {
    return res.status(400).json({ success: false, error: 'Movie title is required.' });
  }
  const result = await MovieService.createMovie({
    title, released, tagline, poster, imdbRating, overview, duration, directors, cast, genres
  });
  res.status(201).json({
    success: true,
    message: `Movie "${result.title}" successfully created and linked in CognoDB.`,
    ...result
  });
}));

/**
 * Update movie properties and relationships (CRUD: Update)
 */
router.put('/movies/:title', asyncHandler(async (req, res) => {
  const oldTitle = decodeURIComponent(req.params.title);
  const result = await MovieService.updateMovie(oldTitle, req.body);
  res.json({
    success: true,
    message: `Movie "${result.title}" updated successfully.`,
    ...result
  });
}));

/**
 * Delete a movie node and its relationships (CRUD: Delete)
 */
router.delete('/movies/:title', asyncHandler(async (req, res) => {
  const title = decodeURIComponent(req.params.title);
  const result = await MovieService.deleteMovie(title);
  res.json({
    success: true,
    message: `Movie "${title}" deleted from CognoDB.`,
    ...result
  });
}));

/**
 * Add a user rating/review
 */
router.post('/movies/:title/reviews', asyncHandler(async (req, res) => {
  const title = decodeURIComponent(req.params.title);
  const { username, rating, review } = req.body;
  if (!rating || isNaN(rating) || rating < 1 || rating > 10) {
    return res.status(400).json({ success: false, error: 'Rating must be a number between 1 and 10.' });
  }
  const result = await MovieService.addReview(title, { username, rating, review });
  res.status(201).json(result);
}));

/**
 * Multi-hop: Degrees of Separation between two people
 */
router.get('/paths/degrees', asyncHandler(async (req, res) => {
  const { person1, person2 } = req.query;
  if (!person1 || !person2) {
    return res.status(400).json({ success: false, error: 'Both person1 and person2 query parameters are required.' });
  }
  const result = await MovieService.getDegreesOfSeparation(person1, person2);
  res.json({ success: true, ...result });
}));

/**
 * Multi-hop: Graph Recommendations for a movie
 */
router.get('/recommendations/:title', asyncHandler(async (req, res) => {
  const title = decodeURIComponent(req.params.title);
  const limit = req.query.limit || 6;
  const result = await MovieService.getRecommendations(title, limit);
  res.json({ success: true, title, ...result });
}));

/**
 * Graph Collaboration: Top Co-Star partnerships
 */
router.get('/collaborations/costars', asyncHandler(async (req, res) => {
  const limit = req.query.limit || 8;
  const result = await MovieService.getTopCoStars(limit);
  res.json({ success: true, ...result });
}));

/**
 * People / Actors / Directors directory
 */
router.get('/people', asyncHandler(async (req, res) => {
  const { search, limit } = req.query;
  const result = await MovieService.getPeople({ search, limit });
  res.json({ success: true, ...result });
}));

/**
 * Genres list
 */
router.get('/genres', asyncHandler(async (req, res) => {
  const result = await MovieService.getGenres();
  res.json({ success: true, ...result });
}));

/**
 * Interactive Force-Directed Graph Visualization data
 */
router.get('/graph/visualization', asyncHandler(async (req, res) => {
  const { centerTitle, limitNodes } = req.query;
  const result = await MovieService.getGraphVisualizerData({ centerTitle, limitNodes });
  res.json({ success: true, ...result });
}));

/**
 * Interactive read-only Cypher query console runner
 */
router.post('/cypher/run', asyncHandler(async (req, res) => {
  const { query } = req.body;
  if (!query || !query.trim()) {
    return res.status(400).json({ success: false, error: 'Query string is required.' });
  }
  const result = await MovieService.runCustomCypher(query);
  res.json({
    success: true,
    records: result.records,
    summary: result.summary
  });
}));

export default router;
