// src/utils/health.ts
import { db } from '@lms/database';

export interface HealthCheck {
  service: string;
  status: 'healthy' | 'unhealthy';
  timestamp: string;
  details?: any;
}

export class HealthService {
  async checkDatabase(): Promise<HealthCheck> {
    try {
      await db.execute('SELECT 1');
      return {
        service: 'database',
        status: 'healthy',
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      return {
        service: 'database',
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        details: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  async checkRedis(): Promise<HealthCheck> {
    try {
      // Implement Redis health check if using caching
      return {
        service: 'redis',
        status: 'healthy',
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      return {
        service: 'redis',
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        details: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  async getOverallHealth(): Promise<{
    status: 'healthy' | 'unhealthy';
    services: HealthCheck[];
    uptime: number;
  }> {
    const checks = await Promise.all([this.checkDatabase(), this.checkRedis()]);

    const isHealthy = checks.every(check => check.status === 'healthy');

    return {
      status: isHealthy ? 'healthy' : 'unhealthy',
      services: checks,
      uptime: process.uptime(),
    };
  }
}
