// src/repositories/payout.repository.ts
import { eq, and, desc, sql } from 'drizzle-orm';
import { db } from '@lms/database';
import {
  teacherBankAccounts,
  teacherEarnings,
  teacherPayouts,
  payments,
  courses,
  users,
  userProfiles,
} from '@lms/database';

export class PayoutRepository {
  // Bank Account Methods
  async createBankAccount(data: any) {
    const [account] = await db.insert(teacherBankAccounts).values(data).returning();
    return account;
  }

  async findTeacherBankAccounts(teacherId: string) {
    return await db
      .select()
      .from(teacherBankAccounts)
      .where(eq(teacherBankAccounts.teacherId, teacherId))
      .orderBy(desc(teacherBankAccounts.isPrimary), desc(teacherBankAccounts.createdAt));
  }

  async updateBankAccount(id: string, data: any) {
    const [account] = await db
      .update(teacherBankAccounts)
      .set({ ...data, updatedAt: new Date().toISOString() })
      .where(eq(teacherBankAccounts.id, id))
      .returning();

    return account;
  }

  // Earnings Methods
  async createEarning(data: any) {
    const [earning] = await db.insert(teacherEarnings).values(data).returning();
    return earning;
  }

  async findTeacherEarnings(teacherId: string, isPaid?: boolean) {
    const conditions = [eq(teacherEarnings.teacherId, teacherId)];

    if (isPaid !== undefined) {
      conditions.push(eq(teacherEarnings.isPaid, isPaid));
    }

    return await db
      .select({
        id: teacherEarnings.id,
        courseId: teacherEarnings.courseId,
        paymentId: teacherEarnings.paymentId,
        grossAmount: teacherEarnings.grossAmount,
        platformFee: teacherEarnings.platformFee,
        taxDeduction: teacherEarnings.taxDeduction,
        netAmount: teacherEarnings.netAmount,
        currency: teacherEarnings.currency,
        earnedAt: teacherEarnings.earnedAt,
        isPaid: teacherEarnings.isPaid,
        paidAt: teacherEarnings.paidAt,
        course: {
          id: courses.id,
          title: courses.title,
        },
      })
      .from(teacherEarnings)
      .leftJoin(courses, eq(teacherEarnings.courseId, courses.id))
      .where(and(...conditions))
      .orderBy(desc(teacherEarnings.earnedAt));
  }

  async getTeacherEarningsStats(teacherId: string) {
    const [stats] = await db
      .select({
        totalEarnings: sql`SUM(${teacherEarnings.netAmount})`,
        pendingEarnings: sql`SUM(${teacherEarnings.netAmount}) FILTER (WHERE ${teacherEarnings.isPaid} = false)`,
        paidEarnings: sql`SUM(${teacherEarnings.netAmount}) FILTER (WHERE ${teacherEarnings.isPaid} = true)`,
        totalTransactions: sql`COUNT(*)`,
      })
      .from(teacherEarnings)
      .where(eq(teacherEarnings.teacherId, teacherId));

    return stats;
  }

  // Payout Methods
  async createPayout(data: any) {
    const [payout] = await db.insert(teacherPayouts).values(data).returning();
    return payout;
  }

  async findTeacherPayouts(teacherId: string) {
    return await db
      .select({
        id: teacherPayouts.id,
        amount: teacherPayouts.amount,
        currency: teacherPayouts.currency,
        status: teacherPayouts.status,
        transactionId: teacherPayouts.transactionId,
        requestedAt: teacherPayouts.requestedAt,
        processedAt: teacherPayouts.processedAt,
        bankAccount: {
          id: teacherBankAccounts.id,
          accountHolderName: teacherBankAccounts.accountHolderName,
          accountNumber: teacherBankAccounts.accountNumber,
          bankName: teacherBankAccounts.bankName,
        },
      })
      .from(teacherPayouts)
      .leftJoin(teacherBankAccounts, eq(teacherPayouts.bankAccountId, teacherBankAccounts.id))
      .where(eq(teacherPayouts.teacherId, teacherId))
      .orderBy(desc(teacherPayouts.requestedAt));
  }

  async updatePayout(id: string, data: any) {
    const [payout] = await db
      .update(teacherPayouts)
      .set(data)
      .where(eq(teacherPayouts.id, id))
      .returning();

    return payout;
  }

  async markEarningsAsPaid(teacherId: string, payoutId: string, earningIds: string[]) {
    await db
      .update(teacherEarnings)
      .set({
        isPaid: true,
        paidAt: new Date().toISOString(),
        payoutId,
      })
      .where(
        and(
          eq(teacherEarnings.teacherId, teacherId),
          sql`${teacherEarnings.id} = ANY(${earningIds})`
        )
      );
  }
}
