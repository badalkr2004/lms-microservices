import {
  boolean,
  decimal,
  index,
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
import { paymentStatus, paymentMethod } from './enums';
import { users } from './users';
import { courses } from './courses';

export const subscriptionPlans = pgTable('subscription_plans', {
  id: uuid('id')
    .default(sql`gen_random_uuid()`)
    .primaryKey(),
  name: varchar('name', { length: 100 }).notNull(),
  description: text('description'),
  price: decimal('price', { precision: 10, scale: 2 }).notNull(),
  durationMonths: integer('duration_months').notNull(),
  features: text('features').array(),
  maxCourses: integer('max_courses'),
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at', { mode: 'string' }).defaultNow(),
  updatedAt: timestamp('updated_at', { mode: 'string' }).defaultNow(),
});

export const userSubscriptions = pgTable(
  'user_subscriptions',
  {
    id: uuid('id')
      .default(sql`gen_random_uuid()`)
      .primaryKey(),
    userId: uuid('user_id')
      .references(() => users.id, { onDelete: 'cascade' })
      .notNull(),
    planId: uuid('plan_id')
      .references(() => subscriptionPlans.id, { onDelete: 'cascade' })
      .notNull(),
    startedAt: timestamp('started_at', { mode: 'string' }).defaultNow(),
    expiresAt: timestamp('expires_at', { mode: 'string' }).notNull(),
    isActive: boolean('is_active').default(true).notNull(),
    autoRenew: boolean('auto_renew').default(false).notNull(),
    paymentMethod: paymentMethod('payment_method'),
    createdAt: timestamp('created_at', { mode: 'string' }).defaultNow(),
  },
  t => ({
    idxUser: index('idx_subscriptions_user').on(t.userId),
    idxPlan: index('idx_subscriptions_plan').on(t.planId),
    idxActive: index('idx_subscriptions_active').on(t.isActive, t.expiresAt),
  })
);

export const payments = pgTable(
  'payments',
  {
    id: uuid('id')
      .default(sql`gen_random_uuid()`)
      .primaryKey(),
    userId: uuid('user_id')
      .references(() => users.id, { onDelete: 'cascade' })
      .notNull(),
    courseId: uuid('course_id').references(() => courses.id, { onDelete: 'set null' }),
    subscriptionId: uuid('subscription_id').references(() => userSubscriptions.id, {
      onDelete: 'set null',
    }),
    amount: decimal('amount', { precision: 10, scale: 2 }).notNull(),
    currency: varchar('currency', { length: 3 }).default('INR'),
    status: paymentStatus('status').default('pending'),
    paymentMethod: paymentMethod('payment_method').notNull(),
    paymentGatewayId: varchar('payment_gateway_id', { length: 255 }),
    paymentGatewayResponse: jsonb('payment_gateway_response'),
    transactionId: varchar('transaction_id', { length: 255 }),
    description: text('description'),
    createdAt: timestamp('created_at', { mode: 'string' }).defaultNow(),
    updatedAt: timestamp('updated_at', { mode: 'string' }).defaultNow(),
  },
  t => ({
    idxUser: index('idx_payments_user').on(t.userId),
    idxCourse: index('idx_payments_course').on(t.courseId),
    idxSubscription: index('idx_payments_subscription').on(t.subscriptionId),
    idxStatus: index('idx_payments_status').on(t.status),
    idxGateway: index('idx_payments_gateway').on(t.paymentGatewayId),
    idxCompleted: index('idx_payments_completed')
      .on(t.status)
      .where(sql`${t.status} = 'completed'::payment_status`),
    idxUserStatus: index('idx_payments_user_status').on(t.userId, t.status),
  })
);

export const teacherBankAccounts = pgTable(
  'teacher_bank_accounts',
  {
    id: uuid('id')
      .default(sql`gen_random_uuid()`)
      .primaryKey(),
    teacherId: uuid('teacher_id')
      .references(() => users.id, { onDelete: 'cascade' })
      .notNull(),
    accountHolderName: varchar('account_holder_name', { length: 255 }).notNull(),
    accountNumber: varchar('account_number', { length: 50 }).notNull(),
    ifscCode: varchar('ifsc_code', { length: 20 }).notNull(),
    bankName: varchar('bank_name', { length: 255 }).notNull(),
    branchName: varchar('branch_name', { length: 255 }),
    accountType: varchar('account_type', { length: 50 }).default('savings'),
    isPrimary: boolean('is_primary').default(false).notNull(),
    isVerified: boolean('is_verified').default(false).notNull(),
    createdAt: timestamp('created_at', { mode: 'string' }).defaultNow(),
    updatedAt: timestamp('updated_at', { mode: 'string' }).defaultNow(),
  },
  t => ({
    uniqTeacherAccount: unique().on(t.teacherId, t.accountNumber),
  })
);

export const teacherEarnings = pgTable(
  'teacher_earnings',
  {
    id: uuid('id')
      .default(sql`gen_random_uuid()`)
      .primaryKey(),
    teacherId: uuid('teacher_id')
      .references(() => users.id, { onDelete: 'cascade' })
      .notNull(),
    courseId: uuid('course_id')
      .references(() => courses.id, { onDelete: 'cascade' })
      .notNull(),
    paymentId: uuid('payment_id')
      .references(() => payments.id, { onDelete: 'cascade' })
      .notNull(),
    grossAmount: decimal('gross_amount', { precision: 10, scale: 2 }).notNull(),
    platformFee: decimal('platform_fee', { precision: 10, scale: 2 }).notNull(),
    taxDeduction: decimal('tax_deduction', { precision: 10, scale: 2 }).default('0.00'),
    netAmount: decimal('net_amount', { precision: 10, scale: 2 }).notNull(),
    currency: varchar('currency', { length: 3 }).default('INR'),
    earnedAt: timestamp('earned_at', { mode: 'string' }).defaultNow(),
    isPaid: boolean('is_paid').default(false).notNull(),
    paidAt: timestamp('paid_at', { mode: 'string' }),
    payoutId: uuid('payout_id'),
  },
  t => ({
    idxTeacher: index('idx_earnings_teacher').on(t.teacherId),
    idxCourse: index('idx_earnings_course').on(t.courseId),
    idxPayment: index('idx_earnings_payment').on(t.paymentId),
  })
);

export const teacherPayouts = pgTable(
  'teacher_payouts',
  {
    id: uuid('id')
      .default(sql`gen_random_uuid()`)
      .primaryKey(),
    teacherId: uuid('teacher_id')
      .references(() => users.id, { onDelete: 'cascade' })
      .notNull(),
    bankAccountId: uuid('bank_account_id')
      .references(() => teacherBankAccounts.id, { onDelete: 'cascade' })
      .notNull(),
    amount: decimal('amount', { precision: 10, scale: 2 }).notNull(),
    currency: varchar('currency', { length: 3 }).default('INR'),
    status: paymentStatus('status').default('pending'),
    transactionId: varchar('transaction_id', { length: 255 }),
    gatewayResponse: jsonb('gateway_response'),
    requestedAt: timestamp('requested_at', { mode: 'string' }).defaultNow(),
    processedAt: timestamp('processed_at', { mode: 'string' }),
  },
  t => ({
    idxTeacher: index('idx_payouts_teacher').on(t.teacherId),
    idxBank: index('idx_payouts_bank_account').on(t.bankAccountId),
    idxStatus: index('idx_payouts_status').on(t.status),
  })
);
