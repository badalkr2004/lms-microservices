// src/services/enrollment.service.ts
import { EnrollmentRepository } from '../repositories/enrollment.repository';
import { CourseRepository } from '../repositories/course.repository';
import { NotFoundError, ConflictError, ForbiddenError } from '../utils/errors';

export class EnrollmentService {
  constructor(
    private enrollmentRepository: EnrollmentRepository,
    private courseRepository: CourseRepository
  ) {}

  async enrollInCourse(userId: string, courseId: string) {
    // Check if course exists and is published
    const course = await this.courseRepository.findById(courseId);
    if (!course) {
      throw new NotFoundError('Course not found');
    }

    if (course.status !== 'published') {
      throw new ForbiddenError('Cannot enroll in unpublished course');
    }

    // Check if already enrolled
    const existingEnrollment = await this.enrollmentRepository.findByUserAndCourse(
      userId,
      courseId
    );

    if (existingEnrollment) {
      if (existingEnrollment.status === 'active') {
        throw new ConflictError('Already enrolled in this course');
      }

      // Reactivate enrollment if previously dropped
      if (existingEnrollment.status === 'dropped') {
        return await this.enrollmentRepository.update(existingEnrollment.id, {
          status: 'active',
          enrolledAt: new Date().toISOString(),
        });
      }
    }

    // Create new enrollment
    const enrollmentData = {
      userId,
      courseId,
      status: 'active' as const,
      enrolledAt: new Date().toISOString(),
      progressPercentage: '0.00',
    };

    const enrollment = await this.enrollmentRepository.create(enrollmentData);

    // Update course enrollment count
    await this.courseRepository.incrementEnrollment(courseId);

    return enrollment;
  }

  async getEnrollmentById(id: string) {
    const enrollment = await this.enrollmentRepository.findById(id);
    if (!enrollment) {
      throw new NotFoundError('Enrollment not found');
    }
    return enrollment;
  }

  async getUserEnrollments(userId: string, status?: string) {
    const filters = status ? { status } : {};
    return await this.enrollmentRepository.findUserEnrollments(userId, filters);
  }

  async getCourseEnrollments(courseId: string, userId: string, userRole: string) {
    // Verify course exists and user has permission
    const course = await this.courseRepository.findById(courseId);
    if (!course) {
      throw new NotFoundError('Course not found');
    }

    if (userRole !== 'super_admin' && course.teacherId !== userId) {
      throw new ForbiddenError('You can only view enrollments for your own courses');
    }

    return await this.enrollmentRepository.findCourseEnrollments(courseId);
  }

  async updateProgress(
    userId: string,
    courseId: string,
    progressPercentage: number,
    totalWatchTime?: number
  ) {
    const enrollment = await this.enrollmentRepository.findByUserAndCourse(userId, courseId);

    if (!enrollment) {
      throw new NotFoundError('Enrollment not found');
    }

    if (enrollment.status !== 'active') {
      throw new ForbiddenError('Cannot update progress for inactive enrollment');
    }

    const updateData: any = {
      progressPercentage: progressPercentage.toFixed(2),
    };

    if (totalWatchTime !== undefined) {
      updateData.totalWatchTime = totalWatchTime;
    }

    // Mark as completed if progress reaches 100%
    if (progressPercentage >= 100) {
      updateData.status = 'completed';
      updateData.completedAt = new Date().toISOString();
    }

    await this.enrollmentRepository.updateProgress(userId, courseId, updateData);

    return { success: true, progressPercentage, isCompleted: progressPercentage >= 100 };
  }

  async dropEnrollment(userId: string, courseId: string) {
    const enrollment = await this.enrollmentRepository.findByUserAndCourse(userId, courseId);

    if (!enrollment) {
      throw new NotFoundError('Enrollment not found');
    }

    if (enrollment.status !== 'active') {
      throw new ConflictError('Cannot drop inactive enrollment');
    }

    await this.enrollmentRepository.update(enrollment.id, {
      status: 'dropped',
    });

    return { success: true };
  }

  async getEnrollmentStats(courseId: string, userId: string, userRole: string) {
    // Verify course exists and user has permission
    const course = await this.courseRepository.findById(courseId);
    if (!course) {
      throw new NotFoundError('Course not found');
    }

    if (userRole !== 'super_admin' && course.teacherId !== userId) {
      throw new ForbiddenError('You can only view stats for your own courses');
    }

    return await this.enrollmentRepository.getEnrollmentStats(courseId);
  }
}
