import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import { errorHandler } from '@lms/common';
import { logger } from '@lms/logger';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.NOTIFICATION_SERVICE_PORT || 3006;

// Middleware
app.use(helmet());
app.use(cors());
app.use(compression());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', service: 'notification-service' });
});

// Add routes here
app.use('/api/notifications', (req, res) => {
  res.status(200).json({ message: 'Notification Service API - Ready to implement' });
});

// Error handling middleware
app.use(errorHandler);

// Start server
app.listen(PORT, () => {
  logger.info(`Notification Service running on port ${PORT}`);
});
