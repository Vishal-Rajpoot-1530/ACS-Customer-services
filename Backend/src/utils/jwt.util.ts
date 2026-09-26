import crypto from 'crypto';
import jwt, { SignOptions } from 'jsonwebtoken';
import { env } from '../config/env.config';
import { AuthUserPayload } from '../types/auth.types';

export const generateAccessToken = (payload: AuthUserPayload): string => {
  const options: SignOptions = {
    expiresIn: env.JWT_ACCESS_EXPIRES_IN as any,
  };
  return jwt.sign(payload, env.JWT_ACCESS_SECRET, options);
};

export const verifyAccessToken = (token: string): AuthUserPayload => {
  return jwt.verify(token, env.JWT_ACCESS_SECRET) as AuthUserPayload;
};

export const generateRandomToken = (bytes: number = 40): string => {
  return crypto.randomBytes(bytes).toString('hex');
};

export const hashToken = (token: string): string => {
  return crypto.createHash('sha256').update(token).digest('hex');
};
