// src/jobs/video.jobs.ts
import cron from 'node-cron';
import { VideoService } from '../services/video.service';
import { DatabaseService } from '../services/database.service';
import { MuxService } from '../services/mux.service';
import { logger } from '@lms/logger'
import { config } from '../config';

// const logger = createLogger('VideoJobs');
export class VideoJobs {
  private isProcessing = false;
  private videoService: VideoService;
  private databaseService: DatabaseService;
  private muxService: MuxService;

  constructor() {
    this.videoService = new VideoService();
    this.databaseService = new DatabaseService();
    this.muxService = new MuxService();
  }
  }

  /**
   * Initialize all video-related background jobs
   */
  init() {
    logger.info('Initializing video background jobs');

    // Cleanup expired upload sessions every 30 minutes
    cron.schedule('*/30 * * * *', async () => {
      await this.cleanupExpiredSessions();
    });

    // Process video queue every 5 minutes
    cron.schedule('*/5 * * * *', async () => {
      await this.processVideoQueue();
    });

    // Generate video analytics every hour
    cron.schedule('0 * * * *', async () => {
      await this.updateVideoAnalytics();
    });

    // Cleanup old failed uploads daily at 2 AM
    cron.schedule('0 2 * * *', async () => {
      await this.cleanupFailedUploads();
    });

    logger.info('Video background jobs initialized');
  }

  /**
   * Cleanup expired upload sessions
   */
  private async cleanupExpiredSessions() {
    try {
      if (this.isProcessing) {
        logger.debug('Skipping cleanup - already processing');
        return;
      }

      this.isProcessing = true;
      logger.info('Starting expired sessions cleanup');

      const cleanedCount = await this.videoService.cleanupExpiredSessions();
      
      logger.info('Expired sessions cleanup completed', { 
        cleanedCount 
      });
    } catch (error) {
      logger.error('Failed to cleanup expired sessions', { 
        error: error.message 
      });
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Process video queue for stuck or retry-able items
   */
  private async processVideoQueue() {
    try {
      // Get stuck processing videos (processing for more than 30 minutes)
      const stuckVideos = await this.databaseService.getStuckProcessingVideos(30);

      for (const video of stuckVideos) {
        try {
          logger.info('Retrying stuck video processing', { fileId: video.id });
          
          // Check status with Mux and update accordingly
          await this.videoService.getVideoStatus(video.id, video.userId);
        } catch (error) {
          logger.error('Failed to retry stuck video', { 
            fileId: video.id,
            error: (error as Error).message 
          });
        }
      }

      logger.debug('Video queue processing completed', { 
        processedCount: stuckVideos.length 
      });
    } catch (error) {
      logger.error('Failed to process video queue', { 
        error: (error as Error).message 
      });
    }
  }

  /**
   * Update video analytics (if Mux Data is available)
   */
  private async updateVideoAnalytics() {
    try {
      logger.debug('Updating video analytics');

      // Get completed videos from last 24 hours
      const recentVideos = await this.  databaseService.getRecentCompletedVideos(24);

      for (const video of recentVideos) {
        try {
          const metadata = JSON.parse(video.metadata || '{}');
          if (metadata.muxAssetId) {
            const analytics = await this.videoService.getVideoAnalytics(metadata.muxAssetId);

            // Store analytics in metadata or separate table
            await this.databaseService.updateFileProcessingStatus(
              video.id,
              video.status,
              {
                ...metadata,
                analytics: {
                  ...analytics,
                  lastUpdated: new Date().toISOString(),
                },
              }
            );
          }
        } catch (error) {
          logger.warn('Failed to update analytics for video', { 
            fileId: video.id,
            error: (error as Error).message 
          });
        }
      }

      logger.debug('Video analytics update completed');
    } catch (error) {
      logger.error('Failed to update video analytics', { 
        error: (error as Error).message 
      });
    }
  }

  /**
   * Cleanup old failed uploads (older than 7 days)
   */
  private async cleanupFailedUploads() {
    try {
      logger.info('Starting cleanup of old failed uploads');

      const cleanedCount = await this.databaseService.cleanupOldFailedUploads(7);

      logger.info('Old failed uploads cleanup completed', { 
        cleanedCount 
      });
    } catch (error) {
      logger.error('Failed to cleanup old failed uploads', { 
        error: (error as Error).message 
      });
    }
  }

  /**
   * Manual trigger for processing specific video
   */
  async retryVideoProcessing(fileId: string, userId: string) {
    try {
      logger.info('Manual retry triggered for video', { fileId, userId });

      const status = await this.videoService.getVideoStatus(fileId, userId);

      if (status.status === 'failed' && status.muxAssetId) {
        // Try to get updated status from Mux
        const asset = await this.muxService.getAsset(status.muxAssetId);

        if (asset.status === 'ready') {
          // Process as if we received the ready webhook
          await videoService.processWebhookEvent({
            type: 'video.asset.ready',
            data: { id: status.muxAssetId },
            created_at: new Date().toISOString(),
          });
        }
      }

      return await videoService.getVideoStatus(fileId, userId);
    } catch (error) {
      logger.error('Failed to retry video processing', { 
        fileId,
        userId,
        error: error.message 
      });
      throw error;
    }
  }
}

export const videoJobs = new VideoJobs();

