import React, {useMemo, useState} from 'react';
import {
  BedDouble,
  CalendarRange,
  CheckCircle2,
  CreditCard,
  Download,
  ExternalLink,
  FileSpreadsheet,
  LayoutDashboard,
  Loader2,
  Lock,
  LogIn,
  Palette,
  Search,
  ShieldAlert,
  Users,
  XCircle,
} from 'lucide-react';
import {doc, setDoc} from 'firebase/firestore';
import {useApp} from '../../context/AppContext';
import {auth, db, handleFirestoreError, OperationType} from '../../firebase';
import {exportFinancialReportCsv} from '../../services/csvExport';
import {updateReservationStatusAndInventory} from '../../services/reservationEngine';
import {DEMO_IMAGES} from '../../services/tenantProvisioning';
import {
  Reservation,
  ReservationStatus,
  Tenant,
  TenantThemeVariant,
} from '../../types/models';
import {LocationUfCitySelector} from '../common/LocationUfCitySelector';
import {ThemePaletteSelector} from '../common/ThemePaletteSelector';
import {AccommodationsManagerView} from './AccommodationsManagerView';
import {AvailabilityCalendarView} from './AvailabilityCalendarView';

type TenantTab =
  | 'dashboard'
  | 'calendar'
  | 'accommodations'
  | 'reservations'
  | 'guests'
  | 'financials'
  | 'settings';

