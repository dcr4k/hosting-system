import {Accommodation, ReservableUnit} from '../types/models';

export interface UnitNamingPattern {
  prefix: string;
  startNumber: number;
  minDigits: number;
  suffix: string;
  hasMixedPattern: boolean;
}

export const ROOM_PREFIX_PRESETS = [
  'Quarto',
  'Suíte',
  'Chalé',
  'Cabana',
  'Apartamento',
  'Bangalô',
  'Loft',
  'Unidade',
];

export const BED_PREFIX_PRESETS = ['Cama', 'Beliche', 'Leito', 'Cápsula'];

export function sortUnitsNaturally(list: ReservableUnit[]): ReservableUnit[] {
  return [...list].sort((a, b) =>
    a.label.localeCompare(b.label, 'pt-BR', {
      numeric: true,
      sensitivity: 'base',
    })
  );
}

export function formatUnitLabel(
  prefix: string,
  num: number,
  minDigits: number,
  suffix = ''
): string {
  const cleanPrefix = prefix.trim();
  const numStr =
    minDigits > 1 ? String(num).padStart(minDigits, '0') : String(num);
  const cleanSuffix = suffix.trim();
  const base = cleanPrefix ? `${cleanPrefix} ${numStr}` : numStr;
  return (cleanSuffix ? `${base} ${cleanSuffix}` : base).slice(0, 80);
}

interface ParsedLabel {
  prefix: string;
  number: number;
  digits: number;
  suffix: string;
  isLegacyUnid: boolean;
}

export function parseUnitLabel(label: string): ParsedLabel | null {
  const match = label.trim().match(/^(.*?)(\d+)(\D*)$/);
  if (!match) return null;
  const rawPrefix = match[1].trim();
  const numToken = match[2];
  const rawSuffix = match[3].trim();
  const parsedNum = parseInt(numToken, 10);
  if (Number.isNaN(parsedNum)) return null;

  const isLegacyUnid = /-\s*unid\.?$/i.test(rawPrefix);

  return {
    prefix: rawPrefix,
    number: parsedNum,
    digits: numToken.length >= 3 ? 3 : numToken.length === 2 ? 2 : 1,
    suffix: rawSuffix,
    isLegacyUnid,
  };
}

export function suggestNextNumberInTenant(
  allTenantUnits: ReservableUnit[],
  prefix: string
): number {
  const targetPrefix = prefix.trim().toLowerCase();
  let highest = 0;
  for (const u of allTenantUnits) {
    const parsed = parseUnitLabel(u.label);
    if (!parsed) continue;
    if (
      !targetPrefix ||
      parsed.prefix.toLowerCase() === targetPrefix ||
      parsed.isLegacyUnid
    ) {
      if (parsed.number > highest) highest = parsed.number;
    }
  }
  return highest > 0 ? highest + 1 : 1;
}

export function detectUnitPattern(
  accUnits: ReservableUnit[],
  allTenantUnits: ReservableUnit[],
  acc: Pick<Accommodation, 'name' | 'type' | 'pricingMode'>
): UnitNamingPattern {
  const isDorm = acc.type.includes('dorm') || acc.pricingMode === 'per_bed';
  const fallbackPrefix = isDorm ? 'Cama' : 'Quarto';

  if (accUnits.length === 0) {
    const nextNum = suggestNextNumberInTenant(allTenantUnits, fallbackPrefix);
    return {
      prefix: fallbackPrefix,
      startNumber: nextNum,
      minDigits: nextNum >= 100 ? 3 : 2,
      suffix: '',
      hasMixedPattern: false,
    };
  }

  const parsedItems = accUnits
    .map((u) => parseUnitLabel(u.label))
    .filter((p): p is ParsedLabel => p !== null);

  if (parsedItems.length === 0) {
    return {
      prefix: fallbackPrefix,
      startNumber: accUnits.length + 1,
      minDigits: 2,
      suffix: '',
      hasMixedPattern: true,
    };
  }

  // Prefer clean prefixes (e.g. "Quarto", "Suíte", "Cama") over legacy "- Unid." prefixes
  const sigCount = new Map<
    string,
    {
      count: number;
      prefix: string;
      suffix: string;
      digits: number;
      maxNum: number;
      isLegacy: boolean;
    }
  >();

  let globalMaxNum = 0;
  let anyLegacy = false;

  for (const item of parsedItems) {
    if (item.number > globalMaxNum) globalMaxNum = item.number;
    if (item.isLegacyUnid) anyLegacy = true;

    const normalizedPrefix = item.isLegacyUnid
      ? fallbackPrefix
      : item.prefix || fallbackPrefix;
    const key = `${normalizedPrefix.toLowerCase()}|${item.suffix.toLowerCase()}`;
    const prev = sigCount.get(key);
    if (!prev) {
      sigCount.set(key, {
        count: 1,
        prefix: normalizedPrefix,
        suffix: item.suffix,
        digits: item.digits,
        maxNum: item.number,
        isLegacy: item.isLegacyUnid,
      });
    } else {
      prev.count += 1;
      if (item.number > prev.maxNum) prev.maxNum = item.number;
      if (item.digits > prev.digits) prev.digits = item.digits;
    }
  }

  const rawDistinctPrefixes = new Set(
    parsedItems.map(
      (i) => `${i.prefix.toLowerCase()}|${i.suffix.toLowerCase()}`
    )
  );
  const sortedSigs = [...sigCount.values()].sort((a, b) => b.count - a.count);
  const dominant = sortedSigs[0];
  const hasMixedPattern =
    rawDistinctPrefixes.size > 1 ||
    anyLegacy ||
    parsedItems.length !== accUnits.length;

  const existingLabelsLower = new Set(
    accUnits.map((u) => u.label.trim().toLowerCase())
  );

  // Find the next number in sequence (or fill the highest + 1)
  let candidate = Math.max(globalMaxNum, accUnits.length) + 1;
  // Also check if sequential numbers 1..N have a free slot when legacy was mixed
  for (let n = 1; n <= Math.max(globalMaxNum, accUnits.length) + 1; n++) {
    const usedNumbers = new Set(parsedItems.map((p) => p.number));
    if (!usedNumbers.has(n)) {
      candidate = n;
      break;
    }
  }

  while (
    existingLabelsLower.has(
      formatUnitLabel(
        dominant.prefix,
        candidate,
        dominant.digits,
        dominant.suffix
      ).toLowerCase()
    )
  ) {
    candidate += 1;
  }

  return {
    prefix: dominant.prefix || fallbackPrefix,
    startNumber: candidate,
    minDigits: candidate >= 100 && dominant.digits < 3 ? 3 : dominant.digits,
    suffix: dominant.suffix,
    hasMixedPattern,
  };
}
