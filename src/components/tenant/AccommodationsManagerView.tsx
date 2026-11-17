import React, {useMemo, useState} from 'react';
import {
  Check,
  Copy,
  Edit3,
  Hash,
  Plus,
  Power,
  Sparkles,
  Trash2,
  X,
} from 'lucide-react';
import {
  deleteDoc,
  doc,
  setDoc,
  writeBatch,
} from 'firebase/firestore';
import {db, handleFirestoreError, OperationType} from '../../firebase';
import {DEMO_IMAGES} from '../../services/tenantProvisioning';
import {
  Accommodation,
  AccommodationType,
  PricingMode,
  ReservableUnit,
  Reservation,
  Tenant,
} from '../../types/models';
import {
  BED_PREFIX_PRESETS,
  detectUnitPattern,
  formatUnitLabel,
  ROOM_PREFIX_PRESETS,
  sortUnitsNaturally,
  suggestNextNumberInTenant,
} from '../../utils/unitNumbering';
import {calculateTenantMediaUsage} from '../../utils/imageOptimizer';
import {
  CloudQuotaUsageBar,
  RoomPhotosGalleryUploader,
} from '../common/CloudMediaUploader';
import {ResilientImage} from '../common/ResilientImage';

interface AccommodationsManagerViewProps {
  tenant: Tenant;
  accommodations: Accommodation[];
  units: ReservableUnit[];
  reservations: Reservation[];
}

export const AccommodationsManagerView: React.FC<
  AccommodationsManagerViewProps
