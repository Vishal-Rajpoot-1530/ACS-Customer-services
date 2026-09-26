import { NextFunction, Request, Response } from 'express';
import { authService } from '../services/auth.service';
import { sendCreated, sendSuccess } from '../utils/response';
import { UserRoles } from '../constants/roles.constant';
import { userRepository } from '../repositories/user.repository';

export class AuthController {
  async getAdminStatus(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const adminAvailable = await userRepository.countAdmins() === 0;
      sendSuccess(res, 'Administrator availability retrieved', { adminAvailable });
    } catch (error) {
      next(error);
    }
  }

  async register(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { email, password, displayName, photoURL, role } = req.body;
      const ip = req.ip;
      const userAgent = req.headers['user-agent'];

      const normalizedRole = role
        ? role.toUpperCase() === 'ADMIN'
          ? UserRoles.ADMIN
          : UserRoles.USER
        : undefined;

      const result = await authService.register(
        { email, password, displayName, photoURL, role: normalizedRole },
        ip,
        userAgent
      );

      sendCreated(res, 'User registered successfully', result);
    } catch (error) {
      next(error);
    }
  }

  async login(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { email, password } = req.body;
      const ip = req.ip;
      const userAgent = req.headers['user-agent'];

      const result = await authService.login({ email, password }, ip, userAgent);

      sendSuccess(res, 'Login successful', result);
    } catch (error) {
      next(error);
    }
  }

  async refreshTokens(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { refreshToken } = req.body;
      const ip = req.ip;
      const userAgent = req.headers['user-agent'];

      const newTokens = await authService.refreshTokens(refreshToken, ip, userAgent);

      sendSuccess(res, 'Tokens refreshed successfully', newTokens);
    } catch (error) {
      next(error);
    }
  }

  async getMe(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.userId;
      const user = await authService.getMe(userId);

      sendSuccess(res, 'Profile fetched successfully', { user });
    } catch (error) {
      next(error);
    }
  }

  async logout(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { refreshToken } = req.body;
      await authService.logout(refreshToken);

      sendSuccess(res, 'Logged out successfully');
    } catch (error) {
      next(error);
    }
  }

  async changePassword(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.userId;
      const { currentPassword, newPassword } = req.body;

      await authService.changePassword(userId, currentPassword, newPassword);

      sendSuccess(res, 'Password changed successfully. All other sessions terminated.');
    } catch (error) {
      next(error);
    }
  }
}

export const authController = new AuthController();
