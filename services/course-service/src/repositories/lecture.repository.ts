// src/repositories/lecture.repository.ts
import { and, eq, asc, sql } from 'drizzle-orm';
import { db } from '@lms/database';
import { courseLectures } from '@lms/database';

export class LectureRepository {
  async create(data: any) {
    const [lecture] = await db.insert(courseLectures).values(data).returning();
    return lecture;
  }

  async findById(id: string) {
    const [lecture] = await db.select().from(courseLectures).where(eq(courseLectures.id, id));
    return lecture;
  }

  async findByCourseId(courseId: string) {
    return await db
      .select()
      .from(courseLectures)
      .where(and(eq(courseLectures.courseId, courseId), eq(courseLectures.isActive, true)))
      .orderBy(asc(courseLectures.sortOrder));
  }

  async findByChapterId(chapterId: string) {
    return await db
      .select()
      .from(courseLectures)
      .where(and(eq(courseLectures.chapterId, chapterId), eq(courseLectures.isActive, true)))
      .orderBy(asc(courseLectures.sortOrder));
  }

  async update(id: string, data: any) {
    const [lecture] = await db
      .update(courseLectures)
      .set({ ...data, updatedAt: new Date().toISOString() })
      .where(eq(courseLectures.id, id))
      .returning();
    return lecture;
  }

  async delete(id: string) {
    await db.delete(courseLectures).where(eq(courseLectures.id, id));
  }

  async getNextSortOrder(courseId: string, chapterId?: string | null): Promise<number> {
    const conditions = [eq(courseLectures.courseId, courseId)];
    if (chapterId) {
      conditions.push(eq(courseLectures.chapterId, chapterId));
    }

    const [result] = await db
      .select({
        maxSort: sql`COALESCE(MAX(${courseLectures.sortOrder}), 0)`,
      })
      .from(courseLectures)
      .where(and(...conditions));

    return (result?.maxSort as number) + 1;
  }

  async reorder(
    courseId: string,
    lectureOrders: Array<{ id: string; sortOrder: number }>,
    chapterId?: string
  ) {
    await db.transaction(async tx => {
      for (const { id, sortOrder } of lectureOrders) {
        const conditions = [eq(courseLectures.id, id), eq(courseLectures.courseId, courseId)];
        if (chapterId) {
          conditions.push(eq(courseLectures.chapterId, chapterId));
        }

        await tx
          .update(courseLectures)
          .set({ sortOrder })
          .where(and(...conditions));
      }
    });
  }

  async countByCourseId(courseId: string): Promise<number> {
    const [result] = await db
      .select({ count: sql`COUNT(*)` })
      .from(courseLectures)
      .where(and(eq(courseLectures.courseId, courseId), eq(courseLectures.isActive, true)));

    return (result?.count as number) || 0;
  }

  async getTotalDuration(courseId: string): Promise<number> {
    const [result] = await db
      .select({
        totalDuration: sql`COALESCE(SUM(${courseLectures.videoDuration}), 0)`,
      })
      .from(courseLectures)
      .where(and(eq(courseLectures.courseId, courseId), eq(courseLectures.isActive, true)));

    return (result?.totalDuration as number) || 0;
  }
}
