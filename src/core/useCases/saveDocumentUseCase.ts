import { DocumentRepository } from '@/database/repositories/documentRepository';
import { StoreRepository } from '@/database/repositories/storeRepository';
import { FileStorageService } from '@/services/storage/fileStorageService';
import { NotificationService } from '@/services/notifications/notificationService';
import { WarrantyCalculator } from '@/core/warranties/warrantyCalculator';
import { DocumentType } from '@/database/types';

export interface SaveDocumentInput {
  readonly title: string;
  readonly storeName?: string | null;
  readonly taxId?: string | null;
  readonly categoryId?: number | null;
  readonly totalAmount: number;
  readonly currency?: string;
  readonly purchaseDate: string; // YYYY-MM-DD
  readonly documentType?: DocumentType;
  readonly notes?: string | null;
  readonly rawOcrText?: string | null;
  readonly warrantyMonths?: number;
  readonly returnWindowDays?: number;
  readonly tempImageUri?: string | null;
}

function generateUuid(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export class SaveDocumentUseCase {
  constructor(
    private readonly documentRepo: DocumentRepository,
    private readonly storeRepo: StoreRepository,
    private readonly storageService: FileStorageService,
    private readonly notificationService?: NotificationService
  ) {}

  async execute(input: SaveDocumentInput): Promise<string> {
    const docId = generateUuid();
    let persistentImagePath: string | null = null;

    if (input.tempImageUri) {
      persistentImagePath = await this.storageService.saveReceiptImage(input.tempImageUri, docId);
    }

    let storeId: number | null = null;
    if (input.storeName && input.storeName.trim()) {
      const store = await this.storeRepo.findOrCreateByName(input.storeName.trim(), input.taxId);
      storeId = store.id;
    }

    const warrantyMonths = input.warrantyMonths ?? 24;
    const returnWindowDays = input.returnWindowDays ?? 14;

    await this.documentRepo.createDocument({
      id: docId,
      title: input.title.trim(),
      storeId,
      categoryId: input.categoryId ?? null,
      totalAmount: input.totalAmount,
      currency: input.currency ?? 'PLN',
      purchaseDate: input.purchaseDate,
      documentType: input.documentType ?? 'RECEIPT',
      notes: input.notes ?? null,
      rawOcrText: input.rawOcrText ?? null,
      warrantyMonths,
      returnWindowDays,
      primaryImagePath: persistentImagePath,
    });

    // Automatyczne planowanie lokalnych przypomnien o koncu gwarancji i zwrotu
    if (this.notificationService) {
      const calculation = WarrantyCalculator.calculate({
        purchaseDate: input.purchaseDate,
        durationMonths: warrantyMonths,
        returnWindowDays,
      });

      await this.notificationService.scheduleWarrantyAlerts({
        documentId: docId,
        title: input.title.trim(),
        warrantyEndDate: calculation.endDate,
        returnDeadline: calculation.returnDeadline,
        storeName: input.storeName,
      });
    }

    return docId;
  }
}
