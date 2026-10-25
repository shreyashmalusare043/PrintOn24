export type Language = 'EN' | 'MR' | 'HI';

export const DEFAULT_GUEST_PROFILE_PHOTO = 'https://miaoda-conversation-file.s3cdn.medo.dev/user-awm3lxjnyu4g/app-epyrkfdiozk1/20261012/GuestProfilePhoto.png';

export interface UserProfile {
  id: string;
  name: string;
  surname?: string;
  email: string;
  phone: string;
  address?: string;
  coordinates?: [number, number]; // [lng, lat]
  avatarUrl: string;
  selectedLanguage: Language;
  businessOnboarded: boolean;
  defaultPrintPrefs: {
    pageSize: 'A4' | 'A3' | 'A2' | 'A5' | 'Letter' | 'Legal' | 'Executive' | 'Bond';
    paperType: string;
    printType: 'Colour' | 'B&W' | 'Costone';
    sides: 'Single-sided' | 'Back-to-Back';
    layout: 'Portrait' | 'Landscape';
  };
  notificationPrefs: {
    printComplete: boolean;
    membershipRenew: boolean;
    promotions: boolean;
  };
  theme: 'light' | 'dark' | 'system';
  isGuest?: boolean;
  isAuthenticated?: boolean;
}

export interface PrintEnterprise {
  id: string;
  name: string;
  shortCode: string;
  badgeColor: string;
  badgeTextColor: string;
  verified: boolean;
  category: string;
  address: string;
  city?: string;
  latitude?: number;
  longitude?: number;
  isOpen?: boolean;
  phone: string;
  rating: number;
  totalOrders: number;
  terminalCode: string;
  logoUrl?: string;
  initials: string;
  membershipEnabled?: boolean;
  membershipPrice?: number;
  paymentMethodConfig?: 'both' | 'counter' | 'razorpay' | 'payu' | string;
  pricing: {
    blackAndWhite: number; // base rate per single side
    colour: number;
    blackAndWhiteDouble?: number;
    colourDouble?: number;
    shopId?: string;
    isConfigured?: boolean;
    bwPricingMode?: 'page' | 'print';
    colorPricingMode?: 'page' | 'print';
    shortPageLimit?: number;
    bwShortPageRate?: number;
    colorShortPageRate?: number;
    eligibilitySettingsLoaded?: boolean;
    eligibilitySettingsError?: boolean;
    eligibility?: {
      bwSingle?: boolean;
      bwBackToBack?: boolean;
      colorSingle?: boolean;
      colorBackToBack?: boolean;
    };
    bondPaperRate?: number;
    glossyPaperRate?: number;
    paperSizeRates?: Record<string, {
      bwSingle?: number;
      colorSingle?: number;
      bwDouble?: number;
      colorDouble?: number;
      costoneSingle?: number;
      costoneDouble?: number;
    }>;
    dynamicPaperTypes?: Array<{
      name: string;
      bwPrice?: number;
      colorPrice?: number;
      bwDoublePrice?: number;
      colorDoublePrice?: number;
      costonePrice?: number;
      costoneDoublePrice?: number;
      eligibility?: {
        bwSingle?: boolean;
        bwBackToBack?: boolean;
        colorSingle?: boolean;
        colorBackToBack?: boolean;
      };
    }>;
    costone: number;
    costoneDouble?: number;
    bondPaperExtra: number;
    glossyPaperExtra: number;
    a3Multiplier: number;
    a2Multiplier: number;
  };
}

export interface MembershipPlan {
  id: string;
  enterpriseId?: string;
  enterpriseName?: string;
  tier: 'Student Star' | 'Silver' | 'Gold' | 'Platinum VIP' | string;
  memberId?: string;
  price?: number;
  pricePerMonth?: number;
  validityMonths?: number;
  freePagesPerMonth?: number;
  discountPercentage: number;
  cardNumber?: string;
  validFrom?: string;
  validUntil?: string;
  status?: 'active' | 'expiring' | 'inactive';
  daysRemaining?: number;
  perks: string[];
  userName?: string;
  userEmail?: string;
  userPhone?: string;
  userAddress?: string;
  userPhotoUrl?: string;
}

export interface CustomPageRangeRule {
  id: string;
  fromPage: number;
  toPage: number;
  printType: 'Color' | 'Black & White';
  sides: 'Single Side' | 'Back to Back';
}

export interface ImageEditingState {
  brightness: number; // -100 to 100
  contrast: number;   // -100 to 100
  saturation: number; // -100 to 100
  hue?: number;        // -180 to 180
  rotation: number;   // 0, 90, 180, 270
  straighten?: number; // -45 to +45
  perspectiveX?: number; // -30 to +30
  perspectiveY?: number; // -30 to +30
  cropRatio?: 'A4 Fit' | 'Original' | '1:1' | '4:3' | '16:9' | 'Custom';
  cropBox?: {
    top: number;
    left: number;
    width: number;
    height: number;
  };
  grayscale?: boolean;
  position?: {
    x: number;
    y: number;
    width: number;
    height: number;
    scale: number;
  };
  canvasDimensions?: {
    width: number;
    height: number;
    paperSize: string;
    orientation: 'Portrait' | 'Landscape';
  };
  layers?: any[];
  fitToPage?: boolean;
}

export type DocumentUploadStatus = 'UPLOADING' | 'UPLOADED' | 'READY' | 'FAILED' | 'FILE_EXPIRED' | 'FILE_DELETED';

