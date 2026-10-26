import type {
  UserProfile,
  PrintEnterprise,
  MembershipPlan,
  PrintOrder,
  AppNotification,
  UploadedDoc
} from '../types/printperfect';
import { DEFAULT_GUEST_PROFILE_PHOTO } from '../types/printperfect';

export const INITIAL_USER: UserProfile = {
  id: '',
  name: '',
  surname: '',
  email: '',
  phone: '',
  address: '',
  coordinates: [73.8567, 18.5204],
  avatarUrl: DEFAULT_GUEST_PROFILE_PHOTO,
  selectedLanguage: 'EN',
  businessOnboarded: false,
  defaultPrintPrefs: {
    pageSize: 'A4',
    paperType: 'Normal',
    printType: 'Colour',
    sides: 'Single-sided',
    layout: 'Portrait'
  },
  notificationPrefs: {
    printComplete: true,
    membershipRenew: true,
    promotions: true
  },
  theme: 'light',
  isGuest: true,
  isAuthenticated: false
};

export const INITIAL_ENTERPRISES: PrintEnterprise[] = [];

export const INITIAL_MEMBERSHIPS: MembershipPlan[] = [];

export const SAMPLE_DOCUMENTS: UploadedDoc[] = [];

export const INITIAL_ORDERS: PrintOrder[] = [];

export const INITIAL_NOTIFICATIONS: AppNotification[] = [];

export const INITIAL_STUDENT_PROFILES: any[] = [];

export const INITIAL_SERVICES = [
  {
    id: 'srv_1',
    name: 'High-Speed B&W Xerox / Printing',
    category: 'Document Printing',
    description: 'Crisp 1200 DPI laser print on 75 GSM premium JK copier paper',
    basePrice: '₹1.50 / page',
    deliveryTime: 'Instant (2-5 mins)',
    popular: true
  },
  {
    id: 'srv_2',
    name: 'Full HD Laser Colour Printing',
    category: 'Colour Printing',
    description: 'Vibrant color reproduction for presentations, project reports, and charts',
    basePrice: '₹5.00 / page',
    deliveryTime: 'Instant (3-5 mins)',
    popular: true
  },
  {
    id: 'srv_3',
    name: 'Spiral & Wire-O Binding',
    category: 'Binding & Finishing',
    description: 'Transparent PVC front cover + matte black back sheet with flexible plastic spiral coil',
    basePrice: '₹25.00 / book',
    deliveryTime: '5-10 mins',
    popular: true
  },
  {
    id: 'srv_4',
    name: 'Hardcover Golden Embossed Project Binding',
    category: 'Binding & Finishing',
    description: 'University approved hardcover book binding with shiny golden foil embossing',
    basePrice: '₹180.00 / book',
    deliveryTime: '2 hours or same day',
    popular: false
  },
  {
    id: 'srv_5',
    name: 'Thermal / Glossy Lamination (A4 / A3)',
    category: 'Lamination',
    description: 'Waterproof 125-micron protective thermal lamination for certificates and marksheets',
    basePrice: '₹20.00 / sheet',
    deliveryTime: '3 mins',
    popular: false
  },
  {
    id: 'srv_6',
    name: 'Photo Paper Glossy Print (4x6 / A4)',
    category: 'Photo Printing',
    description: '240 GSM Kodak ultra-glossy photo paper with waterproof archival ink',
    basePrice: '₹35.00 / photo',
    deliveryTime: '10 mins',
    popular: false
  }
];

export const INITIAL_REVIEWS = [
  {
    id: 'rev_1',
    enterpriseId: 'ent-02',
    userName: 'Tanvi Kulkarni',
    userAvatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=128&q=80',
    rating: 5,
    comment: 'Super fast printing directly from CopyGo! My 80-page seminar report was spiral bound in under 8 minutes without standing in the crowd.',
    date: 'Yesterday at 3:45 PM',
    serviceUsed: 'Spiral Binding + B&W Print'
  },
  {
    id: 'rev_2',
    enterpriseId: 'ent-03',
    userName: 'Aditya Patil',
    userAvatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=128&q=80',
    rating: 5,
    comment: 'Best print shop near campus. The owner is polite and paper quality is genuinely 75 GSM. CopyGo token system saved my submission!',
    date: '28 Sep 2026',
    serviceUsed: 'Project Report B&W'
  }
];

export const INITIAL_NEARBY_SHOPS = [
  {
    id: 'ent-02',
    name: 'Campus Fast Print',
    shortCode: 'CFP',
    badgeColor: '#EF4444',
    badgeTextColor: '#FFFFFF',
    verified: true,
    category: 'Digital Printing & Stationery',
    address: 'Kothrud Campus Square, Pune',
    phone: '+91 98220 11223',
    rating: 4.8,
    totalOrders: 0,
    terminalCode: 'PUNE-CFP-02',
    initials: 'CFP',
    logoUrl: 'https://images.unsplash.com/photo-1556157382-97eda2d62296?auto=format&fit=crop&w=256&q=80',
    distanceMeters: 320,
    distanceFormatted: '320 m away (2 min walk)',
    latitude: 18.5074,
    longitude: 73.8077,
    isOpen: true,
    pricing: {
      blackAndWhite: 2.0,
      colour: 5.0,
      costone: 3.5,
      bondPaperExtra: 1.5,
      glossyPaperExtra: 3.0,
      a3Multiplier: 1.8,
      a2Multiplier: 3.2
    }
  },
  {
    id: 'ent-03',
    name: 'Shree Sai Xerox',
    shortCode: 'SSX',
    badgeColor: '#0284C7',
    badgeTextColor: '#FFFFFF',
    verified: true,
    category: 'High-Speed Copier & Laser Lab',
    address: 'Karve Road, Pune',
    phone: '+91 98221 44556',
    rating: 4.7,
    totalOrders: 0,
    terminalCode: 'PUNE-SSX-03',
    initials: 'SSX',
    logoUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=256&q=80',
    distanceMeters: 550,
    distanceFormatted: '550 m away (4 min walk)',
    latitude: 18.5018,
    longitude: 73.8210,
    isOpen: true,
    pricing: {
      blackAndWhite: 2.0,
      colour: 5.0,
      costone: 4.0,
      bondPaperExtra: 2.0,
      glossyPaperExtra: 3.5,
      a3Multiplier: 2.0,
      a2Multiplier: 3.5
    }
  },
  {
    id: 'ent-04',
    name: 'Sai Graphics & Printing',
    shortCode: 'SGP',
    badgeColor: '#10B981',
    badgeTextColor: '#FFFFFF',
    verified: true,
    category: 'Commercial Offset & Blueprint',
    address: 'Law College Road, Pune',
    phone: '+91 98222 77889',
    rating: 4.8,
    totalOrders: 0,
    terminalCode: 'PUNE-SGP-04',
    initials: 'SGP',
    logoUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=256&q=80',
    distanceMeters: 850,
    distanceFormatted: '850 m away (7 min walk)',
    latitude: 18.5158,
    longitude: 73.8322,
    isOpen: true,
    pricing: {
      blackAndWhite: 2.5,
      colour: 5.0,
      costone: 3.5,
      bondPaperExtra: 1.0,
      glossyPaperExtra: 2.5,
      a3Multiplier: 1.8,
      a2Multiplier: 3.0
    }
  }
];
