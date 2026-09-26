import { NextFunction, Request, Response } from 'express';
import { AnyZodObject, ZodError } from 'zod';
import { AppError } from '../utils/appError';
import { HttpStatusCodes } from '../constants/httpStatusCodes.constant';

export const validateRequest = (schema: AnyZodObject) => {
  return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    try {
      const parsed = await schema.parseAsync({
        body: req.body,
        query: req.query,
        params: req.params,
      });

      req.body = parsed.body || req.body;
      req.query = parsed.query || req.query;
      req.params = parsed.params || req.params;

      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const details = error.errors.map((e) => ({
          path: e.path.join('.'),
          message: e.message,
        }));
        next(
          new AppError(
            'Request validation failed',
            HttpStatusCodes.BAD_REQUEST,
            'VALIDATION_ERROR',
            details
          )
        );
      } else {
        next(error);
      }
    }
  };
};