export interface PriceCalculation {
  effectivePages: number;
  sheetsUsed: number;
  baseRatePerSide: number;
  subtotal: number;
  discount: number;
  tax: number;
  grandTotal: number;
}

export interface UploadedDoc {
  id: string;
  userId?: string;
  shopId?: string;
  orderId?: string;
  fileName: string;
  originalFileName?: string;
  fileType: 'PDF' | 'DOCX' | 'DOC' | 'XLS' | 'XLSX' | 'PPT' | 'PPTX' | 'TXT' | 'JPG' | 'PNG' | 'OTHER';
  mimeType?: string;
  fileSizeMb: number;
  fileSize?: number;
  totalPages: number;
  previewUrl?: string;
  imageUrl?: string;
  storageBucket?: string;
  storagePath?: string;
  storageUrl?: string;
  uploadStatus?: DocumentUploadStatus;
  createdAt?: string;
  expiryAt?: string;
  deletedAt?: string;
  imageEditing?: ImageEditingState;
  printConfig?: PrintConfig;
  priceCalc?: PriceCalculation;
  uploadedAt: string;
  convertedPdfUrl?: string;
  isConverted?: boolean;
  conversionStatus?: 'idle' | 'converting' | 'converted' | 'failed';
  excelSheets?: string[];
  selectedSheet?: string;
  excelScaling?: 'No Scaling' | 'Fit Sheet on One Page' | 'Fit All Columns on One Page' | 'Fit All Rows on One Page';
}

export interface PrintConfig {
  pageSize: 'A4' | 'A3' | 'A2' | 'Letter' | 'Legal' | 'A5' | 'Executive' | 'Bond';
  paperType: string;
  printType: 'Color' | 'Black & White' | 'Colour' | 'B&W' | 'Costone' | '';
  sides: 'Single Side' | 'Back to Back' | 'Single-sided' | 'Back-to-Back' | '';
  copies: number;
  layout: 'Portrait' | 'Landscape';
  pageRangeType: 'All Pages' | 'Selected Pages' | 'Custom Range' | 'All pages' | 'Selected pages';
  selectedPageRange: string; // explicitly user-entered, e.g. "1-3, 5" (no static default)
  customRanges?: CustomPageRangeRule[];
  pagesPerSheet: '1-in-1' | '2-in-1' | '4-in-1';
  excelScaling?: 'No Scaling' | 'Fit Sheet on One Page' | 'Fit All Columns on One Page' | 'Fit All Rows on One Page';
}

export type OrderStatus = 'Queued' | 'Printing' | 'Ready for Pickup' | 'Completed';
export type PaymentMethod = 'Razorpay' | 'Pay on Counter' | 'PayU' | 'Online Payment' | 'Online Payment / PayU';
export type PaymentStatus = 'PAID' | 'PENDING';

export interface PrintOrder {
  id: string;
  orderNumber: string;
  tokenNumber: string;
  userId: string;
  enterpriseId: string;
  enterpriseName: string;
  enterpriseAddress: string;
  document: UploadedDoc;
  documents?: UploadedDoc[];
  config: PrintConfig;
  calculatedPages: number;
  sheetsUsed: number;
  unitPrice: number;
  subtotal: number;
  discount: number;
  tip: number;
  tax: number;
  grandTotal: number;
  paymentMethod: PaymentMethod;
  paymentOptionDetail?: string; // UPI / Card / Cash etc.
  paymentStatus: PaymentStatus;
  status: OrderStatus;
  createdAt: string;
  completedAt?: string;
  barcode: string;
  invoiceId: string;
  customerName?: string;
}

export interface AppNotification {
  id: string;
  userId: string;
  type: 'print_complete' | 'membership_renew' | 'promotional';
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  orderId?: string;
  enterpriseName?: string;
}

export interface StudentProfile {
  id: string;
  name: string;
  email: string;
  phone: string;
  studentId: string;
  college: string;
  course: string;
  year: string;
  avatarUrl?: string;
  isDefault: boolean;
}

export interface ShopService {
  id: string;
  name: string;
  category: string;
  description: string;
  basePrice: string;
  deliveryTime: string;
  popular?: boolean;
}

export interface ShopReview {
  id: string;
  enterpriseId: string;
  userName: string;
  userAvatar?: string;
  rating: number;
  comment: string;
  date: string;
  serviceUsed: string;
}

export interface NearbyShop extends PrintEnterprise {
  distanceMeters: number;
  distanceFormatted: string;
  distanceKm?: number;
  latitude: number;
  longitude: number;
  isOpen: boolean;
}

export interface PartnerRegistration {
  id: string;
  shopName: string;
  ownerName: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  pincode: string;
  operatingHours: string;
  equipment: string[];
  servicesOffered: string[];
  status: 'Pending Review' | 'Approved' | 'Active';
  submittedAt: string;
}


export interface UserFeedback {
  id: string;
  userId?: string;
  category: 'Feedback' | 'Suggestion' | 'Bug Report';
  subject: string;
  details: string;
  rating?: number;
  status: string;
  submittedAt: string;
}


export interface AdRequest {
  id: string;
  userId: string;
  businessName: string;
  contactPerson: string;
  phone: string;
  email: string;
  campaignGoal: string;
  budgetRange: string;
  submittedAt: string;
  status: 'pending' | 'approved' | 'in_review';
}

export interface SupportTicket {
  id: string;
  userId: string;
  subject: string;
  message: string;
  category: 'General' | 'Payment Issue' | 'Print Quality' | 'Terminal Pairing';
  createdAt: string;
  status: 'open' | 'closed';
}
