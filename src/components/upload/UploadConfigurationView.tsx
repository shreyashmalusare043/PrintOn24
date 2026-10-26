import React, { useState, useRef, useEffect } from 'react';
import {
  UploadCloud,
  FolderOpen,
  FileText,
  Trash2,
  RefreshCw,
  Settings2,
  File,
  Layers,
  Copy,
  Smartphone,
  Maximize2,
  Grid,
  CheckCircle2,
  ArrowRight,
  HardDrive,
  ImageIcon,
  Wand2,
  Plus,
  Minus,
  Sparkles,
  Crown,
  User,
  ShieldCheck,
  Check,
  X,
  FilePlus,
  AlertCircle,
  Table,
  Presentation,
  Eye,
  ExternalLink,
  ChevronRight
} from 'lucide-react';
import { usePrintPerfect } from '../../contexts/PrintPerfectContext';
import { ImageEditorModal } from './ImageEditorModal';
import type { CustomPageRangeRule, ImageEditingState, UploadedDoc } from '../../types/printperfect';
import { toast } from 'sonner';
import { fetchUploadPageAds, getShopAvailablePaperSizes, getShopPaperPricingDetails, type UploadPageAdItem } from '../../services/api';
import { formatFullName } from '../../utils/nameFormat';
import { supabase } from '../../db/supabase';
import { UniformAlertModal } from '../common/UniformAlertModal';
import { getPrintModeEligibility, type PrintSides, type PrintType } from '../../lib/printEligibility';

interface UploadConfigurationViewProps {
  onProceedToCheckout: () => void;
  onBackToHome?: () => void;
}

