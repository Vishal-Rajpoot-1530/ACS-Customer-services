import React from 'react';
import { 
  X, 
  FileText, 
  FileSpreadsheet, 
  Image as ImageIcon, 
  FileCode, 
  File as FileGeneric, 
  Calendar, 
  HardDrive, 
  User, 
  Mail, 
  Tag, 
  CheckCircle2, 
  Clock, 
  Trash2, 
  Edit3,
  Check
} from 'lucide-react';
import { ImportedDocument } from '../types';

interface DocumentDetailModalProps {
  document: ImportedDocument | null;
  isOpen: boolean;
  onClose: () => void;
  onDelete?: (id: string) => void;
  onEdit?: (doc: ImportedDocument) => void;
  onStatusChange?: (id: string, newStatus: 'ready' | 'processing' | 'completed') => void;
  isAdmin?: boolean;
}

export const DocumentDetailModal: React.FC<DocumentDetailModalProps> = ({
  document: docItem,
  isOpen,
  onClose,
  onDelete,
  onEdit,
  onStatusChange,
  isAdmin = false,
}) => {
  if (!isOpen || !docItem) return null;

  // Format file size
  const formatFileSize = (bytes: number): string => {
    if (!bytes || bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  // Determine file type representation
  const getFileTypeDetails = (type: string, name: string) => {
    const ext = name.split('.').pop()?.toUpperCase() || 'FILE';
    if (type?.includes('pdf') || ext === 'PDF') {
      return { icon: FileText, label: 'PDF Document', color: 'text-red-600 bg-red-50 border-red-200' };
    }
    if (type?.includes('word') || type?.includes('document') || ext === 'DOC' || ext === 'DOCX') {
      return { icon: FileText, label: 'Word Document', color: 'text-blue-600 bg-blue-50 border-blue-200' };
    }
    if (type?.includes('sheet') || type?.includes('excel') || ext === 'XLS' || ext === 'XLSX' || ext === 'CSV') {
      return { icon: FileSpreadsheet, label: 'Spreadsheet File', color: 'text-emerald-600 bg-emerald-50 border-emerald-200' };
    }
    if (type?.startsWith('image/') || ['PNG', 'JPG', 'JPEG', 'WEBP', 'SVG'].includes(ext)) {
      return { icon: ImageIcon, label: 'Image File', color: 'text-purple-600 bg-purple-50 border-purple-200' };
    }
    if (ext === 'TXT' || ext === 'JSON' || ext === 'XML') {
      return { icon: FileCode, label: 'Text / Code File', color: 'text-slate-600 bg-slate-100 border-slate-200' };
    }
    return { icon: FileGeneric, label: `${ext} Document`, color: 'text-[#0055ff] bg-blue-50 border-blue-200' };
  };

  const typeInfo = getFileTypeDetails(docItem.type, docItem.name);
  const IconComponent = typeInfo.icon;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        id="document-detail-modal"
        className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-slate-200/80 overflow-hidden animate-in zoom-in-95 duration-200 text-left"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Top Header */}
        <div className="flex items-center justify-between p-5 sm:p-6 border-b border-slate-100 bg-gradient-to-r from-blue-50/50 to-orange-50/30">
          <div className="flex items-center space-x-3 min-w-0 pr-4">
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 border ${typeInfo.color}`}>
              <IconComponent className="w-6 h-6" />
            </div>
            <div className="min-w-0">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#0055ff] block">
                Document Details
              </span>
              <h3 className="text-base sm:text-lg font-extrabold text-[#04193d] truncate" title={docItem.name}>
                {docItem.name}
              </h3>
            </div>
          </div>

          <button
            id="close-doc-modal-btn"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-700 rounded-full hover:bg-white/80 transition-colors cursor-pointer shrink-0"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body Info */}
        <div className="p-5 sm:p-6 space-y-4 max-h-[70vh] overflow-y-auto">
          {/* Status and Category Ribbon */}
          <div className="flex flex-wrap items-center justify-between gap-2 p-3 bg-slate-50 rounded-2xl border border-slate-100">
            <div className="flex items-center space-x-2">
              <span className="text-xs font-semibold text-slate-500">Status:</span>
              <span
                className={`inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-xs font-bold uppercase ${
                  docItem.status === 'completed'
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    : docItem.status === 'processing'
                    ? 'bg-amber-50 text-amber-700 border border-amber-200'
                    : 'bg-blue-50 text-blue-700 border border-blue-200'
                }`}
              >
                {docItem.status === 'completed' ? (
                  <CheckCircle2 className="w-3.5 h-3.5" />
                ) : (
                  <Clock className="w-3.5 h-3.5" />
                )}
                <span>
                  {docItem.status === 'completed'
                    ? 'Completed'
                    : docItem.status === 'processing'
                    ? 'Processing'
                    : 'Ready for Service'}
                </span>
              </span>
            </div>

            <div className="flex items-center space-x-1.5 text-xs text-slate-600">
              <Tag className="w-3.5 h-3.5 text-[#ff6600]" />
              <span className="font-semibold">{docItem.category || 'Print Job'}</span>
            </div>
          </div>

          {/* Key Details Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div className="p-3 bg-white rounded-xl border border-slate-200/70 space-y-1">
              <div className="flex items-center space-x-1.5 text-slate-400 font-medium">
                <HardDrive className="w-3.5 h-3.5 text-[#0055ff]" />
                <span>File Size</span>
              </div>
              <p className="text-slate-900 font-bold text-sm">
                {formatFileSize(docItem.size)}
              </p>
            </div>

            <div className="p-3 bg-white rounded-xl border border-slate-200/70 space-y-1">
              <div className="flex items-center space-x-1.5 text-slate-400 font-medium">
                <Calendar className="w-3.5 h-3.5 text-[#ff6600]" />
                <span>Import Time</span>
              </div>
              <p className="text-slate-900 font-bold text-sm">
                {docItem.importedAt || 'Recently Imported'}
              </p>
            </div>

            <div className="p-3 bg-white rounded-xl border border-slate-200/70 space-y-1">
              <div className="flex items-center space-x-1.5 text-slate-400 font-medium">
                <User className="w-3.5 h-3.5 text-blue-500" />
                <span>Uploaded By</span>
              </div>
              <p className="text-slate-900 font-bold text-sm truncate">
                {docItem.importedBy || 'ACS Member'}
              </p>
            </div>

            <div className="p-3 bg-white rounded-xl border border-slate-200/70 space-y-1">
              <div className="flex items-center space-x-1.5 text-slate-400 font-medium">
                <Mail className="w-3.5 h-3.5 text-purple-500" />
                <span>User Email</span>
              </div>
              <p className="text-slate-900 font-bold text-sm truncate" title={docItem.userEmail}>
                {docItem.userEmail || 'N/A'}
              </p>
            </div>
          </div>

          {/* Document ID & Notes */}
          <div className="p-3.5 bg-slate-50/80 rounded-2xl border border-slate-200/70 space-y-2 text-xs">
            <div className="flex justify-between items-center">
              <span className="text-slate-500 font-semibold">Document Reference ID:</span>
              <code className="bg-white px-2 py-0.5 rounded font-mono text-[11px] text-slate-700 border border-slate-200">
                {docItem.id}
              </code>
            </div>

            {docItem.notes && (
              <div className="pt-2 border-t border-slate-200/60">
                <span className="text-slate-500 font-semibold block mb-1">Admin Notes:</span>
                <p className="text-slate-700 bg-white p-2.5 rounded-xl border border-slate-200 text-xs">
                  {docItem.notes}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Modal Bottom Actions */}
        <div className="p-4 sm:p-5 bg-slate-50 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center space-x-2">
            {onDelete && (
              <button
                id="modal-delete-doc-btn"
                type="button"
                onClick={() => {
                  onDelete(docItem.id);
                  onClose();
                }}
                className="inline-flex items-center space-x-1.5 px-3.5 py-2 rounded-xl text-red-600 hover:bg-red-50 text-xs font-semibold border border-red-200 transition-colors cursor-pointer"
              >
                <Trash2 className="w-4 h-4" />
                <span>Delete File</span>
              </button>
            )}

            {isAdmin && onEdit && (
              <button
                id="modal-edit-doc-btn"
                type="button"
                onClick={() => {
                  onEdit(docItem);
                }}
                className="inline-flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-blue-50 text-[#0055ff] hover:bg-blue-100 text-xs font-semibold border border-blue-200 transition-colors cursor-pointer"
              >
                <Edit3 className="w-4 h-4" />
                <span>Edit Document</span>
              </button>
            )}
          </div>

          <div className="flex items-center space-x-2">
            {isAdmin && onStatusChange && docItem.status !== 'completed' && (
              <button
                id="modal-mark-complete-btn"
                type="button"
                onClick={() => {
                  onStatusChange(docItem.id, 'completed');
                  onClose();
                }}
                className="inline-flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-sm transition-colors cursor-pointer"
              >
                <Check className="w-4 h-4" />
                <span>Mark Complete</span>
              </button>
            )}

            <button
              id="modal-close-btn"
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 text-xs font-semibold transition-colors cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
