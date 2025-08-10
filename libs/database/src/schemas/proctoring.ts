import {
  boolean,
  decimal,
  index,
  inet,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { violationType } from './enums';
import { users } from './users';
import { tests, testQuestions } from './assessments';

export const testSessions = pgTable(
  'test_sessions',
  {
    id: uuid('id')
      .default(sql`gen_random_uuid()`)
      .primaryKey(),
    userId: uuid('user_id')
      .references(() => users.id, { onDelete: 'cascade' })
      .notNull(),
    testId: uuid('test_id')
      .references(() => tests.id, { onDelete: 'cascade' })
      .notNull(),
    sessionToken: varchar('session_token', { length: 255 }).notNull().unique(),
    startedAt: timestamp('started_at', { mode: 'string' }).defaultNow(),
    endedAt: timestamp('ended_at', { mode: 'string' }),
    submittedAt: timestamp('submitted_at', { mode: 'string' }),
    durationTaken: integer('duration_taken'),
    isCompleted: boolean('is_completed').default(false).notNull(),
    isTerminated: boolean('is_terminated').default(false).notNull(),
    terminationReason: text('termination_reason'),
    ipAddress: inet('ip_address'),
    userAgent: text('user_agent'),
    proctoringData: jsonb('proctoring_data'),
    violationCount: integer('violation_count').default(0).notNull(),
    totalScore: integer('total_score').default(0).notNull(),
    percentageScore: decimal('percentage_score', { precision: 5, scale: 2 }).default('0.00'),
  },
  t => ({
    idxUser: index('idx_sessions_user').on(t.userId),
    idxTest: index('idx_sessions_test').on(t.testId),
    idxUserCompleted: index('idx_test_sessions_user_completed').on(t.userId, t.isCompleted),
  })
);

export const testAnswers = pgTable(
  'test_answers',
  {
    id: uuid('id')
      .default(sql`gen_random_uuid()`)
      .primaryKey(),
    sessionId: uuid('session_id')
      .references(() => testSessions.id, { onDelete: 'cascade' })
      .notNull(),
    questionId: uuid('question_id')
      .references(() => testQuestions.id, { onDelete: 'cascade' })
      .notNull(),
    selectedOptions: uuid('selected_options').array(),
    textAnswer: text('text_answer'),
    isCorrect: boolean('is_correct'),
    marksObtained: integer('marks_obtained').default(0).notNull(),
    answeredAt: timestamp('answered_at', { mode: 'string' }).defaultNow(),
    timeTaken: integer('time_taken'),
  },
  t => ({
    uniqSessionQuestion: unique().on(t.sessionId, t.questionId),
    idxSession: index('idx_test_answers_session').on(t.sessionId),
    idxQuestion: index('idx_test_answers_question').on(t.questionId),
  })
);

export const proctoringViolations = pgTable(
  'proctoring_violations',
  {
    id: uuid('id')
      .default(sql`gen_random_uuid()`)
      .primaryKey(),
    sessionId: uuid('session_id')
      .references(() => testSessions.id, { onDelete: 'cascade' })
      .notNull(),
    violationType: violationType('violation_type').notNull(),
    description: text('description'),
    severity: integer('severity').default(1).notNull(),
    screenshotUrl: varchar('screenshot_url', { length: 500 }),
    videoClipUrl: varchar('video_clip_url', { length: 500 }),
    detectedAt: timestamp('detected_at', { mode: 'string' }).defaultNow(),
    confidenceScore: decimal('confidence_score', { precision: 5, scale: 2 }),
    actionTaken: varchar('action_taken', { length: 100 }),
    metadata: jsonb('metadata'),
  },
  t => ({
    idxSession: index('idx_violations_session').on(t.sessionId),
    idxType: index('idx_violations_type').on(t.violationType),
  })
);
