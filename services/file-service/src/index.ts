// src/index.ts
import express, { Request, Response, NextFunction, Express } from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';

import { config } from './config';
import routes from './routes';
import {
  errorHandler,
  notFoundHandler,
  securityHeaders,
  requestLogger,
  apiRateLimit,
} from './middlewares';
import { videoController } from './controllers/video.controller';

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
  },
};

// Security middleware
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        imgSrc: ["'self'", 'data:', 'https:'],
      },
    },
  })
);

app.use(securityHeaders);

// CORS configuration
// const corsOptions = {
//   origin: config.NODE_ENV === 'production'
//     ? ['https://your-lms-domain.com'] // Replace with your actual domains
//     : ["*"],
//   credentials: true,
//   methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
//   allowedHeaders: [
//     'Content-Type',
//     'Authorization',
//     'X-API-Key',
//     'X-Service-ID',
//     'X-User-ID',
//     'X-User-Role'
//   ],
// };

app.use(cors({ origin: 'http://127.0.0.1:5500' }));

app.use(
  '/api/videos/webhook',
  express.raw({ type: 'application/json' }),
  videoController.handleWebhook.bind(videoController)
);
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
app.get('/health', (req: Request, res: Response) => {
  res.status(200).json({
    status: 'ok',
    service: 'file-service',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
  });
});

// API routes
app.use('/api', routes);

// 404 handler
app.use(notFoundHandler);

// Global error handling middleware
app.use(errorHandler);

// Graceful shutdown handler
const gracefulShutdown = (signal: string) => {
  logger.info(`Received ${signal}. Starting graceful shutdown...`);

  const server = app.listen(PORT);

  server.close(() => {
    logger.info('HTTP server closed.');

    // Close database connections, cleanup resources, etc.
    process.exit(0);
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
process.on('uncaughtException', error => {
  logger.error(`Uncaught Exception: ${error.message}`);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error(`Unhandled Rejection at: ${promise}, reason: ${reason}`);
  process.exit(1);
});

// Start server
const server = app.listen(PORT, () => {
  logger.info(`File Service running on port ${PORT}`);
  logger.info(`Environment: ${config.NODE_ENV}`);
  logger.info(`AWS Region: ${config.AWS_REGION}`);
  logger.info(`S3 Bucket: ${config.AWS_S3_BUCKET}`);
});

export default app;

// import express, { Request, Response, NextFunction } from 'express';
// import dotenv from 'dotenv';
// import cors from 'cors';
// import helmet from 'helmet';
// import compression from 'compression';

// // Extended Error interface
// interface AppError extends Error {
//   statusCode?: number;
// }

// // Load environment variables
// dotenv.config();

// const app = express();
// const PORT = process.env.FILE_SERVICE_PORT || 3008;

// // Basic logger for development
// const logger = {
//   info: (message: string) => console.log(`[INFO] ${message}`),
//   error: (message: string) => console.error(`[ERROR] ${message}`),
//   warn: (message: string) => console.warn(`[WARN] ${message}`),
//   debug: (message: string) => console.debug(`[DEBUG] ${message}`)
// };

// // Middleware
// app.use(helmet());
// app.use(cors());
// app.use(compression());
// app.use(express.json());
// app.use(express.urlencoded({ extended: true }));

// // Health check
// app.get('/health', (req: Request, res: Response) => {
//   res.status(200).json({ status: 'ok', service: 'file-service' });
// });

// // Add routes here
// app.use('/api/files', (req: Request, res: Response) => {
//   res.status(200).json({ message: 'File Service API - Ready to implement' });
// });

// // Error handling middleware
// app.use((err: AppError, req: Request, res: Response, next: NextFunction) => {
//   const statusCode = err.statusCode || 500;

//   // Log error
//   logger.error(`${err.message}`);
//   if (process.env.NODE_ENV === 'development') {
//     console.error(err.stack);
//   }

//   res.status(statusCode).json({
//     status: 'error',
//     statusCode,
//     message: err.message || 'Internal Server Error',
//     ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
//   });
// });

// // Start server
// app.listen(PORT, () => {
//   logger.info(`File Service running on port ${PORT}`);
// });
