import React, {useMemo, useState} from 'react';
import {Check, Copy, Layers, Plus} from 'lucide-react';
import {deleteDoc, doc} from 'firebase/firestore';
import {db} from '../../firebase';
import {
  buildSlotId,
  bulkConfigureAvailabilityAndRates,
  getNightsArray,
  saveRatePlan,
} from '../../services/reservationEngine';
import {
  Accommodation,
  AvailabilitySlot,
  AvailabilityStatus,
  RatePlan,
  ReservableUnit,
  Tenant,
} from '../../types/models';
import {sortUnitsNaturally} from '../../utils/unitNumbering';

interface AvailabilityCalendarViewProps {
  tenant: Tenant;
  accommodations: Accommodation[];
  units: ReservableUnit[];
  availabilitySlots: AvailabilitySlot[];
  ratePlans: RatePlan[];
}

function addDays(baseIso: string, days: number): string {
  const dt = new Date(`${baseIso}T12:00:00Z`);
  dt.setUTCDate(dt.getUTCDate() + days);
  return dt.toISOString().slice(0, 10);
}

export const AvailabilityCalendarView: React.FC<
  AvailabilityCalendarViewProps
> = ({tenant, accommodations, units, availabilitySlots, ratePlans}) => {
  const [viewMode, setViewMode] = useState<'7d' | '14d' | '30d'>('14d');
  const [startDate, setStartDate] = useState(() =>
    new Date().toISOString().slice(0, 10)
  );
  const [accommodationFilter, setAccommodationFilter] = useState<string>('ALL');

  // Fast Bulk Setup ("CADASTRO RÁPIDO") State
  const [selectedAccIds, setSelectedAccIds] = useState<string[]>(() =>
    accommodations.slice(0, 1).map((a) => a.id)
  );
  const [bulkStart, setBulkStart] = useState(() =>
    new Date().toISOString().slice(0, 10)
  );
  const [bulkEnd, setBulkEnd] = useState(() =>
    addDays(new Date().toISOString().slice(0, 10), 7)
  );
  const [bulkWeekdays, setBulkWeekdays] = useState<number[]>([
    0, 1, 2, 3, 4, 5, 6,
  ]);
  const [bulkStatus, setBulkStatus] =
    useState<AvailabilityStatus>('available');
  const [bulkCustomPrice, setBulkCustomPrice] = useState<string>('');
  const [bulkBlockReason, setBulkBlockReason] = useState<string>(
    'Bloqueio operacional / manutenção'
  );
  const [isApplyingBulk, setIsApplyingBulk] = useState(false);
  const [bulkFeedback, setBulkFeedback] = useState<string | null>(null);

  // Rate Plan form state
  const [rpName, setRpName] = useState('');
  const [rpAccId, setRpAccId] = useState('ALL');
  const [rpType] = useState<RatePlan['ruleType']>('high_season');
  const [rpStart, setRpStart] = useState(() =>
    new Date().toISOString().slice(0, 10)
  );
  const [rpEnd, setRpEnd] = useState(() =>
    addDays(new Date().toISOString().slice(0, 10), 14)
  );
  const [rpModType, setRpModType] =
    useState<RatePlan['priceModifierType']>('percentage_increase');
  const [rpValue, setRpValue] = useState<number>(20);
  const [rpPriority, setRpPriority] = useState<number>(80);

  const daysCount = viewMode === '7d' ? 7 : viewMode === '14d' ? 14 : 30;
  const calendarDates = useMemo(
    () => getNightsArray(startDate, addDays(startDate, daysCount)),
    [startDate, daysCount]
  );

  const filteredUnits = useMemo(() => {
    const base =
      accommodationFilter === 'ALL'
        ? units
        : units.filter((u) => u.accommodationId === accommodationFilter);
    return sortUnitsNaturally(base);
  }, [units, accommodationFilter]);

  const slotMap = useMemo(() => {
    const map = new Map<string, AvailabilitySlot>();
    for (const s of availabilitySlots) {
      map.set(`${s.unitId}_${s.date}`, s);
    }
    return map;
  }, [availabilitySlots]);

  const accMap = useMemo(() => {
    const map = new Map<string, Accommodation>();
    for (const a of accommodations) map.set(a.id, a);
    return map;
  }, [accommodations]);

  const toggleAccSelection = (id: string) => {
    if (selectedAccIds.includes(id)) {
      if (selectedAccIds.length > 1) {
        setSelectedAccIds(selectedAccIds.filter((item) => item !== id));
      }
    } else {
      setSelectedAccIds([...selectedAccIds, id]);
    }
  };

  const toggleWeekday = (day: number) => {
    if (bulkWeekdays.includes(day)) {
      if (bulkWeekdays.length > 1) {
        setBulkWeekdays(bulkWeekdays.filter((d) => d !== day));
      }
    } else {
      setBulkWeekdays([...bulkWeekdays, day]);
    }
  };

  const handleRunFastBulkSetup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedAccIds.length === 0) return;
    setIsApplyingBulk(true);
    setBulkFeedback(null);
    try {
      const priceNum = bulkCustomPrice.trim()
        ? Number(bulkCustomPrice)
        : undefined;
      const count = await bulkConfigureAvailabilityAndRates({
        tenantId: tenant.id,
        accommodationIds: selectedAccIds,
        units,
        startDate: bulkStart,
        endDate: bulkEnd,
        weekdays: bulkWeekdays,
        status: bulkStatus,
        customPrice: priceNum,
        blockReason: bulkBlockReason,
      });
      setBulkFeedback(
        `Cadastro Rápido concluído: ${count} unidades/noites atualizadas instantaneamente.`
      );
      setTimeout(() => setBulkFeedback(null), 4000);
    } finally {
      setIsApplyingBulk(false);
    }
  };

  const handleToggleSingleSlot = async (
    unit: ReservableUnit,
    dateStr: string
  ) => {
    const existing = slotMap.get(`${unit.id}_${dateStr}`);
    if (existing?.status === 'occupied') return;
    const nextStatus: AvailabilityStatus =
      existing?.status === 'blocked' ? 'available' : 'blocked';

    await bulkConfigureAvailabilityAndRates({
      tenantId: tenant.id,
      accommodationIds: [unit.accommodationId],
      units: [unit],
      startDate: dateStr,
      endDate: dateStr,
      weekdays: [0, 1, 2, 3, 4, 5, 6],
      status: nextStatus,
      customPrice: existing?.customPrice,
      blockReason: 'Bloqueio manual no calendário',
    });
  };

  const handleCreateRatePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rpName.trim()) return;
    const newPlan: RatePlan = {
      id: `rp_${tenant.id}_${Date.now()}`
        .replace(/[^a-zA-Z0-9_-]/g, '_')
        .slice(0, 100),
      tenantId: tenant.id,
      accommodationId: rpAccId,
      name: rpName.trim().slice(0, 140),
      ruleType: rpType,
      startDate: rpStart,
      endDate: rpEnd,
      priceModifierType: rpModType,
      value: Number(rpValue),
      priority: Number(rpPriority),
      active: true,
      createdAt: new Date().toISOString(),
    };
    await saveRatePlan(newPlan);
    setRpName('');
  };

  const handleDeleteRatePlan = async (id: string) => {
    await deleteDoc(doc(db, 'rate_plans', id));
  };

  return (
    <div className="space-y-6 min-w-0">
      {/* 1. CADASTRO RÁPIDO EM LOTE (5-Step Bulk Configurator) */}
      <div className="rounded-xl bg-white border border-slate-200 p-5 sm:p-6 space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-4">
          <div className="min-w-0">
            <h2 className="text-base font-bold text-slate-900">
              Cadastro Rápido de Disponibilidade e Tarifas em Lote
            </h2>
            <p className="text-xs text-slate-600 mt-0.5">
              Disponibilize períodos inteiros, aplique tarifas em múltiplas
              acomodações ou bloqueie feriados e manutenções de uma só vez.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setSelectedAccIds(accommodations.map((a) => a.id))}
            className="h-9 inline-flex items-center gap-1.5 px-3 rounded-lg border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-50 whitespace-nowrap shrink-0"
          >
            <Copy className="w-3.5 h-3.5 shrink-0" />
            <span>Selecionar Todas as Acomodações</span>
          </button>
        </div>

        <form onSubmit={handleRunFastBulkSetup} className="space-y-4">
          {/* Step 1: Select 1 or multiple accommodations */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-2">
              1. Selecionar Acomodação(ões) para aplicar em lote:
            </label>
            <div className="flex flex-wrap gap-2">
              {accommodations.map((acc) => {
                const isSelected = selectedAccIds.includes(acc.id);
                return (
                  <button
                    key={acc.id}
                    type="button"
                    onClick={() => toggleAccSelection(acc.id)}
                    className={`h-8 inline-flex items-center gap-1.5 px-3 rounded-lg border text-xs font-medium transition-colors whitespace-nowrap ${
                      isSelected
                        ? 'border-slate-900 bg-slate-900 text-white'
                        : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    {isSelected && <Check className="w-3.5 h-3.5 shrink-0" />}
                    <span>{acc.name}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Steps 2, 3, 4, 5 — Spacious 5-column xl grid (2-col on tablet) so date inputs never squish */}
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-4 items-end text-xs">
            <div className="min-w-0">
              <label className="block font-semibold text-slate-700 mb-1.5 truncate">
                2. Data Inicial
              </label>
              <input
                type="date"
                value={bulkStart}
                onChange={(e) => setBulkStart(e.target.value)}
                className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 font-mono text-slate-900"
              />
            </div>

            <div className="min-w-0">
              <label className="block font-semibold text-slate-700 mb-1.5 truncate">
                Data Final
              </label>
              <input
                type="date"
                value={bulkEnd}
                min={bulkStart}
                onChange={(e) => setBulkEnd(e.target.value)}
                className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 font-mono text-slate-900"
              />
            </div>

            <div className="min-w-0">
              <label className="block font-semibold text-slate-700 mb-1.5 truncate">
                3. Ação / Disponibilidade
              </label>
              <select
                value={bulkStatus}
                onChange={(e) =>
                  setBulkStatus(e.target.value as AvailabilityStatus)
                }
                className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 font-semibold text-slate-900"
              >
                <option value="available">Liberar para Reserva</option>
                <option value="blocked">
                  Bloquear (Manutenção / Feriado)
                </option>
              </select>
            </div>

            <div className="min-w-0">
              <label className="block font-semibold text-slate-700 mb-1.5 truncate">
                4. Preço Diário (R$)
              </label>
              <input
                type="number"
                min={0}
                value={bulkCustomPrice}
                onChange={(e) => setBulkCustomPrice(e.target.value)}
                placeholder="Manter padrão"
                className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 font-mono text-slate-900"
              />
            </div>

            <div className="min-w-0 sm:col-span-2 xl:col-span-1">
              <button
                type="submit"
                disabled={isApplyingBulk}
                className="h-10 w-full inline-flex items-center justify-center gap-1.5 rounded-lg bg-slate-900 text-white px-4 font-semibold hover:bg-slate-800 disabled:opacity-50 transition-colors whitespace-nowrap"
              >
                <Layers className="w-3.5 h-3.5 shrink-0" />
                <span>
                  {isApplyingBulk ? 'Aplicando...' : '5. Salvar em Lote'}
                </span>
              </button>
            </div>
          </div>

          {/* Weekday recurrence selector */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
            <div className="flex flex-wrap items-center gap-1.5 text-xs">
              <span className="text-slate-600 font-medium mr-1">
                Regras Recorrentes (Dias da Semana):
              </span>
              {[
                {d: 0, l: 'Dom'},
                {d: 1, l: 'Seg'},
                {d: 2, l: 'Ter'},
                {d: 3, l: 'Qua'},
                {d: 4, l: 'Qui'},
                {d: 5, l: 'Sex'},
                {d: 6, l: 'Sáb'},
              ].map((item) => (
                <button
                  key={item.d}
                  type="button"
                  onClick={() => toggleWeekday(item.d)}
                  className={`h-7 px-2.5 rounded border text-xs font-medium ${
                    bulkWeekdays.includes(item.d)
                      ? 'border-slate-900 bg-slate-900 text-white'
                      : 'border-slate-200 bg-white text-slate-600'
                  }`}
                >
                  {item.l}
                </button>
              ))}
            </div>

            {bulkStatus === 'blocked' && (
              <input
                type="text"
                value={bulkBlockReason}
                onChange={(e) => setBulkBlockReason(e.target.value)}
                placeholder="Motivo do bloqueio (ex: Manutenção)"
                className="h-9 rounded-lg border border-slate-300 px-3 text-xs text-slate-800 w-full sm:w-72"
              />
            )}
          </div>

          {bulkFeedback && (
            <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-xs font-semibold text-emerald-900">
              {bulkFeedback}
            </div>
          )}
        </form>
      </div>

      {/* 2. INTERACTIVE UNIT-LEVEL AVAILABILITY CALENDAR */}
      <div className="rounded-xl bg-white border border-slate-200 p-5 sm:p-6 space-y-4 min-w-0">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="min-w-0">
            <h3 className="text-base font-bold text-slate-900">
              Matriz Interativa de Ocupação por Quarto e Cama
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Clique em qualquer célula livre ou bloqueada para alternar o
              bloqueio individual da unidade/cama.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 text-xs">
            <select
              value={accommodationFilter}
              onChange={(e) => setAccommodationFilter(e.target.value)}
              className="h-9 rounded-lg border border-slate-300 bg-white px-3 font-medium text-slate-800 max-w-[240px] truncate"
            >
              <option value="ALL">
                Todas as Acomodações ({units.length} unidades)
              </option>
              {accommodations.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>

            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="h-9 rounded-lg border border-slate-300 bg-white px-3 font-mono text-slate-800"
            />

            <div className="h-9 flex items-center gap-1 bg-slate-100 p-1 rounded-lg">
              {[
                {id: '7d', label: '7 Dias'},
                {id: '14d', label: '14 Dias'},
                {id: '30d', label: '30 Dias'},
              ].map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setViewMode(m.id as '7d' | '14d' | '30d')}
                  className={`h-7 px-2.5 rounded font-medium whitespace-nowrap ${
                    viewMode === m.id
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600'
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap items-center gap-5 text-xs text-slate-600 py-1">
          <span className="inline-flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-emerald-50 border border-emerald-300 shrink-0" />
            <span>Livre (Disponível)</span>
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-blue-600 shrink-0" />
            <span>Ocupada (Reserva Confirmada / Check-in)</span>
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-amber-400 shrink-0" />
            <span>Retida (Aguardando Confirmação)</span>
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-slate-300 shrink-0" />
            <span>Bloqueada (Manutenção / Feriado)</span>
          </span>
        </div>

        {/* Matrix Table — Contained horizontal scroll */}
        <div className="w-full overflow-x-auto border border-slate-200 rounded-lg">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="py-2.5 px-3 font-semibold text-slate-800 sticky left-0 bg-slate-50 z-10 min-w-[190px] max-w-[220px] border-r border-slate-200">
                  Unidade Física / Cama
                </th>
                {calendarDates.map((d) => (
                  <th
                    key={d}
                    className="py-2 px-2 font-mono font-semibold text-slate-700 text-center min-w-[74px] border-r border-slate-200/70"
                  >
                    {d.slice(8, 10)}/{d.slice(5, 7)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {filteredUnits.map((unit) => {
                const parentAcc = accMap.get(unit.accommodationId);
                return (
                  <tr key={unit.id} className="hover:bg-slate-50/60">
                    <td className="py-2 px-3 font-medium text-slate-900 sticky left-0 bg-white z-10 border-r border-slate-200 max-w-[220px]">
                      <div className="font-semibold truncate">{unit.label}</div>
                      <div className="text-[11px] text-slate-500 truncate">
                        {parentAcc?.name}
                      </div>
                    </td>
                    {calendarDates.map((dateStr) => {
                      const slot = slotMap.get(`${unit.id}_${dateStr}`);
                      const status = slot?.status || 'available';
                      const priceToShow =
                        slot?.customPrice || parentAcc?.basePrice || 0;

                      return (
                        <td
                          key={buildSlotId(tenant.id, unit.id, dateStr)}
                          onClick={() => handleToggleSingleSlot(unit, dateStr)}
                          title={
                            status === 'occupied'
                              ? `Reserva ativa (${slot?.reservationId})`
                              : status === 'blocked'
                              ? `Bloqueado: ${slot?.blockReason || 'Clique para liberar'}`
                              : 'Livre — Clique para bloquear/liberar'
                          }
                          className={`p-1.5 text-center font-mono border-r border-slate-100 transition-colors ${
                            status === 'occupied'
                              ? 'bg-blue-600 text-white cursor-not-allowed'
                              : status === 'held'
                              ? 'bg-amber-100 text-amber-900 cursor-pointer'
                              : status === 'blocked'
                              ? 'bg-slate-200 text-slate-600 cursor-pointer hover:bg-slate-300'
                              : 'bg-emerald-50/50 text-slate-800 cursor-pointer hover:bg-emerald-100/70'
                          }`}
                        >
                          <div className="text-[10px] font-semibold whitespace-nowrap">
                            {status === 'occupied'
                              ? 'OCUP'
                              : status === 'held'
                              ? 'RETIDA'
                              : status === 'blocked'
                              ? 'BLOQ'
                              : `R$${priceToShow}`}
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* 3. SMART SEASONAL & PRIORITY RATE PLANS — Spacious 4-column xl grid */}
      <div className="rounded-xl bg-white border border-slate-200 p-5 sm:p-6 space-y-5">
        <div>
          <h3 className="text-base font-bold text-slate-900">
            Motor Inteligente de Tarifas Sazonais, Feriados e Promoções
          </h3>
          <p className="text-xs text-slate-600 mt-0.5">
            Regras de maior prioridade sobrescrevem automaticamente tarifas base
            ou de final de semana no cálculo de reservas.
          </p>
        </div>

        <form
          onSubmit={handleCreateRatePlan}
          className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 items-end p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs"
        >
          <div className="min-w-0">
            <label className="block font-semibold text-slate-700 mb-1.5 truncate">
              Nome da Regra Tarifária
            </label>
            <input
              type="text"
              required
              value={rpName}
              onChange={(e) => setRpName(e.target.value)}
              placeholder="Ex.: Alta Temporada Verão"
              className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-slate-900"
            />
          </div>

          <div className="min-w-0">
            <label className="block font-semibold text-slate-700 mb-1.5 truncate">
              Acomodação Alvo
            </label>
            <select
              value={rpAccId}
              onChange={(e) => setRpAccId(e.target.value)}
              className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-slate-900"
            >
              <option value="ALL">Todas</option>
              {accommodations.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>
          </div>

          <div className="min-w-0">
            <label className="block font-semibold text-slate-700 mb-1.5 truncate">
              Início da Vigência
            </label>
            <input
              type="date"
              value={rpStart}
              onChange={(e) => setRpStart(e.target.value)}
              className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 font-mono text-slate-900"
            />
          </div>

          <div className="min-w-0">
            <label className="block font-semibold text-slate-700 mb-1.5 truncate">
              Fim da Vigência
            </label>
            <input
              type="date"
              value={rpEnd}
              min={rpStart}
              onChange={(e) => setRpEnd(e.target.value)}
              className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 font-mono text-slate-900"
            />
          </div>

          <div className="min-w-0">
            <label className="block font-semibold text-slate-700 mb-1.5 truncate">
              Tipo de Ajuste
            </label>
            <select
              value={rpModType}
              onChange={(e) =>
                setRpModType(
                  e.target.value as RatePlan['priceModifierType']
                )
              }
              className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-slate-900"
            >
              <option value="percentage_increase">Acréscimo (%)</option>
              <option value="percentage_discount">Desconto (%)</option>
              <option value="fixed">Valor Fixo (R$)</option>
            </select>
          </div>

          <div className="min-w-0">
            <label className="block font-semibold text-slate-700 mb-1.5 truncate">
              Valor do Ajuste (% ou R$)
            </label>
            <input
              type="number"
              min={1}
              value={rpValue}
              onChange={(e) => setRpValue(Number(e.target.value))}
              className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 font-mono text-slate-900"
            />
          </div>

          <div className="min-w-0">
            <label className="block font-semibold text-slate-700 mb-1.5 truncate">
              Nível de Prioridade (1 a 999)
            </label>
            <input
              type="number"
              min={1}
              max={999}
              value={rpPriority}
              onChange={(e) => setRpPriority(Number(e.target.value))}
              className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 font-mono text-slate-900"
            />
          </div>

          <div className="min-w-0">
            <button
              type="submit"
              className="h-10 w-full inline-flex items-center justify-center gap-1.5 rounded-lg bg-slate-900 text-white px-4 font-semibold hover:bg-slate-800 whitespace-nowrap"
            >
              <Plus className="w-3.5 h-3.5 shrink-0" />
              <span>Adicionar Regra</span>
            </button>
          </div>
        </form>

        <div className="divide-y divide-slate-200 border border-slate-200 rounded-lg">
          {ratePlans.map((rp) => (
            <div
              key={rp.id}
              className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 text-xs"
            >
              <div className="min-w-0">
                <span className="font-semibold text-slate-900">{rp.name}</span>
                <span className="text-slate-500 ml-2 font-mono">
                  ({rp.startDate} → {rp.endDate}) · Prioridade {rp.priority}
                </span>
              </div>
              <div className="flex items-center gap-4 shrink-0">
                <span className="font-mono font-semibold text-slate-800">
                  {rp.priceModifierType === 'fixed'
                    ? `R$ ${rp.value}`
                    : rp.priceModifierType === 'percentage_increase'
                    ? `+${rp.value}%`
                    : `-${rp.value}%`}
                </span>
                <button
                  type="button"
                  onClick={() => handleDeleteRatePlan(rp.id)}
                  className="text-red-600 hover:underline font-medium"
                >
                  Remover
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
