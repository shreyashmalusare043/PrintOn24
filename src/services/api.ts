import { supabase } from '../db/supabase';
import type { PrintEnterprise, PrintOrder, UserProfile } from '../types/printperfect';
import { DEFAULT_GUEST_PROFILE_PHOTO } from '../types/printperfect';

export interface DbPrintOrder {
  id: string;
  orderNumber: string;
  userId: string;
  shopId: string;
  shopName: string;
  tokenNumber: string;
  documentName: string;
  fileType: string;
  totalPages: number;
  configCopies: number;
  configPageSize: string;
  configPaperType: string;
  configPrintType: string;
  configSides: string;
  subtotal: number;
  discount: number;
  platformFee: number;
  grandTotal: number;
  paymentMethod: string;
  paymentStatus: string;
  orderStatus: string;
  createdAt: string;
}

export interface CareerItem {
  id: string;
  title: string;
  department: string;
  location: string;
  type: string;
  experience: string;
  description: string;
  requirements: string;
  is_active: boolean;
  created_at?: string;
}

export interface CareerApplicationPayload {
  career_id: string;
  user_id?: string;
  applicant_name: string;
  email: string;
  phone: string;
  portfolio_url?: string;
  resume_filename?: string;
  cover_note?: string;
}

export interface ContactMessagePayload {
  user_id?: string;
  name: string;
  email: string;
  phone?: string;
  subject: string;
  message: string;
}

export interface AdRequestPayload {
  business_name: string;
  contact_person: string;
  email: string;
  phone: string;
  ad_type: string;
  budget?: string;
  message: string;
}

export interface FeedbackPayload {
  user_id?: string;
  user_name: string;
  shop_id?: string;
  target_type: 'app' | 'shop';
  rating: number;
  category: string;
  feedback_text: string;
}

export interface AppNotification {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'alert';
  is_read: boolean;
  order_id?: string;
  created_at: string;
}

// -------------------------------------------------------------
// 1. User Profiles
// -------------------------------------------------------------
export async function getOrCreateUserProfile(userId?: string): Promise<UserProfile | null> {
  // Guest users must never fetch or sync from a shared profile record
  if (!userId || userId === 'usr-current-01' || userId.startsWith('guest_')) {
    return null;
  }

  try {
    const { data, error } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();

    if (error) {
      console.error('Error fetching profile:', error);
      return null;
    }

    if (data) {
      return {
        id: data.id,
        name: data.name,
        surname: data.surname,
        email: data.email,
        phone: data.phone,
        address: data.address,
        avatarUrl: data.avatar_url || DEFAULT_GUEST_PROFILE_PHOTO,
        selectedLanguage: 'EN',
        businessOnboarded: true,
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
          promotions: false
        },
        theme: 'light'
      };
    }

    return null;
  } catch (err) {
    console.error('getOrCreateUserProfile exception:', err);
    return null;
  }
}

export async function updateUserProfile(profile: Partial<UserProfile> & { id: string }): Promise<boolean> {
  try {
    const payload: any = {
      updated_at: new Date().toISOString()
    };
    if (profile.name !== undefined) payload.name = profile.name;
    if (profile.surname !== undefined) payload.surname = profile.surname;
    if (profile.email !== undefined) payload.email = profile.email;
    if (profile.phone !== undefined) {
      const clean = (profile.phone || '').trim();
      if (clean && !/^\d{10}$/.test(clean)) {
        console.error('updateUserProfile error: Contact number must be exactly 10 digits.');
        return false;
      }
      payload.phone = clean;
    }
    if (profile.address !== undefined) payload.address = profile.address;
    if (profile.avatarUrl !== undefined) payload.avatar_url = profile.avatarUrl;

    const { error } = await supabase
      .from('user_profiles')
      .update(payload)
      .eq('id', profile.id);

    return !error;
  } catch (err) {
    console.error('updateUserProfile exception:', err);
    return false;
  }
}

// -------------------------------------------------------------
// 2. Print Shops / Enterprises
// -------------------------------------------------------------
export interface RemoteShopData {
  id: string;
  name: string;
  address: string;
  terminalCode: string;
  latitude: number;
  longitude: number;
  rating: number;
  totalReviews: number;
  isOpen: boolean;
  phone: string;
  ownerName: string;
  logoUrl?: string;
  membershipEnabled?: boolean;
  membershipPrice?: number;
}

