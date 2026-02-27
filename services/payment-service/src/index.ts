// index.ts
import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import { errorHandler } from '@lms/common';
import { logger } from '@lms/logger';
import { paymentRoutes } from '@/routes/payment.route';
import { payoutRoutes } from '@/routes/payout.route';

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
  res.status(200).json({
    status: 'ok',
    service: 'payment-service',
    timestamp: new Date().toISOString(),
  });
});

// Routes
app.use('/api/payments', paymentRoutes);
app.use('/api/payouts', payoutRoutes);

// Error handling middleware
app.use(errorHandler);

// Start server
app.listen(PORT, () => {
  logger.info(`Payment Service running on port ${PORT}`);
});
