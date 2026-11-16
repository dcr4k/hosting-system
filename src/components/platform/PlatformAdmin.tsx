import React, {useMemo, useState} from 'react';
import {
  Building2,
  Check,
  CheckCircle2,
  Copy,
  Eye,
  EyeOff,
  ExternalLink,
  KeyRound,
  Lock,
  LogIn,
  Plus,
  Power,
  RefreshCw,
  ShieldCheck,
  Trash2,
  X,
} from 'lucide-react';
import {doc, setDoc} from 'firebase/firestore';
import {TENANT_THEMES} from '../../constants/branding';
import {useApp} from '../../context/AppContext';
import {auth, db} from '../../firebase';
import {
  deleteTenantCompletely,
  generateOwnerPassword,
  provisionNewTenant,
  SAAS_PLANS,
  updateTenantOwnerCredentials,
} from '../../services/tenantProvisioning';
import {
  SaaSPlanId,
  Tenant,
  TenantCategory,
  TenantThemeVariant,
} from '../../types/models';
import {LocationUfCitySelector} from '../common/LocationUfCitySelector';
import {ThemePaletteSelector} from '../common/ThemePaletteSelector';

export const PlatformAdmin: React.FC = () => {
  const {
    tenants,
    activeTenantId,
    setActiveTenantId,
    navigateToTenantPortal,
    navigateToTenantAdmin,
    getGuestPortalUrl,
    getTenantAdminUrl,
    setEnvironment,
    auditLogs,
    isPlatformAdmin,
    firebaseUser,
    loginWithGoogle,
  } = useApp();

  const [isProvisioningModalOpen, setIsProvisioningModalOpen] = useState(false);
  const [tenantToDelete, setTenantToDelete] = useState<Tenant | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [copiedLinkKey, setCopiedLinkKey] = useState<string | null>(null);
  const [visiblePasswords, setVisiblePasswords] = useState<
    Record<string, boolean>
  >({});

  // Edit Owner Credentials Modal State
  const [editingCredsTenant, setEditingCredsTenant] = useState<Tenant | null>(
    null
  );
  const [editEmail, setEditEmail] = useState('');
  const [editPassword, setEditPassword] = useState('');
  const [isSavingCreds, setIsSavingCreds] = useState(false);

  // Provisioning Form State
  const [newName, setNewName] = useState('');
  const [newSlug, setNewSlug] = useState('');
  const [newCategory, setNewCategory] = useState<TenantCategory>('pousada');
  const [newPlan, setNewPlan] = useState<SaaSPlanId>('pro');
  const [credMode, setCredMode] = useState<'auto' | 'manual'>('auto');
  const [newOwnerEmail, setNewOwnerEmail] = useState('');
  const [newOwnerPassword, setNewOwnerPassword] = useState(() =>
    generateOwnerPassword()
  );
  const [newCity, setNewCity] = useState('São Paulo');
  const [newState, setNewState] = useState('SP');
  const [newPhone, setNewPhone] = useState('+55 11 99999-0000');
  const [newColor, setNewColor] = useState('#005DA6');
  const [newThemeVariant, setNewThemeVariant] =
    useState<TenantThemeVariant>('classic_light');
  const [isProvisioning, setIsProvisioning] = useState(false);
  const [provisionFeedback, setProvisionFeedback] = useState<string | null>(
    null
  );

  const metrics = useMemo(() => {
    const activeCount = tenants.filter((t) => t.status === 'active').length;
    const suspendedCount = tenants.filter(
      (t) => t.status === 'suspended'
    ).length;

    const planPrices: Record<SaaSPlanId, number> = {
      starter: 189,
      pro: 389,
      enterprise: 749,
    };
    const mrr = tenants
      .filter((t) => t.status === 'active')
      .reduce((acc, t) => acc + (planPrices[t.plan] || 189), 0);

    return {
      total: tenants.length,
      activeCount,
      suspendedCount,
      mrr,
    };
  }, [tenants]);

  const handleCopyText = async (text: string, key: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedLinkKey(key);
      setTimeout(() => setCopiedLinkKey(null), 2500);
    } catch {
      // Fallback
    }
  };

  const openProvisionModal = () => {
    setNewName('');
    setNewSlug('');
    setNewCategory('pousada');
    setNewPlan('pro');
    setNewState('SP');
    setNewCity('São Paulo');
    setNewPhone('+55 11 99999-0000');
    setNewColor('#005DA6');
    setNewThemeVariant('classic_light');
    setCredMode('auto');
    setNewOwnerEmail('');
    setNewOwnerPassword(generateOwnerPassword());
    setIsProvisioningModalOpen(true);
  };

  // Strict Production Authentication Gate — ONLY digit4lkey@gmail.com (isPlatformAdmin)
  if (!isPlatformAdmin) {
    return (
      <div className="max-w-lg mx-auto my-16 px-4">
        <div className="rounded-xl bg-white border border-slate-200 p-8 text-center space-y-5">
          <div className="w-12 h-12 rounded-xl bg-slate-900 flex items-center justify-center mx-auto">
            <Lock className="w-6 h-6 text-white" />
          </div>
          <div className="space-y-2">
            <span className="text-xs font-mono uppercase text-slate-500">
              Ambiente A · Governança Central do SaaS
            </span>
            <h1 className="text-xl font-bold text-slate-900">
              Acesso Exclusivo do Administrador Geral
            </h1>
            <p className="text-xs text-slate-600 leading-relaxed">
              Apenas o proprietário da plataforma (
              <strong className="font-mono text-slate-900">
                digit4lkey@gmail.com
              </strong>
              ) possui autorização para registrar estabelecimentos, gerar as
              credenciais de acesso (e-mail + senha) de cada proprietário e
              ativar/desativar locais cadastrados.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            {!firebaseUser ? (
              <button
                type="button"
                onClick={loginWithGoogle}
                className="h-10 w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-lg bg-slate-900 px-5 text-xs font-semibold text-white hover:bg-slate-800 transition-colors"
              >
                <LogIn className="w-4 h-4 shrink-0" />
                <span>Autenticar como Administrador Geral</span>
              </button>
            ) : (
              <div className="text-xs text-red-800 bg-red-50 border border-red-200 rounded-lg px-4 py-2.5 w-full">
                A conta autenticada (<strong>{firebaseUser.email}</strong>) não
                é o Administrador Geral do SaaS.
              </div>
            )}

            {tenants.length > 0 && (
              <button
                type="button"
                onClick={() => setEnvironment('guest_portal')}
                className="h-10 w-full sm:w-auto inline-flex items-center justify-center rounded-lg border border-slate-300 bg-white px-4 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
              >
                Voltar ao Portal de Reservas
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  const handleToggleTenantStatus = async (tenant: Tenant) => {
    const nextStatus = tenant.status === 'active' ? 'suspended' : 'active';
    await setDoc(doc(db, 'tenants', tenant.id), {
      ...tenant,
      status: nextStatus,
    });
    await setDoc(doc(db, 'audit_logs', `aud_saas_${Date.now()}`), {
      id: `aud_saas_${Date.now()}`,
      tenantId: tenant.id,
      actorUid: auth.currentUser?.uid || 'platform_admin',
      actorEmail: auth.currentUser?.email || 'digit4lkey@gmail.com',
      action:
        nextStatus === 'suspended'
          ? 'SAAS_TENANT_SUSPENDED'
          : 'SAAS_TENANT_REACTIVATED',
      targetType: 'tenant',
      targetId: tenant.id,
      details: `Conta do estabelecimento ${tenant.name} alterada para ${nextStatus} pelo Administrador Geral do SaaS.`,
      createdAt: new Date().toISOString(),
    });
  };

  const handleChangePlan = async (tenant: Tenant, plan: SaaSPlanId) => {
    await setDoc(doc(db, 'tenants', tenant.id), {
      ...tenant,
      plan,
    });
  };

  const handleConfirmDeleteTenant = async () => {
    if (!tenantToDelete) return;
    setIsDeleting(true);
    try {
      const deletedName = tenantToDelete.name;
      const deletedId = tenantToDelete.id;
      await deleteTenantCompletely(deletedId);
      setTenantToDelete(null);
      if (activeTenantId === deletedId) {
        const remaining = tenants.filter((t) => t.id !== deletedId);
        setActiveTenantId(remaining.length > 0 ? remaining[0].id : '');
      }
      setProvisionFeedback(
        `Estabelecimento "${deletedName}" e todos os seus registros vinculados foram removidos permanentemente.`
      );
      setTimeout(() => setProvisionFeedback(null), 5000);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleProvisionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || !newSlug.trim()) return;
    setIsProvisioning(true);
    try {
      const generatedEmail =
        credMode === 'auto'
          ? `gestor@${newSlug.toLowerCase()}.com.br`
          : newOwnerEmail.trim().toLowerCase() ||
            `gestor@${newSlug.toLowerCase()}.com.br`;
      const generatedPass =
        newOwnerPassword.trim() || generateOwnerPassword();

      const created = await provisionNewTenant({
        name: newName,
        slug: newSlug,
        category: newCategory,
        plan: newPlan,
        ownerEmail: generatedEmail,
        ownerPassword: generatedPass,
        city: newCity,
        state: newState,
        primaryColor: newColor,
        themeVariant: newThemeVariant,
        phone: newPhone,
      });
      setIsProvisioningModalOpen(false);
      setActiveTenantId(created.id);
      setVisiblePasswords((prev) => ({...prev, [created.id]: true}));
      setProvisionFeedback(
        `Estabelecimento "${created.name}" criado! Acesso do dono → E-mail: ${created.ownerEmail} | Senha: ${created.ownerPassword} | Painel: #/admin/${created.slug}`
      );
      setTimeout(() => setProvisionFeedback(null), 10000);
    } finally {
      setIsProvisioning(false);
    }
  };

  const handleSaveCredentials = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCredsTenant || !editEmail.trim() || !editPassword.trim())
      return;
    setIsSavingCreds(true);
    try {
      await updateTenantOwnerCredentials({
        tenant: editingCredsTenant,
        ownerEmail: editEmail,
        ownerPassword: editPassword,
      });
      setProvisionFeedback(
        `Credenciais atualizadas para "${editingCredsTenant.name}" (E-mail: ${editEmail.trim().toLowerCase()} | Senha: ${editPassword.trim()}).`
      );
      setEditingCredsTenant(null);
      setTimeout(() => setProvisionFeedback(null), 6000);
    } finally {
      setIsSavingCreds(false);
    }
  };

  return (
    <div className="w-full min-h-screen bg-slate-50 py-8 px-4 sm:px-6">
      <div className="max-w-[1440px] mx-auto space-y-8">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-5">
          <div className="min-w-0">
            <span className="text-xs font-mono uppercase text-slate-500 block">
              Ambiente A · Administração Central do SaaS (Exclusivo
              digit4lkey@gmail.com)
            </span>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 mt-0.5">
              Gestão de Estabelecimentos, Links Exclusivos e Credenciais dos Proprietários
            </h1>
          </div>

          <button
            type="button"
            onClick={openProvisionModal}
            className="h-10 inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 text-xs font-semibold text-white hover:bg-slate-800 transition-colors whitespace-nowrap shrink-0"
          >
            <Plus className="w-4 h-4 shrink-0" />
            <span>Registrar Novo Estabelecimento</span>
          </button>
        </div>

        {provisionFeedback && (
          <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-xs font-semibold text-emerald-900">
            {provisionFeedback}
          </div>
        )}

        {/* Central SaaS KPIs */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          <div className="p-5 rounded-xl bg-white border border-slate-200">
            <span className="text-xs text-slate-500 block">
              Total de Estabelecimentos Cadastrados
            </span>
            <div className="text-2xl font-bold font-mono text-slate-900 mt-1">
              {metrics.total}
            </div>
            <span className="text-xs text-slate-500">
              Ambientes independentes com links próprios
            </span>
          </div>

          <div className="p-5 rounded-xl bg-white border border-slate-200">
            <span className="text-xs text-slate-500 block">Contas Ativas</span>
            <div className="text-2xl font-bold font-mono text-emerald-700 mt-1">
              {metrics.activeCount}
            </div>
            <span className="text-xs text-slate-500">
              Portais públicos e painéis liberados
            </span>
          </div>

          <div className="p-5 rounded-xl bg-white border border-slate-200">
            <span className="text-xs text-slate-500 block">
              Contas Desativadas / Suspensas
            </span>
            <div className="text-2xl font-bold font-mono text-red-600 mt-1">
              {metrics.suspendedCount}
            </div>
            <span className="text-xs text-slate-500">
              Acesso e reservas bloqueados
            </span>
          </div>

          <div className="p-5 rounded-xl bg-white border border-slate-200">
            <span className="text-xs text-slate-500 block">
              MRR SaaS Estimado (Assinaturas Ativas)
            </span>
            <div className="text-2xl font-bold font-mono text-slate-900 mt-1">
              R$ {metrics.mrr.toLocaleString('pt-BR')}/mês
            </div>
            <span className="text-xs text-slate-500">
              Planos Inicial, Profissional e Avançado
            </span>
          </div>
        </div>

        {/* Clients / Establishments List */}
        <div className="rounded-xl bg-white border border-slate-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2 bg-slate-50/70">
            <div className="flex items-center gap-2">
              <Building2 className="w-4 h-4 text-slate-500 shrink-0" />
              <h2 className="text-sm font-bold text-slate-900">
                Estabelecimentos, Links Exclusivos e Acesso (E-mail + Senha) dos Proprietários
              </h2>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-slate-500">
              <ShieldCheck className="w-4 h-4 text-emerald-700 shrink-0" />
              <span>
                Cada estabelecimento possui link de hóspede e painel de controle com login próprio
              </span>
            </div>
          </div>

          {tenants.length === 0 ? (
            <div className="p-12 text-center space-y-4">
              <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center mx-auto">
                <Building2 className="w-6 h-6 text-slate-700" />
              </div>
              <div className="space-y-1 max-w-md mx-auto">
                <h3 className="text-base font-bold text-slate-900">
                  Nenhum estabelecimento cadastrado ainda
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Os estabelecimentos fictícios de demonstração foram removidos.
                  Clique abaixo para cadastrar seu primeiro hotel, pousada ou
                  hostel e gerar o acesso (e-mail + senha) do proprietário.
                </p>
              </div>
              <button
                type="button"
                onClick={openProvisionModal}
                className="h-10 inline-flex items-center gap-2 rounded-lg bg-slate-900 px-5 text-xs font-semibold text-white hover:bg-slate-800 transition-colors"
              >
                <Plus className="w-4 h-4" />
                <span>Cadastrar Primeiro Estabelecimento</span>
              </button>
            </div>
          ) : (
            <div className="divide-y divide-slate-200">
              {tenants.map((t) => {
                const guestUrl = getGuestPortalUrl(t.slug);
                const adminUrl = getTenantAdminUrl(t.slug);
                const showPass = !!visiblePasswords[t.id];
                const accessKitText = [
                  `Estabelecimento: ${t.name}`,
                  `Link Público de Reservas (Hóspede): ${guestUrl}`,
                  `Link do Painel de Controle (Gestor): ${adminUrl}`,
                  `E-mail de Acesso: ${t.ownerEmail || ''}`,
                  `Senha de Acesso: ${t.ownerPassword || '(não definida)'}`,
                ].join('\n');

                return (
                  <div
                    key={t.id}
                    className="p-5 hover:bg-slate-50/50 transition-colors space-y-4 text-xs"
                  >
                    {/* Top Row: Establishment Info + Status + Governance Actions */}
                    <div className="flex flex-wrap items-center justify-between gap-4">
                      <div className="flex items-center gap-3 min-w-0">
                        <span
                          className="w-4 h-4 rounded shrink-0"
                          style={{backgroundColor: t.primaryColor}}
                        />
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-bold text-slate-900">
                              {t.name}
                            </span>
                            <span
                              className={`font-mono uppercase text-[10px] font-bold px-2 py-0.5 rounded ${
                                t.status === 'active'
                                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                  : 'bg-red-50 text-red-700 border border-red-200'
                              }`}
                            >
                              {t.status === 'active' ? 'ATIVO' : 'DESATIVADO'}
                            </span>
                          </div>
                          <div className="text-slate-500 mt-0.5">
                            <span className="capitalize font-medium text-slate-700">
                              {t.category}
                            </span>{' '}
                            · {t.city}/{t.state} · Tel: {t.phone || '—'} · Tema:{' '}
                            <span className="font-medium text-slate-700">
                              {TENANT_THEMES.find(
                                (th) =>
                                  th.id === (t.themeVariant || 'classic_light')
                              )?.name || 'Editorial Claro'}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        <select
                          value={t.plan}
                          onChange={(e) =>
                            handleChangePlan(t, e.target.value as SaaSPlanId)
                          }
                          aria-label="Plano Comercial"
                          className="h-8 rounded-lg border border-slate-300 bg-white px-2.5 font-semibold text-slate-800 text-xs"
                        >
                          <option value="starter">Inicial (R$ 189)</option>
                          <option value="pro">Profissional (R$ 389)</option>
                          <option value="enterprise">Avançado (R$ 749)</option>
                        </select>

                        <button
                          type="button"
                          onClick={() => navigateToTenantPortal(t.slug)}
                          className="h-8 inline-flex items-center gap-1.5 px-3 rounded-lg border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 font-semibold whitespace-nowrap"
                        >
                          <ExternalLink className="w-3.5 h-3.5 shrink-0" />
                          <span>Abrir Portal</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => navigateToTenantAdmin(t.slug)}
                          className="h-8 px-3 rounded-lg border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 font-semibold whitespace-nowrap"
                        >
                          Abrir Painel
                        </button>

                        <button
                          type="button"
                          onClick={() => handleToggleTenantStatus(t)}
                          className={`h-8 inline-flex items-center gap-1.5 px-3 rounded-lg font-semibold whitespace-nowrap ${
                            t.status === 'active'
                              ? 'border border-amber-300 bg-amber-50 text-amber-900 hover:bg-amber-100'
                              : 'bg-emerald-700 text-white hover:bg-emerald-800'
                          }`}
                        >
                          <Power className="w-3.5 h-3.5 shrink-0" />
                          <span>
                            {t.status === 'active' ? 'Desativar' : 'Reativar'}
                          </span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setTenantToDelete(t)}
                          className="h-8 inline-flex items-center gap-1.5 px-3 rounded-lg border border-red-200 text-red-700 hover:bg-red-50 font-semibold whitespace-nowrap"
                        >
                          <Trash2 className="w-3.5 h-3.5 shrink-0" />
                          <span>Remover</span>
                        </button>
                      </div>
                    </div>

                    {/* Bottom Row: Isolated Links & Owner E-mail/Password Credentials Box */}
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 p-3.5 rounded-xl bg-slate-50 border border-slate-200 items-center">
                      {/* Guest Link */}
                      <div className="lg:col-span-4 flex flex-wrap items-center gap-2">
                        <span className="text-[11px] font-semibold text-slate-500">
                          Link Hóspede:
                        </span>
                        <code className="font-mono text-[11px] bg-white border border-slate-200 px-2 py-1 rounded text-slate-800">
                          #/s/{t.slug}
                        </code>
                        <button
                          type="button"
                          onClick={() =>
                            handleCopyText(guestUrl, `guest_${t.id}`)
                          }
                          className="h-7 inline-flex items-center gap-1 px-2.5 rounded border border-slate-300 bg-white text-slate-700 hover:bg-slate-100 font-semibold whitespace-nowrap"
                        >
                          {copiedLinkKey === `guest_${t.id}` ? (
                            <>
                              <Check className="w-3 h-3 text-emerald-700" />
                              <span className="text-emerald-700">Copiado</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3 h-3" />
                              <span>Copiar Link</span>
                            </>
                          )}
                        </button>
                      </div>

                      {/* Owner Credentials (E-mail + Password) */}
                      <div className="lg:col-span-5 flex flex-wrap items-center gap-2">
                        <KeyRound className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                        <span className="text-[11px] font-semibold text-slate-600">
                          Acesso Dono:
                        </span>
                        <code className="font-mono text-[11px] bg-white border border-slate-200 px-2 py-1 rounded text-slate-900">
                          {t.ownerEmail || '—'}
                        </code>
                        <code className="font-mono text-[11px] bg-white border border-slate-200 px-2 py-1 rounded text-slate-900">
                          {t.ownerPassword
                            ? showPass
                              ? t.ownerPassword
                              : '••••••••'
                            : 'Sem senha'}
                        </code>
                        <button
                          type="button"
                          onClick={() =>
                            setVisiblePasswords((prev) => ({
                              ...prev,
                              [t.id]: !prev[t.id],
                            }))
                          }
                          title={showPass ? 'Ocultar senha' : 'Ver senha'}
                          className="h-7 px-2 rounded border border-slate-200 bg-white text-slate-600 hover:bg-slate-100"
                        >
                          {showPass ? (
                            <EyeOff className="w-3.5 h-3.5" />
                          ) : (
                            <Eye className="w-3.5 h-3.5" />
                          )}
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setEditingCredsTenant(t);
                            setEditEmail(
                              t.ownerEmail || `gestor@${t.slug}.com.br`
                            );
                            setEditPassword(
                              t.ownerPassword || generateOwnerPassword()
                            );
                          }}
                          className="h-7 px-2.5 rounded border border-slate-300 bg-white text-slate-700 hover:bg-slate-100 font-medium whitespace-nowrap"
                        >
                          Alterar E-mail/Senha
                        </button>
                      </div>

                      {/* Copy Complete Owner Kit */}
                      <div className="lg:col-span-3 flex lg:justify-end">
                        <button
                          type="button"
                          onClick={() =>
                            handleCopyText(accessKitText, `kit_${t.id}`)
                          }
                          className="h-8 w-full lg:w-auto inline-flex items-center justify-center gap-1.5 px-3 rounded-lg bg-slate-900 text-white hover:bg-slate-800 font-semibold whitespace-nowrap"
                        >
                          {copiedLinkKey === `kit_${t.id}` ? (
                            <>
                              <Check className="w-3.5 h-3.5 text-emerald-400" />
                              <span>Kit de Acesso Copiado!</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3.5 h-3.5" />
                              <span>Copiar Kit de Acesso do Dono</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Commercial Plans Matrix */}
        <div className="space-y-4">
          <h2 className="text-lg font-bold text-slate-900">
            Planos Comerciais e Limites Operacionais
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {SAAS_PLANS.map((plan) => (
              <div
                key={plan.id}
                className="rounded-xl bg-white border border-slate-200 p-6 flex flex-col justify-between space-y-4"
              >
                <div className="space-y-2">
                  <span className="text-xs font-medium text-slate-500">
                    {plan.audience}
                  </span>
                  <h3 className="text-lg font-bold text-slate-900">
                    {plan.name}
                  </h3>
                  <div className="text-2xl font-bold font-mono text-slate-900">
                    R$ {plan.monthlyPrice}
                    <span className="text-xs font-normal text-slate-500">
                      /mês por estabelecimento
                    </span>
                  </div>
                  <div className="pt-2 text-xs text-slate-600 font-mono space-y-1 border-t border-slate-100">
                    <div>
                      Até {plan.maxAccommodations} categorias de acomodação
                    </div>
                    <div>
                      Até {plan.maxUnits} quartos ou camas reserváveis
                    </div>
                    <div>Até {plan.maxUsers} operadores simultâneos</div>
                  </div>
                  <ul className="pt-3 space-y-1.5 text-xs text-slate-700">
                    {plan.features.map((feat) => (
                      <li key={feat} className="flex items-start gap-2">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700 shrink-0 mt-0.5" />
                        <span>{feat}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Audit Logs */}
        {auditLogs.length > 0 && (
          <div className="rounded-xl bg-white border border-slate-200 p-6 space-y-4">
            <h2 className="text-sm font-bold text-slate-900">
              Registro Imutável de Atividades Administrativas (`audit_logs`)
            </h2>
            <div className="divide-y divide-slate-200 text-xs max-h-64 overflow-y-auto">
              {auditLogs.map((log) => (
                <div
                  key={log.id}
                  className="py-2.5 flex flex-wrap items-center justify-between gap-2"
                >
                  <div className="min-w-0">
                    <span className="font-mono font-semibold text-slate-900">
                      [{log.action}]
                    </span>{' '}
                    <span className="text-slate-700">{log.details}</span>
                  </div>
                  <div className="font-mono text-[11px] text-slate-500 shrink-0">
                    {log.actorEmail} · {log.createdAt.slice(0, 19)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Edit Owner Credentials Modal */}
      {editingCredsTenant && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 p-3 sm:p-6">
          <form
            onSubmit={handleSaveCredentials}
            className="w-full max-w-md max-h-[90vh] rounded-xl bg-white border border-slate-200 flex flex-col overflow-hidden text-xs shadow-2xl"
          >
            <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between gap-3 shrink-0">
              <div className="min-w-0">
                <span className="text-[11px] font-mono uppercase text-slate-500 block">
                  Credenciais do Estabelecimento
                </span>
                <h3 className="text-base font-bold text-slate-900 truncate mt-0.5">
                  Acesso do Proprietário — {editingCredsTenant.name}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setEditingCredsTenant(null)}
                className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-200/70 shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  E-mail de Login do Proprietário *
                </label>
                <input
                  type="email"
                  required
                  value={editEmail}
                  onChange={(e) => setEditEmail(e.target.value)}
                  className="h-10 w-full rounded-lg border border-slate-300 px-3 font-mono text-slate-900"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="font-semibold text-slate-700">
                    Senha de Acesso *
                  </label>
                  <button
                    type="button"
                    onClick={() => setEditPassword(generateOwnerPassword())}
                    className="inline-flex items-center gap-1 text-slate-700 hover:underline font-semibold"
                  >
                    <RefreshCw className="w-3 h-3" />
                    <span>Gerar Senha Automática</span>
                  </button>
                </div>
                <input
                  type="text"
                  required
                  value={editPassword}
                  onChange={(e) => setEditPassword(e.target.value)}
                  className="h-10 w-full rounded-lg border border-slate-300 px-3 font-mono text-slate-900"
                />
              </div>
            </div>

            <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex justify-end gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setEditingCredsTenant(null)}
                className="h-9 px-4 rounded-lg border border-slate-300 bg-white font-semibold text-slate-700 hover:bg-slate-50"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isSavingCreds}
                className="h-9 px-5 rounded-lg bg-slate-900 text-white font-semibold hover:bg-slate-800 disabled:opacity-50"
              >
                {isSavingCreds ? 'Salvando...' : 'Salvar E-mail e Senha'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {tenantToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 p-3 sm:p-6">
          <div className="w-full max-w-md max-h-[90vh] rounded-xl bg-white border border-slate-200 flex flex-col overflow-hidden shadow-2xl">
            <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between gap-3 shrink-0">
              <h3 className="text-base font-bold text-slate-900">
                Remover Estabelecimento Permanentemente
              </h3>
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => setTenantToDelete(null)}
                className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-200/70 shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-6">
              <p className="text-xs text-slate-600 leading-relaxed">
                Confirma a exclusão definitiva de{' '}
                <strong>{tenantToDelete.name}</strong> (
                <code className="font-mono">{tenantToDelete.id}</code>) e de
                todas as suas acomodações, unidades e reservas no Cloud
                Firestore?
              </p>
            </div>
            <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex justify-end gap-2 shrink-0">
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => setTenantToDelete(null)}
                className="h-9 px-4 rounded-lg border border-slate-300 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={handleConfirmDeleteTenant}
                className="h-9 px-4 rounded-lg bg-red-600 text-white text-xs font-semibold hover:bg-red-700 disabled:opacity-50"
              >
                {isDeleting ? 'Removendo...' : 'Confirmar Exclusão'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Automated Tenant Provisioning Modal with Predefined Location, 20 Colors, 3 Themes & Scroll-Safe Layout */}
      {isProvisioningModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 p-3 sm:p-6">
          <form
            onSubmit={handleProvisionSubmit}
            className="w-full max-w-3xl max-h-[90vh] rounded-xl bg-white border border-slate-200 flex flex-col overflow-hidden shadow-2xl"
          >
            {/* Fixed Modal Header — Never clips above screen */}
            <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex items-start justify-between gap-4 shrink-0">
              <div className="min-w-0">
                <h3 className="text-base font-bold text-slate-900">
                  Registrar Novo Estabelecimento e Gerar Acesso do Proprietário
                </h3>
                <p className="text-xs text-slate-600 mt-0.5">
                  Cria o ambiente isolado do local (
                  <code className="font-mono">#/s/slug</code>) e configura o
                  login por <strong>E-mail + Senha</strong> para o painel (
                  <code className="font-mono">#/admin/slug</code>).
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsProvisioningModalOpen(false)}
                aria-label="Fechar modal"
                className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-200/70 shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Scrollable Form Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-5 text-xs">
              {/* Section 1: Establishment Basic Data & Location */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div className="sm:col-span-2">
                  <label className="block font-semibold text-slate-700 mb-1.5">
                    Nome do Hotel, Pousada ou Hostel *
                  </label>
                  <input
                    type="text"
                    required
                    value={newName}
                    onChange={(e) => {
                      const val = e.target.value;
                      setNewName(val);
                      const generatedSlug = val
                        .toLowerCase()
                        .normalize('NFD')
                        .replace(/[\u0300-\u036f]/g, '')
                        .replace(/[^a-z0-9]+/g, '-')
                        .replace(/^-|-$/g, '');
                      setNewSlug(generatedSlug);
                      if (credMode === 'auto') {
                        setNewOwnerEmail(
                          generatedSlug
                            ? `gestor@${generatedSlug}.com.br`
                            : ''
                        );
                      }
                    }}
                    placeholder="Ex.: Pousada Solar de Paraty"
                    className="h-10 w-full rounded-lg border border-slate-300 px-3 text-slate-900"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1.5">
                    Identificador do Link (Slug) *
                  </label>
                  <input
                    type="text"
                    required
                    value={newSlug}
                    onChange={(e) => {
                      const s = e.target.value
                        .toLowerCase()
                        .replace(/[^a-z0-9-]/g, '-');
                      setNewSlug(s);
                      if (credMode === 'auto') {
                        setNewOwnerEmail(s ? `gestor@${s}.com.br` : '');
                      }
                    }}
                    placeholder="solar-de-paraty"
                    className="h-10 w-full rounded-lg border border-slate-300 px-3 font-mono text-slate-900"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1.5">
                    Categoria
                  </label>
                  <select
                    value={newCategory}
                    onChange={(e) =>
                      setNewCategory(e.target.value as TenantCategory)
                    }
                    className="h-10 w-full rounded-lg border border-slate-300 px-3 text-slate-900 bg-white"
                  >
                    <option value="hotel">Hotel</option>
                    <option value="pousada">Pousada</option>
                    <option value="hostel">Hostel</option>
                    <option value="resort">Resort</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1.5">
                    Plano Contratado
                  </label>
                  <select
                    value={newPlan}
                    onChange={(e) => setNewPlan(e.target.value as SaaSPlanId)}
                    className="h-10 w-full rounded-lg border border-slate-300 px-3 text-slate-900 bg-white"
                  >
                    <option value="starter">Plano Inicial</option>
                    <option value="pro">Plano Profissional</option>
                    <option value="enterprise">Plano Avançado</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1.5">
                    Telefone / WhatsApp da Recepção
                  </label>
                  <input
                    type="text"
                    value={newPhone}
                    onChange={(e) => setNewPhone(e.target.value)}
                    placeholder="+55 11 99999-0000"
                    className="h-10 w-full rounded-lg border border-slate-300 px-3 font-mono text-slate-900"
                  />
                </div>

                {/* Cascading Predefined State (UF) + City Selectors */}
                <LocationUfCitySelector
                  stateUf={newState}
                  city={newCity}
                  onChangeState={setNewState}
                  onChangeCity={setNewCity}
                  stateFirst
                />
              </div>

              {/* Section 2: Visual Identity — 20 Colors + 3 Distinct Themes */}
              <div className="pt-4 border-t border-slate-200">
                <ThemePaletteSelector
                  selectedColor={newColor}
                  selectedTheme={newThemeVariant}
                  onChangeColor={setNewColor}
                  onChangeTheme={setNewThemeVariant}
                  previewName={newName}
                />
              </div>

              {/* Section 3: Owner Access Credentials Box (Auto or Manual) */}
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 font-bold text-slate-900">
                    <KeyRound className="w-4 h-4 text-slate-700" />
                    <span>
                      Credenciais do Painel do Proprietário (E-mail + Senha)
                    </span>
                  </div>

                  <div className="inline-flex rounded-lg bg-slate-200/80 p-0.5 text-[11px] font-semibold">
                    <button
                      type="button"
                      onClick={() => {
                        setCredMode('auto');
                        setNewOwnerEmail(
                          newSlug
                            ? `gestor@${newSlug}.com.br`
                            : 'gestor@estabelecimento.com.br'
                        );
                        setNewOwnerPassword(generateOwnerPassword());
                      }}
                      className={`px-2.5 py-1 rounded-md transition-colors ${
                        credMode === 'auto'
                          ? 'bg-white text-slate-900 shadow-xs'
                          : 'text-slate-600'
                      }`}
                    >
                      Gerar Automático
                    </button>
                    <button
                      type="button"
                      onClick={() => setCredMode('manual')}
                      className={`px-2.5 py-1 rounded-md transition-colors ${
                        credMode === 'manual'
                          ? 'bg-white text-slate-900 shadow-xs'
                          : 'text-slate-600'
                      }`}
                    >
                      Definir Manualmente
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      E-mail de Login do Dono *
                    </label>
                    <input
                      type="email"
                      required
                      value={
                        credMode === 'auto'
                          ? newSlug
                            ? `gestor@${newSlug}.com.br`
                            : 'gestor@estabelecimento.com.br'
                          : newOwnerEmail
                      }
                      onChange={(e) => {
                        setCredMode('manual');
                        setNewOwnerEmail(e.target.value);
                      }}
                      placeholder="admin@hotel.com.br"
                      className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 font-mono text-slate-900"
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="font-semibold text-slate-700">
                        Senha do Painel *
                      </label>
                      <button
                        type="button"
                        onClick={() =>
                          setNewOwnerPassword(generateOwnerPassword())
                        }
                        className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-700 hover:underline"
                      >
                        <RefreshCw className="w-3 h-3" />
                        <span>Nova Senha</span>
                      </button>
                    </div>
                    <input
                      type="text"
                      required
                      value={newOwnerPassword}
                      onChange={(e) => {
                        setCredMode('manual');
                        setNewOwnerPassword(e.target.value);
                      }}
                      placeholder="Senha de acesso"
                      className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 font-mono text-slate-900"
                    />
                  </div>
                </div>

                <p className="text-[11px] text-slate-500">
                  O proprietário usará este e-mail e senha para entrar em{' '}
                  <code className="font-mono text-slate-700">
                    #/admin/{newSlug || 'slug'}
                  </code>{' '}
                  sem precisar de conta Google.
                </p>
              </div>
            </div>

            {/* Fixed Modal Footer — Always Accessible */}
            <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex justify-end gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setIsProvisioningModalOpen(false)}
                className="h-9 px-4 rounded-lg border border-slate-300 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isProvisioning}
                className="h-9 px-5 rounded-lg bg-slate-900 text-white text-xs font-semibold hover:bg-slate-800 disabled:opacity-50"
              >
                {isProvisioning
                  ? 'Criando Estabelecimento...'
                  : 'Criar Estabelecimento e Gerar Acesso'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
