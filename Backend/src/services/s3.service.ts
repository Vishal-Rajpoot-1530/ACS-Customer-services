import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { s3Client } from '../config/s3.config';
import { env } from '../config/env.config';
import { logger } from '../config/logger.config';
import { AppError } from '../utils/appError';
import { HttpStatusCodes } from '../constants/httpStatusCodes.constant';

export class S3Service {
  private readonly bucketName = env.AWS_S3_BUCKET_NAME;

  /**
   * Uploads file buffer to AWS S3 with server-side encryption (SSE-S3)
   */
  async uploadFile(
    buffer: Buffer,
    key: string,
    mimeType: string,
    metadata?: Record<string, string>
  ): Promise<{ bucket: string; key: string }> {
    try {
      const command = new PutObjectCommand({
        Bucket: this.bucketName,
        Key: key,
        Body: buffer,
        ContentType: mimeType,
        ServerSideEncryption: 'AES256',
        Metadata: metadata,
      });

      await s3Client.send(command);
      logger.info(`File successfully uploaded to S3: s3://${this.bucketName}/${key}`);

      return {
        bucket: this.bucketName,
        key,
      };
    } catch (error: any) {
      logger.error('Failed to upload file to S3:', { error: error.message, key });
      throw new AppError(
        'Failed to securely store file in cloud storage',
        HttpStatusCodes.INTERNAL_SERVER_ERROR,
        'S3_UPLOAD_FAILED',
        error.message
      );
    }
  }

  /**
   * Generates a temporary presigned URL for secure download/viewing
   */
  async getPresignedDownloadUrl(
    key: string,
    originalName: string,
    expiresInSeconds: number = env.S3_SIGNED_URL_EXPIRES_IN
  ): Promise<string> {
    try {
      const command = new GetObjectCommand({
        Bucket: this.bucketName,
        Key: key,
        ResponseContentDisposition: `inline; filename="${encodeURIComponent(originalName)}"`,
      });

      const url = await getSignedUrl(s3Client, command, { expiresIn: expiresInSeconds });
      return url;
    } catch (error: any) {
      logger.error('Failed to generate presigned S3 URL:', { error: error.message, key });
      throw new AppError(
        'Failed to generate secure document access link',
        HttpStatusCodes.INTERNAL_SERVER_ERROR,
        'S3_PRESIGNED_URL_FAILED',
        error.message
      );
    }
  }

  /**
   * Checks whether an object exists in the S3 bucket
   */
  async checkObjectExists(key: string): Promise<boolean> {
    try {
      const command = new HeadObjectCommand({
        Bucket: this.bucketName,
        Key: key,
      });
      await s3Client.send(command);
      return true;
    } catch (error: any) {
      if (error.name === 'NotFound' || error.$metadata?.httpStatusCode === 404) {
        return false;
      }
      logger.error('Error checking S3 object existence:', { error: error.message, key });
      return false;
    }
  }

  /**
   * Deletes an object from the S3 bucket
   */
  async deleteFile(key: string): Promise<void> {
    try {
      const command = new DeleteObjectCommand({
        Bucket: this.bucketName,
        Key: key,
      });
      await s3Client.send(command);
      logger.info(`Deleted object from S3: s3://${this.bucketName}/${key}`);
    } catch (error: any) {
      logger.error('Failed to delete file from S3:', { error: error.message, key });
      throw new AppError(
        'Failed to delete file from cloud storage',
        HttpStatusCodes.INTERNAL_SERVER_ERROR,
        'S3_DELETE_FAILED',
        error.message
      );
    }
  }
}

export const s3Service = new S3Service();
