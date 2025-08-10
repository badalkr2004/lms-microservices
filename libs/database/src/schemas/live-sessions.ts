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
import { sessionStatus } from './enums';
import { users } from './users';
import { courses } from './courses';

export const liveSessions = pgTable(
  'live_sessions',
  {
    id: uuid('id')
      .default(sql`gen_random_uuid()`)
      .primaryKey(),
    courseId: uuid('course_id')
      .references(() => courses.id, { onDelete: 'cascade' })
      .notNull(),
    teacherId: uuid('teacher_id')
      .references(() => users.id, { onDelete: 'cascade' })
      .notNull(),
    title: varchar('title', { length: 255 }).notNull(),
    description: text('description'),
    sessionUrl: varchar('session_url', { length: 500 }),
    meetingId: varchar('meeting_id', { length: 255 }),
    meetingPassword: varchar('meeting_password', { length: 100 }),
    scheduledAt: timestamp('scheduled_at', { mode: 'string' }).notNull(),
    startedAt: timestamp('started_at', { mode: 'string' }),
    endedAt: timestamp('ended_at', { mode: 'string' }),
    durationMinutes: integer('duration_minutes'),
    status: sessionStatus('status').default('scheduled'),
    maxParticipants: integer('max_participants').default(100).notNull(),
    isRecorded: boolean('is_recorded').default(false).notNull(),
    recordingUrl: varchar('recording_url', { length: 500 }),
    agenda: text('agenda'),
    materialsUrl: varchar('materials_url', { length: 500 }),
    createdAt: timestamp('created_at', { mode: 'string' }).defaultNow(),
    updatedAt: timestamp('updated_at', { mode: 'string' }).defaultNow(),
  },
  t => ({
    idxCourse: index('idx_live_sessions_course').on(t.courseId),
    idxTeacher: index('idx_live_sessions_teacher').on(t.teacherId),
    idxScheduled: index('idx_live_sessions_scheduled').on(t.scheduledAt),
    idxCourseStatus: index('idx_live_sessions_course_status').on(t.courseId, t.status),
  })
);

export const liveSessionParticipants = pgTable(
  'live_session_participants',
  {
    id: uuid('id')
      .default(sql`gen_random_uuid()`)
      .primaryKey(),
    sessionId: uuid('session_id')
      .references(() => liveSessions.id, { onDelete: 'cascade' })
      .notNull(),
    userId: uuid('user_id')
      .references(() => users.id, { onDelete: 'cascade' })
      .notNull(),
    joinedAt: timestamp('joined_at', { mode: 'string' }),
    leftAt: timestamp('left_at', { mode: 'string' }),
    attendanceDuration: integer('attendance_duration').default(0).notNull(),
    isPresent: boolean('is_present').default(false).notNull(),
  },
  t => ({
    uniqSessionUser: unique().on(t.sessionId, t.userId),
    idxSession: index('idx_session_participants_session').on(t.sessionId),
    idxUser: index('idx_session_participants_user').on(t.userId),
  })
);
