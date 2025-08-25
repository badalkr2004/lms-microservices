// src/jobs/video.jobs.ts
import cron from 'node-cron';
import { VideoService } from '../services/video.service';
import { databaseService } from '../services/database.service';
import { logger } from '@lms/logger'
import { config } from '../config';

// const logger = createLogger('VideoJobs');

export class VideoJobs {
  private isProcessing = false;

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

      const cleanedCount = await videoService.cleanupExpiredSessions();
      
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
      logger.debug('Processing video queue');

      // Get stuck processing videos (processing for more than 30 minutes)
      const stuckVideos = await databaseService.getStuckProcessingVideos(30);

      for (const video of stuckVideos) {
        try {
          logger.info('Retrying stuck video processing', { fileId: video.id });
          
          // Check status with Mux and update accordingly
          await videoService.getVideoStatus(video.id, video.userId);
        } catch (error) {
          logger.error('Failed to retry stuck video', { 
            fileId: video.id,
            error: error.message 
          });
        }
      }

      logger.debug('Video queue processing completed', { 
        processedCount: stuckVideos.length 
      });
    } catch (error) {
      logger.error('Failed to process video queue', { 
        error: error.message 
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
      const recentVideos = await databaseService.getRecentCompletedVideos(24);

      for (const video of recentVideos) {
        try {
          const metadata = JSON.parse(video.metadata || '{}');
          if (metadata.muxAssetId) {
            const analytics = await videoService.getVideoAnalytics(metadata.muxAssetId);
            
            // Store analytics in metadata or separate table
            await databaseService.updateFileProcessingStatus(
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
            error: error.message 
          });
        }
      }

      logger.debug('Video analytics update completed');
    } catch (error) {
      logger.error('Failed to update video analytics', { 
        error: error.message 
      });
    }
  }

  /**
   * Cleanup old failed uploads (older than 7 days)
   */
  private async cleanupFailedUploads() {
    try {
      logger.info('Starting cleanup of old failed uploads');

      const cleanedCount = await databaseService.cleanupOldFailedUploads(7);
      
      logger.info('Old failed uploads cleanup completed', { 
        cleanedCount 
      });
    } catch (error) {
      logger.error('Failed to cleanup old failed uploads', { 
        error: error.message 
      });
    }
  }

  /**
   * Manual trigger for processing specific video
   */
  async retryVideoProcessing(fileId: string, userId: string) {
    try {
      logger.info('Manual retry triggered for video', { fileId, userId });

      const status = await videoService.getVideoStatus(fileId, userId);
      
      if (status.status === 'failed' && status.muxAssetId) {
        // Try to get updated status from Mux
        const asset = await muxService.getAsset(status.muxAssetId);
        
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

// src/services/database.service.ts - Additional methods
export class DatabaseService {
  // ... previous methods

  /**
   * Get videos stuck in processing state
   */
  async getStuckProcessingVideos(timeoutMinutes: number = 30) {
    try {
      const timeoutDate = new Date(Date.now() - timeoutMinutes * 60 * 1000);

      const stuckVideos = await db.select()
        .from(files)
        .where(and(
          eq(files.category, 'video'),
          eq(files.status, 'processing'),
          sql`${files.updatedAt} < ${timeoutDate}`
        ));

      return stuckVideos;
    } catch (error) {
      logger.error('Failed to get stuck processing videos', { 
        error: error.message 
      });
      throw new AppError('Failed to get stuck videos', 500);
    }
  }

  /**
   * Get recently completed videos for analytics
   */
  async getRecentCompletedVideos(hoursBack: number = 24) {
    try {
      const timeThreshold = new Date(Date.now() - hoursBack * 60 * 60 * 1000);

      const recentVideos = await db.select()
        .from(files)
        .where(and(
          eq(files.category, 'video'),
          eq(files.status, 'completed'),
          sql`${files.updatedAt} >= ${timeThreshold}`
        ));

      return recentVideos;
    } catch (error) {
      logger.error('Failed to get recent completed videos', { 
        error: error.message 
      });
      throw new AppError('Failed to get recent videos', 500);
    }
  }

  /**
   * Cleanup old failed uploads
   */
  async cleanupOldFailedUploads(daysOld: number = 7) {
    try {
      const thresholdDate = new Date(Date.now() - daysOld * 24 * 60 * 60 * 1000);

      const deletedFiles = await db.delete(files)
        .where(and(
          eq(files.category, 'video'),
          eq(files.status, 'failed'),
          sql`${files.createdAt} < ${thresholdDate}`
        ))
        .returning({ id: files.id });

      return deletedFiles.length;
    } catch (error) {
      logger.error('Failed to cleanup old failed uploads', { 
        error: error.message 
      });
      throw new AppError('Failed to cleanup old uploads', 500);
    }
  }
}