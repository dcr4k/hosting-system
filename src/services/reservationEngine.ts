import {
  collection,
  doc,
  getDocs,
  query,
  runTransaction,
  setDoc,
  where,
  writeBatch,
} from 'firebase/firestore';
import {auth, db, handleFirestoreError, OperationType} from '../firebase';
import {
  Accommodation,
  AuditLog,
  AvailabilitySlot,
  AvailabilityStatus,
  GuestRecord,
  NightPriceBreakdown,
  PaymentMethod,
  PaymentModality,
  PaymentRecord,
  QuoteSummary,
  RatePlan,
  ReservableUnit,
  Reservation,
  ReservationStatus,
} from '../types/models';

export function getNightsArray(checkIn: string, checkOut: string): string[] {
  const dates: string[] = [];
  const start = new Date(`${checkIn}T12:00:00Z`);
  const end = new Date(`${checkOut}T12:00:00Z`);
  if (isNaN(start.getTime()) || isNaN(end.getTime()) || end <= start) {
    return dates;
  }
  const cursor = new Date(start);
  while (cursor < end) {
    dates.push(cursor.toISOString().slice(0, 10));
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return dates;
}

export function isSlotActivelyLocked(slot?: AvailabilitySlot, referenceNowIso?: string): boolean {
  if (!slot) return false;
  if (slot.status === 'available') return false;
  if (slot.status === 'occupied' || slot.status === 'blocked') return true;
  if (slot.status === 'held') {
    if (!slot.expiresAt) return true;
    const nowIso = referenceNowIso || new Date().toISOString();
    return slot.expiresAt > nowIso;
  }
  return false;
}

export function buildSlotId(tenantId: string, unitId: string, date: string): string {
  return `${tenantId}_${unitId}_${date}`.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 175);
}

