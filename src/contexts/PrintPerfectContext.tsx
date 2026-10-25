import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import type {
  UserProfile,
  PrintEnterprise,
  MembershipPlan,
  PrintOrder,
  AppNotification,
  UploadedDoc,
  PrintConfig,
  PaymentMethod,
  UserFeedback,
  AdRequest,
  Language,
  StudentProfile,
  ShopService,
  ShopReview,
  NearbyShop,
  PartnerRegistration,
  ImageEditingState,
  OrderStatus,
  CustomPageRangeRule
} from '../types/printperfect';
import { DEFAULT_GUEST_PROFILE_PHOTO } from '../types/printperfect';
import {
  INITIAL_USER,
  INITIAL_ENTERPRISES,
  INITIAL_MEMBERSHIPS,
  INITIAL_ORDERS,
  INITIAL_NOTIFICATIONS,
  SAMPLE_DOCUMENTS,
  INITIAL_STUDENT_PROFILES,
  INITIAL_SERVICES,
  INITIAL_REVIEWS,
  INITIAL_NEARBY_SHOPS
} from '../data/mockData';
import { TRANSLATIONS } from '../utils/translations';
import { toast } from 'sonner';
import { supabase } from '../db/supabase';
import { hashPassword, validatePasswordRules } from '../lib/authSecurity';
import {
  getOrCreateUserProfile,
  updateUserProfile as apiUpdateUserProfile,
  getPrintShops,
  getShopPrintPricing,
  getUserOrders,
  getUserNotifications,
  createDatabaseOrder,
  fetchShopByTerminalCode,
  mapDbShopToEnterprise,
  convertDocumentViaBackend,
  fetchGuestProfileImage,
  submitShopReview
} from '../services/api';
import { getPdfPageCount } from '../utils/pdfPageCount';
import { isPrintModeEligible } from '../lib/printEligibility';

interface PriceCalculation {
  effectivePages: number;
  sheetsUsed: number;
  baseRatePerSide: number;
  subtotal: number;
  discount: number;
  tax: number;
  grandTotal: number;
  isValid: boolean;
  error?: string;
}

// Page Range and Custom Range Validation Helpers (Top-level Module Scope)
export const validateSelectedPageRange = (
  rangeStr: string,
  totalPages: number
): { isValid: boolean; error?: string; pageCount: number; pages: number[] } => {
  const docPages = Math.max(1, totalPages || 1);
  const trimmed = (rangeStr || '').trim();
  if (!trimmed) {
    return {
      isValid: false,
      error: 'Please enter page numbers or range (e.g. 1-3, 5).',
      pageCount: 0,
      pages: []
    };
  }

  const parts = trimmed.split(',').map(p => p.trim()).filter(Boolean);
  if (parts.length === 0) {
    return {
      isValid: false,
      error: 'Please enter a valid page number or range.',
      pageCount: 0,
      pages: []
    };
  }

  const pagesSet = new Set<number>();

  for (const part of parts) {
    if (part.includes('-')) {
      const subParts = part.split('-').map(s => s.trim());
      if (subParts.length !== 2) {
        return {
          isValid: false,
          error: `Invalid range format: "${part}". Please use format like 1-5.`,
          pageCount: 0,
          pages: []
        };
      }
      const start = parseInt(subParts[0], 10);
      const end = parseInt(subParts[1], 10);
      if (isNaN(start) || isNaN(end)) {
        return {
          isValid: false,
          error: `Invalid range numbers in "${part}".`,
          pageCount: 0,
          pages: []
        };
      }
      if (start < 1) {
        return {
          isValid: false,
          error: `Start page cannot be less than 1.`,
          pageCount: 0,
          pages: []
        };
      }
      if (start > end) {
        return {
          isValid: false,
          error: `Invalid page range: start page (${start}) cannot be greater than end page (${end}).`,
          pageCount: 0,
          pages: []
        };
      }
      if (end > docPages) {
        return {
          isValid: false,
          error: `This document contains ${docPages} pages. Please select a page range between 1 and ${docPages}.`,
          pageCount: 0,
          pages: []
        };
      }
      for (let i = start; i <= end; i++) {
        pagesSet.add(i);
      }
    } else {
      const page = parseInt(part, 10);
      if (isNaN(page)) {
        return {
          isValid: false,
          error: `Invalid page number: "${part}".`,
          pageCount: 0,
          pages: []
        };
      }
      if (page < 1) {
        return {
          isValid: false,
          error: `Page number cannot be less than 1.`,
          pageCount: 0,
          pages: []
        };
      }
      if (page > docPages) {
        return {
          isValid: false,
          error: `This document contains ${docPages} pages. Please select a page range between 1 and ${docPages}.`,
          pageCount: 0,
          pages: []
        };
      }
      pagesSet.add(page);
    }
  }

  const sortedPages = Array.from(pagesSet).sort((a, b) => a - b);
  return {
    isValid: true,
    pageCount: sortedPages.length,
    pages: sortedPages
  };
};

export const validateCustomRanges = (
  rules: CustomPageRangeRule[],
  totalPages: number
): {
  isValid: boolean;
  error?: string;
  coveredPages: number[];
  uncoveredPages: number[];
  overlappingPages: number[];
} => {
  const docPages = Math.max(1, totalPages || 1);
  if (!rules || rules.length === 0) {
    return {
      isValid: false,
      error: 'Please add at least one custom range rule.',
      coveredPages: [],
      uncoveredPages: Array.from({ length: docPages }, (_, i) => i + 1),
      overlappingPages: []
    };
  }

  const pageCountMap = new Map<number, number>();
  for (let i = 1; i <= docPages; i++) {
    pageCountMap.set(i, 0);
  }

  for (let idx = 0; idx < rules.length; idx++) {
    const rule = rules[idx];
    const from = Number(rule.fromPage);
    const to = Number(rule.toPage);

    if (isNaN(from) || isNaN(to) || from < 1 || to < 1) {
      return {
        isValid: false,
        error: `Rule #${idx + 1}: Please enter valid positive page numbers.`,
        coveredPages: [],
        uncoveredPages: [],
        overlappingPages: []
      };
    }
    if (from > to) {
      return {
        isValid: false,
        error: `Rule #${idx + 1}: start page (${from}) cannot be greater than end page (${to}).`,
        coveredPages: [],
        uncoveredPages: [],
        overlappingPages: []
      };
    }
    if (to > docPages) {
      return {
        isValid: false,
        error: `This document contains ${docPages} pages. Please select a page range between 1 and ${docPages}.`,
        coveredPages: [],
        uncoveredPages: [],
        overlappingPages: []
      };
    }

    for (let p = from; p <= to; p++) {
      pageCountMap.set(p, (pageCountMap.get(p) || 0) + 1);
    }
  }

  const overlappingPages: number[] = [];
  const uncoveredPages: number[] = [];
  const coveredPages: number[] = [];

  pageCountMap.forEach((count, page) => {
    if (count > 1) {
      overlappingPages.push(page);
    }
    if (count === 0) {
      uncoveredPages.push(page);
    }
    if (count >= 1) {
      coveredPages.push(page);
    }
  });

  if (overlappingPages.length > 0) {
    return {
      isValid: false,
      error: `Conflicting rules: page(s) ${overlappingPages.join(', ')} configured in multiple rules. Please ensure ranges do not overlap.`,
      coveredPages,
      uncoveredPages,
      overlappingPages
    };
  }

  // Per PRINTON24.docx: Custom rules do not need to cover every page.
  // Uncovered pages are not an error; they remain unconfigured and are excluded from printing and pricing.
  return {
    isValid: true,
    coveredPages,
    uncoveredPages,
    overlappingPages: []
  };
};

export const isDocConfigValid = (
  doc: UploadedDoc | null | undefined
): { isValid: boolean; error?: string } => {
  if (!doc) return { isValid: false, error: 'No document selected' };
  if (doc.uploadStatus && doc.uploadStatus !== 'READY') {
    return { isValid: false, error: 'Document upload or processing in progress.' };
  }
  if (doc.conversionStatus === 'failed') {
    return { isValid: false, error: 'Document conversion failed. Upload the file again before placing the order.' };
  }
  if (
    (doc.fileType === 'XLS' || doc.fileType === 'XLSX') &&
    doc.conversionStatus !== 'converted'
  ) {
    return { isValid: false, error: 'Select an Excel sheet and press Set before continuing.' };
  }

  const cfg = doc.printConfig;
  if (!cfg) return { isValid: false, error: 'Print configuration missing.' };
  if (!cfg.copies || cfg.copies < 1) return { isValid: false, error: 'Copies must be at least 1.' };
  if (!cfg.pageSize) {
    return { isValid: false, error: 'Please select a Paper Size (e.g. A4, A3, Letter, Legal).' };
  }

  const totalPages = Math.max(1, doc.totalPages || 1);

  if (cfg.pageRangeType === 'Custom Range') {
    const customValidation = validateCustomRanges(cfg.customRanges || [], totalPages);
    if (!customValidation.isValid) {
      return { isValid: false, error: customValidation.error || 'Invalid custom range rules.' };
    }
  } else {
    if (!cfg.printType) {
      return { isValid: false, error: 'Please select a Print Type (Color or Black & White).' };
    }
    if (!cfg.sides) {
      return { isValid: false, error: 'Please select Print Side (Single Side or Back to Back).' };
    }
    if (cfg.pageRangeType === 'Selected Pages' || cfg.pageRangeType === 'Selected pages') {
      const selValidation = validateSelectedPageRange(cfg.selectedPageRange, totalPages);
      if (!selValidation.isValid) {
        return { isValid: false, error: selValidation.error || 'Invalid selected pages range.' };
      }
    }
  }

  return { isValid: true };
};

