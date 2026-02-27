import { config } from '@/config';
import axios from 'axios';

import crypto from 'crypto';

export class PaymentServiceClient {
  private baseURL: string;
  private apiKey: string;
  private secretKey: string;
  private serviceId: string;

  constructor() {
    this.baseURL = config.paymentService.url || 'http://localhost:3003';
    this.apiKey = process.env.PAYMENT_SERVICE_API_KEY!;
    this.secretKey = process.env.SERVICE_SECRET_KEY!;
    this.serviceId = 'course-service';
  }

  private generateAuthHeaders(body: any) {
    const timestamp = Math.floor(Date.now() / 1000);
    const payload = `${this.serviceId}:${timestamp}:${JSON.stringify(body)}`;
    const signature = crypto.createHmac('sha256', this.secretKey).update(payload).digest('hex');

    return {
      'x-service-api-key': this.apiKey,
      'x-service-id': this.serviceId,
      'x-timestamp': timestamp.toString(),
      'x-signature': signature,
      'Content-Type': 'application/json',
    };
  }

  async createPayment(data: any) {
    try {
      const response = await axios.post(`${this.baseURL}/api/payments/internal/create`, data, {
        headers: this.generateAuthHeaders(data),
      });
      return response.data.data;
    } catch (error) {
      throw new Error(`Payment service error: ${error}`);
    }
  }

  async getPaymentStatus(paymentId: string) {
    const response = await axios.get(`${this.baseURL}/api/payments/internal/${paymentId}`, {
      headers: this.generateAuthHeaders({}),
    });
    return response.data.data;
  }
}
