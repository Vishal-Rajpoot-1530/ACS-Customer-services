import {
  validateFileMagicBytes,
  sanitizeFilename,
  buildS3ObjectKey,
  ALLOWED_EXTENSIONS,
  ALLOWED_MIME_TYPES,
  isAllowedMimeType,
} from '../../src/utils/fileSecurity.util';

describe('File Security Utility Tests', () => {
  describe('validateFileMagicBytes', () => {
    it('should validate valid PDF magic bytes (%PDF)', () => {
      const pdfBuffer = Buffer.from([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x34]);
      expect(validateFileMagicBytes(pdfBuffer, 'pdf')).toBe(true);
    });

    it('should reject invalid PDF magic bytes', () => {
      const fakeBuffer = Buffer.from([0x4d, 0x5a, 0x90, 0x00]); // DOS / EXE header
      expect(validateFileMagicBytes(fakeBuffer, 'pdf')).toBe(false);
    });

    it('should validate valid PNG magic bytes', () => {
      const pngBuffer = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
      expect(validateFileMagicBytes(pngBuffer, 'png')).toBe(true);
    });

    it('should validate valid JPEG magic bytes', () => {
      const jpegBuffer = Buffer.from([0xff, 0xd8, 0xff, 0xe0]);
      expect(validateFileMagicBytes(jpegBuffer, 'jpg')).toBe(true);
      expect(validateFileMagicBytes(jpegBuffer, 'jpeg')).toBe(true);
    });
  });

  describe('sanitizeFilename', () => {
    it('should sanitize dangerous path traversal characters', () => {
      const dangerous = '../../../etc/passwd.pdf';
      const clean = sanitizeFilename(dangerous);
      expect(clean).not.toContain('..');
      expect(clean).not.toContain('/');
      expect(clean.endsWith('.pdf')).toBe(true);
    });

    it('should replace special characters with underscores', () => {
      const dirty = 'my file @ document #1 [final].docx';
      const clean = sanitizeFilename(dirty);
      expect(clean).toBe('my_file___document__1__final_.docx');
    });
  });

  describe('buildS3ObjectKey', () => {
    it('should construct key in format documents/{userId}/{YYYY}/{MM}/{uuid}-{filename}', () => {
      const userId = 'user-123';
      const filename = 'resume.pdf';
      const key = buildS3ObjectKey(userId, filename);

      const now = new Date();
      const year = now.getUTCFullYear().toString();
      const month = String(now.getUTCMonth() + 1).padStart(2, '0');

      expect(key.startsWith(`documents/${userId}/${year}/${month}/`)).toBe(true);
      expect(key.endsWith('-resume.pdf')).toBe(true);
    });
  });

  describe('Allowed types', () => {
    it('should include all required frontend document extensions', () => {
      expect(ALLOWED_EXTENSIONS.has('pdf')).toBe(true);
      expect(ALLOWED_EXTENSIONS.has('doc')).toBe(true);
      expect(ALLOWED_EXTENSIONS.has('docx')).toBe(true);
      expect(ALLOWED_EXTENSIONS.has('xls')).toBe(true);
      expect(ALLOWED_EXTENSIONS.has('xlsx')).toBe(true);
      expect(ALLOWED_EXTENSIONS.has('png')).toBe(true);
      expect(ALLOWED_EXTENSIONS.has('jpg')).toBe(true);
      expect(ALLOWED_EXTENSIONS.has('txt')).toBe(true);
    });

    it('should not allow dangerous executable extensions', () => {
      expect(ALLOWED_EXTENSIONS.has('exe')).toBe(false);
      expect(ALLOWED_EXTENSIONS.has('sh')).toBe(false);
      expect(ALLOWED_EXTENSIONS.has('bat')).toBe(false);
      expect(ALLOWED_EXTENSIONS.has('php')).toBe(false);
    });

    it('should include correct MIME types', () => {
      expect(ALLOWED_MIME_TYPES.has('application/pdf')).toBe(true);
      expect(ALLOWED_MIME_TYPES.has('image/png')).toBe(true);
    });

    it('should accept video MIME variants for video extensions', () => {
      expect(isAllowedMimeType('video/mp4', 'mp4')).toBe(true);
      expect(isAllowedMimeType('video/x-m4v', 'm4v')).toBe(true);
      expect(isAllowedMimeType('application/octet-stream', 'mp4')).toBe(true);
      expect(isAllowedMimeType('video/mp4', 'pdf')).toBe(false);
    });
  });
});
