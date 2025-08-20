// src/services/review.service.ts
import { ReviewRepository } from '../repositories/review.repository';
import { CourseRepository } from '../repositories/course.repository';
import { EnrollmentRepository } from '../repositories/enrollment.repository';
import { NotFoundError, ConflictError, ForbiddenError } from '../utils/errors';
import { calculatePagination } from '../utils/pagination';

export class ReviewService {
  constructor(
    private reviewRepository: ReviewRepository,
    private courseRepository: CourseRepository,
    private enrollmentRepository: EnrollmentRepository
  ) {}

  // Course Reviews
  async createCourseReview(userId: string, courseId: string, rating: number, reviewText?: string) {
    // Check if course exists
    const course = await this.courseRepository.findById(courseId);
    if (!course) {
      throw new NotFoundError('Course not found');
    }

    // Check if user is enrolled
    const enrollment = await this.enrollmentRepository.findByUserAndCourse(userId, courseId);
    if (!enrollment) {
      throw new ForbiddenError('You must be enrolled in the course to leave a review');
    }

    // Check if user has already reviewed
    const existingReview = await this.reviewRepository.findUserCourseReview(userId, courseId);
    if (existingReview) {
      throw new ConflictError('You have already reviewed this course');
    }

    const reviewData = {
      userId,
      courseId,
      rating,
      reviewText,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const review = await this.reviewRepository.createCourseReview(reviewData);

    // Update course rating statistics
    await this.updateCourseRatingStats(courseId);

    return review;
  }

  async getCourseReviews(
    courseId: string,
    page: number = 1,
    limit: number = 10,
    sortBy: 'newest' | 'oldest' | 'rating_high' | 'rating_low' | 'helpful' = 'newest'
  ) {
    const offset = (page - 1) * limit;
    const { reviews, total } = await this.reviewRepository.findCourseReviews(
      courseId,
      limit,
      offset,
      sortBy
    );

    const pagination = calculatePagination(page, limit, total);

    return {
      reviews,
      pagination,
    };
  }

  async getCourseReviewById(id: string) {
    const review = await this.reviewRepository.findCourseReviewById(id);
    if (!review) {
      throw new NotFoundError('Review not found');
    }
    return review;
  }

  async updateCourseReview(id: string, userId: string, data: any) {
    const review = await this.reviewRepository.findCourseReviewById(id);
    if (!review) {
      throw new NotFoundError('Review not found');
    }

    if (review.userId !== userId) {
      throw new ForbiddenError('You can only update your own reviews');
    }

    const updatedReview = await this.reviewRepository.updateCourseReview(id, data);

    // Update course rating statistics
    await this.updateCourseRatingStats(review.courseId);

    return updatedReview;
  }

  async deleteCourseReview(id: string, userId: string, userRole: string) {
    const review = await this.reviewRepository.findCourseReviewById(id);
    if (!review) {
      throw new NotFoundError('Review not found');
    }

    if (userRole !== 'super_admin' && review.userId !== userId) {
      throw new ForbiddenError('You can only delete your own reviews');
    }

    await this.reviewRepository.deleteCourseReview(id);

    // Update course rating statistics
    await this.updateCourseRatingStats(review.courseId);

    return { success: true };
  }

  async getCourseRatingStats(courseId: string) {
    const stats = await this.reviewRepository.getCourseRatingStats(courseId);

    const totalReviews = (stats?.totalReviews as number) || 0;
    const averageRating = (stats?.averageRating as number) || 0;

    return {
      totalReviews,
      averageRating,
      ratingDistribution: {
        5: (stats?.rating5Count as number) || 0,
        4: (stats?.rating4Count as number) || 0,
        3: (stats?.rating3Count as number) || 0,
        2: (stats?.rating2Count as number) || 0,
        1: (stats?.rating1Count as number) || 0,
      },
    };
  }

  // Teacher Reviews
  async createTeacherReview(
    userId: string,
    teacherId: string,
    rating: number,
    reviewText?: string
  ) {
    // Check if user has taken courses from this teacher
    const enrollments = await this.enrollmentRepository.findUserEnrollments(userId);
    const hasEnrolledWithTeacher = enrollments.some(enrollment => {
      // This would need to be implemented to check if the course belongs to the teacher
      // For now, we'll allow any user to review any teacher
      return true;
    });

    if (!hasEnrolledWithTeacher) {
      throw new ForbiddenError('You must have taken a course from this teacher to leave a review');
    }

    // Check if user has already reviewed this teacher
    const existingReview = await this.reviewRepository.findUserTeacherReview(userId, teacherId);
    if (existingReview) {
      throw new ConflictError('You have already reviewed this teacher');
    }

    const reviewData = {
      userId,
      teacherId,
      rating,
      reviewText,
      createdAt: new Date().toISOString(),
    };

    return await this.reviewRepository.createTeacherReview(reviewData);
  }

  async getTeacherReviews(teacherId: string, page: number = 1, limit: number = 10) {
    const offset = (page - 1) * limit;
    const { reviews, total } = await this.reviewRepository.findTeacherReviews(
      teacherId,
      limit,
      offset
    );

    const pagination = calculatePagination(page, limit, total);

    return {
      reviews,
      pagination,
    };
  }

  async getTeacherRatingStats(teacherId: string) {
    const stats = await this.reviewRepository.getTeacherRatingStats(teacherId);

    const totalReviews = (stats?.totalReviews as number) || 0;
    const averageRating = (stats?.averageRating as number) || 0;

    return {
      totalReviews,
      averageRating,
      ratingDistribution: {
        5: (stats?.rating5Count as number) || 0,
        4: (stats?.rating4Count as number) || 0,
        3: (stats?.rating3Count as number) || 0,
        2: (stats?.rating2Count as number) || 0,
        1: (stats?.rating1Count as number) || 0,
      },
    };
  }

  private async updateCourseRatingStats(courseId: string) {
    const stats = await this.getCourseRatingStats(courseId);

    await this.courseRepository.update(courseId, {
      averageRating: stats.averageRating.toFixed(2),
      totalReviews: stats.totalReviews,
    });
  }
}
