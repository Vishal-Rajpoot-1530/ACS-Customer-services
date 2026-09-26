import React from 'react';
import { CheckCircle2, FileText, FileCode, FileSpreadsheet, Image, Video, Trash2, ArrowRight, RefreshCw } from 'lucide-react';
import { SelectedFile } from '../types';

interface FilePreviewProps {
  file: SelectedFile | null;
  onClear: () => void;
  onConfirmImport: () => void;
  onChangeFile: () => void;
  isProcessing?: boolean;
}

export const FilePreview: React.FC<FilePreviewProps> = ({
  file,
  onClear,
  onConfirmImport,
  onChangeFile,
  isProcessing = false
}) => {
  if (!file) return null;

  // Determine file icon and label
  const getFileTypeInfo = (type: string, name: string) => {
    const ext = name.split('.').pop()?.toUpperCase() || 'FILE';
    if (type.includes('pdf') || ext === 'PDF') {
      return { icon: FileText, label: 'PDF Document', color: 'text-red-600 bg-red-50' };
    }
    if (type.includes('word') || type.includes('document') || ext === 'DOC' || ext === 'DOCX') {
      return { icon: FileText, label: 'Word Document', color: 'text-blue-600 bg-blue-50' };
    }
    if (type.includes('sheet') || type.includes('excel') || ext === 'XLS' || ext === 'XLSX' || ext === 'CSV') {
      return { icon: FileSpreadsheet, label: 'Spreadsheet', color: 'text-emerald-600 bg-emerald-50' };
    }
    if (type.startsWith('image/') || ['PNG', 'JPG', 'JPEG', 'WEBP', 'SVG'].includes(ext)) {
      return { icon: Image, label: 'Image File', color: 'text-purple-600 bg-purple-50' };
    }
    if (type.startsWith('video/') || ['MP4', 'MKV', 'AVI', 'MOV', 'WEBM', '3GP', 'WMV', 'FLV'].includes(ext)) {
      return { icon: Video, label: 'Video File', color: 'text-amber-600 bg-amber-50' };
    }
    if (ext === 'TXT' || ext === 'JSON' || ext === 'XML') {
      return { icon: FileCode, label: 'Text / Code File', color: 'text-slate-600 bg-slate-100' };
    }
    return { icon: FileText, label: `${ext} File`, color: 'text-[#0052cc] bg-blue-50' };
  };

  const typeInfo = getFileTypeInfo(file.type, file.name);
  const IconComponent = typeInfo.icon;

  return (
    <div
      id="file-selected-status-card"
      className="w-full max-w-md mx-auto bg-white rounded-2xl p-5 sm:p-6 shadow-xl border border-blue-200/80 animate-in zoom-in-95 duration-200"
    >
      {/* Header Status */}
      <div className="flex items-center justify-between pb-3.5 border-b border-slate-100 mb-4">
        <div className="flex items-center space-x-2">
          <CheckCircle2 className="w-5 h-5 text-emerald-500" />
          <span className="font-bold text-sm text-[#0b1b3d]">
            File Selected
          </span>
        </div>
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/60">
          Ready for Import
        </span>
      </div>

      {/* File Details Display */}
      <div className="flex items-start space-x-4 bg-slate-50/80 p-3.5 rounded-xl border border-slate-200/70 mb-5">
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${typeInfo.color}`}>
          <IconComponent className="w-6 h-6" />
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="font-bold text-sm text-slate-900 truncate" title={file.name}>
            {file.name}
          </h4>
          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
            <span>
              <strong className="font-semibold text-slate-700">Type:</strong> {typeInfo.label}
            </span>
            <span>•</span>
            <span>
              <strong className="font-semibold text-slate-700">Size:</strong> {file.formattedSize}
            </span>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row gap-2.5">
        <button
          id="confirm-import-btn"
          onClick={onConfirmImport}
          disabled={isProcessing}
          className="flex-1 flex items-center justify-center space-x-2 py-3 px-4 rounded-xl bg-[#0052cc] hover:bg-[#0040b3] active:bg-[#003399] text-white font-semibold text-sm shadow-md shadow-blue-500/20 transition-all cursor-pointer disabled:opacity-60"
        >
          {isProcessing ? (
            <>
              <RefreshCw className="w-4 h-4 animate-spin" />
              <span>Importing File...</span>
            </>
          ) : (
            <>
              <span>Import File</span>
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>

        <div className="flex items-center space-x-2">
          <button
            id="change-selected-file-btn"
            onClick={onChangeFile}
            disabled={isProcessing}
            title="Change File"
            className="px-3.5 py-3 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 font-medium text-xs flex items-center justify-center space-x-1.5 transition-colors cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5 text-slate-500" />
            <span>Change</span>
          </button>

          <button
            id="clear-selected-file-btn"
            onClick={onClear}
            disabled={isProcessing}
            title="Remove File"
            className="p-3 rounded-xl border border-slate-200 text-slate-400 hover:text-red-600 hover:bg-red-50 hover:border-red-200 transition-colors cursor-pointer"
            aria-label="Remove File"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
