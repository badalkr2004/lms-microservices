// src/services/course-video.integration.ts
import { videoService } from './video.service';
import { databaseService } from './database.service';
import { createLogger } from '../utils/logger';
import { AppError } from '../utils/errors';

const logger = createLogger('CourseVideoIntegration');

/**
 * Integration service for course and video operations
 */
export class CourseVideoIntegration {
  /**
   * Create lecture with video upload
   */
  async createLectureWithVideo(lectureData: {
    courseId: string;
    chapterId?: string;
    title: string;
    description?: string;
    contentType: string;
    sortOrder: number;
    videoFile: {
      fileName: string;
      fileSize: number;
      contentType: string;
    };
  }, userId: string) {
    try {
      logger.info('Creating lecture with video upload', { 
        courseId: lectureData.courseId,
        title: lectureData.title,
        userId 
      });

      // First create the lecture record
      const [lecture] = await db.insert(courseLectures).values({
        courseId: lectureData.courseId,
        chapterId: lectureData.chapterId,
        title: lectureData.title,
        description: lectureData.description,
        contentType: lectureData.contentType,
        sortOrder: lectureData.sortOrder,
        videoUrl: null, // Will be updated after video processing
        videoMuxAssetId: null,
        videoDuration: null,
        isActive: true,
      }).returning();

      // Initiate video upload
      const videoUpload = await videoService.initiateVideoUpload({
        courseId: lectureData.courseId,
        lectureId: lecture.id,
        fileName: lectureData.videoFile.fileName,
        fileSize: lectureData.videoFile.fileSize,
        contentType: lectureData.videoFile.contentType,
      }, userId);

      return {
        lecture,
        videoUpload,
      };
    } catch (error) {
      logger.error('Failed to create lecture with video', { 
        error: error.message,
        lectureData,
        userId 
      });
      throw error;
    }
  }

  /**
   * Update lecture video after processing
   */
  async updateLectureVideoStatus(lectureId: string, videoData: {
    fileId: string;
    assetId: string;
    videoUrl: string;
    duration: number;
    thumbnailUrl?: string;
  }) {
    try {
      await db.update(courseLectures)
        .set({
          videoUrl: videoData.videoUrl,
          videoMuxAssetId: videoData.assetId,
          videoDuration: Math.ceil(videoData.duration),
          updatedAt: new Date(),
        })
        .where(eq(courseLectures.id, lectureId));

      // Update course statistics
      await this.updateCourseVideoStats(lectureId);

      logger.info('Lecture video status updated', { 
        lectureId,
        assetId: videoData.assetId 
      });
    } catch (error) {
      logger.error('Failed to update lecture video status', { 
        lectureId,
        error: error.message 
      });
      throw error;
    }
  }

  /**
   * Get course with video processing status
   */
  async getCourseWithVideoStatus(courseId: string, userId: string) {
    try {
      // Get course details
      const [course] = await db.select()
        .from(courses)
        .where(eq(courses.id, courseId));

      if (!course) {
        throw new AppError('Course not found', 404);
      }

      // Get lectures with video status
      const lectures = await db.select({
        id: courseLectures.id,
        title: courseLectures.title,
        description: courseLectures.description,
        contentType: courseLectures.contentType,
        videoUrl: courseLectures.videoUrl,
        videoMuxAssetId: courseLectures.videoMuxAssetId,
        videoDuration: courseLectures.videoDuration,
        sortOrder: courseLectures.sortOrder,
        isActive: courseLectures.isActive,
      })
        .from(courseLectures)
        .where(eq(courseLectures.courseId, courseId))
        .orderBy(courseLectures.sortOrder);

      // Get video processing status for each lecture
      const lecturesWithStatus = await Promise.all(
        lectures.map(async (lecture) => {
          let videoStatus = null;
          
          if (lecture.videoMuxAssetId) {
            try {
              // Get file ID from database
              const [file] = await db.select()
                .from(files)
                .where(and(
                  eq(files.category, 'video'),
                  sql`JSON_EXTRACT(metadata, '$.lectureId') = ${lecture.id}`
                ))
                .limit(1);

              if (file) {
                videoStatus = await videoService.getVideoStatus(file.id, userId);
              }
            } catch (error) {
              logger.warn('Failed to get video status for lecture', { 
                lectureId: lecture.id,
                error: error.message 
              });
            }
          }

          return {
            ...lecture,
            videoStatus,
          };
        })
      );

      return {
        ...course,
        lectures: lecturesWithStatus,
        videoStats: {
          totalLectures: lectures.length,
          videosReady: lecturesWithStatus.filter(l => l.videoStatus?.status === 'completed').length,
          videosProcessing: lecturesWithStatus.filter(l => l.videoStatus?.status === 'processing').length,
          videosFailed: lecturesWithStatus.filter(l => l.videoStatus?.status === 'failed').length,
        },
      };
    } catch (error) {
      logger.error('Failed to get course with video status', { 
        courseId,
        userId,
        error: error.message 
      });
      throw error;
    }
  }

