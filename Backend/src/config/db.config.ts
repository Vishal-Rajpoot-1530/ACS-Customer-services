import mysql, { Pool, RowDataPacket } from 'mysql2/promise';
import { env } from './env.config';
import { logger } from './logger.config';

export const pool: Pool = mysql.createPool({
  host: env.MYSQL_HOST,
  port: env.MYSQL_PORT,
  user: env.MYSQL_USER,
  password: env.MYSQL_PASSWORD,
  database: env.MYSQL_DATABASE,
  connectionLimit: env.MYSQL_CONNECTION_LIMIT,
  waitForConnections: true,
  decimalNumbers: true,
});

export const connectDatabase = async (): Promise<void> => {
  try {
    await pool.query('SELECT 1');
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id CHAR(36) PRIMARY KEY,
        email VARCHAR(255) NOT NULL UNIQUE,
        password_hash VARCHAR(255) NULL,
        display_name VARCHAR(255) NOT NULL,
        role VARCHAR(20) NOT NULL DEFAULT 'USER',
        photo_url TEXT NULL,
        is_email_verified BOOLEAN NOT NULL DEFAULT FALSE,
        google_id VARCHAR(255) NULL UNIQUE,
        last_login DATETIME NOT NULL,
        password_reset_token_hash VARCHAR(255) NULL,
        password_reset_expires_at DATETIME NULL,
        created_at DATETIME NOT NULL,
        updated_at DATETIME NOT NULL,
        INDEX idx_users_role (role),
        INDEX idx_users_created_at (created_at)
      ) ENGINE=InnoDB;
    `);
    const [adminRows] = await pool.query<RowDataPacket[]>(
      `SELECT id FROM users
       WHERE role = 'ADMIN'
       ORDER BY CASE WHEN email = 'admin.desk@acscentre.com' THEN 0 ELSE 1 END,
                created_at ASC, id ASC`
    );
    if (adminRows.length > 1) {
      const duplicateAdminIds = adminRows.slice(1).map((row) => row.id);
      const placeholders = duplicateAdminIds.map(() => '?').join(', ');
      await pool.query(
        `UPDATE users SET role = 'USER', updated_at = ? WHERE id IN (${placeholders})`,
        [new Date(), ...duplicateAdminIds]
      );
      logger.warn(`Normalized ${duplicateAdminIds.length} duplicate admin account(s) to USER.`);
    }
    await pool.query(`
      CREATE TABLE IF NOT EXISTS documents (
        id CHAR(36) PRIMARY KEY,
        user_id VARCHAR(255) NOT NULL,
        original_name VARCHAR(255) NOT NULL,
        stored_name VARCHAR(255) NOT NULL,
        s3_bucket VARCHAR(255) NOT NULL,
        s3_key VARCHAR(500) NOT NULL UNIQUE,
        mime_type VARCHAR(255) NOT NULL,
        extension VARCHAR(32) NOT NULL,
        size BIGINT NOT NULL,
        status VARCHAR(32) NOT NULL DEFAULT 'ready',
        category VARCHAR(255) NOT NULL DEFAULT 'Print Job',
        notes TEXT NULL,
        imported_by VARCHAR(255) NOT NULL,
        user_email VARCHAR(255) NOT NULL,
        imported_at VARCHAR(64) NOT NULL,
        print_options JSON NULL,
        created_at DATETIME NOT NULL,
        updated_at DATETIME NOT NULL,
        INDEX idx_documents_user_created (user_id, created_at),
        INDEX idx_documents_status_created (status, created_at),
        INDEX idx_documents_category_created (category, created_at)
      ) ENGINE=InnoDB;
    `);
    await pool.query(`
      CREATE TABLE IF NOT EXISTS document_shares (
        document_id CHAR(36) NOT NULL,
        recipient_user_id CHAR(36) NOT NULL,
        shared_by_user_id CHAR(36) NOT NULL,
        created_at DATETIME NOT NULL,
        PRIMARY KEY (document_id, recipient_user_id),
        INDEX idx_document_shares_recipient (recipient_user_id, created_at),
        CONSTRAINT fk_document_shares_document FOREIGN KEY (document_id)
          REFERENCES documents(id) ON DELETE CASCADE,
        CONSTRAINT fk_document_shares_recipient FOREIGN KEY (recipient_user_id)
          REFERENCES users(id) ON DELETE CASCADE,
        CONSTRAINT fk_document_shares_shared_by FOREIGN KEY (shared_by_user_id)
          REFERENCES users(id) ON DELETE CASCADE
      ) ENGINE=InnoDB;
    `);
    await pool.query(`
      CREATE TABLE IF NOT EXISTS refresh_tokens (
        id CHAR(36) PRIMARY KEY,
        user_id CHAR(36) NOT NULL,
        token_hash VARCHAR(255) NOT NULL UNIQUE,
        expires_at DATETIME NOT NULL,
        revoked_at DATETIME NULL,
        replaced_by_token_hash VARCHAR(255) NULL,
        ip_address VARCHAR(255) NULL,
        user_agent TEXT NULL,
        created_at DATETIME NOT NULL,
        INDEX idx_refresh_user (user_id),
        INDEX idx_refresh_expires (expires_at)
      ) ENGINE=InnoDB;
    `);
    await pool.query(`
      CREATE TABLE IF NOT EXISTS contact_inquiries (
        id CHAR(36) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        mobile VARCHAR(64) NOT NULL,
        email VARCHAR(255) NOT NULL,
        message TEXT NOT NULL,
        status VARCHAR(32) NOT NULL DEFAULT 'new',
        created_at DATETIME NOT NULL,
        INDEX idx_inquiries_created (created_at)
      ) ENGINE=InnoDB;
    `);
    await pool.query(`
      CREATE TABLE IF NOT EXISTS explorer_folders (
        id VARCHAR(64) PRIMARY KEY,
        user_id CHAR(36) NOT NULL,
        name VARCHAR(255) NOT NULL,
        parent_id VARCHAR(64) NULL,
        created_at DATETIME NOT NULL,
        updated_at DATETIME NOT NULL,
        INDEX idx_explorer_folders_user (user_id),
        INDEX idx_explorer_folders_parent (user_id, parent_id)
      ) ENGINE=InnoDB;
    `);
    await pool.query(`
      CREATE TABLE IF NOT EXISTS document_folder_assignments (
        user_id CHAR(36) NOT NULL,
        document_id CHAR(36) NOT NULL,
        folder_id VARCHAR(64) NOT NULL,
        created_at DATETIME NOT NULL,
        PRIMARY KEY (user_id, document_id),
        INDEX idx_folder_assignments_folder (user_id, folder_id)
      ) ENGINE=InnoDB;
    `);
    logger.info(`✅ MySQL connected: ${env.MYSQL_HOST}:${env.MYSQL_PORT}/${env.MYSQL_DATABASE}`);
  } catch (error: any) {
    logger.error(`❌ Failed to connect to MySQL: ${error.message}`);
    logger.warn('⚠️ The API server is running, but database operations will fail until MySQL is started.');
  }
};

export const disconnectDatabase = async (): Promise<void> => {
  try {
    await pool.end();
    logger.info('MySQL connection closed.');
  } catch (error) {
    logger.error('Error during MySQL disconnection:', error);
  }
};

export const isDatabaseHealthy = async (): Promise<boolean> => {
  try {
    await pool.query('SELECT 1');
    return true;
  } catch {
    return false;
  }
};
