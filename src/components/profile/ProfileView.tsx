import React, { useState, useRef, useEffect } from 'react';
import {
  User,
  Settings,
  Sliders,
  CreditCard,
  ShieldCheck,
  CheckCircle2,
  ChevronRight,
  ChevronLeft,
  Edit2,
  MapPin,
  Compass,
  Star,
  Check,
  Building2,
  Phone,
  Mail,
  Camera,
  Navigation,
  Layers,
  ZoomIn,
  ZoomOut,
  Radio,
  Wifi,
  Sparkles,
  LogOut,
  Crosshair,
  Save,
  RefreshCw,
  AlertCircle,
  RotateCw,
  RotateCcw,
  Scissors,
  Clock,
  Lock,
  Eye,
  EyeOff
} from 'lucide-react';
import { formatFullName, sanitizeNameInputs } from '../../utils/nameFormat';
import { usePrintPerfect } from '../../contexts/PrintPerfectContext';
import { validatePasswordRules } from '../../lib/authSecurity';
import type { PrintConfig } from '../../types/printperfect';
import { DEFAULT_GUEST_PROFILE_PHOTO } from '../../types/printperfect';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { RealMapboxMap } from '../common/RealMapboxMap';

interface ProfileViewProps {
  onOpenSettings?: () => void;
  onOpenSection?: (section: string) => void;
  onConnectShop?: (shopId: string) => void;
}

