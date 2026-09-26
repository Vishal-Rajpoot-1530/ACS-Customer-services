process.env.NODE_ENV = 'test';
process.env.PORT = '5001';
process.env.MYSQL_HOST = '127.0.0.1';
process.env.MYSQL_PORT = '3306';
process.env.MYSQL_USER = 'root';
process.env.MYSQL_PASSWORD = 'test_password';
process.env.MYSQL_DATABASE = 'acs_test';
process.env.JWT_ACCESS_SECRET = 'test_jwt_access_secret_min_32_characters_12345';
process.env.JWT_ACCESS_EXPIRES_IN = '15m';
process.env.JWT_REFRESH_SECRET = 'test_jwt_refresh_secret_min_64_characters_abcde_12345';
process.env.JWT_REFRESH_EXPIRES_IN = '7d';
process.env.AWS_REGION = 'ap-south-1';
process.env.AWS_ACCESS_KEY_ID = 'AKIAIOSFODNN7TEST';
process.env.AWS_SECRET_ACCESS_KEY = 'test_secret_key_12345';
process.env.AWS_S3_BUCKET_NAME = 'acs-customer-documents-test';
process.env.FRONTEND_URL = 'https://acs-customer-service-centre-1.vercel.app';
process.env.COOKIE_SECRET = 'test_cookie_secret_998877';
process.env.MAX_FILE_SIZE_MB = '25';
process.env.LOG_LEVEL = 'error';

beforeAll(() => {
  jest.clearAllMocks();
});

afterAll(() => {
  jest.restoreAllMocks();
});
