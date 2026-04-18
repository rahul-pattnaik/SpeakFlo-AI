// backend/src/app.ts
import express, { Express, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import { v4 as uuidv4 } from 'uuid';
import rateLimit from 'express-rate-limit';
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';

// Routes
import authRoutes from './routes/auth';
import userRoutes from './routes/user';
import chatRoutes from './routes/chat';
import lessonRoutes from './routes/lessons';
import vocabularyRoutes from './routes/vocabulary';
import progressRoutes from './routes/progress';
import speakingRoutes from './routes/speaking';
import assessmentRoutes from './routes/assessment';
import adminRoutes from './routes/admin';
import healthRoutes from './routes/health';

// Middleware
import { authMiddleware } from './middleware/auth';
import { errorHandler } from './middleware/errorHandler';
import { requestIdMiddleware } from './middleware/requestId';
import { validationMiddleware } from './middleware/validation';
import { wsAuthMiddleware } from './middleware/wsAuth';

// Utils
import logger from './utils/logger';
import { AppError } from './utils/errorHandler';

// Types
interface CustomRequest extends Request {
  userId?: string;
  requestId?: string;
  user?: any;
}

// Initialize Express app
const app: Express = express();

// Create HTTP server for Socket.io
const httpServer = createServer(app);
const io = new SocketIOServer(httpServer, {
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
  },
  transports: ['websocket', 'polling'],
  maxHttpBufferSize: 50 * 1024 * 1024, // 50MB for audio uploads
});

// ==================== GLOBAL MIDDLEWARE ====================

// Security Headers
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", 'data:', 'https:'],
      connectSrc: ["'self'", 'https:', 'wss:'],
    },
  },
}));

// CORS Configuration
const corsOptions = {
  origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
    const allowedOrigins = [
      'http://localhost:3000',
      'http://localhost:3001',
      process.env.FRONTEND_URL,
      process.env.ADMIN_URL,
    ].filter(Boolean);

    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('CORS not allowed'));
    }
  },
  credentials: true,
  optionsSuccessStatus: 200,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-API-Version', 'X-Request-ID'],
};

app.use(cors(corsOptions));

// Compression
app.use(compression());

// Request Logging
const morganFormat = ':method :url :status :response-time ms - :res[content-length]';
app.use(morgan(morganFormat, {
  stream: {
    write: (message: string) => logger.info(message.trim()),
  },
}));

// Body Parsing
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Request ID Middleware (Tracing)
app.use(requestIdMiddleware);

// Rate Limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: (req: CustomRequest) => {
    // Different limits for different tiers
    const tier = req.user?.subscription_tier || 'free';
    const limits: Record<string, number> = {
      free: 100,
      pro: 500,
      premium: 2000,
    };
    return limits[tier] || 100;
  },
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req: CustomRequest) => req.userId || req.ip || 'unknown',
  skip: (req: CustomRequest) => {
    // Skip rate limiting for health checks and admin
    return req.path === '/health' || req.path.startsWith('/admin');
  },
});

app.use(limiter);

// ==================== PUBLIC ROUTES (No Auth Required) ====================

// Health Check
app.use('/health', healthRoutes);

// Authentication Routes
app.use('/api/v1/auth', authRoutes);

// ==================== PROTECTED ROUTES (Auth Required) ====================

// Validation & Auth Middleware
app.use('/api/v1', validationMiddleware);
app.use('/api/v1', authMiddleware as any);

// User Routes
app.use('/api/v1/user', userRoutes);

// Chat Routes
app.use('/api/v1/chat', chatRoutes);

// Lesson Routes
app.use('/api/v1/lessons', lessonRoutes);

// Vocabulary Routes
app.use('/api/v1/vocabulary', vocabularyRoutes);

// Progress Routes
app.use('/api/v1/progress', progressRoutes);

// Speaking Routes
app.use('/api/v1/speaking', speakingRoutes);

// Assessment Routes
app.use('/api/v1/assessment', assessmentRoutes);

// Admin Routes (with additional auth)
app.use('/api/v1/admin', adminRoutes);

// ==================== WEBSOCKET SETUP ====================

io.use(wsAuthMiddleware as any);

// Chat namespace
const chatNamespace = io.of('/socket.io');

chatNamespace.on('connection', (socket) => {
  logger.info(`WebSocket connected: ${socket.id}`);

  // User joins conversation room
  socket.on('join-conversation', (conversationId: string) => {
    socket.join(`conversation:${conversationId}`);
    logger.debug(`User joined conversation: ${conversationId}`);
  });

  // Handle incoming messages
  socket.on('message', (data) => {
    const { conversationId, message, format } = data;
    // Process message via service
    // Emit response to room
    chatNamespace.to(`conversation:${conversationId}`).emit('response', {
      conversationId,
      timestamp: new Date(),
      // ... response data
    });
  });

  socket.on('disconnect', () => {
    logger.info(`WebSocket disconnected: ${socket.id}`);
  });
});

// ==================== ERROR HANDLING ====================

// 404 Handler
app.use((req: CustomRequest, res: Response) => {
  const error = new AppError(`Route ${req.originalUrl} not found`, 404);
  res.status(error.statusCode).json({
    error: {
      code: 'NOT_FOUND',
      message: error.message,
      requestId: req.requestId,
      timestamp: new Date().toISOString(),
    },
  });
});

// Global Error Handler (must be last)
app.use(errorHandler);

// ==================== GRACEFUL SHUTDOWN ====================

const gracefulShutdown = () => {
  logger.info('Shutting down gracefully...');
  
  httpServer.close(() => {
    logger.info('HTTP server closed');
    process.exit(0);
  });

  // Force close after 30 seconds
  setTimeout(() => {
    logger.error('Forced shutdown after 30s');
    process.exit(1);
  }, 30000);
};

process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);

process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
  gracefulShutdown();
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

// ==================== EXPORTS ====================

export { app, httpServer, io };
