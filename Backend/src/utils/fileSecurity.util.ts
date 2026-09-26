import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { AppError } from './appError';
import { HttpStatusCodes } from '../constants/httpStatusCodes.constant';

export const ALLOWED_EXTENSIONS = new Set([
  // Documents & Spreadsheets
  'pdf',
  'doc',
  'docx',
  'xls',
  'xlsx',
  'ppt',
  'pptx',
  'csv',
  'rtf',
  'odt',
  // Images
  'png',
  'jpg',
  'jpeg',
  'webp',
  'svg',
  'gif',
  'bmp',
  'ico',
  'tiff',
  // Video Formats
  'mp4',
  'mkv',
  'avi',
  'mov',
  'webm',
  '3gp',
  'wmv',
  'flv',
  'm4v',
  'ogv',
  // Audio Formats
  'mp3',
  'wav',
  'ogg',
  'm4a',
  'aac',
  'flac',
  'opus',
  'weba',
  'wma',
  'aiff',
  // Text & Data
  'txt',
  'json',
  'xml',
  'log',
  'md',
  'html',
]);

export const ALLOWED_MIME_TYPES = new Set([
  // Documents & Spreadsheets
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'application/rtf',
  'application/vnd.oasis.opendocument.text',
  'text/csv',
  // Images
  'image/png',
  'image/jpeg',
  'image/webp',
  'image/svg+xml',
  'image/gif',
  'image/bmp',
  'image/x-icon',
  'image/vnd.microsoft.icon',
  'image/tiff',
  // Video Formats
  'video/mp4',
  'video/webm',
  'video/quicktime',
  'video/x-matroska',
  'video/x-msvideo',
  'video/3gpp',
  'video/x-ms-wmv',
  'video/x-flv',
  'video/ogg',
  // Audio Formats
  'audio/mpeg',
  'audio/mp3',
  'audio/wav',
  'audio/wave',
  'audio/x-wav',
  'audio/ogg',
  'audio/mp4',
  'audio/x-m4a',
  'audio/aac',
  'audio/flac',
  'audio/opus',
  'audio/webm',
  'audio/x-ms-wma',
  'audio/aiff',
  'audio/x-aiff',
  // Text & Code
  'text/plain',
  'application/json',
  'application/xml',
  'text/xml',
  'text/markdown',
  'text/html',
  // Generic binary streams for media upload interoperability
  'application/octet-stream',
]);

const VIDEO_EXTENSIONS = new Set([
  'mp4',
  'mkv',
  'avi',
  'mov',
  'webm',
  '3gp',
  'wmv',
  'flv',
  'm4v',
  'ogv',
]);

export const isAllowedMimeType = (mimeType: string, extension: string): boolean => {
  if (mimeType.startsWith('video/')) {
    return VIDEO_EXTENSIONS.has(extension);
  }

  if (ALLOWED_MIME_TYPES.has(mimeType)) return true;

  // Some browsers and multipart clients report video files with a vendor or generic MIME type.
  return false;
};

/**
 * Validates file buffer magic bytes for common sensitive formats
 */
