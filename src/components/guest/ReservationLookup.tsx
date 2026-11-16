import React, {useState} from 'react';
import {
  CalendarPlus,
  CheckCircle2,
  MapPin,
  MessageCircle,
  Phone,
  Search,
  Share2,
  Sparkles,
  X,
} from 'lucide-react';
import {Reservation, Tenant} from '../../types/models';

interface ReservationLookupProps {
  tenant: Tenant;
  reservations: Reservation[];
  initialReservation?: Reservation | null;
  onClose: () => void;
}

export const ReservationLookup: React.FC<ReservationLookupProps> = ({
  tenant,
  reservations,
  initialReservation,
  onClose,
}) => {
  const [searchCode, setSearchCode] = useState(initialReservation?.code || '');
  const [verificationContact, setVerificationContact] = useState(
    initialReservation?.guestEmail || ''
  );
  const [foundReservation, setFoundReservation] = useState<Reservation | null>(
    initialReservation || null
  );
  const [lookupError, setLookupError] = useState<string | null>(null);
  const [shareFeedback, setShareFeedback] = useState<string | null>(null);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setLookupError(null);
    const cleanCode = searchCode.trim().toUpperCase();
    const cleanContact = verificationContact.trim().toLowerCase();

    const match = reservations.find((r) => r.code.toUpperCase() === cleanCode);
    if (!match) {
      setLookupError(
        'Nenhuma reserva localizada com este código neste estabelecimento.'
      );
      setFoundReservation(null);
      return;
    }

    // Verify guest identity (email or last 4 digits of phone)
    const emailMatches = match.guestEmail.toLowerCase() === cleanContact;
    const phoneDigits = match.guestPhone.replace(/\D/g, '');
    const inputDigits = cleanContact.replace(/\D/g, '');
    const phoneMatches =
      inputDigits.length >= 4 && phoneDigits.endsWith(inputDigits);

    if (cleanContact && !emailMatches && !phoneMatches) {
      setLookupError(
        'Verificação de segurança falhou: informe o e-mail ou os últimos 4 dígitos do telefone cadastrado na reserva.'
      );
      setFoundReservation(null);
      return;
    }

    setFoundReservation(match);
  };

  const handleAddToGoogleCalendar = (res: Reservation) => {
    const start = res.checkIn.replace(/-/g, '');
    const end = res.checkOut.replace(/-/g, '');
    const text = encodeURIComponent(`Hospedagem: ${tenant.name} (${res.code})`);
    const details = encodeURIComponent(
      `Reserva ${res.code} - ${res.accommodationName} (${res.unitLabelsCsv}). Check-in: ${tenant.checkInTime}, Check-out: ${tenant.checkOutTime}.`
    );
    const location = encodeURIComponent(
      `${tenant.address || ''} - ${tenant.city || ''} ${tenant.state || ''}`
    );
    const calendarUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${text}&dates=${start}/${end}&details=${details}&location=${location}`;
    window.open(calendarUrl, '_blank', 'noopener,noreferrer');
  };

  const handleShareVoucher = async (res: Reservation) => {
    const shareData = {
      title: `Comprovante de Reserva ${res.code} — ${tenant.name}`,
      text: `Reserva confirmada em ${tenant.name}: ${res.accommodationName} (${res.unitLabelsCsv}) de ${res.checkIn} a ${res.checkOut}. Código: ${res.code}`,
      url: window.location.href,
    };
    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        await navigator.clipboard.writeText(
          `${shareData.title}\n${shareData.text}`
        );
        setShareFeedback('Comprovante copiado para a área de transferência.');
        setTimeout(() => setShareFeedback(null), 3000);
      }
    } catch {
      // User cancelled share
    }
  };

  return (
    <div className="animate-backdrop-in fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 p-3 sm:p-6">
      <div className="animate-modal-in w-full max-w-2xl max-h-[90vh] rounded-xl bg-white border border-slate-200 flex flex-col overflow-hidden shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50 shrink-0">
          <div>
            <p className="text-xs text-slate-500 font-medium">
              {tenant.name} · Portal do Hóspede
            </p>
            <h2 className="text-base font-bold text-slate-900">
              Consulta e Comprovante de Reserva
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="guest-btn-transition p-2 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-200/60"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Lookup Form */}
          <form
            onSubmit={handleSearch}
            className="grid grid-cols-1 sm:grid-cols-12 gap-3 p-4 rounded-xl bg-slate-50 border border-slate-200"
          >
            <div className="sm:col-span-5">
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Código da Reserva
              </label>
              <input
                type="text"
                required
                value={searchCode}
                onChange={(e) => setSearchCode(e.target.value)}
                placeholder="Ex.: DK-2611-A8F2"
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-mono uppercase text-slate-900"
              />
            </div>
            <div className="sm:col-span-5">
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                E-mail ou 4 finais do Telefone
              </label>
              <input
                type="text"
                value={verificationContact}
                onChange={(e) => setVerificationContact(e.target.value)}
                placeholder="mariana.vasconcelos@email.com.br"
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900"
              />
            </div>
            <div className="sm:col-span-2 flex items-end">
              <button
                type="submit"
                className="guest-btn-transition w-full inline-flex items-center justify-center gap-1.5 rounded-lg bg-slate-900 text-white px-3 py-2 text-xs font-semibold hover:bg-slate-800 hover:shadow-sm"
              >
                <Search className="w-3.5 h-3.5" />
                Buscar
              </button>
            </div>
            <div className="sm:col-span-12 text-[11px] text-slate-500">
              Dica Demo: Experimente o código{' '}
              <button
                type="button"
                onClick={() => {
                  setSearchCode('DK-2611-A8F2');
                  setVerificationContact('mariana.vasconcelos@email.com.br');
                }}
                className="font-mono font-semibold text-slate-800 underline hover:opacity-75 transition-opacity"
              >
                DK-2611-A8F2
              </button>{' '}
              ou{' '}
              <button
                type="button"
                onClick={() => {
                  setSearchCode('DK-2611-C7M1');
                  setVerificationContact('rafael.mendes@techdev.io');
                }}
                className="font-mono font-semibold text-slate-800 underline hover:opacity-75 transition-opacity"
              >
                DK-2611-C7M1
              </button>
              .
            </div>
          </form>

          {lookupError && (
            <div className="animate-step-in p-3.5 rounded-lg border border-red-200 bg-red-50 text-xs font-medium text-red-800">
              {lookupError}
            </div>
          )}

          {/* Voucher Display */}
          {foundReservation && (
            <div className="animate-step-in rounded-xl border border-slate-200 bg-white p-6 space-y-5">
              <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-200 pb-4">
                <div>
                  <div className="flex items-center gap-2 text-emerald-700 text-xs font-semibold">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Comprovante Oficial de Hospedagem</span>
                  </div>
                  <h3 className="text-xl font-bold font-mono text-slate-900 mt-1">
                    {foundReservation.code}
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Status: <strong className="uppercase">{foundReservation.status}</strong> ·
                    Titular: {foundReservation.guestName}
                  </p>
                </div>

                {foundReservation.isSimulatedPayment && (
                  <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 text-xs font-medium">
                    <Sparkles className="w-3.5 h-3.5 text-amber-700" />
                    <span>Pagamento Simulado (Modo Demo)</span>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200/80 space-y-1">
                  <span className="text-slate-500">Acomodação e Unidade(s)</span>
                  <div className="font-semibold text-slate-900 text-sm">
                    {foundReservation.accommodationName}
                  </div>
                  <div className="font-mono text-slate-700">
                    {foundReservation.unitLabelsCsv}
                  </div>
                </div>

                <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200/80 space-y-1">
                  <span className="text-slate-500">Período da Estadia</span>
                  <div className="font-mono font-semibold text-slate-900 text-sm">
                    {foundReservation.checkIn} até {foundReservation.checkOut}
                  </div>
                  <div className="text-slate-600">
                    {foundReservation.nights} noite(s) · {foundReservation.guestsCount} hóspede(s)
                  </div>
                </div>

                <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200/80 space-y-1">
                  <span className="text-slate-500">Resumo Financeiro</span>
                  <div className="font-mono font-bold text-slate-900 text-sm">
                    Total: R$ {foundReservation.totalAmount.toLocaleString('pt-BR')}
                  </div>
                  <div className="font-mono text-emerald-700">
                    Pago: R$ {foundReservation.paidAmount.toLocaleString('pt-BR')} (
                    {foundReservation.paymentMethod.toUpperCase()})
                  </div>
                </div>

                <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200/80 space-y-1">
                  <span className="text-slate-500">Horários e Endereço</span>
                  <div className="font-semibold text-slate-900">
                    Check-in {tenant.checkInTime} · Check-out {tenant.checkOutTime}
                  </div>
                  <div className="text-slate-600 truncate">
                    {tenant.address}, {tenant.city} - {tenant.state}
                  </div>
                </div>
              </div>

              {shareFeedback && (
                <div className="text-xs font-medium text-emerald-700">
                  {shareFeedback}
                </div>
              )}

              {/* Android / PWA Native Integrations */}
              <div className="pt-2 border-t border-slate-200">
                <p className="text-xs font-semibold text-slate-700 mb-2.5">
                  Ações Rápidas e Integrações Mobile:
                </p>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => handleAddToGoogleCalendar(foundReservation)}
                    className="guest-btn-transition inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-800 hover:bg-slate-50 hover:shadow-xs"
                  >
                    <CalendarPlus className="w-3.5 h-3.5" />
                    Google Calendar
                  </button>

                  <button
                    type="button"
                    onClick={() => handleShareVoucher(foundReservation)}
                    className="guest-btn-transition inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-800 hover:bg-slate-50 hover:shadow-xs"
                  >
                    <Share2 className="w-3.5 h-3.5" />
                    Compartilhar
                  </button>

                  {tenant.whatsapp && (
                    <a
                      href={`https://wa.me/${tenant.whatsapp.replace(/\D/g, '')}?text=${encodeURIComponent(
                        `Olá! Gostaria de falar sobre minha reserva ${foundReservation.code} em ${tenant.name}.`
                      )}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="guest-btn-transition inline-flex items-center gap-1.5 rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-900 hover:bg-emerald-100 hover:shadow-xs"
                    >
                      <MessageCircle className="w-3.5 h-3.5" />
                      WhatsApp Recepção
                    </a>
                  )}

                  {tenant.phone && (
                    <a
                      href={`tel:${tenant.phone}`}
                      className="guest-btn-transition inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-800 hover:bg-slate-50 hover:shadow-xs"
                    >
                      <Phone className="w-3.5 h-3.5" />
                      Ligar
                    </a>
                  )}

                  {tenant.address && (
                    <a
                      href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                        `${tenant.name} ${tenant.address} ${tenant.city || ''}`
                      )}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="guest-btn-transition inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-800 hover:bg-slate-50 hover:shadow-xs"
                    >
                      <MapPin className="w-3.5 h-3.5" />
                      Google Maps
                    </a>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
