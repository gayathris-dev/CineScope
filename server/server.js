const path = require('path');
const dotenv = require('dotenv');

// Load environment variables from .env file
dotenv.config({ path: path.join(__dirname, '../.env') });

const express = require('express');
const cors = require('cors');
const movieRoutes = require('./routes/movies');

const app = express();
const PORT = process.env.PORT || 3000;

// Enable CORS for external API consumers if any
app.use(cors());

// Parse incoming JSON requests
app.use(express.json());

// Serve static frontend files from 'public' directory
const publicDirectoryPath = path.join(__dirname, '../public');
app.use(express.static(publicDirectoryPath));

// API Routes
app.use('/api/movies', movieRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  const isKeyConfigured = Boolean(
    process.env.TMDB_API_KEY &&
    process.env.TMDB_API_KEY.trim() !== '' &&
    process.env.TMDB_API_KEY !== 'your_tmdb_api_key_here'
  );

  res.json({
    status: 'ok',
    appName: 'CineScope API Proxy',
    timestamp: new Date().toISOString(),
    tmdbConfigured: isKeyConfigured
  });
});

// Fallback route: serve index.html for single-page application navigation
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({
      success: false,
      error: `API route not found: ${req.method} ${req.path}`
    });
  }
  res.sendFile(path.join(publicDirectoryPath, 'index.html'));
});

// Centralized error handling middleware
app.use((err, req, res, next) => {
  const statusCode = err.statusCode || 500;
  const isKeyError = err.code === 'API_KEY_MISSING' || (err.statusCode === 401 && err.message?.includes('Invalid API key'));

  console.error(`[Error] ${req.method} ${req.originalUrl}:`, err.message);

  res.status(statusCode).json({
    success: false,
    error: err.message || 'Internal Server Error',
    code: err.code || (isKeyError ? 'API_KEY_ERROR' : 'SERVER_ERROR'),
    hint: isKeyError ? 'Please check your TMDB_API_KEY in the .env file.' : undefined
  });
});

// Start the server
app.listen(PORT, () => {
  const isKeyConfigured = Boolean(
    process.env.TMDB_API_KEY &&
    process.env.TMDB_API_KEY.trim() !== '' &&
    process.env.TMDB_API_KEY !== 'your_tmdb_api_key_here'
  );

  console.log('====================================================');
  console.log(`🎬 CineScope Movie Discovery Server is running!`);
  console.log(`📡 Local URL: http://localhost:${PORT}`);
  console.log(`🔑 TMDB API Key: ${isKeyConfigured ? '✅ Configured' : '⚠️ Missing / Not Configured (Add key to .env)'}`);
  console.log('====================================================');
});
