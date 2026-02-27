// src/index.ts - Final version with all routes
import express, { Express } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import { config } from './config';

// Import all routes
import { courseRoutes } from './routes/course.routes';
import { chapterRoutes } from './routes/chapter.routes';
import { lectureRoutes } from './routes/lecture.route';
import { enrollmentRoutes } from './routes/enrollment.routes';
import { categoryRoutes } from './routes/category.route';
import { progressRoutes } from './routes/progress.routes';
import { reviewRoutes } from './routes/review.routes';

import { errorHandler, notFound } from './middleware/error.middleware';
import { HealthService } from './utils/health';
import { internalRoutes } from './routes/internal.routes';

const app: Express = express();
const healthService = new HealthService();

// Middleware
app.use(helmet());
app.use(
  cors({
    origin: process.env.ALLOWED_ORIGINS?.split(',') || '*',
    credentials: true,
  })
);
app.use(compression());
app.use(morgan('combined'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// API Routes
app.use('/api/courses', courseRoutes);
app.use('/api/chapters', chapterRoutes);
app.use('/api/lectures', lectureRoutes);
app.use('/api/enrollments', enrollmentRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/progress', progressRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/internal', internalRoutes);

// Health check endpoints
app.get('/health', async (req, res) => {
  const health = await healthService.getOverallHealth();
  res.status(health.status === 'healthy' ? 200 : 503).json({
    ...health,
    service: 'Course Service',
    timestamp: new Date().toISOString(),
    environment: config.nodeEnv,
  });
});

app.get('/health/database', async (req, res) => {
  const dbHealth = await healthService.checkDatabase();
  res.status(dbHealth.status === 'healthy' ? 200 : 503).json(dbHealth);
});

// Metrics endpoint
app.get('/metrics', (req, res) => {
  res.json({
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    cpu: process.cpuUsage(),
    timestamp: new Date().toISOString(),
  });
});

// Error handling
app.use(notFound);
app.use(errorHandler);

const PORT = config.port;

// Graceful shutdown
const gracefulShutdown = (signal: string) => {
  console.log(`Received ${signal}. Starting graceful shutdown...`);

  server.close(() => {
    console.log('HTTP server closed.');
    process.exit(0);
  });

  setTimeout(() => {
    console.log('Force closing server...');
    process.exit(1);
  }, 10000);
};

const server = app.listen(PORT, () => {
  console.log(`🚀 Course Service running on port ${PORT}`);
  console.log(`🌍 Environment: ${config.nodeEnv}`);
  console.log(`📊 Health check: http://localhost:${PORT}/health`);
});

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

export default app;
