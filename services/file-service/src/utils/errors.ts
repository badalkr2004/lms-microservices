// src/utils/errors.ts
export class AppError extends Error {
  public statusCode: number;
  public isOperational: boolean;

  constructor(message: string, statusCode: number = 500) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }
}

// src/utils/logger.ts
export const createLogger = (service: string) => {
  const logLevel = process.env.LOG_LEVEL || 'info';
  
  return {
    info: (message: string, meta?: any) => {
      console.log(`[INFO] [${service}] ${new Date().toISOString()} ${message}`, meta || '');
    },
    error: (message: string, meta?: any) => {
      console.error(`[ERROR] [${service}] ${new Date().toISOString()} ${message}`, meta || '');
    },
    warn: (message: string, meta?: any) => {
      console.warn(`[WARN] [${service}] ${new Date().toISOString()} ${message}`, meta || '');
    },
    debug: (message: string, meta?: any) => {
      if (logLevel === 'debug' || process.env.NODE_ENV === 'development') {
        console.debug(`[DEBUG] [${service}] ${new Date().toISOString()} ${message}`, meta || '');
      }
    },
  };
};

// src/utils/asyncHandler.ts
import { Request, Response, NextFunction } from 'express';

export const asyncHandler = (fn: Function) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

// src/utils/video.utils.ts
import { AppError } from './errors';
import { createLogger } from './logger';

const logger = createLogger('VideoUtils');

