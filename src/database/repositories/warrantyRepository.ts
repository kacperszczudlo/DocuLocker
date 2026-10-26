import { SqlDatabase } from '../connection';
import { WarrantyStatus } from '../types';
import { WarrantyCalculator, WarrantyCalculationResult } from '@/core/warranties/warrantyCalculator';

/** Reprezentacja rekordu gwarancji wzbogacona o metadane dokumentu i dynamiczne obliczenia. */
export interface WarrantyItemWithDetails {
  /** Identyfikator rekordu w tabeli `warranties`. */
  readonly id: number;
  /** Identyfikator powiazanego dokumentu. */
  readonly document_id: string;
  /** Tytul dokumentu. */
  readonly title: string;
  /** Nazwa sklepu lub sprzedawcy. */
  readonly store_name: string | null;
  /** Nazwa kategorii wydatku. */
  readonly category_name: string | null;
  /** Ikona kategorii. */
  readonly category_icon: string | null;
  /** Kolor chipu kategorii. */
  readonly category_color: string | null;
  /** Wartosc transakcji. */
  readonly total_amount: number;
  /** Waluta zakupu. */
  readonly currency: string;
  /** Data zakupu w formacie ISO (YYYY-MM-DD). */
  readonly purchase_date: string;
  /** Czas trwania ochrony w miesiacach. */
  readonly duration_months: number;
  /** Graniczna data obowiazywania gwarancji (YYYY-MM-DD). */
  readonly end_date: string;
  /** Okno na zwrot towaru w dniach. */
  readonly return_window_days: number;
  /** Data uplywu prawa do zwrotu (YYYY-MM-DD). */
  readonly return_deadline: string;
  /** Biezacy status ochrony gwarancyjnej. */
  readonly status: WarrantyStatus;
  /** Notatki ze zgloszonej reklamacji. */
  readonly claim_notes: string | null;
  /** Sciezka do miniatury zdjecia paragonu. */
  readonly primary_image_path: string | null;
  /** Dynamicznie wyliczone wlasciwosci prezentacyjne (odliczanie, procent, etykieta). */
  readonly calculation: WarrantyCalculationResult;
}

/** Kryteria filtrowania widoku gwarancji. */
export interface WarrantyFilter {
  /** Filtr statusu ('ACTIVE', 'EXPIRING_SOON', 'EXPIRED', 'CLAIMED', 'ALL'). */
  readonly status?: WarrantyStatus | 'ALL';
  /** Opcjonalny filtr kategorii. */
  readonly categoryId?: number;
  /** Fraza wyszukiwania w tytule dokumentu lub nazwie sklepu. */
  readonly search?: string;
}

/** Zbiorcze statystyki liczbowe do prezentacji na filtrach i dashboardzie. */
export interface WarrantyStats {
  /** Calkowita liczba zarejestrowanych gwarancji. */
  readonly total: number;
  /** Liczba aktywnych gwarancji. */
  readonly active: number;
  /** Liczba gwarancji wygasajacych w najblizszych 30 dniach. */
  readonly expiringSoon: number;
  /** Liczba gwarancji przedawnionych. */
  readonly expired: number;
  /** Liczba gwarancji w trakcie aktywnej procedury reklamacyjnej. */
  readonly claimed: number;
}

interface RawWarrantyRow {
  id: number;
  document_id: string;
  title: string;
  store_name: string | null;
  category_name: string | null;
  category_icon: string | null;
  category_color: string | null;
  total_amount: number;
  currency: string;
  purchase_date: string;
  duration_months: number;
  end_date: string;
  return_window_days: number;
  return_deadline: string;
  status: string;
  claim_notes: string | null;
  primary_image_path: string | null;
}

/**
 * Repozytorium zarzadzania gwarancjami konsumenckimi (WarrantyRepository).
 * Realizuje synchronizacje statusow, wyliczanie statystyk oraz obsluge reklamacji.
 */
export class WarrantyRepository {
  /**
   * Inicjalizuje repozytorium gwarancji.
   *
   * @param db Polaczenie bazy danych `SqlDatabase`.
   */
  constructor(private readonly db: SqlDatabase) {}

  /**
   * Synchronizuje statusy w bazie SQLite w oparciu o aktualna date urzadzenia.
   * Przenosi rekordy do stanu `EXPIRING_SOON` (<= 30 dni) lub `EXPIRED` (< dzisiaj).
   */
  async syncStatuses(): Promise<void> {
    // 1. Oznacz wygasle
    await this.db.runAsync(
      `UPDATE warranties 
       SET status = 'EXPIRED', updated_at = datetime('now')
       WHERE end_date < date('now') 
         AND status NOT IN ('EXPIRED', 'CLAIMED');`
    );

    // 2. Oznacz wygasajace w ciagu 30 dni
    await this.db.runAsync(
      `UPDATE warranties 
       SET status = 'EXPIRING_SOON', updated_at = datetime('now')
       WHERE end_date >= date('now') 
         AND end_date <= date('now', '+30 days')
         AND status = 'ACTIVE';`
    );
  }

