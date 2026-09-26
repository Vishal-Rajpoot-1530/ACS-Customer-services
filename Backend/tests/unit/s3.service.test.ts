import { S3Service } from '../../src/services/s3.service';
import { s3Client } from '../../src/config/s3.config';
import * as presigner from '@aws-sdk/s3-request-presigner';

jest.mock('@aws-sdk/s3-request-presigner', () => ({
  getSignedUrl: jest.fn(),
}));

describe('S3 Service Tests', () => {
  let s3Service: S3Service;

  beforeEach(() => {
    s3Service = new S3Service();
    jest.clearAllMocks();
  });

  it('should upload a file buffer to S3 using PutObjectCommand', async () => {
    const mockSend = jest
      .spyOn(s3Client, 'send')
      .mockImplementation((() => Promise.resolve({})) as any);

    const buffer = Buffer.from('%PDF-1.4 sample content');
    const key = 'documents/user1/2026/09/uuid-file.pdf';
    const mimeType = 'application/pdf';

    const result = await s3Service.uploadFile(buffer, key, mimeType);

    expect(mockSend).toHaveBeenCalledTimes(1);
    expect(result.key).toBe(key);
    expect(result.bucket).toBeDefined();
  });

  it('should generate a presigned download URL', async () => {
    const fakeUrl = 'https://s3.ap-south-1.amazonaws.com/test-bucket/test-file.pdf?AWSAccessKeyId=...';
    (presigner.getSignedUrl as jest.Mock).mockResolvedValueOnce(fakeUrl);

    const url = await s3Service.getPresignedDownloadUrl('documents/test.pdf', 'test.pdf', 300);

    expect(url).toBe(fakeUrl);
    expect(presigner.getSignedUrl).toHaveBeenCalledTimes(1);
  });

  it('should delete an S3 object using DeleteObjectCommand', async () => {
    const mockSend = jest
      .spyOn(s3Client, 'send')
      .mockImplementation((() => Promise.resolve({})) as any);

    await s3Service.deleteFile('documents/test.pdf');

    expect(mockSend).toHaveBeenCalledTimes(1);
  });
});