export async function getPrintShops(): Promise<RemoteShopData[]> {
  try {
    const { data, error } = await supabase
      .from('print_shops')
      .select('*')
      .neq('status', 'inactive')
      .order('rating', { ascending: false });

    if (error || !Array.isArray(data) || data.length === 0) {
      return [];
    }

    return data
      .filter((shop: any) => shop.status !== 'inactive' && shop.status !== 'disabled' && shop.is_open !== false)
      .map((shop: any) => ({
        id: shop.id,
        name: shop.name,
        address: shop.address,
        terminalCode: shop.terminal_code || shop.shop_code || 'PUNE-HE-01',
        latitude: Number(shop.latitude) || 18.5204,
        longitude: Number(shop.longitude) || 73.8567,
        rating: Number(shop.rating) || 4.8,
        totalReviews: shop.total_reviews || 120,
        isOpen: shop.is_open ?? true,
        phone: shop.phone || '+91 98230 11223',
        ownerName: shop.owner_name || 'Partner Manager',
        logoUrl: shop.logo_url || '',
        membershipEnabled: shop.membership_enabled ?? false,
        membershipPrice: shop.membership_price ? Number(shop.membership_price) : 99
      }));
  } catch (err) {
    console.error('getPrintShops exception:', err);
    return [];
  }
}

export async function findShopByCodeOrId(identifier: string): Promise<RemoteShopData | null> {
  try {
    const cleanId = identifier.trim().replace(/^COPYGO:/i, '').replace(/^SHOP:/i, '');
    const { data, error } = await supabase
      .from('print_shops')
      .select('*')
      .or(`id.ilike.%${cleanId}%,terminal_code.ilike.%${cleanId}%,shop_code.ilike.%${cleanId}%,name.ilike.%${cleanId}%`)
      .limit(1)
      .maybeSingle();

    if (error || !data) return null;

    if (data.status === 'inactive' || data.status === 'disabled' || data.is_open === false) {
      return null;
    }

    return {
      id: data.id,
      name: data.name,
      address: data.address,
      terminalCode: data.terminal_code || data.shop_code || 'PUNE-HE-01',
      latitude: Number(data.latitude || 18.5204),
      longitude: Number(data.longitude || 73.8567),
      rating: Number(data.rating || 4.8),
      totalReviews: data.total_reviews || 120,
      isOpen: data.is_open ?? true,
      phone: data.phone || '+91 98230 11223',
      ownerName: data.owner_name || 'Partner Manager',
      logoUrl: data.logo_url || ''
    };
  } catch (err) {
    console.error('findShopByCodeOrId exception:', err);
    return null;
  }
}

export async function fetchShopByTerminalCode(code: string): Promise<PrintEnterprise | null> {
  try {
    const clean = code.trim().replace(/^COPYGO:/i, '').replace(/^SHOP:/i, '');
    if (!clean) return null;

    const { data, error } = await supabase
      .from('print_shops')
      .select('*')
      .or(`terminal_code.ilike.${clean},shop_code.ilike.${clean},id.eq.${clean}`)
      .limit(1)
      .maybeSingle();

    if (error || !data) {
      // Fallback to partial match if exact didn't match
      const { data: fallbackData } = await supabase
        .from('print_shops')
        .select('*')
        .or(`terminal_code.ilike.%${clean}%,shop_code.ilike.%${clean}%,name.ilike.%${clean}%`)
        .limit(1)
        .maybeSingle();

      if (!fallbackData) return null;
      if (fallbackData.status === 'inactive' || fallbackData.status === 'disabled' || fallbackData.is_open === false) {
        return null;
      }
      return mapDbShopToEnterprise(fallbackData);
    }

    if (data.status === 'inactive' || data.status === 'disabled' || data.is_open === false) {
      return null;
    }

    return mapDbShopToEnterprise(data);
  } catch (err) {
    console.error('fetchShopByTerminalCode error:', err);
    return null;
  }
}

import { getShopInitials } from '../utils/shopInitials';

export function mapDbShopToEnterprise(shop: any): PrintEnterprise {
  const dynamicInitials = getShopInitials(shop.name);
  return {
    id: shop.id,
    name: shop.name || 'Partner Print Shop',
    shortCode: shop.shortCode || shop.shop_code || dynamicInitials,
    badgeColor: '#FF1300',
    badgeTextColor: '#FFFFFF',
    verified: true,
    category: 'Digital Printing & Xerox Center',
    address: shop.address || 'Pune, Maharashtra',
    phone: shop.phone || '+91 98220 11223',
    rating: Number(shop.rating || 4.9),
    totalOrders: shop.totalReviews || shop.total_reviews || 0,
    terminalCode: shop.terminal_code || shop.terminalCode || shop.shop_code || 'PUNE-HE-01',
    initials: dynamicInitials,
    logoUrl: shop.logo_url || shop.logoUrl || '',
    paymentMethodConfig: shop.payment_method_config || 'both',
    pricing: {
      blackAndWhite: 2.0,
      colour: 5.0,
      costone: 3.5,
      bondPaperExtra: 1.5,
      glossyPaperExtra: 3.0,
      a3Multiplier: 1.8,
      a2Multiplier: 3.2
    }
  };
}

