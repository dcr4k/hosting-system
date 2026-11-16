import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  setDoc,
  where,
  writeBatch,
} from 'firebase/firestore';
import {auth, db, handleFirestoreError, OperationType} from '../firebase';
import {
  Accommodation,
  AuditLog,
  ReservableUnit,
  SaaSPlanId,
  SaaSPlanSpec,
  Tenant,
  TenantCategory,
  TenantThemeVariant,
} from '../types/models';

export const SAAS_PLANS: SaaSPlanSpec[] = [
  {
    id: 'starter',
    name: 'Plano Inicial',
    audience: 'Pousadas compactas e hostels independentes',
    monthlyPrice: 189,
    maxAccommodations: 6,
    maxUnits: 25,
    maxUsers: 3,
    features: [
      'Portal Público de Reservas Personalizável',
      'Motor de Disponibilidade por Quarto e Cama',
      'Calendário Interativo + Cadastro Rápido',
      'Comprovantes com WhatsApp e Google Calendar',
    ],
  },
  {
    id: 'pro',
    name: 'Plano Profissional',
    audience: 'Hotéis boutique, pousadas estruturadas e design hostels',
    monthlyPrice: 389,
    maxAccommodations: 25,
    maxUnits: 120,
    maxUsers: 12,
    features: [
      'Tudo do Plano Inicial',
      'Tarifas Sazonais Inteligentes e Regras de Prioridade',
      'Relatórios Financeiros + Exportação CSV',
      'Controle RBAC de Gerentes e Recepção (LGPD)',
    ],
  },
  {
    id: 'enterprise',
    name: 'Plano Avançado',
    audience: 'Redes hoteleiras e grupos multiestabelecimento',
    monthlyPrice: 749,
    maxAccommodations: 100,
    maxUnits: 500,
    maxUsers: 50,
    features: [
      'Tudo do Plano Profissional',
      'Múltiplas Unidades e Auditoria Completa de Operações',
      'Preparação para Domínio Personalizado e Webhooks PIX/Cartão',
      'SLA Prioritário Digit4lKey',
    ],
  },
];

export const DEMO_IMAGES = {
  hero: '/src/assets/images/hero_resort_architecture_1794787489684.jpg',
  masterSuite: '/src/assets/images/room_master_suite_1794787490836.jpg',
  familyChalet: '/src/assets/images/room_family_chalet_1794787491521.jpg',
  sharedDorm: '/src/assets/images/dorm_shared_modern_1794787493217.jpg',
  singleStudio: '/src/assets/images/room_single_studio_1794787494282.jpg',
};