export function calculateStayQuote(params: {
  accommodation: Accommodation;
  units: ReservableUnit[];
  availabilitySlots: AvailabilitySlot[];
  ratePlans: RatePlan[];
  checkIn: string;
  checkOut: string;
  guestsCount: number;
  selectedUnitIds?: string[];
}): QuoteSummary {
  const {
    accommodation,
    units,
    availabilitySlots,
    ratePlans,
    checkIn,
    checkOut,
    guestsCount,
    selectedUnitIds,
  } = params;

  const nightsList = getNightsArray(checkIn, checkOut);
  if (nightsList.length === 0) {
    return {
      nights: 0,
      breakdown: [],
      totalAmount: 0,
      availableUnits: [],
      isAvailable: false,
      unavailableReason: 'Período inválido. A data de check-out deve ser posterior ao check-in.',
    };
  }

  const isDorm =
    accommodation.type.includes('dorm') || accommodation.pricingMode === 'per_bed';
  const requiredUnitsCount = isDorm ? guestsCount : 1;

  if (!isDorm && guestsCount > accommodation.capacity) {
    return {
      nights: nightsList.length,
      breakdown: [],
      totalAmount: 0,
      availableUnits: [],
      isAvailable: false,
      unavailableReason: `Capacidade máxima excedida (${accommodation.capacity} hóspedes).`,
    };
  }

  const nowIso = new Date().toISOString();
  const activeUnits = units.filter(
    (u) => u.accommodationId === accommodation.id && u.status === 'active'
  );

  const slotMap = new Map<string, AvailabilitySlot>();
  for (const s of availabilitySlots) {
    if (s.accommodationId === accommodation.id) {
      slotMap.set(`${s.unitId}_${s.date}`, s);
    }
  }

  const freeUnitsForEntirePeriod = activeUnits.filter((unit) => {
    return nightsList.every((nightDate) => {
      const slot = slotMap.get(`${unit.id}_${nightDate}`);
      return !isSlotActivelyLocked(slot, nowIso);
    });
  });

  const applicablePlans = ratePlans
    .filter(
      (rp) =>
        rp.active &&
        (rp.accommodationId === 'ALL' || rp.accommodationId === accommodation.id)
    )
    .sort((a, b) => b.priority - a.priority);

  const chosenUnits =
    selectedUnitIds && selectedUnitIds.length > 0
      ? freeUnitsForEntirePeriod.filter((u) => selectedUnitIds.includes(u.id))
      : freeUnitsForEntirePeriod.slice(0, requiredUnitsCount);

  const breakdown: NightPriceBreakdown[] = nightsList.map((nightDate) => {
    const dt = new Date(`${nightDate}T12:00:00Z`);
    const dayOfWeek = dt.getUTCDay(); // 5 = Fri, 6 = Sat
    const isWeekend = dayOfWeek === 5 || dayOfWeek === 6;

    // 1. Check customPrice on the chosen unit slot if set
    let unitNightPrice = accommodation.basePrice;
    let appliedRuleName = 'Tarifa Padrão';

    const matchingSlotWithPrice = chosenUnits
      .map((u) => slotMap.get(`${u.id}_${nightDate}`))
      .find((s) => s && typeof s.customPrice === 'number' && s.customPrice > 0);

    if (matchingSlotWithPrice && matchingSlotWithPrice.customPrice) {
      unitNightPrice = matchingSlotWithPrice.customPrice;
      appliedRuleName = 'Tarifa Específica no Calendário';
    } else {
      // 2. Check highest-priority RatePlan matching date
      const matchedPlan = applicablePlans.find((rp) => {
        if (rp.ruleType === 'weekend' && !isWeekend) return false;
        return nightDate >= rp.startDate && nightDate <= rp.endDate;
      });

      if (matchedPlan) {
        appliedRuleName = matchedPlan.name;
        if (matchedPlan.priceModifierType === 'fixed') {
          unitNightPrice = matchedPlan.value;
        } else if (matchedPlan.priceModifierType === 'percentage_increase') {
          unitNightPrice = Math.round(
            accommodation.basePrice * (1 + matchedPlan.value / 100)
          );
        } else if (matchedPlan.priceModifierType === 'percentage_discount') {
          unitNightPrice = Math.round(
            accommodation.basePrice * Math.max(0.1, 1 - matchedPlan.value / 100)
          );
        }
      } else if (isWeekend && accommodation.weekendPrice && accommodation.weekendPrice > 0) {
        unitNightPrice = accommodation.weekendPrice;
        appliedRuleName = 'Tarifa de Fim de Semana';
      }
    }

    let totalForNight = unitNightPrice;
    if (accommodation.pricingMode === 'per_bed') {
      totalForNight = unitNightPrice * Math.max(1, chosenUnits.length || requiredUnitsCount);
    } else if (accommodation.pricingMode === 'per_person') {
      totalForNight = unitNightPrice * guestsCount;
    }

    return {
      date: nightDate,
      unitPrice: unitNightPrice,
      totalForNight,
      appliedRuleName,
    };
  });

  const totalAmount = breakdown.reduce((acc, item) => acc + item.totalForNight, 0);
  const isAvailable = freeUnitsForEntirePeriod.length >= requiredUnitsCount;

  return {
    nights: nightsList.length,
    breakdown,
    totalAmount,
    availableUnits: freeUnitsForEntirePeriod,
    isAvailable,
    unavailableReason: isAvailable
      ? undefined
      : isDorm
      ? `Apenas ${freeUnitsForEntirePeriod.length} cama(s) livre(s) para todas as noites selecionadas.`
      : 'Nenhuma unidade livre para todo o período selecionado.',
  };
}

