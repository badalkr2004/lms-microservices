import {
  boolean,
  check,
  index,
  integer,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { users } from './users';
import { courses } from './courses';

export const courseReviews = pgTable(
  'course_reviews',
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
    rating: integer('rating').notNull(),
    reviewText: text('review_text'),
    isFeatured: boolean('is_featured').default(false).notNull(),
    isVerified: boolean('is_verified').default(false).notNull(),
    helpfulCount: integer('helpful_count').default(0).notNull(),
    createdAt: timestamp('created_at', { mode: 'string' }).defaultNow(),
    updatedAt: timestamp('updated_at', { mode: 'string' }).defaultNow(),
  },
  t => ({
    ratingCheck: check('course_reviews_rating_check', sql`${t.rating} >= 1 AND ${t.rating} <= 5`),
    uniqUserCourse: unique().on(t.userId, t.courseId),
    idxCourse: index('idx_course_reviews_course').on(t.courseId),
    idxUser: index('idx_course_reviews_user').on(t.userId),
    idxRating: index('idx_course_reviews_rating').on(t.rating),
  })
);

export const teacherReviews = pgTable(
  'teacher_reviews',
  {
    id: uuid('id')
      .default(sql`gen_random_uuid()`)
      .primaryKey(),
    userId: uuid('user_id')
      .references(() => users.id, { onDelete: 'cascade' })
      .notNull(),
    teacherId: uuid('teacher_id')
      .references(() => users.id, { onDelete: 'cascade' })
      .notNull(),
    rating: integer('rating').notNull(),
    reviewText: text('review_text'),
    createdAt: timestamp('created_at', { mode: 'string' }).defaultNow(),
  },
  t => ({
    ratingCheck: check('teacher_reviews_rating_check', sql`${t.rating} >= 1 AND ${t.rating} <= 5`),
    uniqUserTeacher: unique().on(t.userId, t.teacherId),
    idxTeacher: index('idx_teacher_reviews_teacher').on(t.teacherId),
    idxUser: index('idx_teacher_reviews_user').on(t.userId),
  })
);