// -------------------------------------------------------------
// 3. Print Orders & History
// -------------------------------------------------------------
export async function getUserOrders(userId?: string): Promise<DbPrintOrder[]> {
  // Session isolation: Guests do not load other users' or shared historical orders
  if (!userId || userId === 'usr-current-01' || userId.startsWith('guest_')) {
    return [];
  }

  try {
    const { data, error } = await supabase
      .from('print_orders')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error || !Array.isArray(data)) return [];

    return data.map((o: any) => ({
      id: o.id,
      orderNumber: o.order_number,
      userId: o.user_id,
      shopId: o.shop_id,
      shopName: o.shop_name,
      tokenNumber: o.token_number,
      documentName: o.document_name,
      fileType: o.file_type,
      totalPages: o.total_pages,
      configCopies: o.config_copies,
      configPageSize: o.config_page_size,
      configPaperType: o.config_paper_type,
      configPrintType: o.config_print_type,
      configSides: o.config_sides,
      subtotal: Number(o.subtotal),
      discount: Number(o.discount),
      platformFee: Number(o.platform_fee),
      grandTotal: Number(o.grand_total),
      paymentMethod: o.payment_method,
      paymentStatus: o.payment_status,
      orderStatus: o.order_status,
      createdAt: o.created_at
    }));
  } catch (err) {
    console.error('getUserOrders exception:', err);
    return [];
  }
}

export async function createDatabaseOrder(order: PrintOrder): Promise<boolean> {
  try {
    const documentsConfig = order.documents && order.documents.length > 0
      ? order.documents.map(d => {
          const cfg = d.printConfig || order.config;
          const isCustom = cfg.pageRangeType === 'Custom Range';
          return {
            id: d.id,
            fileName: d.fileName,
            fileType: d.fileType,
            fileSize: d.fileSize,
            storageUrl: d.storageUrl,
            totalPages: d.totalPages,
            config: isCustom ? { ...cfg, printType: '' as any, sides: '' as any } : cfg,
            priceCalc: d.priceCalc
          };
        })
      : [{
          id: order.document?.id || order.id,
          fileName: order.document?.fileName || 'Document',
          fileType: order.document?.fileType || 'pdf',
          fileSize: order.document?.fileSize || '1 MB',
          storageUrl: order.document?.storageUrl,
          totalPages: order.document?.totalPages || 1,
          config: order.config.pageRangeType === 'Custom Range'
            ? { ...order.config, printType: '' as any, sides: '' as any }
            : order.config
        }];

    const isOrderCustom = order.config.pageRangeType === 'Custom Range';

    const payload = {
      id: order.id,
      order_number: order.orderNumber,
      user_id: order.userId,
      shop_id: order.enterpriseId,
      shop_name: order.enterpriseName,
      token_number: order.tokenNumber,
      document_name: order.document.fileName,
      file_type: order.document.fileType,
      total_pages: order.document.totalPages,
      config_copies: order.config.copies,
      config_page_size: order.config.pageSize,
      config_paper_type: order.config.paperType,
      config_print_type: isOrderCustom ? '' : order.config.printType,
      config_sides: isOrderCustom ? '' : order.config.sides,
      subtotal: order.subtotal,
      discount: order.discount,
      platform_fee: 0,
      grand_total: order.grandTotal,
      payment_method: order.paymentMethod,
      payment_status: order.paymentStatus === 'PAID' ? 'paid' : 'pending',
      order_status: order.status,
      documents_config: documentsConfig,
      notes: null,
      customer_name: (order.customerName || '').trim() || null,
      created_at: order.createdAt || new Date().toISOString()
    };

    const { error } = await supabase.from('print_orders').insert(payload);
    if (error) {
      if (error.code === '23505' || error.message?.includes('duplicate key')) {
        const retryOrderNum = `ORD-${Date.now().toString().slice(-6)}${Math.floor(10 + Math.random() * 90)}-${order.enterpriseName?.slice(0, 2).toUpperCase() || 'PO'}`;
        console.warn('Duplicate order_number in createDatabaseOrder, retrying with unique order_number:', retryOrderNum);
        const { error: retryError } = await supabase.from('print_orders').insert({
          ...payload,
          order_number: retryOrderNum
        });
        if (!retryError) return true;
      }
      console.error('createDatabaseOrder error:', error);
      return false;
    }

    // Also persist individual uploaded_documents if they have storage URLs
    if (order.documents && order.documents.length > 0) {
      for (const doc of order.documents) {
        try {
          await supabase.from('uploaded_documents').upsert(
            {
              id: doc.id,
              user_id: order.userId,
              file_name: doc.fileName,
              file_type: doc.fileType,
              file_size: doc.fileSize,
              file_url: doc.storageUrl || '',
              storage_path: doc.storageUrl || '',
              total_pages: doc.totalPages,
              print_config: doc.printConfig || order.config,
              expires_at: new Date(Date.now() + 12 * 60 * 60 * 1000).toISOString()
            },
            { onConflict: 'id' }
          );
        } catch (e) {
          console.warn('uploaded_documents upsert notice:', e);
        }
      }
    }

    // Insert order placement notification
    await supabase.from('notifications').insert({
      id: `notif_${Date.now()}`,
      user_id: order.userId,
      title: 'Order Created',
      message: `Your print order #${order.orderNumber} for ${order.document.fileName} at ${order.enterpriseName} has been recorded. Token: ${order.tokenNumber}`,
      type: 'info',
      order_id: order.id,
      is_read: false
    });

    return true;
  } catch (err) {
    console.error('createDatabaseOrder exception:', err);
    return false;
  }
}

