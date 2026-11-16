export type UserRole =
  | 'platform_admin'
  | 'tenant_owner'
  | 'tenant_manager'
  | 'tenant_staff'
  | 'guest';

export type TenantCategory = 'hotel' | 'pousada' | 'hostel' | 'resort';
export type TenantStatus = 'active' | 'suspended' | 'onboarding';
export type SaaSPlanId = 'starter' | 'pro' | 'enterprise';
export type TenantThemeVariant =
  | 'classic_light'
  | 'resort_tint'
  | 'boutique_dark';

export type AccommodationType =
  | 'private_room'
  | 'single_room'
  | 'double_room'
  | 'family_room'
  | 'shared_dorm'
  | 'female_dorm'
  | 'male_dorm'
  | 'mixed_dorm';

export type PricingMode = 'per_room' | 'per_person' | 'per_bed' | 'per_night';

export type ReservationStatus =
  | 'pending_payment'
  | 'pending_confirmation'
  | 'confirmed'
  | 'cancelled'
  | 'checked_in'
  | 'checked_out'
  | 'expired';

export type PaymentMethod = 'pix' | 'credit_card' | 'pay_at_property';
export type PaymentModality = 'full' | 'partial';

export type AvailabilityStatus = 'available' | 'occupied' | 'blocked' | 'held';

export interface Tenant {
  id: string;
  slug: string;
  name: string;
  category: TenantCategory;
  status: TenantStatus;
  plan: SaaSPlanId;
  ownerUid: string;
  ownerEmail?: string;
  ownerPassword?: string;
  primaryColor: string;
  themeVariant?: TenantThemeVariant;
  logoUrl?: string;
  heroImageUrl?: string;
  tagline?: string;
  description?: string;
  phone?: string;
  whatsapp?: string;
  email?: string;
  address?: string;
  city?: string;
  state?: string;
  checkInTime: string;
  checkOutTime: string;
  cancellationPolicy?: string;
  houseRules?: string;
  isDemo?: boolean;
  createdAt: string;
}

export interface TenantOperatorSession {
  tenantId: string;
  tenantSlug: string;
  tenantName: string;
  email: string;
  role: UserRole;
  authenticatedAt: string;
}

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  role: UserRole;
  tenantId: string;
  createdAt: string;
}

export interface Accommodation {
  id: string;
  tenantId: string;
  name: string;
  type: AccommodationType;
  pricingMode: PricingMode;
  basePrice: number;
  weekendPrice?: number;
  capacity: number;
  bedsCount: number;
  description?: string;
  amenities?: string; // Comma-separated amenities
  imageUrl?: string;
  rules?: string;
  active: boolean;
  createdAt: string;
}

export interface ReservableUnit {
  id: string;
  tenantId: string;
  accommodationId: string;
  label: string;
  unitType: 'room' | 'bed';
  status: 'active' | 'maintenance';
  createdAt: string;
}

export interface AvailabilitySlot {
  id: string; // {tenantId}_{unitId}_{date}
  tenantId: string;
  accommodationId: string;
  unitId: string;
  date: string; // YYYY-MM-DD
  status: AvailabilityStatus;
  customPrice?: number;
  reservationId?: string;
  blockReason?: string;
  expiresAt?: string;
  updatedAt: string;
}

export interface RatePlan {
  id: string;
  tenantId: string;
  accommodationId: string; // 'ALL' or specific accommodationId
  name: string;
  ruleType:
    | 'special_period'
    | 'holiday'
    | 'high_season'
    | 'low_season'
    | 'weekend'
    | 'promotion';
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  priceModifierType: 'fixed' | 'percentage_increase' | 'percentage_discount';
  value: number;
  priority: number; // Higher number = higher priority
  active: boolean;
  createdAt: string;
}

export interface Reservation {
  id: string;
  code: string;
  tenantId: string;
  accommodationId: string;
  accommodationName: string;
  unitIdsCsv: string;
  unitLabelsCsv: string;
  guestId: string;
  guestName: string;
  guestEmail: string;
  guestPhone: string;
  checkIn: string; // YYYY-MM-DD
  checkOut: string; // YYYY-MM-DD
  nights: number;
  guestsCount: number;
  totalAmount: number;
  paidAmount: number;
  paymentMethod: PaymentMethod;
  paymentModality: PaymentModality;
  status: ReservationStatus;
  idempotencyKey: string;
  isSimulatedPayment: boolean;
  notes?: string;
  createdAt: string;
}

export interface GuestRecord {
  id: string;
  tenantId: string;
  fullName: string;
  email: string;
  phone: string;
  documentNumber?: string;
  city?: string;
  lgpdConsent: boolean;
  staysCount: number;
  createdAt: string;
}

export interface PaymentRecord {
  id: string;
  tenantId: string;
  reservationId: string;
  reservationCode: string;
  amount: number;
  method: PaymentMethod;
  modality: PaymentModality;
  status: 'pending' | 'paid' | 'refunded' | 'failed';
  externalRef: string;
  isSimulated: boolean;
  createdAt: string;
}

export interface AuditLog {
  id: string;
  tenantId: string;
  actorUid: string;
  actorEmail: string;
  action: string;
  targetType: string;
  targetId: string;
  details: string;
  createdAt: string;
}

export interface NightPriceBreakdown {
  date: string;
  unitPrice: number;
  totalForNight: number;
  appliedRuleName: string;
}

export interface QuoteSummary {
  nights: number;
  breakdown: NightPriceBreakdown[];
  totalAmount: number;
  availableUnits: ReservableUnit[];
  isAvailable: boolean;
  unavailableReason?: string;
}

export interface SaaSPlanSpec {
  id: SaaSPlanId;
  name: string;
  audience: string;
  monthlyPrice: number;
  maxAccommodations: number;
  maxUnits: number;
  maxUsers: number;
  features: string[];
}
