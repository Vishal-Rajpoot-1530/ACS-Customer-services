import React, { useState, useEffect } from 'react';
import {
  X,
  Check,
  Download,
  Printer,
  FileText,
  FileSpreadsheet,
  Image as ImageIcon,
  FileCode,
  File as FileGeneric,
  ZoomIn,
  ZoomOut,
  RotateCw,
  Trash2,
  ShieldCheck,
  QrCode,
  RefreshCw,
  ArrowLeft,
  Settings2,
  Sliders,
  Sparkles,
  Layers,
  Copy,
  FileType,
  Video,
  Film,
  Headphones,
  Music,
  ExternalLink,
  Loader2,
  Eye
} from 'lucide-react';
import { ImportedDocument } from '../types';
import { RealVideoPlayer } from './RealVideoPlayer';
import { RealAudioPlayer } from './RealAudioPlayer';
import { getMediaBlobUrl } from '../utils/mediaStorage';
import { documentApi } from '../api/document.api';

interface RealDocumentViewerModalProps {
  document: ImportedDocument | null;
  isOpen: boolean;
  onClose: () => void;
  onStatusChange?: (id: string, newStatus: 'ready' | 'processing' | 'completed') => void;
  onDelete?: (id: string) => void;
  isAdmin?: boolean;
}

