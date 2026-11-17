import React, {useMemo, useState} from 'react';
import {
  ArrowRight,
  Ban,
  ChevronLeft,
  ChevronRight,
  Images,
  MapPin,
  MessageCircle,
  Phone,
  Search,
  SlidersHorizontal,
} from 'lucide-react';
import {
  darkenHex,
  hexToRgba,
  isColorLight,
} from '../../constants/branding';
import {useApp} from '../../context/AppContext';
import {calculateStayQuote} from '../../services/reservationEngine';
import {
  Accommodation,
  AccommodationType,
  PricingMode,
  Reservation,
} from '../../types/models';
import {BrandLogo47} from '../common/BrandLogo47';
import {ResilientImage} from '../common/ResilientImage';
import {BookingWizard} from './BookingWizard';

interface GuestPortalProps {
  onOpenVoucher: (res: Reservation) => void;
  onOpenLookupModal: () => void;
}

const PRICING_MODE_LABEL: Record<PricingMode, string> = {
  per_room: 'por quarto / diária',
  per_bed: 'por cama / diária',
  per_person: 'por pessoa / diária',
  per_night: 'por diária individual',
};

const TYPE_LABEL: Record<AccommodationType, string> = {
  private_room: 'Quarto Privativo',
  single_room: 'Quarto Individual',
  double_room: 'Quarto de Casal',
  family_room: 'Quarto Familiar',
  shared_dorm: 'Dormitório Compartilhado',
  female_dorm: 'Dormitório Feminino',
  male_dorm: 'Dormitório Masculino',
  mixed_dorm: 'Dormitório Misto',
};

