// src/repositories/review.repository.ts
import { and, eq, sql, desc, asc } from 'drizzle-orm';
import { db } from '@lms/database';
import { courseReviews, teacherReviews, users, userProfiles } from '@lms/database';

export class ReviewRepository {
  // Course Reviews
  async createCourseReview(data: any) {
    const [review] = await db.insert(courseReviews).values(data).returning();
    return review;
  }

  async findCourseReviewById(id: string) {
    const [review] = await db
      .select({
        id: courseReviews.id,
        userId: courseReviews.userId,
        courseId: courseReviews.courseId,
        rating: courseReviews.rating,
        reviewText: courseReviews.reviewText,
        isFeatured: courseReviews.isFeatured,
        isVerified: courseReviews.isVerified,
        helpfulCount: courseReviews.helpfulCount,
        createdAt: courseReviews.createdAt,
        updatedAt: courseReviews.updatedAt,
        user: {
          id: users.id,
          firstName: userProfiles.firstName,
          lastName: userProfiles.lastName,
          avatarUrl: userProfiles.avatarUrl,
        },
      })
      .from(courseReviews)
      .innerJoin(users, eq(courseReviews.userId, users.id))
      .leftJoin(userProfiles, eq(users.id, userProfiles.userId))
      .where(eq(courseReviews.id, id));

    return review;
  }

  async findUserCourseReview(userId: string, courseId: string) {
    const [review] = await db
      .select()
      .from(courseReviews)
      .where(and(eq(courseReviews.userId, userId), eq(courseReviews.courseId, courseId)));

    return review;
  }

  async findCourseReviews(
    courseId: string,
    limit: number = 10,
    offset: number = 0,
    sortBy: 'newest' | 'oldest' | 'rating_high' | 'rating_low' | 'helpful' = 'newest'
  ) {
    let orderBy;
    switch (sortBy) {
      case 'oldest':
        orderBy = asc(courseReviews.createdAt);
        break;
      case 'rating_high':
        orderBy = desc(courseReviews.rating);
        break;
      case 'rating_low':
        orderBy = asc(courseReviews.rating);
        break;
      case 'helpful':
        orderBy = desc(courseReviews.helpfulCount);
        break;
      default:
        orderBy = desc(courseReviews.createdAt);
    }

    const [reviewsData, [{ total }]] = await Promise.all([
      db
        .select({
          id: courseReviews.id,
          userId: courseReviews.userId,
          rating: courseReviews.rating,
          reviewText: courseReviews.reviewText,
          isFeatured: courseReviews.isFeatured,
          isVerified: courseReviews.isVerified,
          helpfulCount: courseReviews.helpfulCount,
          createdAt: courseReviews.createdAt,
          user: {
            id: users.id,
            firstName: userProfiles.firstName,
            lastName: userProfiles.lastName,
            avatarUrl: userProfiles.avatarUrl,
          },
        })
        .from(courseReviews)
        .innerJoin(users, eq(courseReviews.userId, users.id))
        .leftJoin(userProfiles, eq(users.id, userProfiles.userId))
        .where(eq(courseReviews.courseId, courseId))
        .orderBy(orderBy)
        .limit(limit)
        .offset(offset),

      db
        .select({ total: sql`COUNT(*)` })
        .from(courseReviews)
        .where(eq(courseReviews.courseId, courseId)),
    ]);

    return {
      reviews: reviewsData,
      total: (total as number) || 0,
    };
  }

  async updateCourseReview(id: string, data: any) {
    const [review] = await db
      .update(courseReviews)
      .set({ ...data, updatedAt: new Date().toISOString() })
      .where(eq(courseReviews.id, id))
      .returning();

    return review;
  }

  async deleteCourseReview(id: string) {
    await db.delete(courseReviews).where(eq(courseReviews.id, id));
  }

