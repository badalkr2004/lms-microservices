// src/services/lecture.service.ts
import { LectureRepository } from '../repositories/lecture.repository';
import { CourseRepository } from '../repositories/course.repository';
import { CreateLectureInput, db, files, UpdateLectureInput } from '@lms/database';
import { NotFoundError, ForbiddenError, AppError } from '../utils/errors';
import { LectureResponse } from '@/types';
import { FileClient } from '@/client/file.client';
import { logger } from '@lms/logger';
import { and, eq, sql } from 'drizzle-orm';
import { validateAttachVideo } from '@/validations/lecture.validation';

export class LectureService {
  constructor(
    private lectureRepository: LectureRepository,
    private courseRepository: CourseRepository,
    private fileClient: FileClient
  ) {}

  async createLecture(data: CreateLectureInput, userId: string, userRole: string) {
    // Verify course exists and user has permission
    const course = await this.courseRepository.findById(data.courseId);
    if (!course) {
      throw new NotFoundError('Course not found');
    }

    if (userRole !== 'super_admin' && course.teacherId !== userId) {
      throw new ForbiddenError('You can only add lectures to your own courses');
    }

    // Get next sort order if not provided
    if (!data.sortOrder) {
      data.sortOrder = await this.lectureRepository.getNextSortOrder(data.courseId, data.chapterId);
    }

    const lectureData = {
      ...data,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const lecture = await this.lectureRepository.create(lectureData);

    // Update course statistics
    await this.updateCourseStatistics(data.courseId);

    return lecture;
  }

  async createLectureWithVideo(
    userRole: string,
    lectureData: CreateLectureInput & {
      videoFile: {
        fileName: string;
        fileSize: number;
        contentType: string;
      };
    },
    userId: string
  ) {
    try {
      // Create the lecture first

      const lecture = await this.createLecture(lectureData, userId, userRole);

      // Initiate video upload if video file is provided

      const videoUploadResponse = await this.fileClient.initiateVideoUpload(
        {
          courseId: lectureData.courseId,
          lectureId: lecture.id,
          fileName: lectureData.videoFile.fileName,
          fileSize: lectureData.videoFile.fileSize,
          contentType: lectureData.videoFile.contentType,
        },
        userId
      );

      logger.info('Lecture with video upload initiated', {
        lectureId: lecture.id,
        fileId: videoUploadResponse.fileId,
      });

      return {
        lecture,
        videoUpload: {
          fileId: videoUploadResponse.fileId,
          uploadUrl: videoUploadResponse.uploadUrl,
          uploadId: videoUploadResponse.uploadId,
          expiresAt: videoUploadResponse.expiresAt,
        },
      };
    } catch (error) {
      logger.error('Failed to initiate video upload', error);
      throw error;
    }
  }

  async getLectureById(id: string) {
    const lecture = await this.lectureRepository.findById(id);
    if (!lecture) {
      throw new NotFoundError('Lecture not found');
    }
    return lecture;
  }

  async getCourseLectures(courseId: string) {
    const course = await this.courseRepository.findById(courseId);
    if (!course) {
      throw new NotFoundError('Course not found');
    }

    return await this.lectureRepository.findByCourseId(courseId);
  }

  async getChapterLectures(chapterId: string) {
    return await this.lectureRepository.findByChapterId(chapterId);
  }

  async updateLecture(id: string, data: UpdateLectureInput, userId: string, userRole: string) {
    const lecture = await this.lectureRepository.findById(id);
    if (!lecture) {
      throw new NotFoundError('Lecture not found');
    }

    // Verify course ownership
    const course = await this.courseRepository.findById(lecture.courseId);
    if (userRole !== 'super_admin' && course?.teacherId !== userId) {
      throw new ForbiddenError('You can only update lectures in your own courses');
    }

    const updatedLecture = await this.lectureRepository.update(id, data);

    // Update course statistics if duration changed
    if (data.videoDuration !== undefined) {
      await this.updateCourseStatistics(lecture.courseId);
    }

    return updatedLecture;
  }

  async deleteLecture(id: string, userId: string, userRole: string) {
    const lecture = await this.lectureRepository.findById(id);
    if (!lecture) {
      throw new NotFoundError('Lecture not found');
    }

    // Verify course ownership
    const course = await this.courseRepository.findById(lecture.courseId);
    if (userRole !== 'super_admin' && course?.teacherId !== userId) {
      throw new ForbiddenError('You can only delete lectures from your own courses');
    }
    if (lecture.videoMuxAssetId) {
      try {
        const [videoFile] = await db
          .select()
          .from(files)
          .where(
            and(eq(files.userId, userId), sql`(${files.metadata}::json ->> 'lectureId') = ${id}`)
          );
        if (videoFile) {
          await this.fileClient.deleteVideo(videoFile.id, userId);
        }
      } catch (error) {
        logger.warn('Failed to delete associated video', {
          lectureId: id,
          error: (error as Error).message,
        });
        throw error;
      }
    }

    await this.lectureRepository.delete(id);

    // Update course statistics
    await this.updateCourseStatistics(lecture.courseId);
  }

  async attachVideoToLecture(
    lectureId: string,
    videoFile: {
      fileName: string;
      fileSize: number;
      contentType: string;
    },
    userId: string,
    userRole: string
  ): Promise<{
    fileId: string;
    uploadUrl: string;
    uploadId: string;
    expiresAt: Date;
  }> {
    try {
      // Verify lecture exists and user has permission
      const lecture = await this.lectureRepository.findById(lectureId);
      if (!lecture) {
        throw new NotFoundError('Lecture not found');
      }

      // Verify course ownership
      const course = await this.courseRepository.findById(lecture.courseId);

      if (userRole !== 'super_admin' && course?.teacherId !== userId) {
        throw new ForbiddenError('You can only delete lectures from your own courses');
      }

      // Update lecture content type to video
      await this.lectureRepository.update(lectureId, { contentType: 'video' });

      // Initiate video upload
      const videoUploadResponse = await this.fileClient.initiateVideoUpload(
        {
          courseId: lecture.courseId,
          lectureId: lectureId,
          fileName: videoFile.fileName,
          fileSize: videoFile.fileSize,
          contentType: videoFile.contentType,
        },
        userId
      );

      logger.info('Video attached to lecture', {
        lectureId,
        fileId: videoUploadResponse.fileId,
      });

      return {
        fileId: videoUploadResponse.fileId,
        uploadUrl: videoUploadResponse.uploadUrl,
        uploadId: videoUploadResponse.uploadId,
        expiresAt: videoUploadResponse.expiresAt,
      };
    } catch (error) {
      logger.error('Failed to attach video to lecture', {
        lectureId,
        error: (error as Error).message,
      });
      throw error;
    }
  }

  /**
   * Get all lectures for a course with video status
   */
  async getCourseLecturesWithVideoStatus(courseId: string, userId: string) {
    try {
      const lectures = await this.lectureRepository.getCourseLectures(courseId, userId);
      if (!lectures) {
        throw new NotFoundError('Lectures not found');
      }

      const lecturesWithStatus = await Promise.all(
        lectures.map(async lecture => {
          let videoStatus = null;
          if (lecture.videoMuxAssetId && lecture.contentType === 'video') {
            try {
              const [videoFile] = await db
                .select()
                .from(files)
                .where(sql`(${files.metadata}::json ->> 'lectureId') = ${lecture.id}`);

              if (videoFile) {
                videoStatus = await this.fileClient.getStatus(videoFile.id, userId);
              }
            } catch (error) {
              logger.warn('Failed to get video status for lecture', {
                lectureId: lecture.id,
                error: (error as Error).message,
              });
              throw new AppError('Not able fetch lectures with video status', 400);
            }
          }
          return {
            ...lecture,
            videoStatus,
          };
        })
      );
      return lecturesWithStatus;
    } catch (error) {
      logger.error('Failed to get course lectures with video status', {
        courseId,
        error: (error as Error).message,
      });
      throw error;
    }
  }

  /**
   * Get video playback URL for lecture
   */
  async getLectureVideoPlaybackUrl(
    lectureId: string,
    userId: string,
    signed: boolean = false,
    expirationHours: number = 24
  ): Promise<{ playbackUrl: string; expiresAt?: Date }> {
    try {
      const lectureData = await this.lectureRepository.findById(lectureId);

      if (!lectureData) {
        throw new AppError('Lecture not found', 404);
      }

      if (!lectureData.videoUrl || !lectureData.videoMuxAssetId) {
        throw new AppError('No video associated with this lecture', 404);
      }

      // For signed URLs (premium content)
      if (signed) {
        const [videoFile] = await db
          .select()
          .from(files)
          .where(sql`(${files.metadata}::json ->> 'lectureId') = ${lectureId}`);

        if (!videoFile) {
          throw new AppError('Video file not found', 404);
        }

        const signedUrl = await this.fileClient.getSignedPlaybackUrl(
          videoFile.id,
          userId,
          expirationHours
        );

        return {
          playbackUrl: signedUrl,
          expiresAt: new Date(Date.now() + expirationHours * 3600 * 1000),
        };
      }

      // For public URLs
      return {
        playbackUrl: lectureData.videoUrl,
      };
    } catch (error) {
      logger.error('Failed to get lecture video playback URL', {
        lectureId,
        error: (error as Error).message,
      });
      throw error;
    }
  }

  async reorderLectures(
    courseId: string,
    lectureOrders: Array<{ id: string; sortOrder: number }>,
    userId: string,
    userRole: string,
    chapterId?: string
  ) {
    // Verify course ownership
    const course = await this.courseRepository.findById(courseId);
    if (!course) {
      throw new NotFoundError('Course not found');
    }

    if (userRole !== 'super_admin' && course.teacherId !== userId) {
      throw new ForbiddenError('You can only reorder lectures in your own courses');
    }

    await this.lectureRepository.reorder(courseId, lectureOrders, chapterId);
  }

  private async updateCourseStatistics(courseId: string) {
    const [totalLectures, totalDuration] = await Promise.all([
      this.lectureRepository.countByCourseId(courseId),
      this.lectureRepository.getTotalDuration(courseId),
    ]);

    const durationHours = Math.floor(totalDuration / 3600);
    const durationMinutes = Math.floor((totalDuration % 3600) / 60);

    await this.courseRepository.update(courseId, {
      totalLectures,
      durationHours,
      durationMinutes,
    });
  }
}
