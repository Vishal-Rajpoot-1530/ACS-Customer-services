import { NextFunction, Request, Response } from 'express';
import { userService } from '../services/user.service';
import { sendSuccess } from '../utils/response';
import { ExplorerStateInput } from '../types/explorer.types';

export class UserController {
  async getExplorer(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const explorer = await userService.getExplorer(req.user!.userId);
      sendSuccess(res, 'Explorer state retrieved successfully', explorer);
    } catch (error) {
      next(error);
    }
  }

  async saveExplorer(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const explorer = await userService.saveExplorer(req.user!.userId, req.body as ExplorerStateInput);
      sendSuccess(res, 'Explorer state saved successfully', explorer);
    } catch (error) {
      next(error);
    }
  }

  async updateProfile(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.userId;
      const { displayName, photoURL } = req.body;

      const updatedUser = await userService.updateProfile(userId, { displayName, photoURL });

      sendSuccess(res, 'Profile updated successfully', { user: updatedUser });
    } catch (error) {
      next(error);
    }
  }
}

export const userController = new UserController();
