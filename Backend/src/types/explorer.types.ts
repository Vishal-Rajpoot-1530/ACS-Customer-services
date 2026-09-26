export interface ExplorerFolderInput {
    id: string;
    name: string;
    parentId: string | null;
}

export interface ExplorerStateInput {
    folders: ExplorerFolderInput[];
    assignments: Record<string, string>;
}
