// src/services/cache.service.ts
import Redis from 'ioredis';
import { config } from '../config';
import { Course } from '@lms/database';

export class CacheService {
  private redis: Redis;
  private readonly defaultTTL = 3600; // 1 hour

  constructor() {
    this.redis = new Redis(config.redis.url);
  }

  async get<T>(key: string): Promise<T | null> {
    try {
      const data = await this.redis.get(key);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error('Cache get error:', error);
      return null;
    }
  }

  async set(key: string, value: any, ttl: number = this.defaultTTL): Promise<boolean> {
    try {
      await this.redis.setex(key, ttl, JSON.stringify(value));
      return true;
    } catch (error) {
      console.error('Cache set error:', error);
      return false;
    }
  }

  async del(key: string | string[]): Promise<boolean> {
    try {
      if (Array.isArray(key)) {
        await this.redis.del(...key);
      } else {
        await this.redis.del(key);
      }
      return true;
    } catch (error) {
      console.error('Cache delete error:', error);
      return false;
    }
  }

  async invalidatePattern(pattern: string): Promise<boolean> {
    try {
      const keys = await this.redis.keys(pattern);
      if (keys.length > 0) {
        await this.redis.del(...keys);
      }
      return true;
    } catch (error) {
      console.error('Cache invalidate pattern error:', error);
      return false;
    }
  }

  // Course-specific cache methods
  async getCourse(id: string) {
    return await this.get(`course:${id}`);
  }

  async setCourse(id: string, course: any, ttl: number = 1800) {
    return await this.set(`course:${id}`, course, ttl);
  }

  async invalidateCourse(id: string) {
    const patterns = [
      `course:${id}`,
      `course:${id}:*`,
      `courses:teacher:*`,
      `courses:category:*`,
      `courses:featured`,
    ];

    for (const pattern of patterns) {
      await this.invalidatePattern(pattern);
    }
  }

  async getFeaturedCourses() {
    return await this.get('courses:featured');
  }

  async setFeaturedCourses(courses: Course[], ttl: number = 900) {
    return await this.set('courses:featured', courses, ttl);
  }

  generateCacheKey(...parts: string[]): string {
    return parts.join(':');
  }
}
