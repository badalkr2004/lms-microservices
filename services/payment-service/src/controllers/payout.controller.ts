import { Response, NextFunction } from 'express';
import { PayoutService } from '../services/payout.service';
import { successResponse } from '../utils/response';
import { AuthenticatedRequest } from '@lms/shared-auth';
import { bankAccountSchema, payoutRequestSchema } from '../types/payment.types';
import { ForbiddenError } from '../utils/errors';

export class PayoutController {
  constructor(private payoutService: PayoutService) {}

  addBankAccount = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      if (req.user!.role !== 'teacher' && req.user!.role !== 'super_admin') {
        throw new ForbiddenError('Only teachers can add bank accounts');
      }

      const validatedData = bankAccountSchema.parse(req.body);
      const bankAccount = await this.payoutService.addBankAccount(req.user!.id, validatedData);
      successResponse(res, 'Bank account added successfully', bankAccount, 201);
    } catch (error) {
      next(error);
    }
  };

  getBankAccounts = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const accounts = await this.payoutService.getTeacherBankAccounts(req.user!.id);
      successResponse(res, 'Bank accounts retrieved successfully', accounts);
    } catch (error) {
      next(error);
    }
  };

  updateBankAccount = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { accountId } = req.params;
      const validatedData = bankAccountSchema.partial().parse(req.body);
      const account = await this.payoutService.updateBankAccount(
        accountId,
        req.user!.id,
        validatedData
      );
      successResponse(res, 'Bank account updated successfully', account);
    } catch (error) {
      next(error);
    }
  };

  getEarnings = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const isPaid = req.query.paid ? req.query.paid === 'true' : undefined;
      const earnings = await this.payoutService.getTeacherEarnings(req.user!.id, isPaid);
      successResponse(res, 'Earnings retrieved successfully', earnings);
    } catch (error) {
      next(error);
    }
  };

  getEarningsStats = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const stats = await this.payoutService.getEarningsStats(req.user!.id);
      successResponse(res, 'Earnings stats retrieved successfully', stats);
    } catch (error) {
      next(error);
    }
  };

  requestPayout = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      if (req.user!.role !== 'teacher' && req.user!.role !== 'super_admin') {
        throw new ForbiddenError('Only teachers can request payouts');
      }

      const validatedData = payoutRequestSchema.parse(req.body);
      const payout = await this.payoutService.requestPayout(req.user!.id, validatedData);
      successResponse(res, 'Payout requested successfully', payout, 201);
    } catch (error) {
      next(error);
    }
  };

  getPayouts = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const payouts = await this.payoutService.getTeacherPayouts(req.user!.id);
      successResponse(res, 'Payouts retrieved successfully', payouts);
    } catch (error) {
      next(error);
    }
  };
}
