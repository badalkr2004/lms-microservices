import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import { createProxyMiddleware, Options } from 'http-proxy-middleware';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import { conditionalAuth } from './middleware/auth.middleware';

dotenv.config();

const app = express();
const PORT = process.env.API_GATEWAY_PORT || 3000;

// Security middleware
app.use(helmet());
app.use(cors({
  origin: process.env.NODE_ENV === 'production' ? process.env.FRONTEND_URL : true,
  credentials: true,
}));
app.use(compression());
app.use(morgan('combined'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'), // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100'),
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

app.use('/api/', limiter);

// Authentication middleware (applies to all API routes)
app.use('/api/', conditionalAuth);

// Service configurations
interface ServiceConfig {
  target: string;
  pathRewrite: { [key: string]: string };
}

const services: { [key: string]: ServiceConfig } = {
  user: {
    target: `http://localhost:${process.env.USER_SERVICE_PORT || 3001}`,
    pathRewrite: { '^/api/user': '' },
  },
  course: {
    target: `http://localhost:${process.env.COURSE_SERVICE_PORT || 3002}`,
    pathRewrite: { '^/api/course': '' },
  },
  payment: {
    target: `http://localhost:${process.env.PAYMENT_SERVICE_PORT || 3003}`,
    pathRewrite: { '^/api/payment': '' },
  },
  assessment: {
    target: `http://localhost:${process.env.ASSESSMENT_SERVICE_PORT || 3004}`,
    pathRewrite: { '^/api/assessment': '' },
  },
  analytics: {
    target: `http://localhost:${process.env.ANALYTICS_SERVICE_PORT || 3005}`,
    pathRewrite: { '^/api/analytics': '' },
  },
  notification: {
    target: `http://localhost:${process.env.NOTIFICATION_SERVICE_PORT || 3006}`,
    pathRewrite: { '^/api/notification': '' },
  },
  liveSession: {
    target: `http://localhost:${process.env.LIVE_SESSION_SERVICE_PORT || 3007}`,
    pathRewrite: { '^/api/live-session': '' },
  },
  file: {
    target: `http://localhost:${process.env.FILE_SERVICE_PORT || 3008}`,
    pathRewrite: { '^/api/file': '' },
  },
};

// Setup proxy middleware for each service
Object.entries(services).forEach(([name, config]) => {
  const routePath = name === 'liveSession' ? '/api/live-session' : `/api/${name}`;
  
  app.use(routePath, createProxyMiddleware({
    target: config.target,
    changeOrigin: true,
    pathRewrite: config.pathRewrite,
    timeout: 30000,
    proxyTimeout: 30000,
    onError: (err: Error, req: Request, res: Response) => {
      console.error(`Proxy error for ${name}:`, err.message);
      res.status(503).json({
        error: 'Service temporarily unavailable',
        service: name,
      });
    },
    onProxyReq: (proxyReq:any, req: Request, res: Response) => {
      console.log(`Proxying ${req.method} ${req.url} to ${config.target}`);
    },
  } as Options));
});

// Health check endpoint
app.get('/health', (req: Request, res: Response) => {
  res.json({
    status: 'OK',
    service: 'API Gateway',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// Global error handler
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error('Gateway error:', err);
  res.status(500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong',
  });
});

// 404 handler - should be the last middleware
app.use((req: Request, res: Response) => {
  res.status(404).json({
    error: 'Route not found',
    path: req.originalUrl,
  });
});

app.listen(PORT, () => {
  console.log(`🚀 API Gateway running on port ${PORT}`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV}`);
  console.log(`📊 Services configured: ${Object.keys(services).join(', ')}`);
});