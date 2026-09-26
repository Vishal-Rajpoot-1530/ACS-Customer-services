import { apiClient } from './apiClient';

export interface ExplorerFolderDto {
    id: string;
    name: string;
    parentId: string | null;
}

export interface ExplorerStateDto {
    folders: ExplorerFolderDto[];
    assignments: Record<string, string>;
}

export const explorerApi = {
    async get(): Promise<ExplorerStateDto> {
        const res = await apiClient.get<ExplorerStateDto>('/users/explorer');
        return res.data || { folders: [], assignments: {} };
    },

    async save(state: ExplorerStateDto): Promise<ExplorerStateDto> {
        const res = await apiClient.put<ExplorerStateDto>('/users/explorer', state);
        return res.data || state;
    },
};
