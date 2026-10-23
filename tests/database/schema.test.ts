import { describe, it, expect, beforeEach } from 'vitest';
import { createInMemoryTestDatabase } from '../testSqliteAdapter';
import { initializeDatabase, SqlDatabase } from '@/database/connection';
import { CategoryRepository } from '@/database/repositories/categoryRepository';
import { DocumentRepository } from '@/database/repositories/documentRepository';

describe('Database Schema and Repositories Integration', () => {
  let db: SqlDatabase;
  let categoryRepo: CategoryRepository;
  let documentRepo: DocumentRepository;

  beforeEach(async () => {
    db = await createInMemoryTestDatabase();
    await initializeDatabase(db);
    categoryRepo = new CategoryRepository(db);
    documentRepo = new DocumentRepository(db);
  });

  it('initializes schema and sets user_version to 1', async () => {
    const version = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version;');
    expect(version?.user_version).toBe(1);

    const tables = await db.getAllAsync<{ name: string }>(
      "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%';"
    );
    const tableNames = tables.map((t) => t.name);

    expect(tableNames).toContain('categories');
    expect(tableNames).toContain('stores');
    expect(tableNames).toContain('documents');
    expect(tableNames).toContain('warranties');
    expect(tableNames).toContain('document_attachments');
    expect(tableNames).toContain('tags');
    expect(tableNames).toContain('document_tags');
    // documents_fts bedzie w tableNames jesli srodowisko obsluguje modul FTS5
  });

  it('populates initial seed categories and stores', async () => {
    const categories = await categoryRepo.listCategories();
    expect(categories.length).toBeGreaterThanOrEqual(8);
    expect(categories.some((c) => c.name === 'Elektronika i RTV')).toBe(true);

    const stores = await categoryRepo.listStores();
    expect(stores.length).toBeGreaterThanOrEqual(10);
    expect(stores.some((s) => s.name === 'MediaMarkt')).toBe(true);
  });

  it('creates document with calculated warranty dates and attachment', async () => {
    const docId = 'test-uuid-1234';
    await documentRepo.createDocument({
      id: docId,
      title: 'Ekspres DeLonghi Magnifica S',
      totalAmount: 1499.99,
      purchaseDate: '2026-10-01',
      warrantyMonths: 24,
      returnWindowDays: 14,
      notes: 'Zakup w promocji z dodatkowa kawa',
      rawOcrText: 'DE LONGHI MAGNIFICA S SUMA PLN 1499,99 PARAGON FISKALNY',
      primaryImagePath: 'receipts/test.jpg',
    });

    const docs = await documentRepo.listDocuments();
    expect(docs).toHaveLength(1);
    expect(docs[0].id).toBe(docId);
    expect(docs[0].title).toBe('Ekspres DeLonghi Magnifica S');
    expect(docs[0].total_amount).toBe(1499.99);
    expect(docs[0].warranty_end_date).toBe('2028-10-01');
    expect(docs[0].return_deadline).toBe('2026-10-15');
    expect(docs[0].primary_image_path).toBe('receipts/test.jpg');
  });

  it('performs full-text search via FTS5', async () => {
    await documentRepo.createDocument({
      id: 'doc-1',
      title: 'Kabel HDMI 2.1',
      totalAmount: 59.99,
      purchaseDate: '2026-05-10',
      rawOcrText: 'KABEL ULTRA HIGH SPEED 4K 120HZ BRAIDED',
    });

    await documentRepo.createDocument({
      id: 'doc-2',
      title: 'Zmywarka Bosch Serie 4',
      totalAmount: 1899.0,
      purchaseDate: '2026-06-15',
      rawOcrText: 'BOSCH SERIE 4 SILENCE PLUS ECO 50',
    });

    const hdmiResults = await documentRepo.searchFullText('braided');
    expect(hdmiResults).toHaveLength(1);
    expect(hdmiResults[0].id).toBe('doc-1');

    const boschResults = await documentRepo.searchFullText('bosch');
    expect(boschResults).toHaveLength(1);
    expect(boschResults[0].id).toBe('doc-2');
  });

  it('cascades deletion to warranties and attachments when document is deleted', async () => {
    const docId = 'cascade-doc-1';
    await documentRepo.createDocument({
      id: docId,
      title: 'Testowy zakup',
      totalAmount: 100.0,
      purchaseDate: '2026-01-01',
      primaryImagePath: 'receipts/cascade.jpg',
    });

    const warrantiesBefore = await db.getAllAsync('SELECT * FROM warranties WHERE document_id = ?;', [docId]);
    const attachmentsBefore = await db.getAllAsync('SELECT * FROM document_attachments WHERE document_id = ?;', [docId]);
    expect(warrantiesBefore).toHaveLength(1);
    expect(attachmentsBefore).toHaveLength(1);

    await documentRepo.deleteDocument(docId);

    const docsAfter = await db.getAllAsync('SELECT * FROM documents WHERE id = ?;', [docId]);
    const warrantiesAfter = await db.getAllAsync('SELECT * FROM warranties WHERE document_id = ?;', [docId]);
    const attachmentsAfter = await db.getAllAsync('SELECT * FROM document_attachments WHERE document_id = ?;', [docId]);

    expect(docsAfter).toHaveLength(0);
    expect(warrantiesAfter).toHaveLength(0);
    expect(attachmentsAfter).toHaveLength(0);
  });
});