function defaultDateOffset(days: number): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export const GuestPortal: React.FC<GuestPortalProps> = ({
  onOpenVoucher,
  onOpenLookupModal,
}) => {
  const {
    activeTenant,
    accommodations,
    units,
    availabilitySlots,
    ratePlans,
    setEnvironment,
  } = useApp();

  const [checkIn, setCheckIn] = useState(() => defaultDateOffset(1));
  const [checkOut, setCheckOut] = useState(() => defaultDateOffset(3));
  const [guestsCount, setGuestsCount] = useState<number>(2);
  const [catalogPulseKey, setCatalogPulseKey] = useState<number>(0);

  // Catalog Filters
  const [categoryFilter, setCategoryFilter] = useState<
    'all' | 'private' | 'dorm' | 'female_dorm' | 'family'
  >('all');
  const [maxPriceFilter, setMaxPriceFilter] = useState<number>(1500);
  const [amenitySearch, setAmenitySearch] = useState<string>('');

  const [selectedAccommodation, setSelectedAccommodation] =
    useState<Accommodation | null>(null);
  const [activePhotoIndexByAcc, setActivePhotoIndexByAcc] = useState<
    Record<string, number>
  >({});

  const handleSmoothScrollToCatalog = () => {
    setCatalogPulseKey((prev) => prev + 1);
    const el = document.getElementById('catalogo-acomodacoes');
    if (el) {
      el.scrollIntoView({behavior: 'smooth', block: 'start'});
    }
  };

  const activeAccommodations = useMemo(
    () => accommodations.filter((a) => a.active),
    [accommodations]
  );

  const filteredAccommodations = useMemo(() => {
    return activeAccommodations.filter((acc) => {
      if (acc.basePrice > maxPriceFilter) return false;
      if (categoryFilter === 'private' && acc.type.includes('dorm')) return false;
      if (categoryFilter === 'dorm' && !acc.type.includes('dorm')) return false;
      if (categoryFilter === 'female_dorm' && acc.type !== 'female_dorm')
        return false;
      if (categoryFilter === 'family' && acc.type !== 'family_room') return false;
      if (amenitySearch.trim()) {
        const term = amenitySearch.toLowerCase();
        const inAmenities = (acc.amenities || '').toLowerCase().includes(term);
        const inName = acc.name.toLowerCase().includes(term);
        if (!inAmenities && !inName) return false;
      }
      return true;
    });
  }, [activeAccommodations, categoryFilter, maxPriceFilter, amenitySearch]);

  if (!activeTenant) {
    return (
      <div className="animate-step-in max-w-lg mx-auto my-20 px-4">
        <div className="rounded-xl bg-white border border-slate-200 p-8 text-center space-y-5">
          <div className="flex justify-center">
            <BrandLogo47 size="lg" />
          </div>
          <div className="space-y-2">
            <span className="text-xs font-mono uppercase text-slate-500">
              47hospedagens · Infraestrutura Multi-Tenant
            </span>
            <h1 className="text-xl font-bold text-slate-900">
              Plataforma de Reservas e Gestão de Hospedagem
            </h1>
            <p className="text-xs text-slate-600 leading-relaxed">
              Nenhum estabelecimento foi selecionado ou cadastrado ainda. Se você é o{' '}
              <strong>Administrador Geral SaaS</strong>, acesse o painel central para
              cadastrar novos hotéis, pousadas ou hostels e gerar os links exclusivos.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            <button
              type="button"
              onClick={() => {
                setEnvironment('platform_admin');
                window.location.hash = '#/platform';
              }}
              className="guest-btn-transition h-10 w-full sm:w-auto px-5 rounded-lg bg-slate-900 text-white text-xs font-semibold hover:bg-slate-800 hover:shadow-md"
            >
              Acessar Admin Geral SaaS
            </button>
            <button
              type="button"
              onClick={() => {
                setEnvironment('tenant_admin');
                window.location.hash = '#/admin';
              }}
              className="guest-btn-transition h-10 w-full sm:w-auto px-4 rounded-lg border border-slate-300 bg-white text-slate-700 text-xs font-semibold hover:bg-slate-50 hover:shadow-xs"
            >
              Login do Gestor (E-mail + Senha)
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (activeTenant.status === 'suspended') {
    return (
      <div className="animate-step-in max-w-xl mx-auto my-20 p-8 rounded-xl bg-white border border-slate-200 text-center space-y-3">
        <Ban className="w-10 h-10 text-red-600 mx-auto" />
        <h1 className="text-xl font-bold text-slate-900">
          Portal Temporariamente Indisponível
        </h1>
        <p className="text-sm text-slate-600">
          O estabelecimento <strong>{activeTenant.name}</strong> encontra-se com a
          conta desativada/suspensa pelo Administrador Geral da plataforma{' '}
          <strong>47hospedagens</strong>. Novas reservas estão bloqueadas no
          momento.
        </p>
      </div>
    );
  }

  const themeVariant = activeTenant.themeVariant || 'classic_light';
  const brandColor = activeTenant.primaryColor || '#0F172A';
  const isDark = themeVariant === 'boutique_dark';
  const isImmersive = themeVariant === 'resort_tint';
  const brandContrastText = isColorLight(brandColor) ? '#0F172A' : '#FFFFFF';

  const heroStyle: React.CSSProperties | undefined = isImmersive
    ? {
        background: `linear-gradient(135deg, ${brandColor} 0%, ${darkenHex(
          brandColor,
          0.35
        )} 100%)`,
        color: brandContrastText,
      }
    : isDark
    ? {
        background: `radial-gradient(circle at 85% 20%, ${hexToRgba(
          brandColor,
          0.26
        )}, #0F172A 65%)`,
      }
    : undefined;

  return (
    <div
      className={`w-full min-h-screen transition-colors duration-300 ${
        isDark ? 'bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-900'
      }`}
      style={
        isImmersive
          ? {backgroundColor: hexToRgba(brandColor, 0.04)}
          : undefined
      }
    >
      {/* 1. Balanced Split Hero + Clean 4-Column Booking Search Strip */}
      <section
        style={heroStyle}
        className={`border-b transition-colors duration-300 ${
          isDark
            ? 'border-slate-800'
            : isImmersive
            ? 'border-transparent'
            : 'bg-white border-slate-200'
        }`}
      >
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 py-8 lg:py-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            {/* Left Column: Establishment Info & CTAs */}
            <div className="lg:col-span-7 flex flex-col justify-center space-y-5 min-w-0 animate-step-in">
              <div className="space-y-3">
                <div
                  style={
                    !isImmersive && !isDark
                      ? {
                          backgroundColor: hexToRgba(brandColor, 0.08),
                          color: brandColor,
                        }
                      : isDark
                      ? {
                          backgroundColor: hexToRgba(brandColor, 0.18),
                          borderColor: hexToRgba(brandColor, 0.45),
                          color: '#F8FAFC',
                        }
                      : undefined
                  }
                  className={`inline-flex flex-wrap items-center gap-2 text-xs font-medium px-3 py-1 rounded-lg w-fit ${
                    isImmersive
                      ? isColorLight(brandColor)
                        ? 'bg-slate-900/10 text-slate-900'
                        : 'bg-white/15 text-white'
                      : isDark
                      ? 'border'
                      : ''
                  }`}
                >
                  <span>
                    {activeTenant.city} · {activeTenant.state}
                  </span>
                  <span aria-hidden="true">·</span>
                  <span>Check-in {activeTenant.checkInTime}</span>
                  <span aria-hidden="true">·</span>
                  <span>Check-out {activeTenant.checkOutTime}</span>
                </div>

                <div className="flex items-center gap-3.5">
                  {activeTenant.logoUrl && (
                    <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl overflow-hidden border border-slate-200/60 bg-white shadow-sm shrink-0">
                      <ResilientImage
                        src={activeTenant.logoUrl}
                        alt={activeTenant.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}
                  <h1
                    className={`text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight leading-tight ${
                      isDark
                        ? 'text-white'
                        : isImmersive
                        ? isColorLight(brandColor)
                          ? 'text-slate-900'
                          : 'text-white'
                        : 'text-slate-900'
                    }`}
                  >
                    {activeTenant.name}
                  </h1>
                </div>

                {activeTenant.tagline && (
                  <p
                    className={`text-sm sm:text-base font-medium ${
                      isDark
                        ? 'text-slate-200'
                        : isImmersive
                        ? isColorLight(brandColor)
                          ? 'text-slate-800'
                          : 'text-white/90'
                        : 'text-slate-700'
                    }`}
                  >
                    {activeTenant.tagline}
                  </p>
                )}

                <p
                  className={`text-xs sm:text-sm leading-relaxed ${
                    isDark
                      ? 'text-slate-300'
                      : isImmersive
                      ? isColorLight(brandColor)
                        ? 'text-slate-800/85'
                        : 'text-white/80'
                      : 'text-slate-600'
                  }`}
                >
                  {activeTenant.description}
                </p>
              </div>

              {/* Action Buttons — Uniform h-10 with smooth transitions & icon motion */}
              <div className="flex flex-wrap items-center gap-3 pt-1">
                <button
                  type="button"
                  onClick={handleSmoothScrollToCatalog}
                  style={
                    isImmersive
                      ? {
                          backgroundColor: isColorLight(brandColor)
                            ? '#0F172A'
                            : '#FFFFFF',
                          color: isColorLight(brandColor)
                            ? '#FFFFFF'
                            : brandColor,
                        }
                      : {
                          backgroundColor: brandColor,
                          color: brandContrastText,
                        }
                  }
                  className="guest-btn-transition group h-10 inline-flex items-center justify-center gap-2 px-5 rounded-lg text-xs font-semibold hover:opacity-95 hover:shadow-md whitespace-nowrap shadow-xs"
                >
                  <span>Ver Disponibilidade e Tarifas</span>
                  <ArrowRight className="w-3.5 h-3.5 shrink-0 transition-transform duration-200 group-hover:translate-x-0.5" />
                </button>
                <button
                  type="button"
                  onClick={onOpenLookupModal}
                  className={`guest-btn-transition h-10 inline-flex items-center justify-center px-4 rounded-lg border text-xs font-semibold hover:shadow-sm whitespace-nowrap ${
                    isDark
                      ? 'border-slate-700 bg-slate-900 text-slate-100 hover:bg-slate-800'
                      : isImmersive
                      ? isColorLight(brandColor)
                        ? 'border-slate-900/25 bg-white/50 text-slate-900 hover:bg-white'
                        : 'border-white/35 bg-white/10 text-white hover:bg-white/20'
                      : 'border-slate-300 bg-white text-slate-800 hover:bg-slate-50'
                  }`}
                >
                  Consultar Reserva por Código
                </button>
                {activeTenant.whatsapp && (
                  <a
                    href={`https://wa.me/${activeTenant.whatsapp.replace(/\D/g, '')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`guest-btn-transition group h-10 inline-flex items-center justify-center gap-1.5 px-4 rounded-lg border text-xs font-medium hover:shadow-sm whitespace-nowrap ${
                      isDark
                        ? 'border-slate-700 bg-slate-900 text-slate-200 hover:bg-slate-800'
                        : isImmersive
                        ? isColorLight(brandColor)
                          ? 'border-slate-900/25 bg-white/50 text-slate-900 hover:bg-white'
                          : 'border-white/35 bg-white/10 text-white hover:bg-white/20'
                        : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <MessageCircle
                      className={`w-3.5 h-3.5 shrink-0 transition-transform duration-200 group-hover:scale-110 ${
                        isImmersive && !isColorLight(brandColor)
                          ? 'text-emerald-300'
                          : 'text-emerald-600'
                      }`}
                    />
                    <span>Falar no WhatsApp</span>
                  </a>
                )}
              </div>
            </div>

            {/* Right Column: Fixed Aspect/Height Hero Image with subtle zoom on hover */}
            <div
              className={`group lg:col-span-5 w-full h-60 sm:h-72 lg:h-[310px] rounded-xl overflow-hidden border shrink-0 transition-shadow duration-300 ${
                isDark
                  ? 'border-slate-700 shadow-2xl'
                  : isImmersive
                  ? 'border-white/25 shadow-xl'
                  : 'border-slate-200 hover:shadow-lg'
              }`}
            >
              <ResilientImage
                src={activeTenant.heroImageUrl}
                alt={activeTenant.name}
                className="w-full h-full object-cover transition-transform duration-500 ease-out group-hover:scale-[1.03]"
              />
            </div>
          </div>

          {/* 4-Column Booking Search Strip — Uniform h-10 controls */}
          <div
            style={
              !isDark && !isImmersive
                ? {
                    backgroundColor: hexToRgba(brandColor, 0.04),
                    borderColor: hexToRgba(brandColor, 0.22),
                  }
                : undefined
            }
            className={`mt-8 p-4 sm:p-5 rounded-xl border transition-all duration-200 ${
              isDark
                ? 'bg-slate-900/95 border-slate-700 text-slate-100'
                : isImmersive
                ? 'bg-white border-white/60 shadow-lg text-slate-900'
                : ''
            }`}
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
              <div className="min-w-0">
                <label
                  className={`block text-xs font-semibold mb-1.5 truncate ${
                    isDark ? 'text-slate-300' : 'text-slate-700'
                  }`}
                >
                  Data de Check-in ({activeTenant.checkInTime})
                </label>
                <input
                  type="date"
                  value={checkIn}
                  onChange={(e) => setCheckIn(e.target.value)}
                  className={`h-10 w-full rounded-lg border px-3 text-xs font-mono transition-colors focus:outline-none focus:ring-2 ${
                    isDark
                      ? 'bg-slate-950 border-slate-700 text-slate-100 focus:ring-slate-500'
                      : 'bg-white border-slate-300 text-slate-900 focus:ring-slate-900'
                  }`}
                />
              </div>

              <div className="min-w-0">
                <label
                  className={`block text-xs font-semibold mb-1.5 truncate ${
                    isDark ? 'text-slate-300' : 'text-slate-700'
                  }`}
                >
                  Data de Check-out ({activeTenant.checkOutTime})
                </label>
                <input
                  type="date"
                  value={checkOut}
                  min={checkIn}
                  onChange={(e) => setCheckOut(e.target.value)}
                  className={`h-10 w-full rounded-lg border px-3 text-xs font-mono transition-colors focus:outline-none focus:ring-2 ${
                    isDark
                      ? 'bg-slate-950 border-slate-700 text-slate-100 focus:ring-slate-500'
                      : 'bg-white border-slate-300 text-slate-900 focus:ring-slate-900'
                  }`}
                />
              </div>

              <div className="min-w-0">
                <label
                  className={`block text-xs font-semibold mb-1.5 truncate ${
                    isDark ? 'text-slate-300' : 'text-slate-700'
                  }`}
                >
                  Quantidade de Hóspedes / Camas
                </label>
                <select
                  value={guestsCount}
                  onChange={(e) => setGuestsCount(Number(e.target.value))}
                  className={`h-10 w-full rounded-lg border px-3 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 ${
                    isDark
                      ? 'bg-slate-950 border-slate-700 text-slate-100 focus:ring-slate-500'
                      : 'bg-white border-slate-300 text-slate-900 focus:ring-slate-900'
                  }`}
                >
                  {[1, 2, 3, 4, 5, 6].map((n) => (
                    <option key={n} value={n}>
                      {n} {n === 1 ? 'hóspede' : 'hóspedes'}
                    </option>
                  ))}
                </select>
              </div>

              <div className="min-w-0">
                <button
                  type="button"
                  onClick={handleSmoothScrollToCatalog}
                  style={{
                    backgroundColor: brandColor,
                    color: brandContrastText,
                  }}
                  className="guest-btn-transition group h-10 w-full inline-flex items-center justify-center gap-2 rounded-lg px-4 text-xs font-semibold hover:opacity-95 hover:shadow-md whitespace-nowrap"
                >
                  <Search className="w-3.5 h-3.5 shrink-0 transition-transform duration-200 group-hover:scale-110" />
                  <span>Atualizar Disponibilidade</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 2. Catalog & Filters Section */}
      <section
        id="catalogo-acomodacoes"
        className="max-w-[1440px] mx-auto px-4 sm:px-6 py-8 sm:py-10 space-y-5 scroll-mt-16"
      >
        {/* Section Title */}
        <div>
          <h2
            className={`text-xl sm:text-2xl font-bold ${
              isDark ? 'text-white' : 'text-slate-900'
            }`}
          >
            Catálogo de Acomodações e Camas Reserváveis
          </h2>
          <p
            className={`text-xs sm:text-sm mt-1 ${
              isDark ? 'text-slate-400' : 'text-slate-600'
            }`}
          >
            Preços e disponibilidade calculados em tempo real por unidade física
            para o período de{' '}
            <span className="font-mono font-semibold">{checkIn}</span> a{' '}
            <span className="font-mono font-semibold">{checkOut}</span>.
          </p>
        </div>

        {/* Dedicated Unified Filter Toolbar */}
        <div
          className={`p-3 rounded-xl border flex flex-wrap items-center justify-between gap-3 ${
            isDark
              ? 'bg-slate-900 border-slate-800'
              : 'bg-white border-slate-200'
          }`}
        >
          <div
            className={`flex items-center gap-1 p-1 rounded-lg overflow-x-auto max-w-full ${
              isDark ? 'bg-slate-950' : 'bg-slate-100'
            }`}
          >
            {[
              {id: 'all', label: 'Todas'},
              {id: 'private', label: 'Quartos Privativos'},
              {id: 'family', label: 'Familiar'},
              {id: 'dorm', label: 'Dormitórios'},
              {id: 'female_dorm', label: 'Feminino'},
            ].map((tab) => {
              const isTabActive = categoryFilter === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() =>
                    setCategoryFilter(
                      tab.id as
                        | 'all'
                        | 'private'
                        | 'dorm'
                        | 'female_dorm'
                        | 'family'
                    )
                  }
                  style={
                    isTabActive
                      ? {
                          backgroundColor: brandColor,
                          color: brandContrastText,
                        }
                      : undefined
                  }
                  className={`guest-btn-transition h-7 px-3 text-xs font-semibold rounded-md whitespace-nowrap shrink-0 ${
                    isTabActive
                      ? 'shadow-xs'
                      : isDark
                      ? 'text-slate-400 hover:text-white hover:bg-slate-900'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>

          <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto">
            <div
              className={`h-9 flex items-center gap-2 border rounded-lg px-3 text-xs shrink-0 transition-colors ${
                isDark
                  ? 'bg-slate-950 border-slate-800 text-slate-300'
                  : 'bg-slate-50 border-slate-200 text-slate-600'
              }`}
            >
              <SlidersHorizontal className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <span className="whitespace-nowrap">Até R$</span>
              <input
                type="number"
                min={100}
                max={5000}
                step={50}
                value={maxPriceFilter}
                onChange={(e) =>
                  setMaxPriceFilter(Number(e.target.value) || 2000)
                }
                className={`w-16 font-mono font-semibold bg-transparent focus:outline-none ${
                  isDark ? 'text-white' : 'text-slate-900'
                }`}
              />
            </div>

            <input
              type="text"
              value={amenitySearch}
              onChange={(e) => setAmenitySearch(e.target.value)}
              placeholder="Filtrar comodidade..."
              className={`h-9 flex-1 sm:w-52 rounded-lg border px-3 text-xs transition-colors focus:outline-none ${
                isDark
                  ? 'border-slate-800 bg-slate-950 text-slate-100 placeholder:text-slate-500'
                  : 'border-slate-200 bg-slate-50 text-slate-900 focus:bg-white'
              }`}
            />
          </div>
        </div>

        {/* Accommodations Grid with animated transitions on filter/search changes */}
        {filteredAccommodations.length === 0 ? (
          <div
            className={`animate-step-in p-12 rounded-xl border text-center space-y-3 ${
              isDark
                ? 'bg-slate-900 border-slate-800'
                : 'bg-white border-slate-200'
            }`}
          >
            <p
              className={`text-sm font-medium ${
                isDark ? 'text-slate-300' : 'text-slate-700'
              }`}
            >
              Nenhuma acomodação corresponde aos filtros selecionados.
            </p>
            <button
              type="button"
              onClick={() => {
                setCategoryFilter('all');
                setMaxPriceFilter(2000);
                setAmenitySearch('');
              }}
              style={{
                backgroundColor: brandColor,
                color: brandContrastText,
              }}
              className="guest-btn-transition h-9 px-4 rounded-lg text-xs font-semibold hover:shadow-md"
            >
              Limpar Filtros
            </button>
          </div>
        ) : (
          <div
            key={`${categoryFilter}-${catalogPulseKey}`}
            className="animate-step-in grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 items-stretch"
          >
            {filteredAccommodations.map((acc) => {
              const quote = calculateStayQuote({
                accommodation: acc,
                units,
                availabilitySlots,
                ratePlans,
                checkIn,
                checkOut,
                guestsCount: Math.min(guestsCount, acc.capacity),
              });
              const totalUnitsForAcc = units.filter(
                (u) => u.accommodationId === acc.id && u.status === 'active'
              );
              const isDorm =
                acc.type.includes('dorm') || acc.pricingMode === 'per_bed';

              const galleryList =
                acc.galleryUrls && acc.galleryUrls.length > 0
                  ? acc.galleryUrls
                  : [acc.imageUrl].filter(Boolean);
              const currentPhotoIdx =
                (activePhotoIndexByAcc[acc.id] || 0) %
                Math.max(1, galleryList.length);
              const currentPhotoSrc =
                galleryList[currentPhotoIdx] || acc.imageUrl;

              return (
                <article
                  key={acc.id}
                  style={{
                    borderTopWidth: isImmersive ? '4px' : '3px',
                    borderTopColor: brandColor,
                  }}
                  className={`guest-card-transition group rounded-xl border overflow-hidden flex flex-col justify-between h-full ${
                    isDark
                      ? 'bg-slate-900 border-slate-800 hover:shadow-xl hover:border-slate-700'
                      : 'bg-white border-slate-200 shadow-xs hover:shadow-lg hover:border-slate-300'
                  }`}
                >
                  <div>
                    <div
                      className={`relative h-52 w-full overflow-hidden border-b ${
                        isDark ? 'border-slate-800' : 'border-slate-100'
                      }`}
                    >
                      <ResilientImage
                        src={currentPhotoSrc}
                        alt={`${acc.name} - Foto ${currentPhotoIdx + 1}`}
                        className="w-full h-full object-cover transition-transform duration-500 ease-out group-hover:scale-[1.04]"
                      />

                      {galleryList.length > 1 && (
                        <>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setActivePhotoIndexByAcc((prev) => ({
                                ...prev,
                                [acc.id]:
                                  (currentPhotoIdx - 1 + galleryList.length) %
                                  galleryList.length,
                              }));
                            }}
                            title="Foto anterior"
                            className="guest-btn-transition absolute left-2 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-slate-900/70 text-white flex items-center justify-center hover:bg-slate-900 shadow-sm"
                          >
                            <ChevronLeft className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setActivePhotoIndexByAcc((prev) => ({
                                ...prev,
                                [acc.id]:
                                  (currentPhotoIdx + 1) % galleryList.length,
                              }));
                            }}
                            title="Próxima foto"
                            className="guest-btn-transition absolute right-2 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-slate-900/70 text-white flex items-center justify-center hover:bg-slate-900 shadow-sm"
                          >
                            <ChevronRight className="w-4 h-4" />
                          </button>
                          <div className="absolute bottom-2.5 right-2.5 px-2 py-0.5 rounded-md bg-slate-900/75 text-white text-[10px] font-mono inline-flex items-center gap-1 backdrop-blur-xs">
                            <Images className="w-3 h-3" />
                            <span>
                              {currentPhotoIdx + 1}/{galleryList.length}
                            </span>
                          </div>
                        </>
                      )}
                    </div>

                    <div className="p-5 space-y-2.5">
                      <div
                        className={`flex flex-wrap items-center gap-1.5 text-xs ${
                          isDark ? 'text-slate-400' : 'text-slate-500'
                        }`}
                      >
                        <span
                          style={
                            !isDark
                              ? {color: brandColor}
                              : {color: '#F8FAFC'}
                          }
                          className="font-semibold"
                        >
                          {TYPE_LABEL[acc.type]}
                        </span>
                        <span aria-hidden="true">·</span>
                        <span>Até {acc.capacity} hóspede(s)</span>
                        <span aria-hidden="true">·</span>
                        <span>
                          {acc.bedsCount}{' '}
                          {acc.bedsCount === 1 ? 'cama' : 'camas'}
                        </span>
                      </div>

                      <h3
                        className={`text-lg font-bold leading-snug ${
                          isDark ? 'text-white' : 'text-slate-900'
                        }`}
                      >
                        {acc.name}
                      </h3>

                      <p
                        className={`text-xs leading-relaxed line-clamp-3 ${
                          isDark ? 'text-slate-300' : 'text-slate-600'
                        }`}
                      >
                        {acc.description}
                      </p>

                      {acc.amenities && (
                        <div
                          className={`pt-1 text-xs line-clamp-2 ${
                            isDark ? 'text-slate-400' : 'text-slate-500'
                          }`}
                        >
                          {acc.amenities
                            .split(',')
                            .map((item) => item.trim())
                            .filter(Boolean)
                            .join(' · ')}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Card Footer — Clean 2-Column Rate Summary + Full-Width CTA */}
                  <div
                    style={
                      isImmersive
                        ? {backgroundColor: hexToRgba(brandColor, 0.05)}
                        : undefined
                    }
                    className={`p-5 pt-4 border-t space-y-3 ${
                      isDark
                        ? 'border-slate-800 bg-slate-950/60'
                        : isImmersive
                        ? 'border-slate-200'
                        : 'border-slate-100 bg-slate-50/70'
                    }`}
                  >
                    <div className="grid grid-cols-2 gap-3 items-end">
                      <div className="min-w-0">
                        <span
                          className={`text-[11px] block truncate ${
                            isDark ? 'text-slate-400' : 'text-slate-500'
                          }`}
                        >
                          Diária ({PRICING_MODE_LABEL[acc.pricingMode]})
                        </span>
                        <span
                          className={`text-xl font-bold font-mono block ${
                            isDark ? 'text-white' : 'text-slate-900'
                          }`}
                        >
                          R$ {acc.basePrice.toLocaleString('pt-BR')}
                        </span>
                        <span
                          className={`text-[11px] block font-mono truncate ${
                            isDark ? 'text-slate-400' : 'text-slate-500'
                          }`}
                        >
                          {acc.weekendPrice
                            ? `Fim de semana: R$ ${acc.weekendPrice.toLocaleString('pt-BR')}`
                            : 'Tarifa fixa semanal'}
                        </span>
                      </div>

                      <div className="text-right min-w-0">
                        <span
                          className={`text-[11px] block truncate ${
                            isDark ? 'text-slate-400' : 'text-slate-500'
                          }`}
                        >
                          Total ({quote.nights}{' '}
                          {quote.nights === 1 ? 'noite' : 'noites'})
                        </span>
                        <span
                          className={`text-base font-bold font-mono block ${
                            isDark ? 'text-white' : 'text-slate-900'
                          }`}
                        >
                          R$ {quote.totalAmount.toLocaleString('pt-BR')}
                        </span>
                        <span
                          className={`block text-[11px] font-semibold truncate ${
                            quote.isAvailable
                              ? isDark
                                ? 'text-emerald-400'
                                : 'text-emerald-700'
                              : isDark
                              ? 'text-red-400'
                              : 'text-red-600'
                          }`}
                        >
                          {quote.availableUnits.length} de{' '}
                          {totalUnitsForAcc.length}{' '}
                          {isDorm ? 'camas livres' : 'unidades livres'}
                        </span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => setSelectedAccommodation(acc)}
                      style={
                        quote.isAvailable
                          ? {
                              backgroundColor: brandColor,
                              color: brandContrastText,
                            }
                          : undefined
                      }
                      className={`guest-btn-transition group/btn h-10 w-full inline-flex items-center justify-center gap-2 px-4 rounded-lg text-xs font-semibold whitespace-nowrap ${
                        quote.isAvailable
                          ? 'hover:opacity-95 hover:shadow-md'
                          : isDark
                          ? 'bg-slate-800 text-slate-200 hover:bg-slate-700'
                          : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                      }`}
                    >
                      <span>
                        {quote.isAvailable
                          ? isDorm
                            ? 'Escolher Cama(s) e Reservar'
                            : 'Escolher Quarto e Reservar'
                          : 'Ver Outras Datas no Calendário'}
                      </span>
                      <ArrowRight className="w-3.5 h-3.5 shrink-0 transition-transform duration-200 group-hover/btn:translate-x-1" />
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      {/* 3. Property Policies, Location & Contact Section */}
      <section
        style={
          isImmersive
            ? {borderTopWidth: '3px', borderTopColor: brandColor}
            : undefined
        }
        className={`border-t ${
          isDark
            ? 'bg-slate-900 border-slate-800 text-slate-300'
            : 'bg-white border-slate-200'
        }`}
      >
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 py-10 grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="space-y-2">
            <h3
              className={`text-base font-bold ${
                isDark ? 'text-white' : 'text-slate-900'
              }`}
            >
              Políticas de Reserva e Cancelamento
            </h3>
            <p
              className={`text-xs leading-relaxed ${
                isDark ? 'text-slate-300' : 'text-slate-600'
              }`}
            >
              {activeTenant.cancellationPolicy ||
                'Cancelamento gratuito até 7 dias antes do check-in.'}
            </p>
            <p
              className={`text-xs pt-1 ${
                isDark ? 'text-slate-400' : 'text-slate-500'
              }`}
            >
              A data de check-out ({activeTenant.checkOutTime}) libera a unidade
              e não é contabilizada como diária adicional.
            </p>
          </div>

          <div className="space-y-2">
            <h3
              className={`text-base font-bold ${
                isDark ? 'text-white' : 'text-slate-900'
              }`}
            >
              Regras de Convivência e Horários
            </h3>
            <p
              className={`text-xs leading-relaxed ${
                isDark ? 'text-slate-300' : 'text-slate-600'
              }`}
            >
              {activeTenant.houseRules ||
                'Apresentação de documento oficial com foto obrigatória no check-in.'}
            </p>
            <p
              className={`text-xs font-mono pt-1 ${
                isDark ? 'text-slate-200' : 'text-slate-700'
              }`}
            >
              Check-in a partir das {activeTenant.checkInTime} · Check-out até
              as {activeTenant.checkOutTime}
            </p>
          </div>

          <div className="space-y-3">
            <h3
              className={`text-base font-bold ${
                isDark ? 'text-white' : 'text-slate-900'
              }`}
            >
              Localização e Canais Diretos
            </h3>
            <div
              className={`text-xs space-y-1.5 ${
                isDark ? 'text-slate-300' : 'text-slate-600'
              }`}
            >
              {activeTenant.address && (
                <div className="flex items-center gap-2">
                  <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span>
                    {activeTenant.address} — {activeTenant.city}/
                    {activeTenant.state}
                  </span>
                </div>
              )}
              {activeTenant.phone && (
                <div className="flex items-center gap-2">
                  <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <a
                    href={`tel:${activeTenant.phone}`}
                    className="hover:underline font-mono transition-opacity hover:opacity-80"
                  >
                    {activeTenant.phone}
                  </a>
                </div>
              )}
            </div>
            <div className="flex flex-wrap gap-2 pt-1">
              {activeTenant.address && (
                <a
                  href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                    `${activeTenant.name} ${activeTenant.address} ${activeTenant.city || ''}`
                  )}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`guest-btn-transition group h-8 inline-flex items-center gap-1.5 rounded-lg border px-3 text-xs font-medium whitespace-nowrap ${
                    isDark
                      ? 'border-slate-700 text-slate-200 hover:bg-slate-800'
                      : 'border-slate-300 text-slate-700 hover:bg-slate-50 hover:shadow-xs'
                  }`}
                >
                  <MapPin className="w-3.5 h-3.5 shrink-0 transition-transform duration-200 group-hover:scale-110" />
                  <span>Abrir no Google Maps</span>
                </a>
              )}
              {activeTenant.whatsapp && (
                <a
                  href={`https://wa.me/${activeTenant.whatsapp.replace(/\D/g, '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`guest-btn-transition group h-8 inline-flex items-center gap-1.5 rounded-lg border px-3 text-xs font-medium whitespace-nowrap ${
                    isDark
                      ? 'border-slate-700 text-slate-200 hover:bg-slate-800'
                      : 'border-slate-300 text-slate-700 hover:bg-slate-50 hover:shadow-xs'
                  }`}
                >
                  <MessageCircle className="w-3.5 h-3.5 text-emerald-600 shrink-0 transition-transform duration-200 group-hover:scale-110" />
                  <span>Atendimento WhatsApp</span>
                </a>
              )}
            </div>
          </div>
        </div>
      </section>

      {selectedAccommodation && (
        <BookingWizard
          tenant={activeTenant}
          accommodation={selectedAccommodation}
          units={units}
          availabilitySlots={availabilitySlots}
          ratePlans={ratePlans}
          initialCheckIn={checkIn}
          initialCheckOut={checkOut}
          initialGuestsCount={guestsCount}
          onClose={() => setSelectedAccommodation(null)}
          onReservationCompleted={(res) => {
            setSelectedAccommodation(null);
            onOpenVoucher(res);
          }}
        />
      )}
    </div>
  );
};