  /**
   * Replace lecture video
   */
  async replaceLectureVideo(
    lectureId: string,
    newVideoFile: {
      fileName: string;
      fileSize: number;
      contentType: string;
    },
    userId: string
  ) {
    try {
      logger.info('Replacing lecture video', { lectureId, userId });

      // Get existing lecture
      const [lecture] = await db.select()
        .from(courseLectures)
        .where(eq(courseLectures.id, lectureId));

      if (!lecture) {
        throw new AppError('Lecture not found', 404);
      }

      // Delete old video if exists
      if (lecture.videoMuxAssetId) {
        try {
          // Find the old file record
          const [oldFile] = await db.select()
            .from(files)
            .where(and(
              eq(files.category, 'video'),
              sql`JSON_EXTRACT(metadata, '$.lectureId') = ${lectureId}`
            ))
            .limit(1);

          if (oldFile) {
            await videoService.deleteVideo(oldFile.id, userId);
          }
        } catch (error) {
          logger.warn('Failed to delete old video', { 
            lectureId,
            error: error.message 
          });
        }
      }

      // Upload new video
      const videoUpload = await videoService.initiateVideoUpload({
        courseId: lecture.courseId,
        lectureId: lectureId,
        fileName: newVideoFile.fileName,
        fileSize: newVideoFile.fileSize,
        contentType: newVideoFile.contentType,
      }, userId);

      // Clear current video data from lecture
      await db.update(courseLectures)
        .set({
          videoUrl: null,
          videoMuxAssetId: null,
          videoDuration: null,
          updatedAt: new Date(),
        })
        .where(eq(courseLectures.id, lectureId));

      return videoUpload;
    } catch (error) {
      logger.error('Failed to replace lecture video', { 
        lectureId,
        error: error.message 
      });
      throw error;
    }
  }

  /**
   * Update course video statistics
   */
  private async updateCourseVideoStats(lectureId: string) {
    try {
      // Get course ID from lecture
      const [lecture] = await db.select({ courseId: courseLectures.courseId })
        .from(courseLectures)
        .where(eq(courseLectures.id, lectureId));

      if (!lecture) return;

      // Count total lectures and videos
      const stats = await db.select({
        totalLectures: sql<number>`count(*)`,
        totalVideos: sql<number>`count(${courseLectures.videoUrl})`,
        totalDuration: sql<number>`sum(${courseLectures.videoDuration})`,
      })
        .from(courseLectures)
        .where(and(
          eq(courseLectures.courseId, lecture.courseId),
          eq(courseLectures.isActive, true)
        ));

      // Update course with new stats
      await db.update(courses)
        .set({
          totalLectures: stats[0].totalLectures,
          durationMinutes: Math.floor((stats[0].totalDuration || 0) / 60),
          durationHours: Math.floor((stats[0].totalDuration || 0) / 3600),
          updatedAt: new Date(),
        })
        .where(eq(courses.id, lecture.courseId));

      logger.debug('Course video stats updated', { 
        courseId: lecture.courseId,
        stats: stats[0] 
      });
    } catch (error) {
      logger.error('Failed to update course video stats', { 
        lectureId,
        error: error.message 
      });
    }
  }

  /**
   * Bulk upload videos for a course
   */
  async bulkUploadCourseVideos(
    courseId: string,
    videos: Array<{
      lectureId: string;
      fileName: string;
      fileSize: number;
      contentType: string;
    }>,
    userId: string
  ) {
    const results = {
      successful: [] as any[],
      failed: [] as any[],
    };

    for (const video of videos) {
      try {
        const upload = await videoService.initiateVideoUpload({
          courseId,
          lectureId: video.lectureId,
          fileName: video.fileName,
          fileSize: video.fileSize,
          contentType: video.contentType,
        }, userId);

        results.successful.push({
          lectureId: video.lectureId,
          upload,
        });
      } catch (error) {
        logger.error('Failed to upload video in bulk operation', { 
          lectureId: video.lectureId,
          error: error.message 
        });

        results.failed.push({
          lectureId: video.lectureId,
          fileName: video.fileName,
          error: error.message,
        });
      }
    }

    return results;
  }

  /**
   * Get course video processing summary
   */
  async getCourseVideoSummary(courseId: string) {
    try {
      const lectures = await db.select()
        .from(courseLectures)
        .where(and(
          eq(courseLectures.courseId, courseId),
          eq(courseLectures.isActive, true)
        ));

      const videoSummary = {
        totalLectures: lectures.length,
        lecturesWithVideo: lectures.filter(l => l.videoUrl).length,
        lecturesWithoutVideo: lectures.filter(l => !l.videoUrl).length,
        totalDuration: lectures.reduce((sum, l) => sum + (l.videoDuration || 0), 0),
        processingStatus: {
          ready: 0,
          processing: 0,
          failed: 0,
          pending: 0,
        },
      };

      // Get processing status for each video
      for (const lecture of lectures) {
        if (lecture.videoMuxAssetId) {
          try {
            const [file] = await db.select()
              .from(files)
              .where(and(
                eq(files.category, 'video'),
                sql`JSON_EXTRACT(metadata, '$.lectureId') = ${lecture.id}`
              ))
              .limit(1);

            if (file) {
              videoSummary.processingStatus[file.status as keyof typeof videoSummary.processingStatus]++;
            }
          } catch (error) {
            logger.warn('Failed to get video status for summary', { 
              lectureId: lecture.id 
            });
          }
        } else {
          videoSummary.processingStatus.pending++;
        }
      }

      return videoSummary;
    } catch (error) {
      logger.error('Failed to get course video summary', { 
        courseId,
        error: error.message 
      });
      throw error;
    }
  }
}

export const courseVideoIntegration = new CourseVideoIntegration();

// Example usage in your course service controller:
/*
// In your course service controller
import { courseVideoIntegration } from './course-video.integration';

export class CourseController {
  async createLectureWithVideo(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.headers['x-user-id'] as string;
      const result = await courseVideoIntegration.createLectureWithVideo(req.body, userId);
      
      res.status(201).json({
        success: true,
        message: 'Lecture created and video upload initiated',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  async getCourseWithVideos(req: Request, res: Response, next: NextFunction) {
    try {
      const { courseId } = req.params;
      const userId = req.headers['x-user-id'] as string;
      
      const courseWithVideos = await courseVideoIntegration.getCourseWithVideoStatus(courseId, userId);
      
      res.status(200).json({
        success: true,
        data: courseWithVideos,
      });
    } catch (error) {
      next(error);
    }
  }
}
*/