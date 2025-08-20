// src/repositories/enrollment.repository.ts
import { and, eq, sql, desc } from 'drizzle-orm';
import { db } from '@lms/database';
import { courseEnrollments, courses, users, userProfiles } from '@lms/database';
import { EnrollmentFilters } from '../types';

export class EnrollmentRepository {
  async create(data: any) {
    const [enrollment] = await db.insert(courseEnrollments).values(data).returning();
    return enrollment;
  }

  async findById(id: string) {
    const [enrollment] = await db
      .select({
        id: courseEnrollments.id,
        userId: courseEnrollments.userId,
        courseId: courseEnrollments.courseId,
        status: courseEnrollments.status,
        enrolledAt: courseEnrollments.enrolledAt,
        completedAt: courseEnrollments.completedAt,
        progressPercentage: courseEnrollments.progressPercentage,
        lastAccessedAt: courseEnrollments.lastAccessedAt,
        certificateIssued: courseEnrollments.certificateIssued,
        certificateUrl: courseEnrollments.certificateUrl,
        totalWatchTime: courseEnrollments.totalWatchTime,
        course: {
          id: courses.id,
          title: courses.title,
          thumbnailUrl: courses.thumbnailUrl,
          status: courses.status,
        },
        user: {
          id: users.id,
          email: users.email,
          firstName: userProfiles.firstName,
          lastName: userProfiles.lastName,
        },
      })
      .from(courseEnrollments)
      .leftJoin(courses, eq(courseEnrollments.courseId, courses.id))
      .leftJoin(users, eq(courseEnrollments.userId, users.id))
      .leftJoin(userProfiles, eq(users.id, userProfiles.userId))
      .where(eq(courseEnrollments.id, id));

    return enrollment;
  }

  async findByUserAndCourse(userId: string, courseId: string) {
    const [enrollment] = await db
      .select()
      .from(courseEnrollments)
      .where(and(eq(courseEnrollments.userId, userId), eq(courseEnrollments.courseId, courseId)));

    return enrollment;
  }

  async findUserEnrollments(userId: string, filters: Partial<EnrollmentFilters> = {}) {
    const conditions = [eq(courseEnrollments.userId, userId)];

    if (filters.status) {
      conditions.push(eq(courseEnrollments.status, filters.status as any));
    }

    return await db
      .select({
        id: courseEnrollments.id,
        courseId: courseEnrollments.courseId,
        status: courseEnrollments.status,
        enrolledAt: courseEnrollments.enrolledAt,
        completedAt: courseEnrollments.completedAt,
        progressPercentage: courseEnrollments.progressPercentage,
        lastAccessedAt: courseEnrollments.lastAccessedAt,
        course: {
          id: courses.id,
          title: courses.title,
          slug: courses.slug,
          shortDescription: courses.shortDescription,
          thumbnailUrl: courses.thumbnailUrl,
          difficulty: courses.difficulty,
          totalLectures: courses.totalLectures,
          durationHours: courses.durationHours,
          durationMinutes: courses.durationMinutes,
          averageRating: courses.averageRating,
        },
      })
      .from(courseEnrollments)
      .innerJoin(courses, eq(courseEnrollments.courseId, courses.id))
      .where(and(...conditions))
      .orderBy(desc(courseEnrollments.enrolledAt));
  }

  async findCourseEnrollments(courseId: string) {
    return await db
      .select({
        id: courseEnrollments.id,
        userId: courseEnrollments.userId,
        status: courseEnrollments.status,
        enrolledAt: courseEnrollments.enrolledAt,
        completedAt: courseEnrollments.completedAt,
        progressPercentage: courseEnrollments.progressPercentage,
        user: {
          id: users.id,
          email: users.email,
          firstName: userProfiles.firstName,
          lastName: userProfiles.lastName,
          avatarUrl: userProfiles.avatarUrl,
        },
      })
      .from(courseEnrollments)
      .innerJoin(users, eq(courseEnrollments.userId, users.id))
      .leftJoin(userProfiles, eq(users.id, userProfiles.userId))
      .where(eq(courseEnrollments.courseId, courseId))
      .orderBy(desc(courseEnrollments.enrolledAt));
  }

  async update(id: string, data: any) {
    const [enrollment] = await db
      .update(courseEnrollments)
      .set(data)
      .where(eq(courseEnrollments.id, id))
      .returning();

    return enrollment;
  }

  async updateProgress(userId: string, courseId: string, progressData: any) {
    await db
      .update(courseEnrollments)
      .set({
        ...progressData,
        lastAccessedAt: new Date().toISOString(),
      })
      .where(and(eq(courseEnrollments.userId, userId), eq(courseEnrollments.courseId, courseId)));
  }

  async delete(id: string) {
    await db.delete(courseEnrollments).where(eq(courseEnrollments.id, id));
  }

  async getEnrollmentStats(courseId: string) {
    const [stats] = await db
      .select({
        totalEnrollments: sql`COUNT(*)`,
        activeEnrollments: sql`COUNT(*) FILTER (WHERE ${courseEnrollments.status} = 'active')`,
        completedEnrollments: sql`COUNT(*) FILTER (WHERE ${courseEnrollments.status} = 'completed')`,
        averageProgress: sql`AVG(${courseEnrollments.progressPercentage})`,
      })
      .from(courseEnrollments)
      .where(eq(courseEnrollments.courseId, courseId));

    return stats;
  }
}
