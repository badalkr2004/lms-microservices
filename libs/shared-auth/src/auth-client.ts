import axios, { AxiosInstance } from 'axios';
import crypto from 'crypto';
import { logger } from '@lms/logger';
import dotenv from 'dotenv';

dotenv.config();

export interface UserData {
  id: string;
  email: string;
  role: string;
  status: string;
  emailVerified: boolean;
}

export interface TokenVerificationResult {
  user: UserData;
  tokenPayload: {
    userId: string;
    email: string;
    role: string;
  };
}

export interface PermissionCheckResult {
  userId: string;
  resource: string;
  action: string;
  hasPermission: boolean;
  userRole: string;
}

export interface UserProfile {
  user: UserData;
  profile: {
    firstName?: string;
    lastName?: string;
    bio?: string;
  };
}

export class AuthClient {
  private axiosInstance: AxiosInstance;
  private serviceId: string;
  private apiKey: string;
  private secretKey: string;
  private userServiceUrl: string;

  constructor(config: {
    serviceId: string;
    apiKey: string;
    secretKey: string;
    userServiceUrl: string;
  }) {
    this.serviceId = config.serviceId;
    this.apiKey = config.apiKey;
    this.secretKey = config.secretKey;
    this.userServiceUrl = config.userServiceUrl;

    this.axiosInstance = axios.create({
      baseURL: this.userServiceUrl,
      timeout: 10000,
    });
  }

  /**
   * Verify a user token with the user service
   */
  async verifyToken(token: string): Promise<TokenVerificationResult> {
    try {
      const response = await this.makeAuthenticatedRequest('/api/auth-verification/verify-token', {
        token,
      });

      return response.data.data;
    } catch (error) {
      logger.error('Token verification failed:', error);
      throw new Error('Token verification failed');
    }
  }

  /**
   * Check if a user has permission for a specific resource and action
   */
  async checkPermissions(
    userId: string,
    resource: string,
    action: string,
    context?: any
  ): Promise<PermissionCheckResult> {
    try {
      const response = await this.makeAuthenticatedRequest(
        '/api/auth-verification/check-permissions',
        {
          userId,
          resource,
          action,
          context,
        }
      );

      return response.data.data;
    } catch (error) {
      logger.error('Permission check failed:', error);
      throw new Error('Permission check failed');
    }
  }

  /**
   * Get user profile data
   */
  async getUserProfile(userId: string): Promise<UserProfile> {
    try {
      const response = await this.makeAuthenticatedRequest(
        `/api/auth-verification/user-profile/${userId}`,
        {},
        'GET'
      );

      return response.data.data;
    } catch (error) {
      logger.error('Get user profile failed:', error);
      throw new Error('Failed to get user profile');
    }
  }

  /**
   * Make an authenticated request to the user service
   */
  private async makeAuthenticatedRequest(
    endpoint: string,
    data: any = {},
    method: 'POST' | 'GET' = 'POST'
  ) {
    const timestamp = Date.now().toString();
    const payload = `${this.serviceId}:${timestamp}:${JSON.stringify(data)}`;
    const signature = crypto.createHmac('sha256', this.secretKey).update(payload).digest('hex');

    const headers = {
      'x-service-api-key': this.apiKey,
      'x-service-id': this.serviceId,
      'x-timestamp': timestamp,
      'x-signature': signature,
      'Content-Type': 'application/json',
    };

    if (method === 'GET') {
      return this.axiosInstance.get(endpoint, { headers });
    } else {
      return this.axiosInstance.post(endpoint, data, { headers });
    }
  }
}

/**
 * Create an auth client instance for a service
 */
export function createAuthClient(serviceId: string): AuthClient {
  const envVarName = `${serviceId.toUpperCase().replace('-', '_')}_API_KEY`;
  const apiKey = process.env[envVarName];
  
  const config = {
    serviceId,
    apiKey: apiKey || `${serviceId}_dev_key_12345`, // Default for development
    secretKey: process.env.SERVICE_SECRET_KEY || 'dev-secret-key-12345',
    userServiceUrl: process.env.USER_SERVICE_URL || 'http://localhost:3001',
  };

  // Only throw error in production
  if (!apiKey && process.env.NODE_ENV === 'production') {
    throw new Error(`API key not found for service: ${serviceId}. Set ${envVarName} environment variable.`);
  }

  // Log warning in development
  if (!apiKey) {
    logger.warn(`Using default API key for ${serviceId}. Set ${envVarName} environment variable for production.`);
  }

  return new AuthClient(config);
}
