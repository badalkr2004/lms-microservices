import crypto from 'crypto';
import axios from 'axios';
export class CourseServiceClient {
  private baseURL: string;
  private apiKey: string;
  private secretKey: string;
  private serviceId: string;

  constructor() {
    this.baseURL = process.env.COURSE_SERVICE_URL || 'http://localhost:3002';
    this.apiKey = process.env.COURSE_SERVICE_API_KEY!;
    this.secretKey = process.env.SERVICE_SECRET_KEY!;
    this.serviceId = 'course-service';
  }

  private generateAuthHeaders(body: any) {
    const timestamp = Date.now().toString();
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

  async completeEnrollment(enrollmentId: string, paymentId: string) {
    const data = { enrollmentId, paymentId };

    const response = await axios.post(`${this.baseURL}/api/enrollments/internal/complete`, data, {
      headers: this.generateAuthHeaders(data),
    });

    return response.data.data;
  }

  async getCourseDetails(courseId: string) {
    console.log('Payment:', courseId);
    const response = await axios.get(`${this.baseURL}/internal/course/${courseId}`, {
      headers: this.generateAuthHeaders(courseId),
    });
    return response.data.data;
  }
}
