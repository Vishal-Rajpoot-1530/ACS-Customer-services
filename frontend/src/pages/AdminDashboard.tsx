import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  ShieldCheck,
  FileText,
  CheckCircle2,
  Trash2,
  Loader2,
  Edit3,
  Eye,
  Download,
  Users,
  User,
  X,
  Search,
  Calendar,
  CloudUpload,
  FileType,
  Image as ImageIcon,
  Video,
  FileSpreadsheet,
  FileCode,
  FileCheck,
  ArrowLeft,
  Play,
  Film,
  ChevronRight,
  FolderOpen,
  Sparkles,
  Headphones,
  Music,
  Volume2,
  UserX,
  AlertTriangle,
  Folder,
  Share2,
} from 'lucide-react';
import { ImportedDocument } from '../types';
import { useNavigate } from 'react-router-dom';
import { RealDocumentViewerModal } from '../components/RealDocumentViewerModal';
import { AdminEditDocModal } from '../components/AdminEditDocModal';
import { saveMediaBlob, deleteMediaBlob, getMediaBlobUrl, linkMediaBlob } from '../utils/mediaStorage';
import { adminApi, AdminUserDto } from '../api/admin.api';
import { BackendDocumentDto, documentApi, ShareDirectoryUserDto, SharedByMeDto } from '../api/document.api';
import { FileExplorerSidebar, ExplorerFolder } from '../components/FileExplorerSidebar';

type DocTypeFilter = 'all' | 'pdf' | 'images' | 'videos' | 'audio' | 'doc';
type TimeRangeFilter = '2days' | 'all';
type UserDirectoryScope = 'users' | 'admins';

interface UserSummary {
  userId: string;
  name: string;
  email: string;
  role?: string;
  photoURL?: string;
  docCount: number;
  videoCount: number;
  audioCount: number;
  pdfCount: number;
  imageCount: number;
  lastUploaded: string;
}