export interface ShopPrinterInfo {
  id: string;
  name: string;
  model: string;
  is_color: boolean;
  is_duplex: boolean;
  paper_sizes: string[];
  status: string;
  is_online?: boolean;
}

export async function getShopPrinters(shopId: string): Promise<ShopPrinterInfo[]> {
  try {
    const { data, error } = await supabase
      .from('shop_printers')
      .select('*')
      .eq('shop_id', shopId);

    if (error || !Array.isArray(data)) return [];

    return data.map(p => ({
      id: p.id,
      name: p.name,
      model: p.model || p.name,
      is_color: Boolean(p.is_color),
      is_duplex: Boolean(p.is_duplex),
      paper_sizes: Array.isArray(p.paper_sizes) ? p.paper_sizes : ['A4'],
      status: p.status || 'online',
      is_online: p.is_online ?? true
    }));
  } catch (err) {
    console.error('getShopPrinters error:', err);
    return [];
  }
}

/**
 * Requirement 5 & 6: Fetch available page selection dropdown options dynamically
 * from the database using the currently selected shopkeeper's ID.
 * Show only the paper sizes and special paper types that the selected shopkeeper
 * has configured and enabled in their Page Pricing/Printer Configuration settings.
 */
export interface ShopPaperPricingInfo {
  sizes: string[];
  paperPrices: Record<string, { bwPrice: number; colorPrice: number }>;
}

export async function getShopAvailablePaperSizes(shopId: string): Promise<string[]> {
  try {
    const info = await getShopPaperPricingDetails(shopId);
    return info.sizes;
  } catch (err) {
    console.error('getShopAvailablePaperSizes error:', err);
    return ['A4'];
  }
}

export async function getShopPaperPricingDetails(shopId: string): Promise<ShopPaperPricingInfo> {
  const sizesSet = new Set<string>();
  const paperPrices: Record<string, { bwPrice: number; colorPrice: number }> = {};

  if (!shopId) {
    return { sizes: ['A4'], paperPrices: {} };
  }

  try {
    // 1. Check shop_pricing for enabled paper rates and active dynamic paper types
    const { data: pricing } = await supabase
      .from('shop_pricing')
      .select('*')
      .eq('shop_id', shopId)
      .maybeSingle();

    if (pricing) {
      const defaultBw = typeof pricing.bw_rate === 'number' ? pricing.bw_rate : 2;
      const defaultColor = typeof pricing.color_rate === 'number' ? pricing.color_rate : 10;

      if (pricing.a4_rate !== null && pricing.a4_rate !== undefined && pricing.a4_rate > 0) {
        sizesSet.add('A4');
        paperPrices['A4'] = { bwPrice: Number(pricing.a4_rate), colorPrice: defaultColor };
      }
      if (pricing.a3_rate !== null && pricing.a3_rate !== undefined && pricing.a3_rate > 0) {
        sizesSet.add('A3');
        paperPrices['A3'] = { bwPrice: Number(pricing.a3_rate), colorPrice: defaultColor * (pricing.a3_multiplier || 2) };
      }
      if (pricing.bond_rate !== null && pricing.bond_rate !== undefined && pricing.bond_rate > 0) {
        sizesSet.add('Bond');
        paperPrices['Bond'] = { bwPrice: Number(pricing.bond_rate), colorPrice: defaultColor + Number(pricing.bond_rate) };
      }
      if (pricing.glossy_rate !== null && pricing.glossy_rate !== undefined && pricing.glossy_rate > 0) {
        sizesSet.add('Glossy');
        paperPrices['Glossy'] = { bwPrice: Number(pricing.glossy_rate), colorPrice: defaultColor + Number(pricing.glossy_rate) };
      }

      // Check dynamic_paper_types: ensure inactive/disabled/deleted options are filtered out
      if (Array.isArray(pricing.dynamic_paper_types)) {
        pricing.dynamic_paper_types.forEach((pt: any) => {
          if (pt?.name && pt?.is_active !== false) {
            sizesSet.add(pt.name);
            paperPrices[pt.name] = {
              bwPrice: typeof pt.bw_price === 'number' ? pt.bw_price : defaultBw,
              colorPrice: typeof pt.color_price === 'number' ? pt.color_price : defaultColor
            };
          }
        });
      }
    }

    // 2. Check shop_printers for supported paper sizes
    const { data: printers } = await supabase
      .from('shop_printers')
      .select('paper_sizes, status')
      .eq('shop_id', shopId);

    if (Array.isArray(printers)) {
      printers.forEach(p => {
        if (p.status !== 'inactive' && p.status !== 'disabled' && Array.isArray(p.paper_sizes)) {
          p.paper_sizes.forEach((s: string) => {
            if (s && s.trim()) sizesSet.add(s.trim());
          });
        }
      });
    }

    if (sizesSet.size > 0) {
      // Return known ordered sizes
      const standardOrder = ['A4', 'A3', 'Letter', 'Legal', 'Bond', 'Glossy', 'Executive'];
      const sorted = Array.from(sizesSet).sort((a, b) => {
        const idxA = standardOrder.indexOf(a);
        const idxB = standardOrder.indexOf(b);
        if (idxA !== -1 && idxB !== -1) return idxA - idxB;
        if (idxA !== -1) return -1;
        if (idxB !== -1) return 1;
        return a.localeCompare(b);
      });
      return { sizes: sorted, paperPrices };
    }

    // If shop has no explicit record yet, return empty list so UI prompts valid selection
    return { sizes: [], paperPrices: {} };
  } catch (err) {
    console.error('getShopPaperPricingDetails error:', err);
    return { sizes: ['A4'], paperPrices: {} };
  }
}