  async getCourseRatingStats(courseId: string) {
    const [stats] = await db
      .select({
        totalReviews: sql`COUNT(*)`,
        averageRating: sql`ROUND(AVG(${courseReviews.rating}), 2)`,
        rating5Count: sql`COUNT(*) FILTER (WHERE ${courseReviews.rating} = 5)`,
        rating4Count: sql`COUNT(*) FILTER (WHERE ${courseReviews.rating} = 4)`,
        rating3Count: sql`COUNT(*) FILTER (WHERE ${courseReviews.rating} = 3)`,
        rating2Count: sql`COUNT(*) FILTER (WHERE ${courseReviews.rating} = 2)`,
        rating1Count: sql`COUNT(*) FILTER (WHERE ${courseReviews.rating} = 1)`,
      })
      .from(courseReviews)
      .where(eq(courseReviews.courseId, courseId));

    return stats;
  }

  // Teacher Reviews
  async createTeacherReview(data: any) {
    const [review] = await db.insert(teacherReviews).values(data).returning();
    return review;
  }

  async findTeacherReviewById(id: string) {
    const [review] = await db
      .select({
        id: teacherReviews.id,
        userId: teacherReviews.userId,
        teacherId: teacherReviews.teacherId,
        rating: teacherReviews.rating,
        reviewText: teacherReviews.reviewText,
        createdAt: teacherReviews.createdAt,
        user: {
          id: users.id,
          firstName: userProfiles.firstName,
          lastName: userProfiles.lastName,
          avatarUrl: userProfiles.avatarUrl,
        },
      })
      .from(teacherReviews)
      .innerJoin(users, eq(teacherReviews.userId, users.id))
      .leftJoin(userProfiles, eq(users.id, userProfiles.userId))
      .where(eq(teacherReviews.id, id));

    return review;
  }

  async findUserTeacherReview(userId: string, teacherId: string) {
    const [review] = await db
      .select()
      .from(teacherReviews)
      .where(and(eq(teacherReviews.userId, userId), eq(teacherReviews.teacherId, teacherId)));

    return review;
  }

  async findTeacherReviews(teacherId: string, limit: number = 10, offset: number = 0) {
    const [reviewsData, [{ total }]] = await Promise.all([
      db
        .select({
          id: teacherReviews.id,
          userId: teacherReviews.userId,
          rating: teacherReviews.rating,
          reviewText: teacherReviews.reviewText,
          createdAt: teacherReviews.createdAt,
          user: {
            id: users.id,
            firstName: userProfiles.firstName,
            lastName: userProfiles.lastName,
            avatarUrl: userProfiles.avatarUrl,
          },
        })
        .from(teacherReviews)
        .innerJoin(users, eq(teacherReviews.userId, users.id))
        .leftJoin(userProfiles, eq(users.id, userProfiles.userId))
        .where(eq(teacherReviews.teacherId, teacherId))
        .orderBy(desc(teacherReviews.createdAt))
        .limit(limit)
        .offset(offset),

      db
        .select({ total: sql`COUNT(*)` })
        .from(teacherReviews)
        .where(eq(teacherReviews.teacherId, teacherId)),
    ]);

    return {
      reviews: reviewsData,
      total: (total as number) || 0,
    };
  }

  async updateTeacherReview(id: string, data: any) {
    const [review] = await db
      .update(teacherReviews)
      .set(data)
      .where(eq(teacherReviews.id, id))
      .returning();

    return review;
  }

  async deleteTeacherReview(id: string) {
    await db.delete(teacherReviews).where(eq(teacherReviews.id, id));
  }

  async getTeacherRatingStats(teacherId: string) {
    const [stats] = await db
      .select({
        totalReviews: sql`COUNT(*)`,
        averageRating: sql`ROUND(AVG(${teacherReviews.rating}), 2)`,
        rating5Count: sql`COUNT(*) FILTER (WHERE ${teacherReviews.rating} = 5)`,
        rating4Count: sql`COUNT(*) FILTER (WHERE ${teacherReviews.rating} = 4)`,
        rating3Count: sql`COUNT(*) FILTER (WHERE ${teacherReviews.rating} = 3)`,
        rating2Count: sql`COUNT(*) FILTER (WHERE ${teacherReviews.rating} = 2)`,
        rating1Count: sql`COUNT(*) FILTER (WHERE ${teacherReviews.rating} = 1)`,
      })
      .from(teacherReviews)
      .where(eq(teacherReviews.teacherId, teacherId));

    return stats;
  }
}
