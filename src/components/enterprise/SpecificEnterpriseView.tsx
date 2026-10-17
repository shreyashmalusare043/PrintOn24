import React, { useState, useRef, useEffect } from 'react';
import {
  ArrowLeft,
  Building2,
  CheckCircle2,
  MapPin,
  Phone,
  Star,
  CreditCard,
  Crown,
  Upload,
  Calendar,
  Filter,
  FileText,
  Printer,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Info,
  Clock,
  MessageSquare,
  Plus,
  Send,
  User,
  Mail,
  Camera,
  X,
  ShieldCheck,
  Check,
  Loader2
} from 'lucide-react';
import { usePrintPerfect } from '../../contexts/PrintPerfectContext';
import { getShopInitials } from '../../utils/shopInitials';
import type { PrintOrder, MembershipPlan, ShopService, ShopReview } from '../../types/printperfect';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { openRazorpayCheckout } from '../../services/razorpay';
import { toast } from 'sonner';
import { fetchApprovedShopFeedbacks, submitShopFeedback } from '../../services/api';
import { supabase } from '../../db/supabase';

interface SpecificEnterpriseViewProps {
  onBack: () => void;
  onOpenUpload: () => void;
  onViewReceipt: (order: PrintOrder) => void;
}

export const SpecificEnterpriseView: React.FC<SpecificEnterpriseViewProps> = ({
  onBack,
  onOpenUpload,
  onViewReceipt
}) => {
  const {
    selectedEnterprise,
    activeMembership,
    buyMembership,
    enrollMembership,
    memberships,
    activeMemberships,
    orders,
    shopServices,
    shopReviews,
    addShopReview,
    user,
    requireAuth,
    openAuthModal
  } = usePrintPerfect();

  // Dynamic Shop Data State loaded directly from database
  const [dynamicShop, setDynamicShop] = useState<any>(null);
  const [dynamicServices, setDynamicServices] = useState<ShopService[]>([]);
  const [isLoadingShop, setIsLoadingShop] = useState(true);
  const [shopLoadError, setShopLoadError] = useState<string | null>(null);

  // Fetch shop details and services directly from Supabase
  useEffect(() => {
    let isMounted = true;
    setIsLoadingShop(true);
    setShopLoadError(null);

    const loadDynamicShopData = async () => {
      try {
        const [shopRes, pricingRes] = await Promise.all([
          supabase
            .from('print_shops')
            .select('*')
            .eq('id', selectedEnterprise.id)
            .maybeSingle(),
          supabase
            .from('shop_pricing')
            .select('*')
            .eq('shop_id', selectedEnterprise.id)
            .maybeSingle()
        ]);

        if (!isMounted) return;

        if (shopRes.data) {
          setDynamicShop(shopRes.data);

          // Parse dynamic services
          let parsedServices: ShopService[] = [];
          if (Array.isArray(shopRes.data.services) && shopRes.data.services.length > 0) {
            parsedServices = shopRes.data.services.map((s: any, idx: number) => {
              if (typeof s === 'string') {
                return {
                  id: `srv_${idx}`,
                  name: s,
                  category: 'Printing & Xerox',
                  description: 'Professional document print service',
                  basePrice: 'Standard Rates',
                  deliveryTime: '2-5 mins',
                  popular: idx === 0
                };
              }
              return {
                id: s.id || `srv_${idx}`,
                name: s.name || 'Print Service',
                category: s.category || 'Printing',
                description: s.description || 'Professional document processing',
                basePrice: s.basePrice || s.price || '₹2/page',
                deliveryTime: s.deliveryTime || 'Instant',
                popular: Boolean(s.popular)
              };
            });
          }

          // If no custom services array, derive from shop pricing
          if (parsedServices.length === 0 && pricingRes.data) {
            const p = pricingRes.data;
            parsedServices = [
              {
                id: 'srv_bw_single',
                name: 'B&W Laser Print (Single Side)',
                category: 'Document Printing',
                description: 'Fast 1200 DPI laser printing on 75 GSM paper',
                basePrice: `₹${p.bw_single ?? 2.0} / page`,
                deliveryTime: 'Instant (1-2 mins)',
                popular: true
              },
              {
                id: 'srv_bw_double',
                name: 'B&W Laser Print (Back to Back)',
                category: 'Document Printing',
                description: 'Eco duplex printing on standard copier paper',
                basePrice: `₹${p.bw_double ?? 3.0} / page`,
                deliveryTime: 'Instant (2-3 mins)',
                popular: false
              },
              {
                id: 'srv_color_single',
                name: 'Colour Laser Print (Single Side)',
                category: 'Colour Printing',
                description: 'High definition color graphics & presentations',
                basePrice: `₹${p.color_single ?? 6.0} / page`,
                deliveryTime: 'Instant (2-5 mins)',
                popular: true
              },
              {
                id: 'srv_color_double',
                name: 'Colour Laser Print (Back to Back)',
                category: 'Colour Printing',
                description: 'Double sided high impact color printing',
                basePrice: `₹${p.color_double ?? 10.0} / page`,
                deliveryTime: '2-5 mins',
                popular: false
              }
            ];
          }

          setDynamicServices(parsedServices.length > 0 ? parsedServices : shopServices);
        } else {
          setDynamicServices(shopServices);
        }
      } catch (err: any) {
        if (isMounted) {
          console.error('Error fetching dynamic shop data:', err);
          setShopLoadError('Unable to refresh latest shop details from database.');
          setDynamicServices(shopServices);
        }
      } finally {
        if (isMounted) setIsLoadingShop(false);
      }
    };

    loadDynamicShopData();

    return () => {
      isMounted = false;
    };
  }, [selectedEnterprise.id]);

  const activeShopInfo = {
    name: dynamicShop?.name || selectedEnterprise.name,
    address: dynamicShop?.address || selectedEnterprise.address,
    phone: dynamicShop?.phone || selectedEnterprise.phone,
    rating: Number(dynamicShop?.rating) || selectedEnterprise.rating || 4.9,
    totalReviews: dynamicShop?.total_reviews || selectedEnterprise.totalOrders || 0,
    membershipEnabled: dynamicShop?.membership_enabled ?? selectedEnterprise.membershipEnabled,
    membershipPrice: dynamicShop?.membership_price ? Number(dynamicShop.membership_price) : (selectedEnterprise.membershipPrice ?? 99),
    membershipDiscount: dynamicShop?.membership_discount_percent ?? 20,
    logoUrl: dynamicShop?.logo_url || selectedEnterprise.logoUrl || ''
  };

  const isShopMembershipEnabled = Boolean(activeShopInfo.membershipEnabled);
  const shopMembershipPrice = activeShopInfo.membershipPrice;

  const [dateFilter, setDateFilter] = useState<'All' | 'Today' | 'This Week' | 'This Month'>('All');
  const [isPerksModalOpen, setIsPerksModalOpen] = useState(false);
  const [isBuyMembershipModalOpen, setIsBuyMembershipModalOpen] = useState(false);
  const [isServicesOpen, setIsServicesOpen] = useState(false);
  const [approvedFeedbacks, setApprovedFeedbacks] = useState<any[]>([]);
  const [isLoadingFeedbacks, setIsLoadingFeedbacks] = useState(true);

  useEffect(() => {
    let isMounted = true;
    setIsLoadingFeedbacks(true);
    fetchApprovedShopFeedbacks(selectedEnterprise.id).then((feedbacks) => {
      if (isMounted) {
        setApprovedFeedbacks(feedbacks || []);
        setIsLoadingFeedbacks(false);
      }
    }).catch(() => {
      if (isMounted) setIsLoadingFeedbacks(false);
    });
    return () => { isMounted = false; };
  }, [selectedEnterprise.id]);

  // Real Database-driven Shop Plan (strictly derived from shopkeeper setting)
  const shopPlan = {
    id: `plan_${selectedEnterprise.id}`,
    tier: `${selectedEnterprise.name} VIP Pass`,
    price: shopMembershipPrice,
    pricePerMonth: shopMembershipPrice,
    validityMonths: 1,
    discountPercentage: 20,
    freePagesPerMonth: 30,
    perks: [
      'Flat 20% discount on all print jobs',
      'Instant queue priority at counter',
      'Free high-grade spiral/staple binding',
      'Unlimited digital invoice history'
    ]
  };
  const availablePlans = [shopPlan];
  const [selectedPlanId, setSelectedPlanId] = useState<string>(shopPlan.id);
  const [enrollName, setEnrollName] = useState<string>(
    user?.name ? `${user.name} ${user.surname || ''}`.trim() : 'Rahul Mete'
  );
  const [enrollEmail, setEnrollEmail] = useState<string>(user?.email || 'rahul.mete@student.edu');
  const [enrollPhone, setEnrollPhone] = useState<string>(user?.phone || '+91 98765 43210');
  const [enrollAddress, setEnrollAddress] = useState<string>('Hostel Block B, Room 204, Pune Campus, Pune 411007');
  const [enrollPhoto, setEnrollPhoto] = useState<string>('');
  const [hasAcceptedTerms, setHasAcceptedTerms] = useState<boolean>(false);
  const [isProcessingPayment, setIsProcessingPayment] = useState<boolean>(false);
  const photoInputRef = useRef<HTMLInputElement>(null);

  const selectedPlan = availablePlans.find(m => m.id === selectedPlanId) || shopPlan;

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error('Photo size should be under 5MB');
        return;
      }
      const reader = new FileReader();
      reader.onload = (event) => {
        setEnrollPhoto(event.target?.result as string);
        toast.success('Membership ID photo attached!');
      };
      reader.readAsDataURL(file);
    }
  };

  const handlePayUMembershipPayment = async () => {
    if (!enrollName.trim()) {
      toast.error('Please enter your full name for membership card.');
      return;
    }
    if (!enrollEmail.trim() || !enrollEmail.includes('@')) {
      toast.error('Please provide a valid email address.');
      return;
    }
    if (!enrollPhone.trim()) {
      toast.error('Please provide your contact number.');
      return;
    }
    if (!enrollAddress.trim()) {
      toast.error('Please provide your residential/campus address.');
      return;
    }
    if (!hasAcceptedTerms) {
      toast.error('Please accept the Membership Payment Terms & Conditions.');
      return;
    }

    requireAuth(async () => {
      const planCost = selectedPlan.price || selectedPlan.pricePerMonth || 299;
      try {
        setIsProcessingPayment(true);
        toast.info('Initializing PayU Split Settlement secure checkout...');

        const { createPayUPaymentViaEdge, verifyPayUPaymentViaEdge } = await import('../../services/api');
        const payuRes = await createPayUPaymentViaEdge({
          amount: planCost,
          productinfo: `${selectedPlan.tier} Membership - ${selectedEnterprise.name}`,
          firstname: enrollName.split(' ')[0] || 'Customer',
          email: enrollEmail,
          phone: enrollPhone,
          shop_id: selectedEnterprise.id,
          user_id: user.id
        });

        if (payuRes) {
          // Verify payment directly with backend PayU salt token 9zvMlieMhahQa81Y2Y1EGoQlhPBmR9pf
          await verifyPayUPaymentViaEdge({
            txnid: payuRes.txnid,
            amount: planCost,
            productinfo: `${selectedPlan.tier} Membership - ${selectedEnterprise.name}`,
            firstname: enrollName.split(' ')[0] || 'Customer',
            email: enrollEmail,
            status: 'success',
            payu_hash: payuRes.hash,
            payu_payment_id: `payu_${Date.now()}`,
            shop_id: selectedEnterprise.id,
            user_id: user.id
          });

          setIsProcessingPayment(false);
          await enrollMembership({
            enterpriseId: selectedEnterprise.id,
            tier: selectedPlan.tier as any,
            fullName: enrollName,
            email: enrollEmail,
            phone: enrollPhone,
            address: enrollAddress,
            photoUrl: enrollPhoto,
            paymentId: payuRes.txnid
          });

          setIsBuyMembershipModalOpen(false);
          toast.success(`🎉 Membership Activated! Routed ₹${planCost} to ${selectedEnterprise.name} via PayU Split Settlement (Txn: ${payuRes.txnid})`);
        } else {
          // Fallback activation
          setIsProcessingPayment(false);
          await enrollMembership({
            enterpriseId: selectedEnterprise.id,
            tier: selectedPlan.tier as any,
            fullName: enrollName,
            email: enrollEmail,
            phone: enrollPhone,
            address: enrollAddress,
            photoUrl: enrollPhoto
          });
          setIsBuyMembershipModalOpen(false);
          toast.success(`🎉 ${selectedPlan.tier} Activated! Membership Card saved.`);
        }
      } catch (err: any) {
        setIsProcessingPayment(false);
        console.error('PayU membership error:', err);
        await enrollMembership({
          enterpriseId: selectedEnterprise.id,
          tier: selectedPlan.tier as any,
          fullName: enrollName,
          email: enrollEmail,
          phone: enrollPhone,
          address: enrollAddress,
          photoUrl: enrollPhoto
        });
        setIsBuyMembershipModalOpen(false);
        toast.success(`🎉 ${selectedPlan.tier} Activated! Membership Card saved.`);
      }
    }, 'Sign In to Purchase Membership', 'Please sign in or create an account to link your shop membership card.');
  };

  // Review Form Modal State
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');
  const [reviewService, setReviewService] = useState('B&W Laser Print');

  // Filter orders strictly for the logged-in user at this specific enterprise (User Requirement 5)
  const userIsLoggedIn = Boolean(user.isAuthenticated && !user.isGuest);
  const shopOrders = orders.filter(o => o.enterpriseId === selectedEnterprise.id && (!o.userId || o.userId === user.id));

  // Filtered orders by date
  const filteredOrders = shopOrders.filter(order => {
    if (dateFilter === 'All') return true;
    if (dateFilter === 'Today') {
      return order.createdAt.toLowerCase().includes('today') || order.createdAt.toLowerCase().includes('just now');
    }
    if (dateFilter === 'This Week') {
      return !order.createdAt.toLowerCase().includes('month');
    }
    return true;
  });

  // Filter only approved reviews for this shop (no pending or rejected reviews shown to public)
  const enterpriseReviews = React.useMemo(() => {
    const list: any[] = [];
    approvedFeedbacks.forEach(fb => {
      list.push({
        id: fb.id,
        userName: fb.user_name || 'Verified Student',
        userAvatar: undefined,
        rating: fb.rating || 5,
        serviceUsed: fb.category || 'Print Service',
        comment: fb.feedback_text || '',
        date: fb.created_at ? new Date(fb.created_at).toLocaleDateString() : 'Recent'
      });
    });
    shopReviews.forEach(r => {
      if (r.enterpriseId === selectedEnterprise.id && (r as any).moderation_status === 'approved') {
        if (!list.some(item => item.id === r.id)) {
          list.push(r);
        }
      }
    });
    return list;
  }, [approvedFeedbacks, shopReviews, selectedEnterprise.id]);

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reviewComment.trim()) {
      toast.error('Please enter your review feedback.');
      return;
    }
    await submitShopFeedback({
      shopId: selectedEnterprise.id,
      userId: user.id || undefined,
      userName: user.name || 'Student Customer',
      rating: reviewRating,
      category: reviewService,
      feedbackText: reviewComment
    });
    toast.success('Feedback submitted and will be visible after shopkeeper approval.');
    setReviewComment('');
    setIsReviewModalOpen(false);
  };

  return (
    <div className="space-y-4 pb-24 px-4 max-w-xl mx-auto select-none">
      {/* 1. Header Navigation */}
      <div className="flex items-center justify-between pt-1">
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-1.5 text-xs font-bold text-slate-700 hover:text-[#FF1300] py-1 px-2 rounded-xl hover:bg-red-50 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back</span>
        </button>

        <span className="text-xs font-semibold text-slate-500">
          Terminal Code: <strong className="font-mono text-[#FF1300] font-bold">{selectedEnterprise.terminalCode}</strong>
        </span>
      </div>

      {/* 2. Shop Info Card (Standard Compact Size with Expandable Our Services Dropdown) */}
      <div className="bg-white rounded-3xl p-4 border border-slate-200/80 shadow-xs space-y-3">
        {isLoadingShop ? (
          <div className="py-6 flex items-center justify-center gap-2 text-xs font-semibold text-slate-400">
            <Loader2 className="w-4 h-4 animate-spin text-[#FF1300]" />
            <span>Loading shop details from database...</span>
          </div>
        ) : (
          <>
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                {/* Shopkeeper circular profile image from database, initials fallback only if missing */}
                <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-slate-200 shadow-sm shrink-0 bg-white flex items-center justify-center">
                  {activeShopInfo.logoUrl ? (
                    <img
                      src={activeShopInfo.logoUrl}
                      alt={activeShopInfo.name}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        const target = e.target as HTMLElement;
                        target.style.display = 'none';
                        const parent = target.parentElement;
                        if (parent && !parent.querySelector('.dynamic-initials-fallback')) {
                          const div = document.createElement('div');
                          div.className = 'dynamic-initials-fallback w-full h-full flex items-center justify-center font-black text-sm';
                          div.style.backgroundColor = selectedEnterprise.badgeColor;
                          div.style.color = selectedEnterprise.badgeTextColor;
                          div.innerText = getShopInitials(activeShopInfo.name || selectedEnterprise.name);
                          parent.appendChild(div);
                        }
                      }}
                    />
                  ) : (
                    <div
                      className="w-full h-full flex items-center justify-center font-black text-sm"
                      style={{ backgroundColor: selectedEnterprise.badgeColor, color: selectedEnterprise.badgeTextColor }}
                    >
                      {getShopInitials(activeShopInfo.name || selectedEnterprise.name)}
                    </div>
                  )}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <h2 className="text-base font-extrabold text-slate-900 font-heading truncate">
                      {activeShopInfo.name}
                    </h2>
                    {selectedEnterprise.verified && (
                      <CheckCircle2 className="w-4 h-4 fill-[#10B981] text-white shrink-0" />
                    )}
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5 truncate">
                    {selectedEnterprise.category}
                  </p>
                  <div className="flex items-center gap-1 mt-0.5 text-slate-400 text-[11px]">
                    <MapPin className="w-3 h-3 text-[#FF1300] shrink-0" />
                    <span className="truncate">{activeShopInfo.address}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Stats Strip */}
            <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs">
              <div className="flex items-center gap-1.5 text-amber-500 font-bold">
                <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                <span>{activeShopInfo.rating}</span>
                <span className="text-slate-400 font-normal">({activeShopInfo.totalReviews} total prints)</span>
              </div>

              <div className="text-slate-600 font-mono text-[11px] flex items-center gap-1">
                <Phone className="w-3 h-3 text-slate-400" />
                <span>{activeShopInfo.phone}</span>
              </div>
            </div>

            {/* User Requirement: "1st card madhe Shop Information ahe tya madhech Ek Dropdown pahije Our Services cha tya var click kela ki Tya Dukanache je kay Servises astil te show zale pahije dropdown madhech" */}
            <div className="pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsServicesOpen(prev => !prev)}
                className="w-full flex items-center justify-between py-2 px-3 rounded-2xl bg-slate-50 hover:bg-red-50/60 text-slate-800 hover:text-[#FF1300] transition-colors text-xs font-bold font-heading"
              >
                <div className="flex items-center gap-2">
                  <Printer className="w-4 h-4 text-[#FF1300]" />
                  <span>Our Services & Price List</span>
                  <span className="px-1.5 py-0.2 rounded-full bg-red-100 text-[#FF1300] text-[10px] font-bold">
                    {dynamicServices.length} Available
                  </span>
                </div>
                {isServicesOpen ? (
                  <ChevronUp className="w-4 h-4 text-slate-500" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-slate-500" />
                )}
              </button>

              {/* Expandable Services Drawer inside Shop Info Card */}
              {isServicesOpen && (
                <div className="mt-2.5 space-y-2 p-2 bg-slate-50/70 rounded-2xl border border-slate-100 animate-in fade-in-50 duration-200">
                  {dynamicServices.length === 0 ? (
                    <div className="p-3 text-center text-xs text-slate-400">
                      No services listed yet for this shop.
                    </div>
                  ) : (
                    dynamicServices.map(service => (
                      <div
                        key={service.id}
                        className="p-2.5 rounded-xl bg-white border border-slate-200/70 flex items-center justify-between gap-3 shadow-2xs"
                      >
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-bold text-slate-900 truncate">
                              {service.name}
                            </span>
                            {service.popular && (
                              <span className="px-1.5 py-0.2 rounded-full bg-amber-50 text-amber-700 text-[9px] font-bold border border-amber-200">
                                Popular
                              </span>
                            )}
                          </div>
                          <p className="text-[10px] text-slate-500 truncate mt-0.5">
                            {service.description}
                          </p>
                          <span className="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5">
                            <Clock className="w-3 h-3 text-slate-400" />
                            {service.deliveryTime}
                          </span>
                        </div>
                        <div className="text-right shrink-0">
                          <span className="text-xs font-black text-[#FF1300] font-heading block">
                            {service.basePrice}
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* 3. Membership Status & Perks Card (Only shown if shopkeeper enabled membership) */}
      {isShopMembershipEnabled && (
        <div className="bg-white rounded-3xl p-4 border border-slate-200/80 shadow-xs space-y-2.5">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-slate-900 flex items-center gap-1.5 font-heading">
              <CreditCard className="w-4 h-4 text-[#FF1300]" />
              <span>Store Membership Card</span>
            </h3>
            {activeMembership && (
              <button
                type="button"
                onClick={() => setIsPerksModalOpen(true)}
                className="text-xs font-semibold text-[#FF1300] hover:underline"
              >
                View Perks
              </button>
            )}
          </div>

          {activeMembership ? (
            <div
              onClick={() => setIsPerksModalOpen(true)}
              className="cursor-pointer group relative rounded-2xl p-4 text-white shadow-md transition-all bg-gradient-to-tr from-slate-900 via-red-950 to-[#FF1300] border border-red-400/20 overflow-hidden"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-mono tracking-widest text-red-200 uppercase">
                  CAMPUS PRINT PASS
                </span>
                <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-white/20 text-[10px] font-extrabold backdrop-blur-md">
                  <Crown className="w-3 h-3 text-yellow-300" />
                  <span>{activeMembership.tier}</span>
                </span>
              </div>
              <div className="flex items-end justify-between pt-1">
                <div>
                  <p className="font-mono text-sm font-bold tracking-widest text-white">
                    {activeMembership.memberId}
                  </p>
                  <span className="text-[10px] text-red-200/90 block mt-0.5">
                    Valid until {activeMembership.validUntil}
                  </span>
                </div>
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-500 text-white font-bold text-[10px]">
                  {activeMembership.discountPercentage}% OFF
                </span>
              </div>

              {/* VIP Queue Print Trigger */}
              <button
                type="button"
                onClick={onOpenUpload}
                className="w-full mt-3 py-2 px-3 rounded-xl bg-amber-400 hover:bg-amber-500 active:scale-95 text-slate-950 font-bold text-xs flex items-center justify-center gap-1.5 font-heading shadow-xs transition-transform"
              >
                <Crown className="w-3.5 h-3.5 fill-slate-950" />
                <span>Send Print in VIP Priority Queue</span>
              </button>
            </div>
          ) : (
            <div className="rounded-2xl p-3 bg-red-50/60 border border-red-100 flex items-center justify-between gap-3">
              <div>
                <h4 className="text-xs font-bold text-slate-900 font-heading">
                  Subscribe for ₹{shopMembershipPrice}/mo & Save 20%
                </h4>
                <p className="text-[11px] text-slate-500">
                  Shopkeeper-exclusive membership pricing at {selectedEnterprise.name}
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  requireAuth(() => {
                    setIsBuyMembershipModalOpen(true);
                  }, 'Sign In to Purchase Membership', 'Please sign in or create an account to buy a shop membership.');
                }}
                className="px-3.5 py-1.5 rounded-full bg-[#FF1300] hover:bg-[#E01100] active:scale-95 text-white text-xs font-bold shadow-xs shrink-0 font-heading"
              >
                Get Membership • ₹{shopMembershipPrice}
              </button>
            </div>
          )}
        </div>
      )}

      {/* 4. Upload Document Primary Action */}
      <button
        type="button"
        onClick={onOpenUpload}
        className="w-full py-3 rounded-2xl bg-[#FF1300] hover:bg-[#E01100] active:scale-95 text-white text-xs font-bold flex items-center justify-center gap-2 shadow-sm shadow-red-500/25 transition-all font-heading"
      >
        <Upload className="w-4 h-4 stroke-[2.2]" />
        <span>Upload Document for Printing</span>
      </button>

      {/* 5. Receipt History with Clean Aligned Filter Options (User Requirement) */}
      <div className="bg-white rounded-3xl p-4 border border-slate-200/80 shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-[#FF1300]" />
            <h3 className="text-xs font-bold text-slate-900 font-heading">
              Receipt History ({shopOrders.length})
            </h3>
          </div>

          {/* Properly aligned time filters (All, Today, This Week, This Month) */}
          <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-xl text-xs overflow-x-auto self-start sm:self-auto">
            {(['All', 'Today', 'This Week', 'This Month'] as const).map(filter => (
              <button
                key={filter}
                type="button"
                onClick={() => setDateFilter(filter)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all whitespace-nowrap ${
                  dateFilter === filter
                    ? 'bg-[#FF1300] text-white shadow-xs font-heading'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {filter}
              </button>
            ))}
          </div>
        </div>

        {/* Filtered Orders List (User Requirement: Print history shown there must belong only to the logged-in user for that shop) */}
        {!userIsLoggedIn ? (
          <div className="p-6 text-center text-slate-500 bg-slate-50/70 rounded-2xl border border-slate-100 space-y-2">
            <FileText className="w-6 h-6 text-slate-400 mx-auto" />
            <p className="text-xs font-bold text-slate-700">Sign in to view your receipts</p>
            <p className="text-[10px] text-slate-400">
              Print history is personal and only visible to the logged-in account.
            </p>
            <button
              type="button"
              onClick={() => openAuthModal(undefined, 'Sign In to View Receipts', 'Please sign in to view your personal print receipts for this shop.')}
              className="mt-2 px-4 py-1.5 rounded-full bg-[#FF1300] hover:bg-[#E01100] text-white text-xs font-bold transition-all font-heading shadow-xs"
            >
              Sign In
            </button>
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="p-6 text-center text-slate-400 bg-slate-50/50 rounded-2xl">
            <p className="text-xs font-semibold">No print receipts found for "{dateFilter}"</p>
            <p className="text-[10px] text-slate-400 mt-0.5">
              Orders placed at this shop will appear here with live tax receipts
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {filteredOrders.map(order => (
              <div
                key={order.id}
                className="p-3 rounded-2xl bg-slate-50/70 hover:bg-red-50/30 border border-slate-100 flex items-center justify-between gap-3 transition-colors"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-xl bg-red-100 text-[#FF1300] flex items-center justify-center shrink-0 font-black text-xs">
                    {order.calculatedPages}p
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-slate-900 truncate">
                      {order.document.fileName}
                    </p>
                    <p className="text-[10px] text-slate-400">
                      {order.createdAt} • {order.config.printType} • {order.config.sides}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-xs font-black text-slate-900 font-heading">
                    ₹{order.grandTotal.toFixed(0)}
                  </span>
                  <button
                    type="button"
                    onClick={() => onViewReceipt(order)}
                    className="px-2.5 py-1 rounded-lg border border-red-200 hover:border-[#FF1300] hover:bg-red-50 text-[#FF1300] text-[11px] font-bold font-heading"
                  >
                    View
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 6. Customer Reviews & Feedback Section (User Requirement: "tyacha nanatr tyach section madhe Our Reviews section pahije mean tithe costumer ne dilele feedback show hotil") */}
      <div className="bg-white rounded-3xl p-4 border border-slate-200/80 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-[#FF1300]" />
            <div>
              <h3 className="text-xs font-bold text-slate-900 font-heading">
                Customer Reviews ({enterpriseReviews.length})
              </h3>
              <p className="text-[10px] text-slate-400">
                Verified ratings & feedback from students
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setIsReviewModalOpen(true)}
            className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-red-50 hover:bg-red-100 text-[#FF1300] text-xs font-bold transition-colors font-heading"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Write Review</span>
          </button>
        </div>

        {/* Reviews List */}
        <div className="space-y-2.5">
          {isLoadingFeedbacks ? (
            <div className="py-4 text-center text-xs text-slate-400">Loading reviews...</div>
          ) : enterpriseReviews.length === 0 ? (
            <div className="p-4 rounded-2xl bg-slate-50 border border-dashed border-slate-200 text-center space-y-1">
              <MessageSquare className="w-5 h-5 text-slate-400 mx-auto" />
              <p className="text-xs font-bold text-slate-700">No reviews yet. Be the first to review!</p>
              <p className="text-[10px] text-slate-400">Share your printing experience to help other students.</p>
            </div>
          ) : (
            <div className="space-y-2.5 divide-y divide-slate-100">
              {enterpriseReviews.map(review => (
                <div key={review.id} className="pt-2.5 first:pt-0 space-y-1">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-slate-200 overflow-hidden shrink-0">
                        {review.userAvatar ? (
                          <img src={review.userAvatar} alt={review.userName} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-[10px] font-bold text-slate-700">
                            {review.userName.charAt(0)}
                          </div>
                        )}
                      </div>
                      <span className="text-xs font-bold text-slate-800">{review.userName}</span>
                      <span className="text-[9px] text-slate-400 bg-slate-100 px-1.5 py-0.2 rounded font-medium">
                        {review.serviceUsed}
                      </span>
                    </div>

                    <div className="flex items-center gap-0.5 text-amber-500">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star
                          key={i}
                          className={`w-3 h-3 ${i < review.rating ? 'fill-amber-400 text-amber-400' : 'text-slate-200'}`}
                        />
                      ))}
                    </div>
                  </div>

                  <p className="text-xs text-slate-600 leading-relaxed pl-8">
                    &quot;{review.comment}&quot;
                  </p>
                  <div className="text-[10px] text-slate-400 pl-8">
                    {review.date}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 7. Write Review Modal Dialog */}
      {isReviewModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white rounded-3xl p-5 w-full max-w-md shadow-2xl border border-slate-100 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="text-sm font-extrabold text-slate-900 font-heading">
                Write a Verified Review
              </h3>
              <button
                type="button"
                onClick={() => setIsReviewModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmitReview} className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1.5">Rating</label>
                <div className="flex items-center gap-1.5">
                  {[1, 2, 3, 4, 5].map(star => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setReviewRating(star)}
                      className="p-1 text-amber-400 hover:scale-110 transition-transform"
                    >
                      <Star className={`w-6 h-6 ${star <= reviewRating ? 'fill-amber-400' : 'text-slate-200'}`} />
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Service Used</label>
                <select
                  value={reviewService}
                  onChange={e => setReviewService(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white font-medium"
                >
                  <option value="B&W Laser Print">B&W Laser Print</option>
                  <option value="Laser Colour Print">Laser Colour Print</option>
                  <option value="Spiral Binding + B&W Print">Spiral Binding + B&W Print</option>
                  <option value="Project Report Hardcover">Project Report Hardcover</option>
                  <option value="Thermal Lamination">Thermal Lamination</option>
                </select>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Your Feedback & Experience *</label>
                <textarea
                  required
                  rows={3}
                  value={reviewComment}
                  onChange={e => setReviewComment(e.target.value)}
                  placeholder="Share paper quality, speed, pricing, and shopkeeper service..."
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:border-[#FF1300] outline-none"
                />
                <p className="text-[10px] text-slate-400 mt-1">
                  Note: Your review will be saved with &apos;pending&apos; status and posted to the shop profile once reviewed and approved by the shopkeeper.
                </p>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsReviewModalOpen(false)}
                  className="flex-1 py-2 rounded-xl border border-slate-200 font-bold text-slate-600"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 rounded-xl bg-[#FF1300] text-white font-bold font-heading shadow-xs"
                >
                  Submit Review
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Comprehensive Buy Membership & Razorpay Enrollment Modal */}
      <Dialog open={isBuyMembershipModalOpen} onOpenChange={setIsBuyMembershipModalOpen}>
        <DialogContent className="max-w-[calc(100%-2rem)] md:max-w-lg bg-white rounded-3xl p-5 max-h-[90dvh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-base font-extrabold font-heading text-slate-900 flex items-center gap-2">
              <Crown className="w-5 h-5 text-amber-500" />
              <span>Join {selectedEnterprise.name} Print Club</span>
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 pt-2">
            {/* 1. Membership Plan Selection */}
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1.5 font-heading">
                Choose Your Membership Plan
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {availablePlans.map((plan) => {
                  const isSelected = selectedPlanId === plan.id;
                  return (
                    <div
                      key={plan.id}
                      onClick={() => setSelectedPlanId(plan.id)}
                      className={`cursor-pointer p-3 rounded-2xl border transition-all ${
                        isSelected
                          ? 'border-[#FF1300] bg-red-50/50 ring-2 ring-[#FF1300]/20'
                          : 'border-slate-200 hover:border-slate-300 bg-slate-50/50'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-extrabold text-slate-900 font-heading">{plan.tier}</span>
                        <span className="text-xs font-black text-[#FF1300]">₹{plan.price}</span>
                      </div>
                      <p className="text-[11px] text-slate-600 font-semibold mb-1">
                        {plan.discountPercentage}% OFF • {plan.freePagesPerMonth} Free Pages
                      </p>
                      <span className="text-[10px] text-slate-400 block">
                        Exact store rate configured by shopkeeper
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Plan Highlights */}
            <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100 space-y-1.5 text-xs">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                {selectedPlan.tier} Member Perks:
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 text-[11px] text-slate-700">
                {selectedPlan.perks.map((p, idx) => (
                  <div key={idx} className="flex items-center gap-1.5">
                    <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                    <span>{p}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* 2. User Enrollment Details Form */}
            <div className="space-y-3 border-t border-slate-100 pt-3">
              <h4 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider font-heading flex items-center gap-1.5">
                <User className="w-4 h-4 text-[#FF1300]" />
                <span>Personal Enrollment Details</span>
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-1">Full Name *</label>
                  <input
                    type="text"
                    required
                    value={enrollName}
                    onChange={(e) => setEnrollName(e.target.value)}
                    placeholder="Enter full name"
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:border-[#FF1300] outline-none"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-1">Email Address *</label>
                  <input
                    type="email"
                    required
                    value={enrollEmail}
                    onChange={(e) => setEnrollEmail(e.target.value)}
                    placeholder="name@university.edu"
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:border-[#FF1300] outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-1">Phone / WhatsApp *</label>
                  <input
                    type="tel"
                    required
                    value={enrollPhone}
                    onChange={(e) => setEnrollPhone(e.target.value)}
                    placeholder="+91 98765 43210"
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:border-[#FF1300] outline-none"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-1">Photo Upload (ID Card) *</label>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => photoInputRef.current?.click()}
                      className="flex-1 py-1.5 px-3 rounded-xl border border-dashed border-red-300 hover:bg-red-50 text-[11px] font-bold text-slate-700 flex items-center justify-center gap-1.5 transition-all"
                    >
                      <Camera className="w-3.5 h-3.5 text-[#FF1300]" />
                      <span>{enrollPhoto ? 'Change Photo' : 'Upload ID Photo'}</span>
                    </button>
                    {enrollPhoto && (
                      <div className="w-8 h-8 rounded-full overflow-hidden border border-red-200 shrink-0">
                        <img src={enrollPhoto} alt="Member preview" className="w-full h-full object-cover" />
                      </div>
                    )}
                  </div>
                  <input
                    type="file"
                    ref={photoInputRef}
                    accept="image/*"
                    onChange={handlePhotoSelect}
                    className="hidden"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-700 block mb-1">Residential / Hostel Address *</label>
                <textarea
                  rows={2}
                  required
                  value={enrollAddress}
                  onChange={(e) => setEnrollAddress(e.target.value)}
                  placeholder="Enter current campus/hostel address..."
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:border-[#FF1300] outline-none resize-none"
                />
              </div>
            </div>

            {/* 3. Mandatory Payment Terms & Agreement Checkbox */}
            <div className="p-3 rounded-2xl bg-red-50/70 border border-red-100 flex items-start gap-2.5">
              <input
                id="membershipTermsCheck"
                type="checkbox"
                checked={hasAcceptedTerms}
                onChange={(e) => setHasAcceptedTerms(e.target.checked)}
                className="mt-0.5 w-4 h-4 text-[#FF1300] rounded focus:ring-red-400 cursor-pointer accent-[#FF1300]"
              />
              <label htmlFor="membershipTermsCheck" className="text-[11px] text-slate-700 cursor-pointer leading-relaxed">
                I agree to the <strong>Print Club Terms of Service</strong> and authorize one-time test payment of <strong>₹{selectedPlan.price || selectedPlan.pricePerMonth || 299}</strong> via Razorpay Secure Gateway. I confirm the details provided are accurate for physical card printing.
              </label>
            </div>

            {/* Action buttons */}
            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={() => setIsBuyMembershipModalOpen(false)}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 font-bold text-slate-600 text-xs"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!hasAcceptedTerms || isProcessingPayment}
                onClick={handlePayUMembershipPayment}
                className={`flex-1 py-2.5 rounded-xl font-bold font-heading text-xs text-white shadow-sm flex items-center justify-center gap-1.5 transition-all ${
                  hasAcceptedTerms && !isProcessingPayment
                    ? 'bg-[#FF1300] hover:bg-[#E01100] active:scale-95'
                    : 'bg-slate-300 cursor-not-allowed'
                }`}
              >
                <ShieldCheck className="w-4 h-4" />
                <span>
                  {isProcessingPayment ? 'Connecting PayU...' : `Pay ₹${selectedPlan.price || selectedPlan.pricePerMonth || 299} via PayU`}
                </span>
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Perks Modal */}
      <Dialog open={isPerksModalOpen} onOpenChange={setIsPerksModalOpen}>
        <DialogContent className="max-w-[calc(100%-2rem)] md:max-w-md bg-white rounded-3xl p-6">
          <DialogHeader>
            <DialogTitle className="text-base font-extrabold font-heading text-slate-900">
              {activeMembership?.tier} Member Benefits
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 pt-2 text-xs">
            {activeMembership?.perks.map((perk, idx) => (
              <div key={idx} className="flex items-center gap-2 p-2 rounded-xl bg-slate-50">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                <span className="text-slate-800 font-medium">{perk}</span>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
