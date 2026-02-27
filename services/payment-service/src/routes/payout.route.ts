// src/routes/payout.routes.ts
import { Router } from 'express';
import { PayoutController } from '../controllers/payout.controller';
import { PayoutService } from '../services/payout.service';
import { PayoutRepository } from '../repositories/payout.repository';
// import { authenticate } from '@lms/shared-auth';

const router: Router = Router();

// Initialize dependencies
const payoutRepository = new PayoutRepository();
const payoutService = new PayoutService(payoutRepository);
const payoutController = new PayoutController(payoutService);

// Bank account routes
router.post('/bank-accounts', payoutController.addBankAccount);
router.get('/bank-accounts', payoutController.getBankAccounts);
router.patch('/bank-accounts/:accountId', payoutController.updateBankAccount);

// Earnings routes
router.get('/earnings', payoutController.getEarnings);
router.get('/earnings/stats', payoutController.getEarningsStats);

// Payout routes
router.post('/payouts', payoutController.requestPayout);
router.get('/payouts', payoutController.getPayouts);

export { router as payoutRoutes };
