import { NextFunction, Request, Response } from 'express';
import { UserRole } from '../constants/roles.constant';
import { AppError } from '../utils/appError';
import { HttpStatusCodes } from '../constants/httpStatusCodes.constant';

export const authorize = (...allowedRoles: UserRole[]) => {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      return next(
        new AppError('User not authenticated', HttpStatusCodes.UNAUTHORIZED, 'UNAUTHORIZED')
      );
    }

    if (!allowedRoles.includes(req.user.role)) {
      return next(
        new AppError(
          'You do not have permission to perform this action',
          HttpStatusCodes.FORBIDDEN,
          'FORBIDDEN'
        )
      );
    }

    next();
  };
};
