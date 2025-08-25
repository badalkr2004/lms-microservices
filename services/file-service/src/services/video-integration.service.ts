// src/services/video-integration.service.ts
import { videoService } from './video.service';
import { muxService } from './mux.service';
import { databaseService } from './database.service';
import { videoJobs } from '../jobs/video.jobs';
import { createLogger } from '../utils/logger';
import { config } from '../config';

const logger = createLogger('VideoIntegration');

/**
 * Main video integration service that coordinates all video-related operations
 */
export class VideoIntegrationService {
  private initialized = false;

  /**
   * Initialize the video service
   */
  async initialize() {
    if (this.initialized) {
      logger.warn('Video service already initialized');
      return;
    }

    try {
      logger.info('Initializing video integration service');

      // Verify Mux credentials
      const muxHealthy = await muxService.healthCheck();
      if (!muxHealthy) {
        throw new Error('Mux service is not accessible');
      }

      // Initialize background jobs
      if (config.ENABLE_VIDEO_JOBS !== 'false') {
        videoJobs.init();
      }

      // Cleanup any existing expired sessions on startup
      await videoService.cleanupExpiredSessions();

      this.initialized = true;
      logger.info('Video integration service initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize video integration service', { 
        error: error.message 
      });
      throw error;
    }
  }

  /**
   * Health check for entire video system
   */
  async healthCheck() {
    try {
      const checks = {
        videoService: true,
        muxService: await muxService.healthCheck(),
        database: true, // You can add DB health check
        backgroundJobs: this.initialized,
      };

      const isHealthy = Object.values(checks).every(check => check === true);

      return {
        healthy: isHealthy,
        services: checks,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      logger.error('Video system health check failed', { 
        error: error.message 
      });
      
      return {
        healthy: false,
        services: {
          videoService: false,
          muxService: false,
          database: false,
          backgroundJobs: false,
        },
        error: error.message,
        timestamp: new Date().toISOString(),
      };
    }
  }

  /**
   * Graceful shutdown
   */
  async shutdown() {
    try {
      logger.info('Shutting down video integration service');

      // Stop background jobs
      // Note: node-cron doesn't have a direct stop method for all tasks
      // You might want to track tasks and destroy them individually

      // Close any open connections
      // Mux client doesn't require explicit cleanup

      this.initialized = false;
      logger.info('Video integration service shut down successfully');
    } catch (error) {
      logger.error('Error during video service shutdown', { 
        error: error.message 
      });
    }
  }

  /**
   * Get system statistics
   */
  async getSystemStats() {
    try {
      const videoStats = await databaseService.getVideoProcessingStats();
      const uploadStats = await databaseService.getUploadSessionStats();

      return {
        videos: videoStats,
        uploads: uploadStats,
        system: {
          maxVideoSize: config.MAX_VIDEO_SIZE,
          supportedFormats: config.SUPPORTED_VIDEO_FORMATS,
          defaultExpiration: config.DEFAULT_VIDEO_EXPIRATION,
        },
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      logger.error('Failed to get system statistics', { 
        error: error.message 
      });
      throw error;
    }
  }
}

export const videoIntegrationService = new VideoIntegrationService();

// src/index.ts - Updates to integrate video service
import express, { Request, Response, NextFunction, Express } from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';

import { config } from './config';
import routes from './routes';
import { videoIntegrationService } from './services/video-integration.service';
import { 
  errorHandler, 
  notFoundHandler, 
  securityHeaders, 
  requestLogger,
  apiRateLimit 
} from "./middlewares";

// Load environment variables
dotenv.config();

const app: Express = express();
const PORT = config.PORT;

// Basic logger for development
const logger = {
  info: (message: string) => console.log(`[INFO] ${new Date().toISOString()} ${message}`),
  error: (message: string) => console.error(`[ERROR] ${new Date().toISOString()} ${message}`),
  warn: (message: string) => console.warn(`[WARN] ${new Date().toISOString()} ${message}`),
  debug: (message: string) => {
    if (config.NODE_ENV === 'development') {
      console.debug(`[DEBUG] ${new Date().toISOString()} ${message}`);
    }
  }
};

// Security middleware
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" },
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
      mediaSrc: ["'self'", "https://stream.mux.com", "https://image.mux.com"],
      connectSrc: ["'self'", "https://ingest.mux.com"],
    },
  },
}));

app.use(securityHeaders);

// CORS configuration with Mux support
app.use(cors({
  origin: config.CORS_ORIGIN,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type', 
    'Authorization', 
    'X-API-Key', 
    'X-Service-ID', 
    'X-User-ID', 
    'X-User-Role',
    'Mux-Signature'  // For webhook verification
  ],
}));

// General middleware
app.use(compression());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request logging
if (config.NODE_ENV !== 'test') {
  app.use(requestLogger);
}

// Rate limiting
app.use(apiRateLimit);

// Health check (before routes)
app.get('/health', async (req: Request, res: Response) => {
  try {
    const videoHealth = await videoIntegrationService.healthCheck();
    
    res.status(videoHealth.healthy ? 200 : 503).json({ 
      status: videoHealth.healthy ? 'ok' : 'degraded',
      service: 'file-service',
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      video: videoHealth,
    });
  } catch (error) {
    res.status(503).json({
      status: 'error',
      service: 'file-service',
      timestamp: new Date().toISOString(),
      error: error.message,
    });
  }
});

// Initialize video services before starting server
const initializeServices = async () => {
  try {
    logger.info('Initializing services...');
    await videoIntegrationService.initialize();
    logger.info('All services initialized successfully');
  } catch (error) {
    logger.error(`Service initialization failed: ${error.message}`);
    process.exit(1);
  }
};

// API routes
app.use('/api', routes);

// 404 handler
app.use(notFoundHandler);

// Global error handling middleware
app.use(errorHandler);

// Graceful shutdown handler
const gracefulShutdown = async (signal: string) => {
  logger.info(`Received ${signal}. Starting graceful shutdown...`);
  
  const server = app.listen(PORT);
  
  server.close(async () => {
    logger.info('HTTP server closed.');
    
    try {
      // Shutdown video services
      await videoIntegrationService.shutdown();
      
      // Close database connections
      // await client.end(); // Uncomment if you want to close DB connections
      
      logger.info('All services shut down gracefully');
      process.exit(0);
    } catch (error) {
      logger.error(`Error during shutdown: ${error.message}`);
      process.exit(1);
    }
  });

  // Force close server after 30 seconds
  setTimeout(() => {
    logger.error('Could not close connections in time, forcefully shutting down');
    process.exit(1);
  }, 30000);
};

// Handle process signals
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle uncaught exceptions and rejections
process.on('uncaughtException', (error) => {
  logger.error(`Uncaught Exception: ${error.message}`);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error(`Unhandled Rejection at: ${promise}, reason: ${reason}`);
  process.exit(1);
});

// Start server
const startServer = async () => {
  try {
    await initializeServices();
    
    const server = app.listen(PORT, () => {
      logger.info(`File Service running on port ${PORT}`);
      logger.info(`Environment: ${config.NODE_ENV}`);
      logger.info(`AWS Region: ${config.AWS_REGION}`);
      logger.info(`S3 Bucket: ${config.AWS_S3_BUCKET}`);
      logger.info(`Mux Integration: Enabled`);
      logger.info(`Video Jobs: ${config.ENABLE_VIDEO_JOBS !== 'false' ? 'Enabled' : 'Disabled'}`);
    });

    return server;
  } catch (error) {
    logger.error(`Failed to start server: ${error.message}`);
    process.exit(1);
  }
};

// Start the server
startServer();

export default app;