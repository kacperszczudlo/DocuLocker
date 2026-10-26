import { describe, it, expect, beforeEach } from 'vitest';
import { createInMemoryTestDatabase } from '../testSqliteAdapter';
import { initializeDatabase, SqlDatabase } from '@/database/connection';
import { DocumentRepository } from '@/database/repositories/documentRepository';
import { StoreRepository } from '@/database/repositories/storeRepository';

describe('SQLite FTS5 Full-Text Search Integration', () => {
  let db: SqlDatabase;
  let docRepo: DocumentRepository;
  let storeRepo: StoreRepository;

  beforeEach(async () => {
    db = await createInMemoryTestDatabase();
    await initializeDatabase(db);
    docRepo = new DocumentRepository(db);
    storeRepo = new StoreRepository(db);
  });

  it('indexes and finds documents by keywords in OCR raw text', async () => {
    const store = await storeRepo.findOrCreateByName('Action', '6762491827');

    await docRepo.createDocument({
      id: 'doc-fts-1',
      title: 'Zakupy domowe',
      storeId: store.id,
      totalAmount: 45.90,
      purchaseDate: '2026-10-20',
      rawOcrText: 'ACTION POLSKA SP Z O O BATERIE ALKALICZNE AA 8SZT KABEL USB-C 2M SUMA PLN 45,90',
    });

    await docRepo.createDocument({
      id: 'doc-fts-2',
      title: 'Kawiarnia',
      totalAmount: 18.00,
      purchaseDate: '2026-10-21',
      rawOcrText: 'ESPRESSO DOPPIO SERNIK WIEDENSKI RAZEM 18,00',
    });

    // 1. Wyszukanie pozycji wystepujacej tylko w tekscie OCR (np. "BATERIE" lub "USB-C")
    const batteryResults = await docRepo.searchFullText('BATERIE');
    expect(batteryResults).toHaveLength(1);
    expect(batteryResults[0].id).toBe('doc-fts-1');
    expect(batteryResults[0].raw_ocr_text).toContain('BATERIE ALKALICZNE');

    // 2. Wyszukanie po nazwie sklepu "Action"
    const storeResults = await docRepo.searchFullText('Action');
    expect(storeResults).toHaveLength(1);
    expect(storeResults[0].id).toBe('doc-fts-1');

    // 3. Wyszukanie pozycji z drugiego dokumentu "Sernik"
    const cakeResults = await docRepo.searchFullText('SERNIK');
    expect(cakeResults).toHaveLength(1);
    expect(cakeResults[0].id).toBe('doc-fts-2');

    // 4. Brak trafien dla nieistniejacej frazy
    const noneResults = await docRepo.searchFullText('WIERTARKA');
    expect(noneResults).toHaveLength(0);
  });

  it('retrieves single document by id with full details', async () => {
    await docRepo.createDocument({
      id: 'doc-single-1',
      title: 'Młotowiertarka Bosch',
      totalAmount: 599.00,
      currency: 'PLN',
      purchaseDate: '2026-08-15',
      warrantyMonths: 36,
      notes: 'Gwarancja rozszerzona po rejestracji na stronie producenta',
    });

    const doc = await docRepo.getDocumentById('doc-single-1');
    expect(doc).not.toBeNull();
    expect(doc?.id).toBe('doc-single-1');
    expect(doc?.title).toBe('Młotowiertarka Bosch');
    expect(doc?.warranty_end_date).toBe('2029-08-15');
    expect(doc?.notes).toContain('Gwarancja rozszerzona');

    const nonExistent = await docRepo.getDocumentById('not-found-id');
    expect(nonExistent).toBeNull();
  });
});