export const validateFileMagicBytes = (buffer: Buffer, extension: string): boolean => {
  if (!buffer || buffer.length < 4) {
    return false;
  }

  const ext = extension.toLowerCase();

  switch (ext) {
    case 'pdf': {
      // %PDF (25 50 44 46)
      return buffer[0] === 0x25 && buffer[1] === 0x50 && buffer[2] === 0x44 && buffer[3] === 0x46;
    }
    case 'png': {
      // 89 50 4E 47 0D 0A 1A 0A
      return (
        buffer[0] === 0x89 &&
        buffer[1] === 0x50 &&
        buffer[2] === 0x4e &&
        buffer[3] === 0x47
      );
    }
    case 'jpg':
    case 'jpeg': {
      // FF D8 FF
      return buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
    }
    case 'gif': {
      // GIF87a or GIF89a (47 49 46 38)
      return buffer[0] === 0x47 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x38;
    }
    case 'webp': {
      // RIFF....WEBP
      const isRiff = buffer[0] === 0x52 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x46;
      if (!isRiff || buffer.length < 12) return false;
      return (
        buffer[8] === 0x57 &&
        buffer[9] === 0x45 &&
        buffer[10] === 0x42 &&
        buffer[11] === 0x50
      );
    }
    case 'docx':
    case 'xlsx':
    case 'pptx': {
      // PK.. (ZIP archive: 50 4B 03 04)
      return buffer[0] === 0x50 && buffer[1] === 0x4b && buffer[2] === 0x03 && buffer[3] === 0x04;
    }
    case 'mp4':
    case 'm4v':
    case 'mov':
    case '3gp': {
      if (buffer.length < 8) return false;
      const boxType = buffer.toString('utf8', 4, 8);
      return (
        ['ftyp', 'moov', 'mdat', 'wide', 'skip', 'free'].includes(boxType) ||
        (buffer[0] === 0x00 && buffer[1] === 0x00)
      );
    }
    case 'webm':
    case 'mkv': {
      // EBML header 1A 45 DF A3
      return buffer[0] === 0x1a && buffer[1] === 0x45 && buffer[2] === 0xdf && buffer[3] === 0xa3;
    }
    case 'mp3': {
      const hasId3 = buffer[0] === 0x49 && buffer[1] === 0x44 && buffer[2] === 0x33;
      const hasSync = buffer[0] === 0xff && (buffer[1] & 0xe0) === 0xe0;
      return hasId3 || hasSync;
    }
    case 'wav': {
      const isRiff = buffer[0] === 0x52 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x46;
      if (!isRiff || buffer.length < 12) return false;
      return buffer.toString('utf8', 8, 12) === 'WAVE';
    }
    default:
      // Media / Text formats - return true for recognized safe non-executable extensions
      return true;
  }
};

/**
 * Sanitizes original filename to prevent directory traversal and special character issues
 */
export const sanitizeFilename = (filename: string): string => {
  const parsed = path.parse(filename);
  const cleanName = parsed.name.replace(/[^a-zA-Z0-9_-]/g, '_').substring(0, 80);
  const cleanExt = parsed.ext.toLowerCase();
  return `${cleanName || 'document'}${cleanExt}`;
};

/**
 * Builds standard secure S3 object key
 * Format: documents/{userId}/{YYYY}/{MM}/{uniqueId}-{safeFilename}
 */
export const buildS3ObjectKey = (userId: string, safeFilename: string): string => {
  const now = new Date();
  const year = now.getUTCFullYear();
  const month = String(now.getUTCMonth() + 1).padStart(2, '0');
  const uniqueId = uuidv4();
  return `documents/${userId}/${year}/${month}/${uniqueId}-${safeFilename}`;
};

/**
 * Validates uploaded file metadata and contents
 */
export const validateUploadedFile = (file?: Express.Multer.File): void => {
  if (!file) {
    throw new AppError('No file was uploaded', HttpStatusCodes.BAD_REQUEST, 'NO_FILE_UPLOADED');
  }

  const ext = path.extname(file.originalname).replace('.', '').toLowerCase();

  if (!ALLOWED_EXTENSIONS.has(ext)) {
    throw new AppError(
      `File extension .${ext} is not allowed. Supported formats: PDF, Word, Excel, Presentations, Images, Audio, Video, and Text files.`,
      HttpStatusCodes.BAD_REQUEST,
      'INVALID_FILE_EXTENSION'
    );
  }

  if (!isAllowedMimeType(file.mimetype, ext)) {
    throw new AppError(
      `File MIME type '${file.mimetype}' is not supported.`,
      HttpStatusCodes.BAD_REQUEST,
      'INVALID_MIME_TYPE'
    );
  }

  const isMagicValid = validateFileMagicBytes(file.buffer, ext);
  if (!isMagicValid) {
    throw new AppError(
      `File contents do not match extension .${ext} signature (corrupt or disguised file).`,
      HttpStatusCodes.BAD_REQUEST,
      'FILE_SIGNATURE_MISMATCH'
    );
  }
};
