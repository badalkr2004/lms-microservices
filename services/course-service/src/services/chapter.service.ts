// src/services/chapter.service.ts
import { ChapterRepository } from '../repositories/chapter.repository';
import { CourseRepository } from '../repositories/course.repository';
import { CreateChapterInput, UpdateChapterInput } from '@lms/database';
import { NotFoundError, ForbiddenError } from '../utils/errors';

export class ChapterService {
  constructor(
    private chapterRepository: ChapterRepository,
    private courseRepository: CourseRepository
  ) {}

  async createChapter(data: CreateChapterInput, userId: string, userRole: string) {
    // Verify course exists and user has permission
    const course = await this.courseRepository.findById(data.courseId);
    if (!course) {
      throw new NotFoundError('Course not found');
    }

    if (userRole !== 'super_admin' && course.teacherId !== userId) {
      throw new ForbiddenError('You can only add chapters to your own courses');
    }

    // Get next sort order if not provided
    if (!data.sortOrder) {
      data.sortOrder = await this.chapterRepository.getNextSortOrder(data.courseId);
    }

    const chapterData = {
      ...data,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    return await this.chapterRepository.create(chapterData);
  }

  async getChapterById(id: string) {
    const chapter = await this.chapterRepository.findById(id);
    if (!chapter) {
      throw new NotFoundError('Chapter not found');
    }
    return chapter;
  }

  async getCourseChapters(courseId: string) {
    // Verify course exists
    const course = await this.courseRepository.findById(courseId);
    if (!course) {
      throw new NotFoundError('Course not found');
    }

    return await this.chapterRepository.findByCourseId(courseId);
  }

  async updateChapter(id: string, data: UpdateChapterInput, userId: string, userRole: string) {
    const chapter = await this.chapterRepository.findById(id);
    if (!chapter) {
      throw new NotFoundError('Chapter not found');
    }

    // Verify course ownership
    const course = await this.courseRepository.findById(chapter.courseId);
    if (userRole !== 'super_admin' && course?.teacherId !== userId) {
      throw new ForbiddenError('You can only update chapters in your own courses');
    }

    return await this.chapterRepository.update(id, data);
  }

  async deleteChapter(id: string, userId: string, userRole: string) {
    const chapter = await this.chapterRepository.findById(id);
    if (!chapter) {
      throw new NotFoundError('Chapter not found');
    }

    // Verify course ownership
    const course = await this.courseRepository.findById(chapter.courseId);
    if (userRole !== 'super_admin' && course?.teacherId !== userId) {
      throw new ForbiddenError('You can only delete chapters from your own courses');
    }

    await this.chapterRepository.delete(id);
  }

  async reorderChapters(
    courseId: string,
    chapterOrders: Array<{ id: string; sortOrder: number }>,
    userId: string,
    userRole: string
  ) {
    // Verify course ownership
    const course = await this.courseRepository.findById(courseId);
    if (!course) {
      throw new NotFoundError('Course not found');
    }

    if (userRole !== 'super_admin' && course.teacherId !== userId) {
      throw new ForbiddenError('You can only reorder chapters in your own courses');
    }

    await this.chapterRepository.reorder(courseId, chapterOrders);
  }
}