export const AdminDashboard: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [documents, setDocuments] = useState<ImportedDocument[]>([]);
  const explorerStorageKey = 'acs-explorer-admin';
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [folderAssignments, setFolderAssignments] = useState<Record<string, string>>({});
  const [explorerFolders, setExplorerFolders] = useState<ExplorerFolder[]>([]);
  const [isUploadFolderPickerOpen, setIsUploadFolderPickerOpen] = useState(false);
  const uploadFolderIdRef = useRef<string | null>(null);
  const [docTypeFilter, setDocTypeFilter] = useState<DocTypeFilter>('all');
  const [timeFilter, setTimeFilter] = useState<TimeRangeFilter>('all');
  const [selectedUserFilter, setSelectedUserFilter] = useState<{ email: string; name: string } | null>(null);
  const [isUserListModalOpen, setIsUserListModalOpen] = useState<boolean>(false);
  const [userSearchQuery, setUserSearchQuery] = useState<string>('');

  // User Documents & Videos Drill-down Explorer states
  const [registeredUsers, setRegisteredUsers] = useState<any[]>([]);
  const [userDirectoryScope, setUserDirectoryScope] = useState<UserDirectoryScope>('users');
  const [selectedUserForDocs, setSelectedUserForDocs] = useState<UserSummary | null>(null);
  const [userDocsFilter, setUserDocsFilter] = useState<'all' | 'videos' | 'documents' | 'images' | 'audio'>('all');
  const [userDocSearch, setUserDocSearch] = useState<string>('');

  // Delete User confirmation state
  const [userToDelete, setUserToDelete] = useState<UserSummary | null>(null);
  const [isDeletingUser, setIsDeletingUser] = useState<boolean>(false);

  const [loadingDocs, setLoadingDocs] = useState<boolean>(true);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [adminNotice, setAdminNotice] = useState<string | null>(null);
  const [shareTarget, setShareTarget] = useState<ImportedDocument | null>(null);
  const [shareDirectory, setShareDirectory] = useState<ShareDirectoryUserDto[]>([]);
  const [selectedShareUser, setSelectedShareUser] = useState<ShareDirectoryUserDto | null>(null);
  const [shareWithEveryone, setShareWithEveryone] = useState(false);
  const [shareSearch, setShareSearch] = useState('');
  const [loadingShareDirectory, setLoadingShareDirectory] = useState(false);
  const [shareDirectoryError, setShareDirectoryError] = useState<string | null>(null);
  const [isSharing, setIsSharing] = useState(false);
  const [sharedWithMe, setSharedWithMe] = useState<ImportedDocument[]>([]);
  const [sharedByMe, setSharedByMe] = useState<SharedByMeDto[]>([]);
  const [sharedFilesView, setSharedFilesView] = useState<'mine' | 'received' | 'sent'>('mine');

  // Selected document for Detail Modal
  const [selectedDoc, setSelectedDoc] = useState<ImportedDocument | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState<boolean>(false);

  // Selected document for Edit Modal
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

  // Check if a document was uploaded by an admin user
  const isDocUploadedByAdmin = (docItem: ImportedDocument): boolean => {
    // 1. Match logged-in admin user ID
    if (user?.uid && docItem.userId && (docItem.userId === user.uid || docItem.userId === 'admin-user')) {
      return true;
    }
    // 2. Match logged-in admin email
    if (user?.email && docItem.userEmail && docItem.userEmail.toLowerCase().trim() === user.email.toLowerCase().trim()) {
      return true;
    }
    // 3. Match admin indicators in userEmail or importedBy
    const email = (docItem.userEmail || '').toLowerCase().trim();
    const importedBy = (docItem.importedBy || '').toLowerCase().trim();
    if (email.includes('admin') || importedBy.includes('admin')) {
      return true;
    }
    // 4. Match admin displayName
    if (user?.displayName && importedBy === user.displayName.toLowerCase().trim()) {
      return true;
    }
    return false;
  };

  const fetchAdminQueue = async () => {
    setLoadingDocs(true);
    try {
      const items = await adminApi.getQueueAll();
      const mapped: ImportedDocument[] = items.map((b) => ({
        id: b.id,
        name: b.originalName,
        size: b.size,
        type: b.mimeType,
        lastModified: new Date(b.createdAt).getTime(),
        importedAt: b.importedAt || new Date(b.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        importedBy: b.importedBy || 'ACS Member',
        userId: b.userId || '',
        userEmail: b.userEmail || '',
        status: b.status,
        notes: b.notes || '',
        category: b.category,
        createdAt: b.createdAt,
        s3Key: b.s3Key,
      }));
      setDocuments(mapped);
      setLoadingDocs(false);
      return;
    } catch (err: any) {
      console.error('Backend admin document list failed:', err);
      setDocuments([]);
      setAdminNotice(err?.message || 'Unable to load documents from the server.');
    }
    setLoadingDocs(false);
  };

  const fetchAdminUsers = async () => {
    try {
      const users = await adminApi.getUsers();
      setRegisteredUsers(users);
    } catch (err: any) {
      console.error('Backend admin user list failed:', err);
      setAdminNotice(err?.message || 'Unable to load users from the server.');
    }
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

  const fetchShareLists = async () => {
    try {
      const [received, sent] = await Promise.all([
        documentApi.listShared(),
        documentApi.listSharedByMe(),
      ]);
      setSharedWithMe(received.map(mapBackendDocument));
      setSharedByMe(sent);
    } catch (err: any) {
      console.error('Backend shared documents list failed:', err);
      setAdminNotice(err?.message || 'Unable to load shared documents.');
    }
  };

  useEffect(() => {
    fetchAdminQueue();
    fetchAdminUsers();
    fetchShareLists();

    // Also listen for document updates from Navbar universal upload
    const handleGlobalUpdate = () => {
      fetchAdminQueue();
      fetchShareLists();
    };
    window.addEventListener('acs_documents_updated', handleGlobalUpdate);

    return () => {
      window.removeEventListener('acs_documents_updated', handleGlobalUpdate);
    };
  }, []);

  // Compute rich unique users list merging registered users and upload history
  const uniqueUsersList: UserSummary[] = React.useMemo(() => {
    const userMap = new Map<string, UserSummary>();

    // 1. Add registered users
    registeredUsers.forEach((ru) => {
      const email = ru.email?.trim() || '';
      const name = ru.displayName?.trim() || ru.name?.trim() || 'Customer';
      const key = ru.uid || email || name;
      if (!key) return;

      userMap.set(key, {
        userId: ru.uid || ru.id || key,
        name: name,
        email: email || 'No email registered',
        role: ru.role === 'ADMIN' || ru.role === 'admin' || ru.isAdminAuthorized ? 'Admin' : 'Member',
        photoURL: ru.photoURL || '',
        docCount: 0,
        videoCount: 0,
        audioCount: 0,
        pdfCount: 0,
        imageCount: 0,
        lastUploaded: ru.lastLoginAt ? 'Active Member' : 'Registered'
      });
    });

    // 2. Scan all documents and attribute to users with accurate media counts
    documents.forEach((d) => {
      const email = d.userEmail?.trim() || '';
      const name = d.importedBy?.trim() || 'Customer';
      const ext = (d.name.split('.').pop() || '').toLowerCase();
      const isVideo = d.type?.startsWith('video/') || ['mp4', 'mkv', 'avi', 'mov', 'webm', '3gp', 'wmv', 'flv', 'm4v', 'ogv'].includes(ext);
      const isAudio = d.type?.startsWith('audio/') || ['mp3', 'wav', 'ogg', 'm4a', 'aac', 'flac', 'opus', 'weba', 'wma', 'aiff'].includes(ext);
      const isPdf = d.type?.includes('pdf') || ext === 'pdf';
      const isImage = d.type?.startsWith('image/') || ['png', 'jpg', 'jpeg', 'webp', 'svg', 'gif'].includes(ext);

      // Match with existing user if possible
      let matchedKey: string | null = null;
      for (const [k, u] of userMap.entries()) {
        if (d.userId && u.userId === d.userId) {
          matchedKey = k;
          break;
        }
        if (email && email !== 'no email registered' && u.email.toLowerCase() === email.toLowerCase()) {
          matchedKey = k;
          break;
        }
        if (name && u.name.toLowerCase() === name.toLowerCase()) {
          matchedKey = k;
          break;
        }
      }

      const key = matchedKey || email || d.userId || name;
      if (!key) return;

      if (!userMap.has(key)) {
        userMap.set(key, {
          userId: d.userId || key,
          name: name,
          email: email || 'No email registered',
          role: 'Member',
          docCount: 1,
          videoCount: isVideo ? 1 : 0,
          audioCount: isAudio ? 1 : 0,
          pdfCount: isPdf ? 1 : 0,
          imageCount: isImage ? 1 : 0,
          lastUploaded: d.importedAt || 'Recent'
        });
      } else {
        const existing = userMap.get(key)!;
        existing.docCount += 1;
        if (isVideo) existing.videoCount += 1;
        if (isAudio) existing.audioCount = (existing.audioCount || 0) + 1;
        if (isPdf) existing.pdfCount += 1;
        if (isImage) existing.imageCount += 1;
        if (d.importedAt) existing.lastUploaded = d.importedAt;
      }
    });

    return Array.from(userMap.values());
  }, [documents, registeredUsers]);

  // Filter users in the User List Modal
  const filteredUsers = uniqueUsersList.filter((u) => {
    if (userDirectoryScope === 'admins' && u.role !== 'Admin') return false;
    if (userDirectoryScope === 'users' && u.role !== 'Member') return false;
    const q = userSearchQuery.toLowerCase();
    return u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q);
  });

  const customerUsers = uniqueUsersList.filter((u) => u.role === 'Member');

  // Compute documents and videos belonging specifically to the selected user in the explorer modal
  const activeUserDocs = React.useMemo(() => {
    if (!selectedUserForDocs) return [];
    return documents.filter((d) => {
      if (selectedUserForDocs.userId && d.userId && d.userId === selectedUserForDocs.userId) return true;
      if (selectedUserForDocs.email && d.userEmail && selectedUserForDocs.email !== 'No email registered' && d.userEmail.toLowerCase() === selectedUserForDocs.email.toLowerCase()) return true;
      if (selectedUserForDocs.name && d.importedBy && d.importedBy.toLowerCase() === selectedUserForDocs.name.toLowerCase()) return true;
      return false;
    });
  }, [documents, selectedUserForDocs]);

  // Filtered documents for the active user view by category and search
  const filteredActiveUserDocs = React.useMemo(() => {
    return activeUserDocs.filter((d) => {
      const ext = (d.name.split('.').pop() || '').toLowerCase();
      const isVideo = d.type?.startsWith('video/') || ['mp4', 'mkv', 'avi', 'mov', 'webm', '3gp', 'wmv', 'flv', 'm4v', 'ogv'].includes(ext);
      const isAudio = d.type?.startsWith('audio/') || ['mp3', 'wav', 'ogg', 'm4a', 'aac', 'flac', 'opus', 'weba', 'wma', 'aiff'].includes(ext);
      const isPdf = d.type?.includes('pdf') || ext === 'pdf';
      const isImage = d.type?.startsWith('image/') || ['png', 'jpg', 'jpeg', 'webp', 'svg', 'gif'].includes(ext);

      if (userDocsFilter === 'videos' && !isVideo) return false;
      if (userDocsFilter === 'images' && !isImage) return false;
      if (userDocsFilter === 'audio' && !isAudio) return false;
      if (userDocsFilter === 'documents' && (isVideo || isImage || isAudio)) return false;

      if (userDocSearch.trim()) {
        const q = userDocSearch.toLowerCase();
        const matchName = d.name.toLowerCase().includes(q);
        const matchCategory = d.category?.toLowerCase().includes(q);
        const matchStatus = d.status.toLowerCase().includes(q);
        if (!matchName && !matchCategory && !matchStatus) return false;
      }

      return true;
    });
  }, [activeUserDocs, userDocsFilter, userDocSearch]);

  // Download Document handler (Admin & User data) - downloads the real document file
  const handleDownloadDoc = async (docItem: ImportedDocument) => {
    // 1. Direct fileDataUrl
    if (docItem.fileDataUrl) {
      const a = document.createElement('a');
      a.href = docItem.fileDataUrl;
      a.download = docItem.name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      return;
    }

    // 2. Media storage blob (IndexedDB)
    try {
      const blobUrl = await getMediaBlobUrl(docItem.id, docItem.fileDataUrl);
      if (blobUrl) {
        const a = document.createElement('a');
        a.href = blobUrl;
        a.download = docItem.name;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        return;
      }
    } catch (e) {
      console.warn('Local blob download lookup error:', e);
    }

    // 3. Backend S3 / Storage download URL
    if (docItem.id && !docItem.id.startsWith('doc-') && !docItem.id.startsWith('local-')) {
      try {
        const res = await documentApi.getDownloadUrl(docItem.id);
        const targetUrl = res.downloadUrl || res.url;
        if (targetUrl) {
          const a = document.createElement('a');
          a.href = targetUrl.startsWith('/') ? window.location.origin + targetUrl : targetUrl;
          a.download = docItem.name;
          a.target = '_blank';
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          return;
        }
      } catch (err) {
        console.warn('Backend download URL fetch error:', err);
      }
    }

    // Fallback: document metadata summary if raw file is unretrievable
    const text = `ACS Customer Service - Document Record\n\nDocument Name: ${docItem.name}\nDocument ID: ${docItem.id}\nCategory: ${docItem.category || 'Print Job'}\nImported By: ${docItem.importedBy} (${docItem.userEmail})\nImported At: ${docItem.importedAt}\nFile Size: ${formatFileSize(docItem.size)}\nNotes: ${docItem.notes || 'None'}\n\nGenerated by ACS Centre Administration System`;
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${docItem.name.split('.')[0]}_record.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Delete the document through the backend and refresh local UI state.
  const handleDeleteDoc = async (id: string) => {
    // 1. Instantly update React state so document disappears immediately
    const updated = documents.filter((d) => d.id !== id);
    setDocuments(updated);

    // Call Backend API to delete
    try {
      await adminApi.deleteDocument(id);
    } catch (err) {
      console.warn('Backend delete error notice:', err);
    }

    // 2. Clear from localStorage and broadcast update to all tabs/components
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

    setAdminNotice('Document deleted successfully.');
    setTimeout(() => setAdminNotice(null), 3000);
  };

  // Delete User Account and all associated documents/media (Admin Action)
  const handleConfirmDeleteUser = async () => {
    if (!userToDelete) return;
    setIsDeletingUser(true);

    try {
      const targetUserId = (userToDelete.userId || '').trim();
      const targetEmail = (userToDelete.email || '').toLowerCase().trim();
      const targetName = (userToDelete.name || '').toLowerCase().trim();

      await adminApi.deleteUser(targetUserId);

      // 2. Remove user from registeredUsers React state immediately
      setRegisteredUsers((prev) =>
        prev.filter(
          (ru) =>
            ru.id !== targetUserId &&
            ru.uid !== targetUserId &&
            (!targetEmail || ru.email?.toLowerCase().trim() !== targetEmail)
        )
      );
      await fetchAdminUsers();

      // 3. Find all documents belonging to this user
      const userDocs = documents.filter((d) => {
        const docUserId = (d.userId || '').trim();
        const docEmail = (d.userEmail || '').toLowerCase().trim();
        const docName = (d.importedBy || '').toLowerCase().trim();

        const matchId = targetUserId && docUserId === targetUserId;
        const matchEmail = targetEmail && docEmail && docEmail === targetEmail;
        const matchName = targetName && docName && docName === targetName;

        return matchId || matchEmail || matchName;
      });

      const userDocIds = new Set(userDocs.map((d) => d.id));

      // 4. Delete user documents from IndexedDB media storage
      for (const d of userDocs) {
        try {
          await deleteMediaBlob(d.id);
        } catch (err) {
          console.warn('Failed to delete user media blob:', err);
        }
      }

      // 5. Update documents state and sync with localStorage
      const remainingDocs = documents.filter((d) => !userDocIds.has(d.id));
      setDocuments(remainingDocs);

      try {
        window.dispatchEvent(new Event('acs_documents_updated'));
      } catch (err) {
        console.warn('Document update event error:', err);
      }

      // 6. Reset selected user drilldown & table filter if currently active
      if (
        selectedUserForDocs &&
        (selectedUserForDocs.userId === targetUserId || selectedUserForDocs.email === userToDelete.email)
      ) {
        setSelectedUserForDocs(null);
      }
      if (
        selectedUserFilter &&
        (selectedUserFilter.email === userToDelete.email || selectedUserFilter.name === userToDelete.name)
      ) {
        setSelectedUserFilter(null);
      }

      setAdminNotice(`User "${userToDelete.name}" and ${userDocs.length} associated file(s) permanently deleted.`);
      setTimeout(() => setAdminNotice(null), 4500);
    } catch (err: any) {
      console.error('Error deleting user:', err);
      setAdminNotice(`Failed to delete user: ${err.message || 'Unknown error'}`);
      setTimeout(() => setAdminNotice(null), 4500);
    } finally {
      setIsDeletingUser(false);
      setUserToDelete(null);
    }
  };

  // Status Change (Admin)
  const handleStatusChange = async (id: string, newStatus: 'ready' | 'processing' | 'completed') => {
    try {
      await adminApi.updateStatus(id, newStatus);
    } catch (err) {
      console.warn('Backend updateStatus notice:', err);
    }

    setDocuments((prev) => prev.map((d) => (d.id === id ? { ...d, status: newStatus } : d)));
    if (selectedDoc?.id === id) {
      setSelectedDoc((prev) => (prev ? { ...prev, status: newStatus } : null));
    }
    setAdminNotice(`Document status updated to "${newStatus}".`);
    setTimeout(() => setAdminNotice(null), 3000);
  };

  // Save Document Edits (Admin)
  const handleSaveDocEdits = async (updatedDoc: ImportedDocument) => {
    try {
      await adminApi.updateDocument(updatedDoc.id, {
        name: updatedDoc.name,
        category: updatedDoc.category,
        notes: updatedDoc.notes || '',
        status: updatedDoc.status as any,
      });
    } catch (err) {
      console.warn('Backend update document notice:', err);
    }

    const updated = documents.map((d) => (d.id === updatedDoc.id ? updatedDoc : d));
    setDocuments(updated);
    if (selectedDoc?.id === updatedDoc.id) {
      setSelectedDoc(updatedDoc);
    }

    setAdminNotice(`Document "${updatedDoc.name}" updated successfully.`);
    setTimeout(() => setAdminNotice(null), 3500);
  };

  const openShareDialog = async (docItem: ImportedDocument) => {
    setShareTarget(docItem);
    setSelectedShareUser(null);
    setShareWithEveryone(false);
    setShareSearch('');
    setShareDirectoryError(null);
    setLoadingShareDirectory(true);
    try {
      const users = await documentApi.listShareDirectory();
      setShareDirectory(users.filter((shareUser) => shareUser.id !== docItem.userId));
    } catch (error: any) {
      setShareDirectoryError(error?.message || 'Unable to load registered users.');
      setShareDirectory([]);
    } finally {
      setLoadingShareDirectory(false);
    }
  };

  const handleShareDocument = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!shareTarget || (!selectedShareUser && !shareWithEveryone)) return;

    setIsSharing(true);
    try {
      if (shareWithEveryone) {
        const result = await documentApi.shareWithAll(shareTarget.id);
        setAdminNotice(result.sharedCount
          ? `Shared "${shareTarget.name}" with ${result.sharedCount} registered user(s), including admins.`
          : `"${shareTarget.name}" is already shared with all eligible users.`);
      } else if (selectedShareUser) {
        const result = await documentApi.share(shareTarget.id, selectedShareUser.email);
        setAdminNotice(`Shared "${shareTarget.name}" with ${result.recipientEmail}.`);
      }
      await fetchShareLists();
      setShareTarget(null);
      setSelectedShareUser(null);
      setShareWithEveryone(false);
      setShareSearch('');
    } catch (error: any) {
      setAdminNotice(error?.message || 'Unable to share this file.');
    } finally {
      setIsSharing(false);
    }
  };

  const handleRevokeShare = async (share: SharedByMeDto) => {
    try {
      await documentApi.revokeShare(share.document.id, share.recipientId);
      setAdminNotice(`Access to "${share.document.originalName}" revoked for ${share.recipientEmail}.`);
      await fetchShareLists();
    } catch (error: any) {
      setAdminNotice(error?.message || 'Unable to revoke shared access.');
    }
  };

  const filteredShareDirectory = shareDirectory.filter((shareUser) =>
    `${shareUser.displayName} ${shareUser.email}`.toLowerCase().includes(shareSearch.trim().toLowerCase())
  );

  // Trigger file selection for Admin
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

  // Admin Direct File Upload
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

    // 1. Primary: Upload to ACS Backend
    try {
      const backendDoc = await documentApi.upload(file, {
        category: fileCategory,
        importedBy: user?.displayName || undefined,
        userEmail: user?.email || undefined,
      });

      // Also persist in media storage under backend ID for instant previewing
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
      console.error('Backend admin upload failed:', apiErr);
      setIsUploading(false);
      setAdminNotice(apiErr?.message || 'Upload failed. The file was not stored in AWS S3.');
      return;
    }

    const uploadFolderId = uploadFolderIdRef.current;
    if (uploadFolderId) {
      setFolderAssignments((current) => ({ ...current, [newDoc!.id]: uploadFolderId }));
    }
    setDocuments((prev) => [newDoc!, ...prev]);
    setIsUploading(false);
    setAdminNotice(`"${file.name}" uploaded successfully.`);
    setTimeout(() => setAdminNotice(null), 3500);
  };

  const handleOpenDocDetails = (docItem: ImportedDocument) => {
    setSelectedDoc(docItem);
    setIsDetailModalOpen(true);
  };

  const handleOpenEditModal = (docItem: ImportedDocument) => {
    setEditingDoc(docItem);
    setIsEditModalOpen(true);
  };

  const handleSignOut = async () => {
    await logout();
    navigate('/');
  };

  // Base scope is the logged-in admin unless the Total users workflow is active.
  const baseScopedDocs = React.useMemo(() => {
    return documents.filter((docItem) => {
      // 1. Specific User Filter (if filtered from User Directory modal)
      if (selectedUserFilter) {
        const matchesEmail = selectedUserFilter.email && docItem.userEmail?.toLowerCase() === selectedUserFilter.email.toLowerCase();
        const matchesName = selectedUserFilter.name && docItem.importedBy?.toLowerCase() === selectedUserFilter.name.toLowerCase();
        if (!matchesEmail && !matchesName) return false;
      } else {
        if (!isDocUploadedByAdmin(docItem)) return false;
      }

      // 2. Time Filter (Last 2 Days vs All Time)
      if (timeFilter === '2days') {
        if (!isWithinLast2Days(docItem)) return false;
      }

      return true;
    });
  }, [documents, selectedUserFilter, timeFilter, user]);

  const folderScopedDocs = React.useMemo(() => {
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
  }, [baseScopedDocs, folderAssignments, selectedFolderId, user?.uid, user?.email]);

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

  const adminSectionTitle = selectedFolderPath
    ? `${selectedFolderPath} · ${timeFilter === 'all' ? 'All Time' : 'Recent'} Uploads`
    : selectedUserFilter
      ? `Documents by ${selectedUserFilter.name}`
      : timeFilter === 'all'
        ? 'All Time Uploaded by Admin'
        : 'Recently Uploaded by Admin';

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
            if (folderId) {
              setSelectedUserFilter(null);
              setTimeFilter('all');
              setDocTypeFilter('all');
            }
          }}
          onAssignmentsChange={setFolderAssignments}
          onFoldersChange={setExplorerFolders}
          externalAssignments={folderAssignments}
        />
        <div className="min-w-0 flex-1">
          {/* Hidden File Input for Admin Direct Import */}
          <input
            ref={fileInputRef}
            type="file"
            multiple
            id="admin-dashboard-direct-file-input"
            accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg,.txt,.mp4,.mkv,.avi,.mov,.webm,.3gp,.mp3,.wav,.ogg,.m4a,.aac,.flac,audio/*,video/*"
            onChange={handleFilePicked}
            className="hidden"
            aria-label="Upload document to queue"
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

          {/* Top Banner */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-200 mb-6">
            <div className="grid w-full max-w-xl grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="flex items-center justify-between rounded-2xl border border-[#082b67] bg-gradient-to-br from-[#04193d] via-[#082b67] to-[#0055ff] p-4 text-left text-white shadow-md">
                <span><span className="block text-[10px] font-extrabold uppercase tracking-[0.16em] text-blue-100">ACS Workspace</span><strong className="block text-2xl">Administrator</strong><span className="block text-[10px] text-blue-100">Full access · users, files and system data</span></span>
                <ShieldCheck className="h-6 w-6" />
              </div>
              <button
                type="button"
                onClick={() => {
                  setSelectedUserForDocs(null);
                  setUserDocsFilter('all');
                  setUserDocSearch('');
                  setUserDirectoryScope('users');
                  setIsUserListModalOpen(true);
                }}
                className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-xs transition-all hover:border-indigo-300 hover:bg-indigo-50/40"
                title="Click to view all users"
              >
                <span><span className="block text-[10px] font-bold uppercase text-slate-500">Total users</span><strong className="block text-2xl text-indigo-600">{customerUsers.length}</strong><span className="block text-[10px] text-indigo-600">Open user list</span></span>
                <Users className="h-6 w-6 text-indigo-600" />
              </button>
            </div>

            <div className="flex items-center space-x-3">
              <button
                onClick={handleSignOut}
                className="px-4 py-2.5 rounded-2xl border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-semibold transition-colors cursor-pointer shadow-xs"
              >
                Sign Out
              </button>
            </div>
          </div>

          {/* Admin Notice Alert */}
          {adminNotice && (
            <div className="mb-6 p-4 rounded-2xl bg-blue-50 border border-blue-200 text-blue-900 flex items-center justify-between animate-in fade-in slide-in-from-top-2 duration-200">
              <div className="flex items-center space-x-2.5">
                <CheckCircle2 className="w-5 h-5 text-[#0055ff] shrink-0" />
                <span className="text-xs font-bold">{adminNotice}</span>
              </div>
            </div>
          )}

          {/* Active User Filter Banner (if filtering by a specific user) */}
          {selectedUserFilter && (
            <div className="mb-4 p-3.5 sm:p-4 rounded-2xl bg-gradient-to-r from-blue-50 via-indigo-50 to-orange-50 border border-blue-200/90 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs animate-in fade-in slide-in-from-top-2 duration-200">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#0055ff] to-indigo-600 text-white flex items-center justify-center font-bold shadow-xs shrink-0">
                  <User className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#0055ff] block">
                    Filtered User View
                  </span>
                  <p className="text-xs sm:text-sm font-bold text-[#04193d]">
                    Showing documents uploaded by: <span className="text-indigo-700">{selectedUserFilter.name}</span>
                    {selectedUserFilter.email && (
                      <span className="text-slate-500 font-normal ml-1">({selectedUserFilter.email})</span>
                    )}
                  </p>
                </div>
              </div>

              <button
                onClick={() => {
                  setSelectedUserFilter(null);
                }}
                className="self-start sm:self-auto inline-flex items-center space-x-1.5 px-3.5 py-1.5 rounded-xl bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 text-xs font-bold transition-all shadow-xs cursor-pointer"
              >
                <X className="w-3.5 h-3.5 text-slate-500" />
                <span>Back to My Uploads</span>
              </button>
            </div>
          )}

          <div className="mb-4 flex gap-1 overflow-x-auto border-b border-slate-200" role="tablist" aria-label="Admin file views">
            <button type="button" role="tab" aria-selected={sharedFilesView === 'mine'} onClick={() => setSharedFilesView('mine')} className={`shrink-0 border-b-2 px-3 py-2 text-xs font-bold ${sharedFilesView === 'mine' ? 'border-[#0055ff] text-[#0055ff]' : 'border-transparent text-slate-500 hover:text-slate-800'}`}>
              My files <span className="ml-1 text-[10px]">{documents.filter(isDocUploadedByAdmin).length}</span>
            </button>
            <button type="button" role="tab" aria-selected={sharedFilesView === 'received'} onClick={() => setSharedFilesView('received')} className={`shrink-0 border-b-2 px-3 py-2 text-xs font-bold ${sharedFilesView === 'received' ? 'border-emerald-600 text-emerald-700' : 'border-transparent text-slate-500 hover:text-slate-800'}`}>
              Shared with me <span className="ml-1 text-[10px]">{sharedWithMe.length}</span>
            </button>
            <button type="button" role="tab" aria-selected={sharedFilesView === 'sent'} onClick={() => setSharedFilesView('sent')} className={`shrink-0 border-b-2 px-3 py-2 text-xs font-bold ${sharedFilesView === 'sent' ? 'border-orange-600 text-orange-700' : 'border-transparent text-slate-500 hover:text-slate-800'}`}>
              Shared by me <span className="ml-1 text-[10px]">{sharedByMe.length}</span>
            </button>
          </div>

          {sharedFilesView === 'sent' ? (
            <section className="mb-6 overflow-hidden rounded-2xl border border-slate-200 bg-white" aria-label="Files shared by me">
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
          ) : sharedFilesView === 'received' ? (
            <section className="mb-6 overflow-hidden rounded-2xl border border-slate-200 bg-white" aria-label="Files shared with me">
              <div className="border-b border-slate-100 bg-slate-50/60 px-4 py-4">
                <h2 className="text-sm font-extrabold text-[#04193d]">Shared with me <span className="ml-1 text-xs text-slate-400">{sharedWithMe.length}</span></h2>
              </div>
              {sharedWithMe.length ? (
                <div className="divide-y divide-slate-100">
                  {sharedWithMe.map((sharedDocument) => (
                    <div key={sharedDocument.id} className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                      <button type="button" onClick={() => handleOpenDocDetails(sharedDocument)} className="min-w-0 text-left">
                        <span className="block truncate text-xs font-bold text-[#04193d]">{sharedDocument.name}</span>
                        <span className="mt-0.5 block truncate text-[11px] text-slate-500">By: {sharedDocument.sharedByEmail || sharedDocument.userEmail}</span>
                      </button>
                      <span className="shrink-0 text-[10px] text-slate-400">{formatUploadDate(sharedDocument)}</span>
                    </div>
                  ))}
                </div>
              ) : <p className="px-4 py-12 text-center text-xs text-slate-500">No files have been shared with you.</p>}
            </section>
          ) : (
            <>
          {/* ================= RECENTLY UPLOADED DOCUMENTS SECTION ================= */}
          <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
            <div className="p-4 sm:p-5 border-b border-slate-100 flex flex-col xl:flex-row xl:items-center justify-between gap-4 bg-slate-50/50">
              <div>
                <div className="flex items-center space-x-2.5 flex-wrap gap-y-2">
                  <h2 className="font-extrabold text-sm sm:text-base text-[#04193d]">
                    {adminSectionTitle}
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
                    id="filter-type-all"
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
                    id="filter-type-pdf"
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
                    id="filter-type-images"
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
                    id="filter-type-videos"
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
                    id="filter-type-audio"
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
                    id="filter-type-doc"
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
                    id="admin-queue-animated-import-btn"
                    onClick={handleTriggerFileSelect}
                    disabled={isUploading}
                    type="button"
                    className="relative z-10 inline-flex items-center space-x-2 px-4 py-2 sm:py-2.5 rounded-2xl bg-gradient-to-r from-[#0055ff] via-[#0066fe] to-[#ff6600] hover:from-[#0044cc] hover:to-[#ff5500] text-white text-xs sm:text-sm font-extrabold shadow-md shadow-blue-500/25 hover:shadow-orange-500/30 transition-all transform active:scale-95 cursor-pointer disabled:opacity-50 group"
                    title="Upload file directly to system"
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

            {/* Document List Rows */}
            {loadingDocs ? (
              <div className="py-16 flex flex-col items-center justify-center space-y-2 text-slate-500 text-xs">
                <Loader2 className="w-6 h-6 animate-spin text-[#0055ff]" />
                <span>Loading documents from the server...</span>
              </div>
            ) : displayDocs.length === 0 ? (
              <div className="py-16 text-center text-slate-500 text-xs px-4">
                <FileText className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                <p className="font-semibold text-slate-700">{selectedFolderId ? 'This folder is empty.' : 'No documents found for this filter.'}</p>
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
                      {/* File Details (Clickable) */}
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
                            <h4 className="text-xs sm:text-sm font-bold text-[#04193d] group-hover:text-[#0055ff] transition-colors truncate max-w-[190px] xs:max-w-xs sm:max-w-md" title={docItem.name}>
                              {docItem.name}
                            </h4>
                            <span className="text-[10px] font-semibold text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded shrink-0">
                              {formatFileSize(docItem.size)}
                            </span>
                            <span className={`text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded shrink-0 ${categoryType === 'audio'
                              ? 'bg-violet-100 text-violet-700'
                              : categoryType === 'videos'
                                ? 'bg-amber-100 text-amber-700'
                                : 'bg-slate-100 text-slate-600'
                              }`}>
                              {categoryType.toUpperCase()}
                            </span>
                          </div>

                          <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[10px] sm:text-[11px] text-slate-500 mt-1">
                            <span className="font-bold text-slate-700">By: {docItem.userEmail}</span>
                            <span>•</span>
                            <span>{formatUploadDate(docItem)}</span>
                            <span>•</span>
                            <span className="text-[#ff6600] font-semibold">{docItem.category || 'Print Job'}</span>
                          </div>
                        </div>
                      </div>

                      {/* ================= ROW ACTION BUTTONS =================
                      1. Play Audio/Video Button (Direct media playback with sound)
                      2. Preview Button
                      3. Download Button
                      4. Edit Button
                      5. Delete Button
                  */}
                      <div
                        className="flex items-center space-x-1.5 sm:space-x-2 self-start sm:self-center shrink-0 pt-1 sm:pt-0"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {/* Quick Play button for Audio / Video */}
                        {categoryType === 'audio' ? (
                          <button
                            onClick={() => handleOpenDocDetails(docItem)}
                            className="px-2.5 py-1.5 bg-violet-600 hover:bg-violet-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center space-x-1.5 cursor-pointer"
                            title="Play audio with sound"
                          >
                            <Headphones className="w-3.5 h-3.5" />
                            <span>Play</span>
                          </button>
                        ) : categoryType === 'videos' ? (
                          <button
                            onClick={() => handleOpenDocDetails(docItem)}
                            className="px-2.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center space-x-1.5 cursor-pointer"
                            title="Watch video"
                          >
                            <Play className="w-3.5 h-3.5 fill-white" />
                            <span>Watch</span>
                          </button>
                        ) : null}
                        {/* View / Preview Button */}
                        <button
                          id={`view-doc-${docItem.id}`}
                          onClick={() => handleOpenDocDetails(docItem)}
                          className="p-2 text-slate-600 hover:text-[#0055ff] rounded-xl hover:bg-blue-50 border border-slate-200 transition-colors cursor-pointer min-h-[34px] min-w-[34px] flex items-center justify-center"
                          title="Inspect full document"
                          aria-label="View document"
                        >
                          <Eye className="w-4 h-4" />
                        </button>

                        {/* Download Button */}
                        <button
                          id={`download-doc-${docItem.id}`}
                          onClick={() => handleDownloadDoc(docItem)}
                          className="p-2 text-blue-600 hover:text-white bg-blue-50 hover:bg-[#0055ff] rounded-xl border border-blue-200 transition-colors cursor-pointer min-h-[34px] min-w-[34px] flex items-center justify-center"
                          title="Download file"
                          aria-label="Download document"
                        >
                          <Download className="w-4 h-4" />
                        </button>

                        <button
                          id={`admin-share-doc-${docItem.id}`}
                          type="button"
                          onClick={() => openShareDialog(docItem)}
                          className="p-2 text-emerald-700 hover:text-white bg-emerald-50 hover:bg-emerald-600 rounded-xl border border-emerald-200 transition-colors cursor-pointer min-h-[34px] min-w-[34px] flex items-center justify-center"
                          title="Share with a registered user"
                          aria-label="Share document"
                        >
                          <Share2 className="w-4 h-4" />
                        </button>

                        {/* Edit Document Button */}
                        <button
                          id={`edit-doc-${docItem.id}`}
                          onClick={() => handleOpenEditModal(docItem)}
                          className="p-2 text-slate-600 hover:text-[#0055ff] rounded-xl hover:bg-slate-100 border border-slate-200 hover:border-blue-200 transition-colors cursor-pointer min-h-[34px] min-w-[34px] flex items-center justify-center"
                          title="Edit file details"
                          aria-label="Edit document"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>

                        {/* Delete Document Button */}
                        <button
                          id={`delete-doc-${docItem.id}`}
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteDoc(docItem.id);
                          }}
                          className="p-2 text-slate-400 hover:text-rose-600 rounded-xl hover:bg-rose-50 border border-slate-200 hover:border-rose-200 transition-colors cursor-pointer group/del min-h-[34px] min-w-[34px] flex items-center justify-center"
                          title="Delete record"
                          aria-label="Delete document"
                        >
                          <Trash2 className="w-4 h-4 group-hover/del:scale-110 transition-transform" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
            </>
          )}

          {/* ================= USER LIST & DRILLDOWN EXPLORER MODAL =================
          Phase 1: Displays all registered & submitting users with file & video counts.
          Phase 2: Clicking any user drills down into all documents and videos uploaded by that user.
          Phase 3: Clicking any document or video opens the RealDocumentViewerModal immediately right there!
      */}
          {isUserListModalOpen && (
            <div
              className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 md:p-6 bg-slate-950/75 backdrop-blur-xs animate-in fade-in duration-200"
              onClick={() => {
                setIsUserListModalOpen(false);
                setSelectedUserForDocs(null);
              }}
            >
              <div
                id="admin-user-list-modal"
                className={`relative w-full ${selectedUserForDocs ? 'max-w-4xl' : 'max-w-2xl'} bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh] transition-all duration-200 animate-in zoom-in-95`}
                onClick={(e) => e.stopPropagation()}
              >
                {/* ================= VIEW 1: ALL USERS LIST ================= */}
                {!selectedUserForDocs ? (
                  <>
                    {/* Header */}
                    <div className="p-4 sm:p-5 border-b border-slate-100 bg-gradient-to-r from-blue-50/80 via-indigo-50/50 to-orange-50/50 flex items-center justify-between shrink-0">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-xs">
                          <Users className="w-5 h-5" />
                        </div>
                        <div>
                          <div className="flex items-center space-x-2">
                            <span className="text-[10px] font-extrabold uppercase tracking-wider text-indigo-600 block">
                              User Directory
                            </span>
                            <span className="text-[10px] bg-indigo-100 text-indigo-700 px-2 py-0.2 rounded-full font-bold">
                              {filteredUsers.length} {userDirectoryScope === 'admins' ? 'Admins' : 'Users'}
                            </span>
                          </div>
                          <h3 className="text-base sm:text-lg font-extrabold text-[#04193d]">
                            {userDirectoryScope === 'admins' ? 'All Administrators' : 'All Customers'}
                          </h3>
                        </div>
                      </div>

                      <button
                        onClick={() => setIsUserListModalOpen(false)}
                        className="p-2 text-slate-400 hover:text-slate-700 rounded-full hover:bg-white/80 transition-colors cursor-pointer"
                        aria-label="Close modal"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>

                    {/* Subtitle & Quick Stats Bar */}
                    <div className="px-4 sm:px-5 py-2.5 bg-slate-50 border-b border-slate-100 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-600">
                      <span className="font-medium text-[11px] sm:text-xs">
                        Select any user to inspect all documents & videos uploaded by them:
                      </span>
                      <div className="flex items-center space-x-3 text-[11px] font-bold">
                        <span className="text-slate-500">Total Uploads: <strong className="text-slate-800">{documents.length}</strong></span>
                        <span className="text-amber-600">Videos: <strong>{documents.filter(d => (d.type?.startsWith('video/') || ['mp4', 'mkv', 'avi', 'mov', 'webm', '3gp', 'wmv'].includes((d.name.split('.').pop() || '').toLowerCase()))).length}</strong></span>
                      </div>
                    </div>

                    {/* Search Box */}
                    <div className="p-3 sm:p-4 border-b border-slate-100 bg-white">
                      <div className="relative">
                        <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                        <input
                          type="text"
                          value={userSearchQuery}
                          onChange={(e) => setUserSearchQuery(e.target.value)}
                          placeholder="Search user by name or email address..."
                          className="w-full pl-10 pr-4 py-2.5 text-xs font-semibold text-slate-800 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                        />
                        {userSearchQuery && (
                          <button
                            onClick={() => setUserSearchQuery('')}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs font-bold"
                          >
                            Clear
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Users Cards List */}
                    <div className="overflow-y-auto p-3 sm:p-4 space-y-2.5 flex-1 divide-y divide-slate-100">
                      {filteredUsers.length === 0 ? (
                        <div className="py-14 text-center text-slate-500 text-xs">
                          <Users className="w-10 h-10 text-slate-300 mx-auto mb-2.5" />
                          <p className="font-bold text-sm text-slate-700">No matching users found.</p>
                          <p className="text-slate-400 text-xs mt-1">Try another search term.</p>
                        </div>
                      ) : (
                        filteredUsers.map((u) => (
                          <div
                            key={u.userId}
                            onClick={() => {
                              setSelectedUserForDocs(u);
                              setUserDocsFilter('all');
                              setUserDocSearch('');
                            }}
                            role="button"
                            tabIndex={0}
                            className="pt-3 pb-3 px-3.5 rounded-2xl border border-transparent hover:border-indigo-200 hover:bg-gradient-to-r hover:from-indigo-50/50 hover:to-blue-50/30 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 cursor-pointer group shadow-2xs hover:shadow-xs"
                          >
                            <div className="flex items-center space-x-3.5 min-w-0 flex-1">
                              <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-indigo-600 to-[#0055ff] text-white font-black flex items-center justify-center text-sm shadow-xs shrink-0 group-hover:scale-105 transition-transform">
                                {u.name ? u.name.charAt(0).toUpperCase() : 'U'}
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center space-x-2">
                                  <p className="text-xs sm:text-sm font-extrabold text-[#04193d] group-hover:text-indigo-600 transition-colors truncate">
                                    {u.name}
                                  </p>
                                  {u.role === 'Admin' ? (
                                    <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase bg-purple-100 text-purple-700 border border-purple-200">
                                      Admin
                                    </span>
                                  ) : (
                                    <span className="px-2 py-0.5 rounded-full text-[9px] font-bold uppercase bg-slate-100 text-slate-600 border border-slate-200">
                                      Member
                                    </span>
                                  )}
                                </div>
                                <p className="text-[11px] text-slate-500 truncate mt-0.5">
                                  {u.email}
                                </p>
                                <span className="text-[10px] text-slate-400 block mt-0.5">
                                  Last activity: {u.lastUploaded}
                                </span>
                              </div>
                            </div>

                            {/* Counts & Action Pill */}
                            <div className="flex items-center justify-between sm:justify-end space-x-2 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                              <div className="flex items-center space-x-1.5 flex-wrap">
                                <span className="px-2.5 py-1 rounded-xl bg-slate-100 text-slate-700 border border-slate-200 font-bold text-xs">
                                  {u.docCount} {u.docCount === 1 ? 'file' : 'files'}
                                </span>
                                {u.videoCount > 0 && (
                                  <span className="px-2 py-1 rounded-xl bg-amber-50 text-amber-800 border border-amber-200 font-bold text-xs flex items-center space-x-1">
                                    <Film className="w-3 h-3 text-amber-600" />
                                    <span>{u.videoCount} {u.videoCount === 1 ? 'video' : 'videos'}</span>
                                  </span>
                                )}
                                {u.audioCount > 0 && (
                                  <span className="px-2 py-1 rounded-xl bg-violet-50 text-violet-800 border border-violet-200 font-bold text-xs flex items-center space-x-1">
                                    <Headphones className="w-3 h-3 text-violet-600" />
                                    <span>{u.audioCount} {u.audioCount === 1 ? 'audio' : 'audios'}</span>
                                  </span>
                                )}
                                {u.pdfCount > 0 && (
                                  <span className="px-2 py-1 rounded-xl bg-red-50 text-red-700 border border-red-200 font-bold text-xs flex items-center space-x-1">
                                    <FileText className="w-3 h-3 text-red-500" />
                                    <span>{u.pdfCount} {u.pdfCount === 1 ? 'PDF' : 'PDFs'}</span>
                                  </span>
                                )}
                              </div>

                              <div className="flex items-center space-x-1.5 shrink-0">
                                <div className="flex items-center space-x-1 px-3 py-1.5 rounded-xl bg-indigo-600 group-hover:bg-indigo-700 text-white font-bold text-xs transition-colors shadow-xs">
                                  <span>Open Files</span>
                                  <ChevronRight className="w-3.5 h-3.5 ml-0.5" />
                                </div>

                                {/* Delete User Button */}
                                {u.role !== 'Admin' && (
                                  <button
                                    type="button"
                                    id={`delete-user-${u.userId}`}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setUserToDelete(u);
                                    }}
                                    className="p-1.5 sm:px-2.5 sm:py-1.5 rounded-xl bg-red-50 hover:bg-red-600 text-red-600 hover:text-white border border-red-200 hover:border-red-600 font-bold text-xs transition-all shadow-xs flex items-center space-x-1 cursor-pointer"
                                    title={`Delete user account of ${u.name}`}
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                    <span className="hidden sm:inline">Delete</span>
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>

                    {/* Modal Footer */}
                    <div className="p-3 sm:p-4 border-t border-slate-100 bg-slate-50/80 flex items-center justify-between shrink-0">
                      <span className="text-xs text-slate-500 font-medium hidden sm:inline">
                        Click any user card to inspect their uploaded documents and videos
                      </span>
                      <button
                        onClick={() => setIsUserListModalOpen(false)}
                        className="px-4 py-2 rounded-xl bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 text-xs font-bold transition-colors cursor-pointer shadow-xs ml-auto"
                      >
                        Close
                      </button>
                    </div>
                  </>
                ) : (
                  /* ================= VIEW 2: SPECIFIC USER'S DOCUMENTS & VIDEOS EXPLORER ================= */
                  <>
                    {/* User Drilldown Header */}
                    <div className="p-4 sm:p-5 border-b border-slate-100 bg-gradient-to-r from-blue-50 via-indigo-50 to-amber-50/40 flex items-center justify-between shrink-0">
                      <div className="flex items-center space-x-3 sm:space-x-4 min-w-0">
                        <button
                          onClick={() => setSelectedUserForDocs(null)}
                          className="p-2 rounded-xl bg-white hover:bg-indigo-50 border border-slate-200 text-indigo-600 hover:text-indigo-800 transition-colors shadow-xs cursor-pointer flex items-center space-x-1.5 shrink-0"
                          title="Back to all users list"
                        >
                          <ArrowLeft className="w-4 h-4" />
                          <span className="text-xs font-extrabold hidden sm:inline">All Users</span>
                        </button>

                        <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-indigo-600 to-[#0055ff] text-white font-extrabold flex items-center justify-center text-sm shadow-xs shrink-0">
                          {selectedUserForDocs.name ? selectedUserForDocs.name.charAt(0).toUpperCase() : 'U'}
                        </div>

                        <div className="min-w-0">
                          <div className="flex items-center space-x-2">
                            <h3 className="text-sm sm:text-base font-black text-[#04193d] truncate">
                              {selectedUserForDocs.name}
                            </h3>
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-indigo-100 text-indigo-700 border border-indigo-200">
                              {selectedUserForDocs.role || 'Member'}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-500 truncate">
                            {selectedUserForDocs.email}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center space-x-2 shrink-0">
                        <button
                          type="button"
                          id="drilldown-delete-user-btn"
                          onClick={() => setUserToDelete(selectedUserForDocs)}
                          className="px-2.5 sm:px-3 py-1.5 rounded-xl bg-red-50 hover:bg-red-600 text-red-600 hover:text-white border border-red-200 hover:border-red-600 text-xs font-bold transition-all shadow-xs flex items-center space-x-1.5 cursor-pointer"
                          title={`Delete user account of ${selectedUserForDocs.name}`}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span className="hidden sm:inline">Delete User</span>
                        </button>

                        <button
                          onClick={() => {
                            setIsUserListModalOpen(false);
                            setSelectedUserForDocs(null);
                          }}
                          className="p-2 text-slate-400 hover:text-slate-700 rounded-full hover:bg-white/80 transition-colors cursor-pointer"
                          aria-label="Close modal"
                        >
                          <X className="w-5 h-5" />
                        </button>
                      </div>
                    </div>

                    {/* Filter Tabs & Search Controls */}
                    <div className="p-3 sm:p-4 bg-slate-50 border-b border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
                      {/* Category Filter Tabs */}
                      <div className="flex items-center space-x-1 sm:space-x-1.5 overflow-x-auto pb-1 sm:pb-0 custom-scrollbar">
                        <button
                          onClick={() => setUserDocsFilter('all')}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${userDocsFilter === 'all'
                            ? 'bg-[#0055ff] text-white shadow-xs'
                            : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                            }`}
                        >
                          All Uploads ({activeUserDocs.length})
                        </button>

                        <button
                          onClick={() => setUserDocsFilter('videos')}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap flex items-center space-x-1.5 ${userDocsFilter === 'videos'
                            ? 'bg-amber-500 text-white shadow-xs'
                            : 'bg-white text-amber-700 hover:bg-amber-50 border border-amber-200'
                            }`}
                        >
                          <Film className="w-3.5 h-3.5" />
                          <span>
                            Videos ({activeUserDocs.filter(d => d.type?.startsWith('video/') || ['mp4', 'mkv', 'avi', 'mov', 'webm', '3gp', 'wmv', 'flv'].includes((d.name.split('.').pop() || '').toLowerCase())).length})
                          </span>
                        </button>

                        <button
                          onClick={() => setUserDocsFilter('audio')}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap flex items-center space-x-1.5 ${userDocsFilter === 'audio'
                            ? 'bg-violet-600 text-white shadow-xs'
                            : 'bg-white text-violet-700 hover:bg-violet-50 border border-violet-200'
                            }`}
                        >
                          <Headphones className="w-3.5 h-3.5" />
                          <span>
                            Audio ({activeUserDocs.filter(d => d.type?.startsWith('audio/') || ['mp3', 'wav', 'ogg', 'm4a', 'aac', 'flac', 'opus', 'weba', 'wma', 'aiff'].includes((d.name.split('.').pop() || '').toLowerCase())).length})
                          </span>
                        </button>

                        <button
                          onClick={() => setUserDocsFilter('documents')}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap flex items-center space-x-1.5 ${userDocsFilter === 'documents'
                            ? 'bg-blue-600 text-white shadow-xs'
                            : 'bg-white text-blue-700 hover:bg-blue-50 border border-blue-200'
                            }`}
                        >
                          <FileText className="w-3.5 h-3.5" />
                          <span>
                            PDFs & Docs ({activeUserDocs.filter(d => !d.type?.startsWith('video/') && !d.type?.startsWith('image/') && !d.type?.startsWith('audio/')).length})
                          </span>
                        </button>

                        <button
                          onClick={() => setUserDocsFilter('images')}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap flex items-center space-x-1.5 ${userDocsFilter === 'images'
                            ? 'bg-purple-600 text-white shadow-xs'
                            : 'bg-white text-purple-700 hover:bg-purple-50 border border-purple-200'
                            }`}
                        >
                          <ImageIcon className="w-3.5 h-3.5" />
                          <span>
                            Images ({activeUserDocs.filter(d => d.type?.startsWith('image/') || ['png', 'jpg', 'jpeg', 'webp', 'svg', 'gif'].includes((d.name.split('.').pop() || '').toLowerCase())).length})
                          </span>
                        </button>
                      </div>

                      {/* Search within user's files */}
                      <div className="relative min-w-[200px]">
                        <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                        <input
                          type="text"
                          value={userDocSearch}
                          onChange={(e) => setUserDocSearch(e.target.value)}
                          placeholder="Search this user's files..."
                          className="w-full pl-8 pr-3 py-1.5 text-xs font-semibold text-slate-800 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                        />
                      </div>
                    </div>

                    {/* Uploaded Documents & Videos Grid/List */}
                    <div className="overflow-y-auto p-3 sm:p-5 flex-1 space-y-3 bg-slate-50/50 custom-scrollbar">
                      {filteredActiveUserDocs.length === 0 ? (
                        <div className="py-16 text-center text-slate-500 bg-white rounded-2xl border border-slate-200/80 p-6">
                          <FolderOpen className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                          <h4 className="text-sm font-extrabold text-[#04193d]">
                            {activeUserDocs.length === 0
                              ? 'No Uploads by this User Yet'
                              : 'No Files Match Selected Filter'}
                          </h4>
                          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                            {activeUserDocs.length === 0
                              ? `User ${selectedUserForDocs.name} has registered in the system but has not submitted any documents or media files yet.`
                              : 'Try changing your category tab or clearing the search query to see other uploads.'}
                          </p>
                        </div>
                      ) : (
                        filteredActiveUserDocs.map((docItem) => {
                          const ext = (docItem.name.split('.').pop() || '').toUpperCase();
                          const isVideo = docItem.type?.startsWith('video/') || ['MP4', 'MKV', 'AVI', 'MOV', 'WEBM', '3GP', 'WMV', 'FLV'].includes(ext);
                          const isAudio = docItem.type?.startsWith('audio/') || ['MP3', 'WAV', 'OGG', 'M4A', 'AAC', 'FLAC', 'OPUS', 'WEBA', 'WMA', 'AIFF'].includes(ext);
                          const isPdf = docItem.type?.includes('pdf') || ext === 'PDF';
                          const isImage = docItem.type?.startsWith('image/') || ['PNG', 'JPG', 'JPEG', 'WEBP', 'SVG', 'GIF'].includes(ext);

                          return (
                            <div
                              key={docItem.id}
                              onClick={() => handleOpenDocDetails(docItem)}
                              role="button"
                              tabIndex={0}
                              className={`p-3 sm:p-4 rounded-2xl bg-white border transition-all cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs hover:shadow-md group ${isVideo
                                ? 'border-amber-200 hover:border-amber-400 hover:bg-amber-50/20'
                                : isAudio
                                  ? 'border-violet-200 hover:border-violet-400 hover:bg-violet-50/20'
                                  : 'border-slate-200 hover:border-[#0055ff] hover:bg-blue-50/20'
                                }`}
                            >
                              {/* File Thumbnail & Meta */}
                              <div className="flex items-center space-x-3.5 min-w-0 flex-1">
                                {/* Visual Thumbnail Box */}
                                <div className="relative shrink-0">
                                  {isVideo ? (
                                    <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-gradient-to-tr from-amber-600 via-amber-500 to-orange-400 text-white flex items-center justify-center shadow-xs group-hover:scale-105 transition-transform overflow-hidden">
                                      <Film className="w-6 h-6" />
                                      <div className="absolute inset-0 bg-black/20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                        <Play className="w-5 h-5 text-white fill-white" />
                                      </div>
                                    </div>
                                  ) : isAudio ? (
                                    <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-gradient-to-tr from-violet-600 via-purple-600 to-indigo-500 text-white flex items-center justify-center shadow-xs group-hover:scale-105 transition-transform overflow-hidden">
                                      <Headphones className="w-6 h-6" />
                                      <div className="absolute inset-0 bg-black/20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                        <Volume2 className="w-5 h-5 text-white animate-pulse" />
                                      </div>
                                    </div>
                                  ) : isPdf ? (
                                    <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-gradient-to-tr from-red-600 to-rose-500 text-white flex items-center justify-center shadow-xs group-hover:scale-105 transition-transform">
                                      <FileText className="w-6 h-6" />
                                    </div>
                                  ) : isImage ? (
                                    <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-gradient-to-tr from-purple-600 to-indigo-500 text-white flex items-center justify-center shadow-xs group-hover:scale-105 transition-transform">
                                      <ImageIcon className="w-6 h-6" />
                                    </div>
                                  ) : (
                                    <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-gradient-to-tr from-blue-600 to-cyan-500 text-white flex items-center justify-center shadow-xs group-hover:scale-105 transition-transform">
                                      <FileText className="w-6 h-6" />
                                    </div>
                                  )}

                                  {/* Format Mini Badge */}
                                  <span className={`absolute -bottom-1 -right-1 px-1.5 py-0.2 rounded text-[8px] font-black uppercase text-white shadow-xs ${isVideo ? 'bg-amber-700' : isAudio ? 'bg-violet-700' : isPdf ? 'bg-red-700' : isImage ? 'bg-purple-700' : 'bg-blue-700'
                                    }`}>
                                    {ext || 'FILE'}
                                  </span>
                                </div>

                                {/* Info */}
                                <div className="min-w-0 flex-1">
                                  <h4 className="text-xs sm:text-sm font-extrabold text-[#04193d] group-hover:text-[#0055ff] transition-colors truncate">
                                    {docItem.name}
                                  </h4>

                                  <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 mt-1">
                                    <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
                                      {formatFileSize(docItem.size)}
                                    </span>
                                    <span className="text-[10px] font-semibold text-slate-500">
                                      {formatUploadDate(docItem)}
                                    </span>
                                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-100">
                                      {docItem.category || 'Print Job'}
                                    </span>
                                    {isVideo && (
                                      <span className="text-[10px] font-black px-2 py-0.5 rounded-md bg-amber-100 text-amber-800 border border-amber-200 animate-pulse">
                                        Video Ready
                                      </span>
                                    )}
                                    {isAudio && (
                                      <span className="text-[10px] font-black px-2 py-0.5 rounded-md bg-violet-100 text-violet-800 border border-violet-200 animate-pulse flex items-center space-x-1">
                                        <Volume2 className="w-3 h-3 text-violet-600" />
                                        <span>Audio (Sound Ready)</span>
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>

                              {/* Quick Action Buttons */}
                              <div className="flex items-center justify-between sm:justify-end space-x-2 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                                {/* Primary Instant View / Play Button */}
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleOpenDocDetails(docItem);
                                  }}
                                  className={`px-3.5 py-2 rounded-xl text-xs font-extrabold flex items-center space-x-1.5 transition-all shadow-xs cursor-pointer ${isVideo
                                    ? 'bg-amber-600 hover:bg-amber-700 text-white shadow-amber-500/20'
                                    : isAudio
                                      ? 'bg-violet-600 hover:bg-violet-700 text-white shadow-violet-500/20'
                                      : 'bg-[#0055ff] hover:bg-blue-700 text-white shadow-blue-500/20'
                                    }`}
                                  title={isVideo ? 'Play Video right now' : isAudio ? 'Play Audio right now' : 'View Document right now'}
                                >
                                  {isVideo ? (
                                    <>
                                      <Play className="w-3.5 h-3.5 fill-white" />
                                      <span>Play Video</span>
                                    </>
                                  ) : isAudio ? (
                                    <>
                                      <Headphones className="w-3.5 h-3.5" />
                                      <span>Play Audio</span>
                                    </>
                                  ) : (
                                    <>
                                      <Eye className="w-3.5 h-3.5" />
                                      <span>Open File</span>
                                    </>
                                  )}
                                </button>

                                {/* Download Button */}
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDownloadDoc(docItem);
                                  }}
                                  className="p-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors cursor-pointer"
                                  title="Download to Computer"
                                >
                                  <Download className="w-4 h-4" />
                                </button>

                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    openShareDialog(docItem);
                                  }}
                                  className="p-2 rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-600 hover:text-white transition-colors cursor-pointer"
                                  title="Share with a registered user"
                                  aria-label="Share document"
                                >
                                  <Share2 className="w-4 h-4" />
                                </button>

                                {/* Delete Button */}
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    if (window.confirm(`Delete "${docItem.name}"?`)) {
                                      handleDeleteDoc(docItem.id);
                                    }
                                  }}
                                  className="p-2 rounded-xl border border-rose-200 text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                                  title="Delete Document"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>

                    {/* User Drilldown Footer */}
                    <div className="p-3 sm:p-4 border-t border-slate-100 bg-white flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
                      <button
                        onClick={() => setSelectedUserForDocs(null)}
                        className="px-4 py-2 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-bold transition-colors cursor-pointer flex items-center space-x-1.5 self-start"
                      >
                        <ArrowLeft className="w-3.5 h-3.5" />
                        <span>Back to All Users</span>
                      </button>

                      <div className="flex items-center space-x-2 self-end sm:self-auto">
                        <button
                          onClick={() => {
                            setSelectedUserFilter({ email: selectedUserForDocs.email, name: selectedUserForDocs.name });
                            setIsUserListModalOpen(false);
                            setTimeFilter('all');
                            setAdminNotice(`Dashboard filtered to ${selectedUserForDocs.name}`);
                            setTimeout(() => setAdminNotice(null), 3500);
                          }}
                          className="px-4 py-2 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 text-xs font-bold transition-colors cursor-pointer"
                        >
                          Filter Main Table to this User
                        </button>

                        <button
                          onClick={() => {
                            setIsUserListModalOpen(false);
                            setSelectedUserForDocs(null);
                          }}
                          className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-colors cursor-pointer shadow-xs"
                        >
                          Close
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}

          {shareTarget && (
            <div
              className="fixed inset-0 z-[150] flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-sm"
              onClick={() => setShareTarget(null)}
            >
              <form
                onSubmit={handleShareDocument}
                onClick={(event) => event.stopPropagation()}
                className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-5 shadow-2xl"
                role="dialog"
                aria-modal="true"
                aria-labelledby="admin-share-title"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h2 id="admin-share-title" className="text-base font-extrabold text-[#04193d]">Share file</h2>
                    <p className="mt-1 break-all text-xs text-slate-500">{shareTarget.name}</p>
                  </div>
                  <button type="button" onClick={() => setShareTarget(null)} className="rounded-md p-1 text-slate-500 hover:bg-slate-100" aria-label="Close share dialog">
                    <X className="h-4 w-4" />
                  </button>
                </div>
                <label htmlFor="admin-share-user-search" className="mt-5 block text-xs font-bold text-slate-700">Registered users</label>
                <input
                  id="admin-share-user-search"
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
                          {shareWithEveryone && <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-700" />}
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
                            {isSelected && <CheckCircle2 className="h-4 w-4 shrink-0 text-blue-600" />}
                          </button>
                        );
                      })}
                    </>
                  )}
                </div>
                <p className="mt-2 text-[11px] text-slate-500">The recipient can view and download this file.</p>
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

          {/* Delete User Confirmation Modal */}
          {userToDelete && (
            <div
              className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200"
              role="dialog"
              aria-modal="true"
              aria-labelledby="delete-user-title"
            >
              <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden animate-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="p-6 bg-gradient-to-b from-red-50 to-white flex items-start space-x-4 border-b border-red-100/50">
                  <div className="w-12 h-12 rounded-2xl bg-red-100 text-red-600 flex items-center justify-center shrink-0 shadow-xs">
                    <UserX className="w-6 h-6" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 id="delete-user-title" className="text-base sm:text-lg font-black text-[#04193d]">
                      Delete User Account?
                    </h3>
                    <p className="text-xs text-slate-500 mt-1">
                      This action will permanently delete this user and all their uploaded data.
                    </p>
                  </div>
                </div>

                {/* User Info Details Box */}
                <div className="px-6 py-4 space-y-3">
                  <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 flex items-center space-x-3">
                    <div className="w-11 h-11 rounded-xl bg-gradient-to-tr from-indigo-600 to-[#0055ff] text-white font-black flex items-center justify-center text-sm shadow-xs shrink-0">
                      {userToDelete.name ? userToDelete.name.charAt(0).toUpperCase() : 'U'}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs sm:text-sm font-black text-slate-900 truncate">
                        {userToDelete.name}
                      </p>
                      <p className="text-[11px] text-slate-500 truncate">
                        {userToDelete.email}
                      </p>
                      <div className="flex items-center space-x-2 mt-1">
                        <span className="text-[10px] font-bold text-slate-600 bg-white px-2 py-0.5 rounded border border-slate-200">
                          {userToDelete.role || 'Member'}
                        </span>
                        <span className="text-[10px] font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded border border-red-200">
                          {userToDelete.docCount} uploaded file(s)
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-[11px] text-amber-800 flex items-start space-x-2">
                    <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                    <span>
                      All documents and uploaded files associated with <strong>{userToDelete.name}</strong> will be permanently removed. This action cannot be undone.
                    </span>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="p-4 sm:p-6 bg-slate-50 border-t border-slate-100 flex items-center justify-end space-x-3">
                  <button
                    type="button"
                    id="cancel-delete-user-btn"
                    disabled={isDeletingUser}
                    onClick={() => setUserToDelete(null)}
                    className="px-4 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 text-xs font-bold transition-colors cursor-pointer shadow-xs disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    id="confirm-delete-user-btn"
                    disabled={isDeletingUser}
                    onClick={handleConfirmDeleteUser}
                    className="px-4 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-extrabold transition-all shadow-md shadow-red-500/20 flex items-center space-x-2 cursor-pointer disabled:opacity-50"
                  >
                    {isDeletingUser ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Deleting User...</span>
                      </>
                    ) : (
                      <>
                        <Trash2 className="w-4 h-4" />
                        <span>Yes, Delete User</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}

        </div>

        {/* Real Document Viewer Modal */}
        <RealDocumentViewerModal
          document={selectedDoc}
          isOpen={isDetailModalOpen}
          onClose={() => {
            setIsDetailModalOpen(false);
            setSelectedDoc(null);
          }}
          onStatusChange={handleStatusChange}
          onDelete={handleDeleteDoc}
          isAdmin={true}
        />

        {/* Admin Edit Document Modal */}
        <AdminEditDocModal
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
