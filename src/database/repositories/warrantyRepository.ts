import { SqlDatabase } from '../connection';
import { WarrantyStatus } from '../types';
import { WarrantyCalculator, WarrantyCalculationResult } from '@/core/warranties/warrantyCalculator';

export interface WarrantyItemWithDetails {
  readonly id: number; // warranty id
  readonly document_id: string;
  readonly title: string;
  readonly store_name: string | null;
  readonly category_name: string | null;
  readonly category_icon: string | null;
  readonly category_color: string | null;
  readonly total_amount: number;
  readonly currency: string;
  readonly purchase_date: string;
  readonly duration_months: number;
  readonly end_date: string;
  readonly return_window_days: number;
  readonly return_deadline: string;
  readonly status: WarrantyStatus;
  readonly claim_notes: string | null;
  readonly primary_image_path: string | null;
  // Dynamicznie wyliczone wlasciwosci prezentacyjne
  readonly calculation: WarrantyCalculationResult;
}

export interface WarrantyFilter {
  readonly status?: WarrantyStatus | 'ALL';
  readonly categoryId?: number;
  readonly search?: string;
}

export interface WarrantyStats {
  readonly total: number;
  readonly active: number;
  readonly expiringSoon: number;
  readonly expired: number;
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

export class WarrantyRepository {
  constructor(private readonly db: SqlDatabase) {}

  /**
   * Synchronizuje statusy w bazie SQLite w oparciu o aktualna date
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
   * Pobiera statystyki liczbowe do odznak/filtrów
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
   * Pobiera liste gwarancji z opcjonalnymi filtrami
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

    // Sortowanie: wygasajace najszybciej na samej gorze
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
   * Oznaczenie gwarancji jako zgloszonej do reklamacji
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
   * Przywrocenie statusu gwarancji (np. po zakonczeniu reklamacji)
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
