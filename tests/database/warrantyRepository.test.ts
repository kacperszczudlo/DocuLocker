import { describe, it, expect, beforeEach } from 'vitest';
import { createInMemoryTestDatabase } from '../testSqliteAdapter';
import { initializeDatabase, SqlDatabase } from '@/database/connection';
import { DocumentRepository } from '@/database/repositories/documentRepository';
import { WarrantyRepository } from '@/database/repositories/warrantyRepository';

describe('WarrantyRepository Integration Tests', () => {
  let db: SqlDatabase;
  let documentRepo: DocumentRepository;
  let warrantyRepo: WarrantyRepository;

  beforeEach(async () => {
    db = await createInMemoryTestDatabase();
    await initializeDatabase(db);
    documentRepo = new DocumentRepository(db);
    warrantyRepo = new WarrantyRepository(db);
  });

  it('lists warranties with joined document details and calculation', async () => {
    await documentRepo.createDocument({
      id: 'doc-w-1',
      title: 'Smartfon Samsung',
      purchaseDate: '2026-01-10',
      totalAmount: 2999.0,
      currency: 'PLN',
      warrantyMonths: 24,
      returnWindowDays: 14,
    });

    const warranties = await warrantyRepo.listWarranties();
    expect(warranties).toHaveLength(1);
    expect(warranties[0].title).toBe('Smartfon Samsung');
    expect(warranties[0].end_date).toBe('2028-01-10');
    expect(warranties[0].calculation).toBeDefined();
    expect(warranties[0].calculation.endDate).toBe('2028-01-10');
  });

  it('filters warranties by status and counts stats correctly', async () => {
    // 1. Aktywny (24 m-ce od dzis)
    await documentRepo.createDocument({
      id: 'doc-active',
      title: 'Lodowka Bosch',
      purchaseDate: '2026-01-01',
      totalAmount: 1800,
      warrantyMonths: 24,
    });

    // 2. Wygasly (zakupiony 3 lata temu)
    await documentRepo.createDocument({
      id: 'doc-expired',
      title: 'Stary Toster',
      purchaseDate: '2020-01-01',
      totalAmount: 50,
      warrantyMonths: 12,
    });

    await warrantyRepo.syncStatuses();

    const stats = await warrantyRepo.getStats();
    expect(stats.total).toBe(2);
    expect(stats.active).toBe(1);
    expect(stats.expired).toBe(1);

    const activeList = await warrantyRepo.listWarranties({ status: 'ACTIVE' });
    expect(activeList).toHaveLength(1);
    expect(activeList[0].id).toBeDefined();
    expect(activeList[0].title).toBe('Lodowka Bosch');

    const expiredList = await warrantyRepo.listWarranties({ status: 'EXPIRED' });
    expect(expiredList).toHaveLength(1);
    expect(expiredList[0].title).toBe('Stary Toster');
  });

  it('marks warranty as claimed with notes and restores it', async () => {
    await documentRepo.createDocument({
      id: 'doc-claim-test',
      title: 'Ekspres do kawy DeLonghi',
      purchaseDate: '2026-02-01',
      totalAmount: 2499,
      warrantyMonths: 24,
    });

    await warrantyRepo.markAsClaimed('doc-claim-test', 'Oddano do serwisu, glosna praca pompy');

    let warranties = await warrantyRepo.listWarranties({ status: 'CLAIMED' });
    expect(warranties).toHaveLength(1);
    expect(warranties[0].status).toBe('CLAIMED');
    expect(warranties[0].claim_notes).toBe('Oddano do serwisu, glosna praca pompy');
    expect(warranties[0].calculation.badgeLabel).toBe('W trakcie reklamacji');

    // Przywrocenie statusu
    await warrantyRepo.restoreWarrantyStatus('doc-claim-test');
    warranties = await warrantyRepo.listWarranties({ status: 'CLAIMED' });
    expect(warranties).toHaveLength(0);

    const active = await warrantyRepo.listWarranties({ status: 'ACTIVE' });
    expect(active).toHaveLength(1);
    expect(active[0].claim_notes).toBeNull();
  });
});
