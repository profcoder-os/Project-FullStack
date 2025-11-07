require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');

const connectDB = require('./config/database');
const logger = require('./config/logger');
const WebSocketService = require('./services/websocketService');

// Import routes
const authRoutes = require('./routes/auth');
const documentRoutes = require('./routes/documents');
const userRoutes = require('./routes/users');
const healthRoutes = require('./routes/health');

const app = express();
const server = http.createServer(app);

// Socket.IO setup
const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL || "http://localhost:3000",
    methods: ["GET", "POST"],
    credentials: true,
  },
  pingTimeout: 60000,
  pingInterval: 25000,
});

// Initialize WebSocket service
let wsService;
try {
  wsService = new WebSocketService(io);
  wsService.initialize();
} catch (error) {
  logger.error(`Failed to initialize WebSocket service: ${error.message}`);
  logger.error(error.stack);
}

// CORS configuration - must be before other middleware
const corsOptions = {
  origin: function (origin, callback) {
    const allowedOrigins = [
      process.env.CLIENT_URL || "http://localhost:3000",
      "http://localhost:3000",
      "http://127.0.0.1:3000"
    ];
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(null, true); // Allow all origins in development
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Correlation-ID', 'X-Requested-With'],
  exposedHeaders: ['X-Correlation-ID'],
  preflightContinue: false,
  optionsSuccessStatus: 204
};

app.use(cors(corsOptions));

// Handle preflight requests explicitly
app.options('*', cors(corsOptions));

// Middleware
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" },
  crossOriginEmbedderPolicy: false,
}));
app.use(compression());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
  message: 'Too many requests from this IP, please try again later.',
});
app.use('/api/', limiter);

// Request logging middleware
app.use((req, res, next) => {
  const correlationId = req.headers['x-correlation-id'] || `req-${Date.now()}-${Math.random()}`;
  req.correlationId = correlationId;
  res.setHeader('X-Correlation-ID', correlationId);
  logger.info(`${req.method} ${req.path}`, { correlationId, ip: req.ip });
  next();
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/documents', documentRoutes);
app.use('/api/users', userRoutes);
app.use('/api/health', healthRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
  logger.error(`Error: ${err.message}`, {
    correlationId: req.correlationId,
    stack: err.stack,
  });
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error',
    correlationId: req.correlationId,
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Connect to database and start server
const PORT = process.env.PORT || 5001; // Changed to 5001 to avoid conflict with macOS AirPlay

connectDB()
  .then(() => {
    server.listen(PORT, () => {
      logger.info(`Server running on port ${PORT} in ${process.env.NODE_ENV || 'development'} mode`);
    });
  })
  .catch((error) => {
    logger.error(`Failed to start server: ${error.message}`);
    process.exit(1);
  });

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  server.close(() => {
    logger.info('Process terminated');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down gracefully');
  server.close(() => {
    logger.info('Process terminated');
    process.exit(0);
  });
});

// Make wsService available for health checks
app.locals.wsService = wsService;

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
  process.exit(1);
});

module.exports = { app, server, io };
