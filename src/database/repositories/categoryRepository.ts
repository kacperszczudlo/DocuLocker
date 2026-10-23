import { SqlDatabase } from '../connection';
import { CategoryRow, StoreRow } from '../types';

export class CategoryRepository {
  constructor(private readonly db: SqlDatabase) {}

  async listCategories(): Promise<CategoryRow[]> {
    return this.db.getAllAsync<CategoryRow>(
      'SELECT id, name, icon, color_hex, is_system, created_at FROM categories ORDER BY name ASC;'
    );
  }

  async listStores(): Promise<StoreRow[]> {
    return this.db.getAllAsync<StoreRow>(
      'SELECT id, name, tax_id, default_return_days, website_url, created_at FROM stores ORDER BY name ASC;'
    );
  }

  async createCustomCategory(name: string, icon = 'tag', colorHex = '#64748B'): Promise<number> {
    const result = await this.db.runAsync(
      'INSERT INTO categories (name, icon, color_hex, is_system) VALUES (?, ?, ?, 0);',
      [name, icon, colorHex]
    );
    return result.lastInsertRowId;
  }
}
