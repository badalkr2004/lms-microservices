import {
  boolean,
  decimal,
  index,
  integer,
  pgTable,
  timestamp,
  unique,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { enrollmentStatus } from './enums';
import { users } from './users';
import { courses, courseLectures } from './courses';

export const courseEnrollments = pgTable(
  'course_enrollments',
  {
    id: uuid('id')
      .default(sql`gen_random_uuid()`)
      .primaryKey(),
    userId: uuid('user_id')
      .references(() => users.id, { onDelete: 'cascade' })
      .notNull(),
    courseId: uuid('course_id')
      .references(() => courses.id, { onDelete: 'cascade' })
      .notNull(),
    status: enrollmentStatus('status').default('active'),
    enrolledAt: timestamp('enrolled_at', { mode: 'string' }).defaultNow(),
    completedAt: timestamp('completed_at', { mode: 'string' }),
    progressPercentage: decimal('progress_percentage', { precision: 5, scale: 2 }).default('0.00'),
    lastAccessedAt: timestamp('last_accessed_at', { mode: 'string' }),
    certificateIssued: boolean('certificate_issued').default(false).notNull(),
    certificateUrl: varchar('certificate_url', { length: 500 }),
    totalWatchTime: integer('total_watch_time').default(0).notNull(),
  },
  t => ({
    uniqUserCourse: unique().on(t.userId, t.courseId),
    idxUser: index('idx_enrollments_user').on(t.userId),
    idxCourse: index('idx_enrollments_course').on(t.courseId),
    idxActive: index('idx_enrollments_active')
      .on(t.status)
      .where(sql`${t.status} = 'active'::enrollment_status`),
    idxUserStatus: index('idx_enrollments_user_status').on(t.userId, t.status),
  })
);

export const userLectureProgress = pgTable(
  'user_lecture_progress',
  {
    id: uuid('id')
      .default(sql`gen_random_uuid()`)
      .primaryKey(),
    userId: uuid('user_id')
      .references(() => users.id, { onDelete: 'cascade' })
      .notNull(),
    courseId: uuid('course_id')
      .references(() => courses.id, { onDelete: 'cascade' })
      .notNull(),
    lectureId: uuid('lecture_id')
      .references(() => courseLectures.id, { onDelete: 'cascade' })
      .notNull(),
    isCompleted: boolean('is_completed').default(false).notNull(),
    watchTime: integer('watch_time').default(0).notNull(),
    lastPosition: integer('last_position').default(0).notNull(),
    firstWatchedAt: timestamp('first_watched_at', { mode: 'string' }),
    completedAt: timestamp('completed_at', { mode: 'string' }),
    lastAccessedAt: timestamp('last_accessed_at', { mode: 'string' }).defaultNow(),
  },
  t => ({
    uniqUserLecture: unique().on(t.userId, t.lectureId),
    idxUser: index('idx_lecture_progress_user').on(t.userId),
    idxCourse: index('idx_lecture_progress_course').on(t.courseId),
    idxLecture: index('idx_lecture_progress_lecture').on(t.lectureId),
  })
);
