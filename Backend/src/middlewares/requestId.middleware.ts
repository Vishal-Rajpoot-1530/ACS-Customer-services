import { NextFunction, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';

export const requestIdMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  const requestId = (req.headers['x-request-id'] as string) || uuidv4();
  req.id = requestId;
  res.setHeader('X-Request-Id', requestId);
  next();
};
