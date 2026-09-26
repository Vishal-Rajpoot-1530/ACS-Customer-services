import React, { useState, useEffect } from 'react';
import { X, Save, Edit3, Tag, FileText, Loader2, AlignLeft } from 'lucide-react';
import { ImportedDocument } from '../types';

interface UserEditDocModalProps {
  document: ImportedDocument | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (updatedDoc: ImportedDocument) => Promise<void>;
}

export const UserEditDocModal: React.FC<UserEditDocModalProps> = ({
  document: docItem,
  isOpen,
  onClose,
  onSave,
}) => {
  const [name, setName] = useState('');
  const [category, setCategory] = useState<'Print Job' | 'Document Scan' | 'Form Submission' | 'General'>('Print Job');
  const [notes, setNotes] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (docItem) {
      setName(docItem.name || '');
      setCategory((docItem.category as any) || 'Print Job');
      setNotes(docItem.notes || '');
    }
  }, [docItem]);

  if (!isOpen || !docItem) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setIsSaving(true);
    try {
      await onSave({
        ...docItem,
        name: name.trim(),
        category,
        notes: notes.trim(),
      });
      onClose();
    } catch (err) {
      console.error('Failed to update document:', err);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        id="user-edit-doc-modal"
        className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-slate-200/80 overflow-hidden animate-in zoom-in-95 duration-200 text-left"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-100 bg-gradient-to-r from-blue-50/70 via-indigo-50/30 to-orange-50/40">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-sm">
              <Edit3 className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#0055ff] block">
                Document Details
              </span>
              <h3 className="text-base font-extrabold text-[#04193d]">
                Edit Document
              </h3>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-700 rounded-full hover:bg-white/80 transition-colors cursor-pointer"
            aria-label="Close edit modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Edit Form */}
        <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-4">
          {/* File Name Field */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Document / File Name <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 text-slate-900 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-[#0055ff] focus:bg-white transition-all"
                placeholder="e.g. MyDocument.pdf"
              />
              <FileText className="w-4 h-4 text-slate-400 absolute right-3.5 top-3" />
            </div>
          </div>

          {/* Category Selection */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Service Category
            </label>
            <div className="grid grid-cols-2 gap-2">
              {(['Print Job', 'Document Scan', 'Form Submission', 'General'] as const).map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setCategory(cat)}
                  className={`p-2.5 rounded-xl border text-xs font-semibold flex items-center justify-between transition-all cursor-pointer ${
                    category === cat
                      ? 'bg-blue-50 border-blue-500 text-[#0055ff] shadow-xs'
                      : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <span>{cat}</span>
                  {category === cat && <Tag className="w-3.5 h-3.5 text-[#ff6600]" />}
                </button>
              ))}
            </div>
          </div>

          {/* Instructions / Notes */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center justify-between">
              <span>Customer Instructions / Notes</span>
              <span className="text-[10px] text-slate-400 font-normal">Optional</span>
            </label>
            <div className="relative">
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 text-slate-900 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[#0055ff] focus:bg-white transition-all resize-none"
                placeholder="Add special instructions, e.g. 'Print 2 double-sided color copies on heavy cardstock'..."
              />
              <AlignLeft className="w-4 h-4 text-slate-400 absolute right-3.5 bottom-3" />
            </div>
          </div>

          {/* Modal Footer Buttons */}
          <div className="pt-3 border-t border-slate-100 flex items-center justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-semibold transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving || !name.trim()}
              className="inline-flex items-center space-x-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#0055ff] to-[#0044cc] hover:from-[#0044cc] hover:to-[#0033aa] text-white text-xs font-bold shadow-md shadow-blue-600/25 transition-all transform active:scale-95 cursor-pointer disabled:opacity-50"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>Save Changes</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
