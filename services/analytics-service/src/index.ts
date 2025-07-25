import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import { errorHandler } from '@lms/common';
import { logger } from '@lms/logger';

dotenv.config();

const app = express();
const PORT = process.env.ANALYTICS_SERVICE_PORT || 3005;

// Middleware
app.use(helmet());
app.use(cors());
app.use(compression());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    service: 'User Service',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});


// Add routes here
app.use('/api/analytics', (req, res) => {
  res.status(200).json({ message: 'Analytics Service API - Ready to implement' });
});

// Error handling middleware
app.use(errorHandler);

// Start server
app.listen(PORT, () => {
  logger.info(`Analytics Service running on port ${PORT}`);
});
