import request from 'supertest';
import { app } from '../../src/app';
import { userRepository } from '../../src/repositories/user.repository';
import { refreshTokenRepository } from '../../src/repositories/refreshToken.repository';
import { UserRoles } from '../../src/constants/roles.constant';
import bcrypt from 'bcrypt';

describe('Auth API Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/v1/auth/register', () => {
    it('should register a new user successfully with valid inputs', async () => {
      jest.spyOn(userRepository, 'findByEmail').mockResolvedValueOnce(null);
      const createUserSpy = jest.spyOn(userRepository, 'create').mockResolvedValueOnce({
        _id: '66d84f001122334455667788',
        email: 'newuser@acscentre.com',
        displayName: 'Rahul Sharma',
        role: UserRoles.USER,
        photoURL: '',
        isEmailVerified: false,
        lastLogin: new Date(),
      } as any);

      jest.spyOn(refreshTokenRepository, 'create').mockResolvedValueOnce({} as any);

      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({
          email: 'newuser@acscentre.com',
          password: 'Password123!',
          displayName: 'Rahul Sharma',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.user.email).toBe('newuser@acscentre.com');
      expect(createUserSpy).toHaveBeenCalledWith(expect.objectContaining({ role: UserRoles.USER }));
      expect(res.body.data.tokens.accessToken).toBeDefined();
      expect(res.body.data.tokens.refreshToken).toBeDefined();
    });

    it('should allow the first administrator account', async () => {
      jest.spyOn(userRepository, 'findByEmail').mockResolvedValueOnce(null);
      jest.spyOn(userRepository, 'countAdmins').mockResolvedValueOnce(0);
      jest.spyOn(userRepository, 'create').mockResolvedValueOnce({
        _id: '66d84f001122334455667701',
        email: 'first.admin@acscentre.com',
        displayName: 'First Admin',
        role: UserRoles.ADMIN,
        photoURL: '',
        isEmailVerified: false,
        lastLogin: new Date(),
      } as any);
      jest.spyOn(refreshTokenRepository, 'create').mockResolvedValueOnce({} as any);

      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({
          email: 'first.admin@acscentre.com',
          password: 'Password123!',
          displayName: 'First Admin',
          role: 'ADMIN',
        });

      expect(res.status).toBe(201);
      expect(res.body.data.user.role).toBe('ADMIN');
    });

    it('should reject creating another administrator', async () => {
      jest.spyOn(userRepository, 'findByEmail').mockResolvedValueOnce(null);
      jest.spyOn(userRepository, 'countAdmins').mockResolvedValueOnce(1);

      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({
          email: 'second.admin@acscentre.com',
          password: 'Password123!',
          displayName: 'Second Admin',
          role: 'ADMIN',
        });

      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe('ADMIN_EXISTS');
    });

    it('should fail with 400 when password is weak or invalid', async () => {
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({
          email: 'weakpass@acscentre.com',
          password: '123', // too short, no uppercase
          displayName: 'Rahul',
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should fail with 409 Conflict when email already exists', async () => {
      jest.spyOn(userRepository, 'findByEmail').mockResolvedValueOnce({
        email: 'existing@acscentre.com',
      } as any);

      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({
          email: 'existing@acscentre.com',
          password: 'Password123!',
          displayName: 'Existing User',
        });

      expect(res.status).toBe(409);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('EMAIL_EXISTS');
    });
  });

  describe('POST /api/v1/auth/login', () => {
    it('should login successfully with correct credentials', async () => {
      const passwordHash = await bcrypt.hash('Password123!', 10);
      const mockUser = {
        _id: '66d84f001122334455667788',
        email: 'loginuser@acscentre.com',
        passwordHash,
        displayName: 'Login User',
        role: UserRoles.USER,
        isEmailVerified: true,
        lastLogin: new Date(),
        comparePassword: jest.fn().mockResolvedValue(true),
      };

      jest.spyOn(userRepository, 'findByEmail').mockResolvedValueOnce(mockUser as any);
      jest.spyOn(userRepository, 'updateLastLogin').mockResolvedValueOnce(undefined);
      jest.spyOn(refreshTokenRepository, 'create').mockResolvedValueOnce({} as any);

      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'loginuser@acscentre.com',
          password: 'Password123!',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.tokens.accessToken).toBeDefined();
    });

    it('should fail with 401 when password does not match', async () => {
      const mockUser = {
        _id: '66d84f001122334455667788',
        email: 'loginuser@acscentre.com',
        comparePassword: jest.fn().mockResolvedValue(false),
      };

      jest.spyOn(userRepository, 'findByEmail').mockResolvedValueOnce(mockUser as any);

      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'loginuser@acscentre.com',
          password: 'WrongPassword!',
        });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('INVALID_CREDENTIALS');
    });
  });

});