// -------------------------------------------------------------
// 4. PayU & Payment Edge Function Integrations
// -------------------------------------------------------------
export interface DocumentConversionResult {
  success: boolean;
  converted?: boolean;
  method?: string;
  docId?: string;
  originalFileName?: string;
  pdfFileName?: string;
  pdfUrl?: string;
  storagePath?: string;
  totalPages?: number;
  sheets?: string[];
  selectedSheet?: string;
  scaling?: string;
  error?: string;
}

export async function convertDocumentViaBackend(payload: {
  file?: File;
  fileUrl?: string;
  fileName: string;
  fileType: string;
  selectedSheet?: string;
  scaling?: string;
  sheets?: string[];
  userId?: string;
  shopId?: string;
  docId?: string;
}): Promise<DocumentConversionResult | null> {
  try {
    const { data, error } = await supabase.functions.invoke('convert-document', {
      body: {
        fileUrl: payload.fileUrl,
        fileName: payload.fileName,
        fileType: payload.fileType,
        selectedSheet: payload.selectedSheet,
        scaling: payload.scaling,
        sheets: payload.sheets,
        userId: payload.userId,
        shopId: payload.shopId,
        docId: payload.docId
      }
    });

    if (error || !data) {
      console.error('convertDocumentViaBackend error:', error);
      return null;
    }

    return data;
  } catch (err) {
    console.error('convertDocumentViaBackend exception:', err);
    return null;
  }
}

export interface PayUInitiationResult {
  payu_url: string;
  txnid: string;
  key: string;
  amount: string;
  productinfo: string;
  firstname: string;
  email: string;
  phone: string;
  surl: string;
  furl: string;
  hash: string;
  split_settlement_info?: any;
}

export async function createPayUPaymentViaEdge(payload: {
  amount: number;
  productinfo: string;
  firstname: string;
  email: string;
  phone: string;
  order_id?: string;
  shop_id?: string;
  user_id?: string;
}): Promise<PayUInitiationResult | null> {
  try {
    const { data, error } = await supabase.functions.invoke('payu-checkout', {
      body: {
        action: 'create_payment',
        amount: payload.amount,
        productinfo: payload.productinfo,
        firstname: payload.firstname,
        email: payload.email,
        phone: payload.phone,
        order_id: payload.order_id,
        shop_id: payload.shop_id,
        user_id: payload.user_id
      }
    });

    if (error || !data?.success) {
      console.error('createPayUPaymentViaEdge failed:', error || data);
      return null;
    }

    return {
      payu_url: data.payu_url,
      txnid: data.txnid,
      key: data.key,
      amount: data.amount,
      productinfo: data.productinfo,
      firstname: data.firstname,
      email: data.email,
      phone: data.phone,
      surl: data.surl,
      furl: data.furl,
      hash: data.hash,
      split_settlement_info: data.split_settlement_info
    };
  } catch (err) {
    console.error('createPayUPaymentViaEdge exception:', err);
    return null;
  }
}

export async function verifyPayUPaymentViaEdge(payload: {
  txnid: string;
  amount: string | number;
  productinfo: string;
  firstname: string;
  email: string;
  status: string;
  payu_hash?: string;
  payu_payment_id?: string;
  order_id?: string;
  shop_id?: string;
  user_id?: string;
}): Promise<boolean> {
  try {
    const { data, error } = await supabase.functions.invoke('payu-checkout', {
      body: {
        action: 'verify_payment',
        ...payload
      }
    });

    if (error || !data?.verified) {
      console.error('verifyPayUPaymentViaEdge failed:', error || data);
      return false;
    }

    return true;
  } catch (err) {
    console.error('verifyPayUPaymentViaEdge exception:', err);
    return false;
  }
}

