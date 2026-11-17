/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, {useState} from 'react';
import {BrandLogo47} from './components/common/BrandLogo47';
import {OfflineBanner} from './components/common/OfflineBanner';
import {TopNav} from './components/common/TopNav';
import {GuestPortal} from './components/guest/GuestPortal';
import {ReservationLookup} from './components/guest/ReservationLookup';
import {PlatformAdmin} from './components/platform/PlatformAdmin';
import {TenantAdmin} from './components/tenant/TenantAdmin';
import {AppProvider, useApp} from './context/AppContext';
import {Reservation} from './types/models';

const MainRouter: React.FC = () => {
  const {
    environment,
    activeTenant,
    reservations,
    isLoading,
  } = useApp();

  const [lookupModalOpen, setLookupModalOpen] = useState(false);
  const [selectedVoucherRes, setSelectedVoucherRes] =
    useState<Reservation | null>(null);

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900">
      <TopNav
        onOpenReservationLookup={() => {
          setSelectedVoucherRes(null);
          setLookupModalOpen(true);
        }}
      />

      {isLoading ? (
        <div className="flex-1 flex items-center justify-center p-12">
          <div className="text-center space-y-2">
            <div className="w-8 h-8 rounded-full border-2 border-slate-900 border-t-transparent animate-spin mx-auto" />
            <p className="text-xs font-medium text-slate-600">
              Sincronizando infraestrutura Multi-Tenant Cloud Firestore...
            </p>
          </div>
        </div>
      ) : (
        <div className="flex-1">
          {environment === 'guest_portal' && (
            <GuestPortal
              onOpenVoucher={(res) => {
                setSelectedVoucherRes(res);
                setLookupModalOpen(true);
              }}
              onOpenLookupModal={() => {
                setSelectedVoucherRes(null);
                setLookupModalOpen(true);
              }}
            />
          )}

          {environment === 'tenant_admin' && <TenantAdmin />}

          {environment === 'platform_admin' && <PlatformAdmin />}
        </div>
      )}

      {/* Clean institutional footer tailored to current environment */}
      <footer
        style={
          environment === 'guest_portal' &&
          activeTenant?.themeVariant === 'resort_tint'
            ? {
                borderTopWidth: '2px',
                borderTopColor: activeTenant.primaryColor || '#0F172A',
              }
            : undefined
        }
        className={`border-t py-5 px-6 text-xs ${
          environment === 'guest_portal' &&
          activeTenant?.themeVariant === 'boutique_dark'
            ? 'bg-slate-950 border-slate-800 text-slate-400'
            : 'bg-white border-slate-200 text-slate-500'
        }`}
      >
        <div className="max-w-[1440px] mx-auto flex flex-wrap items-center justify-between gap-4">
          {environment === 'guest_portal' && activeTenant ? (
            <>
              <div>
                <strong
                  className={
                    activeTenant.themeVariant === 'boutique_dark'
                      ? 'text-slate-200'
                      : undefined
                  }
                >
                  {activeTenant.name}
                </strong>{' '}
                — Portal Oficial de Reservas Diretas
                {activeTenant.city
                  ? ` · ${activeTenant.city}/${activeTenant.state}`
                  : ''}
              </div>
              <div className="flex items-center gap-4">
                <span>
                  Check-in {activeTenant.checkInTime} · Check-out{' '}
                  {activeTenant.checkOutTime}
                </span>
                <span>·</span>
                <span>Reserva Segura & Conformidade LGPD</span>
              </div>
            </>
          ) : (
            <>
              <div className="flex items-center gap-2.5">
                <BrandLogo47 size="sm" showText={false} />
                <div>
                  <strong className="text-slate-900">47hospedagens</strong> —
                  Plataforma SaaS Multiestabelecimento de Reservas e Gestão de
                  Hospedagem
                </div>
              </div>
              <div className="flex items-center gap-4">
                <span>Isolamento Multi-Tenant Cloud Firestore</span>
                <span>·</span>
                <span>Conformidade LGPD</span>
                <span>·</span>
                <span>PWA Instalável</span>
              </div>
            </>
          )}
        </div>
      </footer>

      {lookupModalOpen && activeTenant && (
        <ReservationLookup
          tenant={activeTenant}
          reservations={reservations}
          initialReservation={selectedVoucherRes}
          onClose={() => {
            setLookupModalOpen(false);
            setSelectedVoucherRes(null);
          }}
        />
      )}

      <OfflineBanner />
    </div>
  );
};

export default function App() {
  return (
    <AppProvider>
      <MainRouter />
    </AppProvider>
  );
}
