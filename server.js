const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

// Import refactored modules
const config = require('./config/default');
const Logger = require('./src/utils/Logger');
const YouTubeService = require('./src/services/YouTubeService');
const SocketHandlers = require('./src/handlers/SocketHandlers');
const RoomManager = require('./src/services/RoomManager');

// Initialize logger
const logger = new Logger('Server');

// Create Express app and server
const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: config.server.corsOrigin,
    methods: ["GET", "POST"],
    credentials: true
  }
});

// Initialize services
const youtubeService = new YouTubeService(config.youtube.apiKey, config.youtube.searchMaxResults);
const socketHandlers = new SocketHandlers(io);

// Middleware
app.use(cors({
  origin: config.server.corsOrigin,
  credentials: true
}));
app.use(express.json());
app.use(express.static(path.join(__dirname, 'client/build')));

// Health check endpoint
app.get('/api/health', (req, res) => {
  const stats = RoomManager.getStats();
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    environment: config.server.nodeEnv,
    stats
  });
});

// YouTube search endpoint
app.get('/api/search', async (req, res) => {
  try {
    const { q } = req.query;
    
    if (!q || q.trim().length === 0) {
      return res.status(400).json({ 
        error: 'Search query required',
        message: 'Please provide a non-empty search query'
      });
    }

    if (q.length > 100) {
      return res.status(400).json({ 
        error: 'Search query too long',
        message: 'Search query must be less than 100 characters'
      });
    }

    const videos = await youtubeService.searchVideos(q.trim());
    
    logger.info('YouTube search completed', {
      query: q.trim(),
      resultCount: videos.length,
      ip: req.ip
    });

    res.json(videos);
    
  } catch (error) {
    logger.error('YouTube search failed', {
      query: req.query.q,
      error: error.message,
      ip: req.ip
    });

    if (error.message.includes('API key')) {
      return res.status(500).json({ 
        error: 'YouTube API configuration error',
        message: 'Please configure YouTube API key'
      });
    }

    if (error.message.includes('quota')) {
      return res.status(429).json({ 
        error: 'Rate limit exceeded',
        message: 'YouTube API quota exceeded. Please try again later.'
      });
    }

    res.status(500).json({ 
      error: 'Search failed',
      message: 'Unable to search videos at this time'
    });
  }
});

// Socket.IO connection handling
io.on('connection', (socket) => {
  socketHandlers.handleConnection(socket);
});

// Serve React app in production
if (config.server.nodeEnv === 'production') {
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'client/build', 'index.html'));
  });
}

// Error handling middleware
app.use((err, req, res, next) => {
  logger.error('Unhandled error', {
    error: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method
  });

  res.status(500).json({
    error: 'Internal server error',
    message: config.server.nodeEnv === 'development' ? err.message : 'Something went wrong'
  });
});

// Graceful shutdown
const gracefulShutdown = (signal) => {
  logger.info(`Received ${signal}, starting graceful shutdown`);
  
  socketHandlers.stop();
  
  server.close((err) => {
    if (err) {
      logger.error('Error during server shutdown', { error: err.message });
      process.exit(1);
    }
    
    logger.info('Server closed successfully');
    process.exit(0);
  });

  // Force shutdown after 10 seconds
  setTimeout(() => {
    logger.warn('Forcing shutdown');
    process.exit(1);
  }, 10000);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Start server
const PORT = config.server.port;
server.listen(PORT, () => {
  logger.info('Server started', {
    port: PORT,
    environment: config.server.nodeEnv,
    corsOrigin: config.server.corsOrigin
  });
});