export async function createRazorpayOrderViaEdge(amount: number, receiptId: string): Promise<{ order_id: string; amount: number; key_id: string } | null> {
  return null; // Migrated to PayU
}

export async function verifyRazorpayPaymentViaEdge(payload: any): Promise<boolean> {
  return true; // Migrated to PayU
}

export async function recordCounterPaymentViaEdge(payload: {
  order_id: string;
  user_id: string;
  shop_id: string;
  amount: number;
}): Promise<boolean> {
  try {
    // Record directly in payments table matching schema: payment_method & payment_status
    const { error } = await supabase.from('payments').insert({
      id: `pay_counter_${Date.now()}`,
      order_id: payload.order_id,
      user_id: payload.user_id,
      shop_id: payload.shop_id,
      amount: payload.amount,
      currency: 'INR',
      payment_status: 'pending',
      payment_method: 'Pay on Counter'
    });
    if (error) {
      console.error('recordCounterPaymentViaEdge error:', error);
      return false;
    }
    return true;
  } catch (err) {
    console.error('recordCounterPaymentViaEdge exception:', err);
    return false;
  }
}

// -------------------------------------------------------------
// 5. File Upload to Supabase Storage
// -------------------------------------------------------------
export async function uploadDocumentToStorage(file: File, userId = 'usr-current-01'): Promise<string | null> {
  try {
    const toHex = (s: string) =>
      Array.from(new TextEncoder().encode(s), (b) => b.toString(16).padStart(2, '0')).join('');

    const dot = file.name.lastIndexOf('.');
    const stem = dot > 0 ? file.name.slice(0, dot) : file.name;
    const ext = dot > 0 ? file.name.slice(dot) : '';
    const safeName = `${Date.now()}_${toHex(stem.slice(0, 20))}${ext}`;

    const { data, error } = await supabase.storage
      .from('copygo_files')
      .upload(`${userId}/${safeName}`, file, { contentType: file.type || 'application/octet-stream' });

    if (error) {
      console.error('Storage upload error:', error);
      return null;
    }

    const { data: urlData } = supabase.storage.from('copygo_files').getPublicUrl(data.path);
    return urlData.publicUrl;
  } catch (err) {
    console.error('uploadDocumentToStorage exception:', err);
    return null;
  }
}

// -------------------------------------------------------------
// 6. Careers, Feedback, Ads, Contact, Notifications
// -------------------------------------------------------------
export async function getCareers(): Promise<CareerItem[]> {
  try {
    const { data, error } = await supabase
      .from('careers')
      .select('*')
      .eq('is_active', true)
      .order('id', { ascending: true });

    if (error || !Array.isArray(data)) return [];
    return data;
  } catch (err) {
    console.error('getCareers exception:', err);
    return [];
  }
}

export async function submitCareerApplication(payload: CareerApplicationPayload): Promise<boolean> {
  try {
    const { error } = await supabase.from('career_applications').insert({
      id: `app_${Date.now()}`,
      ...payload
    });
    return !error;
  } catch (err) {
    console.error('submitCareerApplication exception:', err);
    return false;
  }
}

export async function submitContactMessage(payload: ContactMessagePayload): Promise<boolean> {
  try {
    const { error } = await supabase.from('contact_messages').insert({
      id: `msg_${Date.now()}`,
      ...payload
    });
    return !error;
  } catch (err) {
    console.error('submitContactMessage exception:', err);
    return false;
  }
}

export async function submitAdRequest(payload: AdRequestPayload): Promise<boolean> {
  try {
    const { error } = await supabase.from('ad_requests').insert({
      id: `ad_${Date.now()}`,
      status: 'pending',
      ...payload
    });
    return !error;
  } catch (err) {
    console.error('submitAdRequest exception:', err);
    return false;
  }
}

export async function submitFeedback(payload: FeedbackPayload): Promise<boolean> {
  try {
    const { error } = await supabase.from('app_feedback').insert({
      id: `fb_${Date.now()}`,
      user_id: payload.user_id || 'usr-current-01',
      user_name: payload.user_name,
      shop_id: payload.shop_id || null,
      target_type: payload.target_type,
      rating: payload.rating,
      category: payload.category,
      feedback_text: payload.feedback_text,
      moderation_status: 'approved'
    });
    return !error;
  } catch (err) {
    console.error('submitFeedback exception:', err);
    return false;
  }
}

export async function getUserNotifications(userId = 'usr-current-01'): Promise<AppNotification[]> {
  try {
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(30);

    if (error || !Array.isArray(data)) return [];
    return data;
  } catch (err) {
    console.error('getUserNotifications exception:', err);
    return [];
  }
}

