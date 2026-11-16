import React, {useMemo, useState} from 'react';
import {
  AlertCircle,
  Calendar,
  CheckCircle2,
  CreditCard,
  Lock,
  QrCode,
  ShieldCheck,
  Sparkles,
  Users,
  X,
} from 'lucide-react';
import {
  calculateStayQuote,
  createTransactionalReservation,
} from '../../services/reservationEngine';
import {
  Accommodation,
  AvailabilitySlot,
  PaymentMethod,
  PaymentModality,
  RatePlan,
  ReservableUnit,
  Reservation,
  Tenant,
} from '../../types/models';
import {sortUnitsNaturally} from '../../utils/unitNumbering';

interface BookingWizardProps {
  tenant: Tenant;
  accommodation: Accommodation;
  units: ReservableUnit[];
  availabilitySlots: AvailabilitySlot[];
  ratePlans: RatePlan[];
  initialCheckIn: string;
  initialCheckOut: string;
  initialGuestsCount: number;
  onClose: () => void;
  onReservationCompleted: (reservation: Reservation) => void;
}

export const BookingWizard: React.FC<BookingWizardProps> = ({
  tenant,
  accommodation,
  units,
  availabilitySlots,
  ratePlans,
  initialCheckIn,
  initialCheckOut,
  initialGuestsCount,
  onClose,
  onReservationCompleted,
}) => {
  const [step, setStep] = useState<'units' | 'guest' | 'payment'>('units');
  const [checkIn, setCheckIn] = useState(initialCheckIn);
  const [checkOut, setCheckOut] = useState(initialCheckOut);
  const [guestsCount, setGuestsCount] = useState(
    Math.min(initialGuestsCount, accommodation.capacity)
  );

  const isDorm =
    accommodation.type.includes('dorm') || accommodation.pricingMode === 'per_bed';
  const requiredUnitsCount = isDorm ? guestsCount : 1;

  const quote = useMemo(
    () =>
      calculateStayQuote({
        accommodation,
        units,
        availabilitySlots,
        ratePlans,
        checkIn,
        checkOut,
        guestsCount,
      }),
    [accommodation, units, availabilitySlots, ratePlans, checkIn, checkOut, guestsCount]
  );

  const [selectedUnitIds, setSelectedUnitIds] = useState<string[]>(() =>
    quote.availableUnits.slice(0, requiredUnitsCount).map((u) => u.id)
  );

  // Sync selectedUnitIds when dates or guest count changes
  const validSelectedUnits = useMemo(() => {
    const availableIds = new Set(quote.availableUnits.map((u) => u.id));
    const currentValid = selectedUnitIds.filter((id) => availableIds.has(id));
    if (currentValid.length === requiredUnitsCount) {
      return quote.availableUnits.filter((u) => currentValid.includes(u.id));
    }
    return quote.availableUnits.slice(0, requiredUnitsCount);
  }, [quote.availableUnits, selectedUnitIds, requiredUnitsCount]);

  // Guest form state
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [documentNumber, setDocumentNumber] = useState('');
  const [city, setCity] = useState('');
  const [notes, setNotes] = useState('');
  const [lgpdConsent, setLgpdConsent] = useState(true);

  // Payment state
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('pix');
  const [paymentModality, setPaymentModality] = useState<PaymentModality>('full');
  const [idempotencyKey] = useState(
    () => `idem_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
  );

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleToggleUnit = (unitId: string) => {
    if (!isDorm) {
      setSelectedUnitIds([unitId]);
      return;
    }
    const currentIds = validSelectedUnits.map((u) => u.id);
    if (currentIds.includes(unitId)) {
      if (currentIds.length > 1) {
        setSelectedUnitIds(currentIds.filter((id) => id !== unitId));
      }
    } else {
      if (currentIds.length < requiredUnitsCount) {
        setSelectedUnitIds([...currentIds, unitId]);
      } else {
        setSelectedUnitIds([...currentIds.slice(1), unitId]);
      }
    }
  };

  const amountDueNow =
    paymentMethod === 'pay_at_property'
      ? 0
      : paymentModality === 'partial'
      ? Math.round(quote.totalAmount * 0.5)
      : quote.totalAmount;

  const handleConfirmBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!quote.isAvailable || validSelectedUnits.length < requiredUnitsCount) {
      setErrorMsg('Unidades insuficientes disponíveis para o período selecionado.');
      return;
    }
    if (!fullName.trim() || !email.trim() || !phone.trim()) {
      setErrorMsg('Preencha nome completo, e-mail e telefone para continuar.');
      return;
    }

    setIsSubmitting(true);
    try {
      const created = await createTransactionalReservation({
        tenantId: tenant.id,
        accommodation,
        selectedUnits: validSelectedUnits,
        checkIn,
        checkOut,
        guestsCount,
        guestInfo: {
          fullName,
          email,
          phone,
          documentNumber,
          city,
          lgpdConsent,
          notes,
        },
        paymentMethod,
        paymentModality,
        totalAmount: quote.totalAmount,
        idempotencyKey,
        confirmImmediately: true,
      });
      onReservationCompleted(created);
    } catch (err) {
      setErrorMsg(
        err instanceof Error
          ? err.message
          : 'Erro ao processar reserva transacional.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const allAccommodationUnits = sortUnitsNaturally(
    units.filter((u) => u.accommodationId === accommodation.id)
  );
  const availableIdSet = new Set(quote.availableUnits.map((u) => u.id));
  const chosenIdSet = new Set(validSelectedUnits.map((u) => u.id));

  return (
    <div className="animate-backdrop-in fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 p-3 sm:p-6">
      <div className="animate-modal-in w-full max-w-4xl max-h-[90vh] rounded-xl bg-white border border-slate-200 flex flex-col overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50 shrink-0">
          <div>
            <p className="text-xs text-slate-500 font-medium">
              {tenant.name} · Motor Transacional de Inventário
            </p>
            <h2 className="text-lg font-bold text-slate-900">
              Reservar: {accommodation.name}
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

        {/* Step Indicator */}
        <div className="grid grid-cols-3 border-b border-slate-200 bg-white text-xs font-semibold shrink-0">
          <button
            type="button"
            onClick={() => setStep('units')}
            className={`py-3 px-4 text-left border-b-2 transition-all duration-200 ${
              step === 'units'
                ? 'border-slate-900 text-slate-900 bg-slate-50/70'
                : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50/40'
            }`}
          >
            1. Datas e Escolha de {isDorm ? 'Cama(s)' : 'Unidade'}
          </button>
          <button
            type="button"
            onClick={() => quote.isAvailable && setStep('guest')}
            disabled={!quote.isAvailable}
            className={`py-3 px-4 text-left border-b-2 transition-all duration-200 ${
              step === 'guest'
                ? 'border-slate-900 text-slate-900 bg-slate-50/70'
                : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50/40 disabled:opacity-40'
            }`}
          >
            2. Dados do Hóspede (LGPD)
          </button>
          <button
            type="button"
            onClick={() =>
              quote.isAvailable && fullName.trim() && email.trim() && setStep('payment')
            }
            disabled={!quote.isAvailable || !fullName.trim() || !email.trim()}
            className={`py-3 px-4 text-left border-b-2 transition-all duration-200 ${
              step === 'payment'
                ? 'border-slate-900 text-slate-900 bg-slate-50/70'
                : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50/40 disabled:opacity-40'
            }`}
          >
            3. Resumo e Pagamento
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {errorMsg && (
            <div className="animate-step-in mx-6 mt-4 flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-xs font-medium text-red-800">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
              <span>{errorMsg}</span>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-12">
          {/* Left Column: Active Step Form */}
          <div className="lg:col-span-7 p-6 border-b lg:border-b-0 lg:border-r border-slate-200">
            {step === 'units' && (
              <div className="animate-step-in space-y-5">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Check-in ({tenant.checkInTime})
                    </label>
                    <input
                      type="date"
                      value={checkIn}
                      onChange={(e) => setCheckIn(e.target.value)}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs font-mono text-slate-900"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Check-out ({tenant.checkOutTime})
                    </label>
                    <input
                      type="date"
                      value={checkOut}
                      min={checkIn}
                      onChange={(e) => setCheckOut(e.target.value)}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs font-mono text-slate-900"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      {isDorm ? 'Qtd. Camas / Hóspedes' : 'Hóspedes'}
                    </label>
                    <select
                      value={guestsCount}
                      onChange={(e) => setGuestsCount(Number(e.target.value))}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-900"
                    >
                      {Array.from(
                        {length: accommodation.capacity},
                        (_, idx) => idx + 1
                      ).map((num) => (
                        <option key={num} value={num}>
                          {num} {num === 1 ? 'hóspede' : 'hóspedes'}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Interactive Unit / Bed Map */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-sm font-semibold text-slate-900">
                      Selecione {isDorm ? `${requiredUnitsCount} Cama(s) Reservável(is)` : 'a Unidade Física'}
                    </h3>
                    <span className="text-xs text-slate-500">
                      {quote.availableUnits.length} de {allAccommodationUnits.length} livres no período
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                    {allAccommodationUnits.map((unit) => {
                      const isFree = availableIdSet.has(unit.id);
                      const isSelected = chosenIdSet.has(unit.id);
                      return (
                        <button
                          key={unit.id}
                          type="button"
                          disabled={!isFree}
                          onClick={() => handleToggleUnit(unit.id)}
                          className={`guest-btn-transition flex flex-col items-start p-3 rounded-lg border text-left ${
                            isSelected
                              ? 'border-slate-900 bg-slate-900 text-white shadow-sm'
                              : isFree
                              ? 'border-slate-200 bg-white text-slate-900 hover:border-slate-400 hover:shadow-xs'
                              : 'border-slate-200 bg-slate-100 text-slate-400 cursor-not-allowed'
                          }`}
                        >
                          <span className="text-xs font-semibold truncate w-full">
                            {unit.label}
                          </span>
                          <span
                            className={`mt-1 text-[11px] font-mono ${
                              isSelected
                                ? 'text-emerald-300'
                                : isFree
                                ? 'text-emerald-700'
                                : 'text-red-600'
                            }`}
                          >
                            {isSelected
                              ? 'Selecionada'
                              : isFree
                              ? 'Livre no período'
                              : 'Ocupada / Bloqueada'}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="pt-2 flex justify-end">
                  <button
                    type="button"
                    disabled={!quote.isAvailable}
                    onClick={() => setStep('guest')}
                    className="guest-btn-transition px-5 py-2.5 rounded-lg bg-slate-900 text-white text-xs font-semibold hover:bg-slate-800 hover:shadow-md disabled:opacity-40"
                  >
                    Continuar para Dados do Hóspede
                  </button>
                </div>
              </div>
            )}

            {step === 'guest' && (
              <div className="animate-step-in space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Nome Completo do Responsável *
                    </label>
                    <input
                      type="text"
                      required
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="Ex.: Mariana Costa Vasconcelos"
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      E-mail para Comprovante *
                    </label>
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="nome@email.com.br"
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      WhatsApp / Telefone *
                    </label>
                    <input
                      type="tel"
                      required
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="+55 11 99999-0000"
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      CPF ou Passaporte
                    </label>
                    <input
                      type="text"
                      value={documentNumber}
                      onChange={(e) => setDocumentNumber(e.target.value)}
                      placeholder="000.000.000-00"
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Cidade / UF
                    </label>
                    <input
                      type="text"
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      placeholder="São Paulo - SP"
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Observações ou Horário Previsto de Chegada
                    </label>
                    <textarea
                      rows={2}
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Ex.: Chegada prevista às 16h. Restrição alimentar sem glúten."
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900"
                    />
                  </div>
                </div>

                {/* LGPD Consent */}
                <label className="flex items-start gap-2.5 p-3 rounded-lg bg-slate-50 border border-slate-200 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={lgpdConsent}
                    onChange={(e) => setLgpdConsent(e.target.checked)}
                    className="mt-0.5 rounded border-slate-300 text-slate-900"
                  />
                  <span className="text-xs text-slate-600 leading-relaxed">
                    <strong>Consentimento LGPD:</strong> Autorizo o tratamento dos meus dados
                    pessoais exclusivamente por <strong>{tenant.name}</strong> para fins de
                    execução do contrato de hospedagem e emissão de comprovante.
                  </span>
                </label>

                <div className="pt-2 flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => setStep('units')}
                    className="guest-btn-transition px-4 py-2 rounded-lg border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    Voltar
                  </button>
                  <button
                    type="button"
                    disabled={!fullName.trim() || !email.trim() || !phone.trim() || !lgpdConsent}
                    onClick={() => setStep('payment')}
                    className="guest-btn-transition px-5 py-2.5 rounded-lg bg-slate-900 text-white text-xs font-semibold hover:bg-slate-800 hover:shadow-md disabled:opacity-40"
                  >
                    Ir para Pagamento
                  </button>
                </div>
              </div>
            )}

            {step === 'payment' && (
              <form onSubmit={handleConfirmBooking} className="animate-step-in space-y-4">
                <div className="p-3 rounded-lg border border-amber-200 bg-amber-50 text-xs text-amber-900 flex items-start gap-2">
                  <Sparkles className="w-4 h-4 shrink-0 text-amber-700 mt-0.5" />
                  <div>
                    <strong>Ambiente de Pagamento Simulado (Demonstração):</strong> Esta
                    transação valida e bloqueia o inventário real no Cloud Firestore com
                    proteção de concorrência, porém não realiza cobrança bancária real.
                  </div>
                </div>

                {/* Payment Method Selector */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-2">
                    Forma de Pagamento
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                    <button
                      type="button"
                      onClick={() => setPaymentMethod('pix')}
                      className={`guest-btn-transition p-3 rounded-lg border text-left ${
                        paymentMethod === 'pix'
                          ? 'border-slate-900 bg-slate-900 text-white shadow-sm'
                          : 'border-slate-200 bg-white text-slate-800 hover:border-slate-400'
                      }`}
                    >
                      <QrCode className="w-4 h-4 mb-1" />
                      <div className="text-xs font-semibold">PIX Instantâneo</div>
                      <div className="text-[11px] opacity-80">Confirmação imediata</div>
                    </button>
                    <button
                      type="button"
                      onClick={() => setPaymentMethod('credit_card')}
                      className={`guest-btn-transition p-3 rounded-lg border text-left ${
                        paymentMethod === 'credit_card'
                          ? 'border-slate-900 bg-slate-900 text-white shadow-sm'
                          : 'border-slate-200 bg-white text-slate-800 hover:border-slate-400'
                      }`}
                    >
                      <CreditCard className="w-4 h-4 mb-1" />
                      <div className="text-xs font-semibold">Cartão de Crédito</div>
                      <div className="text-[11px] opacity-80">Até 6x sem juros</div>
                    </button>
                    <button
                      type="button"
                      onClick={() => setPaymentMethod('pay_at_property')}
                      className={`guest-btn-transition p-3 rounded-lg border text-left ${
                        paymentMethod === 'pay_at_property'
                          ? 'border-slate-900 bg-slate-900 text-white shadow-sm'
                          : 'border-slate-200 bg-white text-slate-800 hover:border-slate-400'
                      }`}
                    >
                      <CheckCircle2 className="w-4 h-4 mb-1" />
                      <div className="text-xs font-semibold">Na Propriedade</div>
                      <div className="text-[11px] opacity-80">Sujeito a confirmação</div>
                    </button>
                  </div>
                </div>

                {/* Full vs Partial */}
                {paymentMethod !== 'pay_at_property' && (
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-2">
                      Modalidade de Quitação
                    </label>
                    <div className="grid grid-cols-2 gap-2.5">
                      <button
                        type="button"
                        onClick={() => setPaymentModality('full')}
                        className={`guest-btn-transition p-2.5 rounded-lg border text-left text-xs ${
                          paymentModality === 'full'
                            ? 'border-slate-900 bg-slate-100 font-semibold text-slate-900'
                            : 'border-slate-200 text-slate-600'
                        }`}
                      >
                        Pagamento Integral (100%) — R$ {quote.totalAmount.toLocaleString('pt-BR')}
                      </button>
                      <button
                        type="button"
                        onClick={() => setPaymentModality('partial')}
                        className={`guest-btn-transition p-2.5 rounded-lg border text-left text-xs ${
                          paymentModality === 'partial'
                            ? 'border-slate-900 bg-slate-100 font-semibold text-slate-900'
                            : 'border-slate-200 text-slate-600'
                        }`}
                      >
                        Sinal de 50% Agora — R${' '}
                        {Math.round(quote.totalAmount * 0.5).toLocaleString('pt-BR')}
                      </button>
                    </div>
                  </div>
                )}

                {paymentMethod === 'pix' && (
                  <div className="p-3.5 rounded-lg border border-slate-200 bg-slate-50 text-xs space-y-1.5">
                    <div className="font-semibold text-slate-800">
                      Chave PIX Copia e Cola (Simulação Homologada):
                    </div>
                    <div className="font-mono text-[11px] bg-white p-2 rounded border border-slate-200 break-all text-slate-600">
                      00020126580014BR.GOV.BCB.PIX0136{tenant.id}-stayos-pix5204000053039865406
                      {amountDueNow.toFixed(2)}5802BR
                    </div>
                  </div>
                )}

                <div className="pt-3 flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => setStep('guest')}
                    className="guest-btn-transition px-4 py-2 rounded-lg border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    Voltar
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="guest-btn-transition inline-flex items-center gap-2 px-6 py-2.5 rounded-lg bg-emerald-700 text-white text-xs font-semibold hover:bg-emerald-800 hover:shadow-md disabled:opacity-50"
                  >
                    <Lock className="w-3.5 h-3.5" />
                    {isSubmitting
                      ? 'Validando Transação no Firestore...'
                      : `Confirmar Reserva (R$ ${amountDueNow.toLocaleString('pt-BR')} agora)`}
                  </button>
                </div>
              </form>
            )}
          </div>

          {/* Right Column: Financial & Inventory Summary */}
          <div className="lg:col-span-5 p-6 bg-slate-50 flex flex-col justify-between">
            <div className="space-y-4">
              <div>
                <span className="text-xs font-medium text-slate-500">
                  Resumo Financeiro e Inventário
                </span>
                <h3 className="text-base font-bold text-slate-900 mt-0.5">
                  {accommodation.name}
                </h3>
                <p className="text-xs text-slate-600 mt-1">
                  Unidade(s):{' '}
                  <strong className="font-mono text-slate-900">
                    {validSelectedUnits.map((u) => u.label).join(', ') || 'Nenhuma disponível'}
                  </strong>
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2 py-3 border-y border-slate-200 text-xs">
                <div className="flex items-center gap-1.5 text-slate-700">
                  <Calendar className="w-3.5 h-3.5 text-slate-400" />
                  <span className="font-mono">
                    {checkIn} → {checkOut}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 text-slate-700 justify-end">
                  <Users className="w-3.5 h-3.5 text-slate-400" />
                  <span>
                    {guestsCount} hóspede(s) · {quote.nights} noite(s)
                  </span>
                </div>
              </div>

              {/* Per-night breakdown */}
              <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                <div className="text-xs font-semibold text-slate-700">
                  Detalhamento por Diária (Backend Rate Engine):
                </div>
                {quote.breakdown.map((b) => (
                  <div
                    key={b.date}
                    className="flex items-center justify-between text-xs py-1 border-b border-slate-200/60"
                  >
                    <div>
                      <span className="font-mono font-medium text-slate-800">
                        {b.date}
                      </span>
                      <span className="text-slate-500 ml-1.5">
                        · {b.appliedRuleName}
                      </span>
                    </div>
                    <span className="font-mono font-semibold text-slate-900">
                      R$ {b.totalForNight.toLocaleString('pt-BR')}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="pt-4 mt-4 border-t border-slate-200 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-slate-700">
                  Valor Total da Hospedagem
                </span>
                <span className="text-xl font-bold font-mono text-slate-900">
                  R$ {quote.totalAmount.toLocaleString('pt-BR')}
                </span>
              </div>
              <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                <span>
                  Chave de idempotência ativa ({idempotencyKey.slice(0, 14)}...)
                </span>
              </div>
            </div>
          </div>
        </div>
        </div>
      </div>
    </div>
  );
};
