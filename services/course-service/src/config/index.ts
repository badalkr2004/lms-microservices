// src/config/index.ts
import dotenv from 'dotenv';

dotenv.config();

export const config = {
  port: process.env.COURSE_SERVICE_PORT || 3002,
  nodeEnv: process.env.NODE_ENV || 'development',
  database: {
    url: process.env.DATABASE_URL!,
  },
  jwt: {
    secret: process.env.JWT_SECRET || 'your-secret-key',
  },
  redis: {
    url: process.env.REDIS_URL || 'redis://localhost:6379',
  },
} as const;
