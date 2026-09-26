import React, { ReactNode, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
    ChevronDown,
    ChevronRight,
    File,
    Folder,
    FolderPlus,
    MoreVertical,
    Pencil,
    Plus,
    Trash2,
    Home,
} from 'lucide-react';
import { ImportedDocument } from '../types';
import { explorerApi } from '../api/explorer.api';

export type ExplorerFolder = {
    id: string;
    name: string;
    parentId: string | null;
};

interface FileExplorerSidebarProps {
    storageKey: string;
    documents: ImportedDocument[];
    selectedFolderId: string | null;
    onFolderChange: (folderId: string | null) => void;
    onAssignmentsChange?: (assignments: Record<string, string>) => void;
    onFoldersChange?: (folders: ExplorerFolder[]) => void;
    externalAssignments?: Record<string, string>;
    sidebarSummary?: ReactNode;
}

const ROOT_FOLDER_ID = 'root';

const createFolderId = (): string => {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
        return `folder-${crypto.randomUUID()}`;
    }
    return `folder-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
};

const readFolders = (storageKey: string): ExplorerFolder[] => {
    try {
        const saved = JSON.parse(localStorage.getItem(storageKey) || '[]');
        return Array.isArray(saved) ? saved : [];
    } catch {
        return [];
    }
};

const readAssignments = (storageKey: string): Record<string, string> => {
    try {
        const saved = JSON.parse(localStorage.getItem(storageKey) || '{}');
        return saved && typeof saved === 'object' ? saved : {};
    } catch {
        return {};
    }
};

const assignmentsAreEqual = (left: Record<string, string>, right: Record<string, string>): boolean => {
    const leftKeys = Object.keys(left);
    const rightKeys = Object.keys(right);
    if (leftKeys.length !== rightKeys.length) return false;
    return leftKeys.every((key) => left[key] === right[key]);
};

export const FileExplorerSidebar: React.FC<FileExplorerSidebarProps> = ({
    storageKey,
    documents,
    selectedFolderId,
    onFolderChange,
    onAssignmentsChange,
    onFoldersChange,
    externalAssignments,
    sidebarSummary,
}) => {
    const folderStorageKey = `${storageKey}:folders`;
    const assignmentStorageKey = `${storageKey}:assignments`;
    const [folders, setFolders] = useState<ExplorerFolder[]>([]);
    const [assignments, setAssignments] = useState<Record<string, string>>({});
    const [expanded, setExpanded] = useState<Set<string>>(new Set([ROOT_FOLDER_ID]));
    const [editingFolderId, setEditingFolderId] = useState<string | null>(null);
    const [editingName, setEditingName] = useState('');
    const [menuFolderId, setMenuFolderId] = useState<string | null>(null);
    const [folderDialog, setFolderDialog] = useState<{ mode: 'create' | 'rename'; folderId?: string; parentId: string | null } | null>(null);
    const [folderDialogName, setFolderDialogName] = useState('');
    const [deleteFolderId, setDeleteFolderId] = useState<string | null>(null);
    const [explorerNotice, setExplorerNotice] = useState<string | null>(null);
    const isHydrated = useRef(false);
    const onAssignmentsChangeRef = useRef(onAssignmentsChange);
    const onFoldersChangeRef = useRef(onFoldersChange);

    onAssignmentsChangeRef.current = onAssignmentsChange;
    onFoldersChangeRef.current = onFoldersChange;

    useEffect(() => {
        let active = true;
        isHydrated.current = false;

        const loadExplorer = async () => {
            try {
                const serverState = await explorerApi.get();
                if (!active) return;

                const legacyFolders = readFolders(folderStorageKey);
                const legacyAssignments = readAssignments(assignmentStorageKey);
                const shouldMigrateLegacy = serverState.folders.length === 0 && legacyFolders.length > 0;
                const state = shouldMigrateLegacy
                    ? { folders: legacyFolders, assignments: legacyAssignments }
                    : serverState;

                setFolders(state.folders);
                setAssignments(state.assignments);
                onFoldersChangeRef.current?.(state.folders);
                onAssignmentsChangeRef.current?.(state.assignments);
                isHydrated.current = true;

                if (shouldMigrateLegacy) {
                    await explorerApi.save(state);
                }
                localStorage.removeItem(folderStorageKey);
                localStorage.removeItem(assignmentStorageKey);
            } catch (error: any) {
                if (active) setExplorerNotice(error?.message || 'Unable to load folders from the server.');
            }
        };

        loadExplorer();
        return () => { active = false; };
    }, [assignmentStorageKey, folderStorageKey]);

    useEffect(() => {
        if (externalAssignments && !assignmentsAreEqual(assignments, externalAssignments)) {
            setAssignments(externalAssignments);
        }
    }, [externalAssignments]);

    useEffect(() => {
        onFoldersChangeRef.current?.(folders);
        onAssignmentsChangeRef.current?.(assignments);
        if (!isHydrated.current) return;

        explorerApi.save({ folders, assignments }).catch((error: any) => {
            setExplorerNotice(error?.message || 'Unable to save folder changes to the server.');
        });
    }, [folders, assignments]);

    useEffect(() => {
        if (!menuFolderId) return;

        const closeMenuOnOutsideClick = (event: PointerEvent) => {
            const target = event.target as HTMLElement;
            if (!target.closest('[data-folder-action-menu]') && !target.closest('[data-folder-action-trigger]')) {
                setMenuFolderId(null);
            }
        };

        document.addEventListener('pointerdown', closeMenuOnOutsideClick);
        return () => document.removeEventListener('pointerdown', closeMenuOnOutsideClick);
    }, [menuFolderId]);

    const folderCounts = useMemo(() => {
        const counts: Record<string, number> = { [ROOT_FOLDER_ID]: 0 };
        documents.forEach((document) => {
            const folderId = assignments[document.id] || ROOT_FOLDER_ID;
            counts[folderId] = (counts[folderId] || 0) + 1;
        });
        return counts;
    }, [assignments, documents]);

    const childrenOf = (parentId: string | null) => folders.filter((folder) => folder.parentId === parentId);
    const selectedFolder = selectedFolderId ? folders.find((folder) => folder.id === selectedFolderId) : null;

    const toggleExpanded = (folderId: string) => {
        setExpanded((current) => {
            const next = new Set(current);
            if (next.has(folderId)) next.delete(folderId);
            else next.add(folderId);
            return next;
        });
    };

    const createFolder = (parentId: string | null) => {
        setFolderDialog({ mode: 'create', parentId });
        setFolderDialogName('');
    };

    const saveFolderDialog = () => {
        const name = folderDialogName.trim();
        if (!name) {
            setExplorerNotice('Enter a folder name to continue.');
            return;
        }

        if (folderDialog?.mode === 'rename' && folderDialog.folderId) {
            setFolders((current) => current.map((folder) => (
                folder.id === folderDialog.folderId ? { ...folder, name } : folder
            )));
            setFolderDialog(null);
            setFolderDialogName('');
            return;
        }

        const folder = { id: createFolderId(), name, parentId: folderDialog?.parentId || null };
        setFolders((current) => [...current, folder]);
        setExpanded((current) => new Set(current).add(folder.parentId || ROOT_FOLDER_ID));
        onFolderChange(folder.id);
        setFolderDialog(null);
        setFolderDialogName('');
    };

    const startRename = (folder: ExplorerFolder) => {
        setFolderDialog({ mode: 'rename', folderId: folder.id, parentId: folder.parentId });
        setFolderDialogName(folder.name);
        setMenuFolderId(null);
    };

    const finishRename = () => {
        if (!editingFolderId || !editingName.trim()) {
            setEditingFolderId(null);
            return;
        }
        setFolders((current) => current.map((folder) => (
            folder.id === editingFolderId ? { ...folder, name: editingName.trim() } : folder
        )));
        setEditingFolderId(null);
    };

    const deleteFolder = (folderId: string) => {
        const hasChildren = folders.some((folder) => folder.parentId === folderId);
        if (hasChildren) {
            setExplorerNotice('Move or delete subfolders before deleting this folder.');
            return;
        }
        setDeleteFolderId(folderId);
    };

    const confirmDeleteFolder = () => {
        if (!deleteFolderId) return;
        const folderId = deleteFolderId;
        setFolders((current) => current.filter((folder) => folder.id !== folderId));
        setAssignments((current) => {
            const next = { ...current };
            Object.keys(next).forEach((documentId) => {
                if (next[documentId] === folderId) delete next[documentId];
            });
            return next;
        });
        if (selectedFolderId === folderId) onFolderChange(null);
        setMenuFolderId(null);
        setDeleteFolderId(null);
    };

    const moveDocumentToFolder = (event: React.DragEvent, folderId: string | null) => {
        event.preventDefault();
        const documentId = event.dataTransfer.getData('text/document-id');
        if (documentId) setAssignments((current) => ({ ...current, [documentId]: folderId || ROOT_FOLDER_ID }));
    };

    const renderFolder = (folder: ExplorerFolder, depth: number): React.ReactNode => {
        const children = childrenOf(folder.id);
        const isExpanded = expanded.has(folder.id);
        const isSelected = selectedFolderId === folder.id;

        return (
            <React.Fragment key={folder.id}>
                <div
                    className={`group relative flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs ${isSelected ? 'bg-blue-50 text-blue-700' : 'text-slate-600 hover:bg-slate-50'}`}
                    style={{ paddingLeft: `${8 + depth * 14}px` }}
                    onDragOver={(event) => event.preventDefault()}
                    onDrop={(event) => moveDocumentToFolder(event, folder.id)}
                >
                    <button type="button" onClick={() => toggleExpanded(folder.id)} className="p-0.5" aria-label={`${isExpanded ? 'Collapse' : 'Expand'} ${folder.name}`}>
                        {children.length > 0 ? (isExpanded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />) : <span className="inline-block w-3.5" />}
                    </button>
                    <button type="button" onClick={() => onFolderChange(folder.id)} className="flex min-w-0 flex-1 items-center gap-2 text-left">
                        <Folder className={`h-4 w-4 shrink-0 ${isSelected ? 'text-blue-600' : 'text-amber-500'}`} />
                        {editingFolderId === folder.id ? (
                            <input autoFocus value={editingName} onChange={(event) => setEditingName(event.target.value)} onBlur={finishRename} onKeyDown={(event) => { if (event.key === 'Enter') finishRename(); if (event.key === 'Escape') setEditingFolderId(null); }} className="min-w-0 w-full rounded border border-blue-300 px-1 text-xs" />
                        ) : <span className="truncate">{folder.name}</span>}
                        <span className="ml-auto text-[10px] text-slate-400">{folderCounts[folder.id] || 0}</span>
                    </button>
                    <button type="button" data-folder-action-trigger onClick={() => setMenuFolderId(menuFolderId === folder.id ? null : folder.id)} className="invisible p-1 group-hover:visible" aria-label={`Actions for ${folder.name}`}>
                        <MoreVertical className="h-3.5 w-3.5" />
                    </button>
                    {menuFolderId === folder.id && (
                        <div data-folder-action-menu className="absolute ml-28 mt-20 z-20 w-32 rounded-lg border border-slate-200 bg-white p-1 shadow-lg">
                            <button type="button" onClick={() => startRename(folder)} className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-xs hover:bg-slate-50"><Pencil className="h-3.5 w-3.5" />Rename</button>
                            <button type="button" onClick={() => createFolder(folder.id)} className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-xs hover:bg-slate-50"><FolderPlus className="h-3.5 w-3.5" />New folder</button>
                            <button type="button" onClick={() => deleteFolder(folder.id)} className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-xs text-red-600 hover:bg-red-50"><Trash2 className="h-3.5 w-3.5" />Delete</button>
                        </div>
                    )}
                </div>
                {isExpanded && children.map((child) => renderFolder(child, depth + 1))}
            </React.Fragment>
        );
    };

    return (
        <aside className="flex w-full shrink-0 flex-col overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-[0_18px_50px_-30px_rgba(4,25,61,0.35)] lg:w-72 lg:self-stretch lg:sticky lg:top-5">
            <nav className="flex min-h-0 flex-1 flex-col p-3" aria-label="File explorer navigation">
                <p className="px-2 pb-2 text-[9px] font-extrabold uppercase tracking-[0.18em] text-slate-400">Navigation</p>
                <button type="button" onClick={() => onFolderChange(null)} className={`mb-1 flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-xs font-bold transition ${selectedFolderId === null ? 'bg-blue-50 text-[#0055ff]' : 'text-slate-600 hover:bg-slate-50'}`}>
                    <Home className="h-4 w-4" /><span className="flex-1">All files</span><span className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[9px] text-slate-500">{documents.length}</span>
                </button>

                <div className="mb-2 mt-4 flex items-center justify-between px-2">
                    <div><p className="text-[9px] font-extrabold uppercase tracking-[0.18em] text-slate-400">Folders</p><p className="mt-0.5 max-w-[170px] truncate text-[10px] text-slate-500">{selectedFolder?.name || 'Root directory'}</p></div>
                    <button type="button" onClick={() => createFolder(selectedFolderId)} className="rounded-lg border border-blue-100 bg-blue-50 p-1.5 text-[#0055ff] transition hover:bg-blue-100" title="Create folder" aria-label="Create folder"><Plus className="h-4 w-4" /></button>
                </div>

                <div className="min-h-0 flex-1 overflow-y-auto pr-1 no-scrollbar" onDragOver={(event) => event.preventDefault()} onDrop={(event) => moveDocumentToFolder(event, null)}>
                    {childrenOf(null).length ? childrenOf(null).map((folder) => renderFolder(folder, 0)) : <button type="button" onClick={() => createFolder(null)} className="w-full rounded-xl border border-dashed border-slate-200 px-3 py-4 text-center text-[10px] font-semibold text-slate-400 hover:border-blue-300 hover:text-blue-600">+ Create your first folder</button>}
                </div>

                {sidebarSummary && <div className="mt-4 border-t border-slate-100 pt-3">{sidebarSummary}</div>}
                {explorerNotice && <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800" role="status"><div className="flex items-start justify-between gap-2"><span>{explorerNotice}</span><button type="button" onClick={() => setExplorerNotice(null)} className="font-bold" aria-label="Dismiss notice">×</button></div></div>}
            </nav>

            {(folderDialog || deleteFolderId) && createPortal(
                <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-sm" onClick={() => { setFolderDialog(null); setDeleteFolderId(null); }}>
                    <div className="w-full max-w-sm rounded-3xl border border-slate-200 bg-white p-5 shadow-2xl" onClick={(event) => event.stopPropagation()}>
                        {folderDialog ? <><h2 className="text-base font-extrabold text-[#04193d]">{folderDialog.mode === 'create' ? 'Create folder' : 'Rename folder'}</h2><p className="mt-1 text-xs text-slate-500">Choose a clear folder name.</p><input autoFocus value={folderDialogName} onChange={(event) => { setFolderDialogName(event.target.value); setExplorerNotice(null); }} onKeyDown={(event) => { if (event.key === 'Enter') saveFolderDialog(); if (event.key === 'Escape') setFolderDialog(null); }} placeholder="Folder name" className="mt-4 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-[#0055ff] focus:ring-2 focus:ring-blue-500/20" />{explorerNotice && <p className="mt-2 text-xs font-semibold text-red-600">{explorerNotice}</p>}<div className="mt-4 flex justify-end gap-2"><button type="button" onClick={() => setFolderDialog(null)} className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold text-slate-600">Cancel</button><button type="button" onClick={saveFolderDialog} className="rounded-xl bg-[#0055ff] px-3 py-2 text-xs font-bold text-white">Save folder</button></div></> : <><h2 className="text-base font-extrabold text-[#04193d]">Delete folder?</h2><p className="mt-1 text-xs text-slate-500">Files in this folder will return to All files.</p><div className="mt-4 flex justify-end gap-2"><button type="button" onClick={() => setDeleteFolderId(null)} className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold text-slate-600">Cancel</button><button type="button" onClick={confirmDeleteFolder} className="rounded-xl bg-red-600 px-3 py-2 text-xs font-bold text-white">Delete folder</button></div></>}
                    </div>
                </div>,
                document.body
            )}
        </aside>
    );
};

export { ROOT_FOLDER_ID };
