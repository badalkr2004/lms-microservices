// src/services/video.service.ts
import { db } from '@lms/database';
import { files, fileUploadSessions, courseLectures } from '@lms/database';
import { muxService } from './mux.service';
import { logger } from '@lms/logger';
import { AppError } from '../utils/errors';
import { eq, and } from 'drizzle-orm';
import {
  VideoUploadRequest,
  VideoUploadResponse,
  VideoProcessingStatus,
  VideoMetadata,
} from '../types/video.types';
import { isValidVideoType } from '@/utils/validation.utils';
import { generateUniqueFilename } from '@/utils/file.utils';

// const logger = createLogger('VideoService');

export class VideoService {
  /**
   * Initiate video upload process
   */
  async initiateVideoUpload(
    request: VideoUploadRequest,
    userId: string
  ): Promise<VideoUploadResponse> {
    const { courseId, lectureId, fileName, fileSize, contentType } = request;

    try {
      logger.info('Initiating video upload', {
        courseId,
        lectureId,
        fileName,
        userId,
      });

      // Validate file type
      if (!isValidVideoType(contentType)) {
        throw new AppError('Invalid video file type', 400);
      }

      // Validate file size (e.g., max 5GB)
      if (fileSize > 5 * 1024 * 1024 * 1024) {
        throw new AppError('File size too large (max 5GB)', 400);
      }

      // Create file record in database
      const [fileRecord] = await db
        .insert(files)
        .values({
          originalName: fileName,
          fileName: generateUniqueFilename(fileName),
          fileType: contentType,
          fileSize,
          s3Key: '', // Will be updated later
          s3Url: '', // Will be updated later
          userId,
          category: 'video',
          status: 'uploading',
          metadata: JSON.stringify({
            courseId,
            lectureId,
            uploadType: 'mux_video',
          }),
        })
        .returning();

      // Create Mux direct upload
      const muxUpload = await muxService.createDirectUpload({
        courseId,
        lectureId: lectureId as string,
        userId,
        fileName: fileRecord.fileName,
        originalName: fileName,
        fileId: fileRecord.id,
      });

      // Create upload session record
      await db.insert(fileUploadSessions).values({
        fileId: fileRecord.id,
        s3Key: `mux-uploads/${fileRecord.id}`,
        presignedUrl: muxUpload.uploadUrl,
        userId,
        expiresAt: new Date(Date.now() + muxUpload.timeout * 1000),
      });

      logger.info('Video upload initiated successfully', {
        fileId: fileRecord.id,
        uploadId: muxUpload.uploadId,
      });

      return {
        fileId: fileRecord.id,
        uploadUrl: muxUpload.uploadUrl,
        uploadId: muxUpload.uploadId,
        expiresAt: new Date(Date.now() + muxUpload.timeout * 1000),
        status: 'pending',
      };
    } catch (error) {
      logger.error('Failed to initiate video upload', {
        error: (error as Error).message,
        request,
        userId,
      });
      throw error;
    }
  }

  /**
   * Process Mux webhook and update database
   */
  async processWebhookEvent(payload: any): Promise<void> {
    try {
      logger.info('Processing video webhook', {
        eventType: payload.type,
        assetId: payload.data?.id,
      });

      const passthrough = payload.data?.passthrough ? JSON.parse(payload.data.passthrough) : null;

      if (!passthrough?.fileId) {
        logger.warn('No file ID in webhook passthrough data');
        return;
      }

      switch (payload.type) {
        case 'video.asset.ready':
          await this.handleAssetReady(payload, passthrough);
          break;

        case 'video.asset.errored':
          await this.handleAssetError(payload, passthrough);
          break;

        case 'video.upload.asset_created':
          await this.handleUploadAssetCreated(payload, passthrough);
          break;

        case 'video.upload.cancelled':
        case 'video.upload.errored':
          await this.handleUploadError(payload, passthrough);
          break;

        default:
          logger.warn('Unhandled webhook event', { eventType: payload.type });
      }
    } catch (error) {
      logger.error('Failed to process webhook event', {
        error: (error as Error).message,
        payload,
      });
      throw error;
    }
  }

