import React, { createContext, useContext, useState, useEffect, ReactNode, useRef } from 'react';
import { AuthUser, AuthContextType, UserRole } from '../types';
import { authApi, UserDto } from '../api/auth.api';
import { apiClient } from '../api/apiClient';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

const mapBackendUserToAuthUser = (userDto: UserDto): AuthUser => {
  const role: UserRole = userDto.role === 'ADMIN' ? 'admin' : 'user';
  return {
    uid: userDto.id,
    email: userDto.email,
    displayName: userDto.displayName,
    photoURL: userDto.photoURL || '',
    role,
    isAdminAuthorized: role === 'admin',
  };
};

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(() => {
    return null;
  });

  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState<boolean>(false);
  const [modalRole, setModalRole] = useState<'user' | 'admin'>('user');

  const pendingSuccessCallback = useRef<(() => void) | null>(null);

  // 1. Initial Session Check with Backend API
  useEffect(() => {
    const initAuthSession = async () => {
      const token = apiClient.getAccessToken();
      if (token) {
        try {
          const userDto = await authApi.getMe();
          const authUser = mapBackendUserToAuthUser(userDto);
          setUser(authUser);
          localStorage.setItem('acs_auth_user', JSON.stringify(authUser));
          if (authUser.role) {
            localStorage.setItem('acs_user_role', authUser.role);
          }
        } catch (err: any) {
          console.warn('Backend session restore note:', err.message || err);
          if (err?.status === 401) {
            apiClient.clearTokens();
            setUser(null);
            localStorage.removeItem('acs_auth_user');
            localStorage.removeItem('acs_user_role');
          }
        }
      }
      setLoading(false);
    };

    initAuthSession();
  }, []);

  // 2. Email / Password Login via Backend API
  const loginWithCredentials = async (email: string, password: string): Promise<AuthUser> => {
    setLoading(true);
    setError(null);
    try {
      const res = await authApi.login({ email, password });
      const authUserData = mapBackendUserToAuthUser(res.user);

      setUser(authUserData);
      localStorage.setItem('acs_user_role', authUserData.role || 'user');
      localStorage.setItem('acs_auth_user', JSON.stringify(authUserData));
      setIsLoginModalOpen(false);

      if (pendingSuccessCallback.current) {
        const cb = pendingSuccessCallback.current;
        pendingSuccessCallback.current = null;
        setTimeout(() => cb(), 100);
      }

      return authUserData;
    } catch (err: any) {
      const msg = err?.message || 'Login failed. Please check your credentials.';
      setError(msg);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // 3. User Registration via Backend API
  const registerWithCredentials = async (data: {
    email: string;
    password: string;
    displayName: string;
    photoURL?: string;
    role?: 'USER' | 'ADMIN';
  }): Promise<AuthUser> => {
    setLoading(true);
    setError(null);
    try {
      const res = await authApi.register(data);
      const authUserData = mapBackendUserToAuthUser(res.user);

      setUser(authUserData);
      localStorage.setItem('acs_user_role', authUserData.role || 'user');
      localStorage.setItem('acs_auth_user', JSON.stringify(authUserData));
      setIsLoginModalOpen(false);

      if (pendingSuccessCallback.current) {
        const cb = pendingSuccessCallback.current;
        pendingSuccessCallback.current = null;
        setTimeout(() => cb(), 100);
      }

      return authUserData;
    } catch (err: any) {
      const msg = err?.message || 'Registration failed. Please check your input.';
      setError(msg);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // 4. Logout
  const logout = async () => {
    setLoading(true);
    try {
      await authApi.logout();
    } catch (err) {
      console.warn('Backend logout warning:', err);
    }

    apiClient.clearTokens();
    setUser(null);
    localStorage.removeItem('acs_user_role');
    localStorage.removeItem('acs_auth_user');
    setLoading(false);
  };

  const clearError = () => setError(null);

  const openLoginModal = (callback?: () => void, defaultRole: 'user' | 'admin' = 'user') => {
    if (callback) {
      pendingSuccessCallback.current = callback;
    } else {
      pendingSuccessCallback.current = null;
    }
    setModalRole(defaultRole);
    setIsLoginModalOpen(true);
    clearError();
  };

  const closeLoginModal = () => {
    setIsLoginModalOpen(false);
    pendingSuccessCallback.current = null;
    clearError();
  };

  const hasPendingSuccessCallback = () => pendingSuccessCallback.current !== null;

  const userRole = user?.role || null;
  const isAdminAuthorized = !!(user && user.role === 'admin');

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        userRole,
        isAdminAuthorized,
        loading,
        error,
        loginWithCredentials,
        registerWithCredentials,
        logout,
        clearError,
        isLoginModalOpen,
        modalRole,
        openLoginModal,
        hasPendingSuccessCallback,
        closeLoginModal,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
