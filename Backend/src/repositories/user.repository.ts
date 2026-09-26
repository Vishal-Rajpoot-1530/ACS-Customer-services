import { ResultSetHeader, RowDataPacket } from 'mysql2';
import { randomUUID } from 'crypto';
import { pool } from '../config/db.config';
import { IUser, withPasswordMethods } from '../models/user.model';

type UserRow = RowDataPacket & {
  id: string; email: string; password_hash?: string; display_name: string; role: IUser['role'];
  photo_url?: string; is_email_verified: number | boolean; google_id?: string; last_login: Date;
  password_reset_token_hash?: string; password_reset_expires_at?: Date; created_at: Date; updated_at: Date;
};

const mapUser = (row: UserRow): IUser => withPasswordMethods({
  id: row.id, email: row.email, passwordHash: row.password_hash || undefined, displayName: row.display_name,
  role: row.role, photoURL: row.photo_url || '', isEmailVerified: Boolean(row.is_email_verified),
  googleId: row.google_id || undefined, lastLogin: new Date(row.last_login),
  passwordResetTokenHash: row.password_reset_token_hash || undefined,
  passwordResetExpiresAt: row.password_reset_expires_at ? new Date(row.password_reset_expires_at) : undefined,
  createdAt: new Date(row.created_at), updatedAt: new Date(row.updated_at),
});

export class UserRepository {
  async findById(id: string): Promise<IUser | null> {
    const [rows] = await pool.query<UserRow[]>('SELECT * FROM users WHERE id = ?', [id]);
    return rows[0] ? mapUser(rows[0]) : null;
  }

  async findByEmail(email: string): Promise<IUser | null> {
    const [rows] = await pool.query<UserRow[]>('SELECT * FROM users WHERE email = ?', [email.toLowerCase().trim()]);
    return rows[0] ? mapUser(rows[0]) : null;
  }

  async findByGoogleId(googleId: string): Promise<IUser | null> {
    const [rows] = await pool.query<UserRow[]>('SELECT * FROM users WHERE google_id = ?', [googleId]);
    return rows[0] ? mapUser(rows[0]) : null;
  }

  async create(userData: Partial<IUser>): Promise<IUser> {
    const id = randomUUID();
    const now = new Date();
    await pool.query<ResultSetHeader>(
      `INSERT INTO users (id, email, password_hash, display_name, role, photo_url, is_email_verified, google_id, last_login, password_reset_token_hash, password_reset_expires_at, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, userData.email!.toLowerCase().trim(), userData.passwordHash || null, userData.displayName, userData.role || 'USER', userData.photoURL || '', userData.isEmailVerified ?? false, userData.googleId || null, userData.lastLogin || now, userData.passwordResetTokenHash || null, userData.passwordResetExpiresAt || null, now, now]
    );
    return this.findById(id) as Promise<IUser>;
  }

  async findAll(): Promise<IUser[]> {
    const [rows] = await pool.query<UserRow[]>('SELECT * FROM users ORDER BY created_at DESC');
    return rows.map(mapUser);
  }

  async deleteById(id: string): Promise<IUser | null> {
    const existing = await this.findById(id);
    await pool.query('DELETE FROM users WHERE id = ?', [id]);
    return existing;
  }

  async updateById(id: string, updateData: Partial<IUser>): Promise<IUser | null> {
    const assignments: string[] = [];
    const values: unknown[] = [];
    const fields: Record<string, string> = { displayName: 'display_name', photoURL: 'photo_url', passwordHash: 'password_hash' };
    for (const [key, value] of Object.entries(updateData)) {
      if (fields[key]) { assignments.push(`${fields[key]} = ?`); values.push(value); }
    }
    if (!assignments.length) return this.findById(id);
    assignments.push('updated_at = ?'); values.push(new Date(), id);
    await pool.query(`UPDATE users SET ${assignments.join(', ')} WHERE id = ?`, values);
    return this.findById(id);
  }

  async updateLastLogin(id: string): Promise<void> {
    await pool.query('UPDATE users SET last_login = ?, updated_at = ? WHERE id = ?', [new Date(), new Date(), id]);
  }

  async countCustomers(): Promise<number> {
    const [rows] = await pool.query<RowDataPacket[]>('SELECT COUNT(*) AS total FROM users WHERE role = ?', ['USER']);
    return Number(rows[0].total);
  }

  async countAdmins(): Promise<number> {
    const [rows] = await pool.query<RowDataPacket[]>('SELECT COUNT(*) AS total FROM users WHERE role = ?', ['ADMIN']);
    return Number(rows[0].total);
  }
}

export const userRepository = new UserRepository();
