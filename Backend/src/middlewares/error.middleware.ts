import { NextFunction, Request, Response } from 'express';
import multer from 'multer';
import { HttpStatusCodes } from '../constants/httpStatusCodes.constant';
import { logger } from '../config/logger.config';
import { env } from '../config/env.config';

export const errorHandler = (
  err: any,
  req: Request,
  res: Response,
  _next: NextFunction
): void => {
  let statusCode = err.statusCode || HttpStatusCodes.INTERNAL_SERVER_ERROR;
  let errorCode = err.errorCode || 'INTERNAL_SERVER_ERROR';
  let message = err.message || 'An unexpected error occurred';
  let details = err.details || undefined;

  // Handle Multer Errors
  if (err instanceof multer.MulterError) {
    statusCode = HttpStatusCodes.BAD_REQUEST;
    if (err.code === 'LIMIT_FILE_SIZE') {
      errorCode = 'FILE_TOO_LARGE';
      message = `File exceeds maximum allowed size of ${env.MAX_FILE_SIZE_MB}MB`;
    } else {
      errorCode = 'MULTER_ERROR';
      message = err.message;
    }
  }

  // Handle MySQL duplicate key errors.
  if (err.code === 'ER_DUP_ENTRY') {
    statusCode = HttpStatusCodes.CONFLICT;
    errorCode = 'DUPLICATE_KEY_ERROR';
    message = 'A duplicate value was entered for a unique field.';
  }

  // Handle JSON Syntax Error in body
  if (err instanceof SyntaxError && 'body' in err) {
    statusCode = HttpStatusCodes.BAD_REQUEST;
    errorCode = 'INVALID_JSON';
    message = 'Malformed JSON payload in request body';
  }

  // Log operational client errors (400, 401, 403, 404) vs internal server errors (500+)
  if (statusCode >= 500) {
    logger.error(`[Server Error] [${req.id || 'N/A'}] ${req.method} ${req.originalUrl}: ${message}`, {
      statusCode,
      errorCode,
      details,
      stack: env.NODE_ENV !== 'production' ? err.stack : undefined,
    });
  } else if (statusCode === 401) {
    logger.info(`[Auth Notice] [${req.id || 'N/A'}] ${req.method} ${req.originalUrl}: ${message} (${errorCode})`);
  } else {
    logger.warn(`[Client Notice] [${req.id || 'N/A'}] ${req.method} ${req.originalUrl}: ${message} (${errorCode})`);
  }

  // Prepare response payload
  const errorPayload: any = {
    code: errorCode,
  };

  if (details) {
    errorPayload.details = details;
  }

  if (env.NODE_ENV !== 'production' && err.stack) {
    errorPayload.stack = err.stack;
  }

  res.status(statusCode).json({
    success: false,
    message,
    error: errorPayload,
  });
};