export const ProfileView: React.FC<ProfileViewProps> = ({
  onOpenSettings,
  onConnectShop
}) => {
  const {
    user,
    updateUser,
    activeMembership,
    activeMemberships,
    enterprises,
    isMembershipActive,
    toggleMembershipStatus,
    saveDefaultPrintConfig,
    printConfig,
    nearbyShops,
    selectEnterprise,
    logout,
    openAuthModal,
    updatePassword
  } = usePrintPerfect();

  const [activeCardIndex, setActiveCardIndex] = useState(0);

  // Filter only purchased active memberships
  const userMembershipsList =
    activeMemberships && activeMemberships.length > 0
      ? activeMemberships
      : activeMembership
      ? [activeMembership]
      : [];
  const hasPurchasedMembership = userMembershipsList.length > 0;

  // Edit User Profile Modal State
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  // Change Password Modal State
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showOldPwd, setShowOldPwd] = useState(false);
  const [showNewPwd, setShowNewPwd] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);

  const [editForm, setEditForm] = useState({
    name: user.name || '',
    surname: user.surname || '',
    email: user.email || '',
    phone: user.phone || '',
    address: user.address || ''
  });

  // Default Preferences Local State
  const [defaultPaperSize, setDefaultPaperSize] = useState<PrintConfig['pageSize']>(
    printConfig.pageSize || 'A4'
  );
  const [defaultPaperType, setDefaultPaperType] = useState<PrintConfig['paperType']>(
    printConfig.paperType || 'Normal'
  );
  const [defaultPrintType, setDefaultPrintType] = useState<PrintConfig['printType']>(
    printConfig.printType || 'B&W'
  );
  const [defaultSides, setDefaultSides] = useState<PrintConfig['sides']>(
    printConfig.sides || 'Single Side'
  );
  const [defaultLayout, setDefaultLayout] = useState<PrintConfig['layout']>(
    printConfig.layout || 'Portrait'
  );
  const [defaultCopies, setDefaultCopies] = useState<number>(printConfig.copies || 1);

  // Mapbox interactive state & 1 KM / 5 KM Radius Filter
  const [radiusFilter, setRadiusFilter] = useState<1 | 5>(1);
  const [userCoords, setUserCoords] = useState<[number, number]>(() => {
    return user.coordinates || [73.8567, 18.5204];
  });
  const [stagedCoords, setStagedCoords] = useState<[number, number]>(() => {
    return user.coordinates || [73.8567, 18.5204];
  });
  const [stagedAddress, setStagedAddress] = useState<string>(
    user.address || ''
  );
  const [isLocationStaged, setIsLocationStaged] = useState<boolean>(false);

  // Keep userCoords synchronized with user.coordinates
  useEffect(() => {
    if (user.coordinates && Array.isArray(user.coordinates) && user.coordinates.length === 2) {
      setUserCoords(user.coordinates);
      if (!isLocationStaged) {
        setStagedCoords(user.coordinates);
      }
    }
  }, [user.coordinates, isLocationStaged]);

  // Stage location change when map pin dragged or map clicked (DOES NOT AUTO SAVE)
  const handleStageLocation = (coords: [number, number], newAddress: string) => {
    setStagedCoords(coords);
    setStagedAddress(newAddress);
    setIsLocationStaged(true);
  };

  // Explicit Update Location & Address confirmation button click
  const handleConfirmLocationUpdate = () => {
    setUserCoords(stagedCoords);
    updateUser({
      coordinates: stagedCoords,
      address: stagedAddress
    });
    setIsLocationStaged(false);
    toast.success(`Location updated & saved to profile: ${stagedAddress}`);
  };

  // Haversine formula calculation to accurately calculate distance between user coordinates and shop coordinates
  const calculateHaversineDistanceKm = (coords1: [number, number], coords2: [number, number]): number => {
    const [lon1, lat1] = coords1;
    const [lon2, lat2] = coords2;
    const R = 6371; // Earth radius in KM
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLon = (lon2 - lon1) * (Math.PI / 180);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return Number((R * c).toFixed(2));
  };

  // Dynamically filter nearby shops connected to printOn24 within selected radius using true Haversine formula
  const filteredNearbyShops = nearbyShops
    .map(shop => {
      const shopCoords: [number, number] = [
        Number(shop.longitude) || 73.8567,
        Number(shop.latitude) || 18.5204
      ];
      const distKm = calculateHaversineDistanceKm(userCoords, shopCoords);
      const distMeters = Math.round(distKm * 1000);
      const walkingMin = Math.max(1, Math.round(distMeters / 80));
      return {
        ...shop,
        distanceKm: distKm,
        distanceMeters: distMeters,
        distanceFormatted: distMeters < 1000 ? `${distMeters} m away (${walkingMin} min walk)` : `${distKm.toFixed(1)} km away`,
        latitude: shopCoords[1],
        longitude: shopCoords[0]
      };
    })
    .filter(shop => shop.distanceKm <= radiusFilter)
    .sort((a, b) => a.distanceKm - b.distanceKm);

  // Dynamic shop card is hidden until user explicitly clicks a shop pin on the map
  const [selectedNearbyShop, setSelectedNearbyShop] = useState<typeof nearbyShops[0] | null>(null);
  const [mapZoom, setMapZoom] = useState(1);

  // In-page Avatar Editor State (zoom in/out, rotation, crop adjustment)
  const [isAvatarEditorOpen, setIsAvatarEditorOpen] = useState(false);
  const [avatarImageSrc, setAvatarImageSrc] = useState<string | null>(null);
  const [avatarZoom, setAvatarZoom] = useState(1);
  const [avatarRotation, setAvatarRotation] = useState(0);

  // Avatar Image Upload: triggers in-page editor directly
  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      setAvatarImageSrc(event.target?.result as string);
      setAvatarZoom(1);
      setAvatarRotation(0);
      setIsAvatarEditorOpen(true);
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  // Apply Edited Avatar using Canvas
  const handleApplyAvatar = () => {
    if (!avatarImageSrc) return;

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = avatarImageSrc;

    img.onload = () => {
      const size = 300;
      canvas.width = size;
      canvas.height = size;

      ctx.clearRect(0, 0, size, size);
      ctx.save();
      ctx.translate(size / 2, size / 2);
      ctx.rotate((avatarRotation * Math.PI) / 180);
      ctx.scale(avatarZoom, avatarZoom);
      ctx.drawImage(img, -size / 2, -size / 2, size, size);
      ctx.restore();

      const finalDataUrl = canvas.toDataURL('image/jpeg', 0.9);
      updateUser({ avatarUrl: finalDataUrl });
      setIsAvatarEditorOpen(false);
      toast.success('Profile image adjusted and updated successfully!');
    };
  };

  // Open Edit Profile
  const handleOpenEdit = () => {
    const { cleanFirstName, cleanSurname } = sanitizeNameInputs(user.name || '', user.surname || '');
    setEditForm({
      name: cleanFirstName,
      surname: cleanSurname,
      email: user.email || '',
      phone: user.phone || '',
      address: user.address || ''
    });
    setIsEditModalOpen(true);
  };

  // Save User Profile
  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editForm.name.trim() || !editForm.email.trim()) {
      toast.error('First Name and Email ID are required.');
      return;
    }

    const trimmedPhone = editForm.phone.trim();
    if (trimmedPhone) {
      if (!/^\d{10}$/.test(trimmedPhone)) {
        toast.error('Mobile number must be a valid 10-digit number (digits only, e.g. 9823456789).');
        return;
      }
    }

    const { cleanFirstName, cleanSurname } = sanitizeNameInputs(editForm.name, editForm.surname);

    updateUser({
      name: cleanFirstName,
      surname: cleanSurname,
      email: editForm.email.trim(),
      phone: trimmedPhone,
      address: editForm.address.trim(),
      coordinates: userCoords
    });

    setIsEditModalOpen(false);
    toast.success('User profile updated successfully!');
  };

  // Change Password Handler with verification of old password
  const handleChangePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPassword.trim() || !newPassword.trim()) {
      toast.error('Current password and new password are required.');
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error('New password and confirm password do not match.');
      return;
    }
    const val = validatePasswordRules(newPassword);
    if (!val.isValid) {
      toast.error(val.error || 'New password does not meet security requirements.');
      return;
    }

    setPasswordLoading(true);
    const res = await updatePassword(currentPassword, newPassword);
    setPasswordLoading(false);

    if (res.success) {
      toast.success('Password updated successfully!');
      setIsPasswordModalOpen(false);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } else {
      toast.error(res.error || 'Failed to update password. Please check your current password.');
    }
  };

  // Save Default Preferences
  const handleSavePrintPreferences = () => {
    saveDefaultPrintConfig({
      ...printConfig,
      pageSize: defaultPaperSize,
      paperType: defaultPaperType,
      printType: defaultPrintType,
      sides: defaultSides,
      layout: defaultLayout,
      copies: defaultCopies
    });
  };

  const handleQuickConnect = (shopId: string) => {
    selectEnterprise(shopId);
    if (onConnectShop) {
      onConnectShop(shopId);
    }
  };

  return (
    <div className="w-full max-w-full px-2 md:px-6 space-y-6 pb-24 select-none font-sans">
      {/* Hidden file input for Avatar upload */}
      <input
        ref={avatarInputRef}
        type="file"
        accept="image/*"
        onChange={handleAvatarChange}
        className="hidden"
      />
      {/* ======================================================== */}
      {/* 1. Header (User Profile & Membership Settings) */}
      {/* ======================================================== */}
      <div className="pt-1 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl md:text-2xl font-black text-slate-900 font-heading leading-tight">
            User Profile & Membership
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Manage your verified ID, Membership card, default preferences, and nearby shops.
          </p>
        </div>
      </div>
      {/* ======================================================== */}
      {/* 2. Side-by-Side Desktop Grid: Left ATM Card + Right Profile */}
      {/* ======================================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Fixed-Size ATM Membership Card (5 cols on lg) */}
        <div className="lg:col-span-5 xl:col-span-5 space-y-4">
          {hasPurchasedMembership ? (
            <div className="bg-white rounded-3xl p-5 border border-slate-200/90 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CreditCard className="w-4 h-4 text-[#FF1300]" />
                  <h3 className="text-xs font-bold text-slate-900 font-heading">
                    Active Print Club Membership ({userMembershipsList.length})
                  </h3>
                </div>

                {userMembershipsList.length > 1 && (
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setActiveCardIndex(prev => (prev > 0 ? prev - 1 : userMembershipsList.length - 1))}
                      className="p-1 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
                      title="Previous Membership Card"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <span className="text-[10px] font-bold text-slate-500 px-1">
                      {activeCardIndex + 1}/{userMembershipsList.length}
                    </span>
                    <button
                      type="button"
                      onClick={() => setActiveCardIndex(prev => (prev < userMembershipsList.length - 1 ? prev + 1 : 0))}
                      className="p-1 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
                      title="Next Membership Card"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>

              {/* Swipeable Card Carousel Container */}
              <div className="w-full flex justify-center overflow-hidden">
                {(() => {
                  const currentMem = userMembershipsList[activeCardIndex] || userMembershipsList[0];
                  const shop = enterprises.find(e => e.id === currentMem.enterpriseId);
                  const shopName = shop?.name || currentMem.enterpriseName || 'printOn24 Campus';

                  return (
                    <div className="w-full max-w-[360px] aspect-[1.586/1] relative overflow-hidden rounded-2xl bg-gradient-to-tr from-slate-950 via-[#990B00] to-[#FF1300] p-5 text-white shadow-xl border border-red-500/30 flex flex-col justify-between select-none animate-in fade-in duration-300">
                      {/* Background Watermark */}
                      <div className="absolute -right-6 -bottom-6 w-36 h-36 rounded-full bg-white/5 pointer-events-none" />
                      <div className="absolute top-0 right-0 p-3 opacity-10 font-mono font-black text-4xl pointer-events-none uppercase">
                        {shopName.split(' ')[0]}
                      </div>

                      {/* Top Row: Brand & Discount Perk Tag */}
                      <div className="flex items-start justify-between relative z-10">
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-lg bg-white text-[#FF1300] font-black flex items-center justify-center text-base shadow-md font-heading">
                            C
                          </div>
                          <div>
                            <span className="text-xs font-black tracking-tight text-white font-heading block truncate max-w-[140px]">
                              {shopName}
                            </span>
                            <span className="text-[9px] text-red-200 font-semibold tracking-wider uppercase block">
                              {currentMem.tier}
                            </span>
                          </div>
                        </div>

                        {/* Perk Badge */}
                        <div className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-white/20 backdrop-blur-md text-white font-bold text-[10px] border border-white/25 shadow-xs whitespace-nowrap">
                          <Sparkles className="w-3 h-3 text-yellow-300" />
                          <span className="font-heading">{currentMem.discountPercentage}% Off All Prints</span>
                        </div>
                      </div>

                      {/* Middle Row: EMV Golden Chip & Contactless Wi-Fi */}
                      <div className="flex items-center gap-3 my-auto relative z-10">
                        {/* Golden EMV Smart Chip */}
                        <div className="w-10 h-7 rounded-md bg-gradient-to-br from-amber-200 via-yellow-400 to-amber-500 border border-amber-300/80 shadow-xs relative overflow-hidden flex items-center justify-center">
                          <div className="w-full h-[1px] bg-amber-700/40 absolute top-2" />
                          <div className="w-full h-[1px] bg-amber-700/40 absolute bottom-2" />
                          <div className="h-full w-[1px] bg-amber-700/40 absolute left-3" />
                          <div className="h-full w-[1px] bg-amber-700/40 absolute right-3" />
                        </div>
                        {/* Contactless Wave */}
                        <Wifi className="w-4 h-4 text-white/70 rotate-90" />
                      </div>

                      {/* Bottom Row: Card Number & Cardholder Details */}
                      <div className="space-y-1 relative z-10 pt-1">
                        <p className="font-mono text-sm tracking-[0.2em] text-white/95 font-semibold">
                          {currentMem.cardNumber || '4522 •••• •••• 8892'}
                        </p>
                        <div className="flex items-end justify-between text-[10px] text-white/80">
                          <div>
                            <p className="text-[8px] uppercase tracking-wider text-red-200">
                              Cardholder
                            </p>
                            <p className="font-bold tracking-wide text-white uppercase text-xs truncate max-w-[180px]">
                              {currentMem.userName || `${user.name} ${user.surname || ''}`.trim()}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-[8px] uppercase tracking-wider text-red-200">
                              Valid Thru
                            </p>
                            <p className="font-mono font-bold text-white">
                              {currentMem.validUntil || '12/28'}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </div>

              {/* Dots indicator for multi-card carousel */}
              {userMembershipsList.length > 1 && (
                <div className="flex justify-center items-center gap-1.5 pt-1">
                  {userMembershipsList.map((_, idx) => (
                    <button
                      key={idx}
                      onClick={() => setActiveCardIndex(idx)}
                      className={`h-1.5 rounded-full transition-all ${
                        activeCardIndex === idx ? 'w-5 bg-[#FF1300]' : 'w-1.5 bg-slate-200'
                      }`}
                    />
                  ))}
                </div>
              )}

              {/* Membership Benefits List */}
              <div className="pt-2 border-t border-slate-100 space-y-2">
                <div className="flex items-center gap-2 text-xs text-slate-700">
                  <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span>Flat discount auto-calculated at checkout</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-700">
                  <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span>Zero queue priority at this partner print shop</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-700">
                  <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span>Free monthly quota & zero convenience charges</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-3xl p-5 border border-slate-200/90 shadow-sm space-y-3">
              <div className="flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-[#FF1300]" />
                <h3 className="text-xs font-bold text-slate-900 font-heading">
                  Print Club Membership
                </h3>
              </div>
              <div className="rounded-2xl p-4 bg-slate-50 border border-slate-200/70 text-center space-y-2">
                <CreditCard className="w-8 h-8 text-slate-300 mx-auto" />
                <p className="text-xs font-bold text-slate-700 font-heading">
                  No Active Memberships Purchased
                </p>
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  Visit any partner store page and click to unlock queue priority and get discount.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Right Column: User Profile Details + Default Preferences (7 cols on lg) */}
        <div className="lg:col-span-7 xl:col-span-7 space-y-6">
          {/* User Profile Card */}
          <div className="bg-white rounded-3xl p-5 border border-slate-200/90 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                {/* Complete Circular Avatar with Photo Upload */}
                <div className="relative group shrink-0">
                  <div className="w-20 h-20 rounded-full overflow-hidden border-2 border-red-100 ring-4 ring-red-50 shadow-md bg-slate-100 flex items-center justify-center">
                    <img
                      src={user.avatarUrl || DEFAULT_GUEST_PROFILE_PHOTO}
                      alt={user.name || 'User'}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  {user.isAuthenticated && !user.isGuest && (
                    <button
                      type="button"
                      onClick={() => avatarInputRef.current?.click()}
                      className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-[#FF1300] text-white flex items-center justify-center shadow-md hover:bg-[#E01100] active:scale-95 transition-transform"
                      title="Change Photo"
                    >
                      <Camera className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Profile Text Information */}
                <div className="space-y-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-base md:text-lg font-black text-slate-900 font-heading truncate">
                      {formatFullName(user.name, user.surname)}
                    </h3>
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold border flex items-center gap-1 font-heading ${
                      user.isAuthenticated && !user.isGuest
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        : 'bg-amber-50 text-amber-700 border-amber-200'
                    }`}>
                      {user.isAuthenticated && !user.isGuest ? (
                        <>
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          <span>Verified Account</span>
                        </>
                      ) : (
                        <>
                          <User className="w-3 h-3 text-amber-600" />
                          <span>Guest Account</span>
                        </>
                      )}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 flex items-center gap-1.5 font-medium truncate">
                    <Mail className="w-3.5 h-3.5 text-[#FF1300] shrink-0" />
                    <span className="truncate">{user.email || 'Not provided'}</span>
                  </p>
                  <p className="text-xs text-slate-500 flex items-center gap-1.5 font-mono">
                    <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    {user.phone ? (
                      <span>{user.phone}</span>
                    ) : (
                      <span className="text-slate-400 italic">Not added</span>
                    )}
                  </p>
                  <p className="text-[11px] text-slate-500 flex items-center gap-1.5 truncate">
                    <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    {user.address ? (
                      <span className="truncate">{user.address}</span>
                    ) : (
                      <span className="text-slate-400 italic">Not added</span>
                    )}
                  </p>
                </div>
              </div>

              {/* Action Buttons: Edit Profile & Logout side-by-side (Edit Profile only for authenticated users) */}
              <div className="flex items-center gap-2 self-start sm:self-center shrink-0 flex-wrap">
                {user.isAuthenticated && !user.isGuest && (
                  <button
                    type="button"
                    onClick={handleOpenEdit}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-red-50 hover:bg-red-100 text-[#FF1300] text-xs font-bold transition-all font-heading shrink-0 border border-red-200/60 active:scale-95"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                    <span>Edit Profile</span>
                  </button>
                )}

                {user.isAuthenticated && !user.isGuest && (
                  <></>
                )}

                {user.isAuthenticated && !user.isGuest && (
                  <button
                    type="button"
                    onClick={() => logout()}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-slate-100 hover:bg-red-50 hover:text-[#FF1300] hover:border-red-200 text-slate-700 text-xs font-bold transition-all font-heading shrink-0 border border-slate-200 active:scale-95"
                    title="Log Out of printOn24"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Logout</span>
                  </button>
                )}
              </div>
            </div>

            {/* Guest Banner if not authenticated */}
            {(!user.isAuthenticated || user.isGuest) && (
              <div className="p-3 rounded-2xl bg-amber-50/80 border border-amber-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                  <p className="text-xs text-amber-900 font-medium">
                    You are exploring in Guest mode. Sign in or register to sync your address, membership perks, and receipts across devices.
                  </p>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => openAuthModal(undefined, 'Sign In to printOn24', 'Sign in to access your print history, address & club memberships')}
                    className="px-3 py-1 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shadow-xs active:scale-95 font-heading"
                  >
                    Log In
                  </button>
                  <button
                    type="button"
                    onClick={() => openAuthModal(undefined, 'Create Free Account', 'Sign up to sync your addresses and unlock 20% discount')}
                    className="px-3 py-1 rounded-xl bg-white hover:bg-amber-50 text-amber-800 text-xs font-bold border border-amber-300 shadow-xs active:scale-95 font-heading"
                  >
                    Register
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Default Print Preferences Card */}
          <div className="bg-white rounded-3xl p-5 border border-slate-200/90 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Sliders className="w-4 h-4 text-[#FF1300]" />
                <h3 className="text-xs font-bold text-slate-900 font-heading">
                  Default Print Preferences
                </h3>
              </div>
              <span className="text-[10px] font-bold text-[#FF1300] bg-red-50 px-2.5 py-0.5 rounded-full border border-red-100 font-heading">{"Auto-Applied "}</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              {/* Paper Size */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-semibold text-slate-600 block">Paper Size</label>
                <div className="grid grid-cols-3 gap-1.5">
                  {(['A4', 'A3', 'A2'] as const).map(size => (
                    <button
                      key={size}
                      type="button"
                      onClick={() => setDefaultPaperSize(size)}
                      className={`py-1.5 rounded-xl font-bold transition-all ${
                        defaultPaperSize === size
                          ? 'bg-[#FF1300] text-white shadow-xs'
                          : 'bg-slate-50 text-slate-700 hover:bg-slate-100 border border-slate-200/60'
                      }`}
                    >
                      {size}
                    </button>
                  ))}
                </div>
              </div>

              {/* Color Mode */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-semibold text-slate-600 block">Print Type</label>
                <div className="grid grid-cols-2 gap-1.5">
                  {(['B&W', 'Colour'] as const).map(type => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setDefaultPrintType(type)}
                      className={`py-1.5 rounded-xl font-bold transition-all ${
                        defaultPrintType === type
                          ? 'bg-[#FF1300] text-white shadow-xs'
                          : 'bg-slate-50 text-slate-700 hover:bg-slate-100 border border-slate-200/60'
                      }`}
                    >
                      {type}
                    </button>
                  ))}
                </div>
              </div>

              {/* Print Side */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-semibold text-slate-600 block">Print Sides</label>
                <div className="grid grid-cols-2 gap-1.5">
                  {(['Single Side', 'Back to Back'] as const).map(side => (
                    <button
                      key={side}
                      type="button"
                      onClick={() => setDefaultSides(side)}
                      className={`py-1.5 rounded-xl font-bold transition-all ${
                        defaultSides === side
                          ? 'bg-[#FF1300] text-white shadow-xs'
                          : 'bg-slate-50 text-slate-700 hover:bg-slate-100 border border-slate-200/60'
                      }`}
                    >
                      {side}
                    </button>
                  ))}
                </div>
              </div>

              {/* Paper Quality */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-semibold text-slate-600 block">Paper Quality</label>
                <div className="grid grid-cols-2 gap-1.5">
                  {(['Normal', 'Bond Paper'] as const).map(pType => (
                    <button
                      key={pType}
                      type="button"
                      onClick={() => setDefaultPaperType(pType)}
                      className={`py-1.5 rounded-xl font-bold transition-all ${
                        defaultPaperType === pType
                          ? 'bg-[#FF1300] text-white shadow-xs'
                          : 'bg-slate-50 text-slate-700 hover:bg-slate-100 border border-slate-200/60'
                      }`}
                    >
                      {pType}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={handleSavePrintPreferences}
                className="px-5 py-2 rounded-full bg-[#FF1300] hover:bg-[#E01100] active:scale-95 text-white text-xs font-bold transition-all shadow-sm font-heading"
              >
                Save Default Preferences
              </button>
            </div>
          </div>
        </div>
      </div>
      {/* ======================================================== */}
      {/* 5. Find Nearby Print Shops: 1 KM & 5 KM Radius Filter + Mapbox Map */}
      {/* ======================================================== */}
      <div className="bg-white rounded-3xl p-5 border border-slate-200/90 shadow-sm space-y-4">
        {/* Header with 1 KM & 5 KM Radius Toggle Buttons */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
          <div className="flex items-center gap-2">
            <Compass className="w-4 h-4 text-[#FF1300]" />
            <h3 className="text-xs font-bold text-slate-900 font-heading">
              Find Nearby Print Shops
            </h3>
          </div>

          {/* Explicit 1 KM and 5 KM Radius Filter Buttons */}
          <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-full border border-slate-200 mr-[120px]">
            <button
              type="button"
              onClick={() => {
                setRadiusFilter(1);
                setSelectedNearbyShop(null);
              }}
              className={`px-3 py-1 rounded-full text-[11px] font-bold transition-all ${
                radiusFilter === 1
                  ? 'bg-[#FF1300] text-white shadow-xs font-heading'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              1 KM Radius
            </button>
            <button
              type="button"
              onClick={() => {
                setRadiusFilter(5);
                setSelectedNearbyShop(null);
              }}
              className={`px-3 py-1 rounded-full text-[11px] font-bold transition-all ${
                radiusFilter === 5
                  ? 'bg-[#FF1300] text-white shadow-xs font-heading'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              5 KM Radius
            </button>
          </div>
        </div>

        {/* Two-Way Address Synchronization Bar */}
        <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/90 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className={`w-9 h-9 rounded-xl ${isLocationStaged ? 'bg-amber-100 text-amber-700 border-amber-300' : 'bg-red-50 text-[#FF1300] border-red-200/60'} border flex items-center justify-center shrink-0`}>
              <MapPin className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-[11px] font-bold text-slate-800 font-heading">
                  {isLocationStaged ? 'New Location Staged (Unsaved):' : 'Saved Profile Address:'}
                </span>
                <span className="text-[10px] font-mono text-slate-500">
                  [{(isLocationStaged ? stagedCoords : userCoords)[0].toFixed(4)}, {(isLocationStaged ? stagedCoords : userCoords)[1].toFixed(4)}]
                </span>
                {isLocationStaged && (
                  <span className="px-2 py-0.5 rounded-full bg-amber-500 text-white text-[9px] font-bold animate-pulse">
                    Click Update to Save
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-700 truncate mt-0.5 font-medium">
                {isLocationStaged ? stagedAddress : (user.address || 'Location not added')}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {isLocationStaged ? (
              <button
                type="button"
                onClick={handleConfirmLocationUpdate}
                className="px-4 py-2 rounded-xl bg-[#FF1300] hover:bg-[#E01100] text-white text-xs font-bold flex items-center gap-1.5 font-heading transition-all shadow-sm shadow-red-500/20 active:scale-95 animate-pulse"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Confirm & Update Location</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={handleOpenEdit}
                className="px-3.5 py-2 rounded-xl bg-white hover:bg-slate-100 text-slate-700 text-xs font-bold border border-slate-200 flex items-center gap-1.5 font-heading transition-all shadow-2xs active:scale-95"
              >
                <Edit2 className="w-3.5 h-3.5 text-slate-500" />
                <span>Update Address</span>
              </button>
            )}
          </div>
        </div>

        {/* Strict Radius Empty Check */}
        {filteredNearbyShops.length === 0 && (
          <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs font-semibold flex items-center justify-center gap-2 shadow-xs text-center">
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
            <span>
              {radiusFilter === 1
                ? 'No shops found within 1 KM. Try expanding your search radius to 5 KM.'
                : 'No shops found within 5 KM. Try adjusting your location or check back soon.'}
            </span>
          </div>
        )}

        {/* Real Mapbox Map Container with Dynamic Location & Radius Filter */}
        <RealMapboxMap
          nearbyShops={filteredNearbyShops}
          selectedShop={selectedNearbyShop}
          onSelectShop={setSelectedNearbyShop}
          userCoordinates={userCoords}
          userAddress={user.address}
          radiusKm={radiusFilter}
          onStageLocation={handleStageLocation}
          className="h-64"
        />

        {/* Dynamic Connected Printing Partner Card: displays nearest shop or clicked shop */}
        {(selectedNearbyShop || (filteredNearbyShops.length > 0 ? filteredNearbyShops[0] : null)) && (() => {
          const activeShop = selectedNearbyShop || filteredNearbyShops[0];
          return (
            <div className="p-4 rounded-2xl bg-white border border-red-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4 animate-in fade-in-50 duration-200">
              <div className="min-w-0 flex-1 space-y-1.5">
                <div className="flex items-center gap-2 flex-wrap">
                  <h4 className="text-sm font-black text-slate-900 font-heading">
                    {activeShop.name}
                  </h4>
                  <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-bold border border-emerald-200 shrink-0">
                    {activeShop.distanceKm !== undefined ? `${activeShop.distanceKm} km away` : activeShop.distanceFormatted}
                  </span>
                  <span className="text-amber-500 font-bold text-[11px] flex items-center gap-0.5 shrink-0">
                    <Star className="w-3 h-3 fill-amber-400" />
                    {activeShop.rating}
                  </span>
                </div>
                <p className="text-xs text-slate-600 font-medium">
                  {activeShop.address}
                </p>
                <div className="flex flex-wrap items-center gap-4 pt-1 text-[11px] text-slate-500">
                  <span className="flex items-center gap-1 font-semibold text-slate-700">
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                    8:00 AM - 10:00 PM (Mon - Sat)
                  </span>
                  <span className="flex items-center gap-1 font-semibold text-slate-700">
                    <Phone className="w-3.5 h-3.5 text-slate-400" />
                    {activeShop.phone || '+91 98234 56789'}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => handleQuickConnect(activeShop.id)}
                  className="px-5 py-2.5 rounded-full bg-[#FF1300] hover:bg-[#E01100] active:scale-95 text-white text-xs font-bold shadow-sm shadow-red-500/20 font-heading shrink-0 whitespace-nowrap transition-transform"
                >
                  Connect with this shop
                </button>
              </div>
            </div>
          );
        })()}
      </div>
      {/* Edit User Profile Dialog (Name, Surname, Email ID, Contact Number, Address only) */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="max-w-[calc(100%-2rem)] md:max-w-md bg-white rounded-3xl p-6">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-slate-900 font-heading flex items-center gap-2">
              <User className="w-5 h-5 text-[#FF1300]" />
              <span>Edit User Profile</span>
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSaveProfile} className="space-y-3.5 pt-2 text-xs">
            {/* First Name */}
            <div>
              <label className="text-[11px] font-semibold text-slate-700 block mb-1">
                First Name *
              </label>
              <input
                type="text"
                value={editForm.name}
                onChange={e => setEditForm({ ...editForm, name: e.target.value })}
                placeholder="e.g. Shreyash"
                className="w-full px-3.5 py-2.5 rounded-2xl border border-slate-200 bg-slate-50 text-xs font-semibold focus:outline-none focus:border-[#FF1300]"
                required
              />
            </div>

            {/* Surname */}
            <div>
              <label className="text-[11px] font-semibold text-slate-700 block mb-1">
                Surname
              </label>
              <input
                type="text"
                value={editForm.surname}
                onChange={e => setEditForm({ ...editForm, surname: e.target.value })}
                placeholder="e.g. Malusare"
                className="w-full px-3.5 py-2.5 rounded-2xl border border-slate-200 bg-slate-50 text-xs font-semibold focus:outline-none focus:border-[#FF1300]"
              />
            </div>

            {/* Email ID */}
            <div>
              <label className="text-[11px] font-semibold text-slate-700 block mb-1">
                Email ID *
              </label>
              <input
                type="email"
                value={editForm.email}
                onChange={e => setEditForm({ ...editForm, email: e.target.value })}
                placeholder="name@example.com"
                className="w-full px-3.5 py-2.5 rounded-2xl border border-slate-200 bg-slate-50 text-xs font-semibold focus:outline-none focus:border-[#FF1300]"
                required
              />
            </div>

            {/* Contact Number */}
            <div>
              <label className="text-[11px] font-semibold text-slate-700 block mb-1">
                Contact Number
              </label>
              <input
                type="tel"
                value={editForm.phone}
                onChange={e => setEditForm({ ...editForm, phone: e.target.value })}
                placeholder="+91 98000 00000"
                className="w-full px-3.5 py-2.5 rounded-2xl border border-slate-200 bg-slate-50 text-xs font-semibold focus:outline-none focus:border-[#FF1300]"
              />
            </div>

            {/* Address */}
            <div>
              <label className="text-[11px] font-semibold text-slate-700 block mb-1">
                Address
              </label>
              <textarea
                value={editForm.address}
                onChange={e => setEditForm({ ...editForm, address: e.target.value })}
                rows={2}
                placeholder="Flat / Building, Street, City, Pincode"
                className="w-full px-3.5 py-2.5 rounded-2xl border border-slate-200 bg-slate-50 text-xs font-semibold focus:outline-none focus:border-[#FF1300] resize-none"
              />
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsEditModalOpen(false)}
                className="flex-1 py-2.5 rounded-2xl bg-slate-100 text-slate-700 font-bold hover:bg-slate-200 transition-colors font-heading"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex-1 py-2.5 rounded-2xl bg-[#FF1300] hover:bg-[#E01100] active:scale-95 text-white font-bold transition-all shadow-md shadow-red-500/20 font-heading"
              >
                Save Changes
              </button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
      {/* Hidden File Input for Avatar */}
      <input
        ref={avatarInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleAvatarChange}
      />
      {/* In-Page Avatar Crop / Zoom / Rotate Adjustment Dialog */}
      <Dialog open={isAvatarEditorOpen} onOpenChange={setIsAvatarEditorOpen}>
        <DialogContent className="max-w-[calc(100%-2rem)] md:max-w-md bg-white rounded-3xl p-6">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-slate-900 font-heading flex items-center gap-2">
              <Camera className="w-5 h-5 text-[#FF1300]" />
              <span>Adjust & Crop Profile Picture</span>
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 pt-2">
            {/* Circular Preview Viewport */}
            <div className="flex justify-center py-2">
              <div className="w-56 h-56 rounded-full overflow-hidden border-4 border-[#FF1300] shadow-xl bg-slate-900 flex items-center justify-center relative select-none">
                {avatarImageSrc && (
                  <img
                    src={avatarImageSrc}
                    alt="Preview"
                    style={{
                      transform: `scale(${avatarZoom}) rotate(${avatarRotation}deg)`,
                      transition: 'transform 0.05s ease-out'
                    }}
                    className="w-full h-full object-cover pointer-events-none"
                  />
                )}
                {/* Guide Crosshairs */}
                <div className="absolute inset-0 border border-white/20 rounded-full pointer-events-none" />
              </div>
            </div>

            {/* Zoom Controls */}
            <div className="space-y-1.5 bg-slate-50 p-3 rounded-2xl border border-slate-200/80">
              <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                <span className="flex items-center gap-1.5">
                  <ZoomIn className="w-3.5 h-3.5 text-[#FF1300]" />
                  <span>Zoom Level</span>
                </span>
                <span className="font-mono text-[11px] text-slate-500">{avatarZoom.toFixed(2)}x</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setAvatarZoom(prev => Math.max(0.6, Number((prev - 0.1).toFixed(2))))}
                  className="p-1.5 rounded-lg bg-white border border-slate-200 text-slate-700 hover:bg-slate-100"
                  title="Zoom Out"
                >
                  <ZoomOut className="w-4 h-4" />
                </button>
                <input
                  type="range"
                  min="0.6"
                  max="3"
                  step="0.05"
                  value={avatarZoom}
                  onChange={e => setAvatarZoom(parseFloat(e.target.value))}
                  className="flex-1 accent-[#FF1300] h-1.5 bg-slate-200 rounded-lg cursor-pointer"
                />
                <button
                  type="button"
                  onClick={() => setAvatarZoom(prev => Math.min(3, Number((prev + 0.1).toFixed(2))))}
                  className="p-1.5 rounded-lg bg-white border border-slate-200 text-slate-700 hover:bg-slate-100"
                  title="Zoom In"
                >
                  <ZoomIn className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Rotation Controls */}
            <div className="flex items-center justify-between bg-slate-50 p-3 rounded-2xl border border-slate-200/80">
              <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <RotateCw className="w-3.5 h-3.5 text-[#FF1300]" />
                <span>Rotation: {avatarRotation}°</span>
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setAvatarRotation(prev => (prev - 90 + 360) % 360)}
                  className="px-2.5 py-1 rounded-xl bg-white border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-100 flex items-center gap-1"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>-90°</span>
                </button>
                <button
                  type="button"
                  onClick={() => setAvatarRotation(prev => (prev + 90) % 360)}
                  className="px-2.5 py-1 rounded-xl bg-white border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-100 flex items-center gap-1"
                >
                  <RotateCw className="w-3.5 h-3.5" />
                  <span>+90°</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setAvatarZoom(1);
                    setAvatarRotation(0);
                  }}
                  className="px-2.5 py-1 rounded-xl bg-white border border-slate-200 text-xs font-bold text-slate-500 hover:bg-slate-100"
                >
                  Reset
                </button>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsAvatarEditorOpen(false)}
                className="flex-1 py-2.5 rounded-2xl bg-slate-100 text-slate-700 font-bold hover:bg-slate-200 transition-colors font-heading text-xs"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleApplyAvatar}
                className="flex-1 py-2.5 rounded-2xl bg-[#FF1300] hover:bg-[#E01100] active:scale-95 text-white font-bold transition-all shadow-md shadow-red-500/20 font-heading text-xs flex items-center justify-center gap-1.5"
              >
                <Check className="w-4 h-4" />
                <span>Save & Apply</span>
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      {/* Change Password Dialog with Verification */}
      <Dialog open={isPasswordModalOpen} onOpenChange={setIsPasswordModalOpen}>
        <DialogContent className="max-w-[calc(100%-2rem)] md:max-w-md bg-white rounded-3xl p-6 border border-slate-200">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-slate-900 font-heading flex items-center gap-2">
              <Lock className="w-5 h-5 text-[#FF1300]" />
              <span>Update Password</span>
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleChangePasswordSubmit} className="space-y-3.5 pt-2 text-xs">
            {/* Current Password Field */}
            <div>
              <label className="text-[11px] font-semibold text-slate-700 block mb-1">
                Current Password *
              </label>
              <div className="relative">
                <input
                  type={showOldPwd ? 'text' : 'password'}
                  required
                  value={currentPassword}
                  onChange={e => setCurrentPassword(e.target.value)}
                  placeholder="Enter your current password"
                  className="w-full px-3.5 py-2.5 pr-10 rounded-2xl border border-slate-200 bg-slate-50 text-xs font-semibold focus:outline-none focus:border-[#FF1300]"
                />
                <button
                  type="button"
                  onClick={() => setShowOldPwd(!showOldPwd)}
                  className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
                >
                  {showOldPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* New Password Field */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-[11px] font-semibold text-slate-700 block">
                  New Password *
                </label>
                <span className="text-[10px] text-slate-400 font-medium">Symbols: @ or # only</span>
              </div>
              <div className="relative">
                <input
                  type={showNewPwd ? 'text' : 'password'}
                  required
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  placeholder="e.g. Student@2024"
                  className="w-full px-3.5 py-2.5 pr-10 rounded-2xl border border-slate-200 bg-slate-50 text-xs font-semibold focus:outline-none focus:border-[#FF1300]"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPwd(!showNewPwd)}
                  className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
                >
                  {showNewPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              {/* Live Password Criteria / Suggestions */}
              {newPassword.length > 0 && (
                <div className="mt-2 p-2.5 bg-slate-50 rounded-xl border border-slate-200/80 text-[11px] space-y-1">
                  <p className="font-bold text-slate-700 text-[10px] uppercase tracking-wider mb-1">
                    Password Requirements:
                  </p>
                  <div className="grid grid-cols-2 gap-1 text-[10.5px]">
                    <div className={`flex items-center gap-1.5 ${newPassword.length >= 8 ? 'text-emerald-600 font-semibold' : 'text-slate-500'}`}>
                      {newPassword.length >= 8 ? <CheckCircle2 className="w-3 h-3 text-emerald-600 shrink-0" /> : <div className="w-1.5 h-1.5 rounded-full bg-slate-300 ml-1 mr-0.5" />}
                      <span>8+ characters</span>
                    </div>
                    <div className={`flex items-center gap-1.5 ${/[a-zA-Z]/.test(newPassword) ? 'text-emerald-600 font-semibold' : 'text-slate-500'}`}>
                      {/[a-zA-Z]/.test(newPassword) ? <CheckCircle2 className="w-3 h-3 text-emerald-600 shrink-0" /> : <div className="w-1.5 h-1.5 rounded-full bg-slate-300 ml-1 mr-0.5" />}
                      <span>Letters (a-z, A-Z)</span>
                    </div>
                    <div className={`flex items-center gap-1.5 ${/[0-9]/.test(newPassword) ? 'text-emerald-600 font-semibold' : 'text-slate-500'}`}>
                      {/[0-9]/.test(newPassword) ? <CheckCircle2 className="w-3 h-3 text-emerald-600 shrink-0" /> : <div className="w-1.5 h-1.5 rounded-full bg-slate-300 ml-1 mr-0.5" />}
                      <span>Numbers (0-9)</span>
                    </div>
                    <div className={`flex items-center gap-1.5 ${/[@#]/.test(newPassword) ? 'text-emerald-600 font-semibold' : 'text-slate-500'}`}>
                      {/[@#]/.test(newPassword) ? <CheckCircle2 className="w-3 h-3 text-emerald-600 shrink-0" /> : <div className="w-1.5 h-1.5 rounded-full bg-slate-300 ml-1 mr-0.5" />}
                      <span>Symbol (@ or #)</span>
                    </div>
                  </div>
                  {/(.)\1{3,}/.test(newPassword) && (
                    <p className="text-[10px] text-amber-600 font-medium pt-0.5 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3 shrink-0" />
                      Avoid repeated characters like "000000"
                    </p>
                  )}
                  {/(0123|1234|2345|3456|4567|5678|6789|7890|9876|8765)/.test(newPassword) && (
                    <p className="text-[10px] text-amber-600 font-medium pt-0.5 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3 shrink-0" />
                      Avoid sequential digits like "12345678"
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Confirm New Password Field */}
            <div>
              <label className="text-[11px] font-semibold text-slate-700 block mb-1">
                Confirm New Password *
              </label>
              <input
                type="password"
                required
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                placeholder="Re-enter new password"
                className="w-full px-3.5 py-2.5 rounded-2xl border border-slate-200 bg-slate-50 text-xs font-semibold focus:outline-none focus:border-[#FF1300]"
              />
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsPasswordModalOpen(false)}
                className="flex-1 py-2.5 rounded-2xl bg-slate-100 text-slate-700 font-bold hover:bg-slate-200 transition-colors font-heading"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={passwordLoading}
                className="flex-1 py-2.5 rounded-2xl bg-[#FF1300] hover:bg-[#E01100] active:scale-95 text-white font-bold transition-all shadow-md shadow-red-500/20 font-heading flex items-center justify-center gap-2"
              >
                {passwordLoading ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <span>Verify & Update</span>
                )}
              </button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};
