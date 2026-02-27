// src/gateways/stripe.gateway.ts
import Stripe from 'stripe';
import { PaymentGatewayResponse } from '../types/payment.types';

export class StripeGateway {
  private stripe: Stripe;

  constructor() {
    this.stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
      apiVersion: '2025-06-30.basil',
    });
  }

  async createPaymentIntent(
    amount: number,
    currency: string,
    courseId: string,
    userId: string
  ): Promise<PaymentGatewayResponse> {
    try {
      const paymentIntent = await this.stripe.paymentIntents.create({
        amount: Math.round(amount * 100),
        currency: currency.toLowerCase(),
        metadata: {
          courseId,
          userId,
        },
        automatic_payment_methods: {
          enabled: true,
        },
      });

      return {
        success: true,
        gatewayOrderId: paymentIntent.id,
        metadata: {
          client_secret: paymentIntent.client_secret,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Payment intent creation failed',
      };
    }
  }

  async verifyPayment(paymentIntentId: string): Promise<boolean> {
    try {
      const paymentIntent = await this.stripe.paymentIntents.retrieve(paymentIntentId);
      return paymentIntent.status === 'succeeded';
    } catch (error) {
      return false;
    }
  }

  async refundPayment(paymentIntentId: string, amount?: number): Promise<PaymentGatewayResponse> {
    try {
      const refundData: any = { payment_intent: paymentIntentId };
      if (amount) {
        refundData.amount = Math.round(amount * 100);
      }

      const refund = await this.stripe.refunds.create(refundData);

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
