// // src/services/enhanced-course.service.ts
// import { CourseService } from './course.service';
// import { CacheService } from './cache.service';
// import { CourseRepository } from '../repositories/course.repository';
// import { Course } from '@lms/database';

// export class EnhancedCourseService extends CourseService {
//   constructor(
//     courseRepository: CourseRepository,
//     private cacheService: CacheService
//   ) {
//     super(courseRepository);
//   }

//   async getCourseByIdCache(id: string, userId?: string, userRole?: string) {
//     // Try to get from cache first
//     const cacheKey = this.cacheService.generateCacheKey('course', id);
//     let course = await this.cacheService.get(cacheKey);

//     if (!course) {
//       course = await super.getCourseById(id, userId, userRole);

//       // Cache for 30 minutes if course is published
//       if (course.status === 'published') {
//         await this.cacheService.setCourse(id, course, 1800);
//       }
//     }

//     return course;
//   }

//   async getFeaturedCoursesCache(limit: number = 10) {
//     // Try cache first
//     let featuredCourses = await this.cacheService.getFeaturedCourses();

//     if (!featuredCourses) {
//       const result = await super.getFeaturedCourses(limit);
//       featuredCourses = result.courses;

//       // Cache for 15 minutes
//       await this.cacheService.setFeaturedCourses(featuredCourses as Course[], 900);
//     }

//     return { courses: featuredCourses };
//   }

//   async updateCourse(id: string, data: any, userId: string, userRole: string) {
//     const course = await super.updateCourse(id, data, userId, userRole);

//     // Invalidate cache
//     await this.cacheService.invalidateCourse(id);

//     return course;
//   }

//   async publishCourse(id: string, userId: string, userRole: string) {
//     const course = await super.publishCourse(id, userId, userRole);

//     // Invalidate cache and featured courses
//     await this.cacheService.invalidateCourse(id);
//     await this.cacheService.del('courses:featured');

//     return course;
//   }
// }
