// src/services/course.service.ts
import slugify from 'slugify';
import { CourseRepository } from '../repositories/course.repository';
import { CourseFilters } from '../types';
import { NotFoundError, ConflictError, ForbiddenError } from '../utils/errors';
import { calculatePagination } from '../utils/pagination';
import { CreateCourseInput, UpdateCourseInput } from '@lms/database';

export class CourseService {
  constructor(private courseRepository: CourseRepository) {}

  async createCourse(teacherId: string, data: CreateCourseInput) {
    const slug = slugify(data.title, { lower: true, strict: true });

    // Check if slug already exists
    const existingCourse = await this.courseRepository.findBySlug(slug);
    if (existingCourse) {
      throw new ConflictError('Course with this title already exists');
    }

    const courseData = {
      ...data,
      teacherId,
      slug,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    return await this.courseRepository.create(courseData);
  }

  async getCourseById(id: string, userId?: string, userRole?: string) {
    const course = await this.courseRepository.findById(id);
    if (!course) {
      throw new NotFoundError('Course not found');
    }

    // Check access permissions
    if (
      course.status !== 'published' &&
      userRole !== 'super_admin' &&
      course.teacherId !== userId
    ) {
      throw new ForbiddenError('Access denied');
    }

    return course;
  }

  async getCourses(filters: CourseFilters, paginationParams: any, userRole?: string) {
    // Filter out non-published courses for regular users
    if (userRole !== 'super_admin' && userRole !== 'teacher') {
      filters.status = 'published';
    }

    const pagination = calculatePagination(
      paginationParams.page,
      paginationParams.limit,
      0 // Will be calculated in repository
    );

    const { courses, total } = await this.courseRepository.findAll(filters, {
      ...paginationParams,
      offset: pagination.offset,
    });

    const finalPagination = calculatePagination(
      paginationParams.page,
      paginationParams.limit,
      total
    );

    return {
      courses,
      pagination: finalPagination,
    };
  }

  async updateCourse(id: string, data: UpdateCourseInput, userId: string, userRole: string) {
    const course = await this.courseRepository.findById(id);
    if (!course) {
      throw new NotFoundError('Course not found');
    }

    // Check permissions
    if (userRole !== 'super_admin' && course.teacherId !== userId) {
      throw new ForbiddenError('You can only update your own courses');
    }

    // Generate new slug if title is updated
    let updateData = { ...data };
    if (data.title && data.title !== course.title) {
      const slug = slugify(data.title, { lower: true, strict: true });
      const existingCourse = await this.courseRepository.findBySlug(slug);
      if (existingCourse && existingCourse.id !== id) {
        throw new ConflictError('Course with this title already exists');
      }
      updateData.slug = slug;
    }

    return await this.courseRepository.update(id, updateData);
  }

  async deleteCourse(id: string, userId: string, userRole: string) {
    const course = await this.courseRepository.findById(id);
    if (!course) {
      throw new NotFoundError('Course not found');
    }

    if (userRole !== 'super_admin' && course.teacherId !== userId) {
      throw new ForbiddenError('You can only delete your own courses');
    }

    await this.courseRepository.delete(id);
  }

  async publishCourse(id: string, userId: string, userRole: string) {
    const course = await this.courseRepository.findById(id);
    if (!course) {
      throw new NotFoundError('Course not found');
    }

    if (userRole !== 'super_admin' && course.teacherId !== userId) {
      throw new ForbiddenError('You can only publish your own courses');
    }

    if (course.status === 'published') {
      throw new ConflictError('Course is already published');
    }

    return await this.courseRepository.update(id, {
      status: 'published',
      publishedAt: new Date().toISOString(),
    });
  }

  async getFeaturedCourses(limit: number = 10) {
    return await this.courseRepository.findAll(
      { status: 'published', isFeatured: true },
      { page: 1, limit, sortBy: 'createdAt', sortOrder: 'desc', offset: 0 }
    );
  }

  async getTeacherCourses(
    teacherId: string,
    paginationParams: any,
    filters: Partial<CourseFilters> = {}
  ) {
    const courseFilters = { ...filters, teacherId };
    return await this.getCourses(courseFilters, paginationParams, 'teacher');
  }
}
