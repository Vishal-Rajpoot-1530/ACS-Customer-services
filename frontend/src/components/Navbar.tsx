import React, { useState, useRef } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Menu, X, ChevronDown, User, ShieldCheck, LogOut, LayoutDashboard, CloudUpload, Loader2, CheckCircle2, Folder } from 'lucide-react';
import { AcsLogo } from './AcsLogo';
import { LoginDropdown } from './LoginDropdown';
import { useAuth } from '../context/AuthContext';
import { ImportedDocument } from '../types';
import { saveMediaBlob } from '../utils/mediaStorage';

import { documentApi } from '../api/document.api';
import { explorerApi, ExplorerFolderDto } from '../api/explorer.api';

export const Navbar: React.FC = () => {
  const [isDropdownOpen, setIsDropdownOpen] = useState<boolean>(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState<boolean>(false);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [uploadToast, setUploadToast] = useState<string | null>(null);
  const [isUploadFolderPickerOpen, setIsUploadFolderPickerOpen] = useState(false);
  const [uploadFolders, setUploadFolders] = useState<ExplorerFolderDto[]>([]);
  const navbarFileInputRef = useRef<HTMLInputElement>(null);
  const uploadFolderIdRef = useRef<string | null>(null);

  const { user, isAuthenticated, logout, openLoginModal } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const toggleDropdown = () => {
    setIsDropdownOpen((prev) => !prev);
  };

  const closeDropdown = () => {
    setIsDropdownOpen(false);
  };

  const handleTriggerNavbarUpload = async () => {
    try {
      const explorer = await explorerApi.get();
      setUploadFolders(explorer.folders);
      setIsUploadFolderPickerOpen(true);
    } catch (error: any) {
      setUploadToast(error?.message || 'Unable to load your folders from the server.');
      setTimeout(() => setUploadToast(null), 4000);
    }
  };

  const openNavbarFilePicker = () => {
    if (navbarFileInputRef.current) {
      navbarFileInputRef.current.value = '';
      navbarFileInputRef.current.click();
    }
  };

  const handleChooseNavbarUploadFolder = (folderId: string | null) => {
    uploadFolderIdRef.current = folderId;
    setIsUploadFolderPickerOpen(false);
    setTimeout(() => openNavbarFilePicker(), 0);
  };

  const handleNavbarFilePicked = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 1) {
      for (const selectedFile of files) {
        const transfer = new DataTransfer();
        transfer.items.add(selectedFile);
        await handleNavbarFilePicked({ target: { files: transfer.files } } as React.ChangeEvent<HTMLInputElement>);
      }
      return;
    }

    const file = files[0];
    if (!file) return;

    setIsUploading(true);
    const docTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    let docId = `doc-${Date.now()}`;
    let fileDataUrl: string | undefined = undefined;

    if (file.size < 3 * 1024 * 1024) {
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

    const ext = (file.name.split('.').pop() || '').toLowerCase();
    const isVideo = file.type?.startsWith('video/') || ['mp4', 'mkv', 'avi', 'mov', 'webm', '3gp', 'wmv', 'flv', 'm4v', 'ogv'].includes(ext);
    const isAudio = file.type?.startsWith('audio/') || ['mp3', 'wav', 'ogg', 'm4a', 'aac', 'flac', 'opus', 'weba', 'wma', 'aiff'].includes(ext);
    const fileCategory = isAudio ? 'Audio Media' : isVideo ? 'Video Media' : 'Print Job';

    await saveMediaBlob(docId, file);

    let newDoc: ImportedDocument | null = null;

    // 1. Primary: Upload to ACS Backend
    try {
      const backendDoc = await documentApi.upload(file, {
        category: fileCategory,
        importedBy: user?.displayName || undefined,
        userEmail: user?.email || undefined,
      });

      // Persist in media storage under backend ID for instant previewing
      await saveMediaBlob(backendDoc.id, file);

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

      const uploadFolderId = uploadFolderIdRef.current;
      if (uploadFolderId) {
        const explorer = await explorerApi.get();
        await explorerApi.save({
          folders: explorer.folders,
          assignments: { ...explorer.assignments, [backendDoc.id]: uploadFolderId },
        });
      }
    } catch (apiErr: any) {
      console.error('Backend navbar upload failed:', apiErr);
      setIsUploading(false);
      setUploadToast(apiErr?.message || 'Upload failed. The file was not stored in AWS S3.');
      setTimeout(() => setUploadToast(null), 4000);
      return;
    }

    window.dispatchEvent(new Event('acs_documents_updated'));
    uploadFolderIdRef.current = null;

    setIsUploading(false);
    setUploadToast(`"${file.name}" uploaded successfully!`);
    setTimeout(() => setUploadToast(null), 4000);
  };

  const handleMobileUserLogin = () => {
    setIsMobileMenuOpen(false);
    openLoginModal(undefined, 'user');
  };

  const handleMobileAdminLogin = () => {
    setIsMobileMenuOpen(false);
    openLoginModal(undefined, 'admin');
  };

  const handleMobileLogout = async () => {
    setIsMobileMenuOpen(false);
    await logout();
    navigate('/');
  };

  const handleAboutClick = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsMobileMenuOpen(false);
    const footerElement = document.getElementById('footer-section');
    if (footerElement) {
      footerElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } else {
      navigate('/');
      setTimeout(() => {
        const el = document.getElementById('footer-section');
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 100);
    }
  };

  const handleLogoClick = (e: React.MouseEvent) => {
    setIsMobileMenuOpen(false);
    if (location.pathname === '/') {
      e.preventDefault();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      navigate('/');
      setTimeout(() => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }, 50);
    }
  };

  const isActive = (path: string) => location.pathname === path;

  return (
    <header className="sticky top-0 z-40 w-full bg-white/95 backdrop-blur-md border-b border-slate-200/90 shadow-xs transition-all">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between py-2 sm:py-2.5 min-h-[72px] sm:min-h-[80px] md:min-h-[86px] lg:min-h-[94px]">
          {/* Left: ACS Customer Service Centre Brand Area */}
          <Link
            to="/"
            onClick={handleLogoClick}
            className="flex items-center space-x-2.5 sm:space-x-3.5 group outline-none select-none rounded-2xl p-1 transition-all min-w-0 max-w-[calc(100%-4.5rem)] sm:max-w-[70%] lg:max-w-none shrink"
            aria-label="ACS Customer Service Centre Homepage"
          >
            {/* High Definition AcsLogo with responsive fluid dimensions */}
            <AcsLogo size="xl" className="w-11 h-11 xs:w-12 xs:h-12 sm:w-14 sm:h-14 md:w-14 md:h-14 lg:w-16 lg:h-16 xl:w-20 xl:h-20 shrink-0 transition-transform duration-300 group-hover:scale-105" />

            <div className="flex flex-col min-w-0 justify-center">
              {/* Primary High-Impact Heading */}
              <div className="flex items-baseline flex-wrap gap-x-1.5 sm:gap-x-2 gap-y-0.5">
                <span className="font-black text-xl xs:text-2xl sm:text-2xl md:text-2xl lg:text-3xl xl:text-4xl tracking-tight text-[#04193d] leading-none group-hover:text-[#0055ff] transition-colors shrink-0">
                  ACS
                </span>
                <span className="font-black text-xs xs:text-sm sm:text-sm md:text-base lg:text-lg xl:text-xl text-[#0055ff] tracking-wide uppercase leading-tight shrink-0 flex items-center gap-1">
                  <span>Customer Service</span>
                  <span className="text-[#ff6600]">Center</span>
                </span>
              </div>
              {/* Tagline / Desk Status */}
              <div className="flex items-center space-x-2 mt-0.5">
                <span className="text-[10px] xs:text-[11px] sm:text-xs font-semibold text-slate-500 tracking-tight truncate hidden sm:inline-block">
                  Digital Kiosk & Online Support
                </span>
                <span className="hidden xl:inline-block text-[11px] font-medium text-slate-400">
                  • Computer • Printer • Software • Internet
                </span>
                <span className="hidden sm:inline-flex items-center px-1.5 py-0.5 rounded-full bg-orange-50 border border-orange-200/80 text-[9px] sm:text-[10px] font-bold text-orange-700 tracking-wide shrink-0">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#ff5500] mr-1 animate-pulse" />
                  Live Desk
                </span>
              </div>
            </div>
          </Link>

          {/* Desktop Navigation Links (Visible on lg: and above) */}
          <nav className="hidden lg:flex items-center space-x-3 xl:space-x-6 shrink-0">
            <Link
              to="/"
              onClick={handleLogoClick}
              className={`text-xs xl:text-sm font-semibold transition-colors duration-150 cursor-pointer outline-none whitespace-nowrap ${isActive('/')
                ? 'text-[#0055ff] font-bold'
                : 'text-[#04193d] hover:text-[#0055ff]'
                }`}
            >
              Home
            </Link>

            <button
              type="button"
              onClick={handleAboutClick}
              className="text-xs xl:text-sm font-semibold text-[#04193d] hover:text-[#ff6600] transition-colors duration-150 cursor-pointer outline-none whitespace-nowrap"
            >
              About Us
            </button>

            {/* Direct Dashboard Link & Upload File Button when authenticated */}
            {isAuthenticated && (
              <>
                <Link
                  to={user?.role === 'admin' ? '/admin-dashboard' : '/user-dashboard'}
                  className={`text-xs xl:text-sm font-semibold transition-colors duration-150 whitespace-nowrap ${isActive('/user-dashboard') || isActive('/admin-dashboard')
                    ? 'text-[#0055ff] font-bold'
                    : 'text-[#04193d] hover:text-[#0055ff]'
                    }`}
                >
                  Dashboard
                </Link>

                {/* Upload File Button - Only Visible When Logged In */}
                <button
                  id="navbar-global-upload-btn"
                  type="button"
                  onClick={handleTriggerNavbarUpload}
                  disabled={isUploading}
                  className="inline-flex items-center space-x-1.5 px-3.5 py-1.5 xl:px-4 xl:py-2 rounded-full bg-gradient-to-r from-[#0055ff] via-[#0066fe] to-[#ff6600] hover:from-[#0044cc] hover:to-[#ff5500] text-white font-bold text-xs xl:text-sm tracking-wide shadow-md shadow-blue-600/25 hover:shadow-orange-500/30 transition-all transform active:scale-95 cursor-pointer outline-none shrink-0 whitespace-nowrap"
                  title="Upload file to system"
                >
                  {isUploading ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 xl:w-4 xl:h-4 animate-spin text-white" />
                      <span>Uploading...</span>
                    </>
                  ) : (
                    <>
                      <CloudUpload className="w-3.5 h-3.5 xl:w-4 xl:h-4 text-white" />
                      <span>Upload File</span>
                    </>
                  )}
                </button>
              </>
            )}

            {/* Login / User Status Dropdown */}
            <div className="relative">
              <button
                id="navbar-login-btn"
                onClick={toggleDropdown}
                className="flex items-center space-x-1.5 px-3 py-1.5 xl:px-4 xl:py-2 rounded-full border border-blue-200/80 bg-gradient-to-r from-blue-50/70 to-orange-50/70 hover:from-blue-100/80 hover:to-orange-100/80 text-[#04193d] hover:text-[#0055ff] font-semibold text-xs xl:text-sm transition-all shadow-xs cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500 shrink-0 whitespace-nowrap"
                aria-expanded={isDropdownOpen}
                aria-haspopup="true"
              >
                {isAuthenticated ? (
                  <>
                    {user?.photoURL ? (
                      <img
                        src={user.photoURL}
                        alt={user.displayName || 'User'}
                        className="w-4 h-4 xl:w-5 xl:h-5 rounded-full object-cover ring-1 ring-[#0055ff]"
                      />
                    ) : (
                      <User className="w-3.5 h-3.5 xl:w-4 xl:h-4 text-[#0055ff]" />
                    )}
                    <span className="truncate max-w-[90px] xl:max-w-[110px]">
                      {user?.displayName?.split(' ')[0] || 'Account'}
                    </span>
                    {user?.role === 'admin' && (
                      <span className="text-[8px] xl:text-[9px] uppercase px-1.5 py-0.5 rounded bg-[#ff5500] text-white font-extrabold shadow-xs">
                        Admin
                      </span>
                    )}
                  </>
                ) : (
                  <>
                    <User className="w-3.5 h-3.5 xl:w-4 xl:h-4 text-[#0055ff]" />
                    <span>Login</span>
                  </>
                )}
                <ChevronDown
                  className={`w-3 h-3 xl:w-3.5 xl:h-3.5 text-slate-500 transition-transform duration-200 ${isDropdownOpen ? 'rotate-180 text-[#0055ff]' : ''
                    }`}
                />
              </button>

              <LoginDropdown isOpen={isDropdownOpen} onClose={closeDropdown} />
            </div>
          </nav>

          {/* Tablet & Mobile Right Controls (Visible on < lg) */}
          <div className="flex lg:hidden items-center space-x-2 shrink-0">
            {/* Quick Upload on tablet / larger screens - ONLY when authenticated */}
            {isAuthenticated && (
              <button
                id="navbar-tablet-upload-btn"
                type="button"
                onClick={handleTriggerNavbarUpload}
                disabled={isUploading}
                className="hidden sm:inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-full bg-gradient-to-r from-[#0055ff] to-[#ff6600] text-white text-xs font-bold shadow-xs hover:opacity-95 active:scale-95 transition-all cursor-pointer whitespace-nowrap"
                title="Upload file to system"
              >
                {isUploading ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <CloudUpload className="w-3.5 h-3.5" />
                )}
                <span>Upload</span>
              </button>
            )}

            {/* Quick User / Login pill on tablet */}
            {isAuthenticated ? (
              <button
                onClick={() => setIsMobileMenuOpen((prev) => !prev)}
                className="hidden sm:inline-flex items-center space-x-1.5 px-2.5 py-1.5 rounded-full bg-blue-50 border border-blue-200/90 text-[#04193d] text-xs font-bold hover:bg-blue-100 transition-colors"
                title="Open user menu"
              >
                {user?.photoURL ? (
                  <img src={user.photoURL} alt="" className="w-4 h-4 rounded-full" />
                ) : (
                  <User className="w-3.5 h-3.5 text-[#0055ff]" />
                )}
                <span className="truncate max-w-[85px]">{user?.displayName?.split(' ')[0] || 'Account'}</span>
              </button>
            ) : (
              <button
                onClick={() => openLoginModal(undefined, 'user')}
                className="hidden sm:inline-flex items-center space-x-1 px-3 py-1.5 rounded-full border border-blue-200 bg-blue-50/70 text-[#0055ff] text-xs font-bold hover:bg-blue-100 transition-colors"
              >
                <User className="w-3.5 h-3.5" />
                <span>Login</span>
              </button>
            )}

            {/* Hamburger Button */}
            <button
              id="mobile-menu-toggle-btn"
              onClick={() => setIsMobileMenuOpen((prev) => !prev)}
              className="p-2 sm:p-2.5 rounded-xl bg-slate-100/90 hover:bg-blue-50 text-slate-700 hover:text-[#0055ff] border border-slate-200/80 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors cursor-pointer"
              aria-label="Toggle navigation menu"
              aria-expanded={isMobileMenuOpen}
            >
              {isMobileMenuOpen ? (
                <X className="w-5 h-5 sm:w-6 sm:h-6" />
              ) : (
                <Menu className="w-5 h-5 sm:w-6 sm:h-6" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile & Tablet Drawer Menu */}
      {isMobileMenuOpen && (
        <div
          id="mobile-nav-drawer"
          className="lg:hidden border-t border-slate-100 bg-white px-4 pt-3 pb-6 space-y-3 shadow-lg max-h-[calc(100dvh-80px)] overflow-y-auto animate-in slide-in-from-top-3 duration-200"
        >
          <div className="space-y-1">
            <Link
              to="/"
              onClick={handleLogoClick}
              className={`flex items-center min-h-[44px] px-3 py-2 rounded-xl text-base font-semibold cursor-pointer outline-none focus:outline-none ${isActive('/')
                ? 'bg-blue-50 text-[#0055ff] font-bold'
                : 'text-[#04193d] hover:bg-slate-50 hover:text-[#0055ff]'
                }`}
            >
              Home
            </Link>
            <button
              type="button"
              onClick={handleAboutClick}
              className="w-full text-left flex items-center min-h-[44px] px-3 py-2 rounded-xl text-base font-semibold text-[#04193d] hover:bg-slate-50 hover:text-[#ff6600] transition-colors cursor-pointer outline-none focus:outline-none"
            >
              About Us
            </button>

            {/* Mobile Upload File Button - Only visible when logged in */}
            {isAuthenticated && (
              <div className="pt-2">
                <button
                  id="mobile-upload-file-btn"
                  type="button"
                  onClick={() => {
                    setIsMobileMenuOpen(false);
                    handleTriggerNavbarUpload();
                  }}
                  disabled={isUploading}
                  className="w-full inline-flex items-center justify-center space-x-2 min-h-[44px] py-2.5 px-4 rounded-xl bg-gradient-to-r from-[#0055ff] via-[#0066fe] to-[#ff6600] text-white font-bold text-sm shadow-md transition-all cursor-pointer active:scale-98"
                >
                  {isUploading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-white" />
                      <span>Uploading...</span>
                    </>
                  ) : (
                    <>
                      <CloudUpload className="w-5 h-5 text-white" />
                      <span>Upload File</span>
                    </>
                  )}
                </button>
              </div>
            )}
          </div>

          <div className="pt-3 border-t border-slate-100">
            {!isAuthenticated ? (
              <div className="space-y-2">
                <p className="px-3 text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Sign In with Google
                </p>
                <button
                  onClick={handleMobileUserLogin}
                  className="w-full flex items-center space-x-3 min-h-[44px] px-3 py-2.5 rounded-xl bg-blue-50 text-[#0052cc] font-semibold text-sm hover:bg-blue-100 transition-colors cursor-pointer"
                >
                  <User className="w-4 h-4" />
                  <span>Customer User Login</span>
                </button>
                <button
                  onClick={handleMobileAdminLogin}
                  className="w-full flex items-center space-x-3 min-h-[44px] px-3 py-2.5 rounded-xl bg-slate-100 text-[#0b1b3d] font-semibold text-sm hover:bg-slate-200 transition-colors cursor-pointer"
                >
                  <ShieldCheck className="w-4 h-4" />
                  <span>Desk Admin Login</span>
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="px-3 py-2 bg-slate-50 rounded-xl flex items-center space-x-3">
                  {user?.photoURL ? (
                    <img
                      src={user.photoURL}
                      alt={user.displayName || 'User'}
                      className="w-8 h-8 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-blue-600 text-white font-bold flex items-center justify-center text-xs">
                      {user?.displayName?.charAt(0) || 'U'}
                    </div>
                  )}
                  <div className="overflow-hidden">
                    <p className="text-sm font-bold text-slate-900 truncate">
                      {user?.displayName}
                    </p>
                    <p className="text-xs text-slate-500 truncate">{user?.email}</p>
                  </div>
                </div>

                <Link
                  to={user?.role === 'admin' ? '/admin-dashboard' : '/user-dashboard'}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="flex items-center space-x-2 min-h-[44px] px-3 py-2 rounded-xl text-sm font-medium text-slate-700 hover:bg-slate-100"
                >
                  <LayoutDashboard className="w-4 h-4 text-blue-600" />
                  <span>Open Dashboard</span>
                </Link>

                <button
                  onClick={handleMobileLogout}
                  className="w-full flex items-center space-x-2 min-h-[44px] px-3 py-2 rounded-xl text-sm font-medium text-red-600 hover:bg-red-50 cursor-pointer"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Sign Out</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Hidden File Input for Universal Upload */}
      <input
        ref={navbarFileInputRef}
        type="file"
        multiple
        accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg,.txt,.mp4,.mkv,.avi,.mov,.webm,.3gp,.mp3,.wav,.ogg,.m4a,.aac,.flac,audio/*,video/*"
        className="hidden"
        onChange={handleNavbarFilePicked}
      />

      {isUploadFolderPickerOpen && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-950/45 p-4" onClick={() => setIsUploadFolderPickerOpen(false)}>
          <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl" onClick={(event) => event.stopPropagation()}>
            <h2 className="text-base font-extrabold text-slate-900">Choose upload folder</h2>
            <p className="mt-1 text-xs text-slate-500">Select where this file should be stored.</p>
            <div className="mt-4 max-h-64 space-y-1 overflow-y-auto">
              <button type="button" onClick={() => handleChooseNavbarUploadFolder(null)} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm hover:bg-blue-50">
                <Folder className="h-4 w-4 text-blue-500" />All files / Root
              </button>
              {uploadFolders.map((folder) => (
                <button key={folder.id} type="button" onClick={() => handleChooseNavbarUploadFolder(folder.id)} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm hover:bg-blue-50">
                  <Folder className="h-4 w-4 text-amber-500" />{folder.name}
                </button>
              ))}
            </div>
            <button type="button" onClick={() => setIsUploadFolderPickerOpen(false)} className="mt-4 w-full rounded-lg border border-slate-200 py-2 text-xs font-bold text-slate-600">Cancel</button>
          </div>
        </div>
      )}

      {/* Upload Toast Alert */}
      {uploadToast && (
        <div className="fixed top-20 left-4 right-4 sm:left-auto sm:right-8 z-50 p-4 max-w-sm mx-auto sm:mx-0 rounded-2xl bg-white border border-emerald-300 shadow-xl flex items-center space-x-3 text-slate-800 animate-in fade-in slide-in-from-top-4 duration-300">
          <div className="w-8 h-8 rounded-xl bg-emerald-500 text-white flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-bold text-emerald-800">Upload Complete</p>
            <p className="text-xs text-slate-600 font-medium truncate">{uploadToast}</p>
          </div>
        </div>
      )}
    </header>
  );
};
