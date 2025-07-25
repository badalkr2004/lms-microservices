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
const PORT = process.env.PAYMENT_SERVICE_PORT || 3003;

// Middleware
app.use(helmet());
app.use(cors());
app.use(compression());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', service: 'payment-service' });
});

// Add routes here
app.use('/api/payments', (req, res) => {
  res.status(200).json({ message: 'Payment Service API - Ready to implement' });
});

// Error handling middleware
app.use(errorHandler);

// Start server
app.listen(PORT, () => {
  logger.info(`Payment Service running on port ${PORT}`);
});
