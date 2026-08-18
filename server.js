import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import apiRouter from './src/routes/api.js';
import { testConnection, closeDriver } from './src/config/database.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const DEFAULT_PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static frontend assets
app.use(express.static(path.join(__dirname, 'public')));

// API Routes
app.use('/api', apiRouter);

// Fallback route for SPA
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Unhandled server error:', err);
  res.status(500).json({
    success: false,
    error: 'Internal Server Error',
    message: err.message
  });
});

// Start server with automatic port retry if busy
function startServer(port) {
  const server = app.listen(port, async () => {
    console.log(`\n======================================================`);
    console.log(` OmniFlix Enterprise — Studio Graph Intelligence`);
    console.log(`🚀 Server running at: http://localhost:${port}`);
    console.log(`======================================================`);

    const dbStatus = await testConnection();
    if (dbStatus.connected) {
      console.log(`✅ Database Status: Connected to CognoDB (${dbStatus.latencyMs}ms latency)`);
    } else {
      console.warn(`⚠️ Database Status: CognoDB unreachable. Error: ${dbStatus.error}`);
      console.warn(`👉 Please check your COGNO_URI and COGNO_PASSWORD in .env`);
    }
    console.log(`======================================================\n`);
  });

  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.warn(`Port ${port} in use, trying port ${port + 1}...`);
      startServer(port + 1);
    } else {
      console.error('Server error:', err);
    }
  });

  async function gracefulShutdown(signal) {
    console.log(`\nReceived ${signal}. Closing HTTP server and CognoDB connection pool...`);
    server.close(async () => {
      await closeDriver();
      console.log('Server and database driver shut down cleanly.');
      process.exit(0);
    });
  }

  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
  process.on('SIGINT', () => gracefulShutdown('SIGINT'));
}

// Only start the HTTP listener if not running in Vercel serverless environment
if (!process.env.VERCEL) {
  startServer(DEFAULT_PORT);
}

export default app;
