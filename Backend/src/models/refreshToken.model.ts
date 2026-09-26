export interface IRefreshToken {
  id: string;
  _id?: string;
  userId: string;
  tokenHash: string;
  expiresAt: Date;
  revokedAt?: Date;
  replacedByTokenHash?: string;
  ipAddress?: string;
  userAgent?: string;
  createdAt: Date;
  isExpired(): boolean;
  isValid(): boolean;
}

export const withRefreshTokenMethods = (token: Omit<IRefreshToken, 'isExpired' | 'isValid'>): IRefreshToken => ({
  ...token,
  isExpired: () => Date.now() >= new Date(token.expiresAt).getTime(),
  isValid: () => !token.revokedAt && Date.now() < new Date(token.expiresAt).getTime(),
});

export const refreshTokenId = (token: { id?: string; _id?: string }): string => {
  const id = token.id || token._id;
  if (!id) throw new Error('Refresh token has no identifier');
  return id.toString();
};
