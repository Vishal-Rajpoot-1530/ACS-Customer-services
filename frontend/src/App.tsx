import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { Navbar } from './components/Navbar';
import { Footer } from './components/Footer';
import { LoginModal } from './components/LoginModal';
import { ProtectedRoute } from './components/ProtectedRoute';
import { Home } from './pages/Home';
import { UserDashboard } from './pages/UserDashboard';
import { AdminDashboard } from './pages/AdminDashboard';

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900 selection:bg-blue-600 selection:text-white">
          <Navbar />

          <main className="flex min-h-[calc(100vh-72px)] flex-1 flex-col sm:min-h-[calc(100vh-80px)] md:min-h-[calc(100vh-86px)] lg:min-h-[calc(100vh-94px)]">
            <Routes>
              <Route path="/" element={<Home />} />
              <Route
                path="/user-dashboard"
                element={
                  <ProtectedRoute>
                    <UserDashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin-dashboard"
                element={
                  <ProtectedRoute requireAdmin={true}>
                    <AdminDashboard />
                  </ProtectedRoute>
                }
              />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </main>

          <Footer />
          <LoginModal />
        </div>
      </BrowserRouter>
    </AuthProvider>
  );
}
