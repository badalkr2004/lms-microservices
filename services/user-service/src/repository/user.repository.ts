// repository/user.repository.ts
import { db, users, userProfiles, followers } from '@lms/database';
import { eq, and, or, count, sql, like } from 'drizzle-orm';
import { PaginationMeta } from '@lms/common';

export interface UserProfile {
  firstName: string | null;
  lastName: string | null;
  displayName: string | null;
  email: string;
  avatarUrl: string | null;
  followingCount: number;
}

export class UserRepository {
  /**
   * Get student profile with basic info and following count
   * Returns: name, email, avatar url, number of teachers following
   */
  async getUserProfile(userId: string): Promise<any | null> {
    try {
      const result = await db
        .select()
        .from(userProfiles)
        .innerJoin(users, eq(userProfiles.userId, users.id))
        .where(eq(userProfiles.userId, userId))
        .limit(1);

      if (!result[0]) return null;

      // Get the base data
      const userData = result[0];

      const [followingCountResult] = await db
        .select({ count: count() })
        .from(followers)
        .where(eq(followers.followerId, userId));

      const [followersCountResult] = await db
        .select({ count: count() })
        .from(followers)
        .where(eq(followers.followingId, userId));

      return {
        ...userData.user_profiles,
        ...userData.users,
        followingCount: followingCountResult?.count || 0,
        followersCount: followersCountResult?.count || 0,
      };
    } catch (error) {
      console.error('Error fetching user profile:', error);
      throw new Error('Failed to fetch user profile');
    }
  }

  /**
   * Update user profile
   */
  // async updateUserProfile(userId: string, profile: UserProfile): Promise<void> {
  //   try {
  //     await db.update(userProfiles).set(profile).where(eq(userProfiles.userId, userId));
  //   } catch (error) {
  //     console.error('Error updating user profile:', error);
  //     throw new Error('Failed to update user profile');
  //   }
  // }

  /**
   * Get users lists with pagination
   */
  async getUsersLists(page: number, limit: number, search: string, role: 'student' | 'teacher'): Promise<any> {
    try {
      const offset = (page - 1) * limit;
      const result = await db
        .select({
          id: users.id,
          email: users.email,
          phone: users.phone,
          firstName: userProfiles.firstName,
          lastName: userProfiles.lastName,
          displayName: userProfiles.displayName,
          avatarUrl: userProfiles.avatarUrl,
          role: users.role,
        })
        .from(users)
        .innerJoin(userProfiles, eq(users.id, userProfiles.userId))
        .limit(limit)
        .offset(offset)
        .where(
          and(
            eq(users.role, role),
            search ? or(
              like(users.email, `%${search}%`),
              like(users.phone, `%${search}%`),
              like(userProfiles.firstName, `%${search}%`),
              like(userProfiles.lastName, `%${search}%`)
            ) : undefined
          )
        );
      const total = await db
        .select({ count: count() })
        .from(users)
        .innerJoin(userProfiles, eq(users.id, userProfiles.userId))
        .where(
          and(
            eq(users.role, role),
            search ? or(
              like(users.email, `%${search}%`),
              like(users.phone, `%${search}%`),
              like(userProfiles.firstName, `%${search}%`),
              like(userProfiles.lastName, `%${search}%`)
            ) : undefined
          )
        );
      const totalPages = Math.ceil(total[0].count / limit);
      const paginationMeta: PaginationMeta = {
        total: total[0].count,
        page: page,
        limit: limit,
        pages: totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      };
      return {
        data: result,
        meta: paginationMeta,
      };
    } catch (error) {
      console.error('Error fetching users lists:', error);
      throw new Error('Failed to fetch users lists');
    }
  }

  /**
   * Check if a student is following a teacher
   */
  async isFollowing(studentId: string, teacherId: string): Promise<boolean> {
    try {
      const result = await db
        .select({ id: followers.id })
        .from(followers)
        .where(and(eq(followers.followerId, studentId), eq(followers.followingId, teacherId)))
        .limit(1);

      return result.length > 0;
    } catch (error) {
      console.error('Error checking follow status:', error);
      throw new Error('Failed to check follow status');
    }
  }

  /**
   * Follow a teacher (student only)
   */
  async followTeacher(studentId: string, teacherId: string): Promise<void> {
    try {
      await db.insert(followers).values({
        followerId: studentId,
        followingId: teacherId,
      });
    } catch (error) {
      console.error('Error following teacher:', error);

      // Handle unique constraint violation
      if (error instanceof Error && error.message.includes('unique')) {
        throw new Error('Already following this teacher');
      }

      throw new Error('Failed to follow teacher');
    }
  }

  /**
   * Unfollow a teacher
   */
  async unfollowTeacher(studentId: string, teacherId: string): Promise<boolean> {
    try {
      const result = await db
        .delete(followers)
        .where(and(eq(followers.followerId, studentId), eq(followers.followingId, teacherId)))
        .returning({ id: followers.id });

      return result.length > 0;
    } catch (error) {
      console.error('Error unfollowing teacher:', error);
      throw new Error('Failed to unfollow teacher');
    }
  }

  /**
   * Get user basic info by ID (for validation)
   */
  async getUserById(userId: string) {
    try {
      const result = await db
        .select({
          id: users.id,
          email: users.email,
          role: users.role,
          status: users.status,
        })
        .from(users)
        .where(eq(users.id, userId))
        .limit(1);

      return result[0] || null;
    } catch (error) {
      console.error('Error fetching user by ID:', error);
      throw new Error('Failed to fetch user');
    }
  }

  /**
   * Validate that student can follow teacher
   */
  async validateFollowOperation(
    studentId: string,
    teacherId: string
  ): Promise<{
    student: any;
    teacher: any;
  }> {
    try {
      const [student, teacher] = await Promise.all([
        this.getUserById(studentId),
        this.getUserById(teacherId),
      ]);

      if (!student) {
        throw new Error('Student not found');
      }

      if (!teacher) {
        throw new Error('Teacher not found');
      }

      if (student.role !== 'student') {
        throw new Error('Only students can follow teachers');
      }

      if (teacher.role !== 'teacher') {
        throw new Error('Students can only follow teachers');
      }

      if (student.status !== 'active' || teacher.status !== 'active') {
        throw new Error('User account is not active');
      }

      return { student, teacher };
    } catch (error) {
      console.error('Error validating follow operation:', error);
      throw error;
    }
  }
}
