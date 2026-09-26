import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ShieldAlert, Loader2, LogIn } from 'lucide-react';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireAdmin?: boolean;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  requireAdmin = false
}) => {
  const { isAuthenticated, userRole, isAdminAuthorized, loading, openLoginModal } = useAuth();

  if (loading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center space-y-3">
        <Loader2 className="w-8 h-8 text-[#0052cc] animate-spin" />
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
          Verifying Authentication...
        </p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="max-w-md mx-auto my-12 p-8 bg-white rounded-2xl border border-slate-200 shadow-xl text-center">
        <div className="w-14 h-14 rounded-2xl bg-blue-50 text-[#0052cc] flex items-center justify-center mx-auto mb-4">
          <LogIn className="w-7 h-7" />
        </div>
        <h3 className="text-xl font-bold text-[#0b1b3d] mb-2">
          Authentication Required
        </h3>
        <p className="text-sm text-slate-600 mb-6 leading-relaxed">
          You must sign in with your ACS account to access this customer centre portal.
        </p>
        <button
          onClick={() => openLoginModal()}
          className="w-full py-3 px-4 rounded-xl bg-[#0052cc] hover:bg-[#0040b3] text-white font-semibold text-sm shadow-md transition-colors cursor-pointer"
        >
          Sign In with Google
        </button>
      </div>
    );
  }

  if (requireAdmin && userRole !== 'admin') {
    return <Navigate to="/user-dashboard" replace />;
  }

  return <>{children}</>;
};
