import { SqlDatabase } from '../connection';
import { CategoryRow, StoreRow } from '../types';

/**
 * Repozytorium kategorii oraz punktow handlowych (CategoryRepository).
 * Obsluguje operacje czytania i zarzadzania slownikami w SQLite.
 */
export class CategoryRepository {
  /**
   * Tworzy instancje repozytorium kategorii.
   *
   * @param db Aktywne polaczenie bazy danych `SqlDatabase`.
   */
  constructor(private readonly db: SqlDatabase) {}

  /**
   * Pobiera pelna liste kategorii posortowana alfabetycznie wg nazwy.
   *
   * @returns Tablica wszystkich wierszy kategorii.
   */
  async listCategories(): Promise<CategoryRow[]> {
    return this.db.getAllAsync<CategoryRow>(
      'SELECT id, name, icon, color_hex, is_system, created_at FROM categories ORDER BY name ASC;'
    );
  }

  /**
   * Pobiera liste predefiniowanych i zapisanych punktow handlowych.
   *
   * @returns Tablica wierszy sklepow.
   */
  async listStores(): Promise<StoreRow[]> {
    return this.db.getAllAsync<StoreRow>(
      'SELECT id, name, tax_id, default_return_days, website_url, created_at FROM stores ORDER BY name ASC;'
    );
  }

  /**
   * Tworzy nowa wlasna kategorie uzytkownika.
   *
   * @param name Unikalna nazwa kategorii.
   * @param icon Nazwa ikony wektorowej (domyslnie 'tag').
   * @param colorHex Kolor heksadecymalny chipu (domyslnie '#64748B').
   * @returns Identyfikator nowo wstawionego wiersza.
   */
  async createCustomCategory(name: string, icon = 'tag', colorHex = '#64748B'): Promise<number> {
    const result = await this.db.runAsync(
      'INSERT INTO categories (name, icon, color_hex, is_system) VALUES (?, ?, ?, 0);',
      [name, icon, colorHex]
    );
    return result.lastInsertRowId;
  }
}
