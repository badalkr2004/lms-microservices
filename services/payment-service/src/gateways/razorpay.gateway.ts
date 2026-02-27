// src/gateways/razorpay.gateway.ts
import Razorpay from 'razorpay';
import crypto from 'crypto';
import { PaymentGatewayResponse } from '../types/payment.types';

export class RazorpayGateway {
  private razorpay: Razorpay;

  constructor() {
    this.razorpay = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID!,
      key_secret: process.env.RAZORPAY_KEY_SECRET!,
    });
  }

  async createOrder(
    amount: number,
    currency: string,
    courseId: string,
    userId: string
  ): Promise<PaymentGatewayResponse> {
    try {
      const options = {
        amount: Math.round(amount * 100), // Convert to paise
        currency,
        receipt: `lms_${Date.now()}`,
        payment_capture: 1,
        notes: {
          courseId,
          userId,
        },
      };

      const order = await this.razorpay.orders.create(options);

      return {
        success: true,
        gatewayOrderId: order.id,
        metadata: {
          amount: order.amount,
          currency: order.currency,
          receipt: order.receipt,
          notes: order.notes,
        },
      };
    } catch (error) {
      console.log(error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Payment order creation failed',
      };
    }
  }

  async verifyPayment(orderId: string, paymentId: string, signature: string): Promise<boolean> {
    try {
      const hmac = crypto.createHmac('sha256', process.env.RAZORPAY_KEY_SECRET!);
      hmac.update(`${orderId}|${paymentId}`);
      const generatedSignature = hmac.digest('hex');

      return generatedSignature === signature;
    } catch (error) {
      return false;
    }
  }

  async refundPayment(paymentId: string, amount?: number): Promise<PaymentGatewayResponse> {
    try {
      const refundData: any = { payment_id: paymentId };
      if (amount) {
        refundData.amount = Math.round(amount * 100);
      }

      const refund = await this.razorpay.payments.refund(paymentId, refundData);

      return {
        success: true,
        metadata: refund,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Refund failed',
      };
    }
  }
}
