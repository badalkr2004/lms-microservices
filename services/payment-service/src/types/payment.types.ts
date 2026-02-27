// src/types/payment.types.ts
import { z } from 'zod';

export const paymentMethodSchema = z.enum([
  'razorpay',
  'stripe',
  'paypal',
  'wallet',
  'bank_transfer',
]);
export const paymentStatusSchema = z.enum([
  'pending',
  'completed',
  'failed',
  'refunded',
  'cancelled',
]);

export const createPaymentSchema = z.object({
  courseId: z.string().uuid(),
  amount: z.number().positive(),
  currency: z.string().length(3).default('INR'),
  paymentMethod: paymentMethodSchema,
  returnUrl: z.string().url().optional(),
  metadata: z.record(z.string(), z.any()).optional(),
});

export const verifyPaymentSchema = z.object({
  paymentGatewayId: z.string(),
  signature: z.string().optional(),
  transactionId: z.string().optional(),
});

export const refundPaymentSchema = z.object({
  paymentId: z.string().uuid(),
  amount: z.number().positive().optional(),
  reason: z.string().optional(),
});

export const bankAccountSchema = z.object({
  accountHolderName: z.string().min(2).max(255),
  accountNumber: z.string().min(8).max(20),
  ifscCode: z.string().length(11),
  bankName: z.string().min(2).max(255),
  branchName: z.string().max(255).optional(),
  accountType: z.enum(['savings', 'current']).default('savings'),
  isPrimary: z.boolean().default(false),
});

export const payoutRequestSchema = z.object({
  amount: z.number().positive(),
  bankAccountId: z.string().uuid(),
  currency: z.string().length(3).default('INR'),
});

export type CreatePaymentRequest = z.infer<typeof createPaymentSchema>;
export type VerifyPaymentRequest = z.infer<typeof verifyPaymentSchema>;
export type RefundPaymentRequest = z.infer<typeof refundPaymentSchema>;
export type BankAccountRequest = z.infer<typeof bankAccountSchema>;
export type PayoutRequest = z.infer<typeof payoutRequestSchema>;

export interface PaymentGatewayResponse {
  success: boolean;
  gatewayOrderId?: string;
  paymentUrl?: string;
  error?: string;
  metadata?: any;
}

export interface EnrollmentServicePayload {
  userId: string;
  courseId: string;
  paymentId: string;
}
