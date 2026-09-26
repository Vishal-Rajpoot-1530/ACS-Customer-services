import { RowDataPacket } from 'mysql2';
import { randomUUID } from 'crypto';
import { pool } from '../config/db.config';
import { IRefreshToken, withRefreshTokenMethods } from '../models/refreshToken.model';

type TokenRow = RowDataPacket & { id: string; user_id: string; token_hash: string; expires_at: Date; revoked_at?: Date; replaced_by_token_hash?: string; ip_address?: string; user_agent?: string; created_at: Date };
const mapToken = (row: TokenRow): IRefreshToken => withRefreshTokenMethods({
  id: row.id, userId: row.user_id, tokenHash: row.token_hash, expiresAt: new Date(row.expires_at),
  revokedAt: row.revoked_at ? new Date(row.revoked_at) : undefined, replacedByTokenHash: row.replaced_by_token_hash,
  ipAddress: row.ip_address, userAgent: row.user_agent, createdAt: new Date(row.created_at),
});

export class RefreshTokenRepository {
  async create(data: {
    userId: string;
    tokenHash: string;
    expiresAt: Date;
    ipAddress?: string;
    userAgent?: string;
  }): Promise<IRefreshToken> {
    const id = randomUUID();
    await pool.query(`INSERT INTO refresh_tokens (id, user_id, token_hash, expires_at, ip_address, user_agent, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)`, [id, data.userId, data.tokenHash, data.expiresAt, data.ipAddress || null, data.userAgent || null, new Date()]);
    return this.findById(id) as Promise<IRefreshToken>;
  }

  async findByTokenHash(tokenHash: string): Promise<IRefreshToken | null> {
    const [rows] = await pool.query<TokenRow[]>('SELECT * FROM refresh_tokens WHERE token_hash = ?', [tokenHash]);
    return rows[0] ? mapToken(rows[0]) : null;
  }

  async revoke(id: string, replacedByTokenHash?: string): Promise<IRefreshToken | null> {
    await pool.query('UPDATE refresh_tokens SET revoked_at = ?, replaced_by_token_hash = COALESCE(?, replaced_by_token_hash) WHERE id = ?', [new Date(), replacedByTokenHash || null, id]);
    return this.findById(id);
  }

  async revokeAllForUser(userId: string): Promise<void> {
    await pool.query('UPDATE refresh_tokens SET revoked_at = ? WHERE user_id = ? AND revoked_at IS NULL', [new Date(), userId]);
  }

  private async findById(id: string): Promise<IRefreshToken | null> {
    const [rows] = await pool.query<TokenRow[]>('SELECT * FROM refresh_tokens WHERE id = ?', [id]);
    return rows[0] ? mapToken(rows[0]) : null;
  }
}

export const refreshTokenRepository = new RefreshTokenRepository();
