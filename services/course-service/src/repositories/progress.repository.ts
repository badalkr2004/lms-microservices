// src/repositories/progress.repository.ts
import { and, eq, sql } from 'drizzle-orm';
import { db } from '@lms/database';
import { userLectureProgress, courseLectures } from '@lms/database';

export class ProgressRepository {
  async create(data: any) {
    const [progress] = await db.insert(userLectureProgress).values(data).returning();
    return progress;
  }

  async findByUserAndLecture(userId: string, lectureId: string) {
    const [progress] = await db
      .select()
      .from(userLectureProgress)
      .where(
        and(eq(userLectureProgress.userId, userId), eq(userLectureProgress.lectureId, lectureId))
      );
    return progress;
  }

  async findUserCourseProgress(userId: string, courseId: string) {
    return await db
      .select({
        id: userLectureProgress.id,
        lectureId: userLectureProgress.lectureId,
        isCompleted: userLectureProgress.isCompleted,
        watchTime: userLectureProgress.watchTime,
        lastPosition: userLectureProgress.lastPosition,
        completedAt: userLectureProgress.completedAt,
        lastAccessedAt: userLectureProgress.lastAccessedAt,
        lecture: {
          id: courseLectures.id,
          title: courseLectures.title,
          videoDuration: courseLectures.videoDuration,
          sortOrder: courseLectures.sortOrder,
        },
      })
      .from(userLectureProgress)
      .innerJoin(courseLectures, eq(userLectureProgress.lectureId, courseLectures.id))
      .where(
        and(eq(userLectureProgress.userId, userId), eq(userLectureProgress.courseId, courseId))
      );
  }

  async update(userId: string, lectureId: string, data: any) {
    const [progress] = await db
      .update(userLectureProgress)
      .set({
        ...data,
        lastAccessedAt: new Date().toISOString(),
      })
      .where(
        and(eq(userLectureProgress.userId, userId), eq(userLectureProgress.lectureId, lectureId))
      )
      .returning();
    return progress;
  }

  async upsert(data: any) {
    // Try to update first
    const existing = await this.findByUserAndLecture(data.userId, data.lectureId);

    if (existing) {
      return await this.update(data.userId, data.lectureId, data);
    } else {
      return await this.create({
        ...data,
        firstWatchedAt: new Date().toISOString(),
        lastAccessedAt: new Date().toISOString(),
      });
    }
  }

  async getCourseProgressStats(userId: string, courseId: string) {
    const [stats] = await db
      .select({
        totalLectures: sql`COUNT(DISTINCT ${courseLectures.id})`,
        completedLectures: sql`COUNT(DISTINCT CASE WHEN ${userLectureProgress.isCompleted} = true THEN ${courseLectures.id} END)`,
        totalWatchTime: sql`COALESCE(SUM(${userLectureProgress.watchTime}), 0)`,
        totalCourseDuration: sql`COALESCE(SUM(${courseLectures.videoDuration}), 0)`,
      })
      .from(courseLectures)
      .leftJoin(
        userLectureProgress,
        and(
          eq(courseLectures.id, userLectureProgress.lectureId),
          eq(userLectureProgress.userId, userId)
        )
      )
      .where(and(eq(courseLectures.courseId, courseId), eq(courseLectures.isActive, true)));

    const totalLectures = (stats?.totalLectures as number) || 0;
    const completedLectures = (stats?.completedLectures as number) || 0;
    const totalWatchTime = (stats?.totalWatchTime as number) || 0;
    const totalCourseDuration = (stats?.totalCourseDuration as number) || 0;

    const progressPercentage = totalLectures > 0 ? (completedLectures / totalLectures) * 100 : 0;

    return {
      totalLectures,
      completedLectures,
      progressPercentage: Math.round(progressPercentage * 100) / 100,
      totalWatchTime,
      totalCourseDuration,
    };
  }

  async delete(userId: string, lectureId: string) {
    await db
      .delete(userLectureProgress)
      .where(
        and(eq(userLectureProgress.userId, userId), eq(userLectureProgress.lectureId, lectureId))
      );
  }
}