  /**
   * Pobiera statystyki liczbowe pogrupowane wedlug statusu.
   *
   * @returns Obiekt zagregowanych statystyk `WarrantyStats`.
   */
  async getStats(): Promise<WarrantyStats> {
    const rows = await this.db.getAllAsync<{ status: string; count: number }>(
      `SELECT status, COUNT(*) as count FROM warranties GROUP BY status;`
    );

    let total = 0;
    let active = 0;
    let expiringSoon = 0;
    let expired = 0;
    let claimed = 0;

    for (const r of rows) {
      total += r.count;
      if (r.status === 'ACTIVE') active = r.count;
      else if (r.status === 'EXPIRING_SOON') expiringSoon = r.count;
      else if (r.status === 'EXPIRED') expired = r.count;
      else if (r.status === 'CLAIMED') claimed = r.count;
    }

    return { total, active, expiringSoon, expired, claimed };
  }

  /**
   * Pobiera liste gwarancji z opcjonalnymi kryteriami filtrowania,
   * posortowana rosnaco wg daty zakonczenia gwarancji (wygasajace najszybciej na gorze).
   *
   * @param filter Opcjonalne filtry statusu, kategorii lub wyszukiwania tekstowego.
   * @returns Tablica gwarancji z przeliczonymi wskaznikami UI.
   */
  async listWarranties(filter?: WarrantyFilter): Promise<WarrantyItemWithDetails[]> {
    let sql = `
      SELECT 
        w.id,
        w.document_id,
        d.title,
        s.name as store_name,
        c.name as category_name,
        c.icon as category_icon,
        c.color_hex as category_color,
        d.total_amount,
        d.currency,
        d.purchase_date,
        w.duration_months,
        w.end_date,
        w.return_window_days,
        w.return_deadline,
        w.status,
        w.claim_notes,
        a.file_path as primary_image_path
      FROM warranties w
      JOIN documents d ON w.document_id = d.id
      LEFT JOIN stores s ON d.store_id = s.id
      LEFT JOIN categories c ON d.category_id = c.id
      LEFT JOIN document_attachments a ON d.id = a.document_id AND a.is_primary = 1
      WHERE 1=1
    `;

    const params: unknown[] = [];

    if (filter?.status && filter.status !== 'ALL') {
      sql += ' AND w.status = ?';
      params.push(filter.status);
    }

    if (filter?.categoryId) {
      sql += ' AND d.category_id = ?';
      params.push(filter.categoryId);
    }

    if (filter?.search?.trim()) {
      sql += ' AND (d.title LIKE ? OR s.name LIKE ?)';
      const term = `%${filter.search.trim()}%`;
      params.push(term, term);
    }

    sql += ' ORDER BY w.end_date ASC;';

    const rawRows = await this.db.getAllAsync<RawWarrantyRow>(sql, params);

    return rawRows.map((row) => {
      const calculation = WarrantyCalculator.calculate({
        purchaseDate: row.purchase_date,
        durationMonths: row.duration_months,
        returnWindowDays: row.return_window_days,
        isClaimed: row.status === 'CLAIMED',
      });

      return {
        ...row,
        status: (row.status as WarrantyStatus) || calculation.status,
        calculation,
      };
    });
  }

  /**
   * Oznacza gwarancje jako bedaca w trakcie procedury reklamacyjnej.
   *
   * @param documentId Unikalny identyfikator dokumentu.
   * @param claimNotes Opcjonalne notatki uzytkownika o zgloszeniu.
   */
  async markAsClaimed(documentId: string, claimNotes?: string): Promise<void> {
    await this.db.runAsync(
      `UPDATE warranties 
       SET status = 'CLAIMED', claim_notes = ?, updated_at = datetime('now')
       WHERE document_id = ?;`,
      [claimNotes ?? null, documentId]
    );
  }

  /**
   * Przywraca standardowy status gwarancji (np. po pozytywnym zakonczeniu reklamacji).
   *
   * @param documentId Unikalny identyfikator dokumentu.
   */
  async restoreWarrantyStatus(documentId: string): Promise<void> {
    const row = await this.db.getFirstAsync<{ purchase_date: string; duration_months: number; end_date: string }>(
      `SELECT d.purchase_date, w.duration_months, w.end_date
       FROM warranties w
       JOIN documents d ON w.document_id = d.id
       WHERE w.document_id = ?;`,
      [documentId]
    );

    if (!row) return;

    const calc = WarrantyCalculator.calculate({
      purchaseDate: row.purchase_date,
      durationMonths: row.duration_months,
    });

    await this.db.runAsync(
      `UPDATE warranties 
       SET status = ?, claim_notes = NULL, updated_at = datetime('now')
       WHERE document_id = ?;`,
      [calc.status, documentId]
    );
  }
}
