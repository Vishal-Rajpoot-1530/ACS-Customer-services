import React, { useRef, useEffect } from 'react';
import { User, LogOut, ChevronRight, LayoutDashboard, Sparkles } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Link, useNavigate } from 'react-router-dom';

interface LoginDropdownProps {
  isOpen: boolean;
  onClose: () => void;
}

export const LoginDropdown: React.FC<LoginDropdownProps> = ({ isOpen, onClose }) => {
  const { user, isAuthenticated, openLoginModal, logout } = useAuth();
  const dropdownRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  // Close when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleUserLogin = () => {
    onClose();
    openLoginModal(undefined, 'user');
  };

  const handleLogout = async () => {
    await logout();
    onClose();
    navigate('/');
  };

  return (
    <div
      ref={dropdownRef}
      id="login-dropdown-menu"
      className="absolute right-0 top-full mt-2 w-72 rounded-2xl bg-white p-2.5 shadow-2xl border border-slate-200/80 z-50 animate-in fade-in slide-in-from-top-2 duration-150"
    >
      {!isAuthenticated ? (
        <div className="space-y-1">
          <div className="px-3 py-2 border-b border-slate-100">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Sign In to ACS Centre
            </p>
            <p className="text-xs text-slate-600 mt-0.5">
              Select your portal access mode
            </p>
          </div>

          <button
            id="user-login-dropdown-btn"
            onClick={handleUserLogin}
            type="button"
            className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-left text-sm font-medium text-slate-800 hover:bg-blue-50 hover:text-blue-700 transition-colors group cursor-pointer"
          >
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 rounded-xl bg-blue-100/80 text-blue-600 flex items-center justify-center group-hover:bg-blue-600 group-hover:text-white transition-colors">
                <User className="w-4 h-4" />
              </div>
              <div>
                <span className="block font-semibold text-slate-900 group-hover:text-blue-700">
                  Customer User Login
                </span>
                <span className="block text-[11px] text-slate-500">
                  Customer account & orders
                </span>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-blue-600 group-hover:translate-x-0.5 transition-transform" />
          </button>

        </div>
      ) : (
        <div className="space-y-1">
          <div className="px-3 py-2.5 border-b border-slate-100 bg-slate-50/60 rounded-xl mb-1">
            <div className="flex items-center space-x-2.5">
              {user?.photoURL ? (
                <img
                  src={user.photoURL}
                  alt={user.displayName || 'User'}
                  className="w-9 h-9 rounded-full object-cover ring-2 ring-blue-500"
                />
              ) : (
                <div className="w-9 h-9 rounded-full bg-blue-600 text-white font-bold flex items-center justify-center text-sm">
                  {user?.displayName?.charAt(0) || 'U'}
                </div>
              )}
              <div className="overflow-hidden">
                <p className="text-sm font-bold text-slate-900 truncate">
                  {user?.displayName}
                </p>
                <p className="text-xs text-slate-500 truncate">{user?.email}</p>
                <span className="inline-block mt-1 text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-blue-100 text-blue-800">
                  {user?.role === 'admin' ? 'Administrator' : 'Customer'}
                </span>
              </div>
            </div>
          </div>

          <Link
            to={user?.role === 'admin' ? '/admin-dashboard' : '/user-dashboard'}
            onClick={onClose}
            className="w-full flex items-center space-x-2.5 px-3 py-2 rounded-xl text-sm font-medium text-slate-700 hover:bg-blue-50 hover:text-blue-700 transition-colors"
          >
            <LayoutDashboard className="w-4 h-4 text-blue-600" />
            <span>Go to Dashboard</span>
          </Link>

          <button
            onClick={handleLogout}
            type="button"
            className="w-full flex items-center space-x-2.5 px-3 py-2 rounded-xl text-sm font-medium text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign Out</span>
          </button>
        </div>
      )}
    </div>
  );
};
