// src/services/payment.service.ts
import { PaymentRepository } from '../repositories/payment.repository';
import { PayoutRepository } from '../repositories/payout.repository';
import { PaymentGatewayFactory } from '../gateways/gateway.factory';
import { CourseServiceClient } from '../client/course.client';
import { NotFoundError, ConflictError, BadRequestError } from '../utils/errors';
import {
  CreatePaymentRequest,
  VerifyPaymentRequest,
  RefundPaymentRequest,
} from '../types/payment.types';

export class PaymentService {
  constructor(
    private paymentRepository: PaymentRepository,
    private payoutRepository: PayoutRepository,
    private courseServiceClient: CourseServiceClient
  ) {}

  async createPayment(userId: string, data: CreatePaymentRequest) {
    console.log('created payment called:::');
    // Verify course exists and get price
    try {
      console.log('fetching course details');
      const course = await this.getCourseDetails(data.courseId);
      console.log(course);
      if (!course) {
        throw new NotFoundError('Course not found');
      }

      if (course.status !== 'published') {
        throw new BadRequestError('Cannot purchase unpublished course');
      }
    } catch (error) {
      throw error;
    }

    // Check if user already has active enrollment
    // const existingEnrollment = await this.courseServiceClient.checkEnrollment(
    //   userId,
    //   data.courseId
    // );
    // if (existingEnrollment?.status === 'active') {
    //   throw new ConflictError('Already enrolled in this course');
    // }

    // Verify amount matches course price
    // if (Math.abs(parseFloat(course.price) - data.amount) > 0.01) {
    //   throw new BadRequestError('Payment amount does not match course price');
    // }

    // Create payment record
    const paymentData = {
      userId,
      courseId: data.courseId,
      amount: data.amount.toString(),
      currency: data.currency,
      status: 'pending' as const,
      paymentMethod: data.paymentMethod,
      // description: `Course: ${course.title}`,
    };
    console.log('payment data:::', paymentData);
    const payment = await this.paymentRepository.create(paymentData);
    console.log('payment data create: ', payment);

    // Create payment with gateway
    const gateway = PaymentGatewayFactory.create(data.paymentMethod);
    let gatewayResponse;

    if (data.paymentMethod === 'razorpay') {
      try {
        gatewayResponse = await (gateway as any).createOrder(
          data.amount,
          data.currency,
          data.courseId,
          userId
        );
      } catch (error) {
        throw new BadRequestError((error as Error).message);
      }
    } else if (data.paymentMethod === 'stripe') {
      gatewayResponse = await (gateway as any).createPaymentIntent(
        data.amount,
        data.currency,
        data.courseId,
        userId
      );
    }

    if (!gatewayResponse?.success) {
      throw new BadRequestError(gatewayResponse?.error || 'Payment gateway error');
    }

    // Update payment with gateway details
    await this.paymentRepository.update(payment.id, {
      paymentGatewayId: gatewayResponse.gatewayOrderId,
      paymentGatewayResponse: gatewayResponse.metadata,
    });

    return {
      // paymentId: payment.id,
      gatewayOrderId: gatewayResponse.gatewayOrderId,
      amount: data.amount,
      currency: data.currency,
      ...gatewayResponse.metadata,
    };
  }

  async verifyPayment(paymentId: string, data: VerifyPaymentRequest) {
    const payment = await this.paymentRepository.findById(paymentId);

    if (!payment) {
      throw new NotFoundError('Payment not found');
    }

    if (payment.status !== 'pending') {
      throw new BadRequestError('Payment is not in pending status');
    }

    // Verify with gateway
    const gateway = PaymentGatewayFactory.create(payment.paymentMethod);
    let isVerified = false;

    if (payment.paymentMethod === 'razorpay' && data.signature) {
      isVerified = await (gateway as any).verifyPayment(
        payment.paymentGatewayId,
        data.paymentGatewayId,
        data.signature
      );
    } else if (payment.paymentMethod === 'stripe') {
      isVerified = await (gateway as any).verifyPayment(data.paymentGatewayId);
    }

    if (isVerified) {
      // Update payment status
      await this.paymentRepository.update(paymentId, {
        status: 'completed',
        transactionId: data.transactionId,
      });

      // Create enrollment
      // await this.courseServiceClient.createEnrollment({
      //   userId: payment.userId,
      //   courseId: payment.courseId!,
      //   paymentId: paymentId,
      // });

      // Calculate and create teacher earnings
      await this.calculateTeacherEarnings(payment);

      return { success: true, status: 'completed' };
    } else {
      // Update payment as failed
      await this.paymentRepository.update(paymentId, {
        status: 'failed',
      });

      return { success: false, status: 'failed', error: 'Payment verification failed' };
    }
  }

  async refundPayment(paymentId: string, data: RefundPaymentRequest) {
    const payment = await this.paymentRepository.findById(paymentId);

    if (!payment) {
      throw new NotFoundError('Payment not found');
    }

    if (payment.status !== 'completed') {
      throw new BadRequestError('Only completed payments can be refunded');
    }

    // Process refund with gateway
    const gateway = PaymentGatewayFactory.create(payment.paymentMethod);
    const refundResponse = await gateway.refundPayment(payment.paymentGatewayId!, data.amount);

    if (!refundResponse.success) {
      throw new BadRequestError(refundResponse.error || 'Refund failed');
    }

    // Update payment status
    await this.paymentRepository.update(paymentId, {
      status: 'refunded',
      paymentGatewayResponse: refundResponse.metadata,
    });

    // Handle enrollment status (drop enrollment)
    // await this.enrollmentClient.dropEnrollment(payment.userId, payment.courseId!);

    return { success: true, refundAmount: data.amount || parseFloat(payment.amount) };
  }

  async getUserPayments(userId: string, page = 1, limit = 20) {
    const offset = (page - 1) * limit;
    const payments = await this.paymentRepository.findUserPayments(userId, limit, offset);
    const stats = await this.paymentRepository.getUserPaymentStats(userId);

    return {
      payments,
      stats,
      pagination: {
        page,
        limit,
        total: parseInt(stats.totalPayments?.toString() || '0'),
      },
    };
  }

  private async calculateTeacherEarnings(payment: any) {
    const course = payment.course;
    if (!course) return;

    const grossAmount = parseFloat(payment.amount);
    const platformFeeRate = parseFloat(process.env.PLATFORM_FEE_RATE || '0.10'); // 10% default
    const taxRate = parseFloat(process.env.TAX_RATE || '0.18'); // 18% GST default

    const platformFee = grossAmount * platformFeeRate;
    const taxableAmount = grossAmount - platformFee;
    const taxDeduction = taxableAmount * taxRate;
    const netAmount = grossAmount - platformFee - taxDeduction;

    const earningData = {
      teacherId: course.teacherId,
      courseId: payment.courseId,
      paymentId: payment.id,
      grossAmount: grossAmount.toFixed(2),
      platformFee: platformFee.toFixed(2),
      taxDeduction: taxDeduction.toFixed(2),
      netAmount: netAmount.toFixed(2),
      currency: payment.currency,
      earnedAt: new Date().toISOString(),
    };

    await this.payoutRepository.createEarning(earningData);
  }

  private async getCourseDetails(courseId: string) {
    try {
      const course = await this.courseServiceClient.getCourseDetails(courseId);

      return course;
    } catch (error) {
      console.log(error);
    }
  }
}
