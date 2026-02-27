// src/config/index.ts
import dotenv from 'dotenv';

dotenv.config();

export const config = {
  port: process.env.PAYMENT_SERVICE_PORT || 3003,
  nodeEnv: process.env.NODE_ENV || 'development',
  database: {
    url: process.env.DATABASE_URL!,
  },
  redis: {
    url: process.env.REDIS_URL || 'redis://localhost:6379',
  },
  fileService: {
    url: process.env.FILE_SERVICE_URL || 'http://localhost:3008',
  },
  courseService: {
    url: process.env.COURSE_SERVICE_URL || 'http://localhost:3002',
  },
  platformFeeRate: process.env.PLATFORM_FEE_RATE,
  taxRate: process.env.TAX_RATE,
  minPayAmount: process.env.MIN_PAYOUT_AMOUNT,
} as const;