export function generateOwnerPassword(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789';
  let suffix = '';
  for (let i = 0; i < 6; i++) {
    suffix += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `Stay@${suffix}`;
}

const LEGACY_DEMO_IDS = [
  'demo-vila-atlantica',
  'demo-serra-azul',
  'demo-hostel-sp',
];

/**
 * Automatically purges the 3 legacy auto-seeded demo establishments if they exist in Firestore,
 * ensuring the Platform Admin starts with a clean database containing only real registered establishments.
 */
export async function purgeLegacyDemoTenants(): Promise<void> {
  try {
    for (const legacyId of LEGACY_DEMO_IDS) {
      const snap = await getDoc(doc(db, 'tenants', legacyId));
      if (snap.exists()) {
        await deleteTenantCompletely(legacyId);
      }
    }
  } catch (err) {
    console.warn('Cleanup of legacy demo tenants skipped:', err);
  }
}

export async function provisionNewTenant(params: {
  name: string;
  slug: string;
  category: TenantCategory;
  plan: SaaSPlanId;
  ownerEmail: string;
  ownerPassword: string;
  city: string;
  state: string;
  primaryColor: string;
  themeVariant?: TenantThemeVariant;
  phone: string;
}): Promise<Tenant> {
  const cleanSlug = params.slug
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 75);
  const tenantId = `tnt_${cleanSlug}`;
  const nowIso = new Date().toISOString();

  const existing = await getDoc(doc(db, 'tenants', tenantId));
  if (existing.exists()) {
    return existing.data() as Tenant;
  }

  const finalEmail =
    params.ownerEmail.trim().toLowerCase() || `gestor@${cleanSlug}.com.br`;
  const finalPassword =
    params.ownerPassword.trim() || generateOwnerPassword();

  const newTenant: Tenant = {
    id: tenantId,
    slug: cleanSlug,
    name: params.name.trim().slice(0, 140),
    category: params.category,
    status: 'active',
    plan: params.plan,
    ownerUid: `owner_${cleanSlug}`,
    ownerEmail: finalEmail.slice(0, 160),
    ownerPassword: finalPassword.slice(0, 100),
    primaryColor: params.primaryColor || '#0F172A',
    themeVariant: params.themeVariant || 'classic_light',
    heroImageUrl: DEMO_IMAGES.hero,
    tagline: `Hospedagem e reservas diretas em ${params.city} - ${params.state}`,
    description: `Bem-vindo ao portal oficial de reservas do ${params.name}. Consulte disponibilidade em tempo real e garanta sua estadia com tarifa direta.`,
    phone: params.phone.trim().slice(0, 40),
    whatsapp: params.phone.replace(/\D/g, '').slice(0, 30),
    email: finalEmail.slice(0, 160),
    address: `Centro, ${params.city}`,
    city: params.city.trim().slice(0, 100),
    state: params.state.trim().slice(0, 50),
    checkInTime: '14:00',
    checkOutTime: '12:00',
    cancellationPolicy: 'Cancelamento gratuito até 7 dias antes do check-in.',
    houseRules: 'Check-in mediante apresentação de documento oficial com foto.',
    isDemo: false,
    createdAt: nowIso,
  };

  const defaultAccId = `acc_${cleanSlug}_standard`;
  const defaultAcc: Accommodation = {
    id: defaultAccId,
    tenantId,
    name: 'Suíte Standard Casal',
    type: 'double_room',
    pricingMode: 'per_room',
    basePrice: 350,
    weekendPrice: 420,
    capacity: 2,
    bedsCount: 1,
    description:
      'Quarto privativo confortável equipado com cama de casal, ar-condicionado, Wi-Fi e banheiro privativo.',
    amenities: 'Ar-Condicionado, Wi-Fi, Smart TV, Banheiro Privativo, Café da Manhã',
    imageUrl: DEMO_IMAGES.masterSuite,
    rules: 'Ocupação máxima de 2 hóspedes.',
    active: true,
    createdAt: nowIso,
  };

  const batch = writeBatch(db);
  batch.set(doc(db, 'tenants', tenantId), newTenant);
  batch.set(doc(db, 'accommodations', defaultAccId), defaultAcc);

  for (let i = 1; i <= 3; i++) {
    const unitId = `unit_${cleanSlug}_10${i}`;
    batch.set(doc(db, 'units', unitId), {
      id: unitId,
      tenantId,
      accommodationId: defaultAccId,
      label: `Quarto 10${i}`,
      unitType: 'room',
      status: 'active',
      createdAt: nowIso,
    } satisfies ReservableUnit);
  }

  const auditId = `aud_prov_${cleanSlug}_${Date.now()}`.slice(0, 110);
  batch.set(doc(db, 'audit_logs', auditId), {
    id: auditId,
    tenantId,
    actorUid: auth.currentUser?.uid || 'platform_admin',
    actorEmail: auth.currentUser?.email || 'digit4lkey@gmail.com',
    action: 'TENANT_PROVISIONED',
    targetType: 'tenant',
    targetId: tenantId,
    details: `Estabelecimento "${newTenant.name}" registrado pelo Administrador Geral com credenciais exclusivas (${finalEmail}).`,
    createdAt: nowIso,
  } satisfies AuditLog);

  try {
    await batch.commit();
    return newTenant;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, 'tenants');
  }
}

export async function updateTenantOwnerCredentials(params: {
  tenant: Tenant;
  ownerEmail: string;
  ownerPassword: string;
}): Promise<void> {
  const cleanEmail = params.ownerEmail.trim().toLowerCase().slice(0, 160);
  const cleanPassword = params.ownerPassword.trim().slice(0, 100);
  try {
    await setDoc(doc(db, 'tenants', params.tenant.id), {
      ...params.tenant,
      ownerEmail: cleanEmail,
      ownerPassword: cleanPassword,
    });
    await setDoc(doc(db, 'audit_logs', `aud_cred_${Date.now()}`), {
      id: `aud_cred_${Date.now()}`,
      tenantId: params.tenant.id,
      actorUid: auth.currentUser?.uid || 'platform_admin',
      actorEmail: auth.currentUser?.email || 'digit4lkey@gmail.com',
      action: 'TENANT_CREDENTIALS_UPDATED',
      targetType: 'tenant',
      targetId: params.tenant.id,
      details: `Credenciais de acesso (e-mail/senha) do proprietário atualizadas para ${cleanEmail}.`,
      createdAt: new Date().toISOString(),
    } satisfies AuditLog);
  } catch (error) {
    handleFirestoreError(
      error,
      OperationType.UPDATE,
      `tenants/${params.tenant.id}`
    );
  }
}

export async function deleteTenantCompletely(tenantId: string): Promise<void> {
  const collectionsToClean = [
    'accommodations',
    'units',
    'availability',
    'rate_plans',
    'reservations',
    'guests',
    'payments',
    'audit_logs',
  ];

  try {
    for (const colName of collectionsToClean) {
      const snap = await getDocs(
        query(collection(db, colName), where('tenantId', '==', tenantId))
      );
      if (!snap.empty) {
        const delBatch = writeBatch(db);
        snap.docs.forEach((d) => delBatch.delete(d.ref));
        await delBatch.commit();
      }
    }

    const finalBatch = writeBatch(db);
    finalBatch.delete(doc(db, 'tenants', tenantId));
    await finalBatch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `tenants/${tenantId}`);
  }
}
