import { sql } from 'drizzle-orm';
import {
  pgTable,
  uuid,
  varchar,
  text,
  jsonb,
  boolean,
  timestamp,
  index,
} from 'drizzle-orm/pg-core';
import { notificationPriority, notificationType } from './enums';
import { users } from './users';

export const notifications = pgTable(
  'notifications',
  {
    id: uuid('id')
      .default(sql`gen_random_uuid()`)
      .primaryKey(),
    userId: uuid('user_id')
      .references(() => users.id, { onDelete: 'cascade' })
      .notNull(),
    type: notificationType('type').notNull(),
    priority: notificationPriority('priority').default('medium'),
    title: varchar('title', { length: 255 }).notNull(),
    message: text('message').notNull(),
    data: jsonb('data'),
    isRead: boolean('is_read').default(false).notNull(),
    isSent: boolean('is_sent').default(false).notNull(),
    sentAt: timestamp('sent_at', { mode: 'string' }),
    createdAt: timestamp('created_at', { mode: 'string' }).defaultNow(),
    expiresAt: timestamp('expires_at', { mode: 'string' }),
  },
  t => ({
    idxUser: index('idx_notifications_user').on(t.userId),
    idxUnread: index('idx_notifications_unread').on(t.userId, t.isRead),
    idxType: index('idx_notifications_type').on(t.type),
    idxUnreadOnly: index('idx_notifications_unread_only')
      .on(t.userId, t.isRead)
      .where(sql`${t.isRead} = false`),
    idxUserUnreadCreated: index('idx_notifications_user_unread_created').on(
      t.userId,
      t.isRead,
      t.createdAt
    ),
  })
);
