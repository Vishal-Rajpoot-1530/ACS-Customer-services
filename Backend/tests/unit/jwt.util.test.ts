import {
  generateAccessToken,
  verifyAccessToken,
  generateRandomToken,
  hashToken,
} from '../../src/utils/jwt.util';
import { UserRoles } from '../../src/constants/roles.constant';

describe('JWT Utility Tests', () => {
  const payload = {
    userId: '66d84f001122334455667788',
    email: 'test@acscentre.com',
    role: UserRoles.USER,
    displayName: 'Test User',
  };

  it('should generate a valid JWT access token and decode it correctly', () => {
    const token = generateAccessToken(payload);
    expect(typeof token).toBe('string');
    expect(token.split('.').length).toBe(3);

    const decoded = verifyAccessToken(token);
    expect(decoded.userId).toBe(payload.userId);
    expect(decoded.email).toBe(payload.email);
    expect(decoded.role).toBe(payload.role);
    expect(decoded.displayName).toBe(payload.displayName);
  });

  it('should generate a secure random hex token of expected length', () => {
    const token = generateRandomToken(32);
    expect(token).toHaveLength(64); // 32 bytes in hex = 64 characters
  });

  it('should consistently hash tokens using SHA-256', () => {
    const token = 'sample_raw_refresh_token_12345';
    const hash1 = hashToken(token);
    const hash2 = hashToken(token);

    expect(hash1).toBe(hash2);
    expect(hash1).toHaveLength(64); // SHA-256 produces 64 hex characters
  });
});
