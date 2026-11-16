import React from 'react';
import {KeyRound, LogOut, Shield} from 'lucide-react';
import {
  darkenHex,
  hexToRgba,
  isColorLight,
} from '../../constants/branding';
import {EnvironmentView, useApp} from '../../context/AppContext';
import {PWAInstallButton} from './PWAInstallButton';

interface TopNavProps {
  onOpenReservationLookup: () => void;
}

export const TopNav: React.FC<TopNavProps> = ({onOpenReservationLookup}) => {
  const {
    environment,
    setEnvironment,
    activeTenant,
    firebaseUser,
    tenantOperatorSession,
    isPlatformAdmin,
    canManageActiveTenant,
    logout,
  } = useApp();

  const handleSwitchEnvironment = (env: EnvironmentView) => {
    setEnvironment(env);
    if (env === 'platform_admin') {
      window.location.hash = '#/platform';
    } else if (env === 'tenant_admin') {
      window.location.hash = activeTenant
        ? `#/admin/${activeTenant.slug}`
        : '#/admin';
    } else {
      window.location.hash = activeTenant
        ? `#/s/${activeTenant.slug}`
        : '#/';
    }
  };

  const brandTitle =
    environment === 'platform_admin' || !activeTenant
      ? 'Digit4lKey StayOS'
      : activeTenant.name;

  const authenticatedLabel = firebaseUser?.email
    ? firebaseUser.email.split('@')[0]
    : tenantOperatorSession?.email
    ? tenantOperatorSession.email.split('@')[0]
    : null;

  const isGuestThemed = environment === 'guest_portal' && Boolean(activeTenant);
  const themeVariant = activeTenant?.themeVariant || 'classic_light';
  const brandColor = activeTenant?.primaryColor || '#0F172A';
  const isImmersive = isGuestThemed && themeVariant === 'resort_tint';
  const isDark = isGuestThemed && themeVariant === 'boutique_dark';
  const immersiveLightText = !isColorLight(brandColor);

  const headerStyle: React.CSSProperties | undefined = isImmersive
    ? {
        backgroundColor: brandColor,
        borderBottomColor: darkenHex(brandColor, 0.2),
        color: immersiveLightText ? '#FFFFFF' : '#0F172A',
      }
    : isDark
    ? {
        borderBottomColor: hexToRgba(brandColor, 0.55),
      }
    : isGuestThemed
    ? {
        borderTop: `3px solid ${brandColor}`,
      }
    : undefined;

  return (
    <div
      style={headerStyle}
      className={`w-full border-b sticky top-0 z-40 transition-colors ${
        isDark
          ? 'bg-slate-950 text-slate-100 border-slate-800'
          : isImmersive
          ? ''
          : 'bg-white text-slate-900 border-slate-200'
      }`}
    >
      {/* Main Header Row */}
      <header className="max-w-[1440px] mx-auto h-16 flex items-center justify-between gap-3 px-4 sm:px-6">
        {/* Zone 1: Brand Title — Prioritized width for establishment name */}
        <div className="flex-1 min-w-0 flex items-center gap-2.5">
          {isGuestThemed && !isImmersive && (
            <span
              className="w-2 h-5 rounded-full shrink-0"
              style={{backgroundColor: brandColor}}
            />
          )}
          <a
            href={activeTenant ? `#/s/${activeTenant.slug}` : '#/platform'}
            onClick={(e) => {
              e.preventDefault();
              handleSwitchEnvironment(
                activeTenant ? 'guest_portal' : 'platform_admin'
              );
            }}
            title={brandTitle}
            className={`text-base sm:text-lg lg:text-xl font-bold tracking-tight truncate transition-opacity duration-200 hover:opacity-85 ${
              isDark
                ? 'text-white'
                : isImmersive
                ? immersiveLightText
                  ? 'text-white'
                  : 'text-slate-900'
                : 'text-slate-900'
            }`}
          >
            {brandTitle}
          </a>
        </div>

        {/* Zone 2: Desktop Navigation */}
        <nav
          className={`hidden xl:flex items-center gap-6 text-sm font-medium shrink-0 ${
            isDark
              ? 'text-slate-300'
              : isImmersive
              ? immersiveLightText
                ? 'text-white/80'
                : 'text-slate-800/80'
              : 'text-slate-600'
          }`}
        >
          {activeTenant && (
            <>
              <button
                type="button"
                onClick={() => handleSwitchEnvironment('guest_portal')}
                style={
                  environment === 'guest_portal' && !isImmersive
                    ? {borderBottomColor: brandColor}
                    : undefined
                }
                className={`h-16 inline-flex items-center border-b-2 transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0 whitespace-nowrap ${
                  environment === 'guest_portal'
                    ? isImmersive
                      ? immersiveLightText
                        ? 'border-white text-white font-semibold'
                        : 'border-slate-900 text-slate-900 font-semibold'
                      : isDark
                      ? 'text-white font-semibold'
                      : 'text-slate-900 font-semibold'
                    : isImmersive
                    ? 'border-transparent hover:opacity-100'
                    : isDark
                    ? 'border-transparent hover:text-white'
                    : 'border-transparent hover:text-slate-900'
                }`}
              >
                Acomodações & Reservas
              </button>

              <button
                type="button"
                onClick={onOpenReservationLookup}
                className={`h-16 inline-flex items-center border-b-2 border-transparent transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0 whitespace-nowrap ${
                  isDark
                    ? 'hover:text-white'
                    : isImmersive
                    ? 'hover:opacity-100'
                    : 'hover:text-slate-900'
                }`}
              >
                Consultar Minha Reserva
              </button>

              <button
                type="button"
                onClick={() => handleSwitchEnvironment('tenant_admin')}
                className={`h-16 inline-flex items-center border-b-2 transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0 whitespace-nowrap ${
                  environment === 'tenant_admin'
                    ? 'border-slate-900 text-slate-900 font-semibold'
                    : isDark
                    ? 'border-transparent hover:text-white'
                    : isImmersive
                    ? 'border-transparent hover:opacity-100'
                    : 'border-transparent hover:text-slate-900'
                }`}
              >
                Painel do Estabelecimento
              </button>
            </>
          )}

          {(isPlatformAdmin || !activeTenant) && (
            <button
              type="button"
              onClick={() => handleSwitchEnvironment('platform_admin')}
              className={`h-16 inline-flex items-center border-b-2 transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0 whitespace-nowrap ${
                environment === 'platform_admin'
                  ? 'border-slate-900 text-slate-900 font-semibold'
                  : isDark
                  ? 'border-transparent hover:text-white'
                  : 'border-transparent hover:text-slate-900'
              }`}
            >
              Admin Geral SaaS
            </button>
          )}
        </nav>

        {/* Zone 3: Discreet & Compact Auth & App Controls */}
        <div className="flex items-center gap-1 shrink-0">
          <PWAInstallButton
            toneClassName={
              isDark
                ? 'text-slate-400 hover:text-white hover:bg-slate-800/80'
                : isImmersive
                ? immersiveLightText
                  ? 'text-white/75 hover:text-white hover:bg-white/10'
                  : 'text-slate-800/75 hover:text-slate-900 hover:bg-black/10'
                : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'
            }
          />

          {authenticatedLabel ? (
            <button
              type="button"
              onClick={logout}
              title={`Sair (${authenticatedLabel})`}
              aria-label={`Sair (${authenticatedLabel})`}
              className={`guest-btn-transition h-8 w-8 sm:w-auto sm:px-2.5 inline-flex items-center justify-center gap-1.5 text-[11px] font-medium rounded-md whitespace-nowrap ${
                isDark
                  ? 'text-slate-300 hover:text-white hover:bg-slate-800/80'
                  : isImmersive
                  ? immersiveLightText
                    ? 'text-white/85 hover:text-white hover:bg-white/15'
                    : 'text-slate-800 hover:text-slate-900 hover:bg-black/10'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <LogOut className="w-3.5 h-3.5 shrink-0" />
              <span className="hidden sm:inline">Sair</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() =>
                handleSwitchEnvironment(
                  activeTenant ? 'tenant_admin' : 'platform_admin'
                )
              }
              title={activeTenant ? 'Acesso do Gestor' : 'Acesso Admin SaaS'}
              aria-label={
                activeTenant ? 'Acesso do Gestor' : 'Acesso Admin SaaS'
              }
              className={`guest-btn-transition h-8 w-8 sm:w-auto sm:px-2.5 inline-flex items-center justify-center gap-1.5 text-[11px] font-medium rounded-md whitespace-nowrap ${
                isDark
                  ? 'text-slate-400 hover:text-white hover:bg-slate-800/80'
                  : isImmersive
                  ? immersiveLightText
                    ? 'text-white/80 hover:text-white hover:bg-white/15'
                    : 'text-slate-800/80 hover:text-slate-900 hover:bg-black/10'
                  : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <KeyRound className="w-3.5 h-3.5 shrink-0" />
              <span className="hidden sm:inline">
                {activeTenant ? 'Gestor' : 'Admin'}
              </span>
            </button>
          )}
        </div>
      </header>

      {/* Sub-navigation bar for screens below 1280px */}
      <div
        className={`flex xl:hidden items-center gap-2 border-t px-4 sm:px-6 py-2 text-xs overflow-x-auto ${
          isDark
            ? 'bg-slate-900 border-slate-800'
            : isImmersive
            ? 'bg-black/15 border-white/15'
            : 'bg-slate-50 border-slate-200'
        }`}
      >
        {activeTenant && (
          <>
            <button
              type="button"
              onClick={() => handleSwitchEnvironment('guest_portal')}
              style={
                environment === 'guest_portal' && !isImmersive
                  ? {
                      backgroundColor: brandColor,
                      color: isColorLight(brandColor) ? '#0F172A' : '#FFFFFF',
                    }
                  : undefined
              }
              className={`guest-btn-transition h-8 px-3 rounded-lg font-semibold whitespace-nowrap shrink-0 ${
                environment === 'guest_portal'
                  ? isImmersive
                    ? 'bg-white text-slate-900'
                    : ''
                  : isDark
                  ? 'text-slate-300 hover:bg-slate-800'
                  : isImmersive
                  ? 'text-white/90 hover:bg-white/15'
                  : 'text-slate-600 hover:bg-slate-200/70'
              }`}
            >
              Acomodações & Reservas
            </button>

            <button
              type="button"
              onClick={onOpenReservationLookup}
              className={`guest-btn-transition h-8 px-3 rounded-lg font-semibold whitespace-nowrap shrink-0 ${
                isDark
                  ? 'text-slate-300 hover:bg-slate-800'
                  : isImmersive
                  ? 'text-white/90 hover:bg-white/15'
                  : 'text-slate-600 hover:bg-slate-200/70'
              }`}
            >
              Consultar Minha Reserva
            </button>

            <button
              type="button"
              onClick={() => handleSwitchEnvironment('tenant_admin')}
              className={`guest-btn-transition h-8 px-3 rounded-lg font-semibold whitespace-nowrap shrink-0 ${
                environment === 'tenant_admin'
                  ? 'bg-slate-900 text-white'
                  : isDark
                  ? 'text-slate-300 hover:bg-slate-800'
                  : isImmersive
                  ? 'text-white/90 hover:bg-white/15'
                  : 'text-slate-600 hover:bg-slate-200/70'
              }`}
            >
              {canManageActiveTenant
                ? 'Painel do Estabelecimento'
                : 'Login do Gestor'}
            </button>
          </>
        )}

        {(isPlatformAdmin || !activeTenant) && (
          <button
            type="button"
            onClick={() => handleSwitchEnvironment('platform_admin')}
            className={`guest-btn-transition h-8 px-3 rounded-lg font-semibold whitespace-nowrap shrink-0 ${
              environment === 'platform_admin'
                ? 'bg-slate-900 text-white'
                : isDark
                ? 'text-slate-300 hover:bg-slate-800'
                : isImmersive
                ? 'text-white/90 hover:bg-white/15'
                : 'text-slate-600 hover:bg-slate-200/70'
            }`}
          >
            Admin Geral SaaS
          </button>
        )}
      </div>

      {/* Exclusive Platform Admin Bar — ONLY visible when logged in as digit4lkey@gmail.com */}
      {isPlatformAdmin && (
        <div className="bg-slate-900 text-slate-200 px-4 sm:px-6 py-2 text-xs border-t border-slate-800">
          <div className="max-w-[1440px] mx-auto flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <Shield className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span className="font-semibold text-white truncate">
                Modo Administrador Geral (digit4lkey@gmail.com)
              </span>
              {activeTenant && (
                <span className="text-slate-400 hidden sm:inline">
                  · Visualizando local:{' '}
                  <strong className="text-slate-200 font-mono">
                    #/s/{activeTenant.slug}
                  </strong>
                </span>
              )}
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => handleSwitchEnvironment('platform_admin')}
                className="h-7 px-3 rounded bg-slate-800 hover:bg-slate-700 text-white font-medium transition-colors whitespace-nowrap"
              >
                Gerenciar Todos os Locais & Credenciais
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
