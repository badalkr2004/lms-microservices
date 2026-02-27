// src/controllers/payment.controller.ts
import { Response, NextFunction } from 'express';
import { PaymentService } from '../services/payment.service';
import { successResponse } from '../utils/response';
import { AuthenticatedRequest } from '@lms/shared-auth';
import {
  createPaymentSchema,
  verifyPaymentSchema,
  refundPaymentSchema,
} from '../types/payment.types';
import { NotFoundError } from '@/utils/errors';

export class PaymentController {
  constructor(private paymentService: PaymentService) {}

  createPayment = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        throw new NotFoundError('User not found');
      }
      const validatedData = createPaymentSchema.parse(req.body);
      const payment = await this.paymentService.createPayment(req.user.id, validatedData);
      successResponse(res, 'Payment created successfully', payment, 201);
    } catch (error) {
      next(error);
    }
  };

  verifyPayment = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { paymentId } = req.params;
      const validatedData = verifyPaymentSchema.parse(req.body);
      const result = await this.paymentService.verifyPayment(paymentId, validatedData);
      successResponse(res, 'Payment verified successfully', result);
    } catch (error) {
      next(error);
    }
  };

  refundPayment = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { paymentId } = req.params;
      const validatedData = refundPaymentSchema.parse(req.body);
      const result = await this.paymentService.refundPayment(paymentId, validatedData);
      successResponse(res, 'Payment refunded successfully', result);
    } catch (error) {
      next(error);
    }
  };

  getUserPayments = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const result = await this.paymentService.getUserPayments(req.user!.id, page, limit);
      successResponse(res, 'User payments retrieved successfully', result);
    } catch (error) {
      next(error);
    }
  };
}
