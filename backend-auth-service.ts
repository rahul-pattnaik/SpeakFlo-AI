// backend/src/services/auth/AuthService.ts
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import db from '../../config/database';
import redis from '../../config/redis';
import logger from '../../utils/logger';
import { AppError } from '../../utils/errorHandler';
import { JWTService } from './JWTService';

export interface RegisterInput {
  email: string;
  password: string;
  full_name: string;
  phone_number?: string;
  auth_provider: 'email' | 'google' | 'github' | 'clerk';
  auth_provider_id?: string;
}

export interface LoginInput {
  email: string;
  password: string;
}

export interface TokenPayload {
  userId: string;
  email: string;
  iat: number;
  exp: number;
}

export interface AuthResponse {
  success: boolean;
  user: {
    id: string;
    email: string;
    full_name: string;
    english_level: string;
    subscription_tier: string;
  };
  tokens: {
    access_token: string;
    refresh_token: string;
    expires_in: number;
  };
}

export class AuthService {
  private jwtService = new JWTService();
  private readonly SALT_ROUNDS = 12;
  private readonly PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;

  /**
   * Register new user
   */
  async register(input: RegisterInput): Promise<AuthResponse> {
    try {
      // Validate email format
      if (!this.isValidEmail(input.email)) {
        throw new AppError('Invalid email format', 400);
      }

      // Check if user already exists
      const existingUser = await db.query(
        'SELECT id FROM users WHERE email = $1',
        [input.email]
      );

      if (existingUser.rows.length > 0) {
        throw new AppError('User with this email already exists', 409);
      }

      // Validate password if email auth
      if (input.auth_provider === 'email') {
        if (!this.isValidPassword(input.password)) {
          throw new AppError(
            'Password must be at least 8 characters with uppercase, lowercase, number and special character',
            400
          );
        }
      }

      // Hash password
      const passwordHash = input.password 
        ? await bcrypt.hash(input.password, this.SALT_ROUNDS)
        : null;

      // Create user
      const userId = uuidv4();
      const now = new Date();

      const result = await db.query(
        `INSERT INTO users (
          id, email, full_name, phone_number, auth_provider, 
          auth_provider_id, english_level, password_hash,
          created_at, updated_at, email_verified
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        RETURNING id, email, full_name, english_level, subscription_tier`,
        [
          userId,
          input.email.toLowerCase(),
          input.full_name,
          input.phone_number || null,
          input.auth_provider,
          input.auth_provider_id || null,
          'beginner',
          passwordHash,
          now,
          now,
          input.auth_provider !== 'email', // Auto-verify OAuth users
        ]
      );

      const user = result.rows[0];

      // Create user preferences
      await db.query(
        `INSERT INTO user_preferences (user_id, created_at, updated_at)
         VALUES ($1, $2, $3)`,
        [userId, now, now]
      );

      // Create user progress
      await db.query(
        `INSERT INTO user_progress (user_id, created_at)
         VALUES ($1, $2)`,
        [userId, now]
      );

      // Generate tokens
      const tokens = this.jwtService.generateTokens(userId, input.email);

      // Store refresh token in Redis with expiry
      await redis.setex(
        `refresh_token:${userId}`,
        7 * 24 * 60 * 60, // 7 days
        tokens.refresh_token
      );

      logger.info(`User registered: ${input.email} (${userId})`);

      return {
        success: true,
        user,
        tokens,
      };
    } catch (error) {
      logger.error('Registration error:', error);
      throw error;
    }
  }

  /**
   * Login user with email/password
   */
  async login(input: LoginInput): Promise<AuthResponse> {
    try {
      // Find user by email
      const result = await db.query(
        `SELECT id, email, full_name, password_hash, english_level, 
                subscription_tier, is_active, email_verified, last_login_at
         FROM users WHERE email = $1`,
        [input.email.toLowerCase()]
      );

      if (result.rows.length === 0) {
        throw new AppError('Invalid email or password', 401);
      }

      const user = result.rows[0];

      // Check if user is active
      if (!user.is_active) {
        throw new AppError('Account has been deactivated', 403);
      }

      // Verify password
      const isPasswordValid = await bcrypt.compare(input.password, user.password_hash);
      if (!isPasswordValid) {
        throw new AppError('Invalid email or password', 401);
      }

      // Update last login
      await db.query(
        'UPDATE users SET last_login_at = NOW() WHERE id = $1',
        [user.id]
      );

      // Generate tokens
      const tokens = this.jwtService.generateTokens(user.id, user.email);

      // Store refresh token in Redis
      await redis.setex(
        `refresh_token:${user.id}`,
        7 * 24 * 60 * 60,
        tokens.refresh_token
      );

      logger.info(`User logged in: ${input.email}`);

      return {
        success: true,
        user: {
          id: user.id,
          email: user.email,
          full_name: user.full_name,
          english_level: user.english_level,
          subscription_tier: user.subscription_tier,
        },
        tokens,
      };
    } catch (error) {
      logger.error('Login error:', error);
      throw error;
    }
  }

