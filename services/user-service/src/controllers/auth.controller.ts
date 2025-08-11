import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { db } from '@lms/database';
import { users, userProfiles, userAuthMethods } from '@lms/database';
import { eq, and } from 'drizzle-orm';
import { verifyFirebaseToken } from '../config/firebase';
import { generateTokens, verifyRefreshToken } from '../utils/jwt.utils';
import { AuthRequest } from '../types/auth.types';
import { logger } from '@lms/logger';
import { config } from '../config/config';

export class AuthController {
  // Firebase Google OAuth Sign In/Up
  async firebaseAuth(req: Request, res: Response) {
    try {
      const { firebaseToken, role = 'student' } = req.body;

      if (!firebaseToken) {
        return res.status(400).json({
          success: false,
          message: 'Firebase token is required',
        });
      }

      // Verify Firebase token
      const decodedToken = await verifyFirebaseToken(firebaseToken);
      const { uid, email, name, picture } = decodedToken;

      if (!email) {
        return res.status(400).json({
          success: false,
          message: 'Email is required for authentication',
        });
      }

      // Check if user already exists
      let existingUser = await db.select().from(users).where(eq(users.email, email)).limit(1);

      let user;
      let profile;

      if (existingUser.length > 0) {
        // Update existing user
        user = existingUser[0];

        // Update last login
        await db
          .update(users)
          .set({
            lastLogin: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          })
          .where(eq(users.id, user.id));

        // Get user profile
        const existingProfile = await db
          .select()
          .from(userProfiles)
          .where(eq(userProfiles.userId, user.id))
          .limit(1);

        profile = existingProfile[0] || null;

        // Update auth method if not exists
        const existingAuthMethod = await db
          .select()
          .from(userAuthMethods)
          .where(and(eq(userAuthMethods.userId, user.id), eq(userAuthMethods.authMethod, 'google')))
          .limit(1);

        if (existingAuthMethod.length === 0) {
          await db.insert(userAuthMethods).values({
            userId: user.id,
            authMethod: 'google',
            providerId: uid,
            providerData: { email, name, picture },
            isPrimary: true,
          });
        }
      } else {
        // Create new user
        const [newUser] = await db
          .insert(users)
          .values({
            email,
            role: role as 'student' | 'teacher' | 'super_admin',
            status: 'active',
            emailVerified: true,
            lastLogin: new Date().toISOString(),
          })
          .returning();

        user = newUser;

        // Create user profile
        const [newProfile] = await db
          .insert(userProfiles)
          .values({
            userId: user.id,
            firstName: name?.split(' ')[0] || '',
            lastName: name?.split(' ').slice(1).join(' ') || '',
            displayName: name || '',
            avatarUrl: picture || '',
          })
          .returning();

        profile = newProfile;

        // Create auth method
        await db.insert(userAuthMethods).values({
          userId: user.id,
          authMethod: 'google',
          providerId: uid,
          providerData: { email, name, picture },
          isPrimary: true,
        });
      }

      // Generate JWT tokens
      const tokens = generateTokens({
        userId: user.id,
        email: user.email,
        role: user.role,
      });

      res.json({
        success: true,
        message: 'Authentication successful',
        data: {
          user: {
            id: user.id,
            email: user.email,
            role: user.role,
            status: user.status,
            emailVerified: user.emailVerified,
            profile,
          },
          tokens,
        },
      });
    } catch (error) {
      logger.error('Firebase authentication error:', error);
      res.status(500).json({
        success: false,
        message: 'Authentication failed',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  // Email/Password Registration
  async register(req: Request, res: Response) {
    try {
      const { email, password, role = 'student', firstName, lastName, phone } = req.body;

      // Check if user already exists
      const existingUser = await db.select().from(users).where(eq(users.email, email)).limit(1);

      if (existingUser.length > 0) {
        return res.status(400).json({
          success: false,
          message: 'User already exists with this email',
        });
      }

      // Hash password
      const passwordHash = await bcrypt.hash(password, config.bcrypt.saltRounds);

      // Create user
      const [newUser] = await db
        .insert(users)
        .values({
          email,
          phone: phone || null,
          passwordHash,
          role: role as 'student' | 'teacher' | 'super_admin',
          status: 'pending_verification',
          emailVerified: false,
        })
        .returning();

      // Create user profile
      const [newProfile] = await db
        .insert(userProfiles)
        .values({
          userId: newUser.id,
          firstName: firstName || '',
          lastName: lastName || '',
          displayName: `${firstName || ''} ${lastName || ''}`.trim(),
        })
        .returning();

      // Create auth method
      await db.insert(userAuthMethods).values({
        userId: newUser.id,
        authMethod: 'email',
        isPrimary: true,
      });

      // Generate tokens
      const tokens = generateTokens({
        userId: newUser.id,
        email: newUser.email,
        role: newUser.role,
      });

      res.status(201).json({
        success: true,
        message: 'User registered successfully',
        data: {
          user: {
            id: newUser.id,
            email: newUser.email,
            role: newUser.role,
            status: newUser.status,
            emailVerified: newUser.emailVerified,
            profile: newProfile,
          },
          tokens,
        },
      });
    } catch (error) {
      logger.error('Registration error:', error);
      res.status(500).json({
        success: false,
        message: 'Registration failed',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  // Email/Password Login
  async login(req: Request, res: Response) {
    try {
      const { email, password } = req.body;

      // Find user
      const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);

      if (!user) {
        return res.status(401).json({
          success: false,
          message: 'Invalid credentials',
        });
      }

      // Check if account is locked
      if (user.lockedUntil && new Date(user.lockedUntil) > new Date()) {
        return res.status(423).json({
          success: false,
          message: 'Account is temporarily locked. Please try again later.',
        });
      }

      // Verify password
      if (!user.passwordHash || !(await bcrypt.compare(password, user.passwordHash))) {
        // Increment login attempts
        const newAttempts = (user.loginAttempts || 0) + 1;
        const updateData: any = {
          loginAttempts: newAttempts,
          updatedAt: new Date().toISOString(),
        };

        // Lock account after 5 failed attempts for 15 minutes
        if (newAttempts >= 5) {
          updateData.lockedUntil = new Date(Date.now() + 15 * 60 * 1000).toISOString();
        }

        await db.update(users).set(updateData).where(eq(users.id, user.id));

        return res.status(401).json({
          success: false,
          message: 'Invalid credentials',
        });
      }

      // Reset login attempts and update last login
      await db
        .update(users)
        .set({
          loginAttempts: 0,
          lockedUntil: null,
          lastLogin: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        })
        .where(eq(users.id, user.id));

      // Get user profile
      const [profile] = await db
        .select()
        .from(userProfiles)
        .where(eq(userProfiles.userId, user.id))
        .limit(1);

      // Generate tokens
      const tokens = generateTokens({
        userId: user.id,
        email: user.email,
        role: user.role,
      });

      res.json({
        success: true,
        message: 'Login successful',
        data: {
          user: {
            id: user.id,
            email: user.email,
            role: user.role,
            status: user.status,
            emailVerified: user.emailVerified,
            profile: profile || null,
          },
          tokens,
        },
      });
    } catch (error) {
      logger.error('Login error:', error);
      res.status(500).json({
        success: false,
        message: 'Login failed',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  // Refresh Token
  async refreshToken(req: Request, res: Response) {
    try {
      const { refreshToken } = req.body;

      if (!refreshToken) {
        return res.status(400).json({
          success: false,
          message: 'Refresh token is required',
        });
      }

      const decoded = verifyRefreshToken(refreshToken);

      // Verify user still exists
      const [user] = await db.select().from(users).where(eq(users.id, decoded.userId)).limit(1);

      if (!user) {
        return res.status(401).json({
          success: false,
          message: 'User not found',
        });
      }

      // Generate new tokens
      const tokens = generateTokens({
        userId: user.id,
        email: user.email,
        role: user.role,
      });

      res.json({
        success: true,
        message: 'Token refreshed successfully',
        data: { tokens },
      });
    } catch (error) {
      logger.error('Token refresh error:', error);
      res.status(401).json({
        success: false,
        message: 'Invalid refresh token',
      });
    }
  }

  // Get current user
  async me(req: AuthRequest, res: Response) {
    try {
      const userId = req.user?.userId;

      const [user] = await db.select().from(users).where(eq(users.id, userId!)).limit(1);

      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found',
        });
      }

      const [profile] = await db
        .select()
        .from(userProfiles)
        .where(eq(userProfiles.userId, user.id))
        .limit(1);

      res.json({
        success: true,
        data: {
          user: {
            id: user.id,
            email: user.email,
            role: user.role,
            status: user.status,
            emailVerified: user.emailVerified,
            profile: profile || null,
          },
        },
      });
    } catch (error) {
      logger.error('Get user error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get user information',
      });
    }
  }
}