export const TenantAdmin: React.FC = () => {
  const {
    activeTenant,
    accommodations,
    units,
    availabilitySlots,
    ratePlans,
    reservations,
    guests,
    payments,
    auditLogs,
    activeRole,
    canManageActiveTenant,
    loginWithGoogle,
    loginTenantWithCredentials,
    setEnvironment,
  } = useApp();

  const [activeTab, setActiveTab] = useState<TenantTab>('dashboard');
  const [resSearch, setResSearch] = useState('');
  const [resStatusFilter, setResStatusFilter] = useState<string>('ALL');

  // Owner Email + Password Login State
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState<string | null>(null);

  // Tenant Visual Customization state
  const [brandName, setBrandName] = useState(activeTenant?.name || '');
  const [primaryColor, setPrimaryColor] = useState(
    activeTenant?.primaryColor || '#0F172A'
  );
  const [themeVariant, setThemeVariant] = useState<TenantThemeVariant>(
    activeTenant?.themeVariant || 'classic_light'
  );
  const [tagline, setTagline] = useState(activeTenant?.tagline || '');
  const [description, setDescription] = useState(
    activeTenant?.description || ''
  );
  const [heroImageUrl, setHeroImageUrl] = useState(
    activeTenant?.heroImageUrl || DEMO_IMAGES.hero
  );
  const [phone, setPhone] = useState(activeTenant?.phone || '');
  const [whatsapp, setWhatsapp] = useState(activeTenant?.whatsapp || '');
  const [address, setAddress] = useState(activeTenant?.address || '');
  const [city, setCity] = useState(activeTenant?.city || '');
  const [stateUf, setStateUf] = useState(activeTenant?.state || '');
  const [checkInTime, setCheckInTime] = useState(
    activeTenant?.checkInTime || '14:00'
  );
  const [checkOutTime, setCheckOutTime] = useState(
    activeTenant?.checkOutTime || '12:00'
  );
  const [cancellationPolicy, setCancellationPolicy] = useState(
    activeTenant?.cancellationPolicy || ''
  );
  const [houseRules, setHouseRules] = useState(activeTenant?.houseRules || '');
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [settingsJustSaved, setSettingsJustSaved] = useState(false);
  const [settingsSavedMsg, setSettingsSavedMsg] = useState<string | null>(null);

  React.useEffect(() => {
    if (!activeTenant) return;
    setBrandName(activeTenant.name);
    setPrimaryColor(activeTenant.primaryColor);
    setThemeVariant(activeTenant.themeVariant || 'classic_light');
    setTagline(activeTenant.tagline || '');
    setDescription(activeTenant.description || '');
    setHeroImageUrl(activeTenant.heroImageUrl || DEMO_IMAGES.hero);
    setPhone(activeTenant.phone || '');
    setWhatsapp(activeTenant.whatsapp || '');
    setAddress(activeTenant.address || '');
    setCity(activeTenant.city || '');
    setStateUf(activeTenant.state || '');
    setCheckInTime(activeTenant.checkInTime);
    setCheckOutTime(activeTenant.checkOutTime);
    setCancellationPolicy(activeTenant.cancellationPolicy || '');
    setHouseRules(activeTenant.houseRules || '');
  }, [activeTenant]);

  const todayIso = useMemo(() => new Date().toISOString().slice(0, 10), []);

  const kpis = useMemo(() => {
    const activeUnits = units.filter((u) => u.status === 'active');
    const roomUnits = activeUnits.filter((u) => u.unitType === 'room');
    const bedUnits = activeUnits.filter((u) => u.unitType === 'bed');

    const occupiedTodayIds = new Set(
      availabilitySlots
        .filter(
          (s) =>
            s.date === todayIso &&
            (s.status === 'occupied' || s.status === 'held')
        )
        .map((s) => s.unitId)
    );

    const freeRoomsToday = roomUnits.filter(
      (u) => !occupiedTodayIds.has(u.id)
    ).length;
    const freeBedsToday = bedUnits.filter(
      (u) => !occupiedTodayIds.has(u.id)
    ).length;

    const occupancyPct =
      activeUnits.length > 0
        ? Math.round((occupiedTodayIds.size / activeUnits.length) * 100)
        : 0;

    const checkInsToday = reservations.filter(
      (r) =>
        r.checkIn === todayIso &&
        ['confirmed', 'pending_confirmation', 'checked_in'].includes(r.status)
    );
    const checkOutsToday = reservations.filter(
      (r) =>
        r.checkOut >= todayIso &&
        ['checked_in', 'confirmed'].includes(r.status)
    );
    const pendingRes = reservations.filter((r) =>
      ['pending_payment', 'pending_confirmation'].includes(r.status)
    );

    const validReservations = reservations.filter(
      (r) => r.status !== 'cancelled' && r.status !== 'expired'
    );
    const forecastedRevenue = validReservations.reduce(
      (acc, r) => acc + r.totalAmount,
      0
    );
    const receivedRevenue = validReservations.reduce(
      (acc, r) => acc + r.paidAmount,
      0
    );
    const pendingRevenue = Math.max(0, forecastedRevenue - receivedRevenue);
    const cancelledAmount = reservations
      .filter((r) => r.status === 'cancelled')
      .reduce((acc, r) => acc + r.totalAmount, 0);

    return {
      totalUnits: activeUnits.length,
      freeRoomsToday,
      totalRooms: roomUnits.length,
      freeBedsToday,
      totalBeds: bedUnits.length,
      occupancyPct,
      checkInsToday,
      checkOutsToday,
      pendingRes,
      forecastedRevenue,
      receivedRevenue,
      pendingRevenue,
      cancelledAmount,
    };
  }, [units, availabilitySlots, reservations, todayIso]);

  const filteredReservations = useMemo(() => {
    return reservations.filter((r) => {
      if (resStatusFilter !== 'ALL' && r.status !== resStatusFilter)
        return false;
      if (resSearch.trim()) {
        const q = resSearch.toLowerCase();
        const matchCode = r.code.toLowerCase().includes(q);
        const matchGuest = r.guestName.toLowerCase().includes(q);
        const matchAcc = r.accommodationName.toLowerCase().includes(q);
        if (!matchCode && !matchGuest && !matchAcc) return false;
      }
      return true;
    });
  }, [reservations, resStatusFilter, resSearch]);

  const handleOwnerLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);
    const result = loginTenantWithCredentials(
      loginEmail,
      loginPassword,
      activeTenant?.id
    );
    if (!result.success) {
      setLoginError(
        result.error || 'Falha na autenticação. Verifique e-mail e senha.'
      );
    }
  };

  // Standard E-mail + Password Login Gate for Establishment Owner / Manager
  if (!activeTenant || !canManageActiveTenant) {
    return (
      <div className="max-w-md mx-auto my-14 px-4">
        <div className="rounded-xl bg-white border border-slate-200 p-7 space-y-5">
          <div className="text-center space-y-2">
            <div className="w-11 h-11 rounded-xl bg-slate-900 flex items-center justify-center mx-auto">
              <Lock className="w-5 h-5 text-white" />
            </div>
            <span className="text-[11px] font-mono uppercase text-slate-500 block">
              Ambiente B · Painel de Controle do Estabelecimento
            </span>
            <h1 className="text-lg font-bold text-slate-900">
              {activeTenant
                ? `Acesso do Gestor — ${activeTenant.name}`
                : 'Acesso ao Painel do Estabelecimento'}
            </h1>
            <p className="text-xs text-slate-600 leading-relaxed">
              Informe o <strong>E-mail</strong> e a <strong>Senha</strong> de
              acesso fornecidos pelo Administrador Geral da plataforma para
              gerenciar suas acomodações, tarifas e reservas.
            </p>
          </div>

          {loginError && (
            <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-xs font-medium text-red-800">
              {loginError}
            </div>
          )}

          <form onSubmit={handleOwnerLoginSubmit} className="space-y-3.5 text-xs">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                E-mail de Acesso do Estabelecimento
              </label>
              <input
                type="email"
                required
                value={loginEmail}
                onChange={(e) => setLoginEmail(e.target.value)}
                placeholder={
                  activeTenant?.ownerEmail || 'gestor@estabelecimento.com.br'
                }
                className="h-10 w-full rounded-lg border border-slate-300 px-3 font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Senha de Acesso
              </label>
              <input
                type="password"
                required
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                placeholder="••••••••"
                className="h-10 w-full rounded-lg border border-slate-300 px-3 font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900"
              />
            </div>

            <button
              type="submit"
              className="h-10 w-full inline-flex items-center justify-center gap-2 rounded-lg bg-slate-900 text-white font-semibold hover:bg-slate-800 transition-colors"
            >
              <LogIn className="w-4 h-4 shrink-0" />
              <span>Entrar no Painel de Controle</span>
            </button>
          </form>

          <div className="pt-4 border-t border-slate-200 flex flex-col gap-2 text-center">
            {activeTenant && (
              <button
                type="button"
                onClick={() => setEnvironment('guest_portal')}
                className="h-9 w-full rounded-lg border border-slate-300 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
              >
                Voltar ao Portal de Reservas ({activeTenant.name})
              </button>
            )}

            <button
              type="button"
              onClick={loginWithGoogle}
              className="text-[11px] font-medium text-slate-500 hover:text-slate-900 hover:underline pt-1"
            >
              Sou o Administrador Geral SaaS (digit4lkey@gmail.com)
            </button>
          </div>
        </div>
      </div>
    );
  }

  const handleStatusTransition = async (
    res: Reservation,
    nextStatus: ReservationStatus,
    markFullyPaid = false
  ) => {
    await updateReservationStatusAndInventory({
      reservation: res,
      newStatus: nextStatus,
      markFullyPaid,
    });
  };

  const handleSaveTenantSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSavingSettings) return;
    setIsSavingSettings(true);
    setSettingsJustSaved(false);
    setSettingsSavedMsg(null);

    const updated: Tenant = {
      ...activeTenant,
      name: brandName.trim().slice(0, 140),
      primaryColor: primaryColor.trim().slice(0, 32),
      themeVariant,
      tagline: tagline.trim().slice(0, 240),
      description: description.trim().slice(0, 2000),
      heroImageUrl: heroImageUrl.trim().slice(0, 500),
      phone: phone.trim().slice(0, 40),
      whatsapp: whatsapp.trim().slice(0, 40),
      address: address.trim().slice(0, 300),
      city: city.trim().slice(0, 100),
      state: stateUf.trim().slice(0, 50),
      checkInTime: checkInTime.trim().slice(0, 16),
      checkOutTime: checkOutTime.trim().slice(0, 16),
      cancellationPolicy: cancellationPolicy.trim().slice(0, 1200),
      houseRules: houseRules.trim().slice(0, 1200),
    };

    try {
      await Promise.all([
        setDoc(doc(db, 'tenants', activeTenant.id), updated),
        setDoc(doc(db, 'audit_logs', `aud_cfg_${Date.now()}`), {
          id: `aud_cfg_${Date.now()}`,
          tenantId: activeTenant.id,
          actorUid: auth.currentUser?.uid || 'tenant_owner',
          actorEmail:
            auth.currentUser?.email || 'proprietario@estabelecimento',
          action: 'TENANT_BRANDING_UPDATED',
          targetType: 'tenant',
          targetId: activeTenant.id,
          details: `Identidade visual e políticas atualizadas para ${updated.name}`,
          createdAt: new Date().toISOString(),
        }),
        new Promise((resolve) => setTimeout(resolve, 350)),
      ]);
      setIsSavingSettings(false);
      setSettingsJustSaved(true);
      setSettingsSavedMsg(
        'Identidade visual, paleta de cores e configurações salvas com sucesso no Portal Público!'
      );
      setTimeout(() => {
        setSettingsJustSaved(false);
        setSettingsSavedMsg(null);
      }, 4500);
    } catch (error) {
      setIsSavingSettings(false);
      handleFirestoreError(
        error,
        OperationType.UPDATE,
        `tenants/${activeTenant.id}`
      );
    }
  };

  const isStaffRestricted = activeRole === 'tenant_staff';
  const maskEmail = (emailStr: string) => {
    if (!isStaffRestricted) return emailStr;
    const [user, domain] = emailStr.split('@');
    return `${(user || '').slice(0, 2)}***@${domain || '***'}`;
  };
  const maskPhone = (phoneStr: string) => {
    if (!isStaffRestricted) return phoneStr;
    return `${phoneStr.slice(0, 6)}****-${phoneStr.slice(-2)}`;
  };

  return (
    <div className="w-full min-h-screen bg-slate-50">
      <div className="max-w-[1440px] mx-auto flex flex-col lg:flex-row min-h-[calc(100vh-4rem)]">
        {/* Left Sidebar Navigation (248px) */}
        <aside className="w-full lg:w-60 bg-white border-b lg:border-b-0 lg:border-r border-slate-200 shrink-0 p-4 flex flex-col justify-between">
          <div className="space-y-5">
            <div className="px-2 py-1">
              <span className="text-[11px] font-mono uppercase text-slate-400 block">
                Ambiente B · Gestão
              </span>
              <h2 className="text-sm font-bold text-slate-900 truncate mt-0.5">
                {activeTenant.name}
              </h2>
              <p className="text-xs text-slate-500 font-mono mt-0.5 truncate">
                /{activeTenant.slug} · {activeRole}
              </p>
            </div>

            <nav className="flex lg:flex-col gap-1 overflow-x-auto pb-1 lg:pb-0 text-xs font-medium">
              {[
                {
                  id: 'dashboard',
                  label: 'Dashboard Operacional',
                  icon: LayoutDashboard,
                },
                {
                  id: 'calendar',
                  label: 'Disponibilidade & Tarifas',
                  icon: CalendarRange,
                },
                {
                  id: 'accommodations',
                  label: 'Acomodações & Camas',
                  icon: BedDouble,
                },
                {
                  id: 'reservations',
                  label: `Reservas (${reservations.length})`,
                  icon: CheckCircle2,
                },
                {
                  id: 'guests',
                  label: `Hóspedes & LGPD (${guests.length})`,
                  icon: Users,
                },
                {
                  id: 'financials',
                  label: 'Financeiro & CSV',
                  icon: CreditCard,
                },
                {
                  id: 'settings',
                  label: 'Identidade Visual',
                  icon: Palette,
                },
              ].map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setActiveTab(item.id as TenantTab)}
                    className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-left transition-colors whitespace-nowrap shrink-0 ${
                      isActive
                        ? 'bg-slate-900 text-white font-semibold'
                        : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                    }`}
                  >
                    <Icon className="w-4 h-4 shrink-0" />
                    <span className="truncate">{item.label}</span>
                  </button>
                );
              })}
            </nav>
          </div>

          <div className="hidden lg:block pt-6 border-t border-slate-200 px-2 space-y-2">
            <div className="rounded-lg bg-slate-50 border border-slate-200 p-2.5 space-y-1.5">
              <span className="text-[10px] font-mono uppercase text-slate-400 block">
                Link Exclusivo do Hóspede
              </span>
              <code className="text-[11px] font-mono text-slate-700 block truncate">
                #/s/{activeTenant.slug}
              </code>
              <button
                type="button"
                onClick={() => {
                  const url = `${window.location.origin}${window.location.pathname}#/s/${activeTenant.slug}`;
                  navigator.clipboard.writeText(url);
                  setSettingsSavedMsg(`Link exclusivo copiado: ${url}`);
                  setTimeout(() => setSettingsSavedMsg(null), 4000);
                }}
                className="h-7 w-full rounded bg-slate-900 text-[11px] font-semibold text-white hover:bg-slate-800 transition-colors"
              >
                Copiar Link de Reservas
              </button>
            </div>
            <button
              type="button"
              onClick={() => setEnvironment('guest_portal')}
              className="h-9 w-full px-3 rounded-lg border border-slate-300 text-xs font-semibold text-slate-800 hover:bg-slate-50 transition-colors"
            >
              Visualizar Portal Público
            </button>
          </div>
        </aside>

        {/* Main Content Area — min-w-0 & overflow-x-hidden prevent any element from breaking flex layout */}
        <main className="flex-1 min-w-0 overflow-x-hidden p-4 sm:p-6 lg:p-8 space-y-6">
          {activeTab === 'dashboard' && (
            <div className="space-y-6">
              <div>
                <h1 className="text-xl font-bold text-slate-900">
                  Dashboard do Estabelecimento — {activeTenant.name}
                </h1>
                <p className="text-xs text-slate-500 mt-0.5">
                  Monitoramento em tempo real de ocupação, camas livres, check-ins
                  de hoje ({todayIso}) e faturamento.
                </p>
              </div>

              {/* 4 Primary KPI Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
              <div className="p-4 rounded-xl bg-white border border-slate-200 space-y-1">
                <span className="text-xs text-slate-500 block">
                  Ocupação Hoje ({todayIso})
                </span>
                <div className="text-2xl font-bold font-mono text-slate-900">
                  {kpis.occupancyPct}%
                </div>
                <div className="text-xs text-slate-600 font-mono">
                  {kpis.freeRoomsToday}/{kpis.totalRooms} quartos ·{' '}
                  {kpis.freeBedsToday}/{kpis.totalBeds} camas livres
                </div>
              </div>

              <div className="p-4 rounded-xl bg-white border border-slate-200 space-y-1">
                <span className="text-xs text-slate-500 block">
                  Check-ins Hoje / Pendentes
                </span>
                <div className="text-2xl font-bold font-mono text-slate-900">
                  {kpis.checkInsToday.length} / {kpis.pendingRes.length}
                </div>
                <div className="text-xs text-amber-700 font-medium">
                  {kpis.pendingRes.length} reserva(s) pendente(s)
                </div>
              </div>

              <div className="p-4 rounded-xl bg-white border border-slate-200 space-y-1">
                <span className="text-xs text-slate-500 block">
                  Receita Efetivamente Recebida
                </span>
                <div className="text-2xl font-bold font-mono text-emerald-700">
                  R$ {kpis.receivedRevenue.toLocaleString('pt-BR')}
                </div>
                <div className="text-xs text-slate-500 font-mono">
                  Previsto: R$ {kpis.forecastedRevenue.toLocaleString('pt-BR')}
                </div>
              </div>

              <div className="p-4 rounded-xl bg-white border border-slate-200 space-y-1">
                <span className="text-xs text-slate-500 block">
                  Saldo a Receber (Check-in)
                </span>
                <div className="text-2xl font-bold font-mono text-slate-900">
                  R$ {kpis.pendingRevenue.toLocaleString('pt-BR')}
                </div>
                <div className="text-xs text-slate-500 font-mono">
                  Cancelados: R$ {kpis.cancelledAmount.toLocaleString('pt-BR')}
                </div>
              </div>
            </div>

            {/* Upcoming Check-ins & Recent Audit Activity */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              <div className="lg:col-span-7 rounded-xl bg-white border border-slate-200 p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-bold text-slate-900">
                    Próximos Check-ins, Check-outs e Reservas Ativas
                  </h2>
                  <button
                    type="button"
                    onClick={() => setActiveTab('reservations')}
                    className="text-xs font-semibold text-slate-700 hover:underline"
                  >
                    Ver todas
                  </button>
                </div>

                <div className="divide-y divide-slate-200 text-xs">
                  {reservations.slice(0, 6).map((r) => (
                    <div
                      key={r.id}
                      className="py-3 flex flex-wrap items-center justify-between gap-2"
                    >
                      <div className="min-w-0">
                        <div className="font-semibold text-slate-900 truncate">
                          <span className="font-mono">{r.code}</span> —{' '}
                          {r.guestName}
                        </div>
                        <div className="text-slate-500 truncate">
                          {r.accommodationName} ({r.unitLabelsCsv}) ·{' '}
                          <span className="font-mono">
                            {r.checkIn} → {r.checkOut}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="font-mono font-bold text-slate-900">
                          R$ {r.totalAmount.toLocaleString('pt-BR')}
                        </span>
                        <span className="uppercase font-mono text-[11px] text-slate-600">
                          · {r.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="lg:col-span-5 rounded-xl bg-white border border-slate-200 p-5 space-y-4">
                <h2 className="text-sm font-bold text-slate-900">
                  Trilha de Auditoria Operacional (Recentes)
                </h2>
                <div className="divide-y divide-slate-200 text-xs max-h-80 overflow-y-auto">
                  {auditLogs.slice(0, 8).map((log) => (
                    <div key={log.id} className="py-2.5 space-y-0.5">
                      <div className="flex items-center justify-between font-mono text-[11px] text-slate-500">
                        <span className="font-semibold text-slate-800 truncate">
                          {log.action}
                        </span>
                        <span className="shrink-0">
                          {log.createdAt.slice(11, 19)}
                        </span>
                      </div>
                      <p className="text-slate-600 leading-snug">
                        {log.details}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'calendar' && (
          <AvailabilityCalendarView
            tenant={activeTenant}
            accommodations={accommodations}
            units={units}
            availabilitySlots={availabilitySlots}
            ratePlans={ratePlans}
          />
        )}

        {activeTab === 'accommodations' && (
          <AccommodationsManagerView
            tenant={activeTenant}
            accommodations={accommodations}
            units={units}
            reservations={reservations}
          />
        )}

        {activeTab === 'reservations' && (
          <div className="space-y-5 min-w-0">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-bold text-slate-900">
                  Central de Reservas, Check-in e Check-out
                </h2>
                <p className="text-xs text-slate-600">
                  Gerencie status transacionais, registre pagamentos na recepção
                  ou cancele liberando as unidades/camas automaticamente.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2.5 text-xs">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
                  <input
                    type="text"
                    value={resSearch}
                    onChange={(e) => setResSearch(e.target.value)}
                    placeholder="Buscar código ou hóspede..."
                    className="h-9 rounded-lg border border-slate-300 bg-white pl-8 pr-3 text-slate-900"
                  />
                </div>
                <select
                  value={resStatusFilter}
                  onChange={(e) => setResStatusFilter(e.target.value)}
                  className="h-9 rounded-lg border border-slate-300 bg-white px-3 font-medium text-slate-800"
                >
                  <option value="ALL">Todos os Status</option>
                  <option value="pending_confirmation">
                    Pendente Confirmação
                  </option>
                  <option value="pending_payment">Pendente Pagamento</option>
                  <option value="confirmed">Confirmada</option>
                  <option value="checked_in">Check-in Realizado</option>
                  <option value="checked_out">Check-out Concluído</option>
                  <option value="cancelled">Cancelada</option>
                </select>
              </div>
            </div>

            <div className="w-full rounded-xl bg-white border border-slate-200 overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-600">
                    <th className="py-3 px-4 font-semibold whitespace-nowrap">
                      Código / Data
                    </th>
                    <th className="py-3 px-4 font-semibold whitespace-nowrap">
                      Hóspede
                    </th>
                    <th className="py-3 px-4 font-semibold whitespace-nowrap">
                      Acomodação & Unidade(s)
                    </th>
                    <th className="py-3 px-4 font-semibold whitespace-nowrap">
                      Check-in → Check-out
                    </th>
                    <th className="py-3 px-4 font-semibold text-right whitespace-nowrap">
                      Total / Pago
                    </th>
                    <th className="py-3 px-4 font-semibold whitespace-nowrap">
                      Status
                    </th>
                    <th className="py-3 px-4 font-semibold text-right whitespace-nowrap">
                      Operações
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {filteredReservations.map((r) => (
                    <tr key={r.id} className="hover:bg-slate-50/70">
                      <td className="py-3 px-4 font-mono whitespace-nowrap">
                        <div className="font-bold text-slate-900">{r.code}</div>
                        <div className="text-[11px] text-slate-500">
                          {r.createdAt.slice(0, 10)}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-900">
                          {r.guestName}
                        </div>
                        <div className="text-slate-500">
                          {maskEmail(r.guestEmail)}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-medium text-slate-900">
                          {r.accommodationName}
                        </div>
                        <div className="font-mono text-[11px] text-slate-600">
                          {r.unitLabelsCsv}
                        </div>
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-800 whitespace-nowrap">
                        {r.checkIn} → {r.checkOut} ({r.nights}n)
                      </td>
                      <td className="py-3 px-4 text-right font-mono whitespace-nowrap">
                        <div className="font-bold text-slate-900">
                          R$ {r.totalAmount.toLocaleString('pt-BR')}
                        </div>
                        <div className="text-emerald-700 text-[11px]">
                          Pago: R$ {r.paidAmount.toLocaleString('pt-BR')}
                        </div>
                      </td>
                      <td className="py-3 px-4 font-mono uppercase text-[11px] font-semibold text-slate-800 whitespace-nowrap">
                        {r.status}
                      </td>
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <div className="inline-flex items-center justify-end gap-1.5">
                          {(r.status === 'pending_confirmation' ||
                            r.status === 'pending_payment') && (
                            <button
                              type="button"
                              onClick={() =>
                                handleStatusTransition(r, 'confirmed', true)
                              }
                              className="h-7 px-2.5 rounded bg-emerald-700 text-white font-semibold hover:bg-emerald-800"
                            >
                              Confirmar & Quitar
                            </button>
                          )}
                          {r.status === 'confirmed' && (
                            <button
                              type="button"
                              onClick={() =>
                                handleStatusTransition(r, 'checked_in', true)
                              }
                              className="h-7 px-2.5 rounded bg-slate-900 text-white font-semibold hover:bg-slate-800"
                            >
                              Fazer Check-in
                            </button>
                          )}
                          {r.status === 'checked_in' && (
                            <button
                              type="button"
                              onClick={() =>
                                handleStatusTransition(r, 'checked_out', true)
                              }
                              className="h-7 px-2.5 rounded bg-blue-700 text-white font-semibold hover:bg-blue-800"
                            >
                              Fazer Check-out
                            </button>
                          )}
                          {r.status !== 'cancelled' &&
                            r.status !== 'checked_out' && (
                              <button
                                type="button"
                                onClick={() =>
                                  handleStatusTransition(r, 'cancelled', false)
                                }
                                className="h-7 inline-flex items-center gap-1 px-2 rounded border border-red-200 text-red-700 hover:bg-red-50 font-medium"
                              >
                                <XCircle className="w-3 h-3 shrink-0" />
                                <span>Cancelar</span>
                              </button>
                            )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'guests' && (
          <div className="space-y-5 min-w-0">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-bold text-slate-900">
                  Base de Hóspedes e Conformidade LGPD
                </h2>
                <p className="text-xs text-slate-600">
                  Dados pessoais isolados por estabelecimento com controle de
                  acesso por papel operacional.
                </p>
              </div>
              {isStaffRestricted && (
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-50 border border-amber-200 text-xs font-medium text-amber-900">
                  <ShieldAlert className="w-4 h-4 text-amber-700 shrink-0" />
                  <span>
                    Modo Recepção (`tenant_staff`): Dados sensíveis parcialmente
                    mascarados (LGPD).
                  </span>
                </div>
              )}
            </div>

            <div className="w-full rounded-xl bg-white border border-slate-200 overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-600">
                    <th className="py-3 px-4 font-semibold">Nome Completo</th>
                    <th className="py-3 px-4 font-semibold">E-mail</th>
                    <th className="py-3 px-4 font-semibold">Telefone</th>
                    <th className="py-3 px-4 font-semibold">Cidade</th>
                    <th className="py-3 px-4 font-semibold">
                      Consentimento LGPD
                    </th>
                    <th className="py-3 px-4 font-semibold text-right">
                      Estadias
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {guests.map((g) => (
                    <tr key={g.id} className="hover:bg-slate-50">
                      <td className="py-3 px-4 font-semibold text-slate-900">
                        {g.fullName}
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-700">
                        {maskEmail(g.email)}
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-700">
                        {maskPhone(g.phone)}
                      </td>
                      <td className="py-3 px-4 text-slate-600">
                        {g.city || '—'}
                      </td>
                      <td className="py-3 px-4 text-emerald-700 font-medium">
                        {g.lgpdConsent ? 'Consentimento Ativo' : 'Pendente'}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-semibold text-slate-900">
                        {g.staysCount}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'financials' && (
          <div className="space-y-6 min-w-0">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-bold text-slate-900">
                  Demonstrativo Financeiro e Conciliação
                </h2>
                <p className="text-xs text-slate-600">
                  Separação rigorosa entre faturamento previsto de reservas,
                  valores efetivamente recebidos e saldo pendente.
                </p>
              </div>

              <button
                type="button"
                onClick={() =>
                  exportFinancialReportCsv({
                    tenantSlug: activeTenant.slug,
                    reservations,
                    payments,
                  })
                }
                className="h-9 inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 text-xs font-semibold text-white hover:bg-slate-800 transition-colors whitespace-nowrap shrink-0"
              >
                <Download className="w-4 h-4 shrink-0" />
                <span>Exportar Relatório CSV</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="p-4 rounded-xl bg-white border border-slate-200">
                <span className="text-xs text-slate-500 block">
                  Volume Total Previsto (Ativas)
                </span>
                <div className="text-xl font-bold font-mono text-slate-900 mt-1">
                  R$ {kpis.forecastedRevenue.toLocaleString('pt-BR')}
                </div>
              </div>
              <div className="p-4 rounded-xl bg-white border border-slate-200">
                <span className="text-xs text-slate-500 block">
                  Caixa Efetivamente Recebido
                </span>
                <div className="text-xl font-bold font-mono text-emerald-700 mt-1">
                  R$ {kpis.receivedRevenue.toLocaleString('pt-BR')}
                </div>
              </div>
              <div className="p-4 rounded-xl bg-white border border-slate-200">
                <span className="text-xs text-slate-500 block">
                  Valores Pendentes a Receber
                </span>
                <div className="text-xl font-bold font-mono text-amber-700 mt-1">
                  R$ {kpis.pendingRevenue.toLocaleString('pt-BR')}
                </div>
              </div>
              <div className="p-4 rounded-xl bg-white border border-slate-200">
                <span className="text-xs text-slate-500 block">
                  Reservas Canceladas
                </span>
                <div className="text-xl font-bold font-mono text-red-600 mt-1">
                  R$ {kpis.cancelledAmount.toLocaleString('pt-BR')}
                </div>
              </div>
            </div>

            <div className="w-full rounded-xl bg-white border border-slate-200 overflow-x-auto">
              <div className="px-4 py-3 border-b border-slate-200 flex items-center gap-2 text-xs font-semibold text-slate-800">
                <FileSpreadsheet className="w-4 h-4 text-slate-500 shrink-0" />
                <span>Transações e Pagamentos Registrados</span>
              </div>
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-600">
                    <th className="py-3 px-4 font-semibold">Ref. Externa</th>
                    <th className="py-3 px-4 font-semibold">Reserva</th>
                    <th className="py-3 px-4 font-semibold">
                      Método / Modalidade
                    </th>
                    <th className="py-3 px-4 font-semibold">Ambiente</th>
                    <th className="py-3 px-4 font-semibold">Status</th>
                    <th className="py-3 px-4 font-semibold text-right">
                      Valor
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {payments.map((p) => (
                    <tr key={p.id} className="hover:bg-slate-50">
                      <td className="py-3 px-4 font-mono text-slate-800">
                        {p.externalRef}
                      </td>
                      <td className="py-3 px-4 font-mono font-semibold text-slate-900">
                        {p.reservationCode}
                      </td>
                      <td className="py-3 px-4 uppercase font-mono text-[11px] text-slate-700">
                        {p.method} · {p.modality}
                      </td>
                      <td className="py-3 px-4 text-slate-500">
                        {p.isSimulated ? 'Simulado (Demo)' : 'Produção'}
                      </td>
                      <td className="py-3 px-4 font-mono uppercase text-[11px] font-semibold text-emerald-700">
                        {p.status}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-slate-900">
                        R$ {p.amount.toLocaleString('pt-BR')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'settings' && (
          <form
            onSubmit={handleSaveTenantSettings}
            className="rounded-xl bg-white border border-slate-200 p-6 space-y-5"
          >
            <div>
              <h2 className="text-lg font-bold text-slate-900">
                Personalização Visual e Configurações do Portal Público
              </h2>
              <p className="text-xs text-slate-600">
                Altere cores institucionais, fotografia principal, horários de
                check-in/out e políticas sem exigir conhecimento técnico.
              </p>
            </div>

            {settingsSavedMsg && (
              <div className="p-3.5 rounded-lg bg-emerald-50 border border-emerald-200 text-xs font-semibold text-emerald-900">
                {settingsSavedMsg}
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="sm:col-span-2">
                <label className="block font-semibold text-slate-700 mb-1.5">
                  Nome Comercial do Estabelecimento
                </label>
                <input
                  type="text"
                  required
                  value={brandName}
                  onChange={(e) => setBrandName(e.target.value)}
                  className="h-10 w-full rounded-lg border border-slate-300 px-3 text-slate-900"
                />
              </div>

              <div className="sm:col-span-2 pt-1">
                <ThemePaletteSelector
                  selectedColor={primaryColor}
                  selectedTheme={themeVariant}
                  onChangeColor={setPrimaryColor}
                  onChangeTheme={setThemeVariant}
                  previewName={brandName}
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block font-semibold text-slate-700 mb-1.5">
                  Subtítulo / Slogan de Apresentação
                </label>
                <input
                  type="text"
                  value={tagline}
                  onChange={(e) => setTagline(e.target.value)}
                  className="h-10 w-full rounded-lg border border-slate-300 px-3 text-slate-900"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block font-semibold text-slate-700 mb-1.5">
                  Descrição Institucional
                </label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 p-3 text-slate-900"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1.5">
                  Horário de Check-in
                </label>
                <input
                  type="time"
                  value={checkInTime}
                  onChange={(e) => setCheckInTime(e.target.value)}
                  className="h-10 w-full rounded-lg border border-slate-300 px-3 font-mono text-slate-900"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1.5">
                  Horário de Check-out
                </label>
                <input
                  type="time"
                  value={checkOutTime}
                  onChange={(e) => setCheckOutTime(e.target.value)}
                  className="h-10 w-full rounded-lg border border-slate-300 px-3 font-mono text-slate-900"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1.5">
                  Telefone Recepção
                </label>
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="h-10 w-full rounded-lg border border-slate-300 px-3 font-mono text-slate-900"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1.5">
                  WhatsApp (somente números com DDI/DDD)
                </label>
                <input
                  type="text"
                  value={whatsapp}
                  onChange={(e) => setWhatsapp(e.target.value)}
                  className="h-10 w-full rounded-lg border border-slate-300 px-3 font-mono text-slate-900"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block font-semibold text-slate-700 mb-1.5">
                  Endereço Completo
                </label>
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="h-10 w-full rounded-lg border border-slate-300 px-3 text-slate-900"
                />
              </div>

              <LocationUfCitySelector
                stateUf={stateUf}
                city={city}
                onChangeState={setStateUf}
                onChangeCity={setCity}
                stateFirst
              />

              <div className="sm:col-span-2">
                <label className="block font-semibold text-slate-700 mb-1.5">
                  Política de Cancelamento e Reembolso
                </label>
                <textarea
                  rows={2}
                  value={cancellationPolicy}
                  onChange={(e) => setCancellationPolicy(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 p-3 text-slate-900"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block font-semibold text-slate-700 mb-1.5">
                  Regras de Convivência e Políticas da Propriedade
                </label>
                <textarea
                  rows={2}
                  value={houseRules}
                  onChange={(e) => setHouseRules(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 p-3 text-slate-900"
                />
              </div>
            </div>

            <div className="pt-4 border-t border-slate-200 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              <div className="min-w-0">
                {settingsSavedMsg ? (
                  <div className="animate-step-in flex flex-wrap items-center gap-2.5 px-3.5 py-2 rounded-lg bg-emerald-50 border border-emerald-200 text-xs font-semibold text-emerald-900">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>{settingsSavedMsg}</span>
                    <button
                      type="button"
                      onClick={() => {
                        setEnvironment('guest_portal');
                        window.location.hash = `#/s/${activeTenant.slug}`;
                      }}
                      className="guest-btn-transition inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-emerald-700 text-white text-[11px] font-semibold hover:bg-emerald-800"
                    >
                      <span>Ver no Portal do Hóspede</span>
                      <ExternalLink className="w-3 h-3" />
                    </button>
                  </div>
                ) : (
                  <span className="text-xs text-slate-500">
                    As alterações de cor, tema e textos são aplicadas em tempo real no Portal Público.
                  </span>
                )}
              </div>

              <button
                type="submit"
                disabled={isSavingSettings}
                className={`guest-btn-transition h-10 px-6 rounded-lg text-xs font-semibold inline-flex items-center justify-center gap-2 shrink-0 shadow-xs ${
                  settingsJustSaved
                    ? 'bg-emerald-700 text-white hover:bg-emerald-800 ring-2 ring-emerald-600/30'
                    : 'bg-slate-900 text-white hover:bg-slate-800 hover:shadow-md disabled:opacity-60'
                }`}
              >
                {isSavingSettings ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin shrink-0" />
                    <span>Salvando Personalização...</span>
                  </>
                ) : settingsJustSaved ? (
                  <>
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                    <span>Personalização Salva com Sucesso!</span>
                  </>
                ) : (
                  <span>Salvar Personalização do Estabelecimento</span>
                )}
              </button>
            </div>
          </form>
        )}
        </main>
      </div>
    </div>
  );
};
