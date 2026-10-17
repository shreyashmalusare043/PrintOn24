import React, { useState, useEffect, useRef, useMemo } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import pdfjsWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import {
  ArrowLeft,
  Menu,
  Minus,
  Plus,
  RotateCw,
  Download,
  Printer,
  MoreVertical,
  Image as ImageIcon,
  List as ListIcon,
  Maximize2,
  Minimize2,
  PenTool,
  Undo2,
  Redo2,
  Sparkles,
  Type,
  Expand,
  Loader2,
  AlertTriangle,
  RefreshCw,
  FileText
} from 'lucide-react';
import { toast } from 'sonner';
import type { PrintConfig, UploadedDoc } from '../../types/printperfect';

// Configure PDF.js Worker
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker;

export const ChromePdfPreviewView: React.FC = () => {
  const [docUrl, setDocUrl] = useState<string>('');
  const [docName, setDocName] = useState<string>('Document.pdf');
  const [docId, setDocId] = useState<string>('');
  const [printConfig, setPrintConfig] = useState<PrintConfig>({
    pageSize: 'A4',
    paperType: 'Normal',
    printType: 'Color',
    sides: 'Single Side',
    copies: 1,
    layout: 'Portrait',
    pageRangeType: 'All Pages',
    selectedPageRange: '1',
    pagesPerSheet: '1-in-1'
  });

  const [pdfDoc, setPdfDoc] = useState<pdfjsLib.PDFDocumentProxy | null>(null);
  const [pdfTotalPages, setPdfTotalPages] = useState<number>(0);
  const [isLoadingPdf, setIsLoadingPdf] = useState<boolean>(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Chrome Viewer States
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(() => {
    return typeof window !== 'undefined' ? window.innerWidth >= 768 : true;
  });
  const [sidebarTab, setSidebarTab] = useState<'thumbnails' | 'outline'>('thumbnails');
  const [currentPageInput, setCurrentPageInput] = useState<string>('1');
  const [activePageIndex, setActivePageIndex] = useState<number>(1);
  const [zoomLevel, setZoomLevel] = useState<number>(100); // 100%
  const [rotationDegrees, setRotationDegrees] = useState<number>(0); // 0, 90, 180, 270
  const [isFitWidth, setIsFitWidth] = useState<boolean>(false);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [summarizeOpen, setSummarizeOpen] = useState<boolean>(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState<number>(() => {
    return typeof window !== 'undefined' ? window.innerWidth : 1024;
  });

  // Track responsive container viewport width for mobile, tablet, laptop, and desktop
  useEffect(() => {
    const handleResize = () => {
      if (containerRef.current) {
        setContainerWidth(containerRef.current.clientWidth);
      } else if (typeof window !== 'undefined') {
        setContainerWidth(window.innerWidth);
      }
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Parse URL Parameters & Initial Local Storage on Mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const paramDocId = params.get('docId') || '';
    const paramUrl = params.get('url') || '';
    const paramName = params.get('name') || '';

    setDocId(paramDocId);

    // Try reading active session doc from localStorage
    try {
      const storedActive = localStorage.getItem('printon24_preview_active_doc');
      if (storedActive) {
        const parsed = JSON.parse(storedActive);
        if (parsed) {
          if (parsed.convertedPdfUrl || parsed.previewUrl || parsed.storageUrl) {
            setDocUrl(paramUrl || parsed.convertedPdfUrl || parsed.previewUrl || parsed.storageUrl);
          }
          if (parsed.fileName) {
            setDocName(paramName || parsed.fileName);
          }
          if (parsed.printConfig) {
            setPrintConfig(parsed.printConfig);
          }
        }
      }
    } catch (e) {
      console.warn('Error reading preview doc from localStorage', e);
    }

    if (paramUrl) setDocUrl(paramUrl);
    if (paramName) setDocName(paramName);
  }, []);

  // Listen for Real-Time Configuration Updates across Browser Tabs
  useEffect(() => {
    // 1. BroadcastChannel for instant cross-tab sync
    let bc: BroadcastChannel | null = null;
    try {
      bc = new BroadcastChannel('printon24_pdf_preview');
      bc.onmessage = (event) => {
        const data = event.data;
        if (!data) return;

        if (data.type === 'CONFIG_UPDATE') {
          if (!docId || data.docId === docId || !data.docId) {
            if (data.config) {
              setPrintConfig(data.config);
              toast.info(`Updated: ${data.config.printType} • ${data.config.pageSize} • ${data.config.layout}`, {
                duration: 1500
              });
            }
            if (data.doc && (data.doc.convertedPdfUrl || data.doc.storageUrl)) {
              const newUrl = data.doc.convertedPdfUrl || data.doc.storageUrl;
              setDocUrl(prev => (prev !== newUrl ? newUrl : prev));
              if (data.doc.fileName) setDocName(data.doc.fileName);
            }
          }
        } else if (data.type === 'SWITCH_DOC') {
          if (data.doc) {
            setDocId(data.doc.id || '');
            setDocName(data.doc.fileName || 'Document.pdf');
            const newUrl = data.doc.convertedPdfUrl || data.doc.previewUrl || data.doc.storageUrl;
            if (newUrl) setDocUrl(newUrl);
            if (data.doc.printConfig) setPrintConfig(data.doc.printConfig);
          }
        }
      };
    } catch (e) {
      console.warn('BroadcastChannel not supported, falling back to window storage event', e);
    }

    // 2. Storage event listener fallback
    const handleStorage = (e: StorageEvent) => {
      if (e.key === 'printon24_preview_active_doc' && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue);
          if (parsed) {
            if (parsed.printConfig) setPrintConfig(parsed.printConfig);
            if (parsed.convertedPdfUrl || parsed.storageUrl) {
              setDocUrl(parsed.convertedPdfUrl || parsed.storageUrl);
            }
            if (parsed.fileName) setDocName(parsed.fileName);
          }
        } catch {}
      }
    };
    window.addEventListener('storage', handleStorage);

    return () => {
      if (bc) bc.close();
      window.removeEventListener('storage', handleStorage);
    };
  }, [docId]);

  // Check document file format: images, office docs, or PDF
  const isImageFile = useMemo(() => {
    return (
      docName.match(/\.(jpe?g|png|webp|gif|svg)$/i) !== null ||
      docUrl.startsWith('data:image/') ||
      docUrl.match(/\.(jpe?g|png|webp)/i) !== null
    );
  }, [docName, docUrl]);

  const isRawOfficeFile = useMemo(() => {
    return (
      !isImageFile &&
      (docName.match(/\.(docx?|xlsx?|csv|pptx?)$/i) !== null || docUrl.match(/\.(docx?|xlsx?|csv|pptx?)$/i) !== null) &&
      !docUrl.includes('.pdf')
    );
  }, [docName, docUrl, isImageFile]);

  // Load PDF with PDF.js or directly handle images
  useEffect(() => {
    if (!docUrl) {
      setIsLoadingPdf(false);
      setLoadError('No document URL provided for preview.');
      return;
    }

    // Direct Image Handling: no PDF parsing required
    if (isImageFile) {
      setPdfDoc(null);
      setPdfTotalPages(1);
      setIsLoadingPdf(false);
      setLoadError(null);
      return;
    }

    // Unconverted Office Document Handling: check if converted version is in storage
    if (isRawOfficeFile) {
      setIsLoadingPdf(false);
      setLoadError('Office Document (.docx, .xlsx, .pptx) preview requires PDF conversion. The file is registered and ready for printing.');
      return;
    }

    let isCancelled = false;
    setIsLoadingPdf(true);
    setLoadError(null);

    // Timeout protection for mobile devices to prevent endless loading spinner
    const timeoutTimer = setTimeout(() => {
      if (!isCancelled) {
        setIsLoadingPdf(false);
        setLoadError('Preview timed out on this mobile device. Please check your internet connection or tap Retry.');
      }
    }, 12000);

    const loadingTask = pdfjsLib.getDocument({
      url: docUrl,
      cMapUrl: 'https://cdn.jsdelivr.net/npm/pdfjs-dist@4.10.38/cmaps/',
      cMapPacked: true,
      enableXfa: true
    } as any);

    loadingTask.promise
      .then(doc => {
        clearTimeout(timeoutTimer);
        if (!isCancelled) {
          setPdfDoc(doc);
          setPdfTotalPages(doc.numPages);
          setIsLoadingPdf(false);
        }
      })
      .catch(err => {
        clearTimeout(timeoutTimer);
        console.error('PDF.js failed to load document:', err);
        if (!isCancelled) {
          setIsLoadingPdf(false);
          setLoadError('Failed to load document preview on this device. Please verify the file is available.');
        }
      });

    return () => {
      isCancelled = true;
      clearTimeout(timeoutTimer);
    };
  }, [docUrl, isImageFile, isRawOfficeFile]);

  // Determine which page numbers are included based on Print Configuration
  const includedPages = useMemo<number[]>(() => {
    if (pdfTotalPages <= 0) return [1];

    if (printConfig.pageRangeType === 'All Pages' || printConfig.pageRangeType === 'All pages') {
      return Array.from({ length: pdfTotalPages }, (_, i) => i + 1);
    }

    if (printConfig.pageRangeType === 'Selected Pages' || printConfig.pageRangeType === 'Selected pages') {
      const raw = printConfig.selectedPageRange?.trim() || '1';
      const pages = new Set<number>();
      const parts = raw.split(/[,;\s]+/);
      for (const part of parts) {
        if (!part) continue;
        if (part.includes('-')) {
          const [startStr, endStr] = part.split('-');
          const start = parseInt(startStr, 10);
          const end = parseInt(endStr, 10);
          if (!isNaN(start) && !isNaN(end)) {
            for (let p = Math.max(1, start); p <= Math.min(pdfTotalPages, end); p++) {
              pages.add(p);
            }
          }
        } else {
          const p = parseInt(part, 10);
          if (!isNaN(p) && p >= 1 && p <= pdfTotalPages) {
            pages.add(p);
          }
        }
      }
      const sorted = Array.from(pages).sort((a, b) => a - b);
      return sorted.length > 0 ? sorted : [1];
    }

    if (printConfig.pageRangeType === 'Custom Range') {
      if (printConfig.customRanges && printConfig.customRanges.length > 0) {
        const pages = new Set<number>();
        for (const rule of printConfig.customRanges) {
          for (let p = Math.max(1, rule.fromPage); p <= Math.min(pdfTotalPages, rule.toPage); p++) {
            pages.add(p);
          }
        }
        const sorted = Array.from(pages).sort((a, b) => a - b);
        if (sorted.length > 0) return sorted;
      }
      return Array.from({ length: pdfTotalPages }, (_, i) => i + 1);
    }

    return Array.from({ length: pdfTotalPages }, (_, i) => i + 1);
  }, [pdfTotalPages, printConfig.pageRangeType, printConfig.selectedPageRange, printConfig.customRanges]);

  // Check if a specific page should be rendered in Black & White (Grayscale)
  const isPageBlackAndWhite = (pageNum: number): boolean => {
    if (printConfig.pageRangeType === 'Custom Range' && printConfig.customRanges) {
      const matched = printConfig.customRanges.find(r => pageNum >= r.fromPage && pageNum <= r.toPage);
      if (matched) {
        const pt = matched.printType as string;
        return pt === 'Black & White' || pt === 'B&W';
      }
    }
    return (
      (printConfig.printType as string) === 'Black & White' ||
      printConfig.printType === 'B&W'
    );
  };

  // Group pages per sheet (1-in-1, 2-in-1, 4-in-1)
  const groupedSheets = useMemo<number[][]>(() => {
    const pps = printConfig.pagesPerSheet || '1-in-1';
    const chunkSize = pps === '4-in-1' ? 4 : pps === '2-in-1' ? 2 : 1;
    const sheets: number[][] = [];
    for (let i = 0; i < includedPages.length; i += chunkSize) {
      sheets.push(includedPages.slice(i, i + chunkSize));
    }
    return sheets;
  }, [includedPages, printConfig.pagesPerSheet]);

  // Zoom handlers
  const handleZoomIn = () => setZoomLevel(prev => Math.min(300, prev + 15));
  const handleZoomOut = () => setZoomLevel(prev => Math.max(25, prev - 15));
  const handleRotate = () => setRotationDegrees(prev => (prev + 90) % 360);

  // Jump to page
  const handlePageInputSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const target = parseInt(currentPageInput, 10);
    if (!isNaN(target) && target >= 1 && target <= includedPages.length) {
      setActivePageIndex(target);
      const el = document.getElementById(`preview-sheet-${target - 1}`);
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } else {
      setCurrentPageInput(String(activePageIndex));
    }
  };

  // Print & Download handlers
  const handleDownload = () => {
    if (!docUrl) return;
    const link = document.createElement('a');
    link.href = docUrl;
    link.download = docName || 'document.pdf';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Downloading document...');
  };

  const handlePrint = () => {
    window.print();
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  return (
    <div className="w-screen h-screen flex flex-col bg-[#525659] text-[#e8eaed] font-sans overflow-hidden select-none">
      {/* Print-specific layout CSS ensuring true Landscape/Portrait and zero UI clutter */}
      <style>{`
        @media print {
          @page {
            size: ${printConfig.layout === 'Landscape' ? `${printConfig.pageSize || 'A4'} landscape` : `${printConfig.pageSize || 'A4'} portrait`};
            margin: 0;
          }
          body, html {
            background: #ffffff !important;
            color: #000000 !important;
            margin: 0 !important;
            padding: 0 !important;
            width: 100% !important;
            height: 100% !important;
          }
          header, aside, .no-print, [title="Presentation mode"], button, .sheet-marker {
            display: none !important;
          }
          main {
            padding: 0 !important;
            margin: 0 !important;
            background: #ffffff !important;
            overflow: visible !important;
          }
          .print-sheet {
            box-shadow: none !important;
            border: none !important;
            page-break-after: always !important;
            break-after: page !important;
            margin: 0 auto !important;
            transform: none !important;
            width: 100vw !important;
            height: 100vh !important;
            max-width: none !important;
            max-height: none !important;
            display: flex !important;
            align-items: center !important;
            justify-content: center !important;
          }
        }
      `}</style>

      {/* 1. Chrome PDF Viewer Top Toolbar (Exact Match to Preview_1791475706853.png) */}
      <header className="h-12 bg-[#323639] border-b border-[#202124] flex items-center justify-between px-2 sm:px-3 shrink-0 z-30 shadow-md">
        {/* Left Side: Back button, Drawer Toggle, Title, Page Count, Zoom, Rotate, Tools */}
        <div className="flex items-center gap-1 sm:gap-2 min-w-0 flex-1">
          {/* Back button to return to app */}
          <button
            type="button"
            onClick={() => {
              if (window.history.length > 1) {
                window.history.back();
              } else {
                window.location.href = '/';
              }
            }}
            className="p-1.5 rounded-full hover:bg-white/10 active:bg-white/20 transition-colors text-slate-300 shrink-0"
            title="Back to Document Upload"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>

          {/* Hamburger Menu (Sidebar Toggle) */}
          <button
            type="button"
            onClick={() => setIsSidebarOpen(prev => !prev)}
            className={`p-1.5 rounded-full hover:bg-white/10 active:bg-white/20 transition-colors shrink-0 ${
              isSidebarOpen ? 'text-[#8ab4f8]' : 'text-slate-300'
            }`}
            title={isSidebarOpen ? 'Close Thumbnail Sidebar' : 'Open Thumbnail Sidebar'}
          >
            <Menu className="w-5 h-5" />
          </button>

          {/* Document Title / File Name */}
          <div className="truncate max-w-[85px] xs:max-w-[125px] sm:max-w-xs md:max-w-md text-xs font-medium text-slate-200 px-1" title={docName}>
            {docName}
          </div>

          <div className="h-4 w-px bg-white/20 mx-0.5 hidden sm:block shrink-0" />

          {/* Page Counter / Jump (e.g. 1 / 1) */}
          <form onSubmit={handlePageInputSubmit} className="flex items-center gap-0.5 sm:gap-1 bg-[#202124] px-1.5 sm:px-2 py-0.5 rounded border border-white/10 text-xs shrink-0">
            <input
              type="text"
              value={currentPageInput}
              onChange={e => setCurrentPageInput(e.target.value)}
              onBlur={() => setCurrentPageInput(String(activePageIndex))}
              className="w-6 sm:w-7 text-center bg-transparent text-white font-medium focus:outline-none focus:bg-white/10 rounded"
            />
            <span className="text-slate-400">/</span>
            <span className="text-slate-400 pr-0.5 sm:pr-1">{includedPages.length}</span>
          </form>

          {/* Zoom Out (-) */}
          <button
            type="button"
            onClick={handleZoomOut}
            className="p-1.5 rounded-full hover:bg-white/10 active:bg-white/20 transition-colors text-slate-300 shrink-0"
            title="Zoom Out (-)"
          >
            <Minus className="w-4 h-4" />
          </button>

          {/* Zoom Level Indicator */}
          <span className="text-xs font-medium text-slate-300 w-9 sm:w-11 text-center shrink-0">
            {zoomLevel}%
          </span>

          {/* Zoom In (+) */}
          <button
            type="button"
            onClick={handleZoomIn}
            className="p-1.5 rounded-full hover:bg-white/10 active:bg-white/20 transition-colors text-slate-300 shrink-0"
            title="Zoom In (+)"
          >
            <Plus className="w-4 h-4" />
          </button>

          {/* Fit Width / Fit Page */}
          <button
            type="button"
            onClick={() => {
              setIsFitWidth(prev => !prev);
              setZoomLevel(isFitWidth ? 100 : 135);
            }}
            className="p-1.5 rounded-full hover:bg-white/10 active:bg-white/20 transition-colors text-slate-300 hidden sm:inline-flex shrink-0"
            title={isFitWidth ? 'Fit Page' : 'Fit to Width'}
          >
            {isFitWidth ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>

          {/* Rotate Clockwise */}
          <button
            type="button"
            onClick={handleRotate}
            className="p-1.5 rounded-full hover:bg-white/10 active:bg-white/20 transition-colors text-slate-300 hidden xs:inline-flex shrink-0"
            title="Rotate Clockwise"
          >
            <RotateCw className="w-4 h-4" />
          </button>

          {/* Pen Tool / Annotation */}
          <button
            type="button"
            onClick={() => toast.info('Pen annotation preview mode')}
            className="p-1.5 rounded-full hover:bg-white/10 active:bg-white/20 transition-colors text-slate-300 hidden md:inline-flex"
            title="Draw / Scribble"
          >
            <PenTool className="w-4 h-4" />
          </button>

          {/* Undo / Redo */}
          <button
            type="button"
            className="p-1.5 rounded-full hover:bg-white/10 active:bg-white/20 transition-colors text-slate-400 hidden lg:inline-flex"
            title="Undo"
          >
            <Undo2 className="w-4 h-4" />
          </button>
          <button
            type="button"
            className="p-1.5 rounded-full hover:bg-white/10 active:bg-white/20 transition-colors text-slate-400 hidden lg:inline-flex"
            title="Redo"
          >
            <Redo2 className="w-4 h-4" />
          </button>

          {/* Chrome Gemini AI Summarize Pill */}
          <button
            type="button"
            onClick={() => setSummarizeOpen(prev => !prev)}
            className="hidden xl:inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 hover:bg-white/20 text-xs font-medium text-white transition-all ml-1 border border-white/10"
            title="Summarize Document"
          >
            <Sparkles className="w-3.5 h-3.5 text-[#8ab4f8]" />
            <span>Summarize</span>
          </button>
        </div>

        {/* Right Side: Text, Fullscreen, Download, Print, More */}
        <div className="flex items-center gap-1 shrink-0">
          {/* Add Text */}
          <button
            type="button"
            onClick={() => toast.info('Add text annotation tool')}
            className="p-1.5 rounded-full hover:bg-white/10 active:bg-white/20 transition-colors text-slate-300 hidden sm:inline-flex"
            title="Add text"
          >
            <Type className="w-4 h-4" />
          </button>

          {/* Presentation / Fullscreen */}
          <button
            type="button"
            onClick={toggleFullscreen}
            className="p-1.5 rounded-full hover:bg-white/10 active:bg-white/20 transition-colors text-slate-300 hidden sm:inline-flex"
            title="Presentation mode"
          >
            <Expand className="w-4 h-4" />
          </button>

          {/* Download */}
          <button
            type="button"
            onClick={handleDownload}
            className="p-1.5 rounded-full hover:bg-white/10 active:bg-white/20 transition-colors text-slate-300"
            title="Download PDF"
          >
            <Download className="w-4 h-4" />
          </button>

          {/* Print */}
          <button
            type="button"
            onClick={handlePrint}
            className="p-1.5 rounded-full hover:bg-white/10 active:bg-white/20 transition-colors text-slate-300"
            title="Print Document"
          >
            <Printer className="w-4 h-4" />
          </button>

          {/* More Menu */}
          <button
            type="button"
            onClick={() => toast.info(`Print Configuration: ${printConfig.pageSize} • ${printConfig.printType} • ${printConfig.sides} • ${printConfig.copies} copies`)}
            className="p-1.5 rounded-full hover:bg-white/10 active:bg-white/20 transition-colors text-slate-300"
            title="More Options & Print Details"
          >
            <MoreVertical className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* 2. Main Workspace: Sidebar + PDF Viewer */}
      <div className="flex-1 flex min-h-0 relative overflow-hidden">
        {/* Mobile Backdrop for Sidebar Drawer */}
        {isSidebarOpen && (
          <div
            className="fixed inset-0 bg-black/60 z-30 md:hidden backdrop-blur-xs transition-opacity"
            onClick={() => setIsSidebarOpen(false)}
          />
        )}

        {/* Left Sidebar (Thumbnails / Outline) */}
        {isSidebarOpen && (
          <aside className="fixed md:static inset-y-12 left-0 z-40 w-60 sm:w-64 bg-[#282c2f] border-r border-[#494c4f] flex flex-col shrink-0 shadow-2xl md:shadow-none transition-all">
            {/* Sidebar Top Nav Tabs (Thumbnails vs Document Outline) */}
            <div className="flex items-center border-b border-[#494c4f] px-2 py-1.5 gap-2 bg-[#202124]">
              <button
                type="button"
                onClick={() => setSidebarTab('thumbnails')}
                className={`p-1.5 rounded hover:bg-white/10 transition-colors ${
                  sidebarTab === 'thumbnails' ? 'text-[#8ab4f8] bg-white/10' : 'text-slate-400'
                }`}
                title="Page Thumbnails"
              >
                <ImageIcon className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setSidebarTab('outline')}
                className={`p-1.5 rounded hover:bg-white/10 transition-colors ${
                  sidebarTab === 'outline' ? 'text-[#8ab4f8] bg-white/10' : 'text-slate-400'
                }`}
                title="Document Outline"
              >
                <ListIcon className="w-4 h-4" />
              </button>
              <div className="ml-auto text-[10px] font-mono text-slate-400">
                {includedPages.length} {includedPages.length === 1 ? 'page' : 'pages'}
              </div>
            </div>

            {/* Sidebar Content */}
            <div className="flex-1 overflow-y-auto p-3 space-y-4">
              {sidebarTab === 'thumbnails' ? (
                groupedSheets.map((sheetPages, sheetIdx) => {
                  const isActive = activePageIndex === sheetIdx + 1;
                  return (
                    <div
                      key={sheetIdx}
                      onClick={() => {
                        setActivePageIndex(sheetIdx + 1);
                        setCurrentPageInput(String(sheetIdx + 1));
                        const el = document.getElementById(`preview-sheet-${sheetIdx}`);
                        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
                        if (typeof window !== 'undefined' && window.innerWidth < 768) {
                          setIsSidebarOpen(false);
                        }
                      }}
                      className="cursor-pointer group flex flex-col items-center gap-1.5"
                    >
                      {/* Miniature Sheet Thumbnail Container */}
                      <div
                        className={`w-36 ${printConfig.layout === 'Landscape' ? 'aspect-[1.414/1]' : 'aspect-[1/1.414]'} bg-white rounded-xs p-1 shadow-md transition-all ${
                          isActive
                            ? 'ring-2 ring-[#8ab4f8] shadow-lg shadow-black/50'
                            : 'hover:ring-1 hover:ring-white/40'
                        }`}
                      >
                        {pdfDoc || isImageFile ? (
                          <div className={`grid ${sheetPages.length > 1 ? 'grid-cols-2 gap-1' : 'grid-cols-1'} h-full items-center justify-center`}>
                            {sheetPages.map(pageNum => (
                              <ThumbnailCanvas
                                key={pageNum}
                                pdfDoc={pdfDoc}
                                imageUrl={isImageFile ? docUrl : undefined}
                                pageNum={pageNum}
                                isBw={isPageBlackAndWhite(pageNum)}
                                rotation={rotationDegrees}
                              />
                            ))}
                          </div>
                        ) : (
                          <div className="w-full h-full bg-slate-100 flex items-center justify-center text-slate-400 text-xs">
                            <FileText className="w-6 h-6 animate-pulse" />
                          </div>
                        )}
                      </div>
                      <span
                        className={`text-xs font-medium ${
                          isActive ? 'text-[#8ab4f8]' : 'text-slate-400 group-hover:text-slate-200'
                        }`}
                      >
                        {sheetIdx + 1}
                      </span>
                    </div>
                  );
                })
              ) : (
                <div className="p-2 text-xs text-slate-400">
                  <p className="font-semibold text-slate-300 mb-2">Table of Contents</p>
                  <p className="text-[11px] leading-relaxed">
                    Document outline generated automatically from PDF metadata. All {pdfTotalPages} source pages parsed.
                  </p>
                </div>
              )}
            </div>
          </aside>
        )}

        {/* Center Main Viewport (Canvas Sheets Scroll Area) */}
        <main
          ref={containerRef}
          className="flex-1 overflow-y-auto overflow-x-auto bg-[#525659] p-2.5 sm:p-6 md:p-8 flex flex-col items-center gap-4 sm:gap-6 w-full"
        >
          {isLoadingPdf ? (
            <div className="m-auto flex flex-col items-center gap-3 text-slate-300">
              <Loader2 className="w-10 h-10 animate-spin text-[#8ab4f8]" />
              <p className="text-sm font-medium">Rendering PDF with PDF.js Worker...</p>
            </div>
          ) : loadError ? (
            <div className="m-auto max-w-md bg-[#323639] border border-red-500/30 rounded-2xl p-6 text-center space-y-3 text-slate-200">
              <AlertTriangle className="w-10 h-10 text-amber-400 mx-auto" />
              <h3 className="text-base font-bold">Document Preview Unavailable</h3>
              <p className="text-xs text-slate-400">{loadError}</p>
              <button
                type="button"
                onClick={() => window.location.reload()}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#8ab4f8] text-[#202124] text-xs font-bold hover:bg-[#a6c8ff]"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Retry Loading</span>
              </button>
            </div>
          ) : (pdfDoc || isImageFile) && groupedSheets.length > 0 ? (
            groupedSheets.map((sheetPages, sheetIdx) => {
              const isLandscape = printConfig.layout === 'Landscape';

              const PAGE_DIMENSIONS: Record<string, { w: number; h: number }> = {
                A4: { w: 595, h: 842 },
                A3: { w: 842, h: 1191 },
                Letter: { w: 612, h: 792 },
                Legal: { w: 612, h: 1008 },
                Bond: { w: 612, h: 792 },
                Executive: { w: 522, h: 756 }
              };
              const selectedSize = (printConfig.pageSize || 'A4') as string;
              const baseDim = PAGE_DIMENSIONS[selectedSize] || PAGE_DIMENSIONS.A4;
              const sheetWidth = isLandscape ? baseDim.h : baseDim.w;
              const sheetHeight = isLandscape ? baseDim.w : baseDim.h;

              // Responsive Auto-Fit Scaling across mobile (<640px), tablet (<1024px), laptop, and desktop
              const isMobile = containerWidth < 640;
              const isTablet = containerWidth >= 640 && containerWidth < 1024;
              const paddingX = isMobile ? 16 : isTablet ? 32 : 48;
              const usableWidth = Math.max(260, containerWidth - paddingX);
              const autoScale = Math.min(1.0, usableWidth / sheetWidth);
              const scaleFactor = (zoomLevel / 100) * (autoScale < 1.0 ? autoScale : 1.0);

              // Compute inner printable slot dimensions preserving balanced margins
              // Small appropriate margins on all four sides (16px per side = 32px total padding)
              const margin = 16;
              const padX = margin * 2;
              const padY = margin * 2;
              const pps = printConfig.pagesPerSheet || '1-in-1';
              let slotW = sheetWidth - padX;
              let slotH = sheetHeight - padY;
              if (pps === '2-in-1') {
                if (isLandscape) {
                  // 2-in-1 Landscape sheet: 2 pages side-by-side
                  slotW = Math.floor((sheetWidth - padX - 16) / 2);
                  slotH = sheetHeight - padY;
                } else {
                  // 2-in-1 Portrait sheet: 2 pages stacked vertically top-and-bottom
                  slotW = sheetWidth - padX;
                  slotH = Math.floor((sheetHeight - padY - 16) / 2);
                }
              } else if (pps === '4-in-1') {
                // 4-in-1: 2x2 grid in both Portrait and Landscape
                slotW = Math.floor((sheetWidth - padX - 16) / 2);
                slotH = Math.floor((sheetHeight - padY - 16) / 2);
              }

              const scaledWidth = Math.round(sheetWidth * scaleFactor);
              const scaledHeight = Math.round(sheetHeight * scaleFactor);

              return (
                <div
                  key={sheetIdx}
                  id={`preview-sheet-${sheetIdx}`}
                  style={{
                    width: `${scaledWidth}px`,
                    marginBottom: '28px'
                  }}
                  className="transition-all duration-150 flex flex-col items-center shrink-0 mx-auto"
                >
                  {/* Paper Sheet Scaled Bounding Box */}
                  <div
                    style={{
                      width: `${scaledWidth}px`,
                      height: `${scaledHeight}px`,
                      position: 'relative'
                    }}
                    className="overflow-hidden"
                  >
                    <div
                      style={{
                        transform: `scale(${scaleFactor})`,
                        transformOrigin: 'top left',
                        width: `${sheetWidth}px`,
                        height: `${sheetHeight}px`,
                        padding: `${margin}px`,
                        boxSizing: 'border-box'
                      }}
                      className="print-sheet bg-white text-slate-900 rounded-xs shadow-[0_4px_16px_rgba(0,0,0,0.5)] overflow-hidden flex items-center justify-center"
                    >
                      {/* Inner Pages per Sheet layout (1-in-1, 2-in-1, 4-in-1) */}
                      <div
                        className={`w-full h-full ${
                          pps === '1-in-1'
                            ? 'flex items-center justify-center'
                            : pps === '2-in-1'
                            ? (isLandscape
                                ? 'flex flex-row items-center justify-center gap-4'
                                : 'flex flex-col items-center justify-center gap-4')
                            : 'grid grid-cols-2 grid-rows-2 gap-4 items-center justify-center'
                        }`}
                      >
                        {sheetPages.map(pageNum => (
                          <PageCanvas
                            key={pageNum}
                            pdfDoc={pdfDoc}
                            imageUrl={isImageFile ? docUrl : undefined}
                            pageNum={pageNum}
                            isBw={isPageBlackAndWhite(pageNum)}
                            rotation={rotationDegrees}
                            isLandscape={isLandscape}
                            availWidth={slotW}
                            availHeight={slotH}
                          />
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Sheet Number Marker */}
                  <div className="sheet-marker text-[11px] font-mono text-slate-300 mt-2 bg-black/40 px-2.5 py-0.5 rounded-full">
                    Page {sheetIdx + 1} of {groupedSheets.length}
                  </div>
                </div>
              );
            })
          ) : (
            <div className="m-auto text-slate-400 text-sm">
              No printable pages matching configuration.
            </div>
          )}
        </main>
      </div>

      {/* Summarize AI Drawer Popup */}
      {summarizeOpen && (
        <div className="fixed bottom-4 right-4 z-50 w-80 bg-[#323639] border border-white/20 rounded-2xl shadow-2xl p-4 text-xs space-y-2 animate-in slide-in-from-bottom-5">
          <div className="flex items-center justify-between border-b border-white/10 pb-2">
            <span className="font-bold flex items-center gap-1.5 text-white">
              <Sparkles className="w-4 h-4 text-[#8ab4f8]" />
              Document Executive Summary
            </span>
            <button
              type="button"
              onClick={() => setSummarizeOpen(false)}
              className="text-slate-400 hover:text-white"
            >
              ✕
            </button>
          </div>
          <p className="text-slate-300 text-[11px] leading-relaxed">
            <strong>{docName}</strong> contains {pdfTotalPages} pages, rendered with high-fidelity Gotenberg LibreOffice conversion. Filtered preview active with {includedPages.length} billable pages.
          </p>
        </div>
      )}
    </div>
  );
};

// Sub-Component: Page Canvas rendered with PDF.js or direct Image
const PageCanvas: React.FC<{
  pdfDoc: pdfjsLib.PDFDocumentProxy | null;
  pageNum: number;
  isBw: boolean;
  rotation: number;
  isLandscape: boolean;
  availWidth: number;
  availHeight: number;
  imageUrl?: string;
}> = ({ pdfDoc, pageNum, isBw, rotation, isLandscape, availWidth, availHeight, imageUrl }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [renderError, setRenderError] = useState<string | null>(null);
  const [canvasDim, setCanvasDim] = useState<{ width: number; height: number }>({ width: 0, height: 0 });

  useEffect(() => {
    if (!pdfDoc) return;

    let isCancelled = false;
    let renderTask: any = null;

    pdfDoc
      .getPage(pageNum)
      .then(page => {
        if (isCancelled) return;

        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // Upright document content: preserve natural vertical readability and entire original content
        const totalRotation = rotation % 360;
        const orientedVp = page.getViewport({ scale: 1.0, rotation: totalRotation });
        const orientedW = orientedVp.width || 595;
        const orientedH = orientedVp.height || 842;

        // Proportional fit preserving complete original document content from start to finish
        // In both Landscape and Portrait, no edges, headers, tables, or footers are clipped or truncated
        const fitScale = Math.min(availWidth / orientedW, availHeight / orientedH);
        const fittedW = Math.max(10, Math.floor(orientedW * fitScale));
        const fittedH = Math.max(10, Math.floor(orientedH * fitScale));

        setCanvasDim({ width: fittedW, height: fittedH });

        // High-DPI crisp rendering
        const dpr = Math.max(window.devicePixelRatio || 1, 2);
        const renderViewport = page.getViewport({ scale: fitScale * dpr, rotation: totalRotation });

        canvas.width = renderViewport.width;
        canvas.height = renderViewport.height;

        renderTask = page.render({
          canvasContext: ctx,
          viewport: renderViewport,
          canvas: canvas
        } as any);

        return renderTask.promise;
      })
      .catch(err => {
        if (!isCancelled) {
          console.error(`Error rendering page ${pageNum}:`, err);
          setRenderError(`Page ${pageNum} failed to render`);
        }
      });

    return () => {
      isCancelled = true;
      if (renderTask && renderTask.cancel) {
        renderTask.cancel();
      }
    };
  }, [pdfDoc, pageNum, rotation, isLandscape, availWidth, availHeight]);

  if (imageUrl) {
    return (
      <div
        style={{ width: `${availWidth}px`, height: `${availHeight}px` }}
        className="flex items-center justify-center overflow-hidden relative"
      >
        <img
          src={imageUrl}
          alt={`Document Page ${pageNum}`}
          style={{
            maxWidth: `${availWidth}px`,
            maxHeight: `${availHeight}px`,
            transform: `rotate(${rotation}deg)`,
            filter: isBw ? 'grayscale(100%) contrast(115%)' : 'none'
          }}
          className="block object-contain rounded-xs shadow-xs transition-all duration-100"
        />
      </div>
    );
  }

  return (
    <div
      style={{ width: `${availWidth}px`, height: `${availHeight}px` }}
      className="flex items-center justify-center overflow-hidden relative"
    >
      {renderError ? (
        <div className="p-4 text-xs text-red-500 bg-red-50 rounded">
          {renderError}
        </div>
      ) : (
        <canvas
          ref={canvasRef}
          className="block rounded-xs shadow-xs transition-all duration-100"
          style={{
            width: canvasDim.width > 0 ? `${canvasDim.width}px` : undefined,
            height: canvasDim.height > 0 ? `${canvasDim.height}px` : undefined,
            filter: isBw ? 'grayscale(100%) contrast(115%)' : 'none'
          }}
        />
      )}
    </div>
  );
};

// Sub-Component: Miniature Sidebar Thumbnail Canvas
const ThumbnailCanvas: React.FC<{
  pdfDoc: pdfjsLib.PDFDocumentProxy | null;
  pageNum: number;
  isBw: boolean;
  rotation: number;
  imageUrl?: string;
}> = ({ pdfDoc, pageNum, isBw, rotation, imageUrl }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!pdfDoc) return;
    let isCancelled = false;
    let renderTask: any = null;

    pdfDoc
      .getPage(pageNum)
      .then(page => {
        if (isCancelled) return;
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const viewport = page.getViewport({ scale: 0.25, rotation });
        canvas.width = viewport.width;
        canvas.height = viewport.height;

        renderTask = page.render({
          canvasContext: ctx,
          viewport,
          canvas: canvas
        } as any);

        return renderTask.promise;
      })
      .catch(() => {});

    return () => {
      isCancelled = true;
      if (renderTask && renderTask.cancel) {
        renderTask.cancel();
      }
    };
  }, [pdfDoc, pageNum, rotation]);

  if (imageUrl) {
    return (
      <img
        src={imageUrl}
        alt={`Thumbnail ${pageNum}`}
        className="w-full h-auto block rounded-xs object-contain"
        style={{
          filter: isBw ? 'grayscale(100%)' : 'none',
          transform: `rotate(${rotation}deg)`
        }}
      />
    );
  }

  return (
    <canvas
      ref={canvasRef}
      className="w-full h-auto block rounded-xs"
      style={{
        filter: isBw ? 'grayscale(100%)' : 'none'
      }}
    />
  );
};
