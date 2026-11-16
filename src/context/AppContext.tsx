import React, {createContext, useContext, useEffect, useMemo, useState} from 'react';
import {onAuthStateChanged, User} from 'firebase/auth';
import {
  collection,
  doc,
  getDoc,
  onSnapshot,
  query,
  setDoc,
  where,
} from 'firebase/firestore';
import {
  auth,
  db,
  googleProvider,
  handleFirestoreError,
  OperationType,
  signInWithPopup,
  signOut,
} from '../firebase';
import {purgeLegacyDemoTenants} from '../services/tenantProvisioning';
import {
  Accommodation,
  AuditLog,
  AvailabilitySlot,
  GuestRecord,
  PaymentRecord,
  RatePlan,
  ReservableUnit,
  Reservation,
  Tenant,
  TenantOperatorSession,
  UserProfile,
  UserRole,
} from '../types/models';

export type EnvironmentView = 'guest_portal' | 'tenant_admin' | 'platform_admin';

const PLATFORM_ADMIN_EMAIL = 'digit4lkey@gmail.com';
const TENANT_SESSION_STORAGE_KEY = 'stayos_tenant_operator_session_v2';
const LEGACY_DEMO_IDS = new Set([
  'demo-vila-atlantica',
  'demo-serra-azul',
  'demo-hostel-sp',
]);

interface AppContextValue {
  firebaseUser: User | null;
  userProfile: UserProfile | null;
  tenantOperatorSession: TenantOperatorSession | null;
  activeRole: UserRole;
  isPlatformAdmin: boolean;
  canManageActiveTenant: boolean;
  environment: EnvironmentView;
  setEnvironment: (env: EnvironmentView) => void;
  tenants: Tenant[];
  activeTenantId: string;
  setActiveTenantId: (tenantId: string) => void;
  activeTenant: Tenant | null;
  navigateToTenantPortal: (slugOrId: string) => void;
  navigateToTenantAdmin: (slugOrId: string) => void;
  getGuestPortalUrl: (slug: string) => string;
  getTenantAdminUrl: (slug: string) => string;
  accommodations: Accommodation[];
  units: ReservableUnit[];
  availabilitySlots: AvailabilitySlot[];
  ratePlans: RatePlan[];
  reservations: Reservation[];
  guests: GuestRecord[];
  payments: PaymentRecord[];
  auditLogs: AuditLog[];
  isLoading: boolean;
  loginWithGoogle: () => Promise<void>;
  loginTenantWithCredentials: (
    email: string,
    password: string,
    preferredTenantId?: string
  ) => {success: boolean; error?: string; tenant?: Tenant};
  logout: () => Promise<void>;
}

const AppContext = createContext<AppContextValue | undefined>(undefined);

function parseRouteFromLocation(): {
  env: EnvironmentView;
  slugOrId: string | null;
} {
  const hash = window.location.hash || '';
  const searchParams = new URLSearchParams(window.location.search);
  const queryTenant = searchParams.get('tenant');

  if (hash.startsWith('#/platform')) {
    return {env: 'platform_admin', slugOrId: null};
  }
  if (hash.startsWith('#/admin/')) {
    const slug = decodeURIComponent(
      hash.replace('#/admin/', '').split('?')[0].trim()
    );
    return {env: 'tenant_admin', slugOrId: slug || null};
  }
  if (hash === '#/admin') {
    return {env: 'tenant_admin', slugOrId: queryTenant};
  }
  if (hash.startsWith('#/s/')) {
    const slug = decodeURIComponent(
      hash.replace('#/s/', '').split('?')[0].trim()
    );
    return {env: 'guest_portal', slugOrId: slug || null};
  }
  return {env: 'guest_portal', slugOrId: queryTenant};
}