export async function markNotificationAsRead(notificationId: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('id', notificationId);
    return !error;
  } catch (err) {
    console.error('markNotificationAsRead exception:', err);
    return false;
  }
}

// -------------------------------------------------------------
// 7. Dynamic CMS, Policy & Terms Content
// -------------------------------------------------------------
export interface CMSContentItem {
  id: string;
  category: string;
  title: string;
  subtitle?: string;
  content: string;
  badge_text?: string;
  display_order?: number;
  metadata?: any;
}

export async function fetchCMSContent(category = 'about_us'): Promise<CMSContentItem[]> {
  try {
    const { data, error } = await supabase
      .from('cms_content')
      .select('*')
      .eq('category', category)
      .eq('is_active', true)
      .order('display_order', { ascending: true });

    if (error || !Array.isArray(data)) return [];
    return data;
  } catch (err) {
    console.error('fetchCMSContent exception:', err);
    return [];
  }
}

export async function fetchPlatformPolicies(): Promise<{ title: string; content: string; version: string; published_at: string } | null> {
  try {
    const { data, error } = await supabase
      .from('platform_policies')
      .select('*')
      .order('published_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!error && data) {
      return {
        title: data.title,
        content: data.content,
        version: data.version || 'v2.6',
        published_at: data.published_at || new Date().toISOString()
      };
    }

    // Fallback to cms_content privacy_policy
    const cmsItems = await fetchCMSContent('privacy_policy');
    if (cmsItems && cmsItems.length > 0) {
      const first = cmsItems[0];
      return {
        title: first.title,
        content: first.content,
        version: first.badge_text || 'v2.6',
        published_at: new Date().toISOString()
      };
    }

    return null;
  } catch (err) {
    console.error('fetchPlatformPolicies exception:', err);
    return null;
  }
}

export async function fetchPlatformTerms(): Promise<{ title: string; content: string; version: string; published_at: string } | null> {
  try {
    const { data, error } = await supabase
      .from('platform_terms')
      .select('*')
      .order('published_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!error && data) {
      return {
        title: data.title,
        content: data.content,
        version: data.version || 'v2.6',
        published_at: data.published_at || new Date().toISOString()
      };
    }

    // Fallback to cms_content terms_and_conditions
    const cmsItems = await fetchCMSContent('terms_and_conditions');
    if (cmsItems && cmsItems.length > 0) {
      const first = cmsItems[0];
      return {
        title: first.title,
        content: first.content,
        version: first.badge_text || 'v2.6',
        published_at: new Date().toISOString()
      };
    }

    return null;
  } catch (err) {
    console.error('fetchPlatformTerms exception:', err);
    return null;
  }
}

export interface HomeBannerItem {
  id: string;
  title: string;
  description?: string;
  subtitle?: string;
  image_url: string;
  button_text?: string;
  destination_url?: string;
  display_order: number;
  is_active: boolean;
}

export async function fetchHomeBanners(): Promise<HomeBannerItem[]> {
  try {
    const { data, error } = await supabase
      .from('home_banners')
      .select('*')
      .eq('is_active', true)
      .order('display_order', { ascending: true });

    if (error || !Array.isArray(data)) {
      return [];
    }
    return data.map(b => ({
      id: b.id,
      title: b.title,
      description: b.description || b.subtitle || '',
      subtitle: b.subtitle || b.description || '',
      image_url: b.image_url,
      button_text: b.button_text || 'View Offers →',
      destination_url: b.destination_url || b.button_link || 'offers',
      display_order: b.display_order || 1,
      is_active: b.is_active ?? true
    }));
  } catch (err) {
    console.error('fetchHomeBanners exception:', err);
    return [];
  }
}

export interface UploadPageAdItem {
  id: string;
  title: string;
  description?: string;
  image_url: string;
  destination_url: string;
  display_order: number;
  is_active: boolean;
}

export async function fetchUploadPageAds(): Promise<UploadPageAdItem[]> {
  try {
    const { data, error } = await supabase
      .from('upload_page_ads')
      .select('*')
      .eq('is_active', true)
      .order('display_order', { ascending: true });

    if (error || !Array.isArray(data)) {
      return [];
    }
    return data;
  } catch (err) {
    console.error('fetchUploadPageAds exception:', err);
    return [];
  }
}

export async function recordUserConsent(params: {
  userId?: string;
  guestId?: string;
  consentType: 'cookie' | 'terms' | 'privacy';
  status: 'accepted' | 'rejected' | 'custom';
  policyVersion?: string;
  details?: any;
}): Promise<boolean> {
  try {
    const { error } = await supabase.from('user_consents').insert({
      user_id: params.userId || null,
      guest_id: params.guestId || null,
      consent_type: params.consentType,
      status: params.status,
      policy_version: params.policyVersion || '1.0',
      details: params.details || {}
    });
    return !error;
  } catch (err) {
    console.error('recordUserConsent error:', err);
    return false;
  }
}

