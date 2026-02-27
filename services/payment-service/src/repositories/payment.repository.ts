// src/repositories/payment.repository.ts
import { eq, and, desc, sql } from 'drizzle-orm';
import { db } from '@lms/database';
import { payments, courses, users, userProfiles } from '@lms/database';

export class PaymentRepository {
  async create(data: any) {
    const [payment] = await db.insert(payments).values(data).returning();
    return payment;
  }

  async findById(id: string) {
    const [payment] = await db
      .select({
        id: payments.id,
        userId: payments.userId,
        courseId: payments.courseId,
        amount: payments.amount,
        currency: payments.currency,
        status: payments.status,
        paymentMethod: payments.paymentMethod,
        paymentGatewayId: payments.paymentGatewayId,
        transactionId: payments.transactionId,
        description: payments.description,
        createdAt: payments.createdAt,
        updatedAt: payments.updatedAt,
        course: {
          id: courses.id,
          title: courses.title,
          price: courses.price,
          teacherId: courses.teacherId,
        },
        user: {
          id: users.id,
          email: users.email,
          firstName: userProfiles.firstName,
          lastName: userProfiles.lastName,
        },
      })
      .from(payments)
      .leftJoin(courses, eq(payments.courseId, courses.id))
      .leftJoin(users, eq(payments.userId, users.id))
      .leftJoin(userProfiles, eq(users.id, userProfiles.userId))
      .where(eq(payments.id, id));

    return payment;
  }

  async findByGatewayId(gatewayId: string) {
    const [payment] = await db
      .select()
      .from(payments)
      .where(eq(payments.paymentGatewayId, gatewayId));

    return payment;
  }

  async findUserPayments(userId: string, limit = 50, offset = 0) {
    return await db
      .select({
        id: payments.id,
        courseId: payments.courseId,
        amount: payments.amount,
        currency: payments.currency,
        status: payments.status,
        paymentMethod: payments.paymentMethod,
        createdAt: payments.createdAt,
        course: {
          id: courses.id,
          title: courses.title,
          thumbnailUrl: courses.thumbnailUrl,
        },
      })
      .from(payments)
      .leftJoin(courses, eq(payments.courseId, courses.id))
      .where(eq(payments.userId, userId))
      .orderBy(desc(payments.createdAt))
      .limit(limit)
      .offset(offset);
  }

  async update(id: string, data: any) {
    const [payment] = await db
      .update(payments)
      .set({ ...data, updatedAt: new Date().toISOString() })
      .where(eq(payments.id, id))
      .returning();

    return payment;
  }

  async getUserPaymentStats(userId: string) {
    const [stats] = await db
      .select({
        totalPayments: sql`COUNT(*)`,
        totalAmount: sql`SUM(${payments.amount})`,
        completedPayments: sql`COUNT(*) FILTER (WHERE ${payments.status} = 'completed')`,
        pendingPayments: sql`COUNT(*) FILTER (WHERE ${payments.status} = 'pending')`,
      })
      .from(payments)
      .where(eq(payments.userId, userId));

    return stats;
  }
}
