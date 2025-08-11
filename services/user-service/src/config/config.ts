import dotenv from 'dotenv';

dotenv.config();

export const config = {
  port: process.env.USER_SERVICE_PORT || 3001,
  jwtSecret: process.env.JWT_SECRET || 'your-secret-key',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  jwtRefreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '30d',
  firebase: {
    serviceAccount: process.env.FIREBASE_SERVICE_ACCOUNT_KEY,
    projectId: process.env.FIREBASE_PROJECT_ID,
  },
  bcrypt: {
    saltRounds: parseInt(process.env.BCRYPT_SALT_ROUNDS || '12'),
  },
  rateLimit: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100,
  },
};
