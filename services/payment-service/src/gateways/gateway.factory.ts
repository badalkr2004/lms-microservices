// src/gateways/gateway.factory.ts
import { RazorpayGateway } from './razorpay.gateway';
import { StripeGateway } from './stripe.gateway';

export class PaymentGatewayFactory {
  static create(gateway: string) {
    switch (gateway) {
      case 'razorpay':
        return new RazorpayGateway();
      case 'stripe':
        return new StripeGateway();
      default:
        throw new Error(`Unsupported payment gateway: ${gateway}`);
    }
  }
}
