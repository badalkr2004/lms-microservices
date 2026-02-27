// src/services/payout.service.ts
import { PayoutRepository } from '../repositories/payout.repository';
import { NotFoundError, BadRequestError, ForbiddenError } from '../utils/errors';
import { BankAccountRequest, PayoutRequest } from '../types/payment.types';

export class PayoutService {
  constructor(private payoutRepository: PayoutRepository) {}

  // Bank Account Management
  async addBankAccount(teacherId: string, data: BankAccountRequest) {
    // If this is marked as primary, unset other primary accounts
    if (data.isPrimary) {
      const existingAccounts = await this.payoutRepository.findTeacherBankAccounts(teacherId);
      for (const account of existingAccounts) {
        if (account.isPrimary) {
          await this.payoutRepository.updateBankAccount(account.id, { isPrimary: false });
        }
      }
    }

    const accountData = {
      teacherId,
      ...data,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    return await this.payoutRepository.createBankAccount(accountData);
  }

  async getTeacherBankAccounts(teacherId: string) {
    return await this.payoutRepository.findTeacherBankAccounts(teacherId);
  }

  async updateBankAccount(accountId: string, teacherId: string, data: Partial<BankAccountRequest>) {
    const accounts = await this.payoutRepository.findTeacherBankAccounts(teacherId);
    const account = accounts.find(acc => acc.id === accountId);

    if (!account) {
      throw new NotFoundError('Bank account not found');
    }

    // If setting as primary, unset others
    if (data.isPrimary) {
      for (const acc of accounts) {
        if (acc.isPrimary && acc.id !== accountId) {
          await this.payoutRepository.updateBankAccount(acc.id, { isPrimary: false });
        }
      }
    }

    return await this.payoutRepository.updateBankAccount(accountId, data);
  }

  // Earnings Management
  async getTeacherEarnings(teacherId: string, isPaid?: boolean) {
    return await this.payoutRepository.findTeacherEarnings(teacherId, isPaid);
  }

  async getEarningsStats(teacherId: string) {
    return await this.payoutRepository.getTeacherEarningsStats(teacherId);
  }

  // Payout Management
  async requestPayout(teacherId: string, data: PayoutRequest) {
    // Check if bank account exists and belongs to teacher
    const bankAccounts = await this.payoutRepository.findTeacherBankAccounts(teacherId);
    const bankAccount = bankAccounts.find(acc => acc.id === data.bankAccountId);

    if (!bankAccount) {
      throw new NotFoundError('Bank account not found');
    }

    if (!bankAccount.isVerified) {
      throw new BadRequestError('Bank account is not verified');
    }

    // Check available earnings
    const pendingEarnings = await this.payoutRepository.findTeacherEarnings(teacherId, false);
    const availableAmount = pendingEarnings.reduce(
      (sum, earning) => sum + parseFloat(earning.netAmount),
      0
    );

    if (data.amount > availableAmount) {
      throw new BadRequestError('Insufficient earnings balance');
    }

    // Check minimum payout amount
    const minPayoutAmount = parseFloat(process.env.MIN_PAYOUT_AMOUNT || '100');
    if (data.amount < minPayoutAmount) {
      throw new BadRequestError(`Minimum payout amount is ${minPayoutAmount}`);
    }

    // Create payout request
    const payoutData = {
      teacherId,
      bankAccountId: data.bankAccountId,
      amount: data.amount.toFixed(2),
      currency: data.currency,
      status: 'pending' as const,
      requestedAt: new Date().toISOString(),
    };

    return await this.payoutRepository.createPayout(payoutData);
  }

  async getTeacherPayouts(teacherId: string) {
    return await this.payoutRepository.findTeacherPayouts(teacherId);
  }

  async processPayout(payoutId: string) {
    // This would integrate with actual payout processing
    // For now, simulate processing

    const processedData = {
      status: 'completed' as const,
      processedAt: new Date().toISOString(),
      transactionId: `TXN_${Date.now()}`,
    };

    const payout = await this.payoutRepository.updatePayout(payoutId, processedData);

    // Mark earnings as paid
    const pendingEarnings = await this.payoutRepository.findTeacherEarnings(
      payout.teacherId,
      false
    );
    const earningIds = pendingEarnings.map(earning => earning.id);

    await this.payoutRepository.markEarningsAsPaid(payout.teacherId, payoutId, earningIds);

    return payout;
  }
}
