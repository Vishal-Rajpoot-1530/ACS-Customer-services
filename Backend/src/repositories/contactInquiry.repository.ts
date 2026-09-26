import { RowDataPacket } from 'mysql2';
import { randomUUID } from 'crypto';
import { pool } from '../config/db.config';
import { IContactInquiry } from '../models/contactInquiry.model';

type InquiryRow = RowDataPacket & { id: string; name: string; mobile: string; email: string; message: string; status: IContactInquiry['status']; created_at: Date };
const mapInquiry = (row: InquiryRow): IContactInquiry => ({ id: row.id, name: row.name, mobile: row.mobile, email: row.email, message: row.message, status: row.status, createdAt: new Date(row.created_at) });
export class ContactInquiryRepository {
    async create(data: Pick<IContactInquiry, 'name' | 'mobile' | 'email' | 'message'>): Promise<IContactInquiry> { const id = randomUUID(); await pool.query('INSERT INTO contact_inquiries (id, name, mobile, email, message, created_at) VALUES (?, ?, ?, ?, ?, ?)', [id, data.name, data.mobile, data.email.toLowerCase(), data.message, new Date()]); return this.findById(id) as Promise<IContactInquiry>; }
    async findById(id: string): Promise<IContactInquiry | null> { const [rows] = await pool.query<InquiryRow[]>('SELECT * FROM contact_inquiries WHERE id = ?', [id]); return rows[0] ? mapInquiry(rows[0]) : null; }
    async findPaged(page: number, limit: number): Promise<{ items: IContactInquiry[]; total: number }> { const [countRows] = await pool.query<RowDataPacket[]>('SELECT COUNT(*) AS total FROM contact_inquiries'); const [rows] = await pool.query<InquiryRow[]>('SELECT * FROM contact_inquiries ORDER BY created_at DESC LIMIT ? OFFSET ?', [limit, (page - 1) * limit]); return { items: rows.map(mapInquiry), total: Number(countRows[0].total) }; }
}
export const contactInquiryRepository = new ContactInquiryRepository();