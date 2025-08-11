import jwt from 'jsonwebtoken';
import { config } from '../config/config';
import { logger } from '@lms/logger';
import { StringValue } from 'ms';

export interface TokenPayload {
  userId: string;
  email: string;
  role: string;
}

export interface JWTTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export const generateTokens = (payload: TokenPayload): JWTTokens => {
  try {
    // Convert string expiration times to seconds

    const accessToken = jwt.sign(payload, config.jwtSecret, {
      expiresIn: config.jwtExpiresIn as StringValue,
    });

    const refreshToken = jwt.sign(payload, config.jwtSecret, {
      expiresIn: config.jwtRefreshExpiresIn as StringValue,
    });

    // Calculate expiry time in seconds
    const expiresIn = Number(config.jwtExpiresIn);

    return {
      accessToken,
      refreshToken,
      expiresIn,
    };
  } catch (error) {
    logger.error('Token generation error:', error);
    throw new Error('Failed to generate tokens');
  }
};

export const verifyAccessToken = (token: string): TokenPayload => {
  try {
    return jwt.verify(token, config.jwtSecret) as TokenPayload;
  } catch (error) {
    throw new Error('Invalid access token');
  }
};

export const verifyRefreshToken = (token: string): TokenPayload => {
  try {
    return jwt.verify(token, config.jwtSecret) as TokenPayload;
  } catch (error) {
    throw new Error('Invalid refresh token');
  }
};