interface PrintPerfectContextType {
  user: UserProfile;
  updateUser: (updates: Partial<UserProfile>) => void;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
  enterprises: PrintEnterprise[];
  selectedEnterprise: PrintEnterprise;
  hasExplicitlySelectedEnterprise: boolean;
  selectEnterprise: (enterpriseId: string) => void;
  resetEnterpriseSelection: () => void;
  clearUploadSession: () => void;
  memberships: MembershipPlan[];
  activeMembership: MembershipPlan | undefined;
  activeMemberships: MembershipPlan[];
  buyMembership: (enterpriseId: string, tier: MembershipPlan['tier']) => void;
  enrollMembership: (enrollment: {
    enterpriseId: string;
    tier: MembershipPlan['tier'];
    fullName: string;
    email: string;
    phone: string;
    address: string;
    photoUrl?: string;
    paymentId?: string;
  }) => Promise<MembershipPlan>;
  uploadedDocs: UploadedDoc[];
  currentDoc: UploadedDoc | null;
  setCurrentDoc: (doc: UploadedDoc | null) => void;
  selectDocument: (docId: string) => void;
  uploadNewDoc: (file: File, customData?: { totalPages?: number; imageUrl?: string }) => void;
  uploadMultipleDocs: (files: FileList | File[]) => void;
  removeCurrentDoc: () => void;
  removeUploadedDoc: (docId: string) => void;
  updateDocEditing: (docId: string, editing: ImageEditingState) => void;
  updateDocImageOutput: (docId: string, outputUrl: string, editingState: ImageEditingState) => void;
  reconvertDocument: (docId: string, options: { selectedSheet?: string; scaling?: 'No Scaling' | 'Fit Sheet on One Page' | 'Fit All Columns on One Page' | 'Fit All Rows on One Page' }) => Promise<void>;
  validateSelectedPageRange: (rangeStr: string, totalPages: number) => { isValid: boolean; error?: string; pageCount: number; pages: number[] };
  validateCustomRanges: (rules: CustomPageRangeRule[], totalPages: number) => { isValid: boolean; error?: string; coveredPages: number[]; uncoveredPages: number[]; overlappingPages: number[] };
  isDocConfigValid: (doc: UploadedDoc | null | undefined) => { isValid: boolean; error?: string };
  printConfig: PrintConfig;
  updatePrintConfig: (updates: Partial<PrintConfig>) => void;
  applyPrintConfigToDocuments: (documentIds: string[], config: PrintConfig) => void;
  resetPrintConfig: () => void;
  priceCalc: PriceCalculation;
  currentDocPriceCalc: PriceCalculation;
  getDocPrice: (doc: UploadedDoc) => PriceCalculation;
  orders: PrintOrder[];
  activeReceiptOrder: PrintOrder | null;
  setActiveReceiptOrder: (order: PrintOrder | null) => void;
  createOrder: (paymentMethod: PaymentMethod, paymentDetail?: string, customerName?: string) => PrintOrder;
  notifications: AppNotification[];
  unreadNotifCount: number;
  markNotificationAsRead: (id: string) => void;
  markAllNotificationsAsRead: () => void;
  clearAllNotifications: () => void;
  submitFeedback: (category: UserFeedback['category'], subject: string, details: string, rating?: number) => void;
  submitAdRequest: (req: Omit<AdRequest, 'id' | 'userId' | 'submittedAt' | 'status'>) => void;
  isQuickScanOpen: boolean;
  openQuickScan: () => void;
  closeQuickScan: () => void;
  pairTerminal: (terminalCode: string) => boolean;
  pairTerminalByCode: (code: string) => boolean;
  verifyAndSelectShopByCode: (code: string) => Promise<{ success: boolean; shop?: PrintEnterprise; message?: string }>;
  feedbackList: UserFeedback[];
  adRequests: AdRequest[];
  // Student Profile CRUD
  studentProfiles: StudentProfile[];
  activeStudentProfile: StudentProfile | undefined;
  addStudentProfile: (profile: Omit<StudentProfile, 'id'>) => void;
  updateStudentProfile: (id: string, updates: Partial<StudentProfile>) => void;
  deleteStudentProfile: (id: string) => void;
  setActiveStudentProfile: (id: string) => void;
  // Shop Services & Reviews
  shopServices: ShopService[];
  shopReviews: ShopReview[];
  addShopReview: (review: Omit<ShopReview, 'id' | 'date'>) => void;
  // Nearby Print Shops (Within 1 KM)
  nearbyShops: NearbyShop[];
  // Partner Registration (Start Business)
  partnerRegistrations: PartnerRegistration[];
  submitPartnerRegistration: (data: Omit<PartnerRegistration, 'id' | 'status' | 'submittedAt'>) => void;
  // Membership Active / Inactive state
  isMembershipActive: boolean;
  toggleMembershipStatus: () => void;
  // Default Print Preferences (functional save & auto-apply)
  saveDefaultPrintConfig: (config: PrintConfig) => void;
  // GO FOR PRINT original document retrieval with 12h expiry validation
  retrieveDocumentForPrint: (orderId: string, documentId?: string) => Promise<{ success: boolean; url?: string; error?: string; docName?: string }>;
  // Auth methods & state
  isAuthModalOpen: boolean;
  authModalTitle: string;
  authModalSubtitle: string;
  openAuthModal: (pendingAction?: () => void, title?: string, subtitle?: string) => void;
  closeAuthModal: () => void;
  requireAuth: (action: () => void, title?: string, subtitle?: string) => boolean;
  loginWithEmail: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  registerWithEmail: (name: string, email: string, password: string, phone?: string) => Promise<{ success: boolean; error?: string }>;
  loginWithGoogle: () => Promise<{ success: boolean; error?: string }>;
  updatePassword: (oldPassword: string, newPassword: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
}

const getGuestSessionId = (): string => {
  try {
    let s = sessionStorage.getItem('printperfect_guest_id');
    if (!s) {
      s = `guest_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
      sessionStorage.setItem('printperfect_guest_id', s);
    }
    return s;
  } catch {
    return `guest_${Date.now()}`;
  }
};

export const PrintPerfectContext = createContext<PrintPerfectContextType | undefined>(undefined);

export const PrintPerfectProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // 1. User state with strict session isolation for guests
  const [user, setUser] = useState<UserProfile>(() => {
    // Only authenticated users with valid email are saved/loaded across browser sessions
    const saved = localStorage.getItem('printperfect_user');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed && parsed.isAuthenticated && !parsed.isGuest && parsed.email) {
          return parsed;
        }
      } catch {}
    }

    // Guest users: session-only storage in sessionStorage (wiped on tab/browser close)
    try {
      const sessionGuest = sessionStorage.getItem('printperfect_guest_user');
      if (sessionGuest) {
        const parsedGuest = JSON.parse(sessionGuest);
        if (parsedGuest && parsedGuest.isGuest) {
          return {
            ...parsedGuest,
            avatarUrl: DEFAULT_GUEST_PROFILE_PHOTO
          };
        }
      }
    } catch {}

    // Fresh guest visitor: completely empty name, no previous data, locked guest avatar
    return {
      ...INITIAL_USER,
      id: getGuestSessionId(),
      name: '',
      surname: '',
      avatarUrl: DEFAULT_GUEST_PROFILE_PHOTO,
      isGuest: true,
      isAuthenticated: false
    };
  });

  useEffect(() => {
    if (user.isAuthenticated && !user.isGuest) {
      localStorage.setItem('printperfect_user', JSON.stringify(user));
      try { sessionStorage.removeItem('printperfect_guest_user'); } catch {}
    } else {
      // Guest state stays strictly in sessionStorage for this visit only
      try {
        sessionStorage.setItem('printperfect_guest_user', JSON.stringify(user));
      } catch {}
      localStorage.removeItem('printperfect_user');
    }
  }, [user]);

  // 2. Enterprises
  const [enterprises, setEnterprises] = useState<PrintEnterprise[]>(INITIAL_ENTERPRISES);
  const [selectedEnterpriseId, setSelectedEnterpriseId] = useState<string | null>(() => {
    return localStorage.getItem('printperfect_selected_ent') || null;
  });

  // Sync with Supabase on mount
  useEffect(() => {
    let isMounted = true;

    // Run automatic backend cleanup for expired documents (12-hour retention)
    try {
      supabase.rpc('cleanup_expired_print_documents').then(({ data, error }) => {
        if (!error && data?.expired_files && Array.isArray(data.expired_files) && data.expired_files.length > 0) {
          const byBucket: Record<string, string[]> = {};
          data.expired_files.forEach((f: { bucket?: string; path?: string }) => {
            if (f.bucket && f.path) {
              if (!byBucket[f.bucket]) byBucket[f.bucket] = [];
              byBucket[f.bucket].push(f.path);
            }
          });
          for (const [bucket, paths] of Object.entries(byBucket)) {
            supabase.storage.from(bucket).remove(paths).catch(() => {});
          }
        }
      });
    } catch {
      // RPC check silent fallback
    }

    // Load remote print shops
    getPrintShops().then(remoteShops => {
      if (!isMounted) return;

      const previouslySelectedShop = enterprises.find(shop => shop.id === selectedEnterpriseId);
      const selectedRemoteShop = remoteShops.find(
        shop =>
          shop.id === selectedEnterpriseId ||
          (previouslySelectedShop?.terminalCode &&
            shop.terminalCode === previouslySelectedShop.terminalCode)
      );

      if (
        previouslySelectedShop &&
        !selectedRemoteShop &&
        INITIAL_ENTERPRISES.some(shop => shop.id === selectedEnterpriseId)
      ) {
        setSelectedEnterpriseId(null);
        localStorage.removeItem('printperfect_selected_ent');
      }

      if (remoteShops.length > 0) {
        if (selectedRemoteShop && selectedRemoteShop.id !== selectedEnterpriseId) {
          setSelectedEnterpriseId(selectedRemoteShop.id);
          localStorage.setItem('printperfect_selected_ent', selectedRemoteShop.id);
        }

        setEnterprises(prev => {
          const merged = [...prev];
          remoteShops.forEach(rs => {
            const idx = merged.findIndex(e => e.id === rs.id || e.terminalCode === rs.terminalCode);
            if (idx >= 0) {
              merged[idx] = {
                ...merged[idx],
                id: rs.id,
                name: rs.name,
                address: rs.address,
                terminalCode: rs.terminalCode,
                latitude: rs.latitude,
                longitude: rs.longitude,
                rating: rs.rating,
                logoUrl: rs.logoUrl || merged[idx].logoUrl || '',
                membershipEnabled: rs.membershipEnabled,
                membershipPrice: rs.membershipPrice,
                pricing: rs.pricing || merged[idx].pricing
              };
            } else {
              merged.push({
                ...merged[0],
                id: rs.id,
                name: rs.name,
                address: rs.address,
                terminalCode: rs.terminalCode,
                latitude: rs.latitude,
                longitude: rs.longitude,
                rating: rs.rating,
                logoUrl: rs.logoUrl || '',
                membershipEnabled: rs.membershipEnabled,
                membershipPrice: rs.membershipPrice,
                pricing: rs.pricing || merged[0].pricing
              });
            }
          });
          return merged;
        });
      }
    });

    // Load remote user active memberships from Supabase (Strictly Real DB driven, zero fake memberships)
    try {
      supabase
        .from('user_memberships')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .then(({ data, error }) => {
          if (isMounted && !error && Array.isArray(data)) {
            if (data.length === 0) {
              // No active memberships in DB -> ensure empty list
              setMemberships([]);
              localStorage.removeItem('printperfect_memberships');
            } else {
              const mapped: MembershipPlan[] = data.map(m => ({
                id: m.id,
                enterpriseId: m.shop_id,
                enterpriseName: enterprises.find(e => e.id === m.shop_id)?.name || 'printOn24 Store',
                tier: m.tier || 'Print Club Member',
                memberId: `PP-${m.id.slice(-6)}`,
                cardNumber: m.card_number || '4522 •••• •••• 9821',
                pricePerMonth: 99,
                discountPercentage: m.discount_percentage || 20,
                validFrom: new Date(m.created_at || Date.now()).toISOString().split('T')[0],
                validUntil: m.valid_until || new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
                status: 'active',
                daysRemaining: 30,
                perks: ['Flat 20% discount on all prints', 'Queue priority at terminal']
              }));
              setMemberships(mapped);
              localStorage.setItem('printperfect_memberships', JSON.stringify(mapped));
            }
          }
        });
    } catch {
      // Supabase query fallback
    }

    // Load remote profile only for authenticated non-guest users
    if (user.isAuthenticated && !user.isGuest && user.id && !user.id.startsWith('guest_') && user.id !== 'usr-current-01') {
      getOrCreateUserProfile(user.id).then(profile => {
        if (isMounted && profile) {
          setUser(prev => ({
            ...prev,
            name: profile.name,
            surname: profile.surname,
            email: profile.email,
            phone: profile.phone,
            address: profile.address,
            avatarUrl: profile.avatarUrl || prev.avatarUrl
          }));
        }
      });

      // Load remote orders for authenticated user
      getUserOrders(user.id).then(remoteOrders => {
        if (isMounted && remoteOrders.length > 0) {
          setOrders(prev => {
            const existingIds = new Set(prev.map(o => o.id));
            const newOrders: PrintOrder[] = remoteOrders
              .filter(ro => !existingIds.has(ro.id))
              .map(ro => ({
                id: ro.id,
                orderNumber: ro.orderNumber,
                tokenNumber: ro.tokenNumber,
                userId: ro.userId,
                enterpriseId: ro.shopId,
                enterpriseName: ro.shopName,
                enterpriseAddress: enterprises.find(e => e.id === ro.shopId)?.address || 'Partner Shop Counter',
              document: {
                id: `doc_${ro.id}`,
                fileName: ro.documentName,
                fileType: (ro.fileType as any) || 'PDF',
                fileSizeMb: 1.2,
                totalPages: ro.totalPages,
                uploadedAt: ro.createdAt
              },
              config: {
                pageSize: (ro.configPageSize as any) || 'A4',
                paperType: (ro.configPaperType as any) || 'Normal',
                printType: (ro.configPrintType as any) || 'Color',
                sides: (ro.configSides as any) || 'Single Side',
                copies: ro.configCopies || 1,
                layout: 'Portrait',
                pageRangeType: 'All Pages',
                selectedPageRange: `1-${ro.totalPages}`,
                pagesPerSheet: '1-in-1'
              },
              calculatedPages: ro.totalPages,
              sheetsUsed: ro.totalPages * (ro.configCopies || 1),
              unitPrice: Number((ro.subtotal / Math.max(1, ro.totalPages)).toFixed(2)),
              subtotal: ro.subtotal,
              discount: ro.discount,
              tip: 0,
              tax: 0,
              grandTotal: ro.grandTotal,
              paymentMethod: (ro.paymentMethod as any) || 'Razorpay',
              paymentOptionDetail: ro.paymentMethod === 'Razorpay' ? 'Razorpay Online' : 'Pay on Counter',
              paymentStatus: ro.paymentStatus === 'paid' ? 'PAID' : 'PAID',
              status: (ro.orderStatus as OrderStatus) || 'Queued',
              createdAt: ro.createdAt,
              barcode: `${ro.id}-COPYGO`,
              invoiceId: `INV-${ro.orderNumber}`
            }));
          return [...newOrders, ...prev];
        });
      }
    });
    }

    // Realtime channel for order status updates
    const channel = supabase
      .channel('schema-db-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'print_orders' },
        payload => {
          if (payload.eventType === 'UPDATE' && payload.new) {
            setOrders(current =>
              current.map(o => (o.id === payload.new.id ? { ...o, status: payload.new.order_status } : o))
            );
          }
        }
      )
      .subscribe();

    return () => {
      isMounted = false;
      supabase.removeChannel(channel);
    };
  }, []);

  const hasExplicitlySelectedEnterprise = Boolean(
    selectedEnterpriseId && enterprises.some(e => e.id === selectedEnterpriseId)
  );

  const selectedEnterprise = (selectedEnterpriseId && enterprises.find(e => e.id === selectedEnterpriseId)) || enterprises[0];

  useEffect(() => {
    if (!selectedEnterpriseId) return;

    let isCurrent = true;
    setEnterprises(current =>
      current.map(enterprise =>
        enterprise.id === selectedEnterpriseId
          ? {
              ...enterprise,
              pricing: {
                ...enterprise.pricing,
                shopId: selectedEnterpriseId,
                isConfigured: false,
                eligibilitySettingsLoaded: false,
                eligibilitySettingsError: false
              }
            }
          : enterprise
      )
    );

    getShopPrintPricing(selectedEnterpriseId)
      .then(pricing => {
        if (!isCurrent) return;
        setEnterprises(current =>
          current.map(enterprise =>
            enterprise.id === selectedEnterpriseId
              ? { ...enterprise, pricing }
              : enterprise
          )
        );
      })
      .catch(error => {
        console.error('Failed to refresh selected shop pricing:', error);
        if (!isCurrent) return;
        setEnterprises(current =>
          current.map(enterprise =>
            enterprise.id === selectedEnterpriseId
              ? {
                  ...enterprise,
                  pricing: {
                    ...enterprise.pricing,
                    shopId: selectedEnterpriseId,
                    isConfigured: false,
                    eligibilitySettingsLoaded: false,
                    eligibilitySettingsError: true
                  }
                }
              : enterprise
          )
        );
      });

    return () => {
      isCurrent = false;
    };
  }, [selectedEnterpriseId]);

  const selectEnterprise = (enterpriseId: string) => {
    setSelectedEnterpriseId(enterpriseId);
    localStorage.setItem('printperfect_selected_ent', enterpriseId);
  };

  const resetEnterpriseSelection = () => {
    setSelectedEnterpriseId(null);
    localStorage.removeItem('printperfect_selected_ent');
  };

  const clearUploadSession = () => {
    setUploadedDocs([]);
    setCurrentDoc(null);
  };

  // 3. Memberships
  const [memberships, setMemberships] = useState<MembershipPlan[]>(() => {
    const saved = localStorage.getItem('printperfect_memberships');
    return saved ? JSON.parse(saved) : INITIAL_MEMBERSHIPS;
  });

  const activeMembership = memberships.find(m => m.enterpriseId === selectedEnterprise.id && m.status !== 'inactive');
  const activeMemberships = useMemo(() => {
    return memberships.filter(m => m.status === 'active' || m.status === 'expiring');
  }, [memberships]);

  const buyMembership = (enterpriseId: string, tier: MembershipPlan['tier']) => {
    const ent = enterprises.find(e => e.id === enterpriseId) || selectedEnterprise;
    const newPlan: MembershipPlan = {
      id: `mem_${Date.now()}`,
      enterpriseId,
      enterpriseName: ent.name,
      tier,
      memberId: `PP-${ent.shortCode}-${Math.floor(1000 + Math.random() * 9000)}`,
      cardNumber: `4522 •••• •••• ${Math.floor(1000 + Math.random() * 9000)}`,
      pricePerMonth: tier === 'Platinum VIP' ? 499 : tier === 'Gold' ? 299 : 149,
      discountPercentage: tier === 'Platinum VIP' ? 30 : tier === 'Gold' ? 25 : 20,
      validFrom: new Date().toISOString().split('T')[0],
      validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      status: 'active',
      daysRemaining: 30,
      perks: [
        `Flat ${tier === 'Platinum VIP' ? '30%' : tier === 'Gold' ? '25%' : '20%'} discount on all prints`,
        'Priority queue processing at shop terminal',
        'Free spiral/staple binding',
        'Cloud history unlimited storage'
      ]
    };
    const updated = [newPlan, ...memberships.filter(m => m.enterpriseId !== enterpriseId)];
    setMemberships(updated);
    localStorage.setItem('printperfect_memberships', JSON.stringify(updated));
    toast.success(`Active ${tier} Membership unlocked at ${ent.name}! 🎉`);
  };

  const enrollMembership = async (enrollment: {
    enterpriseId: string;
    tier: MembershipPlan['tier'];
    fullName: string;
    email: string;
    phone: string;
    address: string;
    photoUrl?: string;
    paymentId?: string;
  }): Promise<MembershipPlan> => {
    const ent = enterprises.find(e => e.id === enrollment.enterpriseId) || selectedEnterprise;
    const pricePerMonth = enrollment.tier === 'Platinum VIP' ? 499 : enrollment.tier === 'Gold' ? 299 : 149;
    const discountPercentage = enrollment.tier === 'Platinum VIP' ? 30 : enrollment.tier === 'Gold' ? 25 : 20;

    const newPlan: MembershipPlan = {
      id: `mem_${Date.now()}`,
      enterpriseId: ent.id,
      enterpriseName: ent.name,
      tier: enrollment.tier,
      memberId: `PP-${ent.shortCode}-${Math.floor(1000 + Math.random() * 9000)}`,
      cardNumber: `4522 •••• •••• ${Math.floor(1000 + Math.random() * 9000)}`,
      pricePerMonth,
      discountPercentage,
      validFrom: new Date().toISOString().split('T')[0],
      validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      status: 'active',
      daysRemaining: 30,
      userName: enrollment.fullName,
      userEmail: enrollment.email,
      userPhone: enrollment.phone,
      userAddress: enrollment.address,
      userPhotoUrl: enrollment.photoUrl || user.avatarUrl,
      perks: [
        `Flat ${discountPercentage}% discount on all print jobs`,
        'Priority queue processing at shop terminal',
        'Free spiral / staple binding on large sets',
        'Unlimited digital invoice backup'
      ]
    };

    const updated = [newPlan, ...memberships.filter(m => m.enterpriseId !== ent.id)];
    setMemberships(updated);
    localStorage.setItem('printperfect_memberships', JSON.stringify(updated));

    // Update user profile fields if changed
    updateUser({
      name: enrollment.fullName.split(' ')[0] || user.name,
      surname: enrollment.fullName.split(' ').slice(1).join(' ') || user.surname,
      email: enrollment.email || user.email,
      phone: enrollment.phone || user.phone,
      address: enrollment.address || user.address,
      avatarUrl: enrollment.photoUrl || user.avatarUrl
    });

    try {
      await supabase.from('shop_memberships').insert({
        id: newPlan.id,
        user_id: user.id,
        shop_id: ent.id,
        shop_name: ent.name,
        tier: newPlan.tier,
        member_id: newPlan.memberId,
        amount: newPlan.pricePerMonth,
        discount_pct: newPlan.discountPercentage,
        payment_id: enrollment.paymentId || 'RAZORPAY_PAID',
        user_name: enrollment.fullName,
        user_email: enrollment.email,
        user_phone: enrollment.phone,
        user_address: enrollment.address,
        user_photo_url: newPlan.userPhotoUrl,
        valid_until: newPlan.validUntil,
        status: 'active'
      });
    } catch (e) {
      console.warn('Membership Supabase sync skipped:', e);
    }

    toast.success(`${enrollment.tier} Membership Activated at ${ent.name}! 🎉`);
    return newPlan;
  };

  // 4. Documents & Current Doc
  const [uploadedDocs, setUploadedDocs] = useState<UploadedDoc[]>([]);
  const [currentDoc, setCurrentDoc] = useState<UploadedDoc | null>(null);

  const uploadNewDoc = async (file: File, customData?: { totalPages?: number; imageUrl?: string }): Promise<UploadedDoc | null> => {
    // 1. File Validation
    if (!file) {
      toast.error('No file selected.');
      return null;
    }

    // 50MB file size limit
    if (file.size > 50 * 1024 * 1024) {
      toast.error('File size exceeds 50MB limit. Please upload a smaller file.');
      return null;
    }

    const rawExt = file.name.split('.').pop()?.toUpperCase() || 'PDF';
    let validExt: UploadedDoc['fileType'] = 'PDF';
    if (['PDF', 'DOCX', 'DOC', 'XLS', 'XLSX', 'PPT', 'PPTX', 'JPG', 'PNG'].includes(rawExt)) {
      validExt = rawExt as UploadedDoc['fileType'];
    } else if (file.type.includes('image')) {
      validExt = 'JPG';
    } else if (file.type.includes('word') || file.type.includes('document')) {
      validExt = 'DOCX';
    } else if (file.type.includes('sheet') || file.type.includes('excel')) {
      validExt = 'XLSX';
    } else if (file.type.includes('presentation') || file.type.includes('powerpoint')) {
      validExt = 'PPTX';
    } else if (file.type.includes('text') || rawExt === 'TXT') {
      validExt = 'TXT' as any;
    } else {
      validExt = 'OTHER';
    }

    const docId = `doc_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const sanitizedName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const storagePath = `${user.id}/${Date.now()}_${sanitizedName}`;

    // 2. Upload Actual File to Secure Supabase Storage Bucket 'print_documents'
    let publicStorageUrl = '';
    try {
      const { data: uploadData, error: uploadErr } = await supabase.storage
        .from('print_documents')
        .upload(storagePath, file, {
          cacheControl: '3600',
          upsert: true,
          contentType: file.type || 'application/octet-stream'
        });

      if (uploadErr) {
        console.error('Supabase storage upload error:', uploadErr);
        toast.error(`Upload failed: ${uploadErr.message}`);
        // Per requirement: If upload fails, DO NOT create fake DB record! DO NOT mark READY!
        return null;
      }

      // Get storage public / preview URL
      const { data: urlData } = supabase.storage
        .from('print_documents')
        .getPublicUrl(storagePath);
      publicStorageUrl = urlData?.publicUrl || '';
    } catch (err: any) {
      console.error('File storage upload exception:', err);
      toast.error('File could not be uploaded to secure storage. Please retry.');
      return null;
    }

    // 3. Create preview URL if it's an image (prioritize local blob for instant 100% reliable rendering)
    let localBlobUrl = '';
    if (validExt === 'JPG' || validExt === 'PNG' || file.type.startsWith('image/')) {
      try {
        localBlobUrl = URL.createObjectURL(file);
      } catch (e) {
        console.warn('Could not create object URL for file:', e);
      }
    }
    const imgUrl = customData?.imageUrl || localBlobUrl || publicStorageUrl;

    let pdfPageCountFailed = false;
    let calculatedPages = customData?.totalPages !== undefined
      ? customData.totalPages
      : (validExt === 'JPG' || validExt === 'PNG' || file.type.startsWith('image/'))
      ? 1
      : 1;

    // Detect orientation & dimensions (preserve original orientation)
    let detectedLayout: 'Portrait' | 'Landscape' = 'Portrait';
    if (
      validExt === 'XLS' ||
      validExt === 'XLSX' ||
      validExt === 'PPT' ||
      validExt === 'PPTX' ||
      file.name.match(/\.(xlsx?|csv|pptx?)$/i)
    ) {
      detectedLayout = 'Landscape';
    }

    // Detect real page count & orientation for PDF files
    if (validExt === 'PDF' || file.type === 'application/pdf') {
      try {
        const buffer = await file.arrayBuffer();
        calculatedPages = await getPdfPageCount(new Uint8Array(buffer));
        const text = new TextDecoder('latin1').decode(buffer);

        // Detect PDF orientation from MediaBox or CropBox
        const boxMatches = text.match(/\/(?:MediaBox|CropBox)\s*\[\s*([-\d.]+)\s+([-\d.]+)\s+([-\d.]+)\s+([-\d.]+)\s*\]/);
        if (boxMatches) {
          const w = Math.abs(parseFloat(boxMatches[3]) - parseFloat(boxMatches[1]));
          const h = Math.abs(parseFloat(boxMatches[4]) - parseFloat(boxMatches[2]));
          if (w > h) {
            detectedLayout = 'Landscape';
          }
        }
      } catch (pdfErr) {
        console.error('Failed to read PDF page count:', pdfErr);
        pdfPageCountFailed = true;
        toast.error(`Could not read the pages in "${file.name}". Please upload the PDF again.`);
      }
    }

    // Detect slide count & orientation for PowerPoint files
    if (validExt === 'PPT' || validExt === 'PPTX' || file.name.match(/\.pptx?$/i) || file.type.includes('presentation')) {
      detectedLayout = 'Landscape';
      try {
        const buffer = await file.arrayBuffer();
        const text = new TextDecoder('latin1').decode(buffer);
        const slideMatches = text.match(/ppt\/slides\/slide\d+\.xml/g);
        if (slideMatches && slideMatches.length > 0) {
          const uniqueSlides = new Set(slideMatches).size;
          if (uniqueSlides > 0) {
            calculatedPages = uniqueSlides;
          }
        }
      } catch (pptErr) {
        console.warn('PPT slide count detection note:', pptErr);
      }
    }

    // Detect orientation for Word files. Their page count comes from the converted PDF.
    if (validExt === 'DOC' || validExt === 'DOCX' || file.name.match(/\.docx?$/i) || file.type.includes('word')) {
      detectedLayout = 'Portrait';
    }

    // Detect image dimensions & orientation (Requirement 3: Automatic Orientation for Landscape uploads)
    if (file.name.match(/\.(jpe?g|png|webp|gif|svg)$/i) || file.type.startsWith('image/')) {
      try {
        await new Promise<void>((resolve) => {
          const img = new Image();
          img.onload = () => {
            if (img.naturalWidth > img.naturalHeight) {
              detectedLayout = 'Landscape';
            }
            resolve();
          };
          img.onerror = () => resolve();
          img.src = localBlobUrl || publicStorageUrl;
        });
      } catch {}
    }

    if ((customData as any)?.orientation) {
      detectedLayout = (customData as any).orientation;
    }

    let finalPreviewUrl = publicStorageUrl;
    let convertedPdfUrl = '';
    let isConverted = false;
    let conversionStatus: 'idle' | 'converting' | 'converted' | 'failed' = pdfPageCountFailed ? 'failed' : 'idle';
    let excelSheets: string[] | undefined = undefined;
    let selectedSheet = '';
    let excelScaling: 'No Scaling' | 'Fit Sheet on One Page' | 'Fit All Columns on One Page' | 'Fit All Rows on One Page' = 'No Scaling';

    const isExcelDoc = ['XLS', 'XLSX'].includes(validExt) || file.name.match(/\.(xlsx?|csv)$/i);
    const isOfficeDoc = ['DOC', 'DOCX', 'XLS', 'XLSX', 'PPT', 'PPTX'].includes(validExt) ||
      file.name.match(/\.(docx?|xlsx?|csv|pptx?)$/i);

    if (isExcelDoc) {
      calculatedPages = 0;
      try {
        const inspection = await convertDocumentViaBackend({
          file,
          fileUrl: publicStorageUrl,
          fileName: file.name,
          fileType: validExt,
          inspectOnly: true,
          userId: user.id,
          shopId: selectedEnterprise.id,
          docId
        });
        if (!inspection?.success || !inspection.sheets?.length) {
          throw new Error(inspection?.error || 'No worksheets were found in this workbook.');
        }
        excelSheets = inspection.sheets;
        selectedSheet = inspection.sheets[0];
        conversionStatus = 'idle';
      } catch (inspectErr) {
        calculatedPages = 0;
        conversionStatus = 'failed';
        console.error('Excel workbook inspection failed:', inspectErr);
        toast.error(inspectErr instanceof Error
          ? `Could not read Excel sheets: ${inspectErr.message}`
          : 'Could not read Excel sheets. Please upload the workbook again.');
      }
    } else if (isOfficeDoc) {
      calculatedPages = 0;
      try {
        conversionStatus = 'converting';
        const convResult = await convertDocumentViaBackend({
          file,
          fileUrl: publicStorageUrl,
          fileName: file.name,
          fileType: validExt,
          scaling: 'No Scaling',
          userId: user.id,
          shopId: selectedEnterprise.id,
          docId
        });

        if (convResult?.success && convResult.pdfUrl) {
          const convertedPageCount = convResult.totalPages;
          if (typeof convertedPageCount !== 'number' || !Number.isSafeInteger(convertedPageCount) || convertedPageCount < 1) {
            throw new Error('The document converter did not return a valid page count.');
          }
          calculatedPages = convertedPageCount;
          try {
            calculatedPages = await getPdfPageCount(convResult.pdfUrl);
          } catch (previewCountError) {
            console.warn('Could not read converted PDF page count in browser; using the converter count:', previewCountError);
          }
          convertedPdfUrl = convResult.pdfUrl;
          finalPreviewUrl = convResult.pdfUrl;
          isConverted = true;
          conversionStatus = 'converted';
          if (convResult.sheets && convResult.sheets.length > 0) {
            excelSheets = convResult.sheets;
            selectedSheet = convResult.sheets[0];
          }
        } else {
          calculatedPages = 0;
          conversionStatus = 'failed';
          toast.error(convResult?.error || `Could not convert "${file.name}". Please upload it again.`);
        }
      } catch (convErr) {
        console.error('Document conversion failed:', convErr);
        calculatedPages = 0;
        conversionStatus = 'failed';
        toast.error(convErr instanceof Error
          ? `Could not convert "${file.name}": ${convErr.message}`
          : `Could not convert "${file.name}". Please upload it again.`);
      }
    }

    // 4. Calculate exactly 12-hour expiry timestamp
    const createdAt = new Date().toISOString();
    const expiryAt = new Date(Date.now() + 12 * 60 * 60 * 1000).toISOString();

    // Requirement 5 & 6: Set default initial configuration
    // Copies: 1, Page Range: All Pages, Pages per Sheet: 1-in-1, Paper Size: A4
    const docPrintConfig: PrintConfig = {
      copies: 1,
      pageSize: 'A4',
      paperType: 'Normal',
      printType: '' as any,
      sides: calculatedPages === 1 ? 'Single Side' : '' as any,
      layout: detectedLayout,
      pageRangeType: 'All Pages',
      selectedPageRange: '',
      customRanges: [],
      pagesPerSheet: '1-in-1'
    };

    const newDoc: UploadedDoc = {
      id: docId,
      userId: user.id,
      shopId: selectedEnterprise.id,
      fileName: file.name,
      originalFileName: file.name,
      fileType: validExt,
      mimeType: file.type || 'application/octet-stream',
      fileSize: file.size,
      fileSizeMb: Number((file.size / (1024 * 1024)).toFixed(2)) || 0.1,
      totalPages: calculatedPages,
      imageUrl: imgUrl || publicStorageUrl,
      previewUrl: finalPreviewUrl || publicStorageUrl || imgUrl,
      convertedPdfUrl: convertedPdfUrl || undefined,
      isConverted,
      conversionStatus,
      excelSheets,
      selectedSheet,
      excelScaling,
      storageBucket: 'print_documents',
      storagePath,
      storageUrl: publicStorageUrl,
      uploadStatus: 'READY',
      createdAt,
      expiryAt,
      uploadedAt: new Date().toLocaleString(),
      printConfig: docPrintConfig
    };

    setUploadedDocs(prev => [newDoc, ...prev]);
    setCurrentDoc(newDoc);
    setPrintConfig(docPrintConfig);

    // 5. Create or update Database Record in 'uploaded_documents'
    try {
      const { error: dbError } = await supabase.from('uploaded_documents').upsert(
        {
          id: newDoc.id,
          user_id: user.id,
          shop_id: selectedEnterprise.id,
          order_id: null,
          original_file_name: file.name,
          file_name: file.name,
          file_type: validExt,
          mime_type: file.type || 'application/octet-stream',
          file_size: file.size,
          file_size_mb: newDoc.fileSizeMb,
          total_pages: newDoc.totalPages,
          storage_bucket: 'print_documents',
          storage_path: storagePath,
          upload_status: 'READY',
          preview_url: finalPreviewUrl || publicStorageUrl,
          converted_pdf_url: convertedPdfUrl || null,
          original_file_url: publicStorageUrl,
          excel_sheets: excelSheets || null,
          excel_scaling: excelScaling,
          conversion_service: isConverted ? 'Gotenberg-LibreOffice' : null,
          image_editing: {},
          print_config: docPrintConfig,
          created_at: createdAt,
          expiry_at: expiryAt,
          deleted_at: null
        },
        { onConflict: 'id' }
      );

      if (dbError) {
        console.warn('Supabase document DB insert warning:', dbError.message);
      }
    } catch (e) {
      console.warn('Supabase document DB sync skipped:', e);
    }

    toast.success(`'${file.name}' securely uploaded (Available for print for 12 hours)`);
    return newDoc;
  };

  const uploadMultipleDocs = (files: FileList | File[]) => {
    const fileArray = Array.from(files);
    if (fileArray.length === 0) return;
    fileArray.forEach(file => {
      uploadNewDoc(file);
    });
    toast.success(`${fileArray.length} document${fileArray.length > 1 ? 's' : ''} added successfully!`);
  };

  const removeCurrentDoc = () => {
    if (currentDoc) {
      removeUploadedDoc(currentDoc.id);
    }
  };

  const removeUploadedDoc = (docId: string) => {
    // 1. Delete from Supabase uploaded_documents table
    supabase
      .from('uploaded_documents')
      .delete()
      .eq('id', docId)
      .then(
        () => {
          console.log(`Document ${docId} deleted from database`);
        },
        (err: any) => {
          console.warn('DB delete document error:', err);
        }
      );

    // 2. Reactively update uploadedDocs and clear/switch active document state
    setUploadedDocs(prev => {
      const filtered = prev.filter(d => d.id !== docId);
      if (currentDoc?.id === docId) {
        if (filtered.length > 0) {
          setCurrentDoc(filtered[0]);
          if (filtered[0].printConfig) {
            setPrintConfig(filtered[0].printConfig);
          }
        } else {
          setCurrentDoc(null);
          resetPrintConfig();
        }
      }
      return filtered;
    });
    toast.info('Document deleted successfully');
  };

  const updateDocEditing = (docId: string, editing: ImageEditingState) => {
    setUploadedDocs(prev =>
      prev.map(d => (d.id === docId ? { ...d, imageEditing: editing } : d))
    );
    if (currentDoc?.id === docId) {
      setCurrentDoc(prev => (prev ? { ...prev, imageEditing: editing } : null));
    }
  };

  const updateDocImageOutput = (docId: string, outputUrl: string, editingState: ImageEditingState) => {
    const orientation = editingState.canvasDimensions?.orientation;
    const paperSize = editingState.canvasDimensions?.paperSize;

    setUploadedDocs(prev =>
      prev.map(d => {
        if (d.id === docId) {
          const baseConfig: PrintConfig = d.printConfig || {
            pageSize: 'A4',
            paperType: 'Normal',
            printType: 'Color',
            sides: 'Single Side',
            copies: 1,
            layout: 'Portrait',
            pageRangeType: 'All Pages',
            selectedPageRange: '1',
            pagesPerSheet: '1-in-1'
          };
          const updatedConfig: PrintConfig = {
            ...baseConfig,
            ...(orientation ? { layout: orientation } : {}),
            ...(paperSize ? { pageSize: paperSize as any } : {})
          };
          return {
            ...d,
            imageUrl: outputUrl,
            previewUrl: outputUrl,
            imageEditing: editingState,
            printConfig: updatedConfig
          };
        }
        return d;
      })
    );

    if (currentDoc?.id === docId) {
      setCurrentDoc(prev => {
        if (!prev) return null;
        const baseConfig: PrintConfig = prev.printConfig || {
          pageSize: 'A4',
          paperType: 'Normal',
          printType: 'Color',
          sides: 'Single Side',
          copies: 1,
          layout: 'Portrait',
          pageRangeType: 'All Pages',
          selectedPageRange: '1',
          pagesPerSheet: '1-in-1'
        };
        const updatedConfig: PrintConfig = {
          ...baseConfig,
          ...(orientation ? { layout: orientation } : {}),
          ...(paperSize ? { pageSize: paperSize as any } : {})
        };
        return {
          ...prev,
          imageUrl: outputUrl,
          previewUrl: outputUrl,
          imageEditing: editingState,
          printConfig: updatedConfig
        };
      });
    }

    try {
      const dbPayload: any = {
        preview_url: outputUrl,
        image_editing: editingState
      };
      if (currentDoc?.id === docId) {
        dbPayload.print_config = {
          ...currentDoc.printConfig,
          ...(orientation ? { layout: orientation } : {}),
          ...(paperSize ? { pageSize: paperSize as any } : {})
        };
      }
      supabase.from('uploaded_documents').update(dbPayload).eq('id', docId).then();
    } catch (e) {
      console.warn('Failed to persist edited image output to database:', e);
    }
  };

  const reconvertDocument = async (docId: string, options: {
    selectedSheet?: string;
    scaling?: 'No Scaling' | 'Fit Sheet on One Page' | 'Fit All Columns on One Page' | 'Fit All Rows on One Page';
  }) => {
    const doc = uploadedDocs.find(d => d.id === docId);
    if (!doc) return;

    setUploadedDocs(prev => prev.map(d =>
      d.id === docId ? { ...d, conversionStatus: 'converting' } : d
    ));
    if (currentDoc?.id === docId) {
      setCurrentDoc(prev => prev ? { ...prev, conversionStatus: 'converting' } : null);
    }
    toast.loading('Converting with selected sheet & scaling...', { id: `conv-${docId}` });
    try {
      const convResult = await convertDocumentViaBackend({
        fileUrl: doc.storageUrl || doc.previewUrl,
        fileName: doc.originalFileName || doc.fileName,
        fileType: doc.fileType,
        selectedSheet: options.selectedSheet || doc.selectedSheet,
        scaling: options.scaling || doc.excelScaling || 'No Scaling',
        sheets: doc.excelSheets,
        userId: doc.userId,
        shopId: doc.shopId,
        docId: doc.id
      });

      if (convResult?.success && convResult.pdfUrl) {
        const newTotalPages = typeof convResult.totalPages === 'number' && convResult.totalPages > 0
          ? convResult.totalPages
          : await getPdfPageCount(convResult.pdfUrl);
        setUploadedDocs(prev => prev.map(d => {
          if (d.id === docId) {
            return {
              ...d,
              previewUrl: convResult.pdfUrl,
              convertedPdfUrl: convResult.pdfUrl,
              totalPages: newTotalPages,
              selectedSheet: options.selectedSheet || d.selectedSheet,
              excelScaling: options.scaling || d.excelScaling,
              isConverted: true,
              conversionStatus: 'converted'
            };
          }
          return d;
        }));

        if (currentDoc?.id === docId) {
          setCurrentDoc(prev => prev ? {
            ...prev,
            previewUrl: convResult.pdfUrl,
            convertedPdfUrl: convResult.pdfUrl,
            totalPages: newTotalPages,
            selectedSheet: options.selectedSheet || prev.selectedSheet,
            excelScaling: options.scaling || prev.excelScaling,
            isConverted: true,
            conversionStatus: 'converted'
          } : null);
        }

        // Persist updated Excel scaling and sheet to database
        try {
          supabase.from('uploaded_documents').update({
            preview_url: convResult.pdfUrl,
            converted_pdf_url: convResult.pdfUrl,
            total_pages: newTotalPages,
            excel_scaling: options.scaling || doc.excelScaling,
            print_config: {
              ...doc.printConfig,
              excelScaling: options.scaling,
              selectedSheet: options.selectedSheet || doc.selectedSheet
            }
          }).eq('id', docId).then();
        } catch (dbErr) {
          console.warn('Failed to persist reconverted document settings:', dbErr);
        }

        toast.success(`Converted to PDF (${newTotalPages} page${newTotalPages > 1 ? 's' : ''})!`, { id: `conv-${docId}` });
      } else {
        setUploadedDocs(prev => prev.map(d =>
          d.id === docId ? { ...d, conversionStatus: 'failed' } : d
        ));
        if (currentDoc?.id === docId) {
          setCurrentDoc(prev => prev ? { ...prev, conversionStatus: 'failed' } : null);
        }
        toast.error(convResult?.error || 'Conversion failed. Please try again.', { id: `conv-${docId}` });
      }
    } catch (e: any) {
      setUploadedDocs(prev => prev.map(d =>
        d.id === docId ? { ...d, conversionStatus: 'failed' } : d
      ));
      if (currentDoc?.id === docId) {
        setCurrentDoc(prev => prev ? { ...prev, conversionStatus: 'failed' } : null);
      }
      toast.error(`Conversion failed: ${e.message}`, { id: `conv-${docId}` });
    }
  };

  // 5. Print Config (Unselected by default per Requirements 3)
  // 5. Print Config (Initial defaults per Requirement 5: Copies: 1, Page Range: All Pages, Pages per Sheet: 1-in-1, Paper Size: A4)
  const [printConfig, setPrintConfig] = useState<PrintConfig>({
    pageSize: 'A4',
    paperType: 'Normal',
    printType: '' as any,
    sides: '' as any,
    copies: 1,
    layout: 'Portrait',
    pageRangeType: 'All Pages',
    selectedPageRange: '',
    customRanges: [],
    pagesPerSheet: '1-in-1'
  });

  const updatePrintConfig = (updates: Partial<PrintConfig>) => {
    setPrintConfig(prev => {
      const finalUpdates = { ...updates };
      if (finalUpdates.pageRangeType === 'Custom Range') {
        if (!('printType' in finalUpdates)) finalUpdates.printType = '' as any;
        if (!('sides' in finalUpdates)) finalUpdates.sides = '' as any;
      } else if (finalUpdates.pageRangeType === 'All Pages' || finalUpdates.pageRangeType === 'Selected Pages') {
        if (prev.pageRangeType === 'Custom Range') {
          if (!finalUpdates.printType) {
            finalUpdates.printType = 'Black & White';
          }
          if (!finalUpdates.sides) {
            finalUpdates.sides = 'Single Side';
          }
        }
      }
      const next = { ...prev, ...finalUpdates };
      if (currentDoc) {
        setUploadedDocs(docs =>
          docs.map(d => (d.id === currentDoc.id ? { ...d, printConfig: next } : d))
        );
        setCurrentDoc(prevDoc => (prevDoc ? { ...prevDoc, printConfig: next } : null));

        // Real-time synchronization with Chrome PDF Preview route in open tabs
        try {
          const bc = new BroadcastChannel('printon24_pdf_preview');
          bc.postMessage({
            type: 'CONFIG_UPDATE',
            docId: currentDoc.id,
            config: next,
            doc: { ...currentDoc, printConfig: next }
          });
          bc.close();
        } catch {}

        try {
          localStorage.setItem(
            'printon24_preview_active_doc',
            JSON.stringify({
              ...currentDoc,
              printConfig: next
            })
          );
        } catch {}

        try {
          void supabase.from('uploaded_documents').update({
            print_config: next
          }).eq('id', currentDoc.id).then(({ error }) => {
            if (error) {
              console.error('Failed to persist print config to database:', error);
            }
          }, (dbErr: unknown) => {
            console.error('Failed to persist print config to database:', dbErr);
          });
        } catch (dbErr) {
          console.error('Failed to persist print config to database:', dbErr);
        }
      }
      return next;
    });
  };

  const applyPrintConfigToDocuments = (documentIds: string[], config: PrintConfig) => {
    const targetIds = new Set(documentIds);
    if (targetIds.size === 0) return;

    setUploadedDocs(docs =>
      docs.map(doc => targetIds.has(doc.id) ? { ...doc, printConfig: config } : doc)
    );
    if (currentDoc && targetIds.has(currentDoc.id)) {
      const updatedCurrentDoc = { ...currentDoc, printConfig: config };
      setCurrentDoc(updatedCurrentDoc);
      setPrintConfig(config);
      try {
        const channel = new BroadcastChannel('printon24_pdf_preview');
        channel.postMessage({
          type: 'CONFIG_UPDATE',
          docId: currentDoc.id,
          config,
          doc: updatedCurrentDoc
        });
        channel.close();
      } catch {}
    }

    uploadedDocs.filter(doc => targetIds.has(doc.id)).forEach(doc => {
      void supabase.from('uploaded_documents').update({
        print_config: config
      }).eq('id', doc.id).then(({ error }) => {
        if (error) {
          console.error(`Failed to apply print config to document ${doc.id}:`, error);
        }
      }, (dbErr: unknown) => {
        console.error(`Failed to apply print config to document ${doc.id}:`, dbErr);
      });
    });
  };

  const selectDocument = (docId: string) => {
    const doc = uploadedDocs.find(d => d.id === docId);
    if (doc) {
      const isLandscapeDoc =
        doc.fileType === 'PPT' ||
        doc.fileType === 'PPTX' ||
        doc.fileType === 'XLS' ||
        doc.fileType === 'XLSX' ||
        Boolean(doc.fileName?.match(/\.(pptx?|xlsx?|csv)$/i));

      // Preserve user's explicit selections while applying defaults to missing values
      const merged: PrintConfig = {
        ...(doc.printConfig || {}),
        copies: doc.printConfig?.copies || 1,
        pageRangeType: doc.printConfig?.pageRangeType || 'All Pages',
        pagesPerSheet: doc.printConfig?.pagesPerSheet || '1-in-1',
        pageSize: doc.printConfig?.pageSize || 'A4',
        layout: doc.printConfig?.layout || (isLandscapeDoc ? 'Landscape' : 'Portrait'),
        paperType: doc.printConfig?.paperType || 'Normal',
        printType: doc.printConfig?.printType || '',
        sides: doc.printConfig?.sides || (doc.totalPages === 1 ? 'Single Side' : ''),
        selectedPageRange: doc.printConfig?.selectedPageRange || '',
        customRanges: doc.printConfig?.customRanges || []
      };
      const updatedDoc = { ...doc, printConfig: merged };
      setCurrentDoc(updatedDoc);
      setPrintConfig(merged);
      setUploadedDocs(docs => docs.map(d => (d.id === docId ? updatedDoc : d)));

      // Broadcast document switch to preview tab
      try {
        const bc = new BroadcastChannel('printon24_pdf_preview');
        bc.postMessage({
          type: 'SWITCH_DOC',
          doc: updatedDoc
        });
        bc.close();
      } catch {}
      try {
        localStorage.setItem('printon24_preview_active_doc', JSON.stringify(updatedDoc));
      } catch {}
    }
  };

  const resetPrintConfig = () => {
    const defaultCfg: PrintConfig = {
      pageSize: 'A4',
      paperType: 'Normal',
      printType: '' as any,
      sides: '' as any,
      copies: 1,
      layout: 'Portrait',
      pageRangeType: 'All Pages',
      selectedPageRange: '',
      customRanges: [],
      pagesPerSheet: '1-in-1'
    };
    setPrintConfig(defaultCfg);
    if (currentDoc) {
      setUploadedDocs(docs =>
        docs.map(d => (d.id === currentDoc.id ? { ...d, printConfig: defaultCfg } : d))
      );
      setCurrentDoc(prevDoc => (prevDoc ? { ...prevDoc, printConfig: defaultCfg } : null));
    }
  };

  const getDocPrintConfig = (doc: UploadedDoc): PrintConfig =>
    (doc.id === currentDoc?.id ? printConfig : doc.printConfig) || printConfig;

  const getConfiguredPrintPageCount = (doc: UploadedDoc, cfg: PrintConfig): number => {
    const totalPages = Math.max(0, doc.totalPages || 1);
    if (cfg.pageRangeType === 'Custom Range') {
      const printedPages = new Set<number>();
      cfg.customRanges?.forEach(range => {
        const from = Math.max(1, Math.ceil(range.fromPage));
        const to = Math.min(totalPages, Math.floor(range.toPage));
        for (let page = from; page <= to; page++) printedPages.add(page);
      });
      return printedPages.size;
    }
    if (cfg.pageRangeType === 'Selected Pages' || cfg.pageRangeType === 'Selected pages') {
      const validation = validateSelectedPageRange(cfg.selectedPageRange, totalPages);
      return validation.isValid ? validation.pageCount : 0;
    }
    return totalPages;
  };

  const pricingDocuments = uploadedDocs.length > 0
    ? uploadedDocs
    : currentDoc
    ? [currentDoc]
    : [];
  const aggregatePrintPages = pricingDocuments.reduce(
    (total, doc) => total + getConfiguredPrintPageCount(doc, getDocPrintConfig(doc)),
    0
  );

  // 6. Live Price Calculation (Dynamic calculation, NO GST, handles Custom Ranges)
  const calculateSingleDocPrice = (
    doc: UploadedDoc,
    cfg: PrintConfig,
    totalOrderPages: number
  ): PriceCalculation => {
    const invalidPrice = (error: string): PriceCalculation => ({
      effectivePages: 0,
      sheetsUsed: 0,
      baseRatePerSide: 0,
      subtotal: 0,
      discount: 0,
      tax: 0,
      grandTotal: 0,
      isValid: false,
      error
    });

    const pricing = selectedEnterprise.pricing;
    if (!pricing.isConfigured || pricing.shopId !== selectedEnterprise.id) {
      return invalidPrice(`Pricing for ${selectedEnterprise.name} is not available yet.`);
    }
    if (pricing.eligibilitySettingsLoaded !== true) {
      return invalidPrice(`Print eligibility settings for ${selectedEnterprise.name} are unavailable.`);
    }

    if (
      (doc.fileType === 'XLS' || doc.fileType === 'XLSX') &&
      doc.conversionStatus !== 'converted'
    ) {
      return invalidPrice('Choose an Excel sheet and press Set before calculating print cost.');
    }

    let effectivePages = doc.totalPages || 1;
    const isCustomRange = cfg.pageRangeType === 'Custom Range';
    const isSelectedPages = cfg.pageRangeType === 'Selected Pages' || cfg.pageRangeType === 'Selected pages';

    if (isSelectedPages) {
      const selValidation = validateSelectedPageRange(cfg.selectedPageRange, doc.totalPages || 1);
      if (selValidation.isValid) {
        effectivePages = Math.max(1, selValidation.pageCount);
      } else {
        return invalidPrice(selValidation.error || 'The selected page range is invalid.');
      }
    }

    if (effectivePages < 1) {
      return invalidPrice('Select at least one page to print.');
    }

    // layout sheet compression
    let layoutFactor = 1;
    if (cfg.pagesPerSheet === '2-in-1') layoutFactor = 2;
    if (cfg.pagesPerSheet === '4-in-1') layoutFactor = 4;
    const compressedPages = Math.max(1, Math.ceil(effectivePages / layoutFactor));

    const isBackToBack = (sides: string) => sides === 'Back to Back' || sides === 'Back-to-Back';
    const normalizePaperName = (value: string) => value.toLowerCase().replace(/\s+paper$/, '').trim();
    const resolvePageRate = (printType: string, sides: string): number | null => {
      const isBW = printType === 'Black & White' || printType === 'B&W';
      const isCostone = printType === 'Costone';
      const doubleSide = isBackToBack(sides);
      const typeName = normalizePaperName(cfg.paperType);
      const selectedPageSize = String(cfg.pageSize);
      const sizeName = normalizePaperName(selectedPageSize);
      const paperDynamicType = pricing.dynamicPaperTypes?.find(
        paper => normalizePaperName(paper.name) === typeName
      );
      const sizeDynamicType = pricing.dynamicPaperTypes?.find(
        paper => normalizePaperName(paper.name) === sizeName
      );

      const getDynamicRate = (dynamicType: typeof paperDynamicType) => {
        if (!dynamicType) return undefined;
        const rate = isCostone
          ? doubleSide ? dynamicType.costoneDoublePrice : dynamicType.costonePrice
          : isBW
            ? doubleSide ? dynamicType.bwDoublePrice : dynamicType.bwPrice
            : doubleSide ? dynamicType.colorDoublePrice : dynamicType.colorPrice;
        return rate !== undefined && Number.isFinite(rate) && rate >= 0 ? rate : undefined;
      };

      if (cfg.paperType !== 'Normal' && paperDynamicType) {
        return getDynamicRate(paperDynamicType) ?? null;
      }

      const pageSize = selectedPageSize === 'Bond' || selectedPageSize === 'Glossy' ? 'A4' : selectedPageSize;
      const sizeRates = pricing.paperSizeRates?.[pageSize];
      const configuredRate = sizeRates && (isCostone
        ? doubleSide ? sizeRates.costoneDouble : sizeRates.costoneSingle
        : isBW
          ? doubleSide ? sizeRates.bwDouble : sizeRates.bwSingle
          : doubleSide ? sizeRates.colorDouble : sizeRates.colorSingle);
      const baseRate = configuredRate ?? getDynamicRate(sizeDynamicType);
      if (baseRate === undefined || !Number.isFinite(baseRate) || baseRate < 0) return null;

      const needsBondRate = selectedPageSize === 'Bond' || cfg.paperType === 'Bond Paper';
      const needsGlossyRate = selectedPageSize === 'Glossy' || cfg.paperType === 'Glossy';
      if (needsBondRate) {
        return pricing.bondPaperRate === undefined ? null : baseRate + pricing.bondPaperRate;
      }
      if (needsGlossyRate) {
        return pricing.glossyPaperRate === undefined ? null : baseRate + pricing.glossyPaperRate;
      }
      if (cfg.paperType !== 'Normal') return null;
      return baseRate;
    };

    const printType = cfg.printType || 'Color';
    const sides = cfg.sides || 'Single Side';
    const isBackToBackPrint = isBackToBack(sides);
    const isBlackAndWhite = printType === 'Black & White' || printType === 'B&W';
    const pricingMode = isBlackAndWhite
      ? pricing.bwPricingMode
      : pricing.colorPricingMode;
    const shortDocumentRate = (type: string, regularRate: number) => {
      const limit = pricing.shortPageLimit ?? 0;
      if (limit <= 0 || totalOrderPages > limit) return regularRate;
      const isBW = type === 'Black & White' || type === 'B&W';
      return isBW
        ? pricing.bwShortPageRate ?? regularRate
        : pricing.colorShortPageRate ?? regularRate;
    };
    const selectedPaper = cfg.paperType && cfg.paperType !== 'Normal'
      ? cfg.paperType
      : cfg.pageSize;
    if (
      !isCustomRange &&
      !isPrintModeEligible(pricing, selectedPaper, printType, sides)
    ) {
      return invalidPrice(`${printType} ${sides} printing is unavailable for ${selectedPaper} at ${selectedEnterprise.name}. Select an available print mode.`);
    }
    const regularRate = resolvePageRate(printType, sides);
    if (regularRate === null) {
      return invalidPrice(`The selected shop has no valid ${cfg.pageSize} ${cfg.paperType} ${printType} ${sides} rate configured.`);
    }
    const baseRate = shortDocumentRate(printType, regularRate);

    let subtotal = 0;
    let sheetsUsed = 0;

    if (isCustomRange) {
      if (cfg.customRanges && cfg.customRanges.length > 0) {
        const totalDocPages = doc.totalPages || 1;
        let totalCostPerSet = 0;
        let singleSidePagesCount = 0;
        let backToBackPagesCount = 0;
        let coveredPagesCount = 0;
        const rangedPageCounts = new Map<string, { printType: string; sides: string; count: number }>();

        for (let p = 1; p <= totalDocPages; p++) {
          // Find if page p falls into a custom range rule
          const matchingRule = cfg.customRanges.find(r => p >= r.fromPage && p <= r.toPage);
          // Per PRINTON24.docx: Omitted pages must remain unselected and must not be printed or priced!
          if (!matchingRule) continue;

          coveredPagesCount++;
          const pagePrintType = matchingRule.printType;
          const pageSides = matchingRule.sides;

          if (!isPrintModeEligible(pricing, selectedPaper, pagePrintType, pageSides)) {
            return invalidPrice(`${pagePrintType} ${pageSides} printing is unavailable for ${cfg.pageSize} at ${selectedEnterprise.name}.`);
          }

          const pageRate = resolvePageRate(pagePrintType, pageSides);
          if (pageRate === null) {
            return invalidPrice(`The selected shop has no valid ${cfg.pageSize} ${cfg.paperType} ${pagePrintType} ${pageSides} rate configured.`);
          }
          const key = `${pagePrintType}:${pageSides}`;
          const group = rangedPageCounts.get(key);
          rangedPageCounts.set(key, {
            printType: pagePrintType,
            sides: pageSides,
            count: (group?.count || 0) + 1
          });

          if (pageSides === 'Back to Back') {
            backToBackPagesCount++;
          } else {
            singleSidePagesCount++;
          }
        }

        rangedPageCounts.forEach(group => {
          const regularRate = resolvePageRate(group.printType, group.sides);
          const rate = regularRate === null
            ? null
            : shortDocumentRate(group.printType, regularRate);
          if (rate !== null) {
            const groupIsBlackAndWhite =
              group.printType === 'Black & White' || group.printType === 'B&W';
            const groupPricingMode = groupIsBlackAndWhite
              ? pricing.bwPricingMode
              : pricing.colorPricingMode;
            const billableUnits = isBackToBack(group.sides) && groupPricingMode === 'page'
              ? Math.ceil(group.count / 2)
              : group.count;
            totalCostPerSet += billableUnits * rate;
          }
        });

        effectivePages = coveredPagesCount;
        subtotal = Number((totalCostPerSet * cfg.copies).toFixed(2));
        const sheetsPerSet = singleSidePagesCount + Math.ceil(backToBackPagesCount / 2);
        sheetsUsed = Math.max(coveredPagesCount > 0 ? 1 : 0, Math.ceil(sheetsPerSet / layoutFactor)) * cfg.copies;
      } else {
        effectivePages = 0;
        sheetsUsed = 0;
        subtotal = 0;
      }
    } else {
      const isBackToBackGlobal = isBackToBack(sides);
      sheetsUsed = isBackToBackGlobal
        ? Math.ceil(compressedPages / 2) * cfg.copies
        : compressedPages * cfg.copies;
      const billableUnits = isBackToBackPrint && pricingMode === 'page'
        ? Math.ceil(compressedPages / 2)
        : effectivePages;
      subtotal = Number((billableUnits * baseRate * cfg.copies).toFixed(2));
    }

    return {
      effectivePages,
      sheetsUsed,
      baseRatePerSide: Number(baseRate.toFixed(2)),
      subtotal,
      discount: 0,
      tax: 0,
      grandTotal: subtotal,
      isValid: true
    };
  };

  const getDocPrice = (doc: UploadedDoc): PriceCalculation => {
    const cfg = getDocPrintConfig(doc);
    return calculateSingleDocPrice(doc, cfg, aggregatePrintPages);
  };

  const currentDocPriceCalc: PriceCalculation = currentDoc
    ? getDocPrice(currentDoc)
    : {
        effectivePages: 0,
        sheetsUsed: 0,
        baseRatePerSide: 0,
        subtotal: 0,
        discount: 0,
        tax: 0,
        grandTotal: 0,
        isValid: false,
        error: 'Upload a document to estimate pricing.'
      };

  const calculatePrice = (): PriceCalculation => {
    const docs = uploadedDocs.length > 0 ? uploadedDocs : (currentDoc ? [currentDoc] : []);
    if (docs.length === 0) {
      return currentDocPriceCalc;
    }

    let totalSubtotal = 0;
    let totalSheetsUsed = 0;
    let totalEffectivePages = 0;

    docs.forEach(d => {
      const docCalc = getDocPrice(d);
      if (!docCalc.isValid) return;
      totalSubtotal += docCalc.subtotal;
      totalSheetsUsed += docCalc.sheetsUsed;
      totalEffectivePages += docCalc.effectivePages;
    });

    const invalidDoc = docs.map(getDocPrice).find(calc => !calc.isValid);
    if (invalidDoc) {
      return { ...invalidDoc, effectivePages: totalEffectivePages, sheetsUsed: totalSheetsUsed };
    }

    // Membership discount on aggregate subtotal
    let discount = 0;
    if (activeMembership && activeMembership.status === 'active') {
      discount = Number(((totalSubtotal * activeMembership.discountPercentage) / 100).toFixed(2));
    }

    // GST is strictly REMOVED as requested by user
    const tax = 0;
    const grandTotal = Number((totalSubtotal - discount).toFixed(2));

    return {
      effectivePages: totalEffectivePages,
      sheetsUsed: totalSheetsUsed,
      baseRatePerSide: selectedEnterprise.pricing.blackAndWhite,
      subtotal: Number(totalSubtotal.toFixed(2)),
      discount,
      tax: 0,
      grandTotal,
      isValid: true
    };
  };

  const priceCalc = calculatePrice();

  // 7. Orders & Receipts (Session-isolated for guests, persistent for authenticated users)
  const [orders, setOrders] = useState<PrintOrder[]>(() => {
    // Authenticated users load from localStorage
    const savedUser = localStorage.getItem('printperfect_user');
    if (savedUser) {
      try {
        const u = JSON.parse(savedUser);
        if (u && u.isAuthenticated && !u.isGuest) {
          const savedOrders = localStorage.getItem('printperfect_orders');
          if (savedOrders) return JSON.parse(savedOrders);
        }
      } catch {}
    }

    // Guest users load strictly from sessionStorage (current tab/visit only)
    try {
      const guestSaved = sessionStorage.getItem('printperfect_guest_orders');
      if (guestSaved) return JSON.parse(guestSaved);
    } catch {}

    return [];
  });

  useEffect(() => {
    if (user.isAuthenticated && !user.isGuest) {
      localStorage.setItem('printperfect_orders', JSON.stringify(orders));
      try { sessionStorage.removeItem('printperfect_guest_orders'); } catch {}
    } else {
      try {
        sessionStorage.setItem('printperfect_guest_orders', JSON.stringify(orders));
      } catch {}
      localStorage.removeItem('printperfect_orders');
    }
  }, [orders, user]);

  const [activeReceiptOrder, setActiveReceiptOrder] = useState<PrintOrder | null>(null);

  const createOrder = (paymentMethod: PaymentMethod, paymentDetail?: string, customerName?: string): PrintOrder => {
    const calc = calculatePrice();
    if (!calc.isValid) {
      toast.error(calc.error || 'This shop has no valid price configured for the selected print options.');
      throw new Error(calc.error || 'Shop pricing is unavailable.');
    }
    const tokenNum = `TK-${Math.floor(100 + Math.random() * 900)}`;
    const randomBarcode = `${Math.floor(1000000000 + Math.random() * 9000000000)}-${selectedEnterprise.shortCode}`;
    const invoiceId = `INV-${new Date().getFullYear()}-${Math.floor(10000 + Math.random() * 90000)}`;

    const uniqueTimestamp = Date.now().toString().slice(-4);
    const uniqueRandom = Math.floor(100 + Math.random() * 900);
    const generatedOrderNumber = `ORD-${uniqueTimestamp}${uniqueRandom}-${selectedEnterprise.shortCode}`;

    const newOrder: PrintOrder = {
      id: `ord_${Date.now()}_${uniqueRandom}`,
      orderNumber: generatedOrderNumber,
      tokenNumber: tokenNum,
      userId: user.id,
      enterpriseId: selectedEnterprise.id,
      enterpriseName: selectedEnterprise.name,
      enterpriseAddress: selectedEnterprise.address,
      document: currentDoc ? { ...currentDoc } : { id: 'doc_temp', fileName: 'Document.pdf', fileType: 'PDF', fileSizeMb: 0.5, totalPages: 1, uploadedAt: new Date().toISOString() },
      config: { ...printConfig },
      calculatedPages: calc.effectivePages,
      sheetsUsed: calc.sheetsUsed,
      unitPrice: calc.baseRatePerSide,
      subtotal: calc.subtotal,
      discount: calc.discount,
      tip: 0,
      tax: calc.tax,
      grandTotal: calc.grandTotal,
      paymentMethod,
      paymentOptionDetail: paymentDetail || (paymentMethod === 'Razorpay' ? 'UPI / Netbanking' : 'Cash at Counter'),
      paymentStatus: paymentMethod === 'Razorpay' ? 'PAID' : 'PAID', // mark as confirmed paid/authorized for print
      status: 'Queued',
      createdAt: `${new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })} • ${new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}`,
      barcode: randomBarcode,
      invoiceId,
      customerName: (customerName || user.name || '').trim()
    };

    // Attach all documents with their respective print configurations to newOrder
    const allDocs = uploadedDocs.length > 0 ? uploadedDocs : [newOrder.document];

    // Backend / Pre-creation Multi-Document Validation Check
    const invalidDocs = allDocs.filter(d => !isDocConfigValid(d).isValid);
    if (invalidDocs.length > 0) {
      const names = invalidDocs.map(d => d.fileName).join(', ');
      toast.error(`Please complete the print configuration for all uploaded documents before proceeding to payment. (${names})`);
      throw new Error(`Incomplete configuration for documents: ${names}`);
    }

    newOrder.documents = allDocs.map(d => ({
      ...d,
      printConfig: (d.id === currentDoc?.id ? printConfig : d.printConfig) || printConfig
    }));

    const updated = [newOrder, ...orders];
    setOrders(updated);
    setActiveReceiptOrder(newOrder);

    // Clear upload queue for fresh upcoming upload session and reset configurations per Requirement 3
    setUploadedDocs([]);
    setCurrentDoc(null);
    resetPrintConfig();

    // Persist Print Order in Supabase backend so Shopkeeper Panel can fetch and print on arrival
    try {
      const documentsConfigPayload = allDocs.map(d => {
        const docCfg = (d.id === currentDoc?.id ? printConfig : d.printConfig) || printConfig;
        let printSegments: Array<{ segmentNumber: number; fromPage?: number; toPage?: number; selectedPages?: number[]; pageCount?: number; printType: string; sides: string }> = [];
        if (docCfg.pageRangeType === 'Custom Range' && docCfg.customRanges && docCfg.customRanges.length > 0) {
          printSegments = docCfg.customRanges.map((r, i) => ({
            segmentNumber: i + 1,
            fromPage: r.fromPage,
            toPage: r.toPage,
            printType: r.printType,
            sides: r.sides
          }));
        } else if (docCfg.pageRangeType === 'Selected Pages' || docCfg.pageRangeType === 'Selected pages') {
          const selVal = validateSelectedPageRange(docCfg.selectedPageRange, d.totalPages || 1);
          const chosenPages = selVal.isValid && selVal.pages.length > 0 ? selVal.pages : [1];
          printSegments = chosenPages.map((pg, idx) => ({
            segmentNumber: idx + 1,
            fromPage: pg,
            toPage: pg,
            printType: docCfg.printType,
            sides: docCfg.sides
          }));
        } else {
          printSegments = [{
            segmentNumber: 1,
            fromPage: 1,
            toPage: d.totalPages || 1,
            printType: docCfg.printType,
            sides: docCfg.sides
          }];
        }

        const isCustom = docCfg.pageRangeType === 'Custom Range';
        return {
          id: d.id,
          fileName: d.fileName,
          fileType: d.fileType,
          totalPages: d.totalPages,
          config: {
            ...(isCustom ? { ...docCfg, printType: '' as any, sides: '' as any } : docCfg),
            ...(d.excelScaling ? { excelScaling: d.excelScaling } : {}),
            ...(d.selectedSheet ? { selectedSheet: d.selectedSheet } : {})
          },
          print_segments: printSegments,
          priceCalc: getDocPrice(d),
          shopPricingSnapshot: {
            shopId: selectedEnterprise.id,
            pricing: selectedEnterprise.pricing
          },
          subtotal: getDocPrice(d).subtotal
        };
      });

      const isOrderCustom = newOrder.config.pageRangeType === 'Custom Range';
      const orderPayload = {
        id: newOrder.id,
        order_number: newOrder.orderNumber,
        user_id: user.id,
        shop_id: selectedEnterprise.id,
        shop_name: selectedEnterprise.name,
        token_number: tokenNum,
        document_name: allDocs.length > 1
          ? `${allDocs.length} Documents (${allDocs.map(d => d.fileName).join(', ')})`
          : newOrder.document.fileName,
        file_type: newOrder.document.fileType,
        total_pages: calc.effectivePages,
        config_copies: newOrder.config.copies,
        config_page_size: newOrder.config.pageSize,
        config_paper_type: newOrder.config.paperType,
        config_layout: newOrder.config.layout || 'Portrait',
        config_print_type: isOrderCustom ? '' : newOrder.config.printType,
        config_sides: isOrderCustom ? '' : newOrder.config.sides,
        documents_config: documentsConfigPayload,
        subtotal: newOrder.subtotal,
        discount: newOrder.discount,
        platform_fee: 0,
        grand_total: newOrder.grandTotal,
        payment_method: paymentMethod,
        payment_status: newOrder.paymentStatus,
        order_status: newOrder.status,
        customer_name: (customerName || user.name || '').trim(),
        notes: `Customer: ${customerName || user.name} • Token #${tokenNum} • ${newOrder.paymentOptionDetail} • ${allDocs.length} file(s)`
      };

      supabase.from('print_orders').insert(orderPayload).then(async ({ error }) => {
        if (error && (error.code === '23505' || error.message?.includes('duplicate key'))) {
          const fallbackOrderNum = `ORD-${Date.now().toString().slice(-6)}${Math.floor(10 + Math.random() * 90)}-${selectedEnterprise.shortCode}`;
          console.warn('Duplicate order_number detected, retrying with unique order_number:', fallbackOrderNum);
          await supabase.from('print_orders').insert({
            ...orderPayload,
            order_number: fallbackOrderNum
          });
        } else if (error) {
          console.warn('Supabase print_orders sync warning:', error.message);
        }
      });

      // Persist all documents in Supabase uploaded_documents one by one with order_id, shop_id & independent print_config
      allDocs.forEach(async (doc) => {
        const rawCfg = (doc.id === currentDoc?.id ? printConfig : doc.printConfig) || printConfig;
        const isCustom = rawCfg.pageRangeType === 'Custom Range';
        const docCfg = isCustom ? { ...rawCfg, printType: '' as any, sides: '' as any } : rawCfg;
        try {
          await supabase.from('uploaded_documents').upsert({
            id: doc.id,
            user_id: user.id,
            shop_id: selectedEnterprise.id,
            order_id: newOrder.id,
            original_file_name: doc.originalFileName || doc.fileName,
            file_name: doc.fileName,
            file_type: doc.fileType,
            mime_type: doc.mimeType || 'application/octet-stream',
            file_size: doc.fileSize,
            file_size_mb: doc.fileSizeMb,
            total_pages: doc.totalPages,
            storage_bucket: 'print_documents',
            storage_path: doc.storagePath,
            upload_status: 'READY',
            preview_url: doc.previewUrl,
            converted_pdf_url: doc.convertedPdfUrl || (doc.fileType === 'PDF' ? doc.previewUrl : null),
            original_file_url: doc.storageUrl || doc.previewUrl,
            excel_sheets: doc.excelSheets || null,
            excel_scaling: doc.excelScaling || null,
            image_editing: doc.imageEditing || {},
            print_config: {
              ...docCfg,
              ...(doc.excelScaling ? { excelScaling: doc.excelScaling } : {}),
              ...(doc.selectedSheet ? { selectedSheet: doc.selectedSheet } : {})
            },
            created_at: doc.createdAt || new Date().toISOString(),
            expiry_at: doc.expiryAt || new Date(Date.now() + 12 * 3600 * 1000).toISOString(),
            deleted_at: null
          });
        } catch (e) {
          console.warn('Document record save notice:', e);
        }
      });
    } catch (e) {
      console.warn('Supabase print_orders sync skipped:', e);
    }

    // Direct progression: Queued -> Completed directly once printed
    setTimeout(() => {
      setOrders(current =>
        current.map(o => o.id === newOrder.id ? { ...o, status: 'Completed' as const } : o)
      );
      // Trigger notification
      const newNotif: AppNotification = {
        id: `notif_${Date.now()}`,
        userId: user.id,
        type: 'print_complete',
        title: 'Print Completed! 🖨️',
        message: `${newOrder.document.fileName} is completed and ready at ${newOrder.enterpriseName} counter (Token #${newOrder.tokenNumber}).`,
        timestamp: 'Just now',
        read: false,
        orderId: newOrder.id,
        enterpriseName: newOrder.enterpriseName
      };
      setNotifications(prev => [newNotif, ...prev]);
    }, 4500);

    // For guest users, reset name after placing order so subsequent visits start fresh
    if (!user.isAuthenticated || user.isGuest) {
      setUser(prev => ({ ...prev, name: '' }));
      try {
        sessionStorage.removeItem('printperfect_guest_user');
      } catch {}
    }

    return newOrder;
  };

  const retrieveDocumentForPrint = async (
    orderId: string,
    documentId?: string
  ): Promise<{ success: boolean; url?: string; error?: string; docName?: string }> => {
    try {
      // 1. Backend automatic cleanup invocation
      try {
        const { data } = await supabase.rpc('cleanup_expired_print_documents');
        if (data?.expired_files && Array.isArray(data.expired_files) && data.expired_files.length > 0) {
          const byBucket: Record<string, string[]> = {};
          data.expired_files.forEach((f: { bucket?: string; path?: string }) => {
            if (f.bucket && f.path) {
              if (!byBucket[f.bucket]) byBucket[f.bucket] = [];
              byBucket[f.bucket].push(f.path);
            }
          });
          for (const [bucket, paths] of Object.entries(byBucket)) {
            await supabase.storage.from(bucket).remove(paths).catch(() => {});
          }
        }
      } catch {
        // silent fallback
      }

      // 2. Fetch document DB record
      let query = supabase.from('uploaded_documents').select('*');
      if (documentId) {
        query = query.eq('id', documentId);
      } else {
        query = query.eq('order_id', orderId);
      }

      const { data: records, error: fetchErr } = await query.limit(1);

      if (fetchErr || !records || records.length === 0) {
        // Check order document from local state
        const targetOrder = orders.find(o => o.id === orderId);
        const docObj = targetOrder?.document;
        if (docObj?.expiryAt && new Date(docObj.expiryAt).getTime() <= Date.now()) {
          return {
            success: false,
            error: 'Original customer document has expired and is no longer available.',
            docName: docObj.fileName
          };
        }

        if (docObj?.storageUrl || docObj?.previewUrl) {
          return {
            success: true,
            url: docObj.storageUrl || docObj.previewUrl,
            docName: docObj.fileName
          };
        }

        return {
          success: false,
          error: 'Original customer document could not be retrieved.'
        };
      }

      const docRecord = records[0];
      const docName = docRecord.original_file_name || docRecord.file_name || 'Document';

      // 3. Check 12-Hour Expiry Window
      const nowMs = Date.now();
      const expiryMs = docRecord.expiry_at ? new Date(docRecord.expiry_at).getTime() : 0;
      const isExpired =
        docRecord.upload_status === 'FILE_EXPIRED' ||
        docRecord.upload_status === 'FILE_DELETED' ||
        (expiryMs > 0 && expiryMs <= nowMs);

      if (isExpired) {
        return {
          success: false,
          error: 'Original customer document has expired and is no longer available.',
          docName
        };
      }

      // 4. Retrieve original file from secure Supabase Storage
      const bucket = docRecord.storage_bucket || 'print_documents';
      const path = docRecord.storage_path;

      if (!path) {
        if (docRecord.preview_url) {
          return {
            success: true,
            url: docRecord.preview_url,
            docName
          };
        }
        return {
          success: false,
          error: 'Original customer document could not be retrieved.',
          docName
        };
      }

      // Create signed URL for secure authenticated 1-hour print access
      const { data: signedData, error: signErr } = await supabase.storage
        .from(bucket)
        .createSignedUrl(path, 3600);

      if (!signErr && signedData?.signedUrl) {
        return {
          success: true,
          url: signedData.signedUrl,
          docName
        };
      }

      // Fallback to public storage URL
      const { data: pubData } = supabase.storage.from(bucket).getPublicUrl(path);
      if (pubData?.publicUrl) {
        return {
          success: true,
          url: pubData.publicUrl,
          docName
        };
      }

      return {
        success: false,
        error: 'Original customer document could not be retrieved.',
        docName
      };
    } catch (err) {
      console.error('retrieveDocumentForPrint exception:', err);
      return {
        success: false,
        error: 'Original customer document could not be retrieved.'
      };
    }
  };

  // 8. Authentication & Protected Action Interceptor
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authModalTitle, setAuthModalTitle] = useState('Sign In to Continue');
  const [authModalSubtitle, setAuthModalSubtitle] = useState('Please sign in or create an account. Your form details are saved.');
  const [pendingAuthAction, setPendingAuthAction] = useState<(() => void) | null>(null);

  // Sync with Supabase Auth state change
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUser(prev => ({
          ...prev,
          id: session.user.id,
          email: session.user.email || prev.email,
          name: session.user.user_metadata?.name || session.user.user_metadata?.full_name || prev.name,
          phone: session.user.user_metadata?.phone || prev.phone,
          isAuthenticated: true,
          isGuest: false
        }));
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setUser(prev => ({
          ...prev,
          id: session.user.id,
          email: session.user.email || prev.email,
          name: session.user.user_metadata?.name || session.user.user_metadata?.full_name || prev.name,
          phone: session.user.user_metadata?.phone || prev.phone,
          isAuthenticated: true,
          isGuest: false
        }));
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const openAuthModal = (pendingAction?: () => void, title?: string, subtitle?: string) => {
    if (pendingAction) setPendingAuthAction(() => pendingAction);
    if (title) setAuthModalTitle(title);
    if (subtitle) setAuthModalSubtitle(subtitle);
    setIsAuthModalOpen(true);
  };

  const closeAuthModal = () => {
    setIsAuthModalOpen(false);
  };

  const requireAuth = (action: () => void, title?: string, subtitle?: string): boolean => {
    if (user.isAuthenticated) {
      action();
      return true;
    }
    setPendingAuthAction(() => action);
    if (title) setAuthModalTitle(title);
    if (subtitle) setAuthModalSubtitle(subtitle);
    setIsAuthModalOpen(true);
    return false;
  };

  const loginWithEmail = async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const cleanEmail = email.trim().toLowerCase();
      const pwdHash = await hashPassword(password);

      // Verify credentials against user_profiles database table
      const { data: profiles } = await supabase
        .from('user_profiles')
        .select('*')
        .ilike('email', cleanEmail)
        .limit(1);

      let verifiedUser: any = null;

      if (profiles && profiles.length > 0) {
        const prof = profiles[0];
        // If password_hash is set on the profile, check strictly against stored hash
        if (prof.password_hash) {
          if (prof.password_hash !== pwdHash) {
            return { success: false, error: 'Invalid email or password' };
          }
          verifiedUser = prof;
        } else {
          // If no password_hash stored yet in DB, check Supabase Auth
          const { data: authData, error: authErr } = await supabase.auth.signInWithPassword({
            email: cleanEmail,
            password
          });
          if (authErr || !authData?.user) {
            return { success: false, error: 'Invalid email or password' };
          }
          verifiedUser = prof;
          // Store hash for future verified logins
          await supabase.from('user_profiles').update({ password_hash: pwdHash }).eq('id', prof.id);
        }
      } else {
        // Try Supabase Auth
        const { data: authData, error: authErr } = await supabase.auth.signInWithPassword({
          email: cleanEmail,
          password
        });
        if (authErr || !authData?.user) {
          return { success: false, error: 'Invalid email or password' };
        }
        verifiedUser = {
          id: authData.user.id,
          email: authData.user.email,
          name: authData.user.user_metadata?.name || authData.user.email?.split('@')[0],
          phone: authData.user.user_metadata?.phone || '',
          password_hash: pwdHash
        };
        await supabase.from('user_profiles').upsert(verifiedUser);
      }

      if (!verifiedUser) {
        return { success: false, error: 'Invalid email or password' };
      }

      const userName = verifiedUser.name || cleanEmail.split('@')[0];
      const updatedUser: UserProfile = {
        ...user,
        id: verifiedUser.id,
        name: userName,
        surname: verifiedUser.surname || '',
        email: verifiedUser.email || cleanEmail,
        phone: verifiedUser.phone || '',
        address: verifiedUser.address || '',
        avatarUrl: verifiedUser.avatar_url || user.avatarUrl,
        isAuthenticated: true,
        isGuest: false
      };
      setUser(updatedUser);
      localStorage.setItem('printperfect_user', JSON.stringify(updatedUser));

      // Restore user profile and past order history upon re-login
      getOrCreateUserProfile(updatedUser.id).then(profile => {
        if (profile) {
          setUser(prev => ({
            ...prev,
            name: profile.name,
            surname: profile.surname,
            email: profile.email,
            phone: profile.phone || prev.phone,
            address: profile.address || prev.address,
            avatarUrl: profile.avatarUrl || prev.avatarUrl
          }));
        }
      });

      getUserOrders(updatedUser.id).then(remoteOrders => {
        if (remoteOrders && remoteOrders.length > 0) {
          const mappedOrders: PrintOrder[] = remoteOrders.map(ro => ({
            id: ro.id,
            orderNumber: ro.orderNumber,
            tokenNumber: ro.tokenNumber,
            userId: ro.userId,
            enterpriseId: ro.shopId,
            enterpriseName: ro.shopName,
            enterpriseAddress: enterprises.find(e => e.id === ro.shopId)?.address || 'Partner Shop Counter',
            document: {
              id: `doc_${ro.id}`,
              fileName: ro.documentName,
              fileType: (ro.fileType as any) || 'PDF',
              fileSizeMb: 1.2,
              totalPages: ro.totalPages,
              uploadedAt: ro.createdAt
            },
            config: {
              pageSize: (ro.configPageSize as any) || 'A4',
              paperType: (ro.configPaperType as any) || 'Normal',
              printType: (ro.configPrintType as any) || 'Color',
              sides: (ro.configSides as any) || 'Single Side',
              copies: ro.configCopies || 1,
              layout: 'Portrait',
              pageRangeType: 'All Pages',
              selectedPageRange: `1-${ro.totalPages}`,
              pagesPerSheet: '1-in-1'
            },
            calculatedPages: ro.totalPages,
            sheetsUsed: ro.totalPages * (ro.configCopies || 1),
            unitPrice: Number((ro.subtotal / Math.max(1, ro.totalPages)).toFixed(2)),
            subtotal: ro.subtotal,
            discount: ro.discount,
            tip: 0,
            tax: 0,
            grandTotal: ro.grandTotal,
            paymentMethod: (ro.paymentMethod as any) || 'Pay on Counter',
            paymentOptionDetail: ro.paymentMethod === 'Razorpay' || ro.paymentMethod === 'PayU' ? 'Online Settlement' : 'Pay on Counter',
            status: (ro.orderStatus as OrderStatus) || 'Queued',
            progress: 100,
            createdAt: ro.createdAt,
            estimatedTimeMin: 3,
            queuePosition: 1,
            barcode: `${ro.id}-COPYGO`,
            invoiceId: `INV-${ro.orderNumber.replace('ORD-', '')}`,
            paymentStatus: ro.orderStatus === 'Completed' ? 'PAID' : (ro.paymentMethod === 'Pay on Counter' ? 'PENDING' : 'PAID'),
            securityPin: '7392'
          }));
          setOrders(mappedOrders);
        }
      });

      if (pendingAuthAction) {
        const actionToRun = pendingAuthAction;
        setPendingAuthAction(null);
        setTimeout(() => actionToRun(), 150);
      }
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || 'Invalid email or password' };
    }
  };

  const registerWithEmail = async (name: string, email: string, password: string, phone?: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const cleanEmail = email.trim().toLowerCase();
      const cleanPhone = (phone || '').trim();

      // Validate password rules
      const val = validatePasswordRules(password);
      if (!val.isValid) {
        return { success: false, error: val.error || 'Password does not meet security rules.' };
      }

      // Validate 10-digit mobile number
      if (cleanPhone && !/^\d{10}$/.test(cleanPhone)) {
        return { success: false, error: 'Mobile number must be a valid 10-digit number.' };
      }

      // Check if user already exists
      const { data: existing } = await supabase
        .from('user_profiles')
        .select('id')
        .ilike('email', cleanEmail)
        .limit(1);

      if (existing && existing.length > 0) {
        return { success: false, error: 'An account with this email address already exists. Please sign in.' };
      }

      const pwdHash = await hashPassword(password);
      let authUserId = `usr_${Date.now()}`;

      try {
        const { data: authData } = await supabase.auth.signUp({
          email: cleanEmail,
          password,
          options: { data: { name, phone: cleanPhone } }
        });
        if (authData?.user?.id) {
          authUserId = authData.user.id;
        }
      } catch (e) {
        console.warn('Supabase auth signUp fallback:', e);
      }

      const updatedUser: UserProfile = {
        ...user,
        id: authUserId,
        name,
        email: cleanEmail,
        phone: cleanPhone,
        isAuthenticated: true,
        isGuest: false
      };
      setUser(updatedUser);
      localStorage.setItem('printperfect_user', JSON.stringify(updatedUser));

      await supabase.from('user_profiles').upsert({
        id: authUserId,
        name,
        email: cleanEmail,
        phone: cleanPhone,
        password_hash: pwdHash,
        updated_at: new Date().toISOString()
      });

      if (pendingAuthAction) {
        const actionToRun = pendingAuthAction;
        setPendingAuthAction(null);
        setTimeout(() => actionToRun(), 150);
      }
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  };

  const updatePassword = async (oldPassword: string, newPassword: string): Promise<{ success: boolean; error?: string }> => {
    try {
      if (!user.isAuthenticated || user.isGuest) {
        return { success: false, error: 'You must be logged in to update your password.' };
      }

      const oldHash = await hashPassword(oldPassword);

      // Verify old password against stored hash in user_profiles
      const { data: profiles } = await supabase
        .from('user_profiles')
        .select('password_hash, email')
        .eq('id', user.id)
        .limit(1);

      if (profiles && profiles.length > 0 && profiles[0].password_hash) {
        if (profiles[0].password_hash !== oldHash) {
          return { success: false, error: 'Current password is incorrect. Verification failed.' };
        }
      } else {
        // Fallback: verify via supabase auth
        const { error: signErr } = await supabase.auth.signInWithPassword({
          email: user.email,
          password: oldPassword
        });
        if (signErr) {
          return { success: false, error: 'Current password is incorrect. Verification failed.' };
        }
      }

      // Validate new password rules
      const val = validatePasswordRules(newPassword);
      if (!val.isValid) {
        return { success: false, error: val.error || 'New password does not meet security requirements.' };
      }

      if (oldPassword === newPassword) {
        return { success: false, error: 'New password must be different from current password.' };
      }

      const newHash = await hashPassword(newPassword);

      // Save new hashed password to user_profiles
      const { error: updateErr } = await supabase
        .from('user_profiles')
        .update({ password_hash: newHash, updated_at: new Date().toISOString() })
        .eq('id', user.id);

      if (updateErr) {
        return { success: false, error: 'Failed to update password: ' + updateErr.message };
      }

      try {
        await supabase.auth.updateUser({ password: newPassword });
      } catch (e) {
        console.warn('Supabase auth password update skipped:', e);
      }

      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || 'An unexpected error occurred while updating password.' };
    }
  };

  const loginWithGoogle = async (): Promise<{ success: boolean; error?: string }> => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: `${window.location.origin}/` }
      });
      if (error) throw error;
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  };

  const logout = async () => {
    try {
      await supabase.auth.signOut();
    } catch {}
    try {
      localStorage.clear();
      sessionStorage.clear();
    } catch {}
    const freshGuestUser: UserProfile = {
      ...INITIAL_USER,
      id: '',
      name: '',
      surname: '',
      email: '',
      phone: '',
      address: '',
      avatarUrl: DEFAULT_GUEST_PROFILE_PHOTO,
      coordinates: [73.8567, 18.5204],
      isAuthenticated: false,
      isGuest: true
    };
    setUser(freshGuestUser);
    setOrders([]);
    setUploadedDocs([]);
    setCurrentDoc(null);
    setNotifications([]);
    setMemberships([]);
    setSelectedEnterpriseId(null);
    toast.info('Logged out. Your session and workspace have been completely reset.');
  };

  // 9. Notifications
  const [notifications, setNotifications] = useState<AppNotification[]>(() => {
    const saved = localStorage.getItem('printperfect_notifs');
    return saved ? JSON.parse(saved) : INITIAL_NOTIFICATIONS;
  });

  useEffect(() => {
    localStorage.setItem('printperfect_notifs', JSON.stringify(notifications));
  }, [notifications]);

  const unreadNotifCount = notifications.filter(n => !n.read).length;

  const markNotificationAsRead = (id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  };

  const markAllNotificationsAsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    toast.success('All notifications marked as read');
  };

  const clearAllNotifications = () => {
    setNotifications([]);
    localStorage.removeItem('printperfect_notifs');
    toast.success('All notifications cleared');
  };

  // 9. Quick Scan Modal
  const [isQuickScanOpen, setIsQuickScanOpen] = useState(false);
  const openQuickScan = () => setIsQuickScanOpen(true);
  const closeQuickScan = () => setIsQuickScanOpen(false);

  const pairTerminal = (terminalCode: string): boolean => {
    const matched = enterprises.find(e => e.terminalCode.toLowerCase() === terminalCode.toLowerCase() || e.shortCode.toLowerCase() === terminalCode.toLowerCase());
    if (matched) {
      selectEnterprise(matched.id);
      setIsQuickScanOpen(false);
      toast.success(`Paired with terminal ${matched.terminalCode} (${matched.name})! Ready to print.`);
      return true;
    }
    toast.error('Terminal code not recognized. Please scan a valid printOn24 terminal (e.g. PUNE-HE-01).');
    return false;
  };

  const pairTerminalByCode = (code: string): boolean => {
    if (!code || !code.trim()) {
      toast.error('Please enter a valid terminal code.');
      return false;
    }
    const clean = code.trim().toLowerCase();
    const matched = enterprises.find(
      e => e.terminalCode.toLowerCase() === clean ||
           e.shortCode.toLowerCase() === clean ||
           e.name.toLowerCase().includes(clean)
    );
    if (matched) {
      selectEnterprise(matched.id);
      toast.success(`Linked Shop: ${matched.name} (${matched.terminalCode})! Print preferences loaded.`);
      return true;
    }
    toast.error(`No printOn24 terminal found for code "${code}". Please check the shop counter stand (e.g. PUNE-HE-01) or scan the QR code.`);
    return false;
  };

  const verifyAndSelectShopByCode = async (
    rawCode: string
  ): Promise<{ success: boolean; shop?: PrintEnterprise; message?: string }> => {
    if (!rawCode || !rawCode.trim()) {
      return { success: false, message: 'Please enter a shop terminal code (e.g. PUNE-HE-01).' };
    }
    const clean = rawCode.trim().replace(/^COPYGO:/i, '').replace(/^SHOP:/i, '').toLowerCase();

    // Check if shop is disabled/inactive in database before returning details
    try {
      const { data: dbCheck } = await supabase
        .from('print_shops')
        .select('id, status, is_open')
        .or(`terminal_code.ilike.${clean},shop_code.ilike.${clean},id.eq.${clean},name.ilike.%${clean}%`)
        .limit(1)
        .maybeSingle();

      if (
        dbCheck &&
        (dbCheck.status === 'inactive' ||
          dbCheck.status === 'disabled' ||
          dbCheck.is_open === false)
      ) {
        return {
          success: false,
          message: 'This print shop is currently unavailable. Please select another shop.'
        };
      }
    } catch (err) {
      console.warn('Error verifying shop status:', err);
    }

    // 1. Search in local enterprises state
    let matched = enterprises.find(
      e =>
        e.terminalCode.toLowerCase() === clean ||
        e.shortCode.toLowerCase() === clean ||
        e.id.toLowerCase() === clean ||
        e.name.toLowerCase() === clean
    );

    // If local match is marked inactive/disabled, block access
    if (
      matched &&
      (matched.isOpen === false ||
        (matched as any).status === 'inactive' ||
        (matched as any).status === 'disabled')
    ) {
      return {
        success: false,
        message: 'This print shop is currently unavailable. Please select another shop.'
      };
    }

    // 2. Query Supabase directly if not found locally
    if (!matched) {
      try {
        const remoteMatch = await fetchShopByTerminalCode(rawCode);
        if (remoteMatch) {
          matched = remoteMatch;
          setEnterprises(prev => {
            const existingIndex = prev.findIndex(e => e.id === remoteMatch.id);
            if (existingIndex >= 0) {
              return prev.map((enterprise, index) =>
                index === existingIndex ? { ...enterprise, ...remoteMatch } : enterprise
              );
            }
            return [...prev, remoteMatch];
          });
        }
      } catch (err) {
        console.warn('Error fetching shop by terminal code:', err);
      }
    }

    if (matched) {
      selectEnterprise(matched.id);
      setIsQuickScanOpen(false);
      return { success: true, shop: matched };
    }

    return {
      success: false,
      message: `Invalid shop code "${rawCode.trim()}". Please enter a valid partner counter code (e.g. PUNE-HE-01).`
    };
  };

  // 10. Student Profile Management (CRUD)
  const [studentProfiles, setStudentProfiles] = useState<StudentProfile[]>(() => {
    const saved = localStorage.getItem('copygo_student_profiles');
    return saved ? JSON.parse(saved) : INITIAL_STUDENT_PROFILES;
  });

  const activeStudentProfile = studentProfiles.find(p => p.isDefault) || studentProfiles[0];

  const addStudentProfile = (profileData: Omit<StudentProfile, 'id'>) => {
    const newProf: StudentProfile = {
      ...profileData,
      id: `stu_${Date.now()}`
    };
    const updated = profileData.isDefault
      ? [newProf, ...studentProfiles.map(p => ({ ...p, isDefault: false }))]
      : [newProf, ...studentProfiles];
    setStudentProfiles(updated);
    localStorage.setItem('copygo_student_profiles', JSON.stringify(updated));
    // Also sync with main user profile if default
    if (profileData.isDefault) {
      updateUser({
        name: profileData.name,
        email: profileData.email,
        phone: profileData.phone
      });
    }
    toast.success(`Student Profile for ${profileData.name} created successfully!`);
  };

  const updateStudentProfile = (id: string, updates: Partial<StudentProfile>) => {
    const updated = studentProfiles.map(p => {
      if (p.id === id) {
        return { ...p, ...updates };
      }
      if (updates.isDefault) {
        return { ...p, isDefault: false };
      }
      return p;
    });
    setStudentProfiles(updated);
    localStorage.setItem('copygo_student_profiles', JSON.stringify(updated));
    const current = updated.find(p => p.id === id);
    if (current && (current.isDefault || updates.isDefault)) {
      updateUser({
        name: current.name,
        email: current.email,
        phone: current.phone
      });
    }
    toast.success('Student profile updated successfully!');
  };

  const deleteStudentProfile = (id: string) => {
    if (studentProfiles.length <= 1) {
      toast.error('You must keep at least one student profile.');
      return;
    }
    const filtered = studentProfiles.filter(p => p.id !== id);
    if (!filtered.some(p => p.isDefault)) {
      filtered[0].isDefault = true;
      updateUser({
        name: filtered[0].name,
        email: filtered[0].email,
        phone: filtered[0].phone
      });
    }
    setStudentProfiles(filtered);
    localStorage.setItem('copygo_student_profiles', JSON.stringify(filtered));
    toast.success('Student profile removed.');
  };

  const setActiveStudentProfile = (id: string) => {
    const target = studentProfiles.find(p => p.id === id);
    if (!target) return;
    const updated = studentProfiles.map(p => ({
      ...p,
      isDefault: p.id === id
    }));
    setStudentProfiles(updated);
    localStorage.setItem('copygo_student_profiles', JSON.stringify(updated));
    updateUser({
      name: target.name,
      email: target.email,
      phone: target.phone
    });
    toast.success(`Active profile switched to ${target.name}`);
  };

  // 11. Shop Services & Customer Reviews
  const [shopServices] = useState<ShopService[]>(INITIAL_SERVICES);
  const [shopReviews, setShopReviews] = useState<ShopReview[]>(() => {
    const saved = localStorage.getItem('copygo_shop_reviews');
    return saved ? JSON.parse(saved) : INITIAL_REVIEWS;
  });

  const addShopReview = (newReview: Omit<ShopReview, 'id' | 'date'>) => {
    // Persist to Supabase shop_reviews with status 'pending' (moderation queue)
    submitShopReview({
      shop_id: newReview.enterpriseId,
      user_id: user.id || undefined,
      user_name: newReview.userName || user.name || 'Student Customer',
      rating: newReview.rating,
      comment: newReview.comment,
      service_used: newReview.serviceUsed
    }).catch(console.error);

    toast.success('Thank you! Your feedback has been submitted for shopkeeper approval.');
  };

  // 12. Nearby Shops (Dynamically mapped from Supabase enterprises with Haversine distance)
  const nearbyShops: NearbyShop[] = useMemo(() => {
    const userLat = user.coordinates?.[1] ?? 18.5204;
    const userLng = user.coordinates?.[0] ?? 73.8567;

    return enterprises.map(ent => {
      const shopLat = ent.latitude ?? 18.5204;
      const shopLng = ent.longitude ?? 73.8567;

      // Haversine formula in meters
      const R = 6371e3;
      const phi1 = (userLat * Math.PI) / 180;
      const phi2 = (shopLat * Math.PI) / 180;
      const deltaPhi = ((shopLat - userLat) * Math.PI) / 180;
      const deltaLambda = ((shopLng - userLng) * Math.PI) / 180;

      const a =
        Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
        Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      const distMeters = Math.round(R * c);
      const walkingMin = Math.max(1, Math.round(distMeters / 80));

      return {
        ...ent,
        distanceMeters: distMeters,
        distanceFormatted: distMeters < 1000 ? `${distMeters} m away (${walkingMin} min walk)` : `${(distMeters / 1000).toFixed(1)} km away`,
        latitude: shopLat,
        longitude: shopLng,
        isOpen: ent.isOpen ?? true
      };
    });
  }, [enterprises, user.coordinates]);

  // 13. Partner Registrations (Start Business)
  const [partnerRegistrations, setPartnerRegistrations] = useState<PartnerRegistration[]>(() => {
    const saved = localStorage.getItem('copygo_partner_registrations');
    return saved ? JSON.parse(saved) : [];
  });

  const submitPartnerRegistration = (data: Omit<PartnerRegistration, 'id' | 'status' | 'submittedAt'>) => {
    const reg: PartnerRegistration = {
      ...data,
      id: `REG-SHOP-${Math.floor(100000 + Math.random() * 900000)}`,
      status: 'Pending Review',
      submittedAt: new Date().toLocaleString()
    };
    const updated = [reg, ...partnerRegistrations];
    setPartnerRegistrations(updated);
    localStorage.setItem('copygo_partner_registrations', JSON.stringify(updated));
    updateUser({ businessOnboarded: true });
    toast.success(`Business Application #${reg.id} submitted successfully! Our onboarding team will verify your shop within 24 hours.`);
  };

  // 14. Membership Active / Inactive State (Strictly derived from real database memberships)
  const isMembershipActive = activeMemberships.length > 0;

  const toggleMembershipStatus = () => {
    toast.info('Membership is managed directly through store enrollment.');
  };

  // 15. Save Default Print Preferences (Auto-applies to new print orders)
  const saveDefaultPrintConfig = (config: PrintConfig) => {
    updatePrintConfig(config);
    updateUser({
      defaultPrintPrefs: {
        pageSize: config.pageSize,
        paperType: config.paperType,
        printType: config.printType === 'Color' ? 'Colour' : 'B&W',
        sides: config.sides === 'Back to Back' ? 'Back-to-Back' : 'Single-sided',
        layout: config.layout
      }
    });
    localStorage.setItem('copygo_default_print_config', JSON.stringify(config));
    toast.success('Default print preferences saved! These will automatically apply whenever you connect to a print shop.');
  };

  // 10. Feedback & Ads
  const [feedbackList, setFeedbackList] = useState<UserFeedback[]>([]);
  const submitFeedback = (category: UserFeedback['category'], subject: string, details: string, rating?: number) => {
    const newFb: UserFeedback = {
      id: `fb_${Date.now()}`,
      userId: user.id,
      category,
      subject,
      details,
      rating: rating ?? 5,
      submittedAt: new Date().toLocaleString(),
      status: 'received'
    };
    setFeedbackList(prev => [newFb, ...prev]);

    // Persist in Supabase app_feedback table
    try {
      supabase.from('app_feedback').insert({
        id: newFb.id,
        user_id: user.id,
        user_name: `${user.name} ${user.surname || ''}`.trim(),
        rating: newFb.rating,
        category: newFb.category,
        feedback_text: `${subject}: ${details}`
      }).then(({ error }) => {
        if (error) console.warn('Supabase app_feedback sync warning:', error.message);
      });
    } catch (e) {
      console.warn('Supabase app_feedback sync skipped:', e);
    }

    toast.success('Thank you! Your feedback has been recorded in the database.');
  };

  const [adRequests, setAdRequests] = useState<AdRequest[]>([]);
  const submitAdRequest = (req: Omit<AdRequest, 'id' | 'userId' | 'submittedAt' | 'status'>) => {
    const newAd: AdRequest = {
      ...req,
      id: `ad_${Date.now()}`,
      userId: user.id,
      submittedAt: new Date().toLocaleString(),
      status: 'pending'
    };
    setAdRequests(prev => [newAd, ...prev]);

    // Persist in Supabase ad_requests table
    try {
      supabase.from('ad_requests').insert({
        id: newAd.id,
        business_name: newAd.businessName || 'Campus Partner',
        contact_person: newAd.contactPerson || 'Student Partner',
        email: newAd.email,
        phone: newAd.phone,
        ad_type: newAd.campaignGoal || 'App Banner',
        budget: newAd.budgetRange || '₹5,000 - ₹15,000',
        message: 'Campus promotion inquiry',
        status: 'pending'
      }).then(({ error }) => {
        if (error) console.warn('Supabase ad_requests sync warning:', error.message);
      });
    } catch (e) {
      console.warn('Supabase ad_requests sync skipped:', e);
    }

    toast.success('Advertisement request submitted! Our partner team will reach out.');
  };

  // User updates & Language
  const updateUser = (updates: Partial<UserProfile>) => {
    if (updates.phone !== undefined && updates.phone !== null && updates.phone.trim() !== '') {
      const cleanPhone = updates.phone.trim();
      if (!/^\d{10}$/.test(cleanPhone)) {
        toast.error('Mobile number must be a valid 10-digit number (digits only).');
        return;
      }
    }

    setUser(prev => {
      const updated = { ...prev, ...updates };
      // Sync to Supabase user_profiles table ONLY for authenticated non-guest users
      if (
        updated.isAuthenticated &&
        !updated.isGuest &&
        updated.id &&
        !updated.id.startsWith('guest_') &&
        updated.id !== 'usr-current-01'
      ) {
        try {
          supabase.from('user_profiles').upsert({
            id: updated.id,
            name: updated.name,
            surname: updated.surname || '',
            email: updated.email,
            phone: updated.phone,
            address: updated.address || '',
            avatar_url: updated.avatarUrl || '',
            updated_at: new Date().toISOString()
          }).then(({ error }) => {
            if (error) console.warn('Supabase user_profiles sync warning:', error.message);
          });
        } catch (e) {
          console.warn('Supabase user_profiles sync skipped:', e);
        }
      }
      return updated;
    });
  };

  const setLanguage = (lang: Language) => {
    updateUser({ selectedLanguage: 'EN' });
    toast.success('Interface language set to English');
  };

  const t = (key: string): string => {
    return TRANSLATIONS.EN[key] || key;
  };

  return (
    <PrintPerfectContext.Provider
      value={{
        user,
        updateUser,
        setLanguage,
        t,
        enterprises,
        selectedEnterprise,
        hasExplicitlySelectedEnterprise,
        selectEnterprise,
        resetEnterpriseSelection,
        clearUploadSession,
        memberships,
        activeMembership,
        activeMemberships,
        buyMembership,
        enrollMembership,
        uploadedDocs,
        currentDoc,
        setCurrentDoc,
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
        updatePrintConfig,
        applyPrintConfigToDocuments,
        resetPrintConfig,
        priceCalc,
        currentDocPriceCalc,
        getDocPrice,
        orders,
        activeReceiptOrder,
        setActiveReceiptOrder,
        createOrder,
        notifications,
        unreadNotifCount,
        markNotificationAsRead,
        markAllNotificationsAsRead,
        clearAllNotifications,
        submitFeedback,
        submitAdRequest,
        isQuickScanOpen,
        openQuickScan,
        closeQuickScan,
        pairTerminal,
        pairTerminalByCode,
        verifyAndSelectShopByCode,
        feedbackList,
        adRequests,
        studentProfiles,
        activeStudentProfile,
        addStudentProfile,
        updateStudentProfile,
        deleteStudentProfile,
        setActiveStudentProfile,
        shopServices,
        shopReviews,
        addShopReview,
        nearbyShops,
        partnerRegistrations,
        submitPartnerRegistration,
        isMembershipActive,
        toggleMembershipStatus,
        saveDefaultPrintConfig,
        retrieveDocumentForPrint,
        isAuthModalOpen,
        authModalTitle,
        authModalSubtitle,
        openAuthModal,
        closeAuthModal,
        requireAuth,
        loginWithEmail,
        registerWithEmail,
        loginWithGoogle,
        updatePassword,
        logout
      }}
    >
      {children}
    </PrintPerfectContext.Provider>
  );
};

export const usePrintPerfect = () => {
  const context = useContext(PrintPerfectContext);
  if (!context) {
    throw new Error('usePrintPerfect must be used within a PrintPerfectProvider');
  }
  return context;
};
