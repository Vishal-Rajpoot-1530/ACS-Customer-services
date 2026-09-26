import bcrypt from 'bcrypt';
import { userRepository } from '../repositories/user.repository';
import { refreshTokenRepository } from '../repositories/refreshToken.repository';
import { generateAccessToken, generateRandomToken, hashToken } from '../utils/jwt.util';
import { AppError } from '../utils/appError';
import { HttpStatusCodes } from '../constants/httpStatusCodes.constant';
import { UserRole, UserRoles } from '../constants/roles.constant';
import { AuthenticatedUserResponse, TokenPair } from '../types/auth.types';
import { IUser, userId as getUserId } from '../models/user.model';
import { refreshTokenId } from '../models/refreshToken.model';

export class AuthService {
  private formatUserResponse(user: IUser): AuthenticatedUserResponse {
    return {
      id: getUserId(user),
      email: user.email,
      displayName: user.displayName,
      role: user.role,
      photoURL: user.photoURL,
      isEmailVerified: user.isEmailVerified,
      lastLogin: user.lastLogin,
    };
  }

  private async createSession(
    user: IUser,
    ipAddress?: string,
    userAgent?: string
  ): Promise<TokenPair> {
    const accessToken = generateAccessToken({
      userId: getUserId(user),
      email: user.email,
      role: user.role,
      displayName: user.displayName,
    });

    const rawRefreshToken = generateRandomToken(40);
    const tokenHash = hashToken(rawRefreshToken);

    // 7 days expiration
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    await refreshTokenRepository.create({
      userId: getUserId(user),
      tokenHash,
      expiresAt,
      ipAddress,
      userAgent,
    });

    return {
      accessToken,
      refreshToken: rawRefreshToken,
    };
  }

  async register(
    data: {
      email: string;
      password?: string;
      displayName: string;
      photoURL?: string;
      role?: UserRole;
    },
    ipAddress?: string,
    userAgent?: string
  ): Promise<{ user: AuthenticatedUserResponse; tokens: TokenPair }> {
    const existingUser = await userRepository.findByEmail(data.email);
    if (existingUser) {
      throw new AppError('Email address is already registered', HttpStatusCodes.CONFLICT, 'EMAIL_EXISTS');
    }

    if (data.role === UserRoles.ADMIN && await userRepository.countAdmins() > 0) {
      throw new AppError('An administrator account already exists. Create a customer account instead.', HttpStatusCodes.CONFLICT, 'ADMIN_EXISTS');
    }

    let passwordHash: string | undefined;
    if (data.password) {
      passwordHash = await bcrypt.hash(data.password, 12);
    }

    const newUser = await userRepository.create({
      email: data.email,
      passwordHash,
      displayName: data.displayName,
      role: data.role || UserRoles.USER,
      photoURL: data.photoURL || '',
      isEmailVerified: false,
    });

    const tokens = await this.createSession(newUser, ipAddress, userAgent);

    return {
      user: this.formatUserResponse(newUser),
      tokens,
    };
  }

  async login(
    data: { email: string; password?: string },
    ipAddress?: string,
    userAgent?: string
  ): Promise<{ user: AuthenticatedUserResponse; tokens: TokenPair }> {
    const identifier = data.email.trim();
    const user = await userRepository.findByEmail(identifier) || await userRepository.findById(identifier);
    if (!user) {
      throw new AppError('Invalid email or password', HttpStatusCodes.UNAUTHORIZED, 'INVALID_CREDENTIALS');
    }

    if (data.password) {
      const isMatch = await user.comparePassword(data.password);
      if (!isMatch) {
        throw new AppError('Invalid email or password', HttpStatusCodes.UNAUTHORIZED, 'INVALID_CREDENTIALS');
      }
    }

    await userRepository.updateLastLogin(getUserId(user));
    const tokens = await this.createSession(user, ipAddress, userAgent);

    return {
      user: this.formatUserResponse(user),
      tokens,
    };
  }

  async refreshTokens(
    rawRefreshToken: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<TokenPair> {
    if (!rawRefreshToken) {
      throw new AppError('Refresh token is required', HttpStatusCodes.BAD_REQUEST, 'TOKEN_REQUIRED');
    }

    const tokenHash = hashToken(rawRefreshToken);
    const existingToken = await refreshTokenRepository.findByTokenHash(tokenHash);

    if (!existingToken) {
      throw new AppError('Invalid refresh token', HttpStatusCodes.UNAUTHORIZED, 'INVALID_TOKEN');
    }

    // Reuse detection: if token is already revoked, revoke all tokens for this user
    if (existingToken.revokedAt) {
      await refreshTokenRepository.revokeAllForUser(existingToken.userId.toString());
      throw new AppError(
        'Compromised refresh token detected. All sessions invalidated.',
        HttpStatusCodes.UNAUTHORIZED,
        'TOKEN_COMPROMISED'
      );
    }

    if (existingToken.isExpired()) {
      throw new AppError('Refresh token has expired', HttpStatusCodes.UNAUTHORIZED, 'TOKEN_EXPIRED');
    }

    const user = await userRepository.findById(existingToken.userId.toString());
    if (!user) {
      throw new AppError('User not found', HttpStatusCodes.NOT_FOUND, 'USER_NOT_FOUND');
    }

    // Token rotation
    const newTokens = await this.createSession(user, ipAddress, userAgent);
    const newTokenHash = hashToken(newTokens.refreshToken);

    await refreshTokenRepository.revoke(refreshTokenId(existingToken), newTokenHash);

    return newTokens;
  }

  async logout(rawRefreshToken?: string): Promise<void> {
    if (rawRefreshToken) {
      const tokenHash = hashToken(rawRefreshToken);
      const token = await refreshTokenRepository.findByTokenHash(tokenHash);
      if (token) {
        await refreshTokenRepository.revoke(refreshTokenId(token));
      }
    }
  }

  async changePassword(
    userId: string,
    currentPass: string,
    newPass: string
  ): Promise<void> {
    const user = await userRepository.findById(userId);
    if (!user) {
      throw new AppError('User not found', HttpStatusCodes.NOT_FOUND, 'USER_NOT_FOUND');
    }

    if (user.passwordHash) {
      const isMatch = await user.comparePassword(currentPass);
      if (!isMatch) {
        throw new AppError('Incorrect current password', HttpStatusCodes.BAD_REQUEST, 'INVALID_CURRENT_PASSWORD');
      }
    }

    await userRepository.updateById(getUserId(user), { passwordHash: await bcrypt.hash(newPass, 12) });

    // Revoke all existing sessions for security
    await refreshTokenRepository.revokeAllForUser(userId);
  }

  async getMe(userId: string): Promise<AuthenticatedUserResponse> {
    const user = await userRepository.findById(userId);
    if (!user) {
      throw new AppError('User not found', HttpStatusCodes.NOT_FOUND, 'USER_NOT_FOUND');
    }
    return this.formatUserResponse(user);
  }
}

export const authService = new AuthService();
