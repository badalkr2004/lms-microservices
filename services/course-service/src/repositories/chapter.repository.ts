// src/repositories/chapter.repository.ts
import { and, eq, asc, sql } from 'drizzle-orm';
import { db } from '@lms/database';
import { courseChapters } from '@lms/database';

export class ChapterRepository {
  async create(data: any) {
    const [chapter] = await db.insert(courseChapters).values(data).returning();
    return chapter;
  }

  async findById(id: string) {
    const [chapter] = await db.select().from(courseChapters).where(eq(courseChapters.id, id));
    return chapter;
  }

  // TODO: Add lectures to the response
  async findByCourseId(courseId: string) {
    return await db
      .select({
        id: courseChapters.id,
        title: courseChapters.title,
        description: courseChapters.description,
        sortOrder: courseChapters.sortOrder,
        isActive: courseChapters.isActive,
        createdAt: courseChapters.createdAt,
        // lectures: [],
      })
      .from(courseChapters)
      .where(and(eq(courseChapters.courseId, courseId), eq(courseChapters.isActive, true)))
      .orderBy(asc(courseChapters.sortOrder));
  }

  async update(id: string, data: any) {
    const [chapter] = await db
      .update(courseChapters)
      .set({ ...data, updatedAt: new Date().toISOString() })
      .where(eq(courseChapters.id, id))
      .returning();
    return chapter;
  }

  async delete(id: string) {
    await db.delete(courseChapters).where(eq(courseChapters.id, id));
  }

  async reorder(courseId: string, chapterOrders: Array<{ id: string; sortOrder: number }>) {
    await db.transaction(async tx => {
      // Step 1: move to temporary values
      for (const { id, sortOrder } of chapterOrders) {
        await tx
          .update(courseChapters)
          .set({ sortOrder: sortOrder + 1000 }) // offset to avoid conflicts
          .where(and(eq(courseChapters.id, id), eq(courseChapters.courseId, courseId)));
      }

      // Step 2: update to final values
      for (const { id, sortOrder } of chapterOrders) {
        await tx
          .update(courseChapters)
          .set({ sortOrder })
          .where(and(eq(courseChapters.id, id), eq(courseChapters.courseId, courseId)));
      }
    });
  }

  async getNextSortOrder(courseId: string): Promise<number> {
    const [result] = await db
      .select({
        maxSort: sql`COALESCE(MAX(${courseChapters.sortOrder}), 0)`,
      })
      .from(courseChapters)
      .where(eq(courseChapters.courseId, courseId));

    return (result?.maxSort as number) + 1;
  }
}
