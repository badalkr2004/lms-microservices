// src/controllers/review.controller.ts
import { Response, NextFunction } from 'express';
import { ReviewService } from '../services/review.service';
import { successResponse, paginatedResponse } from '../utils/response';
import { AuthenticatedRequest } from '@lms/shared-auth';
import { getPaginationParams } from '../utils/pagination';
import { ForbiddenError } from '@/utils/errors';

export class ReviewController {
  constructor(private reviewService: ReviewService) {}

  // Course Reviews
  createCourseReview = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        throw new ForbiddenError('Authentication required');
      }
      const { courseId } = req.params;
      const { rating, reviewText } = req.body;

      const review = await this.reviewService.createCourseReview(
        req.user.id,
        courseId,
        rating,
        reviewText
      );

      successResponse(res, 'Review created successfully', review, 201);
    } catch (error) {
      next(error);
    }
  };

  getCourseReviews = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { courseId } = req.params;
      const { page, limit } = getPaginationParams(req.query);
      const sortBy = (req.query.sortBy as any) || 'newest';

      const { reviews, pagination } = await this.reviewService.getCourseReviews(
        courseId,
        page,
        limit,
        sortBy
      );

      paginatedResponse(res, 'Course reviews retrieved successfully', reviews, pagination);
    } catch (error) {
      next(error);
    }
  };

  getCourseReviewById = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const review = await this.reviewService.getCourseReviewById(id);
      successResponse(res, 'Review retrieved successfully', review);
    } catch (error) {
      next(error);
    }
  };

  updateCourseReview = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      throw new ForbiddenError('Authentication required');
    }
    try {
      const { id } = req.params;
      const review = await this.reviewService.updateCourseReview(id, req.user.id, req.body);
      successResponse(res, 'Review updated successfully', review);
    } catch (error) {
      next(error);
    }
  };

  deleteCourseReview = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        throw new ForbiddenError('Authentication required');
      }
      const { id } = req.params;
      const result = await this.reviewService.deleteCourseReview(id, req.user.id, req.user.role);
      successResponse(res, 'Review deleted successfully', result);
    } catch (error) {
      next(error);
    }
  };

  getCourseRatingStats = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { courseId } = req.params;
      const stats = await this.reviewService.getCourseRatingStats(courseId);
      successResponse(res, 'Course rating stats retrieved successfully', stats);
    } catch (error) {
      next(error);
    }
  };

  // Teacher Reviews
  createTeacherReview = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        throw new ForbiddenError('Authentication required');
      }
      const { teacherId } = req.params;
      const { rating, reviewText } = req.body;

      const review = await this.reviewService.createTeacherReview(
        req.user.id,
        teacherId,
        rating,
        reviewText
      );

      successResponse(res, 'Teacher review created successfully', review, 201);
    } catch (error) {
      next(error);
    }
  };

  getTeacherReviews = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      throw new ForbiddenError('Authentication required');
    }
    try {
      const { teacherId } = req.params;
      const { page, limit } = getPaginationParams(req.query);

      const { reviews, pagination } = await this.reviewService.getTeacherReviews(
        teacherId,
        page,
        limit
      );

      paginatedResponse(res, 'Teacher reviews retrieved successfully', reviews, pagination);
    } catch (error) {
      next(error);
    }
  };

  getTeacherRatingStats = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { teacherId } = req.params;
      const stats = await this.reviewService.getTeacherRatingStats(teacherId);
      successResponse(res, 'Teacher rating stats retrieved successfully', stats);
    } catch (error) {
      next(error);
    }
  };
}
