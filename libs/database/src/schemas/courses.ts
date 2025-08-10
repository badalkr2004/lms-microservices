import {
  boolean,
  check,
  decimal,
  index,
  integer,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { courseDifficulty, courseStatus, pricingType } from './enums';
import { users } from './users';
import { categories } from './categories';

export const courses = pgTable(
  'courses',
  {
    id: uuid('id')
      .default(sql`gen_random_uuid()`)
      .primaryKey(),
    teacherId: uuid('teacher_id')
      .references(() => users.id, { onDelete: 'cascade' })
      .notNull(),
    categoryId: uuid('category_id').references(() => categories.id, {
      onDelete: 'set null',
    }),
    title: varchar('title', { length: 255 }).notNull(),
    slug: varchar('slug', { length: 255 }).notNull().unique(),
    description: text('description'),
    shortDescription: text('short_description'),
    thumbnailUrl: varchar('thumbnail_url', { length: 500 }),
    trailerVideoUrl: varchar('trailer_video_url', { length: 500 }),
    difficulty: courseDifficulty('difficulty').default('beginner'),
    status: courseStatus('status').default('draft'),
    pricingType: pricingType('pricing_type').default('free'),
    price: decimal('price', { precision: 10, scale: 2 }).default('0.00').notNull(),
    discountPrice: decimal('discount_price', { precision: 10, scale: 2 }),
    durationHours: integer('duration_hours').default(0).notNull(),
    durationMinutes: integer('duration_minutes').default(0).notNull(),
    language: varchar('language', { length: 50 }).default('en'),
    prerequisites: text('prerequisites'),
    whatYouLearn: text('what_you_learn').array(),
    targetAudience: text('target_audience').array(),
    requirements: text('requirements').array(),
    tags: text('tags').array(),
    isFeatured: boolean('is_featured').default(false).notNull(),
    isBestseller: boolean('is_bestseller').default(false).notNull(),
    maxStudents: integer('max_students'),
    certificateAvailable: boolean('certificate_available').default(false).notNull(),
    certificateTemplateUrl: varchar('certificate_template_url', { length: 500 }),
    totalEnrollments: integer('total_enrollments').default(0).notNull(),
    averageRating: decimal('average_rating', { precision: 3, scale: 2 }).default('0.00').notNull(),
    totalReviews: integer('total_reviews').default(0).notNull(),
    totalLectures: integer('total_lectures').default(0).notNull(),
    totalQuizzes: integer('total_quizzes').default(0).notNull(),
    createdAt: timestamp('created_at', { mode: 'string' }).defaultNow(),
    updatedAt: timestamp('updated_at', { mode: 'string' }).defaultNow(),
    publishedAt: timestamp('published_at', { mode: 'string' }),
  },
  t => ({
    positivePrice: check('positive_price', sql`${t.price} >= 0`),
    idxTeacher: index('idx_courses_teacher').on(t.teacherId),
    idxCategory: index('idx_courses_category').on(t.categoryId),
    idxStatus: index('idx_courses_status').on(t.status),
    idxFeatured: index('idx_courses_featured').on(t.isFeatured),
    idxTeacherStatus: index('idx_courses_teacher_status').on(t.teacherId, t.status),
    idxCategoryFeatured: index('idx_courses_category_featured').on(t.categoryId, t.isFeatured),
    idxPublished: index('idx_courses_published')
      .on(t.status)
      .where(sql`${t.status} = 'published'::course_status`),
  })
);

export const courseChapters = pgTable(
  'course_chapters',
  {
    id: uuid('id')
      .default(sql`gen_random_uuid()`)
      .primaryKey(),
    courseId: uuid('course_id')
      .references(() => courses.id, { onDelete: 'cascade' })
      .notNull(),
    title: varchar('title', { length: 255 }).notNull(),
    description: text('description'),
    sortOrder: integer('sort_order').notNull(),
    isActive: boolean('is_active').default(true).notNull(),
    createdAt: timestamp('created_at', { mode: 'string' }).defaultNow(),
    updatedAt: timestamp('updated_at', { mode: 'string' }).defaultNow(),
  },
  t => ({
    uniqCourseSort: unique().on(t.courseId, t.sortOrder),
    idxCourse: index('idx_course_chapters_course').on(t.courseId),
  })
);

export const courseLectures = pgTable(
  'course_lectures',
  {
    id: uuid('id')
      .default(sql`gen_random_uuid()`)
      .primaryKey(),
    courseId: uuid('course_id')
      .references(() => courses.id, { onDelete: 'cascade' })
      .notNull(),
    chapterId: uuid('chapter_id').references(() => courseChapters.id, {
      onDelete: 'set null',
    }),
    title: varchar('title', { length: 255 }).notNull(),
    description: text('description'),
    contentType: varchar('content_type', { length: 50 }).notNull(),
    videoUrl: varchar('video_url', { length: 500 }),
    videoDuration: integer('video_duration'),
    videoMuxAssetId: varchar('video_mux_asset_id', { length: 255 }),
    pdfUrl: varchar('pdf_url', { length: 500 }),
    textContent: text('text_content'),
    isPreview: boolean('is_preview').default(false).notNull(),
    isDownloadable: boolean('is_downloadable').default(false).notNull(),
    sortOrder: integer('sort_order').notNull(),
    isActive: boolean('is_active').default(true).notNull(),
    createdAt: timestamp('created_at', { mode: 'string' }).defaultNow(),
    updatedAt: timestamp('updated_at', { mode: 'string' }).defaultNow(),
  },
  t => ({
    uniqCourseChapterSort: unique().on(t.courseId, t.chapterId, t.sortOrder),
    idxCourse: index('idx_course_lectures_course').on(t.courseId),
    idxChapter: index('idx_course_lectures_chapter').on(t.chapterId),
  })
);