export async function createTransactionalReservation(params: {
  tenantId: string;
  accommodation: Accommodation;
  selectedUnits: ReservableUnit[];
  checkIn: string;
  checkOut: string;
  guestsCount: number;
  guestInfo: {
    fullName: string;
    email: string;
    phone: string;
    documentNumber?: string;
    city?: string;
    lgpdConsent: boolean;
    notes?: string;
  };
  paymentMethod: PaymentMethod;
  paymentModality: PaymentModality;
  totalAmount: number;
  idempotencyKey: string;
  confirmImmediately?: boolean;
}): Promise<Reservation> {
  const {
    tenantId,
    accommodation,
    selectedUnits,
    checkIn,
    checkOut,
    guestsCount,
    guestInfo,
    paymentMethod,
    paymentModality,
    totalAmount,
    idempotencyKey,
    confirmImmediately = true,
  } = params;

  const nightsList = getNightsArray(checkIn, checkOut);
  if (nightsList.length === 0) {
    throw new Error('Período de check-in e check-out inválido.');
  }
  if (selectedUnits.length === 0) {
    throw new Error('Selecione ao menos uma unidade ou cama reservável.');
  }
  if (!guestInfo.lgpdConsent) {
    throw new Error('É necessário aceitar o termo de privacidade (LGPD) para concluir a reserva.');
  }

  // Idempotency Check before opening transaction
  try {
    const existingSnap = await getDocs(
      query(
        collection(db, 'reservations'),
        where('tenantId', '==', tenantId),
        where('idempotencyKey', '==', idempotencyKey)
      )
    );
    if (!existingSnap.empty) {
      return existingSnap.docs[0].data() as Reservation;
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, 'reservations');
  }

  const now = new Date();
  const nowIso = now.toISOString();
  const holdExpiresIso = new Date(now.getTime() + 30 * 60 * 1000).toISOString(); // 30 min hold

  const reservationId = `res_${tenantId}_${idempotencyKey}`.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 110);
  const codeSuffix = Math.random().toString(36).substring(2, 6).toUpperCase();
  const datePart = checkIn.replace(/-/g, '').slice(2);
  const reservationCode = `DK-${datePart}-${codeSuffix}`;

  const guestId = `gst_${tenantId}_${Date.now()}`.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 110);
  const paymentId = `pay_${tenantId}_${Date.now()}`.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 110);
  const auditId = `aud_${tenantId}_${Date.now()}`.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 110);

  const isPaidNow =
    confirmImmediately && (paymentMethod === 'pix' || paymentMethod === 'credit_card');
  const paidAmount = isPaidNow
    ? paymentModality === 'partial'
      ? Math.round(totalAmount * 0.5)
      : totalAmount
    : 0;

  const initialStatus: ReservationStatus = isPaidNow
    ? 'confirmed'
    : paymentMethod === 'pay_at_property'
    ? 'pending_confirmation'
    : 'pending_payment';

  const slotStatus: AvailabilityStatus =
    initialStatus === 'confirmed' ? 'occupied' : 'held';

  const reservationDoc: Reservation = {
    id: reservationId,
    code: reservationCode,
    tenantId,
    accommodationId: accommodation.id,
    accommodationName: accommodation.name.slice(0, 140),
    unitIdsCsv: selectedUnits.map((u) => u.id).join(',').slice(0, 600),
    unitLabelsCsv: selectedUnits.map((u) => u.label).join(', ').slice(0, 600),
    guestId,
    guestName: guestInfo.fullName.trim().slice(0, 140),
    guestEmail: guestInfo.email.trim().toLowerCase().slice(0, 160),
    guestPhone: guestInfo.phone.trim().slice(0, 40),
    checkIn,
    checkOut,
    nights: nightsList.length,
    guestsCount,
    totalAmount,
    paidAmount,
    paymentMethod,
    paymentModality,
    status: initialStatus,
    idempotencyKey: idempotencyKey.slice(0, 128),
    isSimulatedPayment: true,
    ...(guestInfo.notes ? {notes: guestInfo.notes.trim().slice(0, 1000)} : {}),
    createdAt: nowIso,
  };

  const guestDoc: GuestRecord = {
    id: guestId,
    tenantId,
    fullName: guestInfo.fullName.trim().slice(0, 140),
    email: guestInfo.email.trim().toLowerCase().slice(0, 160),
    phone: guestInfo.phone.trim().slice(0, 40),
    ...(guestInfo.documentNumber
      ? {documentNumber: guestInfo.documentNumber.trim().slice(0, 40)}
      : {}),
    ...(guestInfo.city ? {city: guestInfo.city.trim().slice(0, 100)} : {}),
    lgpdConsent: true,
    staysCount: 1,
    createdAt: nowIso,
  };

  const paymentDoc: PaymentRecord = {
    id: paymentId,
    tenantId,
    reservationId,
    reservationCode,
    amount:
      paymentModality === 'partial' ? Math.round(totalAmount * 0.5) : totalAmount,
    method: paymentMethod,
    modality: paymentModality,
    status: isPaidNow ? 'paid' : 'pending',
    externalRef: `SIM-${paymentMethod.toUpperCase()}-${codeSuffix}`,
    isSimulated: true,
    createdAt: nowIso,
  };

  const auditDoc: AuditLog = {
    id: auditId,
    tenantId,
    actorUid: auth.currentUser?.uid || 'guest_portal',
    actorEmail: auth.currentUser?.email || reservationDoc.guestEmail,
    action: 'RESERVATION_CREATED',
    targetType: 'reservation',
    targetId: reservationId,
    details: `Reserva ${reservationCode} criada (${accommodation.name} - ${reservationDoc.unitLabelsCsv}) de ${checkIn} a ${checkOut}`,
    createdAt: nowIso,
  };

  try {
    await runTransaction(db, async (tx) => {
      const resRef = doc(db, 'reservations', reservationId);
      const existingRes = await tx.get(resRef);
      if (existingRes.exists()) {
        return;
      }

      // Read all unit/night availability slots first inside the transaction
      const slotRefsAndMeta: {
        ref: ReturnType<typeof doc>;
        slotId: string;
        unit: ReservableUnit;
        nightDate: string;
        existingData?: AvailabilitySlot;
      }[] = [];

      for (const unit of selectedUnits) {
        for (const nightDate of nightsList) {
          const slotId = buildSlotId(tenantId, unit.id, nightDate);
          const slotRef = doc(db, 'availability', slotId);
          const snap = await tx.get(slotRef);
          const existingData = snap.exists()
            ? (snap.data() as AvailabilitySlot)
            : undefined;

          if (isSlotActivelyLocked(existingData, nowIso)) {
            throw new Error(
              `Conflito de concorrência: A unidade "${unit.label}" não está mais disponível na noite de ${nightDate}.`
            );
          }

          slotRefsAndMeta.push({
            ref: slotRef,
            slotId,
            unit,
            nightDate,
            existingData,
          });
        }
      }

      // All nights & units verified free -> Lock inventory atomically
      for (const item of slotRefsAndMeta) {
        const updatedSlot: AvailabilitySlot = {
          id: item.slotId,
          tenantId,
          accommodationId: accommodation.id,
          unitId: item.unit.id,
          date: item.nightDate,
          status: slotStatus,
          ...(item.existingData?.customPrice
            ? {customPrice: item.existingData.customPrice}
            : {}),
          reservationId,
          ...(slotStatus === 'held' ? {expiresAt: holdExpiresIso} : {}),
          updatedAt: nowIso,
        };
        tx.set(item.ref, updatedSlot);
      }

      tx.set(doc(db, 'guests', guestId), guestDoc);
      tx.set(resRef, reservationDoc);
      tx.set(doc(db, 'payments', paymentId), paymentDoc);
      tx.set(doc(db, 'audit_logs', auditId), auditDoc);
    });

    return reservationDoc;
  } catch (error) {
    if (error instanceof Error && error.message.includes('Conflito de concorrência')) {
      throw error;
    }
    handleFirestoreError(error, OperationType.WRITE, 'reservations');
  }
}