export const UploadConfigurationView: React.FC<UploadConfigurationViewProps> = ({
  onProceedToCheckout
}) => {
  const neutralSuccessToastStyle: React.CSSProperties = {
    background: '#fff',
    color: '#111827',
    border: '1px solid #e5e7eb'
  };

  const {
    user,
    updateUser,
    selectedEnterprise,
    hasExplicitlySelectedEnterprise,
    currentDoc,
    setCurrentDoc,
    uploadedDocs,
    selectDocument,
    uploadNewDoc,
    uploadMultipleDocs,
    removeCurrentDoc,
    removeUploadedDoc,
    updateDocEditing,
    updateDocImageOutput,
    reconvertDocument,
    validateSelectedPageRange,
    validateCustomRanges,
    isDocConfigValid,
    printConfig,
    updatePrintConfig: updatePrintConfigContext,
    applyPrintConfigToDocuments,
    priceCalc,
    currentDocPriceCalc,
    getDocPrice,
    clearUploadSession
  } = usePrintPerfect();
  const [selectedConfigTargetIds, setSelectedConfigTargetIds] = useState<string[]>([]);
  const updatePrintConfig = (updates: Parameters<typeof updatePrintConfigContext>[0]) => {
    updatePrintConfigContext(updates);
  };

  // Fresh Upload Session: clear any previous/recent documents when entering upload view
  useEffect(() => {
    clearUploadSession();
  }, []);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [showDocSwitcher, setShowDocSwitcher] = useState(false);

  // Customer Name: empty for guests, auto-filled for logged-in users with deduplicated surname
  const [customerName, setCustomerName] = useState(() => {
    if (user.isAuthenticated && !user.isGuest && user.name && user.name.trim() !== 'Guest' && user.name.trim() !== 'Customer' && user.name.trim() !== 'Guest User') {
      return formatFullName(user.name, user.surname);
    }
    return '';
  });

  // Keep guest name field empty on initial visit / tab reset, formatted on login
  useEffect(() => {
    if (user.isAuthenticated && !user.isGuest && user.name) {
      setCustomerName(formatFullName(user.name, user.surname));
    } else if (!user.isAuthenticated || user.isGuest) {
      setCustomerName('');
    }
  }, [user.isAuthenticated, user.isGuest, user.name, user.surname]);

  const [activeDisabledTooltip, setActiveDisabledTooltip] = useState<'side' | 'type' | null>(null);
  const customRangeTooltipTitle = "Custom range is selected, so Print Side / Print Type can't be changed.";
  const customRangeTooltipSubtitle = "Remove the custom range to choose these options.";
  const customRangeTooltipText = `${customRangeTooltipTitle}\n${customRangeTooltipSubtitle}`;

  // Single page single copy check: Back-to-Back disabled when 1 page + 1 copy, enabled when copies > 1
  // Applies both to 1-page total docs AND when custom range / selected pages is 1 page (e.g. 1-1, 2-2, 3-3)
  const isSelectedRangeSinglePage = React.useMemo(() => {
    if (printConfig.pageRangeType === 'Selected Pages' || printConfig.pageRangeType === 'Selected pages') {
      const totalPages = Math.max(1, currentDoc?.totalPages || 1);
      const res = validateSelectedPageRange(printConfig.selectedPageRange, totalPages);
      return res.isValid ? res.pageCount === 1 : (currentDoc?.totalPages || 1) <= 1;
    }
    return (currentDoc?.totalPages || 1) <= 1;
  }, [printConfig.pageRangeType, printConfig.selectedPageRange, currentDoc?.totalPages]);

  const isSinglePageSingleCopy = isSelectedRangeSinglePage && printConfig.copies <= 1;

  // Requirement 2.3: Selected Pages eligibility:
  // If user uploads a single page then selected page option should be disabled.
  // If user increases copies > 1, Selected page option should be eligible / active.
  const isSelectedPagesEligible = (currentDoc?.totalPages || 1) > 1 || printConfig.copies > 1;
  const documentPageCount = currentDoc?.totalPages || 0;
  const isPagesPerSheetOptionEligible = (option: '1-in-1' | '2-in-1' | '4-in-1') => {
    if (option === '1-in-1' || documentPageCount === 0) return true;
    if (option === '2-in-1') return documentPageCount >= 2;
    return documentPageCount >= 3;
  };

  useEffect(() => {
    if (
      printConfig.pagesPerSheet &&
      !isPagesPerSheetOptionEligible(printConfig.pagesPerSheet)
    ) {
      updatePrintConfig({ pagesPerSheet: '1-in-1' });
    }
  }, [currentDoc?.id, currentDoc?.totalPages, printConfig.pagesPerSheet]);

  useEffect(() => {
    if (!isSelectedPagesEligible && (printConfig.pageRangeType === 'Selected Pages' || printConfig.pageRangeType === 'Selected pages')) {
      updatePrintConfig({ pageRangeType: 'All Pages' });
    }
  }, [isSelectedPagesEligible, printConfig.pageRangeType]);

  useEffect(() => {
    if (isSinglePageSingleCopy && printConfig.sides === 'Back to Back') {
      updatePrintConfig({ sides: 'Single Side' });
    }
  }, [isSinglePageSingleCopy, printConfig.sides]);

  // Point 7: Enforce Back-to-Back rule in Custom Range
  // If startPage === endPage (1 page) and copies <= 1, Back-to-Back is disabled and reset to Single Side
  useEffect(() => {
    if (printConfig.customRanges && printConfig.customRanges.length > 0) {
      let changed = false;
      const updated = printConfig.customRanges.map(r => {
        const f = Number(r.fromPage);
        const t = Number(r.toPage);
        if (!isNaN(f) && !isNaN(t) && f === t && printConfig.copies <= 1 && r.sides === 'Back to Back') {
          changed = true;
          return { ...r, sides: 'Single Side' as const };
        }
        return r;
      });
      if (changed) {
        updatePrintConfig({ customRanges: updated });
      }
    }
  }, [printConfig.customRanges, printConfig.copies]);

  // Terms and Conditions Modal State
  const [isTermsModalOpen, setIsTermsModalOpen] = useState(false);
  const [hasAgreedTerms, setHasAgreedTerms] = useState(false);

  // Dynamic paper sizes loaded from shop_pricing and shop_printers for connected shop (Requirement 5 & 6)
  const [availablePaperSizes, setAvailablePaperSizes] = useState<string[]>([]);
  const [isLoadingPaperSizes, setIsLoadingPaperSizes] = useState<boolean>(false);

  useEffect(() => {
    if (selectedEnterprise?.id) {
      // Clear previous shop's options immediately so they are never retained across shop changes
      setAvailablePaperSizes([]);
      setIsLoadingPaperSizes(true);
      let isCurrentShop = true;

      getShopPaperPricingDetails(selectedEnterprise.id)
        .then(details => {
          if (!isCurrentShop) return;
          setIsLoadingPaperSizes(false);
          const sizes = details.sizes;
          setAvailablePaperSizes(sizes);

          if (printConfig.paperType !== 'Normal') {
            updatePrintConfig({ paperType: 'Normal' });
          }

          // Apply defaults only when creating fresh configuration or when no saved valid selection exists
          // 1. If A4 is configured and available for the selected shop, select it by default.
          // 2. If A4 is unavailable, do NOT silently select an unsupported size; require valid selection.
          const currentSize = printConfig.pageSize;
          if (!currentSize || !sizes.includes(currentSize)) {
            if (sizes.includes('A4')) {
              updatePrintConfig({ pageSize: 'A4' });
            } else {
              updatePrintConfig({ pageSize: '' as any });
            }
          }

          // Ensure standard defaults are applied if missing
          if (!printConfig.copies || printConfig.copies < 1) {
            updatePrintConfig({ copies: 1 });
          }
          if (!printConfig.pageRangeType) {
            updatePrintConfig({ pageRangeType: 'All Pages' });
          }
          if (!printConfig.pagesPerSheet) {
            updatePrintConfig({ pagesPerSheet: '1-in-1' });
          }
        })
        .catch(err => {
          if (!isCurrentShop) return;
          console.error('Failed to load shop paper sizes:', err);
          setIsLoadingPaperSizes(false);
        });

      return () => {
        isCurrentShop = false;
      };
    } else {
      setAvailablePaperSizes([]);
      setIsLoadingPaperSizes(false);
    }
  }, [selectedEnterprise?.id]);

  // Validation modal state for pre-checkout configuration checks (Requirement 2.2)
  const [validationModalInfo, setValidationModalInfo] = useState<{
    isOpen: boolean;
    title: string;
    description: string;
  }>({
    isOpen: false,
    title: '',
    description: ''
  });

  // Dynamic Upload Page Ads from upload_page_ads table
  const [uploadAds, setUploadAds] = useState<UploadPageAdItem[]>([]);

  useEffect(() => {
    let isMounted = true;
    fetchUploadPageAds().then(ads => {
      if (isMounted) setUploadAds(ads);
    });

    const channel = supabase
      .channel('public:upload_page_ads_live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'upload_page_ads' }, () => {
        fetchUploadPageAds().then(ads => {
          if (isMounted) setUploadAds(ads);
        });
      })
      .subscribe();

    return () => {
      isMounted = false;
      supabase.removeChannel(channel);
    };
  }, []);

  // Real-time synchronization of print configuration to open Chrome PDF preview tab
  useEffect(() => {
    if (currentDoc) {
      const activePayload = {
        ...currentDoc,
        printConfig
      };
      try {
        localStorage.setItem('printon24_preview_active_doc', JSON.stringify(activePayload));
        const bc = new BroadcastChannel('printon24_pdf_preview');
        bc.postMessage({
          type: 'CONFIG_UPDATE',
          docId: currentDoc.id,
          config: printConfig,
          doc: activePayload
        });
        bc.close();
      } catch {}
    }
  }, [printConfig, currentDoc]);

  // 1. Real-time file upload simulation progress
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [uploadFileName, setUploadFileName] = useState<string>('');
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'uploading' | 'completed'>('idle');

  // 2. Image Editor Modal State
  const [isImageEditorOpen, setIsImageEditorOpen] = useState(false);
  const [activeSheet, setActiveSheet] = useState<string>('Summary');
  const [activeScaling, setActiveScaling] = useState<'No Scaling' | 'Fit Sheet on One Page' | 'Fit All Columns on One Page' | 'Fit All Rows on One Page'>('No Scaling');
  const [isReconverting, setIsReconverting] = useState(false);

  // Sync active sheet & scaling when currentDoc changes
  useEffect(() => {
    if (currentDoc) {
      if (currentDoc.excelScaling) {
        setActiveScaling(currentDoc.excelScaling);
      } else if (currentDoc.printConfig?.excelScaling) {
        setActiveScaling(currentDoc.printConfig.excelScaling);
      }
      if (currentDoc.selectedSheet) {
        setActiveSheet(currentDoc.selectedSheet);
      }
    }
  }, [currentDoc?.id, currentDoc?.excelScaling, currentDoc?.selectedSheet]);

  const isImageFile =
    currentDoc?.fileType === 'JPG' ||
    currentDoc?.fileType === 'PNG' ||
    currentDoc?.fileName?.match(/\.(jpg|jpeg|png|webp)$/i);

  // Dynamic file page & orientation detection helper
  // Requirement 3: If an uploaded image, PPT, or document has landscape dimensions, automatically select landscape orientation by default.
  const detectFilePages = async (file: File): Promise<{ pages: number; imageUrl?: string; orientation?: 'Portrait' | 'Landscape' }> => {
    const isImg = file.type.startsWith('image/') || /\.(jpg|jpeg|png|webp)$/i.test(file.name);
    if (isImg) {
      const url = URL.createObjectURL(file);
      try {
        const orient = await new Promise<'Portrait' | 'Landscape'>((resolve) => {
          const img = new Image();
          img.onload = () => {
            resolve(img.naturalWidth > img.naturalHeight ? 'Landscape' : 'Portrait');
          };
          img.onerror = () => resolve('Portrait');
          img.src = url;
        });
        return { pages: 1, imageUrl: url, orientation: orient };
      } catch {
        return { pages: 1, imageUrl: url };
      }
    }

    // PPT / PPTX: detect slide count and default to Landscape
    if (file.name.match(/\.pptx?$/i) || file.type.includes('presentation')) {
      let pages = 1;
      try {
        const buffer = await file.arrayBuffer();
        const text = new TextDecoder('latin1').decode(buffer);
        const slideMatches = text.match(/ppt\/slides\/slide\d+\.xml/g);
        if (slideMatches && slideMatches.length > 0) {
          const uniqueSlides = new Set(slideMatches).size;
          if (uniqueSlides > 0) pages = uniqueSlides;
        }
      } catch {}
      return { pages, orientation: 'Landscape' };
    }

    // DOC / DOCX: detect page count and default to Portrait
    if (file.name.match(/\.docx?$/i) || file.type.includes('word')) {
      return { pages: 1, orientation: 'Portrait' };
    }

    // Excel defaults to Landscape
    if (file.name.match(/\.(xlsx?|csv)$/i) || file.type.includes('sheet')) {
      return { pages: 1, orientation: 'Landscape' };
    }

    // PDF / other Office files: default to 1 page
    return { pages: 1 };
  };

  // Real-time Upload Runner with Secure Storage Upload & 12h Expiry
  const startUploadSimulation = async (files: FileList | File[]) => {
    const fileList = Array.from(files);
    if (fileList.length === 0) return;

    if (fileList.length === 1) {
      const file = fileList[0];
      setUploadFileName(file.name);
      setUploadStatus('uploading');
      setUploadProgress(15);

      // Smooth progression ticker preventing any 50% stall
      let progressVal = 15;
      const ticker = setInterval(() => {
        progressVal = Math.min(progressVal + 7, 92);
        setUploadProgress(progressVal);
      }, 120);

      try {
        const detectedInfo = await detectFilePages(file);
        await uploadNewDoc(file, {
          totalPages: detectedInfo.pages,
          imageUrl: detectedInfo.imageUrl,
          orientation: detectedInfo.orientation
        });

        clearInterval(ticker);

        setUploadProgress(100);
        setUploadStatus('completed');
        toast.success(`'${file.name}' uploaded successfully!`, {
          style: neutralSuccessToastStyle
        });

        // Requirement 19: For JPG/JPEG/PNG, open A4 Canvas Editor by default
        if (file.type.startsWith('image/') || /\.(jpe?g|png|webp)$/i.test(file.name)) {
          setTimeout(() => setIsImageEditorOpen(true), 300);
        }

        setTimeout(() => {
          setUploadStatus('idle');
          setUploadProgress(null);
        }, 1000);
      } catch (err) {
        clearInterval(ticker);
        console.error('File upload failed:', err);
        setUploadStatus('idle');
        setUploadProgress(null);
      }
    } else {
      // Multiple files uploaded at once or added
      setUploadFileName(`${fileList.length} files`);
      setUploadStatus('uploading');
      setUploadProgress(10);

      let multiProgress = 10;
      const multiTicker = setInterval(() => {
        multiProgress = Math.min(multiProgress + 5, 90);
        setUploadProgress(multiProgress);
      }, 150);

      try {
        for (let i = 0; i < fileList.length; i++) {
          const f = fileList[i];
          const detected = await detectFilePages(f);
          await uploadNewDoc(f, {
            totalPages: detected.pages,
            imageUrl: detected.imageUrl,
            orientation: detected.orientation
          });
        }

        clearInterval(multiTicker);
        setUploadProgress(100);
        setUploadStatus('completed');
        toast.success(`${fileList.length} files uploaded successfully!`, {
          style: neutralSuccessToastStyle
        });
        setTimeout(() => {
          setUploadStatus('idle');
          setUploadProgress(null);
        }, 1000);
      } catch (err) {
        clearInterval(multiTicker);
        console.error('Multi-file upload failed:', err);
        setUploadStatus('idle');
        setUploadProgress(null);
      }
    }
  };

  const handleFileDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (!hasExplicitlySelectedEnterprise) {
      toast.error('Select/Connect Printing Shop First');
      return;
    }
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      startUploadSimulation(e.dataTransfer.files);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!hasExplicitlySelectedEnterprise) {
      toast.error('Select/Connect Printing Shop First');
      e.target.value = '';
      return;
    }
    if (e.target.files && e.target.files.length > 0) {
      startUploadSimulation(e.target.files);
      e.target.value = '';
    }
  };

  const handleProceedClick = () => {
    if (!hasExplicitlySelectedEnterprise) {
      toast.error('Select/Connect Printing Shop First');
      return;
    }
    const allDocs = uploadedDocs.length > 0 ? uploadedDocs : (currentDoc ? [currentDoc] : []);
    if (allDocs.length === 0) {
      toast.error('Please upload at least one document before sending for print.');
      fileInputRef.current?.click();
      return;
    }

    if (!customerName || !customerName.trim()) {
      toast.error('Please Enter Your Name!', {
        style: neutralSuccessToastStyle
      });
      return;
    }
    // Update user name for the order (for guests, updateUser stores strictly in sessionStorage without syncing to DB)
    updateUser({ name: customerName.trim() });

    // Synchronize latest in-memory print configuration across active document
    if (currentDoc) {
      updatePrintConfig(printConfig);
    }
    const synchronizedDocs = allDocs.map(d =>
      d.id === currentDoc?.id ? { ...d, printConfig } : d
    );

    // Per-document readiness validation: Block progression if ANY document is incomplete or invalid
    const invalidDocs = synchronizedDocs.filter(d => !isDocConfigValid(d).isValid);

    if (invalidDocs.length > 0) {
      const firstInvalid = invalidDocs[0];
      const val = isDocConfigValid(firstInvalid);
      setValidationModalInfo({
        isOpen: true,
        title: 'Print Configuration Required',
        description: val.error || `Please select Print Type, Print Side, and Paper Size for "${firstInvalid.fileName}" before moving to payment.`
      });
      selectDocument(firstInvalid.id);
      return;
    }

    if (!priceCalc.isValid) {
      toast.error(priceCalc.error || 'The selected shop has not configured a valid price for this print setup.');
      return;
    }

    // Open Terms & Conditions modal before print checkout
    setIsTermsModalOpen(true);
  };

  const handleConfirmTermsAndCheckout = () => {
    if (!hasAgreedTerms) {
      toast.error('Please accept the Terms & Conditions to send your print job.');
      return;
    }
    setIsTermsModalOpen(false);
    onProceedToCheckout();
  };

  // Copies Handler: allow up to 3 digits (1 to 999) with live price update
  const handleCopiesChange = (delta: number) => {
    const nextVal = Math.max(1, Math.min(999, printConfig.copies + delta));
    updatePrintConfig({ copies: nextVal });
  };

  const handleManualCopiesInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    if (raw === '') {
      updatePrintConfig({ copies: 1 });
      return;
    }
    const val = parseInt(raw, 10);
    if (!isNaN(val)) {
      const clamped = Math.max(1, Math.min(999, Math.floor(val)));
      updatePrintConfig({ copies: clamped });
    }
  };

  const currentRules: CustomPageRangeRule[] = printConfig.customRanges || [];
  const isCustomRange = printConfig.pageRangeType === 'Custom Range';

  const handleDisabledGlobalControlClick = (type: 'side' | 'type') => (e: React.MouseEvent) => {
    if (isCustomRange) {
      e.preventDefault();
      e.stopPropagation();
      setActiveDisabledTooltip(prev => prev === type ? null : type);
    }
  };

  const handlePageRangeModeChange = (mode: 'All Pages' | 'Selected Pages' | 'Custom Range') => {
    if (mode === 'Custom Range') {
      updatePrintConfig({
        pageRangeType: 'Custom Range',
        printType: '' as any,
        sides: '' as any
      });
    } else {
      updatePrintConfig({
        pageRangeType: mode,
        printType: (printConfig.printType ? printConfig.printType : 'Black & White') as any,
        sides: (printConfig.sides ? printConfig.sides : 'Single Side') as any
      });
    }
  };

  const addCustomRangeRule = () => {
    const docPages = Math.max(1, currentDoc?.totalPages || 1);
    const nextId = `cr-${Date.now()}`;
    let fromPage = 1;
    let toPage = docPages;

    if (currentRules.length > 0) {
      const maxTo = Math.max(...currentRules.map(r => r.toPage));
      if (maxTo < docPages) {
        fromPage = maxTo + 1;
        toPage = docPages;
      } else {
        fromPage = 1;
        toPage = docPages;
      }
    }

    const newRule: CustomPageRangeRule = {
      id: nextId,
      fromPage,
      toPage,
      printType: 'Color',
      sides: 'Single Side'
    };
    updatePrintConfig({
      customRanges: [...currentRules, newRule]
    });
    toast.success(`Rule #${currentRules.length + 1} added for pages ${fromPage}–${toPage}`);
  };

  const updateRule = (id: string, updates: Partial<CustomPageRangeRule>) => {
    const updated = currentRules.map(r => {
      if (r.id !== id) return r;
      const next = { ...r, ...updates };
      const f = Number(next.fromPage);
      const t = Number(next.toPage);
      if (!isNaN(f) && !isNaN(t) && f === t && printConfig.copies <= 1 && next.sides === 'Back to Back') {
        next.sides = 'Single Side';
      }
      return next;
    });
    updatePrintConfig({ customRanges: updated });
  };

  const removeRule = (id: string) => {
    const updated = currentRules.filter(r => r.id !== id);
    updatePrintConfig({
      customRanges: updated
    });
    if (updated.length === 0) {
      toast.info('All custom range rules removed. Global Print Type & Print Side re-enabled.');
    } else {
      toast.success('Custom range rule removed');
    }
  };

  // Image Editor Apply callback
  const handleApplyImageEdit = (
    editing: ImageEditingState,
    finalOutputUrl?: string,
    appliedPageSize?: string,
    appliedOrientation?: 'Portrait' | 'Landscape'
  ) => {
    if (currentDoc) {
      if (finalOutputUrl) {
        updateDocImageOutput(currentDoc.id, finalOutputUrl, editing);
      } else {
        updateDocEditing(currentDoc.id, editing);
      }
      const updates: any = {};
      if (appliedPageSize) {
        updates.pageSize = appliedPageSize;
      }
      if (appliedOrientation) {
        updates.layout = appliedOrientation;
      }
      if (Object.keys(updates).length > 0) {
        updatePrintConfig(updates);
      }
    }
  };

  // Active print type and sides normalized
  const currentPrintType =
    printConfig.printType === 'Black & White' || printConfig.printType === 'B&W'
      ? 'Black & White'
      : printConfig.printType === 'Color' || printConfig.printType === 'Colour'
      ? 'Color'
      : '';

  const currentPrintSide =
    printConfig.sides === 'Back to Back' || printConfig.sides === 'Back-to-Back'
      ? 'Back to Back'
      : printConfig.sides === 'Single Side' || printConfig.sides === 'Single-sided'
      ? 'Single Side'
      : '';
  const printModeEligibility = getPrintModeEligibility(
    selectedEnterprise.pricing,
    printConfig.paperType && printConfig.paperType !== 'Normal'
      ? printConfig.paperType
      : printConfig.pageSize || ''
  );
  const isEligibilityReady = selectedEnterprise.pricing.eligibilitySettingsLoaded === true;
  const isPrintModeSelectable = (type: PrintType, sides: PrintSides) =>
    !isEligibilityReady || printModeEligibility[type][sides];
  const hasSelectablePrintType = (type: PrintType) =>
    currentPrintSide
      ? isPrintModeSelectable(type, currentPrintSide as PrintSides)
      : isPrintModeSelectable(type, 'Single Side') || isPrintModeSelectable(type, 'Back to Back');
  const hasSelectablePrintSide = (side: PrintSides) =>
    currentPrintType
      ? isPrintModeSelectable(currentPrintType as PrintType, side)
      : isPrintModeSelectable('Color', side) || isPrintModeSelectable('Black & White', side);

  return (
    <div className="w-full max-w-7xl mx-auto px-4 lg:px-6 pb-28 select-none font-sans">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Side: Document Uploading & Form Configuration (Shifted Left with Expanded Width) */}
        <div className="lg:col-span-8 space-y-4">
          {/* 1. Upload Header */}
          <div key="upload-header" className="pt-1">
            <h2 className="text-base font-extrabold text-slate-900 flex items-center gap-2 font-heading">
              <UploadCloud className="w-5 h-5 text-[#FF1300]" />
              <span>Upload Document</span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Select files, customize print preferences & inspect live price
            </p>
          </div>

          {/* Customer Name Card (Prefilled from User Profile, Editable) */}
          {!hasExplicitlySelectedEnterprise && (
            <div key="shop-warning-banner" className="bg-amber-50 border border-amber-200 rounded-2xl p-3 flex items-center justify-between text-xs text-amber-800 animate-in fade-in">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                <span>Select Printing Shop First to proceed with uploads.</span>
              </div>
              <span className="text-[11px] font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full shrink-0">
                Select Shop Above ↑
              </span>
            </div>
          )}

          <div key="customer-name-card" className="bg-white rounded-2xl p-3.5 border border-red-100 shadow-xs space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-900 flex items-center gap-1.5 font-heading">
                <User className="w-4 h-4 text-[#FF1300]" />
                <span>Customer Name <span className="text-[#FF1300]">*</span></span>
              </label>
              {customerName.trim() ? (
                <span className="text-[10px] text-emerald-600 font-bold bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                  Validated
                </span>
              ) : null}
            </div>
            <input
              type="text"
              required
              value={customerName}
              onChange={e => {
                setCustomerName(e.target.value);
                if (user.isAuthenticated && !user.isGuest) {
                  updateUser({ name: e.target.value });
                }
              }}
              placeholder="Enter customer / student full name"
              className="w-full bg-slate-50 border border-slate-200 focus:border-[#FF1300] focus:ring-2 focus:ring-[#FF1300]/20 rounded-xl px-3.5 py-2 text-base sm:text-xs font-bold text-slate-800 placeholder:font-normal placeholder:text-slate-400 focus:outline-none transition-all"
            />
          </div>

          {/* 2. Upload Files Card with Choose File button & Multi-file Support */}
          <div
            key="upload-dropzone"
            onDragOver={e => {
              e.preventDefault();
              setIsDragOver(true);
            }}
            onDragLeave={() => setIsDragOver(false)}
            onDrop={handleFileDrop}
            className={`border-2 border-dashed rounded-3xl p-5 text-center transition-all bg-white shadow-xs ${
              isDragOver
                ? 'border-[#FF1300] bg-red-50/70 scale-[1.01]'
                : 'border-red-200/90 hover:border-[#FF1300]'
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.jpg,.jpeg,.png,.webp"
              onChange={handleFileInputChange}
              className="hidden"
            />

            <div className="w-12 h-12 rounded-2xl bg-red-50 text-[#FF1300] flex items-center justify-center mx-auto mb-2.5 shadow-inner">
              <UploadCloud className="w-6 h-6 stroke-[2.2]" />
            </div>

            <h3 className="text-xs font-bold text-slate-900 font-heading">
              Drag & Drop Files or Click Choose Files
            </h3>
            <p className="text-[11px] text-slate-500 mt-0.5 max-w-sm mx-auto">{"Select multiple files or add 1-by-1 • Supports PDF, Word, Excel, PPT & Images"}</p>

            {/* Choose File Button */}
            <div className="mt-3 flex items-center justify-center gap-2">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-[#FF1300] hover:bg-[#E01100] active:scale-95 text-white text-xs font-bold shadow-md shadow-red-500/25 transition-all font-heading"
              >
                <FolderOpen className="w-4 h-4" />
                <span>{uploadedDocs.length > 0 ? 'Add Another File' : 'Choose Files'}</span>
              </button>
            </div>

            {/* Real-time Smooth 0% to 100% Progress Bar */}
            {uploadStatus !== 'idle' && uploadProgress !== null && (
              <div className="mt-4 pt-3 border-t border-red-100 text-left space-y-1.5 animate-in fade-in">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-800 truncate max-w-[200px]">
                    {uploadFileName || 'Processing files...'}
                  </span>
                  <span className="font-bold text-[#FF1300]">
                    {uploadStatus === 'completed' ? (
                      <span className="text-emerald-600 flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Completed
                      </span>
                    ) : (
                      `${uploadProgress}%`
                    )}
                  </span>
                </div>

                {/* Progress Track */}
                <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden border border-slate-200">
                  <div
                    className={`h-full transition-all duration-150 rounded-full ${
                      uploadStatus === 'completed' ? 'bg-emerald-500' : 'bg-[#FF1300]'
                    }`}
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
                <p className="text-[10px] text-slate-400">
                  {uploadStatus === 'completed'
                    ? 'All documents parsed & saved to database print queue!'
                    : uploadProgress >= 92
                    ? 'Finalizing your document and preparing it for printing...'
                    : 'Uploading, inspecting page formats & caching layout...'}
                </p>
              </div>
            )}
          </div>

          {/* 3. Multi-file Document Queue Management (1-by-1 Add & Delete) */}
          {uploadedDocs.length > 0 && (
            <div key="queued-docs-section" className="bg-white rounded-3xl p-4 border border-red-100 shadow-xs space-y-3">
              <div className="flex flex-wrap items-center gap-2 border-b border-red-50 pb-2">
                <div className="flex min-w-0 items-center gap-2">
                  <FileText className="w-4 h-4 text-[#FF1300]" />
                  <h4 className="min-w-0 text-xs font-bold text-slate-900 font-heading">
                    Queued Print Documents ({uploadedDocs.length})
                  </h4>
                </div>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="ml-auto inline-flex shrink-0 items-center gap-1.5 rounded-full bg-red-50 px-3 py-1.5 text-xs font-bold text-[#FF1300] shadow-xs transition-colors hover:bg-red-100"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>{"Add Another File"}</span>
                </button>
              </div>

              {uploadedDocs.length > 1 && (
                <div className="space-y-2 rounded-2xl border border-slate-200 bg-slate-50 p-3">
                  <p className="break-words text-xs font-bold text-slate-800">
                    Configuration source: {currentDoc?.fileName || 'Select a document below'}
                  </p>
                  <p className="text-[10px] text-slate-500">
                    Select target documents with their checkboxes. Clicking a document opens it as the configuration source.
                  </p>
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      disabled={!currentDoc || selectedConfigTargetIds.length > 0}
                      onClick={() => {
                        const targetIds = uploadedDocs.map(doc => doc.id);
                        applyPrintConfigToDocuments(targetIds, printConfig);
                        setSelectedConfigTargetIds([]);
                        toast.success('Current configuration applied to all documents.');
                      }}
                      className="rounded-full bg-[#FF1300] px-3 py-1.5 text-xs font-bold text-white transition-colors hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-40"
                      title={selectedConfigTargetIds.length > 0 ? 'Unselect all selected documents before applying to all.' : undefined}
                    >
                      Apply all
                    </button>
                    <button
                      type="button"
                      disabled={!currentDoc || selectedConfigTargetIds.length === 0}
                      onClick={() => {
                        if (!currentDoc || selectedConfigTargetIds.length === 0) {
                          toast.error('Select at least one target document.');
                          return;
                        }
                        applyPrintConfigToDocuments(selectedConfigTargetIds, printConfig);
                        toast.success(`Configuration applied to ${selectedConfigTargetIds.length} selected document${selectedConfigTargetIds.length === 1 ? '' : 's'}.`);
                      }}
                      className="rounded-full border border-[#FF1300] bg-white px-3 py-1.5 text-xs font-bold text-[#FF1300] transition-colors hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      Apply selected ({selectedConfigTargetIds.length})
                    </button>
                  </div>
                </div>
              )}

              {/* Document List with Individual Delete & Selection */}
              <div className="space-y-2">
                {uploadedDocs.map(doc => {
                  const isCurrent = currentDoc?.id === doc.id;
                  const isDocImg = doc.fileType === 'JPG' || doc.fileType === 'PNG';
                  const docCfg = (isCurrent ? printConfig : doc.printConfig) || printConfig;
                  const docPrice = getDocPrice(doc);
                  const activeDoc = isCurrent ? { ...doc, printConfig } : doc;
                  const docValidation = isDocConfigValid(activeDoc);
                  const docError = !docValidation.isValid ? docValidation.error : docPrice.error;

                  return (
                    <div
                      key={doc.id}
                      onClick={() => {
                        if (!isCurrent) {
                          selectDocument(doc.id);
                          setSelectedConfigTargetIds([]);
                        }
                      }}
                      className={`flex items-center gap-2.5 rounded-2xl border p-2.5 shadow-xs transition-all cursor-pointer sm:gap-3 sm:p-3 ${
                        docValidation.isValid
                          ? 'border-emerald-300 bg-emerald-50/30 hover:border-emerald-400'
                          : 'border-red-300 bg-red-50/30 hover:border-red-400'
                      }`}
                    >
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-50 text-[#FF1300]">
                        {isDocImg ? (
                          <ImageIcon className="w-4 h-4" />
                        ) : (
                          <FileText className="w-4 h-4" />
                        )}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex min-w-0 flex-wrap items-center gap-1.5">
                          <p className="w-full min-w-0 truncate text-sm font-bold leading-snug text-slate-900 sm:w-auto" title={doc.fileName}>
                            {doc.fileName}
                          </p>
                          {docValidation.isValid ? (
                            <span className="shrink-0 rounded-full bg-emerald-100 px-2 py-0.5 text-[9px] font-black uppercase tracking-wider text-emerald-700" title="Configuration complete">
                              Complete
                            </span>
                          ) : isCurrent ? (
                            <span className="shrink-0 rounded-full bg-blue-100 px-2 py-0.5 text-[9px] font-black uppercase tracking-wider text-blue-700">
                              Config Source
                            </span>
                          ) : (
                            <span className="flex shrink-0 items-center gap-1 rounded-full bg-red-100 px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wider text-[#FF1300]" title={docError}>
                              <AlertCircle className="h-2.5 w-2.5" />
                              Needs Config
                            </span>
                          )}
                        </div>
                        <div className="mt-1.5 flex flex-wrap items-center gap-x-1.5 gap-y-1 text-[11px]">
                          <span className="text-slate-500">
                            {doc.conversionStatus === 'failed'
                              ? 'Conversion failed'
                              : (doc.fileType === 'XLS' || doc.fileType === 'XLSX') && doc.conversionStatus !== 'converted'
                                ? 'Choose sheet & Set'
                                : `${doc.totalPages} ${doc.totalPages === 1 ? 'Page' : 'Pages'}`}
                          </span>
                          <span className="text-slate-300">•</span>
                          {docCfg.sides && (
                            <>
                              <span className="text-slate-600">{docCfg.sides}</span>
                              <span className="text-slate-300">•</span>
                            </>
                          )}
                          <span className="text-slate-600">{docCfg.copies}x</span>
                          <span className="text-slate-300">•</span>
                          <span className="text-slate-600">{docCfg.pageSize}</span>
                          <span className="text-slate-300">•</span>
                          <span className="font-bold text-[#c2413a] bg-red-50 px-2 py-0.5 rounded-md">
                            {docPrice.isValid ? `₹${docPrice.subtotal.toFixed(2)}` : '—'}
                          </span>
                        </div>
                      </div>

                      <div
                        className="grid shrink-0 grid-cols-2 grid-rows-[16px_32px] items-center justify-items-center gap-x-1.5 gap-y-1 sm:grid-rows-[16px_36px]"
                        onClick={e => e.stopPropagation()}
                      >
                        {!isDocImg && (
                          <button
                            type="button"
                            onClick={() => {
                              const targetUrl = doc.convertedPdfUrl || doc.previewUrl || doc.storageUrl;
                              if (targetUrl) {
                                const activeConfig = isCurrent ? printConfig : (doc.printConfig || printConfig);
                                const activePayload = {
                                  ...doc,
                                  printConfig: activeConfig,
                                  convertedPdfUrl: targetUrl
                                };
                                try {
                                  localStorage.setItem('printon24_preview_active_doc', JSON.stringify(activePayload));
                                  const bc = new BroadcastChannel('printon24_pdf_preview');
                                  bc.postMessage({
                                    type: 'SWITCH_DOC',
                                    doc: activePayload
                                  });
                                  bc.close();
                                } catch {}
                                const previewUrl = `/preview?docId=${encodeURIComponent(doc.id)}&url=${encodeURIComponent(targetUrl)}&name=${encodeURIComponent(doc.fileName)}`;
                                const win = window.open(previewUrl, '_blank');
                                // Mobile browsers frequently block window.open popups; fallback to direct navigation
                                if (!win || win.closed || typeof win.closed === 'undefined') {
                                  window.location.href = previewUrl;
                                }
                              } else {
                                toast.info('PDF is being prepared for this document.');
                              }
                            }}
                            className="col-start-1 row-start-2 flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 bg-slate-50 text-slate-600 transition-all hover:border-slate-300 hover:bg-slate-100 hover:text-slate-900 sm:h-9 sm:w-9"
                            title="Open Document Preview"
                          >
                            <Eye className="h-3.5 w-3.5 text-slate-500" />
                          </button>
                        )}
                        {isDocImg && isCurrent && (
                          <button
                            type="button"
                            onClick={() => setIsImageEditorOpen(true)}
                            className="col-start-1 row-start-2 flex h-8 w-8 items-center justify-center rounded-full bg-red-50 text-[#FF1300] transition-colors hover:bg-red-100 sm:h-9 sm:w-9"
                            title="Edit Image"
                          >
                            <Wand2 className="h-3.5 w-3.5" />
                          </button>
                        )}
                        <input
                          type="checkbox"
                          checked={!isCurrent && selectedConfigTargetIds.includes(doc.id)}
                          disabled={isCurrent}
                          aria-label={`Apply current configuration to ${doc.fileName}`}
                          title={isCurrent ? 'This document is the configuration source' : 'Select this document as a configuration target'}
                          onClick={event => event.stopPropagation()}
                          onChange={event => {
                            setSelectedConfigTargetIds(ids =>
                              event.target.checked
                                ? [...new Set([...ids, doc.id])]
                                : ids.filter(id => id !== doc.id)
                            );
                          }}
                          className="col-start-2 row-start-1 -translate-y-1.5 h-4 w-4 shrink-0 cursor-pointer accent-[#FF1300]"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            removeUploadedDoc(doc.id);
                            toast.success(`"${doc.fileName}" deleted successfully!`, {
                              style: neutralSuccessToastStyle
                            });
                          }}
                          className="col-start-2 row-start-2 flex h-8 w-8 items-center justify-center rounded-full bg-red-50 text-[#FF1300] transition-colors hover:bg-red-100 sm:h-9 sm:w-9"
                          title="Delete File from Queue"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

      {/* 4. Print Configure Section (Only shown when active document exists) */}
      {currentDoc && uploadedDocs.some(d => d.id === currentDoc.id) && (
        <div key="print-configure-section" className="print-config-section space-y-3 pt-1">
        {/* Prominent Active Document Name Display (Point 8) */}
        {currentDoc && (
          <div key="active-doc-banner" className="bg-gradient-to-r from-red-50/90 via-orange-50/70 to-amber-50/50 border border-red-200 rounded-2xl p-3.5 flex items-center justify-between gap-3 shadow-xs animate-in fade-in">
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <div className="w-10 h-10 rounded-xl bg-white border border-red-200 text-[#FF1300] flex items-center justify-center shrink-0 shadow-xs">
                {currentDoc.fileType === 'JPG' || currentDoc.fileType === 'PNG' ? (
                  <ImageIcon className="w-5 h-5" />
                ) : (
                  <FileText className="w-5 h-5" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-black uppercase tracking-wider text-[#FF1300] bg-white px-2 py-0.5 rounded-full border border-red-200/80">
                    Active Document
                  </span>
                  <span className="text-[10px] text-slate-500 font-semibold">
                    {currentDoc.fileType} • {currentDoc.conversionStatus === 'failed'
                      ? 'Conversion failed'
                      : (currentDoc.fileType === 'XLS' || currentDoc.fileType === 'XLSX') && currentDoc.conversionStatus !== 'converted'
                        ? 'Choose sheet & Set'
                        : `${currentDoc.totalPages} ${currentDoc.totalPages === 1 ? 'Page' : 'Pages'}`}
                  </span>
                </div>
                <h4
                  className="text-xs sm:text-sm font-bold text-slate-900 truncate mt-1"
                  title={currentDoc.originalFileName || currentDoc.fileName}
                >
                  {currentDoc.originalFileName || currentDoc.fileName}
                </h4>
              </div>
            </div>
          </div>
        )}

        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-red-100 text-[#FF1300] flex items-center justify-center">
            <Settings2 className="w-4 h-4 stroke-[2.2]" />
          </div>
          <div>
            <h3 className="text-sm font-extrabold text-slate-900 font-heading">
              Print Configuration
            </h3>
            <p className="text-[10px] text-slate-500">
            Customize paper type, sides, color mode, copies, and page range
            </p>
          </div>
        </div>

        {/* Configuration List Rows */}
        <div className="space-y-2.5">
          {/* Paper Size: Dropdown with A4 (default), A3, Letter, Legal, A5, Executive */}
          <div className="bg-white rounded-2xl p-3 border border-red-100 shadow-xs flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-slate-500" />
              <div>
                <p className="text-xs font-bold text-slate-800 font-heading">Paper Size</p>
                {!printConfig.pageSize && !isLoadingPaperSizes && (
                  <></>
                )}
              </div>
            </div>

            <div className="relative">
              <select
                value={printConfig.pageSize || ''}
                onChange={e => updatePrintConfig({ pageSize: e.target.value as any })}
                className={`bg-slate-100 hover:bg-slate-200 text-slate-900 font-bold text-xs px-3 py-1.5 rounded-xl border focus:border-[#FF1300] focus:ring-1 focus:ring-[#FF1300] focus:outline-none cursor-pointer transition-colors ${
                  !printConfig.pageSize ? 'border-amber-400 bg-amber-50 text-amber-900' : 'border-slate-200'
                }`}
              >
                <option value="" disabled>
                  {isLoadingPaperSizes
                    ? 'Loading shop paper sizes...'
                    : availablePaperSizes.length === 0
                    ? 'No paper sizes available for this shop'
                    : '-- Select Page Size --'}
                </option>
                {availablePaperSizes.map(size => (
                  <option key={size} value={size}>
                    {size === 'A4' ? 'A4 (Standard 210 × 297 mm)' :
                     size === 'A3' ? 'A3 (Large 297 × 420 mm)' :
                     size === 'Letter' ? 'Letter (8.5 × 11 in)' :
                     size === 'Legal' ? 'Legal (8.5 × 14 in)' :
                     size === 'Bond' ? 'Bond Paper (8.5 × 11 in)' :
                     size === 'Executive' ? 'Executive (7.25 × 10.5 in)' :
                     size}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Excel Specific Print Configuration: Sheet Selection & 4 Scaling Options */}
          {(currentDoc?.fileType === 'XLS' ||
            currentDoc?.fileType === 'XLSX' ||
            Boolean(currentDoc?.fileName?.match(/\.(xlsx?|csv)$/i))) && (
            <div className="bg-white rounded-2xl p-3.5 border-2 border-red-100 shadow-xs space-y-3 animate-in fade-in">
              <div className="flex items-center justify-between border-b border-red-50 pb-2">
                <div className="flex items-center gap-2">
                  <Table className="w-4 h-4 text-[#FF1300]" />
                  <span className="text-xs font-black text-slate-900 font-heading">
                    Excel Sheet & Page Scaling Configuration
                  </span>
                </div>
                {isReconverting && (
                  <span className="text-[10px] font-bold text-[#FF1300] flex items-center gap-1 animate-pulse">
                    <RefreshCw className="w-3 h-3 animate-spin" /> Updating PDF...
                  </span>
                )}
              </div>

              {/* Sheet Selection */}
              <div>
                <label className="text-[11px] font-bold text-slate-700 block mb-1">
                  Workbook Sheet:
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {(currentDoc?.excelSheets && currentDoc.excelSheets.length > 0
                    ? currentDoc.excelSheets
                    : ['Sheet1']
                  ).map(sheet => (
                    <button
                      key={sheet}
                      type="button"
                      disabled={isReconverting}
                      onClick={() => setActiveSheet(sheet)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                        activeSheet === sheet
                          ? 'bg-[#FF1300] text-white shadow-xs font-heading'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      {sheet}
                    </button>
                  ))}
                </div>
              </div>

              {/* Exactly 4 Scaling Options as specified in Requirement 4 */}
              <div>
                <label className="text-[11px] font-bold text-slate-700 block mb-1">
                  Scaling Options:
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                  {(
                    [
                      'No Scaling',
                      'Fit Sheet on One Page',
                      'Fit All Columns on One Page',
                      'Fit All Rows on One Page'
                    ] as const
                  ).map(scaleOption => (
                    <button
                      key={scaleOption}
                      type="button"
                      disabled={isReconverting}
                      onClick={() => setActiveScaling(scaleOption)}
                      className={`px-3 py-2 rounded-xl text-xs font-bold text-left border transition-all flex items-center justify-between ${
                        activeScaling === scaleOption
                          ? 'bg-red-50 border-[#FF1300] text-[#FF1300] shadow-xs'
                          : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-white'
                      }`}
                    >
                      <span>{scaleOption}</span>
                      {activeScaling === scaleOption && (
                        <Check className="w-3.5 h-3.5 shrink-0 text-[#FF1300]" />
                      )}
                    </button>
                  ))}
                </div>
              </div>

              <button
                type="button"
                disabled={isReconverting || !currentDoc || !activeSheet}
                onClick={async () => {
                  if (!currentDoc) return;
                  setIsReconverting(true);
                  try {
                    await reconvertDocument(currentDoc.id, {
                      selectedSheet: activeSheet,
                      scaling: activeScaling
                    });
                  } finally {
                    setIsReconverting(false);
                  }
                }}
                className="w-full rounded-xl bg-[#FF1300] px-4 py-2.5 text-xs font-black text-white shadow-sm transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isReconverting ? 'Setting Excel options...' : 'Set & Convert to PDF'}
              </button>
            </div>
          )}

          <div className="flex flex-col-reverse gap-2.5">
          {/* 4.2 Print Side: Single Side | Back to Back (Button format on single row with tooltip on Custom Range) */}
          <div className="relative group">
            <div
              onClickCapture={handleDisabledGlobalControlClick('side')}
              onMouseEnter={() => isCustomRange && setActiveDisabledTooltip('side')}
              onMouseLeave={() => isCustomRange && setActiveDisabledTooltip(null)}
              title={isCustomRange ? customRangeTooltipText : undefined}
              className={`bg-white rounded-2xl p-3 border shadow-xs flex items-center justify-between gap-3 transition-all ${
                isCustomRange
                  ? 'border-slate-200 bg-slate-50/70 opacity-55 cursor-not-allowed select-none'
                  : 'border-red-100'
              }`}
            >
              <div className="flex items-center gap-2 min-w-0">
                <Layers className="w-4 h-4 text-slate-500 shrink-0" />
                <p className="text-xs font-bold text-slate-800 font-heading truncate">Print Side</p>
              </div>

              <div className={`flex items-center gap-1.5 bg-slate-100 p-0.5 rounded-xl shrink-0 ${isCustomRange ? 'pointer-events-none' : ''}`}>
                {(['Single Side', 'Back to Back'] as const).map(side => {
                  const isSelectableForSelectedType = hasSelectablePrintSide(side);
                  const isSideDisabled =
                    isCustomRange ||
                    !isEligibilityReady ||
                    !isSelectableForSelectedType ||
                    (side === 'Back to Back' && isSinglePageSingleCopy);
                  return (
                    <button
                      key={side}
                      type="button"
                      disabled={isSideDisabled}
                      tabIndex={isSideDisabled ? -1 : 0}
                      onClick={() => {
                        if (isCustomRange) return;
                        if (side === 'Back to Back' && isSinglePageSingleCopy) {
                          toast.info('Back-to-Back is disabled for 1-page documents with 1 copy. Increase copies to enable.');
                          return;
                        }
                        updatePrintConfig({ sides: side });
                      }}
                      title={
                        side === 'Back to Back' && isSinglePageSingleCopy
                          ? 'Disabled: Back-to-Back requires multiple pages or copies > 1'
                          : !isSelectableForSelectedType
                          ? 'This print mode is not offered for the selected shop and paper.'
                          : undefined
                      }
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all ${
                        isSideDisabled
                          ? 'opacity-40 cursor-not-allowed text-slate-400 bg-slate-100'
                          : currentPrintSide === side
                          ? 'bg-[#FF1300] text-white shadow-xs font-heading'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      {side}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Custom Range Explanatory Tooltip on Hover / Tap (on Separate Lines) */}
            {isCustomRange && activeDisabledTooltip === 'side' && (
              <div
                role="tooltip"
                className="absolute z-30 bottom-full left-1/2 -translate-x-1/2 mb-2 w-80 p-3 rounded-xl bg-slate-900 text-white text-[11px] leading-relaxed font-medium shadow-xl border border-slate-700 pointer-events-none transition-all animate-in fade-in space-y-1 text-center"
              >
                <p className="font-bold text-amber-300">{customRangeTooltipTitle}</p>
                <p className="text-slate-200">{customRangeTooltipSubtitle}</p>
                <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 border-4 border-transparent border-t-slate-900" />
              </div>
            )}
          </div>

          {/* 4.1 Print Type: Color | Black & White (Button format on single row with tooltip on Custom Range) */}
          <div className="relative group">
            <div
              onClickCapture={handleDisabledGlobalControlClick('type')}
              onMouseEnter={() => isCustomRange && setActiveDisabledTooltip('type')}
              onMouseLeave={() => isCustomRange && setActiveDisabledTooltip(null)}
              title={isCustomRange ? customRangeTooltipText : undefined}
              className={`bg-white rounded-2xl p-3 border shadow-xs flex items-center justify-between gap-3 transition-all ${
                isCustomRange
                  ? 'border-slate-200 bg-slate-50/70 opacity-55 cursor-not-allowed select-none'
                  : 'border-red-100'
              }`}
            >
              <div className="flex items-center gap-2 min-w-0">
                <FileText className="w-4 h-4 text-slate-500 shrink-0" />
                <p className="text-xs font-bold text-slate-800 font-heading truncate">Print Type</p>
              </div>

              <div className={`flex items-center gap-1.5 bg-slate-100 p-0.5 rounded-xl shrink-0 ${isCustomRange ? 'pointer-events-none' : ''}`}>
                <button
                  type="button"
                  disabled={
                    isCustomRange ||
                    !isEligibilityReady ||
                    !hasSelectablePrintType('Color')
                  }
                  tabIndex={isCustomRange ? -1 : 0}
                  onClick={() => updatePrintConfig({ printType: 'Color' })}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 ${
                    !isEligibilityReady ||
                    !hasSelectablePrintType('Color')
                      ? 'opacity-40 cursor-not-allowed text-slate-400'
                      : currentPrintType === 'Color'
                      ? 'bg-[#FF1300] text-white shadow-xs font-heading'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <span>Color</span>
                  <span
                    aria-hidden="true"
                    className="w-2.5 h-2.5 rounded-full shrink-0 shadow-2xs border-solid bg-inherit bg-cover bg-center bg-no-repeat bg-[url(https://miaoda-edit-image.s3cdn.medo.dev/epyrkfdiozk1/IMG-f1qjh5erfsao.jpg)] border-[rgba(255,255,255,0.5)] border-[1px] border-[rgba(255,255,255,0.5)]"
                    style={{
                      background: 'conic-gradient(from 0deg, #ff0000, #ff7700, #ffdd00, #00dd55, #00bbee, #2255ee, #aa00dd, #ff0000)'
                    }}
                  />
                </button>

                <button
                  type="button"
                  disabled={
                    isCustomRange ||
                    !isEligibilityReady ||
                    !hasSelectablePrintType('Black & White')
                  }
                  tabIndex={isCustomRange ? -1 : 0}
                  onClick={() => updatePrintConfig({ printType: 'Black & White' })}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 ${
                    !isEligibilityReady ||
                    !hasSelectablePrintType('Black & White')
                      ? 'opacity-40 cursor-not-allowed text-slate-400'
                      : currentPrintType === 'Black & White'
                      ? 'bg-[#FF1300] text-white shadow-xs font-heading'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <span>Black & White</span>
                  <span
                    aria-hidden="true"
                    className="w-2.5 h-2.5 rounded-full shrink-0 border border-slate-400/80 shadow-2xs overflow-hidden"
                    style={{
                      background: 'linear-gradient(to bottom, #000000 50%, #ffffff 50%)'
                    }}
                  />
                </button>
              </div>

            </div>

            {/* Custom Range Explanatory Tooltip on Hover / Tap (on Separate Lines) */}
            {isCustomRange && activeDisabledTooltip === 'type' && (
              <div
                role="tooltip"
                className="absolute z-30 bottom-full left-1/2 -translate-x-1/2 mb-2 w-80 p-3 rounded-xl bg-slate-900 text-white text-[11px] leading-relaxed font-medium shadow-xl border border-slate-700 pointer-events-none transition-all animate-in fade-in space-y-1 text-center"
              >
                <p className="font-bold text-amber-300">{customRangeTooltipTitle}</p>
                <p className="text-slate-200">{customRangeTooltipSubtitle}</p>
                <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 border-4 border-transparent border-t-slate-900" />
              </div>
            )}
          </div>

          </div>

          {/* 4.3 Copies: Minus (-) Button | Quantity Input Box (manual typing) | Plus (+) Button */}
          <div className="bg-white rounded-2xl p-3 border border-red-100 shadow-xs flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Copy className="w-4 h-4 text-slate-500" />
              <div>
                <p className="text-xs font-bold text-slate-800 font-heading">Copies</p>
                <p className="text-[10px] text-slate-400">Number of print sets</p>
              </div>
            </div>

            <div className="flex items-center gap-2 bg-slate-100 px-2 py-1 rounded-xl">
              <button
                type="button"
                onClick={() => handleCopiesChange(-1)}
                disabled={printConfig.copies <= 1}
                className="w-7 h-7 rounded-lg bg-white disabled:opacity-40 text-slate-800 hover:text-[#FF1300] font-bold flex items-center justify-center shadow-xs active:scale-95 transition-all"
                title="Decrease copy"
              >
                <Minus className="w-3.5 h-3.5" />
              </button>

              <input
                type="number"
                min="1"
                max="999"
                value={printConfig.copies}
                onChange={handleManualCopiesInput}
                className="w-14 text-center font-extrabold text-sm text-slate-900 bg-transparent focus:outline-none focus:ring-1 focus:ring-[#FF1300] rounded"
              />

              <button
                type="button"
                onClick={() => handleCopiesChange(1)}
                className="w-7 h-7 rounded-lg bg-white text-slate-800 hover:text-[#FF1300] font-bold flex items-center justify-center shadow-xs active:scale-95 transition-all"
                title="Increase copy"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* 4.4 Layout: Portrait | Landscape (Professional icons, NO emojis) */}
          <div className="bg-white rounded-2xl p-3 border border-red-100 shadow-xs flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Smartphone className="w-4 h-4 text-slate-500" />
              <div>
                <p className="text-xs font-bold text-slate-800 font-heading">Layout</p>
                <p className="text-[10px] text-slate-400">Page orientation</p>
              </div>
            </div>

            <div className="flex items-center gap-1.5 bg-slate-100 p-0.5 rounded-xl">
              <button
                type="button"
                onClick={() => updatePrintConfig({ layout: 'Portrait' })}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all ${
                  printConfig.layout === 'Portrait'
                    ? 'bg-[#FF1300] text-white shadow-xs font-heading'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Smartphone className="w-3.5 h-3.5" />
                <span>Portrait</span>
              </button>
              <button
                type="button"
                onClick={() => updatePrintConfig({ layout: 'Landscape' })}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all ${
                  printConfig.layout === 'Landscape'
                    ? 'bg-[#FF1300] text-white shadow-xs font-heading'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Maximize2 className="w-3.5 h-3.5" />
                <span>Landscape</span>
              </button>
            </div>
          </div>

          {/* 4.5 Page Range: All Pages | Selected Pages | Custom Range (Responsive 3-column grid without overflowing outer container) */}
          <div className="bg-white rounded-2xl p-3.5 border border-slate-200 shadow-xs space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5">
              <div className="flex items-center gap-2">
                <Maximize2 className="w-4 h-4 text-slate-500" />
                <div>
                  <p className="text-xs font-bold text-slate-800 font-heading">Page Range</p>
                  <p className="text-[10px] text-slate-400">Pages selection mode</p>
                </div>
              </div>

              {/* 3-column grid on mobile prevents overflowing outer div */}
              <div className="grid grid-cols-3 w-full sm:w-auto p-1 bg-slate-100 rounded-xl gap-1">
                {(['All Pages', 'Selected Pages', 'Custom Range'] as const).map(mode => {
                  const isSelectedPagesDisabled = mode === 'Selected Pages' && !isSelectedPagesEligible;
                  const isActive =
                    printConfig.pageRangeType === mode ||
                    (mode === 'All Pages' && printConfig.pageRangeType === 'All pages') ||
                    (mode === 'Selected Pages' && printConfig.pageRangeType === 'Selected pages');

                  return (
                    <button
                      key={mode}
                      type="button"
                      disabled={isSelectedPagesDisabled}
                      onClick={() => {
                        if (isSelectedPagesDisabled) {
                          toast.info('Selected Pages option is disabled for single-page documents with 1 copy. Increase copies to enable.');
                          return;
                        }
                        handlePageRangeModeChange(mode);
                      }}
                      title={isSelectedPagesDisabled ? 'Disabled for single page with 1 copy. Increase copies to enable.' : undefined}
                      className={`px-2 py-1.5 rounded-lg text-xs font-bold text-center transition-all ${
                        isSelectedPagesDisabled
                          ? 'opacity-40 cursor-not-allowed bg-slate-50 text-slate-400'
                          : isActive
                          ? 'bg-[#FF1300] text-white shadow-xs font-heading'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      {mode}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Selected Pages Simple Input */}
            {(printConfig.pageRangeType === 'Selected Pages' || printConfig.pageRangeType === 'Selected pages') && (() => {
              const totalPages = Math.max(1, currentDoc?.totalPages || 1);
              const selValidation = validateSelectedPageRange(printConfig.selectedPageRange, totalPages);

              return (
                <div className="pt-2 border-t border-slate-100 space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[11px] text-slate-600 font-medium">Page Range (e.g. 1-3, 5):</span>
                    <input
                      type="text"
                      value={printConfig.selectedPageRange || ''}
                      onChange={e => updatePrintConfig({ selectedPageRange: e.target.value })}
                      placeholder={`e.g. 1-${totalPages}`}
                      className={`w-36 text-center bg-slate-50 border rounded-lg px-2 py-1 text-xs font-bold text-slate-900 focus:outline-none transition-all ${
                        !printConfig.selectedPageRange || !selValidation.isValid
                          ? 'border-red-300 focus:border-[#FF1300] focus:ring-1 focus:ring-[#FF1300]'
                          : 'border-emerald-300 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500'
                      }`}
                    />
                  </div>
                  {!selValidation.isValid ? (
                    <p className="text-[11px] text-red-600 font-medium flex items-center gap-1">

                    </p>
                  ) : (
                    <p className="text-[11px] text-emerald-600 font-medium flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5 shrink-0 text-emerald-600" />
                      <span>Valid: {selValidation.pageCount} page(s) selected ({selValidation.pages.join(', ')})</span>
                    </p>
                  )}
                </div>
              );
            })()}

            {/* Custom Range Multi-Rule Configuration */}
            {printConfig.pageRangeType === 'Custom Range' && (() => {
              const totalPages = Math.max(1, currentDoc?.totalPages || 1);
              const customValidation = validateCustomRanges(currentRules, totalPages);

              return (
                <div className="pt-2 border-t border-slate-100 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-xs font-bold text-slate-700">
                        Custom Independent Rules:
                      </span>
                      <p className="text-[10px] text-slate-400">
                        Total document pages: {totalPages}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={addCustomRangeRule}
                      className="text-xs font-bold text-[#FF1300] hover:underline flex items-center gap-1 px-2 py-1 rounded-lg bg-red-50 border border-red-100 hover:bg-red-100/70 transition-all"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add Range Rule</span>
                    </button>
                  </div>

                  {/* Overall validation message */}
                  {!customValidation.isValid ? (
                    <div className="p-2.5 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 shrink-0 text-[#FF1300] mt-0.5" />
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-slate-900">Custom Range Validation Error</p>
                        <p className="text-[11px] text-red-600 mt-0.5">{customValidation.error}</p>
                      </div>
                    </div>
                  ) : (
                    <div className="p-2 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 shrink-0 text-emerald-600" />
                      <span>Valid: {customValidation.coveredPages.length} of {totalPages} page(s) configured ({customValidation.coveredPages.join(', ')}). Unconfigured pages will not be printed.</span>
                    </div>
                  )}

                  {/* Empty state notice */}
                  {currentRules.length === 0 && (
                    <div className="p-4 rounded-xl border border-dashed border-slate-300 text-center space-y-1">
                      <p className="text-xs font-bold text-slate-700">No custom range rules configured</p>
                      <p className="text-[11px] text-slate-500">
                        Click "Add Range Rule" above to specify custom print settings for page ranges. Global settings are currently active.
                      </p>
                    </div>
                  )}

                  {/* List of rules */}
                  {currentRules.map((rule, idx) => {
                    const fromNum = Number(rule.fromPage);
                    const toNum = Number(rule.toPage);
                    const isRuleInverted = !isNaN(fromNum) && !isNaN(toNum) && fromNum > toNum;
                    const isRuleOutOfRange = !isNaN(toNum) && toNum > totalPages;
                    const hasRuleError = isRuleInverted || isRuleOutOfRange;

                    return (
                      <div
                        key={rule.id}
                        className={`p-2.5 rounded-xl border space-y-2 text-xs transition-all ${
                          hasRuleError
                            ? 'bg-red-50/70 border-red-300'
                            : 'bg-slate-50/80 border-slate-200'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-slate-800">Rule #{idx + 1}</span>
                            {hasRuleError && (
                              <span className="text-[9px] font-bold text-red-600 bg-red-100 px-1 py-0.5 rounded">
                                Invalid Range
                              </span>
                            )}
                          </div>
                          <button
                            type="button"
                            onClick={() => removeRule(rule.id)}
                            className="text-rose-500 hover:text-rose-700 text-[10px] font-bold px-1.5 py-0.5 rounded hover:bg-rose-50"
                          >
                            Remove Rule
                          </button>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {/* From - To Page inputs */}
                          <div className="flex items-center gap-1">
                            <span className="text-[11px] text-slate-500">Pages:</span>
                            <input
                              type="number"
                              min="1"
                              max={totalPages}
                              value={rule.fromPage}
                              onChange={e => updateRule(rule.id, { fromPage: Number(e.target.value) })}
                              className={`w-14 bg-white border rounded px-1.5 py-0.5 text-center text-xs font-bold ${
                                isRuleInverted ? 'border-red-400 text-red-600' : 'border-slate-200 text-slate-800'
                              }`}
                            />
                            <span className="text-slate-400">to</span>
                            <input
                              type="number"
                              min="1"
                              max={totalPages}
                              value={rule.toPage}
                              onChange={e => updateRule(rule.id, { toPage: Number(e.target.value) })}
                              className={`w-14 bg-white border rounded px-1.5 py-0.5 text-center text-xs font-bold ${
                                hasRuleError ? 'border-red-400 text-red-600' : 'border-slate-200 text-slate-800'
                              }`}
                            />
                            <span className="text-[10px] text-slate-400">/ {totalPages}</span>
                          </div>

                          {/* Print Type toggle */}
                          <div className="flex items-center justify-end gap-1">
                            <button
                              type="button"
                              disabled={!isPrintModeSelectable('Color', rule.sides)}
                              onClick={() => updateRule(rule.id, { printType: 'Color' })}
                              className={`px-2.5 py-1 rounded text-[11px] font-bold transition-all ${
                                !isPrintModeSelectable('Color', rule.sides)
                                  ? 'opacity-40 cursor-not-allowed bg-slate-100 text-slate-400'
                                  : rule.printType === 'Color'
                                  ? 'bg-[#FF1300] text-white shadow-xs'
                                  : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                              }`}
                            >
                              Color
                            </button>
                            <button
                              type="button"
                              disabled={!isPrintModeSelectable('Black & White', rule.sides)}
                              onClick={() => updateRule(rule.id, { printType: 'Black & White' })}
                              className={`px-2.5 py-1 rounded text-[11px] font-bold transition-all ${
                                !isPrintModeSelectable('Black & White', rule.sides)
                                  ? 'opacity-40 cursor-not-allowed bg-slate-100 text-slate-400'
                                  : rule.printType === 'Black & White'
                                  ? 'bg-slate-900 text-white shadow-xs'
                                  : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                              }`}
                            >
                              B&W
                            </button>
                          </div>
                        </div>

                        {/* Print Side toggle for this rule */}
                        <div className="flex items-center justify-between pt-1 border-t border-slate-200/70 text-[11px]">
                          <span className="text-slate-500">Side configuration:</span>
                          <div className="flex gap-1">
                            <button
                              type="button"
                              disabled={!isPrintModeSelectable(rule.printType, 'Single Side')}
                              onClick={() => updateRule(rule.id, { sides: 'Single Side' })}
                              className={`px-2 py-0.5 rounded transition-all ${
                                !isPrintModeSelectable(rule.printType, 'Single Side')
                                  ? 'opacity-40 cursor-not-allowed bg-slate-100 text-slate-400'
                                  : rule.sides === 'Single Side'
                                  ? 'bg-slate-800 text-white font-bold shadow-xs'
                                  : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                              }`}
                            >
                              Single Side
                            </button>
                            {(() => {
                              const isSinglePage = !isNaN(fromNum) && !isNaN(toNum) && fromNum === toNum;
                              const isB2BDisabled =
                                !isPrintModeSelectable(rule.printType, 'Back to Back') ||
                                (isSinglePage && printConfig.copies <= 1);
                              return (
                                <button
                                  type="button"
                                  disabled={isB2BDisabled}
                                  onClick={() => !isB2BDisabled && updateRule(rule.id, { sides: 'Back to Back' })}
                                  className={`px-2 py-0.5 rounded transition-all ${
                                    isB2BDisabled
                                      ? 'opacity-40 cursor-not-allowed bg-slate-100 text-slate-400 border border-slate-200'
                                      : rule.sides === 'Back to Back'
                                        ? 'bg-slate-800 text-white font-bold shadow-xs'
                                        : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                                  }`}
                                  title={
                                    isB2BDisabled
                                      ? 'This mode is unavailable for the selected shop and paper or disabled for a single page with 1 copy.'
                                      : 'Back to Back'
                                  }
                                >
                                  Back to Back
                                </button>
                              );
                            })()}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })()}
          </div>

          {/* 4.6 Pages Per Sheet: 1-in-1 | 2-in-1 | 4-in-1 (Single line, responsive buttons) */}
          <div className="bg-white rounded-2xl p-3 border border-red-100 shadow-xs flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Grid className="w-4 h-4 text-slate-500" />
              <div>
                <p className="text-xs font-bold text-slate-800 font-heading">Pages Per Sheet</p>
                <p className="text-[10px] text-slate-400">Sheet compression</p>
              </div>
            </div>

            <div className="flex items-center gap-1.5 bg-slate-100 p-0.5 rounded-xl">
              {(['1-in-1', '2-in-1', '4-in-1'] as const).map(n => {
                const isDisabled = !isPagesPerSheetOptionEligible(n);
                return (
                  <button
                    key={n}
                    type="button"
                    disabled={isDisabled}
                    onClick={() => updatePrintConfig({ pagesPerSheet: n })}
                    title={isDisabled ? `${n} is unavailable for a ${documentPageCount}-page document.` : undefined}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all ${
                      isDisabled
                        ? 'cursor-not-allowed bg-slate-100 text-slate-400 opacity-50'
                        : printConfig.pagesPerSheet === n
                          ? 'bg-[#FF1300] text-white shadow-xs font-heading'
                          : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {n}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    )}

      {/* Empty State when no document uploaded or deleted */}
      {(!currentDoc || uploadedDocs.length === 0) && (
        <div className="bg-white rounded-3xl p-8 border border-dashed border-red-200 text-center space-y-2 animate-in fade-in">
          <UploadCloud className="w-10 h-10 text-[#FF1300]/50 mx-auto" />
          <h4 className="text-sm font-bold text-slate-800 font-heading">No Active Document</h4>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Upload your PDF, Word, or image above to configure print settings and preview before printing.
          </p>
        </div>
      )}

      {/* 5. Estimate Total Section: Dynamic, NO GST, shows only Total Pages, Total Copies, Final Total Amount */}
      <div className="rounded-3xl p-4 bg-gradient-to-br from-red-50 to-orange-50 border border-red-200/80 shadow-sm space-y-3">
        <div className="flex items-center justify-between border-b border-red-100 pb-2">
          <span className="text-xs font-bold text-slate-700 uppercase tracking-wider font-heading">
            Estimate Total
          </span>
          <span className="text-[11px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200/60">
            Live Calculated
          </span>
        </div>

        {/* 3 Core Fields Required */}
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="bg-white/80 p-2 rounded-xl border border-red-100">
            <p className="text-[10px] font-semibold text-slate-400 uppercase">
              {uploadedDocs.length > 1 ? 'Total Files' : 'Total Pages'}
            </p>
            <p className="text-sm font-black text-slate-900 font-heading">
              {uploadedDocs.length > 1 ? `${uploadedDocs.length} Files` : (currentDoc ? priceCalc.effectivePages : 0)}
            </p>
          </div>

          <div className="bg-white/80 p-2 rounded-xl border border-red-100">
            <p className="text-[10px] font-semibold text-slate-400 uppercase">
              {uploadedDocs.length > 1 ? 'Total Pages' : 'Total Copies'}
            </p>
            <p className="text-sm font-black text-slate-900 font-heading">
              {uploadedDocs.length > 1 ? priceCalc.effectivePages : printConfig.copies}
            </p>
          </div>

          <div className="bg-white/80 p-2 rounded-xl border border-red-100">
            <p className="text-[10px] font-semibold text-slate-400 uppercase">Final Total</p>
            <p className="text-base font-black text-[#FF1300] font-heading">
              {priceCalc.isValid ? `₹${priceCalc.grandTotal.toFixed(2)}` : '—'}
            </p>
          </div>
        </div>

        {uploadedDocs.length > 1 && currentDoc && (
          <div className="flex items-center justify-between px-2 pt-1 text-[11px] text-slate-600 border-t border-red-100/60">
            <span className="truncate max-w-[200px]">
              Active: <strong className="text-slate-900">{currentDoc.fileName}</strong>
            </span>
            <span className="font-bold text-[#FF1300] shrink-0">
              {currentDocPriceCalc.isValid ? `₹${currentDocPriceCalc.grandTotal.toFixed(2)}` : '—'}
            </span>
          </div>
        )}

        {/* Proceed to Checkout Button */}
        <button
          type="button"
          onClick={handleProceedClick}
          className="w-full mt-2 py-3.5 rounded-2xl bg-[#FF1300] hover:bg-[#E01100] active:scale-[0.98] text-white text-sm font-bold shadow-lg shadow-red-500/25 transition-all flex items-center justify-center gap-2 font-heading"
        >
          <span>Send for Print & Pay</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
      </div>

      {/* Right Side: Desktop Document Preview & Ad Play Section */}
      <div className="lg:col-span-4 space-y-4 sticky top-24">
        {/* Document Live Preview Card (Requirements 2.4, 2.5, 2.6, 2.7, 2.8) */}
        {currentDoc ? (
          <></>
        ) : null}

        {/* Featured Campus Offers & Ads */}
        <div className="flex items-center justify-between border-b border-slate-200 pb-2">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-[#FF1300]" />
            <h3 className="text-xs font-bold text-slate-900 font-heading">{"Featured Offers & Ads"}</h3>
          </div>
          <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
            Sponsored
          </span>
        </div>

        {/* Dynamic Campus Offers & Ads from upload_page_ads table */}
        {uploadAds.length > 0 ? (
          uploadAds.map((ad, idx) => (
            <div
              key={ad.id || idx}
              onClick={() => {
                if (ad.destination_url) {
                  if (ad.destination_url.startsWith('http')) {
                    window.open(ad.destination_url, '_blank', 'noopener,noreferrer');
                  } else {
                    window.location.href = ad.destination_url;
                  }
                }
              }}
              className="bg-white rounded-3xl p-4 border border-slate-200/90 shadow-xs hover:shadow-md transition-all space-y-2.5 overflow-hidden relative cursor-pointer group"
            >
              {ad.image_url && (
                <div className="h-32 rounded-2xl overflow-hidden relative">
                  <img
                    src={ad.image_url}
                    alt={ad.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <span className="absolute top-2 left-2 px-2 py-0.5 rounded-md bg-[#FF1300] text-white text-[9px] font-black uppercase font-mono">
                    {ad.display_order ? `#${ad.display_order} SPONSOR` : 'SPONSOR'}
                  </span>
                </div>
              )}
              <div>
                <span className="text-[10px] font-semibold text-slate-400 block">{selectedEnterprise?.name || 'Partner Shop'} Sponsor</span>
                <h4 className="text-xs font-bold text-slate-900 font-heading group-hover:text-[#FF1300] transition-colors">
                  {ad.title}
                </h4>
                {ad.description && (
                  <p className="text-[11px] text-slate-500 mt-0.5 line-clamp-2">
                    {ad.description}
                  </p>
                )}
              </div>
            </div>
          ))
        ) : (
          <div className="bg-slate-50 rounded-3xl p-5 text-center border border-slate-200/70 space-y-1">
            <Sparkles className="w-5 h-5 text-slate-300 mx-auto" />
            <p className="text-xs font-bold text-slate-500 font-heading">No Active Sponsor Ads</p>
            <p className="text-[11px] text-slate-400">Campus sponsor offers will appear here when active.</p>
          </div>
        )}

        {/* Ad 4: Print Club VIP Perks */}
        <div className="bg-gradient-to-br from-red-50 to-orange-50 rounded-3xl p-4 border border-red-200 text-slate-900 shadow-xs space-y-2">
          <div className="flex items-center gap-2 text-xs font-bold font-heading text-[#FF1300]">
            <Crown className="w-4 h-4 fill-[#FF1300]" />
            <span>printOn24 Print Club VIP</span>
          </div>
          <p className="text-[11px] text-slate-600">
            Enjoy guaranteed 20% savings on every page, priority queue processing, and zero platform fees on all partner shops.
          </p>
        </div>
      </div>
      </div>
      {/* Accept Terms & Conditions Modal Popup Before Send for Print */}
      {isTermsModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-red-100 space-y-4 animate-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="flex items-start justify-between border-b border-red-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-red-50 text-[#FF1300] flex items-center justify-center shrink-0">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900 font-heading">
                    Terms & Conditions
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Accept printing policy before dispatching order
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsTermsModalOpen(false)}
                className="w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Terms Content Summary */}
            <div className="bg-slate-50 rounded-2xl p-3.5 border border-slate-200/80 space-y-2 text-xs text-slate-600 max-h-56 overflow-y-auto">
              <p className="font-bold text-slate-800 text-[11px] uppercase tracking-wider">
                printOn24 Print Agreement & Counter Guidelines:
              </p>
              <ul className="space-y-1.5 list-disc pl-4 text-[11px] leading-relaxed">
                <li>
                  <strong className="text-slate-800">Job Dispatch:</strong> Your document(s) will be directly queued at{' '}
                  <span className="font-bold text-[#FF1300]">{selectedEnterprise.name}</span> terminal.
                </li>
                <li>
                  <strong className="text-slate-800">Quality Check:</strong> Selected paper size ({printConfig.pageSize || 'A4'}), color mode ({printConfig.printType}), and {printConfig.copies} {printConfig.copies === 1 ? 'copy' : 'copies'} will be precisely executed.
                </li>
                <li>
                  <strong className="text-slate-800">Content Declaration:</strong> The user declares ownership or legal right to print this material in compliance with institutional and copyright regulations.
                </li>
                <li>
                  <strong className="text-slate-800">Counter Pickup:</strong> Please collect your physical prints within 48 hours using the generated Token number or QR receipt.
                </li>
              </ul>
            </div>

            {/* Mandatory Checkbox */}
            <label className="flex items-start gap-2.5 cursor-pointer pt-1">
              <input
                type="checkbox"
                checked={hasAgreedTerms}
                onChange={e => setHasAgreedTerms(e.target.checked)}
                className="mt-0.5 w-4 h-4 text-[#FF1300] rounded border-slate-300 focus:ring-[#FF1300] cursor-pointer"
              />
              <span className="text-xs text-slate-700 font-medium leading-snug">
                I have reviewed my print configuration and I accept the{' '}
                <span className="font-bold text-[#FF1300]">printOn24 Terms of Service</span> and printing policy.
              </span>
            </label>

            {/* Actions */}
            <div className="flex gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setIsTermsModalOpen(false)}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmTermsAndCheckout}
                disabled={!hasAgreedTerms}
                className="flex-1 py-2.5 px-4 rounded-xl bg-[#FF1300] hover:bg-[#E01100] active:scale-95 disabled:opacity-50 disabled:pointer-events-none text-white text-xs font-bold shadow-md shadow-red-500/20 transition-all flex items-center justify-center gap-1.5 font-heading whitespace-nowrap"
              >
                <Check className="w-4 h-4 shrink-0" />
                <span>Accept & Send</span>
              </button>
            </div>
          </div>
        </div>
      )}
      {/* 6. Image Editor Modal */}
      {isImageEditorOpen && (
        <ImageEditorModal
          isOpen={isImageEditorOpen}
          onClose={() => setIsImageEditorOpen(false)}
          imageUrl={currentDoc?.imageUrl || currentDoc?.previewUrl || ''}
          fileName={currentDoc?.fileName || 'image.png'}
          initialEditing={currentDoc?.imageEditing}
          pageSize={printConfig.pageSize || 'A4'}
          availablePageSizes={availablePaperSizes}
          orientation={printConfig.layout || 'Portrait'}
          onOrientationChange={newOrient => updatePrintConfig({ layout: newOrient })}
          onPageSizeChange={size => updatePrintConfig({ pageSize: size as any })}
          onApply={handleApplyImageEdit}
        />
      )}
      {/* 7. Configuration Validation Modal */}
      <UniformAlertModal
        isOpen={validationModalInfo.isOpen}
        onClose={() => setValidationModalInfo(prev => ({ ...prev, isOpen: false }))}
        title={validationModalInfo.title}
        description={validationModalInfo.description}
        type="warning"
        confirmText="Configure Now"
      />
    </div>
  );
};
