import bcrypt from 'bcrypt';
import { UserRole } from '../constants/roles.constant';

export interface IUser {
  id: string;
  _id?: string;
  email: string;
  passwordHash?: string;
  displayName: string;
  role: UserRole;
  photoURL?: string;
  isEmailVerified: boolean;
  googleId?: string;
  lastLogin: Date;
  passwordResetTokenHash?: string;
  passwordResetExpiresAt?: Date;
  createdAt: Date;
  updatedAt: Date;
  comparePassword(candidatePassword: string): Promise<boolean>;
}
export const withPasswordMethods = (user: Omit<IUser, 'comparePassword'>): IUser => ({
  ...user,
  comparePassword: async (candidatePassword: string): Promise<boolean> => {
    if (!user.passwordHash) {
      return false;
    }
    return bcrypt.compare(candidatePassword, user.passwordHash);
  },
});

export const userId = (user: { id?: string; _id?: string }): string => {
  const id = user.id || user._id;
  if (!id) {
    throw new Error('User has no identifier');
  }
  return id.toString();
};
