export type WarrantyStatus = 'ACTIVE' | 'EXPIRING_SOON' | 'EXPIRED' | 'CLAIMED';
export type ReturnStatus = 'CAN_RETURN' | 'RETURN_EXPIRED';

export interface WarrantyCalculationResult {
  readonly endDate: string; // YYYY-MM-DD
  readonly returnDeadline: string; // YYYY-MM-DD
  readonly daysRemaining: number;
  readonly returnDaysRemaining: number;
  readonly status: WarrantyStatus;
  readonly returnStatus: ReturnStatus;
  readonly badgeLabel: string;
  readonly badgeColor: string;
  readonly progressPercentage: number; // 0 (start) to 100 (expired)
}

export interface CalculateWarrantyOptions {
  readonly purchaseDate: string; // YYYY-MM-DD
  readonly durationMonths?: number; // domyslnie 24
  readonly returnWindowDays?: number; // domyslnie 14
  readonly isClaimed?: boolean;
  readonly referenceDate?: Date; // wstrzykiwana data odniesienia do testow
}

/**
 * Formatowanie odmiany dni w jezyku polskim
 */
export function formatDaysRemaining(days: number): string {
  if (days === 0) {
    return 'Wygasa dzisiaj';
  }
  if (days === 1) {
    return 'Pozostał 1 dzień';
  }
  if (days > 1 && days <= 4) {
    return `Pozostały ${days} dni`;
  }
  if (days > 4) {
    return `Pozostało ${days} dni`;
  }

  // Wartosci ujemne (juz wygasla)
  const absDays = Math.abs(days);
  if (absDays === 1) {
    return 'Wygasła wczoraj';
  }
  return `Wygasła ${absDays} dni temu`;
}

/**
 * Dodawanie miesiecy do daty ISO (YYYY-MM-DD) z uwzglednieniem dlugosci miesiecy
 */
export function addMonthsToIsoDate(isoDate: string, months: number): string {
  const [yearStr, monthStr, dayStr] = isoDate.split('-');
  const year = parseInt(yearStr, 10);
  const month = parseInt(monthStr, 10) - 1;
  const day = parseInt(dayStr, 10);

  const targetDate = new Date(Date.UTC(year, month + months, 1));
  // Ostatni dzien miesiaca docelowego
  const daysInTargetMonth = new Date(Date.UTC(targetDate.getUTCFullYear(), targetDate.getUTCMonth() + 1, 0)).getUTCDate();
  const adjustedDay = Math.min(day, daysInTargetMonth);

  const result = new Date(Date.UTC(targetDate.getUTCFullYear(), targetDate.getUTCMonth(), adjustedDay));
  return result.toISOString().slice(0, 10);
}

/**
 * Dodawanie dni do daty ISO (YYYY-MM-DD)
 */
export function addDaysToIsoDate(isoDate: string, days: number): string {
  const [yearStr, monthStr, dayStr] = isoDate.split('-');
  const date = new Date(Date.UTC(parseInt(yearStr, 10), parseInt(monthStr, 10) - 1, parseInt(dayStr, 10)));
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

/**
 * Oblicza liczbe dni pomiedzy dwiema datami ISO
 */
export function diffDays(fromIso: string, toIso: string): number {
  const fromMs = Date.parse(fromIso + 'T00:00:00Z');
  const toMs = Date.parse(toIso + 'T00:00:00Z');
  return Math.round((toMs - fromMs) / (1000 * 60 * 60 * 24));
}

/**
 * Glowny kalkulator gwarancji i terminow zwrotu
 */
export class WarrantyCalculator {
  static calculate(options: CalculateWarrantyOptions): WarrantyCalculationResult {
    const durationMonths = options.durationMonths ?? 24;
    const returnWindowDays = options.returnWindowDays ?? 14;

    const endDate = addMonthsToIsoDate(options.purchaseDate, durationMonths);
    const returnDeadline = addDaysToIsoDate(options.purchaseDate, returnWindowDays);

    const todayIso = (options.referenceDate ?? new Date()).toISOString().slice(0, 10);

    const daysRemaining = diffDays(todayIso, endDate);
    const returnDaysRemaining = diffDays(todayIso, returnDeadline);

    // Wyznaczanie statusu
    let status: WarrantyStatus;
    if (options.isClaimed) {
      status = 'CLAIMED';
    } else if (daysRemaining < 0) {
      status = 'EXPIRED';
    } else if (daysRemaining <= 30) {
      status = 'EXPIRING_SOON';
    } else {
      status = 'ACTIVE';
    }

    const returnStatus: ReturnStatus = returnDaysRemaining >= 0 ? 'CAN_RETURN' : 'RETURN_EXPIRED';

    // Procent uplywu gwarancji
    const totalDurationDays = Math.max(1, diffDays(options.purchaseDate, endDate));
    const consumedDays = Math.max(0, diffDays(options.purchaseDate, todayIso));
    const progressPercentage = Math.min(100, Math.max(0, Math.round((consumedDays / totalDurationDays) * 100)));

    // Etykieta i kolor odznaki
    let badgeLabel: string;
    let badgeColor: string;

    switch (status) {
      case 'CLAIMED':
        badgeLabel = 'W trakcie reklamacji';
        badgeColor = '#3B82F6'; // Niebieski
        break;
      case 'EXPIRED':
        badgeLabel = formatDaysRemaining(daysRemaining);
        badgeColor = '#64748B'; // Szary
        break;
      case 'EXPIRING_SOON':
        badgeLabel = formatDaysRemaining(daysRemaining);
        badgeColor = '#F59E0B'; // Pomaranczowy / Ostrzegawczy
        break;
      case 'ACTIVE':
      default:
        badgeLabel = `Aktywna (${daysRemaining} dni)`;
        badgeColor = '#10B981'; // Zielony
        break;
    }

    return {
      endDate,
      returnDeadline,
      daysRemaining,
      returnDaysRemaining,
      status,
      returnStatus,
      badgeLabel,
      badgeColor,
      progressPercentage,
    };
  }
}
