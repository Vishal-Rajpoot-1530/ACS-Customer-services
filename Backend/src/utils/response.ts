import { Response } from 'express';
import { HttpStatusCodes } from '../constants/httpStatusCodes.constant';

interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export const sendResponse = <T>(
  res: Response,
  statusCode: number,
  message: string,
  data?: T,
  pagination?: PaginationMeta
): void => {
  res.status(statusCode).json({
    success: true,
    message,
    ...(data !== undefined && { data }),
    ...(pagination !== undefined && { pagination }),
  });
};

export const sendSuccess = <T>(res: Response, message: string, data?: T): void => {
  sendResponse(res, HttpStatusCodes.OK, message, data);
};

export const sendCreated = <T>(res: Response, message: string, data?: T): void => {
  sendResponse(res, HttpStatusCodes.CREATED, message, data);
};

export const sendPaginated = <T>(
  res: Response,
  message: string,
  items: T[],
  pagination: PaginationMeta
): void => {
  sendResponse(res, HttpStatusCodes.OK, message, { items }, pagination);
};