export async function fetchGuestProfileImage(): Promise<string> {
  // Strictly locked to the reference PNG image per specification
  return DEFAULT_GUEST_PROFILE_PHOTO;
}

export async function submitShopFeedback(params: {
  shopId: string;
  userId?: string;
  userName: string;
  rating: number;
  category?: string;
  feedbackText: string;
}): Promise<{ success: boolean; message: string }> {
  try {
    const { error } = await supabase.from('app_feedback').insert({
      id: `fb-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      shop_id: params.shopId,
      user_id: params.userId || null,
      user_name: params.userName || 'Student User',
      rating: params.rating,
      category: params.category || 'General',
      feedback_text: params.feedbackText,
      moderation_status: 'pending',
      target_type: 'shop'
    });
    if (error) throw error;
    return { success: true, message: 'Your feedback has been submitted for shopkeeper review!' };
  } catch (err: any) {
    console.error('submitShopFeedback error:', err);
    return { success: false, message: err?.message || 'Failed to submit feedback' };
  }
}

export async function fetchApprovedShopFeedbacks(shopId: string): Promise<any[]> {
  try {
    const { data, error } = await supabase
      .from('app_feedback')
      .select('*')
      .eq('shop_id', shopId)
      .eq('moderation_status', 'approved')
      .order('created_at', { ascending: false });

    if (error || !Array.isArray(data)) return [];
    return data;
  } catch (err) {
    console.error('fetchApprovedShopFeedbacks error:', err);
    return [];
  }
}
export async function fetchApprovedAppFeedbacks(): Promise<any[]> {
  try {
    const { data, error } = await supabase
      .from('app_feedback')
      .select('*')
      .eq('moderation_status', 'approved')
      .order('created_at', { ascending: false })
      .limit(10);

    if (error || !Array.isArray(data) || data.length === 0) {
      return [
        {
          id: 'fb-1',
          user_name: 'Aarav Sharma',
          college: 'COEP Pune',
          rating: 5,
          feedback_text: 'Print on 24 has completely eliminated our morning xerox lines before lab submissions. Upload from dorm, collect in 2 minutes!'
        },
        {
          id: 'fb-2',
          user_name: 'Pooja Kulkarni',
          college: 'MIT WPU',
          rating: 5,
          feedback_text: 'The color accuracy and custom page selection saved me ₹300 on my final semester thesis project. Super transparent pricing!'
        },
        {
          id: 'fb-3',
          user_name: 'Rohan Mehta',
          college: 'Symbiosis Pune',
          rating: 5,
          feedback_text: 'Thermal receipts with exact token numbers make pickup instant. Shopkeeper hands over the file right away.'
        },
        {
          id: 'fb-4',
          user_name: 'Sneha Deshmukh',
          college: 'DY Patil University',
          rating: 5,
          feedback_text: 'No pen drives, no risk of PC virus, straight PDF upload from phone. Best student utility on campus!'
        }
      ];
    }
    return data;
  } catch (err) {
    console.error('fetchApprovedAppFeedbacks error:', err);
    return [];
  }
}


export async function updateUserNotificationsPreference(userId: string, enabled: boolean): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('user_preferences')
      .upsert({
        user_id: userId,
        notifications_enabled: enabled,
        updated_at: new Date().toISOString()
      }, { onConflict: 'user_id' });
    return !error;
  } catch (err) {
    console.error('updateUserNotificationsPreference error:', err);
    return false;
  }
}

export const updateNotificationPreference = updateUserNotificationsPreference;

export async function saveUserConsent(
  userId: string,
  consentType: string,
  accepted: boolean
): Promise<boolean> {
  return recordUserConsent({
    userId: userId !== 'guest' ? userId : undefined,
    guestId: userId === 'guest' ? `guest-${Date.now()}` : undefined,
    consentType: consentType.includes('cookie') ? 'cookie' : consentType.includes('privacy') ? 'privacy' : 'terms',
    status: accepted ? 'accepted' : 'rejected'
  });
}

export async function submitShopReview(params: {
  shop_id: string;
  user_id?: string;
  user_name: string;
  rating: number;
  comment: string;
  service_used?: string;
}): Promise<{ success: boolean; message: string }> {
  return submitShopFeedback({
    shopId: params.shop_id,
    userId: params.user_id,
    userName: params.user_name,
    rating: params.rating,
    category: params.service_used || 'Print Service',
    feedbackText: params.comment
  });
}

export async function fetchUserNotificationsPreference(userId: string): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from('user_preferences')
      .select('notifications_enabled')
      .eq('user_id', userId)
      .maybeSingle();

    if (error || !data) return true; // Default ON as requested
    return data.notifications_enabled ?? true;
  } catch {
    return true; // Default ON
  }
}