export async function updateReservationStatusAndInventory(params: {
  reservation: Reservation;
  newStatus: ReservationStatus;
  markFullyPaid?: boolean;
}): Promise<void> {
  const {reservation, newStatus, markFullyPaid} = params;
  const nowIso = new Date().toISOString();
  const unitIds = reservation.unitIdsCsv
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  const nightsList = getNightsArray(reservation.checkIn, reservation.checkOut);

  const updatedRes: Reservation = {
    ...reservation,
    status: newStatus,
    paidAmount: markFullyPaid ? reservation.totalAmount : reservation.paidAmount,
  };

  const batch = writeBatch(db);
  batch.set(doc(db, 'reservations', reservation.id), updatedRes);

  const releaseInventory = newStatus === 'cancelled' || newStatus === 'expired';
  const lockOccupied =
    newStatus === 'confirmed' ||
    newStatus === 'checked_in' ||
    newStatus === 'checked_out';

  for (const unitId of unitIds) {
    for (const nightDate of nightsList) {
      const slotId = buildSlotId(reservation.tenantId, unitId, nightDate);
      const slotRef = doc(db, 'availability', slotId);
      const nextSlot: AvailabilitySlot = {
        id: slotId,
        tenantId: reservation.tenantId,
        accommodationId: reservation.accommodationId,
        unitId,
        date: nightDate,
        status: releaseInventory ? 'available' : lockOccupied ? 'occupied' : 'held',
        ...(releaseInventory ? {} : {reservationId: reservation.id}),
        updatedAt: nowIso,
      };
      batch.set(slotRef, nextSlot);
    }
  }

  const auditId = `aud_${reservation.tenantId}_${Date.now()}`.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 110);
  const auditDoc: AuditLog = {
    id: auditId,
    tenantId: reservation.tenantId,
    actorUid: auth.currentUser?.uid || 'tenant_operator',
    actorEmail: auth.currentUser?.email || 'operador@estabelecimento',
    action: `RESERVATION_STATUS_${newStatus.toUpperCase()}`,
    targetType: 'reservation',
    targetId: reservation.id,
    details: `Reserva ${reservation.code} alterada para status "${newStatus}"`,
    createdAt: nowIso,
  };
  batch.set(doc(db, 'audit_logs', auditId), auditDoc);

  try {
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, 'reservations');
  }
}

