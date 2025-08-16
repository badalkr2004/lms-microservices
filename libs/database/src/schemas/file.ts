// src/database/schema.ts
import { pgTable, uuid, varchar, integer, timestamp, boolean, text, index } from 'drizzle-orm/pg-core';
import { createInsertSchema, createSelectSchema } from 'drizzle-zod';

export const files = pgTable('files', {
  id: uuid('id').primaryKey().defaultRandom(),
  originalName: varchar('original_name', { length: 255 }).notNull(),
  fileName: varchar('file_name', { length: 255 }).notNull(),
  fileType: varchar('file_type', { length: 100 }).notNull(),
  fileSize: integer('file_size').notNull(),
  s3Key: varchar('s3_key', { length: 500 }).notNull().unique(),
  s3Url: text('s3_url').notNull(),
  userId: uuid('user_id').notNull(),
  category: varchar('category', { length: 50 }).notNull().default('general'),
  status: varchar('status', { length: 20 }).notNull().default('uploaded'),
  uploadedAt: timestamp('uploaded_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
  isActive: boolean('is_active').notNull().default(true),
  metadata: text('metadata'), // JSON field for additional metadata
}, (table) => {
  return {
    userIdIdx: index('files_user_id_idx').on(table.userId),
    categoryIdx: index('files_category_idx').on(table.category),
    statusIdx: index('files_status_idx').on(table.status),
    s3KeyIdx: index('files_s3_key_idx').on(table.s3Key),
    uploadedAtIdx: index('files_uploaded_at_idx').on(table.uploadedAt),
  };
});

// File upload sessions for tracking presigned URL usage
export const fileUploadSessions = pgTable('file_upload_sessions', {
  id: uuid('id').primaryKey().defaultRandom(),
  fileId: uuid('file_id').references(() => files.id, { onDelete: 'cascade' }),
  s3Key: varchar('s3_key', { length: 500 }).notNull(),
  presignedUrl: text('presigned_url').notNull(),
  userId: uuid('user_id').notNull(),
  expiresAt: timestamp('expires_at').notNull(),
  isUsed: boolean('is_used').notNull().default(false),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  completedAt: timestamp('completed_at'),
}, (table) => {
  return {
    userIdIdx: index('upload_sessions_user_id_idx').on(table.userId),
    s3KeyIdx: index('upload_sessions_s3_key_idx').on(table.s3Key),
    expiresAtIdx: index('upload_sessions_expires_at_idx').on(table.expiresAt),
  };
});

// Zod schemas for validation
export const insertFileSchema = createInsertSchema(files);
export const selectFileSchema = createSelectSchema(files);
export const insertUploadSessionSchema = createInsertSchema(fileUploadSessions);
export const selectUploadSessionSchema = createSelectSchema(fileUploadSessions);

// Types
export type File = typeof files.$inferSelect;
export type NewFile = typeof files.$inferInsert;
export type FileUploadSession = typeof fileUploadSessions.$inferSelect;
export type NewFileUploadSession = typeof fileUploadSessions.$inferInsert;