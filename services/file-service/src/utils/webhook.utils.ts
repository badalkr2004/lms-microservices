import crypto from 'crypto';
import { logger } from '@lms/logger';

export class WebhookUtils {
  /**
   * Verify Mux webhook signature
   */
  static verifyMuxSignature(payload: string | Buffer, signature: string, secret: string): boolean {
    try {
      if (!signature || !secret) {
        return false;
      }

      // Mux uses HMAC-SHA256 for webhook signatures
      const expectedSignature = crypto.createHmac('sha256', secret).update(payload).digest('hex');

      // Remove 'v1=' prefix if present
      const cleanSignature = signature.replace(/^v1=/, '');

      return crypto.timingSafeEqual(
        Buffer.from(expectedSignature, 'hex'),
        Buffer.from(cleanSignature, 'hex')
      );
    } catch (error) {
      logger.error('Signature verification failed', { error: (error as Error).message });
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
      logger.error('Timestamp validation failed', { error: (error as Error).message });
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
      logger.error('Failed to extract asset ID', { error: (error as Error).message });
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
      logger.error('Failed to extract passthrough data', { error: (error as Error).message });
      return {};
    }
  }
}
