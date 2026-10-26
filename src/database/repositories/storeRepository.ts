import { SqlDatabase } from '../connection';
import { StoreRow } from '../types';

export class StoreRepository {
  constructor(private readonly db: SqlDatabase) {}

  async findByName(name: string): Promise<StoreRow | null> {
    const trimmed = name.trim();
    if (!trimmed) return null;

    const result = await this.db.getFirstAsync<StoreRow>(
      'SELECT id, name, tax_id, default_return_days, website_url, created_at FROM stores WHERE LOWER(name) = LOWER(?);',
      [trimmed]
    );
    return result ?? null;
  }

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

  async listStores(): Promise<StoreRow[]> {
    return this.db.getAllAsync<StoreRow>(
      'SELECT id, name, tax_id, default_return_days, website_url, created_at FROM stores ORDER BY name ASC;'
    );
  }
}