export class VideoUtils {
  /**
   * Convert bytes to human readable format
   */
  static formatFileSize(bytes: number): string {
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    if (bytes === 0) return '0 B';
    
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${Math.round(bytes / Math.pow(1024, i) * 100) / 100} ${sizes[i]}`;
  }

  /**
   * Format duration from seconds to HH:MM:SS
   */
  static formatDuration(seconds: number): string {
    if (!seconds || seconds < 0) return '00:00:00';
    
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const remainingSeconds = Math.floor(seconds % 60);

    return [hours, minutes, remainingSeconds]
      .map(val => val.toString().padStart(2, '0'))
      .join(':');
  }

  /**
   * Extract video metadata from filename
   */
  static extractMetadataFromFilename(filename: string): {
    name: string;
    extension: string;
    isValid: boolean;
  } {
    const parts = filename.split('.');
    const extension = parts.pop()?.toLowerCase() || '';
    const name = parts.join('.');

    const validExtensions = ['mp4', 'mov', 'avi', 'wmv', 'webm', 'flv', '3gp', 'mkv', 'mpeg', 'mpg'];
    
    return {
      name,
      extension,
      isValid: validExtensions.includes(extension),
    };
  }

  /**
   * Generate video thumbnail at specific time
   */
  static generateThumbnailTime(duration: number, position: 'start' | 'middle' | 'end' = 'middle'): number {
    if (duration <= 0) return 0;
    
    switch (position) {
      case 'start':
        return Math.min(5, duration * 0.1); // 5 seconds or 10% of video
      case 'end':
        return Math.max(duration - 5, duration * 0.9); // 5 seconds from end or 90% of video
      case 'middle':
      default:
        return duration / 2;
    }
  }

  /**
   * Validate video upload constraints
   */
  static validateVideoConstraints(
    fileSize: number, 
    contentType: string, 
    maxSize: number = 5 * 1024 * 1024 * 1024
  ): void {
    if (fileSize > maxSize) {
      throw new AppError(`File size exceeds maximum allowed size of ${this.formatFileSize(maxSize)}`, 400);
    }

    const validTypes = [
      'video/mp4',
      'video/mpeg',
      'video/quicktime',
      'video/x-msvideo',
      'video/x-ms-wmv',
      'video/webm',
      'video/x-flv',
      'video/3gpp',
      'video/x-matroska'
    ];

    if (!validTypes.includes(contentType.toLowerCase())) {
      throw new AppError(`Unsupported video format: ${contentType}`, 400);
    }
  }

  /**
   * Create video processing progress indicator
   */
  static createProgressIndicator(status: string, metadata?: any): {
    percentage: number;
    stage: string;
    estimatedTimeRemaining?: string;
  } {
    switch (status) {
      case 'pending':
        return {
          percentage: 0,
          stage: 'Initializing upload',
        };
      case 'uploading':
        return {
          percentage: 25,
          stage: 'Uploading to Mux',
          estimatedTimeRemaining: 'Estimating...',
        };
      case 'processing':
        return {
          percentage: 65,
          stage: 'Processing video',
          estimatedTimeRemaining: '2-5 minutes',
        };
      case 'completed':
        return {
          percentage: 100,
          stage: 'Ready for playback',
        };
      case 'failed':
        return {
          percentage: 0,
          stage: 'Processing failed',
        };
      default:
        return {
          percentage: 0,
          stage: 'Unknown status',
        };
    }
  }

  /**
   * Generate secure random string for file naming
   */
  static generateSecureId(length: number = 16): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    
    return result;
  }

  /**
   * Parse Mux asset passthrough data
   */
  static parsePassthroughData(passthrough: string | null): any {
    try {
      return passthrough ? JSON.parse(passthrough) : {};
    } catch (error) {
      logger.warn('Failed to parse passthrough data', { passthrough, error: error.message });
      return {};
    }
  }

  /**
   * Build video metadata object
   */
  static buildVideoMetadata(options: {
    courseId?: string;
    lectureId?: string;
    userId: string;
    originalName: string;
    muxAssetId?: string;
    muxUploadId?: string;
    duration?: number;
    thumbnailUrl?: string;
    status: string;
    error?: string;
  }): string {
    return JSON.stringify({
      ...options,
      createdAt: new Date().toISOString(),
      version: '1.0',
    });
  }

  /**
   * Check if video is ready for playback
   */
  static isVideoReady(status: string): boolean {
    return status === 'completed';
  }

  /**
   * Check if video processing failed
   */
  static isVideoFailed(status: string): boolean {
    return status === 'failed';
  }

  /**
   * Get video quality options based on resolution
   */
  static getQualityOptions(maxResolution: string | null): string[] {
    const resolutionMap: { [key: string]: string[] } = {
      '2160p': ['2160p', '1080p', '720p', '480p', '360p'],
      '1080p': ['1080p', '720p', '480p', '360p'],
      '720p': ['720p', '480p', '360p'],
      '480p': ['480p', '360p'],
      '360p': ['360p'],
    };

    return resolutionMap[maxResolution || '720p'] || ['360p'];
  }
}

// src/utils/webhook.utils.ts
import crypto from 'crypto';
import { createLogger } from './logger';

const logger = createLogger('WebhookUtils');

export class WebhookUtils {
  /**
   * Verify Mux webhook signature
   */
  static verifyMuxSignature(
    payload: string | Buffer,
    signature: string,
    secret: string
  ): boolean {
    try {
      if (!signature || !secret) {
        return false;
      }

      // Mux uses HMAC-SHA256 for webhook signatures
      const expectedSignature = crypto
        .createHmac('sha256', secret)
        .update(payload)
        .digest('hex');

      // Remove 'v1=' prefix if present
      const cleanSignature = signature.replace(/^v1=/, '');

      return crypto.timingSafeEqual(
        Buffer.from(expectedSignature, 'hex'),
        Buffer.from(cleanSignature, 'hex')
      );
    } catch (error) {
      logger.error('Signature verification failed', { error: error.message });
      return false;
    }
  }

  /**
   * Parse webhook timestamp and validate freshness
   */
  static validateWebhookTimestamp(
    timestamp: string,
    toleranceSeconds: number = 300 // 5 minutes
  ): boolean {
    try {
      const webhookTime = new Date(timestamp).getTime();
      const currentTime = Date.now();
      const timeDiff = Math.abs(currentTime - webhookTime) / 1000;

      return timeDiff <= toleranceSeconds;
    } catch (error) {
      logger.error('Timestamp validation failed', { error: error.message });
      return false;
    }
  }

  /**
   * Extract asset ID from webhook payload
   */
  static extractAssetId(payload: any): string | null {
    try {
      return payload?.data?.id || payload?.data?.asset_id || null;
    } catch (error) {
      logger.error('Failed to extract asset ID', { error: error.message });
      return null;
    }
  }

  /**
   * Extract passthrough data from webhook payload
   */
  static extractPassthroughData(payload: any): any {
    try {
      const passthrough = payload?.data?.passthrough;
      return passthrough ? JSON.parse(passthrough) : {};
    } catch (error) {
      logger.error('Failed to extract passthrough data', { error: error.message });
      return {};
    }
  }
}