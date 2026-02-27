// src/routes/payment.routes.ts
import { Router } from 'express';
import { PaymentController } from '../controllers/payment.controller';
import { PaymentService } from '../services/payment.service';
import { PaymentRepository } from '../repositories/payment.repository';
import { PayoutRepository } from '../repositories/payout.repository';
import { CourseServiceClient } from '../client/course.client';
import { protectPaymentCreate, protectPaymentRead } from '@/middleware/auth';
// import { authenticate } from '@lms/shared-auth';

const router: Router = Router();

// Initialize dependencies
const paymentRepository = new PaymentRepository();
const payoutRepository = new PayoutRepository();
const enrollmentClient = new CourseServiceClient();
const paymentService = new PaymentService(paymentRepository, payoutRepository, enrollmentClient);
const paymentController = new PaymentController(paymentService);

// Payment routes
router.post('/', ...protectPaymentCreate, paymentController.createPayment);
router.post('/:paymentId/verify', ...protectPaymentRead, paymentController.verifyPayment);
router.post('/:paymentId/refund', ...protectPaymentRead, paymentController.refundPayment);
router.get('/my-payments', ...protectPaymentRead, paymentController.getUserPayments);

export { router as paymentRoutes };
