import { ResultSetHeader, RowDataPacket } from 'mysql2';
import { pool } from '../config/db.config';

export interface ExplorerFolderRecord {
    id: string;
    name: string;
    parentId: string | null;
}

export interface ExplorerState {
    folders: ExplorerFolderRecord[];
    assignments: Record<string, string>;
}

type FolderRow = RowDataPacket & { id: string; name: string; parent_id: string | null };
type AssignmentRow = RowDataPacket & { document_id: string; folder_id: string };

export class ExplorerRepository {
    async deleteByUserId(userId: string): Promise<void> {
        await pool.query('DELETE FROM document_folder_assignments WHERE user_id = ?', [userId]);
        await pool.query('DELETE FROM explorer_folders WHERE user_id = ?', [userId]);
    }

    async getByUserId(userId: string): Promise<ExplorerState> {
        const [folderRows] = await pool.query<FolderRow[]>(
            'SELECT id, name, parent_id FROM explorer_folders WHERE user_id = ? ORDER BY created_at ASC',
            [userId]
        );
        const [assignmentRows] = await pool.query<AssignmentRow[]>(
            'SELECT document_id, folder_id FROM document_folder_assignments WHERE user_id = ?',
            [userId]
        );

        return {
            folders: folderRows.map((row) => ({ id: row.id, name: row.name, parentId: row.parent_id })),
            assignments: Object.fromEntries(assignmentRows.map((row) => [row.document_id, row.folder_id])),
        };
    }

    async replaceForUser(userId: string, state: ExplorerState): Promise<void> {
        const connection = await pool.getConnection();
        try {
            await connection.beginTransaction();
            await connection.query('DELETE FROM document_folder_assignments WHERE user_id = ?', [userId]);
            await connection.query('DELETE FROM explorer_folders WHERE user_id = ?', [userId]);

            for (const folder of state.folders) {
                await connection.query<ResultSetHeader>(
                    'INSERT INTO explorer_folders (id, user_id, name, parent_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)',
                    [folder.id, userId, folder.name, folder.parentId, new Date(), new Date()]
                );
            }

            for (const [documentId, folderId] of Object.entries(state.assignments)) {
                await connection.query<ResultSetHeader>(
                    'INSERT INTO document_folder_assignments (user_id, document_id, folder_id, created_at) VALUES (?, ?, ?, ?)',
                    [userId, documentId, folderId, new Date()]
                );
            }

            await connection.commit();
        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    }
}

export const explorerRepository = new ExplorerRepository();
