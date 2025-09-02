// src/controllers/video.controller.ts
import { Request, Response, NextFunction } from 'express';
import { VideoService } from '../services/video.service';
import { muxService } from '../services/mux.service';
import { logger } from '@lms/logger';
import { AppError } from '../utils/errors';
import {
  validateVideoUpload,
  validateVideoStatus,
  validateWebhook,
  validateSignedUrl,
  validateListVideos,
  validateBulkProcess,
  validateThumbnail,
} from '../validations/video.validation';

const videoService = new VideoService();

/**
 * Helper: Extract clean Zod error messages
 */
function formatZodError(error: any) {
  return error.errors.map((e: any) => ({
    field: e.path.join('.'),
    message: e.message,
  }));
}

export class VideoController {
  /**
   * Initiate video upload
   * POST /api/videos/upload
   */
  async initiateUpload(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const parsed = validateVideoUpload(req.body);
      if (!parsed.success) {
        const err = formatZodError(parsed.error)[0];
        throw new AppError(err.message, 400);
      }

      const userId = req.headers['x-user-id'] as string;
      if (!userId) throw new AppError('User ID required', 401);

      const uploadResponse = await videoService.initiateVideoUpload(parsed.data, userId);

      logger.info('Video upload initiated', {
        fileId: uploadResponse.fileId,
        userId,
      });

      res.status(201).json({
        success: true,
        message: 'Video upload initiated successfully',
        data: uploadResponse,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get video processing status
   * GET /api/videos/:fileId/status
   */
  async getVideoStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const parsed = validateVideoStatus({ fileId: req.params.fileId });
      if (!parsed.success) {
        const err = formatZodError(parsed.error)[0];
        throw new AppError(err.message, 400);
      }

      const userId = req.headers['x-user-id'] as string;
      if (!userId) throw new AppError('User ID required', 401);

      const status = await videoService.getVideoStatus(parsed.data.fileId, userId);

      res.status(200).json({
        success: true,
        data: status,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get video metadata
   * GET /api/videos/:fileId/metadata
   */
  async getVideoMetadata(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { fileId } = req.params;
      const userId = req.headers['x-user-id'] as string;
      if (!userId) throw new AppError('User ID required', 401);

      const metadata = await videoService.getVideoMetadata(fileId, userId);

      res.status(200).json({
        success: true,
        data: metadata,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get signed playback URL for premium content
   * POST /api/videos/:fileId/signed-url
   */
  async getSignedPlaybackUrl(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const parsed = validateSignedUrl(req.body);
      if (!parsed.success) {
        const err = formatZodError(parsed.error)[0];
        throw new AppError(err.message, 400);
      }

      const { expirationHours } = parsed.data;
      const fileId = req.params.fileId;
      const userId = req.headers['x-user-id'] as string;
      if (!userId) throw new AppError('User ID required', 401);

      const signedUrl = await videoService.getSignedPlaybackUrl(fileId, userId, expirationHours);

      res.status(200).json({
        success: true,
        data: {
          signedUrl,
          expiresAt: new Date(Date.now() + expirationHours * 3600 * 1000),
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * List user videos
   * GET /api/videos
   */
  //   async listVideos(req: Request, res: Response, next: NextFunction): Promise<void> {
  //     try {
  //       const parsed = validateListVideos(req.query);
  //       if (!parsed.success) {
  //         const err = formatZodError(parsed.error)[0];
  //         throw new AppError(err.message, 400);
  //       }

  //       const userId = req.headers['x-user-id'] as string;
  //       if (!userId) throw new AppError('User ID required', 401);

  //       const options = parsed.data;
  //       const result = await videoService.listUserVideos(userId, options);

  //       res.status(200).json({
  //         success: true,
  //         data: result.videos,
  //         pagination: result.pagination,
  //       });
  //     } catch (error) {
  //       next(error);
  //     }
  //   }

  /**
   * Delete video
   * DELETE /api/videos/:fileId
   */
  async deleteVideo(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { fileId } = req.params;
      const userId = req.headers['x-user-id'] as string;
      if (!userId) throw new AppError('User ID required', 401);

      await videoService.deleteVideo(fileId, userId);

      logger.info('Video deleted', { fileId, userId });

      res.status(200).json({
        success: true,
        message: 'Video deleted successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Handle Mux webhooks
   * POST /api/videos/webhook
   */
  async handleWebhook(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const signature = req.headers['mux-signature'] as string;
      if (!this.verifyWebhookSignature(req.body, signature)) {
        throw new AppError('Invalid webhook signature', 401);
      }

      const parsed = validateWebhook(req.body);
      if (!parsed.success) {
        const err = formatZodError(parsed.error)[0];
        throw new AppError(err.message, 400);
      }

      await videoService.processWebhookEvent(parsed.data);

      logger.info('Webhook processed successfully', {
        eventType: parsed.data.type,
        assetId: parsed.data.data?.id,
      });

      res.status(200).json({
        success: true,
        message: 'Webhook processed successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get video analytics
   * GET /api/videos/:fileId/analytics
   */
  async getVideoAnalytics(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { fileId } = req.params;
      const userId = req.headers['x-user-id'] as string;
      if (!userId) throw new AppError('User ID required', 401);

      const metadata = await videoService.getVideoMetadata(fileId, userId);
      //   const analytics = await videoService.getVideoAnalytics(metadata.assetId);

      res.status(200).json({
        success: true,
        // data: analytics,
        data: 'this is temp analytics - video controller line 244',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Bulk process videos
   * POST /api/videos/bulk-process
   */
  async bulkProcessVideos(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const parsed = validateBulkProcess(req.body);
      if (!parsed.success) {
        const err = formatZodError(parsed.error)[0];
        throw new AppError(err.message, 400);
      }

      const { videoIds } = parsed.data;
      const userId = req.headers['x-user-id'] as string;
      if (!userId) throw new AppError('User ID required', 401);

      //   const result = await videoService.bulkProcessVideos(videoIds, userId);

      res.status(200).json({
        success: true,
        message: 'Bulk processing completed',
        data: 'this is temp res of bulk process video - video controller line - 272',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Create thumbnail for video
   * POST /api/videos/:fileId/thumbnail
   */
  async createThumbnail(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const parsed = validateThumbnail(req.body);
      if (!parsed.success) {
        const err = formatZodError(parsed.error)[0];
        throw new AppError(err.message, 400);
      }

      const { fileId } = req.params;
      const { time } = parsed.data;
      const userId = req.headers['x-user-id'] as string;
      if (!userId) throw new AppError('User ID required', 401);

      const metadata = await videoService.getVideoMetadata(fileId, userId);
      const thumbnailUrl = await muxService.createThumbnail(metadata.assetId, time);

      res.status(200).json({
        success: true,
        data: {
          thumbnailUrl,
          fileId,
          assetId: metadata.assetId,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Health check
   * GET /api/videos/health
   */
  async healthCheck(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const muxHealthy = await muxService.healthCheck();

      res.status(200).json({
        success: true,
        data: {
          videoService: 'healthy',
          muxService: muxHealthy ? 'healthy' : 'unhealthy',
          timestamp: new Date().toISOString(),
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Verify Mux webhook signature
   */
  private verifyWebhookSignature(payload: any, signature: string): boolean {
    try {
      if (!signature) {
        logger.warn('Missing webhook signature');
        return false;
      }

      const webhookSecret = process.env.MUX_WEBHOOK_SECRET;
      if (!webhookSecret) {
        logger.warn('Webhook secret not configured');
        return false;
      }

      // TODO: Implement proper HMAC verification
      return signature.length > 0;
    } catch (error: any) {
      logger.error('Webhook signature verification failed', { error: error.message });
      return false;
    }
  }
}

export const videoController = new VideoController();
