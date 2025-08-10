import {
  boolean,
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
import { questionType, testType } from './enums';
import { courses, courseChapters } from './courses';

export const tests = pgTable(
  'tests',
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
    testType: testType('test_type').default('quiz'),
    durationMinutes: integer('duration_minutes').notNull(),
    totalMarks: integer('total_marks').default(0).notNull(),
    passingMarks: integer('passing_marks').default(0).notNull(),
    maxAttempts: integer('max_attempts').default(1).notNull(),
    shuffleQuestions: boolean('shuffle_questions').default(false).notNull(),
    shuffleOptions: boolean('shuffle_options').default(false).notNull(),
    showResults: boolean('show_results').default(true).notNull(),
    showCorrectAnswers: boolean('show_correct_answers').default(true).notNull(),
    proctoringEnabled: boolean('proctoring_enabled').default(false).notNull(),
    proctoringStrictness: integer('proctoring_strictness').default(1).notNull(),
    isActive: boolean('is_active').default(true).notNull(),
    createdAt: timestamp('created_at', { mode: 'string' }).defaultNow(),
    updatedAt: timestamp('updated_at', { mode: 'string' }).defaultNow(),
  },
  t => ({
    idxCourse: index('idx_tests_course').on(t.courseId),
  })
);

export const testQuestions = pgTable(
  'test_questions',
  {
    id: uuid('id')
      .default(sql`gen_random_uuid()`)
      .primaryKey(),
    testId: uuid('test_id')
      .references(() => tests.id, { onDelete: 'cascade' })
      .notNull(),
    questionType: questionType('question_type').notNull(),
    questionText: text('question_text').notNull(),
    questionImageUrl: varchar('question_image_url', { length: 500 }),
    marks: integer('marks').default(1).notNull(),
    explanation: text('explanation'),
    sortOrder: integer('sort_order').notNull(),
    isActive: boolean('is_active').default(true).notNull(),
    createdAt: timestamp('created_at', { mode: 'string' }).defaultNow(),
  },
  t => ({
    uniqTestSort: unique().on(t.testId, t.sortOrder),
    idxTest: index('idx_test_questions_test').on(t.testId),
  })
);

export const questionOptions = pgTable(
  'question_options',
  {
    id: uuid('id')
      .default(sql`gen_random_uuid()`)
      .primaryKey(),
    questionId: uuid('question_id')
      .references(() => testQuestions.id, { onDelete: 'cascade' })
      .notNull(),
    optionText: text('option_text').notNull(),
    optionImageUrl: varchar('option_image_url', { length: 500 }),
    isCorrect: boolean('is_correct').default(false).notNull(),
    sortOrder: integer('sort_order').notNull(),
    createdAt: timestamp('created_at', { mode: 'string' }).defaultNow(),
  },
  t => ({
    uniqQuestionSort: unique().on(t.questionId, t.sortOrder),
    idxQuestion: index('idx_question_options_question').on(t.questionId),
  })
);
