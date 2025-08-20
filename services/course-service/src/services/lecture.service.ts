// src/services/lecture.service.ts
import { LectureRepository } from '../repositories/lecture.repository';
import { CourseRepository } from '../repositories/course.repository';
import { CreateLectureInput, UpdateLectureInput } from '@lms/database';
import { NotFoundError, ForbiddenError } from '../utils/errors';

export class LectureService {
  constructor(
    private lectureRepository: LectureRepository,
    private courseRepository: CourseRepository
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

    await this.lectureRepository.delete(id);

    // Update course statistics
    await this.updateCourseStatistics(lecture.courseId);
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
