// src/services/mux.service.ts
import Mux from '@mux/mux-node';
import { muxConfig } from '../config';
import { logger } from '@lms/logger';
import { AppError } from '../utils/errors';
import {
  MuxUploadResponse,
  MuxAssetResponse,
  VideoUploadMetadata,
  MuxWebhookPayload,
} from '../types/mux.types';

class MuxService {
  private mux: Mux;

  constructor() {
    if (!muxConfig.MUX_TOKEN_ID || !muxConfig.MUX_TOKEN_SECRET) {
      throw new AppError('Mux credentials not configured', 500);
    }

    this.mux = new Mux({
      tokenId: muxConfig.MUX_TOKEN_ID,
      tokenSecret: muxConfig.MUX_TOKEN_SECRET,
    });
  }

  /**
   * Create a direct upload URL for video files
   */
  async createDirectUpload(metadata: VideoUploadMetadata): Promise<MuxUploadResponse> {
    try {
      logger.info('Creating Mux direct upload', {
        courseId: metadata.courseId,
        fileName: metadata.fileName,
      });

      const upload = await this.mux.video.uploads.create({
        new_asset_settings: {
          playback_policy: ['public'],
          mp4_support: 'capped-1080p',
          normalize_audio: true,
          max_resolution_tier: '1080p',
          encoding_tier: 'baseline',
          passthrough: JSON.stringify({
            courseId: metadata.courseId,
            lectureId: metadata.lectureId,
            userId: metadata.userId,
            // fileName: metadata.fileName,
            // originalName: metadata.originalName,
            fileId: metadata.fileId,
          }),
        },
        timeout: 3600, // 1 hour timeout
        cors_origin: muxConfig.CORS_ORIGIN,
      });

      logger.info('Mux direct upload created successfully', {
        uploadId: upload.id,
        url: upload.url,
      });

      return {
        uploadId: upload.id,
        uploadUrl: upload.url,
        timeout: upload.timeout,
        status: upload.status,
      };
    } catch (error) {
      logger.error('Failed to create Mux direct upload', {
        error: (error as Error).message,
        metadata,
      });

      if ((error as { response?: { status: number } }).response?.status === 401) {
        throw new AppError('Mux authentication failed', 401);
      }

      throw new AppError(`Failed to create video upload: ${(error as Error).message}`, 500);
    }
  }

  /**
   * Get asset information by asset ID
   */
  async getAsset(assetId: string): Promise<MuxAssetResponse> {
    try {
      logger.info('Retrieving Mux asset', { assetId });

      const asset = await this.mux.video.assets.retrieve(assetId);

      return {
        id: asset.id,
        status: asset.status,
        duration: asset.duration,
        maxStoredResolution: asset.max_stored_resolution as string,
        maxStoredFrameRate: asset.max_stored_frame_rate as number,
        aspectRatio: asset.aspect_ratio as string,
        playbackIds:
          asset.playback_ids?.map((pb: { id: string; policy: string }) => ({
            id: pb.id,
            policy: pb.policy,
          })) || [],
        mp4Support: asset.mp4_support,
        masterAccess: asset.master_access,
        createdAt: asset.created_at,
        tracks: asset.tracks || [],
        passthrough: asset.passthrough ? JSON.parse(asset.passthrough) : null,
      };
    } catch (error) {
      logger.error('Failed to retrieve Mux asset', {
        assetId,
        error: (error as Error).message,
      });

      if ((error as { response?: { status: number } }).response?.status === 404) {
        throw new AppError('Video asset not found', 404);
      }

      throw new AppError(`Failed to retrieve video asset: ${(error as Error).message}`, 500);
    }
  }

  /**
   * Get playback URL for an asset
   */
  async getPlaybackUrl(assetId: string): Promise<string> {
    try {
      const asset = await this.getAsset(assetId);

      const publicPlaybackId = asset.playbackIds.find(
        (pb: { id: string; policy: string }) => pb.policy === 'public'
      );

      if (!publicPlaybackId) {
        throw new AppError('No public playback ID found for asset', 404);
      }

      return `https://stream.mux.com/${publicPlaybackId.id}.m3u8`;
    } catch (error) {
      logger.error('Failed to get playback URL', {
        assetId,
        error: (error as Error).message,
      });
      throw error;
    }
  }

  /**
   * Generate a signed playback URL for private content
   */
  async getSignedPlaybackUrl(assetId: string, expirationTime: number = 3600): Promise<string> {
    try {
      const asset = await this.getAsset(assetId);

      const signedPlaybackId = asset.playbackIds.find(
        (pb: { id: string; policy: string }) => pb.policy === 'signed'
      );

      if (!signedPlaybackId) {
        throw new AppError('No signed playback ID found for asset', 404);
      }

      if (!muxConfig.MUX_SIGNING_KEY_ID || !muxConfig.MUX_SIGNING_KEY_PRIVATE) {
        throw new AppError('Mux signing keys not configured', 500);
      }

      const token = await this.mux.jwt.signPlaybackId(signedPlaybackId.id, {
        keyId: muxConfig.MUX_SIGNING_KEY_ID,
        keySecret: muxConfig.MUX_SIGNING_KEY_PRIVATE,
        expiration: `${expirationTime}s`,
      });

      return `https://stream.mux.com/${signedPlaybackId.id}.m3u8?token=${token}`;
    } catch (error) {
      logger.error('Failed to generate signed playback URL', {
        assetId,
        error: (error as Error).message,
      });
      throw error;
    }
  }

