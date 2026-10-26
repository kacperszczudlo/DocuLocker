import { describe, it, expect, beforeEach } from 'vitest';
import { createInMemoryTestDatabase } from '../testSqliteAdapter';
import { initializeDatabase, SqlDatabase } from '@/database/connection';
import { DocumentRepository } from '@/database/repositories/documentRepository';
import { StoreRepository } from '@/database/repositories/storeRepository';
import { FileStorageService, FileSystemDriver } from '@/services/storage/fileStorageService';
import { NotificationService, NotificationDriver } from '@/services/notifications/notificationService';
import { SaveDocumentUseCase, SaveDocumentInput } from '@/core/useCases/saveDocumentUseCase';

class MockFileSystemDriver implements FileSystemDriver {
  documentDirectory = 'file:///app/documents/';
  files = new Map<string, { size: number }>();

  async makeDirectoryAsync(): Promise<void> {}
  async copyAsync(options: { from: string; to: string }): Promise<void> {
    this.files.set(options.to, { size: 2048 });
  }
  async deleteAsync(uri: string): Promise<void> {
    this.files.delete(uri);
  }
  async getInfoAsync(uri: string): Promise<{ exists: boolean; size?: number }> {
    return { exists: this.files.has(uri), size: this.files.get(uri)?.size };
  }
}

class MockNotificationDriver implements NotificationDriver {
  scheduled: Array<{ identifier: string; content: { title: string; body: string; data?: Record<string, unknown> } }> = [];

  async requestPermissionsAsync() {
    return { status: 'granted', granted: true };
  }
  async scheduleNotificationAsync(request: {
    content: { title: string; body: string; data?: Record<string, unknown> };
    trigger: Date | { date: Date };
  }) {
    const id = `notif-${this.scheduled.length + 1}`;
    this.scheduled.push({ identifier: id, content: request.content });
    return id;
  }
  async cancelScheduledNotificationAsync(identifier: string) {
    this.scheduled = this.scheduled.filter((n) => n.identifier !== identifier);
  }
  async getAllScheduledNotificationsAsync() {
    return [...this.scheduled];
  }
}

describe('SaveDocumentUseCase', () => {
  let db: SqlDatabase;
  let docRepo: DocumentRepository;
  let storeRepo: StoreRepository;
  let storageService: FileStorageService;
  let notifDriver: MockNotificationDriver;
  let notifService: NotificationService;
  let saveDocUseCase: SaveDocumentUseCase;

  beforeEach(async () => {
    db = await createInMemoryTestDatabase();
    await initializeDatabase(db);
    docRepo = new DocumentRepository(db);
    storeRepo = new StoreRepository(db);
    storageService = new FileStorageService(new MockFileSystemDriver());
    notifDriver = new MockNotificationDriver();
    notifService = new NotificationService(notifDriver);
    saveDocUseCase = new SaveDocumentUseCase(docRepo, storeRepo, storageService, notifService);
  });

  it('saves document, persists image, creates store, calculates warranty, and schedules alerts', async () => {
    const input: SaveDocumentInput = {
      title: 'Pralka Samsung EcoBubble',
      storeName: 'MediaMarkt',
      taxId: '5270008098',
      totalAmount: 2199.00,
      currency: 'PLN',
      purchaseDate: '2026-10-15',
      warrantyMonths: 24,
      returnWindowDays: 30,
      notes: 'Dodatkowe ubezpieczenie na silnik',
      rawOcrText: 'SAMSUNG ECOBUBBLE SUMA PLN 2199,00',
      tempImageUri: 'file:///tmp/receipt_scan_1.jpg',
    };

    const docId = await saveDocUseCase.execute(input);
    expect(docId).toBeDefined();

    const docs = await docRepo.listDocuments();
    expect(docs).toHaveLength(1);
    const saved = docs[0];
    expect(saved.id).toBe(docId);
    expect(saved.title).toBe('Pralka Samsung EcoBubble');
    expect(saved.store_name).toBe('MediaMarkt');
    expect(saved.total_amount).toBe(2199.00);
    expect(saved.warranty_end_date).toBe('2028-10-15');
    expect(saved.return_deadline).toBe('2026-11-14');
    expect(saved.primary_image_path).toContain(`receipts/${docId}.jpg`);

    // Sprawdzamy czy zaplanowano powiadomienia
    expect(notifDriver.scheduled.length).toBeGreaterThan(0);
    const hasWarrantyAlert = notifDriver.scheduled.some((s) => s.content.data?.documentId === docId);
    expect(hasWarrantyAlert).toBe(true);
  });

  it('saves manual document without store or image', async () => {
    const input: SaveDocumentInput = {
      title: 'Usluga naprawy roweru',
      totalAmount: 150.00,
      currency: 'PLN',
      purchaseDate: '2026-10-20',
      warrantyMonths: 3,
    };

    const docId = await saveDocUseCase.execute(input);
    const docs = await docRepo.listDocuments();
    expect(docs).toHaveLength(1);
    expect(docs[0].id).toBe(docId);
    expect(docs[0].store_name).toBeNull();
    expect(docs[0].primary_image_path).toBeNull();
  });
});