function loadSavedTenantSession(): TenantOperatorSession | null {
  try {
    const raw = localStorage.getItem(TENANT_SESSION_STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as TenantOperatorSession;
  } catch {
    return null;
  }
}

export const AppProvider: React.FC<{children: React.ReactNode}> = ({
  children,
}) => {
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [tenantOperatorSession, setTenantOperatorSession] =
    useState<TenantOperatorSession | null>(() => loadSavedTenantSession());

  const [environment, setEnvironment] = useState<EnvironmentView>(() =>
    parseRouteFromLocation().env
  );
  const [requestedSlugOrId, setRequestedSlugOrId] = useState<string | null>(
    () => parseRouteFromLocation().slugOrId
  );

  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [activeTenantId, setActiveTenantId] = useState<string>('');

  const [accommodations, setAccommodations] = useState<Accommodation[]>([]);
  const [units, setUnits] = useState<ReservableUnit[]>([]);
  const [availabilitySlots, setAvailabilitySlots] = useState<
    AvailabilitySlot[]
  >([]);
  const [ratePlans, setRatePlans] = useState<RatePlan[]>([]);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [guests, setGuests] = useState<GuestRecord[]>([]);
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);

  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Listen to URL hash changes so direct establishment links (#/s/slug or #/admin/slug) resolve automatically
  useEffect(() => {
    const handleHashChange = () => {
      const parsed = parseRouteFromLocation();
      setEnvironment(parsed.env);
      if (parsed.slugOrId) {
        setRequestedSlugOrId(parsed.slugOrId);
      }
    };
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  // Resolve requestedSlugOrId against loaded tenants list
  useEffect(() => {
    if (tenants.length === 0) {
      if (activeTenantId !== '') setActiveTenantId('');
      return;
    }
    if (requestedSlugOrId) {
      const matched = tenants.find(
        (t) =>
          t.slug.toLowerCase() === requestedSlugOrId.toLowerCase() ||
          t.id.toLowerCase() === requestedSlugOrId.toLowerCase()
      );
      if (matched && matched.id !== activeTenantId) {
        setActiveTenantId(matched.id);
        return;
      }
    }
    if (tenantOperatorSession) {
      const sessionMatch = tenants.find(
        (t) => t.id === tenantOperatorSession.tenantId
      );
      if (sessionMatch && !requestedSlugOrId && activeTenantId !== sessionMatch.id) {
        setActiveTenantId(sessionMatch.id);
        return;
      }
    }
    if (!tenants.some((t) => t.id === activeTenantId)) {
      setActiveTenantId(tenants[0].id);
    }
  }, [tenants, requestedSlugOrId, activeTenantId, tenantOperatorSession]);

  // Auth state listener (for Platform Admin digit4lkey@gmail.com)
  useEffect(() => {
    let mounted = true;

    const unsubAuth = onAuthStateChanged(auth, async (user) => {
      if (!mounted) return;
      setFirebaseUser(user);
      if (user) {
        try {
          const isSuperAdmin =
            user.email?.toLowerCase() === PLATFORM_ADMIN_EMAIL &&
            user.emailVerified;
          const userRef = doc(db, 'users', user.uid);
          const snap = await getDoc(userRef);

          if (snap.exists()) {
            const prof = snap.data() as UserProfile;
            if (isSuperAdmin && prof.role !== 'platform_admin') {
              const promoted: UserProfile = {
                ...prof,
                role: 'platform_admin',
              };
              await setDoc(userRef, promoted);
              setUserProfile(promoted);
            } else {
              setUserProfile(prof);
            }
          } else {
            const newProfile: UserProfile = {
              uid: user.uid,
              email: (user.email || '').toLowerCase().slice(0, 160),
              displayName: (user.displayName || 'Administrador').slice(0, 140),
              role: isSuperAdmin ? 'platform_admin' : 'guest',
              tenantId: 'platform',
              createdAt: new Date().toISOString(),
            };
            await setDoc(userRef, newProfile);
            setUserProfile(newProfile);
          }

          if (isSuperAdmin) {
            // Automatically delete any leftover legacy demo establishments
            await purgeLegacyDemoTenants();
            // If no specific establishment link was requested in the URL hash, open Platform Admin directly
            const currentHash = window.location.hash || '';
            if (!currentHash.startsWith('#/s/') && !currentHash.startsWith('#/admin/')) {
              setEnvironment('platform_admin');
              window.location.hash = '#/platform';
            }
          }
        } catch (error) {
          console.error('Profile sync error:', error);
        }
      } else {
        setUserProfile(null);
      }
    });

    return () => {
      mounted = false;
      unsubAuth();
    };
  }, []);

  // Subscribe to real tenants (filtering out any legacy demo IDs)
  useEffect(() => {
    const qTenants = query(
      collection(db, 'tenants'),
      where('status', 'in', ['active', 'suspended', 'onboarding'])
    );
    const unsub = onSnapshot(
      qTenants,
      (snap) => {
        const list = snap.docs
          .map((d) => d.data() as Tenant)
          .filter((t) => !LEGACY_DEMO_IDS.has(t.id) && !t.isDemo);
        list.sort((a, b) => a.name.localeCompare(b.name));
        setTenants(list);
        setIsLoading(false);
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, 'tenants');
      }
    );
    return () => unsub();
  }, []);

  const activeTenant = useMemo(
    () => tenants.find((t) => t.id === activeTenantId) || null,
    [tenants, activeTenantId]
  );

  // Strict Production Permissions Calculation
  const isPlatformAdmin = useMemo(() => {
    if (!firebaseUser) return false;
    const isVerifiedMasterEmail =
      firebaseUser.email?.toLowerCase() === PLATFORM_ADMIN_EMAIL &&
      firebaseUser.emailVerified;
    return isVerifiedMasterEmail || userProfile?.role === 'platform_admin';
  }, [firebaseUser, userProfile]);

  const canManageActiveTenant = useMemo(() => {
    if (!activeTenant) return false;
    if (isPlatformAdmin) return true;
    // Check E-mail + Senha session for this specific establishment
    if (
      tenantOperatorSession &&
      tenantOperatorSession.tenantId === activeTenant.id
    ) {
      return true;
    }
    // Check Google Auth fallback if owner uses Google with the same email
    if (firebaseUser) {
      const userEmail = firebaseUser.email?.toLowerCase();
      if (
        firebaseUser.emailVerified &&
        userEmail &&
        activeTenant.ownerEmail?.toLowerCase() === userEmail
      ) {
        return true;
      }
    }
    return false;
  }, [activeTenant, isPlatformAdmin, tenantOperatorSession, firebaseUser]);

  const activeRole: UserRole = useMemo(() => {
    if (isPlatformAdmin) return 'platform_admin';
    if (canManageActiveTenant) {
      return tenantOperatorSession?.role || 'tenant_owner';
    }
    return 'guest';
  }, [isPlatformAdmin, canManageActiveTenant, tenantOperatorSession]);

  // Subscribe to activeTenantId operational collections (strictly isolated)
  useEffect(() => {
    if (!activeTenantId) {
      setAccommodations([]);
      setUnits([]);
      setAvailabilitySlots([]);
      setRatePlans([]);
      setReservations([]);
      setPayments([]);
      setAuditLogs([]);
      setGuests([]);
      return;
    }

    const unsubAcc = onSnapshot(
      query(
        collection(db, 'accommodations'),
        where('tenantId', '==', activeTenantId)
      ),
      (snap) => {
        const items = snap.docs.map((d) => d.data() as Accommodation);
        items.sort((a, b) => a.name.localeCompare(b.name));
        setAccommodations(items);
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'accommodations')
    );

    const unsubUnits = onSnapshot(
      query(collection(db, 'units'), where('tenantId', '==', activeTenantId)),
      (snap) => {
        const items = snap.docs.map((d) => d.data() as ReservableUnit);
        items.sort((a, b) => a.label.localeCompare(b.label));
        setUnits(items);
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'units')
    );

    const unsubAvail = onSnapshot(
      query(
        collection(db, 'availability'),
        where('tenantId', '==', activeTenantId)
      ),
      (snap) => {
        setAvailabilitySlots(
          snap.docs.map((d) => d.data() as AvailabilitySlot)
        );
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'availability')
    );

    const unsubRates = onSnapshot(
      query(
        collection(db, 'rate_plans'),
        where('tenantId', '==', activeTenantId)
      ),
      (snap) => {
        const items = snap.docs.map((d) => d.data() as RatePlan);
        items.sort((a, b) => b.priority - a.priority);
        setRatePlans(items);
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'rate_plans')
    );

    const unsubRes = onSnapshot(
      query(
        collection(db, 'reservations'),
        where('tenantId', '==', activeTenantId)
      ),
      (snap) => {
        const items = snap.docs.map((d) => d.data() as Reservation);
        items.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
        setReservations(items);
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'reservations')
    );

    const unsubPayments = onSnapshot(
      query(collection(db, 'payments'), where('tenantId', '==', activeTenantId)),
      (snap) => {
        const items = snap.docs.map((d) => d.data() as PaymentRecord);
        items.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
        setPayments(items);
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'payments')
    );

    const unsubAudit = onSnapshot(
      query(
        collection(db, 'audit_logs'),
        where('tenantId', '==', activeTenantId)
      ),
      (snap) => {
        const items = snap.docs.map((d) => d.data() as AuditLog);
        items.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
        setAuditLogs(items);
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'audit_logs')
    );

    let unsubGuests = () => {};
    if (canManageActiveTenant) {
      unsubGuests = onSnapshot(
        query(collection(db, 'guests'), where('tenantId', '==', activeTenantId)),
        (snap) => {
          const items = snap.docs.map((d) => d.data() as GuestRecord);
          items.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
          setGuests(items);
        },
        (err) => console.warn('Guest access restricted:', err)
      );
    } else {
      setGuests([]);
    }

    return () => {
      unsubAcc();
      unsubUnits();
      unsubAvail();
      unsubRates();
      unsubRes();
      unsubPayments();
      unsubAudit();
      unsubGuests();
    };
  }, [activeTenantId, canManageActiveTenant]);

  const navigateToTenantPortal = (slugOrId: string) => {
    const matched = tenants.find(
      (t) => t.slug === slugOrId || t.id === slugOrId
    );
    const slug = matched ? matched.slug : slugOrId;
    if (matched) setActiveTenantId(matched.id);
    setRequestedSlugOrId(slug);
    setEnvironment('guest_portal');
    window.location.hash = `#/s/${slug}`;
  };

  const navigateToTenantAdmin = (slugOrId: string) => {
    const matched = tenants.find(
      (t) => t.slug === slugOrId || t.id === slugOrId
    );
    const slug = matched ? matched.slug : slugOrId;
    if (matched) setActiveTenantId(matched.id);
    setRequestedSlugOrId(slug);
    setEnvironment('tenant_admin');
    window.location.hash = `#/admin/${slug}`;
  };

  const getGuestPortalUrl = (slug: string) => {
    const base = window.location.origin + window.location.pathname;
    return `${base}#/s/${slug}`;
  };

  const getTenantAdminUrl = (slug: string) => {
    const base = window.location.origin + window.location.pathname;
    return `${base}#/admin/${slug}`;
  };

  const loginWithGoogle = async () => {
    await signInWithPopup(auth, googleProvider);
  };

  const loginTenantWithCredentials = (
    email: string,
    password: string,
    preferredTenantId?: string
  ): {success: boolean; error?: string; tenant?: Tenant} => {
    const cleanEmail = email.trim().toLowerCase();
    const cleanPassword = password.trim();

    if (!cleanEmail || !cleanPassword) {
      return {
        success: false,
        error: 'Informe o e-mail e a senha de acesso do estabelecimento.',
      };
    }

    // Prioritize matching against the currently active/requested tenant first, then any tenant
    const candidates = preferredTenantId
      ? [
          ...tenants.filter((t) => t.id === preferredTenantId),
          ...tenants.filter((t) => t.id !== preferredTenantId),
        ]
      : tenants;

    const matched = candidates.find(
      (t) =>
        t.ownerEmail?.toLowerCase() === cleanEmail &&
        t.ownerPassword === cleanPassword
    );

    if (!matched) {
      return {
        success: false,
        error:
          'E-mail ou senha inválidos. Verifique as credenciais geradas pelo Administrador Geral.',
      };
    }

    if (matched.status === 'suspended') {
      return {
        success: false,
        error: `O estabelecimento "${matched.name}" encontra-se desativado pelo Administrador Geral.`,
      };
    }

    const session: TenantOperatorSession = {
      tenantId: matched.id,
      tenantSlug: matched.slug,
      tenantName: matched.name,
      email: cleanEmail,
      role: 'tenant_owner',
      authenticatedAt: new Date().toISOString(),
    };

    localStorage.setItem(TENANT_SESSION_STORAGE_KEY, JSON.stringify(session));
    setTenantOperatorSession(session);
    setActiveTenantId(matched.id);
    setRequestedSlugOrId(matched.slug);
    setEnvironment('tenant_admin');
    window.location.hash = `#/admin/${matched.slug}`;

    return {success: true, tenant: matched};
  };

  const logout = async () => {
    localStorage.removeItem(TENANT_SESSION_STORAGE_KEY);
    setTenantOperatorSession(null);
    if (auth.currentUser) {
      await signOut(auth);
    }
    if (activeTenant) {
      setEnvironment('guest_portal');
      window.location.hash = `#/s/${activeTenant.slug}`;
    } else {
      setEnvironment('platform_admin');
      window.location.hash = '#/platform';
    }
  };

  return (
    <AppContext.Provider
      value={{
        firebaseUser,
        userProfile,
        tenantOperatorSession,
        activeRole,
        isPlatformAdmin,
        canManageActiveTenant,
        environment,
        setEnvironment,
        tenants,
        activeTenantId,
        setActiveTenantId,
        activeTenant,
        navigateToTenantPortal,
        navigateToTenantAdmin,
        getGuestPortalUrl,
        getTenantAdminUrl,
        accommodations,
        units,
        availabilitySlots,
        ratePlans,
        reservations,
        guests,
        payments,
        auditLogs,
        isLoading,
        loginWithGoogle,
        loginTenantWithCredentials,
        logout,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) {
    throw new Error('useApp must be used inside AppProvider');
  }
  return ctx;
}