export const RealDocumentViewerModal: React.FC<RealDocumentViewerModalProps> = ({
  document: docItem,
  isOpen,
  onClose,
  onStatusChange,
  onDelete,
  isAdmin = true,
}) => {
  const [zoomLevel, setZoomLevel] = useState<number>(100);
  const [rotation, setRotation] = useState<number>(0);
  const [decodedText, setDecodedText] = useState<string>('');
  const [videoPlaybackUrl, setVideoPlaybackUrl] = useState<string>('');
  const [audioPlaybackUrl, setAudioPlaybackUrl] = useState<string>('');
  const [docContentUrl, setDocContentUrl] = useState<string>('');
  const [isLoadingContent, setIsLoadingContent] = useState<boolean>(true);
  const [viewerTab, setViewerTab] = useState<'document' | 'details'>('document');

  // Print Preview Dialog State
  const [showPrintPreview, setShowPrintPreview] = useState<boolean>(false);
  const [printCopies, setPrintCopies] = useState<number>(1);
  const [printOrientation, setPrintOrientation] = useState<'portrait' | 'landscape'>('portrait');
  const [printColorMode, setPrintColorMode] = useState<'color' | 'grayscale'>('color');
  const [printPaperSize, setPrintPaperSize] = useState<'A4' | 'Letter' | 'Legal'>('A4');
  const [includeOfficialHeader, setIncludeOfficialHeader] = useState<boolean>(true);
  const [previewZoom, setPreviewZoom] = useState<number>(100);

  // Reset zoom & states whenever a new document opens
  useEffect(() => {
    if (isOpen) {
      setZoomLevel(100);
      setRotation(0);
      setShowPrintPreview(false);
      setPrintCopies(1);
      setPrintOrientation('portrait');
      setPrintColorMode('color');
      setPrintPaperSize('A4');
      setIncludeOfficialHeader(true);
      setPreviewZoom(100);
      setViewerTab('document');
    }
  }, [isOpen, docItem?.id]);

  // Keyboard navigation & body scroll lock
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (showPrintPreview) {
          setShowPrintPreview(false);
        } else {
          onClose();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, showPrintPreview, onClose]);

  // Resolve the actual document file URL (from fileDataUrl, IndexedDB, or Backend)
  useEffect(() => {
    let active = true;
    if (!isOpen || !docItem) {
      setDocContentUrl('');
      setIsLoadingContent(false);
      return;
    }

    setIsLoadingContent(true);

    const resolveUrl = async () => {
      // 1. Direct fileDataUrl (if present and valid)
      if (docItem.fileDataUrl && docItem.fileDataUrl.length > 20) {
        if (active) {
          setDocContentUrl(docItem.fileDataUrl);
          setIsLoadingContent(false);
        }
        return;
      }

      // 2. Check IndexedDB / media storage
      try {
        const localBlobUrl = await getMediaBlobUrl(docItem.id, docItem.fileDataUrl);
        if (active && localBlobUrl) {
          setDocContentUrl(localBlobUrl);
          setIsLoadingContent(false);
          return;
        }
      } catch (err) {
        console.warn('Local blob lookup error:', err);
      }

      // 3. Backend Download/Presigned URL
      if (docItem.id && !docItem.id.startsWith('local-')) {
        try {
          const downloadRes = await documentApi.getDownloadUrl(docItem.id);
          if (active && (downloadRes.downloadUrl || downloadRes.url)) {
            let url = downloadRes.downloadUrl || downloadRes.url;
            if (url.startsWith('/')) {
              url = window.location.origin + url;
            }
            setDocContentUrl(url);
            setIsLoadingContent(false);
            return;
          }
        } catch (err: any) {
          console.warn('Backend download URL fetch notice:', err);
        }
      }

      if (active) {
        setIsLoadingContent(false);
      }
    };

    resolveUrl();

    return () => {
      active = false;
    };
  }, [isOpen, docItem?.id, docItem?.fileDataUrl]);

  // Decode text if text file (using docContentUrl or fileDataUrl)
  useEffect(() => {
    let active = true;
    const urlToRead = docContentUrl || docItem?.fileDataUrl;
    if (!urlToRead || !docItem) {
      setDecodedText('');
      return;
    }

    const ext = docItem.name.split('.').pop()?.toUpperCase() || '';
    const isTextFile = docItem.type?.includes('text') || ['TXT', 'JSON', 'CSV', 'XML', 'LOG', 'MD', 'HTML'].includes(ext);

    if (!isTextFile) {
      setDecodedText('');
      return;
    }

    if (urlToRead.startsWith('data:')) {
      try {
        const base64Index = urlToRead.indexOf('base64,');
        if (base64Index !== -1) {
          const base64Str = urlToRead.substring(base64Index + 7);
          const text = atob(base64Str);
          if (active) setDecodedText(text);
        } else {
          if (active) setDecodedText(decodeURIComponent(urlToRead.split(',')[1] || ''));
        }
      } catch (err) {
        console.warn('Text decode notice:', err);
      }
    } else {
      fetch(urlToRead)
        .then((res) => res.text())
        .then((text) => {
          if (active) setDecodedText(text);
        })
        .catch((err) => {
          console.warn('Failed to fetch text content:', err);
        });
    }

    return () => {
      active = false;
    };
  }, [docItem, docContentUrl]);

  // Load video playback URL from mediaStorage or fileDataUrl or docContentUrl
  useEffect(() => {
    let active = true;
    const extName = (docItem?.name?.split('.').pop() || '').toUpperCase();
    const isVideoDoc = docItem?.type?.startsWith('video/') || ['MP4', 'MKV', 'AVI', 'MOV', 'WEBM', '3GP', 'WMV', 'FLV', 'M4V', 'OGV'].includes(extName);

    if (isOpen && docItem && isVideoDoc) {
      if (docContentUrl) {
        setVideoPlaybackUrl(docContentUrl);
      } else if (docItem.fileDataUrl && docItem.fileDataUrl.startsWith('data:video/')) {
        setVideoPlaybackUrl(docItem.fileDataUrl);
      } else {
        getMediaBlobUrl(docItem.id, docItem.fileDataUrl).then((url) => {
          if (active && url) {
            setVideoPlaybackUrl(url);
          }
        });
      }
    } else {
      setVideoPlaybackUrl('');
    }

    return () => {
      active = false;
    };
  }, [isOpen, docItem?.id, docItem?.fileDataUrl, docContentUrl]);

  // Load audio playback URL from mediaStorage or fileDataUrl or docContentUrl
  useEffect(() => {
    let active = true;
    const extName = (docItem?.name?.split('.').pop() || '').toUpperCase();
    const isAudioDoc = docItem?.type?.startsWith('audio/') || ['MP3', 'WAV', 'OGG', 'M4A', 'AAC', 'FLAC', 'OPUS', 'WEBA', 'WMA', 'AIFF'].includes(extName);

    if (isOpen && docItem && isAudioDoc) {
      if (docContentUrl) {
        setAudioPlaybackUrl(docContentUrl);
      } else if (docItem.fileDataUrl && docItem.fileDataUrl.startsWith('data:audio/')) {
        setAudioPlaybackUrl(docItem.fileDataUrl);
      } else {
        getMediaBlobUrl(docItem.id, docItem.fileDataUrl).then((url) => {
          if (active && url) {
            setAudioPlaybackUrl(url);
          }
        });
      }
    } else {
      setAudioPlaybackUrl('');
    }

    return () => {
      active = false;
    };
  }, [isOpen, docItem?.id, docItem?.fileDataUrl, docContentUrl]);

  if (!isOpen || !docItem) return null;

  // Format file size
  const formatFileSize = (bytes: number): string => {
    if (!bytes || bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  // Determine file type category & colors
  const getFileTypeInfo = (type: string, name: string) => {
    const ext = name.split('.').pop()?.toUpperCase() || 'FILE';
    if (type?.includes('pdf') || ext === 'PDF') {
      return {
        icon: FileText,
        label: 'PDF Document',
        badge: 'PDF',
        accentColor: 'text-red-600 bg-red-50 border-red-200',
        bannerGrad: 'from-red-600 to-rose-700'
      };
    }
    if (type?.includes('word') || type?.includes('document') || ext === 'DOC' || ext === 'DOCX') {
      return {
        icon: FileText,
        label: 'Word Document',
        badge: 'DOCX',
        accentColor: 'text-blue-600 bg-blue-50 border-blue-200',
        bannerGrad: 'from-blue-600 to-indigo-700'
      };
    }
    if (type?.includes('sheet') || type?.includes('excel') || ext === 'XLS' || ext === 'XLSX' || ext === 'CSV') {
      return {
        icon: FileSpreadsheet,
        label: 'Spreadsheet',
        badge: 'XLSX',
        accentColor: 'text-emerald-600 bg-emerald-50 border-emerald-200',
        bannerGrad: 'from-emerald-600 to-teal-700'
      };
    }
    if (type?.startsWith('image/') || ['PNG', 'JPG', 'JPEG', 'WEBP', 'SVG', 'GIF'].includes(ext)) {
      return {
        icon: ImageIcon,
        label: 'Image Document',
        badge: ext,
        accentColor: 'text-purple-600 bg-purple-50 border-purple-200',
        bannerGrad: 'from-purple-600 to-fuchsia-700'
      };
    }
    if (type?.startsWith('video/') || ['MP4', 'MKV', 'AVI', 'MOV', 'WEBM', '3GP', 'WMV', 'FLV', 'M4V', 'OGV'].includes(ext)) {
      return {
        icon: Video,
        label: 'Video Media',
        badge: ext || 'VIDEO',
        accentColor: 'text-amber-600 bg-amber-50 border-amber-200',
        bannerGrad: 'from-amber-600 to-orange-700'
      };
    }
    if (type?.startsWith('audio/') || ['MP3', 'WAV', 'OGG', 'M4A', 'AAC', 'FLAC', 'OPUS', 'WEBA', 'WMA', 'AIFF'].includes(ext)) {
      return {
        icon: Headphones,
        label: 'Audio Media',
        badge: ext || 'AUDIO',
        accentColor: 'text-violet-600 bg-violet-50 border-violet-200',
        bannerGrad: 'from-violet-600 to-indigo-700'
      };
    }
    if (['TXT', 'JSON', 'XML', 'CSV', 'LOG', 'MD', 'HTML'].includes(ext) || type?.includes('text')) {
      return {
        icon: FileCode,
        label: 'Text Document',
        badge: ext,
        accentColor: 'text-slate-600 bg-slate-100 border-slate-200',
        bannerGrad: 'from-slate-700 to-slate-900'
      };
    }
    return {
      icon: FileGeneric,
      label: `${ext} File`,
      badge: ext,
      accentColor: 'text-[#0055ff] bg-blue-50 border-blue-200',
      bannerGrad: 'from-[#0055ff] to-[#ff6600]'
    };
  };

  const typeInfo = getFileTypeInfo(docItem.type, docItem.name);
  const IconComp = typeInfo.icon;
  const ext = docItem.name.split('.').pop()?.toUpperCase() || '';
  const isImage = docItem.type?.toLowerCase().startsWith('image/') || ['PNG', 'JPG', 'JPEG', 'WEBP', 'SVG', 'GIF', 'BMP', 'ICO', 'TIFF'].includes(ext);
  const isPdf = docItem.type?.includes('pdf') || ext === 'PDF';
  const isText = ['TXT', 'JSON', 'XML', 'CSV', 'LOG', 'MD', 'HTML'].includes(ext) || docItem.type?.includes('text');
  const isVideo = docItem.type?.toLowerCase().startsWith('video/') || ['MP4', 'MKV', 'AVI', 'MOV', 'WEBM', '3GP', 'WMV', 'FLV', 'M4V', 'OGV'].includes(ext);
  const isAudio = docItem.type?.startsWith('audio/') || ['MP3', 'WAV', 'OGG', 'M4A', 'AAC', 'FLAC', 'OPUS', 'WEBA', 'WMA', 'AIFF'].includes(ext);

  // Trigger Actual Browser Printing using selected Print Preview settings
  const handleExecutePrint = () => {
    try {
      const printIframe = document.createElement('iframe');
      printIframe.style.position = 'fixed';
      printIframe.style.right = '0';
      printIframe.style.bottom = '0';
      printIframe.style.width = '0';
      printIframe.style.height = '0';
      printIframe.style.border = '0';
      printIframe.title = 'PrintDocument';
      document.body.appendChild(printIframe);

      const frameDoc = printIframe.contentWindow?.document || printIframe.contentDocument;
      if (!frameDoc) {
        window.print();
        return;
      }

      const isImageDoc = docItem.type?.startsWith('image/') || ['PNG', 'JPG', 'JPEG', 'WEBP', 'SVG', 'GIF'].includes(docItem.name.split('.').pop()?.toUpperCase() || '');
      const imageHtml = isImageDoc && docItem.fileDataUrl ? `
        <div style="text-align: center; margin: 20px 0;">
          <img src="${docItem.fileDataUrl}" style="max-width: 100%; max-height: ${printOrientation === 'landscape' ? '450px' : '750px'}; object-fit: contain; border: 1px solid #cbd5e1; border-radius: 8px;" alt="${docItem.name}" />
        </div>
      ` : '';

      const textHtml = decodedText ? `
        <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin: 20px 0; font-family: monospace; white-space: pre-wrap; font-size: 12px; line-height: 1.6;">
          ${decodedText.replace(/</g, '&lt;').replace(/>/g, '&gt;')}
        </div>
      ` : '';

      const officialHeaderHtml = includeOfficialHeader ? `
        <div class="header">
          <div class="brand">
            <div class="logo">ACS</div>
            <div>
              <p class="org-sub" style="color: #ff6600; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px;">Official Customer Service Document</p>
              <h1 class="org-title">ACS CUSTOMER SERVICE CENTRE</h1>
              <p class="org-sub">Digital Document Processing & Print Management</p>
            </div>
          </div>
          <div style="text-align: right;">
            <span class="seal">${docItem.status === 'completed' ? '✓ APPROVED & PROCESSED' : '✓ VERIFIED FOR PROCESSING'}</span>
          </div>
        </div>

        <div class="meta-bar">
          <div><strong>Doc Reference ID:</strong> <span style="font-family: monospace; color: #0055ff;">${docItem.id}</span></div>
          <div><strong>Import Date:</strong> ${docItem.importedAt || new Date().toLocaleString()}</div>
          <div><strong>Status:</strong> ${docItem.status === 'completed' ? 'COMPLETED' : 'READY / PENDING'}</div>
        </div>

        <div class="info-grid">
          <div class="info-box">
            <div class="info-label">File Name</div>
            <div class="info-val">${docItem.name}</div>
          </div>
          <div class="info-box">
            <div class="info-label">Category</div>
            <div class="info-val" style="color: #ff6600;">${docItem.category || 'Print Job'}</div>
          </div>
          <div class="info-box">
            <div class="info-label">File Size</div>
            <div class="info-val">${formatFileSize(docItem.size)}</div>
          </div>
          <div class="info-box">
            <div class="info-label">Customer Name</div>
            <div class="info-val">${docItem.importedBy || 'ACS Member'}</div>
          </div>
          <div class="info-box">
            <div class="info-label">Customer Email</div>
            <div class="info-val">${docItem.userEmail || 'N/A'}</div>
          </div>
          <div class="info-box">
            <div class="info-label">MIME Type</div>
            <div class="info-val" style="font-family: monospace; font-size: 11px;">${docItem.type || 'application/octet-stream'}</div>
          </div>
        </div>
      ` : `
        <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #e2e8f0; padding-bottom: 8px; margin-bottom: 16px; font-size: 11px; color: #64748b;">
          <span>${docItem.name} • ${docItem.importedBy}</span>
          <span>ACS Doc #${docItem.id.slice(-6).toUpperCase()}</span>
        </div>
      `;

      // Generate single page markup
      const singlePageHtml = `
        <div class="sheet ${printColorMode === 'grayscale' ? 'grayscale-mode' : ''}">
          ${officialHeaderHtml}
          ${imageHtml}
          ${textHtml}

          <div class="content-box">
            <strong style="color: #04193d; font-size: 14px;">Document Specifications & Details</strong>
            <table class="spec-table">
              <tr>
                <td style="color: #64748b;">Paper Specification</td>
                <td style="font-weight: 700; text-align: right;">${printPaperSize} / 80 GSM High Brightness</td>
              </tr>
              <tr>
                <td style="color: #64748b;">Color Mode</td>
                <td style="font-weight: 700; text-align: right;">${printColorMode === 'color' ? 'Standard Full Color Output (CMYK)' : 'Black & White (Grayscale)'}</td>
              </tr>
              <tr>
                <td style="color: #64748b;">Processing Priority</td>
                <td style="font-weight: 700; color: #ff6600; text-align: right;">Instant Customer Priority</td>
              </tr>
            </table>
          </div>

          ${docItem.notes ? `
            <div class="notes-box">
              <strong style="display: block; margin-bottom: 4px;">Customer / Admin Instructions:</strong>
              ${docItem.notes}
            </div>
          ` : ''}

          <div class="footer">
            <div>
              <span>Certified Digital Record: </span>
              <strong style="font-family: monospace;">ACS-SEC-${docItem.id.slice(-6).toUpperCase()}</strong>
            </div>
            <div>
              Printed by ACS Centre Administration System • ${new Date().toLocaleDateString()}
            </div>
          </div>
        </div>
      `;

      // Repeat page for copies if copies > 1
      let fullPagesMarkup = '';
      for (let i = 0; i < printCopies; i++) {
        fullPagesMarkup += singlePageHtml + (i < printCopies - 1 ? '<div style="page-break-after: always;"></div>' : '');
      }

      const htmlContent = `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8" />
            <title>Print - ${docItem.name}</title>
            <style>
              @page {
                size: ${printPaperSize} ${printOrientation};
                margin: 12mm;
              }
              * {
                box-sizing: border-box;
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
              }
              body {
                font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
                color: #0f172a;
                background: #ffffff;
                margin: 0;
                padding: 0;
                line-height: 1.5;
                font-size: 13px;
              }
              .grayscale-mode {
                filter: grayscale(100%) !important;
              }
              .sheet {
                border: 2px solid ${printColorMode === 'color' ? '#0055ff' : '#475569'};
                border-radius: 12px;
                padding: 20px;
                background: #ffffff;
              }
              .header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                border-bottom: 2px solid #e2e8f0;
                padding-bottom: 14px;
                margin-bottom: 16px;
              }
              .brand {
                display: flex;
                align-items: center;
                gap: 12px;
              }
              .logo {
                width: 44px;
                height: 44px;
                background: ${printColorMode === 'color' ? 'linear-gradient(135deg, #0055ff, #ff6600)' : '#334155'};
                color: #ffffff;
                font-weight: 900;
                font-size: 18px;
                display: flex;
                align-items: center;
                justify-content: center;
                border-radius: 10px;
              }
              .org-title {
                font-size: 17px;
                font-weight: 800;
                color: #04193d;
                margin: 0;
              }
              .org-sub {
                font-size: 11px;
                color: #64748b;
                margin: 2px 0 0 0;
              }
              .meta-bar {
                display: flex;
                justify-content: space-between;
                background: #f8fafc;
                border: 1px solid #e2e8f0;
                padding: 7px 12px;
                border-radius: 8px;
                font-size: 11px;
                margin-bottom: 16px;
              }
              .info-grid {
                display: grid;
                grid-template-columns: repeat(3, 1fr);
                gap: 8px;
                margin-bottom: 16px;
              }
              .info-box {
                background: #f8fafc;
                border: 1px solid #e2e8f0;
                border-radius: 8px;
                padding: 8px 10px;
              }
              .info-label {
                font-size: 9px;
                text-transform: uppercase;
                font-weight: 700;
                color: #94a3b8;
                margin-bottom: 2px;
              }
              .info-val {
                font-weight: 700;
                color: #0f172a;
                word-break: break-all;
                font-size: 12px;
              }
              .content-box {
                border: 1px solid #e2e8f0;
                border-radius: 8px;
                padding: 14px;
                margin-bottom: 16px;
              }
              .spec-table {
                width: 100%;
                border-collapse: collapse;
                margin-top: 8px;
              }
              .spec-table td {
                padding: 5px 8px;
                border-bottom: 1px solid #f1f5f9;
                font-size: 12px;
              }
              .notes-box {
                background: #eff6ff;
                border: 1px solid #bfdbfe;
                border-radius: 8px;
                padding: 10px 12px;
                margin-bottom: 14px;
                color: #1e3a8a;
              }
              .footer {
                border-top: 1px solid #e2e8f0;
                padding-top: 12px;
                display: flex;
                justify-content: space-between;
                align-items: center;
                font-size: 10px;
                color: #64748b;
              }
              .seal {
                display: inline-block;
                border: 2px solid #059669;
                color: #059669;
                font-weight: 800;
                padding: 3px 8px;
                border-radius: 6px;
                text-transform: uppercase;
                font-size: 10px;
              }
            </style>
          </head>
          <body>
            ${fullPagesMarkup}
          </body>
        </html>
      `;

      frameDoc.open();
      frameDoc.write(htmlContent);
      frameDoc.close();

      setTimeout(() => {
        try {
          printIframe.contentWindow?.focus();
          printIframe.contentWindow?.print();
        } catch (e) {
          window.print();
        } finally {
          setTimeout(() => {
            if (document.body.contains(printIframe)) {
              document.body.removeChild(printIframe);
            }
          }, 2000);
        }
      }, 400);
    } catch (err) {
      console.warn('Print iframe error, fallback to window.print', err);
      window.print();
    }
  };

  const handleDownload = async () => {
    if (!docItem) return;

    // 1. If backend document, fetch real S3 presigned download URL
    if (docItem.id && !docItem.id.startsWith('doc-') && !docItem.id.startsWith('local-')) {
      try {
        const downloadRes = await documentApi.getDownloadUrl(docItem.id);
        if (downloadRes.downloadUrl) {
          window.open(downloadRes.downloadUrl, '_blank');
          return;
        }
      } catch (err) {
        console.warn('Backend downloadUrl notice, falling back to local src:', err);
      }
    }

    const downloadSrc = videoPlaybackUrl || docItem.fileDataUrl;
    if (downloadSrc) {
      const a = document.createElement('a');
      a.href = downloadSrc;
      a.download = docItem.name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } else {
      const text = `ACS Customer Service - Document Record\n\nDocument Name: ${docItem.name}\nDocument ID: ${docItem.id}\nCategory: ${docItem.category || 'Print Job'}\nStatus: ${docItem.status}\nImported By: ${docItem.importedBy} (${docItem.userEmail})\nImported At: ${docItem.importedAt}\nFile Size: ${formatFileSize(docItem.size)}\nNotes: ${docItem.notes || 'None'}\n\nGenerated by ACS Centre Administration System`;
      const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${docItem.name.split('.')[0]}_record.txt`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  };

  const handleMarkComplete = () => {
    if (onStatusChange) {
      onStatusChange(docItem.id, 'completed');
    }
  };

  const handleMarkPending = () => {
    if (onStatusChange) {
      onStatusChange(docItem.id, 'ready');
    }
  };

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center p-2 sm:p-4 md:p-6 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        id="real-document-viewer-container"
        className="relative w-full max-w-5xl h-[94vh] max-h-[920px] bg-slate-900 rounded-3xl shadow-2xl border border-slate-700/90 flex flex-col overflow-hidden text-left"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ========================================================================= */}
        {/* SCREEN A: INTERACTIVE PRINT PREVIEW SCREEN (TRIGGERED BY PRINTER BUTTON) */}
        {/* ========================================================================= */}
        {showPrintPreview ? (
          <div className="flex flex-col h-full bg-slate-900 animate-in fade-in zoom-in-95 duration-200">
            {/* 1. Print Preview Header */}
            <div className="flex items-center justify-between px-4 sm:px-6 py-3.5 bg-slate-900 border-b border-slate-800 shrink-0 select-none">
              <div className="flex items-center space-x-3">
                <button
                  type="button"
                  onClick={() => setShowPrintPreview(false)}
                  className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors cursor-pointer flex items-center space-x-1.5"
                  title="Back to Document Viewer"
                >
                  <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5" />
                  <span className="text-xs font-bold hidden sm:inline">Back</span>
                </button>

                <div className="h-5 w-px bg-slate-800 hidden sm:block" />

                <div className="flex items-center space-x-2.5">
                  <div className="w-8 h-8 rounded-xl bg-blue-500/20 text-[#0055ff] border border-blue-500/30 flex items-center justify-center">
                    <Printer className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-xs sm:text-sm font-black text-white flex items-center space-x-2">
                      <span>Print Preview</span>
                      <span className="text-[10px] font-mono font-normal text-slate-400 bg-slate-800 px-2 py-0.5 rounded border border-slate-700">
                        {printPaperSize} • {printOrientation.toUpperCase()}
                      </span>
                    </h3>
                    <p className="text-[10px] sm:text-xs text-slate-400 truncate max-w-[200px] sm:max-w-md">
                      {docItem.name}
                    </p>
                  </div>
                </div>
              </div>

              {/* Close Print Preview */}
              <button
                type="button"
                onClick={() => setShowPrintPreview(false)}
                className="p-2 bg-slate-800 hover:bg-rose-500/20 text-slate-400 hover:text-rose-300 border border-slate-700 rounded-xl transition-colors cursor-pointer"
                title="Cancel Print Preview"
              >
                <X className="w-4 h-4 sm:w-5 sm:h-5" />
              </button>
            </div>

            {/* 2. Print Preview Body: Two-Column Responsive Layout (Settings Panel + Live A4 Sheet Preview) */}
            <div className="flex-1 flex flex-col md:flex-row overflow-hidden bg-slate-950">
              {/* LEFT / SIDEBAR: PRINT SETTINGS & CONFIGURATION */}
              <div className="w-full md:w-80 lg:w-88 bg-slate-900 border-b md:border-b-0 md:border-r border-slate-800 p-4 sm:p-5 overflow-y-auto custom-scrollbar flex flex-col justify-between shrink-0 space-y-4">
                <div className="space-y-4 text-xs">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                    <span className="font-extrabold text-slate-300 text-xs uppercase tracking-wider flex items-center space-x-1.5">
                      <Settings2 className="w-3.5 h-3.5 text-[#0055ff]" />
                      <span>Print Settings</span>
                    </span>
                    <span className="text-[10px] text-emerald-400 font-bold bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20 flex items-center space-x-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      <span>Ready</span>
                    </span>
                  </div>

                  {/* Destination / Printer */}
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-slate-400">Destination</label>
                    <div className="flex items-center justify-between p-2.5 bg-slate-800/90 rounded-xl border border-slate-700 text-slate-200">
                      <div className="flex items-center space-x-2 truncate">
                        <Printer className="w-4 h-4 text-[#0055ff] shrink-0" />
                        <span className="truncate font-semibold">ACS Print Station / PDF</span>
                      </div>
                    </div>
                  </div>

                  {/* Number of Copies */}
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-slate-400">Copies</label>
                    <div className="flex items-center space-x-2">
                      <button
                        type="button"
                        onClick={() => setPrintCopies((c) => Math.max(1, c - 1))}
                        className="w-9 h-9 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-black text-sm border border-slate-700 flex items-center justify-center cursor-pointer transition-colors"
                      >
                        -
                      </button>
                      <input
                        type="number"
                        min="1"
                        max="99"
                        value={printCopies}
                        onChange={(e) => setPrintCopies(Math.max(1, parseInt(e.target.value) || 1))}
                        className="flex-1 h-9 bg-slate-800 text-center font-bold text-white rounded-xl border border-slate-700 focus:outline-hidden focus:border-[#0055ff]"
                      />
                      <button
                        type="button"
                        onClick={() => setPrintCopies((c) => Math.min(99, c + 1))}
                        className="w-9 h-9 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-black text-sm border border-slate-700 flex items-center justify-center cursor-pointer transition-colors"
                      >
                        +
                      </button>
                    </div>
                  </div>

                  {/* Orientation */}
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-slate-400">Orientation / Layout</label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setPrintOrientation('portrait')}
                        className={`p-2.5 rounded-xl border font-bold text-center transition-all cursor-pointer flex flex-col items-center justify-center space-y-1 ${printOrientation === 'portrait'
                            ? 'bg-[#0055ff]/15 border-[#0055ff] text-white shadow-xs'
                            : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-slate-200'
                          }`}
                      >
                        <div className="w-4 h-6 border-2 border-current rounded-xs mb-0.5" />
                        <span className="text-[11px]">Portrait</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setPrintOrientation('landscape')}
                        className={`p-2.5 rounded-xl border font-bold text-center transition-all cursor-pointer flex flex-col items-center justify-center space-y-1 ${printOrientation === 'landscape'
                            ? 'bg-[#0055ff]/15 border-[#0055ff] text-white shadow-xs'
                            : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-slate-200'
                          }`}
                      >
                        <div className="w-6 h-4 border-2 border-current rounded-xs mb-0.5" />
                        <span className="text-[11px]">Landscape</span>
                      </button>
                    </div>
                  </div>

                  {/* Color Mode */}
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-slate-400">Color Mode</label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setPrintColorMode('color')}
                        className={`p-2 rounded-xl border font-bold text-center transition-all cursor-pointer flex items-center justify-center space-x-1.5 ${printColorMode === 'color'
                            ? 'bg-[#0055ff]/15 border-[#0055ff] text-white shadow-xs'
                            : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-slate-200'
                          }`}
                      >
                        <span className="w-2.5 h-2.5 rounded-full bg-gradient-to-tr from-rose-500 via-amber-400 to-blue-500" />
                        <span className="text-[11px]">Color</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setPrintColorMode('grayscale')}
                        className={`p-2 rounded-xl border font-bold text-center transition-all cursor-pointer flex items-center justify-center space-x-1.5 ${printColorMode === 'grayscale'
                            ? 'bg-[#0055ff]/15 border-[#0055ff] text-white shadow-xs'
                            : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-slate-200'
                          }`}
                      >
                        <span className="w-2.5 h-2.5 rounded-full bg-slate-400" />
                        <span className="text-[11px]">Grayscale</span>
                      </button>
                    </div>
                  </div>

                  {/* Paper Size */}
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-slate-400">Paper Size</label>
                    <select
                      value={printPaperSize}
                      onChange={(e) => setPrintPaperSize(e.target.value as any)}
                      className="w-full h-9 bg-slate-800 text-slate-200 rounded-xl border border-slate-700 px-3 text-xs font-semibold focus:outline-hidden focus:border-[#0055ff] cursor-pointer"
                    >
                      <option value="A4">A4 (210 × 297 mm) - Standard</option>
                      <option value="Letter">Letter (8.5 × 11 in)</option>
                      <option value="Legal">Legal (8.5 × 14 in)</option>
                    </select>
                  </div>

                  {/* Official Certificate & Stamp Toggle */}
                  <label className="flex items-center space-x-2.5 p-2.5 bg-slate-800/70 rounded-xl border border-slate-700 cursor-pointer hover:bg-slate-800 transition-colors">
                    <input
                      type="checkbox"
                      checked={includeOfficialHeader}
                      onChange={(e) => setIncludeOfficialHeader(e.target.checked)}
                      className="w-4 h-4 rounded text-[#0055ff] focus:ring-0 focus:ring-offset-0 bg-slate-900 border-slate-600 cursor-pointer"
                    />
                    <div className="text-[11px] leading-tight">
                      <span className="font-bold text-white block">Official ACS Letterhead</span>
                      <span className="text-slate-400 text-[10px]">Include verification seal & barcode</span>
                    </div>
                  </label>
                </div>

                {/* Print Action Buttons */}
                <div className="pt-3 border-t border-slate-800 flex flex-col gap-2">
                  <button
                    type="button"
                    onClick={handleExecutePrint}
                    className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-[#0055ff] to-[#0040c0] hover:from-[#0047d4] hover:to-[#0036a6] text-white font-extrabold text-xs sm:text-sm flex items-center justify-center space-x-2 shadow-lg shadow-blue-600/30 transition-all transform active:scale-95 cursor-pointer"
                  >
                    <Printer className="w-4 h-4" />
                    <span>Print Now ({printCopies} {printCopies > 1 ? 'Copies' : 'Copy'})</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setShowPrintPreview(false)}
                    className="w-full py-2 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>
              </div>

              {/* RIGHT / MAIN: LIVE ACCURATE A4 PRINT PREVIEW SHEET CANVAS */}
              <div className="flex-1 bg-slate-950 p-4 sm:p-8 overflow-y-auto overflow-x-auto flex flex-col items-center justify-start custom-scrollbar">
                {/* Canvas Floating Tools (Zoom) */}
                <div className="sticky top-0 z-10 mb-4 flex items-center bg-slate-900/90 backdrop-blur-md rounded-2xl border border-slate-700 px-3 py-1.5 space-x-2 shadow-lg">
                  <button
                    type="button"
                    onClick={() => setPreviewZoom((z) => Math.max(50, z - 10))}
                    className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
                    title="Zoom Out"
                  >
                    <ZoomOut className="w-3.5 h-3.5" />
                  </button>
                  <span className="text-[11px] font-mono text-slate-300 min-w-[36px] text-center">
                    {previewZoom}%
                  </span>
                  <button
                    type="button"
                    onClick={() => setPreviewZoom((z) => Math.min(150, z + 10))}
                    className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
                    title="Zoom In"
                  >
                    <ZoomIn className="w-3.5 h-3.5" />
                  </button>
                  <div className="h-4 w-px bg-slate-700" />
                  <span className="text-[10px] text-slate-400 font-medium">
                    Sheet 1 of 1 • {printPaperSize} ({printOrientation})
                  </span>
                </div>

                {/* THE VIRTUAL PRINT SHEET */}
                <div
                  style={{
                    transform: `scale(${previewZoom / 100})`,
                    transformOrigin: 'top center',
                    transition: 'transform 0.15s ease-out',
                    filter: printColorMode === 'grayscale' ? 'grayscale(100%)' : 'none',
                    width: printOrientation === 'landscape' ? '820px' : '620px',
                    minHeight: printOrientation === 'landscape' ? '580px' : '840px',
                  }}
                  className="bg-white text-slate-900 rounded-lg shadow-[0_20px_50px_rgba(0,0,0,0.6)] border-2 border-slate-300 p-6 sm:p-8 flex flex-col justify-between font-sans select-text relative mb-12"
                >
                  {/* Watermark in background */}
                  <div className="absolute inset-0 pointer-events-none flex items-center justify-center opacity-[0.03] select-none">
                    <span className="text-8xl font-black rotate-[-25deg] text-slate-900 tracking-widest">
                      ACS CENTRE
                    </span>
                  </div>

                  {/* Sheet Header */}
                  {includeOfficialHeader ? (
                    <div>
                      <div className="flex items-center justify-between border-b-2 border-[#0055ff] pb-3 mb-4">
                        <div className="flex items-center space-x-3">
                          <div className="w-11 h-11 rounded-xl bg-gradient-to-tr from-[#0055ff] to-[#ff6600] text-white flex items-center justify-center font-black text-xl shadow-md">
                            ACS
                          </div>
                          <div>
                            <span className="text-[9px] font-black uppercase tracking-widest text-[#ff6600] block">
                              Official Customer Service Document
                            </span>
                            <h2 className="text-lg font-black text-[#04193d] tracking-tight">
                              ACS CUSTOMER SERVICE CENTRE
                            </h2>
                            <p className="text-[10px] text-slate-500 font-medium">
                              Digital Document Processing & Print Management
                            </p>
                          </div>
                        </div>

                        <div className="text-right">
                          <div className="px-2.5 py-1 rounded-md border-2 border-emerald-600 text-emerald-700 font-extrabold text-[10px] uppercase tracking-wider inline-block">
                            {docItem.status === 'completed' ? '✓ APPROVED & PROCESSED' : '✓ VERIFIED FOR PROCESSING'}
                          </div>
                        </div>
                      </div>

                      <div className="flex justify-between bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-lg text-[10px] text-slate-600 mb-4">
                        <div><strong>Doc Ref ID:</strong> <span className="font-mono text-[#0055ff] font-bold">{docItem.id}</span></div>
                        <div><strong>Import Date:</strong> {docItem.importedAt}</div>
                        <div><strong>Category:</strong> <span className="font-bold text-[#ff6600]">{docItem.category || 'Print Job'}</span></div>
                      </div>
                    </div>
                  ) : (
                    <div className="flex justify-between items-center border-b border-slate-200 pb-2 mb-4 text-[10px] text-slate-500">
                      <span>{docItem.name} • {docItem.importedBy}</span>
                      <span>ACS Reference ID: {docItem.id}</span>
                    </div>
                  )}

                  {/* Main Printable Content */}
                  <div className="flex-1 space-y-4 my-2">
                    {/* If Image */}
                    {isImage && docItem.fileDataUrl ? (
                      <div className="flex items-center justify-center p-2 bg-slate-50 border border-slate-200 rounded-xl">
                        <img
                          src={docItem.fileDataUrl}
                          alt={docItem.name}
                          className={`object-contain rounded-lg ${printOrientation === 'landscape' ? 'max-h-[300px]' : 'max-h-[420px]'}`}
                        />
                      </div>
                    ) : isText && decodedText ? (
                      /* If Text */
                      <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 font-mono text-[11px] leading-relaxed max-h-[400px] overflow-hidden">
                        <pre className="whitespace-pre-wrap text-slate-800">{decodedText.slice(0, 1200)}</pre>
                        {decodedText.length > 1200 && (
                          <div className="text-slate-400 text-[9px] mt-2 italic font-sans text-center">
                            ... [Content continues to next print page] ...
                          </div>
                        )}
                      </div>
                    ) : (
                      /* Specification Sheet Content */
                      <div className="space-y-3">
                        <div className="grid grid-cols-3 gap-2 text-[10px]">
                          <div className="p-2 bg-slate-50 border border-slate-200 rounded-md">
                            <span className="text-slate-400 block uppercase font-bold text-[8px]">File Name</span>
                            <span className="font-bold text-slate-900 truncate block">{docItem.name}</span>
                          </div>
                          <div className="p-2 bg-slate-50 border border-slate-200 rounded-md">
                            <span className="text-slate-400 block uppercase font-bold text-[8px]">Customer</span>
                            <span className="font-bold text-slate-900 truncate block">{docItem.importedBy}</span>
                          </div>
                          <div className="p-2 bg-slate-50 border border-slate-200 rounded-md">
                            <span className="text-slate-400 block uppercase font-bold text-[8px]">File Size</span>
                            <span className="font-bold text-slate-900 block">{formatFileSize(docItem.size)}</span>
                          </div>
                        </div>

                        <div className="border border-slate-200 rounded-lg p-3 bg-white space-y-2">
                          <strong className="text-slate-900 text-xs block">Service Order Specifications</strong>
                          <table className="w-full text-[11px]">
                            <tbody>
                              <tr className="border-b border-slate-100">
                                <td className="py-1 text-slate-500">Selected Paper</td>
                                <td className="py-1 font-bold text-right text-slate-900">{printPaperSize} / 80 GSM High Brightness</td>
                              </tr>
                              <tr className="border-b border-slate-100">
                                <td className="py-1 text-slate-500">Print Quality</td>
                                <td className="py-1 font-bold text-right text-slate-900">High Precision 1200 DPI Output</td>
                              </tr>
                              <tr className="border-b border-slate-100">
                                <td className="py-1 text-slate-500">Color Profile</td>
                                <td className="py-1 font-bold text-right text-slate-900">{printColorMode === 'color' ? 'Full CMYK Color' : 'Grayscale (B&W)'}</td>
                              </tr>
                              <tr>
                                <td className="py-1 text-slate-500">Copies Configured</td>
                                <td className="py-1 font-bold text-right text-[#0055ff]">{printCopies} {printCopies > 1 ? 'Sheets' : 'Sheet'}</td>
                              </tr>
                            </tbody>
                          </table>
                        </div>

                        {docItem.notes && (
                          <div className="p-2.5 bg-blue-50 border border-blue-200 rounded-lg text-[11px] text-blue-900">
                            <strong>Customer Instructions:</strong> {docItem.notes}
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Sheet Footer */}
                  <div className="pt-3 border-t border-slate-200 flex justify-between items-center text-[9px] text-slate-500 mt-4">
                    <div>
                      <span>Authentication Code: </span>
                      <strong className="font-mono text-slate-700">ACS-SEC-{docItem.id.slice(-6).toUpperCase()}</strong>
                    </div>
                    <div className="flex items-center space-x-2">
                      <QrCode className="w-6 h-6 text-slate-800" />
                      <span>Printed by ACS Administration System</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* ========================================================================= */
          /* SCREEN B: STANDARD COMPLETE DOCUMENT VIEWER SCREEN */
          /* ========================================================================= */
          <>
            {/* ================= 1. RESPONSIVE TOP BAR ================= */}
            <div className="flex items-center justify-between px-3.5 sm:px-6 py-3 bg-slate-900 border-b border-slate-800 shrink-0 select-none gap-2">
              {/* Left Title & Status */}
              <div className="flex items-center space-x-2.5 sm:space-x-3.5 min-w-0 pr-1 flex-1">
                <div className={`w-9 h-9 sm:w-11 sm:h-11 rounded-xl sm:rounded-2xl flex items-center justify-center shrink-0 border ${typeInfo.accentColor}`}>
                  <IconComp className="w-4 h-4 sm:w-5 sm:h-5" />
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center space-x-1.5 sm:space-x-2">
                    <h3 className="text-xs sm:text-base font-extrabold text-white truncate max-w-[170px] sm:max-w-xs md:max-w-md" title={docItem.name}>
                      {docItem.name}
                    </h3>
                    <span className="text-[9px] sm:text-[10px] font-black uppercase px-1.5 sm:px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700 shrink-0">
                      {typeInfo.badge}
                    </span>
                  </div>
                  <p className="text-[10px] sm:text-xs text-slate-400 mt-0.5 flex flex-wrap items-center gap-x-1.5 sm:gap-x-2">
                    <span className="truncate max-w-[120px] sm:max-w-none">{docItem.importedBy}</span>
                    <span>•</span>
                    <span>{formatFileSize(docItem.size)}</span>
                    <span className="hidden xs:inline">•</span>
                    <span className="text-[#ff6600] font-semibold hidden xs:inline">{docItem.category || 'Print Job'}</span>
                  </p>
                </div>
              </div>

              {/* Right Action Tools & Mode Tabs & TOP-RIGHT CROSS MARK (X) */}
              <div className="flex items-center space-x-1.5 sm:space-x-2.5 shrink-0 flex-wrap gap-y-1">
                {/* Switcher Tabs: Actual Document vs Document Details */}
                <div className="flex items-center bg-slate-800 p-0.5 rounded-xl border border-slate-700 select-none">
                  <button
                    type="button"
                    id="doc-viewer-tab-actual"
                    onClick={() => setViewerTab('document')}
                    className={`px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center space-x-1.5 ${viewerTab === 'document'
                        ? 'bg-[#0055ff] text-white shadow-xs'
                        : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
                      }`}
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>Actual Document</span>
                  </button>
                  <button
                    type="button"
                    id="doc-viewer-tab-details"
                    onClick={() => setViewerTab('details')}
                    className={`px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center space-x-1.5 ${viewerTab === 'details'
                        ? 'bg-slate-700 text-white shadow-xs'
                        : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
                      }`}
                  >
                    <FileText className="w-3.5 h-3.5" />
                    <span>Details</span>
                  </button>
                </div>

                {/* Open in New Tab Button */}
                {(docContentUrl || docItem.fileDataUrl) && (
                  <a
                    href={docContentUrl || docItem.fileDataUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-1.5 sm:p-2 text-blue-400 hover:text-white bg-blue-500/10 hover:bg-blue-600/30 border border-blue-500/30 rounded-xl transition-all cursor-pointer flex items-center space-x-1 text-xs font-bold"
                    title="Open raw document in new browser tab"
                  >
                    <ExternalLink className="w-4 h-4" />
                    <span className="hidden xl:inline">Open in Tab</span>
                  </a>
                )}

                {/* Zoom / Rotate Controls */}
                <div className="hidden sm:flex items-center bg-slate-800/80 rounded-xl border border-slate-700 p-0.5">
                  <button
                    type="button"
                    onClick={() => setZoomLevel((z) => Math.max(50, z - 15))}
                    className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-700 transition-colors cursor-pointer"
                    title="Zoom Out"
                  >
                    <ZoomOut className="w-4 h-4" />
                  </button>
                  <span className="text-[11px] font-mono text-slate-300 px-1.5 min-w-[38px] text-center">
                    {zoomLevel}%
                  </span>
                  <button
                    type="button"
                    onClick={() => setZoomLevel((z) => Math.min(200, z + 15))}
                    className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-700 transition-colors cursor-pointer"
                    title="Zoom In"
                  >
                    <ZoomIn className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setRotation((r) => (r + 90) % 360)}
                    className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-700 transition-colors cursor-pointer border-l border-slate-700 ml-1"
                    title="Rotate 90°"
                  >
                    <RotateCw className="w-4 h-4" />
                  </button>
                </div>

                {/* PRINTER BUTTON (OPENS PRINT PREVIEW) */}
                <button
                  id="real-doc-viewer-print-btn"
                  type="button"
                  onClick={() => setShowPrintPreview(true)}
                  className="p-2 sm:p-2.5 text-white bg-[#0055ff] hover:bg-[#0047d4] border border-blue-500 rounded-xl transition-all cursor-pointer shadow-md shadow-blue-500/20 flex items-center space-x-1.5"
                  title="Print Preview & Settings"
                  aria-label="Print Document"
                >
                  <Printer className="w-4 h-4" />
                  <span className="text-xs font-bold hidden md:inline">Print</span>
                </button>

                {/* Download Button */}
                <button
                  type="button"
                  onClick={handleDownload}
                  className="p-2 sm:p-2.5 text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl transition-colors cursor-pointer"
                  title="Download File"
                  aria-label="Download File"
                >
                  <Download className="w-4 h-4" />
                </button>

                {/* TOP RIGHT CROSS MARK BUTTON */}
                <button
                  id="real-doc-viewer-close-btn"
                  onClick={onClose}
                  type="button"
                  className="p-2 sm:p-2.5 bg-rose-500/20 hover:bg-rose-600 text-rose-300 hover:text-white border border-rose-500/40 rounded-xl transition-all cursor-pointer group shrink-0"
                  title="Close Document Viewer (Esc)"
                  aria-label="Close document viewer"
                >
                  <X className="w-4 h-4 sm:w-5 sm:h-5 group-hover:scale-110 transition-transform" />
                </button>
              </div>
            </div>

            {/* ================= 2. COMPLETE DOCUMENT SCROLLABLE WORKSPACE ================= */}
            <div className="flex-1 bg-slate-950 overflow-y-auto overflow-x-auto p-3 sm:p-6 md:p-8 custom-scrollbar">
              <div
                style={{
                  transform: `scale(${zoomLevel / 100}) rotate(${rotation}deg)`,
                  transformOrigin: 'top center',
                  transition: 'transform 0.15s ease-out'
                }}
                className="w-full max-w-4xl mx-auto flex flex-col items-center"
              >
                {/* 1. ACTUAL DOCUMENT VIEW (ACTIVE BY DEFAULT) */}
                {viewerTab === 'document' ? (
                  isLoadingContent ? (
                    <div className="py-24 flex flex-col items-center justify-center space-y-3 text-slate-400">
                      <Loader2 className="w-9 h-9 animate-spin text-[#0055ff]" />
                      <p className="text-sm font-bold text-slate-300">Loading Actual Document...</p>
                      <p className="text-xs text-slate-500 font-mono">{docItem.name}</p>
                    </div>
                  ) : isAudio ? (
                    <div className="w-full max-w-4xl mx-auto flex flex-col space-y-4">
                      <RealAudioPlayer
                        src={audioPlaybackUrl || docContentUrl || docItem.fileDataUrl || ''}
                        fileName={docItem.name}
                        fileSize={docItem.size}
                        fileType={docItem.type}
                        onDownload={handleDownload}
                      />
                    </div>
                  ) : isVideo ? (
                    <div className="w-full max-w-4xl mx-auto flex flex-col space-y-4">
                      <RealVideoPlayer
                        src={videoPlaybackUrl || docContentUrl || docItem.fileDataUrl || ''}
                        fileName={docItem.name}
                        fileSize={docItem.size}
                        fileType={docItem.type}
                        onDownload={handleDownload}
                      />

                      {/* Video File Specifications */}
                      <div className="w-full bg-slate-900/95 rounded-2xl border border-slate-800 p-4 sm:p-5 text-slate-200 text-xs shadow-xl">
                        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                          <span className="font-bold text-white text-xs sm:text-sm flex items-center space-x-2">
                            <Film className="w-4 h-4 text-amber-400" />
                            <span>Video Media File Verification</span>
                          </span>
                          <span className="text-[10px] uppercase font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                            Ready for Playback
                          </span>
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-3">
                          <div className="bg-slate-800/80 p-2.5 rounded-xl border border-slate-700/60">
                            <span className="text-[10px] text-slate-400 block uppercase font-bold">Category</span>
                            <span className="font-bold text-amber-400 text-xs">{docItem.category || 'Video Media'}</span>
                          </div>
                          <div className="bg-slate-800/80 p-2.5 rounded-xl border border-slate-700/60">
                            <span className="text-[10px] text-slate-400 block uppercase font-bold">Format</span>
                            <span className="font-bold text-white text-xs">{ext} Video</span>
                          </div>
                          <div className="bg-slate-800/80 p-2.5 rounded-xl border border-slate-700/60">
                            <span className="text-[10px] text-slate-400 block uppercase font-bold">Uploaded By</span>
                            <span className="font-bold text-white text-xs truncate block" title={docItem.importedBy}>{docItem.importedBy}</span>
                          </div>
                          <div className="bg-slate-800/80 p-2.5 rounded-xl border border-slate-700/60">
                            <span className="text-[10px] text-slate-400 block uppercase font-bold">File Size</span>
                            <span className="font-bold text-white text-xs">{formatFileSize(docItem.size)}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : isPdf && (docContentUrl || docItem.fileDataUrl) ? (
                    <div className="w-full h-[78vh] min-h-[550px] md:min-h-[750px] bg-slate-900 rounded-2xl overflow-hidden border border-slate-700/80 shadow-2xl flex flex-col">
                      <div className="bg-slate-800/95 px-4 py-2.5 flex items-center justify-between border-b border-slate-700 text-xs text-slate-300 shrink-0">
                        <span className="font-bold flex items-center gap-2 text-white truncate max-w-[200px] sm:max-w-md">
                          <FileText className="w-4 h-4 text-rose-500 shrink-0" />
                          <span className="truncate">{docItem.name}</span>
                        </span>
                        <div className="flex items-center space-x-2 shrink-0">
                          <a
                            href={docContentUrl || docItem.fileDataUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 hover:text-white border border-blue-500/30 font-bold text-xs transition-colors"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                            <span>Open PDF Fullscreen</span>
                          </a>
                        </div>
                      </div>
                      <iframe
                        src={`${docContentUrl || docItem.fileDataUrl}#toolbar=1&navpanes=0`}
                        className="w-full flex-1 rounded-b-2xl bg-white border-0"
                        title={docItem.name}
                      />
                    </div>
                  ) : isImage && (docContentUrl || docItem.fileDataUrl) ? (
                    /* Real Image File Preview */
                    <div className="w-full bg-slate-900/90 p-3 sm:p-5 rounded-2xl shadow-2xl border border-slate-700 flex flex-col items-center justify-center">
                      <div className="w-full mb-3 flex items-center justify-between text-xs text-slate-400 pb-2 border-b border-slate-800">
                        <span className="font-semibold text-slate-300 truncate max-w-sm">{docItem.name}</span>
                        <a
                          href={docContentUrl || docItem.fileDataUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-purple-400 hover:text-purple-300 font-semibold"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                          <span>View Full Resolution</span>
                        </a>
                      </div>
                      <img
                        src={docContentUrl || docItem.fileDataUrl}
                        alt={docItem.name}
                        className="w-auto max-w-full max-h-[75vh] object-contain rounded-xl shadow-lg border border-slate-800"
                      />
                    </div>
                  ) : isText && decodedText ? (
                    /* Real Text / Code File Preview */
                    <div className="w-full bg-slate-900 text-slate-100 rounded-2xl border border-slate-700/90 p-4 sm:p-6 shadow-2xl overflow-x-auto font-mono text-xs leading-relaxed">
                      <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-3">
                        <span className="font-bold text-slate-300 text-xs flex items-center space-x-1.5">
                          <FileCode className="w-4 h-4 text-[#0055ff]" />
                          <span>Source Content: {docItem.name}</span>
                        </span>
                        <div className="flex items-center space-x-3">
                          <span className="text-[10px] text-slate-400 font-mono">{decodedText.length} characters</span>
                          {docContentUrl && (
                            <a
                              href={docContentUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-400 hover:text-blue-300 inline-flex items-center space-x-1 text-xs font-semibold"
                            >
                              <ExternalLink className="w-3 h-3" />
                              <span>Raw</span>
                            </a>
                          )}
                        </div>
                      </div>
                      <pre className="whitespace-pre-wrap font-mono text-xs text-slate-200">
                        {decodedText}
                      </pre>
                    </div>
                  ) : docContentUrl ? (
                    /* Word / Excel / Spreadsheet / Presentation / Other Document with resolved URL */
                    <div className="w-full max-w-3xl mx-auto flex flex-col items-center space-y-4">
                      {docContentUrl.startsWith('http') && !docContentUrl.includes('localhost') ? (
                        <div className="w-full h-[75vh] min-h-[550px] bg-slate-900 rounded-2xl overflow-hidden border border-slate-700 shadow-2xl flex flex-col">
                          <div className="bg-slate-800/90 px-4 py-2 flex items-center justify-between border-b border-slate-700 text-xs text-slate-300">
                            <span className="font-bold text-white flex items-center gap-1.5 truncate">
                              <FileText className="w-4 h-4 text-blue-400" />
                              <span>{docItem.name} — Web Document Viewer</span>
                            </span>
                            <a
                              href={docContentUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-blue-400 hover:text-white font-bold text-xs"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                              <span>Open</span>
                            </a>
                          </div>
                          <iframe
                            src={`https://docs.google.com/viewer?url=${encodeURIComponent(docContentUrl)}&embedded=true`}
                            className="w-full flex-1 bg-white border-0"
                            title={docItem.name}
                          />
                        </div>
                      ) : (
                        <div className="w-full max-w-xl mx-auto bg-slate-900/95 rounded-3xl border border-slate-800 p-8 shadow-2xl text-center space-y-5">
                          <div className="w-20 h-20 mx-auto rounded-3xl bg-blue-500/10 text-[#0055ff] border border-blue-500/20 flex items-center justify-center">
                            <IconComp className="w-10 h-10" />
                          </div>
                          <div>
                            <h3 className="text-lg font-black text-white">{docItem.name}</h3>
                            <p className="text-xs text-slate-400 mt-1">{formatFileSize(docItem.size)} • {typeInfo.label}</p>
                            <span className="mt-2 inline-block px-3 py-1 rounded-full text-[10px] font-bold uppercase bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                              Document Ready for Access
                            </span>
                          </div>
                          <p className="text-xs text-slate-400 max-w-sm mx-auto">
                            Click below to open the actual document in your browser or default system office application.
                          </p>
                          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                            <a
                              href={docContentUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#0055ff] to-blue-700 hover:from-blue-600 hover:to-blue-800 text-white font-bold text-xs shadow-lg shadow-blue-500/20 inline-flex items-center space-x-2 transition-transform transform active:scale-95"
                            >
                              <ExternalLink className="w-4 h-4" />
                              <span>Open Actual Document</span>
                            </a>
                            <button
                              type="button"
                              onClick={handleDownload}
                              className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs border border-slate-700 inline-flex items-center space-x-2 transition-colors cursor-pointer"
                            >
                              <Download className="w-4 h-4" />
                              <span>Download File</span>
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    /* Fallback Card if Document stream not immediately available in browser */
                    <div className="w-full max-w-md mx-auto bg-slate-900 rounded-3xl border border-slate-800 p-8 shadow-2xl text-center space-y-4">
                      <div className="w-16 h-16 mx-auto rounded-2xl bg-blue-500/10 text-[#0055ff] border border-blue-500/20 flex items-center justify-center">
                        <IconComp className="w-8 h-8" />
                      </div>
                      <h3 className="text-base font-bold text-white">{docItem.name}</h3>
                      <p className="text-xs text-slate-400">
                        Document stream is available. You can download the file directly or view its registered specifications.
                      </p>
                      <div className="flex justify-center gap-3 pt-2">
                        <button
                          type="button"
                          onClick={handleDownload}
                          className="px-4 py-2 rounded-xl bg-[#0055ff] hover:bg-blue-600 text-white font-bold text-xs inline-flex items-center space-x-1.5 cursor-pointer"
                        >
                          <Download className="w-4 h-4" />
                          <span>Download File</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setViewerTab('details')}
                          className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs border border-slate-700 cursor-pointer"
                        >
                          <span>View Details</span>
                        </button>
                      </div>
                    </div>
                  )
                ) : (
                  /* 2. DOCUMENT DETAILS VIEW (TAB: 'details') */
                  <div className="w-full bg-white text-slate-900 rounded-2xl shadow-[0_25px_60px_rgba(0,0,0,0.5)] border border-slate-200 overflow-hidden font-sans select-text">
                    {/* Official Letterhead Header */}
                    <div className="p-4 sm:p-6 md:p-8 border-b-2 border-[#0055ff]/20 bg-gradient-to-r from-blue-50/70 via-white to-orange-50/50 relative">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
                        <div className="flex items-center space-x-3 sm:space-x-3.5">
                          <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-gradient-to-tr from-[#0055ff] to-[#ff6600] text-white flex items-center justify-center font-black text-lg sm:text-xl shadow-md shrink-0">
                            ACS
                          </div>
                          <div>
                            <span className="text-[9px] sm:text-[10px] font-black uppercase tracking-widest text-[#ff6600] block">
                              Official Customer Service Document
                            </span>
                            <h2 className="text-base sm:text-xl md:text-2xl font-black text-[#04193d] tracking-tight">
                              ACS CUSTOMER SERVICE CENTRE
                            </h2>
                            <p className="text-[11px] sm:text-xs text-slate-500 font-medium">
                              Digital Document Processing & Printing Services
                            </p>
                          </div>
                        </div>

                        {/* Verification Seal & QR Code */}
                        <div className="flex items-center space-x-2.5 sm:space-x-3 self-end sm:self-auto shrink-0">
                          <div className="text-right hidden sm:block">
                            <span className="text-[9px] uppercase font-bold text-slate-400 block">Verification Status</span>
                            <span className="text-xs font-bold text-emerald-600 flex items-center justify-end space-x-1">
                              <ShieldCheck className="w-3.5 h-3.5" />
                              <span>Verified Record</span>
                            </span>
                          </div>
                          <div className="w-10 h-10 sm:w-12 sm:h-12 bg-white rounded-xl border border-slate-200 p-1 flex items-center justify-center shadow-xs">
                            <QrCode className="w-8 h-8 sm:w-10 sm:h-10 text-slate-800" />
                          </div>
                        </div>
                      </div>

                      {/* Watermark Ribbon */}
                      <div className="mt-3 sm:mt-4 pt-2.5 sm:pt-3 border-t border-slate-200/80 flex flex-wrap items-center justify-between gap-2 text-[10px] sm:text-[11px] text-slate-500">
                        <div>
                          <strong className="text-slate-700">Doc Reference ID:</strong>{' '}
                          <span className="font-mono font-bold text-[#0055ff] bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200">
                            {docItem.id}
                          </span>
                        </div>
                        <div>
                          <strong className="text-slate-700">Import Date:</strong> {docItem.importedAt}
                        </div>
                        <div>
                          <strong className="text-slate-700">Status:</strong>{' '}
                          <span className={`font-bold uppercase ${docItem.status === 'completed' ? 'text-emerald-600' : 'text-blue-600'}`}>
                            {docItem.status === 'completed' ? 'COMPLETED' : 'READY / PENDING'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Document Main Content Body */}
                    <div className="p-4 sm:p-6 md:p-8 space-y-4 sm:space-y-6">
                      {/* File Metadata Overview Table */}
                      <div className="bg-slate-50/90 rounded-xl p-3 sm:p-4 border border-slate-200/80">
                        <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-500 mb-2.5 flex items-center space-x-1.5">
                          <FileText className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#0055ff]" />
                          <span>Document Submission Specifications</span>
                        </h4>

                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5 sm:gap-3 text-xs">
                          <div className="bg-white p-2 sm:p-2.5 rounded-lg border border-slate-200/60">
                            <span className="text-[9px] sm:text-[10px] text-slate-400 block uppercase font-bold">File Name</span>
                            <span className="font-bold text-slate-900 truncate block mt-0.5 text-xs" title={docItem.name}>
                              {docItem.name}
                            </span>
                          </div>

                          <div className="bg-white p-2 sm:p-2.5 rounded-lg border border-slate-200/60">
                            <span className="text-[9px] sm:text-[10px] text-slate-400 block uppercase font-bold">Category</span>
                            <span className="font-bold text-[#ff6600] block mt-0.5 text-xs">
                              {docItem.category || 'Print Job'}
                            </span>
                          </div>

                          <div className="bg-white p-2 sm:p-2.5 rounded-lg border border-slate-200/60">
                            <span className="text-[9px] sm:text-[10px] text-slate-400 block uppercase font-bold">File Size</span>
                            <span className="font-bold text-slate-900 block mt-0.5 text-xs">
                              {formatFileSize(docItem.size)}
                            </span>
                          </div>

                          <div className="bg-white p-2 sm:p-2.5 rounded-lg border border-slate-200/60">
                            <span className="text-[9px] sm:text-[10px] text-slate-400 block uppercase font-bold">Customer Name</span>
                            <span className="font-bold text-slate-900 truncate block mt-0.5 text-xs">
                              {docItem.importedBy || 'ACS Member'}
                            </span>
                          </div>

                          <div className="bg-white p-2 sm:p-2.5 rounded-lg border border-slate-200/60">
                            <span className="text-[9px] sm:text-[10px] text-slate-400 block uppercase font-bold">Customer Email</span>
                            <span className="font-bold text-slate-900 truncate block mt-0.5 text-xs" title={docItem.userEmail}>
                              {docItem.userEmail || 'N/A'}
                            </span>
                          </div>

                          <div className="bg-white p-2 sm:p-2.5 rounded-lg border border-slate-200/60">
                            <span className="text-[9px] sm:text-[10px] text-slate-400 block uppercase font-bold">MIME Format</span>
                            <span className="font-mono text-slate-700 truncate block mt-0.5 text-[10px] sm:text-[11px]">
                              {docItem.type || 'application/octet-stream'}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Document Simulated Sheet Pages / Content Preview */}
                      <div className="p-4 sm:p-5 bg-white border border-slate-200 rounded-xl shadow-xs space-y-3.5">
                        <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                          <div className="flex items-center space-x-2">
                            <span className="w-2.5 h-2.5 rounded-full bg-[#0055ff]" />
                            <h5 className="font-bold text-xs sm:text-sm text-[#04193d]">Complete Document Content Overview</h5>
                          </div>
                          <span className="text-[10px] sm:text-[11px] font-mono text-slate-400">Verified A4 Sheet</span>
                        </div>

                        {/* Customer Instructions if available */}
                        {docItem.notes ? (
                          <div className="p-3 bg-blue-50/70 rounded-xl border border-blue-100 text-xs text-slate-700 leading-relaxed">
                            <strong className="text-[#0055ff] block mb-0.5 text-xs">Customer / Admin Instructions:</strong>
                            <p>{docItem.notes}</p>
                          </div>
                        ) : null}

                        {/* Rendered Lines representing actual printable document */}
                        <div className="space-y-2.5 py-1 text-xs text-slate-600 leading-relaxed font-serif">
                          <p className="font-semibold text-slate-900">
                            Subject: Request for Official Document Processing — {docItem.name}
                          </p>
                          <p>
                            This document has been registered in the ACS Customer Service system for high-resolution printing, scanning, or administrative verification.
                          </p>

                          <div className="p-3 bg-slate-50 rounded-lg border border-slate-100 font-sans text-xs space-y-1.5">
                            <div className="flex justify-between text-slate-600">
                              <span>Paper Specification:</span>
                              <span className="font-semibold text-slate-900">Standard A4 / 80 GSM High Brightness</span>
                            </div>
                            <div className="flex justify-between text-slate-600">
                              <span>Color Mode:</span>
                              <span className="font-semibold text-slate-900">Standard Full Color Output (CMYK)</span>
                            </div>
                            <div className="flex justify-between text-slate-600">
                              <span>Service Priority:</span>
                              <span className="font-semibold text-[#ff6600]">Instant Customer Queue Priority</span>
                            </div>
                          </div>
                        </div>

                        {/* Official Stamp & Sign Off */}
                        <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
                          <div className="text-[10px] sm:text-[11px] text-slate-400">
                            <span>Digital Signature: </span>
                            <span className="font-mono text-slate-600 font-semibold">ACS-SEC-{docItem.id.slice(-6).toUpperCase()}</span>
                          </div>

                          <div className="px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-lg border-2 border-emerald-600 text-emerald-700 font-black text-[10px] sm:text-xs uppercase tracking-wider -rotate-1">
                            {docItem.status === 'completed' ? '✓ APPROVED & PROCESSED' : '✓ VERIFIED FOR PROCESSING'}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* ================= 3. RESPONSIVE BOTTOM BAR WITH DELETE & DOWNLOAD BUTTONS ================= */}
            <div className="px-4 sm:px-8 py-3.5 bg-slate-900 border-t border-slate-800/90 flex items-center justify-between gap-3 shrink-0 select-none">
              {/* Left: Delete Button & Download Button side-by-side */}
              <div className="flex items-center space-x-2 sm:space-x-3">
                {onDelete && (
                  <button
                    id="doc-viewer-delete-btn"
                    type="button"
                    onClick={() => {
                      onDelete(docItem.id);
                      onClose();
                    }}
                    className="inline-flex items-center space-x-1.5 sm:space-x-2 px-3 sm:px-4 py-2 sm:py-2.5 text-slate-400 hover:text-rose-300 bg-slate-800/90 hover:bg-rose-500/20 border border-slate-700/80 hover:border-rose-500/40 rounded-xl sm:rounded-2xl text-xs font-bold transition-all cursor-pointer shadow-xs min-h-[40px]"
                    title="Delete document record"
                  >
                    <Trash2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                    <span>Delete</span>
                  </button>
                )}

                {/* Download button positioned on the right side of the delete button */}
                <button
                  id="doc-viewer-bottom-download-btn"
                  type="button"
                  onClick={handleDownload}
                  className="inline-flex items-center justify-center space-x-1.5 sm:space-x-2 px-4 sm:px-5 py-2 sm:py-2.5 rounded-xl sm:rounded-2xl bg-[#0055ff] hover:bg-[#0044cc] text-white text-xs sm:text-sm font-bold shadow-md shadow-blue-600/30 transition-all transform active:scale-95 cursor-pointer min-h-[40px]"
                  title="Download document file"
                >
                  <Download className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  <span>Download</span>
                </button>
              </div>

              {/* Right: Close Button */}
              <div className="flex items-center space-x-2 sm:space-x-3">
                <button
                  id="doc-viewer-close-btn"
                  type="button"
                  onClick={onClose}
                  className="px-4 sm:px-5 py-2 sm:py-2.5 rounded-xl sm:rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-xs sm:text-sm font-semibold transition-all cursor-pointer min-h-[40px]"
                >
                  Close
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