  /**
   * Handle asset ready webhook
   */
  private async handleAssetReady(payload: any, passthrough: any): Promise<void> {
    const assetId = payload.data?.id;
    const fileId = passthrough.fileId;

    try {
      // Get asset details from Mux
      const asset = await muxService.getAsset(assetId);

      // Get playback URL
      const playbackUrl = await muxService.getPlaybackUrl(assetId);

      // Generate thumbnail
      const thumbnailUrl = await muxService.createThumbnail(assetId);

      // Update file record
      await db
        .update(files)
        .set({
          status: 'completed',
          s3Url: playbackUrl,
          s3Key: `mux-assets/${assetId}`,
          updatedAt: new Date(),
          metadata: JSON.stringify({
            ...passthrough,
            muxAssetId: assetId,
            duration: asset.duration,
            thumbnailUrl,
            playbackIds: asset.playbackIds,
            aspectRatio: asset.aspectRatio,
            maxResolution: asset.maxStoredResolution,
            status: 'ready',
          }),
        })
        .where(eq(files.id, fileId));

      // Update course lecture if lectureId is provided
      if (passthrough.lectureId) {
        await db
          .update(courseLectures)
          .set({
            videoUrl: playbackUrl,
            videoMuxAssetId: assetId,
            videoDuration: Math.ceil(asset.duration || 0),
            updatedAt: new Date().toISOString(),
          })
          .where(eq(courseLectures.id, passthrough.lectureId));
      }

      logger.info('Asset processing completed', {
        fileId,
        assetId,
        lectureId: passthrough.lectureId,
      });
    } catch (error) {
      logger.error('Failed to handle asset ready event', {
        error: (error as Error).message,
        assetId,
        fileId,
      });

      // Mark as failed
      await this.markVideoAsFailed(fileId, (error as Error).message);
    }
  }

  /**
   * Handle asset error webhook
   */
  private async handleAssetError(payload: any, passthrough: any): Promise<void> {
    const fileId = passthrough.fileId;
    const errors = payload.data?.errors || ['Unknown error'];

    await this.markVideoAsFailed(fileId, errors.join(', '));
  }

  /**
   * Handle upload asset created webhook
   */
  private async handleUploadAssetCreated(payload: any, passthrough: any): Promise<void> {
    const uploadId = payload.data?.id;
    const assetId = payload.data?.asset_id;
    const fileId = passthrough.fileId;

    try {
      // Update file record with asset ID
      await db
        .update(files)
        .set({
          status: 'processing',
          s3Key: `mux-assets/${assetId}`,
          updatedAt: new Date(),
          metadata: JSON.stringify({
            ...passthrough,
            muxAssetId: assetId,
            muxUploadId: uploadId,
            status: 'processing',
          }),
        })
        .where(eq(files.id, fileId));

      logger.info('Upload asset created, processing started', {
        fileId,
        uploadId,
        assetId,
      });
    } catch (error) {
      logger.error('Failed to handle upload asset created', {
        error: error.message,
        fileId,
        uploadId,
        assetId,
      });
    }
  }

  /**
   * Handle upload error webhook
   */
  private async handleUploadError(payload: any, passthrough: any): Promise<void> {
    const fileId = passthrough.fileId;
    const error = payload.data?.error || 'Upload failed';

    await this.markVideoAsFailed(fileId, error);
  }

  /**
   * Mark video as failed in database
   */
  private async markVideoAsFailed(fileId: string, errorMessage: string): Promise<void> {
    try {
      await db
        .update(files)
        .set({
          status: 'failed',
          updatedAt: new Date(),
          metadata: JSON.stringify({
            error: errorMessage,
            status: 'failed',
            failedAt: new Date().toISOString(),
          }),
        })
        .where(eq(files.id, fileId));

      logger.error('Video marked as failed', { fileId, errorMessage });
    } catch (error) {
      logger.error('Failed to mark video as failed', {
        fileId,
        originalError: errorMessage,
        updateError: error.message,
      });
    }
  }

