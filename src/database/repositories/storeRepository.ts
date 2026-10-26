import { SqlDatabase } from '../connection';
import { StoreRow } from '../types';

/**
 * Repozytorium zarzadzania punktami handlowymi i sprzedawcami (StoreRepository).
 * Zapewnia deduplikacje i tworzenie rekordow na podstawie rozpoznanych paragonow.
 */
export class StoreRepository {
  /**
   * Inicjalizuje repozytorium sklepow.
   *
   * @param db Polaczenie bazy danych `SqlDatabase`.
   */
  constructor(private readonly db: SqlDatabase) {}

  /**
   * Wyszukuje sklep po nazwie bez rozrozniania wielkosci liter (case-insensitive).
   *
   * @param name Nazwa sieci handlowej lub sklepu.
   * @returns Znaleziony rekord lub null.
   */
  async findByName(name: string): Promise<StoreRow | null> {
    const trimmed = name.trim();
    if (!trimmed) return null;

    const result = await this.db.getFirstAsync<StoreRow>(
      'SELECT id, name, tax_id, default_return_days, website_url, created_at FROM stores WHERE LOWER(name) = LOWER(?);',
      [trimmed]
    );
    return result ?? null;
  }

  /**
   * Pobiera istniejacy sklep lub tworzy nowy rekord, jesli dany punkt jeszcze nie istnieje.
   * W razie potrzeby uzupelnia brakujacy NIP sprzedawcy.
   *
   * @param name Nazwa sklepu.
   * @param taxId Opcjonalny 10-cyfrowy NIP.
   * @returns Rekord istniejacego badz nowo utworzonego sklepu.
   */
  async findOrCreateByName(name: string, taxId?: string | null): Promise<StoreRow> {
    const trimmed = name.trim();
    const existing = await this.findByName(trimmed);
    if (existing) {
      if (taxId && !existing.tax_id) {
        await this.db.runAsync('UPDATE stores SET tax_id = ? WHERE id = ?;', [taxId, existing.id]);
        return { ...existing, tax_id: taxId };
      }
      return existing;
    }

    const insertResult = await this.db.runAsync(
      'INSERT INTO stores (name, tax_id) VALUES (?, ?);',
      [trimmed, taxId ?? null]
    );

    const created = await this.db.getFirstAsync<StoreRow>(
      'SELECT id, name, tax_id, default_return_days, website_url, created_at FROM stores WHERE id = ?;',
      [insertResult.lastInsertRowId]
    );

    if (!created) {
      throw new Error(`Nie udalo sie utworzyc sklepu: ${trimmed}`);
    }

    return created;
  }

  /**
   * Zwraca pelna liste sklepow posortowana alfabetycznie.
   *
   * @returns Tablica wszystkich zarejestrowanych sklepow.
   */
  async listStores(): Promise<StoreRow[]> {
    return this.db.getAllAsync<StoreRow>(
      'SELECT id, name, tax_id, default_return_days, website_url, created_at FROM stores ORDER BY name ASC;'
    );
  }
}
