import { z } from 'zod';

const folderSchema = z.object({
    id: z.string().min(1).max(64),
    name: z.string().trim().min(1).max(255),
    parentId: z.string().min(1).max(64).nullable(),
});

export const explorerStateSchema = z.object({
    body: z.object({
        folders: z.array(folderSchema).max(1000),
        assignments: z.record(z.string().min(1).max(64), z.string().min(1).max(64)),
    }),
});