import rateLimit from 'express-rate-limit';
import { env } from '../config/env.config';
import { HttpStatusCodes } from '../constants/httpStatusCodes.constant';

export const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: env.NODE_ENV === 'test' ? 10000 : 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many requests from this IP, please try again after 15 minutes.',
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
    },
  },
  statusCode: HttpStatusCodes.TOO_MANY_REQUESTS,
});

export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: env.NODE_ENV === 'test' ? 10000 : 15,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many authentication attempts, please try again after 15 minutes.',
    error: {
      code: 'AUTH_RATE_LIMIT_EXCEEDED',
    },
  },
  statusCode: HttpStatusCodes.TOO_MANY_REQUESTS,
});

export const uploadLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: env.NODE_ENV === 'test' ? 10000 : 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Upload rate limit reached. Please try again later.',
    error: {
      code: 'UPLOAD_RATE_LIMIT_EXCEEDED',
    },
  },
  statusCode: HttpStatusCodes.TOO_MANY_REQUESTS,
});
