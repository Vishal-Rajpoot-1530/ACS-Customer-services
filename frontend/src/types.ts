export type UserRole = 'user' | 'admin' | null;

export interface AuthUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  role: UserRole;
  isAdminAuthorized: boolean;
}

export interface ImportedDocument {
  id: string;
  name: string;
  size: number;
  type: string;
  lastModified: number;
  importedAt: string;
  importedBy: string;
  userId?: string;
  userEmail: string;
  status: 'ready' | 'pending' | 'processing' | 'completed' | 'queued';
  notes?: string;
  category?: string;
  createdAt?: any;
  fileDataUrl?: string;
  contentPreview?: string;
  downloadUrl?: string;
  s3Key?: string;
  storedName?: string;
}

export interface SelectedFile {
  name: string;
  size: number;
  type: string;
  lastModified: number;
  rawFile?: File;
  formattedSize: string;
}

export interface AuthContextType {
  user: AuthUser | null;
  isAuthenticated: boolean;
  userRole: UserRole;
  isAdminAuthorized: boolean;
  loading: boolean;
  error: string | null;
  loginWithCredentials: (email: string, password: string) => Promise<AuthUser>;
  registerWithCredentials: (data: {
    email: string;
    password: string;
    displayName: string;
    photoURL?: string;
    role?: 'USER' | 'ADMIN';
  }) => Promise<AuthUser>;
  logout: () => Promise<void>;
  clearError: () => void;
  isLoginModalOpen: boolean;
  modalRole: 'user' | 'admin';
  openLoginModal: (callback?: () => void, defaultRole?: 'user' | 'admin') => void;
  hasPendingSuccessCallback: () => boolean;
  closeLoginModal: () => void;
}
