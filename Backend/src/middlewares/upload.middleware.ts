import multer from 'multer';
import { env } from '../config/env.config';
import { AppError } from '../utils/appError';
import { HttpStatusCodes } from '../constants/httpStatusCodes.constant';
import { ALLOWED_EXTENSIONS, isAllowedMimeType } from '../utils/fileSecurity.util';
import path from 'path';

const storage = multer.memoryStorage();

const maxFileSizeBytes = env.MAX_FILE_SIZE_MB * 1024 * 1024;

const fileFilter = (
  _req: Express.Request,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback
): void => {
  const ext = path.extname(file.originalname).replace('.', '').toLowerCase();

  if (!ALLOWED_EXTENSIONS.has(ext)) {
    return cb(
      new AppError(
        `File extension .${ext} is not permitted.`,
        HttpStatusCodes.BAD_REQUEST,
        'INVALID_FILE_EXTENSION'
      ) as any,
      false
    );
  }

  if (!isAllowedMimeType(file.mimetype, ext)) {
    return cb(
      new AppError(
        `File MIME type '${file.mimetype}' is not permitted.`,
        HttpStatusCodes.BAD_REQUEST,
        'INVALID_MIME_TYPE'
      ) as any,
      false
    );
  }

  cb(null, true);
};

export const uploadDocuments = multer({
  storage,
  limits: {
    fileSize: maxFileSizeBytes,
    files: 20,
  },
  fileFilter,
}).array('file', 20);
