import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  FileText,
  Trash2,
  User as UserIcon,
  Loader2,
  Clock,
  Check,
  Eye,
  Edit3,
  CloudUpload,
  Sparkles,
  Image as ImageIcon,
  Video,
  FileSpreadsheet,
  CheckCircle2,
  Calendar,
  X,
  Headphones,
  Music,
  Folder,
  Share2,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { ImportedDocument } from '../types';
import { RealDocumentViewerModal } from '../components/RealDocumentViewerModal';
import { UserEditDocModal } from '../components/UserEditDocModal';
import { saveMediaBlob, deleteMediaBlob, linkMediaBlob } from '../utils/mediaStorage';
import { BackendDocumentDto, documentApi, ShareDirectoryUserDto, SharedByMeDto } from '../api/document.api';
import { FileExplorerSidebar, ExplorerFolder } from '../components/FileExplorerSidebar';

type DocTypeFilter = 'all' | 'pdf' | 'images' | 'videos' | 'audio' | 'doc';
type TimeRangeFilter = '2days' | 'all';

export const UserDashboard: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [documents, setDocuments] = useState<ImportedDocument[]>([]);
  const [sharedDocuments, setSharedDocuments] = useState<ImportedDocument[]>([]);
  const [sharedByMe, setSharedByMe] = useState<SharedByMeDto[]>([]);
  const [activeDocumentView, setActiveDocumentView] = useState<'mine' | 'shared' | 'sharedByMe'>('mine');
  const [shareTarget, setShareTarget] = useState<ImportedDocument | null>(null);
  const [shareDirectory, setShareDirectory] = useState<ShareDirectoryUserDto[]>([]);
  const [selectedShareUser, setSelectedShareUser] = useState<ShareDirectoryUserDto | null>(null);
  const [shareWithEveryone, setShareWithEveryone] = useState(false);
  const [shareSearch, setShareSearch] = useState('');
  const [loadingShareDirectory, setLoadingShareDirectory] = useState(false);
  const [shareDirectoryError, setShareDirectoryError] = useState<string | null>(null);
  const [isSharing, setIsSharing] = useState(false);
  const explorerStorageKey = `acs-explorer-user-${user?.uid || 'guest'}`;
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [folderAssignments, setFolderAssignments] = useState<Record<string, string>>({});
  const [explorerFolders, setExplorerFolders] = useState<ExplorerFolder[]>([]);
  const [isUploadFolderPickerOpen, setIsUploadFolderPickerOpen] = useState(false);
  const uploadFolderIdRef = useRef<string | null>(null);
  const [loadingDocs, setLoadingDocs] = useState<boolean>(true);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [uploadNotice, setUploadNotice] = useState<string | null>(null);
  const [isDropzoneHovered, setIsDropzoneHovered] = useState<boolean>(false);

  // Filters matching Admin requirements
  const [docTypeFilter, setDocTypeFilter] = useState<DocTypeFilter>('all');
  const [timeFilter, setTimeFilter] = useState<TimeRangeFilter>('all');

  // Selected document for Detail Modal (RealDocumentViewerModal)
  const [selectedDoc, setSelectedDoc] = useState<ImportedDocument | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState<boolean>(false);

  // Selected document for Edit Modal (UserEditDocModal)
  const [editingDoc, setEditingDoc] = useState<ImportedDocument | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState<boolean>(false);

  // Format file size nicely
  const formatFileSize = (bytes: number): string => {
    if (!bytes || bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const formatUploadDate = (docItem: ImportedDocument): string => {
    const timestamp = docItem.createdAt || docItem.lastModified;
    const date = new Date(timestamp);
    return Number.isNaN(date.getTime())
      ? docItem.importedAt
      : date.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: '2-digit' });
  };

  const mapBackendDocument = (document: BackendDocumentDto): ImportedDocument => ({
    id: document.id,
    name: document.originalName,
    size: document.size,
    type: document.mimeType,
    lastModified: new Date(document.createdAt).getTime(),
    importedAt: document.importedAt || new Date(document.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    importedBy: document.importedBy || 'ACS Member',
    userId: document.userId,
    userEmail: document.userEmail || '',
    status: document.status,
    notes: document.notes || '',
    category: document.category,
    createdAt: document.createdAt,
    s3Key: document.s3Key,
    sharedByName: document.sharedByName,
    sharedByEmail: document.sharedByEmail,
  });

  // Helper to categorize document types into 'pdf' | 'images' | 'videos' | 'audio' | 'doc' | 'other'
  const getDocTypeCategory = (docItem: ImportedDocument): 'pdf' | 'images' | 'videos' | 'audio' | 'doc' | 'other' => {
    const mime = (docItem.type || '').toLowerCase();
    const ext = (docItem.name.split('.').pop() || '').toLowerCase();

    if (mime.includes('pdf') || ext === 'pdf') {
      return 'pdf';
    }
    if (
      mime.startsWith('image/') ||
      ['png', 'jpg', 'jpeg', 'webp', 'svg', 'gif', 'bmp', 'ico', 'tiff'].includes(ext)
    ) {
      return 'images';
    }
    if (
      mime.startsWith('video/') ||
      ['mp4', 'mkv', 'avi', 'mov', 'webm', '3gp', 'wmv', 'flv'].includes(ext)
    ) {
      return 'videos';
    }
    if (
      mime.startsWith('audio/') ||
      ['mp3', 'wav', 'ogg', 'm4a', 'aac', 'flac', 'opus', 'weba', 'wma', 'aiff'].includes(ext)
    ) {
      return 'audio';
    }
    if (
      mime.includes('word') ||
      mime.includes('document') ||
      mime.includes('text') ||
      mime.includes('sheet') ||
      mime.includes('excel') ||
      ['doc', 'docx', 'txt', 'rtf', 'odt', 'pages', 'md', 'xls', 'xlsx', 'csv', 'ppt', 'pptx'].includes(ext)
    ) {
      return 'doc';
    }
    return 'other';
  };

  // Check if document was uploaded within the last 2 days (48 hours)
  const isWithinLast2Days = (docItem: ImportedDocument): boolean => {
    let timeMs = 0;
    if (docItem.createdAt && typeof (docItem.createdAt as any).toMillis === 'function') {
      timeMs = (docItem.createdAt as any).toMillis();
    } else if (typeof docItem.createdAt === 'number') {
      timeMs = docItem.createdAt;
    } else if (docItem.lastModified) {
      timeMs = docItem.lastModified;
    }

    // If no timestamp found, include it so it's not hidden
    if (!timeMs) return true;
    const twoDaysAgo = Date.now() - 2 * 24 * 60 * 60 * 1000;
    return timeMs >= twoDaysAgo;
  };

  const fetchDocuments = async () => {
    setLoadingDocs(true);
    try {
      const [items, sharedItems, outgoingShares] = await Promise.all([
        documentApi.listAll(),
        documentApi.listShared(),
        documentApi.listSharedByMe(),
      ]);
      setDocuments(items.map(mapBackendDocument));
      setSharedDocuments(sharedItems.map(mapBackendDocument));
      setSharedByMe(outgoingShares);
      setLoadingDocs(false);
      return;
    } catch (err: any) {
      console.error('Backend document list failed:', err);
      setDocuments([]);
      setUploadNotice(err?.message || 'Unable to load documents from the server.');
    }
    setLoadingDocs(false);
  };

  useEffect(() => {
    fetchDocuments();

    // Listen for global uploads from navbar
    const handleGlobalUpdate = () => {
      fetchDocuments();
    };
    window.addEventListener('acs_documents_updated', handleGlobalUpdate);

    return () => {
      window.removeEventListener('acs_documents_updated', handleGlobalUpdate);
    };
  }, [user?.uid, user?.displayName, user?.email]);

  // Trigger file selection directly from button
  const handleTriggerFileSelect = () => {
    if (selectedFolderId) {
      uploadFolderIdRef.current = selectedFolderId;
      openNativeFilePicker();
      return;
    }
    setIsUploadFolderPickerOpen(true);
  };

  const openNativeFilePicker = () => {
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
      fileInputRef.current.click();
    }
  };

  const handleChooseUploadFolder = (folderId: string | null) => {
    uploadFolderIdRef.current = folderId;
    setSelectedFolderId(folderId);
    setIsUploadFolderPickerOpen(false);
    setTimeout(() => openNativeFilePicker(), 0);
  };

  // Direct file selection & instant import handler
  const handleFilePicked = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 1) {
      for (const selectedFile of files) {
        const transfer = new DataTransfer();
        transfer.items.add(selectedFile);
        await handleFilePicked({ target: { files: transfer.files } } as React.ChangeEvent<HTMLInputElement>);
      }
      return;
    }

    const file = files[0];
    if (!file) return;

    setIsUploading(true);
    setUploadNotice(null);

    const docTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    let docId = `doc-${Date.now()}`;
    let fileDataUrl: string | undefined = undefined;

    const ext = (file.name.split('.').pop() || '').toLowerCase();
    const isVideo = file.type?.startsWith('video/') || ['mp4', 'mkv', 'avi', 'mov', 'webm', '3gp', 'wmv', 'flv', 'm4v', 'ogv'].includes(ext);
    const isAudio = file.type?.startsWith('audio/') || ['mp3', 'wav', 'ogg', 'm4a', 'aac', 'flac', 'opus', 'weba', 'wma', 'aiff'].includes(ext);
    const fileCategory = isAudio ? 'Audio Media' : isVideo ? 'Video Media' : 'Print Job';

    // Save full raw file to IndexedDB media storage immediately
    await saveMediaBlob(docId, file);

    // Keep a small local preview cache while the backend remains the source of truth.
    if (file.size < 700 * 1024) {
      try {
        fileDataUrl = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.onerror = () => resolve('');
          reader.readAsDataURL(file);
        });
      } catch (err) {
        console.warn('FileReader error:', err);
      }
    }

    let newDoc: ImportedDocument | null = null;

    // Upload to the ACS backend; the server stores the file and metadata.
    try {
      const backendDoc = await documentApi.upload(file, {
        category: fileCategory,
        importedBy: user?.displayName || 'ACS Member',
        userEmail: user?.email || undefined,
      });

      await saveMediaBlob(backendDoc.id, file);
      try {
        await linkMediaBlob(docId, backendDoc.id);
      } catch (_) { }

      newDoc = {
        id: backendDoc.id,
        name: backendDoc.originalName,
        size: backendDoc.size,
        type: backendDoc.mimeType,
        lastModified: new Date(backendDoc.createdAt).getTime(),
        importedAt: backendDoc.importedAt || docTime,
        importedBy: backendDoc.importedBy,
        userId: backendDoc.userId,
        userEmail: backendDoc.userEmail,
        status: backendDoc.status,
        category: backendDoc.category,
        s3Key: backendDoc.s3Key,
        fileDataUrl: fileDataUrl,
      };
    } catch (apiErr: any) {
      console.error('Backend user dashboard upload failed:', apiErr);
      setIsUploading(false);
      setUploadNotice(apiErr?.message || 'Upload failed. The file was not stored in AWS S3.');
      return;
    }

    const uploadFolderId = uploadFolderIdRef.current;
    if (uploadFolderId) {
      setFolderAssignments((current) => ({ ...current, [newDoc!.id]: uploadFolderId }));
    }
    setDocuments((prev) => [newDoc!, ...prev]);
    setIsUploading(false);
    setUploadNotice(`"${file.name}" uploaded successfully!`);

    setTimeout(() => {
      setUploadNotice(null);
    }, 4000);
  };

  // Delete Document handler
  const handleDeleteDoc = async (id: string) => {
    try {
      await documentApi.delete(id);
    } catch (err: any) {
      setUploadNotice(err?.message || 'Unable to delete this document.');
      return;
    }

    setDocuments((current) => current.filter((document) => document.id !== id));
    try {
      window.dispatchEvent(new Event('acs_documents_updated'));
    } catch (err) {
      console.warn('Document update event error:', err);
    }

    // Clear from media storage
    await deleteMediaBlob(id);

    if (selectedDoc?.id === id) {
      setIsDetailModalOpen(false);
      setSelectedDoc(null);
    }

    setUploadNotice('Document deleted successfully.');
    setTimeout(() => setUploadNotice(null), 3000);
  };

  // Save Document Edits handler
  const handleSaveDocEdits = async (updatedDoc: ImportedDocument) => {

    const updated = documents.map((d) => (d.id === updatedDoc.id ? updatedDoc : d));
    setDocuments(updated);

    try {
      window.dispatchEvent(new Event('acs_documents_updated'));
    } catch (err) {
      console.warn('Document update event error:', err);
    }

    if (selectedDoc?.id === updatedDoc.id) {
      setSelectedDoc(updatedDoc);
    }

    setUploadNotice(`Document "${updatedDoc.name}" updated successfully.`);
    setTimeout(() => setUploadNotice(null), 3500);
  };

  const handleOpenDocDetails = (docItem: ImportedDocument) => {
    setSelectedDoc(docItem);
    setIsDetailModalOpen(true);
  };

  const handleOpenEditModal = (docItem: ImportedDocument) => {
    setEditingDoc(docItem);
    setIsEditModalOpen(true);
  };

  const handleShareDocument = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!shareTarget || (!selectedShareUser && !shareWithEveryone)) return;

    setIsSharing(true);
    try {
      if (shareWithEveryone) {
        const result = await documentApi.shareWithAll(shareTarget.id);
        setUploadNotice(result.sharedCount
          ? `Shared "${shareTarget.name}" with ${result.sharedCount} registered user(s), including admins.`
          : `"${shareTarget.name}" is already shared with all eligible users.`);
      } else if (selectedShareUser) {
        const result = await documentApi.share(shareTarget.id, selectedShareUser.email);
        setUploadNotice(`Shared "${shareTarget.name}" with ${result.recipientEmail}.`);
      }
      void fetchDocuments();
      setShareTarget(null);
      setSelectedShareUser(null);
      setShareWithEveryone(false);
      setShareSearch('');
    } catch (error: any) {
      setUploadNotice(error?.message || 'Unable to share this file.');
    } finally {
      setIsSharing(false);
    }
  };

  const openShareDialog = async (document: ImportedDocument) => {
    setShareTarget(document);
    setSelectedShareUser(null);
    setShareWithEveryone(false);
    setShareSearch('');
    setShareDirectoryError(null);
    setLoadingShareDirectory(true);
    try {
      const users = await documentApi.listShareDirectory();
      setShareDirectory(users.filter((shareUser) => shareUser.id !== document.userId));
    } catch (error: any) {
      setShareDirectoryError(error?.message || 'Unable to load registered users.');
      setShareDirectory([]);
    } finally {
      setLoadingShareDirectory(false);
    }
  };

  const filteredShareDirectory = shareDirectory.filter((shareUser) =>
    `${shareUser.displayName} ${shareUser.email}`.toLowerCase().includes(shareSearch.trim().toLowerCase())
  );

  const handleRevokeShare = async (share: SharedByMeDto) => {
    try {
      await documentApi.revokeShare(share.document.id, share.recipientId);
      setUploadNotice(`Access to "${share.document.originalName}" revoked for ${share.recipientEmail}.`);
      void fetchDocuments();
    } catch (error: any) {
      setUploadNotice(error?.message || 'Unable to revoke shared access.');
    }
  };

  const handleSignOut = async () => {
    await logout();
    navigate('/');
  };

  // Base Scoped Documents (Time filter applied)
  const activeDocuments = activeDocumentView === 'mine' ? documents : sharedDocuments;

  const baseScopedDocs = React.useMemo(() => {
    return activeDocuments.filter((docItem) => {
      if (timeFilter === '2days') {
        if (!isWithinLast2Days(docItem)) return false;
      }
      return true;
    });
  }, [activeDocuments, timeFilter]);

  const folderScopedDocs = React.useMemo(() => {
    if (activeDocumentView !== 'mine') return baseScopedDocs;
    if (!selectedFolderId) return baseScopedDocs;
    const currentUserId = user?.uid?.trim();
    const currentUserEmail = user?.email?.toLowerCase().trim();
    return baseScopedDocs.filter((docItem) => {
      const belongsToCurrentUser = Boolean(
        (currentUserId && docItem.userId === currentUserId) ||
        (currentUserEmail && docItem.userEmail?.toLowerCase().trim() === currentUserEmail)
      );
      return folderAssignments[docItem.id] === selectedFolderId && belongsToCurrentUser;
    });
  }, [activeDocumentView, baseScopedDocs, folderAssignments, selectedFolderId, user?.uid, user?.email]);

  // Counts for each Document Type Filter within the current base scope
  const allTypeCount = folderScopedDocs.length;
  const pdfTypeCount = folderScopedDocs.filter((d) => getDocTypeCategory(d) === 'pdf').length;
  const imagesTypeCount = folderScopedDocs.filter((d) => getDocTypeCategory(d) === 'images').length;
  const videosTypeCount = folderScopedDocs.filter((d) => getDocTypeCategory(d) === 'videos').length;
  const audioTypeCount = folderScopedDocs.filter((d) => getDocTypeCategory(d) === 'audio').length;
  const docTypeCount = folderScopedDocs.filter((d) => getDocTypeCategory(d) === 'doc').length;

  // Final filtered list including docTypeFilter
  const displayDocs = React.useMemo(() => {
    return folderScopedDocs.filter((docItem) => {
      if (docTypeFilter === 'all') return true;
      return getDocTypeCategory(docItem) === docTypeFilter;
    });
  }, [folderScopedDocs, docTypeFilter]);

  const selectedFolderPath = React.useMemo(() => {
    if (!selectedFolderId) return null;
    const path: string[] = [];
    let folder = explorerFolders.find((item) => item.id === selectedFolderId);
    while (folder) {
      path.unshift(folder.name);
      folder = folder.parentId ? explorerFolders.find((item) => item.id === folder?.parentId) : undefined;
    }
    return path.join(' / ') || null;
  }, [explorerFolders, selectedFolderId]);

  const userSectionTitle = activeDocumentView === 'shared'
    ? 'Shared with me'
    : selectedFolderPath
    ? `${selectedFolderPath} · ${timeFilter === 'all' ? 'All Time' : 'Recent'} Uploads`
    : timeFilter === 'all'
      ? 'All Time Uploaded by You'
      : 'Recently Uploaded by You';

  // Count of documents uploaded in the last 2 days
  const recent2DaysCount = documents.filter((d) => isWithinLast2Days(d)).length;

  return (
    <div className="flex min-h-full flex-1 flex-col py-8 px-4 sm:px-6 lg:px-8 max-w-[90rem] mx-auto w-full">
      <div className="flex min-h-0 flex-1 flex-col gap-6 lg:flex-row lg:items-stretch">
        <FileExplorerSidebar
          key={explorerStorageKey}
          storageKey={explorerStorageKey}
          documents={documents}
          selectedFolderId={selectedFolderId}
          onFolderChange={(folderId) => {
            setSelectedFolderId(folderId);
            if (folderId) setTimeFilter('all');
          }}
          onAssignmentsChange={setFolderAssignments}
          onFoldersChange={setExplorerFolders}
          externalAssignments={folderAssignments}
        />
        <div className="min-w-0 flex-1">
          {/* Hidden File Input for Direct Import */}
          <input
            ref={fileInputRef}
            type="file"
            multiple
            id="user-dashboard-direct-file-input"
            accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg,.txt,.mp4,.mkv,.avi,.mov,.webm,.3gp,.mp3,.wav,.ogg,.m4a,.aac,.flac,audio/*,video/*"
            onChange={handleFilePicked}
            className="hidden"
            aria-label="Upload document directly from dashboard"
          />

          {isUploadFolderPickerOpen && (
            <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-900/40 p-4" onClick={() => setIsUploadFolderPickerOpen(false)}>
              <div className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-2xl" onClick={(event) => event.stopPropagation()}>
                <h2 className="text-base font-extrabold text-slate-900">Choose upload folder</h2>
                <p className="mt-1 text-xs text-slate-500">Select where this file should be stored.</p>
                <div className="mt-4 max-h-64 space-y-1 overflow-y-auto">
                  <button type="button" onClick={() => handleChooseUploadFolder(null)} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm hover:bg-blue-50"><Folder className="h-4 w-4 text-blue-500" />All files / Root</button>
                  {explorerFolders.map((folder) => <button key={folder.id} type="button" onClick={() => handleChooseUploadFolder(folder.id)} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm hover:bg-blue-50"><Folder className="h-4 w-4 text-amber-500" />{folder.name}</button>)}
                </div>
                <button type="button" onClick={() => setIsUploadFolderPickerOpen(false)} className="mt-4 w-full rounded-lg border border-slate-200 py-2 text-xs font-bold text-slate-600">Cancel</button>
              </div>
            </div>
          )}

          {/* Header Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-200 mb-6">
            <div>
              <div className="flex items-center space-x-2 text-xs text-[#0055ff] font-bold uppercase tracking-wider mb-1">
                <span>Customer Portal</span>
              </div>
              <h1 className="text-xl sm:text-2xl md:text-3xl font-extrabold text-[#04193d]">
                Welcome, {user?.displayName || 'ACS Member'}
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 mt-0.5 break-all sm:break-normal">
                Signed in with Google (<span className="font-semibold text-slate-700">{user?.email || 'Verified Google User'}</span>)
              </p>
            </div>

            <div className="flex items-center space-x-3 self-start sm:self-auto">
              <button
                onClick={handleSignOut}
                className="px-4 py-2.5 rounded-2xl border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-semibold transition-colors cursor-pointer shadow-xs"
              >
                Sign Out
              </button>
            </div>
          </div>

          {/* Instant Upload / Action Success Alert */}
          {uploadNotice && (
            <div className="mb-6 p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 flex items-center justify-between animate-in fade-in slide-in-from-top-2 duration-200">
              <div className="flex items-center space-x-2.5">
                <Check className="w-5 h-5 text-emerald-600 shrink-0" />
                <span className="text-xs font-bold">{uploadNotice}</span>
              </div>
            </div>
          )}

          {shareTarget && (
            <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm" onClick={() => setShareTarget(null)}>
              <form
                onSubmit={handleShareDocument}
                onClick={(event) => event.stopPropagation()}
                className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-5 shadow-2xl"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h2 className="text-base font-extrabold text-[#04193d]">Share file</h2>
                    <p className="mt-1 break-all text-xs text-slate-500">{shareTarget.name}</p>
                  </div>
                  <button type="button" onClick={() => setShareTarget(null)} className="rounded-md p-1 text-slate-500 hover:bg-slate-100" aria-label="Close share dialog">
                    <X className="h-4 w-4" />
                  </button>
                </div>
                <label htmlFor="share-user-search" className="mt-5 block text-xs font-bold text-slate-700">Registered users</label>
                <input
                  id="share-user-search"
                  type="search"
                  value={shareSearch}
                  onChange={(event) => setShareSearch(event.target.value)}
                  placeholder="Search by name or email"
                  className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
                <div className="mt-2 max-h-64 min-h-24 overflow-y-auto overscroll-contain rounded-lg border border-slate-200" role="listbox" aria-label="Registered users">
                  {loadingShareDirectory ? (
                    <div className="flex h-24 items-center justify-center gap-2 text-xs text-slate-500">
                      <Loader2 className="h-4 w-4 animate-spin" /> Loading users...
                    </div>
                  ) : shareDirectoryError ? (
                    <p className="p-4 text-center text-xs text-rose-600">{shareDirectoryError}</p>
                  ) : (
                    <>
                      {shareDirectory.length > 0 && (
                        <button
                          type="button"
                          role="option"
                          aria-selected={shareWithEveryone}
                          onClick={() => {
                            setShareWithEveryone(true);
                            setSelectedShareUser(null);
                          }}
                          className={`flex w-full items-center gap-3 border-b border-slate-200 px-3 py-3 text-left ${shareWithEveryone ? 'bg-emerald-50' : 'bg-slate-50/70 hover:bg-emerald-50/60'}`}
                        >
                          <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold ${shareWithEveryone ? 'bg-emerald-600 text-white' : 'bg-emerald-100 text-emerald-700'}`}>
                            <Users className="h-4 w-4" />
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block text-xs font-extrabold text-slate-800">Share with everyone</span>
                            <span className="block text-[11px] text-slate-500">{shareDirectory.length} registered users, including admins</span>
                          </span>
                          {shareWithEveryone && <Check className="h-4 w-4 shrink-0 text-emerald-700" />}
                        </button>
                      )}
                      {filteredShareDirectory.length === 0 ? (
                        <p className="p-4 text-center text-xs text-slate-500">
                          {shareDirectory.length ? 'No users match your search.' : 'No other eligible users found.'}
                        </p>
                      ) : filteredShareDirectory.map((shareUser) => {
                        const isSelected = selectedShareUser?.id === shareUser.id;
                        return (
                          <button
                            key={shareUser.id}
                            type="button"
                            role="option"
                            aria-selected={isSelected}
                            onClick={() => {
                              setSelectedShareUser(shareUser);
                              setShareWithEveryone(false);
                            }}
                            className={`flex w-full items-center gap-3 border-b border-slate-100 px-3 py-2.5 text-left last:border-b-0 ${isSelected ? 'bg-blue-50' : 'hover:bg-slate-50'}`}
                          >
                            <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold ${isSelected ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600'}`}>
                              {(shareUser.displayName || shareUser.email).slice(0, 1).toUpperCase()}
                            </span>
                            <span className="min-w-0 flex-1">
                              <span className="block truncate text-xs font-bold text-slate-800">{shareUser.displayName}</span>
                              <span className="flex items-center gap-1.5">
                                <span className="block truncate text-[11px] text-slate-500">{shareUser.email}</span>
                                {shareUser.role === 'ADMIN' && <span className="shrink-0 rounded bg-amber-100 px-1.5 py-0.5 text-[9px] font-extrabold uppercase text-amber-800">Admin</span>}
                              </span>
                            </span>
                            {isSelected && <Check className="h-4 w-4 shrink-0 text-blue-600" />}
                          </button>
                        );
                      })}
                    </>
                  )}
                </div>
                <p className="mt-2 text-[11px] text-slate-500">They can view and download the file. Only you can edit or delete it.</p>
                <div className="mt-5 flex justify-end gap-2">
                  <button type="button" onClick={() => setShareTarget(null)} className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50">Cancel</button>
                  <button type="submit" disabled={isSharing || loadingShareDirectory || (!selectedShareUser && !shareWithEveryone)} className="inline-flex items-center gap-2 rounded-lg bg-[#0055ff] px-3 py-2 text-xs font-bold text-white hover:bg-blue-700 disabled:opacity-60">
                    {isSharing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Share2 className="h-4 w-4" />}
                    Share file
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* ================= FILE VIEWS ================= */}
          <div className="mb-4 flex gap-1 overflow-x-auto border-b border-slate-200" role="tablist" aria-label="Document views">
            <button
              type="button"
              role="tab"
              aria-selected={activeDocumentView === 'mine'}
              onClick={() => setActiveDocumentView('mine')}
              className={`border-b-2 px-3 py-2 text-xs font-bold transition-colors ${activeDocumentView === 'mine' ? 'border-[#0055ff] text-[#0055ff]' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
            >
              My files <span className="ml-1 text-[10px]">{documents.length}</span>
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={activeDocumentView === 'shared'}
              onClick={() => {
                setActiveDocumentView('shared');
                setSelectedFolderId(null);
              }}
              className={`border-b-2 px-3 py-2 text-xs font-bold transition-colors ${activeDocumentView === 'shared' ? 'border-emerald-600 text-emerald-700' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
            >
              Shared with me <span className="ml-1 text-[10px]">{sharedDocuments.length}</span>
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={activeDocumentView === 'sharedByMe'}
              onClick={() => setActiveDocumentView('sharedByMe')}
              className={`shrink-0 border-b-2 px-3 py-2 text-xs font-bold transition-colors ${activeDocumentView === 'sharedByMe' ? 'border-orange-600 text-orange-700' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
            >
              Shared by me <span className="ml-1 text-[10px]">{sharedByMe.length}</span>
            </button>
          </div>
          {activeDocumentView === 'sharedByMe' ? (
            <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white" aria-label="Files shared by me">
              <div className="border-b border-slate-100 bg-slate-50/60 px-4 py-4">
                <h2 className="text-sm font-extrabold text-[#04193d]">Shared by me <span className="ml-1 text-xs text-slate-400">{sharedByMe.length}</span></h2>
              </div>
              {sharedByMe.length ? (
                <div className="divide-y divide-slate-100">
                  {sharedByMe.map((share) => (
                    <div key={`${share.document.id}-${share.recipientId}`} className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                      <button type="button" onClick={() => handleOpenDocDetails(mapBackendDocument(share.document))} className="min-w-0 text-left">
                        <span className="block truncate text-xs font-bold text-[#04193d]">{share.document.originalName}</span>
                        <span className="mt-0.5 block truncate text-[11px] text-slate-500">With: {share.recipientEmail}</span>
                      </button>
                      <div className="flex shrink-0 items-center gap-2">
                        <button type="button" onClick={() => void handleRevokeShare(share)} className="rounded-md border border-rose-200 px-2.5 py-1.5 text-[11px] font-bold text-rose-600 hover:bg-rose-50">Revoke</button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : <p className="px-4 py-12 text-center text-xs text-slate-500">You have not shared any files yet.</p>}
            </section>
          ) : (
          <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
            {/* Section Header with Time Filter & File Type Filters */}
            <div className="p-4 sm:p-5 border-b border-slate-100 flex flex-col xl:flex-row xl:items-center justify-between gap-4 bg-slate-50/50">
              <div>
                <div className="flex items-center space-x-2.5 flex-wrap gap-y-1">
                  <h2 className="font-extrabold text-sm sm:text-base text-[#04193d]">
                    {userSectionTitle}
                  </h2>
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-extrabold bg-blue-100 text-[#0055ff]">
                    {displayDocs.length}
                  </span>

                  {/* Toggle between Last 2 Days vs All Time */}
                  <div className="inline-flex items-center bg-white border border-slate-200 rounded-xl p-0.5 text-[11px] font-bold shadow-xs">
                    <button
                      type="button"
                      onClick={() => setTimeFilter('2days')}
                      className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${timeFilter === '2days'
                        ? 'bg-blue-600 text-white font-extrabold shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                        }`}
                      title="Show documents uploaded within the last 48 hours"
                    >
                      Last 2 Days
                    </button>
                    <button
                      type="button"
                      onClick={() => setTimeFilter('all')}
                      className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${timeFilter === 'all'
                        ? 'bg-blue-600 text-white font-extrabold shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                        }`}
                      title="Show all-time uploaded documents"
                    >
                      All Time
                    </button>
                  </div>
                </div>
              </div>

              {/* Right Side: Document Type Filters (pdf, images, videos, doc, all) & Upload Button */}
              <div className="flex flex-wrap items-center gap-3 self-start xl:self-auto">
                {/* 5 Requested File Type Filters */}
                <div className="flex items-center space-x-1 bg-white p-1 rounded-2xl border border-slate-200 shadow-xs overflow-x-auto max-w-full">
                  {/* All */}
                  <button
                    id="user-filter-type-all"
                    onClick={() => setDocTypeFilter('all')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${docTypeFilter === 'all'
                      ? 'bg-[#0055ff] text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                      }`}
                  >
                    All ({allTypeCount})
                  </button>

                  {/* PDF */}
                  <button
                    id="user-filter-type-pdf"
                    onClick={() => setDocTypeFilter('pdf')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${docTypeFilter === 'pdf'
                      ? 'bg-rose-600 text-white shadow-xs'
                      : 'text-slate-600 hover:text-rose-600 hover:bg-rose-50/50'
                      }`}
                  >
                    PDF ({pdfTypeCount})
                  </button>

                  {/* Images */}
                  <button
                    id="user-filter-type-images"
                    onClick={() => setDocTypeFilter('images')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${docTypeFilter === 'images'
                      ? 'bg-purple-600 text-white shadow-xs'
                      : 'text-slate-600 hover:text-purple-600 hover:bg-purple-50/50'
                      }`}
                  >
                    Images ({imagesTypeCount})
                  </button>

                  {/* Videos */}
                  <button
                    id="user-filter-type-videos"
                    onClick={() => setDocTypeFilter('videos')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${docTypeFilter === 'videos'
                      ? 'bg-amber-600 text-white shadow-xs'
                      : 'text-slate-600 hover:text-amber-600 hover:bg-amber-50/50'
                      }`}
                  >
                    Videos ({videosTypeCount})
                  </button>

                  {/* Audio */}
                  <button
                    id="user-filter-type-audio"
                    onClick={() => setDocTypeFilter('audio')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap flex items-center space-x-1.5 ${docTypeFilter === 'audio'
                      ? 'bg-violet-600 text-white shadow-xs'
                      : 'text-slate-600 hover:text-violet-600 hover:bg-violet-50/50'
                      }`}
                  >
                    <Headphones className="w-3.5 h-3.5" />
                    <span>Audio ({audioTypeCount})</span>
                  </button>

                  {/* Doc */}
                  <button
                    id="user-filter-type-doc"
                    onClick={() => setDocTypeFilter('doc')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${docTypeFilter === 'doc'
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'text-slate-600 hover:text-blue-600 hover:bg-blue-50/50'
                      }`}
                  >
                    Doc ({docTypeCount})
                  </button>
                </div>

                {/* Upload File Button with Pulsing Glow */}
                <div className="relative inline-flex items-center">
                  <span className="absolute -inset-1 rounded-2xl bg-gradient-to-r from-[#0055ff]/30 to-[#ff6600]/30 blur-xs animate-pulse pointer-events-none" />

                  <button
                    id="user-queue-animated-upload-btn"
                    onClick={handleTriggerFileSelect}
                    disabled={isUploading}
                    type="button"
                    className="relative z-10 inline-flex items-center space-x-2 px-4 py-2 sm:py-2.5 rounded-2xl bg-gradient-to-r from-[#0055ff] via-[#0066fe] to-[#ff6600] hover:from-[#0044cc] hover:to-[#ff5500] text-white text-xs sm:text-sm font-extrabold shadow-md shadow-blue-500/25 hover:shadow-orange-500/30 transition-all transform active:scale-95 cursor-pointer disabled:opacity-50 group"
                    title="Upload file directly to queue"
                  >
                    {isUploading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin text-white" />
                        <span>Uploading...</span>
                      </>
                    ) : (
                      <>
                        <CloudUpload className="w-4 h-4 text-white group-hover:scale-110 transition-transform" />
                        <span>Upload File</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>

            {/* Document List Content */}
            {loadingDocs ? (
              <div className="py-16 flex flex-col items-center justify-center space-y-2 text-slate-500 text-xs">
                <Loader2 className="w-6 h-6 animate-spin text-[#0055ff]" />
                <span>Loading your documents from the server...</span>
              </div>
            ) : activeDocuments.length === 0 && activeDocumentView === 'shared' ? (
              <div className="px-4 py-14 text-center">
                <Share2 className="mx-auto h-8 w-8 text-slate-300" />
                <p className="mt-3 text-sm font-bold text-slate-700">No files have been shared with you yet.</p>
              </div>
            ) : activeDocuments.length === 0 ? (
              /* Empty State when User has 0 uploaded documents at all: Interactive Ping Dropzone */
              <div className="py-12 sm:py-16 px-4 flex flex-col items-center justify-center">
                <div
                  id="user-dashboard-ping-import-zone"
                  onClick={handleTriggerFileSelect}
                  onMouseEnter={() => setIsDropzoneHovered(true)}
                  onMouseLeave={() => setIsDropzoneHovered(false)}
                  className="relative flex items-center justify-center cursor-pointer transition-transform duration-300 active:scale-95 group focus:outline-none focus:ring-4 focus:ring-blue-500/30 rounded-full my-4"
                  role="button"
                  tabIndex={0}
                  aria-label="Click to upload your file"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      handleTriggerFileSelect();
                    }
                  }}
                >
                  {/* Ripple Animations */}
                  <div className="absolute inset-0 rounded-full border-2 border-blue-500/40 animate-ripple-1 pointer-events-none" />
                  <div className="absolute inset-0 rounded-full border border-orange-500/35 animate-ripple-2 pointer-events-none" />
                  <div className="absolute inset-0 rounded-full border border-blue-600/25 animate-ripple-3 pointer-events-none" />

                  {/* Halo */}
                  <div
                    className={`absolute inset-3 rounded-full bg-gradient-to-tr from-[#0055ff]/20 via-[#ff6600]/15 to-[#00d4ff]/20 blur-xl transition-opacity duration-500 ${isDropzoneHovered ? 'opacity-100 scale-105' : 'opacity-70'
                      }`}
                  />

                  {/* Interactive Inner Sphere */}
                  <div
                    className="relative z-10 w-56 h-56 sm:w-72 sm:h-72 md:w-80 md:h-80 rounded-full bg-white/95 backdrop-blur-xl border-2 border-blue-200/90 shadow-[0_20px_50px_rgba(0,85,255,0.18)] flex flex-col items-center justify-center p-6 transition-all duration-300 group-hover:border-[#ff6600] group-hover:shadow-[0_25px_60px_rgba(255,102,0,0.22)]"
                  >
                    <div className="absolute inset-4 sm:inset-6 rounded-full border border-dashed border-blue-200/90 pointer-events-none" />
                    <div className="absolute inset-8 sm:inset-12 rounded-full border border-orange-100 pointer-events-none" />

                    <div className="relative mb-3">
                      <div className="w-14 h-14 sm:w-18 sm:h-18 md:w-20 md:h-20 rounded-2xl sm:rounded-3xl bg-gradient-to-tr from-[#0044cc] via-[#0066fe] to-[#ff6600] text-white flex items-center justify-center shadow-lg shadow-blue-600/30 group-hover:scale-105 group-hover:shadow-orange-500/30 transition-all duration-300">
                        <CloudUpload className="w-7 h-7 sm:w-9 sm:h-9 md:w-10 md:h-10 stroke-[1.75] text-white" />
                      </div>
                      <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-[#ff5500] text-white flex items-center justify-center shadow-sm border-2 border-white">
                        <Sparkles className="w-3 h-3 text-amber-200" />
                      </div>
                    </div>

                    <h3 className="text-base sm:text-xl font-extrabold text-[#04193d] tracking-tight group-hover:text-[#0055ff] transition-colors text-center">
                      Upload Your File
                    </h3>

                    <p className="text-[11px] sm:text-xs text-slate-500 max-w-[190px] sm:max-w-[220px] text-center mt-1 mb-3 sm:mb-4">
                      Click anywhere to browse & select documents
                    </p>

                    <button
                      id="user-dashboard-import-main-btn"
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleTriggerFileSelect();
                      }}
                      className="inline-flex items-center justify-center space-x-2 px-5 sm:px-6 py-2 sm:py-2.5 rounded-full bg-gradient-to-r from-[#0055ff] via-[#0066fe] to-[#ff6600] hover:from-[#0044cc] hover:to-[#ff5500] text-white font-bold text-xs sm:text-sm tracking-wide shadow-md shadow-blue-600/25 group-hover:shadow-orange-500/30 transition-all transform group-hover:-translate-y-0.5 cursor-pointer outline-none"
                    >
                      <span>Upload File</span>
                    </button>
                  </div>
                </div>

                <div className="flex items-center space-x-2 text-[11px] sm:text-xs text-slate-500 font-medium mt-3 bg-slate-50 px-3.5 py-1.5 rounded-full border border-slate-200/70 shadow-xs">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span>Supported: PDF, Word, Excel, Images, Videos, Text files</span>
                </div>
              </div>
            ) : displayDocs.length === 0 ? (
              /* When files exist but don't match current filter */
              <div className="py-16 text-center text-slate-500 text-xs px-4">
                <FileText className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                <p className="font-semibold text-slate-700">{selectedFolderId ? 'This folder is empty.' : 'No documents found matching this filter.'}</p>
                {selectedFolderId && <p className="mt-1 text-xs text-slate-500">Upload a file to start using this folder.</p>}
                {selectedFolderId && (
                  <button
                    type="button"
                    onClick={handleTriggerFileSelect}
                    disabled={isUploading}
                    className="mt-4 inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-[#0055ff] via-[#0066fe] to-[#ff6600] px-4 py-2 text-xs font-extrabold text-white shadow-md shadow-blue-500/25 transition-all hover:from-[#0044cc] hover:to-[#ff5500] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {isUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <CloudUpload className="h-4 w-4" />}
                    {isUploading ? 'Uploading...' : 'Upload File to This Folder'}
                  </button>
                )}
                {timeFilter === '2days' && documents.length > 0 && (
                  <button
                    onClick={() => setTimeFilter('all')}
                    className="mt-3 inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-blue-50 text-[#0055ff] hover:bg-blue-100 font-bold text-xs transition-colors cursor-pointer"
                  >
                    <span>View All Time Documents ({documents.length})</span>
                  </button>
                )}
              </div>
            ) : (
              /* ================= DOCUMENT ROWS =================
                 NO status buttons/pills!
                 ONLY 3 ACTIONS:
                 1. View
                 2. Edit
                 3. Delete
              */
              <div className="divide-y divide-slate-100">
                {displayDocs.map((docItem) => {
                  const categoryType = getDocTypeCategory(docItem);

                  return (
                    <div
                      key={docItem.id}
                      draggable
                      onDragStart={(event) => event.dataTransfer.setData('text/document-id', docItem.id)}
                      onClick={() => handleOpenDocDetails(docItem)}
                      className="p-3.5 sm:p-4.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-3.5 hover:bg-blue-50/40 transition-colors cursor-pointer group"
                      role="button"
                      tabIndex={0}
                      aria-label={`View document ${docItem.name}`}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          handleOpenDocDetails(docItem);
                        }
                      }}
                    >
                      {/* Document Details (Clickable) */}
                      <div className="flex items-start space-x-3 sm:space-x-3.5 flex-1 min-w-0">
                        <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-blue-50 text-[#0055ff] group-hover:bg-[#0055ff] group-hover:text-white flex items-center justify-center shrink-0 border border-blue-100 transition-all duration-200 mt-0.5">
                          {categoryType === 'pdf' ? (
                            <FileText className="w-4 h-4 sm:w-5 sm:h-5 text-rose-600 group-hover:text-white" />
                          ) : categoryType === 'images' ? (
                            <ImageIcon className="w-4 h-4 sm:w-5 sm:h-5 text-purple-600 group-hover:text-white" />
                          ) : categoryType === 'videos' ? (
                            <Video className="w-4 h-4 sm:w-5 sm:h-5 text-amber-600 group-hover:text-white" />
                          ) : categoryType === 'audio' ? (
                            <Headphones className="w-4 h-4 sm:w-5 sm:h-5 text-violet-600 group-hover:text-white" />
                          ) : (
                            <FileSpreadsheet className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600 group-hover:text-white" />
                          )}
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-center space-x-1.5 sm:space-x-2 flex-wrap">
                            <h4 className="text-xs sm:text-sm font-bold text-[#04193d] group-hover:text-[#0055ff] transition-colors truncate max-w-[200px] xs:max-w-xs sm:max-w-md" title={docItem.name}>
                              {docItem.name}
                            </h4>
                            <span className="text-[10px] font-semibold text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded shrink-0">
                              {formatFileSize(docItem.size)}
                            </span>
                            <span className={`text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded shrink-0 ${categoryType === 'audio'
                              ? 'bg-violet-100 text-violet-700'
                              : categoryType === 'videos'
                                ? 'bg-amber-100 text-amber-700'
                                : categoryType === 'images'
                                  ? 'bg-purple-100 text-purple-700'
                                  : categoryType === 'pdf'
                                    ? 'bg-rose-100 text-rose-700'
                                    : 'bg-slate-100 text-slate-600'
                              }`}>
                              {categoryType.toUpperCase()}
                            </span>
                          </div>

                          <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[10px] sm:text-[11px] text-slate-500 mt-1">
                            {activeDocumentView === 'shared' ? (
                              <span>By: {docItem.sharedByEmail || docItem.userEmail}</span>
                            ) : (
                              <>
                                <span className="font-mono text-slate-600">ID: {docItem.id.slice(-8)}</span>
                                <span>•</span>
                                <span>{formatUploadDate(docItem)}</span>
                                <span>•</span>
                                <span className="text-[#ff6600] font-semibold">{docItem.category || 'Print Job'}</span>
                                {docItem.notes && (
                                  <>
                                    <span>•</span>
                                    <span className="text-slate-600 italic truncate max-w-[150px] sm:max-w-[200px]">Note: {docItem.notes}</span>
                                  </>
                                )}
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* ================= USER ACTION BUTTONS =================
                              Users can view and edit their submissions.
                  */}
                      <div
                        className="flex items-center space-x-1.5 sm:space-x-2 self-start sm:self-center shrink-0 pt-1 sm:pt-0"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {/* 1. View / Play Button */}
                        {categoryType === 'audio' ? (
                          <button
                            id={`user-play-audio-${docItem.id}`}
                            onClick={() => handleOpenDocDetails(docItem)}
                            className="inline-flex items-center space-x-1.5 px-3 py-1.5 text-xs font-bold text-violet-700 hover:text-white bg-violet-50 hover:bg-violet-600 rounded-xl border border-violet-200 transition-colors cursor-pointer shadow-2xs min-h-[34px]"
                            title="Play audio file with sound"
                            aria-label="Play audio"
                          >
                            <Headphones className="w-3.5 h-3.5 text-violet-600 group-hover:text-white" />
                            <span>Play Audio</span>
                          </button>
                        ) : (
                          <button
                            id={`user-view-doc-${docItem.id}`}
                            onClick={() => handleOpenDocDetails(docItem)}
                            className="inline-flex items-center space-x-1.5 px-3 py-1.5 text-xs font-bold text-slate-700 hover:text-[#0055ff] bg-white hover:bg-blue-50 rounded-xl border border-slate-200 hover:border-blue-200 transition-colors cursor-pointer shadow-2xs min-h-[34px]"
                            title="View document"
                            aria-label="View document"
                          >
                            <Eye className="w-3.5 h-3.5 text-slate-500 group-hover:text-[#0055ff]" />
                            <span>View</span>
                          </button>
                        )}

                        {activeDocumentView === 'mine' && (
                          <>
                            <button
                              id={`user-share-doc-${docItem.id}`}
                              onClick={() => openShareDialog(docItem)}
                              className="inline-flex min-h-[34px] items-center space-x-1.5 rounded-xl border border-emerald-200 bg-white px-3 py-1.5 text-xs font-bold text-emerald-700 shadow-2xs transition-colors hover:bg-emerald-50"
                              title="Share with a registered user"
                              aria-label="Share document"
                            >
                              <Share2 className="h-3.5 w-3.5" />
                              <span>Share</span>
                            </button>
                            <button
                              id={`user-edit-doc-${docItem.id}`}
                              onClick={() => handleOpenEditModal(docItem)}
                              className="inline-flex items-center space-x-1.5 px-3 py-1.5 text-xs font-bold text-slate-700 hover:text-[#0055ff] bg-white hover:bg-slate-50 rounded-xl border border-slate-200 hover:border-blue-200 transition-colors cursor-pointer shadow-2xs min-h-[34px]"
                              title="Edit document details"
                              aria-label="Edit document"
                            >
                              <Edit3 className="w-3.5 h-3.5 text-slate-500 group-hover:text-[#0055ff]" />
                              <span>Edit</span>
                            </button>
                            <button
                              id={`user-delete-doc-${docItem.id}`}
                              type="button"
                              onClick={() => {
                                if (window.confirm(`Delete "${docItem.name}"? This cannot be undone.`)) {
                                  void handleDeleteDoc(docItem.id);
                                }
                              }}
                              className="inline-flex min-h-[34px] items-center space-x-1.5 rounded-xl border border-rose-200 bg-white px-3 py-1.5 text-xs font-bold text-rose-600 shadow-2xs transition-colors hover:bg-rose-50"
                              title="Delete your file"
                              aria-label="Delete document"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                              <span>Delete</span>
                            </button>
                          </>
                        )}

                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
          )}

        </div>

        {/* ================= REAL DOCUMENT VIEWER MODAL (SAME AS ADMIN PANEL) ================= */}
        <RealDocumentViewerModal
          document={selectedDoc}
          isOpen={isDetailModalOpen}
          onClose={() => {
            setIsDetailModalOpen(false);
            setSelectedDoc(null);
          }}
          isAdmin={false}
        />

        {/* ================= USER EDIT DOCUMENT MODAL ================= */}
        <UserEditDocModal
          document={editingDoc}
          isOpen={isEditModalOpen}
          onClose={() => {
            setIsEditModalOpen(false);
            setEditingDoc(null);
          }}
          onSave={handleSaveDocEdits}
        />
      </div>
    </div>
  );
};