  /**
   * Get video processing status
   */
  async getVideoStatus(fileId: string, userId: string): Promise<VideoProcessingStatus> {
    try {
      const [fileRecord] = await db
        .select()
        .from(files)
        .where(and(eq(files.id, fileId), eq(files.userId, userId)));

      if (!fileRecord) {
        throw new AppError('Video not found', 404);
      }

      const metadata = fileRecord.metadata ? JSON.parse(fileRecord.metadata) : {};

      // If video is processing and has asset ID, check Mux status
      if (fileRecord.status === 'processing' && metadata.muxAssetId) {
        try {
          const asset = await muxService.getAsset(metadata.muxAssetId);

          // Update status if it changed in Mux
          if (asset.status === 'ready' && fileRecord.status !== 'completed') {
            await this.handleAssetReady(
              {
                type: 'video.asset.ready',
                data: { id: metadata.muxAssetId },
              },
              metadata
            );
          }
        } catch (error) {
          logger.warn('Failed to check Mux asset status', {
            fileId,
            assetId: metadata.muxAssetId,
            error: (error as Error).message,
          });
        }
      }

      return {
        fileId: fileRecord.id,
        status: fileRecord.status as any,
        fileName: fileRecord.originalName,
        fileSize: fileRecord.fileSize,
        uploadedAt: fileRecord.uploadedAt,
        videoUrl: fileRecord.s3Url || null,
        thumbnailUrl: metadata.thumbnailUrl || null,
        duration: metadata.duration || null,
        muxAssetId: metadata.muxAssetId || null,
        processingProgress: this.calculateProcessingProgress(fileRecord.status, metadata),
        error: metadata.error || null,
      };
    } catch (error) {
      logger.error('Failed to get video status', {
        fileId,
        userId,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Get video metadata and URLs
   */
  async getVideoMetadata(fileId: string, userId: string): Promise<VideoMetadata> {
    try {
      const status = await this.getVideoStatus(fileId, userId);

      if (status.status !== 'completed') {
        throw new AppError('Video is not ready for playback', 400);
      }

      if (!status.muxAssetId) {
        throw new AppError('No Mux asset ID found', 500);
      }

      const asset = await muxService.getAsset(status.muxAssetId);

      return {
        fileId,
        assetId: status.muxAssetId,
        playbackUrl: status.videoUrl!,
        thumbnailUrl: status.thumbnailUrl,
        duration: status.duration,
        aspectRatio: asset.aspectRatio,
        maxResolution: asset.maxStoredResolution,
        tracks: asset.tracks,
        createdAt: status.uploadedAt,
      };
    } catch (error) {
      logger.error('Failed to get video metadata', {
        fileId,
        userId,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Generate signed playback URL for premium content
   */
  async getSignedPlaybackUrl(
    fileId: string,
    userId: string,
    expirationHours: number = 24
  ): Promise<string> {
    try {
      const metadata = await this.getVideoMetadata(fileId, userId);

      const expirationSeconds = expirationHours * 3600;
      return await muxService.getSignedPlaybackUrl(metadata.assetId, expirationSeconds);
    } catch (error) {
      logger.error('Failed to generate signed playback URL', {
        fileId,
        userId,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Delete video from both Mux and database
   */
  async deleteVideo(fileId: string, userId: string): Promise<void> {
    try {
      logger.info('Deleting video', { fileId, userId });

      // Get file record
      const [fileRecord] = await db
        .select()
        .from(files)
        .where(and(eq(files.id, fileId), eq(files.userId, userId)));

      if (!fileRecord) {
        throw new AppError('Video not found', 404);
      }

      const metadata = fileRecord.metadata ? JSON.parse(fileRecord.metadata) : {};

      // Delete from Mux if asset exists
      if (metadata.muxAssetId) {
        try {
          await muxService.deleteAsset(metadata.muxAssetId);
        } catch (error) {
          logger.warn('Failed to delete Mux asset (continuing with DB cleanup)', {
            assetId: metadata.muxAssetId,
            error: error.message,
          });
        }
      }

      // Delete from database
      await db.delete(files).where(eq(files.id, fileId));

      // Clear lecture video reference if exists
      if (metadata.lectureId) {
        await db
          .update(courseLectures)
          .set({
            videoUrl: null,
            videoMuxAssetId: null,
            videoDuration: null,
            updatedAt: new Date(),
          })
          .where(eq(courseLectures.id, metadata.lectureId));
      }

      logger.info('Video deleted successfully', { fileId });
    } catch (error) {
      logger.error('Failed to delete video', {
        fileId,
        userId,
        error: error.message,
      });
      throw error;
    }
  }
}

/**
 * List user's videos with pagination
 */
//   async listUserVideos(
//     userId: string,
//     options: {
//       page?: number;
//       limit?: number;
//       status?: string;
//       courseId?: string;
//     } = {}
//   ): Promise<{
//     videos: VideoProcessingStatus[];
//     pagination: {
//       page: number;
//       limit: number;
//       total: number;
//       totalPages: number;
//     };
//   }> {
//     try {
//       const { page = 1, limit = 20, status, courseId } = options;
//       const offset = (page - 1) * limit;

//       let query = db.select()
//         .from(files)
//         .where(and(
//           eq(files.userId, userId),
//           eq(files.category, 'video'),
//           eq(files.isActive, true)
//         ));

//       // Add filters
//       if (status) {
//         query = query.where(eq(files.status, status));
//       }

//       // For course filter, we'd need to parse metadata
//       // This is a simplified version
//       const results = await query
//         .limit(limit)
//         .offset(offset)
//         .orderBy(files.uploadedAt);

//       // Get total count
//       const [{ count }] = await db.select({
//         count: sql<number>`count(*)`
//       }).from(files)
//         .where(and(
//           eq(files.userId, userId),
//           eq(files.category, 'video'),
//           eq(files.isActive, true)
//         ));

//       const videos = await Promise.all(
//         results.map(async (file) => {
//           try {
//             return await this.getVideoStatus(file.id, userId);
//           } catch (error) {
//             logger.warn('Failed to get status for video', {
//               fileId: file.id,
//               error: error.message
//             });

//             return {
//               fileId: file.id,
//               status: file.status as any,
//               fileName: file.originalName,
//               fileSize: file.fileSize,
//               uploadedAt: file.uploadedAt,
//               videoUrl: null,
