/**
 * Modul kalkulacji gwarancji konsumenckich oraz terminow odstapienia od umowy (zwrotu).
 * Zgodny z polskim prawem konsumenckim (rekojmia 24 m-ce, zwrot 14 dni przy zakupach na odleglosc).
 */

/** Status prawno-ochronny przedmiotu objętego gwarancją. */
export type WarrantyStatus = 'ACTIVE' | 'EXPIRING_SOON' | 'EXPIRED' | 'CLAIMED';

/** Status uprawnienia do zwrotu towaru bez podania przyczyny. */
export type ReturnStatus = 'CAN_RETURN' | 'RETURN_EXPIRED';

/** Zbiorczy wynik obliczen terminow ochronnych i wizualnych indykatorow. */
export interface WarrantyCalculationResult {
  /** Koncowa data obowiazywania gwarancji w formacie ISO (YYYY-MM-DD). */
  readonly endDate: string;
  /** Graniczna data prawa do odstapienia od zakupu (YYYY-MM-DD). */
  readonly returnDeadline: string;
  /** Liczba dni pozostalych do konca gwarancji (wartosc ujemna oznacza przedawnienie). */
  readonly daysRemaining: number;
  /** Liczba dni pozostalych na dokonanie zwrotu. */
  readonly returnDaysRemaining: number;
  /** Aktualny wyliczony status ochrony gwarancyjnej. */
  readonly status: WarrantyStatus;
  /** Status prawa do zwrotu towaru. */
  readonly returnStatus: ReturnStatus;
  /** Tekstowa etykieta do prezentacji w interfejsie (z uwzglednieniem polskiej odmiany). */
  readonly badgeLabel: string;
  /** Szesnastkowy kod koloru odznaki zgodny z paleta statusow design systemu. */
  readonly badgeColor: string;
  /** Procent uplywu okresu gwarancji od 0% (nowy zakup) do 100% (calkowicie wygasla). */
  readonly progressPercentage: number;
}

/** Parametry wejsciowe do kalkulatora terminow gwarancji. */
export interface CalculateWarrantyOptions {
  /** Data transakcji w formacie ISO-8601 (YYYY-MM-DD). */
  readonly purchaseDate: string;
  /** Czas trwania gwarancji w pelnych miesiacach (domyslnie 24). */
  readonly durationMonths?: number;
  /** Dopuszczalny czas na zwrot w dniach kalendarzowych (domyslnie 14). */
  readonly returnWindowDays?: number;
  /** Flaga oznaczajaca trwajacy proces reklamacyjny zgłoszony przez konsumenta. */
  readonly isClaimed?: boolean;
  /** Opcjonalna data referencyjna wstrzykiwana na potrzeby deterministycznych testow jednostkowych. */
  readonly referenceDate?: Date;
}

/**
 * Formatuje liczbe dni do konca gwarancji z poprawna odmiana gramatyczna w jezyku polskim.
 *
 * @param days Liczba dni (dodatnia: pozostalo; zero: dzisiaj; ujemna: po terminie).
 * @returns Sformatowany komunikat w jezyku polskim.
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
 * Dodaje zadana liczbe miesiecy do daty w formacie ISO (YYYY-MM-DD),
 * bezpiecznie korygujac przestepne lata oraz roznice w dlugosciach miesiecy (np. 31 stycznia + 1 miesiac = 28/29 lutego).
 *
 * @param isoDate Data poczatkowa w formacie YYYY-MM-DD.
 * @param months Liczba pelnych miesiecy do dodania.
 * @returns Nowa data w formacie YYYY-MM-DD.
 */
