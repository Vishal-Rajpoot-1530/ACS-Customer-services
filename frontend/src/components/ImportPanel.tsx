import React, { useRef, useState, useCallback } from 'react';
import { CloudUpload, Sparkles, CheckCircle, ArrowRight, Folder } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { SelectedFile, ImportedDocument } from '../types';
import { FilePreview } from './FilePreview';
import { Link } from 'react-router-dom';
import { saveMediaBlob, linkMediaBlob } from '../utils/mediaStorage';

import { documentApi } from '../api/document.api';
import { explorerApi, ExplorerFolderDto } from '../api/explorer.api';

export const ImportPanel: React.FC = () => {
  const { isAuthenticated, user, openLoginModal } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [selectedFile, setSelectedFile] = useState<SelectedFile | null>(null);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [importSuccess, setImportSuccess] = useState<ImportedDocument | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const [isFolderPickerOpen, setIsFolderPickerOpen] = useState(false);
  const [isLoadingFolders, setIsLoadingFolders] = useState(false);
  const [uploadFolders, setUploadFolders] = useState<ExplorerFolderDto[]>([]);
  const uploadFolderIdRef = useRef<string | null>(null);
  const [isHovered, setIsHovered] = useState<boolean>(false);

  // Format file size nicely
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  // Directly trigger file picker
  const triggerNativeFilePicker = useCallback(() => {
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
      fileInputRef.current.click();
    }
  }, []);

  const openFolderPicker = async () => {
    if (isLoadingFolders) return;
    uploadFolderIdRef.current = null;
    setIsLoadingFolders(true);
    setImportError(null);
    try {
      const explorer = await explorerApi.get();
      setUploadFolders(explorer.folders);
      setIsFolderPickerOpen(true);
    } catch (error: any) {
      setImportError(error?.message || 'Unable to load your folders from the server.');
    } finally {
      setIsLoadingFolders(false);
    }
  };

  const chooseUploadFolder = (folderId: string | null) => {
    uploadFolderIdRef.current = folderId;
    setIsFolderPickerOpen(false);
    setTimeout(() => triggerNativeFilePicker(), 0);
  };

  // Main click handler on the entire ping area
  const handleImportAreaClick = () => {
    if (selectedFile || importSuccess || isLoadingFolders) return;

    if (!isAuthenticated) {
      // Not logged in -> Show Login Required Modal & register auto-file-picker callback
      openLoginModal(() => { void openFolderPicker(); }, 'user');
    } else {
      void openFolderPicker();
    }
  };

  // Handle file input change
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const fileData: SelectedFile = {
      name: file.name,
      size: file.size,
      type: file.type || 'application/octet-stream',
      lastModified: file.lastModified,
      rawFile: file,
      formattedSize: formatFileSize(file.size)
    };

    setSelectedFile(fileData);
    setImportSuccess(null);
    setImportError(null);
  };

  // Confirm import document action
  const handleConfirmImport = async () => {
    if (!selectedFile || !selectedFile.rawFile) return;

    setIsProcessing(true);
    const docTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    let docId = `doc-${Date.now()}`;
    let fileDataUrl: string | undefined = undefined;

    const ext = (selectedFile.name.split('.').pop() || '').toLowerCase();
    const isVideo = selectedFile.type?.startsWith('video/') || ['mp4', 'mkv', 'avi', 'mov', 'webm', '3gp', 'wmv', 'flv', 'm4v', 'ogv'].includes(ext);
    const isAudio = selectedFile.type?.startsWith('audio/') || ['mp3', 'wav', 'ogg', 'm4a', 'aac', 'flac', 'opus', 'weba', 'wma', 'aiff'].includes(ext);
    const category = isAudio ? 'Audio Media' : isVideo ? 'Video Media' : 'Print Job';

    setImportError(null);

    try {
      await saveMediaBlob(docId, selectedFile.rawFile);
    } catch (error: any) {
      console.error('Local file storage failed:', error);
      setImportError(error?.message || 'Unable to prepare this file for import. Please try again.');
      setIsProcessing(false);
      return;
    }

    if (selectedFile.rawFile.size < 700 * 1024) {
      try {
        fileDataUrl = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.onerror = () => resolve('');
          reader.readAsDataURL(selectedFile.rawFile!);
        });
      } catch (err) {
        console.warn('FileReader error:', err);
      }
    }

    let docItem: ImportedDocument | null = null;

    // Upload the selected file to the backend; S3 and the database are the source of truth.
    try {
      const backendDoc = await documentApi.upload(selectedFile.rawFile, {
        category,
        importedBy: user?.displayName || undefined,
        userEmail: user?.email || undefined,
      });

      await saveMediaBlob(backendDoc.id, selectedFile.rawFile);
      try {
        await linkMediaBlob(docId, backendDoc.id);
      } catch (_) { }

      const uploadFolderId = uploadFolderIdRef.current;
      if (uploadFolderId) {
        const explorer = await explorerApi.get();
        await explorerApi.save({
          folders: explorer.folders,
          assignments: { ...explorer.assignments, [backendDoc.id]: uploadFolderId },
        });
      }

      docItem = {
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
      console.error('Backend upload failed:', apiErr);
      setImportError(apiErr?.message || 'File upload failed. Please try again.');
      setIsProcessing(false);
      return;
    }

    setIsProcessing(false);
    setImportSuccess(docItem);
    setSelectedFile(null);
    uploadFolderIdRef.current = null;
    window.dispatchEvent(new CustomEvent('acs_documents_updated'));
  };

  const handleClear = () => {
    setSelectedFile(null);
    setImportSuccess(null);
    setImportError(null);
    uploadFolderIdRef.current = null;
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="w-full flex flex-col items-center justify-center py-6 px-4 select-none">
      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        id="hidden-document-file-input"
        accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg,.txt,.mp4,.mkv,.avi,.mov,.webm,.3gp,.mp3,.wav,.ogg,.m4a,.aac,.flac,audio/*,video/*"
        onChange={handleFileChange}
        className="hidden"
        aria-label="Upload document file"
      />

      {isFolderPickerOpen && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-950/45 p-4" onClick={() => setIsFolderPickerOpen(false)}>
          <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-5 text-left shadow-2xl" onClick={(event) => event.stopPropagation()}>
            <h2 className="text-base font-extrabold text-slate-900">Choose upload folder</h2>
            <p className="mt-1 text-xs text-slate-500">Select where this file should be stored.</p>
            <div className="mt-4 max-h-64 space-y-1 overflow-y-auto">
              <button type="button" onClick={() => chooseUploadFolder(null)} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm hover:bg-blue-50">
                <Folder className="h-4 w-4 text-blue-500" />All files / Root
              </button>
              {uploadFolders.map((folder) => (
                <button key={folder.id} type="button" onClick={() => chooseUploadFolder(folder.id)} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm hover:bg-blue-50">
                  <Folder className="h-4 w-4 text-amber-500" />{folder.name}
                </button>
              ))}
            </div>
            <button type="button" onClick={() => setIsFolderPickerOpen(false)} className="mt-4 w-full rounded-lg border border-slate-200 py-2 text-xs font-bold text-slate-600">Cancel</button>
          </div>
        </div>
      )}

      {/* Main Viewport Focus */}
      {!selectedFile && !importSuccess ? (
        <div className="flex flex-col items-center justify-center text-center">
          {/* Main Ripple / Ping Import Container */}
          <div
            id="main-ping-import-area"
            onClick={handleImportAreaClick}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            className="relative flex items-center justify-center cursor-pointer transition-transform duration-300 active:scale-95 group focus:outline-none focus:ring-4 focus:ring-blue-500/30 rounded-full my-4"
            role="button"
            tabIndex={0}
            aria-label="Click to import your file"
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                handleImportAreaClick();
              }
            }}
          >
            {/* Ping Rings Ripple Animations with Blue and Orange Harmony */}
            <div className="absolute inset-0 rounded-full border-2 border-blue-500/40 animate-ripple-1 pointer-events-none" />
            <div className="absolute inset-0 rounded-full border border-orange-500/35 animate-ripple-2 pointer-events-none" />
            <div className="absolute inset-0 rounded-full border border-blue-600/25 animate-ripple-3 pointer-events-none" />

            {/* Subtle Blue & Orange Glow Halo */}
            <div
              className={`absolute inset-4 rounded-full bg-gradient-to-tr from-[#0055ff]/20 via-[#ff6600]/15 to-[#00d4ff]/20 blur-xl transition-opacity duration-500 ${isHovered ? 'opacity-100 scale-105' : 'opacity-70'
                }`}
            />

            {/* Inner Interactive Sphere */}
            <div
              className="relative z-10 w-56 h-56 xs:w-64 xs:h-64 sm:w-80 sm:h-80 md:w-[380px] md:h-[380px] lg:w-[420px] lg:h-[420px] max-w-[calc(100vw-2.5rem)] max-h-[calc(100vw-2.5rem)] rounded-full bg-white/95 backdrop-blur-xl border-2 border-blue-200/90 shadow-[0_20px_50px_rgba(0,85,255,0.18)] flex flex-col items-center justify-center p-4 sm:p-6 transition-all duration-300 group-hover:border-[#ff6600] group-hover:shadow-[0_25px_60px_rgba(255,102,0,0.22)]"
            >
              {/* Background Concentric Subtle Graphic */}
              <div className="absolute inset-3 sm:inset-6 rounded-full border border-dashed border-blue-200/90 pointer-events-none" />
              <div className="absolute inset-8 sm:inset-14 rounded-full border border-orange-100 pointer-events-none" />

              {/* Cloud Icon with Floating Hover Animation & Blue-to-Orange Gradient */}
              <div className="relative mb-2 sm:mb-4">
                <div className="w-14 h-14 xs:w-16 xs:h-16 sm:w-22 sm:h-22 md:w-26 md:h-26 rounded-2xl sm:rounded-3xl bg-gradient-to-tr from-[#0044cc] via-[#0066fe] to-[#ff6600] text-white flex items-center justify-center shadow-lg shadow-blue-600/30 group-hover:scale-105 group-hover:shadow-orange-500/30 transition-all duration-300">
                  <CloudUpload className="w-7 h-7 xs:w-8 xs:h-8 sm:w-12 sm:h-12 md:w-14 md:h-14 stroke-[1.75] text-white" />
                </div>
                <div className="absolute -top-1 -right-1 w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-[#ff5500] text-white flex items-center justify-center shadow-sm border-2 border-white">
                  <Sparkles className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-amber-200" />
                </div>
              </div>

              {/* Text Header */}
              <h2 className="text-lg xs:text-xl sm:text-2xl md:text-3xl font-extrabold text-[#04193d] tracking-tight group-hover:text-[#0055ff] transition-colors">
                Import Your File
              </h2>

              <p className="text-[11px] xs:text-xs sm:text-sm text-slate-500 max-w-[170px] xs:max-w-[200px] sm:max-w-[240px] mt-0.5 sm:mt-1 mb-3 sm:mb-5">
                Click anywhere inside this area to browse & upload
              </p>

              {/* Royal Blue + Vibrant Orange Accent Import File Button */}
              <button
                id="import-file-main-btn"
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleImportAreaClick();
                }}
                className="inline-flex items-center justify-center space-x-2 px-5 xs:px-6 sm:px-8 py-2 xs:py-2.5 sm:py-3 rounded-full bg-gradient-to-r from-[#0055ff] via-[#0066fe] to-[#ff6600] hover:from-[#0044cc] hover:to-[#ff5500] text-white font-bold text-xs sm:text-sm tracking-wide shadow-lg shadow-blue-600/25 group-hover:shadow-orange-500/30 transition-all transform group-hover:-translate-y-0.5 cursor-pointer outline-none"
              >
                <span>Import File</span>
              </button>
            </div>
          </div>

          {/* Quick Notice Tag */}
          <div className="flex items-center space-x-2 text-xs text-slate-500 font-medium mt-3 bg-white/80 backdrop-blur-xs px-3.5 py-1.5 rounded-full border border-slate-200/70 shadow-xs">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Supported: PDF, Word, Excel, Images, Text documents</span>
          </div>
          {importError && <p className="mt-3 text-center text-xs font-semibold text-red-600" role="alert">{importError}</p>}
        </div>
      ) : selectedFile ? (
        /* File Selected State */
        <div className="w-full flex justify-center py-6">
          <FilePreview
            file={selectedFile}
            onClear={handleClear}
            onConfirmImport={handleConfirmImport}
            onChangeFile={triggerNativeFilePicker}
            isProcessing={isProcessing}
          />
          {importError && <p className="mt-3 text-center text-xs font-semibold text-red-600" role="alert">{importError}</p>}
        </div>
      ) : importSuccess ? (
        /* Import Successful State */
        <div
          id="import-success-card"
          className="w-full max-w-md bg-white rounded-2xl p-6 sm:p-7 shadow-2xl border border-emerald-200 text-center animate-in zoom-in-95 duration-200"
        >
          <div className="w-14 h-14 rounded-2xl bg-emerald-50 text-emerald-600 border border-emerald-200 flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-8 h-8" />
          </div>

          <h3 className="text-xl font-bold text-[#0b1b3d] mb-1">
            File Imported Successfully!
          </h3>

          <p className="text-xs text-slate-600 mb-4">
            <strong className="text-slate-800 font-semibold">{importSuccess.name}</strong> is now registered with ACS Customer Service Centre.
          </p>

          <div className="bg-slate-50 rounded-xl p-3.5 text-xs text-slate-600 space-y-1 text-left border border-slate-200/80 mb-5">
            <div className="flex justify-between">
              <span className="text-slate-500">Document ID:</span>
              <span className="font-mono font-semibold text-slate-800">{importSuccess.id}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Imported By:</span>
              <span className="font-semibold text-slate-800">{importSuccess.importedBy}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Status:</span>
              <span className="font-bold text-emerald-600 uppercase text-[10px]">Ready for Processing</span>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-2.5">
            <Link
              to="/user-dashboard"
              className="flex-1 flex items-center justify-center space-x-2 py-3 px-4 rounded-xl bg-[#0052cc] hover:bg-[#0040b3] text-white font-semibold text-xs shadow-md shadow-blue-500/20 transition-colors"
            >
              <span>View in Dashboard</span>
              <ArrowRight className="w-4 h-4" />
            </Link>

            <button
              onClick={handleClear}
              className="px-4 py-3 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 font-medium text-xs transition-colors cursor-pointer"
            >
              Import Another File
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
};