  /**
   * Create a thumbnail from video asset
   */
  async createThumbnail(assetId: string, time?: number): Promise<string> {
    try {
      const asset = await this.getAsset(assetId);

      const publicPlaybackId = asset.playbackIds.find(
        (pb: { id: string; policy: string }) => pb.policy === 'public'
      );

      if (!publicPlaybackId) {
        throw new AppError('No public playback ID found for thumbnail', 404);
      }

      const timeParam = time !== undefined ? `time=${time}` : '';
      return `https://image.mux.com/${publicPlaybackId.id}/thumbnail.jpg?${timeParam}`;
    } catch (error) {
      logger.error('Failed to create thumbnail URL', {
        assetId,
        error: (error as Error).message,
      });
      throw error;
    }
  }

  /**
   * Delete a video asset from Mux
   */
  async deleteAsset(assetId: string): Promise<void> {
    try {
      logger.info('Deleting Mux asset', { assetId });

      await this.mux.video.assets.delete(assetId);

      logger.info('Mux asset deleted successfully', { assetId });
    } catch (error) {
      logger.error('Failed to delete Mux asset', {
        assetId,
        error: (error as Error).message,
      });

      if ((error as { response?: { status: number } }).response?.status === 404) {
        logger.warn('Asset not found during deletion', { assetId });
        return; // Asset already deleted or doesn't exist
      }

      throw new AppError(`Failed to delete video asset: ${(error as Error).message}`, 500);
    }
  }

  /**
   * Process Mux webhook events
   */
  async processWebhook(payload: MuxWebhookPayload): Promise<void> {
    try {
      logger.info('Processing Mux webhook', {
        eventType: payload.type,
        assetId: payload.data?.id,
      });

      switch (payload.type) {
        case 'video.asset.ready':
          await this.handleAssetReady(payload);
          break;

        case 'video.asset.errored':
          await this.handleAssetError(payload);
          break;

        case 'video.upload.asset_created':
          await this.handleUploadAssetCreated(payload);
          break;

        case 'video.upload.cancelled':
        case 'video.upload.errored':
          await this.handleUploadError(payload);
          break;

        default:
          logger.warn('Unhandled webhook event type', {
            eventType: payload.type,
          });
      }
    } catch (error) {
      logger.error('Failed to process Mux webhook', {
        error: (error as Error).message,
        payload,
      });
      throw error;
    }
  }

  /**
   * Handle asset ready webhook
   */
  private async handleAssetReady(payload: MuxWebhookPayload): Promise<void> {
    const assetId = payload.data?.id;
    if (!assetId) return;

    logger.info('Asset ready for playback', { assetId });

    // This will be handled by the VideoService to update database
    // We'll emit an event or call the video service directly
  }

  /**
   * Handle asset error webhook
   */
  private async handleAssetError(payload: MuxWebhookPayload): Promise<void> {
    const assetId = payload.data?.id;
    logger.error('Asset processing failed', {
      assetId,
      errors: payload.data?.errors,
    });

    // Mark video as failed in database
  }

  /**
   * Handle upload asset created webhook
   */
  private async handleUploadAssetCreated(payload: MuxWebhookPayload): Promise<void> {
    const uploadId = payload.data?.id;
    const assetId = payload.data?.asset_id;

    logger.info('Upload asset created', { uploadId, assetId });

    // Update database with asset ID
  }

  /**
   * Handle upload error webhook
   */
  private async handleUploadError(payload: MuxWebhookPayload): Promise<void> {
    const uploadId = payload.data?.id;
    logger.error('Upload failed or cancelled', {
      uploadId,
      error: payload.data?.error,
    });

    // Mark upload as failed in database
  }

  /**
   * Get video analytics data
   */
  async getVideoAnalytics(assetId: string): Promise<any> {
    try {
      // Note: Mux Data API requires separate credentials and setup
      // This is a placeholder for analytics functionality
      logger.info('Retrieving video analytics', { assetId });

      // Implementation would depend on Mux Data API setup
      return {
        assetId,
        views: 0,
        watchTime: 0,
        // ... other analytics data
      };
    } catch (error) {
      logger.error('Failed to retrieve video analytics', {
        assetId,
        error: (error as Error).message,
      });
      throw error;
    }
  }

  /**
   * Create live stream
   */
  async createLiveStream(metadata: {
    courseId: string;
    teacherId: string;
    title: string;
  }): Promise<any> {
    try {
      logger.info('Creating Mux live stream', {
        courseId: metadata.courseId,
        title: metadata.title,
      });

      const liveStream = await this.mux.video.liveStreams.create({
        playback_policy: ['public'],
        new_asset_settings: {
          playback_policy: ['public'],
          mp4_support: 'standard',
        },
        passthrough: JSON.stringify(metadata),
      });

      return {
        id: liveStream.id,
        streamKey: liveStream.stream_key,
        playbackIds: liveStream.playback_ids,
        status: liveStream.status,
      };
    } catch (error) {
      logger.error('Failed to create live stream', {
        error: (error as Error).message,
        metadata,
      });
      throw new AppError(`Failed to create live stream: ${(error as Error).message}`, 500);
    }
  }

  /**
   * Check if Mux service is healthy
   */
  async healthCheck(): Promise<boolean> {
    try {
      // Simple check by listing assets with limit 1
      await this.mux.video.assets.list({ limit: 1 });
      return true;
    } catch (error) {
      logger.error('Mux health check failed', { error: (error as Error).message });
      return false;
    }
  }
}

export const muxService = new MuxService();
