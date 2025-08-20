// src/repositories/course.repository.ts
import { and, eq, ilike, sql, desc, asc, count, or } from 'drizzle-orm';
import { db } from '@lms/database';
import { courses, categories, users, userProfiles } from '@lms/database';

import { CourseFilters, PaginationParams } from '../types';

export class CourseRepository {
  async create(data: any) {
    const [course] = await db.insert(courses).values(data).returning();
    return course;
  }

  async findById(id: string) {
    const [course] = await db
      .select({
        id: courses.id,
        teacherId: courses.teacherId,
        categoryId: courses.categoryId,
        title: courses.title,
        slug: courses.slug,
        description: courses.description,
        shortDescription: courses.shortDescription,
        thumbnailUrl: courses.thumbnailUrl,
        trailerVideoUrl: courses.trailerVideoUrl,
        difficulty: courses.difficulty,
        status: courses.status,
        pricingType: courses.pricingType,
        price: courses.price,
        discountPrice: courses.discountPrice,
        durationHours: courses.durationHours,
        durationMinutes: courses.durationMinutes,
        language: courses.language,
        prerequisites: courses.prerequisites,
        whatYouLearn: courses.whatYouLearn,
        targetAudience: courses.targetAudience,
        requirements: courses.requirements,
        tags: courses.tags,
        isFeatured: courses.isFeatured,
        isBestseller: courses.isBestseller,
        maxStudents: courses.maxStudents,
        certificateAvailable: courses.certificateAvailable,
        totalEnrollments: courses.totalEnrollments,
        averageRating: courses.averageRating,
        totalReviews: courses.totalReviews,
        totalLectures: courses.totalLectures,
        totalQuizzes: courses.totalQuizzes,
        createdAt: courses.createdAt,
        updatedAt: courses.updatedAt,
        publishedAt: courses.publishedAt,
        teacher: {
          id: users.id,
          firstName: userProfiles.firstName,
          lastName: userProfiles.lastName,
          email: users.email,
        },
        category: {
          id: categories.id,
          name: categories.name,
          slug: categories.slug,
        },
      })
      .from(courses)
      .leftJoin(users, eq(courses.teacherId, users.id))
      .leftJoin(userProfiles, eq(users.id, userProfiles.userId))
      .leftJoin(categories, eq(courses.categoryId, categories.id))
      .where(eq(courses.id, id));

    return course;
  }

  async findAll(filters: CourseFilters, pagination: PaginationParams & { offset: number }) {
    const conditions = [];

    if (filters.categoryId) {
      conditions.push(eq(courses.categoryId, filters.categoryId));
    }
    if (filters.teacherId) {
      conditions.push(eq(courses.teacherId, filters.teacherId));
    }
    if (filters.status) {
      conditions.push(eq(courses.status, filters.status as any));
    }
    if (filters.difficulty) {
      conditions.push(eq(courses.difficulty, filters.difficulty as any));
    }
    if (filters.pricingType) {
      conditions.push(eq(courses.pricingType, filters.pricingType as any));
    }
    if (filters.isFeatured !== undefined) {
      conditions.push(eq(courses.isFeatured, filters.isFeatured));
    }
    if (filters.search) {
      conditions.push(
        or(
          ilike(courses.title, `%${filters.search}%`),
          ilike(courses.description, `%${filters.search}%`)
        )
      );
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    // Default sort by creation date if no sort field is provided
    const sortField = pagination.sortBy || 'createdAt';

    // Map sort field to the actual column
    const sortColumn = {
      title: courses.title,
      createdAt: courses.createdAt,
      updatedAt: courses.updatedAt,
      price: courses.price,
      difficulty: courses.difficulty,
      status: courses.status,
    }[sortField];

    const orderBy = pagination.sortOrder === 'asc' ? asc(sortColumn) : desc(sortColumn);

    const [coursesData, [{ total }]] = await Promise.all([
      db
        .select({
          id: courses.id,
          teacherId: courses.teacherId,
          title: courses.title,
          slug: courses.slug,
          shortDescription: courses.shortDescription,
          thumbnailUrl: courses.thumbnailUrl,
          difficulty: courses.difficulty,
          status: courses.status,
          pricingType: courses.pricingType,
          price: courses.price,
          discountPrice: courses.discountPrice,
          language: courses.language,
          isFeatured: courses.isFeatured,
          isBestseller: courses.isBestseller,
          totalEnrollments: courses.totalEnrollments,
          averageRating: courses.averageRating,
          totalReviews: courses.totalReviews,
          totalLectures: courses.totalLectures,
          createdAt: courses.createdAt,
          publishedAt: courses.publishedAt,
          teacher: {
            id: users.id,
            firstName: userProfiles.firstName,
            lastName: userProfiles.lastName,
          },
          category: {
            id: categories.id,
            name: categories.name,
            slug: categories.slug,
          },
        })
        .from(courses)
        .leftJoin(users, eq(courses.teacherId, users.id))
        .leftJoin(userProfiles, eq(users.id, userProfiles.userId))
        .leftJoin(categories, eq(courses.categoryId, categories.id))
        .where(whereClause)
        .orderBy(orderBy)
        .limit(pagination.limit || 10)
        .offset(pagination.offset),

      db.select({ total: count() }).from(courses).where(whereClause),
    ]);

    return { courses: coursesData, total: total || 0 };
  }

  async update(id: string, data: any) {
    const [course] = await db
      .update(courses)
      .set({ ...data, updatedAt: new Date().toISOString() })
      .where(eq(courses.id, id))
      .returning();
    return course;
  }

  async delete(id: string) {
    await db.delete(courses).where(eq(courses.id, id));
  }

  async findBySlug(slug: string) {
    const [course] = await db.select().from(courses).where(eq(courses.slug, slug));
    return course;
  }

  async incrementEnrollment(courseId: string) {
    await db
      .update(courses)
      .set({
        totalEnrollments: sql`${courses.totalEnrollments} + 1`,
      })
      .where(eq(courses.id, courseId));
  }

  async updateStatistics(courseId: string, stats: any) {
    await db.update(courses).set(stats).where(eq(courses.id, courseId));
  }
}