export function addMonthsToIsoDate(isoDate: string, months: number): string {
  const [yearStr, monthStr, dayStr] = isoDate.split('-');
  const year = parseInt(yearStr, 10);
  const month = parseInt(monthStr, 10) - 1;
  const day = parseInt(dayStr, 10);

  const targetDate = new Date(Date.UTC(year, month + months, 1));
  const daysInTargetMonth = new Date(Date.UTC(targetDate.getUTCFullYear(), targetDate.getUTCMonth() + 1, 0)).getUTCDate();
  const adjustedDay = Math.min(day, daysInTargetMonth);

  const result = new Date(Date.UTC(targetDate.getUTCFullYear(), targetDate.getUTCMonth(), adjustedDay));
  return result.toISOString().slice(0, 10);
}

/**
 * Dodaje zadana liczbe dni kalendarzowych do daty w formacie ISO (YYYY-MM-DD).
 *
 * @param isoDate Data poczatkowa w formacie YYYY-MM-DD.
 * @param days Liczba dni do dodania.
 * @returns Nowa data w formacie YYYY-MM-DD.
 */
export function addDaysToIsoDate(isoDate: string, days: number): string {
  const [yearStr, monthStr, dayStr] = isoDate.split('-');
  const date = new Date(Date.UTC(parseInt(yearStr, 10), parseInt(monthStr, 10) - 1, parseInt(dayStr, 10)));
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

/**
 * Oblicza roznice w pelnych dobach pomiedzy dwiema datami ISO.
 *
 * @param fromIso Data poczatkowa (YYYY-MM-DD).
 * @param toIso Data koncowa (YYYY-MM-DD).
 * @returns Liczba pelnych dni kalendarzowych (toIso - fromIso).
 */
export function diffDays(fromIso: string, toIso: string): number {
  const fromMs = Date.parse(fromIso + 'T00:00:00Z');
  const toMs = Date.parse(toIso + 'T00:00:00Z');
  return Math.round((toMs - fromMs) / (1000 * 60 * 60 * 24));
}

/**
 * Kalkulator gwarancji i terminow konsumenckich (WarrantyCalculator).
 * Realizuje precyzyjna logike biznesowa kalkulacji statusow oraz paskow postepu.
 */
export class WarrantyCalculator {
  /**
   * Oblicza pelny zestaw metryk gwarancyjnych i zwrotu na podstawie parametrow zakupu.
   *
   * @param options Parametry zakupu (data, dlugosc trwania, status reklamacji).
   * @returns Kompletny obiekt kalkulacji gwarancyjnej wraz z etykietami UI.
   */
  static calculate(options: CalculateWarrantyOptions): WarrantyCalculationResult {
    const durationMonths = options.durationMonths ?? 24;
    const returnWindowDays = options.returnWindowDays ?? 14;

    const endDate = addMonthsToIsoDate(options.purchaseDate, durationMonths);
    const returnDeadline = addDaysToIsoDate(options.purchaseDate, returnWindowDays);

    const todayIso = (options.referenceDate ?? new Date()).toISOString().slice(0, 10);

    const daysRemaining = diffDays(todayIso, endDate);
    const returnDaysRemaining = diffDays(todayIso, returnDeadline);

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

    const totalDurationDays = Math.max(1, diffDays(options.purchaseDate, endDate));
    const consumedDays = Math.max(0, diffDays(options.purchaseDate, todayIso));
    const progressPercentage = Math.min(100, Math.max(0, Math.round((consumedDays / totalDurationDays) * 100)));

    let badgeLabel: string;
    let badgeColor: string;

    switch (status) {
      case 'CLAIMED':
        badgeLabel = 'W trakcie reklamacji';
        badgeColor = '#3B82F6';
        break;
      case 'EXPIRED':
        badgeLabel = formatDaysRemaining(daysRemaining);
        badgeColor = '#64748B';
        break;
      case 'EXPIRING_SOON':
        badgeLabel = formatDaysRemaining(daysRemaining);
        badgeColor = '#F59E0B';
        break;
      case 'ACTIVE':
      default:
        badgeLabel = `Aktywna (${daysRemaining} dni)`;
        badgeColor = '#10B981';
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
