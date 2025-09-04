// src/services/video.service.ts
import { db } from '@lms/database';
import { files, fileUploadSessions, courseLectures } from '@lms/database';
import { muxService } from './mux.service';
import { logger } from '@lms/logger';
import { AppError } from '../utils/errors';
import { eq, and, sql, desc, asc } from 'drizzle-orm';
import {
  VideoUploadRequest,
  VideoUploadResponse,
  VideoProcessingStatus,
  VideoMetadata,
  VideoListResponse,
  VideoFilterOptions,
  VideoBatchOperation,
  VideoAnalytics,
  VideoTranscription,
} from '../types/video.types';
import { isValidVideoType } from '@/utils/validation.utils';
import { generateUniqueFilename } from '@/utils/file.utils';

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
        error: (error as Error).message,
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
        updateError: (error as Error).message,
      });
    }
  }

  /**
   * Calculate processing progress based on status and metadata
   */
  private calculateProcessingProgress(status: string, metadata: any): number {
    const progressMap: Record<string, number> = {
      pending: 0,
      uploading: 10,
      uploaded: 25,
      processing: 50,
      transcoding: 75,
      completed: 100,
      failed: 0,
      cancelled: 0,
    };

    let baseProgress = progressMap[status] || 0;

    // Add granular progress based on metadata
    if (status === 'processing' && metadata) {
      if (metadata.assetCreated) baseProgress = 60;
      if (metadata.thumbnailGenerated) baseProgress = 70;
      if (metadata.playbackIdsCreated) baseProgress = 80;
      if (metadata.transcriptGenerated) baseProgress = 90;
    }

    return baseProgress;
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
      console.log(metadata);

      // If video is processing and has asset ID, check Mux status
      if (fileRecord.status === 'uploading' && metadata.muxAssetId) {
        try {
          const asset = await muxService.getAsset(metadata.muxAssetId);

          // Update status if it changed in Mux
          if (asset.status === 'ready') {
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
        error: (error as Error).message,
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
        error: (error as Error).message,
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
        error: (error as Error).message,
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
            error: (error as Error).message,
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
            updatedAt: new Date().toISOString(),
          })
          .where(eq(courseLectures.id, metadata.lectureId));
      }

      logger.info('Video deleted successfully', { fileId });
    } catch (error) {
      logger.error('Failed to delete video', {
        fileId,
        userId,
        error: (error as Error).message,
      });
      throw error;
    }
  }

  /**
   * List user's videos with pagination and filtering
   */
  async listUserVideos(
    userId: string,
    options: VideoFilterOptions = {}
  ): Promise<VideoListResponse> {
    try {
      const {
        page = 1,
        limit = 20,
        status,
        courseId,
        sortBy = 'uploadedAt',
        sortOrder = 'desc',
        search,
      } = options;
      const offset = (page - 1) * limit;

      // Build base query
      let query = db
        .select()
        .from(files)
        .where(and(eq(files.userId, userId), eq(files.category, 'video')));

      // Add status filter
      if (status) {
        query = query.where(eq(files.status, status));
      }

      // Add search filter
      if (search) {
        query = query.where(sql`${files.originalName} ILIKE ${`%${search}%`}`);
      }

      // Add sorting
      const sortColumn = sortBy === 'uploadedAt' ? files.uploadedAt : files.originalName;
      const orderFn = sortOrder === 'desc' ? desc : asc;
      query = query.orderBy(orderFn(sortColumn));

      // Execute query with pagination
      const results = await query.limit(limit).offset(offset);

      // Get total count
      let countQuery = db
        .select({ count: sql<number>`count(*)` })
        .from(files)
        .where(and(eq(files.userId, userId), eq(files.category, 'video')));

      if (status) {
        countQuery = countQuery.where(eq(files.status, status));
      }

      if (search) {
        countQuery = countQuery.where(sql`${files.originalName} ILIKE ${`%${search}%`}`);
      }

      const [{ count }] = await countQuery;

      // Filter by courseId if provided (requires metadata parsing)
      let filteredResults = results;
      if (courseId) {
        filteredResults = results.filter(file => {
          try {
            const metadata = file.metadata ? JSON.parse(file.metadata) : {};
            return metadata.courseId === courseId;
          } catch {
            return false;
          }
        });
      }

      // Convert to video status objects
      const videos = await Promise.all(
        filteredResults.map(async file => {
          try {
            return await this.getVideoStatus(file.id, userId);
          } catch (error) {
            logger.warn('Failed to get status for video', {
              fileId: file.id,
              error: (error as Error).message,
            });

            // Return basic status for failed videos
            const metadata = file.metadata ? JSON.parse(file.metadata) : {};
            return {
              fileId: file.id,
              status: file.status as any,
              fileName: file.originalName,
              fileSize: file.fileSize,
              uploadedAt: file.uploadedAt,
              videoUrl: null,
              thumbnailUrl: null,
              duration: null,
              muxAssetId: null,
              processingProgress: this.calculateProcessingProgress(file.status, metadata),
              error: metadata.error || 'Failed to retrieve video status',
            };
          }
        })
      );

      return {
        videos,
        pagination: {
          page,
          limit,
          total: courseId ? filteredResults.length : count,
          totalPages: Math.ceil((courseId ? filteredResults.length : count) / limit),
        },
      };
    } catch (error) {
      logger.error('Failed to list user videos', {
        userId,
        options,
        error: (error as Error).message,
      });
      throw error;
    }
  }

  /**
   * Batch operations on videos
   */
  async batchOperation(
    fileIds: string[],
    operation: VideoBatchOperation,
    userId: string
  ): Promise<{ successful: string[]; failed: { fileId: string; error: string }[] }> {
    const successful: string[] = [];
    const failed: { fileId: string; error: string }[] = [];

    for (const fileId of fileIds) {
      try {
        switch (operation) {
          case 'delete':
            await this.deleteVideo(fileId, userId);
            break;
          case 'regenerate_thumbnail':
            await this.regenerateThumbnail(fileId, userId);
            break;
          case 'retry_processing':
            await this.retryProcessing(fileId, userId);
            break;
          default:
            throw new Error(`Unsupported operation: ${operation}`);
        }
        successful.push(fileId);
      } catch (error) {
        failed.push({
          fileId,
          error: (error as Error).message,
        });
      }
    }

    logger.info('Batch operation completed', {
      operation,
      successful: successful.length,
      failed: failed.length,
      userId,
    });

    return { successful, failed };
  }

  /**
   * Regenerate thumbnail for a video
   */
  async regenerateThumbnail(fileId: string, userId: string): Promise<string> {
    try {
      const [fileRecord] = await db
        .select()
        .from(files)
        .where(and(eq(files.id, fileId), eq(files.userId, userId)));

      if (!fileRecord) {
        throw new AppError('Video not found', 404);
      }

      const metadata = fileRecord.metadata ? JSON.parse(fileRecord.metadata) : {};

      if (!metadata.muxAssetId) {
        throw new AppError('No Mux asset ID found', 400);
      }

      // Generate new thumbnail
      const thumbnailUrl = await muxService.createThumbnail(metadata.muxAssetId, {
        time: Math.random() * (metadata.duration || 10), // Random time for variety
      });

      // Update metadata
      const updatedMetadata = {
        ...metadata,
        thumbnailUrl,
        thumbnailRegeneratedAt: new Date().toISOString(),
      };

      await db
        .update(files)
        .set({
          metadata: JSON.stringify(updatedMetadata),
          updatedAt: new Date(),
        })
        .where(eq(files.id, fileId));

      logger.info('Thumbnail regenerated', { fileId, thumbnailUrl });

      return thumbnailUrl;
    } catch (error) {
      logger.error('Failed to regenerate thumbnail', {
        fileId,
        userId,
        error: (error as Error).message,
      });
      throw error;
    }
  }

  /**
   * Retry processing for a failed video
   */
  async retryProcessing(fileId: string, userId: string): Promise<void> {
    try {
      const [fileRecord] = await db
        .select()
        .from(files)
        .where(and(eq(files.id, fileId), eq(files.userId, userId)));

      if (!fileRecord) {
        throw new AppError('Video not found', 404);
      }

      if (fileRecord.status !== 'failed') {
        throw new AppError('Video is not in failed state', 400);
      }

      const metadata = fileRecord.metadata ? JSON.parse(fileRecord.metadata) : {};

      // Reset status and clear error
      const updatedMetadata = {
        ...metadata,
        error: null,
        failedAt: null,
        retryAttemptedAt: new Date().toISOString(),
      };

      await db
        .update(files)
        .set({
          status: 'processing',
          metadata: JSON.stringify(updatedMetadata),
          updatedAt: new Date(),
        })
        .where(eq(files.id, fileId));

      // If we have a Mux asset ID, check its status
      if (metadata.muxAssetId) {
        try {
          const asset = await muxService.getAsset(metadata.muxAssetId);

          if (asset.status === 'ready') {
            // Asset is actually ready, trigger the ready handler
            await this.handleAssetReady(
              {
                type: 'video.asset.ready',
                data: { id: metadata.muxAssetId },
              },
              metadata
            );
          }
        } catch (error) {
          logger.warn('Asset not found in Mux during retry', {
            fileId,
            assetId: metadata.muxAssetId,
          });

          // Asset doesn't exist, mark as failed again
          await this.markVideoAsFailed(fileId, 'Asset not found in Mux');
        }
      } else {
        // No asset ID, mark as failed
        await this.markVideoAsFailed(fileId, 'No Mux asset ID available for retry');
      }

      logger.info('Processing retry initiated', { fileId });
    } catch (error) {
      logger.error('Failed to retry processing', {
        fileId,
        userId,
        error: (error as Error).message,
      });
      throw error;
    }
  }

  /**
   * Get video analytics
   */
  async getVideoAnalytics(fileId: string, userId: string): Promise<VideoAnalytics> {
    try {
      const [fileRecord] = await db
        .select()
        .from(files)
        .where(and(eq(files.id, fileId), eq(files.userId, userId)));

      if (!fileRecord) {
        throw new AppError('Video not found', 404);
      }

      const metadata = fileRecord.metadata ? JSON.parse(fileRecord.metadata) : {};

      if (!metadata.muxAssetId) {
        throw new AppError('No Mux asset ID found', 400);
      }

      // Get analytics from Mux (if available)
      let muxAnalytics = null;
      try {
        muxAnalytics = await muxService.getAssetMetrics(metadata.muxAssetId);
      } catch (error) {
        logger.warn('Failed to get Mux analytics', {
          fileId,
          error: (error as Error).message,
        });
      }

      return {
        fileId,
        views: muxAnalytics?.views || 0,
        totalWatchTime: muxAnalytics?.totalWatchTime || 0,
        averageWatchTime: muxAnalytics?.averageWatchTime || 0,
        completionRate: muxAnalytics?.completionRate || 0,
        engagement: muxAnalytics?.engagement || {},
        createdAt: fileRecord.uploadedAt,
        lastViewed: muxAnalytics?.lastViewed || null,
      };
    } catch (error) {
      logger.error('Failed to get video analytics', {
        fileId,
        userId,
        error: (error as Error).message,
      });
      throw error;
    }
  }

  /**
   * Get video transcription
   */
  async getVideoTranscription(fileId: string, userId: string): Promise<VideoTranscription> {
    try {
      const [fileRecord] = await db
        .select()
        .from(files)
        .where(and(eq(files.id, fileId), eq(files.userId, userId)));

      if (!fileRecord) {
        throw new AppError('Video not found', 404);
      }

      const metadata = fileRecord.metadata ? JSON.parse(fileRecord.metadata) : {};

      if (!metadata.muxAssetId) {
        throw new AppError('No Mux asset ID found', 400);
      }

      // Check if transcription already exists in metadata
      if (metadata.transcription) {
        return {
          fileId,
          transcription: metadata.transcription,
          language: metadata.transcriptionLanguage || 'en',
          confidence: metadata.transcriptionConfidence || 0,
          generatedAt: metadata.transcriptionGeneratedAt,
        };
      }

      // Generate transcription using Mux or external service
      const transcriptionResult = await muxService.generateTranscription(metadata.muxAssetId);

      // Update metadata with transcription
      const updatedMetadata = {
        ...metadata,
        transcription: transcriptionResult.text,
        transcriptionLanguage: transcriptionResult.language,
        transcriptionConfidence: transcriptionResult.confidence,
        transcriptionGeneratedAt: new Date().toISOString(),
      };

      await db
        .update(files)
        .set({
          metadata: JSON.stringify(updatedMetadata),
          updatedAt: new Date(),
        })
        .where(eq(files.id, fileId));

      return {
        fileId,
        transcription: transcriptionResult.text,
        language: transcriptionResult.language,
        confidence: transcriptionResult.confidence,
        generatedAt: updatedMetadata.transcriptionGeneratedAt,
      };
    } catch (error) {
      logger.error('Failed to get video transcription', {
        fileId,
        userId,
        error: (error as Error).message,
      });
      throw error;
    }
  }

  /**
   * Update video metadata (title, description, etc.)
   */
  async updateVideoMetadata(
    fileId: string,
    userId: string,
    updates: {
      title?: string;
      description?: string;
      tags?: string[];
      category?: string;
    }
  ): Promise<void> {
    try {
      const [fileRecord] = await db
        .select()
        .from(files)
        .where(and(eq(files.id, fileId), eq(files.userId, userId)));

      if (!fileRecord) {
        throw new AppError('Video not found', 404);
      }

      const metadata = fileRecord.metadata ? JSON.parse(fileRecord.metadata) : {};
      const updatedMetadata = {
        ...metadata,
        ...updates,
        updatedAt: new Date().toISOString(),
      };

      // Update the original name if title is provided
      const updateData: any = {
        metadata: JSON.stringify(updatedMetadata),
        updatedAt: new Date(),
      };

      if (updates.title) {
        updateData.originalName = updates.title;
      }

      await db.update(files).set(updateData).where(eq(files.id, fileId));

      logger.info('Video metadata updated', { fileId, updates });
    } catch (error) {
      logger.error('Failed to update video metadata', {
        fileId,
        userId,
        updates,
        error: (error as Error).message,
      });
      throw error;
    }
  }
}
