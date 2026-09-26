import { RowDataPacket } from 'mysql2';
import { randomUUID } from 'crypto';
import { pool } from '../config/db.config';
import { IDocument } from '../models/document.model';
import { DocumentListQuery, PaginationResult } from '../types/document.types';

type DocumentRow = RowDataPacket & { id: string; user_id: string; original_name: string; stored_name: string; s3_bucket: string; s3_key: string; mime_type: string; extension: string; size: number; status: IDocument['status']; category: string; notes?: string; imported_by: string; user_email: string; imported_at: string; print_options?: string | object; created_at: Date; updated_at: Date };
const mapDocument = (row: DocumentRow): IDocument => ({ id: row.id, userId: row.user_id, originalName: row.original_name, storedName: row.stored_name, s3Bucket: row.s3_bucket, s3Key: row.s3_key, mimeType: row.mime_type, extension: row.extension, size: Number(row.size), status: row.status, category: row.category, notes: row.notes || '', importedBy: row.imported_by, userEmail: row.user_email, importedAt: row.imported_at, printOptions: typeof row.print_options === 'string' ? JSON.parse(row.print_options) : row.print_options, createdAt: new Date(row.created_at), updatedAt: new Date(row.updated_at) });
const sortableFields = new Set(['createdAt', 'originalName', 'status', 'category', 'size', 'importedBy', 'userEmail']);
const dbField = (field: string): string => ({ createdAt: 'created_at', originalName: 'original_name', importedBy: 'imported_by', userEmail: 'user_email' }[field] || field);

export class DocumentRepository {
    async create(data: Partial<IDocument>): Promise<IDocument> {
        const id = randomUUID(); const now = new Date();
        await pool.query(`INSERT INTO documents (id, user_id, original_name, stored_name, s3_bucket, s3_key, mime_type, extension, size, status, category, notes, imported_by, user_email, imported_at, print_options, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, [id, data.userId, data.originalName, data.storedName, data.s3Bucket, data.s3Key, data.mimeType, data.extension, data.size, data.status, data.category || 'Print Job', data.notes || '', data.importedBy, data.userEmail, data.importedAt, data.printOptions ? JSON.stringify(data.printOptions) : null, now, now]);
        return this.findById(id) as Promise<IDocument>;
    }

    async findById(id: string): Promise<IDocument | null> { const [rows] = await pool.query<DocumentRow[]>('SELECT * FROM documents WHERE id = ?', [id]); return rows[0] ? mapDocument(rows[0]) : null; }
    async findByUserId(userId: string, query: DocumentListQuery): Promise<PaginationResult<IDocument>> { return this.findPaged(userId, query, false); }
    async findAll(query: DocumentListQuery): Promise<PaginationResult<IDocument>> { return this.findPaged(undefined, query, true); }

    private async findPaged(userId: string | undefined, query: DocumentListQuery, admin: boolean): Promise<PaginationResult<IDocument>> {
        const page = Math.max(1, Number(query.page) || 1); const limit = Math.min(100, Math.max(1, Number(query.limit) || (admin ? 50 : 20)));
        const conditions: string[] = []; const values: unknown[] = [];
        if (userId) { conditions.push('user_id = ?'); values.push(userId); }
        if (query.status && query.status !== 'all') { conditions.push('status = ?'); values.push(query.status); }
        if (query.category && query.category !== 'all') { conditions.push('category = ?'); values.push(query.category); }
        if (query.search?.trim()) { const term = `%${query.search.trim()}%`; conditions.push(admin ? '(original_name LIKE ? OR imported_by LIKE ? OR user_email LIKE ?)' : 'original_name LIKE ?'); values.push(...(admin ? [term, term, term] : [term])); }
        const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
        const [countRows] = await pool.query<RowDataPacket[]>(`SELECT COUNT(*) AS total FROM documents ${where}`, values); const total = Number(countRows[0].total);
        const sortBy = sortableFields.has(query.sortBy || '') ? query.sortBy! : 'createdAt'; const sortOrder = query.sortOrder === 'asc' ? 'ASC' : 'DESC';
        const [rows] = await pool.query<DocumentRow[]>(`SELECT * FROM documents ${where} ORDER BY ${dbField(sortBy)} ${sortOrder} LIMIT ? OFFSET ?`, [...values, limit, (page - 1) * limit]);
        return { items: rows.map(mapDocument), pagination: { page, limit, total, totalPages: Math.ceil(total / limit) || 1 } };
    }

    async updateById(id: string, updateData: Partial<IDocument>): Promise<IDocument | null> {
        const fields: Record<string, string> = { originalName: 'original_name', category: 'category', status: 'status', notes: 'notes', printOptions: 'print_options' }; const assignments: string[] = []; const values: unknown[] = [];
        for (const [key, value] of Object.entries(updateData)) if (fields[key]) { assignments.push(`${fields[key]} = ?`); values.push(key === 'printOptions' ? JSON.stringify(value) : value); }
        if (!assignments.length) return this.findById(id); assignments.push('updated_at = ?'); values.push(new Date(), id);
        await pool.query(`UPDATE documents SET ${assignments.join(', ')} WHERE id = ?`, values); return this.findById(id);
    }
    async deleteById(id: string): Promise<IDocument | null> { const existing = await this.findById(id); await pool.query('DELETE FROM documents WHERE id = ?', [id]); return existing; }
    async findByOwnerId(userId: string): Promise<IDocument[]> { const [rows] = await pool.query<DocumentRow[]>('SELECT * FROM documents WHERE user_id = ?', [userId]); return rows.map(mapDocument); }
    async getQueueStats(): Promise<{ totalDocuments: number; readyDocuments: number; processingDocuments: number; completedDocuments: number }> { const [rows] = await pool.query<RowDataPacket[]>(`SELECT COUNT(*) AS totalDocuments, SUM(status = 'ready') AS readyDocuments, SUM(status = 'processing') AS processingDocuments, SUM(status = 'completed') AS completedDocuments FROM documents`); return { totalDocuments: Number(rows[0].totalDocuments), readyDocuments: Number(rows[0].readyDocuments || 0), processingDocuments: Number(rows[0].processingDocuments || 0), completedDocuments: Number(rows[0].completedDocuments || 0) }; }
}
export const documentRepository = new DocumentRepository();