export async function bulkConfigureAvailabilityAndRates(params: {
  tenantId: string;
  accommodationIds: string[];
  units: ReservableUnit[];
  startDate: string;
  endDate: string;
  weekdays: number[]; // [0..6]
  status: AvailabilityStatus;
  customPrice?: number;
  blockReason?: string;
}): Promise<number> {
  const {
    tenantId,
    accommodationIds,
    units,
    startDate,
    endDate,
    weekdays,
    status,
    customPrice,
    blockReason,
  } = params;

  // Include endDate in range for calendar bulk operations
  const endPlusOne = new Date(`${endDate}T12:00:00Z`);
  endPlusOne.setUTCDate(endPlusOne.getUTCDate() + 1);
  const allDates = getNightsArray(startDate, endPlusOne.toISOString().slice(0, 10));

  const filteredDates = allDates.filter((d) => {
    const day = new Date(`${d}T12:00:00Z`).getUTCDay();
    return weekdays.includes(day);
  });

  const targetUnits = units.filter((u) => accommodationIds.includes(u.accommodationId));
  const nowIso = new Date().toISOString();

  let operationsCount = 0;
  let batch = writeBatch(db);

  for (const unit of targetUnits) {
    for (const dateStr of filteredDates) {
      const slotId = buildSlotId(tenantId, unit.id, dateStr);
      const slotDoc: AvailabilitySlot = {
        id: slotId,
        tenantId,
        accommodationId: unit.accommodationId,
        unitId: unit.id,
        date: dateStr,
        status,
        ...(typeof customPrice === 'number' && customPrice > 0 ? {customPrice} : {}),
        ...(status === 'blocked' && blockReason
          ? {blockReason: blockReason.slice(0, 240)}
          : {}),
        updatedAt: nowIso,
      };
      batch.set(doc(db, 'availability', slotId), slotDoc);
      operationsCount++;

      if (operationsCount % 400 === 0) {
        await batch.commit();
        batch = writeBatch(db);
      }
    }
  }

  const auditId = `aud_${tenantId}_${Date.now()}`.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 110);
  batch.set(doc(db, 'audit_logs', auditId), {
    id: auditId,
    tenantId,
    actorUid: auth.currentUser?.uid || 'tenant_owner',
    actorEmail: auth.currentUser?.email || 'proprietario@estabelecimento',
    action: 'BULK_CALENDAR_UPDATE',
    targetType: 'availability',
    targetId: accommodationIds.join(',').slice(0, 120),
    details: `Cadastro rápido aplicado em ${operationsCount} slots (${startDate} a ${endDate}) com status ${status}`,
    createdAt: nowIso,
  } satisfies AuditLog);

  try {
    await batch.commit();
    return operationsCount;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, 'availability');
  }
}

export async function saveRatePlan(ratePlan: RatePlan): Promise<void> {
  try {
    await setDoc(doc(db, 'rate_plans', ratePlan.id), ratePlan);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `rate_plans/${ratePlan.id}`);
  }
}
