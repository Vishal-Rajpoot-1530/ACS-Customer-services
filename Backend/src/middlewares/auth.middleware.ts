import { NextFunction, Request, Response } from 'express';
import { verifyAccessToken } from '../utils/jwt.util';
import { AppError } from '../utils/appError';
import { HttpStatusCodes } from '../constants/httpStatusCodes.constant';

export const authenticate = (req: Request, _res: Response, next: NextFunction): void => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next(
      new AppError(
        'Authentication required. Please provide a valid Bearer token.',
        HttpStatusCodes.UNAUTHORIZED,
        'UNAUTHORIZED'
      )
    );
  }

  const token = authHeader.split(' ')[1];

  try {
    const payload = verifyAccessToken(token);
    req.user = payload;
    next();
  } catch (error: any) {
    if (error.name === 'TokenExpiredError') {
      return next(
        new AppError('Access token has expired', HttpStatusCodes.UNAUTHORIZED, 'TOKEN_EXPIRED')
      );
    }
    return next(
      new AppError('Invalid access token', HttpStatusCodes.UNAUTHORIZED, 'INVALID_TOKEN')
    );
  }
};

export const optionalAuthenticate = (req: Request, _res: Response, next: NextFunction): void => {
  const authHeader = req.headers.authorization;

  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];
    try {
      const payload = verifyAccessToken(token);
      req.user = payload;
    } catch {
      // Ignore token errors for optional authentication
    }
  }

  next();
};
