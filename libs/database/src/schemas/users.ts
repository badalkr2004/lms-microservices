import {
  boolean,
  check,
  date,
  index,
  jsonb,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
  varchar,
  integer,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { userRole, authMethod, userStatus } from './enums';

export const users = pgTable(
  'users',
  {
    id: uuid('id')
      .default(sql`gen_random_uuid()`)
      .primaryKey(),
    email: varchar('email', { length: 255 }).notNull().unique(),
    phone: varchar('phone', { length: 20 }).unique(),
    passwordHash: varchar('password_hash', { length: 255 }),
    role: userRole('role').default('student').notNull(),
    status: userStatus('status').default('pending_verification').notNull(),
    emailVerified: boolean('email_verified').default(false).notNull(),
    phoneVerified: boolean('phone_verified').default(false).notNull(),
    createdAt: timestamp('created_at', { mode: 'string' }).defaultNow(),
    updatedAt: timestamp('updated_at', { mode: 'string' }).defaultNow(),
    lastLogin: timestamp('last_login', { mode: 'string' }),
    loginAttempts: integer('login_attempts').default(0).notNull(),
    lockedUntil: timestamp('locked_until', { mode: 'string' }),
  },
  t => ({
    validEmail: check(
      'valid_email',
      sql`${t.email} ~* '^[A-Za-z0-9._%-]+@[A-Za-z0-9.-]+[.][A-Za-z]+$'`
    ),
    idxEmail: index('idx_users_email').on(t.email),
    idxRole: index('idx_users_role').on(t.role),
    idxStatus: index('idx_users_status').on(t.status),
    idxEmailVerified: index('idx_users_email_verified')
      .on(t.email)
      .where(sql`${t.emailVerified} = true`),
  })
);

export const userProfiles = pgTable(
  'user_profiles',
  {
    id: uuid('id')
      .default(sql`gen_random_uuid()`)
      .primaryKey(),
    userId: uuid('user_id')
      .references(() => users.id, { onDelete: 'cascade' })
      .notNull()
      .unique(),
    firstName: varchar('first_name', { length: 100 }),
    lastName: varchar('last_name', { length: 100 }),
    displayName: varchar('display_name', { length: 150 }),
    bio: text('bio'),
    avatarUrl: varchar('avatar_url', { length: 500 }),
    dateOfBirth: date('date_of_birth'),
    gender: varchar('gender', { length: 20 }),
    country: varchar('country', { length: 100 }),
    state: varchar('state', { length: 100 }),
    city: varchar('city', { length: 100 }),
    timezone: varchar('timezone', { length: 50 }),
    preferredLanguage: varchar('preferred_language', { length: 10 }).default('en'),
    createdAt: timestamp('created_at', { mode: 'string' }).defaultNow(),
    updatedAt: timestamp('updated_at', { mode: 'string' }).defaultNow(),
  },
  t => ({
    idxUser: index('idx_user_profiles_user_id').on(t.userId),
  })
);

export const userAuthMethods = pgTable(
  'user_auth_methods',
  {
    id: uuid('id')
      .default(sql`gen_random_uuid()`)
      .primaryKey(),
    userId: uuid('user_id')
      .references(() => users.id, { onDelete: 'cascade' })
      .notNull(),
    authMethod: authMethod('auth_method').notNull(),
    providerId: varchar('provider_id', { length: 255 }),
    providerData: jsonb('provider_data'),
    isPrimary: boolean('is_primary').default(false).notNull(),
    createdAt: timestamp('created_at', { mode: 'string' }).defaultNow(),
  },
  t => ({
    uniqUserMethod: unique().on(t.userId, t.authMethod),
  })
);

export const userInterests = pgTable(
  'user_interests',
  {
    id: uuid('id')
      .default(sql`gen_random_uuid()`)
      .primaryKey(),
    userId: uuid('user_id')
      .references(() => users.id, { onDelete: 'cascade' })
      .notNull(),
    categoryId: uuid('category_id'),
    interestName: varchar('interest_name', { length: 100 }),
    priority: integer('priority').default(1).notNull(),
    createdAt: timestamp('created_at', { mode: 'string' }).defaultNow(),
  },
  t => ({
    uniqUserCategory: unique().on(t.userId, t.categoryId),
  })
);
