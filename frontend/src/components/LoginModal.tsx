import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { X, User, ShieldCheck, AlertCircle, ArrowRight, Loader2, Mail, Lock, UserPlus } from 'lucide-react';
import { AcsLogo } from './AcsLogo';
import { useNavigate } from 'react-router-dom';
import { authApi } from '../api/auth.api';

interface LoginModalProps {
  initialRole?: 'user' | 'admin';
}

type AuthTab = 'login' | 'register';

export const LoginModal: React.FC<LoginModalProps> = ({ initialRole }) => {
  const {
    isLoginModalOpen,
    closeLoginModal,
    loginWithCredentials,
    registerWithCredentials,
    modalRole,
    error,
    clearError,
    hasPendingSuccessCallback,
  } = useAuth();

  const [selectedRole, setSelectedRole] = useState<'user' | 'admin'>('user');
  const [adminAvailable, setAdminAvailable] = useState(false);
  const [activeTab, setActiveTab] = useState<AuthTab>('login');
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [passwordError, setPasswordError] = useState<string>('');
  const [displayName, setDisplayName] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (modalRole && (modalRole === 'user' || adminAvailable)) {
      setSelectedRole(modalRole);
    } else if (initialRole) {
      setSelectedRole(initialRole === 'admin' && adminAvailable ? 'admin' : 'user');
    }
  }, [modalRole, initialRole, adminAvailable]);

  useEffect(() => {
    if (!isLoginModalOpen) return;
    authApi.getAdminStatus()
      .then((available) => {
        setAdminAvailable(available);
        if (!available) setSelectedRole('user');
      })
      .catch(() => {
        setAdminAvailable(false);
        setSelectedRole('user');
      });
  }, [isLoginModalOpen]);

  if (!isLoginModalOpen) return null;

  const navigateToDashboard = (role?: string | null) => {
    if (role === 'admin') {
      navigate('/admin-dashboard');
    } else {
      navigate('/user-dashboard');
    }
  };

  const validateRegistrationPassword = (value: string): string => {
    if (value.length < 8) return 'Password must be at least 8 characters long.';
    if (!/[A-Z]/.test(value)) return 'Password must contain at least one uppercase letter.';
    if (!/[a-z]/.test(value)) return 'Password must contain at least one lowercase letter.';
    if (!/[0-9]/.test(value)) return 'Password must contain at least one number.';
    return '';
  };

  const handleCredentialLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) return;
    setIsSubmitting(true);
    clearError();
    const hasImportCallback = hasPendingSuccessCallback();
    try {
      const loggedUser = await loginWithCredentials(email.trim(), password);
      if (loggedUser) {
        if (!hasImportCallback) navigateToDashboard(loggedUser.role);
      }
    } catch (e) {
      console.error('Credential login error:', e);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCredentialRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password || !displayName.trim()) return;
    const validationError = validateRegistrationPassword(password);
    setPasswordError(validationError);
    if (validationError) return;
    setIsSubmitting(true);
    clearError();
    const hasImportCallback = hasPendingSuccessCallback();
    try {
      const loggedUser = await registerWithCredentials({
        email: email.trim(),
        password,
        displayName: displayName.trim(),
        role: selectedRole === 'admin' ? 'ADMIN' : 'USER',
      });
      if (loggedUser) {
        if (!hasImportCallback) navigateToDashboard(loggedUser.role);
      }
    } catch (e) {
      console.error('Registration error:', e);
    } finally {
      setIsSubmitting(false);
    }
  };


  return (
    <div
      id="login-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isSubmitting) {
          closeLoginModal();
        }
      }}
    >
      <div
        className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-100 p-6 md:p-8 overflow-hidden animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={closeLoginModal}
          disabled={isSubmitting}
          className="absolute top-5 right-5 p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition-colors disabled:opacity-50 cursor-pointer"
          aria-label="Close modal"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="text-center mb-5">
          <div className="inline-flex items-center justify-center mb-2">
            <AcsLogo size={52} className="drop-shadow-sm" />
          </div>
          <h3 className="text-xl font-extrabold text-slate-900 tracking-tight">
            ACS Customer Service
          </h3>
          <p className="text-xs text-slate-500 mt-1">
            {activeTab === 'login' ? 'Sign in to access your portal' : 'Create your account to get started'}
          </p>
        </div>

        {activeTab === 'register' && adminAvailable && <div className="flex p-1 bg-slate-100/90 rounded-2xl mb-4">
          <button
            type="button"
            onClick={() => setSelectedRole('user')}
            disabled={isSubmitting}
            className={`flex-1 flex items-center justify-center space-x-2 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${selectedRole === 'user'
              ? 'bg-white text-[#0055ff] shadow-sm ring-1 ring-blue-500/10'
              : 'text-slate-600 hover:text-slate-900'
              }`}
          >
            <User className="w-4 h-4 text-[#0055ff]" />
            <span>Customer Member</span>
          </button>
          <button
            type="button"
            onClick={() => setSelectedRole('admin')}
            disabled={isSubmitting}
            className={`flex-1 flex items-center justify-center space-x-2 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${selectedRole === 'admin'
              ? 'bg-white text-[#ff5500] shadow-sm ring-1 ring-[#ff5500]/20'
              : 'text-slate-600 hover:text-slate-900'
              }`}
          >
            <ShieldCheck className="w-4 h-4 text-[#ff5500]" />
            <span>Desk Admin</span>
          </button>
        </div>}

        {/* Mode Tabs: Sign In vs Create Account */}
        <div className="flex border-b border-slate-200 mb-4 text-xs font-bold">
          <button
            type="button"
            onClick={() => { setActiveTab('login'); clearError(); setPasswordError(''); }}
            className={`flex-1 pb-2.5 text-center transition-colors cursor-pointer ${activeTab === 'login'
              ? 'border-b-2 border-[#0055ff] text-[#0055ff]'
              : 'text-slate-500 hover:text-slate-700'
              }`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => { setActiveTab('register'); clearError(); setPasswordError(''); }}
            className={`flex-1 pb-2.5 text-center transition-colors cursor-pointer ${activeTab === 'register'
              ? 'border-b-2 border-[#0055ff] text-[#0055ff]'
              : 'text-slate-500 hover:text-slate-700'
              }`}
          >
            Create Account
          </button>
        </div>

        {/* Error Notification */}
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-2xl text-red-800 text-xs flex items-start space-x-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-600 mt-0.5" />
            <p className="font-semibold flex-1">{error}</p>
          </div>
        )}

        {/* Tab 1: Email & Password Login */}
        {activeTab === 'login' && (
          <form onSubmit={handleCredentialLogin} className="space-y-3.5">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Email or Account ID</label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="text"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com or account ID"
                  className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#0055ff]/20 focus:border-[#0055ff]"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Password</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="password"
                  required
                  minLength={8}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#0055ff]/20 focus:border-[#0055ff]"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full flex items-center justify-center space-x-2 py-3 px-4 rounded-xl bg-[#0055ff] hover:bg-[#0044cc] text-white font-bold text-xs shadow-md shadow-blue-500/20 transition-all cursor-pointer disabled:opacity-60"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Signing In...</span>
                </>
              ) : (
                <>
                  <span>Sign In</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        )}

        {/* Tab 2: Create Account */}
        {activeTab === 'register' && (
          <form onSubmit={handleCredentialRegister} className="space-y-3.5">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Full Name</label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="text"
                  required
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="e.g. Rahul Sharma"
                  className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#0055ff]/20 focus:border-[#0055ff]"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Email Address</label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#0055ff]/20 focus:border-[#0055ff]"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Password</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="password"
                  required
                  minLength={8}
                  value={password}
                  onChange={(e) => {
                    const value = e.target.value;
                    setPassword(value);
                    setPasswordError(validateRegistrationPassword(value));
                  }}
                  placeholder="Min 8 chars with 1 uppercase & 1 digit"
                  aria-invalid={Boolean(passwordError)}
                  aria-describedby="registration-password-help registration-password-error"
                  className={`w-full pl-9 pr-3 py-2.5 bg-slate-50 border rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#0055ff]/20 focus:border-[#0055ff] ${passwordError ? 'border-red-400' : 'border-slate-200'}`}
                />
              </div>
              <p id="registration-password-help" className="text-[10px] text-slate-400 mt-1">Must contain at least 8 characters, one uppercase letter, one lowercase letter, and one number.</p>
              {passwordError && (
                <p id="registration-password-error" role="alert" className="text-[10px] text-red-600 mt-1 font-semibold">
                  {passwordError}
                </p>
              )}
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full flex items-center justify-center space-x-2 py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md shadow-emerald-500/20 transition-all cursor-pointer disabled:opacity-60"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Registering...</span>
                </>
              ) : (
                <>
                  <UserPlus className="w-4 h-4" />
                  <span>Create {selectedRole === 'admin' ? 'Desk Admin' : 'Customer'} Account</span>
                </>
              )}
            </button>
          </form>
        )}


        {/* Security / Terms Notice */}
        <p className="text-[10px] text-center text-slate-400 mt-3 leading-tight">
          Protected by HTTPS & JWT token authorization with AES-256 cloud encryption.
        </p>
      </div>
    </div>
  );
};