  /**
   * Refresh access token
   */
  async refreshToken(refreshToken: string): Promise<{ access_token: string; expires_in: number }> {
    try {
      // Verify refresh token
      const decoded = this.jwtService.verifyRefreshToken(refreshToken);

      // Check if refresh token exists in Redis
      const storedToken = await redis.get(`refresh_token:${decoded.userId}`);
      if (!storedToken || storedToken !== refreshToken) {
        throw new AppError('Invalid refresh token', 401);
      }

      // Generate new access token
      const accessToken = this.jwtService.generateAccessToken(decoded.userId, decoded.email);

      return {
        access_token: accessToken,
        expires_in: 15 * 60, // 15 minutes
      };
    } catch (error) {
      logger.error('Token refresh error:', error);
      throw new AppError('Invalid refresh token', 401);
    }
  }

  /**
   * Logout user (invalidate refresh token)
   */
  async logout(userId: string): Promise<void> {
    try {
      await redis.del(`refresh_token:${userId}`);
      logger.info(`User logged out: ${userId}`);
    } catch (error) {
      logger.error('Logout error:', error);
      throw error;
    }
  }

  /**
   * Send password reset email
   */
  async requestPasswordReset(email: string): Promise<void> {
    try {
      const result = await db.query(
        'SELECT id, email FROM users WHERE email = $1',
        [email.toLowerCase()]
      );

      if (result.rows.length === 0) {
        // Don't reveal if email exists (security)
        logger.info(`Password reset requested for non-existent email: ${email}`);
        return;
      }

      const user = result.rows[0];
      const resetToken = jwt.sign(
        { userId: user.id, email: user.email, type: 'password_reset' },
        process.env.JWT_SECRET!,
        { expiresIn: '1h' }
      );

      // Store reset token in Redis (1 hour expiry)
      await redis.setex(
        `password_reset:${user.id}`,
        3600,
        resetToken
      );

      // Send email with reset link
      // await EmailService.sendPasswordReset(user.email, resetToken);

      logger.info(`Password reset requested: ${email}`);
    } catch (error) {
      logger.error('Password reset request error:', error);
      throw error;
    }
  }

  /**
   * Reset password with token
   */
  async resetPassword(token: string, newPassword: string): Promise<void> {
    try {
      // Verify token
      const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;
      
      if (decoded.type !== 'password_reset') {
        throw new AppError('Invalid token', 400);
      }

      // Check if token exists in Redis
      const storedToken = await redis.get(`password_reset:${decoded.userId}`);
      if (!storedToken || storedToken !== token) {
        throw new AppError('Invalid or expired reset token', 401);
      }

      // Validate password
      if (!this.isValidPassword(newPassword)) {
        throw new AppError(
          'Password must be at least 8 characters with uppercase, lowercase, number and special character',
          400
        );
      }

      // Hash new password
      const passwordHash = await bcrypt.hash(newPassword, this.SALT_ROUNDS);

      // Update password
      await db.query(
        'UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2',
        [passwordHash, decoded.userId]
      );

      // Remove reset token
      await redis.del(`password_reset:${decoded.userId}`);

      logger.info(`Password reset successful: ${decoded.userId}`);
    } catch (error) {
      logger.error('Password reset error:', error);
      throw error;
    }
  }

  /**
   * Verify email
   */
  async verifyEmail(token: string): Promise<void> {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;

      if (decoded.type !== 'email_verification') {
        throw new AppError('Invalid token', 400);
      }

      await db.query(
        'UPDATE users SET email_verified = true, updated_at = NOW() WHERE id = $1',
        [decoded.userId]
      );

      logger.info(`Email verified: ${decoded.userId}`);
    } catch (error) {
      logger.error('Email verification error:', error);
      throw error;
    }
  }

  /**
   * Helper: Validate email format
   */
  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Helper: Validate password strength
   */
  private isValidPassword(password: string): boolean {
    return this.PASSWORD_REGEX.test(password);
  }
}

export default new AuthService();
