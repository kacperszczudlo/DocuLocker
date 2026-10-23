import { describe, it, expect, beforeEach } from 'vitest';
import { createInMemoryTestDatabase } from '../testSqliteAdapter';
import { initializeDatabase, SqlDatabase } from '@/database/connection';
import { StoreRepository } from '@/database/repositories/storeRepository';

describe('StoreRepository', () => {
  let db: SqlDatabase;
  let storeRepo: StoreRepository;

  beforeEach(async () => {
    db = await createInMemoryTestDatabase();
    await initializeDatabase(db);
    storeRepo = new StoreRepository(db);
  });

  it('finds existing seed store by name case-insensitively', async () => {
    const store = await storeRepo.findByName('mediamarkt');
    expect(store).not.toBeNull();
    expect(store?.name).toBe('MediaMarkt');
  });

  it('returns null when store does not exist', async () => {
    const store = await storeRepo.findByName('Nieznany Sklep 99');
    expect(store).toBeNull();
  });

  it('creates a new store via findOrCreateByName if it does not exist', async () => {
    const newStore = await storeRepo.findOrCreateByName('Lokalny Sklep AGD', '1234567890');
    expect(newStore).toBeDefined();
    expect(newStore.id).toBeGreaterThan(0);
    expect(newStore.name).toBe('Lokalny Sklep AGD');
    expect(newStore.tax_id).toBe('1234567890');

    // Subsequent call should return the same existing record
    const existing = await storeRepo.findOrCreateByName('lokalny sklep agd');
    expect(existing.id).toBe(newStore.id);
  });

  it('lists all stores sorted by name', async () => {
    const stores = await storeRepo.listStores();
    expect(stores.length).toBeGreaterThanOrEqual(10);
    expect(stores.some((s) => s.name === 'Biedronka')).toBe(true);
  });
});
