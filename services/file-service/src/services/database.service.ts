// src/services/database.service.ts - Additional methods
import {db, files} from '@lms/database'
import { logger } from '@lms/logger';
import { AppError } from '@/utils/errors';
import { and, eq, sql } from 'drizzle-orm';


export class DatabaseService {

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
        error: (error as Error).message 
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
        error: error
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
        error: (error as Error).message 
      });
      throw new AppError('Failed to cleanup old uploads', 500);
    }
  }
}

