import { UserRole } from '../constants/roles.constant';

export interface AuthUserPayload {
  userId: string;
  email: string;
  role: UserRole;
  displayName: string;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

export interface AuthenticatedUserResponse {
  id: string;
  email: string;
  displayName: string;
  role: UserRole;
  photoURL?: string;
  isEmailVerified: boolean;
  lastLogin: Date;
}
