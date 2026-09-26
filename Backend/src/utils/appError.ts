import { HttpStatusCode, HttpStatusCodes } from '../constants/httpStatusCodes.constant';

export class AppError extends Error {
  public readonly statusCode: HttpStatusCode;
  public readonly errorCode: string;
  public readonly isOperational: boolean;
  public readonly details?: any;

  constructor(
    message: string,
    statusCode: HttpStatusCode = HttpStatusCodes.INTERNAL_SERVER_ERROR,
    errorCode: string = 'INTERNAL_SERVER_ERROR',
    details?: any
  ) {
    super(message);
    this.statusCode = statusCode;
    this.errorCode = errorCode;
    this.isOperational = true;
    this.details = details;

    Object.setPrototypeOf(this, new.target.prototype);
    Error.captureStackTrace(this, this.constructor);
  }
}