> = ({tenant, accommodations, units, reservations}) => {
  const [editingAcc, setEditingAcc] = useState<Accommodation | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  // Accommodation Model Form State (including Advanced Numbering Pattern)
  const [name, setName] = useState('');
  const [type, setType] = useState<AccommodationType>('double_room');
  const [pricingMode, setPricingMode] = useState<PricingMode>('per_room');
  const [basePrice, setBasePrice] = useState<number>(450);
  const [weekendPrice, setWeekendPrice] = useState<number>(550);
  const [capacity, setCapacity] = useState<number>(2);
  const [bedsCount, setBedsCount] = useState<number>(1);
  const [unitsToCreateCount, setUnitsToCreateCount] = useState<number>(2);
  const [createPrefix, setCreatePrefix] = useState<string>('Quarto');
  const [createStartNum, setCreateStartNum] = useState<number>(1);
  const [createDigits, setCreateDigits] = useState<number>(2);
  const [applyRenumberOnEdit, setApplyRenumberOnEdit] =
    useState<boolean>(false);
  const [description, setDescription] = useState('');
  const [amenities, setAmenities] = useState(
    'Ar-Condicionado, Wi-Fi 6, Café da Manhã, Enxoval Premium'
  );
  const [imageUrl, setImageUrl] = useState(DEMO_IMAGES.masterSuite);
  const [galleryUrls, setGalleryUrls] = useState<string[]>([
    DEMO_IMAGES.masterSuite,
  ]);
  const [rules, setRules] = useState(
    'Não fumante. Check-in com documento oficial.'
  );
  const [feedback, setFeedback] = useState<string | null>(null);

  const mediaUsage = useMemo(
    () => calculateTenantMediaUsage(tenant, accommodations),
    [tenant, accommodations]
  );

  const openCreateModal = () => {
    setEditingAcc(null);
    setName('');
    setType('double_room');
    setPricingMode('per_room');
    setBasePrice(480);
    setWeekendPrice(580);
    setCapacity(2);
    setBedsCount(1);
    setUnitsToCreateCount(2);
    const defaultPrefix = 'Quarto';
    const suggested = suggestNextNumberInTenant(units, defaultPrefix);
    setCreatePrefix(defaultPrefix);
    setCreateStartNum(suggested);
    setCreateDigits(suggested >= 100 ? 3 : 2);
    setApplyRenumberOnEdit(false);
    setDescription('');
    setAmenities('Ar-Condicionado, Wi-Fi 6, Café da Manhã, Frigobar');
    setImageUrl(DEMO_IMAGES.masterSuite);
    setGalleryUrls([DEMO_IMAGES.masterSuite]);
    setRules('Respeitar horário de silêncio após 22h.');
    setIsCreating(true);
  };

  const openEditModal = (acc: Accommodation) => {
    const accUnits = sortUnitsNaturally(
      units.filter((u) => u.accommodationId === acc.id)
    );
    const detected = detectUnitPattern(accUnits, units, acc);

    setEditingAcc(acc);
    setName(acc.name);
    setType(acc.type);
    setPricingMode(acc.pricingMode);
    setBasePrice(acc.basePrice);
    setWeekendPrice(acc.weekendPrice || acc.basePrice);
    setCapacity(acc.capacity);
    setBedsCount(acc.bedsCount);
    setUnitsToCreateCount(Math.max(1, accUnits.length));
    setCreatePrefix(detected.prefix);
    setCreateStartNum(1);
    setCreateDigits(detected.minDigits);
    setApplyRenumberOnEdit(detected.hasMixedPattern);
    setDescription(acc.description || '');
    setAmenities(acc.amenities || '');
    const initialPhotos =
      acc.galleryUrls && acc.galleryUrls.length > 0
        ? acc.galleryUrls
        : [acc.imageUrl || DEMO_IMAGES.masterSuite];
    setImageUrl(initialPhotos[0]);
    setGalleryUrls(initialPhotos.slice(0, 3));
    setRules(acc.rules || '');
    setIsCreating(true);
  };

  const creationPreviewLabels = useMemo(() => {
    const isDorm = type.includes('dorm') || pricingMode === 'per_bed';
    const count = editingAcc
      ? Math.max(
          1,
          units.filter((u) => u.accommodationId === editingAcc.id).length
        )
      : Math.min(
          24,
          Math.max(1, isDorm ? Number(bedsCount) : Number(unitsToCreateCount))
        );
    return Array.from({length: count}, (_, idx) =>
      formatUnitLabel(createPrefix, Number(createStartNum) + idx, createDigits)
    );
  }, [
    editingAcc,
    units,
    type,
    pricingMode,
    bedsCount,
    unitsToCreateCount,
    createPrefix,
    createStartNum,
    createDigits,
  ]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const nowIso = new Date().toISOString();
    const accId =
      editingAcc?.id ||
      `acc_${tenant.id}_${Date.now()}`
        .replace(/[^a-zA-Z0-9_-]/g, '_')
        .slice(0, 100);

    const normalizedGallery = (
      galleryUrls.length > 0 ? galleryUrls : [imageUrl || DEMO_IMAGES.masterSuite]
    )
      .map((u) => u.trim().slice(0, 180000))
      .filter(Boolean)
      .slice(0, 3);

    const accDoc: Accommodation = {
      id: accId,
      tenantId: tenant.id,
      name: name.trim().slice(0, 140),
      type,
      pricingMode,
      basePrice: Number(basePrice),
      weekendPrice: Number(weekendPrice),
      capacity: Number(capacity),
      bedsCount: Number(bedsCount),
      description: description.trim().slice(0, 2000),
      amenities: amenities.trim().slice(0, 1000),
      imageUrl: normalizedGallery[0] || DEMO_IMAGES.masterSuite,
      galleryUrls: normalizedGallery,
      rules: rules.trim().slice(0, 800),
      active: editingAcc ? editingAcc.active : true,
      createdAt: editingAcc ? editingAcc.createdAt : nowIso,
    };

    try {
      const batch = writeBatch(db);
      batch.set(doc(db, 'accommodations', accId), accDoc);

      if (!editingAcc) {
        const isDorm = type.includes('dorm') || pricingMode === 'per_bed';
        const count = Math.min(
          24,
          Math.max(1, isDorm ? Number(bedsCount) : Number(unitsToCreateCount))
        );
        for (let i = 0; i < count; i++) {
          const num = Number(createStartNum) + i;
          const uId = `unit_${accId}_${i + 1}`.slice(0, 110);
          const unitDoc: ReservableUnit = {
            id: uId,
            tenantId: tenant.id,
            accommodationId: accId,
            label: formatUnitLabel(createPrefix, num, createDigits),
            unitType: isDorm ? 'bed' : 'room',
            status: 'active',
            createdAt: nowIso,
          };
          batch.set(doc(db, 'units', uId), unitDoc);
        }
      } else if (applyRenumberOnEdit) {
        const existingUnits = sortUnitsNaturally(
          units.filter((u) => u.accommodationId === editingAcc.id)
        );
        existingUnits.forEach((u, idx) => {
          batch.set(doc(db, 'units', u.id), {
            ...u,
            label: formatUnitLabel(
              createPrefix,
              Number(createStartNum) + idx,
              createDigits
            ),
          });
        });
      }

      await batch.commit();
      setIsCreating(false);
      setEditingAcc(null);
      setFeedback('Modelo de acomodação e numeração de unidades salvos.');
      setTimeout(() => setFeedback(null), 3500);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'accommodations');
    }
  };

  /**
   * 1-Click Automatic Next Unit Generator directly from the card:
   * Automatically detects the room/bed numbering pattern and creates the next unit in sequence.
   * If existing units had legacy mixed labels (e.g. "Suite Casal - Unid. 01" mixed with "Quarto 03"),
   * it also normalizes them into a clean sequence automatically in the same atomic batch!
   */
  const handleQuickAddNextUnit = async (acc: Accommodation) => {
    const accUnits = sortUnitsNaturally(
      units.filter((u) => u.accommodationId === acc.id)
    );
    const pattern = detectUnitPattern(accUnits, units, acc);
    const isDorm = acc.type.includes('dorm') || acc.pricingMode === 'per_bed';
    const nowIso = new Date().toISOString();

    try {
      const batch = writeBatch(db);

      if (pattern.hasMixedPattern && accUnits.length > 0) {
        // Normalize existing mixed units to 01..N and add N+1 cleanly
        accUnits.forEach((u, idx) => {
          batch.set(doc(db, 'units', u.id), {
            ...u,
            label: formatUnitLabel(
              pattern.prefix,
              idx + 1,
              pattern.minDigits,
              pattern.suffix
            ),
          });
        });
        const nextNum = accUnits.length + 1;
        const nextLabel = formatUnitLabel(
          pattern.prefix,
          nextNum,
          pattern.minDigits,
          pattern.suffix
        );
        const uId = `unit_${acc.id}_${Date.now()}`
          .replace(/[^a-zA-Z0-9_-]/g, '_')
          .slice(0, 110);
        batch.set(doc(db, 'units', uId), {
          id: uId,
          tenantId: tenant.id,
          accommodationId: acc.id,
          label: nextLabel,
          unitType: isDorm ? 'bed' : 'room',
          status: 'active',
          createdAt: nowIso,
        } satisfies ReservableUnit);

        await batch.commit();
        setFeedback(
          `"${nextLabel}" adicionado e sequência padronizada automaticamente (${pattern.prefix} 01 até ${nextLabel}).`
        );
      } else {
        const nextLabel = formatUnitLabel(
          pattern.prefix,
          pattern.startNumber,
          pattern.minDigits,
          pattern.suffix
        );
        const uId = `unit_${acc.id}_${Date.now()}`
          .replace(/[^a-zA-Z0-9_-]/g, '_')
          .slice(0, 110);
        batch.set(doc(db, 'units', uId), {
          id: uId,
          tenantId: tenant.id,
          accommodationId: acc.id,
          label: nextLabel,
          unitType: isDorm ? 'bed' : 'room',
          status: 'active',
          createdAt: nowIso,
        } satisfies ReservableUnit);

        await batch.commit();
        setFeedback(`Unidade "${nextLabel}" adicionada automaticamente.`);
      }

      setTimeout(() => setFeedback(null), 3500);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'units');
    }
  };

  /**
   * 1-Click Auto-Standardize for cards that already had legacy mixed labels
   */
  const handleQuickStandardizeCard = async (acc: Accommodation) => {
    const accUnits = sortUnitsNaturally(
      units.filter((u) => u.accommodationId === acc.id)
    );
    if (accUnits.length === 0) return;
    const pattern = detectUnitPattern(accUnits, units, acc);

    try {
      const batch = writeBatch(db);
      accUnits.forEach((u, idx) => {
        batch.set(doc(db, 'units', u.id), {
          ...u,
          label: formatUnitLabel(
            pattern.prefix,
            idx + 1,
            pattern.minDigits,
            pattern.suffix
          ),
        });
      });
      await batch.commit();
      setFeedback(
        `Numeração de "${acc.name}" padronizada automaticamente (${pattern.prefix} 01 a ${String(
          accUnits.length
        ).padStart(pattern.minDigits, '0')}).`
      );
      setTimeout(() => setFeedback(null), 3500);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'units');
    }
  };

  const handleDeleteSingleUnit = async (unit: ReservableUnit) => {
    const isLinkedToActiveRes = reservations.some(
      (r) =>
        r.accommodationId === unit.accommodationId &&
        [
          'confirmed',
          'checked_in',
          'pending_payment',
          'pending_confirmation',
        ].includes(r.status) &&
        r.unitIdsCsv
          .split(',')
          .map((s) => s.trim())
          .includes(unit.id)
    );
    if (isLinkedToActiveRes) {
      setFeedback(
        `Não é possível remover "${unit.label}" pois há reserva ativa vinculada.`
      );
      setTimeout(() => setFeedback(null), 4000);
      return;
    }

    try {
      await deleteDoc(doc(db, 'units', unit.id));
      setFeedback(`Unidade "${unit.label}" removida.`);
      setTimeout(() => setFeedback(null), 3000);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `units/${unit.id}`);
    }
  };

  const handleDuplicate = async (acc: Accommodation) => {
    const nowIso = new Date().toISOString();
    const newId = `acc_${tenant.id}_${Date.now()}`
      .replace(/[^a-zA-Z0-9_-]/g, '_')
      .slice(0, 100);
    const cloned: Accommodation = {
      ...acc,
      id: newId,
      name: `${acc.name} (Cópia)`.slice(0, 140),
      createdAt: nowIso,
    };
    const existingUnits = sortUnitsNaturally(
      units.filter((u) => u.accommodationId === acc.id)
    );
    const isDorm = acc.type.includes('dorm') || acc.pricingMode === 'per_bed';
    const prefix = isDorm ? 'Cama' : 'Quarto';
    const nextStart = suggestNextNumberInTenant(units, prefix);
    const digits = nextStart >= 100 ? 3 : 2;

    try {
      const batch = writeBatch(db);
      batch.set(doc(db, 'accommodations', newId), cloned);
      existingUnits.forEach((u, idx) => {
        const uId = `unit_${newId}_${idx + 1}`.slice(0, 110);
        batch.set(doc(db, 'units', uId), {
          ...u,
          id: uId,
          accommodationId: newId,
          label: formatUnitLabel(prefix, nextStart + idx, digits),
          createdAt: nowIso,
        });
      });
      await batch.commit();
      setFeedback(
        `Acomodação "${acc.name}" duplicada com ${existingUnits.length} unidades em sequência.`
      );
      setTimeout(() => setFeedback(null), 3500);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'accommodations');
    }
  };

  const handleToggleActive = async (acc: Accommodation) => {
    try {
      await setDoc(doc(db, 'accommodations', acc.id), {
        ...acc,
        active: !acc.active,
      });
    } catch (error) {
      handleFirestoreError(
        error,
        OperationType.UPDATE,
        `accommodations/${acc.id}`
      );
    }
  };

  const handleDelete = async (acc: Accommodation) => {
    const hasActiveRes = reservations.some(
      (r) =>
        r.accommodationId === acc.id &&
        [
          'confirmed',
          'checked_in',
          'pending_payment',
          'pending_confirmation',
        ].includes(r.status)
    );
    if (hasActiveRes) {
      setFeedback(
        'Não é permitido excluir uma acomodação que possui reservas ativas. Desative-a se desejar.'
      );
      setTimeout(() => setFeedback(null), 4000);
      return;
    }

    try {
      const accUnits = units.filter((u) => u.accommodationId === acc.id);
      for (const u of accUnits) {
        await deleteDoc(doc(db, 'units', u.id));
      }
      await deleteDoc(doc(db, 'accommodations', acc.id));
      setFeedback('Acomodação e unidades associadas removidas.');
      setTimeout(() => setFeedback(null), 3000);
    } catch (error) {
      handleFirestoreError(
        error,
        OperationType.DELETE,
        `accommodations/${acc.id}`
      );
    }
  };

  const createPrefixSuggestions =
    type.includes('dorm') || pricingMode === 'per_bed'
      ? BED_PREFIX_PRESETS
      : ROOM_PREFIX_PRESETS;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900">
            Gerenciamento de Acomodações e Unidades Reserváveis
          </h2>
          <p className="text-xs text-slate-600">
            Adicione novos quartos/camas automaticamente em 1 clique nos cards ou
            configure novos modelos de quarto no botão ao lado.
          </p>
        </div>

        <button
          type="button"
          onClick={openCreateModal}
          className="guest-btn-transition inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-800"
        >
          <Plus className="w-4 h-4" />
          Novo Modelo de Quarto
        </button>
      </div>

      <CloudQuotaUsageBar
        usage={mediaUsage}
        planName={`Plano ${tenant.plan.toUpperCase()}`}
      />

      {feedback && (
        <div className="animate-step-in p-3.5 rounded-lg bg-slate-900 text-white text-xs font-medium">
          {feedback}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {accommodations.map((acc) => {
          const accUnits = sortUnitsNaturally(
            units.filter((u) => u.accommodationId === acc.id)
          );
          const patternInfo = detectUnitPattern(accUnits, units, acc);
          const nextAutoLabel = formatUnitLabel(
            patternInfo.prefix,
            patternInfo.hasMixedPattern
              ? accUnits.length + 1
              : patternInfo.startNumber,
            patternInfo.minDigits,
            patternInfo.suffix
          );

          return (
            <div
              key={acc.id}
              className={`rounded-xl bg-white border p-5 space-y-4 transition-all ${
                acc.active ? 'border-slate-200' : 'border-slate-200 opacity-60'
              }`}
            >
              <div className="flex gap-4">
                <div className="w-28 h-24 rounded-lg overflow-hidden border border-slate-200 shrink-0">
                  <ResilientImage
                    src={acc.imageUrl}
                    alt={acc.name}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <span className="text-xs text-slate-500 block truncate">
                        {acc.type} · {acc.pricingMode} ·{' '}
                        {acc.active ? 'Ativa no Portal' : 'Inativa'}
                      </span>
                      <h3 className="text-base font-bold text-slate-900 truncate">
                        {acc.name}
                      </h3>
                    </div>
                    <span className="font-mono text-base font-bold text-slate-900 shrink-0">
                      R$ {acc.basePrice}
                    </span>
                  </div>

                  <p className="text-xs text-slate-600 line-clamp-2 mt-1">
                    {acc.description}
                  </p>
                </div>
              </div>

              {/* Simplified 1-Click Automatic Sequential Room/Bed Bar */}
              <div className="p-3 rounded-lg bg-slate-50 border border-slate-200/80 space-y-2.5">
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-slate-700">
                      Unidades / Camas Reserváveis ({accUnits.length}):
                    </span>
                    {patternInfo.hasMixedPattern && accUnits.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleQuickStandardizeCard(acc)}
                        title="Padronizar todos os nomes em sequência (01, 02, 03...)"
                        className="guest-btn-transition inline-flex items-center gap-1 px-2 py-0.5 rounded bg-amber-50 border border-amber-300 text-amber-900 text-[10px] font-semibold hover:bg-amber-100"
                      >
                        <Sparkles className="w-3 h-3" />
                        <span>Padronizar (01, 02...)</span>
                      </button>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => handleQuickAddNextUnit(acc)}
                    className="guest-btn-transition inline-flex items-center gap-1 text-xs font-semibold text-slate-900 bg-white border border-slate-300 rounded-md px-2.5 py-1 hover:bg-slate-900 hover:text-white hover:border-slate-900 shadow-2xs"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Adicionar {nextAutoLabel}</span>
                  </button>
                </div>

                <div className="flex flex-wrap gap-1.5">
                  {accUnits.map((u) => (
                    <span
                      key={u.id}
                      className={`group inline-flex items-center gap-1 text-[11px] font-mono border rounded px-2 py-0.5 transition-colors ${
                        u.status === 'maintenance'
                          ? 'bg-amber-50 border-amber-200 text-amber-800 line-through'
                          : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300'
                      }`}
                    >
                      <span>{u.label}</span>
                      <button
                        type="button"
                        onClick={() => handleDeleteSingleUnit(u)}
                        title={`Remover ${u.label}`}
                        className="text-slate-400 hover:text-red-600 transition-colors ml-0.5"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                  {accUnits.length === 0 && (
                    <span className="text-[11px] text-slate-500">
                      Nenhuma unidade física cadastrada. Clique em &quot;+ Adicionar{' '}
                      {nextAutoLabel}&quot;.
                    </span>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100 text-xs">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => openEditModal(acc)}
                    className="guest-btn-transition inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md border border-slate-200 text-slate-700 hover:bg-slate-50 font-medium"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    Editar Modelo
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDuplicate(acc)}
                    className="guest-btn-transition inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md border border-slate-200 text-slate-700 hover:bg-slate-50 font-medium"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    Duplicar
                  </button>
                  <button
                    type="button"
                    onClick={() => handleToggleActive(acc)}
                    className="guest-btn-transition inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md border border-slate-200 text-slate-700 hover:bg-slate-50 font-medium"
                  >
                    <Power className="w-3.5 h-3.5" />
                    {acc.active ? 'Desativar' : 'Ativar'}
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => handleDelete(acc)}
                  className="guest-btn-transition inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md text-red-600 hover:bg-red-50 font-medium"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Excluir
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Create / Edit Accommodation Model Modal (houses the detailed numbering settings) */}
      {isCreating && (
        <div className="animate-backdrop-in fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 p-3 sm:p-6">
          <form
            onSubmit={handleSave}
            className="animate-modal-in w-full max-w-2xl max-h-[90vh] rounded-xl bg-white border border-slate-200 flex flex-col overflow-hidden shadow-2xl"
          >
            <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between gap-3 shrink-0">
              <h3 className="text-base font-bold text-slate-900">
                {editingAcc
                  ? `Editar Modelo de Quarto: ${editingAcc.name}`
                  : 'Cadastrar Novo Modelo de Quarto / Acomodação'}
              </h3>
              <button
                type="button"
                onClick={() => setIsCreating(false)}
                className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-200/70"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="sm:col-span-2">
                  <label className="block font-semibold text-slate-700 mb-1">
                    Nome do Modelo de Acomodação *
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Ex.: Suíte Master Varanda ou Dormitório Misto 8 Camas"
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Modalidade / Tipo
                  </label>
                  <select
                    value={type}
                    onChange={(e) => {
                      const nextType = e.target.value as AccommodationType;
                      setType(nextType);
                      const isDorm = nextType.includes('dorm');
                      const nextPrefix = isDorm ? 'Cama' : 'Quarto';
                      const suggested = suggestNextNumberInTenant(
                        units,
                        nextPrefix
                      );
                      setCreatePrefix(nextPrefix);
                      setCreateStartNum(suggested);
                      setCreateDigits(suggested >= 100 ? 3 : 2);
                      if (isDorm) setPricingMode('per_bed');
                    }}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 bg-white"
                  >
                    <option value="double_room">Quarto de Casal</option>
                    <option value="private_room">Quarto Privativo</option>
                    <option value="single_room">Quarto Individual</option>
                    <option value="family_room">Quarto Familiar</option>
                    <option value="mixed_dorm">Dormitório Misto (Camas)</option>
                    <option value="female_dorm">
                      Dormitório Feminino (Camas)
                    </option>
                    <option value="male_dorm">
                      Dormitório Masculino (Camas)
                    </option>
                    <option value="shared_dorm">Dormitório Compartilhado</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Regra de Cobrança
                  </label>
                  <select
                    value={pricingMode}
                    onChange={(e) =>
                      setPricingMode(e.target.value as PricingMode)
                    }
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 bg-white"
                  >
                    <option value="per_room">Valor por Quarto</option>
                    <option value="per_bed">Valor por Cama Individual</option>
                    <option value="per_person">Valor por Pessoa</option>
                    <option value="per_night">Valor por Diária</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Tarifa Padrão (R$) *
                  </label>
                  <input
                    type="number"
                    min={1}
                    required
                    value={basePrice}
                    onChange={(e) => setBasePrice(Number(e.target.value))}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-slate-900"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Tarifa Fim de Semana (R$)
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={weekendPrice}
                    onChange={(e) => setWeekendPrice(Number(e.target.value))}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-slate-900"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Capacidade (Hóspedes)
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={24}
                    value={capacity}
                    onChange={(e) => setCapacity(Number(e.target.value))}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-slate-900"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Camas por Acomodação
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={24}
                    value={bedsCount}
                    onChange={(e) => setBedsCount(Number(e.target.value))}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-slate-900"
                  />
                </div>

                {/* Advanced Numbering Configuration inside the Model Form */}
                <div className="sm:col-span-2 p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3 my-1">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 font-bold text-slate-900">
                      <Hash className="w-4 h-4 text-slate-700" />
                      <span>
                        Padrão de Numeração dos{' '}
                        {type.includes('dorm') ? 'Leitos/Camas' : 'Quartos'}{' '}
                        deste Modelo
                      </span>
                    </div>

                    {editingAcc && (
                      <label className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-slate-700 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={applyRenumberOnEdit}
                          onChange={(e) =>
                            setApplyRenumberOnEdit(e.target.checked)
                          }
                          className="rounded border-slate-300 text-slate-900"
                        />
                        <span>Renumerar unidades atuais ao salvar</span>
                      </label>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5">
                    {!editingAcc && !type.includes('dorm') && (
                      <div>
                        <label className="block font-semibold text-slate-700 mb-1">
                          Qtd. Inicial de Quartos
                        </label>
                        <input
                          type="number"
                          min={1}
                          max={24}
                          value={unitsToCreateCount}
                          onChange={(e) =>
                            setUnitsToCreateCount(Number(e.target.value))
                          }
                          className="h-9 w-full rounded-lg border border-slate-300 bg-white px-2.5 font-mono text-slate-900"
                        />
                      </div>
                    )}

                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">
                        Prefixo do Padrão
                      </label>
                      <select
                        value={
                          createPrefixSuggestions.includes(createPrefix)
                            ? createPrefix
                            : '__custom__'
                        }
                        onChange={(e) => {
                          if (e.target.value !== '__custom__') {
                            setCreatePrefix(e.target.value);
                          }
                        }}
                        className="h-9 w-full rounded-lg border border-slate-300 bg-white px-2.5 text-slate-900"
                      >
                        {createPrefixSuggestions.map((p) => (
                          <option key={p} value={p}>
                            {p}
                          </option>
                        ))}
                        {!createPrefixSuggestions.includes(createPrefix) && (
                          <option value="__custom__">{createPrefix}</option>
                        )}
                      </select>
                    </div>

                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">
                        Nº Inicial
                      </label>
                      <input
                        type="number"
                        min={1}
                        max={9999}
                        value={createStartNum}
                        onChange={(e) => {
                          const val = Math.max(1, Number(e.target.value));
                          setCreateStartNum(val);
                          if (val >= 100 && createDigits < 3) {
                            setCreateDigits(3);
                          }
                        }}
                        className="h-9 w-full rounded-lg border border-slate-300 bg-white px-2.5 font-mono text-slate-900"
                      />
                    </div>

                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">
                        Formato de Dígitos
                      </label>
                      <select
                        value={createDigits}
                        onChange={(e) =>
                          setCreateDigits(Number(e.target.value))
                        }
                        className="h-9 w-full rounded-lg border border-slate-300 bg-white px-2.5 font-mono text-slate-900"
                      >
                        <option value={2}>2 dígitos (01, 02)</option>
                        <option value={3}>3 dígitos (101, 102)</option>
                        <option value={1}>Sem zero (1, 2)</option>
                      </select>
                    </div>
                  </div>

                  {(!editingAcc || applyRenumberOnEdit) && (
                    <div className="space-y-1">
                      <span className="text-[11px] font-medium text-slate-500 block">
                        Sequência que será aplicada automaticamente:
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {creationPreviewLabels.map((lbl) => (
                          <span
                            key={lbl}
                            className="text-[11px] font-mono bg-white border border-slate-200 rounded px-2 py-0.5 text-slate-800"
                          >
                            {lbl}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <div className="sm:col-span-2">
                  <RoomPhotosGalleryUploader
                    photos={galleryUrls}
                    onChangePhotos={(next) => {
                      setGalleryUrls(next);
                      if (next[0]) setImageUrl(next[0]);
                    }}
                    usage={mediaUsage}
                    maxPhotosPerRoom={mediaUsage.quotaSpec.maxPhotosPerRoom}
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block font-semibold text-slate-700 mb-1">
                    Comodidades (separadas por vírgula)
                  </label>
                  <input
                    type="text"
                    value={amenities}
                    onChange={(e) => setAmenities(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block font-semibold text-slate-700 mb-1">
                    Descrição Comercial
                  </label>
                  <textarea
                    rows={2}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 p-3 text-slate-900"
                  />
                </div>
              </div>
            </div>

            <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex justify-end gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setIsCreating(false)}
                className="guest-btn-transition px-4 py-2 rounded-lg border border-slate-300 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="guest-btn-transition inline-flex items-center gap-1.5 px-5 py-2 rounded-lg bg-slate-900 text-white text-xs font-semibold hover:bg-slate-800"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Salvar Modelo de Acomodação</span>
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
