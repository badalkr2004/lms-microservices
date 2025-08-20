// src/services/progress.service.ts
import { ProgressRepository } from '../repositories/progress.repository';
import { LectureRepository } from '../repositories/lecture.repository';
import { EnrollmentService } from './enrollment.service';
import { NotFoundError, ForbiddenError } from '../utils/errors';

export class ProgressService {
  constructor(
    private progressRepository: ProgressRepository,
    private lectureRepository: LectureRepository,
    private enrollmentService: EnrollmentService
  ) {}

  async updateLectureProgress(
    userId: string,
    lectureId: string,
    progressData: {
      watchTime?: number;
      lastPosition?: number;
      isCompleted?: boolean;
    }
  ) {
    // Verify lecture exists
    const lecture = await this.lectureRepository.findById(lectureId);
    if (!lecture) {
      throw new NotFoundError('Lecture not found');
    }

    // Check if user is enrolled in the course
    const enrollment = await this.enrollmentService.getUserEnrollments(userId);
    const isEnrolled = enrollment.some(
      e => e.courseId === lecture.courseId && e.status === 'active'
    );

    if (!isEnrolled) {
      throw new ForbiddenError('You must be enrolled in the course to track progress');
    }

    // Prepare update data
    const updateData: any = {
      userId,
      courseId: lecture.courseId,
      lectureId,
      ...progressData,
    };

    // Mark as completed if watch time meets criteria or explicitly set
    if (
      progressData.isCompleted ||
      (progressData.watchTime &&
        lecture.videoDuration &&
        progressData.watchTime >= lecture.videoDuration * 0.9)
    ) {
      updateData.isCompleted = true;
      updateData.completedAt = new Date().toISOString();
    }

    const progress = await this.progressRepository.upsert(updateData);

    // Update overall course progress
    await this.updateCourseProgress(userId, lecture.courseId);

    return progress;
  }

  async getLectureProgress(userId: string, lectureId: string) {
    const progress = await this.progressRepository.findByUserAndLecture(userId, lectureId);

    if (!progress) {
      return {
        lectureId,
        isCompleted: false,
        watchTime: 0,
        lastPosition: 0,
        completedAt: null,
        lastAccessedAt: null,
      };
    }

    return progress;
  }

  async getCourseProgress(userId: string, courseId: string) {
    const [progressData, progressStats] = await Promise.all([
      this.progressRepository.findUserCourseProgress(userId, courseId),
      this.progressRepository.getCourseProgressStats(userId, courseId),
    ]);

    return {
      lectures: progressData,
      stats: progressStats,
    };
  }

  async markLectureComplete(userId: string, lectureId: string) {
    return await this.updateLectureProgress(userId, lectureId, {
      isCompleted: true,
    });
  }

  async markLectureIncomplete(userId: string, lectureId: string) {
    return await this.updateLectureProgress(userId, lectureId, {
      isCompleted: false,
    });
  }

  async resetLectureProgress(userId: string, lectureId: string) {
    await this.progressRepository.delete(userId, lectureId);
    return { success: true, message: 'Lecture progress reset successfully' };
  }

  async resetCourseProgress(userId: string, courseId: string) {
    // Get all user's progress for this course
    const progressData = await this.progressRepository.findUserCourseProgress(userId, courseId);

    // Delete all progress records
    for (const progress of progressData) {
      await this.progressRepository.delete(userId, progress.lectureId);
    }

    // Update enrollment progress to 0
    await this.enrollmentService.updateProgress(userId, courseId, 0, 0);

    return { success: true, message: 'Course progress reset successfully' };
  }

  private async updateCourseProgress(userId: string, courseId: string) {
    const stats = await this.progressRepository.getCourseProgressStats(userId, courseId);

    // Update enrollment progress
    await this.enrollmentService.updateProgress(
      userId,
      courseId,
      stats.progressPercentage,
      stats.totalWatchTime
    );

    return stats;
  }
}
